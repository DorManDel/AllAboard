/* Minimal dependency-free smoke tests for the standalone Mechanics Lab.
 * Run with: node tests/smoke.cjs
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const oceanJs = fs.readFileSync(path.join(root, "ocean.js"), "utf8");
const vesselJs = fs.readFileSync(path.join(root,"vessel.js"),"utf8");
const worldJs = fs.readFileSync(path.join(root,"world.js"),"utf8");
const flagJs = fs.readFileSync(path.join(root,"flag-workshop.js"),"utf8");
const reviewJs = fs.readFileSync(path.join(root,"mechanics-review.js"),"utf8");

assert.doesNotThrow(() => new vm.Script(js), "JavaScript must parse");
assert.doesNotThrow(() => new vm.Script(oceanJs), "Ocean engine must parse");
assert.doesNotThrow(() => new vm.Script(vesselJs), "Vessel physics must parse");
for(const [source,name] of [[worldJs,"World"],[flagJs,"Flag"],[reviewJs,"Review"]])
  assert.doesNotThrow(()=>new vm.Script(source),name+" engine must parse");
assert.match(html, /<script src="\.\/ocean\.js" defer>/);
assert.match(html, /<script src="\.\/vessel\.js" defer>/);
for(const name of ["world.js","flag-workshop.js","mechanics-review.js"])
  assert(html.includes('<script src="./'+name+'" defer></script>'));
for (const part of ["hull","sail_front","sail_rear","anchor","cannon_left_front","cannon_left_rear","cannon_right_front","cannon_right_rear"]) assert(fs.existsSync(path.join(root,"assets","ship-parts",part+".svg")), "Missing ship part "+part);
assert.match(html, /<meta name="viewport"/);
assert.match(html, /<canvas id="seaCanvas"/);
assert.match(css, /prefers-reduced-motion/);
assert.doesNotMatch(html, /<script[^>]*src="https?:/i, "lab must have no external runtime dependency");

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, "HTML IDs must be unique");
const referencedIds = [...js.matchAll(/\$\("([^"]+)"\)/g)].map(m => m[1]);
for (const id of referencedIds) assert(ids.includes(id), "Missing DOM ID: " + id);

const tabs = [...html.matchAll(/\bdata-tab="([^"]+)"/g)].map(m => m[1]);
const panels = [...html.matchAll(/\bdata-panel="([^"]+)"/g)].map(m => m[1]);
assert.equal(tabs.length, 11);
assert.deepEqual(tabs.sort(), panels.sort(), "Each tab must have a matching panel");

// Small DOM mock exercises initialization plus main controls without external packages.
const drawingContext = {};
for (const name of ["setTransform","clearRect","fillRect","strokeRect","beginPath","closePath","stroke","fill","lineTo","moveTo","quadraticCurveTo","bezierCurveTo","arc","ellipse","save","restore","translate","rotate","fillText","setLineDash","drawImage","clip"]) drawingContext[name] = () => {};
drawingContext.createLinearGradient = () => ({ addColorStop() {} });
drawingContext.createRadialGradient = () => ({ addColorStop() {} });
function makeElement(tag, attributes) {
  const element = {
    tagName: tag.toUpperCase(), dataset: {}, style: {}, value: "0", textContent: "", innerHTML: "",
    children: [], events: {}, attributes: {}, className: attributes.class || "",
    disabled: false, hidden: false, width:Number(attributes.width||0),height:Number(attributes.height||0),
    firstChild: { textContent: "" },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    addEventListener(k, fn) { (this.events[k] ||= []).push(fn); },
    append(...nodes) { this.children.push(...nodes); },
    remove() {},
    setPointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 340, height: 630 }; },
    getContext() { return drawingContext; }
  };
  const classes = new Set((attributes.class || "").split(/\s+/).filter(Boolean));
  element.classList = {
    contains(c) { return classes.has(c); },
    add(c) { classes.add(c); },
    remove(c) { classes.delete(c); },
    toggle(c, force) { if (force === undefined ? !classes.has(c) : force) classes.add(c); else classes.delete(c); }
  };
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith("data-")) {
      const prop = key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      element.dataset[prop] = value;
    }
    if (key === "value") element.value = value;
  }
  return element;
}
const elements = [];
const byId = new Map();
for (const found of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]+)>/gi)) {
  const attributes = {};
  for (const m of found[2].matchAll(/([\w-]+)="([^"]*)"/g)) attributes[m[1]] = m[2];
  const el = makeElement(found[1], attributes);
  elements.push(el);
  if (attributes.id) byId.set(attributes.id, el);
}
function querySelectorAll(selector) {
  if (selector.startsWith(".")) return elements.filter(el => el.className.split(/\s+/).includes(selector.slice(1)));
  const match = selector.match(/^\[data-([\w-]+)(?:='([^']+)')?\]$/);
  if (!match) throw Error("Unexpected selector: " + selector);
  const prop = match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return elements.filter(el => Object.prototype.hasOwnProperty.call(el.dataset, prop) && (match[2] === undefined || el.dataset[prop] === match[2]));
}
const document = {
  getElementById(id) { assert(byId.has(id), "Runtime missing ID " + id); return byId.get(id); },
  querySelectorAll, createElement(tag) { return makeElement(tag, {}); },
  activeElement: { tagName: "BODY" }, hidden: false,
  body: makeElement("body", {}), addEventListener() {}
};
const window = { devicePixelRatio: 1, addEventListener() {},location:{search:"",href:"https://example.com/lab/"} };
const localStorage={getItem(){return null;},setItem(){}};
new Function("window",oceanJs)(window);
new Function("window",vesselJs)(window);
new Function("window",worldJs)(window);
new Function("window","document","URL","Image",flagJs)(window,document,URL,undefined);
new Function("window","document","localStorage","URL",reviewJs)(window,document,localStorage,URL);
const navigator = { vibrate() { return true; } };
class ResizeObserver { observe() {} }
const frameCallbacks = [];
const frame = (cb) => frameCallbacks.push(cb);
function step(time) { assert(frameCallbacks.length>0, "Animation frame should be scheduled"); frameCallbacks.shift()(time); }
const boot = new Function("document", "window", "navigator", "ResizeObserver", "requestAnimationFrame", js);
assert.doesNotThrow(() => boot(document, window, navigator, ResizeObserver, frame), "App must initialize using all required DOM elements");
function fire(id, event, extra) {
  const el = byId.get(id);
  assert(el.events[event] && el.events[event].length, "Missing handler: " + id + "." + event);
  for (const fn of el.events[event]) fn({ target: el, preventDefault() {}, pointerId: 1, clientX: 100, clientY: 100, ...extra });
}
fire("anchorButton", "click");
assert.equal(byId.get("anchorButton").attributes["aria-pressed"], "true");
fire("anchorButton", "click");
assert.equal(byId.get("anchorButton").attributes["aria-pressed"], "false");
fire("modeButton", "click");
assert.equal(byId.get("modeLabel").textContent, "✹ AGGRESSIVE");
byId.get("sailSlider").value = "33";
fire("sailSlider", "input");
assert.equal(byId.get("sailPercent").textContent, "33%");
fire("resetAll", "click");
assert.equal(byId.get("sailPercent").textContent, "72%");
assert.equal(byId.get("modeLabel").textContent, "♡ FRIENDLY");
// Exercise both procedural sea and phone UI frames; don't stop at a successful constructor.
for (let i=0;i<100;i++) step((i+1)*16.667);
assert(byId.get("statHeading").textContent.endsWith("°"));
assert.equal(byId.get("headingMarks").children.length,17,"Compass should reuse 17 stable markers");
const anchorBefore=byId.get("anchorButton").attributes["aria-pressed"];
fire("anchorButton","click");
for(let i=100;i<180;i++) step((i+1)*16.667);
assert.equal(byId.get("anchorButton").attributes["aria-pressed"],"true");
assert(byId.get("anchorDistance").textContent.includes("/"));
fire("anchorButton","click");
assert.equal(byId.get("anchorButton").attributes["aria-pressed"],"false");
// Verify the Ideas and Shipyard tabs can build their dynamic controls.
for(const tabName of ["shipyard","ideas","world","review"]){
  const button=elements.find(el=>el.dataset.tab===tabName);
  assert(button&&button.events.click);
  button.events.click[0]();
}
assert(byId.get("ideasList").children.length>=5,"Ideas should be populated");
assert(byId.get("shipPartsGallery").children.length===8,"Original ship parts should be selectable");
assert(byId.get("flagPaintCanvas").events.pointerdown,"Flag painter should accept pointer input");
assert(byId.get("mechanicsReviewList").children.length>10,"Mechanics review must populate");
fire("worldExplore","click");
fire("worldSummonKraken","click");
for(let i=180;i<210;i++)step((i+1)*16.667);
assert(Number(byId.get("worldChunks").textContent)>0,"World must generate cached chunks");
assert(byId.get("worldAlert").textContent.includes("Kraken"),"Kraken test button must respond");
console.log("PASS: eleven tabs, procedural world, original ship, flag painter, mechanics review, anchor, ocean and Canvas frames.");
