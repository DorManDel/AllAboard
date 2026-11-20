# All Aboard Mechanics Lab V0.10 — Sail Controls + HUD Appearance

**Status:** isolated browser prototype, pending Dor/Eilon mobile playtest and approval. No Unity gameplay or course milestone code changed.

## Approved inputs (from design review)

- Standing **vertical** slider, exactly like our original sail-height slider, NOT a horizontal track.
- **Default:** a Raise/Lower button plus vertical manual yard-tilt slider (`-45..+45°`), in increments of `0.5°`.
- **Alternate:** standing sail-area slider (`0..100%`) plus automatic tilt.
- Manual slider **stays exactly where released**. The wheel-like return-to-center behavior would be wrong for a fixed rigging setting.
- Both modes use the SAME sail-area/tilt physics state; mode switches never reset the last manual tilt or current sail area. Raise after Lower restores the last positive area.
- Keep anchor reel/manual chain, seeded WindField and new shader work **out of this take**.

## Take 01 — One Sail Controller; two UIs

### Source

- `app.js`: `sailControlMode` (`toggle-tilt` vs `classic`), `setSailControlStyle()`, `tune()`, `syncSettings()`, last positive `sail`.
- `vessel.js`: unchanged existing wind-relative `desiredTrim`, `actualTrim`, `trimFactor` and drive formula.
- `index.html` + `style.css`: both are **standing vertical** range inputs in one compact HUD position. The changeable setting is the input mapping, not the underlying physics.

### State contract

| Field | Default / bounds | Owner |
| --- | --- | --- |
| `sailControlMode` | `toggle-tilt` (manual) | Browser HUD/preset |
| `sail` | default 72%, range 0–100% | Vessel state |
| `sailTrim` | 0°, range -45..45°, 0.5° step on phone | Vessel state |
| `sailAutoTrim` | false in default mode; true in alternative | Sail controller |
| `lastRaisedSailArea` | remembers last nonzero sail amount | UI-only memory |

The manual slider is controlled (its value reflects `settings.sailTrim`), with **no pointer-up reset**. If the player switches to auto, the stored manual angle remains unchanged; when manual mode returns, it resumes from that angle.

Full mechanics export now includes `sailControlMode` (schema version 5). Legacy V0.9 presets without the mode are migrated based on their `sailAutoTrim` value. The user's earlier favorite preset and V0.9 browser preview remain unchanged.

### Game feel tuning

Recoil, camera shake, wave-driven roll and wind streak sliders offer fine `0.05` increments over `0..3`, including numeric values. This changes only the browser lab tuning envelope; it does not claim that `3` is physically realistic or should ship on mobile. Distinguishing outgoing recoil from incoming hull-hit response remains a separate next take.

### Unity handoff (when approved)

Use one `SailController` or existing vessel service exposing sail area, trim angle and auto mode. Create `SailControlView` with two interchangeable layout/input assignments; no duplicate physics loop. Keep sail visuals linked to gradual furling and yard rotation. The UI remembers the last positive sail area for Raise/Lower. No extra permanent button is required to display both controls simultaneously.

## Take 02 — Reversible HUD appearance

### Added per-component fields

- `visible`: hide a HUD component (also makes it non-interactive).
- `borderEnabled`: independent on/off; disabling does NOT delete stored thickness/color.
- `borderWidth` (0–12px, 0.25px steps), `borderRadius` (0–32px), `borderColor`.
- `backgroundEnabled`: independent on/off; off makes the component background transparent while preserving previous values.
- `useBackground`: enable custom override instead of preserving original native component styling.
- `background`, `backgroundStyle` (solid, glass, gradient), `backgroundOpacity` (0–100%).

Old appearance values and layouts import from **V1 and V2**; new appearance keys receive safe defaults without changing the user's existing game HUD. Preview CSS is deliberately a design layer, not a finished Unity UI style contract.

### Independent reset buttons

- **Reset Position / Scale:** resets only selected geometry (X/Y, scales, angle, opacity, layer). Appearance stays unchanged.
- **Reset Appearance:** resets only the selected component's visibility, border, background and style. Geometry stays unchanged.
- **Reset selected (both):** preserved for compatibility; resets both categories.
- **Reset all UI:** unchanged full reset.

Old snapshots remain intact; new JSON output is named `all-aboard-ui-layout-v010.json`. User's `presets/dor-v07-original-layout.json` and `presets/dor-loved-v08-mechanics.json` remain available.

### Unity handoff (when approved)

`RectTransform` for position/scale/rotation; `CanvasGroup` for opacity and visibility/input; `Image` and optional `Outline` or 9-sliced border sprite for reversible colors/corners; sibling order within one Canvas for draw order. Verify on tall, 16:9 and notched phones; CSS z-index does not automatically translate into Canvas order.

## Automated validation

- `tests/sail-hud-v010.cjs`: migrates legacy presets, retains stored settings and geometry, validates both vertical controls, manual tilt persistence and the shared vessel physics.
- `tests/smoke.cjs`: exercises the actual UI event wiring for mode swap, tilt retention, numeric feedback, and separate resets.
- Retain V0.9 and older smoke/Vessel/Anchor/World/Audio test suite in GitHub Actions.

## Acceptance checklist for Dor + Eilon

1. Open V0.10 on an actual phone and compare with V0.9; confirm **standing** sliders with thumb drag up and down.
2. In FX & Sail Trim choose default Raise/Lower + manual tilt. Set tilt +26.5°; release finger; it must stay at +26.5°.
3. Switch to alternate Sail Area + Auto Tilt. Set area to 36%; switch back; area stays 36%, manual trim stays +26.5°.
4. Lower then Raise; sail area should return to 36%, not force 100%.
5. UI Studio: move Sails to a new position. Disable border and background; restore them and check their previous values survive. Try glass/gradient alpha.
6. Reset Appearance: position stays fixed. Reset Position: appearance stays fixed.
7. Export/import preset; confirm selected sail mode, angle, appearance and geometry survive.
8. Test FPS, touch targets and SafeArea, especially the expanded vertical sail control beside anchor and wheel.

**Do not merge the branch or port it into Unity until the mobile interaction is approved.**

## Next separate take — not yet implemented

Anchor's optional spinning fishing reel, authoritative seeded wind, reactive stylized water shader, and separately tunable camera/ship hit vs firing feedback.
