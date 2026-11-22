/* V0.10 contract tests — one sailing model, two standing controls, reversible HUD styling. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const {LayoutStudio}=require("../ui-layout.js");
const Vessel=require("../vessel.js");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"style.css"),"utf8");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
const legacy=JSON.parse(fs.readFileSync(path.join(root,"presets/dor-v07-original-layout.json"),"utf8"));
const studio=new LayoutStudio();
assert(studio.restore(legacy));
assert.equal(studio.snapshot().items.headingHud.x,-12,"Original user placement is not overwritten");
const oldV09={format:"allaboard-ui-layout",version:2,items:{sailControl:{x:4,y:-7,scaleX:1.1,scaleY:.85,rotation:2,opacity:.9,layer:15}},
 appearance:{sailControl:{visible:true,borderWidth:3,borderColor:"#ff8800",background:"#123456",useBackground:true}}};
assert(studio.restore(oldV09));
const a=studio.snapshot().appearance.sailControl;
assert.equal(a.borderEnabled,true,"Legacy border width stays enabled");
assert.equal(a.borderWidth,3);
assert.equal(a.backgroundEnabled,true);
assert.equal(a.useBackground,true);
assert.equal(a.backgroundStyle,"glass");
assert.equal(a.backgroundOpacity,.75);
studio.selected="sailControl";
studio.layout.sailControl.x=17.5;
studio.appearance.sailControl.borderEnabled=false;
studio.appearance.sailControl.backgroundEnabled=false;
studio.appearance.sailControl.borderRadius=23;
studio.appearance.sailControl.backgroundOpacity=.42;
studio.appearance.sailControl.backgroundStyle="gradient";
const restored=new LayoutStudio();restored.restore(studio.snapshot());
assert.deepEqual(restored.snapshot().appearance.sailControl,studio.snapshot().appearance.sailControl,
 "Appearance must survive V2 export/import");
assert.equal(restored.snapshot().items.sailControl.x,17.5,"Position persists independent of appearance");
const prev=JSON.stringify(restored.snapshot().items.sailControl);
restored.appearance.sailControl.visible=false;
restored.appearance.sailControl.borderEnabled=true;
assert.equal(JSON.stringify(restored.snapshot().items.sailControl),prev,"Appearance edits never mutate geometry");
restored.layout.sailControl.x=0;
assert.equal(restored.snapshot().appearance.sailControl.borderEnabled,true,"Geometry edits never mutate styling");
for(const id of ["layoutBorderEnabled","layoutBackgroundEnabled","layoutBorderRadius",
 "layoutBackgroundOpacity","layoutBackgroundStyle","layoutResetPosition","layoutResetAppearance",
 "sailSlider","sailTrimQuickSlider","sailControlStyle","sailHeightToggle",
 "recoilStrengthNumber","cameraShakeNumber","waveRollNumber","windFXNumber"])
 assert(html.includes('id="'+id+'"'),"V0.10 missing control "+id);
assert(/id="sailTrimQuickSlider"[^>]*orient="vertical"/.test(html),"Tilt slider must stand vertically");
assert(/id="sailSlider"[^>]*orient="vertical"/.test(html),"Sail area slider must stand vertically");
assert(/#sailControl #sailTrimQuickSlider[^]*writing-mode:vertical-lr/.test(css),"Tilt should use vertical CSS");
assert(app.includes('setSailControlStyle("toggle-tilt")'),"Default is Raise/Lower + standing manual tilt");
assert(app.includes('lastRaisedSailArea'),"Toggle remembers last positive sail area");
assert(!app.includes('pointerup",()=>tune("sailTrim",0)'),"Tilt must not spring to center on release");
assert(app.includes("sailControlMode,"),"Full mechanics preset includes chosen sail mode");
const s={x:0,y:0,vx:0,vy:0,heading:0,angularVelocity:0};
const anchor={down:false,phase:"raised"};
const control={rudder:0},current={x:0,y:0};
const tuning={sail:72,windStrength:4,windDirection:75,baseThrust:.1,
 windDrive:1,steerSensitivity:1,waterDrag:1,lateralDrag:5.5,yawResponse:3,
 sailAutoTrim:false,sailTrim:18.5};
Vessel.step(s,anchor,control,tuning,current,1/60);
assert.equal(s.sailTrim,18.5);
assert(s.trimFactor<=1&&s.trimFactor>=.15);
tuning.sailAutoTrim=true;
Vessel.step(s,anchor,control,tuning,current,1/60);
assert.equal(s.trimFactor,1,"Auto mode uses same physics model with ideal trim");
assert.equal(tuning.sailTrim,18.5,"Automatic tilt does not overwrite previous manual angle");
console.log("PASS: old UI presets, reversible appearance, independent resets, vertical sticky dual sail controls and shared wind physics.");
