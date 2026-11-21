/* All Aboard — browser vibration adapter (not Unity haptics).
 * Pattern duration can vary; vibration MOTOR AMPLITUDE cannot be controlled
 * by Navigator.vibrate. Never infer physical feedback from a true return value.
 */
(function(root){
"use strict";
const patterns={
 tick:[12],sail:[18],anchorDrop:[45,35,65],anchorRaise:[28,20,24],
 shot:[32,25,42],hit:[90,35,70],friend:[18,50,20],
 coins:[20,30,32],repair:[20,20,25],kraken:[70,55,70],
 test:[70,55,95]
};
const cooldown={tick:100,sail:90,shot:210,hit:210,test:0};
class HapticController{
 constructor(navigatorRef,clock=()=>Date.now()){
  this.nav=navigatorRef||{};this.clock=clock;this.enabled=true;
  this.scale=1;this.last=new Map();this.lastResult="Not tested";
 }
 get supported(){return typeof this.nav.vibrate==="function";}
 status(){
  if(!this.supported)return "Unsupported: this browser does not expose Navigator.vibrate.";
  if(!this.enabled)return "Disabled by the player.";
  return this.lastResult;
 }
 setEnabled(value){
  this.enabled=!!value;
  if(!this.enabled&&this.supported){
   try{this.nav.vibrate(0);}catch(e){}
  }
 }
 setScale(value){this.scale=Math.max(.5,Math.min(2,Number(value)||1));}
 play(key="tick"){
  if(!this.enabled){this.lastResult="Disabled by the player.";return false;}
  if(!this.supported){this.lastResult="Unavailable: browser vibration is unsupported.";return false;}
  const now=this.clock(),last=this.last.get(key);
  if(last!==undefined&&now-last<(cooldown[key]||75))return false;
  this.last.set(key,now);
  const raw=patterns[key]||patterns.tick;
  const scaled=raw.map((n,i)=>Math.round(n*(i%2===0?this.scale:1)));
  try{
   const accepted=this.nav.vibrate(scaled);
   this.lastResult=accepted===false?
     "Browser rejected the vibration request.":
     "Request sent; physical vibration still depends on your phone settings and browser.";
   return accepted!==false;
  }catch(e){
   this.lastResult="Browser blocked the vibration request.";
   return false;
  }
 }
 stop(){if(this.supported){try{this.nav.vibrate(0);}catch(e){}}}
}
root.AllAboardHaptics={HapticController,patterns};
if(typeof module!=="undefined"&&module.exports)module.exports={HapticController,patterns};
})(typeof window!=="undefined"?window:globalThis);
