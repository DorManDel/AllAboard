# ⚓ All Aboard — Mechanics Lab

**V0.2** — A self-contained, interactive web playground for testing ideas before adding them to the **All Aboard** Unity mobile game.

**Design principle:** Easy to control, hard to master. One-thumb, portrait gameplay with meaningful choices.

> This is a concept prototype using arcade-tuned units, not production Unity code or physically calibrated marine simulation.

## Launch

- **In a browser:** open index.html. The lab uses plain HTML, CSS and JavaScript, with no build or dependencies.
- **GitHub Pages:** after merging, open repository Settings → Pages → Build and deployment: Deploy from a branch → main / (root) → Save. Then use the GitHub Pages URL shown there.
- **Automated smoke test:** run node tests/smoke.cjs (Node 22 recommended).

The web lab lives in this repository. The **real Unity project** remains in [Eilon343/AllAboard](https://github.com/Eilon343/AllAboard) and is not modified by this experiment.

## The eight experiments

| Tab | Try it |
|---|---|
| Live Playground | Steer while adjusting sails, anchor, wind and Friendly/Aggressive mode |
| Helm | **Centered** ±1080° wheel, smoother every-frame animation, rudder / yaw response, spring-back and dead zone |
| Sails & Wind | Tune wind TO-direction, sail area and headwind/tailwind effects |
| Anchor | Throw with splash, **slack vs taut** chain, a hard line-length limit, pivot and dragging in strong currents |
| Ocean | Separate OceanField engine: layered stylized sea, wake, splashes, current and vortex force |
| Damage | Compare 5×5 HP grid, disabled modules, core-target puzzle and **chain-reaction cells** |
| Encounters | Offer what an NPC actually needs, or choose enemy sections to disable |
| Pimp My Ship | Toggle **eight original SVG ship pieces** from the team Unity repo; choose hull, sails and cannon variants |

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
- ocean.js — reusable procedural sea field, local flow sampling and environmental splash effects
- assets/ship-wheel.svg — vector tracing of the supplied wooden wheel silhouette
- assets/ship-parts/*.svg — original hull, sails, cannon pieces and anchor copied from the team's Unity repository
- DESIGN.md — specifications, test questions, limits and Unity implementation plan
- tests/smoke.cjs — basic initialization, markup and controller tests
- .github/workflows/lab-checks.yml — CI checking syntax and controls

## Limits and next steps

- The ship now renders from the **original team-authored Unity SVG components** whenever the browser loads them; a canvas illustration remains as fallback.
- OceanField uses 2D procedural visuals and local arcade currents/vortex forces. It is **not** a full shallow-water solver; no two-way height-field feedback yet.
- The rope's distance constraint is implemented, but the anchoring model does not simulate actual depth, anchor-setting, catenary mass, or seabed classification. Sailing, damage and upgrade stats are not balanced.
- Haptics use the browser Vibration API where available (mainly supported Android browsers), with silent fallback.
- A real phone playtest is still required to validate readability, latency, battery use and interaction feel.

See [DESIGN.md](./DESIGN.md) for a more detailed spec and a proposed migration plan to Unity C# once a mechanic feels right.
