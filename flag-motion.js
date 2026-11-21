/* V0.9 lightweight cloth hint: wind-driven flag geometry, not a cloth solver.
 * Coordinates are ship-local canvas pixels; deterministic and cheap on phones.
 */
(function(root){
"use strict";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const radians=n=>n*Math.PI/180;
function flagPose(heading,windDirection,windStrength,time,segment=1){
 const relative=radians(((windDirection-heading+540)%360)-180);
 const breeze=clamp(windStrength/7,0,1);
 const side=Math.sin(relative),forward=-Math.cos(relative);
 // Preserve visible cloth even when wind points along the ship.
 const reach=9+14*breeze;
 // Continuous lateral projection: near a head/tail-wind crossing the
 // cloth visually narrows before reversing, instead of flipping full width.
 const lateral=clamp(side*2.4,-1,1);
 const t=clamp(segment,0,1);
 const flutter=Math.sin(time*(3.1+windStrength*.9)-t*8.2)*
   (1.2+3.6*breeze)*t*t;
 const billow=Math.sin(time*(2+windStrength*.4)-t*5.1)*1.4*t;
 return{
  x:lateral*reach*t,
  y:forward*reach*.22*t+flutter+billow,
  scaleX:lateral,
  flutter,relative,reach,breeze
 };
}
root.AllAboardFlagMotion={flagPose};
if(typeof module!=="undefined"&&module.exports)module.exports={flagPose};
})(typeof window!=="undefined"?window:globalThis);
