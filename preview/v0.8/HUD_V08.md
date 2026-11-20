# All Aboard — V0.8 Advanced HUD and Anchor Control

Status: experimental phone preview, not approved Unity gameplay. Based on Dor's uploaded V0.7 layout JSON and two screenshots, 2026-11-20.

## Saved design decisions

1. Sail trim: **automatic by default, optional advanced in-game manual control**. Avoid adding permanent buttons.
2. Audio: **playful pirate sailing music that becomes cinematic during combat**. The browser sketches are demonstrations, not finished orchestral soundtrack assets.

## Take 01 — Precision HUD Layout Studio

- Player: touch-drag controls; use precise X/Y offsets (0.1% steps), uniform or independent horizontal/vertical scaling (0.01 steps), rotation (0.5°), opacity (15–100%) and relative layer priority (1–30).
- Model: LayoutStudio stores one record per HUD component: x, y, scaleX, scaleY, rotation, opacity and layer. It applies individual CSS translate/scale/rotate, opacity and z-index without modifying the ship physics.
- Editing: an aspect-ratio lock links scale X/Y when desired, fine nudge buttons support 0.1% moves, and approximate overlap/out-of-screen warnings help flag problems.
- Persistence: V2 JSON includes layout records, theme and coordinateSpace. Local storage saves the current layout. V1 JSON import migrates a uniform scale to both axes, and preserves old X/Y positions.
- User's original saved exactly in presets/dor-v07-original-layout.json, available from the Apply Dor's uploaded V0.7 layout button. Compass -12/-12.5 and scale .65; minimap -1.5/-13 and scale 1.05; sail control 2.5/-4; anchor 1/0.
- Migration: old anchorButton becomes the combined anchorControl target. Old separately positioned anchorRopeHud is intentionally no longer adjustable independently: it belongs inside the anchor widget.
- Unity mapping: serializable HUDLayoutPreset; RectTransform.anchoredPosition and localScale; localRotation; CanvasGroup.alpha; Transform.SetSiblingIndex within a single Canvas. CSS stacking order is not automatically equivalent to Unity sorting order.
- Tests: confirm 16:9 and notched portrait, safe areas, touch target sizes, and overlap diagnostics in real hardware. Browser geometry tests alone are not sufficient.

## Take 02 — Unified Anchor Control

- Player: one compact anchor group with Drop/Raise button, inline chain length segment and a compact popover slider. Live chain/tension meter is integrated below the same anchor action and moves with it.
- Model: existing desired setting anchorLine versus effective deployed anchor.lineLength. The rope model reels at up to 12 lab units per second; spring/damper continue to react to wind/current. Shrinking the desired line does not teleport the ship to the new radius.
- UI: current line distance uses effective deployed length during reeling, while the small chain segment displays the target. The separate floating chain HUD is gone.
- Unity mapping: AnchorController + RopeConstraint + AnchorControlView, not three new managers. Keep all inspector-only stiffness/grip controls in development mode.
- Acceptance: single tap, contextual length adjustment, exact max deployed length, no sudden position snap, no accidental anchor drop while editing the HUD.

## Take 03 — Optional Sail Tilt

- Player: existing sail up/down remains primary; small sail AUTO / MANUAL label expands an advanced tilt slider (-45..+45 degrees) only when requested. Ideal wind alignment is shown live.
- Algorithm: existing SailPolar and Vessel.step; one source of truth for sailAutoTrim and sailTrim. Manual offset has a bounded penalty, so it does not make the casual game unplayable.
- Unity mapping: reuse SailTrimController and SailRigView; no independent physics model or mandatory second thumb control.
- Acceptance: manually moving the slider disables Auto, re-enabling Auto tracks wind, and the original SVG yard visibly turns.

## Take 04 — Selected Hybrid Audio Direction

- Interactive lab: adaptive mode chooses a playful sailing sketch for Friendly sailing, a stronger Battle sketch in Aggressive mode, and Kraken mood near a Kraken. Manual mood choice exits adaptive selection.
- Limitation: WebAudio sketches restart at mood transitions. There are no final commercial stems or true smooth audio crossfades yet.
- Production Unity plan: MusicMoodDirector reads real encounter state (not just the Friendly/Aggressive switch), crossfades licensed original stems via AudioMixer and keeps SFX separate from music.

## Regression and Playtest

- Automated: tests/hud-v08.cjs, tests/core-v06.cjs, tests/vessel.cjs and smoke tests; ensure old layout migration, 0.1% movement, axis scaling, alpha, z-order, no sudden reeling snap.
- Real phone: inspect UI Studio touch drag and layer overlap, sail and anchor popup reachability, accessibility, 16:9/notched safe area, wheel still controllable after edit mode, and adaptive sound consent.
- The design lab does not modify the Unity course repository. Dor/Eilon approval is needed before porting.

## Copyable Unity/Codex implementation prompt

Inspect the existing All Aboard Unity scenes, prefabs and course milestone constraints. Implement one grouped AnchorControlView with Drop/Raise, a contextual chain slider and embedded current-length/tension meter using the existing RopeConstraint. Create a small SailTrimPopup inside the current sail control with Auto on by default. Make a dev-only HUD Layout Studio using a versioned HUDLayoutPreset with normalized position, independent scale X/Y, rotation, CanvasGroup alpha and sibling priority. Follow SafeAreaFitter and existing UI patterns. Keep scripts/fields minimal, use FixedUpdate for physics and Update/LateUpdate for rendering. Add EditMode tests for chain reeling and layout schema, PlayMode tests for taps/scene flow/phone aspect ratios, and document every file changed in CHANGELOG.md. Do not add new packages or change unrelated Unity systems without approval.
