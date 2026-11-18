/* All Aboard OceanField V0.2 — standalone, dependency-free procedural 2D ocean.
   Physics are arcade forces in LAB UNITS. Sea bands and foam are stylized visuals,
   not a 3D fluid simulation. Input comes from the same ship/world state.
*/
(function () {
  "use strict";
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const rad = d => d * Math.PI / 180;
  class OceanField {
    constructor() { this.splashes=[]; this.foam=[]; this.time=0; }
    reset() { this.splashes=[]; this.foam=[]; this.time=0; }
    splash(x,y,size=1,kind="splash") {
      this.splashes.push({x,y,size,kind,age:0});
      if (this.splashes.length>42) this.splashes.shift();
      for(let n=0;n<Math.min(17,Math.round(7+size*6));n++) {
        const theta = Math.random()*Math.PI*2;
        const radius = 1 + Math.random()*9*size;
        this.foam.push({x:x+Math.cos(theta)*radius,y:y+Math.sin(theta)*radius,
          dx:Math.cos(theta)*(4+Math.random()*22)*size,
          dy:Math.sin(theta)*(4+Math.random()*22)*size, age:0, life:1+Math.random()*1.6,
          size:.6+Math.random()*2});
      }
      if(this.foam.length>185)this.foam.splice(0,this.foam.length-185);
    }
    step(dt) {
      this.time+=dt;
      this.splashes.forEach(x=>x.age+=dt);
      this.foam.forEach(x=>{x.age+=dt;x.x+=x.dx*dt;x.y+=x.dy*dt;x.dx*=Math.exp(-2*dt);x.dy*=Math.exp(-2*dt)});
      this.splashes=this.splashes.filter(x=>x.age<3);
      this.foam=this.foam.filter(x=>x.age<x.life);
    }
    sampleFlow(x,y,settings,vortex){
      // Direction vector for water's underlying current.
      const windX=Math.sin(rad(settings.windDirection));
      const windY=-Math.cos(rad(settings.windDirection));
      let fx=windX*settings.currentStrength*6;
      let fy=windY*settings.currentStrength*6;
      let vortexAmount=0;
      if(vortex.active) {
        const dx=vortex.x-x,dy=vortex.y-y,d=Math.max(1,Math.hypot(dx,dy));
        const field=Math.pow(Math.max(0,1-d/280),1.5)*settings.vortexStrength;
        // Swirl + inward radial flow; there is no unbounded singularity at the center.
        fx+=(dx/d)*125*field+(-dy/d)*88*field;
        fy+=(dy/d)*125*field+(dx/d)*88*field;
        vortexAmount=field;
      }
      return {x:fx,y:fy,vortexAmount};
    }
    drawBackground(ctx,view,settings,ship){
      const {w,h,project}=view;
      const t=this.time;
      const gradient=ctx.createLinearGradient(0,0,w,h);
      gradient.addColorStop(0,"#164d7c");
      gradient.addColorStop(.45,"#21669c");
      gradient.addColorStop(1,"#0d477b");
      ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
      const density=Math.round(settings.waveDetail);
      const spacing=clamp(57-density*.68,18,58);
      const amplitude=2+settings.waveHeight*6;
      const start=Math.floor((ship.y-h*.40)/spacing)*spacing-spacing*2;
      const end=ship.y+h*.60+spacing*2;
      const windRad=rad(settings.windDirection);
      const windDx=Math.sin(windRad);
      const phaseShift=t*(3+settings.windStrength)*.025;
      // World-locked bands: the hull moving through water scrolls the sea.
      for(let wy=start;wy<end;wy+=spacing) {
        const p=project(0,wy);
        const sy=p.y;
        const phase=wy*.071 + phaseShift;
        ctx.beginPath();
        for(let sx=-12;sx<=w+16;sx+=9){
          const worldX=sx+ship.x-w*.5;
          const wave=Math.sin(worldX*.022+phase)*amplitude +
                     Math.sin(worldX*.055-phase*1.3)*amplitude*.3;
          const yy=sy+wave;
          if(sx===-12)ctx.moveTo(sx,yy);
          else ctx.lineTo(sx,yy);
        }
        ctx.lineTo(w+16,sy+spacing*.45);
        ctx.lineTo(-12,sy+spacing*.45);
        ctx.closePath();
        ctx.fillStyle=(Math.floor(wy/spacing)%3===0)?"rgba(13,54,105,.25)":"rgba(37,129,172,.16)";
        ctx.fill();
        ctx.beginPath();
        for(let sx=-12;sx<=w+16;sx+=8){
          const worldX=sx+ship.x-w*.5;
          const yy=sy+Math.sin(worldX*.022+phase)*amplitude+Math.sin(worldX*.055-phase*1.3)*amplitude*.3;
          if(sx===-12)ctx.moveTo(sx,yy);else ctx.lineTo(sx,yy);
        }
        ctx.strokeStyle="rgba(133,215,238,"+(.12+settings.waveHeight*.045)+")";
        ctx.lineWidth=2+settings.waveHeight*.7;ctx.stroke();
        // Short foam streaks along a subset of wave crests — not constant straight stripes.
        for(let k=0;k<4;k++){
          const sx=(((wy*.613+k*113+ship.x*-.25)%(w+90))+(w+90))%(w+90)-35;
          const worldX=sx+ship.x-w*.5;
          const waveY=sy+Math.sin(worldX*.022+phase)*amplitude;
          const length=14+4*k+settings.waveHeight*7;
          ctx.beginPath();ctx.moveTo(sx,waveY-1);
          ctx.quadraticCurveTo(sx+length*.45,waveY-5-settings.waveHeight*3,sx+length,waveY);
          ctx.strokeStyle="rgba(204,246,249,"+(0.09+settings.waveHeight*.09)+")";
          ctx.lineWidth=1.6+settings.waveHeight*.3;ctx.stroke();
        }
      }
      // Directional wind glints provide motion cues without simulating particles per pixel.
      ctx.lineWidth=1;
      for(let i=0;i<35;i++){
        const x=(((i*91.7+t*windDx*13-ship.x*.27)%(w+50))+(w+50))%(w+50)-25;
        const y=(((i*57.1-t*Math.cos(windRad)*13-ship.y*.27)%(h+50))+(h+50))%(h+50)-25;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+windDx*9,y-Math.cos(windRad)*9);
        ctx.strokeStyle="rgba(172,231,247,.12)";ctx.stroke();
      }
    }
    drawEffects(ctx,view){
      const {project}=view;
      for(const pulse of this.splashes){
        const {x,y}=project(pulse.x,pulse.y);
        const opacity=(1-pulse.age/3)*.66;
        if(opacity<=0)continue;
        ctx.strokeStyle="rgba(228,252,249,"+opacity+")";
        ctx.lineWidth=1.3+Math.max(0,1-pulse.age)*pulse.size;
        for(let ring=0;ring<3;ring++){
          const radius=(pulse.age*27+ring*8+2)*pulse.size;
          ctx.beginPath();ctx.ellipse(x,y,radius,radius*.58,0,0,Math.PI*2);ctx.stroke();
        }
      }
      for(const f of this.foam){
        const {x,y}=project(f.x,f.y);
        ctx.globalAlpha=clamp(1-f.age/f.life,0,1)*.7;
        ctx.fillStyle="#dffaff";
        ctx.beginPath();ctx.arc(x,y,f.size,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;
    }
  }
  window.AllAboardOcean=OceanField;
})();
