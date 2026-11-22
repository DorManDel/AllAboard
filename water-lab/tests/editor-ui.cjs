/* Water Editor v0.2: minimal browser DOM smoke. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const core=require("../water-core.js");
const nodes=new Map(),blobs=[],timers=[];
function node(){const listeners={};const n={children:[],textContent:"",value:"",style:{},classList:{add(){},remove(){}},
append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)},prepend(item){this.children.unshift(item)},
replaceChildren(...items){this.children=[...items]},removeChild(item){this.children.splice(this.children.indexOf(item),1)},
get lastElementChild(){return this.children[this.children.length-1]},remove(){},setAttribute(k,v){this[k]=v},
addEventListener(kind,cb){(listeners[kind]??=[]).push(cb)},click(){for(const fn of listeners.click||[])fn({target:this})},
_listeners:listeners};return n}
const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
const document={getElementById:get,createElement:node,body:node(),hidden:false};
const state={seed:2026,layers:core.defaultLayers(),time:3.5,settings:{...core.defaults}};
const ui={getTime(){return state.time},setSeed(v){state.seed=v},setLayers(v){state.layers=v},
getSnapshot(){return {format:"allaboard-water-lab",version:2,settings:{...state.settings,seed:state.seed},layers:state.layers,
time:state.time,boat:{x:0,y:0},events:[],trail:[],preset:"classic",quality:"balanced",view:"beauty"}},
setSnapshot(x){Object.assign(state,x);state.seed=x.settings.seed}};
get("fps").textContent="60";get("cpu").textContent="4.5";get("resolution").textContent="80 x 60";get("events").textContent="0 / 28";
const window={AllAboardWaterLab:core,AllAboardWaterLabUI:ui,location:{search:"?seed=31415"},
crypto:{getRandomValues(a){a[0]=999}}};
const env={window,document,URLSearchParams,setTimeout(){},setInterval(fn){timers.push(fn)},
Blob:class{constructor(parts){this.parts=parts}},URL:{createObjectURL(b){blobs.push(b);return "blob:mock"},revokeObjectURL(){}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","water-editor.js"),"utf8"),env,{timeout:3000});
assert.equal(get("layerStack").children.length,7);assert.equal(state.seed,31415);
const first=get("layerStack").children[0];first.children[0].children[0].click();
assert.equal(state.layers.foam.enabled,false);
get("layerStack").children[0].children[0].children[2].click();
assert.equal(state.layers.foam.solo,true);
get("waterSeed").value="1982";for(const f of get("waterSeed")._listeners.change||[])f({target:get("waterSeed")});
assert.equal(state.seed,1982);
get("export").click();const saved=JSON.parse(blobs.at(-1).parts.join(""));
assert.equal(saved.settings.seed,1982);assert.equal(saved.layers.foam.solo,true);
timers[0]();assert(get("liveLog").children.length>0);
get("logClear").click();assert.equal(get("liveLog").children.length,0);
console.log("PASS: V0.2 editor builds seven controls, toggles eye/solo, saves seed/JSON and live logs.");
