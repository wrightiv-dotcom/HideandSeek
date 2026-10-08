/* Hollow House: standalone canvas game, no build step required. */
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const fullscreenButton=$('fullscreenButton'),gameView=$('gameView');
function syncFullscreen(){
 const active=!!document.fullscreenElement;
 fullscreenButton.textContent=active?'Exit fullscreen':'Fullscreen';
 fullscreenButton.setAttribute('aria-pressed',String(active));
}
fullscreenButton.hidden=!gameView?.requestFullscreen||!document.exitFullscreen||document.fullscreenEnabled===false;
fullscreenButton.onclick=async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else await gameView.requestFullscreen();
  fullscreenButton.removeAttribute('title');
 }catch{fullscreenButton.title='Fullscreen could not open. Try again in your browser.'}
 syncFullscreen();
};
document.addEventListener('fullscreenchange',syncFullscreen);
syncFullscreen();
const WALLET_KEY='hollow-house-wallet-v1';let wallet={coins:0,upgrades:{}};try{const saved=JSON.parse(localStorage.getItem(WALLET_KEY));if(saved)wallet={coins:Math.max(0,Math.floor(Number(saved.coins)||0)),upgrades:saved.upgrades||{}};}catch{}
const SHOP_ITEMS=[{id:'relicFinder',name:'Relic Finder',price:200,description:'Reveal every remaining relic on the full maze map in both modes.'},{id:'enemyTracker',name:'Slenderman Tracker',price:300,description:'Track Slenderman on the full maze map in both modes.'},{id:'quietBoots',name:'Quiet Boots',price:250,description:'Reduce the distance at which Slenderman hears you sprinting.'}];
function saveWallet(){try{localStorage.setItem(WALLET_KEY,JSON.stringify(wallet))}catch{}syncEconomy();}
function syncEconomy(){for(const id of ['menuCoins','gameCoins','shopCoins'])$(id).textContent=wallet.coins+' coins';const hearts=world?.lives??((mode==='dead'||mode==='scare')?0:3);$('hearts').textContent=String.fromCharCode(0x2665).repeat(hearts)+String.fromCharCode(0x2661).repeat(3-hearts);$('hearts').setAttribute('aria-label',hearts+' of 3 hearts');$('mapButton').hidden=!world||!(wallet.upgrades.relicFinder||wallet.upgrades.enemyTracker);}

