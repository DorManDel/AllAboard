/* All Aboard Mechanics Review — no auto-approval unit tests */
"use strict";
const assert=require("node:assert/strict");
const {MechanicsReview,catalog}=require("../mechanics-review.js");
const review=new MechanicsReview();
const ids=new Set(catalog.map(c=>c.id));
assert.equal(ids.size,catalog.length,"Mechanics should have stable unique IDs");
for(const id of ["intercept","rescue","fleet","kraken"]){
  assert.equal(review.entries[id].status,"later",id+" is deferred until core approval");
}
assert.equal(review.summary().keep,0,"No mechanic is approved by default");
review.entries.helm.status="keep";
review.entries.anchor.status="refine";
review.entries.world.status="test";
review.entries.helm.notes="Only on a real Android device with 60fps visual test";
const markdown=review.exportMarkdown("SEA-EXAMPLE-1",{mast:"front",mode:"paint"});
assert(markdown.includes("SEA-EXAMPLE-1"));
assert(markdown.includes("ShipMotionModel"));
assert(markdown.includes("Only on a real Android"));
assert(markdown.includes("AFTER CORE")===false,"No automatic promotion to new scope");
assert(markdown.includes("Interceptor")===false);
assert(markdown.includes("Intercept / Catch Ship"));
assert(markdown.includes("KEEP"));
assert.equal(review.summary().keep,1);
console.log("PASS: review choices, after-core deferral, notes and Unity brief output.");
