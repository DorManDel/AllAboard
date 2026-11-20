/* All Aboard — Mechanics Planning & Local Kanban V0.5
 * Selection and Kanban state live locally in the browser. No credentials are
 * embedded and no automatic writes to the connected All Aboard Jira board.
 * Export JSON to share the board; Markdown describes Jira-ready issues.
 */
(function(root){
"use strict";
const storeKey="allaboard-mechanics-kanban-v1";
const statuses=[
  {id:"backlog",title:"Backlog"},
  {id:"ready",title:"Ready"},
  {id:"doing",title:"In Progress"},
  {id:"testing",title:"Testing"},
  {id:"done",title:"Done"}
];
const catalog=root.AllAboardMechanicPlans?.plans||[];
const byId=root.AllAboardMechanicPlans?.byId||{};
class KanbanStore{
  constructor(){
    this.cards={};
    this.lastSaved="";
  }
  add(id){
    if(!byId[id]||this.cards[id])return false;
    this.cards[id]={status:"backlog",note:"",owner:"Unassigned",addedAt:new Date().toISOString()};
    return true;
  }
  move(id,status){
    if(!this.cards[id]||!statuses.some(s=>s.id===status))return false;
    this.cards[id].status=status;
    return true;
  }
  remove(id){
    if(!this.cards[id])return false;
    delete this.cards[id];return true;
  }
  count(status){return Object.values(this.cards).filter(x=>x.status===status).length;}
  exportData(){
    return {format:"allaboard-kanban",version:1,project:"SCRUM",generatedAt:new Date().toISOString(),
      cards:Object.keys(this.cards).map(id=>({id,...this.cards[id]}))};
  }
  importData(data){
    if(!data||data.format!=="allaboard-kanban"||data.version!==1||!Array.isArray(data.cards))
      throw Error("Unsupported board file");
    const next={};
    for(const row of data.cards){
      if(!byId[row.id]||!statuses.some(s=>s.id===row.status))continue;
      next[row.id]={
        status:row.status,note:String(row.note||"").slice(0,1000),
        owner:String(row.owner||"Unassigned").slice(0,60),
        addedAt:typeof row.addedAt==="string"?row.addedAt:new Date().toISOString()
      };
    }
    this.cards=next;
    return Object.keys(next).length;
  }
  jiraIssue(id){
    const c=byId[id],card=this.cards[id];
    if(!c)throw Error("Unknown mechanic");
    return {
      summary:"[Mechanics Lab] "+c.title,
      project:"SCRUM",
      issueType:c.jiraType,
      description:[
        "Design intent (not approved production implementation).",
        "",
        "Purpose: "+c.summary,
        "Player action: "+c.player,
        "Prototype: "+c.prototype,
        "",
        "MVP scope:",
        ...c.mvp.map(x=>"- "+x),
        "",
        "Acceptance criteria:",
        ...c.acceptance.map(x=>"- "+x),
        "",
        "Dependencies: "+(c.dependencies.length?c.dependencies.map(id=>byId[id]?.title||id).join(", "):"None"),
        "Unity candidate components: "+c.unity.join(", "),
        "Phase: "+c.phase+" | Priority: "+c.priority+" | Estimate: "+c.effort,
        "Lab Kanban: "+(card?.status||"Unselected"),
        "Playtest notes: "+(card?.note||"No notes yet"),
        "",
        "Do not merge or treat this mechanic as approved until reviewed with Eilon and tested on a phone."
      ].join("\n")
    };
  }
  exportMarkdown(){
    const lines=[
      "# All Aboard — Mechanics Roadmap / Jira-ready Backlog",
      "",
      "Source: Mechanics Lab concept planner. Generated: "+new Date().toISOString(),
      "Jira project: SCRUM (All Aboard!). No Jira issues were created by this export.",
      "",
      "## Vision",
      "One-thumb hyper-casual sailing, with skill from positioning, wind, allies, damage and the choice to bank or risk rewards.",
      "",
      "## Stacked milestones",
      "1. Core feel: sailing/wind/water/anchor, basic encounters.",
      "2. Playable stage + optional escalating risk loop, checkpoint, 10-second tutorial.",
      "3. Part-specific damage, auto-cannon projectile trajectories and seeded stages.",
      "4. Playtest/choose for Unity. Keep deferred social/fleet, special ammo and Kraken arms in the backlog.",
      ""
    ];
    for(const status of statuses){
      lines.push("## "+status.title+" ("+this.count(status.id)+")","");
      for(const id of Object.keys(this.cards).filter(id=>this.cards[id].status===status.id)){
        const issue=this.jiraIssue(id);
        lines.push("### "+issue.summary,
          "- Jira project: "+issue.project,
          "- Issue type: "+issue.issueType,
          "- Owner: "+this.cards[id].owner,
          "- Description:",issue.description,"");
      }
    }
    return lines.join("\n");
  }
}
class MechanicsPlanner{
  constructor(){
    this.store=new KanbanStore();
    this.selectedId="stage-loop";
    this.search="";
    this.phase="all";
    this.category="all";
    this.noticeText="Choose a mechanic, inspect its plan and add it to the local Kanban.";
  }
  $(id){return document.getElementById(id);}
  element(tag,text,css){
    const node=document.createElement(tag);
    if(text!==undefined)node.textContent=text;
    if(css)node.className=css;
    return node;
  }
  mount(){
    if(!this.$("plannerCatalog"))return;
    try{
      const raw=localStorage.getItem(storeKey);
      if(raw)this.store.importData(JSON.parse(raw));
    }catch(err){}
    const search=this.$("plannerSearch");
    search.addEventListener("input",()=>{this.search=search.value.trim().toLowerCase();this.renderCatalog();});
    this.$("plannerPhase").addEventListener("change",e=>{this.phase=e.target.value;this.renderCatalog();});
    this.$("plannerCategory").addEventListener("change",e=>{this.category=e.target.value;this.renderCatalog();});
    this.$("plannerAdd").addEventListener("click",()=>{
      const done=this.store.add(this.selectedId);
      this.notice(done?"Added "+byId[this.selectedId].title+" to Backlog.":"That mechanic is already in the Kanban.");
      this.save();this.render();
    });
    this.$("plannerCopyJira").addEventListener("click",()=>this.copyJira(this.selectedId));
    this.$("plannerCopyHandoff").addEventListener("click",()=>{
      const handoff=window.AllAboardUnityReadiness?.handoff(byId[this.selectedId])||"Unavailable";
      if(navigator.clipboard?.writeText){
        navigator.clipboard.writeText(handoff).then(()=>this.notice("Copied Unity mechanic architecture and implementation prompt."))
          .catch(()=>this.notice("Clipboard unavailable. Select the text in the review box instead."));
      }else this.notice("Clipboard unavailable. Select the text in the review box instead.");
    });
    this.$("plannerExportMd").addEventListener("click",()=>this.download("all-aboard-jira-backlog.md",this.store.exportMarkdown(),"text/markdown"));
    this.$("plannerExportJson").addEventListener("click",()=>this.download("all-aboard-kanban.json",JSON.stringify(this.store.exportData(),null,2),"application/json"));
    this.$("plannerImportJson").addEventListener("change",async event=>{
      const file=event.target.files?.[0];if(!file)return;
      try{
        if(file.size>150000)throw Error("Board too large (max 150 KB)");
        const count=this.store.importData(JSON.parse(await file.text()));
        this.notice("Imported "+count+" cards. Existing local board was replaced.");
        this.save();this.render();
      }catch(err){this.notice("Import failed: "+err.message);}
      event.target.value="";
    });
    this.$("plannerReset").addEventListener("click",()=>{
      this.store=new KanbanStore();this.save();this.notice("Local planning board cleared.");this.render();
    });
    const categories=[...new Set(catalog.map(x=>x.category))];
    for(const category of categories){
      const option=this.element("option",category);option.value=category;this.$("plannerCategory").append(option);
    }
    this.render();
  }
  notice(text){this.noticeText=text;this.$("plannerStatus").textContent=text;}
  save(){
    try{localStorage.setItem(storeKey,JSON.stringify(this.store.exportData()));}catch(err){}
  }
  download(filename,text,type){
    const blob=new Blob([text],{type:type+";charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=this.element("a");link.href=url;link.download=filename;
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),700);
  }
  copyJira(id){
    const issue=this.store.jiraIssue(id);
    const content=issue.summary+"\n\n"+issue.description;
    if(navigator.clipboard?.writeText){
      navigator.clipboard.writeText(content).then(()=>this.notice("Copied Jira-ready issue text. Paste it in the SCRUM board."))
        .catch(()=>this.notice("Clipboard permission blocked. Export the Markdown backlog instead."));
    }else this.notice("Use Export Jira Backlog; this browser does not offer clipboard write.");
  }
  render(){
    this.renderCatalog();this.renderDetails();this.renderBoard();
    this.$("plannerStatus").textContent=this.noticeText;
  }
  renderCatalog(){
    const host=this.$("plannerCatalog");host.innerHTML="";
    const selected=catalog.filter(p=>{
      const value=(p.title+" "+p.summary+" "+p.category+" "+p.id).toLowerCase();
      return value.includes(this.search)&&
        (this.phase==="all"||p.phase===this.phase)&&
        (this.category==="all"||p.category===this.category);
    });
    this.$("plannerCatalogCount").textContent=selected.length+" plans";
    for(const p of selected){
      const item=this.element("button",undefined,"plan-picker");
      if(p.id===this.selectedId)item.classList.add("selected");
      item.setAttribute("aria-pressed",String(p.id===this.selectedId));
      const title=this.element("strong",p.title);
      const desc=this.element("small",p.category+" · "+p.phase+" · "+p.priority);
      const added=this.store.cards[p.id]?this.element("span","✓ "+this.store.cards[p.id].status,"plan-picker-added"):null;
      item.append(title,desc);if(added)item.append(added);
      item.addEventListener("click",()=>{
        this.selectedId=p.id;this.renderCatalog();this.renderDetails();
      });
      host.append(item);
    }
    if(!selected.length)host.append(this.element("p","No matching mechanics. Try clearing filters.","planner-empty"));
  }
  renderDetails(){
    const p=byId[this.selectedId];if(!p)return;
    this.$("plannerDetailTitle").textContent=p.title;
    this.$("plannerDetailCategory").textContent=p.category;
    this.$("plannerDetailPhase").textContent=p.phase;
    this.$("plannerDetailEffort").textContent="Effort "+p.effort+" · "+p.priority;
    this.$("plannerDetailSummary").textContent=p.summary;
    this.$("plannerDetailDecision").textContent=p.player;
    this.$("plannerDetailPrototype").textContent=p.prototype;
    this.$("plannerDetailUnity").textContent=p.unity.join(" + ");
    this.$("plannerArchitectureText").textContent=window.AllAboardUnityReadiness?.handoff(p)||"Architecture contract unavailable.";
    const deps=p.dependencies.map(id=>byId[id]?.title||id).join(", ")||"None";
    this.$("plannerDetailDependencies").textContent=deps;
    const renderItems=(id,values)=>{
      const list=this.$(id);list.innerHTML="";
      for(const value of values)list.append(this.element("li",value));
    };
    renderItems("plannerDetailMvp",p.mvp);
    renderItems("plannerDetailAcceptance",p.acceptance);
    this.$("plannerAdd").textContent=this.store.cards[p.id]?"✓ Already on board":"＋ Add to Kanban";
    this.$("plannerAdd").disabled=Boolean(this.store.cards[p.id]);
  }
  renderBoard(){
    const board=this.$("plannerBoard");board.innerHTML="";
    const total=Object.keys(this.store.cards).length;
    this.$("plannerBoardCount").textContent=total+" mechanics on board";
    for(let index=0;index<statuses.length;index++){
      const stage=statuses[index];
      const col=this.element("section",undefined,"kanban-column");
      const header=this.element("h3",stage.title+" · "+this.store.count(stage.id));
      col.append(header);
      const cards=Object.keys(this.store.cards).filter(id=>this.store.cards[id].status===stage.id);
      if(!cards.length)col.append(this.element("p","No cards yet","kanban-empty"));
      for(const id of cards){
        const p=byId[id],data=this.store.cards[id];
        const card=this.element("article",undefined,"kanban-card");
        const title=this.element("button",p.title,"kanban-card-title");
        title.addEventListener("click",()=>{this.selectedId=id;this.renderCatalog();this.renderDetails();this.$("plannerDetailTitle").scrollIntoView?.({behavior:"smooth",block:"center"});});
        const label=this.element("small",p.phase+" · "+p.priority+" · "+p.effort);
        const owner=this.element("input");owner.value=data.owner;
        owner.maxLength=60;owner.placeholder="Owner (e.g. Dor / Eilon)";
        owner.setAttribute("aria-label","Owner of "+p.title);
        owner.addEventListener("change",()=>{data.owner=owner.value.slice(0,60);this.save();});
        const note=this.element("textarea");note.value=data.note;
        note.rows=2;note.maxLength=1000;note.placeholder="Notes for this board card...";
        note.setAttribute("aria-label","Kanban notes for "+p.title);
        note.addEventListener("change",()=>{data.note=note.value.slice(0,1000);this.save();});
        const buttons=this.element("div",undefined,"kanban-card-actions");
        const left=this.element("button","←","kanban-move");
        left.disabled=index===0;left.setAttribute("aria-label","Move "+p.title+" to previous column");
        left.addEventListener("click",()=>{this.store.move(id,statuses[index-1].id);this.save();this.render();});
        const right=this.element("button","→","kanban-move");
        right.disabled=index===statuses.length-1;right.setAttribute("aria-label","Move "+p.title+" to next column");
        right.addEventListener("click",()=>{this.store.move(id,statuses[index+1].id);this.save();this.render();});
        const copy=this.element("button","Copy Jira","kanban-copy");
        copy.addEventListener("click",()=>this.copyJira(id));
        const remove=this.element("button","×","kanban-remove");remove.setAttribute("aria-label","Remove "+p.title);
        remove.addEventListener("click",()=>{this.store.remove(id);this.save();this.render();});
        buttons.append(left,right,copy,remove);
        card.append(title,label,owner,note,buttons);
        col.append(card);
      }
      board.append(col);
    }
  }
}
root.AllAboardPlanner={KanbanStore,MechanicsPlanner,statuses};
if(typeof module!=="undefined"&&module.exports)
  module.exports={KanbanStore,MechanicsPlanner,statuses};
if(typeof document!=="undefined"&&typeof window!=="undefined"){
  const ready=()=>{const plan=new MechanicsPlanner();plan.mount();root.AllAboardPlannerInstance=plan;};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});
  else ready();
}
})(typeof window!=="undefined"?window:globalThis);