function renderShop(){syncEconomy();const grid=$('shopItems');grid.replaceChildren();for(const item of SHOP_ITEMS){const card=document.createElement('div');card.className='shop-card';const owned=!!wallet.upgrades[item.id];card.innerHTML='<h3>'+item.name+'</h3><p>'+item.description+'</p><strong>'+item.price+' coins</strong>';const button=document.createElement('button');button.className='haunt-button';button.textContent=owned?'Owned':wallet.coins<item.price?'Need '+(item.price-wallet.coins)+' more coins':'Buy';button.disabled=owned||wallet.coins<item.price;button.onclick=()=>buyUpgrade(item.id);card.append(button);grid.append(card);}}
function buyUpgrade(id){const item=SHOP_ITEMS.find(i=>i.id===id);if(!item||wallet.upgrades[id]||wallet.coins<item.price)return false;wallet.coins-=item.price;wallet.upgrades[id]=true;saveWallet();renderShop();return true;}
let shopReturn='titleWelcome';
let KEY='hollow-house-v1';
const COLORS=['#c6e69a','#c28d74','#9abccc','#b39acd','#e0bd68'];
let difficulty='normal',deviceMode='computer',flashlightOn=true,joystickInput={forward:0,strafe:0},joystickPointer=null;
let falseScareTime=0,psychoCountdown=12,screamCountdown=7;
let deathReason='caught';
function updateHidingLimit(dt){
 if(!world?.player.hidingId)return false;
 const p=world.player;p.hidingSeconds=(p.hidingSeconds||0)+dt;
 if(p.hidingSeconds>=10-1e-6){beginJumpscare('wardrobe');updateUI();return true}
 return false;
}
function resetJoystick(){joystickInput={forward:0,strafe:0};joystickPointer=null;$('joystickKnob').style.transform='translate(0px,0px)'}
function setDevice(value){
 deviceMode=value==='phone'?'phone':'computer';resetJoystick();keys={};resetJoystick();
 document.body?.classList.toggle('phone-mode',deviceMode==='phone');
 $('controlsButton').textContent='Controls: '+deviceMode;
 $('titleControls').textContent=deviceMode==='phone'?'Drag the joystick to move · swipe the scene to look · tap Light for flashlight':'WASD to move · mouse to look · F for flashlight · Shift to sprint';
 $('phoneControls').hidden=deviceMode!=='phone'||mode!=='playing';
}
function syncFlashlight(){
 $('flashlightButton').textContent='Flashlight: '+(flashlightOn?'on':'off')+' (F)';
 $('phoneFlashlight').textContent='Light: '+(flashlightOn?'on':'off');
 for(const id of ['flashlightButton','phoneFlashlight'])$(id).setAttribute('aria-pressed',String(flashlightOn));
 $('modeLabel').textContent=difficulty.toUpperCase()+' MODE';
}
function toggleFlashlight(){if(world?.player.hidingId)return;flashlightOn=!flashlightOn;syncFlashlight()}
function furnitureBounds(item){
 const depth=item.type==='wardrobe'?.64:.62,width=item.type==='wardrobe'?.84:.72;
 return item.nx?{minX:item.x-depth/2,maxX:item.x+depth/2,minY:item.y-width/2,maxY:item.y+width/2}:{minX:item.x-width/2,maxX:item.x+width/2,minY:item.y-depth/2,maxY:item.y+depth/2};
}
function blocksFurniture(x,y,r=0,ignoreId=null){return (world?.furniture||[]).some(item=>{if(item.id===ignoreId)return false;const b=furnitureBounds(item);return x>b.minX-r&&x<b.maxX+r&&y>b.minY-r&&y<b.maxY+r})}
function decorateMaze(){
 if(!world||Array.isArray(world.furniture))return;
 world.decorSeed??=Math.floor(Math.random()*2147483647);world.furniture=[];
 const {grid,size}=world,candidates=[];
 for(let y=2;y<size-2;y++)for(let x=2;x<size-2;x++)if(grid[y][x]===1){
  const exits=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>grid[y+dy][x+dx]===0);
  if(exits.length===1){const [nx,ny]=exits[0];candidates.push({x,y,nx,ny})}
 }
 candidates.sort(()=>Math.random()-.5);
 for(const spot of candidates.slice(0,Math.min(14,5+Math.floor(size/2)))){
  // Carve furniture alcoves without obstructing the original maze routes.
  grid[spot.y][spot.x]=0;
  const index=world.furniture.length,type=index%3===2?'cabinet':'wardrobe';
  world.furniture.push({id:'furniture-'+index,type,x:spot.x+.5,y:spot.y+.5,nx:spot.nx,ny:spot.ny,height:type==='wardrobe'?.93:.38});
 }
}
function nearbyWardrobe(){
 if(!world)return null;
 return (world.furniture||[]).filter(item=>item.type==='wardrobe'&&distance(world.player,item)<1.3&&sees(world.player,item,item.id)).sort((a,b)=>distance(world.player,a)-distance(world.player,b))[0]||null;
}
function toggleHiding(){
 if(mode!=='playing'||!world)return false;
 const p=world.player;
 if(p.hidingId){delete p.hidingId;delete p.hidingSeen;delete p.hidingSeconds;p.angle=p.angleBeforeHiding??p.angle;delete p.angleBeforeHiding;flashlightOn=p.lightBeforeHiding??true;delete p.lightBeforeHiding;syncFlashlight();keys={};resetJoystick();persist();updateUI();return true}
 const wardrobe=nearbyWardrobe();if(!wardrobe)return false;
 p.hidingSeen=false;if(world.enemy.state==='chase'){world.enemy.state='search';world.enemy.timer=3;world.enemy.lookBase=world.enemy.moveAngle||0;world.enemy.target={x:p.x,y:p.y};}
 p.hidingId=wardrobe.id;p.hidingSeconds=0;p.angleBeforeHiding=p.angle||0;p.angle=Math.atan2(wardrobe.ny,wardrobe.nx);p.lightBeforeHiding=flashlightOn;flashlightOn=false;keys={};resetJoystick();stopFootsteps();stopCreaks();syncFlashlight();persist();updateUI();return true;
}
function updateHideUI(){const elapsed=world?.player.hidingId?(world.player.hidingSeconds||0):0;canvas.style.filter=elapsed>3?'blur('+Math.min(6,(elapsed-3)*.86).toFixed(2)+'px)':'none';
 const hidden=!!world?.player.hidingId,near=mode==='playing'&&!hidden?nearbyWardrobe():null;
 $('hideButton').hidden=mode!=='playing'||(!hidden&&!near);$('phoneHide').hidden=!hidden&&!near;
 $('hideButton').textContent=hidden?'Leave wardrobe (H)':'Hide in wardrobe (H)';$('phoneHide').textContent=hidden?'Leave':'Hide';
 $('hideHint').hidden=mode!=='playing'||(!hidden&&!near);
 $('hideHint').textContent=hidden?('You are safe from Slenderman. Leave before your air runs out: '+Math.max(0,10-(world.player.hidingSeconds||0)).toFixed(1)+'s ? H / Leave'):deviceMode==='phone'?'A wardrobe is nearby. Tap Hide.':'Press H to hide in the nearby wardrobe.';
}
let titleStep='titleWelcome',customizationReturn='deviceChoice';
function showTitleStep(id){
 titleStep=id;syncEconomy();$('titleShop').hidden=id==='titleWelcome'||id==='shopChoice';
 $('titleCustomize').hidden=id==='titleWelcome'||id==='customizeChoice'||id==='shopChoice';
 for(const step of ['titleWelcome','deviceChoice','modeChoice','stageChoice','storyChoice','customizeChoice','shopChoice'])$(step).hidden=step!==id;
 $('titleScreen').hidden=false;$('titleScreen').classList.toggle('setup-screen',id!=='titleWelcome');
 document.body?.classList.add('title-open');
}
function openTitle(){
 showTitleStep('titleWelcome');syncTitleAudio();
}
function closeTitle(){$('titleScreen').hidden=true;document.body?.classList.remove('title-open')}
function syncTitleAudio(){$('titleAudio').textContent=music&&audio?.state==='running'?'Music: on':'Enable music'}
function chooseDifficulty(value){
 pause();
 const next=value==='psycho'?'psycho':'normal';
 if(next!==difficulty){
  persist();difficulty=next;KEY=next==='psycho'?'hollow-house-psycho-v1':'hollow-house-v1';
  level=1;best=0;world=null;stageSaves={};
  try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved){best=Math.max(0,Math.floor(saved.best||0));level=Math.max(1,Math.min(best+1,Math.floor(saved.level||1)));stageSaves=saved.stageSaves||{};world=stageSaves[level]||saved.world||null;profile={...profile,...saved.profile}}}catch{}
 }
 flashlightOn=next!=='psycho';falseScareTime=0;psychoCountdown=12;screamCountdown=7;
 if(next==='psycho')setEffects(true);
 syncFlashlight();characterUI();goHome(false);renderTitleStages();showTitleStep('stageChoice');
}
function renderTitleStages(){
 $('titleStageMode').textContent=difficulty.toUpperCase()+' MODE';
 const grid=$('titleStageGrid');grid.replaceChildren();
 for(let n=1;n<=Math.max(12,best+3);n++){
  const button=document.createElement('button'),unlocked=n<=best+1;
  button.className='haunted-stage'+(n===level?' current':'');button.disabled=!unlocked;
  button.setAttribute('aria-label','Stage '+n+' — '+(!unlocked?'locked':stageSaves[n]?'resume saved run':n<=best?'replay completed stage':'enter'));
  button.innerHTML='<span>STAGE</span><strong>'+String(n).padStart(2,'0')+'</strong><small>'+(!unlocked?'Locked':stageSaves[n]?'Resume saved run':n<=best?'Replay':'Enter the maze')+'</small>';
  button.onclick=()=>{if(selectStage(n)){storyIndex=0;showStory()}};grid.append(button);
 }
}
let storyIndex=0;
const storyPages=[
 ['BEFORE THE DARKNESS','The woods.','You were traveling through the woods one evening. The path grew narrow, the trees closed in, and the last light disappeared behind you.'],
 ['SOMETHING WAS THERE','Then, nothing.','A branch snapped somewhere behind you. You turned—but before you could see what was there, everything went dark.'],
 ['THE HOUSE REMEMBERS','You woke in a maze.','Cold stone pressed against your skin. You opened your eyes inside a maze with no memory of how you arrived. Somewhere in the halls, footsteps began. Find the relics. Find the exit. Stay out of sight.']
];
function showStory(){
 const [chapter,heading,text]=storyPages[storyIndex];
 $('storyChapter').textContent=chapter;$('storyHeading').textContent=heading;$('storyText').textContent=text;
 $('storyProgress').textContent=(storyIndex+1)+' / '+storyPages.length;
 $('storyContinue').textContent=storyIndex===storyPages.length-1?(world?'Resume stage ':'Enter stage ')+level:'Continue';
 showTitleStep('storyChoice');
}
const screamVoices=new Set();
function stopScreams(){for(const voice of screamVoices){for(const node of voice.sources){try{node.stop()}catch{}}for(const node of voice.nodes)node.disconnect()}screamVoices.clear()}
function creepyScream(){
 if(!sound||!world||!audio||audio.state!=='running')return;
 const near=Math.max(.12,1-distance(world.player,world.enemy)/12),time=audio.currentTime;
 try{
  const voice=audio.createOscillator(),vibrato=audio.createOscillator(),mod=audio.createGain(),filter=audio.createBiquadFilter(),gain=audio.createGain(),pan=audio.createStereoPanner();
  voice.type='sawtooth';voice.frequency.setValueAtTime(290,time);voice.frequency.exponentialRampToValueAtTime(850,time+.23);voice.frequency.exponentialRampToValueAtTime(180,time+1.4);
  vibrato.frequency.value=19;mod.gain.value=38;vibrato.connect(mod);mod.connect(voice.frequency);
  filter.type='bandpass';filter.frequency.value=1350;filter.Q.value=1.8;
  const direction=Math.atan2(world.enemy.y-world.player.y,world.enemy.x-world.player.x)-(world.player.angle||0);pan.pan.value=Math.sin(direction)*.8;
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.055*near,time+.14);gain.gain.exponentialRampToValueAtTime(.0001,time+1.5);
  voice.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(audio.destination);
  const entry={sources:[voice,vibrato],nodes:[voice,vibrato,mod,filter,gain,pan]};screamVoices.add(entry);
  voice.onended=()=>{for(const node of entry.nodes)node.disconnect();screamVoices.delete(entry)};
  voice.start();vibrato.start();voice.stop(time+1.6);vibrato.stop(time+1.6);
 }catch{stopScreams()}
}
function updatePsycho(dt){
 if(difficulty!=='psycho'||mode!=='playing'||!world){falseScareTime=0;stopScreams();return}
 falseScareTime=Math.max(0,falseScareTime-dt);psychoCountdown-=dt;screamCountdown-=dt;
 if(psychoCountdown<=0){falseScareTime=.36;psychoCountdown=18+Math.random()*24;creepyScream()}
 if(screamCountdown<=0){creepyScream();screamCountdown=(distance(world.player,world.enemy)<7?5:12)+Math.random()*9}
}
let profile={name:'Traveler',color:COLORS[0],hair:'short',skin:'#e3b18b',outfit:'field',gender:'male'},level=1,best=0,world=null,mode='ready',keys={},last=0,sound=false,audio;
let stageSaves={},scareTime=0,cameraMode='first';
let storageOK=true;function persist(){if(world)stageSaves[level]=world;try{localStorage.setItem(KEY,JSON.stringify({profile,level,best,world,stageSaves,settings:{sound,music,cameraMode}}));$('saveLabel').textContent='Progress saved on this browser'}catch{$('saveLabel').textContent='Saving unavailable in this browser';storageOK=false}}
try{const s=JSON.parse(localStorage.getItem(KEY));if(s){profile={...profile,...s.profile};best=Math.max(0,Math.floor(s.best||0));level=Math.max(1,Math.min(best+1,Math.floor(s.level||1)));stageSaves=s.stageSaves||{};sound=!!s.settings?.sound;music=s.settings?.music??true;cameraMode=s.settings?.cameraMode==='third'?'third':'first';if(s.world&&s.world.grid&&s.world.level===level){world=s.world;stageSaves[level]=world}else world=stageSaves[level]||null}}catch{}
function rand(n){return Math.floor(Math.random()*n)}
function makeWorld(){const size=Math.min(29,17+2*Math.floor((level-1)/3)),grid=Array.from({length:size},()=>Array(size).fill(1));let stack=[[1,1]];grid[1][1]=0;while(stack.length){let [x,y]=stack[stack.length-1];let choices=[[2,0],[-2,0],[0,2],[0,-2]].filter(([dx,dy])=>x+dx>0&&y+dy>0&&x+dx<size-1&&y+dy<size-1&&grid[y+dy][x+dx]);if(!choices.length){stack.pop();continue}let [dx,dy]=choices[rand(choices.length)];grid[y+dy/2][x+dx/2]=0;grid[y+dy][x+dx]=0;stack.push([x+dx,y+dy])}
 // Small loops allow the survivor to escape the enemy and change routes.
 for(let i=0;i<size*size/5;i++){let x=1+rand(size-2),y=1+rand(size-2);if(grid[y][x]&&((!grid[y][x-1]&&!grid[y][x+1])||(!grid[y-1][x]&&!grid[y+1][x])))grid[y][x]=0}
 let count=Math.min(9,3+Math.floor((level-1)/2));world={level,grid,size,player:{x:1.5,y:1.5,angle:grid[1][2]===0?0:Math.PI/2},enemy:{x:size-1.5,y:size-1.5,state:'patrol',target:null,timer:0},relics:Array.from({length:count},()=>({x:1.5,y:1.5,taken:false})),exit:{x:size-1.5,y:size-1.5},stamina:100,time:0,lives:3};decorateMaze();spreadRelics();ensureSpiders();}
