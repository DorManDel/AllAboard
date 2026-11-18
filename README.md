# ⚓ All Aboard — Mechanics Lab

A self-contained, interactive web playground for testing ideas before adding them to the **All Aboard** Unity mobile game.

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
| Helm | Turn wheel ±1080°, test spring-back, dead zone and steering response |
| Sails & Wind | Tune wind TO-direction, sail area and headwind/tailwind effects |
| Anchor | Hold or drag in currents and a vortex; tune the anchor line |
| Ocean | Tune 2D waves, wakes, foam-like flecks and ripples |
| Damage | Compare 5×5 HP grid, disabled modules and core-target puzzle |
| Encounters | Offer what an NPC actually needs, or choose enemy sections to disable |
| Pimp My Ship | Choose hull/sail/cannon parts and compare indicative stats |

### Suggested first playtest

1. In the Live Playground, drag the wheel and release it. Try more than one full revolution.
2. Compare reduced and full sails under headwind and tailwind.
3. Select **Vortex escape**, drop the anchor, then adjust grip and vortex pull.
4. Switch Friendly/Aggressive, then inspect both encounter prototypes.
5. Try all three Damage Lab modes and decide which puzzle requires the fewest explanations.
6. Export the tuned preset as JSON for future comparisons.

## Repo files

- index.html — layout and lab controls
- style.css — portrait preview and responsive glass UI
- app.js — shared simulation, Canvas ocean and interaction logic
- assets/ship-wheel.svg — vector tracing of the supplied wooden wheel silhouette
- DESIGN.md — specifications, test questions, limits and Unity implementation plan
- tests/smoke.cjs — basic initialization, markup and controller tests
- .github/workflows/lab-checks.yml — CI checking syntax and controls

## Limits and next steps

- The ship is an illustrative canvas drawing, not the existing Unity sprite.
- Water is a light animated visualization with simulated currents/vortex forces, not a complete fluid solver.
- Anchor holding, sail thrust and damage numbers are experimental and not balanced.
- Haptics use the browser Vibration API where available (mainly supported Android browsers), with silent fallback.
- A real phone playtest is still required to validate readability, latency, battery use and interaction feel.

See [DESIGN.md](./DESIGN.md) for a more detailed spec and a proposed migration plan to Unity C# once a mechanic feels right.
