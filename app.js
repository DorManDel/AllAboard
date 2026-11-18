/* All Aboard Mechanics Lab
 * Standalone arcade/game-feel simulation. Values are intentionally NOT physical SI units.
 * One shared state drives the phone preview and all tuning inspectors.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const all = (selector) => Array.from(document.querySelectorAll(selector));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const rad = (deg) => deg * Math.PI / 180;
  const wrapDegrees = (a) => (a % 360 + 360) % 360;
  const formatHeading = (a) => String(Math.round(wrapDegrees(a))).padStart(3, "0") + "°";
  const random = (a, b) => a + Math.random() * (b - a);

  const defaultSettings = Object.freeze({
    sail: 72, windStrength: 2.7, windDirection: 35, baseThrust: 0.1,
    steerSensitivity: 1, wheelReturn: 2.8, rudderResponse: 3, deadzone: 2,
    anchorGrip: 105, anchorLine: 24, vortexStrength: 1,
    currentStrength: 0.3, waveHeight: 0.7, waveDetail: 22, wakeStrength: 1
  });
  let settings = { ...defaultSettings };
  const state = {
    activeTab: "live", scenario: "open", paused: false, haptics: true, mode: "friendly",
    wheel: { angle: 0, dragging: false, pointerAngle: 0, rudder: 0 },
    ship: { x: 0, y: 0, vx: 0, vy: 0, heading: 0, hull: 100, score: 0, coins: 1250 },
    anchor: { down: false, point: { x: 0, y: 0 }, status: "Raised" },
    vortex: { active: false, x: 155, y: -190 },
    chest: { x: 85, y: -265, collected: false },
    enemy: { x: -135, y: -275, hp: 50, reload: 0 },
    waves: [], ripples: [], wakeTimer: 0, time: 0, hudTimer: 0, frameRate: 60,
    upgrades: { hull: "classic", sails: "cream", cannons: "balanced" },
    damage: { model: "grid", level: 1, weapon: "cannon", cells: [] },
    encounter: { kind: "friendly", index: 0, trust: 30, hp: 100, chosen: false, disabled: [], }
  };

  const titleMap = {
    live: ["Sailing playground", "Live Playground", "Tune the whole vessel. Every change propagates to the other experiments."],
    helm: ["Steer & feel", "Helm Lab", "One wheel, three turns either way, and an adjustable return-to-center feel."],
    sails: ["Sails & wind", "Sails & Wind", "Explore how wind direction and sail height influence propulsion."],
    anchor: ["Anchor manoeuvres", "Anchor Lab", "Hold position, drift, or drag your anchor near a current."],
    ocean: ["The living ocean", "Ocean Lab", "Procedural waves, wake trails and ripples powered by the same simulated water."],
    damage: ["Spatial damage", "Damage Lab", "Test three ways to turn ship damage into a tiny tactical puzzle."],
    encounter: ["Meet another vessel", "Encounter Lab", "Befriend or battle using short, meaningful interactions."],
    shipyard: ["Pimp my ship", "Shipyard", "Swap prototype ship parts and watch the shared preview respond."]
  };

  function message(text) {
    const hint = $("systemTip");
    hint.textContent = text;
  }
  function vibrate(pattern) {
    if (state.haptics && navigator.vibrate) navigator.vibrate(pattern);
  }
  function setTab(name) {
    if (!titleMap[name]) return;
    state.activeTab = name;
    all(".tab").forEach((tab) => {
      const yes = tab.dataset.tab === name;
      tab.classList.toggle("active", yes);
      tab.setAttribute("aria-selected", String(yes));
    });
    all(".panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
    $("stageTitle").textContent = titleMap[name][0];
    $("inspectorTitle").textContent = titleMap[name][1];
    $("inspectorSubtitle").textContent = titleMap[name][2];
    if (name === "damage") renderDamage();
    if (name === "encounter") renderEncounter();
  }
  all(".tab").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));

  const formatValue = (name, value) => {
    if (name === "sail" || name === "deadzone") return Math.round(value) + "%";
    if (name === "windDirection") return Math.round(value) + "°";
    if (name === "steerSensitivity") return Number(value).toFixed(2) + "×";
    if (name === "waveDetail" || name === "anchorGrip" || name === "anchorLine") return String(Math.round(value));
    return Number(value).toFixed(1);
  };
  function syncSettings() {
    all("[data-setting]").forEach((control) => { control.value = settings[control.dataset.setting]; });
    all("[data-value]").forEach((output) => { output.textContent = formatValue(output.dataset.value, settings[output.dataset.value]); });
    $("sailSlider").value = settings.sail;
    $("sailPercent").textContent = Math.round(settings.sail) + "%";
    $("dialWind").style.transform = "rotate(" + (settings.windDirection - 90) + "deg)";
  }
  function tune(name, value) {
    if (!(name in settings)) return;
    settings[name] = Number(value);
    syncSettings();
  }
  all("[data-setting]").forEach((control) => control.addEventListener("input", (e) => tune(e.target.dataset.setting, e.target.value)));
  $("sailSlider").addEventListener("input", (e) => tune("sail", e.target.value));

  function setScenario(which) {
    state.scenario = which;
    all("[data-scenario]").forEach((btn) => btn.classList.toggle("active", btn.dataset.scenario === which));
    if (which === "open") {
      settings.windStrength = 2.7; settings.windDirection = 35; settings.currentStrength = 0.3;
      settings.waveHeight = 0.7; state.vortex.active = false;
      message("Open sea: steer toward the wind arrow and watch your ship accelerate.");
    } else if (which === "wind") {
      settings.windStrength = 4.5; settings.windDirection = 145; settings.currentStrength = 0.6;
      settings.waveHeight = 1.2; state.vortex.active = false;
      message("Strong wind: reef the sails to reduce drift, then turn for a tailwind boost.");
    } else {
      settings.windStrength = 3.2; settings.windDirection = 65; settings.currentStrength = 0.8;
      settings.waveHeight = 1.1; state.vortex.active = true;
      state.vortex.x = state.ship.x + 105; state.vortex.y = state.ship.y - 145;
      message("Vortex escape: use the rudder, sail height and anchor to manage the current.");
    }
    syncSettings();
  }
  all("[data-scenario]").forEach((btn) => btn.addEventListener("click", () => setScenario(btn.dataset.scenario)));

  function toggleAnchor() {
    state.anchor.down = !state.anchor.down;
    if (state.anchor.down) {
      state.anchor.point = { x: state.ship.x, y: state.ship.y };
      state.anchor.status = "Holding";
      vibrate([15, 35, 24]);
      message("Anchor dropped. The ship can pivot, but may drag if currents get too strong.");
    } else {
      state.anchor.status = "Raised";
      vibrate(12);
      message("Anchor raised. You can build speed again.");
    }
    $("anchorButton").classList.toggle("pressed", state.anchor.down);
    $("anchorButton").setAttribute("aria-pressed", String(state.anchor.down));
    $("anchorInspector").textContent = state.anchor.down ? "⚓ Raise anchor" : "⚓ Drop anchor";
  }
  $("anchorButton").addEventListener("click", toggleAnchor);
  $("anchorInspector").addEventListener("click", toggleAnchor);

  function toggleMode() {
    state.mode = state.mode === "friendly" ? "aggressive" : "friendly";
    const btn = $("modeButton");
    btn.classList.toggle("friendly", state.mode === "friendly");
    btn.classList.toggle("aggressive", state.mode === "aggressive");
    btn.firstChild.textContent = state.mode === "friendly" ? "♡" : "✹";
    $("modeLabel").textContent = state.mode.toUpperCase();
    vibrate(15);
    message(state.mode === "friendly"
      ? "Friendly mode: approach other ships to negotiate. Try the Encounters tab."
      : "Aggressive mode: automatic broadsides fire when an enemy is close and lined up.");
  }
  $("modeButton").addEventListener("click", toggleMode);

  // Wheel pointer tracking: accumulate relative rotations, unwrapping across +/-180°.
  // The wheel is a UI control, not the actual rudder: response and dead zone are independent.
  const wheel = $("wheelControl");
  function pointerAngle(evt) {
    const rect = wheel.getBoundingClientRect();
    const dx = evt.clientX - (rect.left + rect.width / 2);
    const dy = evt.clientY - (rect.top + rect.height / 2);
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }
  wheel.addEventListener("pointerdown", (e) => {
    if (state.paused) return;
    state.wheel.dragging = true;
    state.wheel.pointerAngle = pointerAngle(e);
    wheel.setPointerCapture(e.pointerId);
    $("playHint").style.opacity = "0";
    vibrate(5);
    e.preventDefault();
  });
  wheel.addEventListener("pointermove", (e) => {
    if (!state.wheel.dragging) return;
    const next = pointerAngle(e);
    let delta = next - state.wheel.pointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    state.wheel.angle = clamp(state.wheel.angle + delta, -1080, 1080);
    state.wheel.pointerAngle = next;
    e.preventDefault();
  });
  function releaseWheel() { state.wheel.dragging = false; }
  wheel.addEventListener("pointerup", releaseWheel);
  wheel.addEventListener("pointercancel", releaseWheel);
  wheel.addEventListener("lostpointercapture", releaseWheel);
  wheel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      state.wheel.angle = clamp(state.wheel.angle + (e.key === "ArrowRight" ? 75 : -75), -1080, 1080);
      e.preventDefault();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (["INPUT", "BUTTON", "TEXTAREA"].includes(document.activeElement.tagName) || document.activeElement === wheel) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      state.wheel.angle = clamp(state.wheel.angle + (e.key === "ArrowRight" ? 75 : -75), -1080, 1080);
      e.preventDefault();
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      tune("sail", clamp(settings.sail + (e.key === "ArrowUp" ? 5 : -5), 0, 100));
      e.preventDefault();
    }
  });
  $("hapticToggle").addEventListener("change", (e) => state.haptics = e.target.checked);

  $("spawnVortex").addEventListener("click", () => {
    state.vortex.active = true;
    state.vortex.x = state.ship.x + 80; state.vortex.y = state.ship.y - 105;
    message("Vortex relocated ahead of your ship. Try anchoring before entering its pull.");
  });
  $("clearVortex").addEventListener("click", () => { state.vortex.active = false; message("Vortex cleared."); });
  $("rippleButton").addEventListener("click", () => {
    state.ripples.push({ x: state.ship.x + random(-60, 60), y: state.ship.y - random(40, 145), age: 0 });
    vibrate(8);
  });
  $("stormButton").addEventListener("click", () => {
    settings.waveHeight = 1.8; settings.waveDetail = 38; settings.windStrength = 4.8;
    settings.currentStrength = 1.5; settings.wakeStrength = 1.5;
    syncSettings(); message("Storm preset loaded. Watch waves, wake and ship drift.");
  });
  $("pauseButton").addEventListener("click", () => {
    state.paused = !state.paused;
    $("pauseButton").textContent = state.paused ? "▶ Resume simulation" : "⏸ Pause simulation";
  });
  $("collectChest").addEventListener("click", () => {
    state.ship.coins += 75; state.ship.score += 50;
    state.ripples.push({ x: state.chest.x, y: state.chest.y, age: 0 });
    state.chest.x = state.ship.x + random(-180, 180);
    state.chest.y = state.ship.y - random(180, 380);
    vibrate([20, 30, 30]); message("Treasure collected: +75 coins. Now try approaching another vessel!");
  });

  // Damage Lab: three genuinely different win conditions, sharing cell data.
  const typeForIndex = (i) => ({ 2: "sails", 5: "cannon", 9: "cannon", 12: "core", 17: "rudder", 22: "sails" })[i] || "hull";
  const iconForType = { hull: "", sails: "⛵", cannon: "✹", rudder: "☸", core: "◆" };
  function resetDamage() {
    const d = state.damage;
    d.cells = Array.from({ length: 25 }, (_, i) => {
      const type = typeForIndex(i);
      const hp = d.model === "modules" && type === "hull" ? 0 : d.model === "core" && type === "core" ? 3 + 2 * d.level : 2 + d.level + (type === "core" ? 1 : 0);
      return { type, hp, max: hp, fire: false };
    });
    $("damageStatus").textContent = "Select an attack, then tap a tile.";
    renderDamage();
  }
  function objectiveSatisfied() {
    const d = state.damage;
    if (d.model === "core") return d.cells[12].hp <= 0;
    if (d.model === "modules") return d.cells.filter(c => c.type !== "hull").every(c => c.hp === 0);
    return d.cells.every(c => c.hp === 0);
  }
  function remainingDamage() {
    const d = state.damage;
    return d.cells.filter(c => d.model !== "modules" || c.type !== "hull")
      .reduce((sum, c) => sum + c.hp, 0);
  }
  function maxDamage() {
    const d = state.damage;
    return d.cells.filter(c => d.model !== "modules" || c.type !== "hull")
      .reduce((sum, c) => sum + c.max, 0);
  }
  function renderDamage() {
    const d = state.damage;
    if (!d.cells.length) return;
    const names = { grid: "Destroy all durability cells", modules: "Disable every ship module", core: "Breach and destroy the core ◆" };
    $("damageObjective").textContent = names[d.model];
    $("enemyLevelValue").textContent = "Lv. " + d.level;
    $("damageHealth").textContent = remainingDamage() + " / " + maxDamage();
    $("damageHealthFill").style.width = (maxDamage() ? remainingDamage() / maxDamage() * 100 : 0) + "%";
    $("damageBoard").innerHTML = "";
    d.cells.forEach((cell, i) => {
      const b = document.createElement("button");
      b.className = "damage-cell targetable" + (cell.type === "core" ? " core" : "");
      b.dataset.hp = Math.min(cell.hp, 2);
      b.disabled = cell.max === 0;
      b.setAttribute("aria-label", "Cell " + (i + 1) + ": " + cell.type + ", " + cell.hp + " HP");
      const ic = document.createElement("span"); ic.className = "cell-icon";
      ic.textContent = cell.fire ? "🔥" : iconForType[cell.type];
      const num = document.createElement("span"); num.className = "cell-hp";
      num.textContent = cell.max === 0 ? "·" : cell.hp ? String(cell.hp) : "×";
      b.append(ic, num);
      b.addEventListener("click", () => hitDamage(i));
      $("damageBoard").append(b);
    });
  }
  function hitDamage(index) {
    if (objectiveSatisfied()) return;
    const d = state.damage;
    const target = d.cells[index];
    if (d.model === "core" && index === 12 && d.weapon !== "repair") {
      const adjacent = [7, 11, 13, 17].filter(i => d.cells[i].hp === 0);
      if (adjacent.length < 2) {
        $("damageStatus").textContent = "Core shielded! Break 2 neighboring tiles first.";
        vibrate(8); return;
      }
    }
    const indices = d.weapon === "broadside" ? [index - 1, index, index + 1].filter(i => i >= 0 && i < 25 && Math.floor(i / 5) === Math.floor(index / 5)) : [index];
    for (const i of indices) {
      const cell = d.cells[i];
      if (cell.max === 0) continue;
      if (d.weapon === "repair") { cell.hp = Math.min(cell.max, cell.hp + 2); cell.fire = false; }
      else if (d.weapon === "fire") { if (cell.hp > 0) cell.fire = true; }
      else cell.hp = Math.max(0, cell.hp - (d.weapon === "cannon" ? 2 : 1));
    }
    $("damageStatus").textContent = objectiveSatisfied() ? "Ship disabled! Try another damage model." : "Direct hit! " + remainingDamage() + " durability remaining.";
    vibrate(d.weapon === "repair" ? 7 : [12, 15, 7]);
    renderDamage();
  }
  function advanceFire() {
    const d = state.damage;
    const spread = [];
    d.cells.forEach((cell, i) => {
      if (!cell.fire || cell.hp <= 0) return;
      cell.hp -= 1;
      if (cell.hp <= 0) { cell.fire = false; return; }
      const adj = [i - 5, i + 5, i % 5 ? i - 1 : -1, i % 5 < 4 ? i + 1 : -1];
      const next = adj.find(j => j >= 0 && j < 25 && d.cells[j].hp > 0 && !d.cells[j].fire);
      if (next !== undefined) spread.push(next);
    });
    spread.forEach(i => d.cells[i].fire = true);
    $("damageStatus").textContent = objectiveSatisfied() ? "Fire disabled the ship!" : "Fire spreads to adjacent intact cells.";
    renderDamage();
  }
  all("[data-damage-model]").forEach(btn => btn.addEventListener("click", () => {
    state.damage.model = btn.dataset.damageModel;
    all("[data-damage-model]").forEach(b => b.classList.toggle("active", b === btn));
    resetDamage();
  }));
  all("[data-weapon]").forEach(btn => btn.addEventListener("click", () => {
    state.damage.weapon = btn.dataset.weapon;
    all("[data-weapon]").forEach(b => b.classList.toggle("active", b === btn));
  }));
  $("enemyLevel").addEventListener("input", (e) => { state.damage.level = Number(e.target.value); resetDamage(); });
  $("fireTick").addEventListener("click", advanceFire);
  $("damageReset").addEventListener("click", resetDamage);

  // Friendly offers have deterministic outcomes: decisions matter more than RNG.
  const captains = [
    { name: "The Wandering Gull", prompt: "Our crew has been sailing for days. We urgently need fresh provisions.", need: "food", choices: [["food", "🍎 Offer provisions"], ["gold", "🪙 Offer gold"], ["map", "🗺 Share a map"]] },
    { name: "The Lost Navigator", prompt: "We are caught in the currents and cannot find the safe route home.", need: "map", choices: [["food", "🍎 Offer provisions"], ["map", "🗺 Share safe currents"], ["gold", "🪙 Offer gold"]] },
    { name: "The Broken Mast", prompt: "A storm broke our mast. We cannot catch the wind until we repair it.", need: "tools", choices: [["tools", "🛠 Share repair tools"], ["gold", "🪙 Offer gold"], ["food", "🍎 Offer provisions"]] }
  ];
  function renderEncounter() {
    const e = state.encounter;
    const isFriend = e.kind === "friendly";
    const captain = captains[e.index % captains.length];
    $("encounterName").textContent = captain.name;
    $("encounterPrompt").textContent = isFriend ? captain.prompt : "Choose a ship component to disable. A good shot can remove a tactical advantage.";
    $("relationLabel").textContent = isFriend ? "TRUST" : "ENEMY HP";
    $("trustValue").textContent = (isFriend ? e.trust : e.hp) + "%";
    $("trustFill").style.width = clamp(isFriend ? e.trust : e.hp, 0, 100) + "%";
    $("trustFill").style.background = isFriend ? "#86e7b8" : "#fa8e7a";
    $("encounterChoices").innerHTML = "";
    const choices = isFriend ? captain.choices : [
      ["sails", "⛵ Aim at sails · slow escape"],
      ["cannon", "✹ Aim at cannons · stop return fire"],
      ["hull", "💥 Aim at hull · major damage"]
    ];
    for (const [kind, label] of choices) {
      const b = document.createElement("button");
      b.textContent = label;
      b.disabled = isFriend ? e.chosen : e.hp === 0 || e.disabled.includes(kind);
      b.addEventListener("click", () => resolveEncounter(kind));
      $("encounterChoices").append(b);
    }
  }
  function resolveEncounter(choice) {
    const e = state.encounter;
    if (e.kind === "friendly") {
      if (e.chosen) return;
      const correct = choice === captains[e.index % captains.length].need;
      e.trust = clamp(e.trust + (correct ? 40 : -20), 0, 100);
      e.chosen = true;
      $("encounterResult").textContent = correct ? "Great choice! +40 trust, +40 coins. An alliance may open future routes." : "That offer did not solve their problem. -20 trust. Try the next captain.";
      if (correct) { state.ship.coins += 40; state.ship.score += 20; vibrate([12, 30, 22]); }
      else vibrate(20);
    } else {
      if (e.hp === 0 || e.disabled.includes(choice)) return;
      e.disabled.push(choice);
      if (choice === "hull") e.hp = clamp(e.hp - 50, 0, 100);
      else e.hp = clamp(e.hp - 25, 0, 100);
      $("encounterResult").textContent = e.hp === 0 ? "Enemy disabled. +80 coins. You won by choosing targets!" :
        choice === "sails" ? "Enemy sails disabled. It can no longer escape at full speed." :
        choice === "cannon" ? "Enemy guns disabled. You can now attack more safely." : "Hull hit! Another tactical decision remains.";
      if (e.hp === 0) { state.ship.coins += 80; state.ship.score += 75; }
      vibrate([20, 20, 12]);
    }
    renderEncounter();
  }
  all("[data-encounter]").forEach(btn => btn.addEventListener("click", () => {
    state.encounter.kind = btn.dataset.encounter;
    state.encounter.hp = 100; state.encounter.trust = 30; state.encounter.chosen = false; state.encounter.disabled = [];
    all("[data-encounter]").forEach(b => b.classList.toggle("active", b === btn));
    $("encounterResult").textContent = "Make a deliberate choice.";
    renderEncounter();
  }));
  $("nextEncounter").addEventListener("click", () => {
    const e = state.encounter;
    e.index++; e.hp = 100; e.trust = 30; e.disabled = []; e.chosen = false;
    $("encounterResult").textContent = "A new vessel approaches.";
    renderEncounter();
  });

  // Ship customization: visible color and simple deterministic gameplay modifiers.
  function selectPart(kind, choice) {
    state.upgrades[kind] = choice;
    all("[data-part='" + kind + "']").forEach(b => b.classList.toggle("active", b.dataset.choice === choice));
    updateUpgradeStats();
  }
  function stars(n) { return "★".repeat(n) + "☆".repeat(5 - n); }
  function updateUpgradeStats() {
    const u = state.upgrades;
    $("upgradeSpeed").textContent = stars(u.hull === "light" ? 5 : u.hull === "armored" ? 2 : 3);
    $("upgradeHull").textContent = stars(u.hull === "armored" ? 5 : u.hull === "light" ? 2 : 3);
    $("upgradePower").textContent = stars(u.cannons === "heavy" ? 5 : u.cannons === "rapid" ? 4 : 3);
  }
  all("[data-part]").forEach(btn => btn.addEventListener("click", () => selectPart(btn.dataset.part, btn.dataset.choice)));
  $("resetUpgrades").addEventListener("click", () => {
    selectPart("hull", "classic"); selectPart("sails", "cream"); selectPart("cannons", "balanced");
  });

  // Sailing simulation: time-step based, tuned for feel. World coordinates are abstract pixels.
  const windAlignment = () => Math.cos(rad(state.ship.heading - settings.windDirection));
  const speedOfShip = () => Math.hypot(state.ship.vx, state.ship.vy);
  function vortexAcceleration() {
    if (!state.vortex.active) return { x: 0, y: 0 };
    const dx = state.vortex.x - state.ship.x, dy = state.vortex.y - state.ship.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    const proximity = Math.pow(Math.max(0, 1 - d / 270), 1.4) * settings.vortexStrength;
    const pull = 135 * proximity, spin = 78 * proximity;
    return { x: (dx / d) * pull + (-dy / d) * spin, y: (dy / d) * pull + (dx / d) * spin };
  }
  function simulate(dt) {
    state.time += dt;
    const s = state.ship;
    const wheel = state.wheel;
    if (!wheel.dragging) wheel.angle *= Math.exp(-settings.wheelReturn * dt);
    if (Math.abs(wheel.angle) < 0.2 && !wheel.dragging) wheel.angle = 0;
    const input = wheel.angle / 1080;
    const target = Math.abs(input) <= settings.deadzone / 100 ? 0 : Math.sign(input) * (1 - Math.exp(-5 * Math.abs(input))) / (1 - Math.exp(-5));
    wheel.rudder += (target - wheel.rudder) * (1 - Math.exp(-settings.rudderResponse * dt));
    let speed = speedOfShip();
    // Even when anchored, a limited rudder-induced turn is allowed for tactical play.
    const turning = (9 + 1.2 * Math.min(speed, 45)) * settings.steerSensitivity;
    s.heading = wrapDegrees(s.heading + wheel.rudder * turning * dt * (state.anchor.down ? 0.45 : 1));
    const fwdX = Math.sin(rad(s.heading)), fwdY = -Math.cos(rad(s.heading));
    const windX = Math.sin(rad(settings.windDirection)), windY = -Math.cos(rad(settings.windDirection));
    const align = windAlignment();
    const tailwind = Math.pow(clamp((align + 0.2) / 1.2, 0, 1), 1.5);
    const efficiency = state.upgrades.hull === "light" ? 1.2 : state.upgrades.hull === "armored" ? 0.8 : 1;
    const thrust = (settings.baseThrust * 14 + settings.windStrength * 20 * (settings.sail / 100) * tailwind) * efficiency;
    const sideways = settings.windStrength * (settings.sail / 100) * 2.3;
    const vortex = vortexAcceleration();
    let ax = fwdX * thrust + windX * sideways + windX * settings.currentStrength * 6 + vortex.x;
    let ay = fwdY * thrust + windY * sideways + windY * settings.currentStrength * 6 + vortex.y;
    if (state.anchor.down) {
      const dx = s.x - state.anchor.point.x, dy = s.y - state.anchor.point.y;
      const distance = Math.hypot(dx, dy);
      const force = Math.hypot(ax, ay) + distance * 1.5;
      const gripping = settings.anchorGrip;
      const dragging = force > gripping;
      state.anchor.status = dragging ? "Dragging" : "Holding";
      const ropeLength = settings.anchorLine;
      const ropeStretch = Math.max(0, distance - ropeLength);
      if (distance > 0.001 && ropeStretch > 0) {
        const ropePull = Math.min(270, ropeStretch * (dragging ? 2.6 : 12));
        ax -= dx / distance * ropePull;
        ay -= dy / distance * ropePull;
      }
      if (!dragging) { ax *= 0.1; ay *= 0.1; }
      else {
        // Seabed grip is imperfect: drag the anchor slowly with the vessel.
        state.anchor.point.x += s.vx * dt * 0.45;
        state.anchor.point.y += s.vy * dt * 0.45;
      }
    } else state.anchor.status = "Raised";
    const friction = state.anchor.down ? (state.anchor.status === "Holding" ? 9 : 2.3) : 1.35;
    s.vx = s.vx * Math.exp(-friction * dt) + ax * dt;
    s.vy = s.vy * Math.exp(-friction * dt) + ay * dt;
    const speedCap = 100 * efficiency;
    const vmag = speedOfShip();
    if (vmag > speedCap) { s.vx *= speedCap / vmag; s.vy *= speedCap / vmag; }
    s.x += s.vx * dt; s.y += s.vy * dt;

    // Environmental reactions persist briefly at the same world coordinate.
    state.wakeTimer += dt;
    if (state.wakeTimer > 0.12 && speedOfShip() > 5 && settings.wakeStrength > 0) {
      state.wakeTimer = 0;
      state.waves.push({ x: s.x - fwdX * 30, y: s.y - fwdY * 30, age: 0, heading: s.heading });
      if (state.waves.length > 55) state.waves.shift();
    }
    state.waves.forEach(w => w.age += dt);
    state.waves = state.waves.filter(w => w.age < 4);
    state.ripples.forEach(r => r.age += dt);
    state.ripples = state.ripples.filter(r => r.age < 3.2);
    state.enemy.reload = Math.max(0, state.enemy.reload - dt);
    if (state.mode === "aggressive" && state.enemy.hp > 0 && state.enemy.reload === 0) {
      const dx = state.enemy.x - s.x, dy = state.enemy.y - s.y;
      const dist = Math.hypot(dx, dy);
      const broadside = Math.abs(fwdY * dx - fwdX * dy) / Math.max(1, dist);
      if (dist < 165 && broadside > 0.58) {
        const cannonDamage = state.upgrades.cannons === "heavy" ? 24 : 16;
        state.enemy.hp = Math.max(0, state.enemy.hp - cannonDamage);
        state.enemy.reload = state.upgrades.cannons === "rapid" ? 1.0 : 1.7;
        state.ripples.push({ x: state.enemy.x, y: state.enemy.y, age: 0 });
        vibrate(10);
        if (state.enemy.hp === 0) {
          s.coins += 65; s.score += 100;
          message("Automatic broadside victory! A new opponent is approaching.");
          state.enemy.x = s.x + random(-240, 240);
          state.enemy.y = s.y - 320;
          state.enemy.hp = 50;
        }
      }
    }
  }

  // Ocean renderer: light 2D procedural waves + localized visuals. No heavy dependencies.
  const canvas = $("seaCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  let viewWidth = 340, viewHeight = 630, dpr = 1;
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    viewWidth = Math.max(1, rect.width); viewHeight = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(viewWidth * dpr), height = Math.round(viewHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }
  if ("ResizeObserver" in window) new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener("resize", resizeCanvas);

  const project = (x, y) => ({
    x: viewWidth * .5 + x - state.ship.x,
    y: viewHeight * .40 + y - state.ship.y
  });
  function drawRipples() {
    for (const r of state.ripples) {
      const p = project(r.x, r.y);
      ctx.strokeStyle = "rgba(181,245,247," + (0.63 * (1 - r.age / 3.2)) + ")";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 12 + r.age * 32 + i * 12, 5 + r.age * 14 + i * 6, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
  function drawWakes() {
    for (const w of state.waves) {
      const p = project(w.x, w.y);
      const alpha = (1 - w.age / 4) * .34 * settings.wakeStrength;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rad(w.heading));
      ctx.strokeStyle = "rgba(207,252,245," + alpha + ")"; ctx.lineWidth = 1.5 + w.age * .6;
      ctx.beginPath(); ctx.moveTo(-5 - w.age * 8, w.age * 10); ctx.quadraticCurveTo(0, -7 + w.age * 7, 5 + w.age * 8, w.age * 10); ctx.stroke();
      ctx.restore();
    }
  }
  function drawVortex() {
    if (!state.vortex.active) return;
    const p = project(state.vortex.x, state.vortex.y);
    const extent = 145 * Math.max(.45, settings.vortexStrength);
    if (p.x < -extent || p.x > viewWidth + extent || p.y < -extent || p.y > viewHeight + extent) return;
    ctx.save(); ctx.translate(p.x, p.y);
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 100);
    grad.addColorStop(0, "rgba(2,23,46,.85)"); grad.addColorStop(.65, "rgba(5,79,119,.3)"); grad.addColorStop(1, "rgba(1,35,72,0)");
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, 110, 0, Math.PI * 2); ctx.fill();
    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      for (let t = 0; t < 60; t++) {
        const a = arm * Math.PI / 2 + t * 0.14 + state.time * 0.6;
        const r = 2 + t * 1.35;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * .70;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(146,242,245,.37)"; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }
  function drawChest() {
    const p = project(state.chest.x, state.chest.y);
    if (p.x < -40 || p.y < -40 || p.x > viewWidth + 40 || p.y > viewHeight + 40) return;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = "#7f4b29"; ctx.strokeStyle = "#ffd97b"; ctx.lineWidth = 2;
    ctx.fillRect(-12, -5, 24, 16); ctx.strokeRect(-12, -5, 24, 16);
    ctx.fillStyle = "#f9c55f"; ctx.fillRect(-12, -9, 24, 6); ctx.fillRect(-2, -8, 4, 19);
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(3, -15); ctx.lineTo(10, -12); ctx.lineTo(3, -9); ctx.lineTo(0, -2); ctx.lineTo(-3, -9); ctx.lineTo(-10, -12); ctx.lineTo(-3, -15); ctx.closePath();
    ctx.fillStyle = "#ffefa6"; ctx.fill(); ctx.restore();
  }
  function sailColor() {
    return { cream: "#f6e9c6", scarlet: "#e28e89", azure: "#9de2ee" }[state.upgrades.sails];
  }
  function drawSmallEnemy() {
    const p = project(state.enemy.x, state.enemy.y);
    if (p.x < -35 || p.x > viewWidth + 35 || p.y < -35 || p.y > viewHeight + 35) return;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-.3);
    ctx.fillStyle = "#4d2732"; ctx.strokeStyle = "#e8b5ab"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -23); ctx.bezierCurveTo(15, -15, 17, 15, 0, 24); ctx.bezierCurveTo(-17, 15, -15, -15, 0, -23); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#e0c2b9"; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-10, 13); ctx.lineTo(10, 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffbeb3"; ctx.fillRect(-19, -32, 38 * state.enemy.hp / 50, 4);
    ctx.restore();
  }
  function drawShip() {
    const p = project(state.ship.x, state.ship.y);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rad(state.ship.heading));
    ctx.shadowColor = "#06213e"; ctx.shadowBlur = 17; ctx.shadowOffsetY = 8;
    const hullColor = state.upgrades.hull === "armored" ? "#6a7181" : state.upgrades.hull === "light" ? "#d09a52" : "#ac5d25";
    ctx.fillStyle = hullColor; ctx.strokeStyle = "#4d311b"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -49); ctx.bezierCurveTo(24, -34, 25, -6, 21, 24); ctx.quadraticCurveTo(18, 44, 0, 51); ctx.quadraticCurveTo(-18, 44, -21, 24); ctx.bezierCurveTo(-25, -6, -24, -34, 0, -49); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = "#d99a4b"; ctx.beginPath(); ctx.moveTo(0, -39); ctx.bezierCurveTo(16, -25, 15, 22, 0, 39); ctx.bezierCurveTo(-15, 22, -16, -25, 0, -39); ctx.fill();
    ctx.strokeStyle = "#69421f"; ctx.lineWidth = 2;
    for (let y = -20; y <= 30; y += 10) { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(12, y); ctx.stroke(); }
    ctx.fillStyle = "#322c2d";
    [-18, -1, 16].forEach(y => { ctx.fillRect(-26, y, 12, 5); ctx.fillRect(14, y, 12, 5); });
    const size = settings.sail / 100;
    if (size > .03) {
      ctx.globalAlpha = .86 + size * .14; ctx.fillStyle = sailColor(); ctx.strokeStyle = "#b89963"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-2, -31); ctx.quadraticCurveTo(-29 * size, -12, -16 * size, 12); ctx.lineTo(-2, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, -30); ctx.quadraticCurveTo(29 * size, -8, 17 * size, 13); ctx.lineTo(2, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#63391e"; ctx.fillRect(-3, -39, 6, 70);
    ctx.fillStyle = "#ffe7a5"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 2 * Math.PI); ctx.fill();
    if (state.anchor.down) { ctx.fillStyle = "#fff0c8"; ctx.font = "20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("⚓", 0, 66); }
    ctx.restore();
  }
  function drawWorld() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = viewWidth, h = viewHeight;
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#135b8b"); bg.addColorStop(.55, "#196b9d"); bg.addColorStop(1, "#0e487b");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const waveCount = Math.round(settings.waveDetail);
    const step = h / waveCount;
    const wx = Math.sin(rad(settings.windDirection)), wy = -Math.cos(rad(settings.windDirection));
    for (let i = -2; i < waveCount + 3; i++) {
      let y = i * step + ((state.time * (3 + settings.windStrength * 2) + state.ship.y * .22) % step);
      ctx.beginPath();
      const phase = state.time * .5 + state.ship.x * .008 + i * 1.7;
      for (let x = -8; x <= w + 12; x += 12) {
        const yy = y + Math.sin(x * .026 + phase) * (3 + settings.waveHeight * 7) + Math.sin(x * .055 + phase * 1.3) * settings.waveHeight * 3;
        if (x === -8) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = i % 3 === 0 ? "rgba(207,252,250," + (.12 + settings.waveHeight * .035) + ")" : "rgba(153,226,237,.10)";
      ctx.lineWidth = (i % 3 === 0 ? 2.4 : 1.2) + settings.waveHeight * .3; ctx.stroke();
    }
    // Dynamic flecks move along wind direction, reinforcing direction without UI clutter.
    for (let i = 0; i < 38; i++) {
      const x = (i * 73.71 + state.time * wx * 9 - state.ship.x * .23) % (w + 40);
      const y = (i * 48.73 + state.time * wy * 8 - state.ship.y * .23) % (h + 40);
      ctx.fillStyle = "rgba(196,248,242,.15)";
      ctx.fillRect((x + w + 40) % (w + 40), (y + h + 40) % (h + 40), 3, 1);
    }
    drawVortex();
    drawWakes();
    drawRipples();
    drawChest();
    drawSmallEnemy();
    drawShip();
  }

  function updateUI() {
    const ship = state.ship;
    const alignment = windAlignment();
    const speed = speedOfShip();
    $("helmWheel").style.transform = "rotate(" + state.wheel.angle.toFixed(2) + "deg)";
    wheel.setAttribute("aria-valuenow", String(Math.round(state.wheel.angle)));
    $("wheelReading").textContent = Math.round(state.wheel.angle) + "°";
    $("wheelReadingBar").style.width = ((state.wheel.angle + 1080) / 2160 * 100) + "%";
    $("rudderReading").textContent = Math.round(state.wheel.rudder * 100) + "%";
    $("headingValue").textContent = formatHeading(ship.heading);
    $("statHeading").textContent = formatHeading(ship.heading);
    $("statSpeed").textContent = speed.toFixed(1);
    $("statAlignment").textContent = (alignment >= 0 ? "+" : "") + alignment.toFixed(2);
    $("speedValue").textContent = speed.toFixed(1);
    $("rudderValue").textContent = Math.round(state.wheel.rudder * 100) + "%";
    $("statAnchor").textContent = state.anchor.status;
    $("statAnchorInfo").textContent = state.anchor.down ? "Line " + settings.anchorLine + " lab units" : "Free to sail";
    $("compassNeedle").style.transform = "rotate(" + -ship.heading + "deg)";
    $("windArrow").style.transform = "rotate(" + (settings.windDirection - 90) + "deg)";
    $("windValue").textContent = settings.windStrength.toFixed(1);
    $("alignmentReading").textContent = (alignment >= 0 ? "+" : "") + alignment.toFixed(2);
    $("alignmentDescription").textContent = alignment > .75 ? "Tailwind! Strong sail propulsion." : alignment < -.5 ? "Headwind. Very little forward sail thrust." : "Crosswind. Turn to get a better angle.";
    $("coinValue").textContent = ship.coins.toLocaleString("en-US");
    $("scoreValue").textContent = String(ship.score).padStart(3, "0");
    $("hpFill").style.width = ship.hull + "%";
    const distToChest = Math.hypot(ship.x - state.chest.x, ship.y - state.chest.y);
    $("chestAction").style.display = distToChest < 64 ? "block" : "none";
    $("fpsValue").textContent = Math.round(state.frameRate) + " FPS";
  }
  let lastFrame = 0, lastHud = 0;
  function frame(timestamp) {
    if (!lastFrame) lastFrame = timestamp;
    const dt = Math.min(.05, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    if (dt > 0) state.frameRate = state.frameRate * .93 + (1 / dt) * .07;
    if (!state.paused && !document.hidden) simulate(dt);
    drawWorld();
    if (timestamp - lastHud > 70) { updateUI(); lastHud = timestamp; }
    requestAnimationFrame(frame);
  }
  function resetEverything() {
    settings = { ...defaultSettings };
    state.ship = { x: 0, y: 0, vx: 0, vy: 0, heading: 0, hull: 100, score: 0, coins: 1250 };
    state.wheel = { angle: 0, dragging: false, pointerAngle: 0, rudder: 0 };
    state.anchor = { down: false, point: { x: 0, y: 0 }, status: "Raised" };
    state.chest = { x: 85, y: -265, collected: false };
    state.enemy = { x: -135, y: -275, hp: 50, reload: 0 };
    state.waves = []; state.ripples = [];
    state.paused = false; $("pauseButton").textContent = "⏸ Pause simulation";
    $("anchorButton").classList.remove("pressed"); $("anchorButton").setAttribute("aria-pressed", "false");
    $("anchorInspector").textContent = "⚓ Drop anchor";
    state.mode = "friendly";
    $("modeButton").className = "game-btn mode-btn friendly";
    $("modeButton").firstChild.textContent = "♡"; $("modeLabel").textContent = "FRIENDLY";
    setScenario("open"); resetDamage(); syncSettings(); updateUI();
    message("Reset! All experiments are ready to be tested again.");
  }
  $("resetAll").addEventListener("click", resetEverything);
  $("savePreset").addEventListener("click", () => {
    const exportData = {
      title: "All Aboard Mechanics Lab tuning", version: 1,
      settings, upgrades: state.upgrades,
      note: "Concept parameters, not physically measured units"
    };
    const file = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "all-aboard-mechanics-preset.json";
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 300);
  });

  updateUpgradeStats();
  resetDamage();
  renderEncounter();
  syncSettings();
  resizeCanvas();
  requestAnimationFrame(frame);
})();
