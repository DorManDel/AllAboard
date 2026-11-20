/* All Aboard Mechanics Lab
 * Standalone arcade/game-feel simulation. Values are intentionally NOT physical SI units.
 * One shared state drives the phone preview and all tuning inspectors.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const all = (selector) => Array.from(document.querySelectorAll(selector));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rad = (deg) => deg * Math.PI / 180;
  const wrapDegrees = (a) => (a % 360 + 360) % 360;
  const formatHeading = (a) => String(Math.round(wrapDegrees(a))).padStart(3, "0") + "°";
  const random = (a, b) => a + Math.random() * (b - a);

  const defaultSettings = Object.freeze({
    sail: 72, windStrength: 2.7, windDirection: 35, baseThrust: 0.1,
    steerSensitivity: 1, wheelReturn: 4.8, rudderResponse: 6, yawResponse: 3, deadzone: 2,
    windDrive: 1, waterDrag: 1,
    sailTrim: 0, sailAutoTrim: true, recoilStrength: .8, cameraShake: .5, waveRoll: 1, windFX: .6,
    anchorGrip: 185, anchorLine: 70, ropeStiffness: 9, ropeDamping: 6, lateralDrag: 5.5, wavePush: .65, vortexStrength: 1,
    currentStrength: 0.3, waveHeight: 0.7, waveDetail: 22, wakeStrength: 1, rippleStrength: .8
  });
  let settings = { ...defaultSettings };
  const ocean = typeof window.AllAboardOcean === "function" ? new window.AllAboardOcean() : null;
  const feel=window.AllAboardGameFeel?.FeelEngine?new window.AllAboardGameFeel.FeelEngine():null;
  const playSfx=id=>window.AllAboardPlaySfx?.(id);
  const fireFeedback=(power=1)=>{
    feel?.fire(power*settings.recoilStrength);
    playSfx("shot");
  };
  // Original Unity ship artwork, copied as SVGs with their original viewBox coordinates.
  // Each is an independently selectable part in the Shipyard tab.
  const shipPartDefinitions = [
    ["hull","Hull",239,95,322,1019],
    ["sail_front","Fore sail",165,349,470,144],
    ["sail_rear","Rear sail",132,612,536,159],
    ["cannon_left_front","Port forward",169,528,121,54],
    ["cannon_right_front","Starboard forward",510,528,121,54],
    ["cannon_left_rear","Port aft",169,805,121,54],
    ["cannon_right_rear","Starboard aft",510,805,121,54],
    ["anchor","Anchor",340,910,120,150]
  ];
  const shipImages = {};
  if (typeof Image === "function") {
    for (const part of shipPartDefinitions) {
      const img = new Image();
      img.src = "./assets/ship-parts/" + part[0] + ".svg";
      shipImages[part[0]] = img;
    }
  }
  const state = {
    activeTab: "live", scenario: "open", paused: false, haptics: true, mode: "friendly",
    wheel: { angle: 0, dragging: false, pointerAngle: 0, rudder: 0, lastTick: 0 },
    ship: { x: 0, y: 0, vx: 0, vy: 0, heading: 0, angularVelocity: 0, forwardSpeed: 0, sideSpeed: 0, sailEfficiency: 0, hull: 100, score: 0, coins: 1250 },
    anchor: { down: false, point: { x: 0, y: 0 }, status: "Raised", phase: "raised", fallTime: 0, overload: 0, tension: 0, length: 0 },
    vortex: { active: false, x: 155, y: -190 },
    chest: { x: 85, y: -265, collected: false },
    enemy: { x: -135, y: -275, vx: 0, vy: 0, hp: 50, reload: 0, modules: { sails:100,cannons:100,rudder:100,hull:100 } },
    modules: { sails:100,cannons:100,rudder:100,hull:100 },
    flag: { text:"AA", color:"#243b70", image:null },
    lastWorldMessage:0, worldStatsTimer:0, worldGrid:false,
    waves: [], ripples: [], wakeTimer: 0, time: 0, hudTimer: 0, frameRate: 60, sailVisual: .72,
    upgrades: { hull: "classic", sails: "cream", rig:"square", cannons: "balanced" },
    shipParts: { hull: true, sail_front: true, sail_rear: true, cannon_left_front: true, cannon_left_rear: true, cannon_right_front: true, cannon_right_rear: true, anchor: true },
    ideasSelected: new Set(),
    damage: { model: "grid", level: 1, weapon: "cannon", cells: [], turn:0, flooding:0 },
    encounter: { kind: "friendly", index: 0, trust: 30, hp: 100, chosen: false, disabled: [], }
  };


  const ideasCatalog = [
    { id:"wind-shadow", name:"Wind shadow", icon:"🏝", level:"Low controls · Medium engineering",
      concept:"Sail behind an island or another ship and suddenly lose wind. Read the environment and choose a route.",
      test:"Does the player notice and recover without a tutorial?" },
    { id:"anchor-sling", name:"Anchor slingshot", icon:"⚓", level:"No new buttons · Medium engineering",
      concept:"Use an anchored line as a pivot to swing around rocks or slingshot out of a vortex. Timing matters.",
      test:"Can players make a sharp turn using one anchor tap plus steering?" },
    { id:"perfect-broadside", name:"Perfect broadside", icon:"💥", level:"No new buttons · Low engineering",
      concept:"Automatic cannons reward an accurate broadside angle with synchronized fire, not faster tapping.",
      test:"Can a skilled helmsman land a better volley than a beginner?" },
    { id:"wake-surfing", name:"Wake surfing", icon:"🌊", level:"No new buttons · Medium engineering",
      concept:"Sail across another vessel's wake for a small speed boost or turbulence. Teach momentum visually.",
      test:"Does reading the wake create a fun, discoverable shortcut?" },
    { id:"ally-escort", name:"Rescue & escort", icon:"♡", level:"One contextual action · Medium engineering",
      concept:"Help a ship escape a hazard instead of attacking it. A rescued ally provides cover or supplies.",
      test:"Can a friendly encounter feel as exciting as a battle?" },
    { id:"treasure-hook", name:"Treasure on a line", icon:"💎", level:"One contextual action · Medium engineering",
      concept:"Throw a short hook at floating loot and pull it toward the ship without stopping the run.",
      test:"Is it satisfying without overlapping the anchor's role?" }
  ];
  function renderIdeas() {
    const box = $("ideasList");
    box.innerHTML = "";
    for (const idea of ideasCatalog) {
      const row = document.createElement("article"); row.className = "idea-card";
      const content = document.createElement("div"); content.className = "idea-card-content";
      const title = document.createElement("h3"); title.textContent = idea.icon + " " + idea.name;
      const description = document.createElement("p"); description.textContent = idea.concept;
      const test = document.createElement("small"); test.textContent = "TEST: " + idea.test + " · " + idea.level;
      content.append(title, description, test);
      const button = document.createElement("button");
      const isSelected = state.ideasSelected.has(idea.id);
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
      button.setAttribute("aria-label", "Shortlist " + idea.name);
      button.textContent = isSelected ? "✓" : "+";
      button.addEventListener("click", () => {
        if (state.ideasSelected.has(idea.id)) state.ideasSelected.delete(idea.id);
        else state.ideasSelected.add(idea.id);
        renderIdeas();
      });
      row.append(content, button); box.append(row);
    }
    $("ideaCount").textContent = state.ideasSelected.size + " shortlisted";
  }
  $("exportIdeas").addEventListener("click", () => {
    const selected = ideasCatalog.filter(idea => state.ideasSelected.has(idea.id));
    const lines = ["# All Aboard - ideas to review with Eilon", "", "Selected " + selected.length + " of " + ideasCatalog.length + " concepts.", ""];
    selected.forEach(idea => lines.push("## " + idea.name, "- Concept: " + idea.concept, "- Test: " + idea.test, "- Scope: " + idea.level, ""));
    if (!selected.length) lines.push("No ideas shortlisted yet.");
    const blob = new Blob([lines.join("\n")], {type:"text/markdown"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href=url;anchor.download="all-aboard-ideas-review.md";
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),300);
  });
  function renderPartsGallery() {
    const gallery=$("shipPartsGallery");
    gallery.innerHTML="";
    for(const part of shipPartDefinitions){
      const id=part[0];
      const button=document.createElement("button");
      button.className="part-card";
      const visible=state.shipParts[id];
      button.classList.toggle("is-hidden",!visible);
      button.setAttribute("aria-pressed",String(visible));
      const image=document.createElement("img");
      image.src="./assets/ship-parts/"+id+".svg";
      image.alt="";
      const title=document.createElement("span");title.textContent=part[1];
      const status=document.createElement("small");status.textContent=visible?"Visible":"Hidden";
      button.append(image,title,status);
      button.addEventListener("click",()=>{state.shipParts[id]=!state.shipParts[id];renderPartsGallery();});
      gallery.append(button);
    }
  }

  // Seeded world: stores only nearby chunks; deterministic content does NOT
  // consume Math.random. The current world seed may be shared as ?seed=NAME.
  const initialSeed=(()=>{
    try{return(new URLSearchParams(window.location?.search||"")).get("seed")||"ALL-ABOARD";}
    catch(err){return"ALL-ABOARD";}
  })();
  const initialWorldOptions=(()=>{
    try{
      const p=new URLSearchParams(window.location?.search||"");
      const density=(key)=>p.has(key)?clamp(Number(p.get(key))||0,0,2.5):1;
      return {islands:density("islands"),ships:density("ships"),treasure:density("treasure"),
        kraken:p.get("kraken")!=="0"};
    }catch(err){return{islands:1,ships:1,treasure:1,kraken:true};}
  })();
  let world=window.AllAboardWorld?.WorldEngine?
    new window.AllAboardWorld.WorldEngine(initialSeed,initialWorldOptions):null;
  const grapple=window.AllAboardKrakenGrapple?.KrakenGrapple?
    new window.AllAboardKrakenGrapple.KrakenGrapple():null;
  if(world)world.grapple=grapple;
  let flagWorkshop=null,mechanicsReview=null;
  const worldStatus=msg=>{
    const box=$("worldAlert");
    if(box)box.textContent=msg;
    message(msg);
  };
  function resetWorld(newSeed,options){
    const chosen=String(newSeed||"ALL-ABOARD").trim().slice(0,52)||"ALL-ABOARD";
    if(!window.AllAboardWorld?.WorldEngine)return;
    const old=world?.options||{islands:1,ships:1,treasure:1,kraken:true};
    world?.dispose();
    world=new window.AllAboardWorld.WorldEngine(chosen,options||old);
    if(grapple){grapple.reset();world.grapple=grapple;}
    world.updateNear(state.ship.x,state.ship.y);
    $("worldSeed").value=chosen;
    refreshWorldStats(true);
    worldStatus("Generated '"+chosen+"'. Locations stay consistent while you sail.");
  }
  function refreshWorldStats(force=false){
    if(!world)return;
    if(!force&&state.time-state.worldStatsTimer<.4)return;
    state.worldStatsTimer=state.time;
    const n=world.countNearby(state.ship.x,state.ship.y,500);
    $("worldChunks").textContent=n.chunks;
    $("worldIslands").textContent=n.island;
    $("worldShips").textContent=n.ship;
    $("worldTreasures").textContent=n.treasure;
  }
  function bindWorldControls(){
    if(!world)return;
    $("worldSeed").value=initialSeed;
    for(const [id,key] of [["Island","islands"],["Ship","ships"],["Treasure","treasure"]]){
      $("world"+id+"Density").value=world.options[key];
      $("world"+id+"DensityValue").textContent=Number(world.options[key]).toFixed(2)+"×";
    }
    $("worldKrakenEnabled").checked=world.options.kraken;
    $("worldGenerate").addEventListener("click",()=>resetWorld($("worldSeed").value));
    $("worldSeed").addEventListener("keydown",e=>{if(e.key==="Enter")resetWorld(e.target.value);});
    $("worldRandom").addEventListener("click",()=>{
      const seed="SEA-"+Math.floor(Math.random()*1e9).toString(36).toUpperCase();
      resetWorld(seed);
    });
    $("worldShare").addEventListener("click",()=>{
      const seed=world.seed;
      try{
        const base=window.location.href.split("?")[0].split("#")[0];
        const o=world.options;
        const link=base+"?seed="+encodeURIComponent(seed)+
          "&islands="+o.islands+"&ships="+o.ships+
          "&treasure="+o.treasure+"&kraken="+(o.kraken?1:0);
        if(navigator.clipboard?.writeText)navigator.clipboard.writeText(link);
        else{
          const field=$("worldSeed");
          field.focus();field.select();worldStatus("Copy the selected seed to share the world.");
          return;
        }
        worldStatus("Seed link copied. Another device will generate the same placements.");
      }catch(err){worldStatus("Share this seed: "+seed);}
    });
    for(const [id,key] of [["Island","islands"],["Ship","ships"],["Treasure","treasure"]]){
      const range=$("world"+id+"Density");
      range.addEventListener("input",e=>{
        const val=Number(e.target.value);
        $("world"+id+"DensityValue").textContent=val.toFixed(2)+"×";
        world.options[key]=val;
        world.cache.clear();world.lastCenter=null;
        refreshWorldStats(true);
      });
    }
    $("worldKrakenEnabled").addEventListener("change",e=>{
      world.options.kraken=e.target.checked;
      world.cache.clear();world.lastCenter=null;
      refreshWorldStats(true);
    });
    $("worldChunkGrid").addEventListener("change",e=>state.worldGrid=e.target.checked);
    $("worldExplore").addEventListener("click",()=>{
      state.ship.x+=world.constructor.CHUNK_SIZE;
      state.ship.vx=0;state.ship.vy=0;
      if(state.anchor.down)toggleAnchor();
      world.updateNear(state.ship.x,state.ship.y);
      refreshWorldStats(true);
      worldStatus("Moved one world chunk east. Try regenerating with the same seed.");
    });
    $("worldSummonKraken").addEventListener("click",()=>{
      const summoned=world.summonKraken(state.ship.x,state.ship.y);
      grapple?.ensure(summoned.id);
      worldStatus("Kraken nearby! Watch for arm warning, then try hitting the grabbing arm.");
      if(ocean)ocean.splash(summoned.x,summoned.y,2,"kraken");
    });

    $("krakenShootArm").addEventListener("click",()=>{
      const target=world?.nearbyObjects(state.ship.x,state.ship.y,250)
        .filter(item=>item.type==="kraken")
        .sort((a,b)=>Math.hypot(a.x-state.ship.x,a.y-state.ship.y)-
                     Math.hypot(b.x-state.ship.x,b.y-state.ship.y))[0];
      if(!target||!grapple){
        worldStatus("No nearby Kraken arm. Summon one using Test Kraken.");return;
      }
      if(grapple.hit(target.id)){
        ocean?.splash(state.ship.x,state.ship.y,.65,"kraken-arm-hit");
        worldStatus(grapple.lastEvent?.message||"Tentacle hit!");
        vibrate([12,15,18]);
      }else worldStatus("Wait for the arm to reach/grab. Shoot only when it is vulnerable.");
    });
    refreshWorldStats(true);
  }
  const titleMap = {
    live: ["Sailing playground", "Live Playground", "Tune the whole vessel. Every change propagates to the other experiments."],
    helm: ["Steer & feel", "Helm Lab", "One wheel, three turns either way, and an adjustable return-to-center feel."],
    feel: ["Make the ship alive", "FX & Sail Trim Lab", "Tune wave-driven roll, recoil, shake, wind streaks and optional sail-yard tilt."],
    audio: ["Compose our own sounds", "Music & SFX Lab", "Audition original pirate mood sketches and event sounds; plan licensed final assets."],
    unity: ["Validate before porting", "Unity Readiness", "Review mechanic contracts, inspect prefab YAML and plan EditMode/PlayMode checks."],
    sails: ["Sails & wind", "Sails & Wind", "Explore how wind direction and sail height influence propulsion."],
    anchor: ["Anchor manoeuvres", "Anchor Lab", "Hold position, drift, or drag your anchor near a current."],
    ocean: ["The living ocean", "Ocean Lab", "Procedural waves, wake trails and ripples powered by the same simulated water."],
    world: ["Seeded infinite sea", "World Generation Lab", "Stream reproducible island, ship, treasure and rare Kraken chunks around the ship."],
    damage: ["Spatial damage", "Damage Lab", "Test three ways to turn ship damage into a tiny tactical puzzle."],
    encounter: ["Meet another vessel", "Encounter Lab", "Befriend or battle using short, meaningful interactions."],
    shipyard: ["Pimp my ship", "Shipyard", "Toggle the original Unity ship pieces and experiment with upgrades."],
    ideas: ["The ideas workshop", "Ideas Board", "Shortlist small mechanics that create interesting player decisions."],
    review: ["Review for Unity", "Mechanics Review", "Choose Keep, Refine, Test, Later or Reject and export a Unity implementation brief."],
    layout: ["Rearrange the HUD", "UI Layout Studio", "Drag controls by touch or set precise X/Y and scaling."],
    loop: ["Stage & Stay Loop", "Stage Loop Lab", "Test Eilon's fused objective + escalating stay-or-leave reward system."],
    planner: ["Build the plan together", "Roadmap & Kanban", "Inspect mechanic specifications, select promising ideas and prepare Jira-ready implementation tickets."]
  };

  function message(text) {
    const hint = $("systemTip");
    hint.textContent = text;
  }
  function vibrate(pattern) {
    if (state.haptics && navigator.vibrate) navigator.vibrate(pattern);
  }
  function setTab(name) {
    if (!titleMap[name]) return;
    state.activeTab = name;
    all(".tab").forEach((tab) => {
      const yes = tab.dataset.tab === name;
      tab.classList.toggle("active", yes);
      tab.setAttribute("aria-selected", String(yes));
    });
    all(".panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
    $("stageTitle").textContent = titleMap[name][0];
    $("inspectorTitle").textContent = titleMap[name][1];
    $("inspectorSubtitle").textContent = titleMap[name][2];
    if (name === "damage") renderDamage();
    if (name === "encounter") renderEncounter();
    if (name === "shipyard") renderPartsGallery();
    window.AllAboardNavInstance?.sync(name);
    window.AllAboardUILayoutInstance?.applyAll();
    if (name === "ideas") renderIdeas();
  }
  all(".tab").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));

  const formatValue = (name, value) => {
    if (name === "sail" || name === "deadzone") return Math.round(value) + "%";
    if (name === "windDirection" || name === "sailTrim") return Math.round(value) + "°";
    if (name === "steerSensitivity" || name === "windDrive" || name === "waterDrag") return Number(value).toFixed(2) + "×";
    if (name === "waveDetail" || name === "anchorGrip" || name === "anchorLine") return String(Math.round(value));
    return Number(value).toFixed(1);
  };
  function syncSettings() {
    all("[data-setting]").forEach((control) => { control.value = settings[control.dataset.setting]; });
    all("[data-value]").forEach((output) => { output.textContent = formatValue(output.dataset.value, settings[output.dataset.value]); });
    $("sailSlider").value = settings.sail;
    $("sailPercent").textContent = Math.round(settings.sail) + "%";
    const heightToggle=$("sailHeightToggle");if(heightToggle)heightToggle.textContent=settings.sail>0?"LOWER":"RAISE";
    $("anchorChainQuickSlider").value = settings.anchorLine;
    $("anchorChainQuickValue").textContent = String(Math.round(settings.anchorLine));
    $("anchorChainEditValue").textContent = String(Math.round(settings.anchorLine));
    $("sailQuickAuto").checked = settings.sailAutoTrim;
    $("sailAutoTrim").checked = settings.sailAutoTrim;
    $("sailTrimQuickSlider").disabled = settings.sailAutoTrim;
    if(!settings.sailAutoTrim)$("sailTrimQuickSlider").value = settings.sailTrim;
    $("sailTrimToggle").textContent = settings.sailAutoTrim ? "↪ AUTO" : "↪ MANUAL";
    $("dialWind").style.transform = "rotate(" + (settings.windDirection - 90) + "deg)";
  }
  function tune(name, value) {
    if (!(name in settings)) return;
    settings[name] = Number(value);
    if(name==="sailTrim")settings.sailAutoTrim=false;
    syncSettings();
  }
  all("[data-setting]").forEach((control) => control.addEventListener("input", (e) => tune(e.target.dataset.setting, e.target.value)));
  $("sailSlider").addEventListener("input", (e) => tune("sail", e.target.value));
  $("sailAutoTrim").addEventListener("change",e=>{
    settings.sailAutoTrim=e.target.checked;syncSettings();
  });
  $("sailQuickAuto").addEventListener("change",e=>{
    settings.sailAutoTrim=e.target.checked;syncSettings();
  });
  $("sailTrimQuickSlider").addEventListener("input",e=>tune("sailTrim",e.target.value));
  const setSailControlStyle=mode=>{
    const toggle=mode==="toggle-tilt";
    $("sailSlider").hidden=toggle;
    $("sailPercent").hidden=toggle;
    $("sailHeightToggle").hidden=!toggle;
    $("sailTrimToggle").hidden=toggle;
    $("sailTrimQuick").hidden=!toggle;
    $("sailControl").classList.toggle("sail-toggle-mode",toggle);
    if(!toggle)$("sailTrimToggle").setAttribute("aria-expanded","false");
    $("sailHeightToggle").textContent=settings.sail>0?"LOWER":"RAISE";
  };
  $("sailControlStyle").addEventListener("change",e=>setSailControlStyle(e.target.value));
  $("sailHeightToggle").addEventListener("click",()=>{
    tune("sail",settings.sail>0?0:100);
    $("sailHeightToggle").textContent=settings.sail>0?"LOWER":"RAISE";
  });
  setSailControlStyle("classic");
  $("sailTrimToggle").addEventListener("click",()=>{
    const popup=$("sailTrimQuick"),open=popup.hidden;
    popup.hidden=!open;
    $("sailTrimToggle").setAttribute("aria-expanded",String(open));
  });
  $("anchorChainQuickSlider").addEventListener("input",e=>tune("anchorLine",e.target.value));
  $("anchorChainToggle").addEventListener("click",()=>{
    const editor=$("anchorChainEditor"),open=editor.hidden;
    editor.hidden=!open;
    $("anchorChainToggle").setAttribute("aria-expanded",String(open));
  });
  $("anchorChainClose").addEventListener("click",()=>{
    $("anchorChainEditor").hidden=true;
    $("anchorChainToggle").setAttribute("aria-expanded","false");
  });
  $("reduceMotion").addEventListener("change",e=>{if(feel)feel.reducedMotion=e.target.checked;});
  $("feelTestShot").addEventListener("click",()=>{
    fireFeedback(1);
    const ship=state.ship,heading=rad(ship.heading);
    const x=ship.x+Math.cos(heading)*40,y=ship.y+Math.sin(heading)*40;
    ocean?.splash(x,y,.8,"cannon-test");
    vibrate(12);
    message("Test shot: recoil + water FX; no damage applied and no projectile physics simulated.");
  });
  $("feelTestHit").addEventListener("click",()=>{
    feel?.hit(1.1*settings.cameraShake);
    playSfx("damage");vibrate([13,14,16]);
    message("Test hull hit: visual shake only, real hull health unchanged.");
  });

  function setScenario(which) {
    state.scenario = which;
    all("[data-scenario]").forEach((btn) => btn.classList.toggle("active", btn.dataset.scenario === which));
    if (which === "open") {
      settings.windStrength = 2.7; settings.windDirection = 35; settings.currentStrength = 0.3;
      settings.waveHeight = 0.7; state.vortex.active = false;
      message("Open sea: steer toward the wind arrow and watch your ship accelerate.");
    } else if (which === "wind") {
      settings.windStrength = 4.5; settings.windDirection = 145; settings.currentStrength = 0.6;
      settings.waveHeight = 1.2; state.vortex.active = false;
      message("Strong wind: reef the sails to reduce drift, then turn for a tailwind boost.");
    } else {
      settings.windStrength = 3.2; settings.windDirection = 65; settings.currentStrength = 0.8;
      settings.waveHeight = 1.1; state.vortex.active = true;
      state.vortex.x = state.ship.x + 105; state.vortex.y = state.ship.y - 145;
      message("Vortex escape: use the rudder, sail height and anchor to manage the current.");
    }
    syncSettings();
  }
  all("[data-scenario]").forEach((btn) => btn.addEventListener("click", () => setScenario(btn.dataset.scenario)));

  function toggleAnchor() {
    state.anchor.down = !state.anchor.down;
    const a = state.anchor, ship = state.ship;
    if (a.down) {
      const fwdX = Math.sin(rad(ship.heading)), fwdY = -Math.cos(rad(ship.heading));
      // The line starts from the stern and the dropped anchor sinks close behind the hull.
      a.point = { x: ship.x - fwdX * 20, y: ship.y - fwdY * 20 };
      a.status = "Dropping"; a.phase = "falling"; a.fallTime = 0; a.overload = 0;
      a.tension = 0; a.length = 20; a.lineLength=settings.anchorLine;
      vibrate([18, 45, 26]);
      playSfx("anchor");
      message("Anchor thrown! Watch the splash, then the ship can drift until the chain is taut.");
    } else {
      a.status = "Raised"; a.phase = "raised"; a.tension = 0; a.length = 0;
      if (ocean) ocean.splash(a.point.x, a.point.y, .6, "raise");
      vibrate(14);
      message("Anchor raised. The ship can accelerate and turn freely.");
    }
    $("anchorButton").classList.toggle("pressed", a.down);
    $("anchorButton").setAttribute("aria-pressed", String(a.down));
    $("anchorButton").classList.toggle("throwing", a.down);
    $("anchorLabel").textContent = a.down ? "RAISE" : "DROP";
    $("anchorInspector").textContent = a.down ? "⚓ Raise anchor" : "⚓ Drop anchor";
    $("anchorRopeHud").hidden = !a.down;
  }
  $("anchorButton").addEventListener("click", toggleAnchor);
  $("anchorInspector").addEventListener("click", toggleAnchor);

  function toggleMode() {
    state.mode = state.mode === "friendly" ? "aggressive" : "friendly";
    const btn = $("modeButton");
    btn.classList.toggle("friendly", state.mode === "friendly");
    btn.classList.toggle("aggressive", state.mode === "aggressive");
    $("modeLabel").textContent = state.mode === "friendly" ? "♡ FRIENDLY" : "✹ AGGRESSIVE";
    $("modeNextLabel").textContent = state.mode === "friendly" ? "✹ Aggressive ↔" : "♡ Friendly ↔";
    state.encounter.kind = state.mode;
    state.encounter.hp = 100; state.encounter.trust = 30;
    state.encounter.chosen = false; state.encounter.disabled = [];
    all("[data-encounter]").forEach(button => button.classList.toggle("active", button.dataset.encounter === state.mode));
    $("encounterResult").textContent = "Make a deliberate choice.";
    renderEncounter();
    vibrate(15);
    message(state.mode === "friendly"
      ? "Friendly mode: approach other ships to negotiate. Try the Encounters tab."
      : "Aggressive mode: automatic broadsides fire when an enemy is close and lined up.");
  }
  $("modeButton").addEventListener("click", toggleMode);

  // Wheel pointer tracking: accumulate relative rotations, unwrapping across +/-180°.
  // The wheel is a UI control, not the actual rudder: response and dead zone are independent.
  const wheel = $("wheelControl");
  function pointerAngle(evt) {
    const rect = wheel.getBoundingClientRect();
    const dx = evt.clientX - (rect.left + rect.width / 2);
    const dy = evt.clientY - (rect.top + rect.height / 2);
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }
  wheel.addEventListener("pointerdown", (e) => {
    if (state.paused) return;
    state.wheel.dragging = true;
    state.wheel.pointerAngle = pointerAngle(e);
    wheel.setPointerCapture(e.pointerId);
    $("playHint").style.opacity = "0";
    vibrate(5);
    e.preventDefault();
  });
  wheel.addEventListener("pointermove", (e) => {
    if (!state.wheel.dragging) return;
    const next = pointerAngle(e);
    let delta = next - state.wheel.pointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const previousBucket = Math.round(state.wheel.angle / 90);
    state.wheel.angle = clamp(state.wheel.angle + delta, -1080, 1080);
    if (previousBucket !== Math.round(state.wheel.angle / 90)) vibrate(4);
    state.wheel.pointerAngle = next;
    e.preventDefault();
  });
  function releaseWheel() { state.wheel.dragging = false; }
  wheel.addEventListener("pointerup", releaseWheel);
  wheel.addEventListener("pointercancel", releaseWheel);
  wheel.addEventListener("lostpointercapture", releaseWheel);
  wheel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      state.wheel.angle = clamp(state.wheel.angle + (e.key === "ArrowRight" ? 75 : -75), -1080, 1080);
      e.preventDefault();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (["INPUT", "BUTTON", "TEXTAREA"].includes(document.activeElement.tagName) || document.activeElement === wheel) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      state.wheel.angle = clamp(state.wheel.angle + (e.key === "ArrowRight" ? 75 : -75), -1080, 1080);
      e.preventDefault();
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      tune("sail", clamp(settings.sail + (e.key === "ArrowUp" ? 5 : -5), 0, 100));
      e.preventDefault();
    }
  });
  $("hapticToggle").addEventListener("change", (e) => state.haptics = e.target.checked);

  $("spawnVortex").addEventListener("click", () => {
    state.vortex.active = true;
    state.vortex.x = state.ship.x + 80; state.vortex.y = state.ship.y - 105;
    message("Vortex relocated ahead of your ship. Try anchoring before entering its pull.");
  });
  $("clearVortex").addEventListener("click", () => { state.vortex.active = false; message("Vortex cleared."); });
  $("rippleButton").addEventListener("click", () => {
    const x=state.ship.x+random(-60,60),y=state.ship.y-random(40,145);
    if(ocean)ocean.splash(x,y,1,"test");else state.ripples.push({x,y,age:0});
    vibrate(8);
  });
  $("stormButton").addEventListener("click", () => {
    settings.waveHeight = 1.8; settings.waveDetail = 38; settings.windStrength = 4.8;
    settings.currentStrength = 1.5; settings.wakeStrength = 1.5;
    syncSettings(); message("Storm preset loaded. Watch waves, wake and ship drift.");
  });
  $("pauseButton").addEventListener("click", () => {
    state.paused = !state.paused;
    $("pauseButton").textContent = state.paused ? "▶ Resume simulation" : "⏸ Pause simulation";
  });

  $("collectChest").addEventListener("click",()=>{
    const treasure=world?.nearest(state.ship.x,state.ship.y,"treasure",72);
    const tutorialDist=Math.hypot(state.ship.x-state.chest.x,state.ship.y-state.chest.y);
    if(treasure&&(tutorialDist>64||Math.hypot(state.ship.x-treasure.x,state.ship.y-treasure.y)<tutorialDist)){
      const coins=world.collect(treasure);
      state.ship.coins+=coins;
      state.ship.score+=Math.max(10,coins);
      ocean?.splash(treasure.x,treasure.y,1.3,"treasure");
      worldStatus("Found a seeded treasure cache: +"+coins+" coins! It stays collected in this session.");
    }else if(tutorialDist<64){
      state.ship.coins+=75;state.ship.score+=50;
      if(ocean)ocean.splash(state.chest.x,state.chest.y,1.1,"treasure");
      state.chest.x=state.ship.x+random(-180,180);
      state.chest.y=state.ship.y-random(180,380);
      message("Collected practice treasure: +75 coins.");
    }
    vibrate([20,30,25]);
    playSfx("coins");
  });
  const shipInteract=$("worldShipInteract");
  shipInteract.addEventListener("click",()=>{
    const npc=world?.nearest(state.ship.x,state.ship.y,"ship",95);
    if(!npc)return;
    const disposition=npc.faction==="friendly"?"friendly":"aggressive";
    if(state.mode!=="friendly"){
      worldStatus("Raise the Friendly flag to speak to "+npc.name+", or position for auto-cannon fire.");
      return;
    }
    setTab("encounter");
    playSfx("friend");
    state.encounter.kind="friendly";
    all("[data-encounter]").forEach(b=>b.classList.toggle("active",b.dataset.encounter==="friendly"));
    renderEncounter();
    $("encounterName").textContent=npc.name;
    worldStatus("You approached "+npc.name+". Try a friendly encounter, then return to sailing.");
  });
  // Damage Lab: three genuinely different win conditions, sharing cell data.
  const typeForIndex = (i) => ({ 2: "sails", 5: "cannon", 9: "cannon", 12: "core", 17: "rudder", 22: "sails" })[i] || "hull";
  const iconForType = { hull: "", sails: "⛵", cannon: "✹", rudder: "☸", core: "◆", powder: "✴" };
  function resetDamage() {
    const d = state.damage;
    d.turn=0; d.flooding=0;
    d.cells = Array.from({ length: 25 }, (_, i) => {
      const type = d.model === "chain" && [6,8,16,18].includes(i) ? "powder" : typeForIndex(i);
      const hp = d.model === "modules" && type === "hull" ? 0 : d.model === "core" && type === "core" ? 3 + 2 * d.level : 2 + d.level + (type === "core" ? 1 : 0);
      return { type, hp, max: hp, fire: false, leaking:false };
    });
    state.enemy.modules={sails:100,cannons:100,rudder:100,hull:100}; state.enemy.hp=50;
    $("damageStatus").textContent = "Select an attack, then tap a tile.";
    syncEnemyModules(); renderDamage();
  }
  function objectiveSatisfied() {
    const d = state.damage;
    if (d.flooding >= 100) return true;
    if (d.model === "core") return d.cells[12].hp <= 0;
    if (d.model === "modules") return d.cells.filter(c => c.type !== "hull").every(c => c.hp === 0);
    return d.cells.every(c => c.hp === 0);
  }
  function remainingDamage() {
    const d = state.damage;
    return d.cells.filter(c => d.model !== "modules" || c.type !== "hull")
      .reduce((sum, c) => sum + c.hp, 0);
  }
  function maxDamage() {
    const d = state.damage;
    return d.cells.filter(c => d.model !== "modules" || c.type !== "hull")
      .reduce((sum, c) => sum + c.max, 0);
  }
  function renderDamage() {
    const d = state.damage;
    if (!d.cells.length) return;
    const names = { grid: "Destroy all durability cells", modules: "Disable every ship module", core: "Breach and destroy the core ◆", chain: "Trigger cascading powder-cell combos ✴" };
    $("damageObjective").textContent = names[d.model];
    $("enemyLevelValue").textContent = "Lv. " + d.level;
    $("damageHealth").textContent = remainingDamage() + " / " + maxDamage() + " · Flood " + Math.round(d.flooding) + "%";
    $("damageTurn").textContent = d.turn;
    $("damageHealthFill").style.width = (maxDamage() ? remainingDamage() / maxDamage() * 100 : 0) + "%";
    $("damageBoard").innerHTML = "";
    d.cells.forEach((cell, i) => {
      const b = document.createElement("button");
      b.className = "damage-cell targetable" + (cell.type === "core" ? " core" : "");
      b.dataset.hp = Math.min(cell.hp, 2);
      if (cell.type === "powder") b.classList.add("powder");
      b.disabled = cell.max === 0;
      b.setAttribute("aria-label", "Cell " + (i + 1) + ": " + cell.type + ", " + cell.hp + " HP");
      const ic = document.createElement("span"); ic.className = "cell-icon";
      ic.textContent = cell.fire ? "🔥" : cell.leaking ? "💧" : iconForType[cell.type];
      const num = document.createElement("span"); num.className = "cell-hp";
      num.textContent = cell.max === 0 ? "·" : cell.hp ? String(cell.hp) : "×";
      b.append(ic, num);
      b.addEventListener("click", () => hitDamage(i));
      $("damageBoard").append(b);
    });
  }
  function syncEnemyModules(){
    const d=state.damage;
    const percent=type=>{
      const cells=d.cells.filter(c=>c.type===type&&c.max>0);
      if(!cells.length)return 100;
      const max=cells.reduce((n,c)=>n+c.max,0);
      return Math.round(100*cells.reduce((n,c)=>n+c.hp,0)/max);
    };
    state.enemy.modules.sails=percent("sails");
    state.enemy.modules.cannons=percent("cannon");
    state.enemy.modules.rudder=percent("rudder");
    state.enemy.modules.hull=percent("hull");
    $("enemySailsStatus").textContent=state.enemy.modules.sails===0?"DISABLED":state.enemy.modules.sails+"%";
    $("enemyCannonsStatus").textContent=state.enemy.modules.cannons===0?"DISABLED":state.enemy.modules.cannons+"%";
    $("enemyRudderStatus").textContent=state.enemy.modules.rudder===0?"DISABLED":state.enemy.modules.rudder+"%";
  }
  function evolveDamageTurn(){
    const d=state.damage;
    d.turn++;
    const ignited=[];
    for(let i=0;i<d.cells.length;i++){
      const c=d.cells[i];
      if(c.fire&&c.hp>0){
        c.hp=Math.max(0,c.hp-1);
        if(c.hp===0)c.fire=false;
        const adjacent=[i-5,i%5<4?i+1:-1,i+5,i%5>0?i-1:-1];
        const candidate=adjacent.find(j=>j>=0&&j<25&&d.cells[j].hp>0&&!d.cells[j].fire);
        if(candidate!==undefined)ignited.push(candidate);
      }
      if(c.hp===0&&c.type==="hull")c.leaking=true;
    }
    for(const i of ignited)d.cells[i].fire=true;
    const leaks=d.cells.filter(c=>c.leaking).length;
    d.flooding=clamp(d.flooding+leaks*4.5-(leaks===0?3:0),0,100);
    syncEnemyModules();
  }
  function hitDamage(index){
    const d=state.damage;
    if(objectiveSatisfied())return;
    const tile=d.cells[index];
    if(tile.max===0)return;
    if(d.model==="core"&&index===12&&d.weapon!=="repair"){
      const breached=[7,11,13,17].filter(i=>d.cells[i].hp===0).length;
      if(breached<2){
        $("damageStatus").textContent="Core shielded! Destroy 2 neighbors first.";
        return;
      }
    }
    const adjacent=i=>{
      const x=i%5,y=Math.floor(i/5);
      return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[x+dx,y+dy])
        .filter(([nx,ny])=>nx>=0&&nx<5&&ny>=0&&ny<5)
        .map(([nx,ny])=>ny*5+nx);
    };
    if(d.weapon==="repair"){
      tile.hp=Math.min(tile.max,tile.hp+2);
      tile.fire=false;tile.leaking=false;
    }else if(d.weapon==="fire"){
      if(tile.hp>0)tile.fire=true;
    }else{
      // Impact center damages several cells. The surrounding ring takes splash damage.
      const hitCells=new Map();
      const mark=(i,amount)=>{
        if(i<0||i>=25||d.cells[i].max===0)return;
        hitCells.set(i,Math.max(amount,hitCells.get(i)||0));
      };
      const centers=d.weapon==="broadside"?[index-1,index,index+1]
        .filter(i=>i>=0&&i<25&&Math.floor(i/5)===Math.floor(index/5)):[index];
      for(const i of centers){
        mark(i,2);for(const j of adjacent(i))mark(j,1);
      }
      const queue=[];
      for(const [i,amount] of hitCells){
        const c=d.cells[i],previous=c.hp;
        c.hp=Math.max(0,c.hp-amount);
        if(d.model==="chain"&&c.type==="powder"&&previous>0&&c.hp===0)queue.push(i);
      }
      const exploded=new Set();
      while(queue.length&&exploded.size<25){
        const i=queue.shift();if(exploded.has(i))continue;
        exploded.add(i);
        for(const j of adjacent(i)){
          const c=d.cells[j],previous=c.hp;
          c.hp=Math.max(0,c.hp-2);
          if(d.model==="chain"&&c.type==="powder"&&previous>0&&c.hp===0)queue.push(j);
        }
      }
      if(exploded.size)message(exploded.size+" powder tiles detonated in a chain reaction!");
    }
    evolveDamageTurn();
    $("damageStatus").textContent=objectiveSatisfied()?
      (d.flooding>=100?"Enemy ship sank from flooding!":"Enemy ship disabled!")
      :"Turn "+d.turn+" · "+remainingDamage()+" HP · Flood "+Math.round(d.flooding)+"% · Sails "+state.enemy.modules.sails+"%.";
    vibrate(d.weapon==="repair"?7:[12,18,10]);
    renderDamage();
  }
  function advanceFire(){
    evolveDamageTurn();
    const d=state.damage;
    $("damageStatus").textContent="Turn "+d.turn+": fire and leaks progress. Flood "+Math.round(d.flooding)+"%.";
    renderDamage();
  }
  $("enemyRepair").addEventListener("click",()=>{
    const d=state.damage;
    const candidates=d.cells.filter(c=>c.hp<c.max&&c.max>0);
    const priority={sails:0,rudder:1,cannon:2,hull:3,core:4,powder:5};
    candidates.sort((a,b)=>(priority[a.type]??6)-(priority[b.type]??6));
    if(!candidates.length){$("damageStatus").textContent="The enemy is already repaired.";return;}
    const c=candidates[0];
    c.hp=Math.min(c.max,c.hp+2);c.fire=false;c.leaking=false;
    evolveDamageTurn();
    $("damageStatus").textContent="The enemy spent turn "+d.turn+" repairing "+c.type+".";
    renderDamage();
  });
  all("[data-test-module]").forEach(button=>button.addEventListener("click",()=>{
    const key=button.dataset.testModule;
    state.modules[key]=Math.max(0,state.modules[key]-50);
    message("Our "+key+" condition: "+state.modules[key]+"%. The preview uses the damaged system.");
    if(ocean)ocean.splash(state.ship.x,state.ship.y,1.2,"hit");
    vibrate([15,20,20]);
  }));
  $("repairOwn").addEventListener("click",()=>{
    for(const key of ["sails","cannons","rudder"])
      state.modules[key]=Math.min(100,state.modules[key]+50);
    message("Our ship repaired by 50%. A future encounter can charge a turn or resources.");
  });
  all("[data-damage-model]").forEach(btn => btn.addEventListener("click", () => {
    state.damage.model = btn.dataset.damageModel;
    all("[data-damage-model]").forEach(b => b.classList.toggle("active", b === btn));
    resetDamage();
  }));
  all("[data-weapon]").forEach(btn => btn.addEventListener("click", () => {
    state.damage.weapon = btn.dataset.weapon;
    all("[data-weapon]").forEach(b => b.classList.toggle("active", b === btn));
  }));
  $("enemyLevel").addEventListener("input", (e) => { state.damage.level = Number(e.target.value); resetDamage(); });
  $("fireTick").addEventListener("click", advanceFire);
  $("damageReset").addEventListener("click", resetDamage);

  // Friendly offers have deterministic outcomes: decisions matter more than RNG.
  const captains = [
    { name: "The Wandering Gull", prompt: "Our crew has been sailing for days. We urgently need fresh provisions.", need: "food", choices: [["food", "🍎 Offer provisions"], ["gold", "🪙 Offer gold"], ["map", "🗺 Share a map"]] },
    { name: "The Lost Navigator", prompt: "We are caught in the currents and cannot find the safe route home.", need: "map", choices: [["food", "🍎 Offer provisions"], ["map", "🗺 Share safe currents"], ["gold", "🪙 Offer gold"]] },
    { name: "The Broken Mast", prompt: "A storm broke our mast. We cannot catch the wind until we repair it.", need: "tools", choices: [["tools", "🛠 Share repair tools"], ["gold", "🪙 Offer gold"], ["food", "🍎 Offer provisions"]] }
  ];
  function renderEncounter() {
    const e = state.encounter;
    const isFriend = e.kind === "friendly";
    const captain = captains[e.index % captains.length];
    $("encounterName").textContent = captain.name;
    $("encounterPrompt").textContent = isFriend ? captain.prompt : "Choose a ship component to disable. A good shot can remove a tactical advantage.";
    $("relationLabel").textContent = isFriend ? "TRUST" : "ENEMY HP";
    $("trustValue").textContent = (isFriend ? e.trust : e.hp) + "%";
    $("trustFill").style.width = clamp(isFriend ? e.trust : e.hp, 0, 100) + "%";
    $("trustFill").style.background = isFriend ? "#86e7b8" : "#fa8e7a";
    $("encounterChoices").innerHTML = "";
    const choices = isFriend ? captain.choices : [
      ["sails", "⛵ Aim at sails · slow escape"],
      ["cannon", "✹ Aim at cannons · stop return fire"],
      ["hull", "💥 Aim at hull · major damage"]
    ];
    for (const [kind, label] of choices) {
      const b = document.createElement("button");
      b.textContent = label;
      b.disabled = isFriend ? e.chosen : e.hp === 0 || e.disabled.includes(kind);
      b.addEventListener("click", () => resolveEncounter(kind));
      $("encounterChoices").append(b);
    }
  }
  function resolveEncounter(choice) {
    const e = state.encounter;
    if (e.kind === "friendly") {
      if (e.chosen) return;
      const correct = choice === captains[e.index % captains.length].need;
      e.trust = clamp(e.trust + (correct ? 40 : -20), 0, 100);
      e.chosen = true;
      $("encounterResult").textContent = correct ? "Great choice! +40 trust, +40 coins. An alliance may open future routes." : "That offer did not solve their problem. -20 trust. Try the next captain.";
      if (correct) { state.ship.coins += 40; state.ship.score += 20; vibrate([12, 30, 22]); }
      else vibrate(20);
    } else {
      if (e.hp === 0 || e.disabled.includes(choice)) return;
      e.disabled.push(choice);
      if (choice === "hull") e.hp = clamp(e.hp - 50, 0, 100);
      else e.hp = clamp(e.hp - 25, 0, 100);
      $("encounterResult").textContent = e.hp === 0 ? "Enemy disabled. +80 coins. You won by choosing targets!" :
        choice === "sails" ? "Enemy sails disabled. It can no longer escape at full speed." :
        choice === "cannon" ? "Enemy guns disabled. You can now attack more safely." : "Hull hit! Another tactical decision remains.";
      if (e.hp === 0) { state.ship.coins += 80; state.ship.score += 75; }
      vibrate([20, 20, 12]);
    }
    renderEncounter();
  }
  all("[data-encounter]").forEach(btn => btn.addEventListener("click", () => {
    state.encounter.kind = btn.dataset.encounter;
    if (state.mode !== state.encounter.kind) toggleMode();
    state.encounter.hp = 100; state.encounter.trust = 30; state.encounter.chosen = false; state.encounter.disabled = [];
    all("[data-encounter]").forEach(b => b.classList.toggle("active", b === btn));
    $("encounterResult").textContent = "Make a deliberate choice.";
    renderEncounter();
  }));
  $("nextEncounter").addEventListener("click", () => {
    const e = state.encounter;
    e.index++; e.hp = 100; e.trust = 30; e.disabled = []; e.chosen = false;
    $("encounterResult").textContent = "A new vessel approaches.";
    renderEncounter();
  });



  // V0.4 separates the flag painter from the game simulation.
  // This renderer runs inside the rotated ship-local drawing context.
  function drawFlag(ctx){
    if(flagWorkshop)flagWorkshop.drawOnShip(ctx,state.ship,settings,state.time);
  }
  // Ship customization: visible color and simple deterministic gameplay modifiers.
  function selectPart(kind, choice) {
    state.upgrades[kind] = choice;
    all("[data-part='" + kind + "']").forEach(b => b.classList.toggle("active", b.dataset.choice === choice));
    updateUpgradeStats();
  }
  function stars(n) { return "★".repeat(n) + "☆".repeat(5 - n); }
  function updateUpgradeStats() {
    const u = state.upgrades;
    $("upgradeSpeed").textContent = stars(u.hull === "light" ? 5 : u.hull === "armored" ? 2 : u.rig==="lateen"?4:3);
    $("upgradeHull").textContent = stars(u.hull === "armored" ? 5 : u.hull === "light" ? 2 : 3);
    $("upgradePower").textContent = stars(u.cannons === "heavy" ? 5 : u.cannons === "rapid" ? 4 : 3);
  }
  all("[data-part]").forEach(btn => btn.addEventListener("click", () => selectPart(btn.dataset.part, btn.dataset.choice)));
  all("[data-rig]").forEach(button=>button.addEventListener("click",()=>{
    state.upgrades.rig=button.dataset.rig;
    all("[data-rig]").forEach(b=>b.classList.toggle("active",b===button));
    updateUpgradeStats();
  }));
  $("resetUpgrades").addEventListener("click", () => {
    selectPart("hull", "classic"); selectPart("sails", "cream"); selectPart("cannons", "balanced");
    state.upgrades.rig="square";all("[data-rig]").forEach(b=>b.classList.toggle("active",b.dataset.rig==="square"));
  });

  // Sailing simulation: time-step based, tuned for feel. World coordinates are abstract pixels.
  const windAlignment = () => Math.cos(rad(state.ship.heading - settings.windDirection));
  const speedOfShip = () => Math.hypot(state.ship.vx, state.ship.vy);
  function vortexAcceleration() {
    if (!state.vortex.active) return { x: 0, y: 0 };
    const dx = state.vortex.x - state.ship.x, dy = state.vortex.y - state.ship.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const proximity = Math.pow(Math.max(0, 1 - d / 270), 1.4) * settings.vortexStrength;
    const pull = 135 * proximity, spin = 78 * proximity;
    return { x: (dx / d) * pull + (-dy / d) * spin, y: (dy / d) * pull + (dx / d) * spin };
  }
  function simulate(dt) {
    state.time += dt;
    if (ocean) ocean.step(dt);
    state.sailVisual += ((settings.sail/100)-state.sailVisual)*(1-Math.exp(-2.3*dt));
    feel?.step(dt);
    const s = state.ship;
    const wheel = state.wheel;
    if (!wheel.dragging) wheel.angle *= Math.exp(-settings.wheelReturn * dt);
    if (Math.abs(wheel.angle) < 0.2 && !wheel.dragging) wheel.angle = 0;
    const input = wheel.angle / 1080;
    // Full useful rudder well before three wheel revolutions; 1080° is a visual maximum.
    const target = Math.abs(input) <= settings.deadzone / 100
      ? 0 : Math.sign(input) * (1 - Math.exp(-9 * Math.abs(input))) / (1 - Math.exp(-9));
    wheel.rudder += (target - wheel.rudder) * (1 - Math.exp(-settings.rudderResponse * dt));
    // Ship forces come from one isolated physics model.
    // No position teleporting when the anchor is set: the chain can be slack,
    // gradually tensioned, or drag its fixed point under sustained overload.
    const a=state.anchor;
    if(a.down && a.phase==="falling"){
      a.fallTime+=dt;
      a.status="Dropping";
      if(a.fallTime>=.75){
        a.phase="set";
        a.status="Slack";
        if(ocean)ocean.splash(a.point.x,a.point.y,1.45,"anchor");
        $("anchorButton").classList.remove("throwing");
        vibrate([11,30,19]);
      }
    }
    const flow=ocean?ocean.sampleFlow(s.x,s.y,settings,state.vortex):vortexAcceleration();
    const hullEfficiency=state.upgrades.hull==="light"?1.12:state.upgrades.hull==="armored"?.83:1;
    const modules=state.modules;
    const modifier={
      hullFactor:hullEfficiency,
      sailFactor:modules.sails/100*(state.upgrades.rig==="storm"?.78:1),
      rig:state.upgrades.rig,
      rudderFactor:modules.rudder/100
    };
    if(window.AllAboardVessel)window.AllAboardVessel.step(s,a,wheel,settings,flow,dt,modifier);
    if(ocean)ocean.emitWake(s,settings,dt);
    if(world){
      world.simulate(dt,s,ocean,settings);
      world.collideShip(s,ocean);
      if(world.lastEncounter&&world.lastEncounter.when>state.lastWorldMessage){
        state.lastWorldMessage=world.lastEncounter.when;
        worldStatus(world.lastEncounter.message);
        vibrate([18,20,18]);
      }
    }
    const fwdX=Math.sin(rad(s.heading)),fwdY=-Math.cos(rad(s.heading));
    // Environmental reactions persist briefly at the same world coordinate.
    state.wakeTimer += dt;
    if (state.wakeTimer > 0.12 && speedOfShip() > 5 && settings.wakeStrength > 0) {
      state.wakeTimer = 0;
      state.waves.push({ x: s.x - fwdX * 30, y: s.y - fwdY * 30, age: 0, heading: s.heading });
      if (state.waves.length > 55) state.waves.shift();
    }
    state.waves.forEach(w => w.age += dt);
    state.waves = state.waves.filter(w => w.age < 4);
    state.ripples.forEach(r => r.age += dt);
    state.ripples = state.ripples.filter(r => r.age < 3.2);
    const enemy=state.enemy;
    // NPC loses propulsion after its sails break; it coasts to a stop.
    const enemyThrust=(enemy.modules.sails/100)*settings.windStrength*5.5;
    enemy.vy=enemy.vy*Math.exp(-1.35*dt)+enemyThrust*dt;
    enemy.y+=enemy.vy*dt;
    state.enemy.reload = Math.max(0, state.enemy.reload - dt);
    if (state.mode === "aggressive" && state.modules.cannons > 0 && state.enemy.hp > 0 && state.enemy.reload === 0) {
      const dx = state.enemy.x - s.x, dy = state.enemy.y - s.y;
      const dist = Math.hypot(dx, dy);
      const broadside = Math.abs(fwdY * dx - fwdX * dy) / Math.max(1, dist);
      if (dist < 165 && broadside > 0.58) {
        const cannonDamage = (state.upgrades.cannons === "heavy" ? 24 : 16)*state.modules.cannons/100;
        state.enemy.hp = Math.max(0, state.enemy.hp - cannonDamage);
        state.enemy.reload = state.upgrades.cannons === "rapid" ? 1.0 : 1.7;
        fireFeedback(state.upgrades.cannons==="heavy"?1.4:1);
        state.ripples.push({ x: state.enemy.x, y: state.enemy.y, age: 0 });
        if(ocean)ocean.splash(state.enemy.x,state.enemy.y,1,"cannon");
        vibrate(10);
        if (state.enemy.hp === 0) {
          s.coins += 65; s.score += 100;
          message("Automatic broadside victory! A new opponent is approaching.");
          state.enemy.x = s.x + random(-240, 240);
          state.enemy.y = s.y - 320;
          state.enemy.hp = 50; state.enemy.vy=0;
          state.enemy.modules={sails:100,cannons:100,rudder:100,hull:100};
        }
      }
    }

    // Simple world combat: the same automatic broadside works on generated
    // hostile vessels. This is intentionally NOT the later Perfect Broadside.
    if(world&&state.mode==="aggressive"&&state.modules.cannons>0&&state.enemy.reload===0){
      const targets=world.nearbyObjects(s.x,s.y,180).filter(item=>item.type==="ship"&&item.faction==="hostile");
      let target=null,best=Infinity;
      for(const item of targets){
        const npc=world.shipsState.get(item.id);
        const dx=(npc?.x??item.x)-s.x,dy=(npc?.y??item.y)-s.y;
        const dist=Math.hypot(dx,dy);
        const broadside=Math.abs(fwdY*dx-fwdX*dy)/Math.max(1,dist);
        if(dist<165&&broadside>.58&&dist<best){target={item,npc,x:npc?.x??item.x,y:npc?.y??item.y};best=dist;}
      }
      if(target){
        const damage=world.shipsState.get(target.item.id)||{hp:100,sails:100,phase:0};
        const amount=(state.upgrades.cannons==="heavy"?24:16)*state.modules.cannons/100;
        damage.hp=Math.max(0,damage.hp-amount);
        world.shipsState.set(target.item.id,damage);
        state.enemy.reload=state.upgrades.cannons==="rapid"?1:1.7;
        fireFeedback(state.upgrades.cannons==="heavy"?1.4:1);
        ocean?.splash(target.x,target.y,1.1,"cannon");
        if(damage.hp===0){
          world.markDestroyed(target.item);
          s.coins+=55;s.score+=65;
          worldStatus("Defeated hostile ship: "+target.item.name+". Positioning made the hit possible.");
        }
      }
    }

    // Kraken anti-grapple broadside: no new permanent shoot control.
    // The World tab also exposes a manual test button while prototyping.
    if(world&&grapple&&state.mode==="aggressive"&&state.modules.cannons>0&&state.enemy.reload===0){
      const target=world.nearbyObjects(s.x,s.y,185).find(item=>item.type==="kraken");
      if(target){
        const dx=target.x-s.x,dy=target.y-s.y,d=Math.hypot(dx,dy);
        const broadside=Math.abs(fwdY*dx-fwdX*dy)/Math.max(1,d);
        if(d<175&&broadside>.58&&grapple.hit(target.id)){
          state.enemy.reload=state.upgrades.cannons==="rapid"?1:1.6;
          ocean?.splash(target.x,target.y,1.2,"kraken-hit");
          worldStatus(grapple.lastEvent?.message||"Kraken arm damaged!");
        }
      }
    }
  }

  // Ocean renderer: light 2D procedural waves + localized visuals. No heavy dependencies.
  const canvas = $("seaCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  let viewWidth = 340, viewHeight = 630, dpr = 1;
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    viewWidth = Math.max(1, rect.width); viewHeight = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(viewWidth * dpr), height = Math.round(viewHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }
  if ("ResizeObserver" in window) new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener("resize", resizeCanvas);

  const project = (x, y) => ({
    x: viewWidth * .5 + x - state.ship.x,
    y: viewHeight * .40 + y - state.ship.y
  });
  function drawRipples() {
    for (const r of state.ripples) {
      const p = project(r.x, r.y);
      ctx.strokeStyle = "rgba(181,245,247," + (0.63 * (1 - r.age / 3.2)) + ")";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 12 + r.age * 32 + i * 12, 5 + r.age * 14 + i * 6, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
  function drawWakes() {
    for (const w of state.waves) {
      const p = project(w.x, w.y);
      const alpha = (1 - w.age / 4) * .34 * settings.wakeStrength;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rad(w.heading));
      ctx.strokeStyle = "rgba(207,252,245," + alpha + ")"; ctx.lineWidth = 1.5 + w.age * .6;
      ctx.beginPath(); ctx.moveTo(-5 - w.age * 8, w.age * 10); ctx.quadraticCurveTo(0, -7 + w.age * 7, 5 + w.age * 8, w.age * 10); ctx.stroke();
      ctx.restore();
    }
  }
  function drawVortex() {
    if (!state.vortex.active) return;
    const p = project(state.vortex.x, state.vortex.y);
    const extent = 145 * Math.max(.45, settings.vortexStrength);
    if (p.x < -extent || p.x > viewWidth + extent || p.y < -extent || p.y > viewHeight + extent) return;
    ctx.save(); ctx.translate(p.x, p.y);
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 100);
    grad.addColorStop(0, "rgba(2,23,46,.85)"); grad.addColorStop(.65, "rgba(5,79,119,.3)"); grad.addColorStop(1, "rgba(1,35,72,0)");
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill();
    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      for (let t = 0; t < 60; t++) {
        const a = arm * Math.PI / 2 + t * 0.14 + state.time * 0.6;
        const r = 2 + t * 1.35;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * .70;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(146,242,245,.37)"; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }
  function drawChest() {
    const p = project(state.chest.x, state.chest.y);
    if (p.x < -40 || p.y < -40 || p.x > viewWidth + 40 || p.y > viewHeight + 40) return;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = "#7f4b29"; ctx.strokeStyle = "#ffd97b"; ctx.lineWidth = 2;
    ctx.fillRect(-12, -5, 24, 16); ctx.strokeRect(-12, -5, 24, 16);
    ctx.fillStyle = "#f9c55f"; ctx.fillRect(-12, -9, 24, 6); ctx.fillRect(-2, -8, 4, 19);
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(3, -15); ctx.lineTo(10, -12); ctx.lineTo(3, -9); ctx.lineTo(0, -2); ctx.lineTo(-3, -9); ctx.lineTo(-10, -12); ctx.lineTo(-3, -15); ctx.closePath();
    ctx.fillStyle = "#ffefa6"; ctx.fill(); ctx.restore();
  }

  function drawNativeShip(){
    if (!shipImages.hull || !shipImages.hull.complete || !shipImages.hull.naturalWidth) return false;
    const scale=.108;
    for (const part of shipPartDefinitions) {
      const name=part[0], image=shipImages[name];
      if (!state.shipParts[name] || !image || !image.complete || !image.naturalWidth) continue;
      if (name==="anchor" && state.anchor.down) continue;
      ctx.save();
      if(name.startsWith("sail_")){
        // Fold/retract the cloth toward the yard instead of fading it away.
        // The full-width yard remains visible even when the sail is furled.
        const open=clamp(state.sailVisual,0,1);
        const x=(part[2]-400)*scale, y=(part[3]-605)*scale, w=part[4]*scale, h=part[5]*scale;
        const unfurled=.1+.9*(open*open*(3-2*open));
        ctx.globalAlpha=1;
        ctx.filter="none";
        const tint=state.upgrades.sails;
        ctx.filter=tint==="scarlet"?"sepia(1) saturate(4) hue-rotate(310deg) brightness(1.8)":
                   tint==="azure"?"sepia(1) saturate(3) hue-rotate(145deg) brightness(1.8)":
                   "brightness(1.25)";
      }
      if(name==="hull"){
        ctx.filter=state.upgrades.hull==="light"?"brightness(1.16) saturate(1.05)":
                   state.upgrades.hull==="armored"?"grayscale(.45) contrast(1.1)":"none";
      }
      if(name.startsWith("cannon_")&&state.modules.cannons<100){
        ctx.globalAlpha=.22+.78*(state.modules.cannons/100);
        ctx.filter=state.modules.cannons===0?"grayscale(1) brightness(.6)":"sepia(.6)";
      }
      if(name.startsWith("sail_")){
        // The sourced sail SVG includes a horizontal yard at its bottom edge.
        // Compressing the sail upward/downward around that yard creates a
        // visibly tied, folded sail — without simply hiding the original art.
        const x=(part[2]-400)*scale,y=(part[3]-605)*scale;
        const w=part[4]*scale,h=part[5]*scale;
        // Rotate around the sail yard, preserving original SVG image and furling.
        // This is an artistic arcade tilt, not 3D aerodynamic cloth simulation.
        const tilt=rad((state.ship.sailTrim||0)*.24);
        ctx.translate(x+w/2,y+h);ctx.rotate(tilt);ctx.translate(-(x+w/2),-(y+h));
        const damage=clamp(state.modules.sails/100,0,1);
        const open=clamp(state.sailVisual,0,1)*damage;
        const fold=.10+.90*(open*open*(3-2*open));
        if(state.upgrades.rig==="square"){
          ctx.drawImage(image,x,y+h*(1-fold),w,h*fold);
        }else{
          // Two different sail silhouettes; rig impacts the physics model too.
          const rig=state.upgrades.rig;
          ctx.strokeStyle="#7d493e";ctx.lineWidth=2.3;
          ctx.beginPath();ctx.moveTo(x+3,y+h-1);ctx.lineTo(x+w-3,y+h-1);ctx.stroke();
          ctx.fillStyle=state.upgrades.sails==="scarlet"?"#cf877e":
                        state.upgrades.sails==="azure"?"#abdce6":"#f1dec1";
          ctx.beginPath();
          if(rig==="lateen"){
            ctx.moveTo(x+w*.20,y+h-4);ctx.lineTo(x+w*.86,y+h-4);
            ctx.lineTo(x+w*.20,y+h-h*fold);
          }else{
            ctx.moveTo(x+w*.26,y+h-4);ctx.lineTo(x+w*.74,y+h-4);
            ctx.lineTo(x+w*.60,y+h-h*fold*.48);ctx.lineTo(x+w*.40,y+h-h*fold*.48);
          }
          ctx.closePath();ctx.fill();
        }
        if(damage<.5){
          // Visible torn cloth/damaged mast, not invisible "lost health".
          ctx.strokeStyle="#ee7865";ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(x+w*.37,y+h-h*fold*.6);
          ctx.lineTo(x+w*.62,y+h-h*fold*.22);ctx.stroke();
        }
        if(open<.35){
          ctx.fillStyle=state.upgrades.sails==="scarlet"?"#c26a62":
                        state.upgrades.sails==="azure"?"#8bd3e6":"#ccb992";
          ctx.fillRect(x+w*.12,y+h-3,w*.76,3);
          ctx.strokeStyle="#72503c";ctx.lineWidth=1;
          for(let i=1;i<5;i++){
            const px=x+w*i/5;
            ctx.beginPath();ctx.moveTo(px,y+h-5);ctx.lineTo(px,y+h);ctx.stroke();
          }
        }
      }else{
        ctx.drawImage(image,(part[2]-400)*scale,(part[3]-605)*scale,part[4]*scale,part[5]*scale);
      }
      ctx.restore();
    }
    return true;
  }

  function sailColor() {
    return { cream: "#f6e9c6", scarlet: "#e28e89", azure: "#9de2ee" }[state.upgrades.sails];
  }
  function drawSmallEnemy() {
    const p = project(state.enemy.x, state.enemy.y);
    if (p.x < -35 || p.x > viewWidth + 35 || p.y < -35 || p.y > viewHeight + 35) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-.3);
    ctx.fillStyle = "#4d2732"; ctx.strokeStyle = "#e8b5ab"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -23); ctx.bezierCurveTo(15, -15, 17, 15, 0, 24); ctx.bezierCurveTo(-17, 15, -15, -15, 0, -23); ctx.fill(); ctx.stroke();
    if(state.enemy.modules.sails>0){
      ctx.fillStyle="#e0c2b9";ctx.beginPath();ctx.moveTo(0,-16);
      ctx.lineTo(-10*(state.enemy.modules.sails/100),13);
      ctx.lineTo(10*(state.enemy.modules.sails/100),13);
      ctx.closePath();ctx.fill();
    }else{
      ctx.strokeStyle="#ff9788";ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(-11,4);ctx.lineTo(11,4);ctx.stroke();
      ctx.font="bold 9px Arial";ctx.textAlign="center";ctx.fillStyle="#fff3db";
      ctx.fillText("SAILS OUT",0,37);
    }
    ctx.fillStyle = "#ffbeb3"; ctx.fillRect(-19, -32, 38 * state.enemy.hp / 50, 4);
    ctx.restore();
  }
  function drawShip() {
    const p = project(state.ship.x, state.ship.y);
    ctx.save(); ctx.translate(p.x, p.y);
    const pose=feel?.pose(ocean,state.ship,settings,state.time);
    const bob=(pose?.bob??0)*settings.waveRoll;
    ctx.translate(pose?.shakeX*settings.cameraShake||0,
      bob+(pose?.shakeY||0)*settings.cameraShake-(pose?.recoil||0)*1.6);
    ctx.rotate(rad(state.ship.heading)+(pose?.roll||0)*settings.waveRoll+
      (pose?.pitch||0)*settings.waveRoll);
    if(drawNativeShip()){
      if(state.modules.rudder<100){
        ctx.strokeStyle="#ff9a78";ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(-8,42);ctx.lineTo(8,56);
        ctx.moveTo(8,42);ctx.lineTo(-8,56);ctx.stroke();
      }
      drawFlag(ctx);ctx.restore();return;
    }
    ctx.shadowColor = "#06213e"; ctx.shadowBlur = 17; ctx.shadowOffsetY = 8;
    const hullColor = state.upgrades.hull === "armored" ? "#6a7181" : state.upgrades.hull === "light" ? "#d09a52" : "#ac5d25";
    ctx.fillStyle = hullColor; ctx.strokeStyle = "#4d311b"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -49); ctx.bezierCurveTo(24, -34, 25, -6, 21, 24); ctx.quadraticCurveTo(18, 44, 0, 51); ctx.quadraticCurveTo(-18, 44, -21, 24); ctx.bezierCurveTo(-25, -6, -24, -34, 0, -49); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#d99a4b"; ctx.beginPath(); ctx.moveTo(0, -39); ctx.bezierCurveTo(16, -25, 15, 22, 0, 39); ctx.bezierCurveTo(-15, 22, -16, -25, 0, -39); ctx.fill();
    ctx.strokeStyle = "#69421f"; ctx.lineWidth = 2;
    for (let y = -20; y <= 30; y += 10) { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(12, y); ctx.stroke(); }
    ctx.fillStyle = "#322c2d";
    [-18, -1, 16].forEach(y => { ctx.fillRect(-26, y, 12, 5); ctx.fillRect(14, y, 12, 5); });
    const size = state.sailVisual;
    if (size > .03) {
      ctx.globalAlpha = .86 + size * .14; ctx.fillStyle = sailColor(); ctx.strokeStyle = "#b89963"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-2, -31); ctx.quadraticCurveTo(-29 * size, -12, -16 * size, 12); ctx.lineTo(-2, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, -30); ctx.quadraticCurveTo(29 * size, -8, 17 * size, 13); ctx.lineTo(2, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#63391e"; ctx.fillRect(-3, -39, 6, 70);
    ctx.fillStyle = "#ffe7a5"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 2 * Math.PI); ctx.fill();
    if (state.anchor.down) { ctx.fillStyle = "#fff0c8"; ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("⚓", 0, 66); }
    drawFlag(ctx);ctx.restore();
  }

  function drawAnchorChain(){
    const a=state.anchor;
    if(!a.down || !state.shipParts.anchor)return;
    const ship=state.ship;
    const sternX=ship.x-Math.sin(rad(ship.heading))*38;
    const sternY=ship.y+Math.cos(rad(ship.heading))*38;
    const p1=project(sternX,sternY),p2=project(a.point.x,a.point.y);
    const dx=p2.x-p1.x,dy=p2.y-p1.y,dist=Math.max(.01,Math.hypot(dx,dy));
    const slack=Math.max(0,settings.anchorLine-dist);
    const sag=Math.min(23,6+slack*.35);
    const ctrl={x:(p1.x+p2.x)/2-dy/dist*sag,y:(p1.y+p2.y)/2+dx/dist*sag};
    const fall=clamp(a.fallTime/.75,0,1);
    ctx.save();ctx.strokeStyle="#263c47";ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.quadraticCurveTo(ctrl.x,ctrl.y,p2.x,p2.y);ctx.stroke();
    ctx.strokeStyle=a.status==="Dragging"?"#ffd179":"#a4bcc1";ctx.lineWidth=2.2;
    ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(p1.x,p1.y);
    ctx.quadraticCurveTo(ctrl.x,ctrl.y,p2.x,p2.y);ctx.stroke();ctx.setLineDash([]);
    // A readable link chain rather than a static single line.
    const steps=Math.max(2,Math.min(21,Math.round(dist/9)));
    ctx.strokeStyle="#cfdbcf";ctx.lineWidth=1.4;
    for(let i=1;i<steps;i++){
      const t=i/steps,u=1-t;
      const x=u*u*p1.x+2*u*t*ctrl.x+t*t*p2.x;
      const y=u*u*p1.y+2*u*t*ctrl.y+t*t*p2.y;
      ctx.beginPath();ctx.ellipse(x,y,2.8,1.8,t*.3,0,Math.PI*2);ctx.stroke();
    }
    const anchorPoint={
      x:p1.x+(p2.x-p1.x)*fall,
      y:p1.y+(p2.y-p1.y)*fall-(1-fall)*12*Math.sin(Math.PI*fall)
    };
    ctx.translate(anchorPoint.x,anchorPoint.y);
    if(a.phase==="falling"){
      // During the throw the anchor is visible, then sinks below the water.
      ctx.strokeStyle="#e9d2a3";ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(0,-9,3,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,9);ctx.moveTo(-7,-2);ctx.lineTo(7,-2);
      ctx.moveTo(-11,4);ctx.quadraticCurveTo(-9,14,0,14);ctx.quadraticCurveTo(9,14,11,4);
      ctx.stroke();
    }else{
      // The seabed anchor is no longer visible in deep water. Only the
      // dipping chain and a faint surface contact point remain.
      ctx.fillStyle="rgba(19,62,91,.65)";
      ctx.beginPath();ctx.ellipse(0,0,7,4,0,0,Math.PI*2);ctx.fill();
      if(a.status==="Dragging"){
        ctx.strokeStyle="rgba(255,204,121,.55)";ctx.lineWidth=1.3;
        ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*1.3);ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawWorld() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = viewWidth, h = viewHeight;
    if (ocean) {
      ocean.drawBackground(ctx,{w,h,project},settings,state.ship);
    } else {
      const bg=ctx.createLinearGradient(0,0,w,h);
      bg.addColorStop(0,"#164d7c");bg.addColorStop(1,"#0f4b78");
      ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    }
    drawVortex();
    if(world)world.render(ctx,project,state.ship,{width:w,height:h});
    if(settings.windFX>0&&settings.windStrength>0){
      const a=rad(settings.windDirection),dx=Math.sin(a),dy=-Math.cos(a);
      ctx.save();
      ctx.strokeStyle="rgba(209,248,238,"+(Math.min(.2,settings.windFX*.075)) +")";
      ctx.lineWidth=1;
      const count=Math.min(24,Math.round(settings.windStrength*2.6*settings.windFX));
      for(let i=0;i<count;i++){
        const x=((i*97+state.time*settings.windStrength*21)% (w+100))-50;
        const y=((i*131+state.time*settings.windStrength*17)% (h+100))-50;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx*16,y+dy*16);ctx.stroke();
      }
      ctx.restore();
    }
    if(state.worldGrid&&world)drawWorldChunkGrid(ctx,w,h);
    // Water-only effects are clipped against the island's exact land polygon.
    ctx.save();
    if(world)world.clipWater(ctx,project,state.ship,w,h);
    if(ocean)ocean.drawEffects(ctx,{project});
    drawRipples();
    ctx.restore();
    drawAnchorChain();
    drawChest();
    drawSmallEnemy();
    drawShip();
    if(flagWorkshop)flagWorkshop.positionGif(state.ship,{time:state.time,waveHeight:settings.waveHeight,windDirection:settings.windDirection,windStrength:settings.windStrength},project);
  }
  function drawWorldChunkGrid(ctx,w,h){
    const scale=world.constructor.CHUNK_SIZE;
    const firstX=Math.floor((state.ship.x-w*.5)/scale)-1;
    const firstY=Math.floor((state.ship.y-h*.4)/scale)-1;
    ctx.save();ctx.strokeStyle="rgba(233,244,225,.30)";ctx.lineWidth=1;
    ctx.font="11px Arial";ctx.fillStyle="#eefcfa";
    for(let dy=0;dy<5;dy++)for(let dx=0;dx<5;dx++){
      const cx=firstX+dx,cy=firstY+dy;
      const pt=project(cx*scale,cy*scale);
      ctx.strokeRect(pt.x,pt.y,scale,scale);
      ctx.fillText(cx+","+cy,pt.x+10,pt.y+17);
    }
    ctx.restore();
  }

  const headingTicks=[];
  function renderHeadingTape(heading){
    const marks=$("headingMarks");
    if(!headingTicks.length){
      for(let i=-8;i<=8;i++){
        const tick=document.createElement("span");
        tick.className="tape-tick";
        tick.style.position="absolute";
        marks.append(tick);
        headingTicks.push(tick);
      }
    }
    const nearest=Math.round(heading/15)*15;
    const cardinals={0:"N",90:"E",180:"S",270:"W"};
    for(let i=0;i<headingTicks.length;i++){
      const deg=nearest+(i-8)*15;
      const cardinal=Math.round(wrapDegrees(deg))%360;
      const x=(deg-heading)*1.55;
      const tick=headingTicks[i];
      tick.style.left="calc(50% + "+x.toFixed(2)+"px)";
      const isCardinal=cardinals[cardinal]!==undefined;
      tick.classList.toggle("cardinal",isCardinal);
      tick.textContent=isCardinal?cardinals[cardinal]:(deg%30===0?String(cardinal):"·");
    }
  }
  function drawMiniMap(){
    const map=$("miniMapCanvas");
    if(!map)return;
    const c=map.getContext("2d");
    if(!c||typeof c.fillRect!=="function")return;
    if(map.width!==90)map.width=90;
    if(map.height!==90)map.height=90;
    c.clearRect(0,0,90,90);
    c.fillStyle="#0b4362";c.fillRect(0,0,90,90);
    c.strokeStyle="#6eb4cf37";c.lineWidth=1;
    for(let v=15;v<90;v+=15){c.beginPath();c.moveTo(v,0);c.lineTo(v,90);c.moveTo(0,v);c.lineTo(90,v);c.stroke();}
    c.strokeStyle="#abdfe477";c.beginPath();c.arc(45,45,35,0,Math.PI*2);c.stroke();
    const things=[
      {x:state.chest.x,y:state.chest.y,color:"#ffda78",r:3},
      {x:state.enemy.x,y:state.enemy.y,color:"#f09889",r:4},
      ...(state.vortex.active?[{x:state.vortex.x,y:state.vortex.y,color:"#85dcea",r:6}]:[]),
      ...(world?world.nearbyObjects(state.ship.x,state.ship.y,245).map(item=>({
        x:item.x,y:item.y,r:item.type==="island"?5:item.type==="kraken"?6:3,
        color:item.type==="island"?"#c5d0a0":
          item.type==="kraken"?"#dc9de9":
          item.type==="treasure"?"#ffdc78":
          item.faction==="friendly"?"#9ee8bd":"#f29c9c"
      })):[])
    ];
    for(const t of things){
      const x=45+(t.x-state.ship.x)*.18,y=45+(t.y-state.ship.y)*.18;
      if(x<4||x>86||y<4||y>86)continue;
      c.beginPath();c.arc(x,y,t.r,0,Math.PI*2);
      c.fillStyle=t.color;c.fill();
    }
    c.save();c.translate(45,45);c.rotate(rad(state.ship.heading));
    c.beginPath();c.moveTo(0,-9);c.lineTo(-6,7);c.lineTo(0,3);c.lineTo(6,7);c.closePath();
    c.fillStyle="#eafafa";c.fill();c.restore();
    c.font="bold 8px Arial";c.fillStyle="#cfedee";c.fillText("N",79,9);
  }

  function updateUI() {
    const ship = state.ship;
    const alignment = windAlignment();
    const speed = speedOfShip();
    $("helmWheel").style.transform = "rotate(" + state.wheel.angle.toFixed(2) + "deg)";
    wheel.setAttribute("aria-valuenow", String(Math.round(state.wheel.angle)));
    $("wheelReading").textContent = Math.round(state.wheel.angle) + "°";
    $("wheelReadingBar").style.width = ((state.wheel.angle + 1080) / 2160 * 100) + "%";
    $("rudderReading").textContent = Math.round(state.wheel.rudder * 100) + "%";
    $("headingValue").textContent = formatHeading(ship.heading);
    $("statHeading").textContent = formatHeading(ship.heading);
    $("statSpeed").textContent = speed.toFixed(1);
    $("forwardSpeedValue").textContent=(ship.forwardSpeed||0).toFixed(1);
    $("sideSpeedValue").textContent=(ship.sideSpeed||0).toFixed(1);
    $("sailEfficiencyValue").textContent=Math.round((ship.sailEfficiency||0)*100)+"%";
    $("trimIdeal").textContent=Math.round(ship.idealTrim||0)+"°";
    $("trimBonus").textContent=Math.round((ship.trimFactor||1)*100)+"%";
    $("feelReadout").textContent="Current ship visual pose is sampled from OceanField. Sail tilt "+
      Math.round(ship.sailTrim||0)+"°, trim efficiency "+
      Math.round((ship.trimFactor||1)*100)+"%.";
    $("tailwindBoostInfo").textContent=Math.round((ship.windBoost||0)*100)+"% wind drive";
    $("statAlignment").textContent = (alignment >= 0 ? "+" : "") + alignment.toFixed(2);
    $("speedValue").textContent = speed.toFixed(1);
    $("rudderValue").textContent = Math.round(state.wheel.rudder * 100) + "%";
    $("statAnchor").textContent = state.anchor.status;
    $("statAnchorInfo").textContent = state.anchor.down
      ? "Chain " + Math.round(state.anchor.length) + " / " + settings.anchorLine + " · Tension " + Math.round(state.anchor.tension*100) + "%"
      : "Free to sail";
    const deployedLine=Math.round(state.anchor.lineLength??settings.anchorLine);
    $("anchorDistance").textContent = Math.round(state.anchor.length) + " / " + deployedLine;
    $("anchorDistanceInspector").textContent = Math.round(state.anchor.length) + " / " + settings.anchorLine;
    $("anchorTension").textContent = Math.round(state.anchor.tension*100) + "%";
    $("anchorCondition").textContent = Math.abs(deployedLine-settings.anchorLine)>1?
      "Reeling "+deployedLine+" → "+settings.anchorLine+" · "+state.anchor.status:state.anchor.status;
    $("sailQuickTrimValue").textContent=Math.round(ship.sailTrim||0)+"° / ideal "+
      Math.round(ship.idealTrim||0)+"°";
    if(settings.sailAutoTrim&&$("sailTrimQuick").hidden===false)
      $("sailTrimQuickSlider").value=ship.sailTrim||0;
    $("chainFill").style.width = Math.min(100, state.anchor.length/Math.max(1,deployedLine)*100) + "%";
    drawMiniMap();
    $("windArrow").style.transform = "rotate(" + (settings.windDirection - 90) + "deg)";
    $("windValue").textContent = settings.windStrength.toFixed(1);
    const offWind=ship.windAngle===undefined?180:ship.windAngle;
    $("windRelation").textContent=offWind<35?"NO-GO":offWind<75?"CLOSE REACH":offWind<145?"BEAM REACH":offWind<170?"BROAD REACH":"RUNNING";
    $("alignmentReading").textContent = (alignment >= 0 ? "+" : "") + alignment.toFixed(2);
    $("alignmentDescription").textContent=offWind<35?"No-go zone: little thrust in direct headwind.":
      offWind<75?"Close reach: partial wind efficiency.":
      offWind<145?"Beam/broad reach: highest sail efficiency.":
      "Downwind: steady sail drive, slower than a reach.";
    $("coinValue").textContent = ship.coins.toLocaleString("en-US");
    $("scoreValue").textContent = String(ship.score).padStart(3, "0");
    $("hpFill").style.width = ship.hull + "%";
    const distToChest = Math.hypot(ship.x - state.chest.x, ship.y - state.chest.y);
    const proceduralTreasure=world?.nearest(ship.x,ship.y,"treasure",70);
    $("chestAction").style.display=(distToChest<64||proceduralTreasure)?"block":"none";
    const nearbyNPC=world?.nearest(ship.x,ship.y,"ship",85);
    $("worldShipInteract").hidden=!(nearbyNPC&&state.mode==="friendly");
    if(nearbyNPC)$("worldShipInteract").textContent="♡ Hail "+nearbyNPC.name;
    refreshWorldStats();
    const nearbyKraken=world?.nearbyObjects(ship.x,ship.y,260).find(item=>item.type==="kraken");
    $("krakenLabStatus").textContent=grapple?.status(nearbyKraken)||
      "Kraken arm lab: summon nearby, wait for warning, then shoot its arm.";
    $("fpsValue").textContent = Math.round(state.frameRate) + " FPS";
  }
  let lastFrame = 0, lastHud = 0, physicsAccumulator = 0;
  const physicsStep = 1 / 60;
  function frame(timestamp) {
    if (!lastFrame) lastFrame = timestamp;
    const dt = Math.min(.06, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    if (dt > 0) state.frameRate = state.frameRate * .93 + (1 / dt) * .07;
    if (!state.paused && !document.hidden) {
      physicsAccumulator = Math.min(.12, physicsAccumulator + dt);
      let ticks = 0;
      while (physicsAccumulator >= physicsStep && ticks < 5) {
        simulate(physicsStep);
        physicsAccumulator -= physicsStep;
        ticks++;
      }
    } else physicsAccumulator = 0;
    drawWorld();
    // Wheel and rudder visuals MUST update every animation frame, not at 14 FPS HUD cadence.
    $("helmWheel").style.transform = "rotate(" + state.wheel.angle.toFixed(2) + "deg)";
    renderHeadingTape(state.ship.heading);
    if (timestamp - lastHud > 70) { updateUI(); lastHud = timestamp; }
    requestAnimationFrame(frame);
  }
  function resetEverything() {
    settings = { ...defaultSettings };
    state.ship = { x: 0, y: 0, vx: 0, vy: 0, heading: 0, angularVelocity: 0, forwardSpeed: 0, sideSpeed: 0, sailEfficiency: 0, hull: 100, score: 0, coins: 1250 };
    state.wheel = { angle: 0, dragging: false, pointerAngle: 0, rudder: 0, lastTick: 0 };
    state.anchor = { down: false, point: { x: 0, y: 0 }, status: "Raised", phase: "raised", fallTime: 0, overload: 0, tension: 0, length: 0, lineLength: 70 };
    state.chest = { x: 85, y: -265, collected: false };
    state.enemy = { x: -135, y: -275, vx:0,vy:0,hp:50,reload:0,modules:{sails:100,cannons:100,rudder:100,hull:100} };
    state.modules = { sails:100,cannons:100,rudder:100,hull:100 };
    state.waves = []; state.ripples = []; state.sailVisual = .72;
    if(feel){feel.recoil=0;feel.impact=0;feel.reducedMotion=false;}
    $("anchorChainEditor").hidden=true;$("anchorChainToggle").setAttribute("aria-expanded","false");
    $("sailTrimQuick").hidden=true;$("sailTrimToggle").setAttribute("aria-expanded","false");
    $("reduceMotion").checked=false;$("sailAutoTrim").checked=true;
    if(ocean) ocean.reset();
    state.paused = false; physicsAccumulator = 0; $("pauseButton").textContent = "⏸ Pause simulation";
    $("anchorButton").classList.remove("pressed"); $("anchorButton").setAttribute("aria-pressed", "false");
    $("anchorInspector").textContent = "⚓ Drop anchor"; $("anchorLabel").textContent = "DROP"; $("anchorRopeHud").hidden = true;
    state.mode = "friendly";
    if(world)resetWorld(world.seed,world.options);
    if(flagWorkshop)flagWorkshop.reset();
    $("modeButton").className = "game-btn mode-btn friendly";
    $("modeLabel").textContent = "♡ FRIENDLY"; $("modeNextLabel").textContent = "✹ Aggressive ↔";
    setScenario("open"); resetDamage(); syncSettings(); updateUI();
    message("Reset! All experiments are ready to be tested again.");
  }
  $("resetAll").addEventListener("click", resetEverything);
  function applyMechanicsPreset(data){
    if(!data||!data.settings||typeof data.settings!=="object")throw Error("Invalid mechanics preset");
    const filtered=Object.fromEntries(Object.entries(data.settings).filter(([key,v])=>
      key in defaultSettings&&typeof v==="number"&&Number.isFinite(v)));
    settings={...defaultSettings,...filtered};
    if(typeof data.settings.sailAutoTrim==="boolean")settings.sailAutoTrim=data.settings.sailAutoTrim;
    if(data.upgrades&&typeof data.upgrades==="object")state.upgrades={...state.upgrades,...data.upgrades};
    if(data.hudLayout)window.AllAboardUILayoutInstance?.restore(data.hudLayout);
    if(data.flag)flagWorkshop?.restorePreset?.(data.flag);
    syncSettings();updateUI();
    message("Mechanics preset loaded. You can reset or restore your original snapshot.");
    return true;
  }
  $("loadFavoritePreset").addEventListener("click",async()=>{
    try{
      const response=await fetch("./presets/dor-loved-v08-mechanics.json");
      if(!response.ok)throw Error("Cannot load favorite preset");
      applyMechanicsPreset(await response.json());
      message("Restored favorite V0.8 snapshot: wave height 1.3, detail 36, push 1.7, wake 1.4.");
    }catch(err){message("Favorite preset unavailable: "+err.message);}
  });
  $("importMechanicsPresetButton").addEventListener("click",()=>$("importMechanicsPreset").click());
  $("importMechanicsPreset").addEventListener("change",async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{
      if(file.size>500000)throw Error("Maximum preset file size 500 KB");
      applyMechanicsPreset(JSON.parse(await file.text()));
    }catch(err){message("Preset import error: "+err.message);}
    e.target.value="";
  });
  $("savePreset").addEventListener("click", () => {
    const exportData = {
      title: "All Aboard Mechanics Lab tuning", version: 4,
      settings, upgrades: state.upgrades,
      hudLayout: window.AllAboardUILayoutInstance?.snapshot()||null,
      flag: flagWorkshop?.exportPreset?.()||null,
      audioDirection:"playful-to-cinematic-combat",
      note: "Concept parameters, not physically measured units; GIF flags export a still poster."
    };
    const file = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "all-aboard-mechanics-preset.json";
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 300);
  });


  // Unmodified V0.5 water implementation saved under water/v0.5-ocean.js.
  function downloadLabFile(filename,text,mime="application/json"){
    const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=filename;
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  $("waterBaseline").addEventListener("click",()=>{
    Object.assign(settings,{waveHeight:.7,waveDetail:22,wavePush:.65,wakeStrength:1});
    if(ocean)ocean.lastSurface=-100;
    syncSettings();
    $("waterBaselineStatus").textContent="V0.5 water profile restored. Island masking remains enabled.";
    message("Original V0.5 procedural water tuning restored without resetting the ship.");
  });
  $("waterJsonExport").addEventListener("click",()=>{
    const data={kind:"AllAboardOceanBaseline",version:"V0.6",basedOn:"V0.5",
      seed:world?.seed||"ALL-ABOARD",time:ocean?.time||0,
      camera:{x:state.ship.x,y:state.ship.y},
      water:{waveHeight:settings.waveHeight,waveDetail:settings.waveDetail,
        wavePush:settings.wavePush,wakeStrength:settings.wakeStrength,
        currentStrength:settings.currentStrength,
        windStrength:settings.windStrength,windDirection:settings.windDirection},
      note:"Arcade-tuned, non-SI units. Visual ocean snapshot can be exported separately."};
    downloadLabFile("all-aboard-water-tuning.json",JSON.stringify(data,null,2));
  });
  $("waterSnapshot").addEventListener("click",()=>{
    if(!ocean||!window.AllAboardOcean)return;
    const c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(viewWidth));
    c.height=Math.max(1,Math.round(viewHeight));
    const imageCtx=c.getContext("2d");
    if(!imageCtx||typeof c.toDataURL!=="function")return;
    const capture=new window.AllAboardOcean();
    capture.time=ocean.time;
    capture.drawBackground(imageCtx,{w:c.width,h:c.height},settings,state.ship);
    const a=document.createElement("a");a.href=c.toDataURL("image/png");
    a.download="all-aboard-water-v0.6.png";document.body.append(a);a.click();a.remove();
    $("waterBaselineStatus").textContent="Clean water PNG captured. Export JSON separately for its tuning values.";
  });

  updateUpgradeStats();
  resetDamage();
  renderEncounter();
  if(window.AllAboardFlagWorkshop?.FlagWorkshop){
    flagWorkshop=new window.AllAboardFlagWorkshop.FlagWorkshop();
    flagWorkshop.mount();
    window.AllAboardFlagWorkshopInstance=flagWorkshop;
  }
  if(window.AllAboardMechanicsReview?.MechanicsReview){
    mechanicsReview=new window.AllAboardMechanicsReview.MechanicsReview();
    mechanicsReview.mount();
  }
  bindWorldControls();
  if(ocean&&world)ocean.setWaterMask((x,y)=>!world||world.isWater(x,y));
  window.AllAboardLiveBridge={
    getWorld:()=>world,getShip:()=>state.ship,getOcean:()=>ocean,
    getSettings:()=>settings,getState:()=>state,setTab
  };
  syncSettings();
  resizeCanvas();
  requestAnimationFrame(frame);
})();
