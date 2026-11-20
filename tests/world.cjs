/* All Aboard WorldEngine deterministic world tests. Run node tests/world.cjs */
"use strict";
const assert=require("node:assert/strict");
const {WorldEngine}=require("../world.js");
const seed="EILON-DOR-2026";
const worldA=new WorldEngine(seed),worldB=new WorldEngine(seed);
for(const [cx,cy] of [[0,0],[-3,2],[7,-15],[183,908],[-12000,17000]]){
  assert.deepEqual(worldA.createChunk(cx,cy),worldB.createChunk(cx,cy),
    "Same seed, coordinate and version must generate identical content");
}
assert.notDeepEqual(new WorldEngine("DIFFERENT").createChunk(2,3),worldA.createChunk(2,3),
  "Different seeds should produce different worlds");
const coords=[[-.01,-.01],[0,0],[539,0],[540,540],[-540,541]];
const expected=[[-1,-1],[0,0],[0,0],[1,1],[-1,1]];
for(let i=0;i<coords.length;i++)
  assert.deepEqual(Object.values(worldA.chunkAt(...coords[i])),expected[i],
    "Chunk coordinate must floor correctly for negative world positions");
worldA.updateNear(0,0);
assert(worldA.cache.size<=25,"Initial cache bounded to five-by-five chunks");
for(let i=0;i<100;i++)worldA.updateNear(i*480,-i*620);
assert(worldA.cache.size<=25,"Moving endlessly must not increase cached chunk count");
worldA.updateNear(0,0);
const features=worldA.nearbyObjects(0,0,1000);
assert(features.some(x=>x.type==="island"),"Generated world should contain islands");
assert(features.some(x=>x.type==="ship"),"Generated world should contain ships");
assert(features.some(x=>x.type==="treasure"),"Generated world should contain treasure");
// Initial spawn is kept free from blocking islands.
for(const isle of worldA.getChunk(0,0).features.filter(x=>x.type==="island"))
  assert(Math.hypot(isle.x,isle.y)>=150,"Initial spawn should avoid blocking terrain");
const box=features.find(x=>x.type==="treasure");
assert(box.coins>0);
const reward=worldA.collect(box);
assert.equal(reward,box.coins);
assert.equal(worldA.collect(box),0,"Treasure must not be farmed repeatedly");
const chunk=worldA.chunkAt(box.x,box.y);
worldA.updateNear(box.x+6000,box.y+5000);
worldA.updateNear(box.x,box.y);
assert(worldA.getChunk(chunk.x,chunk.y).features.some(x=>x.id===box.id),
  "Regenerated chunk preserves object IDs");
assert(!worldA.nearbyObjects(box.x,box.y,40).some(x=>x.id===box.id),
  "Collected treasure must remain unavailable after cache eviction");
const snapshot=worldA.snapshot();
assert(snapshot.collected.includes(box.id));
assert.equal(snapshot.generatorVersion,1);
// Kraken can threaten ships and the player but is not forced on every generated chunk.
const monster=worldB.summonKraken(0,0);
const ship={x:monster.x,y:monster.y,vx:0,vy:0,hull:100};
const ocean={splash(){this.count=(this.count||0)+1;},count:0};
for(let i=0;i<140;i++)worldB.simulate(1/60,ship,ocean,{windStrength:2});
assert(ship.hull<100,"Kraken must have a real gameplay effect when too close");
assert(Number.isFinite(ship.hull));
assert(ocean.count>0,"Kraken activity should disturb the ocean");
const off=new WorldEngine(seed,{islands:0,ships:0,treasure:0,kraken:false});
off.updateNear(0,0);
assert(off.nearbyObjects(0,0,500).length===0,"Density settings can disable all spawns");
assert.equal(off.nearest(0,0,"treasure",90),null);
console.log("PASS: deterministic seed/chunks, bounded cache, spawn safety, persistent treasure and test Kraken.");
