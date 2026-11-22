# All Aboard Mechanics Lab — V0.9 Review

**State:** isolated browser prototype. Unity project and previous V0.8 preview remain untouched.

## Rollback snapshot (before modifications)

- Exact V0.8 water implementation: water/v0.8-ocean-snapshot.js
- User's favorite full mechanics+HUD tuning: presets/dor-loved-v08-mechanics.json
- Existing V0.8 branch and /preview/v0.8/ remain independent
- Favorite values: waveHeight=1.3, waveDetail=36, wavePush=1.7, wakeStrength=1.4, anchorLine=140, sail=100, auto sail trim
- In the site, header **★ Favorite** reapplies this tuning, upgrades and V1 HUD coordinates. Export preset now also includes a static PNG copy of the flag when possible.

## Take 01 — Phone/desktop navigation

**Problem:** 17 ungrouped tab pills force horizontal scrolling, hide important experiments, and make mobile navigation tiring.

**Algorithm:** a pure named category table maps 17 existing tab IDs into five families:
- Sail: Live, Helm, Sails, Anchor, Ocean, FX
- Adventure: Encounters, Damage, Stage Loop
- World: World, Shipyard
- Create: UI Studio, Music/SFX, Ideas
- Build: Mechanics Review, Kanban, Unity Checks

Navigation shows only the active group's relevant tabs, with a quick select for direct jumps. No horizontal tab overflow. Existing tab and panel router stays the single source of truth.

**Files:** nav-ui.js; index.html; style.css; app.js route sync.
**Unity mapping:** development-only grouped inspector menu, not actual in-game HUD navigation.
**Tests:** every one of the 17 tabs belongs to exactly one category; phone test for label wrapping, finger taps and keyboard focus.

## Take 02 — Flag responds to wind

**Algorithm:** flag-motion.js calculates a deterministic downwind direction, cloth reach and time-varying flutter using the relative angle between ship heading and wind-to direction and wind strength. The flag painter breaks its existing 48×32 canvas/poster into seven narrow textured slices, attached at the mast. The ship renderer supplies the real game wind and elapsed time. GIF stays an HTML image; only its transform approximates wind flutter without destroying GIF playback.

**Files:** flag-motion.js, flag-workshop.js, app.js.
**Unity mapping:** ShipFlagPresenter, FlagSprite/texture and a local, wind-driven vertex-strip animation. The flag texture should be saved as a game asset; 2D strip deformation is visual, not a cloth/physics simulation.
**Tests:** stronger wind => greater reach; relative wind flips the hanging direction; time changes flutter; root at mast fixed.
**Limit:** a custom animated GIF is exported as a **still PNG poster**, not full animation bytes. Keep the source GIF separately.

## Take 03 — In-play tutorial (10 seconds)

**Player:** no separate compulsory cutscene. A small bubble is on the phone preview for first run, while real controls remain usable. Five ~2-second steps highlight: wheel (with two opposing animated arrows), sails/trim, anchor, Friendly/Aggressive, compass/wind. Skip and replay via ?; seen flag stored in session storage. Reduced-motion CSS removes animations.

**Files:** quick-tutorial.js, index.html, style.css.
**Unity mapping:** TutorialCoach selects current RectTransform outline/glow, bubble text and optional arrows; skip/replay and first-run persistence.
**Tests:** five focus targets, no blocking touch overlay, 10s completion and replay.

## Take 04 — Anchor + sail controls simplified

**Anchor:** return to one compact Drop/Raise button. Only when the anchor is deployed is chain distance, stretch/tension bar and state displayed directly below. The in-phone numeric chain editor is hidden; full rope tuning stays in Anchor Lab. Physics reeling and the real maximum-length constraint remain unchanged.

**Sails:** add two design variants in FX & Sail Trim:
1. Existing sail-height slider with optional compact AUTO button.
2. **Up/Down toggle + inline trim mini control**, sharing the same sailAutoTrim and sailTrim settings and the same wind-based physics. This remains a toggleable experiment, not the declared final HUD design.

**Unity mapping:** single AnchorControlView + small conditional AnchorTensionReadout; SailControlView with one SailInputMode enum + SailTrimController.
**Test:** anchor status remains hidden while raised, no accidental chain edit in gameplay; either sail view changes same underlying state.

