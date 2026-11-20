/* V0.5 mechanic library / Kanban validation. Run node tests/planner.cjs */
"use strict";
const assert=require("node:assert/strict");
const {plans,byId}=require("../mechanic-catalog.js");
const {KanbanStore,statuses}=require("../roadmap-board.js");
assert(plans.length>=13,"Roadmap must include the major game systems");
assert.equal(Object.keys(byId).length,plans.length,"Mechanic IDs must be unique");
assert(plans.some(x=>x.id==="stage-loop"&&x.priority==="P0"));
for(const id of ["befriend","followers","cannons","ammo","kraken-arms","onboarding","stage-save","intercept"])
  assert(byId[id],"Required idea is absent: "+id);
for(const p of plans){
  assert(p.title&&p.summary&&p.prototype&&p.player);
  assert(Array.isArray(p.mvp)&&p.mvp.length>=2);
  assert(Array.isArray(p.acceptance)&&p.acceptance.length>=2);
  assert(Array.isArray(p.unity)&&p.unity.length>0);
  assert(!p.dependencies.includes(p.id),"Mechanic must not depend on itself: "+p.id);
  for(const dep of p.dependencies)assert(byId[dep],"Missing dependency "+dep+" in "+p.id);
}
const store=new KanbanStore();
assert.equal(Object.keys(store.cards).length,0,"No unapproved ideas should be on the board initially");
assert(store.add("stage-loop"));
assert.equal(store.add("stage-loop"),false,"No duplicate cards");
assert(store.add("followers"));
assert(store.add("kraken-arms"));
assert(store.move("stage-loop","ready"));
assert(store.move("stage-loop","doing"));
assert(store.move("stage-loop","testing"));
assert(store.move("stage-loop","done"));
assert.equal(store.count("done"),1);
assert.equal(store.move("followers","unknown"),false,"Invalid Kanban status");
store.cards["followers"].note="After core. Test ally behavior with Eilon.";
store.cards["followers"].owner="Eilon";
const issue=store.jiraIssue("followers");
assert.equal(issue.project,"SCRUM");
assert(issue.summary.includes("Follower Ships"));
assert(issue.description.includes("After core."));
assert(issue.description.includes("Acceptance criteria"));
assert(issue.description.includes("FollowerCoordinator"));
assert(store.exportMarkdown().includes("Jira-ready Backlog"));
const data=store.exportData();
const other=new KanbanStore();
assert.equal(other.importData(data),3);
assert.equal(other.cards.followers.owner,"Eilon");
assert.equal(other.cards["stage-loop"].status,"done");
assert(other.remove("kraken-arms"));
assert.equal(other.remove("kraken-arms"),false);
assert.throws(()=>other.importData({cards:[]}),/Unsupported/);
assert.equal(statuses.length,5);
console.log("PASS: catalog dependencies, staged approval, local Kanban moves, no duplicates, Jira-ready export and JSON collaboration.");
