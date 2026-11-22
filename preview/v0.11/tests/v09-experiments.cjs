/* V0.9 regressions: favorite snapshot, grouped navigation, wind flag,
 * nonblocking live tutorial, water response and interactive repair.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {groups,groupFor}=require("../nav-ui.js");
const {steps}=require("../quick-tutorial.js");
const {RepairSequence}=require("../repair-mini.js");
const {flagPose}=require("../flag-motion.js");
const {LayoutStudio}=require("../ui-layout.js");
const OceanField=require("../ocean.js");
const base=path.join(__dirname,"..");
const preset=JSON.parse(fs.readFileSync(path.join(base,"presets/dor-loved-v08-mechanics.json"),"utf8"));
assert.equal(preset.settings.waveHeight,1.3);
assert.equal(preset.settings.waveDetail,36);
assert.equal(preset.settings.wavePush,1.7);
assert.equal(preset.settings.wakeStrength,1.4);
assert.equal(preset.settings.anchorLine,140);
assert.deepEqual(preset.hudLayout.items.headingHud,{x:-12,y:-12.5,scale:.65});
assert(fs.existsSync(path.join(base,"water/v0.8-ocean-snapshot.js")));
assert.equal(groups.flatMap(g=>g.tabs).length,17,"All 17 existing experiments must remain navigable");
assert.equal(new Set(groups.flatMap(g=>g.tabs)).size,17,"Every tab belongs to exactly one group");
assert.equal(groupFor("damage"),"combat");
assert.equal(groupFor("layout"),"create");
assert.equal(groupFor("ocean"),"play");
assert.equal(steps.length,5,"10s tutorial must expose 5 highlighted controls");
assert.deepEqual(steps.map(s=>s.target),
 ["wheelControl","sailControl","anchorControl","modeButton","headingHud"]);
const still=flagPose(10,35,0,0,.9);
const windy=flagPose(10,35,7,.7,.9);
const changedTime=flagPose(10,35,7,1.4,.9);
assert(windy.reach>still.reach,"Stronger wind increases cloth extension");
assert.notEqual(windy.flutter,changedTime.flutter,"Cloth must flutter in time");
assert.equal(flagPose(0,90,4,0,1).scaleX,1);
assert.equal(flagPose(0,270,4,0,1).scaleX,-1);
assert.equal(flagPose(0,90,4,0,0).flutter,0,"Attached mast edge must stay fixed");
const sequence=new RepairSequence();
assert(sequence.begin("sails",1000));
assert.equal(sequence.tap(0,1300).ok,false,"Wrong rivet cannot skip ahead");
assert.equal(sequence.tap(1,1500).finished,false);
assert.equal(sequence.tap(0,2000).finished,false);
const fixed=sequence.tap(2,2300);
assert.equal(fixed.finished,true);assert.equal(fixed.heal,35);assert.equal(fixed.cost,20);
assert.equal(sequence.tap(2).ok,false,"No repeated free repairs");
assert(sequence.begin("rudder",0));
sequence.tap(1,1000);sequence.tap(0,3000);
assert.equal(sequence.tap(2,6000).heal,25,"Slower but valid repair gives smaller reward");
const ocean=new OceanField();
ocean.setWaterMask((x,y)=>x>=0);
assert.equal(ocean.splash(-10,0,1),false,"No splashes on land");
assert.equal(ocean.splash(20,0,1),true);
ocean.step(.5);
assert.equal(ocean.rippleImpulseAt(-10,0,{rippleStrength:2}),0,"Land surface doesn't receive impulses");
assert(ocean.rippleImpulseAt(38,0,{rippleStrength:2})>0,"A splash disturbs neighboring sea cells");
assert.equal(ocean.rippleImpulseAt(38,0,{rippleStrength:0}),0,"Old baseline can disable reactive impulses");
const studio=new LayoutStudio();
studio.restore({format:"allaboard-ui-layout",version:2,items:{
 headingPill:{x:0,y:0,scaleX:1,scaleY:1,rotation:0,opacity:1,layer:5}
},appearance:{headingPill:{visible:false,borderWidth:2,borderColor:"#112233",
 background:"#334455",useBackground:true}}});
const appearance=studio.snapshot().appearance.headingPill;
assert.equal(appearance.visible,false,"Degrees meter can be hidden");
assert.equal(appearance.borderWidth,2);
assert.equal(appearance.background,"#334455");
assert.equal(appearance.useBackground,true);
studio.restore({format:"allaboard-ui-layout",version:1,items:preset.hudLayout.items});
assert.equal(studio.snapshot().items.headingHud.scaleX,.65,"Legacy favorite position survives");
assert.equal(studio.snapshot().appearance.headingPill.visible,true,"Legacy import gets safe defaults");
const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
for(const id of ["navGroups","navMechanic","quickTutorial","quickTutorialSkip","quickTutorialReplay",
 "layoutVisible","layoutBorderWidth","layoutBorderColor","layoutBackgroundColor","layoutUseBackground",
 "repairBegin","repairStatus","sailControlStyle","loadFavoritePreset","importMechanicsPreset"]){
 assert(html.includes('id="'+id+'"'),"Missing V0.9 UI: "+id);
}
console.log("PASS: favorite snapshot, nav, tutorial, cloth, repair sequence, reactive water and HUD appearance.");
