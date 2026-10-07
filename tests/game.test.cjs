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
 vm.createContext(sandbox);for(const file of ['characters.js','motion.js','renderer.js','gpu.js','ambience.js','game.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox);
 return {run:code=>vm.runInContext(code,sandbox),store,elements};
}
const game=boot();
game.run(`
 assert.equal(mode,'home');assert.equal(best,0);assert.equal(selectStage(2),false);assert.equal(profile.outfit,'field');
 renderStages();assert.equal($('stageGrid').children[1].disabled,true);
 $('start').onclick();assert.equal(mode,'playing');assert.equal(music,true);updateMusic();assert(musicBus);let count=musicNodes.length;updateMusic();assert.equal(musicNodes.length,count);draw();assert.equal(VIEW.w,1000);assert.equal(VIEW.texture.width,512);assert.equal(VIEW.sprites.enemy.width,576);
 assert.equal(VIEW.enemyFrames.length,4);for(const gender of ['male','female']){profile.gender=gender;for(const outfit of ['field','padded','tactical']){profile.outfit=outfit;for(const hair of ['short','long','hood']){profile.hair=hair;characterUI();draw()}}}persist();assert.equal(JSON.parse(localStorage.getItem(KEY)).profile.outfit,'tactical');assert.equal(JSON.parse(localStorage.getItem(KEY)).profile.gender,'female');
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
const motionGame=boot();motionGame.run(`
makeWorld();world.furniture=[];world.size=9;world.grid=Array.from({length:9},(_,y)=>Array.from({length:9},(_,x)=>x===0||x===8||y===0||y===8?1:0));world.player={x:4.5,y:4.5,angle:0};world.enemy={x:7.5,y:7.5,state:'patrol',target:null,timer:0};
updateLocomotion(world.player,{x:4.24,y:4.5},.1);assert.equal(world.player.motion,1);assert.equal(world.player.running,false);const walkingPhase=world.player.gaitPhase;
updateLocomotion(world.player,{x:4.5,y:4.5},.1);assert.equal(world.player.motion,0);assert.equal(world.player.gaitPhase,walkingPhase);
updateLocomotion(world.player,{x:4.08,y:4.5},.1);assert.equal(world.player.running,true);assert(world.player.gaitPhase>walkingPhase);
updateLocomotion(world.enemy,{x:7.4,y:7.5},.1,true,true);assert.equal(world.enemy.running,true);draw();assert.equal(VIEW.enemyWalkFrames.length,12);assert.equal(VIEW.enemyRunFrames.length,12);assert.equal(getEnemySprite(world.enemy),VIEW.enemyRunFrames[Math.floor(world.enemy.gaitPhase*12/(Math.PI*2))%12]);
assert.equal(getCameraPose().x,world.player.x);setCameraMode('third');assert.equal($('cameraSetting').value,'third');let camera=getCameraPose();assert(camera.distance>1.5);assert(valid(camera.x,camera.y));assert.equal(camera.height,.62);assert.equal(JSON.parse(localStorage.getItem(KEY)).settings.cameraMode,'third');draw();assert.equal(VIEW.playerSprite.width,576);
world.grid[4][3]=1;camera=getCameraPose();assert(camera.distance<.4);assert(valid(camera.x,camera.y));for(let d=0;d<=camera.distance;d+=.02)assert(valid(world.player.x-d,world.player.y));draw();
world.player.x=4.2;world.player.gaitPhase=1;keys={s:true};mode='playing';tick(.04);assert.equal(world.player.motion,0);assert.equal(world.player.gaitPhase,1);keys={};
`);
const cameraSave=JSON.parse(motionGame.store['hollow-house-v1']);boot(cameraSave).run(`assert.equal(cameraMode,'third');assert.equal($('cameraView').value,'third');`);
console.log('PASS: movement-driven walk/run cycles, planted idle feet, blocked movement, enemy gait frames, wall-safe third-person camera, close-camera rendering and saved view choice.');
const hidingGame=boot();hidingGame.run(`
 makeWorld();assert(world.furniture.some(item=>item.type==='wardrobe'));assert(world.furniture.some(item=>item.type==='cabinet'));assert(Number.isInteger(world.decorSeed));
 const originals=world.furniture;decorateMaze();assert.equal(world.furniture,originals);
 world.size=9;world.grid=Array.from({length:9},(_,y)=>Array.from({length:9},(_,x)=>x===0||x===8||y===0||y===8?1:0));
 world.furniture=[{id:'test-wardrobe',type:'wardrobe',x:2.5,y:3.5,nx:1,ny:0,height:.93}];world.player={x:3.5,y:3.5,angle:Math.PI};world.enemy={x:7.5,y:7.5,state:'patrol',target:null,timer:0};mode='playing';
 assert.equal(valid(2.5,3.5),false);assert.equal(valid(3.5,3.5),true);assert.equal(sees({x:1.5,y:3.5},world.player),false);
 assert.equal(nearbyWardrobe().id,'test-wardrobe');assert.equal(toggleHiding(),true);assert.equal(world.player.hidingSeen,false);assert.equal(flashlightOn,false);
 const before={x:world.player.x,y:world.player.y};keys={w:true,shift:true};world.enemy={...before,state:'patrol',target:null,timer:0};tick(.04);assert.equal(mode,'playing');assert.deepEqual({x:world.player.x,y:world.player.y},before);
 persist();draw();assert.equal(VIEW.normalWalls.length,11);assert.equal(VIEW.furnitureMaterials.wardrobe.width,512);
`);
const hiddenSave=JSON.parse(hidingGame.store['hollow-house-v1']);boot(hiddenSave).run(`assert.equal(world.player.hidingId,'test-wardrobe');assert.equal(world.furniture[0].id,'test-wardrobe');`);
hidingGame.run(`
 assert.equal(toggleHiding(),true);assert.equal(world.player.hidingId,undefined);assert.equal(flashlightOn,true);
 world.enemy={x:4.5,y:3.5,state:'chase',target:{...world.player},timer:4};assert.equal(toggleHiding(),true);assert.equal(world.player.hidingSeen,true);
 setEffects(true);world.enemy.x=world.player.x;world.enemy.y=world.player.y;tick(0);assert.equal(mode,'scare');assert.equal(stingVoices.size,3);assert([...stingVoices].every(voice=>voice.sources.length===2));
 setEffects(false);assert.equal(stingVoices.size,0);finishJumpscare();
`);
console.log('PASS: solid furniture/line-of-sight, wardrobe entry/exit, hidden movement lock, unseen protection, seen-entry capture, saved hiding state, varied pictures, and catch-scream mute cleanup.');
const timerGame=boot(hiddenSave);timerGame.run(`
 mode='playing';world.player.hidingSeconds=0;tick(3);assert.equal(world.player.hidingSeconds,3);assert.equal(canvas.style.filter,'none');
 tick(3);assert.equal(world.player.hidingSeconds,6);assert.match(canvas.style.filter,/blur/);persist();
 pause();frame(1000);assert.equal(world.player.hidingSeconds,6);
`);
const timedSave=JSON.parse(timerGame.store['hollow-house-v1']);boot(timedSave).run(`assert.equal(world.player.hidingSeconds,6);`);
timerGame.run(`
 $('start').onclick();tick(3.99);assert.equal(mode,'playing');tick(.01);assert.equal(mode,'scare');assert.equal(deathReason,'wardrobe');assert.equal(world,null);assert.equal(canvas.style.filter,'none');
 finishJumpscare();assert.equal(mode,'dead');assert.equal($('overlayTitle').textContent,'Your air ran out.');
`);
const escapeGame=boot(hiddenSave);escapeGame.run(`mode='playing';world.player.hidingSeconds=9;updateUI();assert.equal(toggleHiding(),true);assert.equal(world.player.hidingSeconds,undefined);assert.equal(canvas.style.filter,'none');assert.equal(toggleHiding(),true);assert.equal(world.player.hidingSeconds,0);`);
console.log('PASS: 10-second hiding deadline, progressive blur, pause freeze, elapsed-time saves, automatic death, effect cleanup, and leave/re-enter reset.');
