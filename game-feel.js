/* All Aboard V0.7 — Game Feel: deterministic presentation and sail trim.
 * No camera translation is applied to physics or world coordinate positions.
 * Browser lab implementation; pure math is portable to C#.
 */
(function(root){
"use strict";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function wavePose(ocean,ship,settings,time){
  if(!ocean||!ship)return{bob:0,pitch:0,roll:0};
  const a=ship.heading*Math.PI/180;
  const fx=Math.sin(a),fy=-Math.cos(a),rx=-fy,ry=fx;
  const h=(dx,dy)=>ocean.heightAt(ship.x+dx,ship.y+dy,settings,time);
  const bow=h(fx*25,fy*25),stern=h(-fx*25,-fy*25);
  const port=h(-rx*13,-ry*13),starboard=h(rx*13,ry*13);
  const amplitude=clamp(settings.waveHeight||0,0,2);
  return{
    bob:clamp((bow+stern)*.5*1.6,-4,4),
    pitch:clamp((bow-stern)*.014,-.045,.045),
    roll:clamp((starboard-port)*.019,-.06,.06)*amplitude
  };
}
function trimEfficiency(heading,windTo,trimDegrees,manual=true){
  const relative=((windTo-heading+540)%360)-180;
  // Simple arcade trim target: sail turns towards incoming relative wind.
  // Player may choose auto trim; tiny impact to keep controls optional.
  // Mirror the authoritative Vessel.step yard-tilt contract (±90°).
  const desired=clamp(relative*.5,-90,90);
  const angle=manual?clamp(trimDegrees,-90,90):desired;
  const error=Math.abs(angle-desired);
  const bonus=clamp(1-.14*(error/90),.86,1);
  return{desired,angle,bonus,error};
}
class FeelEngine{
  constructor(){
    this.recoil=0;this.impact=0;this.elapsed=0;this.shots=0;
    this.reducedMotion=false;
  }
  fire(power=1){
    this.recoil=clamp(this.recoil+power,0,3);
    this.shots++;
  }
  hit(power=1){this.impact=clamp(this.impact+power,0,3);}
  step(dt){
    const t=clamp(dt,0,.05);
    this.elapsed+=t;
    this.recoil*=Math.exp(-13*t);
    this.impact*=Math.exp(-9*t);
  }
  pose(ocean,ship,settings,time=this.elapsed){
    const wave=wavePose(ocean,ship,settings,time);
    if(this.reducedMotion)return{...wave,bob:wave.bob*.25,pitch:wave.pitch*.25,
      roll:wave.roll*.25,recoil:0,shakeX:0,shakeY:0};
    const recoil=clamp(this.recoil,0,3);
    const hit=clamp(this.impact,0,3);
    return{...wave,recoil,
      shakeX:(Math.sin(this.elapsed*47)*hit+Math.sin(this.elapsed*25)*recoil)*.65,
      shakeY:(Math.sin(this.elapsed*35)*hit+Math.sin(this.elapsed*19)*recoil)*.5};
  }
}
root.AllAboardGameFeel={FeelEngine,wavePose,trimEfficiency};
if(typeof module!=="undefined"&&module.exports)
  module.exports={FeelEngine,wavePose,trimEfficiency};
})(typeof window!=="undefined"?window:globalThis);