function mazeDistanceMap(origin){const q=[[Math.floor(origin.x),Math.floor(origin.y)]],result=new Map([[q[0].join(','),0]]);for(let i=0;i<q.length;i++){const [x,y]=q[i],d=result.get(x+','+y);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!result.has(key)&&valid(nx+.5,ny+.5)){result.set(key,d+1);q.push([nx,ny]);}}}return result;}
function spreadRelics(){
 if(world.relicLayoutVersion===2)return;
 const spawn={x:1.5,y:1.5},reachable=mazeDistanceMap(spawn),candidates=[];for(let y=1;y<world.size-1;y++)for(let x=1;x<world.size-1;x++){const point={x:x+.5,y:y+.5};if((reachable.get(x+','+y)||0)>=4&&valid(point.x,point.y)&&distance(point,world.exit)>1.5)candidates.push(point);}
 const anchors=[spawn,...world.relics.filter(r=>r.taken)],maps=anchors.map(mazeDistanceMap);
 for(const relic of world.relics.filter(r=>!r.taken)){let bestPoint=null,bestScore=-1;for(const point of candidates){const score=Math.min(...anchors.map((a,i)=>distance(a,point)*2+(maps[i].get(Math.floor(point.x)+','+Math.floor(point.y))||0)*.3));if(score>bestScore){bestScore=score;bestPoint=point;}}if(!bestPoint)break;Object.assign(relic,bestPoint);anchors.push(bestPoint);maps.push(mazeDistanceMap(bestPoint));candidates.splice(candidates.indexOf(bestPoint),1);}world.relicLayoutVersion=2;
}
function ensureWallPictures(){if(Array.isArray(world.wallPictures)){limitFallingPictures();return;}world.wallPictures=[];for(let y=1;y<world.size-1;y++)for(let x=1;x<world.size-1;x++)if(world.grid[y][x]){const layer=Math.abs(x*17+y*31+(world.decorSeed||0))%11;for(const [nx,ny,kind]of [[1,0,layer],[-1,0,layer],[0,1,(layer+7)%11],[0,-1,(layer+7)%11]])if((kind===2||kind>=6)&&world.grid[y+ny]?.[x+nx]===0)world.wallPictures.push({id:x+','+y+','+nx+','+ny,x:x+.5+nx*.519,y:y+.5+ny*.519,nx,ny,kind,canFall:(x*7+y*11+(nx+ny)*3)%4===0,state:'hanging',elapsed:0});}limitFallingPictures();}
function limitFallingPictures(){if(world.pictureFallVersion===2)return;const pictures=world.wallPictures||[],active=pictures.filter(p=>p.state!=='hanging'),others=pictures.filter(p=>p.state==='hanging').sort((a,b)=>{const score=p=>Math.abs(Math.floor(p.x)*47+Math.floor(p.y)*83+(world.decorSeed||0))%997;return score(a)-score(b)}),selected=new Set([...active,...others].slice(0,4));for(const p of pictures){p.canFall=selected.has(p);if(!p.canFall){p.state='hanging';p.elapsed=0;}}world.pictureFallVersion=2;}
function updateWallPictures(dt){ensureWallPictures();for(const picture of world.wallPictures){if(picture.state==='hanging'&&picture.canFall&&!world.player.hidingId&&distance(world.player,picture)<1.1&&sees(world.player,{x:picture.x+picture.nx*.2,y:picture.y+picture.ny*.2})){picture.state='rattling';picture.elapsed=0;pictureRattle();}else if(picture.state==='rattling'){picture.elapsed+=dt;if(picture.elapsed>=.85){picture.state='falling';picture.elapsed=0;}}else if(picture.state==='falling'){picture.elapsed+=dt;if(picture.elapsed>=.65){picture.state='fallen';picture.elapsed=.65;pictureCrash();persist();}}}}
function picturePose(picture){const falling=picture.state==='falling'||picture.state==='fallen',t=falling?Math.min(1,picture.elapsed/.65):0,tilt=t*t*Math.PI/2,roll=picture.state==='rattling'?Math.sin(picture.elapsed*43)*.045*(.6+picture.elapsed):0;return {x:picture.x+picture.nx*t*.35,z:picture.y+picture.ny*t*.35,height:falling?.035+.305*Math.cos(tilt)+.234*(1-t):.574,tilt,roll};}
function normalLightLevel(time){const pulse=Math.pow(Math.max(0,Math.sin(time*.71)),28),flutter=(Math.sin(time*17.3)+Math.sin(time*29.7))*.025;return Math.max(.76,Math.min(1.05,.97+flutter-pulse*.16));}
function ensureSpiders(){if(Array.isArray(world.spiders))return;const cells=[];for(let y=1;y<world.size-1;y++)for(let x=1;x<world.size-1;x++)if(valid(x+.5,y+.5))cells.push({x:x+.5,y:y+.5});world.spiders=[];for(let i=0;i<Math.min(7,Math.floor(world.size/3));i++){const cell=cells[(i*47+Math.abs(world.decorSeed||0))%cells.length];if(cell)world.spiders.push({...cell,angle:i,phase:i*1.7,target:null});}}
function updateSpiders(dt){ensureSpiders();for(const spider of world.spiders){spider.phase+=dt*11;if(!spider.target||distance(spider,spider.target)<.03){const x=Math.floor(spider.x),y=Math.floor(spider.y),choices=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:x+dx+.5,y:y+dy+.5})).filter(p=>valid(p.x,p.y));spider.target=choices[Math.floor(spider.phase)%choices.length]||null;}if(spider.target){const dx=spider.target.x-spider.x,dy=spider.target.y-spider.y,d=Math.hypot(dx,dy);spider.angle=Math.atan2(dy,dx);move(spider,dx/Math.max(d,.001)*dt*.13,dy/Math.max(d,.001)*dt*.13);}}}
function wall(x,y){return world.grid[Math.floor(y)]?.[Math.floor(x)]!==0}function valid(x,y){let r=.19;return !wall(x-r,y-r)&&!wall(x+r,y-r)&&!wall(x-r,y+r)&&!wall(x+r,y+r)&&!blocksFurniture(x,y,r)}
function move(o,dx,dy){if(valid(o.x+dx,o.y))o.x+=dx;if(valid(o.x,o.y+dy))o.y+=dy}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function sees(a,b,ignoreId=null){let d=distance(a,b);for(let t=0;t<d;t+=.1)if(wall(a.x+(b.x-a.x)*t/d,a.y+(b.y-a.y)*t/d)||blocksFurniture(a.x+(b.x-a.x)*t/d,a.y+(b.y-a.y)*t/d,0,ignoreId))return false;return true}
function path(a,b){let sx=Math.floor(a.x),sy=Math.floor(a.y),tx=Math.floor(b.x),ty=Math.floor(b.y),q=[[sx,sy]],seen=new Set([sx+','+sy]),prev=new Map();for(let i=0;i<q.length;i++){let [x,y]=q[i];if(x===tx&&y===ty){let k=x+','+y;while(prev.has(k)&&prev.get(k)!==sx+','+sy)k=prev.get(k);let [px,py]=k.split(',').map(Number);return {x:px+.5,y:py+.5}}for(let [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){let nx=x+dx,ny=y+dy,k=nx+','+ny;if(valid(nx+.5,ny+.5)&&!seen.has(k)){seen.add(k);prev.set(k,x+','+y);q.push([nx,ny])}}}return b}
function patrolTarget(){let {size,grid}=world;for(let i=0;i<100;i++){let x=1+rand(size-2),y=1+rand(size-2);if(!grid[y][x]&&valid(x+.5,y+.5))return{x:x+.5,y:y+.5}}return{x:1.5,y:1.5}}
function tone(freq,duration=.1){if(!sound)return;try{audio ||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();let o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
let heartbeatCountdown=0;
const heartbeatVoices=new Set();
function heartbeatSettings(distanceToEnemy){
 const proximity=Math.max(0,Math.min(1,1-distanceToEnemy/8));
 return {volume:.24*proximity*proximity,interval:1.15-.73*proximity};
}
function stopHeartbeat(){
 heartbeatCountdown=0;
 for(const voice of heartbeatVoices){try{voice.oscillator.stop()}catch{}voice.oscillator.disconnect();voice.gain.disconnect()}
 heartbeatVoices.clear();
}
function heartbeatThump(time,volume){
 const oscillator=audio.createOscillator(),gain=audio.createGain(),voice={oscillator,gain};
 oscillator.type='sine';
 oscillator.frequency.setValueAtTime(88,time);
 oscillator.frequency.exponentialRampToValueAtTime(38,time+.13);
 gain.gain.setValueAtTime(.0001,time);
 gain.gain.exponentialRampToValueAtTime(volume,time+.012);
 gain.gain.exponentialRampToValueAtTime(.0001,time+.18);
 oscillator.connect(gain);gain.connect(audio.destination);
 heartbeatVoices.add(voice);
 oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();heartbeatVoices.delete(voice)};
 oscillator.start(time);oscillator.stop(time+.2);
}
function updateHeartbeat(dt){
 if(!sound||mode!=='playing'||!world){stopHeartbeat();return}
 const settings=heartbeatSettings(distance(world.player,world.enemy));
 if(settings.volume<.001){stopHeartbeat();return}
 try{
  audio ||=new(window.AudioContext||window.webkitAudioContext)();
  if(audio.state!=='running')return;
  heartbeatCountdown-=dt;
  // Shorten the wait immediately when danger gets closer, without scheduling a backlog.
  heartbeatCountdown=Math.min(heartbeatCountdown,settings.interval);
  if(heartbeatCountdown<=0){
   heartbeatThump(audio.currentTime,settings.volume);
   heartbeatThump(audio.currentTime+.14,settings.volume*.65);
   heartbeatCountdown=settings.interval;
  }
 }catch{stopHeartbeat()}
}
let footstepDistance=0,footstepSide=1,footstepNoise=null;
const footstepVoices=new Set();
function stopFootsteps(){
 footstepDistance=0;
 for(const voice of footstepVoices){for(const source of voice.sources){try{source.stop()}catch{}}for(const node of voice.nodes)node.disconnect()}
 footstepVoices.clear();
}
function playFootstep(running){
 const time=audio.currentTime,variation=.94+Math.random()*.12;
 if(!footstepNoise){footstepNoise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.2),audio.sampleRate);const data=footstepNoise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1}
 const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),scrape=audio.createGain(),thud=audio.createOscillator(),impact=audio.createGain(),pan=audio.createStereoPanner(),voice={sources:[noise,thud],nodes:[noise,filter,scrape,thud,impact,pan]};
 noise.buffer=footstepNoise;noise.playbackRate.value=variation;
 filter.type='lowpass';filter.frequency.value=running?1250:850;
 scrape.gain.setValueAtTime(.0001,time);scrape.gain.exponentialRampToValueAtTime((running?.095:.055)*variation,time+.008);scrape.gain.exponentialRampToValueAtTime(.0001,time+.14);
 thud.type='sine';thud.frequency.setValueAtTime(105*variation,time);thud.frequency.exponentialRampToValueAtTime(43,time+.1);
 impact.gain.setValueAtTime(.0001,time);impact.gain.exponentialRampToValueAtTime((running?.13:.075)*variation,time+.006);impact.gain.exponentialRampToValueAtTime(.0001,time+.13);
 pan.pan.value=footstepSide*.18;footstepSide*=-1;
 noise.connect(filter);filter.connect(scrape);scrape.connect(pan);thud.connect(impact);impact.connect(pan);pan.connect(audio.destination);
 footstepVoices.add(voice);noise.onended=()=>{for(const node of voice.nodes)node.disconnect();footstepVoices.delete(voice)};
 noise.start(time);noise.stop(time+.18);thud.start(time);thud.stop(time+.15);
}
function updateFootsteps(traveled,dt){
 if(!sound||mode!=='playing'||!world||traveled<.0001){stopFootsteps();return}
 try{
  audio ||=new(window.AudioContext||window.webkitAudioContext)();
  if(audio.state!=='running'){footstepDistance=0;return}
  const running=dt>0&&traveled/dt>3.2,stride=running?1.05:.85;
  footstepDistance+=traveled;
  if(footstepDistance>=stride){footstepDistance%=stride;playFootstep(running)}
 }catch{stopFootsteps()}
}
function show(kicker,title,text,button){$('overlayKicker').textContent=kicker;$('overlayTitle').textContent=title;$('overlayText').textContent=text;$('start').innerHTML=button+' <span>→</span>';$('overlay').classList.remove('hidden')}
function updateUI(){syncEconomy();updateHideUI(); document.body?.classList.toggle('phone-playing',deviceMode==='phone'&&mode==='playing'); $('phoneControls').hidden=deviceMode!=='phone'||mode!=='playing'; $('floor').textContent=String(level).padStart(2,'0');$('best').textContent='Best cleared: '+best;$('difficulty').textContent=`Floor ${level} · ${level<3?'The awakening':level<6?'It knows your footsteps':'Nowhere feels safe'}`;if(world){let n=world.relics.filter(r=>r.taken).length;$('relics').textContent=`RELICS ${n} / ${world.relics.length}`;let s=world.enemy.state;$('status').textContent=mode==='playing'?(s==='chase'?'IT SEES YOU — RUN':s==='search'?'SEARCHING YOUR LAST LOCATION':'SLENDERMAN IS PATROLLING'):'WAITING IN THE DARK';$('statusDot').style.background=s==='chase'?'#e67568':s==='search'?'#e0bd68':'#c6e69a'}}
function tick(dt){if(updateHidingLimit(dt))return;let p=world.player,e=world.enemy;const playerBefore={x:p.x,y:p.y},enemyBefore={x:e.x,y:e.y};world.invulnerable=Math.max(0,(world.invulnerable||0)-dt);world.time+=dt;updateSpiders(dt);updateWallPictures(dt);p.angle??=0;p.angle+=((keys.arrowright||keys.e?1:0)-(keys.arrowleft||keys.q?1:0))*2.1*dt;let forward=Math.max(-1,Math.min(1,(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)+joystickInput.forward)),strafe=Math.max(-1,Math.min(1,(keys.d?1:0)-(keys.a?1:0)+joystickInput.strafe)),dx=Math.cos(p.angle)*forward-Math.sin(p.angle)*strafe,dy=Math.sin(p.angle)*forward+Math.cos(p.angle)*strafe,moving=forward||strafe,sprinting=!p.hidingId&&keys.shift&&moving&&world.stamina>0;let speed=sprinting?4.2:2.6;if(moving&&!p.hidingId){let len=Math.hypot(dx,dy);move(p,dx/Math.max(1,len)*speed*dt,dy/Math.max(1,len)*speed*dt)}updateLocomotion(p,playerBefore,dt);world.stamina=Math.max(0,Math.min(100,world.stamina+(sprinting?-34:22)*dt));let visible=!p.hidingId&&distance(p,e)<Math.min(10,5+level*.35)&&sees(e,p);if(visible){if(e.state!=='chase')tone(75,.5);e.state='chase';e.target={...p};e.timer=4}else if(e.state==='chase'){e.state='search';e.timer=p.hidingId?3:5;e.lookBase=e.moveAngle||0;e.target={...e.target}}else if(sprinting&&distance(p,e)<Math.min(6,2.5+level*.15)*(wallet.upgrades.quietBoots?.55:1)){e.state='search';e.target={...p};e.timer=4}
 if(e.state==='search'){e.timer-=dt;if(p.hidingId&&distance(e,p)<1.25)e.moveAngle=(e.lookBase||0)+Math.sin((3-e.timer)*3.4)*.85;if(e.timer<=0){e.state='patrol';e.target=patrolTarget();if(p.hidingId)for(let tries=0;tries<20&&distance(e.target,p)<4;tries++)e.target=patrolTarget();delete e.lookBase;}}
 if(!e.target||(e.state==='patrol'&&distance(e,e.target)<.3))e.target=patrolTarget();if(e.target){let next=path(e,e.target),d=distance(e,next),es=(e.state==='chase'?1.9:1.15)+Math.min(1.2,(level-1)*.12);if(!(p.hidingId&&e.state==='search'&&distance(e,p)<1.25)&&d>.04){let step=Math.min(es*dt,d);move(e,(next.x-e.x)/d*step,(next.y-e.y)/d*step)}}
 updateLocomotion(e,enemyBefore,dt,e.state==='chase',true);
 for(let r of world.relics)if(!p.hidingId&&!r.taken&&distance(p,r)<.5){r.taken=true;tone(620,.25);persist()}
 if((!p.hidingId||p.hidingSeen)&&distance(p,e)<.45){beginJumpscare()}else if(!p.hidingId&&world.relics.every(r=>r.taken)&&distance(p,world.exit)<.55){const cleared=level,unlocked=cleared===best+1,reward=difficulty==='psycho'?150:100;wallet.coins+=reward;saveWallet();best=Math.max(best,cleared);delete stageSaves[cleared];level=cleared+1;mode='won';world=null;keys={};resetJoystick();persist();releaseMouse();show('YOU MADE IT OUT',unlocked?'Another door opens.':'You survived again.',`Stage ${cleared} cleared. +${reward} coins! ${unlocked?'Stage '+level+' is now unlocked.':'Your unlocked stages are still available.'} Choose a stage to replay or keep going.`,'Enter stage '+level);tone(820,.4)}updateUI()}
