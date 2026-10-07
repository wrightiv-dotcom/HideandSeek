/* Procedural ambient soundtrack and a short synthesized catch sting. */
let music=true,musicBus=null,musicNodes=[],musicNextNote=0;
const stingVoices=new Set();
function unlockAudio(){try{audio ||=new(window.AudioContext||window.webkitAudioContext)();audio.resume().then(()=>{if(typeof syncTitleAudio==='function')syncTitleAudio()}).catch(()=>{})}catch{}}
function stopMusic(){if(!musicBus)return;for(const node of musicNodes){try{node.stop()}catch{}node.disconnect()}musicNodes=[];musicBus.disconnect();musicBus=null;musicNextNote=0}
function startMusic(){
 if(musicBus||!audio||audio.state!=='running')return;
 musicBus=audio.createGain();musicBus.gain.setValueAtTime(.0001,audio.currentTime);musicBus.gain.linearRampToValueAtTime(.16,audio.currentTime+2);musicBus.connect(audio.destination);
 for(const [frequency,volume] of [[55,.25],[82.41,.12],[110.7,.08]]){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=frequency;g.gain.value=volume;o.connect(g);g.connect(musicBus);o.start();musicNodes.push(o,g)}
 musicNextNote=audio.currentTime+1;
}
function updateMusic(){
 if(!music||document.hidden){stopMusic();return}startMusic();if(!musicBus||audio.currentTime<musicNextNote)return;
 const time=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=[164.81,174.61,220,233.08,329.63][Math.floor(Math.random()*5)];
 g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(.15,time+.6);g.gain.exponentialRampToValueAtTime(.0001,time+4);o.connect(g);g.connect(musicBus);musicNodes.push(o,g);
 o.onended=()=>{o.disconnect();g.disconnect();musicNodes=musicNodes.filter(n=>n!==o&&n!==g)};o.start(time);o.stop(time+4.1);musicNextNote=time+3+Math.random()*3;
}
function stopSting(){for(const v of stingVoices){for(const source of v.sources||[v.o]){try{source.stop()}catch{}}for(const node of v.nodes||[v.o,v.g])node.disconnect()}stingVoices.clear()}
function catchSting(){
 if(!sound)return;unlockAudio();if(!audio)return;
 for(const [frequency,volume] of [[840,.14],[1290,.095],[1910,.06]]){
  const time=audio.currentTime,o=audio.createOscillator(),g=audio.createGain(),vibrato=audio.createOscillator(),mod=audio.createGain(),v={o,g,sources:[o,vibrato],nodes:[o,g,vibrato,mod]};
  o.type='sawtooth';o.frequency.setValueAtTime(frequency,time);o.frequency.exponentialRampToValueAtTime(frequency*1.65,time+.12);o.frequency.exponentialRampToValueAtTime(frequency*.72,time+1.15);
  vibrato.frequency.value=32;mod.gain.value=frequency*.045;vibrato.connect(mod);mod.connect(o.frequency);
  g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.018);g.gain.exponentialRampToValueAtTime(.0001,time+1.2);
  o.connect(g);g.connect(audio.destination);stingVoices.add(v);o.onended=()=>{for(const node of v.nodes)node.disconnect();stingVoices.delete(v)};o.start(time);vibrato.start(time);o.stop(time+1.25);vibrato.stop(time+1.25);
 }
}
