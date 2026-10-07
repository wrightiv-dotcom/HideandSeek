const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('../.tools/browser/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:8001');await page.locator('#titleAudio').click();
 await page.evaluate(()=>{
  $('start').onclick();world.size=9;world.grid=Array.from({length:9},(_,y)=>Array.from({length:9},(_,x)=>x===0||x===8||y===0||y===8?1:0));
  world.furniture=[{id:'qa-wardrobe',type:'wardrobe',x:3.5,y:4.5,nx:1,ny:0,height:.93},{id:'qa-cabinet',type:'cabinet',x:3.5,y:6.5,nx:1,ny:0,height:.38}];
  world.player={x:5.7,y:5.2,angle:3.33};world.enemy={x:7.5,y:1.5,state:'patrol',target:{x:7.5,y:1.5},timer:0};world.relics=[{x:4.5,y:7.5,taken:false}];updateUI();
 });
 fs.mkdirSync('.tools/qa',{recursive:true});await page.waitForTimeout(120);await page.locator('#game').screenshot({path:'.tools/qa/furniture-3d.png'});
 await page.evaluate(()=>{world.player={x:4.5,y:4.5,angle:Math.PI};world.enemy.state='patrol';updateUI()});
 assert(await page.locator('#hideButton').isVisible());await page.keyboard.press('h');assert.equal(await page.evaluate(()=>world.player.hidingId),'qa-wardrobe');
 const pos=await page.evaluate(()=>({x:world.player.x,y:world.player.y}));await page.keyboard.down('w');await page.waitForTimeout(120);await page.keyboard.up('w');assert.deepEqual(await page.evaluate(()=>({x:world.player.x,y:world.player.y})),pos);
 await page.locator('#game').screenshot({path:'.tools/qa/wardrobe-hidden.png'});await page.keyboard.press('h');assert.equal(await page.evaluate(()=>!!world.player.hidingId),false);
 await page.evaluate(()=>{setDevice('phone');world.player={x:4.5,y:4.5,angle:Math.PI};world.enemy.state='patrol';updateUI()});assert(await page.locator('#phoneHide').isVisible());await page.locator('#phoneHide').click();assert.equal(await page.locator('#phoneHide').textContent(),'Leave');await page.locator('#phoneHide').click();assert.equal(await page.evaluate(()=>!!world.player.hidingId),false);
 await page.evaluate(()=>{mode='home';draw();for(let i=6;i<11;i++){const data=VIEW.normalWalls[i].getContext('2d').getImageData(156,94,200,244).data;let total=0;for(let j=0;j<data.length;j+=4)total+=data[j]*3+data[j+1]*5+data[j+2]*7;window['picture'+i]=total}});assert.equal(new Set(await page.evaluate(()=>[picture6,picture7,picture8,picture9,picture10])).size,5);
 await page.evaluate(()=>{setDevice('computer');mode='playing';world.enemy={...world.player,state:'chase',target:null,timer:0};tick(0)});assert.equal(await page.evaluate(()=>mode),'scare');assert.equal(await page.evaluate(()=>stingVoices.size),3);
 const scream=await page.evaluate(()=>[...stingVoices].map(v=>({frequency:v.o.frequency.value,sources:v.sources.length})));assert(scream.every(v=>v.frequency>700&&v.sources===2));await page.evaluate(()=>setEffects(false));assert.equal(await page.evaluate(()=>stingVoices.size),0);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: 3D furniture rendering, wardrobe controls on keyboard/phone, hidden movement lock, distinct wall art, high-pitched catch scream, and mute cleanup.');
})().catch(e=>{console.error(e);process.exit(1)});
