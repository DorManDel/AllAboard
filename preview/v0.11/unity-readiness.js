/* All Aboard V0.7 Unity Readiness — architecture handoff and cautious YAML scan.
 * Nothing here claims to execute Unity Editor or repair a prefab.
 */
(function(root){
"use strict";
const groups={
 "movement":{files:["vessel.js","game-feel.js"],units:"lab-units / fixed dt",unity:"VesselMotion, VesselState, VesselTuning",contract:"Use the same forward/right dot-products and fixed-step integration. Presentation never writes velocity.",tests:"EditMode: tailwind thrust >= crosswind, headwind near zero, no lateral skate; PlayMode: hold wheel, sail and anchor."},
 "audio":{files:["audio-lab.js"],units:"AudioMixer dB and one-shot events",unity:"AudioDirector, AudioEventDefinition, MusicMood, AudioMixer",contract:"Gameplay emits semantic events, AudioDirector selects clips and priorities. Avoid direct AudioSource dependencies in combat code.",tests:"EditMode: event IDs defined and non-null; PlayMode: mute, pause, scene transition, rapid-fire cooldown and overlapping shots."},
 "cannon-feedback":{files:["game-feel.js","app.js"],units:"normalized shake intensity",unity:"CannonFeedback, ShipPosePresenter, CameraShake",contract:"Only trigger recoil when a real projectile fires. Drive camera/sprite recoil from short decaying envelopes; never teleport physics.",tests:"PlayMode: recoil returns to neutral, haptics optional, reduced-motion disables camera shake."},
 "sails":{files:["vessel.js","game-feel.js"],units:"degrees and normalized sail area",unity:"SailTrimController, SailVisual, SailPolar",contract:"Trim modifies sail efficiency modestly, with auto-trim default. Cloth visuals follow state without changing collision geometry.",tests:"EditMode: auto trim equals ideal and wrong trim never eliminates propulsion; PlayMode: visual yard rotates without moving hull."},
 "ocean":{files:["ocean.js","game-feel.js","world.js"],units:"wave height field / world coordinates",unity:"OceanField, OceanEventBus, VesselWavePose",contract:"Wave samples at bow/stern/port/starboard drive visual pitch/roll; each impact emits local ripple, mask to sea cells.",tests:"EditMode: zero wave -> zero pose, land emission rejected; PlayMode: heavy waves shake visually, no collision position jump."},
 "unity-quality":{files:["unity-readiness.js","tests/"],units:"Unity asset YAML text + editor tests",unity:"AssetAuditWindow, EditModeTests, PlayModeTests",contract:"Static scan is advisory; authoritative checks run in Unity Editor via AssetDatabase, PrefabUtility and Unity Test Framework.",tests:"No missing MonoBehaviour scripts, all scenes in Build Profiles, SafeAreaFitter, input targets and Android IL2CPP/ARM64 checks."}
};
function auditUnityText(source,filename="asset.prefab"){
 const problems=[];
 if(!/\.prefab$|\.unity$|\.asset$/i.test(filename))problems.push({severity:"info",text:"Unknown asset extension; YAML scan may not apply."});
 if(!source||typeof source!=="string")return[{severity:"error",text:"No readable YAML text provided."}];
 if(source.length>2_000_000)return[{severity:"error",text:"File exceeds the browser-only scan limit (2 MB)."}];
 if(!/^%YAML|^--- !u!/m.test(source))problems.push({severity:"warning",text:"Does not resemble text-serialized Unity YAML. Binary prefabs cannot be checked here."});
 const mono=[...source.matchAll(/^--- !u!114 &([0-9]+)/gm)];
 const missingScript=/m_Script:\s*\{fileID:\s*0(?:,\s*guid:\s*[^}]*)?\}/g;
 const bad=[...source.matchAll(missingScript)];
 for(const x of bad)problems.push({severity:"error",text:"MonoBehaviour script reference with fileID 0 (possible missing script).",line:source.slice(0,x.index).split("\n").length});
 if(/m_Enabled:\s*0/.test(source))problems.push({severity:"info",text:"Disabled components found; inspect intentionally disabled behaviours in Unity."});
 const zeroScale=[...source.matchAll(/m_LocalScale:\s*\{x:\s*0(?:\.0+)?,\s*y:\s*0(?:\.0+)?,\s*z:\s*0(?:\.0+)?\}/g)];
 if(zeroScale.length)problems.push({severity:"warning",text:"One or more transforms have scale 0,0,0."});
 if(/m_RootOrder:\s*-\d+/.test(source))problems.push({severity:"info",text:"Unusual negative root order appears; review hierarchy if relevant."});
 const gameObjects=[...source.matchAll(/^GameObject:\s*$/gm)].length;
 return {filename,gameObjects,monoBehaviours:mono.length,issues:problems,
  caveat:"Advisory scan only. Cannot resolve script GUIDs, missing materials or prefab instance links without the full Unity AssetDatabase."};
}
function handoff(plan){
 if(!plan)return"Choose a mechanic.";
 const parent=plan.id;
 const group=parent.includes("sail")?"sails":parent.includes("ocean")||parent.includes("water")?"ocean":
 parent.includes("cannon")||parent.includes("shot")?"cannon-feedback":
 parent.includes("audio")||parent.includes("music")?"audio":"movement";
 const spec=groups[group];
 return [
  "# All Aboard — Mechanic Implementation Contract",
  "Mechanic: "+plan.title,
  "Phase: "+plan.phase+" / "+plan.priority,
  "",
  "## Player experience",plan.player,
  "## Model / algorithm",plan.summary,
  "## Prototype evidence",plan.prototype,
  "## Core files",spec.files.join(", "),
  "## Unity components",plan.unity.join(", ")+"; "+spec.unity,
  "## Separation contract",spec.contract,
  "## Acceptance",...plan.acceptance.map(x=>"- "+x),
  "## Automated test candidates",spec.tests,
  "## Unity/Codex prompt",
  "Implement "+plan.title+" in the existing All Aboard Unity repository. Inspect the project first, follow current scene/prefab architecture and the course Milestone requirements. Keep scripts and variables minimal and well named. Build a single reusable mechanic, expose only necessary inspector fields, avoid per-frame allocations and unnecessary managers. Preserve controls, use FixedUpdate for physics and Update for presentation as appropriate. Add EditMode and PlayMode tests. Record exactly what changed in CHANGELOG.md and do not overwrite unrelated work. Ask before adding packages.",
  "",
  "Note: Browser prototype behavior is not automatically production-approved. Confirm with Dor and Eilon before porting."
 ].join("\n");
}
root.AllAboardUnityReadiness={groups,auditUnityText,handoff};
if(typeof module!=="undefined"&&module.exports)module.exports={groups,auditUnityText,handoff};
})(typeof window!=="undefined"?window:globalThis);
