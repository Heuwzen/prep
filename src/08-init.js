/* ---------- init ---------- */
document.addEventListener('touchstart',function(){},{passive:true});
function showError(){
  $('app').innerHTML=emptyHTML('pres',t('Nothing to study yet'),t('The study content could not be read.'));
  $('tabbar').hidden=true;
}
/* focus ring only for keyboard users: scripted focus after a tap should not draw it */
document.documentElement.classList.add('pointer');
document.addEventListener('pointerdown',function(){document.documentElement.classList.add('pointer')},true);
document.addEventListener('keydown',function(e){if(e.key==='Tab'||e.key==='Enter'||e.key===' '||(e.key&&e.key.indexOf('Arrow')===0))document.documentElement.classList.remove('pointer')},true);
/* The shell markup is English; on another language its fixed labels are swapped once, before the first render. */
function translateStatic(){
  qsa('body *').forEach(function(el){
    if(el.tagName==='SCRIPT'||el.tagName==='STYLE')return;
    if(el.children.length===0&&el.childNodes.length===1&&el.firstChild.nodeType===3){var s=el.textContent;if(TR.hasOwnProperty(s))el.textContent=TR[s]}
    var a=el.getAttribute('aria-label');if(a&&TR.hasOwnProperty(a))el.setAttribute('aria-label',TR[a]);
  });
}
function init(){
  if(UI_LANG!=='en')translateStatic();
  if(bad){showError();return}
  setSelected(pickInitialPack());
  syncSoundBtns();
  updateBadges();
  route();
  dailyBoot();
  setInterval(studyTick,5000);
  setInterval(updateCountdown,20000);
  if(window.matchMedia){
    var mq=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(mq.addEventListener)mq.addEventListener('change',function(){});
  }
  window.addEventListener('load',function(){placeHl(true);watchHeader()});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){placeHl(true)});
}
init();
