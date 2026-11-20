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
    dependencies:["world","sailing-feel","damage"],
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
    dependencies:["sailing-feel","cannons","stage-loop"],unity:["TutorialSequence","HintPresenter"],jiraType:"Story",postCore:false
  },
  {
    id:"sailing-feel",title:"Ship Feel & Reactive Ocean",category:"Core Sailing",phase:"Core",priority:"P0",effort:"L",
    summary:"Stable boat-like motion, keel resistance, wind polar, meaningful wakes, splash impulses and anchored drift.",
    player:"Read wind/current, steer smoothly, use anchor to pivot or resist hazards.",
    prototype:"Keep V0.3/V0.4 vessel and ocean lab; instrument side slip, wake emission and anchor jitter.",
    mvp:["Separate lateral and forward water resistance","Wind TO arrow with no-go zone","Wake intensity from speed and turn","Anchor and projectiles create water impulses","One shared OceanField force + visual contract"],
    acceptance:["No skating or sharp anchor teleporting","Ship motion and wake reflect speed","Fluid-like water remains performant on actual Android"],
    dependencies:[],unity:["ShipMotionModel","OceanField","OceanRenderer"],jiraType:"Story",postCore:false
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
    dependencies:["world","stage-loop"],unity:["ReputationService","RelationshipLedger"],jiraType:"Story",postCore:true
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
  },
  {
    id:"wind-polar-v06",title:"Slow Tailwind-Driven Vessel",category:"Core Sailing",phase:"Core",priority:"P0",effort:"M",
    summary:"Tame the high-speed skating feel with controlled acceleration, water resistance and a readable wind-TO boost.",
    player:"Steer into the wind direction for the strongest simple boost; slow down smoothly by furling sails.",
    prototype:"V0.6 helm and sails lab. Compare settings in identical wind scenarios before Unity port.",
    mvp:["Smooth windDrive acceleration","Tailwind-first sail polar and little headwind thrust","Adjustable forward waterDrag and strong keel drag","Speed-dependent yaw authority"],
    acceptance:["No instant changes of velocity or hull heading","Smooth stop/coast when sails close","Phone testers agree default speed feels boat-like"],
    dependencies:["sailing-feel"],unity:["SailPolar","VesselMotion","VesselTuning"],jiraType:"Story",postCore:false
  },
  {
    id:"hud-layout",title:"Touch-Editable HUD & Button Design",category:"Core Sailing",phase:"Core",priority:"P0",effort:"M",
    summary:"Advanced HUD Studio V0.8: touch move, independent scale X/Y, rotation, opacity, layer order, precise values, presets and overlap hints.",
    player:"Find a thumb-friendly wheel, anchor, sail control, compass, minimap and Friendly toggle layout.",
    prototype:"V0.8 editor imports legacy V0.7 JSON, includes Dor’s approved test layout, controls X/Y scale/rotation/opacity/layer and saves versioned presets.",
    mvp:["Touch drag and precision 0.1% X/Y","Independent X/Y + uniform scale","Rotation, transparency and layer priority","V1→V2 JSON migration and local save","Overlap/offscreen warnings and three button themes"],
    acceptance:["No game-control actions occur while editing","Legacy layout imports without losing anchor position","Unity handoff includes axis scale, rotation, opacity and z order","Layouts remain usable on tall and 16:9 portrait screens"],
    dependencies:["sailing-feel"],unity:["HUDLayoutPreset","SafeAreaUI","ResponsiveControlAnchors"],jiraType:"Story",postCore:false
  },
  {
    id:"world-map-intel",title:"Expanded Seed Map / POI & Faction Heat Layers",category:"World",phase:"Core",priority:"P1",effort:"M",
    summary:"Inspect the infinite seeded sea without moving the ship; reveal islands, treasure, ally and hostile density.",
    player:"Pan/zoom world overview, filter interests, distinguish friendly and enemy groups.",
    prototype:"V0.6 world map modal with density overlays and read-only chunk creation.",
    mvp:["Island silhouettes and seed-stable locations","POI category toggles, pan and zoom","Approximate hostile/friendly density layers","Avoid mutating active streaming cache"],
    acceptance:["Map browsing never relocates or evicts live chunks","POI positions remain reproducible for matching seed and generation settings"],
    dependencies:["world"],unity:["MapPresenter","WorldPOIQuery","FactionDensityLayer"],jiraType:"Story",postCore:false
  },
  {
    id:"water-shore-mask",title:"Separate Land from Procedural Water",category:"Core Sailing",phase:"Core",priority:"P0",effort:"M",
    summary:"Keep the soft V0.5 sea art and make waves/splashes respect actual polygon island boundaries.",
    player:"See land as solid and water effects as a coherent environment reacting to the ship.",
    prototype:"V0.6 preserved water snapshot, water-only PNG, tuning JSON and shore-clipped ripples.",
    mvp:["Reusable pointInIsland test","Skip foam and splash on land","Clip water effect layer around islands","Save V0.5 water baseline and make tuning reproducible"],
    acceptance:["No visible water bubbles or ripple lines on sand","Water engine visual still performs well on Android"],
    dependencies:["world","sailing-feel"],unity:["WorldSurfaceMask","OceanField","OceanEffectClipper"],jiraType:"Story",postCore:false
  },
  {
    id:"kraken-grapple",title:"Kraken Tentacle Grab & Shoot-to-Release",category:"World",phase:"After Core",priority:"P2",effort:"M",
    summary:"Single coordinator controlling eight independently animated arm records with a fair grab-and-escape minigame.",
    player:"Read the warning, evade the reaching arm or align automatic broadsides and shoot to break free.",
    prototype:"V0.6 World tab manual summon and arm-fire experiment; still only one active grabbing arm.",
    mvp:["Visible warning before arm contact","Gradual pulling force rather than teleport","Periodic bounded hull damage","Two arm shots cause release","Shared coordinated arm state"],
    acceptance:["Player can avoid or escape the grab","No surprise invisible damage","No permanent extra game controls required"],
    dependencies:["world","cannons","kraken-arms"],unity:["KrakenGrapple","ArmCoordinator","ArmState"],jiraType:"Story",postCore:true
  }
