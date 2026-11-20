# All Aboard — Sailing & Ocean Research Notes (V0.3)

Status: browser gameplay laboratory, not a physically calibrated simulation and not a finalized Unity mechanic.

This document describes **our model**, not TinyWind's source code. Useful references: [TinyWind manual](https://tinywind.io/wiki/sailing), [Physics Today, sailing physics](https://physicstoday.aip.org/features/the-physics-of-sailing), and [2D boat physics](https://medium.com/@van_aaron/simple-top-down-2d-boat-physics-for-games-8e43b50552e9).

## Why V0.2 felt like a skateboard

Old integrator: apply a combined thrust/current vector, then damp world X and world Y by the same factor. That permits persistent lateral skating and overly fast rudder turns even at near-zero water speed.

V0.3 splits the vessel into local forward/right axes, then decomposes velocity:

- Forward = dot(velocity, facing).
- Side = dot(velocity, local right).
- Longitudinal drag is comparatively small, so the vessel coasts.
- Lateral resistance is stronger, so wind does not make the hull slide sideways indefinitely.
- Rudder authority increases with forward motion, with a small nonzero arcade assist at rest.
- Angular velocity responds gradually rather than matching rudder command instantly.

The implementation is in vessel.js, independent of drawing and HUD. Use **lab units**, not meters, knots or Newtons.

## Sail polar and wind orientation

The HUD arrow shows wind **TO** direction, so Wind FROM = TO + 180 degrees. We compute the angle between the ship bow and Wind FROM and sample a short, smooth control-curve. Prototype polar samples (angle away from wind source → normalized sail efficiency):

| Angle | Efficiency (game-feel only) | Interpretation |
|---:|---:|---|
| 0° | 0.025 | direct headwind / no-go |
| 25° | 0.06 | close to headwind |
| 40° | 0.32 | pinching |
| 60° | 0.76 | close reach |
| 90° | 1.00 | beam reach |
| 130° | 0.96 | broad reach |
| 155° | 0.79 | downwind |
| 180° | 0.59 | dead downwind |

These are **chosen tuning points** for All Aboard, not copied coefficients from the real game and not a measured sailboat polar.

The sail slider controls deployed area, not angle of trim. A future version could expose separate trim as an advanced lab, but one-thumb play should not force simultaneous steering/trim controls. Sail shapes modify the polar: Lateen performs relatively better windward; square performs reliably downwind; storm rig reduces power and sideways wind response. These are prototypes, not balance-approved.

## Rope and anchor constraints

V0.2 behavior could snap because it projected the boat straight onto a hard radius on every frame. V0.3 first generates rope tension in the final soft zone before the maximum length. Rope load is approximately:

Tension ≈ stretch * stiffness + max(0, outward radial velocity) * damping

While the line is slack there is no rope acceleration; wind/current still applies. Once stretched, rope force reduces outward velocity and permits tangential motion. The state is Slack, Taut, Dragging, Falling, or Raised. Dragging requires force exceeding grip **continuously** for a short time. A small positional guard only corrects occasional large overshoot.

When dropped, the anchor is animated. Once it sinks, the seabed anchor is visually hidden; the chain still points toward its underwater position and the water splashes.

**Not implemented:** depth detection, chain collisions/catenary, realistic scope ratio, seabed sand vs rock, setting by the anchor flukes. All chain lengths are game units.

## OceanField — physically meaningful enough for gameplay

OceanField is a *shared mathematical field*, not a repeating picture:

1. Define several wind-oriented traveling wave components at different spatial frequencies.
2. Sample the combined height at world coordinates. This creates contiguous organic variation and removes the V0.2 horizontal stripe effect.
3. Convert the field height into a low-resolution color surface and smooth it in Canvas2D.
4. Compute a small wave-slope force from finite differences of the **same height function**.
5. Add a local vortex current and ambient drift as optional vector-force fields.
6. Generate foam at the stern according to ship speed and turning; splashes around anchors, damage events and loot interactions.
7. Reuse the shared ocean in the same main simulation.

The visual field is recomputed at an internal ~20Hz and interpolated by the browser to reduce per-frame work. This is not a shallow-water solver: splashes currently appear as impulses/foam, but their waves do not push other hulls. Future versions could use a low-resolution height/velocity buffer or semi-Lagrangian fluid simulation if performance permits.

## Module damage is gameplay, not just a health number

In the Damage Lab, cannon hits now affect a center cell (2 damage) and adjacent cells (1 damage); broadsides overlap several impact patterns. Fire damages each turn and propagates to neighboring cells. Destroyed hull tiles leak; flooding accumulates over turns and can sink the ship. Repair restores a tile, extinguishes fire on that tile, seals that leak and consumes one turn.

Enemy modules (sails, cannon ports, rudder) derive health from spatial tiles. Damaged sails reduce enemy propulsion; completely destroyed sails leave only coasting motion. In the player test controls, reducing our sail/gun/rudder health weakens thrust, auto-fire or steering. Repair restores them.

**Current approximation:** one enemy vessel is a small in-view target, not a full autonomous adversary. Its sail-driven movement and repair turns are a playable teaching example; advanced AI/boarding is deferred.

## What to measure during V0.3 playtests

Do not pick balancing numbers from imaginary benchmarks. Use a quick spreadsheet or measured tests:

| Experiment | Observation to record |
|---|---|
| Open sea, sails 100%, wheel released | Acceleration curve and time to stable speed |
| Same conditions, initial lateral velocity | Seconds to eliminate sideways motion |
| Same ship at various speeds, rudder 50% | Turn rate and radius; whether there is oversteer |
| Headwind vs beam vs broad vs dead downwind | Relative speed and whether player understands the HUD |
| Anchor length 30/70/120 with wind/current | Max excursion, ease of recovery, abrupt snapping |
| Anchor vortex, low/high grip | Time until drag starts and readability of chain tension |
| Sails 100%→0% | Time until canvas is visibly furled; effect on coasting |
| Damage sails/cannons/rudder | Observable loss of capability and cost of recovery |
| Wave detail/height, high wake | Frame time p50/p95 and memory on desktop & real Android |

## Next candidate experiments (not yet implemented)

- Perfect Broadside: show a subtle **optional** aiming sector only in the Combat Lab, not during every run. Compare assisted and unassisted playtests.
- Rescue/Escort: one contextual action, where an ally changes the actual encounter reward or helps escape current.
- Proper procedural current/wave solver: test 2D height-field on a low-resolution grid before considering WebGL.
- Flag Workshop: pixel art painter with a restricted local palette; export transparent PNG. Current flag prototype only supports a local monogram or personal image.
- Damage visuals: mast snapping, scorch marks, loose fabric, hull holes and water ingress; keep source art intact.
- Separate loadout data from rendering: allow inventory items, simple modifiers and 1–3 minute-run balance.
- Validate the model inside Unity (fixed timestep) only after browser playtesting; this repo does **not** modify Unity project code.

## Test constraints

- Node tests/vessel.cjs asserts sail polar ordering, lateral drag, disabled sail behavior, rope hold and sustained anchor drag, water variation, bounded foam particle count.
- Node tests/smoke.cjs checks the nine tabs, DOM wiring, camera preview controls and mocked Canvas animation frames.
- Real browser and touch UX, actual Android haptics and GPU/battery behavior remain **unverified** until device testing.
