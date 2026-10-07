// Run with: node tests/game.test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},gradient={addColorStop:noop};
const context=new Proxy({}, {get:(t,k)=>k==='createRadialGradient'||k==='createLinearGradient'?()=>gradient:k==='createImageData'?(w,h)=>({data:new Uint8ClampedArray(w*h*4)}):k==='getImageData'?(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}):noop,set:()=>true});
function element(){return {dataset:{},style:{},children:[],value:'',open:false,classList:{add:noop,remove:noop,toggle:noop},getContext:()=>context,addEventListener:noop,setAttribute:noop,append(b){this.children.push(b)},replaceChildren(){this.children=[]},showModal(){this.open=true},close(){this.open=false}}}
function boot(saved){
 const elements={},store={};if(saved)store['hollow-house-v1']=JSON.stringify(saved);
 const param=()=>({value:0,setValueAtTime:noop,linearRampToValueAtTime:noop,exponentialRampToValueAtTime:noop});
 const node=()=>({gain:param(),frequency:param(),pan:param(),playbackRate:param(),connect:noop,disconnect:noop,start:noop,stop:noop});
 class AudioContext{constructor(){this.state='running';this.currentTime=0;this.destination={};this.sampleRate=44100}resume(){return Promise.resolve()}createOscillator(){return node()}createGain(){return node()}createStereoPanner(){return node()}createBiquadFilter(){return node()}createBufferSource(){return node()}createBuffer(n,size){return {getChannelData:()=>new Float32Array(size)}}}
const sandbox={assert,console,Math,JSON,Set,Map,Float32Array,Uint8ClampedArray,performance:{now:()=>0},document:{hidden:false,activeElement:{tagName:'BODY'},createElement:element,getElementById:id=>elements[id]||(elements[id]=element()),querySelectorAll:()=>[],addEventListener:noop},window:{AudioContext,addEventListener:noop},localStorage:{getItem:k=>store[k],setItem:(k,v)=>store[k]=v},requestAnimationFrame:noop,setInterval:noop,confirm:()=>true};
 vm.createContext(sandbox);for(const file of ['renderer.js','ambience.js','game.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox);
 return {run:code=>vm.runInContext(code,sandbox),store,elements};
}
const game=boot();
game.run(`
 assert.equal(mode,'home');assert.equal(best,0);assert.equal(selectStage(2),false);
 renderStages();assert.equal($('stageGrid').children[1].disabled,true);
 $('start').onclick();assert.equal(mode,'playing');assert.equal(music,true);updateMusic();assert(musicBus);let count=musicNodes.length;updateMusic();assert.equal(musicNodes.length,count);draw();assert.equal(VIEW.w,1000);assert.equal(VIEW.texture.width,512);assert.equal(VIEW.sprites.enemy.width,576);
 const clearStage=()=>{world.relics.forEach(r=>r.taken=true);world.player={...world.exit};world.enemy={x:1.5,y:1.5,state:'patrol',target:null,timer:0};tick(0)};
 clearStage();assert.equal(best,1);assert.equal(level,2);assert.equal(mode,'won');assert.equal(selectStage(3),false);
 $('start').onclick();world.player.angle=.8;persist();const stageTwo=world;
 assert.equal(selectStage(1),true);$('start').onclick();clearStage();assert.equal(best,1);assert.equal(stageSaves[2],stageTwo);
 assert.equal(selectStage(2),true);assert.equal(world,stageTwo);assert.equal(world.player.angle,.8);
 $('start').onclick();openMenu('settingsDialog');assert.equal(mode,'paused');assert.equal($('settingsDialog').open,true);
 $('musicToggle').onchange({target:{checked:false}});assert.equal(music,false);assert.equal(musicBus,null);
 $('effectsToggle').onchange({target:{checked:true}});assert.equal(sound,true);$('settingsHome').onclick();assert.equal(mode,'home');assert.equal(world,stageTwo);
 selectStage(1);$('start').onclick();persist();assert(stageSaves[1]);assert(stageSaves[2]);world.enemy={...world.player,state:'patrol',target:null,timer:0};tick(0);
 assert.equal(mode,'scare');assert.equal(world,null);assert.equal(stageSaves[1],undefined);assert(stageSaves[2]);assert.equal(stingVoices.size,3);draw();
 setEffects(false);assert.equal(stingVoices.size,0);finishJumpscare();assert.equal(mode,'dead');assert.equal(best,1);
 selectStage(2);$('start').onclick();clearStage();assert.equal(best,2);assert.equal(level,3);assert.equal(selectStage(4),false);assert.equal(selectStage(3),true);
`);
const saved=JSON.parse(game.store['hollow-house-v1']);
const restored=boot(saved);restored.run(`assert.equal(best,2);assert.equal(level,3);assert.equal(sound,false);assert.equal(music,false);assert.equal(mode,'home');`);
const legacy=boot({best:4,level:5,profile:{name:'Legacy'},world:null});legacy.run(`assert.equal(best,4);assert.equal(level,5);assert.equal(profile.name,'Legacy');assert.equal(selectStage(6),false);assert.equal(selectStage(4),true);`);
console.log('PASS: stage locks, sequential unlocks, replay progress, separate saved runs, settings/home, soundtrack, catch jumpscare, mute cleanup, reload and legacy saves.');
