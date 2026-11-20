/* All Aboard V0.7 presentation: original audio audition and Unity YAML QA.
 * Runs after app.js, never edits production Unity files.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const audioData=root.AllAboardAudio;
const audit=root.AllAboardUnityReadiness;
if(!audioData)return;
const lab=new audioData.AudioLab();
let adaptiveTimer=null;
function adaptiveMood(){
 if(!lab.playing||!$("audioAdaptiveMood").checked)return;
 const bridge=root.AllAboardLiveBridge;if(!bridge)return;
 const ship=bridge.getShip?.(),state=bridge.getState?.(),world=bridge.getWorld?.();
 let mood=state?.mode==="aggressive"?"battle":"sailing";
 if(ship&&world?.nearbyObjects?.(ship.x,ship.y,220).some(p=>p.type==="kraken"))mood="kraken";
 if(lab.musicId===mood)return;
 lab.setMood(mood);lab.playMusic();renderMoods();renderPrompt();
 status("Adaptive mood: "+(mood==="battle"?"cinematic combat sketch":mood==="kraken"?"Kraken warning sketch":"playful sailing sketch")+
 ". Finished soundtrack transitions will use proper crossfades.");
}
function startAdaptive(){
 if(adaptiveTimer===null)adaptiveTimer=root.setInterval?.(adaptiveMood,900)??null;
 adaptiveMood();
}
function stopAdaptive(){
 if(adaptiveTimer!==null)root.clearInterval?.(adaptiveTimer);
 adaptiveTimer=null;
}
root.AllAboardAudioInstance=lab;
const status=text=>{if($("audioStatus"))$("audioStatus").textContent=text;};
const updateLog=()=>{
 const entries=lab.eventLog.slice(-12).reverse();
 $("audioEventLog").textContent=entries.length?
  entries.map(e=>new Date(e.at).toLocaleTimeString()+" · "+e.id).join("\n"):"No events yet.";
};
const moodRoot=$("audioMoods"),sfxRoot=$("audioSfxList");
function productionPrompt(){
 const m=audioData.moods.find(x=>x.id===lab.musicId);
 return [
 "Create an ORIGINAL instrumental pirate game soundtrack loop named "+m.name+".",
 "Mood: "+m.description+". Approximate tempo: "+m.bpm+" BPM.",
 "Warm hand-played fiddle, nautical wooden flute, pizzicato strings, soft hand drum, occasional brass; light-hearted mobile game timbre.",
 "Aim for a clean 45–70 second loop with consistent beats and a loopable ending.",
 "No vocals, no lyrics, no recognizable melodies, no references to existing copyrighted songs or game soundtracks.",
 "Keep dynamics moderate and leave space for cannons, wind and user-interface sound effects.",
 "Produce high-quality instrumental WAV and, if supported, separate music stems for calm/danger layering."
 ].join("\n");
}
function renderPrompt(){$("audioGenerationPrompt").value=productionPrompt();}
if(!moodRoot||!sfxRoot)return;
function renderMoods(){
 moodRoot.innerHTML="";
 for(const mood of audioData.moods){
  const b=document.createElement("button");
  b.className="audio-mood"+(lab.musicId===mood.id?" selected":"");
  b.setAttribute("aria-pressed",String(lab.musicId===mood.id));
  const top=document.createElement("strong");top.textContent=mood.name;
  const info=document.createElement("small");info.textContent=mood.bpm+" BPM · "+mood.description;
  b.append(top,info);
  b.addEventListener("click",()=>{
    $("audioAdaptiveMood").checked=false;
    lab.setMood(mood.id);renderMoods();renderPrompt();
    if(lab.playing)lab.playMusic();
    status("Mood: "+mood.name+". These are original preview motifs, not finished song files.");
  });
  moodRoot.append(b);
 }
}
function renderSfx(){
 for(const sound of audioData.sounds){
  const b=document.createElement("button");b.className="audio-sfx";
  const top=document.createElement("strong");top.textContent="▶ "+sound.name;
  const info=document.createElement("small");info.textContent=sound.kind+" · "+sound.id;
  b.title=sound.prompt;
  b.append(top,info);
  b.addEventListener("click",()=>{
   if(lab.muted){status("Tap Enable sound first to hear this effect.");return;}
   lab.event(sound.id);updateLog();status("Played: "+sound.name+". Prompt: "+sound.prompt);
  });
  sfxRoot.append(b);
 }
}
$("audioEnable").addEventListener("click",async()=>{
 const ctx=lab.start();
 if(!ctx){status("Web Audio is unavailable in this browser.");return;}
 try{await ctx.resume();}catch(err){status("Audio permission unavailable: "+err.message);return;}
 lab.setMute(false);
 $("audioEnable").textContent="✓ Sound enabled";
 status("Audio enabled. Original procedural sound sketches can now play.");
});
$("audioPlayMusic").addEventListener("click",()=>{
 if(!lab.playMusic()){status("Tap Enable sound first or use a browser with Web Audio.");return;}
 startAdaptive();
 status("Playing original mood sketch: "+lab.musicId+" · adaptive="+$("audioAdaptiveMood").checked);
});
$("audioStopMusic").addEventListener("click",()=>{
 lab.stopMusic();stopAdaptive();status("Music stopped.");
});
$("audioAdaptiveMood").addEventListener("change",e=>{
 if(e.target.checked){startAdaptive();status("Adaptive Sailing → Battle → Kraken mood test enabled.");}
 else status("Adaptive mood off. Select a mood to audition it manually.");
});
$("audioVolume").addEventListener("input",e=>{
 const n=Number(e.target.value);lab.setVolume(n/100);$("audioVolumeValue").textContent=n+"%";
});
$("musicVolume").addEventListener("input",e=>{
 const n=Number(e.target.value);lab.setMusicVolume(n/100);$("musicVolumeValue").textContent=n+"%";
});
function gameSound(id){
 if(!$("audioAutoEvents").checked)return false;
 const ok=lab.event(id);
 updateLog();return ok;
}
root.AllAboardPlaySfx=gameSound;
$("audioAutoEvents").addEventListener("change",e=>{
 status(e.target.checked?"Live event audio enabled (only after manually enabling audio).":"Live event audio disabled.");
});
renderMoods();renderSfx();renderPrompt();
$("audioCopyPrompt").addEventListener("click",()=>{
 const value=productionPrompt();
 if(navigator.clipboard?.writeText)
  navigator.clipboard.writeText(value).then(()=>status("Original music brief copied. Check generation/download/license terms before using it in Unity."))
    .catch(()=>status("Clipboard blocked; select and copy the prompt text manually."));
 else status("Select the prompt text to copy it manually.");
});
$("unityAssetUpload").addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>2_000_000){$("unityAuditStatus").textContent="Maximum file size 2 MB. Scan large projects in Unity Editor.";return;}
 try{
  const report=audit.auditUnityText(await file.text(),file.name);
  $("unityAuditStatus").textContent=file.name+": "+
   report.gameObjects+" GameObjects, "+report.monoBehaviours+" MonoBehaviours. Browser scan is advisory.";
  const host=$("unityAuditResults");host.innerHTML="";
  const p=document.createElement("p");p.textContent=report.caveat;host.append(p);
  for(const issue of report.issues){
   const div=document.createElement("div");div.className="audit-"+issue.severity;
   div.textContent=issue.severity.toUpperCase()+": "+issue.text+(issue.line?" · line "+issue.line:"");
   host.append(div);
  }
  if(!report.issues.length){
   const ok=document.createElement("div");ok.className="audit-info";
   ok.textContent="No obvious text-level anomalies detected. Unity Editor validation is still required.";
   host.append(ok);
  }
 }catch(err){$("unityAuditStatus").textContent="Cannot inspect this file: "+err.message;}
 e.target.value="";
});
$("unityExportChecklist").addEventListener("click",()=>{
 const lines=["# All Aboard Unity QA Review","- This checklist is a manual plan, not a run of Unity tests.",
  ...Array.from(document.querySelectorAll("#unityChecklist label")).map(label=>
   "- ["+(label.querySelector("input").checked?"x":" ")+"] "+label.textContent.trim())];
 const blob=new Blob([lines.join("\n")],{type:"text/markdown"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="all-aboard-unity-qa.md";document.body.append(a);a.click();a.remove();
 root.setTimeout(()=>URL.revokeObjectURL(url),500);
});
root.addEventListener?.("pagehide",()=>{stopAdaptive();lab.dispose();});
})(typeof window!=="undefined"?window:globalThis);
