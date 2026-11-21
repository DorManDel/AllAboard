/* All Aboard — Kraken Grapple Prototype V0.6
 * Eight arm states coordinated by one controller (NOT eight managers).
 * Telegraph -> reach -> short grab -> release/cooldown.
 * Aiming/auto-fire may damage the grabbing arm and free the ship.
 * Arcade behavior, not real octopus hydrostatic musculature.
 */
(function(root){
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class KrakenGrapple{
  constructor(){this.monsters=new Map();this.lastEvent=null;}
  reset(){this.monsters.clear();this.lastEvent=null;}
  ensure(id){
    if(this.monsters.has(id))return this.monsters.get(id);
    const state={
      phase:"idle",clock:0,cooldown:0,active:0,health:2,grabDamageTimer:0,
      arms:Array.from({length:8},(_,i)=>({index:i,reach:0,sway:i*.84,health:2,grabbing:false}))
    };
    this.monsters.set(id,state);return state;
  }
  get(monster){return this.ensure(monster.id);}
  isGrabbing(id){return this.monsters.get(id)?.phase==="grab";}
  status(monster){
    const state=monster?this.monsters.get(monster.id):null;
    if(!state)return"No arm engaged";
    return state.phase==="grab"?"GRABBED · shoot the arm twice to escape":
      state.phase==="warn"?"WARNING · tentacle approaching!":
      state.phase==="reach"?"REACHING · steer or change course":
      state.phase==="recoil"?"RELEASED · tentacle retreating":
      "Watching the water";
  }
  update(monster,dt,ship,ocean){
    const state=this.ensure(monster.id);
    state.clock+=dt;
    const d=Math.hypot(ship.x-monster.x,ship.y-monster.y);
    if(state.phase==="idle"){
      if(d<monster.radius*1.8){
        state.phase="warn";state.clock=0;
        state.active=(state.active+1)%8;state.health=2;
        state.arms[state.active].health=2;
        this.lastEvent={id:monster.id,kind:"warn",message:"Bubbles! The Kraken is preparing a tentacle strike."};
        ocean?.splash(monster.x,monster.y,.65,"kraken-warning");
      }
    }else if(state.phase==="warn"){
      if(state.clock>=1.2){state.phase="reach";state.clock=0;}
    }else if(state.phase==="reach"){
      if(state.clock>=.9){
        if(d<monster.radius*1.7){
          state.phase="grab";state.clock=0;state.grabDamageTimer=0;
          state.arms[state.active].grabbing=true;
          this.lastEvent={id:monster.id,kind:"grab",message:"Kraken grab! Steer to weaken its pull, or hit the arm twice."};
          ocean?.splash(ship.x,ship.y,1.4,"kraken-grab");
        }else this.release(monster.id,"escaped");
      }
    }else if(state.phase==="grab"){
      const dx=monster.x-ship.x,dy=monster.y-ship.y,dist=Math.max(1,Math.hypot(dx,dy));
      // The rope-like arm adds acceleration toward the Kraken, NOT a sudden
      // position snap. The normal sailing, sails and rudder keep working.
      const strength=clamp((dist-30)*.035,0,6);
      ship.vx+=dx/dist*strength*dt;
      ship.vy+=dy/dist*strength*dt;
      state.grabDamageTimer+=dt;
      if(state.grabDamageTimer>=1.4){
        ship.hull=Math.max(0,(ship.hull??100)-4);
        state.grabDamageTimer=0;
        ocean?.splash(ship.x,ship.y,.9,"kraken-grab");
      }
      if(d>monster.radius*2.0||state.clock>5.4)this.release(monster.id,d>monster.radius*2?"escaped":"released");
    }else if(state.phase==="recoil"){
      if(state.clock>=.75){state.phase="cooldown";state.clock=0;state.cooldown=3.5;}
    }else if(state.phase==="cooldown"){
      state.cooldown-=dt;
      if(state.cooldown<=0){state.phase="idle";state.clock=0;}
    }
    // All eight arms stay readable: only the active one extends to the ship.
    for(const arm of state.arms){
      const on=arm.index===state.active;
      const wanted=on?(state.phase==="warn"?.25:
        state.phase==="reach"?.8:
        state.phase==="grab"?1:
        state.phase==="recoil"?.35:0):.12;
      arm.reach+=(wanted-arm.reach)*(1-Math.exp(-4*dt));
      arm.sway+=dt*(.4+arm.index*.015);
      arm.grabbing=on&&state.phase==="grab";
    }
    return state.phase;
  }
  release(id,reason="released"){
    const state=this.monsters.get(id);if(!state)return false;
    state.phase="recoil";state.clock=0;state.grabDamageTimer=0;
    for(const arm of state.arms)arm.grabbing=false;
    this.lastEvent={id,kind:"release",message:reason==="shot"?
      "Tentacle damaged! The Kraken released the ship.":
      reason==="escaped"?"You escaped the Kraken's reach!":"The Kraken released its grip."};
    return true;
  }
  hit(id){
    const state=this.monsters.get(id);
    if(!state||!["reach","grab"].includes(state.phase))return false;
    state.health=Math.max(0,state.health-1);
    state.arms[state.active].health=state.health;
    if(state.health===0)this.release(id,"shot");
    else this.lastEvent={id,kind:"hit",message:"Arm hit! One more good broadside will free the ship."};
    return true;
  }
  draw(ctx,project,monster,ship){
    const state=this.monsters.get(monster.id);
    if(!state)return;
    const center=project(monster.x,monster.y);
    const shipP=project(ship.x,ship.y);
    const radius=monster.radius||90;
    ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
    for(const arm of state.arms){
      const angle=arm.index*Math.PI/4+monster.phase*.3;
      const start={x:center.x+Math.cos(angle)*11,y:center.y+Math.sin(angle)*11};
      const reach=radius*arm.reach;
      const freeEnd={x:center.x+Math.cos(angle)*reach,y:center.y+Math.sin(angle)*reach};
      const end=arm.grabbing?shipP:freeEnd;
      const dx=end.x-start.x,dy=end.y-start.y;
      const bend=15*Math.sin(arm.sway);
      const mid={x:(start.x+end.x)/2-dy*.16+bend,y:(start.y+end.y)/2+dx*.16};
      ctx.strokeStyle=arm.grabbing?"#d7abef":"#81539d";
      ctx.lineWidth=arm.grabbing?9:4+3*arm.reach;
      ctx.beginPath();ctx.moveTo(start.x,start.y);
      ctx.quadraticCurveTo(mid.x,mid.y,end.x,end.y);ctx.stroke();
      ctx.strokeStyle="rgba(223,183,231,.7)";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(start.x,start.y);
      ctx.quadraticCurveTo(mid.x+3,mid.y+3,end.x,end.y);ctx.stroke();
      if(arm.grabbing){
        ctx.strokeStyle="#f6ddaa";ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(end.x,end.y,14,0,Math.PI*2);ctx.stroke();
      }
    }
    if(state.phase==="warn"||state.phase==="reach"){
      const r=radius*(.85+.12*Math.sin(state.clock*8));
      ctx.strokeStyle="rgba(240,184,244,.67)";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(center.x,center.y,r,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
}
root.AllAboardKrakenGrapple={KrakenGrapple};
if(typeof module!=="undefined"&&module.exports)module.exports={KrakenGrapple};
})(typeof window!=="undefined"?window:globalThis);
