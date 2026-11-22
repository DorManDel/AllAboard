/* V0.9 — short, optional three-rivet repair minigame.
 * A deliberate sequence, not an opaque random clicking reward.
 */
(function(root){
"use strict";
class RepairSequence{
 constructor(){this.order=[1,0,2];this.reset();}
 reset(){this.active=false;this.step=0;this.startedAt=0;this.target="sails";}
 begin(target,now=Date.now()){
  if(!["sails","cannons","rudder"].includes(target))return false;
  this.reset();this.active=true;this.target=target;this.startedAt=now;return true;
 }
 tap(index,now=Date.now()){
  if(!this.active)return{ok:false,message:"Start a repair first."};
  if(index!==this.order[this.step])return{ok:false,message:"Try the highlighted rivet.",step:this.step};
  this.step++;
  if(this.step<this.order.length)return{ok:true,finished:false,step:this.step};
  this.active=false;
  const elapsed=Math.max(0,(now-this.startedAt)/1000);
  return{ok:true,finished:true,elapsed,heal:elapsed<=4?35:25,cost:20,target:this.target};
 }
}
class RepairMiniUI{
 constructor(){this.game=new RepairSequence();}
 mount(){
  const begin=document.getElementById("repairBegin");
  if(!begin)return;
  begin.addEventListener("click",()=>this.begin());
  document.getElementById("repairReset").addEventListener("click",()=>{this.game.reset();this.render("Puzzle reset.");});
  document.querySelectorAll("[data-repair-step]").forEach(button=>
    button.addEventListener("click",()=>this.tap(Number(button.dataset.repairStep))));
  this.render("Pick a damaged module, then start patching.");
 }
 begin(){
  const state=root.AllAboardLiveBridge?.getState?.();
  if(!state){this.render("The ship is not ready.");return;}
  const target=document.getElementById("repairTarget").value;
  if(state.modules[target]>=100){this.render("This module is already healthy. Use a Damage Lab test first.");return;}
  if(state.ship.coins<20){this.render("Need 20 coins for repair materials.");return;}
  this.game.begin(target);this.render("Patch the glowing rivets in order: middle, left, right.");
 }
 tap(index){
  const result=this.game.tap(index);
  if(!result.finished){this.render(result.message||"Nice. Next rivet.");return;}
  const state=root.AllAboardLiveBridge?.getState?.();
  if(!state||state.ship.coins<result.cost){this.render("Not enough materials. Repair canceled.");return;}
  state.ship.coins-=result.cost;
  state.modules[result.target]=Math.min(100,state.modules[result.target]+result.heal);
  root.AllAboardPlaySfx?.("repair");
  this.render("Repaired "+result.target+" by "+result.heal+"%. Cost "+result.cost+" coins. "+result.elapsed.toFixed(1)+"s.");
 }
 render(message){
  const output=document.getElementById("repairStatus");
  if(output)output.textContent=message;
  for(const button of document.querySelectorAll("[data-repair-step]")){
   const index=Number(button.dataset.repairStep);
   const next=this.game.active&&this.game.order[this.game.step]===index;
   button.classList.toggle("repair-next",next);
   button.disabled=!this.game.active;
   button.setAttribute("aria-label","Rivet "+(index+1)+(next?", tap now":""));
  }
 }
}
root.AllAboardRepairMini={RepairSequence,RepairMiniUI};
if(typeof module!=="undefined"&&module.exports)module.exports={RepairSequence,RepairMiniUI};
if(typeof document!=="undefined"){
 const init=()=>{const ui=new RepairMiniUI();ui.mount();root.AllAboardRepairMiniInstance=ui;};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
}
})(typeof window!=="undefined"?window:globalThis);
