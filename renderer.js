/* Perspective raycasting: textured 3D corridors without external dependencies. */
const VIEW={w:1000,h:700,fov:.72,buffer:null,context:null,texture:null,sprites:null,floorImage:null,floorTexture:null,surface:null,surfaceContext:null};
function initView(){
 VIEW.buffer=document.createElement('canvas');VIEW.buffer.width=VIEW.w;VIEW.buffer.height=VIEW.h;VIEW.context=VIEW.buffer.getContext('2d');
 VIEW.texture=makeStoneTexture();VIEW.normalWalls=makeDecorTextures(false);VIEW.psychoWalls=makeDecorTextures(true);VIEW.floorTexture=makeFloorTexture();VIEW.surface=document.createElement('canvas');VIEW.surface.width=VIEW.w/2;VIEW.surface.height=VIEW.h/2;VIEW.surfaceContext=VIEW.surface.getContext('2d');VIEW.floorImage=VIEW.surfaceContext.createImageData(VIEW.w/2,VIEW.h/2);
 function sprite(draw){let c=document.createElement('canvas');c.width=576;c.height=768;const paint=c.getContext('2d');paint.scale(3,3);draw(paint);return c}
 VIEW.sprites={
  relic:sprite(c=>{c.translate(96,134);let g=c.createRadialGradient(0,0,0,0,0,75);g.addColorStop(0,'#f1c86466');g.addColorStop(1,'#f1c86400');c.fillStyle=g;c.fillRect(-90,-100,180,200);c.shadowColor='#ffce66';c.shadowBlur=20;c.fillStyle='#f7db8b';c.beginPath();c.moveTo(0,-46);c.lineTo(24,0);c.lineTo(0,42);c.lineTo(-24,0);c.closePath();c.fill();c.shadowBlur=0;c.fillStyle='#b28139';c.beginPath();c.moveTo(0,-46);c.lineTo(24,0);c.lineTo(0,42);c.closePath();c.fill();c.strokeStyle='#ffefbf';c.beginPath();c.moveTo(0,-46);c.lineTo(0,42);c.stroke()}),
  enemy:sprite(c=>drawShadowEntity(c,0)),
  door:sprite(c=>{c.fillStyle='#708471';c.fillRect(38,23,116,233);c.fillStyle='#182b23';c.fillRect(47,33,98,223);c.strokeStyle='#4f6454';c.lineWidth=3;c.strokeRect(56,49,79,82);c.strokeRect(56,145,79,92);c.fillStyle='#d5c18b';c.beginPath();c.arc(126,143,4,0,7);c.fill();c.fillStyle='#c6e69a';c.font='bold 17px sans-serif';c.textAlign='center';c.fillText('EXIT',96,18)})
 };enhanceSprites();VIEW.enemyFrames=[VIEW.sprites.enemy,...[1.5,3,4.5].map(phase=>sprite(c=>drawShadowEntity(c,phase)))];
 VIEW.enemyWalkFrames=Array.from({length:12},(_,i)=>sprite(c=>drawShadowEntity(c,i*Math.PI/6,1,false)));
 VIEW.enemyRunFrames=Array.from({length:12},(_,i)=>sprite(c=>drawShadowEntity(c,i*Math.PI/6,1,true)));
}
function castRay(p,rx,ry){
 let x=Math.floor(p.x),y=Math.floor(p.y),ddx=Math.abs(1/rx),ddy=Math.abs(1/ry),sx=rx<0?-1:1,sy=ry<0?-1:1;
 let ax=(rx<0?p.x-x:x+1-p.x)*ddx,ay=(ry<0?p.y-y:y+1-p.y)*ddy,side=0;
 for(let i=0;i<100;i++){if(ax<ay){ax+=ddx;x+=sx;side=0}else{ay+=ddy;y+=sy;side=1}if(world.grid[y]?.[x]!==0)break}
 let depth=Math.max(.025,side?ay-ddy:ax-ddx),u=side?p.x+depth*rx:p.y+depth*ry;u-=Math.floor(u);return{depth,u,side,x,y};
}
function projectObject(object,p,dir,plane){let dx=object.x-p.x,dy=object.y-p.y,inv=1/(plane.x*dir.y-dir.x*plane.y);return{side:inv*(dir.y*dx-dir.x*dy),depth:inv*(-plane.y*dx+plane.x*dy)}}
function makeStoneTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');let seed=731;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 c.fillStyle='#252c2c';c.fillRect(0,0,512,512);
 for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
  const x=col*128+(row%2)*64,y=row*64,tint=Math.floor(random()*13),g=c.createLinearGradient(x,y,x,y+64);
  g.addColorStop(0,`rgb(${103+tint},${110+tint},${104+tint})`);g.addColorStop(1,`rgb(${72+tint},${81+tint},${78+tint})`);c.fillStyle=g;c.fillRect(x+3,y+3,122,58);
  c.strokeStyle='#b6c1ae55';c.lineWidth=1;c.strokeRect(x+4.5,y+4.5,119,55);c.fillStyle='#0f191c66';c.fillRect(x+3,y+59,122,2);
 }
 const image=c.getImageData(0,0,512,512),d=image.data;for(let i=0;i<d.length;i+=4){const n=(random()-.5)*17;d[i]+=n;d[i+1]+=n;d[i+2]+=n}c.putImageData(image,0,0);
 for(let i=0;i<95;i++){let x=random()*512,y=random()*512;c.strokeStyle=i%3?'#202c2d70':'#c7c8b53b';c.lineWidth=random()*1.4+.4;c.beginPath();c.moveTo(x,y);for(let j=0;j<4;j++){x+=(random()-.5)*16;y+=random()*12;c.lineTo(x,y)}c.stroke()}
 // Aged metal skirting, inset rivets, and a narrow service conduit.
 const metal=c.createLinearGradient(0,455,0,512);metal.addColorStop(0,'#525e5b');metal.addColorStop(.15,'#879088');metal.addColorStop(.3,'#35413f');metal.addColorStop(1,'#1e2d2b');c.fillStyle=metal;c.fillRect(0,455,512,57);c.fillStyle='#b7c3b055';c.fillRect(0,458,512,2);
 for(let x=20;x<512;x+=64){c.fillStyle='#101b1d';c.beginPath();c.arc(x,476,3,0,Math.PI*2);c.fill();c.fillStyle='#a0aaa0';c.fillRect(x-1,474,2,1)}
 c.fillStyle='#162325';c.fillRect(0,47,512,8);c.fillStyle='#8b979166';c.fillRect(0,48,512,2);return canvas;
}
function makeDecorTextures(psycho){
 return Array.from({length:7},(_,kind)=>{
  const texture=document.createElement('canvas');texture.width=texture.height=512;const c=texture.getContext('2d');c.drawImage(VIEW.texture,0,0);
  if(kind===1||kind===5){
   c.fillStyle=kind===1?'#4b4034':'#454440';c.fillRect(0,0,512,453);
   for(let x=0;x<512;x+=32){c.fillStyle=x%64?'#645a4233':'#10151466';c.fillRect(x,0,2,453);c.strokeStyle='#a39b7244';c.strokeRect(x+5,14,22,423)}
   c.fillStyle='#291f1c';c.fillRect(0,410,512,45);c.fillStyle='#88735a';c.fillRect(0,405,512,5);
  }
  if(kind===2||kind===6){
   c.fillStyle='#171a16';c.fillRect(130,70,252,305);c.fillStyle='#80613c';c.fillRect(138,78,236,288);c.fillStyle='#30251e';c.fillRect(146,86,220,272);c.fillStyle='#172124';c.fillRect(158,98,196,247);
   const haze=c.createRadialGradient(256,173,10,256,218,126);haze.addColorStop(0,'#637069');haze.addColorStop(1,'#111714');c.fillStyle=haze;c.fillRect(159,99,194,245);
   c.fillStyle='#070908';c.beginPath();c.moveTo(230,179);c.lineTo(278,179);c.lineTo(299,329);c.lineTo(215,329);c.closePath();c.fill();
   c.fillStyle='#d0d0b7';c.beginPath();c.ellipse(256,149,18,31,0,0,Math.PI*2);c.fill();c.fillStyle='#530810';c.fillRect(245,146,5,2);c.fillRect(264,146,5,2);c.strokeStyle='#070908';c.lineWidth=8;
   for(const side of [-1,1]){c.beginPath();c.moveTo(256+side*20,194);c.lineTo(256+side*53,271);c.lineTo(256+side*65,328);c.stroke();c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(256+side*15,218+i*20);c.quadraticCurveTo(256+side*94,170+i*20,256+side*80,109+i*25);c.stroke()}}
   c.strokeStyle='#b5995955';c.lineWidth=2;c.strokeRect(142,82,228,280);c.fillStyle='#a49677';c.font='10px serif';c.textAlign='center';c.fillText('THE ONE IN THE HALLS',256,358);
  }
  if(kind===3||kind===4){
   const left=kind===3?48:84,width=kind===3?416:344;c.fillStyle='#0b1110';c.fillRect(left-8,33,width+16,423);
   const wood=c.createLinearGradient(left,0,left+width,0);wood.addColorStop(0,'#32291e');wood.addColorStop(.5,'#786047');wood.addColorStop(1,'#30261d');c.fillStyle=wood;c.fillRect(left,43,width,400);
   c.fillStyle='#99805c';c.fillRect(left-5,34,width+10,13);c.fillStyle='#271e19';c.fillRect(left-5,47,width+10,7);
   for(let x=left+9;x<left+width;x+=15){c.strokeStyle='#140f0c44';c.lineWidth=1;c.beginPath();c.moveTo(x,53);c.bezierCurveTo(x-5,160,x+7,265,x-2,438);c.stroke()}
   c.fillStyle='#151513';c.fillRect(254,53,4,390);c.strokeStyle='#9d805855';c.lineWidth=4;
   for(const x of [left+15,269]){const w=width/2-30;c.strokeRect(x,65,w,152);c.strokeRect(x,246,w,166)}
   c.fillStyle='#b79d65';for(const x of [244,269]){c.beginPath();c.ellipse(x,235,4,9,0,0,7);c.fill()}
   if(kind===4){c.fillStyle='#151b17';for(let y=90;y<198;y+=14){c.fillRect(left+30,y,width/2-55,4);c.fillRect(285,y,width/2-55,4)}}
   c.fillStyle='#131713';c.fillRect(left-4,441,width+8,13);
  }
  if(psycho){
   c.fillStyle='#520916cc';c.beginPath();c.ellipse(155,180,64,36,-.3,0,7);c.fill();c.fillStyle='#850b1ccc';
   for(let i=0;i<13;i++){const x=103+i*10,y=160+(i%4)*12,length=40+(i*37)%180;c.fillRect(x,y,3+(i%4),length);c.beginPath();c.ellipse(x+2,y+length,3,6,0,0,7);c.fill()}
   c.fillStyle='#640c15';for(let i=0;i<27;i++){c.beginPath();c.arc(60+(i*67)%350,120+(i*31)%160,1+i%5,0,7);c.fill()}
   // Spider silk is painted into the wall plane, so it follows perspective.
   for(const corner of [0,512]){c.strokeStyle='#c9d1c055';c.lineWidth=1.4;for(let i=0;i<7;i++){const angle=i*Math.PI/12;c.beginPath();c.moveTo(corner,0);c.lineTo(corner+(corner===0?1:-1)*Math.cos(angle)*185,Math.sin(angle)*185);c.stroke()}
    for(let r=30;r<=180;r+=30){c.beginPath();for(let i=0;i<7;i++){const angle=i*Math.PI/12,x=corner+(corner===0?1:-1)*Math.cos(angle)*r,y=Math.sin(angle)*r;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}}
   c.fillStyle='#0b0a0b';c.beginPath();c.ellipse(439,106,5,8,0,0,7);c.fill();c.strokeStyle='#131012';for(let i=0;i<4;i++)for(const side of [-1,1]){c.beginPath();c.moveTo(439,102+i*3);c.lineTo(439+side*12,97+i*6);c.lineTo(439+side*17,92+i*9);c.stroke()}
  }
  return texture;
 });
}
function makeFloorTexture(){
 const tex=document.createElement('canvas');tex.width=tex.height=128;const c=tex.getContext('2d');c.fillStyle='#69726d';c.fillRect(0,0,128,128);c.fillStyle='#303d3c';c.fillRect(0,0,128,3);c.fillRect(0,0,3,128);c.fillStyle='#9ba397';c.fillRect(3,3,124,1);c.fillRect(3,3,1,124);
 let seed=91;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const image=c.getImageData(0,0,128,128);for(let i=0;i<image.data.length;i+=4){const n=(random()-.5)*12;for(let j=0;j<3;j++)image.data[i+j]+=n}return image.data;
}
function drawSurfaces(p,dir,plane,horizon){
 const W=VIEW.w/2,H=VIEW.h/2,d=VIEW.floorImage.data,tex=VIEW.floorTexture;horizon/=2;
 for(let y=0;y<H;y++){const floor=y>horizon,eye=floor?p.height:1-p.height,depth=Math.min(80,H*eye/Math.max(.5,Math.abs(y-horizon))),stepX=depth*plane.x*2/W,stepY=depth*plane.y*2/W;let fx=p.x+depth*(dir.x-plane.x),fy=p.y+depth*(dir.y-plane.y);
  for(let x=0;x<W;x++){const u=fx-Math.floor(fx),v=fy-Math.floor(fy),camera=2*x/W-1,beam=Math.exp(-camera*camera*2.8),light=difficulty==='psycho'?(flashlightOn?(.005+.95*Math.exp(-camera*camera*7))/(1+depth*.35):.002):(flashlightOn?(.26+.67*beam)/(1+depth*.13):.13/(1+depth*.18)),ix=Math.floor(u*128),iy=Math.floor(v*128),ti=(iy*128+ix)*4;let r,g,b;
   if(floor){const alternate=(Math.floor(fx)+Math.floor(fy))&1,shade=alternate?.89:1;r=tex[ti]*light*shade;g=tex[ti+1]*light*shade;b=tex[ti+2]*light*shade}
   else{const seam=u<.016||v<.02,fixture=difficulty!=='psycho'&&(Math.floor(fx)+Math.floor(fy))%5===0&&u>.27&&u<.73&&v>.43&&v<.57&&world.grid[Math.floor(fy)]?.[Math.floor(fx)]===0;const shade=seam?15:43+(Math.floor(u*64)%7)*.4;r=fixture?167:shade*light;g=fixture?186:shade*light*1.1;b=fixture?169:shade*light*1.13}
   const i=(y*W+x)*4;d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;fx+=stepX;fy+=stepY;
  }
 }VIEW.surfaceContext.putImageData(VIEW.floorImage,0,0);VIEW.context.drawImage(VIEW.surface,0,0,VIEW.w,VIEW.h);
}
function enhanceSprites(){
 const relic=VIEW.sprites.relic.getContext('2d');relic.setTransform(3,0,0,3,0,0);relic.strokeStyle='#fff5c8';relic.lineWidth=.8;for(let side of [-1,1]){relic.beginPath();relic.moveTo(96,88);relic.lineTo(96+side*13,133);relic.lineTo(96,176);relic.moveTo(72,134);relic.lineTo(120,134);relic.stroke()}relic.strokeStyle='#d4b97099';relic.beginPath();relic.ellipse(96,143,40,10,0,0,Math.PI*2);relic.stroke();
 const door=VIEW.sprites.door.getContext('2d');door.setTransform(3,0,0,3,0,0);door.strokeStyle='#94aa8a';door.lineWidth=1;door.strokeRect(40,25,111,230);door.fillStyle='#607064';for(let y=55;y<110;y+=8)door.fillRect(67,y,58,2);door.fillStyle='#afc8a5';for(let y of [45,237])for(let x of [43,149])door.fillRect(x,y,2,3);door.fillStyle='#a6c9ac';door.fillRect(42,34,3,216);door.fillRect(148,34,3,216);
}
function drawFlashlight(bob){
 ctx.save();ctx.translate(750,700+bob*2);ctx.rotate(-.23);const cloth=ctx.createLinearGradient(-55,0,52,0);cloth.addColorStop(0,'#26332c');cloth.addColorStop(.5,profile.color);cloth.addColorStop(1,'#39473a');ctx.fillStyle=cloth;ctx.beginPath();ctx.roundRect(-43,-91,91,170,15);ctx.fill();ctx.strokeStyle='#1e2c3655';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-29,-73);ctx.lineTo(-30,75);ctx.stroke();ctx.fillStyle='#2d3732';ctx.beginPath();ctx.roundRect(-40,-102,85,21,5);ctx.fill();ctx.fillStyle=profile.skin;ctx.beginPath();ctx.ellipse(0,-120,30,35,0,0,7);ctx.fill();ctx.strokeStyle='#573c3444';ctx.lineWidth=1.5;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(7,-137+i*10);ctx.lineTo(24,-135+i*10);ctx.stroke()}
 if(profile.outfit==='padded'){ctx.strokeStyle='#1b362a88';ctx.lineWidth=1.4;for(let y=-76;y<50;y+=14){ctx.beginPath();ctx.moveTo(-40,y);ctx.quadraticCurveTo(0,y+6,44,y);ctx.stroke()}}
 if(profile.outfit==='tactical'){ctx.fillStyle='#172b2488';ctx.beginPath();ctx.roundRect(-27,-53,47,34,4);ctx.fill();ctx.strokeStyle='#b5c7aa66';ctx.strokeRect(-22,-48,36,23);ctx.fillStyle='#93b087';ctx.fillRect(-13,-41,18,3)}
 const metal=ctx.createLinearGradient(-22,0,23,0);metal.addColorStop(0,'#131e24');metal.addColorStop(.35,'#5e716d');metal.addColorStop(.6,'#334644');metal.addColorStop(1,'#17252a');ctx.fillStyle=metal;ctx.beginPath();ctx.roundRect(-22,-192,45,102,5);ctx.fill();ctx.strokeStyle='#0f1b20';ctx.lineWidth=3;for(let y=-150;y<-96;y+=7){ctx.beginPath();ctx.moveTo(-20,y);ctx.lineTo(21,y);ctx.stroke()}ctx.fillStyle='#8fa4a0';ctx.beginPath();ctx.roundRect(-29,-210,59,26,6);ctx.fill();ctx.fillStyle='#d4e2c3';ctx.fillRect(-24,-208,49,5);ctx.fillStyle='#1c2c2a';ctx.beginPath();ctx.roundRect(-8,-181,16,23,4);ctx.fill();ctx.fillStyle='#b1d887';ctx.fillRect(-3,-176,6,5);
 const thumb=ctx.createRadialGradient(26,-122,1,23,-118,20);thumb.addColorStop(0,profile.skin);thumb.addColorStop(.75,profile.skin);thumb.addColorStop(1,'#79503b');ctx.fillStyle=thumb;ctx.beginPath();ctx.ellipse(22,-119,10,20,-.22,0,7);ctx.fill();ctx.strokeStyle='#51382f55';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(18,-116);ctx.quadraticCurveTo(22,-113,28,-114);ctx.moveTo(16,-124);ctx.quadraticCurveTo(23,-121,29,-122);ctx.stroke();ctx.restore();
}
function render3D(){
 if(!VIEW.buffer)initView();const c=VIEW.context,W=VIEW.w,H=VIEW.h;
 if(!world){let g=ctx.createLinearGradient(0,0,0,700);g.addColorStop(0,'#080d0c');g.addColorStop(1,'#26352c');ctx.fillStyle=g;ctx.fillRect(0,0,1000,700);ctx.strokeStyle='#47604a';for(let i=0;i<7;i++){let inset=80+i*55;ctx.strokeRect(inset,inset*.6,1000-2*inset,700-inset*1.2)}return}
 let player=world.player,p=getCameraPose(),angle=p.angle||0,dir={x:Math.cos(angle),y:Math.sin(angle)},plane={x:-dir.y*VIEW.fov,y:dir.x*VIEW.fov};
 let walking=mode==='playing'&&player.motion>0,bob=walking?Math.sin((player.gaitPhase||0)*2)*(player.running?5:2)*(cameraMode==='third'?.35:1):0,horizon=H*(p.horizonRatio+(player.lookOffset||0))+bob;
 drawSurfaces(p,dir,plane,horizon);
 const z=new Float32Array(W);
 for(let x=0;x<W;x++){let camera=2*x/W-1,ray=castRay(p,dir.x+plane.x*camera,dir.y+plane.y*camera);z[x]=ray.depth;let height=H/ray.depth,top=horizon-height*(1-p.height);const walls=difficulty==='psycho'?VIEW.psychoWalls:VIEW.normalWalls,texture=walls[Math.abs(ray.x*17+ray.y*31+ray.side*7)%walls.length];c.drawImage(texture,Math.floor(ray.u*511),0,1,512,x,top,1,height);let beam=Math.exp(-camera*camera*3),shade=difficulty==='psycho'?1-(flashlightOn?Math.max(.004,.92*Math.exp(-camera*camera*7)/(1+ray.depth*.24)):.003):Math.min(.94,.08+ray.depth*.052+(ray.side?.10:0)+(1-beam)*.24+(flashlightOn?0:.48));c.fillStyle=difficulty==='psycho'?`rgba(0,0,0,${shade})`:`rgba(4,9,11,${shade})`;c.fillRect(x,top,1,height);c.fillStyle=`rgba(0,0,0,${Math.min(.72,.25+ray.depth*.024)})`;c.fillRect(x,top+height*.96,1,height*.04);if(difficulty!=='psycho'&&(ray.x+ray.y)%4===0){c.fillStyle=`rgba(174,208,183,${Math.max(.02,.24-ray.depth*.016)})`;c.fillRect(x,top+height*.16,1,height*.004)}}
 let items=[{...world.exit,type:'door'},...world.relics.filter(r=>!r.taken).map(r=>({...r,type:'relic'})),{...world.enemy,type:'enemy'}];
 if(cameraMode==='third'&&p.distance>=.42)items.push({...player,type:'player'});
 let objects=items.map(o=>({...o,...projectObject(o,p,dir,plane)})).filter(o=>o.depth>.08).sort((a,b)=>b.depth-a.depth);
 for(let o of objects){let height=H/o.depth*(o.type==='relic'?.48:o.type==='enemy'?1.04:o.type==='player'?.88:.94),width=height*.75,screen=W/2*(1+o.side/o.depth),bottom=horizon+H*p.height/o.depth,top=bottom-height;if(o.type==='relic')top=horizon-height/2+Math.sin(world.time*3)*4/o.depth;let left=screen-width/2,right=screen+width/2;if(right<0||left>W)continue;let sprite=o.type==='enemy'?getEnemySprite(o):o.type==='player'?getPlayerSprite():VIEW.sprites[o.type];c.globalAlpha=(o.type==='player'?1:Math.max(.3,1-o.depth/18))*(difficulty==='psycho'&&o.type!=='relic'?(flashlightOn?Math.max(.02,Math.exp(-Math.pow(o.side/o.depth,2)*7)/(1+o.depth*.14)):.015):1);for(let x=Math.max(0,Math.floor(left));x<Math.min(W,right);x++)if(o.depth<z[x]){let u=Math.max(0,Math.min(sprite.width-1,Math.floor((x-left)/width*sprite.width)));c.drawImage(sprite,u,0,1,sprite.height,x,top,1,height)}c.globalAlpha=1}
 ctx.imageSmoothingEnabled=true;ctx.drawImage(VIEW.buffer,0,0,1000,700);
 if(cameraMode==='third'&&p.distance<.42){ctx.save();ctx.translate(500-96*2.7,350-35*2.7);ctx.scale(2.7,2.7);drawSurvivorBack(ctx,player.gaitPhase||0,walking?1:0,player.running);ctx.restore()}
 let vignette=ctx.createRadialGradient(500,340,180,500,340,670);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#00000070');ctx.fillStyle=vignette;ctx.fillRect(0,0,1000,700);
 // Your customized sleeve and a handheld flashlight stay visible in first person.
 if(cameraMode==='first'){ctx.save();if(difficulty==='psycho')ctx.globalAlpha=flashlightOn?.7:.035;drawFlashlight(bob);ctx.restore()};
 ctx.fillStyle='#b0c5a8';ctx.font='11px sans-serif';ctx.fillText(cameraMode==='third'?'THIRD PERSON · V TO SWITCH':'FIRST PERSON · V TO SWITCH',28,53);
 ctx.fillStyle='#dce8c388';ctx.fillRect(497,347,6,6);if(difficulty!=='psycho')drawMiniMap();ctx.fillStyle='#b6c2aa';ctx.font='12px sans-serif';ctx.fillText('STAMINA',28,667);ctx.fillStyle='#29362c';ctx.fillRect(100,658,135,7);ctx.fillStyle=world.stamina>25?'#c6e69a':'#d18766';ctx.fillRect(100,658,world.stamina*1.35,7);ctx.fillStyle='#99ad98';ctx.font='11px sans-serif';ctx.fillText(deviceMode==='phone'?'JOYSTICK TO MOVE · SWIPE TO LOOK':document.pointerLockElement===canvas?'MOUSE LOOK ACTIVE · ESC TO RELEASE':'CLICK TO LOOK · Q / E OR ← / → TO TURN',28,31);if(difficulty==='psycho'){ctx.fillStyle=flashlightOn?'#cfdbc0':'#e2a9ab';ctx.fillText('PSYCHO MODE · '+(flashlightOn?'FLASHLIGHT ON':'PRESS F / TAP LIGHT — FLASHLIGHT OFF'),28,78);}
 if(world.enemy.state==='chase'){ctx.strokeStyle='#e0605566';ctx.lineWidth=14;ctx.strokeRect(7,7,986,686)}
}
function getEnemySprite(enemy){
 if(enemy.motion>0){const frames=enemy.running?VIEW.enemyRunFrames:VIEW.enemyWalkFrames;return frames[Math.floor((enemy.gaitPhase||0)*frames.length/(Math.PI*2))%frames.length]}
 return VIEW.enemyFrames[Math.floor(world.time*2)%4];
}
function getPlayerSprite(){
 if(!VIEW.playerSprite){VIEW.playerSprite=document.createElement('canvas');VIEW.playerSprite.width=576;VIEW.playerSprite.height=768}
 const p=world.player,moving=mode==='playing'&&p.motion>0,phase=moving?p.gaitPhase||0:0,key=[profile.color,profile.skin,profile.gender,profile.outfit,profile.hair,Math.floor(phase*12/Math.PI),moving,p.running].join('|');
 if(key!==VIEW.playerPoseKey){const c=VIEW.playerSprite.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,576,768);c.save();c.scale(3,3);drawSurvivorBack(c,phase,moving?1:0,p.running);c.restore();VIEW.playerPoseKey=key}
 return VIEW.playerSprite;
}
function drawMiniMap(){let p=world.player,cell=9,r=6,x0=855,y0=40;ctx.fillStyle='#07100dda';ctx.fillRect(x0-10,y0-10,137,145);for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){let gx=Math.floor(p.x)+x,gy=Math.floor(p.y)+y;ctx.fillStyle=world.grid[gy]?.[gx]===0?'#33473a':'#142019';ctx.fillRect(x0+(x+r)*cell,y0+(y+r)*cell,cell-1,cell-1)}let px=x0+(r+p.x%1)*cell,py=y0+(r+p.y%1)*cell;ctx.fillStyle=profile.color;ctx.beginPath();ctx.arc(px,py,3,0,7);ctx.fill();ctx.strokeStyle='#e3efc8';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(p.angle||0)*10,py+Math.sin(p.angle||0)*10);ctx.stroke();ctx.fillStyle='#819c85';ctx.font='9px sans-serif';ctx.fillText('LOCAL MAP',x0,y0+130)}
