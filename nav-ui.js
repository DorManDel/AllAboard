/* Navigation V0.9: grouped, non-scrolling tabs on desktop and phone.
 * Existing tab/panel router remains authoritative; this is a presentation layer.
 */
(function(root){
"use strict";
const groups=[
 {id:"play",title:"⛵ Sail",tabs:["live","helm","sails","anchor","ocean","feel"]},
 {id:"combat",title:"✹ Adventure",tabs:["encounter","damage","loop"]},
 {id:"world",title:"🗺 World",tabs:["world","shipyard"]},
 {id:"create",title:"✎ Create",tabs:["layout","audio","ideas"]},
 {id:"develop",title:"⚙ Build",tabs:["review","planner","unity"]}
];
function groupFor(tab){return groups.find(g=>g.tabs.includes(tab))?.id||"play";}
class LabNavigation{
 constructor(){this.group="play";this.elements=new Map();}
 mount(){
  this.tabbar=document.querySelector(".tabbar");
  this.groupbar=document.getElementById("navGroups");
  this.picker=document.getElementById("navMechanic");
  if(!this.tabbar||!this.groupbar||!this.picker)return;
  const tabs=[...this.tabbar.querySelectorAll(".tab")];
  for(const tab of tabs){
   this.elements.set(tab.dataset.tab,tab);
   const option=document.createElement("option");
   option.value=tab.dataset.tab;option.textContent=tab.textContent.trim();
   this.picker.append(option);
  }
  for(const group of groups){
   const button=document.createElement("button");
   button.type="button";button.className="nav-group";button.textContent=group.title;
   button.dataset.group=group.id;button.setAttribute("aria-pressed","false");
   button.addEventListener("click",()=>this.activateGroup(group.id));
   this.groupbar.append(button);
  }
  this.picker.addEventListener("change",e=>this.go(e.target.value));
  root.addEventListener?.("allaboard-tab-changed",e=>this.sync(e.detail?.tab));
  this.sync(document.querySelector(".tab.active")?.dataset.tab||"live");
 }
 go(tab){const button=this.elements.get(tab);if(button)button.click();}
 activateGroup(id){
  this.group=groups.some(g=>g.id===id)?id:"play";
  const current=groups.find(g=>g.id===this.group);
  for(const b of this.groupbar.querySelectorAll("button")){
   const is=b.dataset.group===this.group;
   b.classList.toggle("active",is);b.setAttribute("aria-pressed",String(is));
  }
  for(const [tab,element] of this.elements){
   const visible=current.tabs.includes(tab);
   element.hidden=!visible;
   element.tabIndex=visible?0:-1;
  }
 }
 sync(tab){
  if(!this.elements.has(tab))return;
  this.activateGroup(groupFor(tab));
  this.picker.value=tab;
 }
}
root.AllAboardNav={LabNavigation,groups,groupFor};
if(typeof module!=="undefined"&&module.exports)module.exports={LabNavigation,groups,groupFor};
if(typeof document!=="undefined"){
 const init=()=>{const nav=new LabNavigation();nav.mount();root.AllAboardNavInstance=nav;};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
}
})(typeof window!=="undefined"?window:globalThis);
