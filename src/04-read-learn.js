/* ---------- done mark ---------- */
function doneHTML(o){
  var h='<div class="done" id="'+o.id+'"><div class="dm"><svg class="ring-svg" viewBox="0 0 96 96" aria-hidden="true"><circle class="trk" cx="48" cy="48" r="45.5"/><circle class="arc" cx="48" cy="48" r="45.5"/></svg><div class="disc">'+ic('check')+'</div></div>'+
    '<div class="done-text"><h2>'+esc(o.title)+'</h2><p>'+esc(o.line)+'</p></div><div class="stats">';
  o.stats.forEach(function(s,i){h+='<div class="card stat'+(s.g?' g':'')+'"><b data-to="'+s.v+'" data-suf="'+(s.suf||'')+'">0'+(s.suf||'')+'</b><span>'+esc(s.l)+'</span></div>'});
  h+='</div>'+(o.newBest?'<div class="new-best">'+pillHTML('New best','soft')+'</div>':'')+'<div class="btn-stack">';
  o.buttons.forEach(function(b){h+='<button class="btn'+(b.plain?' plain':'')+'" id="'+b.id+'" type="button">'+esc(b.t)+'</button>'});
  return h+'</div></div>';
}
var doneTimers=[];
function playDone(id){
  var d=$(id);if(!d)return;
  doneTimers.forEach(clearTimeout);doneTimers=[];
  var bs=qsa('.stat b',d);
  if(rm()){
    d.classList.add('shown');
    bs.forEach(function(b){b.textContent=b.getAttribute('data-to')+b.getAttribute('data-suf')});
    return;
  }
  requestAnimationFrame(function(){requestAnimationFrame(function(){d.classList.add('play')})});
  doneTimers.push(later(function(){d.classList.add('ready')},1000));
  doneTimers.push(later(function(){playSound('success')},600));
  bs.forEach(function(b,i){
    doneTimers.push(later(function(){playSound('tick');countUp(b,0,+b.getAttribute('data-to'),700,b.getAttribute('data-suf'))},1100+i*100));
  });
}

