/* All Aboard HUD Layout Studio V0.6
 * Edit mode only: touch-drag UI, tune X/Y (%) and scale, export preset.
 * No dependency on the canvas physics. This layout remains a browser preview
 * until Dor/Eilon approve coordinates for Unity RectTransforms.
 */
(function(root){
"use strict";
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const targets=[
  ["wheelControl","Helm wheel"],
  ["sailControl","Sail slider"],
  ["anchorButton","Anchor button"],
  ["modeButton","Friendly / Aggressive"],
  ["headingHud","Compass + wind"],
  ["miniMap","Minimap"],
  ["coinHud","Coin counter"],
  ["healthHud","Hull health"],
  ["scoreHud","Run score"],
  ["anchorRopeHud","Chain status"]
];
class LayoutStudio{
  constructor(){
    this.layout={};
    for(const [id] of targets)this.layout[id]={x:0,y:0,scale:1};
    this.selected="wheelControl";
    this.theme="classic";
    this.active=false;this.drag=null;
  }
  $(id){return document.getElementById(id);}
  mount(){
    this.phone=this.$("phoneScreen");
    if(!this.phone||!this.$("layoutElement"))return;
    for(const [id,label] of targets){
      const select=this.$("layoutElement");
      const option=document.createElement("option");
      option.value=id;option.textContent=label;select.append(option);
      const target=this.$(id);
      if(!target)continue;
      target.dataset.uiCustom="true";
      target.addEventListener("pointerdown",e=>this.startDrag(e,id),true);
      target.addEventListener("click",e=>{
        if(this.active){e.stopImmediatePropagation();e.preventDefault();}
      },true);
    }
    try{
      const raw=localStorage.getItem("allaboard-ui-layout-v1");
      if(raw)this.restore(JSON.parse(raw));
    }catch(err){}
    this.$("layoutTheme").addEventListener("change",e=>{
      this.theme=["classic","glass","compact"].includes(e.target.value)?e.target.value:"classic";
      this.render();this.save();
    });
    this.$("layoutElement").addEventListener("change",e=>{
      this.selected=e.target.value;this.render();
    });
    this.$("layoutEditToggle").addEventListener("click",()=>this.toggle());
    for(const key of ["x","y","scale"]){
      for(const suffix of ["Range","Value"]){
        const input=this.$("layout"+key[0].toUpperCase()+key.slice(1)+suffix);
        input.addEventListener("input",e=>{
          let v=Number(e.target.value);
          if(!Number.isFinite(v))return;
          v=key==="scale"?clamp(v,.55,1.8):clamp(v,-48,48);
          this.layout[this.selected][key]=v;
          this.save();this.apply(this.selected);this.renderValues();
        });
      }
    }
    this.$("layoutResetItem").addEventListener("click",()=>{
      this.layout[this.selected]={x:0,y:0,scale:1};
      this.save();this.render();this.note("Selected control restored to default.");
    });
    this.$("layoutResetAll").addEventListener("click",()=>{
      for(const [id] of targets)this.layout[id]={x:0,y:0,scale:1};
      this.theme="classic";
      this.save();this.render();this.note("All UI positions, scales and theme reset.");
    });
    this.$("layoutExport").addEventListener("click",()=>this.export());
    this.$("layoutImport").addEventListener("change",async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        if(file.size>25000)throw Error("Layout file too large.");
        this.restore(JSON.parse(await file.text()));
        this.save();this.render();this.note("Layout loaded. Compare it with the current portrait preview.");
      }catch(err){this.note("Cannot import layout: "+err.message);}
      e.target.value="";
    });
    root.addEventListener?.("resize",()=>this.applyAll());
    this.render();
  }
  toggle(){
    this.active=!this.active;this.drag=null;
    this.phone.classList.toggle("layout-editing",this.active);
    this.$("layoutEditToggle").textContent=this.active?"✓ Finish layout editing":"✥ Enable touch editing";
    this.$("layoutEditToggle").setAttribute("aria-pressed",String(this.active));
    this.note(this.active?"Edit mode: touch any highlighted UI component and drag it; game controls are temporarily locked.":
      "Layout editing off. Gameplay controls are available again.");
  }
  startDrag(e,id){
    if(!this.active)return;
    e.preventDefault();e.stopImmediatePropagation();
    this.selected=id;this.$("layoutElement").value=id;
    this.render();
    const rect=this.phone.getBoundingClientRect();
    this.drag={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,
      originX:this.layout[id].x,originY:this.layout[id].y,
      width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
    const item=this.$(id);
    item.setPointerCapture?.(e.pointerId);
    const move=event=>{
      if(!this.drag||this.drag.pointer!==event.pointerId)return;
      event.stopPropagation();event.preventDefault();
      const next=this.layout[id];
      next.x=clamp(this.drag.originX+(event.clientX-this.drag.startX)*100/this.drag.width,-48,48);
      next.y=clamp(this.drag.originY+(event.clientY-this.drag.startY)*100/this.drag.height,-48,48);
      this.apply(id);this.renderValues();
    };
    const finish=event=>{
      if(this.drag?.pointer!==event.pointerId)return;
      this.drag=null;this.save();item.removeEventListener("pointermove",move,true);
      item.removeEventListener("pointerup",finish,true);
      item.removeEventListener("pointercancel",finish,true);
    };
    item.addEventListener("pointermove",move,true);
    item.addEventListener("pointerup",finish,true);
    item.addEventListener("pointercancel",finish,true);
  }
  apply(id){
    if(typeof document==="undefined")return;
    const target=this.$(id),data=this.layout[id];
    if(!target||!this.phone||!data)return;
    const rect=this.phone.getBoundingClientRect();
    target.style.setProperty("--ui-x",(data.x*rect.width/100).toFixed(2)+"px");
    target.style.setProperty("--ui-y",(data.y*rect.height/100).toFixed(2)+"px");
    target.style.setProperty("--ui-scale",data.scale.toFixed(3));
    target.classList.toggle("layout-selected",this.active&&this.selected===id);
  }
  applyAll(){for(const [id] of targets)this.apply(id);}
  renderValues(){
    const p=this.layout[this.selected];
    if(!p)return;
    for(const [key,val] of [["x",p.x],["y",p.y],["scale",p.scale]]){
      const suffix=key[0].toUpperCase()+key.slice(1);
      this.$("layout"+suffix+"Range").value=val;
      this.$("layout"+suffix+"Value").value=Number(val).toFixed(key==="scale"?2:1);
    }
    this.$("layoutOutput").textContent=
      targets.find(x=>x[0]===this.selected)?.[1]+" · x "+p.x.toFixed(1)+"% · y "+p.y.toFixed(1)+"% · "+p.scale.toFixed(2)+"×";
  }
  render(){
    this.phone.dataset.uiTheme=this.theme;
    this.$("layoutTheme").value=this.theme;
    this.applyAll();this.renderValues();
  }
  note(message){this.$("layoutStatus").textContent=message;}
  snapshot(){
    return {format:"allaboard-ui-layout",version:1,coordinateSpace:"phone-percent",theme:this.theme,items:
      Object.fromEntries(targets.map(([id])=>[id,{...this.layout[id]}]))};
  }
  restore(data){
    if(!data||data.format!=="allaboard-ui-layout"||data.version!==1||!data.items)
      throw Error("Unsupported layout preset.");
    this.theme=["classic","glass","compact"].includes(data.theme)?data.theme:"classic";
    for(const [id] of targets){
      const p=data.items[id];if(!p)continue;
      const x=Number(p.x),y=Number(p.y),scale=Number(p.scale);
      if(![x,y,scale].every(Number.isFinite))continue;
      this.layout[id]={x:clamp(x,-48,48),y:clamp(y,-48,48),scale:clamp(scale,.55,1.8)};
    }
    this.applyAll();
    return true;
  }
  save(){try{localStorage.setItem("allaboard-ui-layout-v1",JSON.stringify(this.snapshot()));}catch(err){}}
  export(){
    const file=new Blob([JSON.stringify(this.snapshot(),null,2)],{type:"application/json"});
    const url=URL.createObjectURL(file),a=document.createElement("a");
    a.href=url;a.download="all-aboard-ui-layout.json";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
    this.note("Exported normalized positions and scale. Unity RectTransforms can use these as design inputs.");
  }
}
root.AllAboardUILayout={LayoutStudio,targets};
if(typeof module!=="undefined"&&module.exports)module.exports={LayoutStudio,targets};
if(typeof document!=="undefined"){
  const boot=()=>{const studio=new LayoutStudio();studio.mount();root.AllAboardUILayoutInstance=studio;};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
}
})(typeof window!=="undefined"?window:globalThis);
