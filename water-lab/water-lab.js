/* All Aboard · Water Lab UI v0.1
 * CPU Canvas reference implementation. No framework, external asset or network.
 * IMPORTANT: browser FPS and JS CPU time do not represent Unity GPU timings.
 */
(function(){
"use strict";
const Core=window.AllAboardWaterLab;
if(!Core)return;
const $=id=>document.getElementById(id);
const canvas=$("waterCanvas"),ctx=canvas.getContext("2d",{alpha:false});
if(!ctx)return;
const field=document.createElement("canvas"),fx=field.getContext("2d");
if(!fx)return;
const sliderSpecs=[
 ["windDeg","Wind TO direction",0,359,1,"°","0° = north/up. Waves travel and scroll in this direction."],
 ["windStrength","Wind strength",0,10,.5,"","Affects directional wave speed and the current."],
 ["waveSpeed","Wave animation speed",0,3,.05,"×","0 freezes the underlying wave motion, not local events."],
 ["waveHeight","Wave height",0,2,.05,"×","Controls color variation and sampled boat bobbing."],
 ["coarseScale","Noise A scale",25,220,5,"","Larger value = broader, softer water patterns."],
 ["coarseMix","Noise A contribution",0,1,.05,"","Broad low-frequency patches. We do not normalize A and B automatically."],
 ["detailScale","Noise B scale",9,95,2,"","Small patterns layered over the broad noise."],
 ["detailMix","Noise B contribution",0,1,.05,"","Higher frequency visual detail."],
 ["rippleStrength","Interaction strength",0,2,.05,"×","Cannon, anchor, sinking and wake disturbances, never touchscreen input."],
 ["rain","Rain surface noise",0,1,.05,"","Adds faint short-lived surface texture."]
];
const explanations={
 beauty:"FINAL COLOR: low-frequency Noise A + detailed Noise B + directional waves + event ripples. Bright crests and color gradients are visual effects, not reflections or depth.",
 coarse:"NOISE A: seeded, smooth value noise. Large cells produce broad organic patches; wind moves the sampling coordinates over time.",
 fine:"NOISE B: a second seeded value-noise layer at a smaller spatial scale. This adds fine texture without using a new water simulation.",
 wave:"DIRECTIONAL WAVES: sinusoids aligned to the same wind vector used for noise drift and the boat's simplified current.",
 ripple:"LOCAL IMPULSES: damped expanding rings from cannon, anchor, sinking and wake. Touch input samples values only. Event capacity: 28.",
 height:"HEIGHT FIELD: the signed sum of both noise layers, directional waves and event ripples. Sample the same field for the visual and ship response."
};
const qualities={eco:{cell:10,rate:12},balanced:{cell:7,rate:18},high:{cell:5,rate:24}};
const palettes={
 classic:{deep:[7,57,91],shallow:[17,111,152],glint:[127,208,202]},
 tropical:{deep:[6,92,114],shallow:[31,181,173],glint:[180,244,211]},
 calm:{deep:[16,71,110],shallow:[35,123,157],glint:[153,202,214]},
 storm:{deep:[9,28,48],shallow:[42,82,102],glint:[117,145,157]}
};
let settings={...Core.defaults,layers:Core.defaultLayers()},time=0,last=0,lastWater=-1e8,dirty=true;
let paused=false,layer="beauty",preset="classic",quality="balanced";
let events=[],temp={},imageData=null,pointerSample=null;
const boat={x:0,y:0,heading:20,speed:28,moving:true,sunk:false,sinkTime:0};
const trail=[],keys=new Set();
const notify=(kind,detail)=>{
 if(window.AllAboardWaterLabUI&&typeof window.AllAboardWaterLabUI.log==="function")
  window.AllAboardWaterLabUI.log(kind,detail);
};
let wakeClock=0,displayFPS=0,waterCpuMS=0,measureAt=0;
function makeSlider(spec){
 const [key,label,min,max,step,unit,hint]=spec;
 const item=document.createElement("div");item.className="param";
 const top=document.createElement("div");top.className="param-head";
 const caption=document.createElement("label");caption.htmlFor="param-"+key;caption.textContent=label;
 const value=document.createElement("output");value.id="value-"+key;value.textContent=String(settings[key])+unit;
 top.append(caption,value);
 const range=document.createElement("input");range.type="range";range.id="param-"+key;
 range.min=min;range.max=max;range.step=step;range.value=settings[key];
 range.addEventListener("input",()=>{
  settings[key]=Number(range.value);
  value.textContent=Number(settings[key]).toFixed(step<1?2:0).replace(/\.00$/,"")+unit;
  settings._wind=Core.windVector(settings.windDeg);
  dirty=true;
 });
 range.addEventListener("change",()=>notify("TUNE",key+" = "+settings[key]));
 const help=document.createElement("p");help.className="param-tip";help.textContent=hint;
 item.append(top,range,help);return item;
}
const sliders=$("sliders");
for(const spec of sliderSpecs)sliders.appendChild(makeSlider(spec));
function syncSliders(){
 for(const spec of sliderSpecs){
  const key=spec[0],input=$("param-"+key);
  input.value=settings[key];
  $("value-"+key).textContent=Number(settings[key]).toFixed(spec[4]<1?2:0).replace(/\.00$/,"")+spec[5];
 }
 settings._wind=Core.windVector(settings.windDeg);
 dirty=true;
}
function selectPreset(value){
 preset=value;
 const table={
  classic:{windDeg:65,windStrength:4,waveHeight:.8,coarseScale:108,detailScale:32,coarseMix:.65,detailMix:.35,waveSpeed:1,rain:0},
  tropical:{windDeg:110,windStrength:3,waveHeight:.58,coarseScale:145,detailScale:25,coarseMix:.58,detailMix:.35,waveSpeed:.85,rain:0},
  calm:{windDeg:50,windStrength:1,waveHeight:.29,coarseScale:175,detailScale:65,coarseMix:.62,detailMix:.18,waveSpeed:.48,rain:0},
  storm:{windDeg:145,windStrength:9,waveHeight:1.65,coarseScale:80,detailScale:18,coarseMix:.72,detailMix:.68,waveSpeed:1.9,rain:.72}
 };
 Object.assign(settings,table[value]||table.classic);
 $("weather").value=value==="storm"?"squall":"clear";
 syncSliders();
}
$("preset").addEventListener("change",e=>{selectPreset(e.target.value);notify("PRESET",e.target.value);});
$("quality").addEventListener("change",e=>{quality=e.target.value;imageData=null;lastWater=-1e8;dirty=true;notify("QUALITY",quality);});
$("weather").addEventListener("change",e=>{
 const w=e.target.value;
 settings.rain=w==="squall"?1:w==="rain"?.55:0;
 notify("WEATHER",w);
 $("param-rain").value=settings.rain;
 $("value-rain").textContent=settings.rain.toFixed(2);
 dirty=true;
});
for(const btn of document.querySelectorAll("[data-layer]")){
 btn.addEventListener("click",()=>{
  layer=btn.dataset.layer;dirty=true;
  for(const b of document.querySelectorAll("[data-layer]"))
   b.classList.toggle("selected",b===btn);
  $("layerInfo").textContent=explanations[layer];
  notify("INSPECT",layer);
 });
}
function eventAt(type,x=boat.x,y=boat.y,power=1){
 Core.addEvent(events,Core.createEvent(type,x,y,time,power));
 dirty=true;
 if(type!=="wake")notify("EVENT",type+" @ ("+Math.round(x)+", "+Math.round(y)+")");
}
for(const btn of document.querySelectorAll("[data-event]")){
 btn.addEventListener("click",()=>{
  const type=btn.dataset.event;
  if(type==="sink"){
   boat.sunk=true;boat.sinkTime=time;boat.moving=false;
   eventAt("sink",boat.x,boat.y,2.5);
   $("toggleBoat").textContent="⛵ Boat: sunk";
  }else if(type==="anchor"){
   eventAt("anchor",boat.x-22,boat.y+8,1.7);
   boat.speed=Math.max(0,boat.speed*.55);
  }else{
   const a=boat.heading*Math.PI/180;
   eventAt("cannon",boat.x+Math.cos(a)*42,boat.y+Math.sin(a)*42,2.2);
  }
 });
}
$("toggleBoat").addEventListener("click",()=>{
 if(boat.sunk){boat.sunk=false;boat.speed=28;boat.sinkTime=0;}
 else boat.moving=!boat.moving;
 $("toggleBoat").textContent=boat.sunk?"⛵ Boat: sunk":boat.moving?"⛵ Boat: moving":"⛵ Boat: stopped";
 dirty=true;
 notify("BOAT",boat.sunk?"sunk":boat.moving?"moving":"stopped");
});
$("pause").addEventListener("click",()=>{paused=!paused;$("pause").textContent=paused?"▶ Resume":"Ⅱ Pause";dirty=true;notify("TIME",paused?"paused":"resumed");});
function reset(){
 time=0;lastWater=-1e8;events.length=0;trail.length=0;wakeClock=0;
 Object.assign(boat,{x:0,y:0,heading:20,speed:28,moving:true,sunk:false,sinkTime:0});
 $("toggleBoat").textContent="⛵ Boat: moving";dirty=true;
}
$("reset").addEventListener("click",()=>{reset();notify("RESET","boat, timeline and 28-slot event pool");});
function resize(){
 const rect=canvas.getBoundingClientRect();
 const dpr=Math.min(window.devicePixelRatio||1,1.5);
 const w=Math.max(280,Math.round(rect.width*dpr)),h=Math.max(280,Math.round(rect.height*dpr));
 if(canvas.width!==w||canvas.height!==h){
  canvas.width=w;canvas.height=h;imageData=null;lastWater=-1e8;dirty=true;
 }
}
function viewPoint(clientX,clientY){
 const r=canvas.getBoundingClientRect();
 const x=(clientX-r.left)*canvas.width/r.width;
 const y=(clientY-r.top)*canvas.height/r.height;
 return{x:boat.x+x-canvas.width/2,y:boat.y+y-canvas.height/2,
  sx:x,sy:y};
}
function inspect(point){
 pointerSample=point;
 const p=Core.sample(point.x,point.y,time,settings,events);
 $("sample").textContent="World ("+point.x.toFixed(0)+", "+point.y.toFixed(0)+")"
  +" · Noise A "+p.coarse.toFixed(3)+" · Noise B "+p.fine.toFixed(3)
  +" · Wave "+p.wave.toFixed(3)+" · Ripple "+p.ripple.toFixed(3)
  +" · Height "+p.height.toFixed(3);
}
let dragging=false,dragLast=null;
canvas.addEventListener("pointerdown",e=>{
 const p=viewPoint(e.clientX,e.clientY);
 if(Math.hypot(p.x-boat.x,p.y-boat.y)<36&&!boat.sunk){
  dragging=true;dragLast={x:p.sx,y:p.sy};canvas.setPointerCapture(e.pointerId);
 } // Touch is inspection only. Never create water impulses from UI taps.
 inspect(p);
});
canvas.addEventListener("pointermove",e=>{
 const p=viewPoint(e.clientX,e.clientY);
 if(dragging){
  const dx=p.sx-dragLast.x,dy=p.sy-dragLast.y;
  dragLast={x:p.sx,y:p.sy};
  boat.x+=dx;boat.y+=dy;
  if(Math.hypot(dx,dy)>2){boat.heading=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;}
  boat.speed=Math.min(55,Math.hypot(dx,dy)*6);
  boat.moving=false;dirty=true;
 }
 inspect(p);
});
canvas.addEventListener("pointerup",()=>{dragging=false;dragLast=null;});
canvas.addEventListener("pointercancel",()=>{dragging=false;dragLast=null;});
window.addEventListener("keydown",e=>{
 if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)&&
 (document.activeElement===canvas||document.activeElement===document.body)){
  e.preventDefault();keys.add(e.key);
 }
});
window.addEventListener("keyup",e=>keys.delete(e.key));
window.addEventListener("blur",()=>keys.clear());
function step(dt){
 if(paused)return;
 time+=dt;
 Core.pruneEvents(events,time);
 if(!boat.sunk){
  if(keys.has("ArrowLeft"))boat.heading=(boat.heading-95*dt+360)%360;
  if(keys.has("ArrowRight"))boat.heading=(boat.heading+95*dt)%360;
  if(keys.has("ArrowUp")){boat.speed=Math.min(65,boat.speed+22*dt);boat.moving=true;}
  if(keys.has("ArrowDown"))boat.speed=Math.max(0,boat.speed-30*dt);
  if(boat.moving){
   const a=boat.heading*Math.PI/180;
   const flow=Core.current(boat.x,boat.y,time,settings);
   const speed=boat.speed;
   boat.x+=(Math.sin(a)*speed+flow.x)*dt;
   boat.y+=(-Math.cos(a)*speed+flow.y)*dt;
   wakeClock+=dt;
   if(wakeClock>.22&&speed>4){
    wakeClock=0;
    eventAt("wake",boat.x-Math.sin(a)*21,boat.y+Math.cos(a)*21,Math.min(.6,speed/65));
    trail.push({x:boat.x,y:boat.y,time});
    if(trail.length>35)trail.shift();
   }
  }
 }
 // Rain remains only a surface detail in V0.1: no unbounded raindrop entities.
}
function ensureField(){
 const q=qualities[quality];
 const rw=Math.max(2,Math.ceil(canvas.width/q.cell));
 const rh=Math.max(2,Math.ceil(canvas.height/q.cell));
 if(field.width!==rw||field.height!==rh||!imageData){
  field.width=rw;field.height=rh;
  imageData=fx.createImageData(rw,rh);dirty=true;
 }
 return {rw,rh};
}
function color(v,pal,out,offset){
 const intensity=Core.clamp((v.height+1.25)/2.5,0,1);
 const shade=Core.clamp(.2+.78*intensity,0,1);
 const foam=Core.clamp((v.height-.7)*.65,0,.26);
 for(let i=0;i<3;i++)
  out[offset+i]=Core.clamp(
   pal.deep[i]+(pal.shallow[i]-pal.deep[i])*shade+
   (pal.glint[i]-pal.shallow[i])*foam,0,255);
 out[offset+3]=255;
}
function diagnostic(v,mode,out,i){
 const raw=mode==="coarse"?v.coarse:mode==="fine"?v.fine:mode==="wave"?v.wave:
  mode==="ripple"?v.ripple:v.height;
 const scaled=mode==="ripple"?raw*.75:mode==="height"?raw*.5:raw;
 const level=Core.clamp(.5+scaled*.5,0,1),gray=Math.round(level*255);
 if(mode==="ripple"){
  out[i]=Math.round(gray*.55);out[i+1]=Math.round(gray*.8);out[i+2]=gray;
 }else{
  out[i]=gray;out[i+1]=gray;out[i+2]=gray;
 }
 out[i+3]=255;
}
function renderWater(){
 const start=performance.now(),{rw,rh}=ensureField();
 settings._wind=Core.windVector(settings.windDeg);
 const d=imageData.data,pal=palettes[preset];
 for(let iy=0;iy<rh;iy++){
  const y=boat.y+((iy+.5)/rh-.5)*canvas.height;
  for(let ix=0;ix<rw;ix++){
   const x=boat.x+((ix+.5)/rw-.5)*canvas.width;
   const v=Core.sample(x,y,time,settings,events,temp);
   const i=(iy*rw+ix)*4;
   if(layer==="beauty")color(v,pal,d,i);
   else diagnostic(v,layer,d,i);
  }
 }
 fx.putImageData(imageData,0,0);
 const ms=performance.now()-start;
 waterCpuMS=waterCpuMS?waterCpuMS*.83+ms*.17:ms;
 $("resolution").textContent=rw+" × "+rh;
 dirty=false;
}
function drawBoat(){
 if(layer!=="beauty"&&layer!=="height")return;
 const x=canvas.width/2,y=canvas.height/2,s=canvas.width/720;
 const pixels=Math.max(.7,Math.min(1.8,s));
 const water=Core.sample(boat.x,boat.y,time,settings,events);
 const bob=Math.sin(time*1.6)*.9+water.height*2.1;
 ctx.save();ctx.translate(x,y+bob);ctx.rotate(boat.heading*Math.PI/180);
 const fade=boat.sunk?Math.max(0,1-(time-boat.sinkTime)/2.8):1;
 ctx.globalAlpha=fade;
 const size=24*pixels;
 ctx.shadowColor="#05152a";ctx.shadowBlur=12*pixels;ctx.shadowOffsetY=5*pixels;
 ctx.fillStyle="#754b31";ctx.strokeStyle="#e2b27d";ctx.lineWidth=2*pixels;
 ctx.beginPath();
 ctx.moveTo(0,-size*1.45);
 ctx.bezierCurveTo(size*.85,-size*.7,size*.75,size*.7,0,size*1.2);
 ctx.bezierCurveTo(-size*.75,size*.7,-size*.85,-size*.7,0,-size*1.45);
 ctx.closePath();ctx.fill();ctx.stroke();
 ctx.shadowBlur=0;ctx.fillStyle="#cba279";ctx.fillRect(-size*.46,-size*.38,size*.92,size*.99);
 ctx.fillStyle="#f2e5c9";ctx.beginPath();ctx.moveTo(-size*.26,size*.3);
 ctx.lineTo(-size*.17,-size*.98);ctx.lineTo(size*.38,size*.3);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#423327";ctx.beginPath();ctx.moveTo(-size*.36,size*.30);ctx.lineTo(size*.45,size*.3);ctx.stroke();
 ctx.restore();
}
function drawTrails(){
 if(layer!=="beauty"||!Core.layerAmount("wake",settings.layers,Core.hasSolo(settings.layers)))return;
 ctx.save();ctx.lineWidth=2;ctx.lineCap="round";
 for(let i=1;i<trail.length;i++){
  const a=trail[i-1],b=trail[i],age=time-b.time;
  const opacity=Math.max(0,(1-age/6)*.5)*Core.layerAmount("wake",settings.layers,Core.hasSolo(settings.layers));
  if(opacity===0)continue;
  ctx.strokeStyle="rgba(221,251,245,"+opacity+")";
  ctx.beginPath();ctx.moveTo(canvas.width/2+a.x-boat.x,canvas.height/2+a.y-boat.y);
  ctx.lineTo(canvas.width/2+b.x-boat.x,canvas.height/2+b.y-boat.y);ctx.stroke();
 }
 ctx.restore();
}
function drawRipples(){
 if(layer!=="beauty"||!Core.layerAmount("foam",settings.layers,Core.hasSolo(settings.layers)))return;
 ctx.save();
 for(const e of events){
  if(e.type==="wake")continue;
  const age=time-e.time;if(age<0||age>e.life)continue;
  const opacity=Math.max(0,1-age/e.life)*.35*Core.layerAmount("foam",settings.layers,Core.hasSolo(settings.layers));
  ctx.strokeStyle="rgba(235,251,242,"+opacity+")";
  ctx.lineWidth=1.6;
  ctx.beginPath();
  ctx.arc(canvas.width/2+e.x-boat.x,canvas.height/2+e.y-boat.y,e.speed*age+3,0,Math.PI*2);
  ctx.stroke();
 }
 ctx.restore();
}
function render(){
 if(dirty||time-lastWater>1/qualities[quality].rate){
  renderWater();lastWater=time;
 }
 ctx.imageSmoothingEnabled=true;
 ctx.drawImage(field,0,0,canvas.width,canvas.height);
 drawTrails();drawRipples();drawBoat();
 $("events").textContent=events.length+" / 28";
}
function frame(ts){
 resize();
 if(last){
  const frameSeconds=Math.max(.0001,(ts-last)/1000);
  const dt=Math.min(.05,frameSeconds);
  if(frameSeconds>0)displayFPS=displayFPS?displayFPS*.91+(1/frameSeconds)*.09:1/frameSeconds;
  step(dt);
 }
 last=ts;
 render();
 if(ts-measureAt>550){
  $("fps").textContent=Math.round(displayFPS||0);
  $("cpu").textContent=waterCpuMS.toFixed(2);
  measureAt=ts;
 }
 requestAnimationFrame(frame);
}
// Narrow explicit bridge for the layer editor. No hidden duplicate simulation.
function setSnapshot(snapshot){
 const safe=snapshot||{};
 if(safe.settings)Object.assign(settings,safe.settings);
 if(safe.layers)settings.layers=safe.layers;
 settings._wind=Core.windVector(settings.windDeg);
 if(Number.isFinite(safe.time))time=Math.max(0,safe.time);
 if(safe.boat)Object.assign(boat,safe.boat);
 if(Array.isArray(safe.events)){
  events.length=0;
  for(const e of safe.events.slice(-28))Core.addEvent(events,e,28);
 }
 if(safe.preset&&palettes[safe.preset])preset=safe.preset;
 if(safe.quality&&qualities[safe.quality])quality=safe.quality;
 if(safe.view&&explanations[safe.view])layer=safe.view;
 $("preset").value=preset;$("quality").value=quality;
 $("weather").value=settings.rain>=.8?"squall":settings.rain>0?"rain":"clear";
 $("pause").textContent="▶ Resume";paused=true;
 $("toggleBoat").textContent=boat.sunk?"⛵ Boat: sunk":boat.moving?"⛵ Boat: moving":"⛵ Boat: stopped";
 for(const b of document.querySelectorAll("[data-layer]"))
  b.classList.toggle("selected",b.dataset.layer===layer);
 $("layerInfo").textContent=explanations[layer];
 syncSliders();dirty=true;lastWater=-1e8;imageData=null;
}
window.AllAboardWaterLabUI={
 getSnapshot:()=>({
  format:"allaboard-water-lab",version:2,
  settings:Object.fromEntries(Object.entries(settings).filter(([key])=>key!=="_wind"&&key!=="layers")),
  layers:settings.layers,preset,quality,view:layer,time,
  boat:{...boat},events:events.map(e=>({...e})),
  reference:"Arbitrary lab units; same seed + time + event list + world coordinates"
 }),
 setSnapshot,setLayers(layers){settings.layers=layers;dirty=true;},
 setSeed(seed){settings.seed=seed|0;dirty=true;},
 getSample:(x,y)=>Core.sample(x,y,time,settings,events),
 getTime:()=>time,
 refresh(){dirty=true;lastWater=-1e8;},
 log:null
};
settings._wind=Core.windVector(settings.windDeg);
selectPreset("classic");
if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches){
 paused=true;$("pause").textContent="▶ Resume";
}
requestAnimationFrame(frame);
})();