/* ---------- read ---------- */
var readPlaced=false,readTick=null,placeSaveT=0;
function readMinutes(p){
  var w=0;chaptersOf(p).forEach(function(c){(c.paragraphs||[]).forEach(function(t){w+=String(t).split(/\s+/).filter(Boolean).length})});
  return Math.max(1,Math.ceil(w/200));
}
function markBtn(i,on){
  return '<button class="btn compact '+(on?'done-soft':'plain')+' readmark" id="read-mark-'+i+'" type="button" aria-pressed="'+on+'">'+ic('check')+(on?'Marked as read':'Mark as read')+'</button>';
}
function renderRead(){
  var p=cur,ps=PS(p),ch=chaptersOf(p),body=$('read-body'),cb=$('read-chapters');
  cb.hidden=!ch.length;
  if(!ch.length){
    $('rprog').hidden=true;
    body.innerHTML='<div class="read">'+emptyHTML('read','Reading is coming','The reading for this pack has not arrived yet. It will show up here.',{id:'read-go-lessons',t:'Go to lessons'})+'</div>';
    return;
  }
  $('rprog').hidden=false;
  var h='<div class="read"><h2 class="read-title">'+T(p.title)+'</h2><div class="read-meta">'+plural(ch.length,'chapter')+' · about '+readMinutes(p)+' min</div>';
  ch.forEach(function(c,i){
    h+='<section class="ch" id="chapter-'+i+'"><div class="ch-label">Chapter '+(i+1)+' of '+ch.length+'</div><h3 class="ch-title">'+T(c.title)+'</h3>';
    (c.paragraphs||[]).forEach(function(t,j){h+='<p id="ch-'+i+'-p-'+j+'">'+T(t)+'</p>'});
    h+=markBtn(i,!!ps.chapters[i])+'</section>';
  });
  var ln=(p.links||[]).filter(function(l){return l&&l.title&&/^https?:\/\//.test(l.url||'')});
  if(ln.length){
    h+='<section class="deeper"><h3 class="ch-title">Go deeper</h3>';
    ln.forEach(function(l){h+='<a class="card deeper-row row-press" href="'+esc(l.url)+'" target="_blank" rel="noopener"><span class="deeper-t">'+T(l.title)+'</span>'+(l.note?'<span class="deeper-n">'+T(l.note)+'</span>':'')+ic('ext')+'</a>'});
    h+='</section>';
  }
  h+='<p class="read-end">You reached the end.</p></div>';
  body.innerHTML=h;
  updateRprog();
}
R.read=renderRead;
function updateRprog(){
  var r=$('rprog');if(!r||r.hidden)return;
  var max=document.documentElement.scrollHeight-window.innerHeight;
  r.style.setProperty('--p',max>0?clamp(window.scrollY/max,0,1):0);
}
function readAfterShow(skipPlace){
  updateRprog();
  if(skipPlace||readPlaced||!chaptersOf(cur).length)return;
  readPlaced=true;
  var pl=PS(cur).place;if(!pl)return;
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    var el=$('ch-'+pl.ch+'-p-'+pl.p);if(!el)return;
    var hh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h'))||61;
    window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-hh-12);
    updateRprog();
  })});
}
function readGoFirstUnread(){
  var ch=chaptersOf(cur);if(!ch.length)return;
  readPlaced=true;
  var i=firstUnread(cur);
  requestAnimationFrame(function(){requestAnimationFrame(function(){var el=$('chapter-'+i);if(el)el.scrollIntoView({behavior:'auto',block:'start'})})});
}
window.addEventListener('scroll',function(){
  if(curScreen!=='read')return;
  if(!readTick){readTick=requestAnimationFrame(function(){readTick=null;updateRprog()})}
  var now=Date.now();
  if(now-placeSaveT<500)return;
  placeSaveT=now;
  var hh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h'))||61;
  var ps=qsa('#read-body .ch p');
  for(var i=0;i<ps.length;i++){
    if(ps[i].getBoundingClientRect().bottom>hh){
      var m=/^ch-(\d+)-p-(\d+)$/.exec(ps[i].id);
      if(m){PS(cur).place={ch:+m[1],p:+m[2]};saveP(cur)}
      break;
    }
  }
},{passive:true});
$('read-body').addEventListener('click',function(e){
  var g=e.target.closest('#read-go-lessons');
  if(g){goTab('learn',{face:'lessons'});return}
  var b=e.target.closest('.readmark');
  if(b){
    var i=+b.id.replace('read-mark-',''),ps=PS(cur);
    if(ps.chapters[i])delete ps.chapters[i];else ps.chapters[i]=true;
    saveP(cur);
    var on=!!ps.chapters[i];
    b.outerHTML=markBtn(i,on);
    var nb=$('read-mark-'+i);if(nb)nb.focus({preventScroll:true});
    playSound('tick');
  }
});
$('read-chapters').addEventListener('click',function(){
  var ch=chaptersOf(cur),ps=PS(cur),h='';
  ch.forEach(function(c,i){
    var r=!!ps.chapters[i];
    h+='<button class="crow row-press" id="chapter-row-'+i+'" type="button" data-i="'+i+'"><span class="cdisc'+(r?' isread':'')+'">'+(r?ic('check'):(i+1))+'</span><span class="crow-t">'+T(c.title)+'</span></button>';
  });
  $('chapters-body').innerHTML=h;
  openSheet('sheet-chapters','chapters-close');
});
$('chapters-close').addEventListener('click',function(){closeSheet('sheet-chapters')});
$('chapters-body').addEventListener('click',function(e){
  var r=e.target.closest('.crow');if(!r)return;
  var i=+r.getAttribute('data-i');
  closeSheet('sheet-chapters');
  later(function(){var el=$('chapter-'+i);if(el)el.scrollIntoView({behavior:rm()?'auto':'smooth',block:'start'})},60);
});

