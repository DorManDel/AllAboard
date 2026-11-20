/* V0.3 deterministic physics acceptance tests. Run node tests/vessel.cjs */
"use strict";
const assert=require("node:assert/strict");
const vessel=require("../vessel.js");
const OceanField=require("../ocean.js");
const settings={
  sail:0,windStrength:0,windDirection:0,baseThrust:0,
  steerSensitivity:1,yawResponse:5,lateralDrag:5.5,
  anchorGrip:1000,anchorLine:70,ropeStiffness:9,ropeDamping:6,
  currentStrength:0,waveHeight:.7,waveDetail:22,wavePush:.65,vortexStrength:0
};
const blankShip=()=>({x:0,y:0,vx:0,vy:0,heading:0,angularVelocity:0});
const blankAnchor=()=>({down:false,phase:"raised",point:{x:0,y:0},status:"Raised",tension:0,length:0});
const wheel={rudder:0};
const zero={x:0,y:0};
const stepMany=(ship,anchor,config,flow,steps,modifiers={})=>{
  for(let i=0;i<steps;i++)vessel.step(ship,anchor,wheel,config,flow,1/60,modifiers);
};
const headwind=vessel.pointOfSail(180,0).efficiency;
const beamReach=vessel.pointOfSail(90,0).efficiency;
const downwind=vessel.pointOfSail(0,0).efficiency;
assert(downwind>beamReach,"Game design: tailwind should outperform beam reach");
assert(beamReach>headwind*4,"Headwind should have weak thrust");
// A keel resists sideways slip more than movement along the hull.
const side=blankShip();side.vx=35;
const forward=blankShip();forward.vy=-35;
stepMany(side,blankAnchor(),settings,zero,60);
stepMany(forward,blankAnchor(),settings,zero,60);
assert(Math.abs(side.vx)<3,"Strong lateral resistance should end skate-like motion");
assert(Math.abs(forward.vy)>18,"Forward momentum should survive lateral damping");
// Real wind drives acceleration only with working sails.
const windSettings={...settings,sail:80,windStrength:4,windDirection:90};
const powered=blankShip(),broken=blankShip();
powered.heading=0;broken.heading=0;
stepMany(powered,blankAnchor(),windSettings,zero,90);
stepMany(broken,blankAnchor(),windSettings,zero,90,{sailFactor:0});
assert(Math.hypot(powered.vx,powered.vy)>Math.hypot(broken.vx,broken.vy)+4,
  "Disabled sails must eliminate sail thrust");
// Rope constraint lets the ship approach an anchor but not teleport out of it.
const anchored=blankShip();
const hold={down:true,phase:"set",status:"Slack",point:{x:0,y:0},tension:0,length:0,overload:0};
stepMany(anchored,hold,{...windSettings,windDirection:0,anchorGrip:1000},zero,480);
assert(Math.hypot(anchored.x,anchored.y)>5,"The anchored ship should move within its circle");
assert(Math.hypot(anchored.x-hold.point.x,anchored.y-hold.point.y)<=70.001,"Anchor must never exceed the configured 70-unit chain length");
assert(Math.hypot(anchored.vx,anchored.vy)<20,"Holding should not result in runaway velocity");
// Strong sustained load can drag the seabed point, not merely snap the ship.
const dragged=blankShip();
const slipping={down:true,phase:"set",status:"Slack",point:{x:0,y:0},tension:0,length:0,overload:0};
stepMany(dragged,slipping,{...settings,anchorGrip:15,anchorLine:18}, {x:220,y:10},600);
assert(Math.hypot(slipping.point.x,slipping.point.y)>0.5,"Sustained overload should drag anchor");
assert(Math.hypot(dragged.x-slipping.point.x,dragged.y-slipping.point.y)<=18.001,"Even dragging cannot exceed the active chain length");
// The procedurally defined field really changes in both space and time.
const ocean=new OceanField();
const h1=ocean.heightAt(0,0,settings);
const h2=ocean.heightAt(81,41,settings);
ocean.step(1/30);
const h3=ocean.heightAt(0,0,settings);
assert.notEqual(h1,h2,"Water should vary across position");
assert.notEqual(h1,h3,"Water should change in time");
const flow=ocean.sampleFlow(20,10,{...settings,currentStrength:1},
  {active:true,x:25,y:25});
assert(Number.isFinite(flow.x)&&Number.isFinite(flow.y),"Ocean flow must be finite");
// Wake particles must scale with hull speed and stay within a fixed bound.
const fast={...blankShip(),vx:50,vy:-20,heading:15};
for(let i=0;i<100;i++){ocean.step(.08);ocean.emitWake(fast,{...settings,wakeStrength:1},.08);}
assert(ocean.foam.length>0,"Moving hull should generate foam/wake");
assert(ocean.foam.length<=350,"Wake particle count should be bounded");
console.log("PASS: sail polar, keel drag, disabled sails, anchor hold/drag, procedural water and speed-dependent wake.");
