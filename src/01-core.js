/* ---------- core: helpers, storage, content ---------- */
var $=function(id){return document.getElementById(id)};
var qs=function(s,r){return (r||document).querySelector(s)};
var qsa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function T(s){return esc(s).replace(/\b(Ray-Ban|\d+-[A-Za-z]+)\b/g,'<span class="nw">$1</span>')}
function cap(s){s=String(s||'');return s.charAt(0).toUpperCase()+s.slice(1)}
function ic(n,c){return '<svg class="ic'+(c?' '+c:'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function pad(n){return (n<10?'0':'')+n}
function plural(n,w,ws){return n+' '+(n===1?w:(ws||w+'s'))}
function mmss(sec){sec=Math.max(0,Math.round(sec));return Math.floor(sec/60)+':'+pad(sec%60)}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}return a}
function rm(){return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function later(fn,ms){return setTimeout(fn,ms)}
function reflow(el){void el.offsetHeight}

/* ---------- storage (always in memory, localStorage optional) ---------- */
var store=null,storeOK=true;
try{store=window.localStorage;store.setItem('prep.v1.t','1');store.removeItem('prep.v1.t')}catch(e){store=null;storeOK=false}
/* Home Screen app or plain browser tab; ask the browser to keep this site's storage (Safari 17+, Chrome). */
var standalone=!!(window.navigator.standalone||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches));
try{if(storeOK&&navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){})}catch(e){}
function rd(k){if(!store)return null;try{var v=store.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function wr(k,v){if(!store)return;try{store.setItem(k,JSON.stringify(v))}catch(e){storeOK=false}}

function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
var G=obj(rd('prep.v1.global'));
G.days=obj(G.days);G.best=+G.best||0;G.goal=[5,10,15,20].indexOf(G.goal)>=0?G.goal:10;
if(G.sound===undefined)G.sound=true;
G.hints=obj(G.hints);
function saveG(){wr('prep.v1.global',G)}
var PSm={};
function PS(p){
  if(!PSm[p.id]){
    var d=obj(rd('prep.v1.pack.'+p.id));
    d.lessons=obj(d.lessons);d.chapters=obj(d.chapters);d.runs=Array.isArray(d.runs)?d.runs:[];d.why=obj(d.why);
    d.quiz=obj(d.quiz);d.quiz.best=+d.quiz.best||0;d.quiz.lecBest=obj(d.quiz.lecBest);d.quiz.history=Array.isArray(d.quiz.history)?d.quiz.history:[];
    d.qa=obj(d.qa);d.qa.status=obj(d.qa.status);d.shown=+d.shown||0;
    PSm[p.id]=d;
  }
  return PSm[p.id];
}
function saveP(p){wr('prep.v1.pack.'+p.id,PSm[p.id])}

/* ---------- content ---------- */
var packs=[],bad=false;
try{
  var cj=JSON.parse($('content').textContent);
  packs=((cj&&cj.packs)||[]).filter(function(p){return p&&p.id}).map(normPack);
  if(!packs.length)bad=true;
}catch(e){bad=true}
/* Render only from normalised content: bad or missing parts are dropped, never thrown on. */
function normPack(p){
  p.lessons=(p.lessons||[]).filter(function(l){return l&&Array.isArray(l.cards)&&l.cards.length}).map(function(l,i){l.id=l.id||'lesson-'+i;return l});
  var s=p.script&&typeof p.script==='object'?p.script:{};
  Object.keys(s).forEach(function(k){
    var v=s[k];
    if(typeof v==='string')v=v.match(/[^.!?]+[.!?]+\S*\s*/g)||[v];
    s[k]=(Array.isArray(v)?v:[]).map(function(x){return typeof x==='string'?{sentence:x.trim()}:x}).filter(function(x){return x&&x.sentence});
  });
  p.script=s;
  p.quiz=(p.quiz||[]).filter(function(q){return q&&Array.isArray(q.options)&&q.options.length>1&&q.options[q.answer]!=null});
  p.questions=(p.questions||[]).filter(function(q){return q&&q.q&&q.answer});
  p.inspire=Array.isArray(p.inspire)?p.inspire.filter(function(f){return f&&f.fact}):[];
  p.glossary=(p.glossary||[]).filter(function(w){return w&&w.term});
  p.numbers=(p.numbers||[]).filter(function(n){return n&&n.value});
  return p;
}
function L_(p){return p.lessons||[]}
function chaptersOf(p){var r=p.read;if(!r)return[];if(Array.isArray(r))return r;return r.chapters||[]}
function quizOf(p){return p.quiz||[]}
/* Quiz items may carry a lecture number (exam packs); a round can then cover one lecture. */
function lecsOf(p){var c={};quizOf(p).forEach(function(q){if(q.lec)c[q.lec]=(c[q.lec]||0)+1});return Object.keys(c).map(Number).sort(function(a,b){return a-b}).map(function(k){return {lec:k,n:c[k]}})}
function isExam(p){return !!p&&p.kind==='exam'}
function isDaily(p){return !!p&&p.kind==='daily'}
function newsOf(p){return Array.isArray(p.news)?p.news.filter(function(n){return n&&n.title}):[]}
function qaOf(p){return p.questions||[]}
function numsOf(p){return p.numbers||[]}
function wordsOf(p){return p.glossary||[]}
function scriptParts(p){var s=p.script||{},o=[];Object.keys(s).forEach(function(k){if(s[k]&&s[k].length)o.push({key:k,list:s[k]})});return o}
function sentsOf(p){var o=[];scriptParts(p).forEach(function(pt){pt.list.forEach(function(s,i){o.push({part:pt.key,i:i,n:pt.list.length,s:s})})});return o}
function factsOf(p){var l=p.inspire;return Array.isArray(l)?l:[]}

/* ---------- time ---------- */
var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function dayKey(ts){return fmtKey(new Date(ts-4*3600000))}
function shiftKey(k,n){var a=k.split('-');return fmtKey(new Date(+a[0],+a[1]-1,+a[2]+n))}
function keyDow(k){var a=k.split('-');return (new Date(+a[0],+a[1]-1,+a[2]).getDay()+6)%7}
function offMin(p){var m=/([+-])(\d\d):(\d\d)$/.exec(p.date||'');return m?(m[1]==='-'?-1:1)*(+m[2]*60+ +m[3]):0}
function startOf(p){return new Date(p.date).getTime()}
function wall(p,ts){return new Date(ts+offMin(p)*60000)}
function fmtWhen(p){var d=wall(p,startOf(p));return DAYS[d.getUTCDay()]+' '+d.getUTCDate()+' '+MONTHS[d.getUTCMonth()]+', '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())}
function fmtDate(p){var d=wall(p,startOf(p));return DAYS[d.getUTCDay()]+' '+d.getUTCDate()+' '+MONTHS[d.getUTCMonth()]}
function isUpcoming(p){return Date.now()<startOf(p)+2*3600000}
function shortTitle(p){var t=String(p.title||'');var i=t.indexOf(':');return i>0?t.slice(0,i):t}
function sinceStart(ts){var d=new Date(ts);return d}
function fmtRound(ts){
  var d=new Date(ts),n=new Date(),hm=pad(d.getHours())+':'+pad(d.getMinutes());
  if(fmtKey(d)===fmtKey(n))return 'Today, '+hm;
  return DAYS[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()]+', '+hm;
}
