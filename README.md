# ⚓ All Aboard — Mechanics Lab

**V0.4 (experimental, stacked on unmerged V0.3)** — A self-contained, interactive web playground for testing ideas before adding them to the **All Aboard** Unity mobile game.

**Design principle:** Easy to control, hard to master. One-thumb, portrait gameplay with meaningful choices.

> This is a concept prototype using arcade-tuned units, not production Unity code or physically calibrated marine simulation.

## Launch

- **In a browser:** open index.html. The lab uses plain HTML, CSS and JavaScript, with no build or dependencies.
- **GitHub Pages:** after merging, open repository Settings → Pages → Build and deployment: Deploy from a branch → main / (root) → Save. Then use the GitHub Pages URL shown there.
- **Automated smoke test:** run node tests/smoke.cjs (Node 22 recommended).

The web lab lives in this repository. The **real Unity project** remains in [Eilon343/AllAboard](https://github.com/Eilon343/AllAboard) and is not modified by this experiment.

## Eleven experimentation tabs

| Tab | Try it |
|---|---|
| Live Playground | Steer while adjusting sails, anchor, wind and Friendly/Aggressive mode |
| Helm | Centered ±1080° wheel, responsive controls, separate rudder/yaw response, **adjustable keel drag** and live forward/side speeds |
| Sails & Wind | Tune wind TO-direction, sail area and headwind/tailwind effects |
| Anchor | Throw with splash, soft spring-damper rope, adjustable **chain stiffness/damping**, anchoring radius and delayed dragging on sustained force |
| Ocean | Our original procedural water-height field, speed/turn wake foam, local ripples, wave-gradient current and vortex | 
| World | Deterministic seed, streamed infinite chunks, islands, friendly/hostile NPC ships, loot and rare test Kraken |
| Damage | Cannon center + splash radius, chain combos, turn-based fire/flood progression, enemy repair cost and functional disabled sails/cannons/rudder |
| Encounters | Offer what an NPC actually needs, or choose enemy sections to disable |
| Pimp My Ship | Original SVG parts, visible mast-mounted flag, pixel painter, local photo or animated GIF, PNG export, and rig selection |
| Ideas Board | Shortlist six smart-play concepts for Eilon |
| Mechanics Review | Keep / Refine / Test / Later / Reject each mechanic, take notes, export a Unity C# handoff brief |

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
- assets/ship-wheel.svg — vector tracing of the supplied wooden wheel silhouette
- assets/ship-parts/*.svg — original hull, sails, cannon pieces and anchor copied from the team's Unity repository
- DESIGN.md — specifications, test questions, limits and Unity implementation plan
- tests/smoke.cjs — basic initialization, markup and controller tests
- tests/vessel.cjs — deterministic sailing/anchor/water behavior tests
- tests/world.cjs — determinism, negative coordinates, bounded cache, collected treasure and monster tests
- WORLD.md — world model, ocean decision, flag behavior, acceptance criteria and C# integration contracts
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
