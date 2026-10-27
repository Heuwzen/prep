/* ---------- init ---------- */
document.addEventListener('touchstart',function(){},{passive:true});
function showError(){
  $('app').innerHTML=emptyHTML('pres','Nothing to study yet','The study content could not be read.');
  $('tabbar').hidden=true;
}
/* focus ring only for keyboard users: scripted focus after a tap should not draw it */
document.documentElement.classList.add('pointer');
document.addEventListener('pointerdown',function(){document.documentElement.classList.add('pointer')},true);
document.addEventListener('keydown',function(e){if(e.key==='Tab'||e.key==='Enter'||e.key===' '||(e.key&&e.key.indexOf('Arrow')===0))document.documentElement.classList.remove('pointer')},true);
function init(){
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
