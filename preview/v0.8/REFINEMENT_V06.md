# All Aboard — Core Feel Refinement V0.6

Status: experimental browser lab, awaiting Dor and Eilon's Android playtest; not approved Unity gameplay code.

## Priorities

P0: slower wind-driven movement with tailwind as the strongest boost; configurable, touch-editable HUD.
P0: solid coast boundaries; splashes, wakes and foam should not draw through island land.
P1: expanded seeded world map with POIs and red-hostile / green-friendly heat overlays.
P1: preserve the pleasant existing water style as a baseline and export clean screenshots plus tuning.
P2: one readable Kraken grab/release minigame using eight independent arm records and one coordinator.

## 1. Sailing feel — Unity-portable math

The ship's velocity is projected onto two axes: forward and lateral. Propulsion is applied gradually along the heading. Lateral movement is rejected by a strong keel-drag value, while forward drag increases with speed.

Wind alignment is an explicit player rule: direct tailwind is best, crosswind helps and direct headwind gives little power. This intentionally differs from real sailing polars, which can have maximum boat speed on a reach.

V0.6 polar: angle away from wind source 0° ≈ .02, 90° ≈ .64, 180° = 1.0. Smooth interpolation is used. V0.6 also reduces raw thrust and rudder turn rates, adds Wind Drive / Water Resistance sliders, and increases turn authority gradually with speed. The 60Hz fixed timestep remains, decoupled from browser refresh rate.

C# candidate: plain VesselState, VesselTuning, SailPolar, VesselMotion.Step, and independent MonoBehaviour presentation. Lab units are not knots/meters/Newtons.

Accept when tailwind acceleration is clearly better than headwind; the boat still coasts after closing sails; no sideways skating; and steering at near-zero speed is weak rather than instant.

## 2. Water baseline and shore masking

The exact original V0.5 code is saved at water/v0.5-ocean.js. V0.6 intentionally retains its low-resolution procedural multiscale wave field and its soft palette. The Ocean tab offers a clean water-only PNG capture, separate JSON parameter export, and restoration of V0.5 parameters: waveHeight=.7, waveDetail=22, wavePush=.65, wakeStrength=1.

WorldEngine.pointInIsland uses the same polygon shape as the visible island. The world can answer isWater(x,y); the renderer clips water effects with an even-odd path, leaving land holes in the effect layer. Foam and splash origins inside land are suppressed. The shoreline itself remains approximate: this is a visual and logic mask, not a true coastal fluid boundary simulation.

Next experiment, NOT yet implemented: test a 128×128 or 256×256 water impulse buffer. Ship wakes, anchor drops, projectile splashes and Kraken grabs would deposit small impulses into a damped ripple solver with land cells as boundaries. This may look more responsive while remaining much cheaper than Navier–Stokes. Benchmark Android before enabling it.

## 3. UI Layout Studio

In Layout mode, temporarily disable the normal game controls while editing. Select helm, sail slider, anchor, Friendly/Aggressive toggle, compass, minimap, coins, HP, score or chain indicator. Touch-drag in the phone preview or set normalized X/Y percentage and scale using sliders/numeric fields. Layouts are stored in browser local storage and export/import as JSON; the main tuning preset also includes the HUD layout. The wheel starts centered.

These values are design references, not finished Unity RectTransform anchors. Check overlap, reachable tap targets and safe areas in both tall and 16:9 phone previews before implementation.

## 4. Expanded Seeded World Map

Expanded map is read-only and supports touch pan, zoom, recenter/follow, seeded island polygon outlines, treasure, NPCs, Kraken, layers and approximate hostile/friendly radial heatmaps. Clicking a POI shows its coordinates.

Map feature generation calls WorldEngine.createChunk(seed,cx,cy), a pure function, rather than filling the live streaming cache. World location and generated positions do not change when using the map.

Heatmaps are currently development-level density visualizations, NOT real player intelligence. Fog of war, discovered POIs, reputation-gated intelligence, island occlusion and line-of-sight rules are future design topics.

## 5. Kraken Tentacles — small fair-play experiment

One KrakenGrapple coordinator controls eight ArmState records, not eight unrelated managers. A single active arm goes idle → warned (~1.2 seconds of visible bubbles/ring) → reaching (~.9s) → grabbing for a limited duration → recoil/cooldown. A grab adds a bounded pulling force to ship velocity; the normal rudder/sails/anchor continue to work. Hull damage is periodic and modest.

The World tab offers a lab-only arm firing button; automatic aggressive-mode broadsides can also hit a reachable arm when the ship is correctly aligned. Two hits to an active arm release the ship. Ship movement can escape by exceeding the reach limit. The experiment does NOT yet implement proper projectile hitboxes, multi-arm boss logic or articulated PBD limbs. A full Kraken fight remains an after-core idea.

## Test checklist and limits

- Test tailwind and headwind, speed buildup and drift, and make note of the desired ship feel.
- Try UI repositioning on a phone, and export/import a layout.
- Open the expanded world map, pan and toggle markers and hostile/friendly heat.
- Move next to island shorelines and ensure white wave rings do not cover sand.
- Take a clean water PNG snapshot and JSON export, then restore V0.5 tuning.
- Summon the Kraken near the ship, observe warn/grab/release, and try damaging its active arm.
- Run Node physics/map/land/UI/Kraken tests and on-phone visual/haptic tests.
- Record measured frame-time and input latency. Automated CI does not verify the actual visual feel.

## Questions for next joint review

1. Should the default ship be a heavy, slow-to-turn vessel or a slightly faster arcade ship?
2. Should the expanded map reveal only explored areas, or show all generated islands with an optional fog-of-war layer?
3. Should Kraken be a rare one-arm hazard or a later dedicated boss with two/three grabbing arms?
4. Does the soft watercolor sea remain our preferred final visual direction?

The live course Unity repository is untouched. Only mechanisms marked Keep after Dor/Eilon approval should be ported as concise C# models, with their own change log.
