// Local-only server: no packages or Python installation required.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const port=Number(process.env.PORT||8000);
const assets=new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/characters.js','characters.js'],['/motion.js','motion.js'],['/game.js','game.js'],['/multiplayer.js','multiplayer.js'],['/vendor/peerjs.min.js','vendor/peerjs.min.js'],['/renderer.js','renderer.js'],['/gpu.js','gpu.js'],['/ambience.js','ambience.js'],['/assets/haunted-house.png','assets/haunted-house.png'],['/assets/wall-plaster.jpg','assets/wall-plaster.jpg']]);
const types={'.png':'image/png','.jpg':'image/jpeg','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return}
 let pathname;try{pathname=new URL(req.url,'http://localhost').pathname}catch{res.writeHead(400);res.end();return}
 const asset=assets.get(pathname);if(!asset){res.writeHead(404);res.end('Not found');return}
 fs.readFile(path.join(root,asset),(error,data)=>{
  if(error){res.writeHead(500);res.end('Unable to read game asset');return}
  res.writeHead(200,{'Content-Type':types[path.extname(asset)],'Content-Length':data.length,'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 });
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. Close the other server and try again.`:error.message);process.exit(1)});
server.listen(port,'127.0.0.1',()=>console.log(`Hollow House is running locally: http://localhost:${port}\nKeep this terminal open. Press Ctrl+C to stop.`));
