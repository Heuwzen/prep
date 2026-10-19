/* ---------- selected pack ---------- */
var cur=null;
function pickInitialPack(){
  var sel=rd('prep.v1.selected'),saved=null;
  packs.forEach(function(p){if(p.id===sel)saved=p});
  var up=packs.filter(isUpcoming).sort(function(a,b){return startOf(a)-startOf(b)});
  var past=packs.filter(function(p){return !isUpcoming(p)}).sort(function(a,b){return startOf(b)-startOf(a)});
  if(saved&&isUpcoming(saved))return saved;
  if(up.length)return up[0];
  return saved||past[0]||packs[0];
}
function setSelected(p){cur=p;wr('prep.v1.selected',p.id)}

/* ---------- readiness ---------- */
function lessonsDone(p){var ps=PS(p);return L_(p).filter(function(l){return ps.lessons[l.id]&&ps.lessons[l.id].done}).length}
function chaptersRead(p){var ps=PS(p);return chaptersOf(p).filter(function(c,i){return ps.chapters[i]}).length}
function qaGot(p){var ps=PS(p);return qaOf(p).filter(function(q,i){return ps.qa.status[i]==='got'}).length}
function readyParts(p){
  var ps=PS(p),a=[];
  if(L_(p).length)a.push({k:'lessons',label:'Lessons',w:3,n:lessonsDone(p),d:L_(p).length});
  if(chaptersOf(p).length)a.push({k:'chapters',label:'Chapters',w:1,n:chaptersRead(p),d:chaptersOf(p).length});
  if(sentsOf(p).length)a.push({k:'runs',label:'Practice runs',w:2,n:Math.min(2,ps.runs.length),d:2});
  if(sentsOf(p).length)a.push({k:'why',label:'Sentences you checked',w:2,n:Math.min(Object.keys(ps.why||{}).length,sentsOf(p).length),d:sentsOf(p).length});
  if(numsOf(p).length)a.push({k:'numbers',label:'Numbers gone over',w:1,n:ps.numbersDone?1:0,d:1});
  if(quizOf(p).length)a.push({k:'quiz',label:'Quiz, best round',w:2,n:quizScore(p),d:quizOf(p).length});
  if(qaOf(p).length)a.push({k:'qa',label:'Questions you got',w:2,n:qaGot(p),d:qaOf(p).length});
  return a;
}
/* Best full round, or the best lecture rounds added up, whichever is higher. */
function quizScore(p){var q=PS(p).quiz,s=0;Object.keys(q.lecBest||{}).forEach(function(k){s+=+q.lecBest[k]||0});return Math.min(Math.max(q.best,s),quizOf(p).length)}
function readiness(p){
  var a=readyParts(p),s=0,w=0;
  a.forEach(function(x){s+=x.w*x.n/x.d;w+=x.w});
  return w?Math.round(100*s/w):0;
}

