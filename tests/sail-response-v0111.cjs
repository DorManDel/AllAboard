/* V0.11.1 — regression tests for manual sail trim, visual sign and thrust. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const Vessel=require("../vessel.js");
const {trimEfficiency}=require("../game-feel.js");
function simulate(trim,auto=false){
 const ship={x:0,y:0,vx:0,vy:0,heading:0,angularVelocity:0};
 const anchor={down:false,phase:"raised"};
 const settings={sail:72,sailTrim:trim,sailAutoTrim:auto,windDirection:90,
  windStrength:4,baseThrust:.1,windDrive:1,steerSensitivity:1,waterDrag:1,
  lateralDrag:5.5,yawResponse:3};
 Vessel.step(ship,anchor,{rudder:0},settings,{x:0,y:0},1/60);
 return ship;
}
const aligned=simulate(45),bad=simulate(-90),auto=simulate(-90,true);
assert.equal(aligned.idealTrim,45);
assert.equal(aligned.sailTrim,45);
assert.equal(aligned.trimFactor,1);
assert(bad.trimError>=130,"Incorrectly angled sail must have a large measurable error");
assert(bad.trimFactor<.35,"Poor trim must meaningfully cut sail force");
assert(aligned.driveAcceleration>bad.driveAcceleration*2,
 "Well-aligned sails should create at least double the drive from badly trimmed sails");
assert.equal(auto.sailTrim,45,"Auto should align rigging with the same target");
assert.equal(auto.trimFactor,1,"Auto trim should be optimal");
for(const trim of [-90,-45,0,45,90]){
 const actual=simulate(trim);
 const feel=trimEfficiency(0,90,trim,true);
 assert(Math.abs(actual.trimFactor-feel.bonus)<1e-12,
  "FX readout and vessel engine must use identical trim efficiency");
 assert.equal(actual.idealTrim,feel.desired);
}
assert(Math.abs(trimEfficiency(0,90,-90,true).bonus-.274479)<.002);
const app=fs.readFileSync(path.join(__dirname,"..","app.js"),"utf8");
assert(app.includes("const tilt=-rad(state.ship.sailTrim||0);"),
 "Top-down sail art must mirror the positive trim sign");
assert(app.includes("const previous=settings[name];"),
 "Sail haptic detents need the previous value, not new value vs itself");
assert(app.includes("Math.round(previous/10)!==Math.round(settings.sailTrim/10)"));
console.log("PASS: sign, trim response, auto mode, physics/FX agreement, sail haptic comparison.");
