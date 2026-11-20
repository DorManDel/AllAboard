# All Aboard — Game Vision & Roadmap V0.5

**Authors to review with:** Dor and Eilon. **Status:** Design hypotheses + browser experiments. Nothing in this file is a promise that the feature is already in the Unity game.

## One-line vision

**Easy to control, hard to master:** a one-thumb, short-session sailing game where smart positioning, wind, repair, alliances and the *choice to stay or leave* create depth without extra buttons.

Our two foundations:
- **Hands:** wheel, sail amount, anchor, friendly/aggressive toggle, automatic cannons. We should rarely add permanent real-time controls.
- **World:** procedural water and seeded islands, ship encounters, optional risk rounds, loot, social relationships and occasional surprises.

A good mechanic must create a meaningful decision, visibly change the world, and remain comprehensible to a first-time player.

## Eilon's fused concept — Short stages + endless risk

A player enters **Stage N** with a simple objective: reach a passage, collect treasure, protect a merchant or disable pirate sails.

After completing the objective:
1. The objective is marked completed and the base stage reward is **immediately banked**.
2. The player may **Leave** safely or **Stay** to attempt another, more difficult encounter/wave within the same stage.
3. Each Stay wave raises pressure and potential bonus. Extra loot is **unbanked** until the next safe exit.
4. After each optional round, the player returns to the Stay/Leave decision.
5. If defeated during a risk round, the player loses only unbanked extra rewards; the cleared objective and banked rewards remain.
6. Leaving saves a checkpoint at **the same stage**, including cleared objective status. On return the player can resume that stage's choice, or start the next stage deliberately.

The current **Stage Loop Lab** implements these rules as a deterministic, manual encounter-outcome prototype. It does **not** yet use actual enemies, Unity save data, real-time level objectives or production reward balancing.

### Difficulty should escalate fairly

Use three knobs rather than an unexplained endless damage multiplier:
- **Pressure:** more enemies, harder positioning, hazards or shorter rescue window.
- **Reward:** improved loot *quality and choice*, not simply larger coin values.
- **Readability:** show the current risk tier and prospective reward before Stay.

**Hypotheses to test:** short encounters ~30–90 seconds, several Stay rounds before the player feels genuine danger, and no unavoidable failure. These are targets for playtesting, **not measured or final values**.

## Ten-second first-run tutorial

Use nonblocking, contextual prompts during the first stage rather than a separate cutscene:

| Seconds | Show | Player learns |
|---|---|---|
| 0–3 | Wheel highlighted | Drag/release to steer |
| 3–6 | Sail control highlighted | Sails up/down change speed |
| 6–8 | Passing enemy broadside | Cannons shoot automatically when aligned |
| 8–10 | Stay / Leave prompt | Bank winnings or take optional risk |

Anchor, damage, Kraken, ally recruitment and special ammo should appear as **contextual hints on first use**. Do not squeeze every feature into the ten seconds. Allow Skip and Replay.

## Popularity / Reputation & Follower Ships — AFTER CORE

Goal: friendly interactions must create a meaningful alternative to combat.

- Each **unique** befriended ship earns reputation **once** (not an infinite button-tap farm).
- Assist/escort/rescue can add smaller reputation rewards or trust.
- Shooting friends can reduce trust and damage alliances.
- Reputation tiers unlock social perks and follower ship capacity, but do not grant an instant combat win.
- Initially limit the active follower to **one** ship. Add more only after real-device visibility and AI costs are understood.
- Follower behaviors: **Follow → Defend → Retreat/Repair**. Stay clear of the player's hull, provide situational help under attack, and be vulnerable to damage.
- Friendly and Aggressive remain mutually visible, with contextual interaction instead of a large new control panel.

A later experiment can create short intercept missions: anticipate another ship's movement, catch up, offer help, escort it or invite it to sail together. This builds on the core movement/wind model.

