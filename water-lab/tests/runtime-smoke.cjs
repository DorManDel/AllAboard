/* Water Lab browser startup smoke with a minimal Canvas/DOM test double. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const base=path.join(__dirname,"..");
const Core=require("../water-core.js");
const calls={frames:[],draws:0};
const ctx={};
for(const method of ["clearRect","drawImage","translate","rotate","beginPath","moveTo","lineTo","bezierCurveTo","closePath","fill","stroke","save","restore","arc","fillRect"]){
 ctx[method]=()=>{if(method==="drawImage")calls.draws++};
}
ctx.createImageData=(w,h)=>({data:new Uint8ClampedArray(w*h*4)});
ctx.putImageData=()=>{};
function node(id=""){
 const listeners={};
 const n={id,tagName:"DIV",style:{},value:"",textContent:"",width:720,height:540,
  dataset:{},append(){},appendChild(){},click(){},addEventListener(e,f){(listeners[e]??=[]).push(f)},
  getContext(){return ctx},setPointerCapture(){},getBoundingClientRect(){
   return {left:0,top:0,width:360,height:450}
  },classList:{toggle(){},add(){},remove(){}},_listeners:listeners
 };
 return n;
}
const nodes=new Map();
const get=id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)};
const layers=["beauty","coarse","fine","wave","ripple","height"].map(s=>{const n=node();n.dataset.layer=s;return n});
const events=["cannon","anchor","sink"].map(s=>{const n=node();n.dataset.event=s;return n});
const document={
 getElementById:get,
 createElement:()=>node(),
 querySelectorAll:q=>q==="[data-layer]"?layers:q==="[data-event]"?events:[],
 body:node("body"),activeElement:node("body")
};
const window={AllAboardWaterLab:Core,devicePixelRatio:1,
 addEventListener(){},matchMedia:()=>({matches:false})};
const code=fs.readFileSync(path.join(base,"water-lab.js"),"utf8");
vm.runInNewContext(code,{window,document,performance:{now:()=>10},
 requestAnimationFrame:cb=>calls.frames.push(cb),Blob:class{},URL:{createObjectURL:()=>"",revokeObjectURL(){}},
 setTimeout(){}},{timeout:3000});
assert.equal(calls.frames.length,1,"Render loop should schedule first frame");
for(const [i,time] of [0,16.7,40].entries()){
 const callback=calls.frames.shift();assert.equal(typeof callback,"function");
 callback(time);
}
assert(calls.draws>=3,"Canvas must draw frame");
const fire=(n,event,arg)=>{for(const fn of n._listeners[event]||[])fn(arg)};
fire(events[0],"click",{});
const callback=calls.frames.shift();callback(66.7);
assert(get("events").textContent.includes(" / 28"),"Bounded event readout should update");
fire(layers[1],"click",{});
assert(get("layerInfo").textContent.includes("NOISE A"));
fire(get("reset"),"click",{});
fire(get("pause"),"click",{});
assert(get("pause").textContent.includes("Resume"));
// A finger on empty water must never generate a game-water impulse.
const beforeTap=window.AllAboardWaterLabUI.getSnapshot().events.length;
const canvas=get("waterCanvas");
for(const cb of canvas._listeners.pointerdown||[])cb({clientX:3,clientY:3,pointerId:1});
assert.equal(window.AllAboardWaterLabUI.getSnapshot().events.length,beforeTap,
 "Pointer inspection must not create tap ripples");
console.log("PASS: browser lab startup, 4 Canvas frames, event buttons, layer toggle and pause.");
