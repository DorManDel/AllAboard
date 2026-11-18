# ⚓ All Aboard — Mechanics Lab

**V0.3 (experimental)** — A self-contained, interactive web playground for testing ideas before adding them to the **All Aboard** Unity mobile game.

**Design principle:** Easy to control, hard to master. One-thumb, portrait gameplay with meaningful choices.

> This is a concept prototype using arcade-tuned units, not production Unity code or physically calibrated marine simulation.

## Launch

- **In a browser:** open index.html. The lab uses plain HTML, CSS and JavaScript, with no build or dependencies.
- **GitHub Pages:** after merging, open repository Settings → Pages → Build and deployment: Deploy from a branch → main / (root) → Save. Then use the GitHub Pages URL shown there.
- **Automated smoke test:** run node tests/smoke.cjs (Node 22 recommended).

The web lab lives in this repository. The **real Unity project** remains in [Eilon343/AllAboard](https://github.com/Eilon343/AllAboard) and is not modified by this experiment.

## The nine experiments

| Tab | Try it |
|---|---|
| Live Playground | Steer while adjusting sails, anchor, wind and Friendly/Aggressive mode |
| Helm | Centered ±1080° wheel, responsive controls, separate rudder/yaw response, **adjustable keel drag** and live forward/side speeds |
| Sails & Wind | Tune wind TO-direction, sail area and headwind/tailwind effects |
| Anchor | Throw with splash, soft spring-damper rope, adjustable **chain stiffness/damping**, anchoring radius and delayed dragging on sustained force |
| Ocean | **Procedural advected water-height interference field**, speed/turn wake foam, bubbles/splashes, wave-gradient force and vortex/current |
| Damage | Cannon center + splash radius, chain combos, turn-based fire/flood progression, enemy repair cost and functional disabled sails/cannons/rudder |
| Encounters | Offer what an NPC actually needs, or choose enemy sections to disable |
| Pimp My Ship | Original SVG ship parts, animated furling instead of disappearance, square/lateen/storm sail rigs with different stats, and local monogram/image flag |

| Ideas Board | Shortlist 6 testable smart-play concepts and export a Markdown review for Eilon |

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
- assets/ship-wheel.svg — vector tracing of the supplied wooden wheel silhouette
- assets/ship-parts/*.svg — original hull, sails, cannon pieces and anchor copied from the team's Unity repository
- DESIGN.md — specifications, test questions, limits and Unity implementation plan
- tests/smoke.cjs — basic initialization, markup and controller tests
- tests/vessel.cjs — deterministic sailing/anchor/water behavior tests
- .github/workflows/lab-checks.yml — CI checking syntax, controls, vessel physics and ocean

## Limits and next steps

- The ship now renders from the **original team-authored Unity SVG components** whenever the browser loads them; a canvas illustration remains as fallback.
- OceanField samples low-resolution moving wave interference patterns and generates localized wake/splash foam. It is **not** a full shallow-water or buoyancy solver; waves only provide a simplified force.
- The rope now applies a spring-damper load before a rare safety projection, allowing the ship to oscillate in its tether radius. It still does not model seabed depth, chain mass/catenary or actual rope collisions. All values are experimental LAB UNITS.
- Haptics use the browser Vibration API where available (mainly supported Android browsers), with silent fallback.
- A real phone playtest is still required to validate readability, latency, battery use and interaction feel.

See [DESIGN.md](./DESIGN.md) for a more detailed spec and a proposed migration plan to Unity C# once a mechanic feels right.

## V0.3 playtest order

1. **Helm first:** open Helm; compare side slip against forward speed. Turn with and without sails, try low/high keel resistance.
2. **Ocean:** observe water surface gradients, stern foam at slow/fast speed, turning bubbles, anchor throw and cannon splash. Tune Wave Height and Wave Push separately.
3. **Anchor:** change stiffness, damping and chain length. Test slack → taut → holding/dragging beside the vortex; note whether oscillation feels better.
4. **Sails:** change course relative to wind; a beam/broad reach should outperform direct downwind. Closing sails visibly folds the cloth.
5. **Damage:** hit sail tiles; watch enemy vessel lose propulsion and coast to a stop. Fire, flood, repair and repair our own disabled modules.
6. **Shipyard:** compare sail shapes (square / lateen / storm). Customize a **local-only** flag with initials/color or your own image.

**Inspired by, not copied from:** [TinyWind sailing manual](https://tinywind.io/wiki/sailing), [The Physics of Sailing](https://physicstoday.aip.org/features/the-physics-of-sailing), [2D top-down boat physics](https://medium.com/@van_aaron/simple-top-down-2d-boat-physics-for-games-8e43b50552e9). Our prototype does not contain or claim access to TinyWind's implementation.
