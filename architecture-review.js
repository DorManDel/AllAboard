/* Mechanic Architecture Reviews V0.7
 * A portable design contract is shown inside every existing mechanics tab.
 * Notes, verdict and Unity prompts are browser-local until exported/reviewed.
 */
(function(root){
"use strict";
const contracts={
  live:{concept:"All gameplay subsystems run from one shared ship state.",flow:"Input → VesselMotion (fixed step) → World and Ocean → visual/audio feedback",files:["app.js","vessel.js","ocean.js","world.js","feel-fx.js"],core:"simulate(dt), ShipFeedback.step()",unity:"ShipController orchestrates ShipMotionModel, WorldStreamer and OceanField; visuals subscribe to gameplay events. Keep input, physics and render layers independent.",tests:["Vary FPS without changing distances","Reset all subsystems without ghost effects"]},
  helm:{concept:"A centered ±1080° wheel maps smoothly to normalized rudder, with speed-dependent turn authority.",flow:"Wheel drag → rudder filter → hull yaw inertia → heading",files:["app.js","vessel.js"],core:"Vessel.step(ship, anchor, wheel, tuning, flow, dt)",unity:"Use one ShipSteering MonoBehaviour reading a normalized wheel input. Integrate yaw with Time.fixedDeltaTime, not frame-rate-dependent Update.",tests:["Slow vs fast rudder authority","One-thumb dragging and self-return"]},
  sails:{concept:"Wind-to heading determines propulsion; trim changes sail efficiency and visual angle.",flow:"Wind field + sail amount + trim → sail polar → thrust → hull velocity",files:["vessel.js","feel-fx.js","app.js"],core:"SailTrim.step(); Vessel.pointOfSail()",unity:"Create SailDefinition, SailTrim and SailVisual components; manual/auto trim should modify effective sail area with no additional permanent gameplay control.",tests:["Tailwind remains strongest","Manual trim penalty is bounded","Sails visibly lean without hiding the mast"]},
  anchor:{concept:"Anchor point and max chain length limit motion but still permit soft swing.",flow:"Drop anchor → tension solver → bounded chain → splash and audio",files:["vessel.js","ocean.js","app.js"],core:"Vessel.step() anchor force/constraint section",unity:"Implement AnchorState, AnchorChainSolver and AnchorVisual; use joint-like damped tension with hard length ceiling; prevent 142/140 overshoot.",tests:["Anchor remains <= max length","Strong current moves ship within radius","Raise re-enables sailing"]},
  ocean:{concept:"One procedural water field produces waves and small environmental reactions.",flow:"Wind + time + position → Ocean.heightAt → visual color / boat bob / wake FX",files:["ocean.js","world.js","feel-fx.js"],core:"OceanField.heightAt(), isWater(), drawEffects()",unity:"Build OceanField.SampleHeight world-space API plus separate rendering and pooled ripple emitters. Land mask excludes beach/solid island polygons.",tests:["Ripple does not cover land","Water baseline can be restored","Mobile frame-time guardrails"]},
  world:{concept:"The world is deterministic by seed, chunk coordinate and generation version.",flow:"seed + chunk(x,y) → stable island/POI IDs → streaming and mini-map",files:["world.js","map-explorer.js"],core:"WorldEngine.createChunk() and WorldEngine.nearbyObjects()",unity:"Keep WorldGenerator pure, ChunkStreamer bounded, WorldObjectState stable; map queries should never mutate live chunk cache.",tests:["Same seed yields same POIs","Collected treasure stays collected","Map browsing leaves world cache unchanged"]},
  damage:{concept:"Shots damage capabilities, not just one global HP bar.",flow:"Projectile contact → impact footprint → ship modules → gameplay consequences",files:["app.js","mechanic-catalog.js"],core:"DamageResolver concept; real projectile path not yet implemented",unity:"Use ShipModuleHealth + DamageResolver; broken sails reduce propulsion, broken cannons stop firing and repairs have explicit cost.",tests:["Disabled module cannot act","Area damage respects hit pattern","Repair restores visual and behavior"]},
  encounter:{concept:"Friendly encounters can lead to reputation and follower friendships.",flow:"ship proximity + mode → encounter choice → relationship ledger",files:["app.js","mechanic-catalog.js"],core:"renderEncounter() and relationship design catalog",unity:"Use EncounterCoordinator, ReputationLedger and FollowerCoordinator; award per unique friend, avoid farming.",tests:["Reputation awarded once","Friendly mode never auto-damages an ally"]},
  shipyard:{concept:"Ship parts define appearance plus bounded mechanical tradeoffs.",flow:"Select rig/hull/cannon part → stats and rendering",files:["app.js","flag-workshop.js"],core:"selectPart(), drawNativeShip()",unity:"Serialize part IDs and stats in ScriptableObjects. Use separate cosmetic flag textures that don't change physics.",tests:["Swap preserves valid save","Stats match selected ship pieces"]},
  ideas:{concept:"Keep non-core experiments in an explicit list, not the active Unity milestone.",flow:"Idea → proposal → quick test → review → approved C# task",files:["app.js","mechanic-catalog.js"],core:"ideasCatalog",unity:"Choose one mechanic at a time, write acceptance criteria and confirm with Eilon before opening Jira implementation.",tests:["No automatic Unity merge"]},
  review:{concept:"Human approval gates the move from browser lab to production.",flow:"Experiment → measured result → Keep/Refine/Later → Unity handoff",files:["mechanics-review.js","roadmap-board.js"],core:"MechanicsReview.exportMarkdown()",unity:"Include tested behavior, known limitations and rollback plan in CHANGELOG before porting.",tests:["No mechanic Keep by default"]},
  loop:{concept:"Complete a stage objective, then cash out or stay at higher risk.",flow:"Objective → reward → Stay/Leave → checkpoint / risk wave",files:["stage-loop.js"],core:"StageSession.completeObjective(), cashOut(), stay(), resume()",unity:"Use StageSession, ObjectiveDirector, RiskRewardController and RunSaveData. Preserve guaranteed rewards on defeat.",tests:["No duplicate reward","Stay increases danger and bonus","Resuming preserves cleared objective"]},
  planner:{concept:"Mechanic specs map into a local Kanban and Jira-ready handoff.",flow:"Catalog → selection → notes + task status → export",files:["mechanic-catalog.js","roadmap-board.js"],core:"KanbanStore.exportMarkdown()",unity:"Approved tasks become Jira stories with references to lab presets; no direct browser access token.",tests:["Board remains local","JSON export/import works"]},
  layout:{concept:"HUD controls can be tuned by touch then converted to Unity anchors.",flow:"Select HUD component → normalized offsets + scale → JSON layout",files:["ui-layout.js"],core:"LayoutStudio.apply(), snapshot(), restore()",unity:"Map normalized offsets to RectTransforms and SafeAreaFitter; test portrait notches and one-thumb reach.",tests:["Edit mode blocks game input","Numeric offsets bounded","JSON round-trip"]},
  feel:{concept:"Waves, cannon recoil, camera impulses and sail trim are visual/game-feel layers.",flow:"Ocean height samples + events → ShipFeedback → ship art and filtered camera",files:["feel-fx.js","app.js"],core:"ShipFeedback.step(), fire(); SailTrim.step()",unity:"Separate Rigidbody2D ship motion from ShipVisualFeedback; roll/bob and recoil should never alter colliders. Use Cinemachine impulse or bounded camera offsets.",tests:["Wave response scales with waveHeight","Recoil decays","No authoritative position jitter","Trim efficiency bounded"]},
  audio:{concept:"Gameplay events drive SFX and mood music via a replaceable audio layer.",flow:"GameEvent → AudioDirector → cue ID / mixer bus → AudioSource",files:["audio-lab.js"],core:"AudioDirector.play(), startMood(), stop()",unity:"Create AudioCue ScriptableObjects, AudioDirector and AudioMixer groups (Music/SFX/Ambience). Keep file/license provenance; enable audio only after user choice.",tests:["No audio before gesture","Sounds have gain limits","Different moods map to events"]},
  qa:{concept:"Static asset validation catches missing links before runtime tests.",flow:"Unity files → parse metadata/prefab YAML → findings → Unity Editor EditMode verification",files:["unity-qa.js","unity-handoff/AllAboardPrefabAudit.cs"],core:"UnityQA.inspect()",unity:"Put the editor validator under Assets/Editor and run EditMode tests on an actual Unity checkout. Browser validation is advisory only.",tests:["Missing script GUID flagged","Duplicate .meta GUIDs flagged","No false blanket failure for package refs"]}
};
const generic={concept:"Experiment with a small, understandable mechanic and test it before Unity integration.",flow:"Player action → state update → feedback → acceptance test",files:["app.js"],core:"Standalone lab update",unity:"Implement an isolated C# component; never copy browser DOM logic to Unity.",tests:["One-thumb readability","Repeatable tests and notes"]};
class ContractReview{
  constructor(){this.records={};this.current="live";}
  $(id){return document.getElementById(id);}
  mount(){
    if(!document.querySelector(".panel"))return;
    try{this.records=JSON.parse(localStorage.getItem("allaboard-contract-review-v1")||"{}");}catch(err){this.records={};}
    for(const panel of document.querySelectorAll(".panel")){
      const id=panel.dataset.panel,contract=contracts[id]||generic;
      const wrap=document.createElement("section");wrap.className="contract-review";
      const heading=document.createElement("h3");heading.textContent="⌘ Architecture & Unity Handoff";wrap.append(heading);
      const help=document.createElement("p");help.textContent=
        "Quick post-test review: design → core code → acceptance → C# prompt. Approval is manual.";
      wrap.append(help);
      const details=document.createElement("details"),summary=document.createElement("summary");
      summary.textContent="How this mechanic works · Code · Unity conversion";
      details.append(summary);
      const add=(title,text)=>{
        const section=document.createElement("div");section.className="contract-section";
        const label=document.createElement("strong");label.textContent=title;
        const body=document.createElement("p");body.textContent=text;
        section.append(label,body);details.append(section);
      };
      add("Concept",contract.concept);add("System flow",contract.flow);
      add("Primary code",contract.files.join(", ")+" · "+contract.core);
      add("Unity implementation prompt",contract.unity);
      add("Acceptance tests",contract.tests.map((t,i)=>(i+1)+". "+t).join("\n"));
      wrap.append(details);
      const row=document.createElement("div");row.className="contract-review-row";
      const select=document.createElement("select");
      select.setAttribute("aria-label","Mechanic review decision");
      for(const v of ["Test","Refine","Keep","Later","Reject"]){
        const option=document.createElement("option");option.value=v;option.textContent=v;select.append(option);
      }
      select.value=this.records[id]?.status||"Test";
      const note=document.createElement("textarea");note.rows=2;note.maxLength=1200;
      note.placeholder="What worked? What felt wrong? What needs Unity?";
      note.setAttribute("aria-label","Mechanic architecture review notes");
      note.value=this.records[id]?.note||"";
      const button=document.createElement("button");button.textContent="↓ Export this Unity handoff";
      button.className="outline-button";
      const save=()=>{
        this.records[id]={status:select.value,note:note.value,updated:new Date().toISOString()};
        try{localStorage.setItem("allaboard-contract-review-v1",JSON.stringify(this.records));}catch(err){}
      };
      select.addEventListener("change",save);note.addEventListener("input",save);
      button.addEventListener("click",()=>{
        const c=contracts[id]||generic;const r=this.records[id]||{status:"Test",note:""};
        const lines=["# Unity handoff — "+id,"","**Decision:** "+r.status,"","## Intent",c.concept,
          "","## System flow",c.flow,"","## Main code",...c.files.map(x=>"- "+x),
          "","**Entry:** "+c.core,"","## Unity prompt",c.unity,
          "","## Acceptance tests",...c.tests.map(t=>"- [ ] "+t),
          "","## Playtest notes",r.note||"No notes yet",
          "","Needs approval by Dor/Eilon before changing the real Unity repository."];
        const blob=new Blob([lines.join("\n")],{type:"text/markdown"});
        const url=URL.createObjectURL(blob),a=document.createElement("a");
        a.href=url;a.download="all-aboard-unity-"+id+".md";document.body.append(a);a.click();a.remove();
        root.setTimeout(()=>URL.revokeObjectURL(url),500);
      });
      row.append(select,button);
      wrap.append(row,note);panel.append(wrap);
    }
  }
}
root.AllAboardArchitecture={contracts,ContractReview};
if(typeof module!=="undefined"&&module.exports)module.exports={contracts,ContractReview};
if(typeof document!=="undefined"){
  const boot=()=>new ContractReview().mount();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
}
})(typeof window!=="undefined"?window:globalThis);
