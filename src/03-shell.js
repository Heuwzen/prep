/* ---------- shared renderers ---------- */
function emptyHTML(icon,title,text,btn){
  return '<div class="empty">'+ic(icon)+'<h2>'+esc(title)+'</h2><p>'+esc(text)+'</p>'+(btn?'<button class="btn plain" id="'+btn.id+'" type="button">'+esc(btn.t)+'</button>':'')+'</div>';
}
function segHTML(id,n,i,tiles,sm){
  return '<div class="seg'+(sm?' sm':'')+'" id="'+id+'" style="--n:'+n+';--i:'+i+'"><span class="hl" aria-hidden="true"></span>'+
    tiles.map(function(t,k){return '<button type="button" id="'+t.id+'" class="'+(k===i?'is-on':'')+'" aria-pressed="'+(k===i)+'"><span>'+esc(t.t)+'</span></button>'}).join('')+'</div>';
}
function pillHTML(t,c){return '<span class="pill'+(c?' '+c:'')+'">'+esc(t)+'</span>'}
function countUp(el,from,to,dur,suffix){
  suffix=suffix||'';
  if(rm()||from===to||!window.requestAnimationFrame){el.textContent=to+suffix;return}
  var t0=performance.now();
  function f(now){var k=clamp((now-t0)/dur,0,1),e=1-Math.pow(1-k,3);el.textContent=Math.round(from+(to-from)*e)+suffix;if(k<1)requestAnimationFrame(f)}
  el.textContent=from+suffix;requestAnimationFrame(f);
}
function factBlocks(f){
  var h='';
  if(f.why)h+='<div class="blk"><div class="blk-l">Why it matters</div><p>'+T(f.why)+'</p></div>';
  if(f.share)h+='<div class="scope"><b>You can say</b><p>'+T(f.share)+'</p></div>';
  if(f.source)h+='<p class="src">Source: '+T(String(f.source).replace(/,?\s*https?:\/\/\S+/g,''))+'</p>';
  return h;
}

/* ---------- screens and routing ---------- */
var SCREENS=['home','read','learn','script','quiz','qa'];
var face={learn:'lessons',script:'script'};
var LFACES=['lessons','words','facts'];
var curScreen=null,scrolls={},R={},placedOnce=false;
function scrollKey(){return curScreen+(face[curScreen]?':'+face[curScreen]:'')}
function setTabbarHidden(h){$('tabbar').classList.toggle('is-hidden',h)}
function placeHl(instant){
  var tab=$('tab-'+curScreen),hl=$('tab-hl');
  if(!tab||!tab.offsetWidth)return;
  if(instant){hl.style.transition='none'}
  hl.style.width=tab.offsetWidth+'px';
  hl.style.transform='translateX('+(tab.offsetLeft-6)+'px)';
  if(instant){reflow(hl);hl.style.transition=''}
}
/* A pack without a script (an exam) shows its numbers under this tab; with neither, the tab goes. */
function syncTabs(){
  var t=$('tab-script'),qa=$('tab-qa');if(!t||!cur)return;
  var dly=isDaily(cur),noS=!sentsOf(cur).length,hasN=numsOf(cur).length>0,lab=dly?'News':noS?'Numbers':'Script';
  t.hidden=!dly&&noS&&!hasN;qa.hidden=!qaOf(cur).length;
  var n=6-(t.hidden?1:0)-(qa.hidden?1:0),bar=qs('.tabbar-in');bar.classList.toggle('five',n===5);bar.classList.toggle('four',n===4);
  qs('span:last-child',t).textContent=lab;qs('use',t).setAttribute('href',dly?'#i-news':noS?'#i-hash':'#i-mic');
  qs('#screen-script .hdr-title').textContent=lab;$('screen-script').setAttribute('aria-label',lab);
}
function show(name,o){
  o=o||{};syncTabs();
  if(curScreen)scrolls[scrollKey()]=window.scrollY;
  if(o.face)face[name]=o.face;
  var changed=curScreen!==name;
  curScreen=name;
  SCREENS.forEach(function(s){
    var el=$('screen-'+s),on=s===name;
    if(on&&!el.classList.contains('is-on')){el.classList.add('is-on')}
    else if(!on)el.classList.remove('is-on');
    var t=$('tab-'+s);t.classList.toggle('is-on',on);
    if(on)t.setAttribute('aria-current','page');else t.removeAttribute('aria-current');
  });
  R[name]();
  placeHl(!placedOnce);placedOnce=true;
  watchHeader();
  var y=scrolls[scrollKey()]||0;
  window.scrollTo(0,y);
  afterShow(name,changed);
  updateBadges();
}
function afterShow(name,changed){
  if(name==='home')animHome();
  if(name==='read')readAfterShow();
  syncHeader();
}
function refresh(){syncTabs();if(curScreen){var y=window.scrollY;R[curScreen]();window.scrollTo(0,y);if(curScreen==='home')animHome();if(curScreen==='read')readAfterShow(true);updateBadges()}}

