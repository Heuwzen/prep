/* ---------- daily page: private, sealed, unlocked once per device ---------- */
/* daily.json holds one sealed day per date (AES-GCM; the key comes from Arda's passphrase through PBKDF2, see
   tools/daily.mjs). After the first unlock this browser keeps the derived key, never the passphrase. Nobody who has
   not unlocked sees any of it: the only ways in are the small "Daily page" row under Your packs and the #today link. */
var DKEY='prep.v1.dkey',SELDAY='prep.v1.selDay',DSRC=null,dLoaded=false;
var SUB=window.crypto&&window.crypto.subtle;
function b2u(s){var b=atob(s),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
function u2b(a){var s='';for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s)}
function dailyOK(){return !!(SUB&&window.TextEncoder&&window.DecompressionStream)}
function dayLabel(k){var a=String(k).split('-'),d=new Date(+a[0],+a[1]-1,+a[2]);return DAYS[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()]}
function isoDay(k,h){
  var a=k.split('-'),d=new Date(+a[0],+a[1]-1,+a[2],h),o=-d.getTimezoneOffset(),s=o<0?'-':'+';o=Math.abs(o);
  return k+'T'+pad(h)+':00:00'+s+pad(Math.floor(o/60))+':'+pad(o%60);
}
function dailyMinutes(p){return Math.max(10,Math.round((readMinutes(p)+5+Math.ceil(quizOf(p).length/2)+newsOf(p).length)/5)*5)}
function dailyDays(){return packs.filter(isDaily).sort(function(a,b){return a.day<b.day?1:-1})}
function todayDaily(){var t=today(),l=dailyDays();for(var i=0;i<l.length;i++)if(l[i].day<=t)return l[i];return null}
function dayToPack(k,o){
  o=obj(o);
  return normPack({id:'daily-'+k,kind:'daily',day:k,course:'Daily',title:o.title||o.topic||'Today',topic:o.topic||o.title||'',theme:o.theme||'',
    date:isoDay(k,6),place:'',lessons:o.lessons,glossary:o.glossary,quiz:o.quiz,read:o.read,inspire:o.inspire,links:o.links,news:o.news,
    plan:[{text:'Catch up on the AI news.',do:'news'},{text:"Read today's lesson.",do:'read'},{text:'Go over the key ideas, then the new words.',do:'lessons'},{text:'Do the quiz. A few questions come back from earlier days.',do:'quiz'}]});
}

