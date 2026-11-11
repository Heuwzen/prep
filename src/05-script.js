/* ---------- script ---------- */
var TM={state:'idle',acc:0,seg0:0,msg:null,msgT:null,timer:null,cued:false};
var RUN_MIN=90;
var SENTS=[],sentOpen=-1,speakingSent=-1;
function sayBtn(key,label,cls){
  return SYN?'<button class="icon-btn '+(cls||'')+'" type="button" data-lk="'+key+'" aria-label="'+esc(label)+'" aria-pressed="false">'+ic('vol')+'</button>':'';
}
var numShown={};
function numCardHTML(n,i,hid){
  var hidden=hid&&!numShown[cur.id+':'+i];
  return '<div class="card num'+(hidden?' is-hidden':'')+'" id="num-'+i+'"><div class="num-val">'+(hidden?'<button class="num-chip" type="button" aria-label="'+esc(t('Show this number'))+'">?</button>':T(n.value))+'</div>'+
    (n.say?'<div class="num-say"><span>“'+T(n.say)+'”</span>'+
    (SYN?'<button class="icon-btn sm" id="num-say-'+i+'" type="button" data-lk="num-'+i+'" aria-label="'+esc(t('Say {0}',n.say))+'" aria-pressed="false">'+ic('vol')+'</button>':'')+'</div>':'')+
    '<p class="num-mean">'+T(n.meaning)+'</p><div class="scope"><b>'+t('Exact scope')+'</b><p>'+T(n.scope)+'</p></div><div class="src">'+T(n.source)+'</div></div>';
}
function scriptFaceHTML(){
  var p=cur,f=face.script,h='';
  if(f==='numbers'){
    var ns=numsOf(p),ps=PS(p);
    if(!ns.length)return emptyHTML('hash',t('No numbers in this pack.'),'');
    h+='<p class="desc">'+(scriptParts(p).length?t('The numbers in your script, how to say them, and what they cover.'):t('The numbers from the slides, and exactly what each one covers.'))+'</p>';
    var hid=LEAN&&!!ps.numHide;
    if(LEAN)h+='<div class="num-tools"><button class="btn plain compact" id="numbers-hide" type="button" aria-pressed="'+hid+'">'+(hid?t('Show numbers'):t('Hide numbers'))+'</button></div>';
    var byUnit=[],seenU={};
    ns.forEach(function(n,i){var k=n.lec!=null?+n.lec:null;if(!seenU[k]){seenU[k]={lec:k,list:[]};byUnit.push(seenU[k])}seenU[k].list.push(i)});
    var grouped=byUnit.some(function(g){return g.lec!=null});
    if(grouped){
      var order=unitOrder(p,byUnit.filter(function(g){return g.lec!=null}).map(function(g){return g.lec}));
      byUnit=(seenU[null]?[seenU[null]]:[]).concat(order.filter(function(k){return seenU[k]}).map(function(k){return seenU[k]}));
    }
    byUnit.forEach(function(g){
      if(grouped&&g.lec!=null){var ut=unitTitle(p,g.lec);h+='<h2 class="sc-h">'+T(unitName(p,g.lec)+(ut?' · '+ut:''))+'</h2>'}
      g.list.forEach(function(i){h+=numCardHTML(ns[i],i,hid)});
    });
    var on=!!ps.numbersDone;
    h+='<div class="numbers-mark"><button class="btn '+(on?'done-soft':'plain')+'" id="numbers-mark" type="button" aria-pressed="'+on+'">'+ic('check')+(on?t('Marked as read'):t('Mark as read'))+'</button></div>';
    return h;
  }
  var parts=scriptParts(p);
  if(!parts.length)return emptyHTML('mic',t('No script in this pack.'),'');
  h+='<div class="band"><div class="card practice"><div class="pr-row"><div class="pr-time"><div class="pr-digits" id="timer-digits">3:00</div></div><div class="pr-btns" id="timer-btns"></div><div class="pr-cap"><span id="timer-cap"></span><button class="textbtn" id="timer-reset" type="button" hidden>'+t('Reset')+'</button></div></div><div class="tbar" id="timer-bar"><i style="width:0%"></i></div></div></div>';
  h+='<div class="hint" id="script-hint"'+(G.hints.sentence?' hidden':'')+'>'+ic('tap')+'<span>'+t('Tap any sentence to see why it is true.')+'</span></div>';
  var g=0;
  parts.forEach(function(pt){
    h+='<h2 class="sc-h">'+esc(cap(pt.key))+'</h2>';
    var open=false;
    pt.list.forEach(function(s,i){
      /* A sentence that carries a slide starts a new block under that slide's label, in deck order. */
      var sl=s.slide&&s.slide.n?s.slide:null;
      if(sl||!open){
        if(open)h+='</p>';
        if(sl)h+='<p class="sc-slide"><span class="pill">'+esc(t('Slide {0}',String(sl.n)))+'</span><span>'+esc(sl.title||'')+'</span></p>';
        h+='<p class="sc-p">';open=true;
      }else h+=' ';
      h+='<span class="sent" role="button" tabindex="0" id="sent-'+esc(pt.key)+'-'+i+'" data-g="'+g+'">'+T(s.sentence)+'</span>';g++;
    });
    if(open)h+='</p>';
  });
  return h;
}
function renderScript(){
  SENTS=sentsOf(cur);
  if(isDaily(cur)){face.script='news';$('script-body').innerHTML='<div id="script-face">'+newsHTML(cur)+'</div>';return}
  var noS=!scriptParts(cur).length;if(noS)face.script='numbers';
  var f=face.script;
  $('script-body').innerHTML=noS?'<div id="script-face">'+scriptFaceHTML()+'</div>':'<div id="script-seg">'+segHTML('seg-script-face',2,f==='numbers'?1:0,[{id:'seg-script',t:t('Your script')},{id:'seg-numbers',t:t('Numbers')}])+'</div><div id="script-face">'+scriptFaceHTML()+'</div>';
  afterScriptFace();
}
function afterScriptFace(){
  $('screen-script').classList.toggle('is-practising',TM.state==='running');
  updateTimerUI();
  if(speakingSent>=0&&speaking&&speakKey==='script')markSpeaking(speakingSent);
  if(sentOpen>=0)markOpen(sentOpen);
  updateListenUI();
}
R.script=renderScript;
$('script-body').addEventListener('click',function(e){
  var s=e.target.closest('#seg-script,#seg-numbers');
  if(s){
    var nf=s.id==='seg-numbers'?'numbers':'script';
    if(nf===face.script)return;
    scrolls[scrollKey()]=window.scrollY;
    face.script=nf;
    var seg=$('seg-script-face');seg.style.setProperty('--i',nf==='numbers'?1:0);
    qsa('button',seg).forEach(function(b){var on=b===s;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',on)});
    stopSpeech();
    $('script-face').innerHTML=scriptFaceHTML();afterScriptFace();
    try{history.replaceState(null,'','#'+(nf==='numbers'?'numbers':'script'))}catch(er){}
    window.scrollTo(0,scrolls[scrollKey()]||0);
    return;
  }
  var se=e.target.closest('.sent');
  if(se&&TM.state!=='running'){openSentence(+se.getAttribute('data-g'));return}
  var lk=e.target.closest('[data-lk]');
  if(lk){
    var k=lk.getAttribute('data-lk');
    if(speaking&&speakKey===k){stopSpeech();return}
    if(k==='script')scriptListen();
    else if(k.indexOf('num-')===0){var n=numsOf(cur)[+k.slice(4)];speakList([n.say],k)}
    return;
  }
  var tb=e.target.closest('#timer-btns button,#timer-reset');
  if(tb){timerAction(tb.id);return}
  var nh=e.target.closest('#numbers-hide');
  if(nh){
    var hp=PS(cur);hp.numHide=!hp.numHide;saveP(cur);
    Object.keys(numShown).forEach(function(k){if(k.indexOf(cur.id+':')===0)delete numShown[k]});
    stopSpeech();
    $('script-face').innerHTML=scriptFaceHTML();afterScriptFace();
    return;
  }
  var nc=e.target.closest('.num.is-hidden');
  if(nc){
    var ni=+nc.id.replace('num-','');numShown[cur.id+':'+ni]=true;
    var nv=numsOf(cur)[ni];
    nc.classList.remove('is-hidden');qs('.num-val',nc).innerHTML=T(nv.value);
    return;
  }
  var nm=e.target.closest('#numbers-mark');
  if(nm){
    var ps=PS(cur);ps.numbersDone=ps.numbersDone?null:new Date().toISOString();saveP(cur);
    var on=!!ps.numbersDone;
    nm.className='btn '+(on?'done-soft':'plain');nm.setAttribute('aria-pressed',on);
    nm.innerHTML=ic('check')+(on?t('Marked as read'):t('Mark as read'));playSound('tick');
  }
});
$('script-body').addEventListener('keydown',function(e){
  var se=e.target.closest&&e.target.closest('.sent');
  if(se&&(e.key==='Enter'||e.key===' ')&&TM.state!=='running'){e.preventDefault();openSentence(+se.getAttribute('data-g'))}
});
/* highlights */
function sentEl(g){var s=SENTS[g];return s?$('sent-'+s.part+'-'+s.i):null}
function markOpen(g){qsa('.sent.is-open').forEach(function(x){x.classList.remove('is-open')});var el=sentEl(g);if(el)el.classList.add('is-open')}
function markSpeaking(g){
  clearSpeaking();speakingSent=g;
  var el=sentEl(g);if(!el)return;
  el.classList.add('speaking');
  if(curScreen==='script'&&face.script==='script'){
    var r=el.getBoundingClientRect(),bandB=(qs('.band')||{getBoundingClientRect:function(){return {bottom:0}}}).getBoundingClientRect().bottom;
    var target=window.scrollY+r.top-window.innerHeight*0.35;
    if(r.top<bandB+10||r.bottom>window.innerHeight*0.7)window.scrollTo({top:Math.max(0,target),behavior:rm()?'auto':'smooth'});
  }
}
function clearSpeaking(){qsa('.sent.speaking').forEach(function(x){x.classList.remove('speaking')});speakingSent=-1}
function scriptListen(){
  var list=SENTS.map(function(s){return s.s.sentence});
  speakList(list,'script',function(i){markSpeaking(i)});
}
/* sentence sheet */
function openSentence(g){
  if(g<0||g>=SENTS.length)return;
  var first=sheetSentenceOpenFresh();
  sentOpen=g;
  G.hints.sentence=true;saveG();
  var h=$('script-hint');if(h)h.hidden=true;
  fillSentence();
  markOpen(g);
  if(first)openSheet('sheet-sentence','sheet-close',function(){
    var el=sentEl(sentOpen);
    sentOpen=-1;
    if(el){el.scrollIntoView({block:'center',behavior:rm()?'auto':'smooth'})}
    qsa('.sent.is-open').forEach(function(x){x.classList.remove('is-open')});
  });
}
function sheetSentenceOpenFresh(){return $('sheet-sentence').hidden||!$('sheet-sentence').classList.contains('is-open')}
function fillSentence(){
  var s=SENTS[sentOpen],x=s.s,pi=s.i+1;
  $('sheet-kick').textContent=cap(s.part)+' · '+t('sentence {0} of {1}',pi,s.n);
  var wp=PS(cur);wp.why[s.part+':'+s.i]=1;saveP(cur);
  var h='<p class="quote">'+T(x.sentence)+'</p>'+
    (x.fact?'<div class="blk"><div class="blk-l g">'+t('Why it is true')+'</div><p>'+T(x.fact)+'</p></div>':'')+
    (x.source?'<div class="blk"><div class="blk-l">'+t('Source')+'</div><p class="srcp">'+T(x.source)+'</p></div>':'')+
    (x.question||x.answer?'<div class="ask">'+(x.question?'<div class="blk-l">'+t('They might ask')+'</div><p class="q">'+T(x.question)+'</p>':'')+(x.answer?'<div class="blk-l g">'+t('You can say')+'</div><p>'+T(x.answer)+'</p>':'')+'</div>':'');
  $('sheet-sentence-body').innerHTML=h;$('sheet-sentence-body').scrollTop=0;
  $('sentence-back').disabled=sentOpen===0;
  var last=sentOpen===SENTS.length-1;
  $('sentence-next').textContent=last?t('Done'):t('Next sentence');
}
$('sheet-close').addEventListener('click',function(){closeSheet('sheet-sentence')});
$('sentence-back').addEventListener('click',function(){if(sentOpen>0){sentOpen--;fillSentence();markOpen(sentOpen);var el=sentEl(sentOpen);if(el)el.scrollIntoView({block:'center',behavior:rm()?'auto':'smooth'})}});
$('sentence-next').addEventListener('click',function(){
  if(sentOpen>=SENTS.length-1){closeSheet('sheet-sentence');return}
  sentOpen++;fillSentence();markOpen(sentOpen);
  var el=sentEl(sentOpen);if(el)el.scrollIntoView({block:'center',behavior:rm()?'auto':'smooth'});
});

/* ---------- practice timer ---------- */
function elapsedMs(){return TM.acc+(TM.state==='running'?performance.now()-TM.seg0:0)}
function btnH(id,cls,icn,t,lk){return '<button class="btn compact '+cls+'" id="'+id+'" type="button"'+(lk?' data-lk="'+lk+'" aria-pressed="false"':'')+'>'+ic(icn)+'<span'+(lk?' class="lk-t"':'')+'>'+t+'</span></button>'}
function updateTimerUI(){
  var dg=$('timer-digits');if(!dg)return;
  var cap_=$('timer-cap'),btns=$('timer-btns'),bar=qs('#timer-bar i'),tb=$('timer-bar');
  var el=elapsedMs(),rem=Math.max(0,180000-el),over=el>180000;
  var runs=PS(cur).runs.length;
  dg.textContent=over?'+'+mmss((el-180000)/1000):(TM.state==='idle'?'3:00':mmss(Math.ceil(rem/1000)));
  dg.classList.toggle('over',over&&TM.state!=='idle');
  tb.classList.toggle('over',over);
  bar.style.width=(TM.state==='idle'?0:Math.min(1,el/180000)*100)+'%';
  var html='',capT='',capOk=false;
  if(TM.msg){capT=TM.msg.t;capOk=TM.msg.ok}
  if(TM.state==='idle'){
    if(!TM.msg)capT=runs>=2?t('2 runs done. One more?'):t('Practice run {0} of 2',runs+1);
    html=(SYN?btnH('script-listen','plain','vol',t('Listen'),'script'):'')+btnH('timer-start','','timer',t('Start'));
  }else if(TM.state==='running'){
    capT=over?t('Over 3 minutes'):t('Read it out loud');
    html=btnH('timer-pause','plain','pause',t('Pause'))+btnH('timer-done','','check',t('Done'));
  }else{
    capT=over?t('Paused at {0}','+'+mmss((el-180000)/1000)):t('Paused at {0}',mmss(Math.ceil(rem/1000)));
    html=btnH('timer-resume','plain','play',t('Resume'))+btnH('timer-done','','check',t('Done'));
  }
  var rs=$('timer-reset');if(rs)rs.hidden=TM.state!=='paused';
  if(btns.getAttribute('data-st')!==TM.state){btns.innerHTML=html;btns.setAttribute('data-st',TM.state);updateListenUI()}
  cap_.textContent=capT;cap_.classList.toggle('ok',capOk);
  var hint=$('script-hint');if(hint&&!G.hints.sentence)hint.hidden=TM.state==='running';
}
function timerTick(){
  if(TM.state==='running'){
    var el=elapsedMs();
    if(!TM.cued&&el>=180000){TM.cued=true;playSound('goal');announce(t('Three minutes.'))}
    if(el>600000){TM.acc+=performance.now()-TM.seg0;TM.state='paused';syncRunning();var b=$('timer-btns');if(b)b.removeAttribute('data-st')}
  }
  updateTimerUI();
}
function timerAction(id){
  if(id==='timer-start'){
    stopSpeech();clearTimeout(TM.msgT);TM.msg=null;
    TM.state='running';TM.acc=0;TM.seg0=performance.now();TM.cued=false;
  }else if(id==='timer-pause'){TM.acc+=performance.now()-TM.seg0;TM.state='paused'}
  else if(id==='timer-resume'){TM.seg0=performance.now();TM.state='running'}
  else if(id==='timer-reset'){resetTimer()}
  else if(id==='timer-done'){timerDone();return}
  syncRunning();
  $('timer-btns').removeAttribute('data-st');
  updateTimerUI();
}
function syncRunning(){
  var run=TM.state==='running',act=TM.state!=='idle';
  $('screen-script').classList.toggle('is-practising',run);
  setTabbarHidden(act&&TM.state==='running');
  if(act&&!TM.timer)TM.timer=setInterval(timerTick,250);
  if(!act&&TM.timer){clearInterval(TM.timer);TM.timer=null}
  if(TM.state==='paused')setTabbarHidden(false);
}
function resetTimer(silent){
  TM.state='idle';TM.acc=0;TM.seg0=0;TM.cued=false;
  if(silent){clearTimeout(TM.msgT);TM.msg=null}
  syncRunning();
  var b=$('timer-btns');if(b)b.removeAttribute('data-st');
  updateTimerUI();
}
function timerDone(){
  var secs=Math.round(elapsedMs()/1000),ps=PS(cur);
  TM.state='idle';TM.acc=0;TM.cued=false;
  clearTimeout(TM.msgT);
  if(secs>=RUN_MIN){
    ps.runs.push({at:new Date().toISOString(),secs:secs});saveP(cur);
    var n=ps.runs.length;
    TM.msg={t:t('Run {0} saved: {1}',n,mmss(secs)),ok:true};
    playSound('tick');
    announce(t('Run {0} saved, {1} minutes {2} seconds.',n,Math.floor(secs/60),secs%60));
  }else{
    TM.msg={t:t('Too short to count. A run needs at least 1:30.'),ok:false};
  }
  TM.msgT=later(function(){TM.msg=null;updateTimerUI()},4000);
  syncRunning();
  var b=$('timer-btns');if(b)b.removeAttribute('data-st');
  updateTimerUI();
}
