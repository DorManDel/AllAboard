# All Aboard Mechanics Lab V0.7 — Feel, Audio & Unity Readiness

Status: phone/browser experiment. Review with Dor and Eilon before merging or copying mechanics into their course Unity project.

## Purpose

Keep the game **hyper-casual to operate, smart to master**. The interactive site is a mechanics test bench that may later grow into a small standalone HTML game. The actual target remains Unity Milestone 4: do not silently add the research features to the coursework scope.

## Implementation take / review (2026-11-20)

### TAKE 01 · Cannon recoil and shake
- **Player behavior:** shots hit hard visually without needing a Fire button.
- **Core algorithm:** an impulse accumulator with exponential decay, sampled by the renderer. Wave pose and hit/shot shake are combined visually, not added to physics position.
- **Code:** game-feel.js -> FeelEngine; app.js -> fireFeedback() when a real automatic broadside resolves, plus explicit lab-only Fire Test button.
- **Unity handoff:** BroadsideController emits OnShotFired; CannonFeedback handles sprite recoil, AudioDirector handles SFX, CameraShake handles limited feedback. Do not trigger fake recoil every FixedUpdate.
- **Tests:** recoil decays; reduced-motion disables shakes; shock event is recorded only for an actual shot or explicit test.

### TAKE 02 · Wave-driven ship posture and wind FX
- **Player behavior:** hull rocks naturally with larger waves, rather than jittering randomly.
- **Core algorithm:** use the existing OceanField at bow/stern/port/starboard; calculate pitch and roll from wave-height differences. Clamp angles; map to ship sprite/mesh presentation. Procedural wind streaks align with wind TO-heading.
- **Code:** game-feel.js wavePose(); app.js drawShip() and drawWorld().
- **Unity handoff:** OceanField.SampleHeight(), ShipPosePresenter, WindFXPresenter; presentation in LateUpdate after FixedUpdate state.
- **Tests:** finite/clamped tilt, heading dependence, reduced-motion supports accessibility.
- **Limit:** screen-space 2D roll is a visual effect, not a measured buoyancy or fluid solver.

### TAKE 03 · Sail yard tilt / trim
- **Player behavior:** sails remain simple Up/Down for beginners; optional trim creates a mild reward for wind-aware advanced sailing.
- **Core algorithm:** desired sail angle = clamp(relativeWindToHeading * 0.38, -42, +42) degrees. Automatic trim is the default. Manual ±45 degree trim gives at most ~14% penalty compared to the ideal; cannot completely stall the ship. Render the sail SVG around its yard hinge without replacing original ship art.
- **Code:** vessel.js calculates desired trim, actual trim and multiplier; app.js makes original SVG tilt in presentation.
- **Unity handoff:** SailTrimController for state + SailRigView for geometry. No requirement for a second permanent thumb control.
- **Tests:** auto trim equals ideal; changing manual trim influences propulsion; furling still visible.

### TAKE 04 · Original audio / moods
- **Player behavior:** short, pleasant original pirate music and readable sounds that never drown out navigation.
- **Code:** audio-lab.js provides 7 new original short synthesizer sketches and 15 synthesized SFX events. v07-lab-ui.js provides audition, mute, volume, event log and generator-ready music prompts.
- **Original moods:** Sunny Sailing, Treasure Hunt, Wind & Storm, Naval Battle, Friendly Fleet, The Kraken, Stage Cleared.
- **Event IDs:** ui, coins, friend, follower, shot, splash, anchor, wind, storm, damage, repair, kraken, escape, stage, stay.
- **Unity handoff:** AudioDirector subscribes to semantic events; AudioMixer has Music, SFX and UI busses; MusicMood crossfades between **properly licensed** final loop assets. Currently the browser sketches are **not finished audio recordings**.
- **Licensing:** keep a ledger per asset: source tool, prompt, generation date, license/plan/version, local WAV master, loop points, export, attribution if required. Never copy/recreate existing game music.
- **Candidate external tools:** Stable Audio for instrumental loops/SFX, Suno for memorable melodic song ideas. Check current commercial/download rights at generation time. Udio downloads had been disabled at our review date.
- **Tests:** muted by default until user gesture, separate music volume, stop on page exit, no duplicate audio instantiation, finite voice counts and test on phone speakers.

