/* V0.9: small live-game 10s tutorial overlay, not a cutscene.
 * Overlay never intercepts ship inputs; one step lights up one real control.
 */
(function(root){
"use strict";
const steps=[
 {target:"wheelControl",title:"STEER",text:"Drag the wheel left and right ↶ ↷"},
 {target:"sailControl",title:"SAILS",text:"Raise or furl sails. Open AUTO for tilt."},
 {target:"anchorControl",title:"ANCHOR",text:"Tap ⚓ to drop or raise the anchor."},
 {target:"modeButton",title:"YOUR CHOICE",text:"Tap to switch Friendly ↔ Aggressive."},
 {target:"headingHud",title:"READ THE WIND",text:"Watch the compass and follow the breeze."}
];
class QuickTutorial{
 constructor(){this.index=0;this.clock=0;this.active=false;this.last=0;this.timer=null;}
 el(id){return document.getElementById(id);}
 mount(){
  if(!this.el("quickTutorial"))return;
  this.el("quickTutorialSkip").addEventListener("click",()=>this.stop());
  this.el("quickTutorialReplay").addEventListener("click",()=>this.start());
  const replay=this.el("tutorialReplay");
  replay?.addEventListener("click",()=>this.start());
  const seen=(()=>{try{return root.sessionStorage?.getItem("allaboard-tutorial-v09")==="seen";}catch(e){return false;}})();
  if(!seen)this.start();
 }
 start(){
  if(!this.el("quickTutorial"))return;
  this.stop(false);
  root.AllAboardLiveBridge?.setTab?.("live");
  this.active=true;this.index=0;this.clock=0;
  this.el("quickTutorial").hidden=false;
  this.el("quickTutorialReplay").hidden=true;
  this.show(0);
  this.last=Date.now();
  this.timer=root.setInterval?.(()=>this.tick(),100)??null;
 }
 tick(){
  if(!this.active)return;
  const now=Date.now(),delta=Math.min(.35,(now-this.last)/1000);
  this.last=now;this.clock+=delta;
  const next=Math.min(4,Math.floor(this.clock/2));
  if(next!==this.index)this.show(next);
  if(this.clock>=10)this.stop();
 }
 show(i){
  for(const item of steps)this.el(item.target)?.classList.remove("tutorial-focus");
  this.index=i;const step=steps[i];
  this.el(step.target)?.classList.add("tutorial-focus");
  this.el("quickTutorialStep").textContent=(i+1)+" / 5";
  this.el("quickTutorialTitle").textContent=step.title;
  this.el("quickTutorialDescription").textContent=step.text;
 }
 stop(markSeen=true){
  this.active=false;
  if(this.timer!==null)root.clearInterval?.(this.timer);
  this.timer=null;
  if(typeof document!=="undefined"){
   for(const item of steps)this.el(item.target)?.classList.remove("tutorial-focus");
   const overlay=this.el("quickTutorial");if(overlay)overlay.hidden=true;
   const replay=this.el("quickTutorialReplay");if(replay)replay.hidden=false;
  }
  if(markSeen){try{root.sessionStorage?.setItem("allaboard-tutorial-v09","seen");}catch(e){}}
 }
}
root.AllAboardQuickTutorial={QuickTutorial,steps};
if(typeof module!=="undefined"&&module.exports)module.exports={QuickTutorial,steps};
if(typeof document!=="undefined"){
 const boot=()=>{const guide=new QuickTutorial();guide.mount();root.AllAboardQuickTutorialInstance=guide;};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
}
})(typeof window!=="undefined"?window:globalThis);
