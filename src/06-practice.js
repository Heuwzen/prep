/* ---------- quiz ---------- */
var QS=null,qDone=false;
function roundIdx(p,lec){var qz=quizOf(p);return qz.map(function(_,i){return i}).filter(function(i){return !lec||qz[i].lec===lec})}
function roundOK(p){
  var r=PS(p).quiz.round,qz=quizOf(p);
  return !!(r&&Array.isArray(r.queue)&&r.queue.length&&r.total===roundIdx(p,r.lec).length&&r.queue.every(function(i){return !!qz[i]&&(!r.lec||qz[i].lec===r.lec)}));
}
function quizStartHTML(){
  var p=cur,ps=PS(p),qz=quizOf(p),n=qz.length,q=ps.quiz;
  if(!n)return emptyHTML('quiz','No quiz in this pack.','');
  var pills='';
  if(q.history.length){
    pills=(q.best>0?pillHTML('Best: '+q.best+' of '+n,'soft'):'');
    lecsOf(p).forEach(function(l){var b=+(q.lecBest||{})[l.lec]||0;if(b>0)pills+=pillHTML('Lecture '+l.lec+': '+b+' of '+l.n,'soft')});
    pills+=pillHTML('Last: '+q.last+' of '+(q.lastTotal||n));
  }else pills=pillHTML('No score yet');
  if(q.round&&!roundOK(p)){q.round=null;saveP(p)}
  var h='<div class="card start"><div class="start-icon">'+ic('quiz')+'</div><h2>'+plural(n,'question')+'</h2><div class="pills">'+pills+'</div><p>Pick the answer you think is right. Wrong ones come back later in the round.</p><div class="btn-stack">';
  var ls=lecsOf(p);
  if(q.round)h+='<button class="btn" id="quiz-start" type="button">'+(q.round.lec?'Continue Lecture '+q.round.lec:'Continue quiz')+'</button><button class="btn plain" id="quiz-restart" type="button">Start over</button>';
  else{
    h+='<button class="btn" id="quiz-start" type="button">'+(ls.length>1?'All '+n+' questions':'Start quiz')+'</button>';
    if(ls.length>1)ls.forEach(function(l){h+='<button class="btn plain" id="quiz-lec-'+l.lec+'" type="button" data-lec="'+l.lec+'">Lecture '+l.lec+' only ('+l.n+')</button>'});
  }
  h+='</div></div>';
  if(q.history.length){
    h+='<div class="sec"><h2>Your rounds</h2><p>'+(q.history.length===1?'Your first round.':'Your recent rounds.')+'</p></div><div class="card rounds" style="margin-top:16px">';
    q.history.slice(0,5).forEach(function(r){
      h+='<div class="round"><span class="round-when">'+esc(fmtRound(new Date(r.at).getTime()))+'</span><span class="round-score">'+(r.lec?'L'+r.lec+': ':'')+r.score+' of '+r.total+'</span><span class="round-bar"><i style="width:'+Math.round(100*r.score/r.total)+'%"></i></span></div>';
    });
    h+='</div>';
  }
  return h;
}
function renderQuiz(){$('quiz-body').innerHTML=quizStartHTML();syncSoundBtns()}
R.quiz=renderQuiz;
$('quiz-body').addEventListener('click',function(e){
  if(e.target.closest('#quiz-restart')){PS(cur).quiz.round=null;saveP(cur);if(lecsOf(cur).length>1)renderQuiz();else openQuizRound(true);return}
  var lb=e.target.closest('[data-lec]');if(lb){openQuizRound(true,+lb.getAttribute('data-lec'));return}
  if(e.target.closest('#quiz-start'))openQuizRound(false);
});
function openQuizRound(fresh,lec){
  var p=cur,ps=PS(p),qz=quizOf(p);if(!qz.length)return;
  stopSpeech();
  var q=ps.quiz;
  if(!roundOK(p))q.round=null;
  if(fresh||!q.round){
    var idx=roundIdx(p,lec||0);
    q.round={queue:q.history.length?shuffle(idx):idx,total:idx.length,lec:lec||0,solved:0,first:0,missed:{},at:Date.now()};
    saveP(p);
  }
  QS={opts:null,answered:false,t0:Date.now(),from:curScreen,shownAt:0};qDone=false;
  $('quiz-top').hidden=false;
  $('quiz-run').hidden=false;
  syncSoundBtns();
  showQuizQ(false);
  pushLayer($('quiz-run'),closeQuiz,$('quiz-close'),true);
}
function quizBar(){
  var r=PS(cur).quiz.round;
  $('quiz-bar').style.setProperty('--p',r?r.solved/r.total:1);
}
function showQuizQ(anim){
  var r=PS(cur).quiz.round,qz=quizOf(cur),q=qz[r.queue[0]];
  QS.q=q;QS.answered=false;QS.shownAt=performance.now();
  QS.opts=shuffle(q.options.map(function(t,i){return {t:t,orig:i}}));
  var h='<div class="qwrap'+(anim?' in':'')+'" id="quiz-wrap"><div class="q-text">'+T(q.q)+'</div><div class="opts" id="quiz-opts">';
  QS.opts.forEach(function(o,k){h+='<button class="opt" id="quiz-opt-'+k+'" type="button" data-k="'+k+'"><span class="key">'+(k+1)+'</span><span class="ot">'+T(o.t)+'</span></button>'});
  h+='</div></div>';
  var body=$('quiz-round');body.innerHTML=h;body.scrollTop=0;
  quizBar();
  announce('Question '+(r.solved+1)+' of '+r.total+'.');
}
function quizAnswer(k){
  if(!QS||QS.answered||qDone||performance.now()-(QS.shownAt||0)<350)return;
  QS.answered=true;
  var ps=PS(cur),r=ps.quiz.round,q=QS.q,ch=QS.opts[k],ok=ch.orig===q.answer;
  var opts=$('quiz-opts');opts.classList.add('is-answered');
  var els=qsa('.opt',opts),right=-1;
  QS.opts.forEach(function(o,i){if(o.orig===q.answer)right=i});
  var cur_=els[k];
  var idx=r.queue[0];
  if(ok){
    cur_.classList.add('ok');cur_.insertAdjacentHTML('beforeend','<span class="mark">'+ic('check')+'</span>');
    els.forEach(function(e,i){if(i!==k)e.classList.add('dim')});
    playSound('correct');
    r.queue.shift();r.solved++;if(!r.missed[idx])r.first++;
  }else{
    cur_.classList.add('bad');cur_.insertAdjacentHTML('beforeend','<span class="mark">'+ic('x')+'</span>');
    els.forEach(function(e,i){if(i!==k&&i!==right)e.classList.add('dim')});
    later(function(){var re=els[right];re.classList.add('ok');re.classList.remove('dim');re.insertAdjacentHTML('beforeend','<span class="mark">'+ic('check')+'</span>')},150);
    playSound('wrong');
    r.missed[idx]=true;r.queue.shift();r.queue.splice(Math.min(2,r.queue.length),0,idx);
  }
  saveP(cur);
  var fb=$('quiz-feedback'),fi=$('quiz-fb-in');
  fb.classList.toggle('bad',!ok);
  fi.innerHTML='<div class="fb-head"><span class="fb-icon">'+ic(ok?'check':'x')+'</span><span>'+(ok?'Correct':'Not quite')+'</span></div>'+
    (ok?'':'<p class="fb-ans"><span>Answer:</span> '+T(q.options[q.answer])+'</p>')+
    '<p class="fb-why">'+T(q.why)+'</p>'+(ok?'':'<p class="fb-note">This one comes back later in the round.</p>')+
    '<button class="btn'+(ok?'':' red')+'" id="quiz-continue" type="button">Continue</button>';
  openEl(fb);
  document.documentElement.style.setProperty('--fb-h',fb.offsetHeight+'px');
  var bt=$('quiz-continue');try{bt.focus({preventScroll:true})}catch(e){}
  later(function(){els[k].scrollIntoView({block:'nearest',behavior:rm()?'auto':'smooth'})},50);
  announce(ok?'Correct.':'Not quite. The answer is '+q.options[q.answer]+'.');
}
function quizContinue(){
  if(!QS||!QS.answered)return;
  var fb=$('quiz-feedback'),r=PS(cur).quiz.round;
  fb.classList.remove('is-open');later(function(){if(!fb.classList.contains('is-open'))fb.hidden=true},300);
  document.documentElement.style.setProperty('--fb-h','0px');
  quizBar();
  if(!r.queue.length){quizFinish();return}
  showQuizQ(true);
  var cl=$('quiz-close');try{cl.focus({preventScroll:true})}catch(e){}
}
function hideFb(){var fb=$('quiz-feedback');fb.classList.remove('is-open');fb.hidden=true;document.documentElement.style.setProperty('--fb-h','0px')}
function closeQuiz(){
  var el=$('quiz-run');if(el.hidden)return;
  hideFb();el.hidden=true;popLayer(el);
  doneTimers.forEach(clearTimeout);
  refresh();
}
function quizFinish(){
  qDone=true;
  var p=cur,ps=PS(p),r=ps.quiz.round,total=r.total,score=r.first,came=Object.keys(r.missed).length,lec=r.lec||0,lb=ps.quiz.lecBest,old=lec?(+lb[lec]||0):ps.quiz.best;
  var nb=score>old;
  if(lec)lb[lec]=Math.max(old,score);else ps.quiz.best=Math.max(old,score);
  ps.quiz.last=score;ps.quiz.lastTotal=total;if(QS)QS.lec=lec;
  ps.quiz.history.unshift({at:new Date().toISOString(),score:score,total:total,lec:lec});
  ps.quiz.history=ps.quiz.history.slice(0,10);
  ps.quiz.round=null;saveP(p);
  $('quiz-top').hidden=true;
  var line=score===total?'Every answer right the first time.':score+' of '+total+' right the first time.';
  $('quiz-round').innerHTML=doneHTML({id:'quiz-done',title:'Quiz done!',line:line,
    stats:[{v:score,l:'first try'},{v:came,l:'came back'},{v:Math.round(100*score/total),l:'score',suf:'%',g:true}],
    newBest:nb,buttons:[{id:'quiz-done-again',t:'New round'},{id:'quiz-done-home',t:QS&&QS.from==='home'?'Back to Home':'Done',plain:true}]});
  playDone('quiz-done');
  var f=$('quiz-done-again');if(f)f.focus({preventScroll:true});
}
$('quiz-close').addEventListener('click',closeQuiz);
$('quiz-round').addEventListener('click',function(e){
  var o=e.target.closest('.opt');if(o){quizAnswer(+o.getAttribute('data-k'));return}
  if(e.target.closest('#quiz-done-again')){var qf=QS&&QS.from,ql=QS&&QS.lec;closeQuiz();PS(cur).quiz.round=null;openQuizRound(true,ql);if(QS)QS.from=qf;return}
  if(e.target.closest('#quiz-done-home')){var home_=QS&&QS.from==='home';closeQuiz();if(home_)goTab('home')}
});
$('quiz-feedback').addEventListener('click',function(e){if(e.target.closest('#quiz-continue'))quizContinue()});
document.addEventListener('keydown',function(e){
  var t=topLayer();if(!t||t.el.id!=='quiz-run'||qDone)return;
  if(e.key>='1'&&e.key<='4'&&QS&&!QS.answered&&QS.opts&&QS.opts[+e.key-1]){quizAnswer(+e.key-1)}
  else if(e.key==='Enter'&&QS&&QS.answered&&document.activeElement.id!=='quiz-continue'){e.preventDefault();quizContinue()}
});

