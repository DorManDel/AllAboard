/* All Aboard Audio Lab V0.7 — original synthesized placeholders + local file auditions.
 * No external copyrighted tracks, no remote uploads or hidden autoplay.
 * The short instrumental loops are ORIGINAL TEST SKETCHES, not finished music.
 */
(function(root){
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cues=[
  {id:"ui-tap",name:"Button tap",category:"UI",desc:"Short crisp acknowledgement"},
  {id:"ui-switch",name:"Mode toggle",category:"UI",desc:"Soft two-note confirmation"},
  {id:"cannon",name:"Cannon fire",category:"Combat",desc:"Low punch + broadband burst"},
  {id:"hit",name:"Hull impact",category:"Combat",desc:"Wood crunch and dull thud"},
  {id:"splash",name:"Water impact",category:"Environment",desc:"Soft rolling noise burst"},
  {id:"wind",name:"Wind gust",category:"Environment",desc:"Filtered moving noise"},
  {id:"wave",name:"Large wave",category:"Environment",desc:"Deep wash with soft low end"},
  {id:"sail",name:"Sail trim",category:"Sailing",desc:"Fabric flutter and rope pull"},
  {id:"anchor",name:"Anchor drop",category:"Sailing",desc:"Metal clink and chain"},
  {id:"treasure",name:"Treasure found",category:"Rewards",desc:"Warm ascending chime"},
  {id:"friend",name:"Friendship formed",category:"Social",desc:"Gentle cooperative jingle"},
  {id:"repair",name:"Repair complete",category:"Rewards",desc:"Wood tap and uplifting tone"},
  {id:"kraken",name:"Kraken warning",category:"Danger",desc:"Low dissonant rising signal"},
  {id:"victory",name:"Victory",category:"Rewards",desc:"Short triumphant flourish"}
];
const moods=[
  {id:"calm",name:"Calm Sailing",bpm:86,root:50,notes:[0,4,7,12,7,4,2,7],chords:[[0,4,7],[-3,0,4]],desc:"A warm nautical plucked-string sketch"},
  {id:"explore",name:"Island Exploration",bpm:108,root:52,notes:[0,3,7,10,7,3,5,7],chords:[[0,3,7],[-2,2,5]],desc:"Lively coastal discovery"},
  {id:"combat",name:"Broadside Battle",bpm:136,root:45,notes:[0,0,3,7,5,3,0,-2],chords:[[0,3,7],[-2,2,5]],desc:"Tense driving percussion + short motif"},
  {id:"kraken",name:"Kraken Encounter",bpm:78,root:43,notes:[0,1,6,5,1,0,-2,1],chords:[[0,1,6],[-1,2,7]],desc:"Uneasy deep-sea motif"},
  {id:"victory",name:"Victory & Port",bpm:114,root:53,notes:[0,4,7,12,11,7,4,12],chords:[[0,4,7],[5,9,12]],desc:"Short celebratory harbour sketch"}
];
function mixVolumes(master,sfx,music){
  return{effect:clamp(master,0,1)*clamp(sfx,0,1),
    music:clamp(master,0,1)*clamp(music,0,1)};
}
class AudioDirector{
  constructor(){
    this.ctx=null;this.enabled=false;this.master=.55;this.sfx=.75;this.music=.35;
    this.mood="calm";this.looping=false;this.interval=null;this.beat=0;this.lastEvent="";
    this.musicFile=null;this.fileUrl=null;this.fileMood="calm";this.buffer=null;
    this.player=null;this.musicVoices=[];
  }
  enable(){
    const Ctx=root.AudioContext||root.webkitAudioContext;
    if(!Ctx)return false;
    if(!this.ctx){
      this.ctx=new Ctx();
      const bytes=this.ctx.sampleRate;
      this.buffer=this.ctx.createBuffer(1,bytes,bytes);
      const data=this.buffer.getChannelData(0);
      // Deterministic LCG noise, so the test timbre is reproducible.
      let seed=0x5EED1234;
      for(let i=0;i<data.length;i++){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        data[i]=((seed/4294967296)*2-1);
      }
    }
    if(this.ctx.state==="suspended")this.ctx.resume();
    this.enabled=true;return true;
  }
  gainFor(type){return mixVolumes(this.master,this.sfx,this.music)[type];}
  beep(freq,duration=.15,kind="triangle",level=.25,when=null,glide=0){
    if(!this.ctx)return;
    const c=this.ctx,now=when??c.currentTime,osc=c.createOscillator(),gain=c.createGain();
    osc.type=kind;osc.frequency.setValueAtTime(Math.max(30,freq),now);
    if(glide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*glide),now+duration);
    const volume=Math.max(.0001,level);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(volume,now+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(c.destination);
    osc.start(now);osc.stop(now+duration+.02);
  }
  noise(duration=.3,pitch=700,level=.13,when=null){
    if(!this.ctx||!this.buffer)return;
    const c=this.ctx,now=when??c.currentTime;
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=this.buffer;filter.type="lowpass";filter.frequency.setValueAtTime(pitch,now);
    gain.gain.setValueAtTime(Math.max(.0001,level),now);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(c.destination);
    source.start(now);source.stop(now+duration);
  }
  play(id){
    if(!this.enabled||!this.ctx)return false;
    const g=this.gainFor("effect"),now=this.ctx.currentTime;
    if(g<=0)return false;
    const tone=(hz,dur,w="triangle",vol=.22,shift=0,glide=0)=>
      this.beep(hz,dur,w,g*vol,now+shift,glide);
    const rustle=(dur,cutoff,vol,shift=0)=>this.noise(dur,cutoff,g*vol,now+shift);
    switch(id){
      case "ui-tap":tone(670,.055,"sine",.18);break;
      case "ui-switch":tone(540,.07,"sine",.15);tone(760,.10,"sine",.13,.09);break;
      case "cannon":tone(100,.36,"sawtooth",.40,0,.38);rustle(.35,390,.37);break;
      case "hit":tone(120,.22,"square",.17,0,.45);rustle(.16,800,.30);break;
      case "splash":rustle(.56,820,.16);tone(120,.30,"sine",.08,0,.65);break;
      case "wind":rustle(.78,1450,.11);break;
      case "wave":rustle(.85,420,.17);tone(55,.7,"sine",.07);break;
      case "sail":rustle(.17,2300,.11);tone(230,.13,"triangle",.05);break;
      case "anchor":tone(280,.26,"triangle",.28,0,.42);tone(530,.15,"sine",.07,.1);break;
      case "treasure":tone(523,.16,"sine",.20);tone(659,.16,"sine",.18,.12);tone(784,.26,"sine",.18,.26);break;
      case "friend":tone(392,.16,"triangle",.14);tone(494,.16,"triangle",.15,.17);tone(587,.24,"triangle",.18,.34);break;
      case "repair":tone(260,.1,"triangle",.10);tone(660,.22,"sine",.13,.11);break;
      case "kraken":tone(70,.66,"sawtooth",.25,0,1.6);tone(81,.56,"sine",.13);break;
      case "victory":[392,523,659,784].forEach((n,i)=>tone(n,.23,"triangle",.17,i*.13));break;
      default:return false;
    }
    this.lastEvent=id;
    return true;
  }
  static midi(m){return 440*Math.pow(2,(m-69)/12);}
  playNote(midi,time,duration=.18,volume=.15){
    if(!this.ctx)return;
    const hz=AudioDirector.midi(midi);
    this.beep(hz,duration,"triangle",this.gainFor("music")*volume,time);
  }
  playBeat(){
    if(!this.looping||!this.enabled||!this.ctx)return;
    const mood=moods.find(x=>x.id===this.mood)||moods[0];
    const now=this.ctx.currentTime+.02;
    const beatLength=60/mood.bpm;
    const ix=this.beat%8,n=mood.notes[ix];
    this.playNote(mood.root+n,now,beatLength*.75,.35);
    if(ix%2===0)this.playNote(mood.root-12+mood.chords[Math.floor(this.beat/8)%2][0],now,beatLength*.9,.16);
    if(["combat","kraken"].includes(mood.id)&&ix%2===0)
      this.noise(.09,300,this.gainFor("music")*.12,now);
    this.beat++;
  }
  stop(){
    if(this.interval!==null){root.clearInterval(this.interval);this.interval=null;}
    this.looping=false;this.beat=0;
    if(this.player){this.player.pause();this.player.currentTime=0;}
  }
  startMood(id){
    if(!moods.some(x=>x.id===id))return false;
    this.stop();if(!this.enable())return false;
    this.mood=id;
    if(this.musicFile&&this.fileMood===id&&this.player){
      this.player.volume=this.gainFor("music");
      this.player.currentTime=0;this.player.loop=true;
      this.player.play().catch(()=>{});
      this.looping=true;return true;
    }
    this.looping=true;this.playBeat();
    const bpm=moods.find(x=>x.id===id).bpm;
    this.interval=root.setInterval(()=>this.playBeat(),60000/bpm);
    return true;
  }
  setTrack(file,mood){
    if(!file||!file.type.startsWith("audio/")||file.size>20*1024*1024)
      throw Error("Choose an audio file under 20 MB.");
    if(this.fileUrl)URL.revokeObjectURL(this.fileUrl);
    this.stop();this.fileUrl=URL.createObjectURL(file);
    this.musicFile=file.name;this.fileMood=mood;
    this.player=new Audio(this.fileUrl);this.player.loop=true;
  }
  dispose(){this.stop();if(this.fileUrl)URL.revokeObjectURL(this.fileUrl);}
}
class AudioLab{
  constructor(director=new AudioDirector()){this.director=director;}
  $(id){return document.getElementById(id);}
  mount(){
    if(!this.$("audioEnable"))return;
    const list=this.$("audioCues");
    for(const cue of cues){
      const button=document.createElement("button");button.className="audio-cue";
      button.innerHTML="<strong>"+cue.name+"</strong><small>"+cue.category+" · "+cue.desc+"</small>";
      button.addEventListener("click",()=>{
        if(!this.director.enabled)this.director.enable();
        this.director.play(cue.id);
        this.$("audioStatus").textContent="Tested "+cue.name+". Original synthesized placeholder; tune before exporting to Unity.";
      });
      list.append(button);
    }
    const mood=this.$("audioMood");
    for(const entry of moods){
      const o=document.createElement("option");o.value=entry.id;o.textContent=entry.name;mood.append(o);
    }
    this.$("audioEnable").addEventListener("click",()=>{
      const ok=this.director.enable();
      this.$("audioStatus").textContent=ok?"Audio enabled by user gesture. Try a cue.":"Web Audio not available on this device.";
    });
    this.$("audioMoodStart").addEventListener("click",()=>{
      const id=mood.value;
      if(this.director.startMood(id))this.$("audioStatus").textContent=
        "Playing "+moods.find(x=>x.id===id).name+" — "+(this.director.musicFile&&this.director.fileMood===id?"your local track":"original procedural TEST sketch")+".";
    });
    this.$("audioMoodStop").addEventListener("click",()=>{this.director.stop();this.$("audioStatus").textContent="Music stopped.";});
    for(const name of ["master","sfx","music"]){
      const node=this.$("audio"+name[0].toUpperCase()+name.slice(1));
      node.value=Math.round(this.director[name]*100);
      node.addEventListener("input",e=>{
        this.director[name]=clamp(Number(e.target.value)/100,0,1);
        if(this.director.player)this.director.player.volume=this.director.gainFor("music");
      });
    }
    this.$("audioFile").addEventListener("change",e=>{
      const f=e.target.files?.[0];if(!f)return;
      try{
        this.director.setTrack(f,mood.value);
        this.$("audioStatus").textContent="Loaded "+f.name+" locally for "+mood.value+". File stays on this device.";
      }catch(err){this.$("audioStatus").textContent=err.message;}
      e.target.value="";
    });
    this.$("audioExport").addEventListener("click",()=>{
      const data={version:1,name:"All Aboard Audio Event Map",cues,moods,
        volumes:{master:this.director.master,sfx:this.director.sfx,music:this.director.music},
        localTrackName:this.director.musicFile||null,
        note:"Browser-generated cues are test audio, not final Unity WAV assets."};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download="all-aboard-audio-events.json";
      document.body.append(a);a.click();a.remove();
      root.setTimeout(()=>URL.revokeObjectURL(url),450);
    });
    root.AllAboardAudioInstance=this.director;
  }
}
root.AllAboardAudio={AudioDirector,AudioLab,cues,moods,mixVolumes};
if(typeof module!=="undefined"&&module.exports)module.exports={AudioDirector,AudioLab,cues,moods,mixVolumes};
if(typeof document!=="undefined"){
  const boot=()=>new AudioLab().mount();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
}
})(typeof window!=="undefined"?window:globalThis);
