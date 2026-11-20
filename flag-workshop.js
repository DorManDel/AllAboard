/* All Aboard — Flag Workshop
 * Browser-only, dependency-free flag painter + photo / animated GIF preview.
 * Uploaded images never leave the device. GIFs stay DOM-based: Canvas.drawImage
 * only renders their poster/first frame, not an animated sequence.
 */
(function(root){
  "use strict";
  class FlagWorkshop {
    constructor(){
      this.mode="paint";
      this.mast="rear";
      this.text="AA";
      this.baseColor="#263f80";
      this.brushColor="#f5d68b";
      this.brushSize=1;
      this.erase=false;
      this.fileUrl=null;
      this.fileImage=null;
      this.fileType=null;
      this.paint=null;
      this.context=null;
      this.stroke=false;
      this.history=[];
      this.frame={x:0,y:0,angle:0};
    }
    element(id){return document.getElementById(id);}
    mount(){
      this.paint=this.element("flagPaintCanvas");
      this.context=this.paint.getContext("2d",{willReadFrequently:true});
      this.liveGif=this.element("flagGifOverlay");
      this.previewGif=this.element("flagPreviewGif");
      this.preview=this.element("flagPreviewCanvas");
      this.status=this.element("flagWorkshopStatus");
      this.textInput=this.element("flagCaption");
      this.baseInput=this.element("flagColor");
      this.colorInput=this.element("flagBrushColor");
      this.sizeInput=this.element("flagBrushSize");
      this.upload=this.element("flagUpload");
      this.fillBlank();
      this.bind();
      this.render();
    }
    fillBlank(){
      if(!this.context)return;
      const ctx=this.context;
      ctx.fillStyle=this.baseColor;
      ctx.fillRect(0,0,this.paint.width,this.paint.height);
      ctx.fillStyle="#edd7a7";
      const w=this.paint.width,h=this.paint.height;
      ctx.fillRect(Math.round(w/2)-1,Math.round(h/2)-7,2,14);
      ctx.fillRect(Math.round(w/2)-7,Math.round(h/2)-1,14,2);
    }
    snapshot(){
      if(!this.context||!this.context.getImageData)return;
      try{
        this.history.push(this.context.getImageData(0,0,this.paint.width,this.paint.height));
        if(this.history.length>18)this.history.shift();
      }catch(err){this.note("Undo history isn't supported by this browser.");}
    }
    note(message){
      if(this.status)this.status.textContent=message;
    }
    selectMode(mode){
      this.mode=mode;
      if(mode!=="gif"){
        this.liveGif.hidden=true;
        this.previewGif.hidden=true;
      }
      this.render();
    }
    clearFile(){
      if(this.fileUrl&&URL.revokeObjectURL)URL.revokeObjectURL(this.fileUrl);
      this.fileUrl=null;this.fileImage=null;this.fileType=null;
      if(this.liveGif){this.liveGif.removeAttribute("src");this.liveGif.hidden=true;}
      if(this.previewGif){this.previewGif.removeAttribute("src");this.previewGif.hidden=true;}
      if(this.upload)this.upload.value="";
    }
    setMast(mast){
      if(mast!=="front"&&mast!=="rear")return;
      this.mast=mast;
      this.render();
    }
    drawStroke(event){
      if(!this.context)return;
      const rect=this.paint.getBoundingClientRect();
      const px=Math.floor((event.clientX-rect.left)*this.paint.width/Math.max(1,rect.width));
      const py=Math.floor((event.clientY-rect.top)*this.paint.height/Math.max(1,rect.height));
      if(px<0||py<0||px>=this.paint.width||py>=this.paint.height)return;
      const size=this.brushSize;
      this.context.fillStyle=this.erase?this.baseColor:this.brushColor;
      this.context.fillRect(px-Math.floor(size/2),py-Math.floor(size/2),size,size);
      this.selectMode("paint");
    }
    async loadFile(file){
      if(!file)return;
      const accepted=["image/png","image/jpeg","image/webp","image/gif"];
      if(!accepted.includes(file.type)||file.size>3*1024*1024){
        this.note("Select a PNG, JPG, WebP or GIF under 3 MB.");return;
      }
      if(!root.URL?.createObjectURL){this.note("File previews are not supported by this browser.");return;}
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{
        this.clearFile();
        this.fileUrl=url;
        this.fileImage=img;
        this.fileType=file.type;
        this.mode=file.type==="image/gif"?"gif":"image";
        if(this.mode==="gif"){
          this.liveGif.src=url;
          this.previewGif.src=url;
          this.liveGif.hidden=false;
          this.previewGif.hidden=false;
        }
        this.note(this.mode==="gif"?
          "Animated GIF: attached to the selected mast using an HTML image overlay.":
          "Photo attached to the selected mast. Stored only for this browser session.");
        this.render();
      };
      img.onerror=()=>{
        URL.revokeObjectURL(url);
        this.note("Could not decode this image.");
      };
      img.src=url;
    }
    bind(){
      this.paint.addEventListener("pointerdown",event=>{
        this.snapshot();
        this.stroke=true;
        this.paint.setPointerCapture?.(event.pointerId);
        this.drawStroke(event);
        event.preventDefault();
      });
      this.paint.addEventListener("pointermove",event=>{
        if(!this.stroke)return;
        this.drawStroke(event);
        event.preventDefault();
      });
      for(const eventName of ["pointerup","pointercancel","lostpointercapture"])
        this.paint.addEventListener(eventName,()=>{this.stroke=false;});
      this.element("flagBrushColor").addEventListener("input",e=>{this.brushColor=e.target.value;});
      this.element("flagBrushSize").addEventListener("input",e=>{this.brushSize=Number(e.target.value);});
      this.element("flagEraser").addEventListener("click",()=>{
        this.erase=!this.erase;
        this.element("flagEraser").setAttribute("aria-pressed",String(this.erase));
        this.element("flagEraser").textContent=this.erase?"✎ Paint":"⌫ Eraser";
      });
      this.element("flagUndo").addEventListener("click",()=>{
        const last=this.history.pop();
        if(last){this.context.putImageData(last,0,0);this.selectMode("paint");}
      });
      this.element("flagFill").addEventListener("click",()=>{
        this.snapshot();
        this.context.fillStyle=this.baseColor;
        this.context.fillRect(0,0,this.paint.width,this.paint.height);
        this.selectMode("paint");
      });
      this.element("flagCaption").addEventListener("input",e=>{
        this.text=String(e.target.value).slice(0,3);
        this.selectMode("text");
      });
      this.element("flagColor").addEventListener("input",e=>{
        this.baseColor=e.target.value;
        if(this.mode==="text")this.render();
      });
      this.element("flagUpload").addEventListener("change",e=>this.loadFile(e.target.files?.[0]));
      this.element("flagClear").addEventListener("click",()=>this.reset());
      this.element("flagUsePaint").addEventListener("click",()=>{
        this.selectMode("paint");this.note("Your painted pixels are now displayed on the ship.");
      });
      this.element("flagUseMonogram").addEventListener("click",()=>{
        this.selectMode("text");this.note("Monogram is now displayed on the ship.");
      });
      for(const button of document.querySelectorAll("[data-flag-mast]"))
        button.addEventListener("click",()=>this.setMast(button.dataset.flagMast));
      this.element("flagExportPng").addEventListener("click",()=>this.exportPng());
    }
    reset(){
      this.clearFile();
      this.mode="paint";this.mast="rear";this.text="AA";
      this.baseColor="#263f80";this.brushColor="#f5d68b";
      this.history=[];this.erase=false;this.brushSize=1;
      this.element("flagCaption").value="AA";
      this.element("flagColor").value=this.baseColor;
      this.element("flagBrushColor").value=this.brushColor;
      this.element("flagBrushSize").value="1";
      this.element("flagEraser").textContent="⌫ Eraser";
      this.element("flagEraser").setAttribute("aria-pressed","false");
      this.fillBlank();this.render();
      this.note("Flag reset. Choose the mast and paint something new.");
    }
    exportPng(){
      if(!this.paint.toDataURL){this.note("PNG export not available here.");return;}
      const out=document.createElement("canvas");
      out.width=256;out.height=160;
      const ctx=out.getContext("2d");
      if(!ctx)return;
      ctx.imageSmoothingEnabled=false;
      this.paintPixels(ctx,0,0,256,160);
      const anchor=document.createElement("a");
      anchor.href=out.toDataURL("image/png");
      anchor.download="all-aboard-flag.png";
      document.body.append(anchor);anchor.click();anchor.remove();
      this.note("Exported PNG flag for a future Unity Sprite.");
    }
    paintPixels(ctx,x,y,w,h){
      if(this.mode==="gif"||this.mode==="image"){
        if(this.fileImage?.complete&&this.fileImage.naturalWidth){
          ctx.drawImage(this.fileImage,x,y,w,h);
        }
      }else if(this.mode==="text"){
        ctx.fillStyle=this.baseColor;ctx.fillRect(x,y,w,h);
        ctx.fillStyle="#fff2c8";
        ctx.font="bold "+Math.round(h*.52)+"px Arial";
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(this.text||"⚓",x+w/2,y+h*.53,w*.85);
      }else{
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(this.paint,x,y,w,h);
      }
    }
    render(){
      for(const button of document.querySelectorAll("[data-flag-mast]")){
        button.classList.toggle("active",button.dataset.flagMast===this.mast);
        button.setAttribute("aria-pressed",String(button.dataset.flagMast===this.mast));
      }
      const previewCtx=this.preview?.getContext("2d");
      if(previewCtx){
        previewCtx.clearRect(0,0,this.preview.width,this.preview.height);
        previewCtx.imageSmoothingEnabled=false;
        this.paintPixels(previewCtx,0,0,this.preview.width,this.preview.height);
      }
      if(this.previewGif)this.previewGif.hidden=this.mode!=="gif";
      if(this.liveGif)this.liveGif.hidden=this.mode!=="gif";
      this.element("flagCurrentMode").textContent=
        this.mode==="gif"?"Animated GIF":this.mode==="image"?"Photo":this.mode==="text"?"Monogram":"Pixel painting";
      this.element("flagMastStatus").textContent=this.mast==="front"?"Front mast":"Rear mast";
    }
    drawOnShip(ctx,ship={heading:0},settings={windDirection:0,windStrength:0},time=0){
      const poleY=this.mast==="front"?-28:18;
      ctx.save();
      ctx.strokeStyle="#553521";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,poleY+6);ctx.lineTo(0,poleY-26);ctx.stroke();
      const motion=root.AllAboardFlagMotion?.flagPose;
      const sample=t=>motion?
        motion(ship.heading,settings.windDirection,settings.windStrength,time,t):
        {x:25*t,y:Math.sin(time*4-t*8)*2*t,scaleX:1,reach:25};
      const originY=poleY-25;
      const base=sample(1),direction=base.scaleX||1;
      const height=17;
      // Seven adjacent textured strips: fixed mast edge, fluttering free edge.
      ctx.save();ctx.translate(2,originY);ctx.scale(direction,1);
      const source=this.preview,slices=7;
      for(let i=0;i<slices;i++){
        const p0=sample(i/slices),p1=sample((i+1)/slices);
        const x0=Math.abs(p0.x),x1=Math.abs(p1.x);
        const w=Math.max(1.4,x1-x0+.9);
        ctx.fillStyle=this.baseColor;ctx.fillRect(x0,p0.y,w,height-.6);
        if(this.mode!=="gif"&&source&&source.width){
          const sx=source.width*i/slices,sw=source.width/slices+1;
          ctx.drawImage(source,sx,0,sw,source.height,x0,p0.y,w,height);
        }
      }
      ctx.restore();ctx.restore();
    }
    positionGif(ship,sea,project){
      if(!this.liveGif||this.mode!=="gif"){if(this.liveGif)this.liveGif.hidden=true;return;}
      const p=project(ship.x,ship.y);
      const bob=Math.sin(sea.time*2.1+ship.x*.008)*sea.waveHeight*.7;
      const angle=(ship.heading+Math.sin(sea.time*1.3)*sea.waveHeight*.008*180/Math.PI)*Math.PI/180;
      const localX=14.5,localY=(this.mast==="front"?-28:18)-17;
      const x=p.x+Math.cos(angle)*localX-Math.sin(angle)*localY;
      const y=p.y+bob+Math.sin(angle)*localX+Math.cos(angle)*localY;
      this.liveGif.style.left=x.toFixed(2)+"px";
      this.liveGif.style.top=y.toFixed(2)+"px";
      const wind=root.AllAboardFlagMotion?.flagPose?.(
        ship.heading,sea.windDirection??0,sea.windStrength??0,sea.time,1);
      const sign=wind?.scaleX||1,flutter=wind?.flutter||0;
      this.liveGif.style.transform="translate(-50%,-50%) rotate("+
        angle+"rad) scaleX("+sign+") skewY("+(flutter*1.4)+"deg)";
      this.liveGif.hidden=false;
    }
    exportPreset(){
      try{
        // PNG/JPEG/paint and GIF are exported as a portable static PNG poster.
        // Original GIF animation needs the original user-owned file.
        return{
          format:"allaboard-flag-png",version:1,mast:this.mast,
          sourceMode:this.mode,png:this.preview?.toDataURL?.("image/png")||null,
          note:this.mode==="gif"?"Animated GIF exported as a still PNG poster; keep the original GIF separately.":"Portable static flag texture."
        };
      }catch(err){return{format:"allaboard-flag-png",version:1,mast:this.mast,png:null,note:"Flag export unavailable."};}
    }
    restorePreset(data){
      if(!data||data.format!=="allaboard-flag-png"||typeof data.png!=="string"||
         !data.png.startsWith("data:image/png;base64,"))return false;
      const img=new Image();
      img.onload=()=>{
        this.clearFile();this.fileImage=img;this.fileType="image/png";this.mode="image";
        this.setMast(data.mast==="front"?"front":"rear");this.render();
        this.note("Custom flag restored from saved preset.");
      };
      img.src=data.png;
      return true;
    }
    summary(){
      return{mode:this.mode,mast:this.mast,
        hasCustomImage:this.mode==="image"||this.mode==="gif",
        exportNote:"Source images stay local. Export a PNG or retain the original GIF separately."};
    }
  }
  root.AllAboardFlagWorkshop={FlagWorkshop};
  if(typeof module!=="undefined"&&module.exports)module.exports={FlagWorkshop};
})(typeof window!=="undefined"?window:globalThis);
