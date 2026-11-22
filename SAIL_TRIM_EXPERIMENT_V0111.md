# All Aboard — Sail Control Feedback Experiment V0.11.1

**Experiment only; not approved for merge or Unity.** Child of the V0.11 branch / PR #10. Preserve the published V0.11 preview for A/B comparison.

## Problem
- Manual sail slider looked reversed against the on-screen yards.
- Manual trim altered thrust by at most 14%, making the skill nearly invisible.
- Sail-change vibration never fired because the handler compared the new value with itself.

## Trial changes
1. In the top-down browser sprite only, render `ctx.rotate(-trimRadians)`. Physics angle signs and wind directions remain unchanged.
2. For a trim error `e = abs(actualTrim - desiredTrim)` in 0..180 degrees, use:

   `trimEfficiency = 0.15 + 0.85 * cos(e * pi / 360)^2`

   | Error | Resulting sail drive multiplier |
   |---:|---:|
   | 0° | 100% |
   | 45° | ~88% |
   | 90° | 57.5% |
   | 135° | ~27% |
   | 180° | 15% |

   This changes **sail-generated thrust only** and is intentionally arcade-tuned, not calibrated aerodynamics. `baseThrust`, wind polar, water drag, rig damage and current remain separate. Keep aligned vs misaligned tests at the same wind and heading.
3. Compare the old and new slider values at each detent before requesting vibration (browser support and physical vibration require Android testing).

## Mobile acceptance (Dor + Eilon)
- Fullscreen: slide rope up/down in a steady 90° crosswind; assert the ship art tilts in the intuitive direction, including at the -90/0/+90 limits.
- With wind-to 90°, ship heading 0°, the ideal yard angle is +45°. Starting from rest at identical wind/ship conditions, compare +45° with -90° and observe a clear acceleration difference in the telemetry. Switching to Auto should restore optimal efficiency.
- Lower sails entirely: there should be no sail-generated force even at perfect trim.
- Rotate ship through wind crossing; verify flag remains smooth and compass labels use **wind TO** direction.
- Test manual and auto sail modes, touch release persistence, haptics on Android Chrome, no vibration spam, 30/60/120 Hz feel on real phones.
- Compare unchanged wind/heading/seed on V0.11 vs V0.11.1 and record screen video, FPS and driver settings. Do not declare success from automated tests alone.

## Architecture note
`vessel.js` owns actual sail thrust, `game-feel.js` exposes an equivalent diagnostic profile, and `app.js` renders the yard. The new `tests/sail-response-v0111.cjs` enforces physics/FX agreement. A future approved refactor should extract a shared pure `SailModel` and sample a single `WindField` for sail, flag, water, and compass. Compare Unity team code after browser approval. No Unity scenes or scripts were touched.