/* ---------- questions ---------- */
var QA=null;
function qaStatusIcon(s){return s==='got'?'<span class="qdisc got">'+ic('check')+'</span>':s==='again'?'<span class="qdisc">'+ic('reset')+'</span>':'<span class="qdisc"></span>'}
function qaStartHTML(){
  var p=cur,ps=PS(p),qs_=qaOf(p),n=qs_.length;
  if(!n)return emptyHTML('qa','No questions in this pack.','');
  var got=qaGot(p),left=n-got;
  var h='<div class="card start"><div class="start-icon">'+ic('qa')+'</div><h2>'+plural(n,'question')+'</h2>'+
    '<div class="prog-line"><b>Got it</b><span>'+got+' of '+n+'</span></div><div class="pbar" style="--p:'+(got/n)+'"><i></i></div>'+
    '<p>'+(isExam(p)?'Answer out loud or on paper, then reveal and compare. A strong exam answer gives a definition, the points, and one example from the slides.':'Think of your answer and say it out loud. Then reveal and compare. If a question goes past what you know, say you didn\'t find it, then give the closest fact you do know.')+'</p><div class="btn-stack">';
  if(got===0)h+='<button class="btn" id="qa-start" type="button">Start questions</button>';
  else if(left>0)h+='<button class="btn" id="qa-start" type="button">Practise the '+left+' left</button><button class="btn plain" id="qa-all" type="button">All '+n+' questions</button>';
  else h+='<button class="btn" id="qa-start" type="button">Practise all '+n+' again</button>';
  h+='</div></div><div class="sec"><h2>All questions</h2><p>Tap one to practise it.</p></div><div style="height:15px"></div>';
  qs_.forEach(function(q,i){
    h+='<button class="qrow row-press" id="qa-row-'+i+'" type="button" data-i="'+i+'">'+qaStatusIcon(ps.qa.status[i])+'<span class="qrow-text"><b>'+T(q.q)+'</b><span>'+(q.who==='lecturer'?'Lecturer':q.who==='exam'?'Exam':'Classmate')+'</span></span></button>';
  });
  return h;
}
function renderQA(){$('qa-body').innerHTML=qaStartHTML();syncSoundBtns()}
R.qa=renderQA;
$('qa-body').addEventListener('click',function(e){
  var r=e.target.closest('.qa-row,.qrow');
  if(r){openQaRound(+r.getAttribute('data-i'));return}
  if(e.target.closest('#qa-all')){openQaRound('all');return}
  if(e.target.closest('#qa-start')){
    var n=qaOf(cur).length,got=qaGot(cur);
    openQaRound(got>0&&got<n?'left':'all');
  }
});
function openQaRound(mode){
  var p=cur,ps=PS(p),qs_=qaOf(p);if(!qs_.length)return;
  stopSpeech();
  var idx=qs_.map(function(_,i){return i}),queue;
  if(typeof mode==='number')queue=[mode];
  else if(mode==='left'){queue=idx.filter(function(i){return ps.qa.status[i]!=='got'});if(!queue.length)queue=idx}
  else queue=idx;
  QA={all:queue.slice(),queue:queue.slice(),total:queue.length,done:0,retried:{},single:typeof mode==='number',revealed:false,t0:Date.now(),fin:false,from:curScreen,revealAt:0};
  $('qa-top').hidden=false;
  $('qa-run').hidden=false;
  syncSoundBtns();
  showQaQ(false);
  pushLayer($('qa-run'),closeQa,$('qa-close'),true);
}
function qaBar(){$('qa-bar').style.setProperty('--p',QA.done/QA.total)}
function showQaQ(anim){
  var q=qaOf(cur)[QA.queue[0]];QA.revealed=false;
  var h='<div class="qwrap'+(anim?' in':'')+'"><div class="card qa-card"><span class="pill">'+(q.who==='lecturer'?'Lecturer asks':q.who==='exam'?'Exam question':'Classmate asks')+'</span><div class="qa-q">'+T(q.q)+'</div><p class="qa-think" id="qa-think">'+(q.who==='exam'?'Think first. Say or jot down your answer.':'Think first. Say your answer out loud.')+'</p>'+
    '<div class="reveal" id="qa-reveal-box" inert><div><div class="qa-ans"><div class="qa-ans-h"><span>'+(q.who==='exam'?'A strong answer':'You could say')+'</span>'+(SYN?'<button class="icon-btn sm" id="qa-listen" type="button" data-lk="qa" aria-label="Listen to the answer" aria-pressed="false">'+ic('vol')+'</button>':'')+'</div><p>'+T(q.answer)+'</p></div></div></div></div></div>';
  var body=$('qa-round');body.innerHTML=h;body.scrollTop=0;
  $('qa-actions').innerHTML='<div class="actions" style="grid-template-columns:1fr"><button class="btn" id="qa-reveal" type="button">Show answer</button></div>';
  qaBar();
  var rv=$('qa-reveal');try{rv.focus({preventScroll:true})}catch(e){}
  announce('Question '+(QA.done+1)+' of '+QA.total+'.');
}
function qaReveal(){
  if(!QA||QA.revealed)return;
  QA.revealed=true;QA.revealAt=performance.now();
  var rb=$('qa-reveal-box');rb.classList.add('is-open');rb.removeAttribute('inert');
  var th=$('qa-think');if(th)th.hidden=true;
  $('qa-actions').innerHTML='<div class="actions even"><button class="btn plain" id="qa-again" type="button">Again</button><button class="btn" id="qa-gotit" type="button">Got it</button></div>';
  playSound('tick');updateListenUI();
  var g=$('qa-gotit');try{g.focus({preventScroll:true})}catch(e){}
  later(function(){var a=qs('#qa-round .qa-ans');if(a)a.scrollIntoView({block:'nearest',behavior:rm()?'auto':'smooth'})},120);
}
function qaMark(got){
  if(!QA||!QA.revealed||QA.fin||performance.now()-(QA.revealAt||0)<400)return;
  stopSpeech();
  var ps=PS(cur),i=QA.queue.shift();
  ps.qa.status[i]=got?'got':'again';saveP(cur);
  playSound('tick');
  if(!got&&!QA.retried[i]&&!QA.single){QA.retried[i]=true;QA.queue.splice(Math.min(2,QA.queue.length),0,i)}
  else QA.done++;
  qaBar();
  if(!QA.queue.length){qaFinish();return}
  showQaQ(true);
}
function closeQa(){
  var el=$('qa-run');if(el.hidden)return;
  stopSpeech();el.hidden=true;popLayer(el);
  doneTimers.forEach(clearTimeout);
  refresh();
}
function qaFinish(){
  QA.fin=true;
  var p=cur,ps=PS(p),qs_=qaOf(p),n=QA.total;
  var gotRound=0,againRound=0;
  QA.all.forEach(function(i){if(ps.qa.status[i]==='got')gotRound++;else againRound++});
  if(QA.single){closeQa();announce(gotRound?'Marked as got it.':'Marked for another go.');return}
  var left=qs_.filter(function(_,i){return ps.qa.status[i]!=='got'}).length;
  var line=QA.single?(gotRound?'Marked as got it.':'Marked for another go.'):gotRound+' of '+n+' marked got it.';
  var btns=[];
  if(left>0){btns.push({id:'qa-done-again',t:'Practise the '+left+' left'});btns.push({id:'qa-done-home',t:QA.from==='home'?'Back to Home':'Done',plain:true})}
  else btns.push({id:'qa-done-home',t:QA.from==='home'?'Back to Home':'Done'});
  $('qa-top').hidden=true;$('qa-actions').innerHTML='';
  $('qa-round').innerHTML=doneHTML({id:'qa-done',title:'Questions done!',line:line,
    stats:[{v:gotRound,l:'got it'},{v:againRound,l:'again'},{v:readiness(p),l:'ready',suf:'%',g:true}],buttons:btns});
  playDone('qa-done');
  announce('Questions done.');
  var f=$('qa-done-again')||$('qa-done-home');if(f)f.focus({preventScroll:true});
}
$('qa-close').addEventListener('click',closeQa);
$('qa-run').addEventListener('click',function(e){
  if(e.target.closest('#qa-reveal'))qaReveal();
  else if(e.target.closest('#qa-gotit'))qaMark(true);
  else if(e.target.closest('#qa-again'))qaMark(false);
  else if(e.target.closest('#qa-listen')){
    if(speaking&&speakKey==='qa'){stopSpeech();return}
    speakList([qaOf(cur)[QA.queue[0]].answer],'qa');
  }
  else if(e.target.closest('#qa-done-again')){var qaf=QA&&QA.from;closeQa();openQaRound('left');if(QA)QA.from=qaf}
  else if(e.target.closest('#qa-done-home')){var qh=QA&&QA.from==='home';closeQa();if(qh)goTab('home')}
});
document.addEventListener('keydown',function(e){
  var t=topLayer();if(!t||t.el.id!=='qa-run'||!QA||QA.fin)return;
  if(e.key==='Enter'&&!QA.revealed&&document.activeElement.id!=='qa-reveal'){e.preventDefault();qaReveal()}
  else if(QA.revealed&&e.key==='1')qaMark(false);
  else if(QA.revealed&&e.key==='2')qaMark(true);
});
['quiz-sound','qa-sound','quiz-run-sound','qa-run-sound'].forEach(function(id){$(id).addEventListener('click',toggleSound)});