### TAKE 05 · Unity architecture/QA
- **Player behavior:** none. Developer acceptance tooling.
- **Code:** unity-readiness.js generates per-mechanic technical contract and Codex/Unity implementation brief, based on Roadmap catalog selection. Unity Checks tab scans a locally chosen text-serialized .prefab/.unity/.asset for a few obvious signs (fileID:0 script references, zero scale, disabled components) and shows exact caveats.
- **Real Unity tooling draft:** unity-tools/Editor/AllAboardPrefabAudit.cs is a **proposed Editor script**. After copying it into the actual Unity Assets/Editor folder, Tools > All Aboard > Audit All Prefabs uses Unity AssetDatabase and PrefabUtility to load every prefab, inspect null Component references and report problems. It does not alter the prefabs.
- **Limits:** browser YAML scanning cannot validate missing GUID files, scene build configuration, ScriptableObject serialization, Android APIs or PlayMode. Real Unity Test Framework EditMode/PlayMode runs and Android device profiling are required.
- **Checks to add to the actual Unity project when approved:** EditMode physics and economy tests; PlayMode input, scene navigation, HUD SafeArea, anchoring, cannon reload and damage; Build Profiles Android Min API/IL2CPP ARM64; profiler p50/p95 time and allocations.
- **Handoff discipline:** every mechanic review includes concise logic, class boundaries, acceptance criteria, test plan and copyable Codex prompt. All implementation changes must be logged in CHANGELOG.md.

## Reference inspiration — extract only useful design principles

- [Puzzle Pirates](https://store.steampowered.com/app/99910/Puzzle_Pirates/): sailing/piracy with cooperative puzzles and short skill-based social activity. Adapt the idea of a short optional boarding/rescue puzzle rather than cloning its minigames.
- [Republic of Pirates](https://store.steampowered.com/app/2103470/Republic_of_Pirates/): readable pirate economy and ship fleet progression; keep our economy much smaller.
- [It's About Pirates](https://store.steampowered.com/app/4468540/Its_About_Pirates/): enemy-wave pressure, loot collection and ship upgrades support Eilon's Stay/Leave loop.
- [Pirate Ships](https://store.steampowered.com/app/4011110/Pirate_Ships/): ship types, equipment differences and progression. Use this as inspiration for meaningful component upgrades, not feature count.

## Suggested next mechanic probes (not yet playable)

1. **Wind shadow:** behind islands, lower wind and give a short compass cue. Encourages better sailing routes.
2. **Enemy tell:** show warning arc before an enemy cannon volley. Rewards good steering, not random damage.
3. **Storm front:** a visible region of rough waves and stronger wind; trade risk for speed.
4. **Optional boarding puzzle:** tiny 5–10 second skill interaction for rescue or boarding, with skip/autoresolve.
5. **Wake surfing:** follow the wake behind a friendly ship for a small speed bonus, especially when escorting.
6. **Sound occlusion:** lower/muffle far-away cannon and Kraken sounds and filter based on distance.

## Pre-Unity approval gate

1. Test in the browser and note settings on the same Android phone.
2. Capture screenshot/recording and measure performance, not guesses.
3. Mark Keep / Refine / Test / Later / Reject in Mechanics Review.
4. Add selected mechanics to Roadmap Kanban with owner and acceptance criteria.
5. Copy the architecture handoff and choose simple Unity scripts.
6. Implement and test in Unity; update CHANGELOG.md and compare behaviors.
7. Avoid merging the lab branch into main before Dor/Eilon sign-off.

### CI

Run node tests/game-feel-audio.cjs, node tests/smoke.cjs, and the existing V0.6 checks. GitHub Actions validates the JS contracts; it does not run Unity or verify real-device audio/haptics.