**Data candidates:** \`ShipRelationship { shipId, trust, isFriend, reputationAwarded }\`, \`ReputationLedger\`, \`FollowerSlot\`, \`AllyShipState\`. Persist them by stable world identity to prevent duplication.

## Cannons — Physical feeling without full artillery simulation

First ship the **default cannonball** with readable travel time and impact point. Avoid magical/homing hits.

1. Read every enabled cannon port's local position and side direction.
2. Transform muzzle position/direction into the world using the ship pose.
3. Spawn a projectile with lateral muzzle velocity and optional contribution from the ship's velocity.
4. Advance its horizontal position using a small deterministic step. A visual arc can use \`height(u) = 4 * maxHeight * u * (1-u)\` for normalized flight progress \`u\`.
5. Check collisions with hull modules, islands or water along the path (swept collision for fast shots).
6. Emit impact ripple/splash and target-specific damage. Broadside skill comes from timing and alignment, not an extra firing button.

**Prototype ammo options (AFTER the default trajectory works):**

| Ammunition | Behavior | Tactical reason |
|---|---|---|
| Cannonball | Reliable direct damage, small splash footprint | General-purpose weapon |
| Chain shot | Lower hull damage, higher mast/sail damage | Slow/disable enemy movement |
| Barrel | Floats and explodes after a visibly shown delay, area damage | Area denial and route control |
| Chicken | Comic, low-damage projectile causing a short, obvious distraction | Humor and strategic interruption |

Players choose ammunition in **loadout** first, not from four permanent on-screen buttons. Friendly-fire rules, limited uses and cooldowns can be tested later.

## Kraken — ASCean-inspired octopus arms (AFTER CORE)

Reuse the ASCean octopus design concept, but don't claim the realistic scientific lab is already a game mechanic:

- A central **KrakenBrain** selects overall objectives and attack phases.
- An **ArmCoordinator** schedules eight arms and keeps them from all attacking simultaneously.
- One reusable **ArmController** algorithm handles each arm's own \`ArmState\`, local sensors, joint positions and contact reactions. We do **not** create eight unrelated manager classes.
- First prototype: 6–12 joints per arm, simplified Verlet integration / position-based dynamics constraints. No need for a real hydrostatic muscle simulation.
- Telegraph: bubbles and moving shadow → arm rises → target sweep/grab → release/retreat. Give the player a clear escape path.
- The Kraken can grab, slow, pull or disable NPC ships; it should not be an unavoidable random death.

The rare procedural Kraken from V0.4 remains a **placeholder** until this mechanism is approved. Limit arms simulated/visible at once for mobile performance.

## Core before expansion — proposed roadmap

| Phase | Target | Proof needed |
|---|---|---|
| 1. Sailing feel | Vessel, wind, anchor, reactive ocean | Phone test: turns, lateral slip, wakes and anchor feel |
| 2. Playable stage | Objective, Stay/Leave, same-stage checkpoint, 10s tutorial | A new player can finish a short stage and make the risk decision |
| 3. Essential combat | Auto-cannon trajectories, spatial hit + repair | Shots and damage can be understood without extra controls |
| 4. World & rewards | Seeded islands, treasures, basic NPC types | Repeatable seeded map, bounded memory, persistent pickups |
| 5. Review & Unity | Approve mechanics, export specs, C# models and CHANGELOG | Dor/Eilon choose Keep/Refine/Test/Later/Reject |
| 6. Optional expansion | Reputation, followers, intercept/rescue/escort, ammo variants, Kraken arms | One idea at a time, with a phone prototype + acceptance test |

**Important:** The active course Unity Milestone 4 should not silently expand to include all these ideas. This is a parallel, independent mechanics lab; approved rules can later be ported as simple C# components.

## Website planning flow

The new **Roadmap & Kanban** tab provides:

1. Search/filter mechanic catalog by phase and category.
2. Select a mechanic to view player decision, MVP behavior, acceptance criteria, dependencies and candidate Unity components.
3. Press **Add to Kanban** (Backlog). Move cards left/right: Backlog → Ready → In Progress → Testing → Done.
4. Attach owner/notes, export the board as JSON to share across devices, or export a Jira-ready Markdown backlog.
5. Use Mechanics Review to decide if a mechanic is Keep, Refine, Test, Later or Reject. **Done on the local task board does not mean automatically approved for Unity.**

The real connected Jira project is **All Aboard! (SCRUM)**, board ID 1. The static GitHub Pages site stores its Kanban locally and **does not automatically create Jira issues**; doing that securely would need an authorized backend/OAuth connector. The exported Jira issue text is intended for a human-reviewed transfer into the SCRUM board.

## Tracking & acceptance checklist

- [x] V0.5 catalog covering fused stages, checkpoint, 10s tutorial, reputation, followers, trajectories, ammo and Kraken arms
- [x] Dedicated interactive Stage Loop Lab with manual risk/loot/checkpoint demonstration
- [x] Searchable expanded mechanic specs and local Kanban with move/notes/export/import
- [x] Jira-ready ticket text and board JSON export
- [x] Automated tests for mechanics/board contracts and loop state machine
- [ ] Actual Android feel/visual test (Dor/Eilon)
- [ ] Integrated stage objectives with sailing, enemy AI and world events
- [ ] Real projectile trajectories / ammo physics
- [ ] Real follower ship behavior and reputation system
- [ ] Actual multi-arm Kraken
- [ ] Real Jira board sync / issue creation from website
- [ ] Approved Unity C# implementation and milestone review
