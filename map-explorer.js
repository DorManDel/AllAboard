/* All Aboard — World Map Explorer V0.6
 * Uses WorldEngine.createChunk(seed,cx,cy), not its live chunk cache.
 * Map browsing cannot evict/modify the simulation's active chunks.
 */
(function(root){
"use strict";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const categories=["island","ship","treasure","kraken"];
function visibleFeatures(world,centerX,centerY,w,h,zoom,filter){
  if(!world)return[];
  const scale=clamp(zoom,.18,1.6);
  const halfX=w/(2*scale),halfY=h/(2*scale),chunk=world.constructor.CHUNK_SIZE;
  const minX=Math.floor((centerX-halfX)/chunk)-1,maxX=Math.floor((centerX+halfX)/chunk)+1;
  const minY=Math.floor((centerY-halfY)/chunk)-1,maxY=Math.floor((centerY+halfY)/chunk)+1;
  const result=[];
  let scanned=0;
  for(let cy=minY;cy<=maxY&&scanned<90;cy++){
    for(let cx=minX;cx<=maxX&&scanned<90;cx++){
      scanned++;
      // Pure generation prevents the map from filling or reordering live cache.
      const created=world.createChunk(cx,cy);
      for(const item of created.features){
        if(world.collected.has(item.id)||world.destroyed.has(item.id))continue;
        if(filter&&filter[item.type]===false)continue;
        if(Math.abs(item.x-centerX)<=halfX+item.rx*1.2||item.type!=="island")
          if(Math.abs(item.y-centerY)<=halfY+item.ry*1.2||item.type!=="island")
            result.push(item);
      }
    }
  }
  return result;
}
function heatIntensity(world,features,x,y,faction,radius=180){
  const r2=radius*radius;
  let total=0;
  for(const item of features){
    if(item.type!=="ship"||item.faction!==faction)continue;
    const dynamic=world.shipsState.get(item.id);
    const dx=(dynamic?.x??item.x)-x,dy=(dynamic?.y??item.y)-y;
    const d2=dx*dx+dy*dy;
    if(d2<r2)total+=(1-d2/r2)**2;
  }
  return clamp(total,0,1);
}
class MapExplorer{
  constructor(getWorld,getShip){
    this.getWorld=getWorld;this.getShip=getShip;this.zoom=.42;
    this.centerX=0;this.centerY=0;this.follow=true;
    this.filter={island:true,ship:true,treasure:true,kraken:true};
    this.heatEnemies=true;this.heatAllies=true;
    this.drag=null;this.open=false;this.lastDraw=0;
    this.lastWorld=null;this.canvas=null;
  }
  $(id){return document.getElementById(id);}
  mount(){
    this.modal=this.$("mapModal");this.canvas=this.$("mapExplorerCanvas");
    if(!this.modal||!this.canvas)return;
    const initial=this.getShip();
    if(initial){this.centerX=initial.x;this.centerY=initial.y;}
    this.$("mapOpenMini").addEventListener("click",()=>this.toggle(true));
    this.$("mapOpenWorld").addEventListener("click",()=>this.toggle(true));
    this.$("mapClose").addEventListener("click",()=>this.toggle(false));
    this.modal.addEventListener("click",e=>{if(e.target===this.modal)this.toggle(false);});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&this.open)this.toggle(false);});
    this.$("mapZoom").addEventListener("input",e=>{
      this.zoom=clamp(Number(e.target.value),.18,1.6);this.draw();
    });
    this.$("mapRecenter").addEventListener("click",()=>{
      const ship=this.getShip();if(ship){this.centerX=ship.x;this.centerY=ship.y;}
      this.follow=true;this.$("mapFollow").checked=true;this.draw();
    });
    this.$("mapFollow").addEventListener("change",e=>{this.follow=e.target.checked;this.draw();});
    this.$("mapHeatEnemy").addEventListener("change",e=>{this.heatEnemies=e.target.checked;this.draw();});
    this.$("mapHeatAlly").addEventListener("change",e=>{this.heatAllies=e.target.checked;this.draw();});
    for(const name of categories){
      const checkbox=this.$("mapShow"+name[0].toUpperCase()+name.slice(1));
      checkbox?.addEventListener("change",e=>{this.filter[name]=e.target.checked;this.draw();});
    }
    this.canvas.addEventListener("pointerdown",e=>{
      this.drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,
        centerX:this.centerX,centerY:this.centerY,moved:false};
      this.canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    this.canvas.addEventListener("pointermove",e=>{
      if(!this.drag||this.drag.pointer!==e.pointerId)return;
      const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;
      if(Math.abs(dx)+Math.abs(dy)>3)this.drag.moved=true;
      this.centerX=this.drag.centerX-dx/this.zoom;
      this.centerY=this.drag.centerY-dy/this.zoom;
      this.follow=false;this.$("mapFollow").checked=false;
      this.draw();
    });
    this.canvas.addEventListener("pointerup",e=>{
      if(!this.drag||this.drag.pointer!==e.pointerId)return;
      if(!this.drag.moved)this.selectAt(e);
      this.drag=null;
    });
    this.canvas.addEventListener("wheel",e=>{
      if(!this.open)return;
      e.preventDefault();
      this.zoom=clamp(this.zoom*(e.deltaY<0?1.18:.85),.18,1.6);
      this.$("mapZoom").value=this.zoom;this.draw();
    },{passive:false});
    this.toggle(false);
  }
  toggle(open){
    if(!this.modal)return;
    this.open=open;this.modal.hidden=!open;
    if(open){
      if(this.follow){
        const ship=this.getShip();if(ship){this.centerX=ship.x;this.centerY=ship.y;}
      }
      this.draw();
      this.schedule();
    }
  }
  schedule(){
    if(!this.open)return;
    // Only update the expanded map while visible, with a throttle for phones.
    root.requestAnimationFrame?.(time=>{
      if(!this.open)return;
      if(!this.lastDraw||time-this.lastDraw>250){
        this.lastDraw=time;
        if(this.follow){const ship=this.getShip();if(ship){this.centerX=ship.x;this.centerY=ship.y;}}
        this.draw();
      }
      this.schedule();
    });
  }
  resize(){
    const box=this.canvas.getBoundingClientRect();
    const scale=Math.min(root.devicePixelRatio||1,2);
    this.canvas.width=Math.max(320,Math.round(box.width*scale));
    this.canvas.height=Math.max(240,Math.round(box.height*scale));
    const ctx=this.canvas.getContext("2d");
    ctx?.setTransform(scale,0,0,scale,0,0);
    return{ctx,w:this.canvas.width/scale,h:this.canvas.height/scale};
  }
  selectAt(event){
    const rect=this.canvas.getBoundingClientRect();
    const x=this.centerX+(event.clientX-rect.left-rect.width/2)/this.zoom;
    const y=this.centerY+(event.clientY-rect.top-rect.height/2)/this.zoom;
    const world=this.getWorld();if(!world)return;
    const nearest=this.features?.map(item=>({item,d:Math.hypot(item.x-x,item.y-y)}))
      .sort((a,b)=>a.d-b.d)[0];
    if(nearest&&nearest.d<Math.max(35,18/this.zoom)){
      const item=nearest.item;
      this.$("mapSelection").textContent=this.describe(item);
    }else this.$("mapSelection").textContent=
      "Open sea · "+Math.round(x)+", "+Math.round(y)+" · no nearby POI";
  }
  describe(item){
    const name=item.name||(item.type==="island"?"Island":item.type==="treasure"?"Treasure cache":"Kraken");
    return name+" · "+item.type.toUpperCase()+
      " · ("+Math.round(item.x)+", "+Math.round(item.y)+")";
  }
  draw(){
    if(!this.open)return;
    const {ctx,w,h}=this.resize(),world=this.getWorld();
    if(!ctx||!world)return;
    const features=this.features=visibleFeatures(world,this.centerX,this.centerY,w,h,this.zoom,this.filter);
    const toScreen=(x,y)=>({x:w/2+(x-this.centerX)*this.zoom,y:h/2+(y-this.centerY)*this.zoom});
    ctx.fillStyle="#0d5176";ctx.fillRect(0,0,w,h);
    const span=world.constructor.CHUNK_SIZE;
    const firstX=Math.floor((this.centerX-w/this.zoom/2)/span)-1;
    const firstY=Math.floor((this.centerY-h/this.zoom/2)/span)-1;
    ctx.strokeStyle="rgba(188,229,229,.16)";ctx.lineWidth=1;
    for(let x=firstX;x<firstX+16;x++){
      const p=toScreen(x*span,0);
      if(p.x<0||p.x>w)continue;
      ctx.beginPath();ctx.moveTo(p.x,0);ctx.lineTo(p.x,h);ctx.stroke();
    }
    for(let y=firstY;y<firstY+16;y++){
      const p=toScreen(0,y*span);
      if(p.y<0||p.y>h)continue;
      ctx.beginPath();ctx.moveTo(0,p.y);ctx.lineTo(w,p.y);ctx.stroke();
    }
    for(const item of features.filter(o=>o.type==="island")){
      const p=toScreen(item.x,item.y);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(item.angle);
      const ridge=(scale,fill)=>{
        ctx.beginPath();
        for(let i=0;i<item.shape.length;i++){
          const a=i*2*Math.PI/item.shape.length;
          const x=Math.cos(a)*item.rx*item.shape[i]*scale*this.zoom;
          const y=Math.sin(a)*item.ry*item.shape[i]*scale*this.zoom;
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.closePath();ctx.fillStyle=fill;ctx.fill();
      };
      ridge(1.22,"#91d5cd");ridge(1.08,"#dfc88b");ridge(.85,"#699b69");
      ctx.restore();
    }
    // Soft low-detail density halos, one local radial gradient per visible NPC.
    // The expanded map uses short-lived 2D Canvas effects; world physics never
    // reads this presentation layer.
    const heat=(faction,color)=>{
      for(const item of features){
        if(item.type!=="ship"||item.faction!==faction)continue;
        const p=toScreen(item.x,item.y),r=155*this.zoom;
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
        g.addColorStop(0,color);g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
      }
    };
    if(this.heatEnemies)heat("hostile","rgba(244,90,98,.24)");
    if(this.heatAllies)heat("friendly","rgba(93,236,166,.19)");
    for(const item of features.filter(o=>o.type!=="island")){
      const p=toScreen(item.x,item.y);
      const color=item.type==="treasure"?"#f9d979":item.type==="kraken"?"#cf93e9":
        item.faction==="friendly"?"#9df4bf":"#ff9a9b";
      ctx.fillStyle=color;ctx.strokeStyle="#123044";ctx.lineWidth=1.5;
      const r=item.type==="kraken"?6:4;
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
      if(this.zoom>.6&&item.type==="ship"){
        ctx.font="9px Arial";ctx.textAlign="center";ctx.fillText(item.name,p.x,p.y-10);
      }
    }
    const ship=this.getShip();
    if(ship){
      const p=toScreen(ship.x,ship.y);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ship.heading*Math.PI/180);
      ctx.fillStyle="#fffdf0";ctx.strokeStyle="#183a54";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(7,8);ctx.lineTo(0,4);ctx.lineTo(-7,8);
      ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
    this.$("mapZoomValue").textContent=Math.round(this.zoom*100)+"%";
    this.$("mapMapCoords").textContent=Math.round(this.centerX)+", "+Math.round(this.centerY);
    this.$("mapFeatureCount").textContent=features.length+" POIs shown";
    this.$("mapSeedLabel").textContent=world.seed;
    const list=this.$("mapPoiList");list.innerHTML="";
    const nearest=features.filter(o=>o.type!=="island")
      .sort((a,b)=>Math.hypot(a.x-(ship?.x||0),a.y-(ship?.y||0))-
                    Math.hypot(b.x-(ship?.x||0),b.y-(ship?.y||0))).slice(0,12);
    for(const item of nearest){
      const button=document.createElement("button");button.className="map-poi";
      button.textContent=(item.type==="ship"?(item.faction==="friendly"?"♡ ":"✹ "):
        item.type==="treasure"?"✦ ":"🐙 ")+(item.name||item.type)+" · "+
        Math.round(Math.hypot(item.x-(ship?.x||0),item.y-(ship?.y||0)))+"u";
      button.addEventListener("click",()=>{
        this.centerX=item.x;this.centerY=item.y;this.follow=false;
        this.$("mapFollow").checked=false;
        this.$("mapSelection").textContent=this.describe(item);this.draw();
      });
      list.append(button);
    }
  }
}
root.AllAboardMapExplorer={MapExplorer,visibleFeatures,heatIntensity};
if(typeof module!=="undefined"&&module.exports)module.exports={MapExplorer,visibleFeatures,heatIntensity};
if(typeof document!=="undefined"){
  const boot=()=>{const bridge=root.AllAboardLiveBridge;if(!bridge)return;
    const map=new MapExplorer(bridge.getWorld,bridge.getShip);
    map.mount();root.AllAboardMapExplorerInstance=map;};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
}
})(typeof window!=="undefined"?window:globalThis);
