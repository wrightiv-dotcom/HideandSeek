/* Hollow House: standalone canvas game, no build step required. */
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const KEY='hollow-house-v1',COLORS=['#c6e69a','#c28d74','#9abccc','#b39acd','#e0bd68'];
let profile={name:'Traveler',color:COLORS[0],hair:'short',skin:'#e3b18b',outfit:'field'},level=1,best=0,world=null,mode='ready',keys={},last=0,sound=false,audio;
let stageSaves={},scareTime=0;
let storageOK=true;function persist(){if(world)stageSaves[level]=world;try{localStorage.setItem(KEY,JSON.stringify({profile,level,best,world,stageSaves,settings:{sound,music}}));$('saveLabel').textContent='Progress saved on this browser'}catch{$('saveLabel').textContent='Saving unavailable in this browser';storageOK=false}}
try{const s=JSON.parse(localStorage.getItem(KEY));if(s){profile={...profile,...s.profile};best=Math.max(0,Math.floor(s.best||0));level=Math.max(1,Math.min(best+1,Math.floor(s.level||1)));stageSaves=s.stageSaves||{};sound=!!s.settings?.sound;music=s.settings?.music??true;if(s.world&&s.world.grid&&s.world.level===level){world=s.world;stageSaves[level]=world}else world=stageSaves[level]||null}}catch{}
function rand(n){return Math.floor(Math.random()*n)}
function makeWorld(){const size=Math.min(29,17+2*Math.floor((level-1)/3)),grid=Array.from({length:size},()=>Array(size).fill(1));let stack=[[1,1]];grid[1][1]=0;while(stack.length){let [x,y]=stack[stack.length-1];let choices=[[2,0],[-2,0],[0,2],[0,-2]].filter(([dx,dy])=>x+dx>0&&y+dy>0&&x+dx<size-1&&y+dy<size-1&&grid[y+dy][x+dx]);if(!choices.length){stack.pop();continue}let [dx,dy]=choices[rand(choices.length)];grid[y+dy/2][x+dx/2]=0;grid[y+dy][x+dx]=0;stack.push([x+dx,y+dy])}
 // Small loops allow the survivor to escape the enemy and change routes.
 for(let i=0;i<size*size/5;i++){let x=1+rand(size-2),y=1+rand(size-2);if(grid[y][x]&&((!grid[y][x-1]&&!grid[y][x+1])||(!grid[y-1][x]&&!grid[y+1][x])))grid[y][x]=0}
 let cells=[];for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++)if(!grid[y][x]&&x+y>size*.7)cells.push({x:x+.5,y:y+.5});cells.sort(()=>Math.random()-.5);let count=Math.min(9,3+Math.floor((level-1)/2));world={level,grid,size,player:{x:1.5,y:1.5},enemy:{x:size-1.5,y:size-1.5,state:'patrol',target:null,timer:0},relics:cells.slice(0,count).map(p=>({...p,taken:false})),exit:{x:size-1.5,y:size-1.5},stamina:100,time:0};}