/* ---------- sealing ---------- */
function fetchDaily(){
  return fetch('daily.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('none');return r.json()}).then(function(j){DSRC=j;return j});
}
function deriveDaily(pass,kdf){
  return SUB.importKey('raw',new TextEncoder().encode(String(pass).trim().normalize('NFC')),'PBKDF2',false,['deriveKey']).then(function(base){
    return SUB.deriveKey({name:'PBKDF2',salt:b2u(kdf.salt),iterations:kdf.iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['decrypt']);
  });
}
function unseal(key,b64){
  var all=b2u(b64);
  return SUB.decrypt({name:'AES-GCM',iv:all.slice(0,12)},key,all.slice(12)).then(function(buf){
    return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }).then(JSON.parse);
}
/* A wrong key fails on the check blob ({bad:true}); every day up to today is then opened and added as a pack. */
function loadDaily(key){
  return unseal(key,DSRC.check).then(null,function(){throw {bad:true}}).then(function(c){
    if(!c||c.ok!=='prep-daily')throw {bad:true};
    var t=today(),days=Object.keys(obj(DSRC.days)).filter(function(d){return d<=t}).sort();
    return Promise.all(days.map(function(d){return unseal(key,DSRC.days[d]).then(function(o){return dayToPack(d,o)},function(){return null})}));
  }).then(function(list){
    packs=packs.filter(function(p){return !isDaily(p)}).concat(list.filter(Boolean));
    dLoaded=true;
  });
}
function pickedToday(){var s=obj(rd(SELDAY));return s.day===today()&&packs.some(function(p){return p.id===s.id})}
/* Today's page opens by itself on a new day; a pack picked by hand today stays picked. */
function dailyShow(fromLink){
  var t=todayDaily();
  if(t&&t!==cur&&(fromLink||!pickedToday()))selectPack(t,true);
  else refresh();
}
function dailyBoot(){
  var want=/^#today/.test(location.hash),raw=rd(DKEY);
  if(dLoaded||(!raw&&!want))return;
  if(!dailyOK()){if(want)openUnlock('This browser cannot open the daily page. Open Prep in Safari on iOS 16.4 or later.');return}
  fetchDaily().then(function(){
    if(!raw){openUnlock();return}
    return SUB.importKey('raw',b2u(raw),{name:'AES-GCM'},false,['decrypt']).then(loadDaily).then(function(){dailyShow(want)},function(x){
      if(x&&x.bad){try{if(store)store.removeItem(DKEY)}catch(e){}if(want)openUnlock()}
    });
  },function(){if(want&&!raw)openUnlock('No daily page has been published yet.')});
}
window.addEventListener('hashchange',function(){if(/^#today/.test(location.hash))dailyBoot()});

/* ---------- unlock sheet ---------- */
function dailyAsk(){(DSRC?Promise.resolve(DSRC):fetchDaily()).then(function(){openUnlock()},function(){openUnlock('No daily page has been published yet.')})}
function openUnlock(msg){
  var h='<form class="unlock" id="unlock-form" novalidate><div class="unlock-icon">'+ic('lock')+'</div>';
  if(msg)h+='<p class="unlock-text">'+esc(msg)+'</p>';
  else h+='<p class="unlock-text">Type your passphrase once. This phone remembers it, and the page opens by itself after that.</p>'+
    '<input class="sr" type="text" name="username" autocomplete="username" value="Prep daily page" tabindex="-1" aria-hidden="true">'+
    '<label class="field-l" for="unlock-pass">Passphrase</label>'+
    '<input class="field" id="unlock-pass" name="password" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go">'+
    '<p class="field-err" id="unlock-err" role="alert" hidden></p>'+
    '<button class="btn" id="unlock-go" type="submit">Unlock</button>'+
    '<p class="foot">Only this phone keeps it. Clearing its website data or deleting the app asks for it again.</p>';
  $('unlock-body').innerHTML=h+'</form>';
  openSheet('sheet-unlock',msg?'unlock-close':'unlock-pass');
}
$('unlock-close').addEventListener('click',function(){closeSheet('sheet-unlock')});
$('sheet-unlock').addEventListener('submit',function(e){
  e.preventDefault();
  var inp=$('unlock-pass'),btn=$('unlock-go'),err=$('unlock-err'),v=inp.value;
  if(!v.trim()){inp.focus();return}
  btn.disabled=true;btn.textContent='Unlocking';err.hidden=true;
  var key=null;
  (DSRC?Promise.resolve(DSRC):fetchDaily()).then(function(j){return deriveDaily(v,j.kdf)}).then(function(k){key=k;return loadDaily(k)}).then(function(){
    return SUB.exportKey('raw',key);
  }).then(function(raw){
    wr(DKEY,u2b(new Uint8Array(raw)));
    inp.value='';
    closeSheet('sheet-unlock');
    dailyShow(true);
    announce('Daily page unlocked');
  }).catch(function(x){
    btn.disabled=false;btn.textContent='Unlock';
    err.textContent=x&&x.bad?'That passphrase does not open it. Check it and try again.':'The daily page could not load. Check your connection and try again.';
    err.hidden=false;inp.focus();inp.select();
  });
});

/* ---------- news (the third tab on a daily page) ---------- */
function newsHTML(p){
  var ns=newsOf(p),ps=PS(p),h='';
  if(!ns.length)return emptyHTML('news','No news on this page','The morning run found nothing it could check, or it did not run that day.');
  h+='<p class="desc">'+(p.day===today()?'The biggest AI stories since yesterday, the most important first.':'The AI stories of '+esc(dayLabel(p.day))+', the most important first.')+'</p>';
  ns.forEach(function(n,i){
    var url=/^https?:\/\//.test(n.url||'')?n.url:'';
    h+='<article class="card news" id="news-'+i+'"><div class="news-top">'+(n.group?'<span class="pill'+(i===0?' go':'')+'">'+esc(n.group)+'</span>':'')+
      '<span class="news-src">'+T(n.source||'')+(n.date?' · '+esc(n.date):'')+'</span></div>'+
      '<h3 class="news-title">'+T(n.title)+'</h3>'+(n.summary?'<p class="news-sum">'+T(n.summary)+'</p>':'')+
      (n.why?'<div class="scope"><b>Why it matters</b><p>'+T(n.why)+'</p></div>':'')+
      (url?'<a class="btn plain compact news-link" href="'+esc(url)+'" target="_blank" rel="noopener">Read the source'+ic('ext')+'</a>':'')+'</article>';
  });
  var on=!!ps.newsDone;
  h+='<div class="numbers-mark"><button class="btn '+(on?'done-soft':'plain')+'" id="news-mark" type="button" aria-pressed="'+on+'">'+ic('check')+(on?'Marked as read':'Mark as read')+'</button></div>';
  return h;
}
$('script-body').addEventListener('click',function(e){
  if(!e.target.closest('#news-mark')||!isDaily(cur))return;
  var ps=PS(cur);ps.newsDone=!ps.newsDone;saveP(cur);
  $('script-face').innerHTML=newsHTML(cur);
  updateBadges();
  if(ps.newsDone)announce('News marked as read');
});
