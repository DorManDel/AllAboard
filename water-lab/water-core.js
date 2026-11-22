/* All Aboard — Water Lab v0.1
 * Pure CPU reference for an educational stylized top-down water field.
 * Not CFD, SI units, or a physically calibrated ocean model.
 * The same sampling equations power debug layers and the preview boat.
 */
(function(root){
"use strict";
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const defaults=Object.freeze({
  seed:2026,windDeg:65,windStrength:4,coarseScale:108,
  detailScale:32,coarseMix:.65,detailMix:.35,
  waveHeight:.8,waveSpeed:1,rippleStrength:1,rain:0
});
function hash(ix,iy,seed){
 let h=Math.imul(ix|0,374761393)^Math.imul(iy|0,668265263)^(seed|0);
 h=Math.imul(h^(h>>>13),1274126177);
 return ((h^(h>>>16))>>>0)/4294967295;
}
function valueNoise(x,y,seed=2026){
 const xi=Math.floor(x),yi=Math.floor(y);
 const u=smooth(x-xi),v=smooth(y-yi);
 return lerp(
  lerp(hash(xi,yi,seed),hash(xi+1,yi,seed),u),
  lerp(hash(xi,yi+1,seed),hash(xi+1,yi+1,seed),u),v)*2-1;
}
function windVector(degrees){
 const a=degrees*Math.PI/180;
 // All Aboard: 0 degrees = north/up, wind TO (not wind FROM).
 return {x:Math.sin(a),y:-Math.cos(a)};
}
function rippleAt(x,y,time,events,strength=1){
 if(!strength||!events||!events.length)return 0;
 let sum=0;
 // Events are bounded when emitted. A simple traveling ring, NOT fluid dynamics.
 for(const e of events){
  const age=time-e.time;
  if(age<0||age>e.life)continue;
  const dist=Math.hypot(x-e.x,y-e.y);
  if(dist>e.speed*age+55)continue;
  const front=dist-(e.speed*age+3);
  const width=e.width+age*2.4;
  const envelope=Math.exp(-Math.pow(front/width,2));
  sum+=e.power*envelope*Math.cos(front*.19)*Math.exp(-age*1.35);
 }
 return clamp(sum*strength,-1.5,1.5);
}
/* Editor v0.2: explicit, portable layer contract. Eyes/solo/opacity affect
 * the height field; blend modes are artistic, not fluid equations.
 * Wake + foam are renderer-only layers.
 */
const layerKeys=["coarse","fine","wave","rain","ripple","wake","foam"];
function defaultLayers(){
 return Object.fromEntries(layerKeys.map(key=>[key,{enabled:true,opacity:1,solo:false,blend:"add"}]));
}
function layerAmount(name,layers,solo=false){
 if(!layers)return 1;
 const item=layers[name];
 if(!item)return solo?0:1;
 if(item.enabled===false||(solo&&!item.solo))return 0;
 return clamp(Number.isFinite(item.opacity)?item.opacity:1,0,1);
}
function hasSolo(layers){
 return Boolean(layers&&layerKeys.some(key=>layers[key]&&layers[key].solo&&layers[key].enabled!==false));
}
function composeHeight(values,layers){
 const solo=hasSolo(layers);
 let total=0;
 for(const key of ["coarse","fine","wave","rain","ripple"]){
  const amount=layerAmount(key,layers,solo);
  if(!amount)continue;
  const delta=values[key]*amount;
  const blend=layers&&layers[key]&&layers[key].blend;
  if(blend==="replace")total=delta;
  else if(blend==="multiply")total=total*(1+delta);
  else total+=delta;
 }
 return total;
}
function sample(x,y,time,opts=defaults,events=[],out=null){
 // UI renderer caches the wind vector and reuses a result object per pixel.
 const wind=opts._wind||windVector(opts.windDeg??defaults.windDeg);
 const speed=(opts.waveSpeed??1)*(.45+(opts.windStrength??4)*.13);
 const s0=Math.max(14,opts.coarseScale??defaults.coarseScale);
 const s1=Math.max(9,opts.detailScale??defaults.detailScale);
 const t0=time*speed;
 const driftX=wind.x*t0,driftY=wind.y*t0;
 const coarse=valueNoise((x-driftX*10)/s0,(y-driftY*10)/s0,opts.seed|0);
 const fine=valueNoise((x+wind.y*t0*19)/s1,(y-wind.x*t0*19)/s1,(opts.seed|0)+73);
 const axis=x*wind.x+y*wind.y;
 const cross=-x*wind.y+y*wind.x;
 const wave=(Math.sin(axis*.037-t0*1.5+Math.sin(cross*.011)*.55)+
             .35*Math.sin(axis*.065+cross*.031-t0*2.1))/1.35;
 const rain=(opts.rain||0)*valueNoise(x*.2+time*3,y*.2-time*2,(opts.seed|0)+101)*.14;
 const base=(coarse*(opts.coarseMix??.65)+fine*(opts.detailMix??.35))*.72+wave*.28+rain;
 const ripple=rippleAt(x,y,time,events,opts.rippleStrength??1);
 const target=out||{};
 target.coarse=coarse;target.fine=fine;target.wave=wave;
 target.rain=rain;target.ripple=ripple;target.base=base;
 const height=opts.waveHeight??.8;
 // With no editor layers this is the original V0.1 additive result.
 target.height=composeHeight({
   coarse:coarse*(opts.coarseMix??.65)*.72*height,
   fine:fine*(opts.detailMix??.35)*.72*height,
   wave:wave*.28*height,rain:rain*height,ripple
 },opts.layers);
 return target;
}
function current(x,y,time,opts=defaults){
 const wind=windVector(opts.windDeg??defaults.windDeg);
 const amplitude=(opts.windStrength??4)*.17;
 return {x:wind.x*amplitude+Math.sin(y*.004+time*.3)*.05,
  y:wind.y*amplitude+Math.cos(x*.004-time*.3)*.05};
}
function createEvent(type,x,y,time,power=1){
 const types={
  cannon:{speed:52,width:11,life:2.3},
  anchor:{speed:33,width:10,life:2.5},
  wake:{speed:21,width:10,life:1.5},
  sink:{speed:37,width:19,life:4.0}
 };
 const c=types[type]||types.tap;
 return {type,x,y,time,power:clamp(power,0,3),...c};
}
function addEvent(events,e,max=28){
 if(!e||!Number.isFinite(e.x)||!Number.isFinite(e.y))return events;
 events.push(e);
 if(events.length>max)events.splice(0,events.length-max);
 return events;
}
function pruneEvents(events,time){
 for(let i=events.length-1;i>=0;i--)
  if(time-events[i].time>events[i].life)events.splice(i,1);
 return events;
}
const api={defaults,layerKeys,defaultLayers,layerAmount,hasSolo,composeHeight,
 clamp,hash,valueNoise,windVector,rippleAt,sample,current,
 createEvent,addEvent,pruneEvents};
root.AllAboardWaterLab=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
