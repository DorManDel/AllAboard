/* All Aboard HUD Layout Studio V0.8
 * Fine-grained responsive design inspector, not Unity RectTransform anchors.
 * Stored schema V2 supports axis scale, rotation, alpha and stacking order.
 * Legacy V1 and Dor's uploaded preset are migrated on import.
 */
(function(root){
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const targets=[
 ["wheelControl","Helm wheel"],["sailControl","Sails / trim"],["anchorControl","Anchor + chain"],
 ["modeButton","Friendly / Aggressive"],["headingHud","Compass + wind"],["miniMap","Minimap"],
 ["coinHud","Coin counter"],["healthHud","Hull health"],["scoreHud","Run score"]
];
const fields={
 x:{min:-48,max:48,step:.1,digits:1,unit:"%"},
 y:{min:-48,max:48,step:.1,digits:1,unit:"%"},
 scale:{min:.3,max:2.5,step:.01,digits:2,unit:"×"},
 scaleX:{min:.3,max:2.5,step:.01,digits:2,unit:"×"},
 scaleY:{min:.3,max:2.5,step:.01,digits:2,unit:"×"},
 rotation:{min:-180,max:180,step:.5,digits:1,unit:"°"},
 opacity:{min:.15,max:1,step:.01,digits:2,unit:""},
 layer:{min:1,max:30,step:1,digits:0,unit:""}
};
const defaultItem=()=>({x:0,y:0,scaleX:1,scaleY:1,rotation:0,opacity:1,layer:5});
const DOR_V07={
 format:"allaboard-ui-layout",version:1,coordinateSpace:"phone-percent",theme:"classic",
 items:{
  wheelControl:{x:0,y:0,scale:1},
  sailControl:{x:2.5,y:-4,scale:1},
  anchorButton:{x:1,y:0,scale:1},
  modeButton:{x:1.5,y:0,scale:1},
  headingHud:{x:-12,y:-12.5,scale:.65},
  miniMap:{x:-1.5,y:-13,scale:1.05},
  coinHud:{x:-2.5,y:-1,scale:1},
  healthHud:{x:0,y:-3,scale:1},
  scoreHud:{x:0,y:-1.5,scale:1},
  anchorRopeHud:{x:6.5,y:20.5,scale:.75}
 }
};
function normalizeItem(raw){
 const defaults=defaultItem(),src=raw||{};
 const p={};
 for(const name of ["x","y","scaleX","scaleY","rotation","opacity","layer"]){
  const original=(name==="scaleX"||name==="scaleY")&&src[name]===undefined?src.scale:src[name];
  const n=Number(original===undefined?defaults[name]:original);
  p[name]=Number.isFinite(n)?clamp(n,fields[name].min,fields[name].max):defaults[name];
 }
 p.layer=Math.round(p.layer);
 return p;
}
class LayoutStudio{
 constructor(){
  this.layout=Object.fromEntries(targets.map(([id])=>[id,defaultItem()]));
  this.selected="wheelControl";this.theme="classic";this.active=false;this.drag=null;
  this.ratioLocked=true;this.loadedPreset="Default";
 }
 $(id){return typeof document==="undefined"?null:document.getElementById(id);}
 mount(){
  this.phone=this.$("phoneScreen");
  const selector=this.$("layoutElement");
  if(!this.phone||!selector)return;
  for(const [id,label] of targets){
   const option=document.createElement("option");option.value=id;option.textContent=label;selector.append(option);
   const target=this.$(id);if(!target)continue;
   target.dataset.uiCustom="true";
   target.addEventListener("pointerdown",e=>this.startDrag(e,id),true);
   target.addEventListener("click",e=>{
    if(this.active){e.stopImmediatePropagation();e.preventDefault();}
   },true);
  }
  try{
   const v2=localStorage.getItem("allaboard-ui-layout-v2");
   const old=v2||localStorage.getItem("allaboard-ui-layout-v1");
   if(old){this.restore(JSON.parse(old));this.loadedPreset=v2?"Saved V0.8":"Migrated V0.7";}
  }catch(err){this.note("Could not load local layout; using defaults.");}
  this.$("layoutElement").addEventListener("change",e=>{this.selected=e.target.value;this.render();});
  this.$("layoutTheme").addEventListener("change",e=>{
   this.theme=["classic","glass","compact"].includes(e.target.value)?e.target.value:"classic";
   this.render();this.save();
  });
  this.$("layoutEditToggle").addEventListener("click",()=>this.toggle());
  this.$("layoutRatioLock").addEventListener("change",e=>{this.ratioLocked=e.target.checked;});
  for(const name of Object.keys(fields)){
   for(const suffix of ["Range","Value"]){
    const input=this.$("layout"+name[0].toUpperCase()+name.slice(1)+suffix);
    if(!input)continue;
    input.addEventListener("input",e=>{
     const n=Number(e.target.value);
     if(!Number.isFinite(n))return;
     this.change(name,n);
    });
   }
  }
  const stepMove=(key,by)=>{
   const p=this.layout[this.selected];this.change(key,p[key]+by);
  };
  for(const key of ["x","y"]){
   this.$("layout"+key.toUpperCase()+"Minus")?.addEventListener("click",()=>stepMove(key,-.1));
   this.$("layout"+key.toUpperCase()+"Plus")?.addEventListener("click",()=>stepMove(key,.1));
  }
  this.$("layoutLayerBack").addEventListener("click",()=>stepMove("layer",-1));
  this.$("layoutLayerFront").addEventListener("click",()=>stepMove("layer",1));
  this.$("layoutResetItem").addEventListener("click",()=>{
   this.layout[this.selected]=defaultItem();this.save();this.render();this.note("Selected component restored.");
  });
  this.$("layoutResetAll").addEventListener("click",()=>{
   for(const [id] of targets)this.layout[id]=defaultItem();
   this.theme="classic";this.loadedPreset="Default";this.save();this.render();
   this.note("All positions, transforms and theme restored.");
  });
  this.$("layoutApplyDor").addEventListener("click",()=>{
   this.restore(DOR_V07);this.loadedPreset="Dor · uploaded V0.7";
   this.save();this.render();
   this.note("Applied Dor's original uploaded layout. The separate chain HUD is now inside the unified anchor widget.");
  });
  this.$("layoutExport").addEventListener("click",()=>this.export());
  this.$("layoutImport").addEventListener("change",async e=>{
   const file=e.target.files?.[0];if(!file)return;
   try{
    if(file.size>25000)throw Error("Layout file too large.");
    this.restore(JSON.parse(await file.text()));
    this.loadedPreset=file.name;this.save();this.render();this.note("Layout imported and migrated to V0.8.");
   }catch(err){this.note("Cannot import layout: "+err.message);}
   e.target.value="";
  });
  root.addEventListener?.("resize",()=>this.applyAll());
  this.render();this.save();
 }
 toggle(){
  this.active=!this.active;this.drag=null;
  this.phone.classList.toggle("layout-editing",this.active);
  this.$("layoutEditToggle").textContent=this.active?"✓ Finish editing":"✥ Enable touch editing";
  this.$("layoutEditToggle").setAttribute("aria-pressed",String(this.active));
  this.note(this.active?
   "Edit mode: drag highlighted components. All anchor and sail interactions are locked while editing.":
   "Edit mode off. Test the new control positions on the ship.");
  this.applyAll();
 }
 change(field,value){
  const spec=fields[field];if(!spec)return;
  const p=this.layout[this.selected];
  let n=clamp(value,spec.min,spec.max);
  if(field==="layer")n=Math.round(n);
  if(field==="scale"){
   p.scaleX=n;p.scaleY=n;
  }else if((field==="scaleX"||field==="scaleY")&&this.ratioLocked){
   p.scaleX=n;p.scaleY=n;
  }else p[field]=n;
  this.save();this.apply(this.selected);this.renderValues();
 }
 startDrag(e,id){
  if(!this.active)return;
  e.preventDefault();e.stopImmediatePropagation();
  this.selected=id;this.$("layoutElement").value=id;this.render();
  const rect=this.phone.getBoundingClientRect();
  this.drag={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,
   originX:this.layout[id].x,originY:this.layout[id].y,
   width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
  const item=this.$(id);item.setPointerCapture?.(e.pointerId);
  const move=event=>{
   if(!this.drag||this.drag.pointer!==event.pointerId)return;
   event.preventDefault();event.stopPropagation();
   const p=this.layout[id],d=this.drag;
   p.x=Math.round(clamp(d.originX+(event.clientX-d.startX)*100/d.width,-48,48)*10)/10;
   p.y=Math.round(clamp(d.originY+(event.clientY-d.startY)*100/d.height,-48,48)*10)/10;
   this.apply(id);this.renderValues();
  };
  const finish=event=>{
   if(this.drag?.pointer!==event.pointerId)return;
   this.drag=null;this.save();
   item.removeEventListener("pointermove",move,true);
   item.removeEventListener("pointerup",finish,true);
   item.removeEventListener("pointercancel",finish,true);
  };
  item.addEventListener("pointermove",move,true);
  item.addEventListener("pointerup",finish,true);
  item.addEventListener("pointercancel",finish,true);
 }
 apply(id){
  const target=this.$(id),p=this.layout[id];if(!target||!this.phone||!p)return;
  const rect=this.phone.getBoundingClientRect();
  target.style.setProperty("--ui-x",(p.x*rect.width/100).toFixed(2)+"px");
  target.style.setProperty("--ui-y",(p.y*rect.height/100).toFixed(2)+"px");
  target.style.setProperty("--ui-scale-x",p.scaleX.toFixed(3));
  target.style.setProperty("--ui-scale-y",p.scaleY.toFixed(3));
  target.style.setProperty("--ui-rotation",p.rotation.toFixed(2)+"deg");
  target.style.setProperty("--ui-opacity",p.opacity.toFixed(3));
  target.style.setProperty("--ui-layer",String(p.layer));
  target.classList.toggle("layout-selected",this.active&&this.selected===id);
 }
 applyAll(){for(const [id] of targets)this.apply(id);}
 renderValues(){
  const p=this.layout[this.selected];if(!p)return;
  for(const [name,spec] of Object.entries(fields)){
   const suffix=name[0].toUpperCase()+name.slice(1);
   const n=name==="scale"?(p.scaleX+p.scaleY)/2:p[name];
   const range=this.$("layout"+suffix+"Range"),value=this.$("layout"+suffix+"Value");
   if(range)range.value=n;
   if(value)value.value=n.toFixed(spec.digits);
  }
  const readout=this.$("layoutOutput");
  if(!readout)return;
  readout.textContent=(targets.find(x=>x[0]===this.selected)?.[1]||"Component")+
   " · X "+p.x.toFixed(1)+"% · Y "+p.y.toFixed(1)+"% · "+
   p.scaleX.toFixed(2)+"×"+p.scaleY.toFixed(2)+" · "+
   p.rotation.toFixed(1)+"° · "+Math.round(p.opacity*100)+"% · layer "+p.layer;
  const presetLabel=this.$("layoutPresetName");if(presetLabel)presetLabel.textContent=this.loadedPreset;
 }
 render(){
  if(!this.phone)return;
  this.phone.dataset.uiTheme=this.theme;
  this.$("layoutTheme").value=this.theme;
  this.$("layoutRatioLock").checked=this.ratioLocked;
  this.applyAll();this.renderValues();
 }
 note(text){const el=this.$("layoutStatus");if(el)el.textContent=text;}
 snapshot(){
  return{format:"allaboard-ui-layout",version:2,coordinateSpace:"phone-percent",
   theme:this.theme,presetName:this.loadedPreset,
   items:Object.fromEntries(targets.map(([id])=>[id,{...this.layout[id]}]))};
 }
 restore(data){
  if(!data||data.format!=="allaboard-ui-layout"||![1,2].includes(data.version)||
   !data.items||typeof data.items!=="object")throw Error("Unsupported layout preset.");
  this.theme=["classic","glass","compact"].includes(data.theme)?data.theme:"classic";
  // Complete reset first: partial imports never combine silently with stale controls.
  for(const [id] of targets){
   const legacy=id==="anchorControl"?"anchorButton":id;
   this.layout[id]=normalizeItem(data.items[id]||data.items[legacy]);
  }
  this.applyAll();return true;
 }
 save(){try{localStorage.setItem("allaboard-ui-layout-v2",JSON.stringify(this.snapshot()));}catch(err){}}
 export(){
  const blob=new Blob([JSON.stringify(this.snapshot(),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="all-aboard-ui-layout-v08.json";
  document.body.append(a);a.click();a.remove();
  root.setTimeout?.(()=>URL.revokeObjectURL(url),500);
  this.note("V0.8 preset exported, including axis scales, rotation, alpha and layer order.");
 }
}
root.AllAboardUILayout={LayoutStudio,targets,normalizeItem,DOR_V07};
if(typeof module!=="undefined"&&module.exports)
 module.exports={LayoutStudio,targets,normalizeItem,DOR_V07};
if(typeof document!=="undefined"){
 const boot=()=>{const editor=new LayoutStudio();editor.mount();root.AllAboardUILayoutInstance=editor;};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
}
})(typeof window!=="undefined"?window:globalThis);
