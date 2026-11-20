/* All Aboard — Seeded World V0.1
 * Deterministic, infinite-in-principle 2D open-ocean world.
 * Every chunk is a pure function of (seed, cx, cy, generation version).
 * Only a bounded neighborhood of chunks is cached, so memory stays small.
 * Content is original game-logic + Canvas shapes, no asset dependencies.
 */
(function(root){
  "use strict";
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hashText=s=>{
    let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  };
  function mix32(a){a=Math.imul(a^(a>>>16),0x7feb352d);a=Math.imul(a^(a>>>15),0x846ca68b);return (a^(a>>>16))>>>0;}
  function randomStream(seed){
    let s=seed>>>0;
    return ()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
  }
  const pick=(rng,items)=>items[Math.floor(rng()*items.length)];
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const CHUNK_SIZE=540,KEEP_RADIUS=2,VERSION=1;
  class WorldEngine{
    constructor(seed="ALL-ABOARD",options={}){
      this.seed=String(seed).trim()||"ALL-ABOARD";
      this.key=hashText(this.seed);
      this.options={islands:1,ships:1,treasure:1,kraken:true,...options};
      this.cache=new Map();
      this.collected=new Set();
      this.destroyed=new Set();
      this.discovered=new Set();
      this.shipsState=new Map();
      this.krakenState=new Map();
      this.lastCenter=null;
      this.elapsed=0;
      this.frame=0;
      this.lastEncounter=null;
    }
    static get CHUNK_SIZE(){return CHUNK_SIZE;}
    chunkAt(x,y){return{x:Math.floor(x/CHUNK_SIZE),y:Math.floor(y/CHUNK_SIZE)};}
    chunkKey(cx,cy){return cx+","+cy;}
    seedFor(cx,cy){
      return mix32(this.key^mix32((cx>>>0)+0x9e3779b9)^mix32((cy>>>0)+0x85ebca6b)^VERSION);
    }
    createChunk(cx,cy){
      const rand=randomStream(this.seedFor(cx,cy));
      const centerX=cx*CHUNK_SIZE,centerY=cy*CHUNK_SIZE;
      const positions=()=>({x:centerX+65+rand()*(CHUNK_SIZE-130),y:centerY+65+rand()*(CHUNK_SIZE-130)});
      const clearStart=pos=>cx===0&&cy===0&&Math.hypot(pos.x,pos.y)<175;
      const features=[];
      let number=0;
      const id=type=>cx+":"+cy+":"+type+":"+(number++);
      const islands=Math.floor((.7+rand()*1.8)*this.options.islands);
      for(let i=0;i<Math.min(5,islands);i++){
        let p=positions();
        if(clearStart(p))p={x:clamp(p.x+200,180,CHUNK_SIZE-65),y:clamp(p.y+150,180,CHUNK_SIZE-65)};
        const radius=38+rand()*72,shape=Array.from({length:14},()=>.75+rand()*.5);
        features.push({id:id("island"),type:"island",...p,rx:radius,ry:radius*(.48+rand()*.5),angle:rand()*Math.PI*2,
          shape,palms:Math.floor(1+rand()*4),tone:rand()});
      }
      const ships=Math.floor((.7+rand()*1.9)*this.options.ships);
      for(let i=0;i<Math.min(6,ships);i++){
        let p=positions();
        if(clearStart(p))p={x:p.x+170,y:p.y+150};
        const allied=rand()>.43;
        features.push({id:id("ship"),type:"ship",...p,heading:rand()*360,patrolRadius:12+rand()*26,
          phase:rand()*Math.PI*2,health:100,faction:allied?"friendly":"hostile",name:pick(rand,
            allied?["Drifting Gull","Coral Trader","Blue Lantern","Wind Dancer"]:
                   ["Sea Marauder","Iron Tide","Black Fin","Storm Hunter"])});
      }
      const chests=Math.floor((.6+rand()*1.8)*this.options.treasure);
      for(let i=0;i<Math.min(6,chests);i++){
        let p=positions();
        if(clearStart(p))p={x:p.x+180,y:p.y+90};
        features.push({id:id("treasure"),type:"treasure",...p,coins:20+Math.floor(rand()*5)*15,
          glow:rand()*Math.PI*2});
      }
      // Rare, deterministic. Always encounterable through a manual summon in lab.
      const rare=rand()<.018;
      if(this.options.kraken && rare && !(cx===0&&cy===0)){
        const p=positions();
        features.push({id:id("kraken"),type:"kraken",...p,radius:75+rand()*30,phase:rand()*6.28});
      }
      return{cx,cy,features};
    }
    getChunk(cx,cy){
      const key=this.chunkKey(cx,cy);
      if(!this.cache.has(key))this.cache.set(key,this.createChunk(cx,cy));
      return this.cache.get(key);
    }
    updateNear(x,y){
      const center=this.chunkAt(x,y);
      const signature=this.chunkKey(center.x,center.y);
      if(this.lastCenter===signature)return;
      this.lastCenter=signature;
      for(let dy=-KEEP_RADIUS;dy<=KEEP_RADIUS;dy++)
        for(let dx=-KEEP_RADIUS;dx<=KEEP_RADIUS;dx++)
          this.getChunk(center.x+dx,center.y+dy);
      for(const key of this.cache.keys()){
        const [cx,cy]=key.split(",").map(Number);
        if(Math.abs(cx-center.x)>KEEP_RADIUS||Math.abs(cy-center.y)>KEEP_RADIUS)this.cache.delete(key);
      }
    }
    nearbyObjects(x,y,radius=400){
      this.updateNear(x,y);
      const r=radius+150;
      const result=[];
      for(const chunk of this.cache.values())
        for(const item of chunk.features){
          if(this.collected.has(item.id)||this.destroyed.has(item.id))continue;
          if(Math.abs(item.x-x)<r&&Math.abs(item.y-y)<r)result.push(item);
        }
      return result;
    }
    countNearby(x,y,radius=550){
      const all=this.nearbyObjects(x,y,radius);
      const counts={island:0,ship:0,treasure:0,kraken:0};
      for(const item of all)counts[item.type]++;
      return{...counts,chunks:this.cache.size,seed:this.seed};
    }
    nearest(x,y,type,maxDistance=90){
      let found=null,best=maxDistance;
      for(const item of this.nearbyObjects(x,y,maxDistance)){
        if(type&&item.type!==type)continue;
        const d=Math.hypot(x-item.x,y-item.y);
        if(d<best){best=d;found=item;}
      }
      return found;
    }
    collect(item){
      if(!item||item.type!=="treasure"||this.collected.has(item.id))return 0;
      this.collected.add(item.id);
      return item.coins;
    }
    markDestroyed(item){
      if(!item||item.type!=="ship")return;
      this.destroyed.add(item.id);
      this.shipsState.delete(item.id);
    }
    simulate(dt,ship,ocean,settings){
      this.elapsed+=dt;this.frame++;
      this.updateNear(ship.x,ship.y);
      // Nearby AI is deliberately cheap. Other ships remain a small ecology,
      // independent of player movement; dynamic state is bounded in memory.
      const ships=this.nearbyObjects(ship.x,ship.y,390).filter(x=>x.type==="ship");
      for(const npc of ships){
        const damage=this.shipsState.get(npc.id)||{hp:100,sails:100,phase:0};
        damage.phase+=dt;
        damage.x=npc.x+Math.sin(damage.phase*.22+npc.phase)*npc.patrolRadius*(damage.sails/100);
        damage.y=npc.y+Math.cos(damage.phase*.17+npc.phase)*npc.patrolRadius*(damage.sails/100);
        this.shipsState.set(npc.id,damage);
      }
      for(const id of this.shipsState.keys()){
        // Forget remote active state (future backend may persist encounters).
        const home=this.findById(id);
        if(!home||distance(home,ship)>650)this.shipsState.delete(id);
      }
      const krakens=this.nearbyObjects(ship.x,ship.y,325).filter(x=>x.type==="kraken");
      for(const monster of krakens)this.applyKraken(monster,dt,ship,ocean);
    }
    findById(id){
      for(const chunk of this.cache.values())
        for(const item of chunk.features)if(item.id===id)return item;
      return null;
    }
    summonKraken(x,y){
      const p={id:"summoned:"+this.seed+":"+Math.floor(x/100)+":"+Math.floor(y/100),type:"kraken",
        x:x+130,y:y-200,radius:95,phase:2,summoned:true};
      const c=this.chunkAt(p.x,p.y),chunk=this.getChunk(c.x,c.y);
      chunk.features=chunk.features.filter(f=>!f.summoned);chunk.features.push(p);
      return p;
    }
    applyKraken(monster,dt,ship,ocean){
      const kraken=this.krakenState.get(monster.id)||{attackClock:0,shipsEaten:0};
      kraken.attackClock+=dt;
      const d=Math.hypot(monster.x-ship.x,monster.y-ship.y);
      if(d<monster.radius*.75 && kraken.attackClock>1.6){
        kraken.attackClock=0;
        ship.hull=Math.max(0,(ship.hull||100)-8);
        if(ocean)ocean.splash(ship.x,ship.y,1.8,"kraken");
        this.lastEncounter={kind:"kraken",message:"Kraken hit the hull! Escape its reach.",when:this.elapsed};
      }
      // Eat an NPC if it gets within reach; this event has gameplay consequences.
      for(const npc of this.nearbyObjects(monster.x,monster.y,monster.radius).filter(x=>x.type==="ship")){
        const current=this.shipsState.get(npc.id);
        const pos=current||npc;
        if(Math.hypot(pos.x-monster.x,pos.y-monster.y)<monster.radius*.58){
          this.markDestroyed(npc);
          kraken.shipsEaten++;
          if(ocean)ocean.splash(pos.x,pos.y,2,"kraken");
          this.lastEncounter={kind:"kraken",message:"The Kraken swallowed "+npc.name+"!",when:this.elapsed};
        }
      }
      this.krakenState.set(monster.id,kraken);
    }
    islandPenetration(x,y,item){
      // Axis-aligned conservative collision; draw angle is visual only.
      const nx=(x-item.x)/(item.rx+10),ny=(y-item.y)/(item.ry+10);
      const r=Math.hypot(nx,ny);
      return r<1?{nx:nx/Math.max(.0001,r),ny:ny/Math.max(.0001,r),depth:1-r}:null;
    }
    collideShip(ship,ocean){
      for(const island of this.nearbyObjects(ship.x,ship.y,135).filter(o=>o.type==="island")){
        const hit=this.islandPenetration(ship.x,ship.y,island);
        if(!hit)continue;
        ship.x+=hit.nx*hit.depth*(island.rx+10);
        ship.y+=hit.ny*hit.depth*(island.ry+10);
        const toward=ship.vx*hit.nx+ship.vy*hit.ny;
        if(toward<0){ship.vx-=hit.nx*toward*1.3;ship.vy-=hit.ny*toward*1.3;}
        if(ocean&&this.frame%18===0)ocean.splash(ship.x,ship.y,.25,"shore");
      }
    }
    render(ctx,project,player,settings={}){
      const items=this.nearbyObjects(player.x,player.y,650);
      const vw=settings.width||340,vh=settings.height||630;
      const visible=(p,r)=>p.x>-r&&p.x<vw+r&&p.y>-r&&p.y<vh+r;
      const islands=items.filter(x=>x.type==="island");
      const others=items.filter(x=>x.type!=="island");
      for(const island of islands){
        const p=project(island.x,island.y);
        if(!visible(p,island.rx+40))continue;
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(island.angle);
        const drawRidge=(scale,color)=>{
          ctx.beginPath();
          const n=island.shape.length;
          for(let k=0;k<n;k++){
            const angle=k*Math.PI*2/n,m=island.shape[k];
            const x=Math.cos(angle)*island.rx*m*scale;
            const y=Math.sin(angle)*island.ry*m*scale;
            if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          }
          ctx.closePath();ctx.fillStyle=color;ctx.fill();
        };
        // Shoreline wash reacts to the world wave clock, including when the
        // wind changes: the outer surf ring breathes subtly around the island.
        const shoreline=1.36+Math.sin(this.elapsed*(1.1+(settings.windStrength||2)*.13)+island.tone*12)*.035;
        drawRidge(shoreline,"rgba(146,242,218,.22)");
        drawRidge(1.19,"rgba(185,239,211,.44)");
        drawRidge(1.03,"#dfc78d");
        drawRidge(.88,island.tone>.5?"#72a470":"#7dad76");
        drawRidge(.66,"#4b8e6b");
        for(let k=0;k<island.palms;k++){
          const phase=k*2.4+island.tone*5;
          const x=Math.cos(phase)*island.rx*.37,y=Math.sin(phase)*island.ry*.34;
          ctx.fillStyle="#675332";ctx.fillRect(x-1,y,2,7);
          ctx.strokeStyle="#245d48";ctx.lineWidth=2;
          for(let j=0;j<4;j++){
            const a=j*Math.PI/2+phase;
            ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*8,y+Math.sin(a)*7);ctx.stroke();
          }
        }
        ctx.restore();
      }
      for(const item of others){
        const dynamic=item.type==="ship"?this.shipsState.get(item.id):null;
        const p=project(dynamic?.x??item.x,dynamic?.y??item.y);
        if(!visible(p,110))continue;
        if(item.type==="treasure"){
          const bob=Math.sin(this.elapsed*2+item.glow)*2;
          ctx.save();ctx.translate(p.x,p.y+bob);ctx.fillStyle="#744522";ctx.fillRect(-8,-4,16,12);
          ctx.fillStyle="#ffdc79";ctx.fillRect(-8,-7,16,5);ctx.fillRect(-1,-7,3,15);
          ctx.restore();
        }else if(item.type==="ship"){
          ctx.save();ctx.translate(p.x,p.y);ctx.rotate(item.heading*Math.PI/180);
          ctx.beginPath();ctx.moveTo(0,-15);ctx.quadraticCurveTo(13,-7,10,11);
          ctx.lineTo(0,17);ctx.lineTo(-10,11);ctx.quadraticCurveTo(-13,-7,0,-15);ctx.closePath();
          ctx.fillStyle=item.faction==="friendly"?"#8b633e":"#673d49";
          ctx.strokeStyle=item.faction==="friendly"?"#98eec7":"#ef9ba7";
          ctx.lineWidth=2;ctx.fill();ctx.stroke();
          const rig=(dynamic?.sails??100)/100;
          if(rig>0){ctx.fillStyle="#f1e5bd";ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(9*rig,8);ctx.lineTo(-8*rig,8);ctx.closePath();ctx.fill();}
          ctx.restore();
          if(dynamic&&dynamic.hp<100){
            ctx.fillStyle="#17303a";ctx.fillRect(p.x-14,p.y-26,28,4);
            ctx.fillStyle=dynamic.hp<35?"#f08c78":"#f3d17c";
            ctx.fillRect(p.x-14,p.y-26,28*clamp(dynamic.hp/100,0,1),4);
          }
        }else if(item.type==="kraken"){
          const pulse=Math.sin(this.elapsed*2+item.phase);
          const radius=22+3*pulse;
          ctx.save();ctx.translate(p.x,p.y);
          const g=ctx.createRadialGradient(0,0,3,0,0,70);
          g.addColorStop(0,"rgba(12,17,45,.85)");g.addColorStop(1,"rgba(7,39,79,0)");
          ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,70,0,Math.PI*2);ctx.fill();
          for(let arm=0;arm<6;arm++){
            const a=arm*Math.PI/3+this.elapsed*.35;
            ctx.strokeStyle="rgba(135,82,161,.8)";ctx.lineWidth=5;
            ctx.beginPath();ctx.moveTo(Math.cos(a)*10,Math.sin(a)*10);
            ctx.quadraticCurveTo(Math.cos(a+.6)*35,Math.sin(a+.6)*35,
              Math.cos(a+1)*52,Math.sin(a+1)*52);ctx.stroke();
          }
          ctx.fillStyle="#563869";ctx.beginPath();ctx.arc(0,0,radius*.8,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#e8c6f9";ctx.beginPath();ctx.arc(-6,-3,2.2,0,Math.PI*2);
          ctx.arc(6,-3,2.2,0,Math.PI*2);ctx.fill();
          ctx.restore();
        }
      }
    }
    snapshot(){
      return{seed:this.seed,generatorVersion:VERSION,options:{...this.options},
        collected:[...this.collected],destroyed:[...this.destroyed],
        chunkSize:CHUNK_SIZE};
    }
    dispose(){
      this.cache.clear();this.shipsState.clear();this.krakenState.clear();
    }
  }
  root.AllAboardWorld={WorldEngine,hashText,randomStream};
  if(typeof module!=="undefined"&&module.exports)module.exports={WorldEngine,hashText,randomStream};
})(typeof window!=="undefined"?window:globalThis);
