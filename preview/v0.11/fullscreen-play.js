/* All Aboard V0.11 - mobile-first distraction-free game preview.
 * Native Element Fullscreen where supported; viewport-focus fallback elsewhere.
 * No navigation, physics or preset data is changed by entering/exiting.
 */
(function(root){
"use strict";
class FullscreenPlay{
 constructor(){
  this.active=false;this.native=false;this.pending=false;
 }
 el(id){return document.getElementById(id);}
 mount(){
  if(!this.el("playtestFullscreen")||!this.el("playtestExit")||!this.el("phoneScreen"))return;
  this.el("playtestFullscreen").addEventListener("click",()=>this.toggle());
  this.el("playtestExit").addEventListener("click",()=>this.exit());
  document.addEventListener("fullscreenchange",()=>this.onNativeChange());
  document.addEventListener("keydown",e=>{
   if(e.key==="Escape"&&this.active&&!document.fullscreenElement)this.exit();
  });
  this.render();
 }
 render(message){
  const launch=this.el("playtestFullscreen"),exit=this.el("playtestExit");
  const screen=this.el("phoneScreen");
  if(!launch||!exit||!screen)return;
  launch.textContent=this.active?"↙ Exit game view":"⛶ Play Fullscreen";
  launch.setAttribute("aria-pressed",String(this.active));
  exit.hidden=!this.active;
  screen.classList.toggle("playtest-active",this.active);
  document.body?.classList.toggle("allaboard-play-focus",this.active);
  const status=this.el("playtestStatus");
  if(status)status.textContent=message||(this.active?
   (this.native?"True browser fullscreen · use Exit or Escape":
    "Viewport focus mode · browser UI may remain visible on this device"):
    "Mobile: fullscreen where supported · safe viewport focus fallback");
  // CSS changes the canvas resolution; the resize observer handles drawing.
  root.AllAboardUILayoutInstance?.applyAll?.();
 }
 toggle(){return this.active?this.exit():this.enter();}
 enter(){
  if(this.active||this.pending)return;
  root.AllAboardLiveBridge?.setTab?.("live");
  const editor=root.AllAboardUILayoutInstance;
  if(editor?.active)editor.toggle();
  root.AllAboardQuickTutorialInstance?.stop?.(false);
  const screen=this.el("phoneScreen");
  if(!screen)return;
  this.active=true;this.native=false;
  this.render("Opening distraction-free game view...");
  // Fullscreen API must be invoked synchronously from the click gesture.
  if(typeof screen.requestFullscreen!=="function"){
   this.render("Viewport focus mode · browser fullscreen unavailable here");
   return;
  }
  try{
   this.pending=true;
   const request=screen.requestFullscreen({navigationUI:"hide"});
   Promise.resolve(request).then(()=>{
    this.pending=false;
    this.native=document.fullscreenElement===screen;
    this.render();
   }).catch(()=>{
    this.pending=false;
    this.native=false;
    this.render("Viewport focus mode · native fullscreen was declined by the browser");
   });
  }catch(err){
   this.pending=false;this.native=false;
   this.render("Viewport focus mode · native fullscreen not supported on this device");
  }
 }
 exit(){
  if(!this.active&&!this.pending)return;
  const screen=this.el("phoneScreen");
  const wasNative=document.fullscreenElement===screen;
  this.active=false;this.native=false;this.pending=false;
  this.render();
  if(wasNative&&typeof document.exitFullscreen==="function"){
   try{const request=document.exitFullscreen();Promise.resolve(request).catch(()=>{});}catch(e){}
  }
 }
 onNativeChange(){
  const phone=this.el("phoneScreen");
  if(document.fullscreenElement===phone){
   this.native=true;this.active=true;this.pending=false;this.render();return;
  }
  if(this.native){
   this.active=false;this.native=false;this.pending=false;this.render();
  }
 }
}
root.AllAboardFullscreen={FullscreenPlay};
if(typeof module!=="undefined"&&module.exports)module.exports={FullscreenPlay};
if(typeof document!=="undefined"){
 const boot=()=>{const play=new FullscreenPlay();play.mount();root.AllAboardFullscreenInstance=play;};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
}
})(typeof window!=="undefined"?window:globalThis);
