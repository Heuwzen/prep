#!/usr/bin/env bun
// Seal the daily pages: plain day files -> daily.json, which only Arda's passphrase opens (src/07-daily.js).
// Each day is gzipped, then sealed with AES-GCM. The key comes from the passphrase through PBKDF2 (SHA-256,
// 600,000 rounds); the salt stays in daily.json between runs, so the key his phone keeps stays valid.
// Only days up to today are sealed (the day starts at 04:00, as in the app), the last 21 by default.
//
// Usage: bun tools/daily.mjs <dir of YYYY-MM-DD.json day files> [--keep 21] [--out daily.json] [--today YYYY-MM-DD]
// Passphrase: the macOS Keychain item "prep-daily" (account = $USER). PREP_DAILY_PASS overrides it, for tests only.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const dir = args[0] && !args[0].startsWith('--') ? args[0] : null;
if (!dir) { console.error('usage: bun tools/daily.mjs <days dir> [--keep 21] [--out daily.json] [--today YYYY-MM-DD]'); process.exit(1); }
const keep = +opt('--keep', 21);
const out = opt('--out', join(import.meta.dir, '..', 'daily.json'));
const pad = n => String(n).padStart(2, '0');
const now = new Date(Date.now() - 4 * 3600e3);
const today = opt('--today', `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);

let pass = process.env.PREP_DAILY_PASS;
if (!pass) {
  try {
    pass = execFileSync('security', ['find-generic-password', '-a', process.env.USER, '-s', 'prep-daily', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { console.error('no passphrase: add the Keychain item "prep-daily" first (see _Tools/Daily Learning.md in the vault)'); process.exit(2); }
}
pass = pass.trim().normalize('NFC');

let salt = crypto.getRandomValues(new Uint8Array(16)), iter = 600000;
if (existsSync(out)) {
  const old = JSON.parse(readFileSync(out, 'utf8'));
  if (old.kdf && old.kdf.salt) { salt = new Uint8Array(Buffer.from(old.kdf.salt, 'base64')); iter = old.kdf.iter; }
}
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
async function seal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, gzipSync(Buffer.from(JSON.stringify(obj)))));
  return Buffer.concat([iv, ct]).toString('base64');
}

const names = readdirSync(dir).filter(f => /^\d{4}-\d\d-\d\d\.json$/.test(f) && f.slice(0, 10) <= today).sort().slice(-keep);
const days = {};
for (const f of names) days[f.slice(0, 10)] = await seal(JSON.parse(readFileSync(join(dir, f), 'utf8')));
const body = JSON.stringify({ v: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iter, salt: Buffer.from(salt).toString('base64') }, check: await seal({ ok: 'prep-daily' }), days });
writeFileSync(out, body);
console.log(`daily.json: ${names.length} day(s), latest ${names.length ? names[names.length - 1].slice(0, 10) : 'none'}, ${Math.round(body.length / 1024)} KB`);
