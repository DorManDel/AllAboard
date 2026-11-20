/* All Aboard VesselMotion V0.3
 * Isolated deterministic 2D arcade vessel model. All distances and forces are
 * LAB UNITS, never meters, knots or measured physical constants.
 * A hull has longitudinal drag, stronger transverse resistance, inertia,
 * an approximate point-of-sail polar, and a soft rope-tension anchor.
 * Extracted so we can test the physics without a browser or Unity.
 */
(function(root){
  "use strict";
  const limit=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const rad=deg=>deg*Math.PI/180;
  const degrees=theta=>theta*180/Math.PI;
  const wrap=angle=>(angle%360+360)%360;
  const length=(x,y)=>Math.hypot(x,y);
  const polarPoints=[
    [0,.025],[25,.06],[40,.32],[60,.76],
    [90,1],[130,.96],[155,.79],[180,.59]
  ];
  function polarEfficiency(angleOffWind){
    const angle=limit(angleOffWind,0,180);
    for(let i=1;i<polarPoints.length;i++){
      const prev=polarPoints[i-1],next=polarPoints[i];
      if(angle<=next[0]){
        const t=(angle-prev[0])/(next[0]-prev[0]);
        const smooth=t*t*(3-2*t);
        return prev[1]+(next[1]-prev[1])*smooth;
      }
    }
    return .59;
  }
  function pointOfSail(heading,windTo){
    const windFrom=wrap(windTo+180);
    const difference=Math.abs(((heading-windFrom+540)%360)-180);
    return {offWind:difference,efficiency:polarEfficiency(difference)};
  }
  function step(ship,anchor,wheel,settings,flow,dt,modifiers={}){
    const t=limit(dt,0,1/30);
    const oldHeading=ship.heading;
    const forwardX=Math.sin(rad(oldHeading)),forwardY=-Math.cos(rad(oldHeading));
    const rightX=-forwardY,rightY=forwardX;
    const movingForward=ship.vx*forwardX+ship.vy*forwardY;
    const movingLateral=ship.vx*rightX+ship.vy*rightY;
    const speed=length(ship.vx,ship.vy);

    // More speed over the rudder means more turning authority. Near-stationary
    // steering is deliberately small, not impossible (arcade concession).
    const rudderAuthority=.08 + .92*limit(Math.abs(movingForward)/35,0,1);
    const hullResponse=modifiers.rudderFactor===undefined?1:modifiers.rudderFactor;
    const helmTarget=limit(wheel.rudder,-1,1)*settings.steerSensitivity*
      (12+65*rudderAuthority)*hullResponse*(anchor.down?.66:1);
    const yawResponse=settings.yawResponse||5;
    ship.angularVelocity += (helmTarget-ship.angularVelocity)*(1-Math.exp(-yawResponse*t));
    ship.heading=wrap(oldHeading+ship.angularVelocity*t);
    const fx=Math.sin(rad(ship.heading)),fy=-Math.cos(rad(ship.heading));
    const rx=-fy,ry=fx;
    const wind=pointOfSail(ship.heading,settings.windDirection);
    const sailArea=limit(settings.sail/100,0,1)*
      (modifiers.sailFactor===undefined?1:modifiers.sailFactor);
    let rigEfficiency=wind.efficiency;
    if(modifiers.rig==="lateen"){
      // Higher windward efficiency; a less effective dead-downwind runner.
      rigEfficiency=limit(wind.efficiency*(wind.offWind<80?1.35:
        wind.offWind>145?.72:1),0,1);
    }else if(modifiers.rig==="storm"){
      // Shorter storm canvas: lower maximum thrust, improved control.
      rigEfficiency=wind.efficiency*.87;
    }
    const hullFactor=modifiers.hullFactor===undefined?1:modifiers.hullFactor;
    // The same wind angle is used for gameplay and any displayed sail feedback.
    const thrust=(settings.baseThrust*7+settings.windStrength*24*
      sailArea*rigEfficiency)*hullFactor;
    const windLateral=settings.windStrength*sailArea*(modifiers.rig==="storm"?.4:.8)*
      Math.sin(rad(ship.heading-settings.windDirection));
    const ax=fx*thrust+rx*windLateral+flow.x;
    const ay=fy*thrust+ry*windLateral+flow.y;

    // Drift relative to local boat axes; a keel rejects lateral movement.
    // Do not multiply both axes by the same friction factor ("ice-skating").
    const fv=ship.vx*fx+ship.vy*fy,lv=ship.vx*rx+ship.vy*ry;
    const forwardDrag=(.17+.004*limit(Math.abs(fv),0,100))*hullFactor;
    const sideDrag=(settings.lateralDrag||5.5);
    const forwardAfter=fv*Math.exp(-forwardDrag*t);
    const sideAfter=lv*Math.exp(-sideDrag*t);
    ship.vx=forwardAfter*fx+sideAfter*rx+ax*t;
    ship.vy=forwardAfter*fy+sideAfter*ry+ay*t;
    const maxSpeed=85*hullFactor;
    const speedAfter=length(ship.vx,ship.vy);
    if(speedAfter>maxSpeed){ship.vx*=maxSpeed/speedAfter;ship.vy*=maxSpeed/speedAfter;}
    ship.x+=ship.vx*t;
    ship.y+=ship.vy*t;

    // The chain is slack until it approaches its defined length. A spring-
    // damper smoothly transfers momentum into the anchor instead of freezing
    // the vessel or projecting it abruptly onto the radius every frame.
    const ropeLength=Math.max(12,settings.anchorLine||70);
    let tension=0;
    if(anchor.down&&anchor.phase==="set"){
      const dx=ship.x-anchor.point.x,dy=ship.y-anchor.point.y;
      const d=Math.max(.00001,length(dx,dy));
      const nx=dx/d,ny=dy/d;
      const radial=ship.vx*nx+ship.vy*ny;
      const softZone=Math.min(12,ropeLength*.15);
      const stretch=Math.max(0,d-(ropeLength-softZone));
      if(stretch>0){
        const stiffness=settings.ropeStiffness||9;
        const damper=settings.ropeDamping||6;
        tension=stretch*stiffness+Math.max(0,radial)*damper;
        const load=limit(tension,0,700);
        ship.vx-=nx*load*t;
        ship.vy-=ny*load*t;
      }
      const grip=settings.anchorGrip||120;
      anchor.tension=limit(tension/grip,0,2);
      // Moving the seabed point takes sustained overload, not one turbulent frame.
      anchor.overload=(anchor.overload||0)+
        (tension>grip?t:-Math.min(anchor.overload||0,2*t));
      if(anchor.overload>.45){
        const dragRate=limit((tension-grip)*.08,0,18);
        anchor.point.x+=nx*dragRate*t;
        anchor.point.y+=ny*dragRate*t;
        anchor.status="Dragging";
      }else anchor.status=stretch>0?"Taut":"Slack";
      // Last-resort guard for large dt: never exceed rope length by more than
      // 1.5 units when anchored. This is not the primary motion solver.
      const finalDx=ship.x-anchor.point.x,finalDy=ship.y-anchor.point.y;
      const finalDist=length(finalDx,finalDy);
      if(finalDist>ropeLength+1.5){
        const ux=finalDx/finalDist,uy=finalDy/finalDist;
        ship.x=anchor.point.x+ux*(ropeLength+1.5);
        ship.y=anchor.point.y+uy*(ropeLength+1.5);
        const outgoing=ship.vx*ux+ship.vy*uy;
        if(outgoing>0){ship.vx-=ux*outgoing;ship.vy-=uy*outgoing;}
      }
      anchor.length=length(ship.x-anchor.point.x,ship.y-anchor.point.y);
    } else if(!anchor.down){
      anchor.length=0;anchor.tension=0;anchor.overload=0;
    }
    ship.forwardSpeed=ship.vx*fx+ship.vy*fy;
    ship.sideSpeed=ship.vx*rx+ship.vy*ry;
    ship.sailEfficiency=rigEfficiency;
    ship.windAngle=wind.offWind;
    ship.turnSlip=Math.abs(ship.angularVelocity)*Math.max(0,ship.forwardSpeed)*.015;
    return {speed:length(ship.vx,ship.vy),forwardSpeed:ship.forwardSpeed,
      sideSpeed:ship.sideSpeed,sailEfficiency:rigEfficiency,
      windAngle:wind.offWind,tension,heading:ship.heading};
  }
  const api={step,pointOfSail,polarEfficiency};
  root.AllAboardVessel=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