function wall(x,y){return world.grid[Math.floor(y)]?.[Math.floor(x)]!==0}function valid(x,y){let r=.19;return !wall(x-r,y-r)&&!wall(x+r,y-r)&&!wall(x-r,y+r)&&!wall(x+r,y+r)}
function move(o,dx,dy){if(valid(o.x+dx,o.y))o.x+=dx;if(valid(o.x,o.y+dy))o.y+=dy}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function sees(a,b){let d=distance(a,b);for(let t=0;t<d;t+=.1)if(wall(a.x+(b.x-a.x)*t/d,a.y+(b.y-a.y)*t/d))return false;return true}
function path(a,b){let sx=Math.floor(a.x),sy=Math.floor(a.y),tx=Math.floor(b.x),ty=Math.floor(b.y),q=[[sx,sy]],seen=new Set([sx+','+sy]),prev=new Map();for(let i=0;i<q.length;i++){let [x,y]=q[i];if(x===tx&&y===ty){let k=x+','+y;while(prev.has(k)&&prev.get(k)!==sx+','+sy)k=prev.get(k);let [px,py]=k.split(',').map(Number);return {x:px+.5,y:py+.5}}for(let [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){let nx=x+dx,ny=y+dy,k=nx+','+ny;if(!wall(nx+.5,ny+.5)&&!seen.has(k)){seen.add(k);prev.set(k,x+','+y);q.push([nx,ny])}}}return b}
function patrolTarget(){let {size,grid}=world;for(let i=0;i<100;i++){let x=1+rand(size-2),y=1+rand(size-2);if(!grid[y][x])return{x:x+.5,y:y+.5}}return{x:1.5,y:1.5}}
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
function updateUI(){ $('floor').textContent=String(level).padStart(2,'0');$('best').textContent='Best cleared: '+best;$('difficulty').textContent=`Floor ${level} · ${level<3?'The awakening':level<6?'It knows your footsteps':'Nowhere feels safe'}`;if(world){let n=world.relics.filter(r=>r.taken).length;$('relics').textContent=`RELICS ${n} / ${world.relics.length}`;let s=world.enemy.state;$('status').textContent=mode==='playing'?(s==='chase'?'IT SEES YOU — RUN':s==='search'?'SEARCHING YOUR LAST LOCATION':'SLENDERMAN IS PATROLLING'):'WAITING IN THE DARK';$('statusDot').style.background=s==='chase'?'#e67568':s==='search'?'#e0bd68':'#c6e69a'}}
function tick(dt){let p=world.player,e=world.enemy;world.time+=dt;p.angle??=0;p.angle+=((keys.arrowright||keys.e?1:0)-(keys.arrowleft||keys.q?1:0))*2.1*dt;let forward=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0),strafe=(keys.d?1:0)-(keys.a?1:0),dx=Math.cos(p.angle)*forward-Math.sin(p.angle)*strafe,dy=Math.sin(p.angle)*forward+Math.cos(p.angle)*strafe,moving=forward||strafe,sprinting=keys.shift&&moving&&world.stamina>0;let speed=sprinting?4.2:2.6;if(moving){let len=Math.hypot(dx,dy);move(p,dx/len*speed*dt,dy/len*speed*dt)}world.stamina=Math.max(0,Math.min(100,world.stamina+(sprinting?-34:22)*dt));let visible=distance(p,e)<Math.min(10,5+level*.35)&&sees(e,p);if(visible){if(e.state!=='chase')tone(75,.5);e.state='chase';e.target={...p};e.timer=4}else if(e.state==='chase'){e.state='search';e.timer=5;e.target={...e.target}}else if(sprinting&&distance(p,e)<Math.min(6,2.5+level*.15)){e.state='search';e.target={...p};e.timer=4}
 if(e.state==='search'){e.timer-=dt;if(e.timer<=0){e.state='patrol';e.target=null}}
 if(!e.target||(e.state==='patrol'&&distance(e,e.target)<.3))e.target=patrolTarget();if(e.target){let next=path(e,e.target),d=distance(e,next),es=(e.state==='chase'?1.9:1.15)+Math.min(1.2,(level-1)*.12);if(d>.04){let step=Math.min(es*dt,d);move(e,(next.x-e.x)/d*step,(next.y-e.y)/d*step)}}
 for(let r of world.relics)if(!r.taken&&distance(p,r)<.5){r.taken=true;tone(620,.25);persist()}
 if(distance(p,e)<.45){beginJumpscare()}else if(world.relics.every(r=>r.taken)&&distance(p,world.exit)<.55){const cleared=level,unlocked=cleared===best+1;best=Math.max(best,cleared);delete stageSaves[cleared];level=cleared+1;mode='won';world=null;keys={};persist();releaseMouse();show('YOU MADE IT OUT',unlocked?'Another door opens.':'You survived again.',`Stage ${cleared} cleared. ${unlocked?'Stage '+level+' is now unlocked.':'Your unlocked stages are still available.'} Choose a stage to replay or keep going.`,'Enter stage '+level);tone(820,.4)}updateUI()}
