# All Aboard — Water Lab V0.1

**Status:** Experimental standalone browser lab in \`/water-lab/\`. This does not modify the Unity game or the preserved V0.11/V0.11.1 mechanics implementations.

## Why build it?
Learn how one authoritative stylized surface can support water rendering, simple sampled boat feedback, weather, wind and local interaction effects without a costly per-pixel fluid simulation.

## Rendering stages
1. **Noise A**: seeded 2D value noise; broad, smooth features.
2. **Noise B**: independent seeded value noise at a smaller scale.
3. **Wind waves**: directional sine harmonics; wind-TO heading 0° means north/up.
4. **Impulses**: damped Gaussian-envelope traveling rings for cannon, anchor, wakes, sinking and taps. The event array is capped at **28**.
5. **Height**: \`H = waveHeight * [0.72 * (mixA * NoiseA + mixB * NoiseB) + 0.28 * WindWaves + RainDetail] + Impulses\`.
6. **Color**: shaded RGB from the same sampled height. White foam curves are visual overlays.

All units are arbitrary lab units. A value-noise field is not a physically calibrated water-height distribution; the "weather" preset is an artistic control rather than a weather service. Sinking and cannon are simplified surface events, **not** physical bodies displacing fluid.

## Why the browser lab uses CPU
For explanations, all stages must be inspectable in one JavaScript implementation. We render a low-resolution ImageData field (Eco: 10px/12Hz, Balanced: 7px/18Hz, High: 5px/24Hz), interpolate it to the screen and draw a separate boat overlay. Both the boat and image use the same pure function \`sample(x,y,time,settings,events)\`. The renderer caches wind and reuses the same sampling object to avoid creating an object per pixel. A single \`requestAnimationFrame\` handles presentation and capped dt; the water field only recalculates at the preset rate.

The FPS readout is *actual browser animation FPS* and Water CPU ms is the measured ImageData update time via \`performance.now()\`. Neither measurement represents Unity GPU milliseconds or proves 30/60/120Hz performance on Android.

## Intended Unity port
- **WaterField** as a pure C# service: wind, seeds, bounded event impulses and \`SampleHeight(position,t)\`.
- **Renderer**: one URP unlit shader over ocean plane or tiled background, sampling 1-2 precomputed scrollable noise textures (or 2 cheap shader noise layers) and bounded local interactions. Profile Shader Graph vs hand-written HLSL on real devices.
- **Gameplay**: sample height/gradient at *only a few positions* per ship (bow, stern, port, starboard) and share a separate current vector. Avoid querying height every frame for every particle.
- **Local events**: event ring buffer/pool (no GameObject per ripple), event strength/size/fade synchronized with SFX/haptics.
- **Tiering**: Eco uses lowest-cost material and minimal wakes, Balanced adds restrained foam, High offers additional detail. Decouple graphics tier from physics tick and avoid GPU readback.
- **Measurement**: evaluate on device under fixed world seed and fixed camera with Unity Profiler and Android GPU timing. Compare render CPU/GPU p50/p95, fill-rate/overdraw, battery and thermals; do not infer these from the browser canvas.

## Validation
Run \`node water-lab/tests/water-core.cjs\` from repository root. Try on Android Chrome under throttle, rotate the device, repeatedly tap to saturate event pool, test each layer in every preset, then capture device-specific notes. The lab doesn't guarantee an FPS cap; its water update *rate* is capped independently from display FPS.


## V0.2: Water Layer Editor (2026-11-22)

- **Eyes, Solo, Opacity, Blend:** Noise A, Noise B, Wind Waves, Rain Texture,
  Ripples, Wake Trail and Surface Rings each have a visible row. The first five
  compose a *shared sample height field*; the final two only alter the rendered
  overlays. The artistic height-field blend modes are Add, Multiply and Replace.
  Only Add is used by default. Solo masks out the unselected layers.
- **Touch:** touching/hovering open water ONLY inspects the sample. It never emits
  an event. Dragging the boat changes the boat position but does not invoke a
  touch-based ripple.
- **Controlled sources:** cannon impacts, anchor drops, ship wake and simulated
  sinking emit short-lived ripples. The buffer stays capped at 28.
- **Seed:** edit a signed 32-bit integer, or pass \`?seed=31415\` in the URL.
  Same seed + settings + world coordinates + simulation time + active event
  list = the same mathematical water height. This contract does not promise
  identical render framerates across GPUs or browsers.
- **Export JSON:** exports version 2 with seed, numeric settings, layer states,
  palette, quality, inspection mode, simulation time, boat position, wake trail
  and the remaining events.
- **Import JSON:** validates/clamps numeric fields, recognizes V1 and V2, restores
  the water and **pauses time** on the restored snapshot for visual comparison.
- **Export JS + Engine:** bundles the full current \`water-core.js\` and selected
  snapshot as a standalone JavaScript source file. In a browser:
  \`AllAboardSampleWater(x, y, t).height\` returns the exact reference formula
  for that profile; \`AllAboardWaterProfile\` exposes the editable parameters.
  This is JS source, *not* a compiled Unity shader. Keep code comments English.
- **Live Logs:** change events, import/export, scene actions and periodic browser
  frame/water CPU timing are shown in a capped rolling console. Export as TSV.
  Browser timing is not GPU profiling.

### Recommended learning sequence
1. Pause. Select **Noise A**, then adjust its Scale and contribution.
2. Select **Noise B**. Compare the smaller features and solo either layer.
3. Switch to **Final**, turn Eye off/on and vary Opacity. Try Add/Replace/Multiply.
4. Set a known Seed and wind direction. Compare Wave only against the full field.
5. Generate cannon and anchor impulses; click empty water to verify it does NOT
   add events. Use the inspector to observe the numeric differences.
6. Export a JSON snapshot; change everything; import it. The imported time is
   paused for comparison. Export JS for a portable copy of the algorithm.
7. Compare Eco/Balanced/High on each actual target Android device while watching
   *measured* display FPS and Canvas CPU time. No invented benchmarks.

## CI/CD: understanding the .yml files

**YAML is configuration**, not executable game code. GitHub interprets the
indentation as nested mappings and lists.

- \`.github/workflows/water-lab.yml\` runs a Node syntax/unit/DOM smoke test on
  feature pushes and pull requests. Tests returning exit code 0 are marked green.
- \`.github/workflows/lab-checks.yml\` validates the original game lab.
- \`.github/workflows/deploy-pages.yml\` is the publisher: only a push to
  \`main\` (or a manual \`workflow_dispatch\`) can request deployment.
  \`permissions\` gives the workflow read access to repo content and write access
  to Pages, with OIDC \`id-token: write\` for Pages deployment.
  \`validate\` runs tests, \`build\` stages static files and uploads a Pages artifact,
  and \`deploy\` publishes that artifact. \`needs\` ensures the later job does
  not run unless its dependency succeeds; \`concurrency\` prevents stale deployments.

**Important account setting:** Repository Settings → Pages → Build and
deployment → Source must be **GitHub Actions** for a custom Pages publisher.
A test success does *not* guarantee a successful website deployment.
Check the final deployment job and the \`github-pages\` environment URL.
This workflow never publishes a draft feature branch to the public site;
the static \`water-lab/\` folder on main is published once reviewed.