,
  {
    id:"cannon-recoil",title:"Cannon Recoil & Impact Feedback",category:"Combat",phase:"Core",priority:"P1",effort:"S",
    summary:"Every real shot creates a small decaying ship recoil, optional haptic pulse, smoke/water splash and semantic sound event.",
    player:"Read the direction and weight of a broadside without additional controls.",
    prototype:"FX & Sail Trim tab: test broadside or hull hit; live automatic broadside triggers recoil only after it fires.",
    mvp:["Decaying recoil impulse","Separate visual wobble from gameplay hull velocity","Reduced-motion and shake intensity controls","Fire/splash audio event hooks"],
    acceptance:["Ship does not teleport when firing","Recoil decays and repeated volleys remain readable","Disable camera shake without changing gameplay"],
    dependencies:["cannons","sailing-feel"],unity:["BroadsideFeedback","ShipPosePresenter","FeedbackSettings"],jiraType:"Story",postCore:false
  },
  {
    id:"sail-tilt",title:"Sail Yard Tilt & Auto Trim",category:"Core Sailing",phase:"Core",priority:"P1",effort:"M",
    summary:"Rotate the mast yard to capture more wind; automatic trim is the safe default, manual trim offers a small precision reward.",
    player:"Keep controls simple: sail up/down is core, small manual tilt is optional for advanced players.",
    prototype:"V0.8 sail control combines sail height with an optional compact tilt editor; FX tab keeps full tuning. Auto alignment remains default.",
    mvp:["Auto trim chooses desired relative-wind angle","Contextual in-game manual tilt ±45 degrees","Wind ideal angle displayed beside slider","Propulsion penalty capped to keep casual controls viable","Sail SVG visibly tilts at yard hinge"],
    acceptance:["Auto trim is a usable baseline","Manual trim affects thrust but not steering input","Lowered sails stay visibly furled and tilt works"],
    dependencies:["sailing-feel"],unity:["SailTrimController","SailRigView","SailPolar"],jiraType:"Story",postCore:false
  },
  {
    id:"wave-rock",title:"Wave-Driven Bob / Roll / Pitch",category:"Core Sailing",phase:"Core",priority:"P1",effort:"M",
    summary:"Sample the same water field at four points around the hull to move the ship visually in response to waves.",
    player:"Large waves feel large; small waves feel calm while controls stay stable.",
    prototype:"FX & Sail Trim tab: change Wave Height and Wave-Induced Tilt with visual-only pose.",
    mvp:["Sample bow, stern, port, starboard","Compute and clamp bob/roll/pitch","Wave visual effects do not alter simulation position","Reduced motion supported"],
    acceptance:["Bigger waves create bigger but bounded tilt","No random camera jitter from unrelated effects","Beach land masks remain intact"],
    dependencies:["water-shore-mask","sailing-feel"],unity:["WavePoseSampler","ShipPosePresenter"],jiraType:"Story",postCore:false
  },
  {
    id:"audio-moods",title:"Original Pirate Music & SFX Event Bus",category:"Game Loop",phase:"Core",priority:"P1",effort:"M",
    summary:"Mood-adaptive music and semantic SFX for steering, shots, allies, repairs, stage completion and Krakens.",
    player:"Hear calm sailing music transition to tension and victory without an overwhelming soundtrack.",
    prototype:"V0.8 adaptive audition: calm playful sailing, more dramatic combat, Kraken proximity; seven short original sketches, 15 SFX and prompts.",
    mvp:["Define original music identity and licensing ledger","Separate AudioDirector from gameplay mechanics","Music / UI / SFX volume controls","Mute and pause without affecting simulation"],
    acceptance:["Audio starts only after user gesture on the web","No copyrighted game soundtrack copied","Unity plays overlapping one-shots without abrupt music restarts"],
    dependencies:["stage-loop","cannons"],unity:["AudioDirector","AudioMixer","AudioEventDefinition","MusicMood"],jiraType:"Story",postCore:false
  },
  {
    id:"unity-health",title:"Unity Prefab Audit & Automated Test Contracts",category:"Game Loop",phase:"Core",priority:"P0",effort:"M",
    summary:"Find missing references early, track prefab expectations, and run EditMode/PlayMode tests in the actual Unity Editor.",
    player:"Development quality tool, no new player control.",
    prototype:"Unity Checks tab: advisory YAML scanner, quality checklist, mechanic-specific code prompt and test contract.",
    mvp:["Static missing-script warning for text prefabs","Editor test plan with AssetDatabase GUID resolution","Unity Test Framework EditMode/PlayMode tests","Profiler and phone-check list","Changelog after each tested mechanic"],
    acceptance:["Never claim browser checks passed Unity PlayMode","Reports are reproducible and identify exact assets","Tests remain consistent with course milestone requirements"],
    dependencies:["sailing-feel"],unity:["PrefabAuditWindow","EditModeTests","PlayModeTests"],jiraType:"Task",postCore:false
  },
  {
    id:"wind-shadow",title:"Wind Shadow Behind Islands",category:"World",phase:"After Core",priority:"P2",effort:"M",
    summary:"Islands block or redirect wind locally, creating navigational decisions and sheltered positions.",
    player:"Sail around an island's lee, lose wind temporarily, or hide from an enemy's approach.",
    prototype:"Visualize local wind vector and speed behind procedural island masks; retain clear feedback.",
    mvp:["Simple lee cone from island bounds","Smooth wind factor interpolation","Arrow feedback before slowdown"],
    acceptance:["Wind shadow is predictable","The ship can escape without stalling forever"],
    dependencies:["world","sailing-feel"],unity:["WindShadowField"],jiraType:"Story",postCore:true
  },
  {
    id:"enemy-tells",title:"Readable Enemy Intent / Telegraphs",category:"Combat",phase:"After Core",priority:"P2",effort:"S",
    summary:"A subtle cannon-glow and broadside highlight show when an enemy is about to fire, allowing skillful dodges.",
    player:"See incoming danger and steer intelligently instead of guessing or memorizing HP.",
    prototype:"Compare short amber warning arc vs. no indicator in a controlled encounter.",
    mvp:["One warning per enemy action","Optional intensity and reduced-motion setting","No permanent UI buttons"],
    acceptance:["Enemy attacks are fair and readable","Effects do not obscure ship or minimap"],
    dependencies:["cannons","damage"],unity:["EnemyIntentPresenter"],jiraType:"Story",postCore:true
  },
  {
    id:"boarding-puzzle",title:"Boarding Mini-Puzzle (Optional)",category:"Social",phase:"After Core",priority:"P3",effort:"L",
    summary:"A 5–10 second tactical puzzle during boarding or rescue. Inspiration: puzzle-driven pirate cooperation, not copied content.",
    player:"Choose one short combo or repair sequence to earn a social/combat outcome.",
    prototype:"A self-contained test puzzle that can be skipped or auto-resolved in casual mode.",
    mvp:["One small grid or timing challenge","Clear time limit","Meaningful reward but no mandatory grind"],
    acceptance:["Can finish quickly on mobile","Works for friendly rescue as well as hostile boarding","Does not break sailing flow"],
    dependencies:["intercept","damage"],unity:["BoardingMiniGame"],jiraType:"Story",postCore:true
  }
