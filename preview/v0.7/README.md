# ⚓ All Aboard — Mechanics Lab

**V0.7 (experimental, stacked on unmerged V0.6)** — A self-contained, interactive web playground for testing ideas before adding them to the **All Aboard** Unity mobile game.

**Design principle:** Easy to control, hard to master. One-thumb, portrait gameplay with meaningful choices.

> This is a concept prototype using arcade-tuned units, not production Unity code or physically calibrated marine simulation.

## Launch

- **In a browser:** open index.html. The lab uses plain HTML, CSS and JavaScript, with no build or dependencies.
- **GitHub Pages:** after merging, open repository Settings → Pages → Build and deployment: Deploy from a branch → main / (root) → Save. Then use the GitHub Pages URL shown there.
- **Automated smoke test:** run node tests/smoke.cjs (Node 22 recommended).

The web lab lives in this repository. The **real Unity project** remains in [Eilon343/AllAboard](https://github.com/Eilon343/AllAboard) and is not modified by this experiment.

## Seventeen experimentation tabs

| Tab | Try it |
|---|---|
| Live Playground | Steer while adjusting sails, anchor, wind and Friendly/Aggressive mode |
| UI Studio | Drag/scale HUD, exact X/Y values, compare three button themes, export/import JSON |
| FX & Sail Trim | Decaying recoil and hull impact, wave-driven ship roll/bob, wind streaks, auto/manual sail tilt |
| Music & SFX | Seven original procedural pirate mood sketches, 15 SFX events and production generation prompts |
| Unity Checks | Unity YAML scan, manual QA checklist and per-mechanic architecture & implementation prompts |
| Helm | Centered ±1080° wheel, responsive controls, separate rudder/yaw response, **adjustable keel drag** and live forward/side speeds |
| Sails & Wind | Tune wind TO-direction, sail area and headwind/tailwind effects |
| Anchor | Throw with splash, soft spring-damper rope, adjustable **chain stiffness/damping**, anchoring radius and delayed dragging on sustained force |
| Ocean | Preserved V0.5 water baseline, shoreline clipping, clean PNG snapshot and water tuning JSON | 
| World | Deterministic chunks, full read-only POI map, ally/hostile heatmaps and grab-release Kraken test |
| Damage | Cannon center + splash radius, chain combos, turn-based fire/flood progression, enemy repair cost and functional disabled sails/cannons/rudder |
| Encounters | Offer what an NPC actually needs, or choose enemy sections to disable |
| Pimp My Ship | Original SVG parts, visible mast-mounted flag, pixel painter, local photo or animated GIF, PNG export, and rig selection |
| Ideas Board | Shortlist six smart-play concepts for Eilon |
| Mechanics Review | Keep / Refine / Test / Later / Reject each mechanic, take notes, export a Unity C# handoff brief |
| Stage Loop | Playtest Eilon's stage + endless Stay/Leave rewards, same-stage checkpoints and a 10-second tutorial |
| Roadmap & Kanban | Search mechanic specs and add approved candidates to a local planning board |

### Suggested first playtest

1. In the Live Playground, drag the wheel and release it. Try more than one full revolution.
2. Watch the horizontal compass tape and mini-map while turning. Compare reduced and full sails under headwind and tailwind.
3. Select **Vortex escape**, drop the anchor and watch the chain go slack → taut → dragging. Change chain radius and grip; the vessel should stay within chain radius while the point holds.
4. Switch Friendly/Aggressive, then inspect both encounter prototypes.
5. Compare all four Damage Lab modes, including chain combos, and decide which puzzle requires the fewest explanations.
6. Toggle ship parts on/off and shortlist ideas for Eilon. Export tuned settings as JSON and ideas as Markdown.

## Repo files

- index.html — layout and lab controls
- style.css — portrait preview and responsive glass UI
- app.js — shared ship motion, controls, HUD, damage, encounters, shipyard and ideas
- ocean.js — low-cost water interference field, wind/current sampling, foam, wake and splashes
- vessel.js — isolated arcade sailing physics with point-of-sail polar, hull forward/lateral drag and soft anchor tension
- world.js — deterministically generated chunked islands, NPC ships, treasure and Kraken events
- flag-workshop.js — pixel painter, source image/GIF overlay attached to the selected mast
- mechanics-review.js — local decision/notes tracker with Markdown Unity export
- mechanic-catalog.js — detailed specs for stage progression, popularity, allies, ammo, Kraken arms
- stage-loop.js — stage objective, optional risk wave, cashout/checkpoint simulation and tutorial
- roadmap-board.js — searchable plans, local Kanban, JSON import/export and Jira-ready issue text
- assets/ship-wheel.svg — vector tracing of the supplied wooden wheel silhouette
- assets/ship-parts/*.svg — original hull, sails, cannon pieces and anchor copied from the team's Unity repository
- DESIGN.md — specifications, test questions, limits and Unity implementation plan
- tests/smoke.cjs — basic initialization, markup and controller tests
- tests/vessel.cjs — deterministic sailing/anchor/water behavior tests
- tests/world.cjs — determinism, negative coordinates, bounded cache, collected treasure and monster tests
- WORLD.md — world model, ocean decision, flag behavior, acceptance criteria and C# integration contracts
- VISION.md — game vision, prioritized workstreams and implementation tracking
- tests/stage-loop.cjs — risk/checkpoint behavior and ten-second tutorial
- tests/planner.cjs — catalog integrity and Jira-ready Kanban export
- .github/workflows/lab-checks.yml — CI checking syntax, controls, vessel physics and ocean

## Limits and next steps

- The ship now renders from the **original team-authored Unity SVG components** whenever the browser loads them; a canvas illustration remains as fallback.
- OceanField samples low-resolution moving wave interference patterns and generates localized wake/splash foam. It is **not** a full shallow-water or buoyancy solver; waves only provide a simplified force.
- The rope now applies a spring-damper load before a rare safety projection, allowing the ship to oscillate in its tether radius. It still does not model seabed depth, chain mass/catenary or actual rope collisions. All values are experimental LAB UNITS.
- Haptics use the browser Vibration API where available (mainly supported Android browsers), with silent fallback.
- A real phone playtest is still required to validate readability, latency, battery use and interaction feel.

See [DESIGN.md](./DESIGN.md) for a more detailed spec and a proposed migration plan to Unity C# once a mechanic feels right.

## V0.3 sailing playtest order (unchanged)

1. **Helm first:** open Helm; compare side slip against forward speed. Turn with and without sails, try low/high keel resistance.
2. **Ocean:** observe water surface gradients, stern foam at slow/fast speed, turning bubbles, anchor throw and cannon splash. Tune Wave Height and Wave Push separately.
3. **Anchor:** change stiffness, damping and chain length. Test slack → taut → holding/dragging beside the vortex; note whether oscillation feels better.
4. **Sails:** change course relative to wind; a beam/broad reach should outperform direct downwind. Closing sails visibly folds the cloth.
5. **Damage:** hit sail tiles; watch enemy vessel lose propulsion and coast to a stop. Fire, flood, repair and repair our own disabled modules.
6. **Shipyard:** compare sail shapes (square / lateen / storm). Customize a **local-only** flag with initials/color or your own image.

**Inspired by, not copied from:** [TinyWind sailing manual](https://tinywind.io/wiki/sailing), [The Physics of Sailing](https://physicstoday.aip.org/features/the-physics-of-sailing), [2D top-down boat physics](https://medium.com/@van_aaron/simple-top-down-2d-boat-physics-for-games-8e43b50552e9). Our prototype does not contain or claim access to TinyWind's implementation.


## V0.4 — World, Flag and Mechanics Review (new)

This branch extends **V0.3 without merging PR #2**. PR #3 will target the V0.3 branch first so only new world/workshop changes appear in the diff.

1. Open **World** and try `SEA-EXAMPLE-1`. Visit an adjacent chunk, return to your location, then regenerate with the same seed: island and treasure positions are reproducible.
2. Raise or lower island/ship/treasure density. These are game-feel controls, not real-world geography.
3. Collect a procedural treasure cache. Revisit the same location: the same world object cannot be collected twice in this browser session.
4. Use the **Test Kraken** button to inspect a rare sea monster that can damage the player's hull and devour other ships. Not a mandatory encounter.
5. Open **Pimp My Ship**. Choose Front/Rear mast, paint your 48 × 32 pixel flag, then try a monogram, photo and animated GIF. PNG export supports Unity sprites; GIF needs a separate Unity animation import.
6. Go to **Mechanics Review**, evaluate the game systems and add playtest notes. Export the Unity implementation brief. Intercept, Rescue and Sail Together remain after-core items.

### Important limits

- This is an arcade prototype, not a full ocean physics simulation or endless persistent MMO world.
- Generated chunks are re-created deterministically; collectibles/defeated ships remain remembered for the *current session*. There is no cloud save yet.
- World is infinite in principle through coordinate-based generation, but browser floating-point precision and session state growth are not infinite.
- The water renderer is our own procedural field — not a third-party texture or shader. We can refine it with wave/ripple buffer experiments after phone profiling.
- GIF playback uses a DOM image on the mast in web preview. Unity SpriteRenderer won't automatically animate GIFs.
- Please **do not merge** until Dor and Eilon test this on their target Android device. Automated CI checks syntax and logical behavior, not visual fidelity, smoothness or phone battery impact.

See [WORLD.md](./WORLD.md) and [PHYSICS.md](./PHYSICS.md).

## V0.5 — Fused Stage Loop + Roadmap

This branch extends V0.4 with two inspector tabs:

- **Stage Loop:** test a stage objective, then Leave to bank and save or Stay for escalating difficulty and optional bonus loot. Defeat forfeits unbanked bonuses, not the already-cleared objective and guaranteed stage reward. Replay the same-stage checkpoint, then deliberately advance to the next stage. The ten-second tutorial storyboard is skippable.
- **Roadmap & Kanban:** select a mechanic, inspect its full MVP/acceptance/dependencies/Unity plan, add to Backlog, then move through Ready, In Progress, Testing, Done. Save owner and notes; export JSON for Eilon and Jira-ready Markdown for the All Aboard! project.

The connected Jira project is **All Aboard!** (key SCRUM, board ID 1). The static website stores Kanban selections locally; it does not directly create Jira issues because public Pages must not contain Atlassian access tokens.

Reputation/popularity, defensive follower ships, visible cannon trajectories, custom barrel/chicken/chain ammo, intercept/rescue/escort and coordinated eight-arm Kraken are **detailed plans**, not playable V0.5 systems. Core feel, stage loop, default cannons and damage remain first.

See [VISION.md](./VISION.md) for the phased design. Run node tests/stage-loop.cjs, node tests/planner.cjs and the existing test suites; verify the feel and UI on a real Android phone before merging into the web lab, and only port approved rules to Unity.

## V0.6 — Core Feel, HUD Editing, Map, Water Baseline & Kraken

This unmerged branch extends V0.5 without modifying the real Unity project.

- **Sailing:** tailwind is now the strongest boost; slower gradual acceleration, stronger water resistance, speed-limited rudder and editable Wind Drive / Water Drag tuning.
- **UI Studio:** move/scale game HUD components by touch, change precise X/Y values, preview classic, glass and compact button treatments, and export/import a portable JSON preset. Wheel defaults to center.
- **Expanded Map:** inspect seeded islands, ships, treasure and Kraken points with pan/zoom and independent friendly/hostile density layers. Map browsing does not mutate the live world chunk cache.
- **Water:** exact original V0.5 code preserved at water/v0.5-ocean.js. Export a water-only PNG or tuning JSON; reset water to V0.5 values. Ocean foam and ripples are clipped to water rather than drawn over island interiors.
- **Kraken:** shared coordinator with eight arm records, warning → reach → short grab → recoil; limited pulling force, modest hull damage and shoot-to-release gameplay. Only one arm grabs in this test. Full boss logic remains after-core.
- **Planning:** Mechanics Review and Roadmap include these V0.6 experiments.
- **Notes:** REFINEMENT_V06.md documents game-feel principles, Unity C# boundaries, tests and unresolved decisions.

Run node tests/core-v06.cjs and node tests/kraken-grapple.cjs alongside the existing smoke, vessel, world, stage, planner and review tests. CI checks logical behavior, not actual phone haptics, frame-time or aesthetics.

No Unity source, scene or Android build setting is changed. Do not merge before Dor and Eilon playtest the mobile version.

## V0.7 — FX, Original Pirate Audio and Unity Readiness

New experimental tabs:
- **FX & Sail Trim:** test realistic-feeling cannon recoil/shake (presentation only), wind streaks, wave-height-driven hull pitch/roll/bob and optional sail-yard tilt. Auto-trim is on by default, while manual trim remains a minor optional optimization. No new permanent play button.
- **Music & SFX:** seven short ORIGINAL programmatically synthesized pirate mood sketches and fifteen short sound effects, plus one-click prompts for external music generators. Browser sound stays muted until activated by a user gesture. Sketches are not polished final song files. Preserve asset licensing documents for external generated music.
- **Unity Checks:** advisory static YAML check for obvious missing MonoBehaviour scripts/zero scale/disabled components, local QA checklist export, and planned tests. A proposed Unity Editor prefab audit source is in unity-tools/Editor/AllAboardPrefabAudit.cs and is NOT installed into the separate course Unity repository.

**Every Roadmap mechanic now has an Architecture & Implementation Review**: algorithm, class boundaries, acceptance checks, C# integration candidates, copyable Codex prompt and change-log discipline.

See [GAME_FEEL_V07.md](./GAME_FEEL_V07.md) for the take-by-take architecture review, sound asset pipeline, Unity test guidance and the four pirate game design references. The original water baseline from V0.5 and all earlier previews remain unchanged.

V0.7 code modules: game-feel.js, audio-lab.js, v07-lab-ui.js and unity-readiness.js. Run node tests/game-feel-audio.cjs plus the existing test suites. A green browser CI does **not** certify Unity PlayMode tests, audio fidelity or phone frame-time.

Do not merge until Dor and Eilon approve the player experience in mobile Chrome and decide which modules belong in the actual Milestone 4 course scope.
