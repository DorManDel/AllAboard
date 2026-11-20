/* All Aboard Mechanics Review — keep/refine/test/later/reject decisions.
 * Local browser notes, exported as an implementation brief for Eilon.
 */
(function(root){
"use strict";
const catalog=[
["helm","Steering / Helm","Core","ShipMotionModel, WheelInputUI","Stable turn control, return-to-center, no sideways skating"],
["sails","Sails / Wind","Core","SailController, WindField","Meaningful heading-to-wind behavior and visible furling"],
["anchor","Anchor / Chain","Core","AnchorController, RopeConstraint","No snapping, clear slack-to-taut behavior"],
["unified-anchor-chain","Unified Anchor + Adjustable Chain","Core","AnchorControlView, RopeConstraint","One grouped HUD control, gradual reeling and integrated tension display"],
["grouped-navigation","Phone/Desktop Lab Navigation","Core","MechanicsLabNavigation","No long sideways tab scrolling; all 17 mechanics accessible"],
["wind-flag-animation","Wind-Driven Custom Flag","Core","ShipFlagPresenter","Wind-relative flutter and mast attachment, PNG preset poster"],
["reactive-water-impulses","Reactive Procedural Water","Core","OceanField, OceanImpulse","Local splash/wake height ripple; land masked; baseline preserved"],
["guided-quick-tutorial","10-second Live Control Tutorial","Core","TutorialCoach, ControlHighlight","Five glowing live controls, wheel arrows, skip/replay"],
["quick-rivet-repair","Interactive Repair Test","After Core","RepairMiniGame, ModuleHealth","Three ordered rivets, 20 coins, actual condition recovery"],
["ocean","Procedural Water Engine","Core","OceanField, SplashEmitter","Reactive water and speed-dependent wake at phone frame rates"],
["world","Seeded Endless World","Core","WorldGenerator, ChunkStreamer","Same seed and location generate same island/ship/treasure contents"],
["friend","Friendly / Aggressive Toggle","Core","EncounterCoordinator","Mode has clear meaning and affects actions"],
["damage","Spatial Damage / Repair","Combat","ShipHealth, DamageResolver","Module damage affects ship; fire and leaks advance each turn"],
["cannons","Auto Cannons","Combat","BroadsideController","Aiming by positioning, without an aim button"],
["perfect","Perfect Broadside","Later","BroadsideAccuracyRule","Optional reward for accurate placement"],
["shipyard","Pimp My Ship","Customization","ShipLoadout, ShipPartView","Stats and shapes genuinely change behavior"],
["flag","Flag Workshop","Customization","ShipFlagView, FlagTextureImporter","Flag is mast-attached and importable as texture"],
["treasure","Treasure / Pickup","World","TreasurePickup, WorldObjectState","Collect once per world seed, no duplication"],
["kraken","Secret Kraken","Later","KrakenEncounter","Rare, avoidable and readable world event"],
["intercept","Intercept / Catch Ship","After Core","InterceptObjective","Predict an NPC's future trajectory"],
["rescue","Rescue / Escort","After Core","EscortObjective","Assist a friend during a hazard"],
["fleet","Sail Together / Ally Fleet","After Core","AllyShipCoordinator","Allies follow without blocking player"],
["stage-loop","Eilon Stage + Endless Stay/Leave Loop","Core","StageSession, ObjectiveDirector","Finish stage objective, optionally stay for harder waves and better loot"],
["stage-save","Resume Same-Stage Checkpoint","Core","RunCheckpointService","Preserve banked loot and finished objective when leaving"],
["tutorial10","Ten-Second First-Run Tutorial","Core","TutorialSequence","Steer, sail, auto-cannon and stay/leave in ten seconds"],
["cannon-trajectory","Cannonball Flight Paths","Combat","ProjectileMotor, HitResolver","Cannon shells travel visibly; no instant-hit teleports"],
["ammo-variety","Barrels / Chain Shot / Chicken Ammo","After Core","AmmoDefinition, ProjectileEffect","Different ammo creates tactical trade-offs with no extra real-time controls"],
["popularity","Popularity / Reputation","After Core","ReputationService, RelationshipLedger","Each unique friendship increases meaningful reputation without farming"],
["followers","Friendly Follower Ships","After Core","FollowerCoordinator, AllyDefenseRule","Befriended ships follow and assist without automatically winning fights"],
["kraken-arms","Kraken Tentacle Coordination","After Core","KrakenBrain, ArmCoordinator, ArmController","Eight local arm states react with a shared controller and readable attacks"],
["slow-sailing","Wind-Driven Sailing V0.6","Core","VesselTuning, SailPolar, VesselMotion","Slow natural acceleration, tailwind-first boost, speed-dependent rudder and measured phone feel"],
["hud-layout","Editable HUD / Touch Layout","Core","HUDLayoutPreset, ResponsiveControlAnchors","Thumb-friendly on mobile; export normalized positions and scale for Unity"],
["expanded-map","POI Map & Faction Heat Layers","World","WorldMapPresenter, WorldPOIQuery","Explore seeded islands and selective faction layers without changing live chunk simulation"],
["coastline-mask","Water/Land Mask & Reactive Shoreline","Core","WorldSurfaceMask, OceanEffectClipper","Water foam and ripple paths stay off land; no visual leaks across sand"],
["kraken-grapple","Kraken Grapple & Shoot-to-Release","After Core","KrakenBrain, ArmCoordinator, ArmState","Visible warning, bounded tentacle grab, auto-cannon release and fair escape"],
["cannon-recoil","Cannon Recoil & Impact Feedback","Core","BroadsideFeedback, ShipPosePresenter","Short decaying recoil, ship feedback and audio"],
["sail-tilt","Sail Yard Tilt & Auto Trim","Core","SailTrimController, SailRigView","Optional trim adds skill while auto trim stays playable"],
["wave-rock","Wave-Driven Ship Motion","Core","WavePoseSampler, ShipPosePresenter","Bob, roll and pitch from OceanField samples"],
["audio-moods","Original Pirate Music & SFX","Core","AudioDirector, AudioMixer, MusicMood","Audio event contracts, distinct moods, licensing ledger"],
["unity-health","Unity Prefab Audit & Test Framework","Core","PrefabAuditWindow, EditModeTests, PlayModeTests","Unity Editor test report is authoritative, browser scan advisory"],
["enemy-tells","Enemy Attack Telegraphs","After Core","EnemyIntentPresenter","Readable attacks without permanent extra buttons"],
["boarding-puzzle","Optional Short Boarding Puzzle","After Core","BoardingMiniGame","Five to ten second skill challenge, skip allowed"]
].map(([id,title,group,unity,criteria])=>({id,title,group,unity,criteria}));
const values=["keep","refine","test","later","reject"];
class MechanicsReview{
  constructor(){
    this.entries={};
    for(const c of catalog)this.entries[c.id]={status:c.group==="After Core"||c.group==="Later"?"later":"test",notes:""};
  }
  mount(){
    this.container=document.getElementById("mechanicsReviewList");
    if(!this.container)return;
    try{
      const saved=JSON.parse(localStorage.getItem("allaboard-review-v1")||"{}");
      for(const [id,v] of Object.entries(saved))
        if(this.entries[id]&&values.includes(v.status))
          this.entries[id]={status:v.status,notes:String(v.notes||"").slice(0,800)};
    }catch(e){}
    document.getElementById("reviewExport").addEventListener("click",()=>this.download());
    document.getElementById("reviewReset").addEventListener("click",()=>{this.reset();this.render();});
    this.render();
  }
  reset(){
    for(const c of catalog)this.entries[c.id]={status:c.group==="After Core"||c.group==="Later"?"later":"test",notes:""};
    this.save();
  }
  save(){try{localStorage.setItem("allaboard-review-v1",JSON.stringify(this.entries));}catch(e){}}
  summary(){
    const result={keep:0,refine:0,test:0,later:0,reject:0};
    for(const e of Object.values(this.entries))result[e.status]++;
    return result;
  }
  render(){
    this.container.innerHTML="";
    for(const group of ["Core","World","Combat","Customization","Later","After Core"]){
      const groupCatalog=catalog.filter(c=>c.group===group);
      if(!groupCatalog.length)continue;
      const heading=document.createElement("h3");
      heading.className="review-group-title";
      heading.textContent=group+" · "+groupCatalog.length+" mechanics";
      this.container.append(heading);
      for(const c of groupCatalog){
        const e=this.entries[c.id],card=document.createElement("article");
        card.className="review-card";
        const top=document.createElement("div");top.className="review-card-head";
        const title=document.createElement("strong");title.textContent=c.title;
        const status=document.createElement("span");
        status.className="review-current status-"+e.status;
        status.textContent=e.status.toUpperCase();
        top.append(title,status);
        const text=document.createElement("p");text.textContent="Goal: "+c.criteria;
        const unity=document.createElement("small");unity.textContent="Unity candidate: "+c.unity;
        const choices=document.createElement("div");choices.className="review-choices";
        for(const [value,label] of [["keep","✓ Keep"],["refine","↻ Refine"],["test","⌕ Test"],["later","↪ Later"],["reject","× Reject"]]){
          const btn=document.createElement("button");btn.textContent=label;
          btn.classList.toggle("selected",e.status===value);
          btn.setAttribute("aria-pressed",String(e.status===value));
          btn.addEventListener("click",()=>{e.status=value;this.save();this.render();});
          choices.append(btn);
        }
        const notes=document.createElement("textarea");notes.rows=2;
        notes.placeholder="Notes, observed behavior, tuning settings, acceptance issues...";
        notes.setAttribute("aria-label","Notes for "+c.title);
        notes.value=e.notes;
        notes.addEventListener("input",()=>{e.notes=notes.value.slice(0,800);this.save();});
        card.append(top,text,unity,choices,notes);
        this.container.append(card);
      }
    }
    const s=this.summary();
    for(const key of values)document.getElementById("review"+key[0].toUpperCase()+key.slice(1)).textContent=s[key];
    document.getElementById("reviewUnityWarning").textContent=s.keep+" approved candidate(s). Everything else remains in the lab.";
  }
  exportMarkdown(seed,flag){
    const s=this.summary();
    const lines=[
      "# All Aboard — Unity Mechanics Implementation Brief",
      "",
      "Easy to control, hard to master. Decisions selected by Dor and Eilon; not auto-approved.",
      "",
      "World seed: "+String(seed||"ALL-ABOARD"),
      "Flag config: "+JSON.stringify(flag||{}),
      "Decisions: "+JSON.stringify(s),
      "",
      "## Decisions"
    ];
    for(const status of values){
      lines.push("","### "+status.toUpperCase());
      let count=0;
      for(const c of catalog){
        const e=this.entries[c.id];
        if(e.status!==status)continue;
        count++;
        lines.push("- "+c.title+" ("+c.group+")",
          "  - Candidate C# components: "+c.unity,
          "  - Acceptance: "+c.criteria,
          "  - Notes: "+(e.notes||"Not yet tested"));
      }
      if(!count)lines.push("- None");
    }
    lines.push("","## Unity transfer process",
      "1. Preserve existing Unity scenes, build settings, UI and project milestones.",
      "2. Use only approved mechanics and reimplement behavior in simple C# models.",
      "3. Keep controls, simulation, rendering and persistence independent.",
      "4. Confirm gameplay with device tests, not screenshots or simulated FPS only.",
      "5. Record changes and measurements in CHANGELOG.md before merging.",
      "",
      "Browser lab numbers are arcade units. They are not calibrated marine physics.",
      "GIF image display in a browser does not mean Unity supports GIF sprites natively.",
      "Intercept, Rescue, Follower Ships, special ammo and Kraken tentacles are after-core concepts until explicitly approved."
    );
    return lines.join("\n");
  }
  download(){
    const seed=document.getElementById("worldSeed").value;
    const flag=root.AllAboardFlagWorkshopInstance?.summary()||{};
    const blob=new Blob([this.exportMarkdown(seed,flag)],{type:"text/markdown;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;
    a.download="all-aboard-unity-mechanics-review.md";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
}
root.AllAboardMechanicsReview={MechanicsReview,catalog};
if(typeof module!=="undefined"&&module.exports)module.exports={MechanicsReview,catalog};
})(typeof window!=="undefined"?window:globalThis);
