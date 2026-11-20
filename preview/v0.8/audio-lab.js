/* All Aboard V0.7 Audio Lab — original procedural sound sketches.
 * Zero third-party samples. Music here is freshly composed test material.
 * AudioContext starts ONLY after a user gesture. Browser tab and game events
 * can route to the same SFX IDs. Replace with licensed files in Unity later.
 */
(function(root){
"use strict";
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const sounds=[
{id:"ui",name:"Button tap",kind:"Interface",prompt:"Soft wooden nautical UI tap, 0.15 seconds, crisp, warm, no music."},
{id:"coins",name:"Coins / treasure",kind:"Rewards",prompt:"Two playful gold coin chimes, short and bright, no voice."},
{id:"friend",name:"New friendship",kind:"Social",prompt:"Warm two-note friendship confirmation, wooden flute and bell, cheerful."},
{id:"follower",name:"Follower joins",kind:"Social",prompt:"Tiny triumphant horn reply as a friendly ship joins, upbeat."},
{id:"shot",name:"Cannon fire",kind:"Combat",prompt:"Short stylized pirate cannon blast, low punch then woody rattle, no speech."},
{id:"splash",name:"Projectile splash",kind:"Ocean",prompt:"Water splash with bubbly tail, 0.6 seconds, close perspective."},
{id:"anchor",name:"Anchor drop",kind:"Ocean",prompt:"Short chain rattle and heavy splash, stylized ocean."},
{id:"wind",name:"Wind gust",kind:"Ocean",prompt:"Gentle broad sea wind gust, airy sail flap, continuous subtle breeze."},
{id:"storm",name:"Storm gust",kind:"Ocean",prompt:"Stronger sea wind and sail flutter, distant thunder, no music."},
{id:"damage",name:"Hull damage",kind:"Combat",prompt:"Wooden ship hull crunch and creak, low thump, 0.5 seconds."},
{id:"repair",name:"Repair success",kind:"Combat",prompt:"Wood hammer taps and bright mechanical snap, tiny positive sound."},
{id:"kraken",name:"Kraken warning",kind:"Danger",prompt:"Deep underwater bubbly ominous call, pulsing and non-vocal."},
{id:"escape",name:"Escape grab",kind:"Danger",prompt:"Tentacle release watery whoosh and victorious tiny chime."},
{id:"stage",name:"Stage complete",kind:"Rewards",prompt:"Upbeat pirate stage complete trumpet and plucked strings, short sting."},
{id:"stay",name:"Risk: stay",kind:"Rewards",prompt:"Tense rising drum pattern with pirate instrumentation, 1 second."}
];
const moods=[
{id:"sailing",name:"Sunny Sailing",bpm:94,description:"Light fiddle + plucked strings, playful sea breeze",notes:[0,4,7,9,7,4,2,4],bass:[0,-5,-3,-5],root:196},
{id:"explore",name:"Treasure Hunt",bpm:106,description:"Pizzicato mystery and a small glockenspiel melody",notes:[0,3,7,10,7,5,3,0],bass:[0,-2,-5,-2],root:174.61},
{id:"storm",name:"Wind & Storm",bpm:112,description:"Low pulses, muted drum and uneasy strings",notes:[0,1,5,3,0,5,1,3],bass:[0,-5,-4,-5],root:146.83},
{id:"battle",name:"Naval Battle",bpm:128,description:"Short brass stabs and drum accents",notes:[0,7,5,3,7,8,7,3],bass:[0,-5,-7,-5],root:164.81},
{id:"friendship",name:"Friendly Fleet",bpm:100,description:"Warm optimistic flute-and-bell melody",notes:[0,4,7,11,9,7,4,2],bass:[0,-5,-3,-5],root:220},
{id:"kraken",name:"The Kraken",bpm:78,description:"Sparse dark underwater pulses and dissonance",notes:[0,1,6,1,0,-2,1,6],bass:[0,-6,-2,-6],root:110},
{id:"victory",name:"Stage Cleared",bpm:120,description:"Cheerful short pirate fanfare",notes:[0,4,7,12,7,9,12,7],bass:[0,-5,0,-5],root:220}
];
function midiHz(rootHz,semitones){return rootHz*Math.pow(2,semitones/12);}
class AudioLab{
constructor(){
 this.ctx=null;this.master=null;this.timer=null;this.step=0;
 this.musicId="sailing";this.volume=.32;this.musicVolume=.27;this.playing=false;
 this.muted=true;this.eventLog=[];this.lastTime=0;
}
start(){
 if(this.ctx)return this.ctx;
 const Audio=root.AudioContext||root.webkitAudioContext;
 if(!Audio)return null;
 this.ctx=new Audio();
 this.master=this.ctx.createGain();this.master.gain.value=clamp(this.volume,0,1);
 this.master.connect(this.ctx.destination);
 this.muted=false;
 return this.ctx;
}
tone(freq,duration=.12,style="sine",gain=.11,startTime=null){
 if(!this.ctx||!this.master)return;
 const ctx=this.ctx,time=startTime??ctx.currentTime;
 const osc=ctx.createOscillator(),vol=ctx.createGain();
 osc.type=style;osc.frequency.setValueAtTime(clamp(freq,40,2600),time);
 vol.gain.setValueAtTime(.0001,time);
 vol.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),time+.008);
 vol.gain.exponentialRampToValueAtTime(.0001,time+Math.max(.02,duration));
 osc.connect(vol);vol.connect(this.master);
 osc.start(time);osc.stop(time+Math.max(.025,duration)+.03);
}
noise(duration=.11,gain=.12,lowpass=1100){
 if(!this.ctx||!this.master)return;
 const sampleCount=Math.max(1,Math.floor(this.ctx.sampleRate*duration));
 const buffer=this.ctx.createBuffer(1,sampleCount,this.ctx.sampleRate);
 const data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),vol=this.ctx.createGain();
 source.buffer=buffer;filter.type="lowpass";filter.frequency.value=lowpass;
 vol.gain.setValueAtTime(gain,this.ctx.currentTime);
 vol.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+duration);
 source.connect(filter);filter.connect(vol);vol.connect(this.master);
 source.start();
}
event(id,force=false){
 const sound=sounds.find(x=>x.id===id);if(!sound)return false;
 this.eventLog.push({id,at:Date.now()});
 if(this.eventLog.length>40)this.eventLog.shift();
 if(this.muted&&!force)return true;
 if(!this.start())return false;
 const play=(f,d=.12,type="sine",g=.1,delay=0)=>this.tone(f,d,type,g,this.ctx.currentTime+delay);
 switch(id){
 case"ui":play(430,.07,"triangle",.055);break;
 case"coins":play(780,.13,"sine",.09);play(1046,.2,"sine",.11,.105);break;
 case"friend":play(440,.17,"triangle");play(554,.25,"sine",.09,.14);break;
 case"follower":play(330,.1,"sawtooth",.045);play(494,.16,"triangle",.08,.13);break;
 case"shot":this.noise(.27,.25,700);play(94,.3,"sawtooth",.19);break;
 case"splash":this.noise(.42,.18,1900);play(270,.24,"sine",.055);break;
 case"anchor":this.noise(.25,.16,950);play(119,.25,"triangle",.16);break;
 case"wind":this.noise(.6,.1,1000);break;
 case"storm":this.noise(.8,.18,780);play(65,.6,"sine",.07);break;
 case"damage":this.noise(.2,.17,460);play(115,.22,"triangle",.15);break;
 case"repair":play(392,.09,"triangle",.075);play(587,.13,"sine",.085,.12);break;
 case"kraken":play(93,.4,"sine",.19);play(98,.34,"triangle",.08,.13);break;
 case"escape":this.noise(.22,.09,1700);play(523,.16,"sine",.1,.18);break;
 case"stage":play(392,.12,"triangle");play(494,.15,"triangle",.09,.13);play(587,.25,"triangle",.095,.28);break;
 case"stay":play(147,.18,"triangle",.1);play(185,.2,"triangle",.09,.17);break;
 }
 return true;
}
setMood(id){if(moods.some(m=>m.id===id)){this.musicId=id;this.step=0;return true;}return false;}
setVolume(value){this.volume=clamp(Number(value)||0,0,1);if(this.master)this.master.gain.value=this.volume;}
setMusicVolume(value){this.musicVolume=clamp(Number(value)||0,0,1);}
tick(){
 if(!this.playing||!this.ctx||this.muted)return;
 const mood=moods.find(m=>m.id===this.musicId),step=this.step++;
 const now=this.ctx.currentTime;
 const index=step%mood.notes.length;
 const gain=this.musicVolume;
 const note=midiHz(mood.root,mood.notes[index]);
 this.tone(note,.18,"triangle",gain*.18,now);
 if(step%2===0)this.tone(midiHz(mood.root/2,mood.bass[Math.floor(step/2)%mood.bass.length]),.28,"sine",gain*.23,now);
 if(step%4===0&&this.musicId!=="kraken")this.tone(note*2,.08,"sine",gain*.09,now+.07);
}
playMusic(){
 if(!this.start())return false;
 this.stopMusic();this.playing=true;
 const bpm=moods.find(m=>m.id===this.musicId).bpm;
 this.tick();
 this.timer=root.setInterval?.(()=>this.tick(),60000/bpm/2)??null;
 return true;
}
stopMusic(){if(this.timer!==null)root.clearInterval?.(this.timer);this.timer=null;this.playing=false;}
setMute(value){this.muted=!!value;if(this.muted)this.stopMusic();}
dispose(){this.stopMusic();this.ctx?.close?.();}
}
root.AllAboardAudio={AudioLab,sounds,moods,midiHz};
if(typeof module!=="undefined"&&module.exports)module.exports={AudioLab,sounds,moods,midiHz};
})(typeof window!=="undefined"?window:globalThis);
