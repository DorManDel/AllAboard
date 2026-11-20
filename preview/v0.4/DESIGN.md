# All Aboard — Gameplay Mechanics Lab design notes

**Status:** Concept V0.2, standalone browser prototype. Not production Unity code.
**Project:** [Unity game](https://github.com/Eilon343/AllAboard) — separate repository.
**Design promise:** Easy to control, hard to master, on a portrait phone, in short 1–3 minute runs.


## V0.2 - feedback-driven iteration (2026-11-18)

The critique was about **feel and legibility**, not adding complexity for its own sake.

### Helm / control feedback
- Wooden wheel stays at bottom-center, independently from the right-hand anchor and mode toggle.
- The wheel visual is updated **every requestAnimationFrame**, not through the ~70ms HUD refresh that had made steering look stuttery.
- Pointer input is unwrapped across revolutions and clamped to ±1080°. A nonlinear wheel-to-rudder curve provides usable control well before reaching 1080°, so normal sailing does not require spinning the wheel many times.
- Rudder response, self-centering and hull yaw response are independently tunable. **Releasing the wheel centers the rudder, not the ship's position or heading.**
- Vibration cues exist where the browser supports them; they are not evidence of an Android production haptic test.

### Anchor as a rope/chain, not a pause
- On drop, the anchor appears to fall with a short animation and creates a local water splash.
- The anchor point is fixed near the stern at release; the line can be slack while the hull drifts under wind/current.
- Once the ship reaches the configured **max line length**, outward movement is constrained by projecting the ship back onto the circle and canceling outward radial velocity, while retaining tangential motion for a potential pivot.
- When modeled force exceeds anchor grip, the anchor point may slowly drag, and the constraint remains relative to the moving point.
- **Known simplification:** no depth, seabed geology, scope ratio, chain mass, rope collision, or true catenary physics. Rope art is a sagging quadratic line with individual chain-link accents.

### Compact HUD and world cues
- Horizontal N/E/S/W heading tape with live centered pointer; wind direction is placed immediately below it.
- Mini-map below the coins, with chest, enemy, vortex and player direction.
- HP remains near the top while sails become a much shorter vertical control; anchor above two-state Friendly/Aggressive button with current and alternative visible.
- Original Unity SVG ship pieces (hull, two sails, four cannons, anchor) are copied into assets/ship-parts, rendered with correct common coordinates, and individually shown/hidden in Shipyard.
- The preview still uses a stylized canvas renderer and is **not** a Unity build.

### OceanField as independent engine
- ocean.js is a separate, lightweight shared Canvas 2D procedural field. It renders multiple blue wave-band layers, foam streaks and wind glints.
- It supplies local vector forces from ambient current and vortex to the vessel simulation, rather than purely drawing a swirl.
- Dropping/retrieving an anchor, collecting treasure and cannon hits produce local ripple/foam events. Movement emits wake trails.
- This provides *shared environmental reactions*, but is **not** two-way coupled real fluid dynamics or measured buoyancy.

### Damage and ideas
- A fourth Damage Lab model adds powder cells (✴) that damage adjacent cells when destroyed and may trigger limited cascades.
- The Ideas Board is a voting-free shortlist for Eilon/Dor to discuss: wind shadow, anchor slingshot, perfect broadside, wake surfing, rescue/escort, treasure hook.
- Shortlisted ideas export to a Markdown brief; no ideas are implemented in the Unity project.

### V0.2 acceptance tests to run on a real phone
1. Can the wheel make a noticeable ship turn after ~60–120° of drag, without forcing three full revolutions?
2. Is the wheel animation smooth on a 60Hz phone? Does it spring to center without a snapping discontinuity?
3. During anchoring, does the chain visibly start slack and then become taut at the selected length? Can the ship still pivot?
4. When a vortex drags the anchor, is the dragging status legible and is the visual chain still connected?
5. Is the small sail control still comfortable to grab? Does it overlap the anchor, mode toggle, or right thumb?
6. Can the player read the heading and wind strip quickly without confusing wind TO with wind FROM?
7. Do original ship pieces remain visually aligned at different phone resolutions and sail settings?
8. Does enabling high wave density or strong splash activity significantly affect median/p95 frame time on Android?

**Do not claim this version has passed real-device or screenshot-based visual QA merely because the Node smoke checks pass.**

## Intended labs

1. **Helm:** wheel turns up to +1080° or -1080°; drag to turn, release to re-center; sensitivity, rudder smoothing and dead zone are tunable. Heading/compass and optional Android haptics.
2. **Sails:** vertical slider controls sail area; direction and strength of wind change propulsion. Following wind accelerates; headwind yields little forward sail thrust, though currents and auxiliary thrust still move the hull.
3. **Anchor:** one button to drop or raise; holding, pivoting, dragging, line radius, vortex pulling the vessel.
4. **Friendly/Aggressive:** switch modes. Auto broadside when aligned and in range; separate need-based friendship minigame.
5. **Ocean:** procedural Canvas 2D water, wind-driven flecks, wake and ripples, localized vortex currents.
6. **Damage:** switch between destroy-all HP grid, disable named ship modules, breach core. Cannon, broadside, fire and repair patterns. Enemy level raises durability.
7. **Shipyard:** hull variants, sail colors, cannon variants, immediate preview and indicative stats.
8. **Treasure:** approach a chest and tap for coin reward.
9. **Shared state:** tabs do not reset ship physics, sails, wind or loadout. Every inspector tunes the same world.

## Current V0.1, and its limitations

| System | In the browser prototype | Not yet implemented |
|---|---|---|
| Helm | Unwrapped drag rotations, self-centering, rudder smoothing, keyboard input | Unity Input System and tuned native inertia |
| Sailing | Velocity integration, damping, downwind thrust and wind drift | True sail lift, tacking, collisions |
| Anchor | Toggle, line radius, holding/dragging, spring constraint, pivot | Seabed depth, anchor-setting, physical chain |
| Ocean | Animated waves, ripples, wake, local vortex forces | Buoyancy, full water-height solver, fluid feedback |
| Combat | Range/broadside auto cannon, standalone damage puzzle | Projectiles, production hitboxes and persistent damage |
| Friendly | Deterministic offer-selection puzzle and trust | Multi-branch diplomacy and alliance economy |
| Shipyard | Hull speed modifiers, sail colors, cannon modifiers, stat stars | Inventory, unlock progression, real ship sprite variants |
| Haptics | Optional browser Vibration API calls | iOS/browser coverage and native Android tuning |
| Assets | Vector concepts drawn in Canvas/SVG | Real Unity wheel/ship artwork currently stored in Git LFS |

**Important:** Every physics quantity is an abstract lab unit, not m/s or newtons. Wave drawings are a visual approximation, not fluid dynamics. Wind direction means **the direction the wind is going TO**; this differs from meteorological wind FROM.

## Test hypotheses

- Can a new player turn the ship meaningfully in a single swipe, even if the wheel is allowed to travel three full turns? Compare 90°, 360°, 1080°.
- Does return-to-center feel natural while the ship continues drifting and rotating? Wheel angle, rudder, and hull momentum are separate states.
- Can a player tell from the compass and wind arrow when the wind improves speed?
- Does an anchor enable smart positioning, or merely pause movement? Try holding, pivoting, and dragging beside a vortex.
- Which damage objective (all tiles / specific modules / core) is readable and enjoyable without a long tutorial?
- Do friendship offers reward interpretation rather than random button tapping?
- Is the current portrait HUD reachable on different Android phones? Test left-hand mirror later.
- Measure actual Android frame time p50/p95, latency and vibration support before claiming performance.

## Running the lab

Open index.html in a current browser. No build step or dependencies. GitHub Pages is suitable after the feature branch is merged and Pages is enabled.

- Drag the wood wheel several revolutions. Keyboard left/right can also turn; up/down change sail area when not focused on a button/input.
- Use Sails inspector to compare strong tailwind and headwind. Use the right-side sail slider in the portrait preview.
- Set the vortex scenario, drop the anchor and change holding force or line radius.
- Switch Friendly/Aggressive in the portrait UI. In Aggressive, auto cannons require distance and a broadside angle.
- Use Damage tab to compare all three rule sets and attack patterns, then Encounters tab for diplomacy.
- Use Export preset to download the current settings as JSON. Use Reset to return to defaults.

## Proposed Unity architecture, after testing

Do **not** paste browser JavaScript directly into Unity. Recreate the selected behavior in short C# modules, with physics independent of the visuals:

- ShipMotionModel: velocity, damping, rotation, wind, and current.
- WheelInputUI: drag gesture, full-turn visual angle, spring return.
- SailController: sail area and visual animation.
- AnchorController: hold, drag and release.
- OceanForceField: local current/vortex fields.
- EncounterCoordinator: friendly/aggressive states and encounter results.
- DamageResolver: patterns, modules and win conditions.
- ShipLoadout: parts and modifiers.

Test the behavior in Unity Device Simulator **and on a real Android device**. Preserve the existing Bootstrap, Save and Settings services and respect the original Unity AGENTS.md. No changes to Unity project settings, prefabs, scenes or Git LFS assets are part of this lab.

## Candidates for the next version

- Import original wheel and ship-piece artwork (rather than approximations).
- Compare a context-sensitive single action button to separate anchor and treasure buttons.
- Use ship silhouettes in the damage board and compare core-target puzzles to real section damage.
- Alliances that produce tangible play consequences: rescue, escort, safe route, trade.
- Better procedural sea: wave influence on drift, obstacles, shallow water, wakes from other ships.
- Add playtest scenarios, reproducible seeds, measured FPS/latency reports and side-by-side presets.
- Left-hand control mirroring, accessible alternate controls, reduced-motion and quality presets.

## Repository separation

This repository is the mechanics experimentation lab, distinct from the course Unity repository at Eilon343/AllAboard. The experiment is on a feature branch and should go through review before merging.