## Take 05 — HUD appearance editor

**Player:** select by named component and local SVG art thumbnail, highlight its actual control in preview. In addition to V0.8 position/scale/rotation/opacity/layer, set explicit Show/Hide, border width/color, and optional background color. Heading degree pill is now separately selectable and hideable (compass/wind is independent). Original minimal controls and their state remain implemented even when visually hidden.

**Implementation:** LayoutStudio V2 layout records plus optional appearance records by stable element ID. Migration from V1 and V2 produces safe defaults; browser local storage and JSON export include appearance, so reset always restores hidden controls.
**Unity mapping:** RectTransform, CanvasGroup or active state, Image.color, Outline/border sprite, and known/safe sibling order. Browser z-index cannot be copied 1:1 between separate Unity Canvases.
**Tests:** hide degrees, style border/bg, favorite V1 import retains coordinates.

## Take 06 — Procedural ocean response, with rollback

**Algorithm:** V0.8 source frozen. New OceanField.rippleImpulseAt() adds small damped local impulse rings to the *existing sampled wave field* after ship wake, projectile splash, anchor event and other ripple births. It samples only the last eight pulses, caps amplitude, and skips land and midpoint paths across land. Low-resolution canvas update remains ~20 fps; ship pose samples the same field. Ripple Strength 0 disables the addition to compare against the preserved baseline.

**Unity mapping:** OceanField.SampleHeight() = base field + local WaterImpulseBuffer (small bounded pool). Publish wakes/splashes/anchor as event positions; mask by island ocean surface.
**Tests:** sample on land = zero impulse, ripple affects nearby water, strength zero disables it, no heavy fluid solver.
**Limit:** not fluid dynamics, coastal breaking-wave model or exact water mass conservation. Profile real Android p95 CPU/GPU time before considering 128×128 grid.

## Take 07 — Interactive fixing experiment

**Player:** Damage Lab includes a quick 3-rivet patch action. Choose sails, cannons or rudder, then tap center → left → right. Fast completion (≤4 seconds) restores 35%, slower completion 25%. Material cost 20 coins. Wrong taps prompt the correct rivet without an unfair restart. The action updates the actual ship's module state and uses repair SFX if enabled.

**Files:** repair-mini.js, index.html, style.css.
**Unity mapping:** RepairSequence pure state, RepairMiniGameView; reward applied through existing ship module/economy service when the action completes.
**Test:** order, cost, speed bonus, inability to farm after completion.
**Design alternatives still to compare:** swipe/roll rope-patching gesture, tap-to-fix, optional auto repair with smaller bonus. No permanent HUD repair button in the core game.

## Acceptance and next review

1. Compare V0.8 and V0.9 on the same phone. Confirm grouped navigation is discoverable and not a scroll trap.
2. Watch mast flag in headwind, crosswind and tailwind while stationary and turning; compare frame time.
3. Replay in-phone tutorial and steer/tap while the overlay is active; ensure Skip and ? work.
4. In UI Studio, hide only the degree pill, edit an anchor border/background, export/import and reset.
5. Confirm one compact anchor control and test both sail modes at 0/100% and with wind.
6. Run water slider at 0, 0.8 and 2, approach island shore and throw anchor; verify water responds without painting over beach.
7. Test repair: damage our sails, complete three rivets, confirm restored propulsion and coins -20.
8. Confirm old V0.8 JSON preset loads and previous versions are independently reachable.
9. Mark Keep / Refine / Later / Reject; only then create a minimal Unity mechanic implementation prompt.

### Unity / Codex implementation brief

Inspect the current Unity All Aboard project before writing code. Do not change the course milestone core or unrelated prefabs. Implement the approved V0.9 experiments one by one as small reusable C# mechanics, with existing Unity wheel/sails/anchor controls, safe-area-aware UI and named prefabs. Keep one shared source of truth for sail/anchor state. Put wave impulses in a pooled bounded field and flag deformation in visual-only presentation. Add Unity EditMode tests for state math and PlayMode tests for input/scene navigation, anchors and repair, and validate mobile performance. Keep scripts and variable names simple and record all changed files/decisions in CHANGELOG.md. No new package or full fluid solver without team approval.