/* ---------- study time, goal, streak ---------- */
var lastInput=Date.now(),speaking=false,goalWait=false;
['pointerdown','keydown','scroll','touchstart'].forEach(function(ev){window.addEventListener(ev,function(){lastInput=Date.now()},{passive:true,capture:true})});
function today(){return dayKey(Date.now())}
function dayRec(k){if(!G.days[k])G.days[k]={s:0,met:false};return G.days[k]}
function isMet(k){var d=G.days[k];return !!(d&&d.met)}
function streakNow(){
  var k=today();
  if(!isMet(k))k=shiftKey(k,-1);
  var n=0;while(isMet(k)){n++;k=shiftKey(k,-1)}
  return n;
}
function bestStreak(){return Math.max(G.best||0,streakNow())}
function todaySecs(){var d=G.days[today()];return d?d.s:0}
function goalPct(){return G.days[today()]&&G.days[today()].met?1:clamp(todaySecs()/(G.goal*60),0,1)}
var RING={streak:113.10,mini:128.81,node:270.18,done:285.88,meter:314.16};
function ringOff(C,p){return p<=0?C:C*(1-Math.max(p,0.02))}
function setArc(el,C,p){el.setAttribute('stroke-dasharray',C);el.setAttribute('stroke-dashoffset',ringOff(C,p));el.classList.toggle('is-zero',p<=0)}
function badgeLabel(){
  var mins=Math.floor(todaySecs()/60),n=streakNow();
  return n+' day streak. Today '+Math.min(mins,G.goal)+' of '+G.goal+' minutes.'+(isMet(today())?' Goal done.':'');
}
function updateBadges(){
  var p=goalPct(),lab=badgeLabel();
  qsa('.streak').forEach(function(b){setArc(qs('.arc',b),RING.streak,p);b.setAttribute('aria-label',lab)});
}
function activeBadge(){var s=qs('.screen.is-on');return s?qs('.streak',s):null}
function studyTick(){
  if(document.hidden)return;
  var running=TM.state==='running',idle=Date.now()-lastInput;
  if(!(idle<90000||speaking||(running&&idle<300000)))return;
  var k=today(),d=dayRec(k);d.s+=5;
  var flipped=false;
  if(!d.met&&d.s>=G.goal*60){d.met=true;flipped=true;G.best=Math.max(G.best||0,streakNow())}
  saveG();updateBadges();
  var sc=$('streak-card');if(sc&&!$('spop').hidden)renderStreakCard();
  if(flipped)goalMoment();
}
function goalMoment(){
  if(sessionOpen()){goalWait=true;return}
  playGoal();
}
function playGoal(){
  if(layers.length){goalWait=true;return}
  goalWait=false;
  announce('Daily goal reached.');
  if(rm())return;
  var b=activeBadge();if(!b)return;
  b.classList.remove('flare');reflow(b);b.classList.add('flare');
  later(function(){playSound('goal')},650);
  later(function(){b.classList.remove('flare')},1700);
}
function setGoal(n){
  G.goal=n;
  var d=dayRec(today());
  if(!d.met&&d.s>=n*60){d.met=true;G.best=Math.max(G.best||0,streakNow())}
  saveG();updateBadges();renderStreakCard();
}

/* ---------- live region ---------- */
var liveFlip=false;
function announce(t){var l=$('live');liveFlip=!liveFlip;l.textContent=t+(liveFlip?'':' ')}

