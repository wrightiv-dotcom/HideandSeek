const assert=require('node:assert/strict');
(async()=>{
 for(const asset of ['','index.html','style.css','game.js','renderer.js','ambience.js']){
  const response=await fetch('http://127.0.0.1:8000/'+asset);assert.equal(response.status,200,asset);assert((await response.text()).length>0);
 }
 assert.equal((await fetch('http://127.0.0.1:8000/.tools/gh.zip')).status,404);
 assert.equal((await fetch('http://127.0.0.1:8000/',{method:'HEAD'})).status,200);
 console.log('PASS: localhost serves all game assets; HEAD works and internal files stay inaccessible.');
})().catch(e=>{console.error(e);process.exit(1)});
