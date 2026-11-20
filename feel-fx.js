/* All Aboard V0.7 — small feedback model, not game physics.
 * Effects are visual only: waves never move the authoritative ship position.
 * Ship recoil is a damped impulse; sail trim intentionally gives a small
 * efficiency bonus/penalty without replacing the tailwind-first polar.
 */
(function(root){
"use strict";
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const rad=d=>d*Math.PI/180;
class SailTrim{
  constructor(){this.angle=0;this.target=0;this.efficiency=1;}
  static target(shipHeading,windTo){
    const rel=(shipHeading-windTo)*Math.PI/180;
    // 0° trim for tailwind, up to ±36° across the wind.
    return clamp(-Math.sin(rel)*36,-40,40);
  }
  step(ship,settings,dt){
    const auto=settings.autoTrim!==false;
    this.target=auto?SailTrim.target(ship.heading,settings.windDirection):
      clamp(Number(settings.sailTrim)||0,-45,45);
    this.angle+=(this.target-this.angle)*(1-Math.exp(-4*clamp(dt,0,.1)));
    const error=Math.abs(this.angle-SailTrim.target(ship.heading,settings.windDirection));
    // No hidden extra speed boost; mistuning causes up to 23% thrust loss.
    this.efficiency=1-.23*clamp(error/75,0,1);
    return this.efficiency;
  }
  reset(){this.angle=0;this.target=0;this.efficiency=1;}
}
class ShipFeedback{
  constructor(){
    this.bob=0;this.roll=0;this.pitch=0;this.recoilX=0;this.recoilY=0;
    this.shake=0;this.shakePhase=0;this.windGlow=0;
    this.trim=new SailTrim();this.fired=0;
  }
  fire(side=1,intensity=1){
    const s=clamp(intensity,0,2);
    this.recoilX+=clamp(side,-1,1)*3.5*s;
    this.recoilY+=2.0*s;
    this.shake=clamp(this.shake+2.4*s,0,8);
    this.fired++;
  }
  impact(strength=1){this.shake=clamp(this.shake+2*strength,0,9);}
  step(ship,ocean,settings,dt){
    const t=clamp(dt,0,.08),theta=rad(ship.heading);
    const fx=Math.sin(theta),fy=-Math.cos(theta),rx=-fy,ry=fx;
    const h=(x,y)=>ocean?.heightAt?.(x,y,settings)??0;
    const mid=h(ship.x,ship.y);
    const fore=h(ship.x+fx*28,ship.y+fy*28);
    const aft=h(ship.x-fx*28,ship.y-fy*28);
    const port=h(ship.x-rx*15,ship.y-ry*15);
    const starboard=h(ship.x+rx*15,ship.y+ry*15);
    const waveGain=clamp(Number(settings.waveMotion??1),0,2.5);
    const targetBob=mid*1.7*waveGain;
    const targetPitch=clamp((fore-aft)*.014*waveGain,-.08,.08);
    const targetRoll=clamp((starboard-port)*.028*waveGain,-.1,.1);
    const blend=1-Math.exp(-4*t);
    this.bob+=(targetBob-this.bob)*blend;
    this.pitch+=(targetPitch-this.pitch)*blend;
    this.roll+=(targetRoll-this.roll)*blend;
    this.recoilX*=Math.exp(-9*t);this.recoilY*=Math.exp(-9*t);
    this.shake*=Math.exp(-8*t);
    this.shakePhase+=t*31;
    this.windGlow=clamp((settings.windStrength||0)/5,0,1);
    this.trim.step(ship,settings,t);
  }
  camera(settings){
    const factor=clamp(settings.cameraShake??.75,0,2);
    return{x:Math.sin(this.shakePhase*2.3)*this.shake*.75*factor,
      y:Math.cos(this.shakePhase*3.1)*this.shake*.5*factor};
  }
  visual(settings){
    return{
      bob:this.bob,roll:this.roll,pitch:this.pitch,
      recoilX:this.recoilX*clamp(settings.recoilStrength??1,0,2),
      recoilY:this.recoilY*clamp(settings.recoilStrength??1,0,2),
      sailTilt:rad(this.trim.angle),trimEfficiency:this.trim.efficiency
    };
  }
  reset(){
    this.bob=0;this.roll=0;this.pitch=0;this.recoilX=0;this.recoilY=0;
    this.shake=0;this.shakePhase=0;this.windGlow=0;this.fired=0;this.trim.reset();
  }
}
root.AllAboardFeel={SailTrim,ShipFeedback};
if(typeof module!=="undefined"&&module.exports)module.exports={SailTrim,ShipFeedback};
})(typeof window!=="undefined"?window:globalThis);