/* ---------- path ---------- */
function inferDo(t){
  t=String(t).toLowerCase();
  var m=[['lesson','lessons'],['chapter','read'],['script','script'],['quiz','quiz'],['question','questions'],['number','numbers']];
  for(var i=0;i<m.length;i++)if(t.indexOf(m[i][0])>=0)return m[i][1];
  return '';
}
function buildPath(p){
  var ps=PS(p),plan=(p.plan||[]).map(function(x){return typeof x==='string'?{text:x,do:inferDo(x)}:{text:x.text,do:typeof x.do==='string'?x.do:inferDo(x.text)}});
  var seenDo={};
  plan.forEach(function(s){if(s.do&&seenDo[s.do])s.do='';else if(s.do)seenDo[s.do]=true});
  /* every kind of content the pack has gets a place on the path, in a fixed order, even if the plan text misses it */
  var ORDER=['lessons','read','script','quiz','questions','numbers'],
    HAVE={lessons:L_(p).length,read:chaptersOf(p).length,script:sentsOf(p).length,quiz:quizOf(p).length,questions:qaOf(p).length,numbers:numsOf(p).length},
    DEF={lessons:'Learn the lessons, one card at a time.',read:'Read the chapters at your own pace.',script:'Read your script aloud with the timer.',quiz:'Do the quiz.',questions:'Practise the questions out loud.',numbers:'Go over the numbers.'};
  ORDER.forEach(function(k,oi){
    if(!HAVE[k]||plan.some(function(s){return s.do===k}))return;
    var at=plan.length;
    for(var j=0;j<plan.length;j++)if(ORDER.indexOf(plan[j].do)>oi){at=j;break}
    plan.splice(at,0,{text:DEF[k],do:k});
  });
  var units=[],flat=[];
  plan.forEach(function(s,si){
    var nodes=[];
    if(s.do==='lessons'){
      L_(p).forEach(function(l,i){
        var st=ps.lessons[l.id]||{},n=l.cards.length,seen=Math.min(st.seen||0,n);
        nodes.push({id:'node-lesson-'+i,kind:'lessons',idx:i,num:i+1,title:l.title,
          detail:'Lesson '+(i+1)+' · '+(st.done?'Done':seen>0?seen+' of '+n+' cards':n+' cards'),
          done:!!st.done,frac:st.done?1:seen/n,aria:'Lesson '+(i+1)+', '+l.title});
      });
    }else if(s.do==='read'&&chaptersOf(p).length){
      var c=chaptersOf(p).length,r=chaptersRead(p);
      nodes.push({id:'node-read-0',kind:'read',idx:0,icon:'read',title:'Read the chapters',
        detail:r>=c?'All read':r>0?r+' of '+c+' read':c+' chapters',done:r>=c,frac:r/c,aria:'Read the chapters'});
    }else if(s.do==='script'&&sentsOf(p).length){
      for(var k=0;k<2;k++){
        var run=ps.runs[k];
        nodes.push({id:'node-script-'+k,kind:'script',idx:k,icon:'mic',title:'Practice run '+(k+1),
          detail:run?'Done in '+mmss(run.secs):'3-minute timer',done:!!run,frac:run?1:0,aria:'Practice run '+(k+1)});
      }
    }else if(s.do==='quiz'&&quizOf(p).length){
      var qn=quizOf(p).length,b=quizScore(p);
      nodes.push({id:'node-quiz-0',kind:'quiz',idx:0,icon:'quiz',title:'Quiz',
        detail:b>0?'Best: '+b+' of '+qn:qn+' questions',done:b>=Math.ceil(qn*0.8),frac:b/qn,aria:'Quiz'});
    }else if(s.do==='questions'&&qaOf(p).length){
      var an=qaOf(p).length,g=qaGot(p);
      nodes.push({id:'node-questions-0',kind:'questions',idx:0,icon:'qa',title:'Questions',
        detail:g>=an?'All got it':g>0?g+' of '+an+' got it':an+' questions',done:g>=an,frac:g/an,aria:'Questions'});
    }else if(s.do==='numbers'&&numsOf(p).length){
      var nn=numsOf(p).length,nd=!!ps.numbersDone;
      nodes.push({id:'node-numbers-0',kind:'numbers',idx:0,icon:'hash',title:'The numbers',
        detail:nd?'Done':nn+' numbers',done:nd,frac:nd?1:0,aria:'The numbers'});
    }
    units.push({n:si+1,text:s.text,nodes:nodes,done:nodes.length>0&&nodes.every(function(x){return x.done})});
    nodes.forEach(function(x){flat.push(x)});
  });
  var curNode=null;
  for(var i=0;i<flat.length;i++){if(!flat[i].done){curNode=flat[i];break}}
  flat.forEach(function(x,i){x.pos=i;x.cur=(x===curNode)});
  return {units:units,nodes:flat,cur:curNode,allDone:flat.length>0&&!curNode,finishPos:flat.length};
}
function heroInfo(p,path){
  var ps=PS(p),n=path.cur;
  if(!n){
    var ak=sentsOf(p).length?'script':quizOf(p).length?'quiz':qaOf(p).length?'questions':'lessons';
    return {line:'Every step is done. Keep it fresh.',label:ak==='script'?'Practise your script':ak==='quiz'?'Do the quiz':ak==='questions'?'Practise the questions':'Go over the lessons',kind:ak,idx:0,bold:null};
  }
  var label='';
  if(n.kind==='lessons'){var st=ps.lessons[L_(p)[n.idx].id]||{};label=((st.seen||0)>0&&!st.done?'Continue lesson ':'Start lesson ')+(n.idx+1)}
  else if(n.kind==='read'){label=ps.place?'Continue reading':'Read chapter '+(firstUnread(p)+1)}
  else if(n.kind==='script')label='Practise your script';
  else if(n.kind==='quiz')label=ps.quiz.best>0?'Beat your best':'Do the quiz';
  else if(n.kind==='questions')label='Practise the questions';
  else label='Go through the numbers';
  return {line:null,bold:n.title,label:label,kind:n.kind,idx:n.idx};
}
function firstUnread(p){var ps=PS(p),c=chaptersOf(p);for(var i=0;i<c.length;i++)if(!ps.chapters[i])return i;return 0}

