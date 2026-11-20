/* All Aboard — V0.5 Stage Loop Lab
 * No random reward rolls hidden from the player: risk and sample rewards
 * are deterministic to expose game-feel trade-offs for Eilon and Dor.
 * This is a standalone concept prototype; no Unity production progression.
 */
(function(root){
"use strict";
const objectives=[
  {name:"Reach the trade passage",hint:"Navigate past the reef and reach the marker",kind:"navigation"},
  {name:"Recover a lost treasure",hint:"Sail near the chest to recover the manifest",kind:"treasure"},
  {name:"Protect the merchant",hint:"Keep the ally ship safe through an ambush",kind:"escort"},
  {name:"Disable the pirate's sails",hint:"Align your broadside; the guns fire automatically",kind:"combat"}
];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const round=v=>Math.round(v);
class StageSession{
  constructor(snapshot){
    this.state={stage:1,phase:"objective",objectiveCleared:false,
      riskWave:0,riskSeconds:0,bankedCoins:0,pendingCoins:0,
      totalObjectives:0,lastEvent:"Start with a short objective. Every stage has a safe exit."};
    if(snapshot)this.restore(snapshot);
  }
  get objective(){return objectives[(this.state.stage-1)%objectives.length];}
  get difficulty(){
    const s=this.state;
    return round((s.stage*.85+s.riskWave*1.7+s.riskSeconds*.012)*10)/10;
  }
  get potentialBonus(){
    const s=this.state;
    return round((20+s.stage*9)*(1+.35*s.riskWave)+s.riskSeconds*.24);
  }
  get baseReward(){return 35+15*this.state.stage;}
  get riskTier(){return this.state.riskWave===0?"Safe":this.state.riskWave<3?"Growing":this.state.riskWave<6?"Dangerous":"Extreme";}
  get canStay(){return this.state.phase==="choice";}
  get canCashOut(){return this.state.phase==="choice";}
  completeObjective(){
    const s=this.state;
    if(s.phase!=="objective")return false;
    s.objectiveCleared=true;
    s.phase="choice";
    s.totalObjectives++;
    // Guaranteed stage reward is banked immediately, even if the player
    // chooses to stay. Only optional streak loot can be lost later.
    s.bankedCoins+=this.baseReward;
    s.lastEvent="Objective complete! +"+this.baseReward+" guaranteed coins. Cash out or take more risk.";
    return true;
  }
  stay(){
    const s=this.state;
    if(s.phase!=="choice")return false;
    s.riskWave++;
    s.riskSeconds=0;
    s.phase="risk";
    s.lastEvent="Risk round "+s.riskWave+" started. Survive for bonus loot or retreat at the next choice.";
    return true;
  }
  tick(seconds){
    const s=this.state;
    if(s.phase!=="risk"||!Number.isFinite(seconds)||seconds<=0)return false;
    s.riskSeconds=clamp(s.riskSeconds+seconds,0,600);
    return true;
  }
  survive(){
    const s=this.state;
    if(s.phase!=="risk")return false;
    const reward=this.potentialBonus;
    s.pendingCoins+=reward;
    s.phase="choice";
    s.lastEvent="You survived! +"+reward+" unbanked bonus coins. Staying again raises the stakes.";
    return true;
  }
  fail(){
    const s=this.state;
    if(s.phase!=="risk")return false;
    const lost=s.pendingCoins;
    s.pendingCoins=0;
    s.riskWave=0;
    s.riskSeconds=0;
    s.phase="port";
    s.lastEvent="Defeated: lost "+lost+" optional coins. Your stage, cleared objective and banked loot remain.";
    return true;
  }
  cashOut(){
    const s=this.state;
    if(s.phase!=="choice")return false;
    const bonus=s.pendingCoins;
    s.bankedCoins+=bonus;
    s.pendingCoins=0;
    s.riskSeconds=0;
    s.riskWave=0;
    s.phase="port";
    s.lastEvent="Safely left the sea. Banked "+bonus+" extra coins; Stage "+s.stage+" remains your checkpoint.";
    return true;
  }
  resume(){
    const s=this.state;
    if(s.phase!=="port")return false;
    s.phase=s.objectiveCleared?"choice":"objective";
    s.lastEvent="Returned to Stage "+s.stage+". Your cleared objective and banked rewards are preserved.";
    return true;
  }
  nextStage(){
    const s=this.state;
    if(s.phase!=="port"||!s.objectiveCleared)return false;
    s.stage++;
    s.phase="objective";s.objectiveCleared=false;
    s.riskWave=0;s.riskSeconds=0;s.pendingCoins=0;
    s.lastEvent="Stage "+s.stage+" unlocked. New objective: "+this.objective.name+".";
    return true;
  }
  snapshot(){
    // V1 checkpoint format: only state data, no browser APIs or scene objects.
    return {version:1,state:{...this.state}};
  }
  restore(snapshot){
    if(!snapshot||snapshot.version!==1||!snapshot.state)return false;
    const src=snapshot.state;
    if(!["objective","choice","risk","port"].includes(src.phase))return false;
    const validInt=(n,defaultValue,min=0,max=Number.MAX_SAFE_INTEGER)=>
      Number.isSafeInteger(n)&&n>=min&&n<=max?n:defaultValue;
    const phase=src.phase==="risk"?"port":src.phase;
    const cleared=Boolean(src.objectiveCleared);
    this.state={
      stage:validInt(src.stage,1,1,1000000),
      phase:phase==="choice"&&!cleared?"objective":phase,
      objectiveCleared:cleared,
      riskWave:phase==="port"?0:validInt(src.riskWave,0,0,1000),
      riskSeconds:0,bankedCoins:validInt(src.bankedCoins,0),
      pendingCoins:phase==="port"?0:validInt(src.pendingCoins,0),
      totalObjectives:validInt(src.totalObjectives,0),
      lastEvent:"Checkpoint restored. Unfinished risk rounds are not resumed in the browser prototype."
    };
    return true;
  }
  reset(){this.state=(new StageSession()).state;}
}
const hints=[
  {start:0,end:3,title:"STEER",description:"Drag the wheel. Release it to return to center.",icon:"☸"},
  {start:3,end:6,title:"SAILS",description:"Raise sails for speed; lower them for control.",icon:"⛵"},
  {start:6,end:8,title:"CANNONS",description:"They fire automatically when you align your broadside.",icon:"✹"},
  {start:8,end:10,title:"CHOOSE",description:"Objective done? Leave safely or stay for bonus loot.",icon:"⚓"}
];
class StageLoopLab{
  constructor(){
    this.session=new StageSession();
    this.timer=null;
    this.tutorialSeconds=0;
    this.tutorialActive=false;
  }
  $(id){return document.getElementById(id);}
  mount(){
    if(!this.$("loopCompleteObjective"))return;
    try{
      const saved=localStorage.getItem("allaboard-stage-loop-v1");
      if(saved)this.session.restore(JSON.parse(saved));
    }catch(err){}
    const bind=(id,action)=>this.$(id).addEventListener("click",()=>{
      if(action())this.refresh();
    });
    bind("loopCompleteObjective",()=>this.session.completeObjective());
    bind("loopStay",()=>this.session.stay());
    bind("loopSurvive",()=>this.session.survive());
    bind("loopFail",()=>this.session.fail());
    bind("loopLeave",()=>this.session.cashOut());
    bind("loopResume",()=>this.session.resume());
    bind("loopNextStage",()=>this.session.nextStage());
    bind("loopAdvance10",()=>this.session.tick(10));
    this.$("loopReset").addEventListener("click",()=>{
      this.session.reset();this.refresh();
    });
    this.$("tutorialReplay").addEventListener("click",()=>this.startTutorial());
    this.$("tutorialSkip").addEventListener("click",()=>this.skipTutorial());
    this.$("tutorialNext").addEventListener("click",()=>{
      this.tutorialSeconds=hints.find(h=>this.tutorialSeconds<h.end)?.end||10;
      this.drawTutorial();
    });
    this.refresh();
    this.drawTutorial();
  }
  persist(){
    try{localStorage.setItem("allaboard-stage-loop-v1",JSON.stringify(this.session.snapshot()));}
    catch(err){}
  }
  startTutorial(){
    this.stopTutorial();this.tutorialSeconds=0;this.tutorialActive=true;
    this.drawTutorial();
    if(typeof setInterval==="function"){
      this.timer=setInterval(()=>{
        this.tutorialSeconds=Math.min(10,this.tutorialSeconds+.1);
        this.drawTutorial();
        if(this.tutorialSeconds>=10)this.stopTutorial();
      },100);
    }
  }
  stopTutorial(){
    if(this.timer!==null)clearInterval(this.timer);
    this.timer=null;this.tutorialActive=false;
  }
  skipTutorial(){this.stopTutorial();this.tutorialSeconds=10;this.drawTutorial();}
  drawTutorial(){
    const seconds=clamp(this.tutorialSeconds,0,10);
    const hint=hints.find(h=>seconds<h.end)||hints[hints.length-1];
    this.$("tutorialHintIcon").textContent=hint.icon;
    this.$("tutorialHintTitle").textContent=seconds>=10?"READY TO SAIL":hint.title;
    this.$("tutorialHintDescription").textContent=seconds>=10?
      "You've learned the four essentials. Contextual anchor and rescue hints can come later.":hint.description;
    this.$("tutorialTime").textContent=seconds.toFixed(1)+" / 10s";
    this.$("tutorialProgress").style.width=(seconds*10)+"%";
    const steps=this.$("tutorialSteps");
    steps.innerHTML="";
    for(const h of hints){
      const b=document.createElement("span");
      b.textContent=h.icon+" "+h.title;
      if(seconds>=h.start&&seconds<h.end)b.className="current";
      steps.append(b);
    }
  }
  refresh(){
    const s=this.session.state;
    const set=(id,value)=>this.$(id).textContent=String(value);
    set("loopStage",s.stage);
    set("loopObjective",this.session.objective.name);
    set("loopObjectiveHint",this.session.objective.hint);
    set("loopPhase",s.phase==="port"?"AT PORT":s.phase.toUpperCase());
    set("loopWave",s.riskWave);
    set("loopDifficulty",this.session.difficulty.toFixed(1));
    set("loopRiskTier",this.session.riskTier);
    set("loopBanked",s.bankedCoins);
    set("loopPending",s.pendingCoins);
    set("loopGuaranteed",this.session.baseReward);
    set("loopPotential",this.session.potentialBonus);
    set("loopAtSea",s.riskSeconds.toFixed(0)+"s");
    set("loopLastEvent",s.lastEvent);
    this.$("loopDifficultyBar").style.width=(clamp(this.session.difficulty/20,0,1)*100)+"%";
    const visible={
      loopCompleteObjective:s.phase==="objective",
      loopStay:s.phase==="choice",
      loopLeave:s.phase==="choice",
      loopSurvive:s.phase==="risk",
      loopFail:s.phase==="risk",
      loopAdvance10:s.phase==="risk",
      loopResume:s.phase==="port",
      loopNextStage:s.phase==="port"&&s.objectiveCleared
    };
    for(const [id,yes] of Object.entries(visible)){
      this.$(id).hidden=!yes;
      this.$(id).disabled=!yes;
    }
    this.persist();
  }
}
root.AllAboardStageLoop={StageSession,StageLoopLab,hints,objectives};
if(typeof module!=="undefined"&&module.exports)
  module.exports={StageSession,StageLoopLab,hints,objectives};
if(typeof document!=="undefined"&&typeof window!=="undefined"){
  const ready=()=>{const demo=new StageLoopLab();demo.mount();root.AllAboardStageLoopInstance=demo;};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});
  else ready();
}
})(typeof window!=="undefined"?window:globalThis);
