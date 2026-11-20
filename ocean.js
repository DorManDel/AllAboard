/* All Aboard OceanField V0.3 — procedural, world-anchored water & wake.
 * No borrowed shaders/assets. A small, continuously sampled interference field
 * drives color, foam highlights, local wave drift and visual hull response.
 * Not a shallow-water or Navier-Stokes simulation.
 */
(function(){
  "use strict";
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rad=d=>d*Math.PI/180;
  class OceanField {
    constructor(){
      this.time=0;this.splashes=[];this.foam=[];this.wakeClock=0;
      this.surfaceCanvas=null;this.surfaceCtx=null;this.lastSurface=-100;
      this.waterMask=null;
    }
    setWaterMask(mask){this.waterMask=typeof mask==="function"?mask:null;}
    isWater(x,y){return !this.waterMask||this.waterMask(x,y);}
    reset(){
      this.time=0;this.splashes=[];this.foam=[];this.wakeClock=0;
      this.lastSurface=-100;
    }
    heightAt(x,y,settings,time=this.time){
      const a=rad(settings.windDirection||0);
      const wx=Math.sin(a),wy=-Math.cos(a);
      const detail=clamp((settings.waveDetail||22)/22,.55,1.65);
      const axis=(x*wx+y*wy)*detail,cross=(x*wy-y*wx)*detail;
      const t=time*(.5+(settings.windStrength||0)*.13);
      return (
        .48*Math.sin(axis*.021-t*.9+Math.sin(cross*.013+t*.28))+
        .28*Math.sin(cross*.034+t*.61+Math.sin(axis*.015)*1.2)+
        .16*Math.cos(axis*.057+cross*.037-t*1.15)+
        .08*Math.sin(x*.093+y*.039+t*1.57)
      )*Math.max(.05,settings.waveHeight||.7);
    }
    sampleFlow(x,y,settings,vortex){
      const angle=rad(settings.windDirection);
      const wx=Math.sin(angle),wy=-Math.cos(angle);
      const current=settings.currentStrength||0;
      let fx=wx*current*5.6,fy=wy*current*5.6;
      // Wave-dependent micro-push; small enough not to dominate the helm.
      const eps=8;
      const gradX=(this.heightAt(x+eps,y,settings)-this.heightAt(x-eps,y,settings))/(eps*2);
      const gradY=(this.heightAt(x,y+eps,settings)-this.heightAt(x,y-eps,settings))/(eps*2);
      const wavePush=settings.wavePush===undefined?.65:settings.wavePush;
      fx-=gradX*20*wavePush;fy-=gradY*20*wavePush;
      let vortexAmount=0;
      if(vortex&&vortex.active){
        const dx=vortex.x-x,dy=vortex.y-y,d=Math.max(1,Math.hypot(dx,dy));
        const field=Math.pow(Math.max(0,1-d/275),1.55)*(settings.vortexStrength||0);
        fx+=(dx/d)*115*field+(-dy/d)*76*field;
        fy+=(dy/d)*115*field+(dx/d)*76*field;
        vortexAmount=field;
      }
      return{x:fx,y:fy,vortexAmount};
    }
    splash(x,y,size=1,kind="splash"){
      if(!this.isWater(x,y))return false;
      this.splashes.push({x,y,size,kind,age:0});
      if(this.splashes.length>55)this.splashes.shift();
      const n=Math.min(22,Math.round(6+size*8));
      for(let i=0;i<n;i++){
        const theta=Math.random()*Math.PI*2,r=Math.random()*size*12;
        const foamX=x+Math.cos(theta)*r,foamY=y+Math.sin(theta)*r;
        if(!this.isWater(foamX,foamY))continue;
        this.foam.push({x:foamX,y:foamY,
          dx:Math.cos(theta)*(10+Math.random()*26)*size,
          dy:Math.sin(theta)*(10+Math.random()*26)*size,
          age:0,life:.55+Math.random()*1.4,size:.7+Math.random()*2.5});
      }
      this.limitFoam();
      return true;
    }
    limitFoam(){if(this.foam.length>350)this.foam.splice(0,this.foam.length-350);}
    emitWake(ship,settings,dt){
      const speed=Math.hypot(ship.vx,ship.vy);
      this.wakeClock+=dt;
      const cadence=.07;
      if(speed<3||this.wakeClock<cadence||settings.wakeStrength<=0)return;
      this.wakeClock%=cadence;
      const heading=rad(ship.heading);
      const fx=Math.sin(heading),fy=-Math.cos(heading);
      const rightX=-fy,rightY=fx;
      const bx=ship.x-fx*47,by=ship.y-fy*47;
      const turn=Math.min(1,Math.abs(ship.angularVelocity||0)/70);
      const intensity=Math.min(1,speed/70)*settings.wakeStrength;
      // Two sides of a V-shaped stern wake; drift left/right when turning.
      for(const side of [-1,1]){
        const offset=9+intensity*11+turn*5;
        const x=bx+rightX*(offset*side);
        const y=by+rightY*(offset*side);
        for(let i=0;i<1+Math.ceil(intensity*3);i++){
          this.foam.push({x:x+(Math.random()-.5)*9,y:y+(Math.random()-.5)*9,
            dx:ship.vx*.12+rightX*(side*(3+intensity*8)),
            dy:ship.vy*.12+rightY*(side*(3+intensity*8)),
            age:0,life:.65+Math.random()*.75+intensity*.7,
            size:.5+Math.random()*1.8+intensity*1.5});
        }
      }
      if(turn>.25&&Math.random()<turn*.5) this.splash(bx+rightX*20,by+rightY*20,.3,"turn");
      this.limitFoam();
    }
    step(dt){
      this.time+=dt;
      for(const r of this.splashes)r.age+=dt;
      for(const p of this.foam){
        p.age+=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;
        p.dx*=Math.exp(-1.65*dt);p.dy*=Math.exp(-1.65*dt);
      }
      this.splashes=this.splashes.filter(r=>r.age<2.8);
      this.foam=this.foam.filter(p=>p.age<p.life);
    }
    ensureSurface(w,h){
      if(typeof document==="undefined"||!document.createElement)return false;
      if(!this.surfaceCanvas){
        this.surfaceCanvas=document.createElement("canvas");
        this.surfaceCtx=this.surfaceCanvas.getContext&&this.surfaceCanvas.getContext("2d");
      }
      if(!this.surfaceCtx||typeof this.surfaceCtx.createImageData!=="function"
         ||typeof this.surfaceCtx.putImageData!=="function")return false;
      // Draw low-resolution procedural field and bilinearly upscale; keeps it cheap on phones.
      const pixelSize=7;
      const rw=Math.max(2,Math.ceil(w/pixelSize)),rh=Math.max(2,Math.ceil(h/pixelSize));
      if(this.surfaceCanvas.width!==rw||this.surfaceCanvas.height!==rh){
        this.surfaceCanvas.width=rw;this.surfaceCanvas.height=rh;this.lastSurface=-100;
      }
      return true;
    }
    drawBackground(ctx,view,settings,ship){
      const {w,h}=view;
      if(this.ensureSurface(w,h)){
        // Recompute at ~20fps while the main 60fps renderer remains responsive.
        if(this.time-this.lastSurface>.05||this.lastSurface===-100){
          const rw=this.surfaceCanvas.width,rh=this.surfaceCanvas.height;
          const img=this.surfaceCtx.createImageData(rw,rh);
          const data=img.data;
          for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
            const worldX=ship.x-w*.5+x*w/rw;
            const worldY=ship.y-h*.4+y*h/rh;
            const v=this.heightAt(worldX,worldY,settings);
            // Subtle organic gradations, not regularly spaced vector lines.
            const shade=clamp(.5+v*.53,0,1);
            const foam=clamp((shade-.78)*1.6,0,.4);
            const i=(y*rw+x)*4;
            data[i]=Math.round(12+31*shade+foam*90);
            data[i+1]=Math.round(62+67*shade+foam*90);
            data[i+2]=Math.round(103+64*shade+foam*65);
            data[i+3]=255;
          }
          this.surfaceCtx.putImageData(img,0,0);
          this.lastSurface=this.time;
        }
        ctx.imageSmoothingEnabled=true;
        ctx.drawImage(this.surfaceCanvas,0,0,w,h);
      }else{
        // Support headless canvas mock / older browsers without ImageData.
        const bg=ctx.createLinearGradient(0,0,w,h);
        bg.addColorStop(0,"#155c87");bg.addColorStop(.5,"#16729c");bg.addColorStop(1,"#0b456d");
        ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
        const patches=32;
        for(let i=0;i<patches;i++){
          const px=((i*113.7+Math.sin(this.time*.15+i)*16+ship.x*.35)%(w+70)+w+70)%(w+70)-35;
          const py=((i*79.3+ship.y*.24+Math.cos(this.time*.2+i)*10)%(h+80)+h+80)%(h+80)-40;
          const r=24+((i*17)%32);
          const grad=ctx.createRadialGradient(px,py,1,px,py,r);
          grad.addColorStop(0,"rgba(101,188,214,.09)");
          grad.addColorStop(1,"rgba(6,57,106,0)");
          ctx.fillStyle=grad;ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
        }
      }
    }
    drawEffects(ctx,view){
      const {project}=view;
      for(const pulse of this.splashes){
        if(!this.isWater(pulse.x,pulse.y))continue;
        const p=project(pulse.x,pulse.y),alpha=Math.max(0,1-pulse.age/2.8)*.64;
        if(!alpha)continue;
        ctx.strokeStyle="rgba(223,250,248,"+alpha+")";
        ctx.lineWidth=1.2+Math.max(0,1-pulse.age)*pulse.size;
        for(let i=0;i<3;i++){
          const r=(pulse.age*23+i*8+3)*pulse.size;
          ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.62,0,0,Math.PI*2);ctx.stroke();
        }
      }
      for(const p of this.foam){
        if(!this.isWater(p.x,p.y))continue;
        const point=project(p.x,p.y),opacity=clamp(1-p.age/p.life,0,1);
        if(point.x<-10||point.y<-10)continue;
        ctx.globalAlpha=opacity*.78;ctx.fillStyle="#e6fcfc";
        ctx.beginPath();ctx.arc(point.x,point.y,p.size,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;
    }
  }
  if(typeof window!=="undefined")window.AllAboardOcean=OceanField;
  if(typeof module!=="undefined"&&module.exports)module.exports=OceanField;
})();
