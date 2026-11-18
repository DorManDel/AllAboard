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

assert.doesNotThrow(() => new vm.Script(js), "JavaScript must parse");
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
assert.equal(tabs.length, 8);
assert.deepEqual(tabs.sort(), panels.sort(), "Each tab must have a matching panel");

// Small DOM mock exercises initialization plus main controls without external packages.
function makeElement(tag, attributes) {
  const element = {
    tagName: tag.toUpperCase(), dataset: {}, style: {}, value: "0", textContent: "", innerHTML: "",
    children: [], events: {}, attributes: {}, className: attributes.class || "",
    disabled: false, firstChild: { textContent: "" },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    addEventListener(k, fn) { (this.events[k] ||= []).push(fn); },
    append(...nodes) { this.children.push(...nodes); },
    remove() {},
    setPointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 340, height: 630 }; },
    getContext() { return {}; }
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
for (const found of html.matchAll(/<([a-z]+)\b([^>]+)>/gi)) {
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
const window = { devicePixelRatio: 1, addEventListener() {} };
const navigator = { vibrate() { return true; } };
class ResizeObserver { observe() {} }
const frame = () => {};
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
assert.equal(byId.get("modeLabel").textContent, "AGGRESSIVE");
byId.get("sailSlider").value = "33";
fire("sailSlider", "input");
assert.equal(byId.get("sailPercent").textContent, "33%");
fire("resetAll", "click");
assert.equal(byId.get("sailPercent").textContent, "72%");
assert.equal(byId.get("modeLabel").textContent, "FRIENDLY");
console.log("PASS: syntax, markup, eight tabs, DOM IDs, bootstrap and core control handlers.");