var hdrRO=null;
function watchHeader(){
  var h=qs('.screen.is-on .hdr');if(!h)return;
  var set=function(){document.documentElement.style.setProperty('--hdr-h',h.offsetHeight+'px')};
  set();
  if(window.ResizeObserver){if(hdrRO)hdrRO.disconnect();hdrRO=new ResizeObserver(set);hdrRO.observe(h)}
}
function syncHeader(){var h=qs('.screen.is-on .hdr');if(h)h.classList.toggle('is-scrolled',window.scrollY>4)}
window.addEventListener('scroll',syncHeader,{passive:true});
window.addEventListener('resize',function(){placeHl(true)});

function closeAllLayers(){var n=0;while(topLayer()&&n++<10)topLayer().close()}
function route(){
  var h=(location.hash||'').replace(/^#/,'').toLowerCase(),m;
  if(layers.length)closeAllLayers();
  if(h==='words')show('learn',{face:'words'});
  else if(h==='facts')show('learn',{face:'facts'});
  else if(h==='numbers')show('script',{face:'numbers'});
  else if(h==='learn')show('learn',{face:'lessons'});
  else if(h==='script')show('script',{face:'script'});
  else if(h==='news')show('script',{face:'news'});
  else if(SCREENS.indexOf(h)>=0)show(h);
  else if((m=/^lesson-(\d+)$/.exec(h))){show('learn',{face:'lessons'});openLesson(+m[1]-1)}
  else if(h==='quiz-run'){show('quiz');openQuizRound(false)}
  else if(h==='qa-run'){show('qa');openQaRound('left')}
  else if((m=/^sentence-(\d+)$/.exec(h))){show('script',{face:'script'});openSentence(+m[1]-1)}
  else if(h==='streak'){show('home');openStreak()}
  else if(h==='packs'){show('home');openPacks()}
  else if(h==='readiness'){show('home');openReadiness()}
  else show('home');
}
window.addEventListener('hashchange',route);
function goTab(name,opts){
  if(sessionOpen())closeAllLayers();
  try{history.replaceState(null,'','#'+name)}catch(e){}
  show(name,opts);
}
$('tabbar').addEventListener('click',function(e){
  var t=e.target.closest('.tab');if(!t)return;
  var s=t.getAttribute('data-s');
  if(s===curScreen){window.scrollTo({top:0,behavior:rm()?'auto':'smooth'});return}
  try{history.replaceState(null,'','#'+(s==='learn'?'learn':s))}catch(er){}
  show(s,s==='learn'?{face:face.learn}:s==='script'?{face:face.script}:null);
});

/* ---------- home ---------- */
var ZZ=[0,20,30,20,0,-20,-30,-20],prevDone=null;
function nodeRowHTML(n,x){
  var cls='node-row'+(n.done?' is-done':n.cur?' is-current':'');
  if(n.done&&prevDone&&!prevDone[n.id])cls+=' just-done';
  var faceH=n.done?ic('check'):(n.num?'<span class="node-num">'+n.num+'</span>':ic(n.icon));
  var ring='';
  if(n.cur){
    ring='<svg class="node-ring ring-svg" viewBox="0 0 92 92" aria-hidden="true"><circle class="trk" cx="46" cy="46" r="43"/><circle class="arc'+(n.frac<=0?' is-zero':'')+'" cx="46" cy="46" r="43" stroke-dasharray="'+RING.node+'" stroke-dashoffset="'+ringOff(RING.node,n.frac)+'"/></svg>';
  }
  var aria=n.aria+', '+n.detail.replace(/^Lesson \d+ · /,'')+(n.cur?', up next':n.done?', done':'')+'.';
  return '<button class="'+cls+'" id="'+n.id+'" type="button" data-kind="'+n.kind+'" data-idx="'+n.idx+'" style="--x:'+x+'px" aria-label="'+esc(aria)+'">'+
    '<span class="node-lane">'+ring+'<span class="node-wrap"><span class="node">'+faceH+'</span></span></span>'+
    '<span class="node-label">'+(n.cur?'<span class="pill go">Up next</span>':'')+'<span class="node-title">'+T(n.title)+'</span><span class="node-detail">'+T(n.detail)+'</span></span></button>';
}
function featureIdx(p){var f=factsOf(p);if(!f.length)return 0;var d=dayKey(Date.now()).split('-');var n=Math.floor(Date.UTC(+d[0],+d[1]-1,+d[2])/86400000);return n%f.length}
function renderHome(){
  var p=cur,ps=PS(p),path=buildPath(p),hero=heroInfo(p,path),from=clamp(ps.shown||0,0,100),dly=isDaily(p);
  var h='';
  if(!storeOK)h+='<div class="card notice warn" role="status"><p class="notice-title">Your progress can\'t be saved here</p><p class="notice-text">This browser is blocking storage, usually because of a Private tab or Block All Cookies. Open Prep from its Home Screen icon to keep your progress.</p></div>';
  else if(!standalone&&navigator.maxTouchPoints>0&&!G.hints.homescreen)h+='<div class="card notice" role="note"><p class="notice-title">Keep your progress: use the Home Screen app</p><p class="notice-text">In Safari, tap Share, then Add to Home Screen, and open Prep from the icon. A Private tab forgets your progress when it closes, and the Home Screen app keeps its own progress, separate from Safari.</p><button class="btn plain compact" id="hs-ok" type="button">Got it</button></div>';
  h+='<button class="pack row-press" id="pack-switch" type="button" aria-haspopup="dialog"><span class="pack-icon">'+ic(dly?'sun':'pres')+'</span><span class="pack-text"><span class="pack-course">'+T(p.course)+'</span><span class="pack-title">'+T(p.title)+'</span></span>'+ic('down','chev')+'</button>';
  h+='<div class="card hero"><div class="hero-top">'+
    '<button class="meter" id="home-meter" type="button" aria-haspopup="dialog" aria-label="Readiness '+readiness(p)+' percent. Show details."><svg class="ring-svg" viewBox="0 0 112 112" aria-hidden="true"><circle class="trk" cx="56" cy="56" r="50"/><circle class="arc'+(from<=0?' is-zero':'')+'" id="meter-arc" cx="56" cy="56" r="50" stroke-dasharray="'+RING.meter+'" stroke-dashoffset="'+ringOff(RING.meter,from/100)+'"/></svg><span class="meter-val"><span class="meter-num"><span id="meter-num">'+from+'</span><small>%</small></span><span class="meter-cap">'+(dly?'done':'ready')+'</span></span></button>'+
    '<div class="count"><div class="count-label" id="count-label"></div><div class="count-value" id="count-value"></div>'+
    (dly?'<div class="count-line">'+ic('clock')+'<span>About '+dailyMinutes(p)+' min</span></div><div class="count-line">'+ic('news')+'<span>'+plural(newsOf(p).length,'story','stories')+' · '+plural(wordsOf(p).length,'new word')+'</span></div>':
    '<div class="count-line">'+ic('clock')+'<span>'+esc(fmtWhen(p))+'</span></div>'+
    (p.place?'<div class="count-line">'+ic('pin')+'<span>'+T(cap(p.place))+'</span></div>':''))+'</div></div>'+
    '<p class="hero-next">'+(hero.line?esc(hero.line):'Up next: <b>'+T(hero.bold)+'</b>')+'</p>'+
    '<button class="btn" id="home-continue" type="button">'+esc(hero.label)+'</button>'+
    (storeOK?'':'<p class="save-note">This browser cannot save your progress.</p>')+'</div>';
  h+='<div class="sec"><h2>Your plan</h2><p>Tap any step to open it.</p></div>';
  path.units.forEach(function(u){
    h+='<div class="unit'+(u.done?' is-done':'')+'"><span class="unit-num">'+(u.done?ic('check'):u.n)+'</span><span class="unit-text">'+T(u.text)+'</span></div>';
    u.nodes.forEach(function(n){h+=nodeRowHTML(n,ZZ[n.pos%8])});
  });
  var all=path.allDone;
  h+='<div class="node-row is-finish'+(all?' is-all-done':'')+'" id="node-finish-0" style="--x:'+ZZ[path.finishPos%8]+'px"><span class="node-lane"><span class="node-wrap"><span class="node">'+ic('flag')+'</span></span></span><span class="node-label"><span class="node-title">'+T(dly?'Your day':shortTitle(p))+'</span><span class="node-detail">'+(all?'Every step done':dly?'About '+dailyMinutes(p)+' min in all':esc(fmtWhen(p)))+'</span></span></div>';
  var fl=factsOf(p);
  if(fl.length){
    var f=fl[featureIdx(p)];
    h+='<button class="card fact row-press" id="inspire-feature" type="button"><div class="fact-k">Did you know</div><div class="fact-title">'+T(f.title)+'</div><p class="fact-b">'+T(f.fact)+'</p></button>';
  }
  var nd={};path.nodes.forEach(function(n){if(n.done)nd[n.id]=true});
  var jd=prevDone;prevDone=nd;
  $('home-body').innerHTML=h;
  home._ready=readiness(p);home._hero=hero;
  $('readiness-title').textContent=dly?'Your day so far':'How ready you are';
  updateCountdown();
}
var home={};
function animHome(){
  var p=cur,ps=PS(p),to=readiness(p),from=clamp(ps.shown||0,0,100);
  var arc=$('meter-arc'),num=$('meter-num');if(!arc)return;
  $('home-meter').setAttribute('aria-label','Readiness '+to+' percent. Show details.');
  ps.shown=to;saveP(p);
  if(from===to){num.textContent=to;return}
  later(function(){
    if(rm()){setArc(arc,RING.meter,to/100);num.textContent=to;return}
    setArc(arc,RING.meter,to/100);countUp(num,from,to,700);
  },150);
}
function updateCountdown(){
  var p=cur;if(!p)return;
  var l=$('count-label'),v=$('count-value');if(!l)return;
  if(isDaily(p)){l.textContent=p.day===today()?"Today's page":'Page from';v.textContent=dayLabel(p.day);return}
  var now=Date.now(),st=startOf(p),d=st-now,H=3600000;
  if(d<=-2*H){l.textContent='Presented on';v.textContent=fmtDate(p)}
  else if(d<=0){l.textContent='It is time';v.textContent='Good luck!'}
  else{
    l.textContent=shortTitle(p)+' in';
    if(d>48*H)v.textContent=plural(Math.floor(d/(24*H)),'day');
    else if(d>=24*H)v.textContent='1 day '+Math.floor((d-24*H)/H)+' h';
    else if(d>=H)v.textContent=Math.floor(d/H)+' h '+Math.floor((d%H)/60000)+' min';
    else v.textContent=Math.max(1,Math.floor(d/60000))+' min';
  }
}
document.addEventListener('visibilitychange',function(){if(!document.hidden)updateCountdown()});

function startStep(kind,idx){
  if(kind==='lessons')openLesson(idx);
  else if(kind==='read'){var pl=PS(cur).place;readPlaced=false;goTab('read');if(!pl)readGoFirstUnread()}
  else if(kind==='script')goTab('script',{face:'script'});
  else if(kind==='quiz')openQuizRound(false);
  else if(kind==='questions')openQaRound('left');
  else if(kind==='numbers')goTab('script',{face:'numbers'});
  else if(kind==='news')goTab('script',{face:'news'});
}
$('home-body').addEventListener('click',function(e){
  var n=e.target.closest('.node-row[data-kind]');
  if(n){startStep(n.getAttribute('data-kind'),+n.getAttribute('data-idx'));return}
  if(e.target.closest('#home-continue')){var hi=home._hero;startStep(hi.kind,hi.idx);return}
  if(e.target.closest('#home-meter')){openReadiness();return}
  if(e.target.closest('#hs-ok')){G.hints.homescreen=true;saveG();refresh();return}
  if(e.target.closest('#pack-switch')){openPacks();return}
  if(e.target.closest('#inspire-feature')){goTab('learn',{face:'facts'});return}
});
R.home=renderHome;

/* ---------- streak card ---------- */
var SEGGOALS=[5,10,15,20];
function openStreak(){
  var sc=$('spop-scrim'),sp=$('spop');
  if(!sp.hidden)return;
  stopSpeech();
  buildStreakCard();
  sc.hidden=false;reflow(sc);sc.classList.add('is-open');
  openEl(sp);
  pushLayer(sp,closeStreak,$('streak-card'),false);
}
function closeStreak(){
  var sp=$('spop'),sc=$('spop-scrim');
  if(sp.hidden||!sp.classList.contains('is-open'))return;
  sc.classList.remove('is-open');closeEl(sp,false);
  later(function(){if(!sc.classList.contains('is-open'))sc.hidden=true},300);
  popLayer(sp);
}
$('spop-scrim').addEventListener('click',closeStreak);
function buildStreakCard(){
  var gi=SEGGOALS.indexOf(G.goal);
  $('streak-card').innerHTML='<div class="s-head" id="sc-head"></div><div class="week" id="sc-week"></div>'+
    '<div class="goal"><div id="sc-goal"></div><div class="lbl">Daily goal</div>'+
    segHTML('seg-goal',4,gi,SEGGOALS.map(function(g){return {id:'goal-'+g,t:g+' min'}}),true)+'</div>';
  renderStreakCard();
}
function renderStreakCard(){
  if(!$('sc-head'))return;
  var n=streakNow(),best=bestStreak(),k=today(),secs=todaySecs(),met=isMet(k),g=G.goal;
  var title,sub;
  if(n===0&&best===0){title='No streak yet';sub='Study '+g+' minutes to start one.'}
  else if(n===0){title='Start a new streak';sub='Best: '+plural(best,'day')}
  else{title=n+' day streak';sub='Best: '+plural(best,'day')}
  $('sc-head').innerHTML='<span class="flame-disc">'+ic('flame','fill')+'</span><div><div class="s-title" id="streak-title">'+esc(title)+'</div><div class="s-sub">'+esc(sub)+'</div></div>';
  var dow=keyDow(k),L='MTWTFSS',w='';
  for(var i=0;i<7;i++){
    var dk=shiftKey(k,i-dow),m=isMet(dk);
    w+='<div class="day'+(m?' met':'')+(i===dow?' today':'')+'"><i>'+(m?ic('check'):'')+'</i><span>'+L.charAt(i)+'</span></div>';
  }
  $('sc-week').innerHTML=w;
  var mins=Math.min(Math.floor(secs/60),g);
  $('sc-goal').innerHTML='<div class="part-row"><span>Today</span><span class="v">'+mins+' of '+g+' min</span>'+(met?'<span class="part-check">'+ic('check')+'</span>':'')+'</div>'+
    '<div class="gbar orange" style="--p:'+(met?1:clamp(secs/(g*60),0,1))+'"><i></i></div><p class="foot">Study '+g+' minutes a day to keep your streak.</p>';
  var seg=$('seg-goal'),gi=SEGGOALS.indexOf(g);
  if(seg){seg.style.setProperty('--i',gi);qsa('button',seg).forEach(function(b,j){b.classList.toggle('is-on',j===gi);b.setAttribute('aria-pressed',j===gi)})}
}
document.addEventListener('click',function(e){
  var b=e.target.closest('.streak');
  if(b){openStreak();return}
  var gb=e.target.closest('#seg-goal button');
  if(gb){setGoal(+gb.id.replace('goal-',''))}
});

/* ---------- presentations sheet ---------- */
function whenLine(p){
  if(isDaily(p))return dayLabel(p.day)+(p.day===today()?' · today':'');
  if(!isUpcoming(p))return 'Presented on '+fmtDate(p);
  var off=offMin(p)*60000,dn=Math.floor((Date.now()+off)/86400000),dp=Math.floor((startOf(p)+off)/86400000),diff=dp-dn;
  var tag=diff<=0?'today':diff===1?'tomorrow':'in '+diff+' days';
  return fmtWhen(p)+' · '+tag;
}
function packRow(p){
  var r=readiness(p),sel=p===cur;
  return '<button class="prow row-press'+(sel?' is-on':'')+'" id="pack-row-'+esc(p.id)+'" type="button" data-id="'+esc(p.id)+'" aria-pressed="'+sel+'"><span class="mring"><svg class="ring-svg" viewBox="0 0 46 46" aria-hidden="true"><circle class="trk" cx="23" cy="23" r="20.5"/><circle class="arc'+(r<=0?' is-zero':'')+'" cx="23" cy="23" r="20.5" stroke-dasharray="'+RING.mini+'" stroke-dashoffset="'+ringOff(RING.mini,r/100)+'"/></svg><b>'+r+'%</b></span>'+
    '<span class="prow-text"><span class="c">'+T(p.course)+'</span><span class="t">'+T(p.title)+'</span><span class="w">'+esc(whenLine(p))+'</span></span>'+(sel?'<span class="okdisc">'+ic('check')+'</span>':'')+'</button>';
}
function openPacks(){
  var pres=packs.filter(function(p){return !isDaily(p)}),td=todayDaily();
  var up=pres.filter(isUpcoming).sort(function(a,b){return startOf(a)-startOf(b)});
  var past=pres.filter(function(p){return !isUpcoming(p)}).sort(function(a,b){return startOf(b)-startOf(a)});
  var earlier=dailyDays().filter(function(p){return p!==td}).slice(0,14);
  var h='';
  if(td)h+='<div class="sub-h">Today</div>'+packRow(td);
  if(up.length)h+='<div class="sub-h">Upcoming</div>'+up.map(packRow).join('');
  if(earlier.length)h+='<div class="sub-h">Earlier days</div>'+earlier.map(packRow).join('');
  if(past.length)h+='<div class="sub-h">Past</div>'+past.map(packRow).join('');
  h+='<p class="foot">A new pack shows up here when it is added.</p>';
  if(!dLoaded&&dailyOK())h+='<button class="lockrow row-press" id="daily-unlock-row" type="button">'+ic('lock')+'<span>Daily page</span></button>';
  $('packs-body').innerHTML=h;
  openSheet('sheet-packs','packs-close');
}
$('packs-close').addEventListener('click',function(){closeSheet('sheet-packs')});
$('packs-body').addEventListener('click',function(e){
  if(e.target.closest('#daily-unlock-row')){closeSheet('sheet-packs');later(dailyAsk,320);return}
  var r=e.target.closest('.prow');if(!r)return;
  var id=r.getAttribute('data-id'),p=packs.filter(function(x){return x.id===id})[0];
  closeSheet('sheet-packs');
  if(p&&p!==cur)selectPack(p);
});
function selectPack(p,auto){
  closeAllLayers();stopSpeech();
  resetTimer(true);
  setSelected(p);prevDone=null;scrolls={};readPlaced=false;
  if(!auto)wr(SELDAY,{day:today(),id:p.id});
  face.learn='lessons';face.script=isDaily(p)?'news':'script';
  var s=curScreen||'home';curScreen=null;
  if((s==='qa'&&!qaOf(p).length)||(s==='script'&&!isDaily(p)&&!sentsOf(p).length&&!numsOf(p).length))s='home';
  show(s);
}

/* ---------- readiness sheet ---------- */
function openReadiness(){
  var p=cur,h='';
  readyParts(p).forEach(function(x){
    var full=x.n>=x.d;
    h+='<div class="part"><div class="part-row"><span>'+esc(x.label)+'</span><span class="v">'+x.n+' of '+x.d+'</span>'+(full?'<span class="part-check">'+ic('check')+'</span>':'')+'</div><div class="gbar" style="--p:'+clamp(x.n/x.d,0,1)+'"><i></i></div></div>';
  });
  h+='<p class="foot">'+(isDaily(p)?'Your day fills up as you go. The lesson counts most, then your best quiz round.':'Readiness grows with real practice. Lessons count most. Your best quiz round counts, not your last.')+'</p>';
  $('readiness-body').innerHTML=h;
  openSheet('sheet-readiness','readiness-close');
}
$('readiness-close').addEventListener('click',function(){closeSheet('sheet-readiness')});