function survivor(c,x,y,scale){drawSurvivor(c,x,y,scale)}
function draw(){if(mode==='scare')drawJumpscare();else{render3D();if(falseScareTime>0&&mode==='playing'){ctx.save();ctx.globalAlpha=Math.min(.85,falseScareTime*3);renderShadowJumpscare(ctx,.36-falseScareTime);ctx.restore()}}}
function frame(t){let dt=Math.min(.04,(t-last)/1000||0);last=t;let traveled=0;if(mode==='playing'&&world){const before={x:world.player.x,y:world.player.y};tick(dt);if(world)traveled=distance(before,world.player)}if(mode==='scare'){scareTime+=dt;if(scareTime>=1.35)finishJumpscare()}updatePsycho(dt);updateFootsteps(traveled,dt);updateFloorCreaks(traveled,dt);updateHeartbeat(dt);updateMusic();draw();requestAnimationFrame(frame)}
function pause(){if(mode!=='playing')return;mode='paused';keys={};resetJoystick();stopHeartbeat();stopFootsteps();stopCreaks();stopPictureSounds();stopScreams();if(document.pointerLockElement===canvas)document.exitPointerLock();persist();show('TAKE A BREATH','The halls are still.',`Floor ${level} and your current position are saved. Return when you’re ready.`,'Resume exploring');updateUI()}
$('start').onclick=()=>{if(mode==='scare')return;closeTitle();if(level>best+1)return;unlockAudio();if(!world){world=stageSaves[level]||null;if(!world)makeWorld()}decorateMaze();spreadRelics();ensureSpiders();ensureWallPictures();world.lives??=3;if(world.player.hidingId){flashlightOn=false;syncFlashlight()}mode='playing';keys={};resetJoystick();$('overlay').classList.add('hidden');persist();updateUI()};$('save').onclick=pause;
window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();if($('settingsDialog').open||$('levelsDialog').open||$('mapDialog').open||['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(['arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k))e.preventDefault();if(k==='h'&&!e.repeat){toggleHiding();return}if(k==='f'&&!e.repeat){toggleFlashlight();return}if(k==='v'&&!e.repeat){setCameraMode(cameraMode==='first'?'third':'first');return}if(k===' '&&!e.repeat){if(mode==='playing')pause();else if(mode==='paused')$('start').click()}keys[k]=true});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);window.addEventListener('blur',()=>{keys={};resetJoystick();pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();stopMusic();stopSting()}});window.addEventListener('beforeunload',persist);setInterval(()=>{if(mode==='playing')persist()},5000);
$('sound').onclick=()=>setEffects(!sound);
canvas.addEventListener('click',()=>{if(deviceMode==='computer'&&mode==='playing'&&canvas.requestPointerLock){try{const result=canvas.requestPointerLock();if(result?.catch)result.catch(()=>{})}catch{}}});
document.addEventListener('mousemove',e=>{if(mode==='playing'&&world&&document.pointerLockElement===canvas){world.player.angle=(world.player.angle||0)+e.movementX*.0028;world.player.lookOffset=Math.max(-.22,Math.min(.22,(world.player.lookOffset||0)-e.movementY*.0007))}});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&mode==='playing')pause()});
let touchLook=null;canvas.style.touchAction='none';canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&mode==='playing'){touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)}});canvas.addEventListener('pointermove',e=>{if(touchLook?.id===e.pointerId&&world&&mode==='playing'){world.player.angle=(world.player.angle||0)+(e.clientX-touchLook.x)*.008;world.player.lookOffset=Math.max(-.22,Math.min(.22,(world.player.lookOffset||0)-(e.clientY-touchLook.y)*.001));touchLook.x=e.clientX;touchLook.y=e.clientY}});for(let event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>touchLook=null);
function characterUI(){for(let id of ['name','hair','skin','outfit','gender'])$(id).value=profile[id];$('namePreview').textContent=profile.name||'Traveler';let c=$('avatar').getContext('2d');c.clearRect(0,0,240,320);survivor(c,120,188,1.5);document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('selected',b.dataset.color===profile.color))}
for(let color of COLORS){let b=document.createElement('button');b.className='swatch';b.style.background=color;b.dataset.color=color;b.setAttribute('aria-label','Coat color '+color);b.onclick=()=>{profile.color=color;characterUI();persist()};$('swatches').append(b)}for(let id of ['name','hair','skin','outfit','gender'])$(id).addEventListener('input',()=>{profile[id]=$(id).value;characterUI();persist()});
$('reset').onclick=()=>{if(mode==='scare')return;pause();if(confirm('Reset all floor progress? Your character will be kept.')){level=1;best=0;world=null;stageSaves={};persist();goHome()}};
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true});for(let type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>keys[b.dataset.key]=false)});
function releaseMouse(){if(document.pointerLockElement===canvas)document.exitPointerLock()}
function setEffects(enabled){sound=enabled;if(sound)unlockAudio();else{stopHeartbeat();stopFootsteps();stopCreaks();stopPictureSounds();stopSting();stopScreams()}syncSettings();persist()}
function syncSettings(){$('sound').textContent='Sound: '+(sound?'on':'off');$('effectsToggle').checked=sound;$('musicToggle').checked=music;$('cameraView').value=cameraMode;$('cameraSetting').value=cameraMode}
function goHome(showTitle=true){
 if(showTitle&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});
 if(mode==='scare')return;if(showTitle)openTitle();mode='home';keys={};resetJoystick();stopHeartbeat();stopFootsteps();stopCreaks();stopPictureSounds();stopScreams();releaseMouse();persist();
 show('WELCOME TO HOLLOW HOUSE','The house remembers.',`Stage ${best+1} is unlocked. ${world?'Your stage '+level+' run is saved.':'Complete each stage to open the next door.'} Choose a stage, customize your survivor, and enter if you dare.`,world?'Continue stage '+level:'Enter stage '+level);updateUI();
}
function renderStages(){
 const grid=$('stageGrid');grid.replaceChildren();
 for(let n=1;n<=Math.max(12,best+3);n++){const unlocked=n<=best+1,b=document.createElement('button');b.className='stage-card'+(n===level?' current':'');b.disabled=!unlocked;b.innerHTML='<span>STAGE</span><strong>'+String(n).padStart(2,'0')+'</strong><small>'+(!unlocked?'Locked · clear '+(n-1):stageSaves[n]?'Resume saved run':n<=best?'Completed · replay':'Unlocked · explore')+'</small>';b.onclick=()=>selectStage(n);grid.append(b)}
}
function selectStage(n){if(!Number.isInteger(n)||n<1||n>best+1||mode==='scare')return false;pause();persist();level=n;world=stageSaves[n]||null;mode='home';$('levelsDialog').close();goHome(false);return true}
function openMenu(id){if(mode==='scare')return;pause();keys={};resetJoystick();if(id==='levelsDialog')renderStages();syncSettings();$(id).showModal()}
function beginJumpscare(reason='caught'){deathReason=reason;
 mode='scare';scareTime=0;keys={};resetJoystick();if(world){world.lives=Math.max(0,(world.lives??3)-1);if(world.lives>0){const light=world.player.lightBeforeHiding;world.player={x:1.5,y:1.5,angle:world.grid[1][2]===0?0:Math.PI/2};world.enemy={x:world.size-1.5,y:world.size-1.5,state:'patrol',target:null,timer:0};world.stamina=100;world.invulnerable=3;flashlightOn=light??flashlightOn;canvas.style.filter='none';syncFlashlight();}else{delete stageSaves[level];world=null;}}stopHeartbeat();stopFootsteps();stopCreaks();stopPictureSounds();stopScreams();releaseMouse();$('overlay').classList.add('hidden');canvas.classList.add('scare-active');persist();catchSting();
}
function drawJumpscare(){renderShadowJumpscare(ctx,scareTime)}
function finishJumpscare(){mode='dead';stopSting();canvas.classList.remove('scare-active');const hearts=world?.lives||0;show(hearts?'YOU STILL HAVE A CHANCE':'OUT OF HEARTS',deathReason==='wardrobe'?'Your air ran out.':'It found you.',hearts?hearts+' hearts remain. Your collected relics and maze progress are saved. Return to the entrance and continue.': 'All three hearts are gone. Start this stage again with a new maze. Your coins and upgrades are kept.',hearts?'Continue stage '+level:'Restart stage '+level);updateUI();}