/* ---------- learn ---------- */
function learnFaceHTML(){
  var p=cur,ps=PS(p),f=face.learn,h='';
  if(f==='words'){
    var w=wordsOf(p);
    if(!w.length)h+=emptyHTML('learn','No words in this pack.','');
    else{
      h+='<p class="desc">'+(isDaily(p)?"New words from today's lesson and news.":'Words you might hear or use.')+'</p>';
      w.forEach(function(x){h+='<div class="card word"><div class="word-top"><b>'+T(x.term)+'</b>'+(x.tag?'<span class="pill">'+esc(x.tag)+'</span>':'')+'</div><p>'+T(x.meaning)+'</p>'+(x.example?'<p class="word-ex">'+T(x.example)+'</p>':'')+'</div>'});
    }
  }else if(f==='facts'){
    var facts=factsOf(p);
    if(!facts.length)h+=emptyHTML('learn','No facts in this pack.','');
    else{
      h+='<p class="desc">Facts you can share in class.</p>';
      facts.forEach(function(x,i){
        h+='<div class="card fact-card" id="inspire-'+i+'"><div class="fact-title">'+T(x.title)+'</div><p class="fact-b">'+T(x.fact)+'</p>'+
          (x.share?'<div class="scope"><b>You can say</b><p>'+T(x.share)+'</p></div>':'');
        if(x.why||x.source){
          h+='<button class="btn compact plain fact-more" id="fact-more-'+i+'" type="button" aria-expanded="false" aria-controls="fact-reveal-'+i+'">Why it matters</button>'+
            '<div class="reveal" id="fact-reveal-'+i+'" inert><div>'+
            (x.why?'<div class="blk"><div class="blk-l">Why it matters</div><p>'+T(x.why)+'</p></div>':'')+
            (x.source?'<p class="src">Source: '+T(String(x.source).replace(/,?\s*https?:\/\/\S+/g,''))+'</p>':'')+
            '</div></div>';
        }
        h+='</div>';
      });
    }
  }else{
    L_(p).forEach(function(l,i){
      var st=ps.lessons[l.id]||{},n=l.cards.length,seen=Math.min(st.seen||0,n);
      var det=st.done?'Done':seen>0?seen+' of '+n+' cards':plural(n,'card');
      h+='<button class="lrow row-press" id="lesson-row-'+i+'" type="button" data-i="'+i+'"><span class="mini'+(st.done||seen>0?' on':'')+'">'+(st.done?ic('check'):(i+1))+'</span><span class="lrow-text"><span class="lrow-title">'+T(l.title)+'</span><span class="lrow-detail'+(st.done?' ok':'')+'">'+det+'</span></span>'+ic('right','chev')+'</button>';
    });
  }
  return h;
}
function renderLearn(){
  var f=face.learn;
  $('learn-body').innerHTML='<div id="learn-seg">'+segHTML('seg-learn',3,Math.max(0,LFACES.indexOf(f)),[{id:'seg-lessons',t:'Lessons'},{id:'seg-words',t:'Words'},{id:'seg-facts',t:'Facts'}])+'</div><div id="learn-face">'+learnFaceHTML()+'</div>';
}
R.learn=renderLearn;
$('learn-body').addEventListener('click',function(e){
  var fm=e.target.closest('.fact-more');
  if(fm){
    var fi=fm.id.replace('fact-more-',''),rv=$('fact-reveal-'+fi),op=!rv.classList.contains('is-open');
    rv.classList.toggle('is-open',op);
    if(op)rv.removeAttribute('inert');else rv.setAttribute('inert','');
    fm.setAttribute('aria-expanded',op);
    return;
  }
  var s=e.target.closest('#seg-lessons,#seg-words,#seg-facts');
  if(s){
    var nf=s.id==='seg-words'?'words':s.id==='seg-facts'?'facts':'lessons';
    if(nf===face.learn)return;
    scrolls[scrollKey()]=window.scrollY;
    face.learn=nf;
    var seg=$('seg-learn');seg.style.setProperty('--i',LFACES.indexOf(nf));
    qsa('button',seg).forEach(function(b){var on=b===s;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',on)});
    $('learn-face').innerHTML=learnFaceHTML();
    try{history.replaceState(null,'','#'+(nf==='words'?'words':nf==='facts'?'facts':'learn'))}catch(er){}
    window.scrollTo(0,scrolls[scrollKey()]||0);
    return;
  }
  var r=e.target.closest('.lrow');
  if(r)openLesson(+r.getAttribute('data-i'));
});
/* ---------- lesson session ---------- */
var LS=null,sw=null;
function lessonCardHTML(i){
  var l=L_(cur)[LS.i],c=l.cards[i];
  return '<div class="kicker">'+T(l.title)+' · '+(i+1)+' of '+l.cards.length+'</div><h2>'+T(c.title)+'</h2><p>'+T(c.body)+'</p>'+
    (c.example?'<div class="example"><b>For example</b><p>'+T(c.example)+'</p></div>':'');
}
function lessonDots(){
  var n=L_(cur)[LS.i].cards.length,h='';
  for(var k=0;k<n;k++)h+='<span class="dot"></span>';
  $('lesson-dots').innerHTML=h;
}
function lessonSync(){
  var l=L_(cur)[LS.i],n=l.cards.length;
  qsa('.dot',$('lesson-dots')).forEach(function(d,k){d.className='dot'+(k<LS.card?' seen':k===LS.card?' cur':'')});
  $('lesson-back').disabled=LS.card===0;
  $('lesson-next').textContent=LS.card===n-1?'Finish':'Next';
}
function lessonListenBtn(){
  var w=$('lesson-listen-wrap');
  w.innerHTML=SYN?'<button class="icon-btn" id="lesson-listen" type="button" data-lk="lesson" aria-label="Listen to this lesson" aria-pressed="false">'+ic('vol')+'</button>':'<span class="slot44"></span>';
}
function openLesson(i){
  var p=cur,ls=L_(p);
  if(!ls[i])return;
  stopSpeech();
  var st=PS(p).lessons[ls[i].id]||{};
  var n=ls[i].cards.length;
  LS={i:i,card:st.done?0:clamp(st.card||0,0,n-1),t0:Date.now(),done:false,cardAt:performance.now(),quick:0};
  $('lesson-top').hidden=false;$('lesson-body').hidden=false;$('lesson-actions').hidden=false;$('lesson-donebox').hidden=true;
  lessonDots();lessonListenBtn();
  var c=$('lesson-card');c.className='lcard';c.innerHTML=lessonCardHTML(LS.card);
  lessonSync();
  $('lesson-body').scrollTop=0;
  $('lesson').hidden=false;
  lessonSave();
  pushLayer($('lesson'),closeLesson,$('lesson-close'),true);
  announce('Card '+(LS.card+1)+' of '+n+'.');
}
function lessonSave(){
  var p=cur,l=L_(p)[LS.i],ps=PS(p),st=ps.lessons[l.id]||(ps.lessons[l.id]={});
  st.card=LS.card;st.seen=Math.max(st.seen||0,LS.card+1);
  saveP(p);
}
function closeLesson(){
  var el=$('lesson');if(el.hidden)return;
  stopSpeech();
  el.hidden=true;LS&&(LS.open=false);
  popLayer(el);
  doneTimers.forEach(clearTimeout);
  refresh();
}
function lessonGo(n,dir,ghostRight){
  var l=L_(cur)[LS.i],card=$('lesson-card'),stack=$('lesson-stack');
  if(performance.now()-LS.cardAt<2000&&!speaking)LS.quick++;
  LS.cardAt=performance.now();
  var gf=LS.ghostFrom||'';LS.ghostFrom=null;
  if((dir>0||ghostRight)&&!rm()){
    var g=card.cloneNode(true);g.removeAttribute('id');g.className='lcard ghost-out'+(dir<0?' to-right':'');
    g.style.transform=gf;stack.appendChild(g);later(function(){if(g.parentNode)g.parentNode.removeChild(g)},440);
  }
  LS.card=n;
  card.innerHTML=lessonCardHTML(n);
  card.classList.remove('in','in-back');reflow(card);card.classList.add(dir>0?'in':'in-back');
  card.style.transform='';
  $('lesson-body').scrollTop=0;
  lessonSync();lessonSave();
  announce('Card '+(n+1)+' of '+l.cards.length+'.');
}
function lessonNext(){
  var l=L_(cur)[LS.i],was=speaking&&speakKey==='lesson';
  if(LS.card>=l.cards.length-1){lessonFinish();return}
  lessonGo(LS.card+1,1);playSound('tick');
  if(was)lessonListen();
}
function lessonBack(sw_){
  if(LS.card<=0)return;
  var was=speaking&&speakKey==='lesson';
  lessonGo(LS.card-1,-1,sw_===true);
  if(was)lessonListen();
}
function lessonListen(){
  var l=L_(cur)[LS.i],list=[];
  for(var k=LS.card;k<l.cards.length;k++){var c=l.cards[k];list.push(c.title+'. '+c.body+(c.example?' For example: '+c.example:''))}
  var base=LS.card;
  speakList(list,'lesson',function(i){if(base+i!==LS.card)lessonGo(base+i,1)});
}
function lessonFinish(){
  var p=cur,l=L_(p)[LS.i],ps=PS(p),st=ps.lessons[l.id]||(ps.lessons[l.id]={});
  LS.ghostFrom=null;
  if(performance.now()-LS.cardAt<2000&&!speaking)LS.quick++;
  stopSpeech();
  var quick=LS.quick>Math.floor(l.cards.length/2)&&!st.done;
  if(quick){st.seen=Math.min(st.seen||0,l.cards.length-1);st.card=0}
  else{st.done=true;st.seen=l.cards.length;st.card=0;if(!st.doneAt)st.doneAt=new Date().toISOString()}
  saveP(p);
  var mins=Math.max(1,Math.round((Date.now()-LS.t0)/60000)),rd_=readiness(p),ls=L_(p),nextI=-1;
  for(var k=1;k<ls.length;k++){var j=(LS.i+k)%ls.length;if(!(ps.lessons[ls[j].id]||{}).done){nextI=j;break}}
  LS.done=true;
  var btns=[];
  if(nextI>=0){btns.push({id:'lesson-done-next',t:'Next lesson'});btns.push({id:'lesson-done-home',t:'Back to Home',plain:true})}
  else btns.push({id:'lesson-done-home',t:'Back to Home'});
  $('lesson-top').hidden=true;$('lesson-body').hidden=true;$('lesson-actions').hidden=true;
  var db=$('lesson-donebox');
  db.innerHTML=doneHTML({id:'lesson-done',title:'Lesson done!',line:quick?'That was quick. Go through it once more to count it.':'Lesson '+(LS.i+1)+' of '+ls.length+': '+l.title,
    stats:[{v:l.cards.length,l:l.cards.length===1?'card':'cards'},{v:mins,l:mins===1?'minute':'minutes'},{v:rd_,l:'ready',suf:'%',g:true}],buttons:btns});
  db.hidden=false;
  LS.nextI=nextI;
  playDone('lesson-done');
  announce('Lesson done.');
  var f=$('lesson-done-next')||$('lesson-done-home');if(f)f.focus({preventScroll:true});
}
$('lesson-close').addEventListener('click',closeLesson);
$('lesson-next').addEventListener('click',lessonNext);
$('lesson-back').addEventListener('click',function(){lessonBack()});
$('lesson-top').addEventListener('click',function(e){
  if(e.target.closest('#lesson-listen')){if(speaking&&speakKey==='lesson')stopSpeech();else lessonListen()}
});
$('lesson-donebox').addEventListener('click',function(e){
  if(e.target.closest('#lesson-done-next')){var n=LS.nextI;closeLesson();openLesson(n);return}
  if(e.target.closest('#lesson-done-home')){closeLesson();goTab('home')}
});
document.addEventListener('keydown',function(e){
  var t=topLayer();if(!t||t.el.id!=='lesson'||!LS||LS.done)return;
  if(e.key==='ArrowRight'){e.preventDefault();lessonNext()}
  else if(e.key==='ArrowLeft'){e.preventDefault();lessonBack()}
});
/* swipe */
(function(){
  var st=$('lesson-stack');
  st.addEventListener('pointerdown',function(e){
    if(!LS||LS.done||e.button>0)return;
    sw={x:e.clientX,y:e.clientY,t:performance.now(),drag:false,id:e.pointerId,dx:0};
  });
  st.addEventListener('pointermove',function(e){
    if(!sw||e.pointerId!==sw.id)return;
    var dx=e.clientX-sw.x,dy=e.clientY-sw.y,card=$('lesson-card');
    if(!sw.drag){
      if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){sw.drag=true;try{card.setPointerCapture(e.pointerId)}catch(er){}card.style.animation='none';card.style.transition='none'}
      else return;
    }
    sw.dx=dx;
    if(!rm())card.style.transform='translateX('+dx+'px) rotate('+clamp(dx/20,-6,6)+'deg)';
  });
  function end(e){
    if(!sw||e.pointerId!==sw.id)return;
    var s=sw;sw=null;
    if(!s.drag)return;
    var card=$('lesson-card'),dx=s.dx,v=dx/Math.max(1,performance.now()-s.t);
    card.style.animation='';
    if(e.type!=='pointercancel'&&(Math.abs(dx)>80||(Math.abs(dx)>30&&Math.abs(v)>0.5))){
      var next=dx<0,tf=card.style.transform;
      if(next){card.style.transition='';LS.ghostFrom=tf;lessonNextSwipe()}
      else if(LS.card>0){card.style.transition='';LS.ghostFrom=tf;lessonBack(true)}
      else springBack(card);
    }else springBack(card);
  }
  function springBack(card){
    card.style.transition='transform var(--dur-quick) var(--ease-quick)';card.style.transform='';
    later(function(){card.style.transition=''},420);
  }
  function lessonNextSwipe(){lessonNext()}
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
})();
