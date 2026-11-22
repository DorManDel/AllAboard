/* All Aboard · Water Layer Editor v0.2
 * State-driven layer controls, bounded live debug log and portable exports.
 * All code and user-facing documentation remain English; no outside services.
 */
(function(){
"use strict";
const Core=window.AllAboardWaterLab,ui=window.AllAboardWaterLabUI;
if(!Core||!ui)return;
const $=id=>document.getElementById(id);
const labels={
 coarse:["Noise A","Large smooth patches"],fine:["Noise B","Small independent detail"],
 wave:["Wind waves","Directional harmonics"],rain:["Rain texture","Weather micro-noise"],
 ripple:["Ripple impulses","Cannon / anchor / sinking"],wake:["Wake trail","Ship movement overlay"],
 foam:["Surface rings","Event highlight overlay"]
};
const overlays=new Set(["wake","foam"]);
let layers=Core.defaultLayers();
const logEntries=[];
let lastPerformance=0;
function log(kind,detail){
 const entry={time:ui.getTime().toFixed(2),kind:String(kind).slice(0,18),
  detail:String(detail).slice(0,230)};
 logEntries.push(entry);
 if(logEntries.length>200)logEntries.shift();
 const list=$("liveLog");
 if(!list)return;
 const line=document.createElement("div");line.className="log-line";
 const t=document.createElement("span");t.className="log-time";t.textContent=entry.time+"s";
 const type=document.createElement("b");type.textContent=entry.kind;
 const body=document.createElement("span");body.textContent=entry.detail;
 line.append(t,type,body);list.prepend(line);
 while(list.children.length>65)list.removeChild(list.lastElementChild);
 $("logCount").textContent=logEntries.length+" entries";
}
ui.log=log;
function setLayers(note){
 ui.setLayers(layers);
 if(note)log("LAYER",note);
}
function makeButton(label,clazz,aria,onClick){
 const b=document.createElement("button");b.type="button";b.className=clazz;
 b.textContent=label;b.setAttribute("aria-label",aria);b.addEventListener("click",onClick);
 return b;
}
function drawStack(){
 const host=$("layerStack");host.replaceChildren();
 for(const key of [...Core.layerKeys].reverse()){
  const l=layers[key],info=labels[key];
  const item=document.createElement("div");item.className="layer-row";
  item.dataset.layerKey=key;
  if(!l.enabled)item.classList.add("layer-muted");
  if(l.solo)item.classList.add("layer-solo");
  const toolbar=document.createElement("div");toolbar.className="layer-head";
  const eye=makeButton(l.enabled?"◉":"○","layer-eye","Toggle "+info[0],()=>{
   l.enabled=!l.enabled;if(!l.enabled)l.solo=false;
   setLayers(info[0]+(l.enabled?" visible":" hidden"));drawStack();
  });
  eye.setAttribute("aria-pressed",String(l.enabled));
  const name=document.createElement("div");name.className="layer-name";
  const strong=document.createElement("strong");strong.textContent=info[0];
  const sub=document.createElement("small");sub.textContent=info[1]+(overlays.has(key)?" · visual":" · affects sampled height");
  name.append(strong,sub);
  const solo=makeButton(l.solo?"SOLO ✓":"SOLO","layer-solo-btn","Solo "+info[0],()=>{
   l.solo=!l.solo;
   if(l.solo)l.enabled=true;
   setLayers(info[0]+(l.solo?" solo ON":" solo OFF"));drawStack();
  });
  solo.setAttribute("aria-pressed",String(l.solo));
  toolbar.append(eye,name,solo);
  const ctrl=document.createElement("div");ctrl.className="layer-controls";
  const opacity=document.createElement("input");opacity.type="range";
  opacity.min="0";opacity.max="1";opacity.step=".05";opacity.value=l.opacity;
  opacity.setAttribute("aria-label",info[0]+" opacity");
  const value=document.createElement("output");value.textContent=Math.round(l.opacity*100)+"%";
  opacity.addEventListener("input",()=>{
   l.opacity=Number(opacity.value);value.textContent=Math.round(l.opacity*100)+"%";
   setLayers();
  });
  opacity.addEventListener("change",()=>log("OPACITY",info[0]+" "+Math.round(l.opacity*100)+"%"));
  const blend=document.createElement("select");blend.setAttribute("aria-label",info[0]+" blend mode");
  for(const mode of ["add","multiply","replace"]){
   const option=document.createElement("option");option.value=mode;
   option.textContent=mode==="add"?"Add":mode==="multiply"?"Multiply":"Replace";
   blend.appendChild(option);
  }
  blend.value=l.blend;
  blend.disabled=overlays.has(key);
  blend.title=overlays.has(key)?"Visual overlays use alpha blending": "Artistic height-field blend operation";
  blend.addEventListener("change",()=>{
   l.blend=blend.value;setLayers(info[0]+" blend: "+blend.value);
  });
  ctrl.append(opacity,value,blend);
  item.append(toolbar,ctrl);host.appendChild(item);
 }
}
function applyLayerConfig(raw){
 const next=Core.defaultLayers();
 for(const key of Core.layerKeys){
  const obj=raw&&Object.prototype.hasOwnProperty.call(raw,key)?raw[key]:{};
  if(!obj||typeof obj!=="object")continue;
  next[key].enabled=obj.enabled!==false;
  next[key].solo=obj.solo===true&&next[key].enabled;
  next[key].opacity=Core.clamp(Number.isFinite(obj.opacity)?obj.opacity:1,0,1);
  next[key].blend=["add","multiply","replace"].includes(obj.blend)?obj.blend:"add";
 }
 layers=next;setLayers();drawStack();
}
const seed=$("waterSeed");
function setSeed(value){
 const number=Number(value);
 if(!Number.isFinite(number))throw Error("Seed must be a finite signed 32-bit integer.");
 const result=Math.trunc(Math.max(-2147483648,Math.min(2147483647,number)));
 seed.value=String(result);ui.setSeed(result);log("SEED",result);
}
seed.addEventListener("change",()=>{try{setSeed(seed.value);}catch(e){log("ERROR",e.message);}});
$("randomSeed").addEventListener("click",()=>{
 const x=new Uint32Array(1);
 if(window.crypto&&window.crypto.getRandomValues)window.crypto.getRandomValues(x);
 else x[0]=Math.floor(Math.random()*4294967296);
 setSeed(x[0]|0);
});
$("showAllLayers").addEventListener("click",()=>{
 for(const key of Core.layerKeys){layers[key].enabled=true;layers[key].solo=false;}
 setLayers("Show all, clear all solos");drawStack();
});
$("resetLayers").addEventListener("click",()=>{
 applyLayerConfig(Core.defaultLayers());log("RESET","Layer stack restored");
});
function download(name,text,mime){
 const blob=new Blob([text],{type:mime||"text/plain;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2500);
}
function exportSnapshot(){
 const snapshot=ui.getSnapshot();
 snapshot.settings.seed=Number(seed.value)|0;
 snapshot.layers=JSON.parse(JSON.stringify(layers));
 return snapshot;
}
$("export").addEventListener("click",()=>{
 const snapshot=exportSnapshot();
 download("allaboard-water-seed-"+snapshot.settings.seed+".json",JSON.stringify(snapshot,null,2),"application/json;charset=utf-8");
 log("EXPORT","JSON profile, seed "+snapshot.settings.seed+" (exact sample time "+snapshot.time.toFixed(2)+"s)");
});
$("exportCode").addEventListener("click",async()=>{
 const snapshot=exportSnapshot();
 try{
  const response=await fetch("./water-core.js",{cache:"no-store"});
  if(!response.ok)throw Error("Cannot read core engine: HTTP "+response.status);
  const source=await response.text();
  if(!source.includes("AllAboardWaterLab"))throw Error("Unexpected engine source");
  const profile=JSON.stringify(snapshot,null,2);
  const usage=String.raw"
/* Example:
   const field=AllAboardWaterProfile;
   const height=AllAboardSampleWater(100,200,field.time).height;
   // All values are in arbitrary LAB UNITS, not meters.
*/
";
  const extra="\n;(()=>{\n"+
   "const preset="+profile+";\n"+
   "const root=typeof window!==\"undefined\"?window:globalThis;\n"+
   "root.AllAboardWaterProfile=preset;\n"+
   "root.AllAboardSampleWater=(x,y,t=preset.time,events=preset.events)=>{\n"+
   "  const engine=root.AllAboardWaterLab;\n"+
   "  return engine.sample(x,y,t,{...preset.settings,layers:preset.layers},events);\n"+
   "};\n})();\n"+usage;
  download("allaboard-water-engine-seed-"+snapshot.settings.seed+".js",source+extra,"application/javascript;charset=utf-8");
  log("EXPORT","Self-contained JS engine + profile, seed "+snapshot.settings.seed);
 }catch(e){log("ERROR","JS export failed: "+e.message);}
});
function numeric(input,min,max,fallback){
 const v=Number(input);return Number.isFinite(v)?Core.clamp(v,min,max):fallback;
}
function safeSnapshot(input){
 if(!input||input.format!=="allaboard-water-lab"||![1,2].includes(input.version))
  throw Error("Unsupported water profile. Expected allaboard-water-lab v1/v2.");
 const def=Core.defaults,raw=input.settings||{},settings={...def};
 for(const key of Object.keys(def)){
  if(key==="seed")settings.seed=Math.trunc(numeric(raw.seed,-2147483648,2147483647,2026));
  else {
   const slider=$("param-"+key);
   if(slider)settings[key]=numeric(raw[key],Number(slider.min),Number(slider.max),def[key]);
  }
 }
 const boat=input.boat&&typeof input.boat==="object"?input.boat:null;
 const safeBoat=boat?{
  x:numeric(boat.x,-1000000,1000000,0),y:numeric(boat.y,-1000000,1000000,0),
  heading:numeric(boat.heading,0,360,20),speed:numeric(boat.speed,0,65,28),
  moving:boat.moving===true,sunk:boat.sunk===true,
  sinkTime:numeric(boat.sinkTime,0,1000000,0)
 }:null;
 const maxTime=numeric(input.time,0,1000000,0);
 const allowed=new Set(["cannon","anchor","wake","sink"]);
 const validEvents=Array.isArray(input.events)?
  input.events.slice(-28).filter(e=>e&&allowed.has(e.type)).map(e=>{
   const c=Core.createEvent(e.type,numeric(e.x,-1000000,1000000,0),
    numeric(e.y,-1000000,1000000,0),numeric(e.time,0,maxTime,0),
    numeric(e.power,0,3,1));
   return c;
  }):[];
 return {
  format:"allaboard-water-lab",version:2,settings,
  layers:input.layers||Core.defaultLayers(),
  preset:["classic","tropical","calm","storm"].includes(input.preset)?input.preset:"classic",
  quality:["eco","balanced","high"].includes(input.quality)?input.quality:"balanced",
  view:["beauty","coarse","fine","wave","ripple","height"].includes(input.view)?input.view:"beauty",
  time:maxTime,boat:safeBoat,events:validEvents
 };
}
$("importConfigButton").addEventListener("click",()=>$("importConfig").click());
$("importConfig").addEventListener("change",async e=>{
 const file=e.target.files&&e.target.files[0];if(!file)return;
 try{
  if(file.size>200000)throw Error("Profile exceeds 200 KB limit");
  const decoded=JSON.parse(await file.text());
  const snapshot=safeSnapshot(decoded);
  applyLayerConfig(snapshot.layers);
  ui.setSnapshot({...snapshot,layers});
  seed.value=String(snapshot.settings.seed);
  log("IMPORT","Restored seed "+snapshot.settings.seed+
   " at "+snapshot.time.toFixed(2)+"s · paused for precise inspection");
 }catch(err){log("ERROR","Import failed: "+err.message);}
 e.target.value="";
});
$("logExport").addEventListener("click",()=>{
 const head="simulation_time_s\tcategory\tdetail\n";
 download("allaboard-water-debug-log.tsv",head+logEntries.map(e=>
  e.time+"\t"+e.kind+"\t"+e.detail.replace(/[\t\r\n]/g," ")).join("\n"),"text/tab-separated-values;charset=utf-8");
 log("EXPORT","Debug TSV saved");
});
$("logClear").addEventListener("click",()=>{
 logEntries.length=0;$("liveLog").replaceChildren();$("logCount").textContent="0 entries";
});
const params=new URLSearchParams(window.location.search);
if(params.has("seed")){try{setSeed(params.get("seed"));}catch(e){log("ERROR",e.message);}}
drawStack();
log("INIT","Water Layer Editor V0.2 · touch is inspection only");
log("MODEL","CPU procedural value noise + directional waves; browser lab units");
setInterval(()=>{
 if(document.hidden)return;
 const fps=$("fps").textContent,ms=$("cpu").textContent;
 if(fps==="—"||ms==="—")return;
 log("PERF","display "+fps+" FPS · water CPU "+ms+
  " ms · "+$("resolution").textContent+" · "+$("events").textContent+" impulses");
},6000);
})();