/* ---------- sound (Web Audio) ---------- */
var AC=null;
function ensureAudio(){
  if(!G.sound||AC)return;
  try{
    var A=window.AudioContext||window.webkitAudioContext;
    if(!A)return;
    if(navigator.audioSession){try{navigator.audioSession.type='ambient'}catch(e){}}
    AC=new A();if(AC.state==='suspended')AC.resume();
  }catch(e){AC=null}
}
document.addEventListener('pointerdown',function(){if(G.sound){ensureAudio();if(AC&&AC.state==='suspended')try{AC.resume()}catch(e){}}},true);
function note(freq,start,dur,peak,type,freq2){
  if(!AC)return;
  try{
    var t=AC.currentTime+start,o=AC.createOscillator(),g=AC.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(freq,t);
    if(freq2)o.frequency.exponentialRampToValueAtTime(freq2,t+dur*0.78);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(peak,t+0.006);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+dur+0.02);
  }catch(e){}
}
function playSound(n){
  if(!G.sound||!AC)return;
  if(n==='tick')note(1046.5,0,0.06,0.06,'triangle');
  else if(n==='correct'){note(784,0,0.16,0.09);note(1046.5,0.08,0.16,0.09)}
  else if(n==='wrong')note(196,0,0.18,0.08,'sine',147);
  else if(n==='success'){note(523.25,0,0.22,0.07);note(659.25,0.07,0.22,0.07);note(783.99,0.14,0.22,0.07)}
  else if(n==='goal'){note(880,0,0.2,0.06);note(1318.5,0.1,0.2,0.06)}
}
function syncSoundBtns(){
  ['quiz-sound','qa-sound','quiz-run-sound','qa-run-sound'].forEach(function(id){
    var b=$(id);if(!b)return;
    b.setAttribute('aria-pressed',G.sound?'true':'false');
    b.setAttribute('aria-label','Sound effects');
    b.innerHTML=ic(G.sound?'bell':'bell-off');
  });
}
function toggleSound(){
  G.sound=!G.sound;saveG();
  if(G.sound)ensureAudio();
  syncSoundBtns();
}

/* ---------- speech ---------- */
var SYN=false;
try{SYN=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance)}catch(e){SYN=false}
var voice=null,speakToken=0,speakKey=null;
function pickVoice(){
  if(!SYN)return;
  var vs=[];try{vs=speechSynthesis.getVoices()||[]}catch(e){}
  if(!vs.length)return;
  var en=vs.filter(function(v){return /^en/i.test(v.lang)});
  var f=null;
  function find(fn){return en.filter(fn)[0]}
  f=find(function(v){return /enhanced|premium/i.test(v.name)});
  if(!f){var names=['Samantha','Daniel','Karen','Moira','Serena','Google UK English Female','Google US English'];
    for(var i=0;i<names.length&&!f;i++)f=find(function(v){return v.name.indexOf(names[i])>=0})}
  if(!f)f=find(function(v){return v.lang==='en-GB'||v.lang==='en-US'});
  voice=f||en[0]||null;
}
if(SYN){pickVoice();try{speechSynthesis.addEventListener('voiceschanged',pickVoice)}catch(e){}}
function speechText(s){return String(s).replace(/''/g,'"')}
function stopSpeech(){
  speakToken++;
  if(SYN){try{speechSynthesis.cancel()}catch(e){}}
  var was=speaking;speaking=false;speakKey=null;
  clearSpeaking();updateListenUI();
  return was;
}
function speakList(list,key,onItem,onEnd){
  if(!SYN||!list.length)return;
  stopSpeech();
  var tok=++speakToken;
  speakKey=key;
  list.forEach(function(txt,i){
    var u=new SpeechSynthesisUtterance(speechText(txt));
    if(voice){u.voice=voice;u.lang=voice.lang}else u.lang='en-GB';
    u.rate=0.95;u.pitch=1;
    u.onstart=function(){
      if(tok!==speakToken)return;
      if(!speaking){speaking=true;updateListenUI()}
      if(onItem)onItem(i);
    };
    var fin=function(){
      if(tok!==speakToken)return;
      if(i===list.length-1){speaking=false;speakKey=null;clearSpeaking();updateListenUI();if(onEnd)onEnd()}
    };
    u.onend=fin;u.onerror=fin;
    try{speechSynthesis.speak(u)}catch(e){}
  });
}
function updateListenUI(){
  qsa('[data-lk]').forEach(function(b){
    var on=speaking&&speakKey===b.getAttribute('data-lk');
    b.classList.toggle('is-on',on);
    var u=qs('use',b);if(u)u.setAttribute('href',on?'#i-square':'#i-vol');
    var lab=qs('.lk-t',b);if(lab)lab.textContent=on?'Stop':'Listen';
    b.setAttribute('aria-pressed',on?'true':'false');
  });
}

