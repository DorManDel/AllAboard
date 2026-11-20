/* All Aboard — V0.5 Mechanic Catalog
 * Single source for the lab planner and a future Jira handoff.
 * Status is design intent, not a claim of implemented/approved behavior.
 * No secrets, issue tokens, or external network calls.
 */
(function(root){
"use strict";
const plans=[
  {
    id:"stage-loop",title:"Stage + Endless Stay-or-Leave Loop",category:"Game Loop",phase:"Core",priority:"P0",effort:"M",
    summary:"Eilon's fused idea: complete a stage objective, then cash out or remain for escalating optional rounds.",
    player:"After completing an objective choose LEAVE (bank rewards) or STAY (harder encounter, better loot).",
    prototype:"Run a deterministic Loop Lab with an objective, pending rewards, danger level, and a stay/leave checkpoint.",
    mvp:["One objective per stage","Objective reward is guaranteed on completion","After objective, show explicit Stay / Leave decision","Every extra round raises enemy pressure and bonus potential","Leaving banks pending rewards and records the same stage checkpoint"],
    acceptance:["Never force players into an endless round","Clear risk warning and potential reward before Stay","Leaving and returning does not restart a completed objective","If defeated, only unbanked optional loot is lost"],
    dependencies:["world","sails","damage","stage-save"],
    unity:["StageSession","ObjectiveDirector","RiskRewardController"],jiraType:"Story",postCore:false
  },
  {
    id:"stage-save",title:"Stage Checkpoint & Continue",category:"Game Loop",phase:"Core",priority:"P0",effort:"S",
    summary:"Resuming a run must preserve the cleared stage objective and banked progress, not quietly reset the run.",
    player:"Leave safely; return to the same stage decision point or select the next stage.",
    prototype:"In Loop Lab cash out, enter port, resume same stage, then advance deliberately.",
    mvp:["Record stage ID, objective cleared, banked coins and unlocked rewards","Restore choice state at the same stage","Do not restore unbanked rewards after a defeat","Version checkpoints for future schema changes"],
    acceptance:["Reload reproduces stage and banked balance","No double objective reward after resume","Manual reset is explicit and separate from leaving"],
    dependencies:["stage-loop"],unity:["RunSaveData","RunCheckpointService"],jiraType:"Task",postCore:false
  },
  {
    id:"onboarding",title:"10-Second First-Run Tutorial",category:"Game Loop",phase:"Core",priority:"P0",effort:"S",
    summary:"Teach the minimum in ten seconds using contextual prompts while the player is already playing.",
    player:"0–3s steer; 3–6s raise/lower sails; 6–8s cannons auto-fire when aligned; 8–10s Stay vs Leave.",
    prototype:"A tappable four-step tutorial storyboard and a 10-second playback inside Loop Lab.",
    mvp:["Four illustrated contextual prompts","No long text walls or separate tutorial scene","Skip / Replay in Settings","New mechanics introduced only when first encountered"],
    acceptance:["First-time player can steer and finish one stage objective without reading a manual","Tutorial is skippable and no more than 10 seconds of prompts","Tap targets remain comfortable in portrait"],
    dependencies:["helm","sails","cannons","stage-loop"],unity:["TutorialSequence","HintPresenter"],jiraType:"Story",postCore:false
  },
  {
    id:"sailing-feel",title:"Ship Feel & Reactive Ocean",category:"Core Sailing",phase:"Core",priority:"P0",effort:"L",
    summary:"Stable boat-like motion, keel resistance, wind polar, meaningful wakes, splash impulses and anchored drift.",
    player:"Read wind/current, steer smoothly, use anchor to pivot or resist hazards.",
    prototype:"Keep V0.3/V0.4 vessel and ocean lab; instrument side slip, wake emission and anchor jitter.",
    mvp:["Separate lateral and forward water resistance","Wind TO arrow with no-go zone","Wake intensity from speed and turn","Anchor and projectiles create water impulses","One shared OceanField force + visual contract"],
    acceptance:["No skating or sharp anchor teleporting","Ship motion and wake reflect speed","Fluid-like water remains performant on actual Android"],
    dependencies:["helm","sails","anchor"],unity:["ShipMotionModel","OceanField","OceanRenderer"],jiraType:"Story",postCore:false
  },
  {
    id:"world",title:"Seeded World / Islands / Ships / Treasure",category:"World",phase:"Core",priority:"P1",effort:"L",
    summary:"Seeded chunk streaming so every short voyage offers new discoveries without keeping the full sea in memory.",
    player:"Explore predictable geography with surprising encounters and collectible treasure.",
    prototype:"V0.4 world chunk generator; verify negative coordinates, save state and object persistence.",
    mvp:["Stable seed/version/chunk IDs","Chunk-based load/unload around ship","Safe spawn + basic island collisions","Friendly/hostile vessels and chest locations","Persistent collected/destroyed IDs"],
    acceptance:["Same seed and location always produce same layout","Chunks do not grow unbounded in active memory","Collected treasure cannot be farmed by leaving and returning"],
    dependencies:["sailing-feel"],unity:["WorldGenerator","ChunkStreamer","WorldObjectState"],jiraType:"Story",postCore:false
  },
  {
    id:"damage",title:"Ship Part Damage & Repair",category:"Combat",phase:"Core",priority:"P1",effort:"M",
    summary:"Damage mast, sails, cannon ports, rudder or hull sections; repair consumes a turn or a scarce resource.",
    player:"Position broadsides to disable enemy capabilities instead of only reducing an abstract HP bar.",
    prototype:"Spatial hit pattern, module health, short fire spread and hull leakage experiment.",
    mvp:["Each module has health and disabled state","Cannon hits damage a center and nearby tiles","Burning/flooding advances on encounter ticks","Repair has an explicit cost","Visible broken/furled/blackened parts"],
    acceptance:["Destroyed sails reduce propulsion","Disabled cannons cannot fire","Repair restores function and visual state"],
    dependencies:["cannons","world"],unity:["ShipModules","DamageResolver","RepairAction"],jiraType:"Story",postCore:false
  },
  {
    id:"cannons",title:"Auto-Cannon Trajectory & Collision",category:"Combat",phase:"Core",priority:"P1",effort:"M",
    summary:"Aim by positioning the broadside. Individual shots travel through the world and hit a specific part or splash in the sea.",
    player:"Use heading, distance and ship speed to place shots; no extra Fire button.",
    prototype:"Projectile flight paths drawn from gun ports with time-of-flight, velocity and non-homing collisions.",
    mvp:["Fire only from enabled gun ports and valid broadside arc","Spawn from each gun muzzle in ship-local space","Predictable projectile travel time and hitboxes","Optional wind/current drift as a tuning experiment","Arc height is a visual overlay; collisions use horizontal position"],
    acceptance:["No bullets teleport to the enemy","Missing shots create water splashes","Damage depends on impact position and ammunition choice"],
    dependencies:["damage","sailing-feel"],unity:["BroadsideController","ProjectileMotor","CollisionResolver"],jiraType:"Story",postCore:false
  },
  {
    id:"ammo",title:"Ammo Types — Cannonball / Chain / Barrel / Chicken",category:"Combat",phase:"After Core",priority:"P2",effort:"M",
    summary:"Small set of readable ammunition types with distinct tactical effects, chosen in the loadout.",
    player:"Cannonball damages hull; chain shot snags sails; barrel creates delayed area danger; chicken briefly distracts an NPC.",
    prototype:"Compare range/arc, impact footprint, damage type and cooldown before introducing more ammo.",
    mvp:["Default cannonball is the reliable baseline","Chain shot prioritizes sails/rigging with lower hull damage","Barrel tumbles, floats and explodes after a clearly shown timer","Chicken is a silly low-damage distraction, not a mandatory meta-weapon","Choose ammunition before sailing to avoid on-screen button clutter"],
    acceptance:["Each ammo is visually distinct","No ammo is strictly strongest in every encounter","Ammo variety doesn't add required real-time controls"],
    dependencies:["cannons","damage"],unity:["AmmoDefinition","ProjectileEffect","LoadoutAmmoSlot"],jiraType:"Story",postCore:true
  },
  {
    id:"perfect",title:"Perfect Broadside (Optional)",category:"Combat",phase:"After Core",priority:"P2",effort:"S",
    summary:"Reward accurate side-on alignment with better shot grouping or an extra synchronized volley.",
    player:"Fine steering produces a satisfying volley without extra taps.",
    prototype:"A toggleable 90-degree broadside angle inspector with a gentle skill window.",
    mvp:["Optional subtle alignment arc only near valid targets","Alignment bonus rather than mandatory precision","Separate feedback for miss, hit and clean broadside"],
    acceptance:["Better positioning feels rewarding","Beginners can still win without perfect angles"],
    dependencies:["cannons"],unity:["BroadsideAccuracyRule"],jiraType:"Task",postCore:true
  },
  {
    id:"befriend",title:"Friendship, Popularity & Reputation",category:"Social",phase:"After Core",priority:"P2",effort:"M",
    summary:"Helping and befriending unique ships builds reputation and unlocks social benefits.",
    player:"Rescue, offer supplies or choose Friendly interaction; friendship gives reputation, not just coins.",
    prototype:"A reputation meter and unique-friend ledger. Avoid repeatable farming of the same friendship.",
    mvp:["Each unique friendship grants reputation once","Reputation unlocks faction trust and follower capacity","Helping an ally raises trust; attacking friends damages it","Give reasons for reputation changes"],
    acceptance:["No infinite reputation from repeated friendly taps","Player can read what reputation changes","Social perks never invalidate skill-based steering or combat"],
    dependencies:["befriend"],unity:["ReputationService","RelationshipLedger"],jiraType:"Story",postCore:true
  },
  {
    id:"followers",title:"Follower Ships / Friendly Fleet",category:"Social",phase:"After Core",priority:"P2",effort:"L",
    summary:"An approved friend can follow in formation and provide limited defensive cover when you are attacked.",
    player:"Invite one ship to follow; it helps defend or rescue, but can be damaged and needs care.",
    prototype:"Single ally follower with follow/defend/retreat state and a minimum distance to prevent collisions.",
    mvp:["Unlock one basic follower slot through reputation","Simple follow and defend behaviors","Followers can be damaged and leave when health is low","Limit simultaneous ally ships for clarity and performance"],
    acceptance:["Ally never blocks the player repeatedly","Help is visible but does not auto-win fights","Followers resume safely after a checkpoint"],
    dependencies:["befriend","world","damage"],unity:["FollowerCoordinator","AllyFormation","AllyDefenseRule"],jiraType:"Story",postCore:true
  },
  {
    id:"intercept",title:"Intercept / Rescue / Escort",category:"Social",phase:"After Core",priority:"P2",effort:"L",
    summary:"Predict where another ship is going, reach it in time, rescue it and optionally escort it to safety.",
    player:"Approach an ally or merchant, help through a hazard, or guard the ship while travelling together.",
    prototype:"One short scenario using current sailing controls and a single contextual action.",
    mvp:["Show destination hint and moving ship trajectory","Friendly ship requests help during a storm/vortex","Escort uses simple distance band rather than complicated formation UI","Safe finish rewards reputation and supplies"],
    acceptance:["Rescue is understandable without extra permanent buttons","Fail state is fair and telegraphed","Works alongside aggressive combat"],
    dependencies:["followers","sailing-feel"],unity:["InterceptObjective","EscortObjective","FollowGoal"],jiraType:"Story",postCore:true
  },
  {
    id:"kraken-arms",title:"Kraken — Eight Autonomous Tentacles",category:"World",phase:"After Core",priority:"P3",effort:"L",
    summary:"Upgrade the rare Kraken into a telegraphed multi-arm boss encounter using our ASCean octopus arm-lab concept.",
    player:"Read whirlpool bubbles, avoid reaching arms, steer away or cut free; escaping is always possible.",
    prototype:"One shared arm controller over eight independent per-arm states, coordinated by one central brain.",
    mvp:["Central KrakenBrain selects targets and attack phases","ArmCoordinator schedules 8 independently reacting arms","ArmController models joints via Verlet/PBD (arcade approximation)","Local arm sensors react to ship contact without separate giant managers","3-phase attack: warning → reach/grab → release/retreat","Performance cap and escape cues"],
    acceptance:["No invisible unavoidable grab","Arms can react locally while sharing one reusable implementation","Stable frame time on Android"],
    dependencies:["world","sailing-feel","damage"],unity:["KrakenBrain","ArmCoordinator","ArmController","ArmState"],jiraType:"Story",postCore:true
  },
  {
    id:"tutorial",title:"Tutorial Polish & Accessibility",category:"Game Loop",phase:"Core",priority:"P1",effort:"S",
    summary:"The ten-second contextual tutorial should be readable, skippable and responsive to player actions.",
    player:"One-thumb prompts, large affordances and a replay option.",
    prototype:"Storyboard experiment integrated into Stage Loop Lab; run a first-user test.",
    mvp:["One sentence maximum per hint","Replay in settings","Respect reduced-motion","Don't hide the action behind tutorial overlays"],
    acceptance:["Skippable in one tap","Playtest on notch and narrow screens"],
    dependencies:["onboarding"],unity:["TutorialPresenter"],jiraType:"Task",postCore:false
  }
];
const byId=Object.freeze(Object.fromEntries(plans.map(plan=>[plan.id,plan])));
root.AllAboardMechanicPlans={plans,byId};
if(typeof module!=="undefined"&&module.exports)module.exports={plans,byId};
})(typeof window!=="undefined"?window:globalThis);
