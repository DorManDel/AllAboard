/* V0.11: phone fullscreen, distinct haptics, full sail alignment, continuous wind flag. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const {HapticController,patterns}=require("../haptics.js");
const {FullscreenPlay}=require("../fullscreen-play.js");
const {flagPose}=require("../flag-motion.js");
const Vessel=require("../vessel.js");
const calls=[];
let now=1000;
const h=new HapticController({vibrate(x){calls.push(x);return true;}},()=>now);
assert.equal(h.supported,true);
assert.equal(h.play("shot"),true);
assert.deepEqual(calls.at(-1),patterns.shot);
assert.equal(h.play("shot"),false,"Repeated shot event should be throttled");
now+=250;
h.setScale(2);
assert.equal(h.play("hit"),true);
assert.equal(calls.at(-1)[0],180,"Haptic duration multiplier is not motor amplitude");
h.setEnabled(false);
assert.equal(h.play("anchorDrop"),false);
assert.deepEqual(calls.at(-1),0,"Disabling haptics cancels active vibration");
const unsupported=new HapticController({});
assert.equal(unsupported.supported,false);
assert.equal(unsupported.play("test"),false);
assert.match(unsupported.status(),/Unavailable/);
const rejected=new HapticController({vibrate(){return false;}});
assert.equal(rejected.play("test"),false);
assert.match(rejected.status(),/rejected/);
h.setEnabled(true);
now+=1000;
assert.equal(h.play([10,20,15]),true,"Legacy vibration calls remain compatible");
const ship={x:0,y:0,vx:0,vy:0,heading:0,angularVelocity:0};
const anchor={down:false,phase:"raised"};
const settings={sail:72,sailTrim:90,sailAutoTrim:false,windDirection:90,windStrength:4,baseThrust:.1,windDrive:1,
 steerSensitivity:1,waterDrag:1,lateralDrag:5.5,yawResponse:3};
Vessel.step(ship,anchor,{rudder:0},settings,{x:0,y:0},1/60);
assert.equal(ship.sailTrim,90,"Full 90-degree yard trim must be supported by vessel physics");
settings.sailTrim=-90;
Vessel.step(ship,anchor,{rudder:0},settings,{x:0,y:0},1/60);
assert.equal(ship.sailTrim,-90);
const nearLeft=flagPose(0,179,5,0.4,1).scaleX;
const nearRight=flagPose(0,181,5,0.4,1).scaleX;
assert(Math.abs(nearLeft-nearRight)<.12,"Flag width must collapse near direction crossing, not flip full-width");
assert.equal(flagPose(0,90,5,0,1).scaleX,1);
assert.equal(flagPose(0,270,5,0,1).scaleX,-1);
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"style.css"),"utf8");
for(const id of ["playtestFullscreen","playtestExit","phoneScreen","hapticToggle","hapticTest","hapticStop","hapticDuration","hapticCapability"]){
 assert(html.includes('id="'+id+'"'),"Missing UI element "+id);
}
assert(/id="sailTrimQuickSlider"[^>]*min="-90" max="90"/.test(html));
assert(/id="sailTrim"[^>]*min="-90" max="90"/.test(html));
assert(css.includes("#phoneScreen:fullscreen"),"Actual native fullscreen must fill viewport");
assert(css.includes("body.allaboard-play-focus"),"CSS fallback for mobile unsupported browsers");
assert(css.includes("::-webkit-slider-thumb"),"Large rope handle must have a touch-friendly thumb");
const state={classes:new Set(),style:{}};
const node=(id)=>({
 id,hidden:true,style:{},classList:{toggle(c,v){if(v)state.classes.add(c);else state.classes.delete(c);}},
 setAttribute(k,v){this[k]=v;},events:{},addEventListener(type,cb){this.events[type]=cb;},
 textContent:"",requestFullscreen:undefined
});
const elements=Object.fromEntries(["phoneScreen","playtestExit","playtestFullscreen","playtestStatus"].map(id=>[id,node(id)]));
const body={classList:{toggle(c,v){if(v)state.classes.add(c);else state.classes.delete(c);}}};
const doc={getElementById:id=>elements[id],body,fullscreenElement:null,addEventListener(){}};
global.document=doc;
const focus=new FullscreenPlay();
focus.render=FullscreenPlay.prototype.render;
focus.enter();
assert.equal(focus.active,true);
assert.equal(focus.native,false,"No native API should fall back to viewport focus");
assert.equal(elements.playtestExit.hidden,false);
assert(state.classes.has("allaboard-play-focus"));
focus.exit();
assert.equal(focus.active,false);
assert.equal(elements.playtestExit.hidden,true);
delete global.document;
console.log("PASS: fallback fullscreen, large sail control, ±90° physics, continuous flag and haptic event capability/cooldowns.");