/* ---------- overlay manager ---------- */
var layers=[];
function sessionOpen(){return layers.some(function(l){return l.session})}
function pushLayer(el,close,focusEl,session){
  if(!layers.some(function(l){return l.el===el}))layers.push({el:el,close:close,prev:document.activeElement,session:!!session});
  if(session)document.documentElement.classList.add('is-locked');
  var f=focusEl||qs('button',el);
  try{if(f)f.focus({preventScroll:true})}catch(e){}
}
function popLayer(el){
  var l=null;
  layers=layers.filter(function(x){if(x.el!==el)return true;if(!l)l=x;return false});
  if(!l)return;
  if(!sessionOpen())document.documentElement.classList.remove('is-locked');
  try{if(l.prev&&document.body.contains(l.prev)&&l.prev!==document.body)l.prev.focus({preventScroll:true})}catch(e){}
  if(!layers.length&&goalWait)later(playGoal,300);
}
function topLayer(){return layers[layers.length-1]||null}
function focusables(root){
  return qsa('button,[tabindex="0"],a[href]',root).filter(function(e){return !e.disabled&&!e.hidden&&e.getClientRects().length>0});
}
document.addEventListener('keydown',function(e){
  var t=topLayer();
  if(e.key==='Escape'&&t){e.preventDefault();t.close();return}
  if(e.key==='Tab'&&t){
    var list=focusables(t.el);
    if(t.el.id==='quiz-run'&&!$('quiz-feedback').hidden)list=list.concat(focusables($('quiz-feedback')));
    if(!list.length)return;
    var first=list[0],last=list[list.length-1],a=document.activeElement;
    if(list.indexOf(a)<0){e.preventDefault();first.focus();return}
    if(e.shiftKey&&a===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&a===last){e.preventDefault();first.focus()}
  }
});
function openEl(el){el.hidden=false;reflow(el);el.classList.add('is-open')}
function closeEl(el,closing){
  el.classList.remove('is-open');
  if(closing)el.classList.add('is-closing');
  later(function(){if(!el.classList.contains('is-open')){el.hidden=true;el.classList.remove('is-closing')}},300);
}
function openSheet(id,focusId,onClose){
  var sh=$(id),sc=$('sheet-scrim');
  stopSpeech();
  var entry={el:sh,close:function(){closeSheet(id)}};
  sh._onClose=onClose||null;
  sc.hidden=false;reflow(sc);sc.classList.add('is-open');
  openEl(sh);
  pushLayer(sh,entry.close,focusId?$(focusId):null,false);
}
function closeSheet(id){
  var sh=$(id);
  if(sh.hidden||!sh.classList.contains('is-open'))return;
  var sc=$('sheet-scrim');
  closeEl(sh,true);sc.classList.remove('is-open');later(function(){if(!sc.classList.contains('is-open'))sc.hidden=true},300);
  popLayer(sh);
  if(sh._onClose){var f=sh._onClose;sh._onClose=null;f()}
}
$('sheet-scrim').addEventListener('click',function(){var t=topLayer();if(t&&!t.session)t.close()});
/* swipe a sheet down to close it (grab handle or title bar; buttons keep their taps) */
(function(){
  var d=null;
  function end(e){
    if(!d||e.pointerId!==d.id)return;
    var s=d;d=null;
    var sh=s.sh,dy=s.dy,v=dy/Math.max(1,performance.now()-s.t);
    sh.style.transition='';sh.style.transform='';
    if(e.type!=='pointercancel'&&(dy>100||(dy>30&&v>0.5)))closeSheet(sh.id);
  }
  qsa('.sheet').forEach(function(sh){
    qsa('.grab,.sheet-head',sh).forEach(function(h){
      h.addEventListener('pointerdown',function(e){
        if(e.button>0||e.target.closest('button'))return;
        d={sh:sh,y:e.clientY,t:performance.now(),id:e.pointerId,dy:0};
        try{h.setPointerCapture(e.pointerId)}catch(er){}
        sh.style.transition='none';
      });
      h.addEventListener('pointermove',function(e){
        if(!d||e.pointerId!==d.id)return;
        d.dy=Math.max(0,e.clientY-d.y);
        d.sh.style.transform='translateY('+d.dy+'px)';
      });
      h.addEventListener('pointerup',end);
      h.addEventListener('pointercancel',end);
    });
  });
})();
