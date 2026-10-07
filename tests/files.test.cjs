const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(html,/<!doctype html>/i);assert.match(html,/<meta charset="UTF-8">/);
const refs=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(r=>!/^https?:/.test(r));
for(const ref of refs){const file=path.join(root,ref);assert(fs.existsSync(file),'Missing asset: '+ref);const basename=path.basename(file);assert(fs.readdirSync(path.dirname(file)).includes(basename),'Linux filename case mismatch: '+ref)}
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(scripts,['characters.js','renderer.js','ambience.js','game.js']);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate HTML ids');
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');for(const m of game.matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(m[1]),'Missing game UI element: '+m[1]);
const config=JSON.parse(fs.readFileSync(path.join(root,'.devcontainer/devcontainer.json'),'utf8'));assert(config.forwardPorts.includes(8000));
console.log('PASS: HTML metadata, local assets, Linux filename case, script order, UI elements, and Codespaces port configuration.');
