const assert=require('node:assert/strict');
const base=process.env.GAME_URL||'http://127.0.0.1:8000';
(async()=>{
 for(const asset of ['','index.html','style.css','characters.js','motion.js','game.js','renderer.js','gpu.js','ambience.js']){
  const response=await fetch(base+'/'+asset);assert.equal(response.status,200,asset);assert((await response.text()).length>0);
 }
 assert.equal((await fetch(base+'/.tools/gh.zip')).status,404);
 assert.equal((await fetch(base+'/',{method:'HEAD'})).status,200);
 const background=await fetch(base+'/assets/haunted-house.png');assert.equal(background.status,200);assert.equal(background.headers.get('content-type'),'image/png');
 const wall=await fetch(base+'/assets/wall-plaster.jpg');assert.equal(wall.status,200);assert.equal(wall.headers.get('content-type'),'image/jpeg');
 console.log('PASS: localhost serves all game assets; HEAD works and internal files stay inaccessible.');
})().catch(e=>{console.error(e);process.exit(1)});