,
  {
    id:"unified-anchor-chain",title:"Unified Anchor & Chain Control",category:"Core Sailing",phase:"Core",priority:"P0",effort:"S",
    summary:"Combine anchor drop/raise, live line tension/status and adjustable deployed-chain length into one compact HUD control.",
    player:"Tap anchor to deploy/recover; expand the chain segment only when adjusting length. Current direction remains visible.",
    prototype:"V0.8 one anchor card with inline chain status, a compact slider and continuous reeling with no ship teleport.",
    mvp:["Anchor action remains one tap","Secondary chain segment opens contextual length slider","Rope length reeled gradually in physics","Single movable/resizable HUD group","No redundant floating chain HUD"],
    acceptance:["Drop/raise still works with edit mode off","Changing length while anchored never teleports the ship","HUD shows deployed length and target reeling state","Anchor and status move together"],
    dependencies:["sailing-feel"],unity:["AnchorController","RopeConstraint","AnchorControlView"],jiraType:"Story",postCore:false
  }
];
const byId=Object.freeze(Object.fromEntries(plans.map(plan=>[plan.id,plan])));
root.AllAboardMechanicPlans={plans,byId};
if(typeof module!=="undefined"&&module.exports)module.exports={plans,byId};
})(typeof window!=="undefined"?window:globalThis);
