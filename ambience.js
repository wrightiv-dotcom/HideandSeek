/* Procedural ambient soundtrack and a short synthesized catch sting. */
let music=true,musicBus=null,musicNodes=[],musicNextNote=0;
const stingVoices=new Set();
function unlockAudio(){try{audio ||=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{})}catch{}}
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
function stopSting(){for(const v of stingVoices){try{v.o.stop()}catch{}v.o.disconnect();v.g.disconnect()}stingVoices.clear()}
function catchSting(){
 if(!sound)return;unlockAudio();if(!audio)return;
 for(const frequency of [73,147,311]){const time=audio.currentTime,o=audio.createOscillator(),g=audio.createGain(),v={o,g};o.type='sawtooth';o.frequency.setValueAtTime(frequency,time);o.frequency.exponentialRampToValueAtTime(frequency*.32,time+.8);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(.045,time+.025);g.gain.exponentialRampToValueAtTime(.0001,time+.9);o.connect(g);g.connect(audio.destination);stingVoices.add(v);o.onended=()=>{o.disconnect();g.disconnect();stingVoices.delete(v)};o.start(time);o.stop(time+1)}
}
