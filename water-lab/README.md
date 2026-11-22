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
