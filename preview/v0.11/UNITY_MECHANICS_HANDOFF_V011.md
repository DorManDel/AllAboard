# All Aboard — Mechanic → Unity Handoff Contract (V0.11)

**Status:** Research document and copyable sample C#. Nothing here is installed into the Eilon343/AllAboard Unity project. Every mechanism has **What/Why → Data → Formula → Functions → Unity integration → Tests → Approval**. Keep the original browser prototype and baseline snapshots unchanged.

## 0 · Verified Unity baseline (Eilon's repository, main branch, 2026-11-22)

| Existing Unity component | Actual path | How to reuse |
|---|---|---|
| Coin balance and HUD | Assets/Scripts/Game/CoinCounter.cs | \`Services.Save.GetInt("coins")\`, \`SetInt("coins", ...)\`, \`TMP_Text\`; do not create a second wallet |
| Save service contract | Assets/Scripts/Services/ISaveService.cs | \`GetInt(key,fallback)\`, \`SetInt(key,value)\` |
| Save implementation | Assets/Scripts/Services/PlayerPrefsSaveService.cs | \`PlayerPrefs\`, \`PlayerPrefs.Save()\`; development persistence only |
| Central service access | Assets/Scripts/Services/Services.cs | \`Services.Save\`, \`Services.Settings\` |
| Startup | Assets/Scripts/Game/Boostrap.cs | \`Bootstrap.Awake()\` initializes services, loads \`Home\` |
| Home / Level navigation | Assets/Scripts/Game/ScreenFlow.cs | \`Play()\` opens \`Level\`, \`Home()\` opens \`Home\` |
| Safe area | Assets/Scripts/Game/SafeAreaFitter.cs | Reuse its existing \`Screen.safeArea\` anchor calculation |

Current Unity scenes: \`Assets/Scenes/Bootstrap.unity\`, \`Home.unity\`, \`Level.unity\`. Check serialized UI references in Unity Editor, not just filename. Avoid silently changing scene flow, save data or gameplay scope.

**After each approved HTML mechanism:** compare one-to-one with existing C# code, decide **Reuse / Adapt / New**, write a brief proposal, then implement and validate in Unity. Do not assume the browser code is production-ready.

## 1 · Mobile fullscreen

**Browser lab:** \`fullscreen-play.js\` uses the native Fullscreen API on a button press. If unsupported/denied, \`allaboard-play-focus\` styles the **same live phoneScreen** to fill the viewport. Exit is always inside the game. Browser bars may remain in fallback; this is honest "focus mode," not actual fullscreen.

**Unity:** The installed Android game is already a fullscreen app, so do not recreate HTML's requestFullscreen logic. Instead, check Android Player settings, Canvas Scaler 1080×1920 reference, screen orientation, \`SafeAreaFitter\` and a single GameHUD root active in Level. Add a developer button only if it helps toggle overlays (debug chrome) in builds. Prefer reusing Home/Level navigation via existing \`ScreenFlow\` instead of adding new scene handlers.

**Acceptance:** 16:9 and notched portrait layouts preserve thumb controls and exit/navigation; no user interface touches under OS/system insets; fullscreen fallback verified in Android Chrome separately.

## 2 · Sail area + full yard trim (implemented browser V0.11)

**Fields:** \`sailArea01\` (0..1), \`manualTrimDegrees\` (-90..90), \`autoTrim\`, \`windToDegrees\`, \`headingDegrees\`, \`lastRaisedArea01\`.

**Shared formulas**, not a real aerodynamic solver:

\`\`\`text
relativeWind = DeltaAngle(shipHeading, windTravelDirection)
desiredTrim = clamp(0.5 * relativeWind, -90, 90)
actualTrim = autoTrim ? desiredTrim : clamp(manualTrim, -90, 90)
efficiency = clamp(1 - 0.14 * abs(actualTrim-desiredTrim)/90, 0.86, 1)
thrust = sailArea01 * windDrive * windPower * windPolarFactor * efficiency
\`\`\`

A broad wind polar still determines whether the ship can actually accelerate against the wind. This trim formula intentionally imposes only a **small arcade penalty**; it is not validated as a physically correct sail aerodynamic coefficient.

**Suggested simple C# core, pure computation:**

\`\`\`csharp
using UnityEngine;

public static class SailModel
{
    public static float DesiredTrim(float shipHeading, float windTravelHeading)
    {
        float relative = Mathf.DeltaAngle(shipHeading, windTravelHeading);
        return Mathf.Clamp(relative * 0.5f, -90f, 90f);
    }

    public static float TrimEfficiency(float manualTrim, float desiredTrim, bool autoTrim)
    {
        float actual = autoTrim ? desiredTrim : Mathf.Clamp(manualTrim, -90f, 90f);
        return Mathf.Clamp(1f - 0.14f * Mathf.Abs(actual - desiredTrim) / 90f, 0.86f, 1f);
    }
}
\`\`\`

**Unity UI mapping:** \`Slider\` in standing/vertical direction for manually setting \`manualTrimDegrees\`, one \`Button\` for Raise/Lower; alternate standing vertical \`Slider\` for sail area with \`autoTrim=true\`. Both drive the same existing ship motor through a minimal bridge. Make the rope-like handle a custom 9-sliced sprite for the slider's handle and a repeated rope texture for the track (don't generate physics from the sprite). The selected tilt persists on pointer release; no spring back. Keep the old positive sail area to restore with Raise.

**Tests:** ±90 boundary; 0/100% sail area; mode switching retains manual choice; ship acceleration and render yard agree; raised/lowered states stable; Android touch target >= course requirement.

## 3 · Wind-driven flag (browser approximation, not cloth physics)

**Issue fixed:** \`sign(sin(relativeWind))\` used to flip a full-width flag instantly at the heading crossing, causing a visual pop. V0.11 uses a **continuous projected lateral factor** instead:

\`\`\`text
relative = radians(Wrap180(windTo - shipHeading))
lateral = clamp(2.4 * sin(relative), -1, 1)
clothReach = 9 + 14 * clamp(windStrength/7, 0, 1)
x(t) = lateral * clothReach * t          // t=0: mast, t=1: free edge
flutter(t) = sin(time * frequency - t * 8.2) * amplitude * t²
\`\`\`

As the wind crosses the axis, the projected width shrinks toward zero, then expands on the opposite side instead of instantly swapping. The browser uses **seven textured strips** and a special GIF transform. PNG is the exportable still-poster format; preserve original animated GIF separately.

**Unity proposal:** use a small \`Mesh\` strip with 8 vertices along the cloth and \`MeshFilter\`/\`MeshRenderer\`, or animate a SpriteRender quad/transform first. Reuse a shared WindField output; update vertices in LateUpdate. No eight separate managers; one \`ShipFlagPresenter\` script per flag. Verify UV orientation and backface rendering. The game should use the actual flag texture, not generate art differently from the editor.

**Tests:** change wind 179° → 181° across crossing, check no 2× full-width snap; mast vertices fixed, free edge moves and recovers; 60/30 fps on mobile; custom PNG persists.

## 4 · OceanField + procedural water shader (FUTURE PROPOSAL, not approved/implemented in Unity)

**Goal:** attractive stylized water whose *physics and visual wave height agree*, reacting to wind, ship movement, anchor, cannon impacts, nearby islands and future Kraken interactions.

**Contract:** one sampled surface model should drive the water renderer *and* the ship's four-point floating posture. Don't put unshared "secret waves" solely in a shader and then pretend the hull feels them.

\`\`\`text
baseH(x,t) = Σ A_i sin(dot(k_i,x) - ω_i t + phase_i)
eventH(x,t) = Σ impulse_i * exp(-age_i*decay)
                         * exp(-((distance(x,xi)-speed_i*age_i)/width_i)^2)
seaH(x,t) = landMask(x) * (baseH(x,t) + eventH(x,t))

pitch ≈ atan2(Hbow - Hstern, hullLength)
roll  ≈ atan2(Hstarboard - Hport, beamWidth)
\`\`\`

**Shader design in Unity URP 2D:** ocean plane or tiled sprite using Shader Graph:
1. Sample low-frequency scrolling blue-green noise using a shared wind direction and simulation time. A second higher-frequency noise adds small ripples; a third texture/gradient models highlights and foam.
2. The CPU/source-of-truth computes or exposes the same low-frequency wave components. Pass \`_WindDirection\`, \`_WindStrength\`, \`_SimulationTime\`, \`_WaveAmplitude\`, a bounded \`_Ripples\` buffer and \`_WorldToSeaUV\` to the shader.
3. Render shoreline islands with water/land masks. Suppress ripples on land, attenuate at shore boundaries and add shallow-water foam rather than drawing waves across beaches.
4. Limit event impulse pool and reuse memory. Check actual Android frame timing (p50/p95) before increasing resolution or shader complexity.
5. Keep the currently approved water appearance as a baseline toggle. Compare value/quality/performance under identical world seed, camera and device.

**Minimal event API proposal:**

\`\`\`csharp
public interface IWaterSurface
{
    float SampleHeight(Vector2 worldPosition, float simulationTime);
    Vector2 SampleCurrent(Vector2 worldPosition, float simulationTime);
    void AddImpulse(Vector2 position, float amplitude, float radius);
}
\`\`\`

No GameObject per ripple. Start with static water and two layers of noise, then add bounded impulses and shared buoyancy. Sprites are fine for foam/splash; use shaders for continuous low-frequency water color/distortion. The browser V0.9 ripple technique is an experiment, not measured fluid dynamics.

**WindField (FUTURE):** one seeded evolving sample \`WindAt(position, time)\` returns wind vector, strength and gust factor, optionally a cached grid. Smooth targets:

\`\`\`text
wind(t+dt) = lerp(wind(t), targetWind, 1 - exp(-dt / responseTime))
\`\`\`

Sails, flag, wake, water shader and compass consume the same field. Use the seed+time+position for reproducible tests.

## 5 · Haptic feedback (V0.11 browser adapter; mobile test required)

**Existing issue:** the lab invoked \`navigator.vibrate(pattern)\` without reporting capability, user activation or result. Browser restrictions can prevent any physical feedback. Web vibration duration and pause sequence do **not** control motor amplitude. A return value of true only means that the request was accepted, NOT that vibration was felt.

**Current new adapter:** \`haptics.js\` uses event IDs (sail detent, wheel tick, anchor drop/raise, shot, hit, coins, repair, Kraken), cooldown and optional duration multiplier. Helm tab includes Enable/Disable, explicit Test and Stop, capability/status. Run directly in Android Chrome or a supported browser with system vibration enabled and an actual user tap. Don't pretend desktop or iOS support.

**Unity baseline:** use a tiny \`HapticFeedback\` wrapper with \`Handheld.Vibrate()\` for selected meaningful events if supported; Unity's simple API doesn't give distinct vibration amplitude/pattern on all hardware. For richer Android-specific effects, evaluate Android \`Vibrator\` / \`VibrationEffect\` native bridge (API and permissions must be verified) or a vetted plugin, after team approval. Never vibrate every frame or on every small wheel movement.

**Unity event boundaries:** a real cannon shot fires \`OnCannonFired\`, damaged hull fires \`OnHullHit\`, anchor fires \`OnAnchorDropped\`. Audio, haptic, recoil and camera feedback subscribe separately. Preserve the difference between hull motion and camera shake.

## 6 · QA acceptance & change log

- **Browser checks** are deterministic mathematical/unit tests and DOM wiring tests, not hardware feel tests.
- **Unity checks** should be EditMode tests for field formulas/rope constraints and PlayMode for actual scenes, prefab references and touch/Android behavior. Reuse \`SafeAreaFitter\`, \`Services.Save\`, \`ScreenFlow\`.
- For each approved mechanics ticket: inventory actual project scripts, list Reuse/Adapt/New, data fields, class names, formulas, event graph, performance budget, tests, screenshots/video, and the exact files modified in \`CHANGELOG.md\`.
- Update QA Feedback Inbox with component ID, status, owner and evidence. Don't mark a phone-only feature "Passed" based on browser CI alone.