$('settingsButton').onclick=()=>openMenu('settingsDialog');$('levelsButton').onclick=()=>openMenu('levelsDialog');$('closeSettings').onclick=()=>$('settingsDialog').close();$('closeLevels').onclick=()=>$('levelsDialog').close();$('effectsToggle').onchange=e=>setEffects(e.target.checked);$('musicToggle').onchange=e=>{music=e.target.checked;if(music)unlockAudio();else stopMusic();syncSettings();persist()};$('settingsHome').onclick=()=>{$('settingsDialog').close();goHome()};$('homeLink').onclick=e=>{e.preventDefault();goHome()};
const overlayActions=document.createElement('div');overlayActions.className='overlay-actions';for(const [label,action] of [['Choose stage',()=>openMenu('levelsDialog')],['Settings',()=>openMenu('settingsDialog')],['Back to home',()=>goHome()]]){const b=document.createElement('button');b.className='secondary';b.textContent=label;b.onclick=action;overlayActions.append(b)}$('overlay').append(overlayActions);
$('cameraView').onchange=e=>setCameraMode(e.target.value);$('cameraSetting').onchange=e=>setCameraMode(e.target.value);
$('titleCustomize').onclick=()=>{customizationReturn=titleStep;showTitleStep('customizeChoice')};
$('customizeDone').onclick=()=>showTitleStep(customizationReturn);
$('gamePause').onclick=()=>pause();
$('gameSettings').onclick=()=>openMenu('settingsDialog');
$('mapButton').onclick=()=>{if(!world)return;openMenu('mapDialog');drawUpgradeMap()};$('closeMap').onclick=()=>$('mapDialog').close();
$('titleShop').onclick=()=>{shopReturn=titleStep;renderShop();showTitleStep('shopChoice')};
$('shopBack').onclick=()=>showTitleStep(shopReturn);
$('titlePlay').onclick=()=>{unlockAudio();syncTitleAudio();showTitleStep('deviceChoice')};
$('titleAudio').onclick=()=>{music=!music||audio?.state!=='running';if(music){unlockAudio();setEffects(true)}else stopMusic();syncTitleAudio();syncSettings();persist()};
for(const [id,value] of [['chooseComputer','computer'],['choosePhone','phone']])$(id).onclick=()=>{setDevice(value);showTitleStep('modeChoice');syncTitleAudio()};
$('deviceBack').onclick=openTitle;$('modeBack').onclick=()=>{showTitleStep('deviceChoice')};
$('stageBack').onclick=()=>showTitleStep('modeChoice');
$('storyBack').onclick=()=>{renderTitleStages();showTitleStep('stageChoice')};
$('storyContinue').onclick=()=>{unlockAudio();if(storyIndex<storyPages.length-1){storyIndex++;showStory()}else $('start').onclick()};
$('chooseNormal').onclick=()=>chooseDifficulty('normal');$('choosePsycho').onclick=()=>chooseDifficulty('psycho');
$('controlsButton').onclick=()=>{pause();setDevice(deviceMode==='phone'?'computer':'phone')};
$('flashlightButton').onclick=toggleFlashlight;$('phoneFlashlight').onclick=toggleFlashlight;$('phonePause').onclick=pause;$('hideButton').onclick=toggleHiding;$('phoneHide').onclick=toggleHiding;
const joystick=$('joystick');
function moveJoystick(e){
 if(joystickPointer!==e.pointerId||mode!=='playing')return;
 const rect=joystick.getBoundingClientRect(),radius=rect.width*.34,dx=e.clientX-rect.left-rect.width/2,dy=e.clientY-rect.top-rect.height/2,length=Math.hypot(dx,dy),scale=length>radius?radius/length:1;
 const x=dx*scale,y=dy*scale;joystickInput={forward:Math.abs(y/radius)<.1?0:-y/radius,strafe:Math.abs(x/radius)<.1?0:x/radius};$('joystickKnob').style.transform='translate('+x+'px,'+y+'px)';
}
joystick.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoystick(e)});
joystick.addEventListener('pointermove',moveJoystick);
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(joystickPointer===e.pointerId)resetJoystick()});
$('phoneSprint').addEventListener('pointerdown',e=>{e.preventDefault();$('phoneSprint').setPointerCapture(e.pointerId);keys.shift=true});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('phoneSprint').addEventListener(event,()=>keys.shift=false);
syncFlashlight();setDevice('computer');characterUI();syncSettings();goHome();requestAnimationFrame(frame);