function survivor(c,x,y,scale){drawSurvivor(c,x,y,scale)}
function draw(){if(mode==='scare')drawJumpscare();else render3D()}
function frame(t){let dt=Math.min(.04,(t-last)/1000||0);last=t;let traveled=0;if(mode==='playing'&&world){const before={x:world.player.x,y:world.player.y};tick(dt);if(world)traveled=distance(before,world.player)}if(mode==='scare'){scareTime+=dt;if(scareTime>=1.35)finishJumpscare()}updateFootsteps(traveled,dt);updateHeartbeat(dt);updateMusic();draw();requestAnimationFrame(frame)}
function pause(){if(mode!=='playing')return;mode='paused';keys={};stopHeartbeat();stopFootsteps();if(document.pointerLockElement===canvas)document.exitPointerLock();persist();show('TAKE A BREATH','The halls are still.',`Floor ${level} and your current position are saved. Return when you’re ready.`,'Resume exploring');updateUI()}
$('start').onclick=()=>{if(mode==='scare')return;if(level>best+1)return;unlockAudio();if(!world){world=stageSaves[level]||null;if(!world)makeWorld()}mode='playing';keys={};$('overlay').classList.add('hidden');persist();updateUI()};$('save').onclick=pause;
window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();if($('settingsDialog').open||$('levelsDialog').open||['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(['arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k))e.preventDefault();if(k===' '&&!e.repeat){if(mode==='playing')pause();else if(mode==='paused')$('start').click()}keys[k]=true});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);window.addEventListener('blur',()=>{keys={};pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();stopMusic();stopSting()}});window.addEventListener('beforeunload',persist);setInterval(()=>{if(mode==='playing')persist()},5000);
$('sound').onclick=()=>setEffects(!sound);
canvas.addEventListener('click',()=>{if(mode==='playing'&&canvas.requestPointerLock){try{const result=canvas.requestPointerLock();if(result?.catch)result.catch(()=>{})}catch{}}});
document.addEventListener('mousemove',e=>{if(mode==='playing'&&world&&document.pointerLockElement===canvas)world.player.angle=(world.player.angle||0)+e.movementX*.0028});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&mode==='playing')pause()});
let touchLook=null;canvas.style.touchAction='none';canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&mode==='playing'){touchLook={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId)}});canvas.addEventListener('pointermove',e=>{if(touchLook?.id===e.pointerId&&world&&mode==='playing'){world.player.angle=(world.player.angle||0)+(e.clientX-touchLook.x)*.008;touchLook.x=e.clientX}});for(let event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>touchLook=null);
function characterUI(){for(let id of ['name','hair','skin','outfit'])$(id).value=profile[id];$('namePreview').textContent=profile.name||'Traveler';let c=$('avatar').getContext('2d');c.clearRect(0,0,240,320);survivor(c,120,188,1.5);document.querySelectorAll('.swatch').forEach(b=>b.classList.toggle('selected',b.dataset.color===profile.color))}
for(let color of COLORS){let b=document.createElement('button');b.className='swatch';b.style.background=color;b.dataset.color=color;b.setAttribute('aria-label','Coat color '+color);b.onclick=()=>{profile.color=color;characterUI();persist()};$('swatches').append(b)}for(let id of ['name','hair','skin','outfit'])$(id).addEventListener('input',()=>{profile[id]=$(id).value;characterUI();persist()});
$('reset').onclick=()=>{if(mode==='scare')return;pause();if(confirm('Reset all floor progress? Your character will be kept.')){level=1;best=0;world=null;stageSaves={};persist();goHome()}};
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true});for(let type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>keys[b.dataset.key]=false)});
function releaseMouse(){if(document.pointerLockElement===canvas)document.exitPointerLock()}
function setEffects(enabled){sound=enabled;if(sound)unlockAudio();else{stopHeartbeat();stopFootsteps();stopSting()}syncSettings();persist()}
function syncSettings(){$('sound').textContent='Sound: '+(sound?'on':'off');$('effectsToggle').checked=sound;$('musicToggle').checked=music}
function goHome(){
 if(mode==='scare')return;mode='home';keys={};stopHeartbeat();stopFootsteps();releaseMouse();persist();
 show('WELCOME TO HOLLOW HOUSE','The house remembers.',`Stage ${best+1} is unlocked. ${world?'Your stage '+level+' run is saved.':'Complete each stage to open the next door.'} Choose a stage, customize your survivor, and enter if you dare.`,world?'Continue stage '+level:'Enter stage '+level);updateUI();
}
function renderStages(){
 const grid=$('stageGrid');grid.replaceChildren();
 for(let n=1;n<=Math.max(12,best+3);n++){const unlocked=n<=best+1,b=document.createElement('button');b.className='stage-card'+(n===level?' current':'');b.disabled=!unlocked;b.innerHTML='<span>STAGE</span><strong>'+String(n).padStart(2,'0')+'</strong><small>'+(!unlocked?'Locked · clear '+(n-1):stageSaves[n]?'Resume saved run':n<=best?'Completed · replay':'Unlocked · explore')+'</small>';b.onclick=()=>selectStage(n);grid.append(b)}
}
function selectStage(n){if(!Number.isInteger(n)||n<1||n>best+1||mode==='scare')return false;pause();persist();level=n;world=stageSaves[n]||null;mode='home';$('levelsDialog').close();goHome();return true}
function openMenu(id){if(mode==='scare')return;pause();keys={};if(id==='levelsDialog')renderStages();syncSettings();$(id).showModal()}
function beginJumpscare(){
 mode='scare';scareTime=0;keys={};delete stageSaves[level];world=null;stopHeartbeat();stopFootsteps();releaseMouse();$('overlay').classList.add('hidden');canvas.classList.add('scare-active');persist();catchSting();
}
function drawJumpscare(){renderShadowJumpscare(ctx,scareTime)}
function finishJumpscare(){mode='dead';stopSting();canvas.classList.remove('scare-active');show('THE HOUSE CLAIMED YOU','It found you.',`Stage ${level} is still unlocked. Try a new maze or return to a completed stage. Your other saved runs are safe.`,'Retry stage '+level);updateUI()}
$('settingsButton').onclick=()=>openMenu('settingsDialog');$('levelsButton').onclick=()=>openMenu('levelsDialog');$('closeSettings').onclick=()=>$('settingsDialog').close();$('closeLevels').onclick=()=>$('levelsDialog').close();$('effectsToggle').onchange=e=>setEffects(e.target.checked);$('musicToggle').onchange=e=>{music=e.target.checked;if(music)unlockAudio();else stopMusic();syncSettings();persist()};$('settingsHome').onclick=()=>{$('settingsDialog').close();goHome()};$('homeLink').onclick=e=>{e.preventDefault();goHome()};
const overlayActions=document.createElement('div');overlayActions.className='overlay-actions';for(const [label,action] of [['Choose stage',()=>openMenu('levelsDialog')],['Settings',()=>openMenu('settingsDialog')]]){const b=document.createElement('button');b.className='secondary';b.textContent=label;b.onclick=action;overlayActions.append(b)}$('overlay').append(overlayActions);
characterUI();syncSettings();goHome();requestAnimationFrame(frame);
