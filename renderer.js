/* Perspective raycasting: textured 3D corridors without external dependencies. */
const VIEW={w:1000,h:700,fov:.72,buffer:null,context:null,texture:null,sprites:null,floorImage:null,floorTexture:null,surface:null,surfaceContext:null};
const REAL_WALL=typeof Image==='function'?new Image():null;
if(REAL_WALL){REAL_WALL.onload=()=>{if(!VIEW.buffer)return;VIEW.normalWalls=makeDecorTextures(false);VIEW.psychoWalls=makeDecorTextures(true);VIEW.bareNormalWalls=null;VIEW.barePsychoWalls=null;if(typeof GPU!=='undefined'&&GPU){const g=GPU,gl=g.gl;gl.activeTexture(gl.TEXTURE0);for(const [index,walls] of [makeDecorTextures(false,true),makeDecorTextures(true,true)].entries()){gl.bindTexture(gl.TEXTURE_2D_ARRAY,g.textures[index]);walls.forEach((image,layer)=>gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,512,512,1,gl.RGBA,gl.UNSIGNED_BYTE,image));gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,21,512,512,1,gl.RGBA,gl.UNSIGNED_BYTE,makeDecorTextures(false,true)[0]);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);}}};REAL_WALL.src='assets/wall-plaster.jpg';}
function initView(){
 VIEW.buffer=document.createElement('canvas');VIEW.buffer.width=VIEW.w;VIEW.buffer.height=VIEW.h;VIEW.context=VIEW.buffer.getContext('2d');
 VIEW.texture=makeStoneTexture();VIEW.furnitureMaterials=makeFurnitureMaterials();VIEW.normalWalls=makeDecorTextures(false);VIEW.psychoWalls=makeDecorTextures(true);VIEW.floorTexture=makeFloorTexture();VIEW.surface=document.createElement('canvas');VIEW.surface.width=VIEW.w/2;VIEW.surface.height=VIEW.h/2;VIEW.surfaceContext=VIEW.surface.getContext('2d');VIEW.floorImage=VIEW.surfaceContext.createImageData(VIEW.w/2,VIEW.h/2);
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
function makeDecorTextures(psycho,bare=false){
 return Array.from({length:11},(_,kind)=>{
  const texture=document.createElement('canvas');texture.width=texture.height=512;const c=texture.getContext('2d');c.drawImage(VIEW.texture,0,0);
  if(REAL_WALL?.complete&&REAL_WALL.naturalWidth){c.save();if(kind%2){c.translate(512,0);c.scale(-1,1);}c.drawImage(REAL_WALL,0,0,512,455);c.restore();c.fillStyle='rgba(25,32,29,'+(.06+(kind%3)*.035)+')';c.fillRect(0,0,512,455);}
  if(kind===1){
   c.fillStyle=kind===1?'#4b4034':'#454440';c.fillRect(0,0,512,453);
   for(let x=0;x<512;x+=32){c.fillStyle=x%64?'#645a4233':'#10151466';c.fillRect(x,0,2,453);c.strokeStyle='#a39b7244';c.strokeRect(x+5,14,22,423)}
   c.fillStyle='#291f1c';c.fillRect(0,410,512,45);c.fillStyle='#88735a';c.fillRect(0,405,512,5);
  }
  if(kind===2&&!bare){
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
  if(kind>=6&&!bare)paintWallPicture(c,kind);
  if(psycho){
   for(let claw=0;claw<4;claw++){const x=58+claw*22;c.strokeStyle='#b6aa8966';c.lineWidth=8;c.beginPath();c.moveTo(x+12,92);c.bezierCurveTo(x-10,154,x+27,222,x-6,307);c.stroke();c.strokeStyle='#170e0c';c.lineWidth=4;c.stroke();}
   // Uneven dried smears, thin gravity trails and irregular splatter.
   let bloodSeed=417+kind*977;const stainRandom=()=>{bloodSeed=(Math.imul(bloodSeed,1664525)+1013904223)>>>0;return bloodSeed/4294967296;};
   c.save();c.globalCompositeOperation='multiply';
   for(let stroke=0;stroke<19;stroke++){const x=115+stainRandom()*98,y=138+stainRandom()*52;c.strokeStyle=stroke%3?'#49131999':'#721b2080';c.lineWidth=2+stainRandom()*8;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-9,y+16,x+13,y+29,x-17,y+35+stainRandom()*26);c.stroke();}
   for(let drip=0;drip<12;drip++){const x=112+stainRandom()*89,y=170+stainRandom()*34,length=17+Math.pow(stainRandom(),2)*148;c.strokeStyle='#571419a8';c.lineWidth=.8+stainRandom()*2;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+2,y+length*.4,x-2,y+length*.8,x+.5,y+length);c.stroke();c.fillStyle='#3c1116a0';c.beginPath();c.ellipse(x+.5,y+length,1+stainRandom(),2.6,0,0,7);c.fill();}
   for(let dot=0;dot<73;dot++){const x=88+stainRandom()*163,y=119+stainRandom()*144,r=.3+Math.pow(stainRandom(),3)*3.5;c.fillStyle=dot%2?'#46141aa0':'#681c2266';c.beginPath();c.ellipse(x,y,r,r*(.6+stainRandom()),stainRandom(),0,7);c.fill();}c.restore();
   // Spider silk is painted into the wall plane, so it follows perspective.
   for(const corner of [0,512]){c.strokeStyle='#c9d1c055';c.lineWidth=1.4;for(let i=0;i<7;i++){const angle=i*Math.PI/12;c.beginPath();c.moveTo(corner,0);c.lineTo(corner+(corner===0?1:-1)*Math.cos(angle)*185,Math.sin(angle)*185);c.stroke()}
    for(let r=30;r<=180;r+=30){c.beginPath();for(let i=0;i<7;i++){const angle=i*Math.PI/12,x=corner+(corner===0?1:-1)*Math.cos(angle)*r,y=Math.sin(angle)*r;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}}
   c.fillStyle='#0b0a0b';c.beginPath();c.ellipse(439,106,5,8,0,0,7);c.fill();c.strokeStyle='#131012';for(let i=0;i<4;i++)for(const side of [-1,1]){c.beginPath();c.moveTo(439,102+i*3);c.lineTo(439+side*12,97+i*6);c.lineTo(439+side*17,92+i*9);c.stroke()}
  }
  return texture;
 });
}
function paintWallPicture(c,kind){
 c.save();c.shadowColor='#000b';c.shadowBlur=14;c.shadowOffsetX=8;c.shadowOffsetY=10;c.fillStyle='#1c160f';c.fillRect(126,63,260,310);c.shadowBlur=0;
 const gold=c.createLinearGradient(128,65,383,366);gold.addColorStop(0,'#a08c60');gold.addColorStop(.15,'#493a24');gold.addColorStop(.5,'#c8ad72');gold.addColorStop(.75,'#493624');gold.addColorStop(1,'#887447');c.fillStyle=gold;c.fillRect(130,66,250,300);
 c.strokeStyle='#e5cca36b';c.lineWidth=2;c.strokeRect(133,69,244,294);c.strokeStyle='#271b12';c.lineWidth=8;c.strokeRect(149,86,212,260);
 const background=c.createLinearGradient(156,94,350,335);background.addColorStop(0,'#465051');background.addColorStop(.5,'#242832');background.addColorStop(1,'#12181e');c.fillStyle=background;c.fillRect(156,94,200,244);
 c.save();c.beginPath();c.rect(156,94,200,244);c.clip();
 if(kind===6){
  c.strokeStyle='#a0a9a955';c.lineWidth=1;for(let i=0;i<12;i++){c.beginPath();c.moveTo(256,177);c.lineTo(256+Math.cos(i*Math.PI/6)*165,177+Math.sin(i*Math.PI/6)*160);c.stroke()}for(let r=25;r<165;r+=27){c.beginPath();c.ellipse(256,177,r,r*.8,0,0,7);c.stroke()}
  c.strokeStyle='#151313';c.lineWidth=5;for(let i=0;i<4;i++)for(const side of [-1,1]){c.beginPath();c.moveTo(256+side*13,220+i*6);c.lineTo(256+side*(45+i*5),170+i*31);c.lineTo(256+side*(75-i*5),156+i*43);c.stroke()}
  const body=c.createRadialGradient(249,235,3,259,249,37);body.addColorStop(0,'#736152');body.addColorStop(.35,'#3c2d24');body.addColorStop(1,'#0f0c0c');c.fillStyle=body;c.beginPath();c.ellipse(256,248,26,38,0,0,7);c.fill();c.beginPath();c.ellipse(256,211,15,17,0,0,7);c.fill();c.fillStyle='#d7be91';for(let i=0;i<6;i++){c.beginPath();c.arc(247+i*3,209+(i%2)*3,1.5,0,7);c.fill()}
 }else if(kind===7){
  c.fillStyle='#514634';c.fillRect(176,286,161,15);c.fillStyle='#171919';c.fillRect(183,301,148,37);
  const vase=c.createLinearGradient(206,0,299,0);vase.addColorStop(0,'#191e21');vase.addColorStop(.35,'#879086');vase.addColorStop(.6,'#384742');vase.addColorStop(1,'#101617');c.fillStyle=vase;c.beginPath();c.moveTo(236,178);c.bezierCurveTo(273,181,245,207,286,236);c.bezierCurveTo(314,279,202,299,214,244);c.bezierCurveTo(228,212,245,202,236,178);c.fill();c.strokeStyle='#ccb581';c.lineWidth=2;c.beginPath();c.ellipse(250,179,17,5,0,0,7);c.stroke();
  c.strokeStyle='#a18a68';c.lineWidth=4;c.beginPath();c.moveTo(190,172);c.lineTo(208,136);c.lineTo(230,126);c.moveTo(295,155);c.lineTo(306,121);c.stroke();c.fillStyle='#b8a477';c.beginPath();c.ellipse(300,121,8,12,-.2,0,7);c.fill();c.fillStyle='#1e1517';c.beginPath();c.arc(300,121,4,0,7);c.fill();c.strokeStyle='#80655c';c.lineWidth=3;c.beginPath();c.moveTo(255,170);c.lineTo(264,115);c.lineTo(277,135);c.stroke();
 }else if(kind===8){
  c.fillStyle='#a08b6f44';c.fillRect(156,94,200,244);c.fillStyle='#5f5846';c.fillRect(165,167,175,160);c.fillStyle='#3c3934';c.beginPath();c.moveTo(164,169);c.lineTo(246,120);c.lineTo(338,170);c.closePath();c.fill();
  for(const person of [{x:202,y:174,scale:1.05,skin:'#aa8971',hair:'#252321',coat:'#232527'},{x:292,y:181,scale:.98,skin:'#cfaf8a',hair:'#4a3024',coat:'#493431'},{x:242,y:240,scale:.64,skin:'#b99c7a',hair:'#403024',coat:'#3b4741'},{x:278,y:249,scale:.58,skin:'#d2b794',hair:'#6b4c30',coat:'#625b48'}]){
   c.save();c.translate(person.x,person.y);c.scale(person.scale,person.scale);const suit=c.createLinearGradient(-24,0,28,80);suit.addColorStop(0,person.coat);suit.addColorStop(1,'#121715');c.fillStyle=suit;c.beginPath();c.moveTo(-17,25);c.quadraticCurveTo(-29,29,-31,78);c.lineTo(32,78);c.quadraticCurveTo(30,29,17,25);c.closePath();c.fill();c.fillStyle='#c9b697';c.beginPath();c.moveTo(-12,26);c.lineTo(0,44);c.lineTo(11,26);c.closePath();c.fill();
   const face=c.createRadialGradient(-4,0,1,2,3,21);face.addColorStop(0,person.skin);face.addColorStop(1,'#76604e');c.fillStyle=face;c.beginPath();c.ellipse(0,7,15,21,0,0,7);c.fill();c.fillStyle=person.hair;c.beginPath();c.ellipse(0,-6,16,10,0,Math.PI,Math.PI*2);c.fill();c.fillRect(-15,-5,4,12);c.fillRect(11,-5,4,12);c.strokeStyle='#342e2a';c.lineWidth=1;c.beginPath();c.moveTo(-9,6);c.lineTo(-3,6);c.moveTo(3,6);c.lineTo(9,6);c.moveTo(-4,20);c.quadraticCurveTo(0,22,5,20);c.stroke();c.restore();
  }
 }else if(kind===9){
  c.fillStyle='#1a141a';c.fillRect(156,94,200,244);c.fillStyle='#a29f89';c.beginPath();c.moveTo(170,218);c.quadraticCurveTo(257,119,340,218);c.quadraticCurveTo(256,307,170,218);c.fill();const iris=c.createRadialGradient(249,209,2,257,218,43);iris.addColorStop(0,'#d6b878');iris.addColorStop(.4,'#815b35');iris.addColorStop(1,'#1c2424');c.fillStyle=iris;c.beginPath();c.arc(256,219,39,0,7);c.fill();c.fillStyle='#09090b';c.beginPath();c.ellipse(256,219,9,31,0,0,7);c.fill();c.fillStyle='#ede4bd';c.beginPath();c.ellipse(243,199,7,4,-.6,0,7);c.fill();
 }else{
  c.fillStyle='#586367';c.fillRect(156,94,200,244);c.fillStyle='#bcc2ad';c.beginPath();c.arc(315,131,19,0,7);c.fill();c.fillStyle='#242b2d';c.fillRect(230,214,80,85);c.beginPath();c.moveTo(219,214);c.lineTo(267,163);c.lineTo(319,214);c.closePath();c.fill();c.fillRect(259,140,14,78);c.fillStyle='#c2ab74';c.fillRect(274,244,10,21);c.strokeStyle='#182224';c.lineWidth=7;for(let i=0;i<5;i++){const x=161+i*42;c.beginPath();c.moveTo(x,338);c.lineTo(x+5,168+i%3*10);c.moveTo(x+5,237);c.lineTo(x-19,205);c.moveTo(x+5,230);c.lineTo(x+27,185);c.stroke()}
 }
 c.restore();c.fillStyle='#dccb9d';c.font='10px Georgia';c.textAlign='center';c.fillText(['THE WEB','ODDITIES','THE FAMILY','THE WATCHER','THE OLD CHAPEL'][kind-6],256,358);c.restore();
}
function makeFurnitureMaterials(){
 const material=(type,side=false)=>{
  const texture=document.createElement('canvas');texture.width=texture.height=512;const c=texture.getContext('2d');
  const wood=c.createLinearGradient(0,0,512,0);wood.addColorStop(0,'#291b12');wood.addColorStop(.18,'#715139');wood.addColorStop(.55,'#4f3423');wood.addColorStop(.85,'#826044');wood.addColorStop(1,'#251810');c.fillStyle=wood;c.fillRect(0,0,512,512);
  for(let i=0;i<90;i++){const x=(i*73)%512;c.strokeStyle=i%3?'#1a100d66':'#bc94692e';c.lineWidth=i%4+1;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x-7,150,x+8,330,x-4,512);c.stroke()}
  if(side){c.strokeStyle='#ab80514d';c.lineWidth=3;c.strokeRect(22,18,468,476);return texture}
  c.fillStyle='#1d130e';c.fillRect(250,13,12,488);c.fillRect(0,0,512,17);c.fillRect(0,493,512,19);c.fillStyle='#b58b5855';c.fillRect(0,17,512,4);
  for(const x of [20,277])for(const [y,h] of type==='wardrobe'?[[42,175],[277,189]]:[[50,154],[273,176]]){
   c.fillStyle='#19100d';c.fillRect(x,y,212,h);const recess=c.createLinearGradient(x,y,x+212,y+h);recess.addColorStop(0,'#2b1d14');recess.addColorStop(.5,'#63412b');recess.addColorStop(1,'#342013');c.fillStyle=recess;c.fillRect(x+7,y+7,198,h-14);
   c.strokeStyle='#b2854e';c.lineWidth=2;c.strokeRect(x+1,y+1,211,h-1);c.strokeStyle='#180e0c';c.lineWidth=4;c.strokeRect(x+8,y+9,195,h-18);
  }
  for(const x of [236,276]){const metal=c.createRadialGradient(x-2,239,1,x,244,12);metal.addColorStop(0,'#f2d9a0');metal.addColorStop(.25,'#aa8349');metal.addColorStop(1,'#35291a');c.fillStyle='#110d09';c.beginPath();c.ellipse(x+3,247,8,17,0,0,7);c.fill();c.fillStyle=metal;c.beginPath();c.ellipse(x,243,6,12,0,0,7);c.fill();c.fillStyle='#e7cf9488';c.fillRect(x-2,237,2,8)}
  if(type==='wardrobe'){c.strokeStyle='#c1a16a55';c.lineWidth=2;c.beginPath();c.moveTo(76,46);c.quadraticCurveTo(125,4,175,46);c.moveTo(331,46);c.quadraticCurveTo(384,4,432,46);c.stroke()}
  return texture;
 };
 return {wardrobe:material('wardrobe'),cabinet:material('cabinet'),side:material('wardrobe',true)};
}
function intersectFurniture(p,rx,ry,item){
 const b=furnitureBounds(item);let near=-Infinity,far=Infinity,axis='x',normal=0;
 for(const [name,pos,ray,min,max] of [['x',p.x,rx,b.minX,b.maxX],['y',p.y,ry,b.minY,b.maxY]]){
  if(Math.abs(ray)<.000001){if(pos<min||pos>max)return null;continue}
  const a=(min-pos)/ray,d=(max-pos)/ray,entry=Math.min(a,d),exit=Math.max(a,d);
  if(entry>near){near=entry;axis=name;normal=ray>0?-1:1}far=Math.min(far,exit);
 }
 if(near<=.025||far<near)return null;
 const x=p.x+rx*near,y=p.y+ry*near,u=axis==='x'?(y-b.minY)/(b.maxY-b.minY):(x-b.minX)/(b.maxX-b.minX);
 return {depth:near,far,axis,normal,u,front:axis==='x'?item.nx===normal:item.ny===normal};
}
function drawFurniture(p,dir,plane,horizon,z,paint=true){
 const c=VIEW.context,W=VIEW.w,H=VIEW.h;
 VIEW.furnitureOcclusion??=Array.from({length:W},()=>[]);for(const spans of VIEW.furnitureOcclusion)spans.length=0;
 for(let x=0;x<W;x++){
  const camera=2*x/W-1,rx=dir.x+plane.x*camera,ry=dir.y+plane.y*camera;
  const hits=(world.furniture||[]).map(item=>({item,hit:intersectFurniture(p,rx,ry,item)})).filter(entry=>entry.hit&&entry.hit.depth<z[x]).sort((a,b)=>b.hit.depth-a.hit.depth);
  for(const {item,hit} of hits){
   const bottom=horizon+H*p.height/hit.depth,top=horizon+H*(p.height-item.height)/hit.depth;
   const roofTop=item.height<p.height?horizon+H*(p.height-item.height)/Math.min(hit.far,z[x]):top;
   if(!paint){VIEW.furnitureOcclusion[x].push({top:roofTop,bottom,depth:hit.depth});continue}
   const light=difficulty==='psycho'?(flashlightOn?Math.max(.003,.95*Math.exp(-camera*camera*7)/(1+hit.depth*.24)):.003):(flashlightOn?.93:.35)/(1+hit.depth*.06);
   const texture=hit.front?VIEW.furnitureMaterials[item.type]:VIEW.furnitureMaterials.side;
   c.fillStyle='#0006';c.fillRect(x,bottom,1,H/hit.depth*.035);
   c.drawImage(texture,Math.max(0,Math.min(511,Math.floor(hit.u*511))),0,1,512,x,top,1,bottom-top);
   c.fillStyle=`rgba(0,0,0,${1-light*(hit.front?1:.62)})`;c.fillRect(x,top,1,bottom-top);
   if(roofTop<top){c.fillStyle=`rgb(${Math.floor(103*light)},${Math.floor(76*light)},${Math.floor(48*light)})`;c.fillRect(x,roofTop,1,top-roofTop);c.fillStyle=`rgba(212,174,107,${light*.65})`;c.fillRect(x,top-1,1,1)}
   VIEW.furnitureOcclusion[x].push({top:roofTop,bottom,depth:hit.depth});
  }
 }
}
function drawOccludedSpriteColumn(sprite,u,x,top,height,depth){
 let pieces=[{top,bottom:top+height}];
 for(const block of VIEW.furnitureOcclusion?.[x]||[])if(block.depth<depth){
  pieces=pieces.flatMap(piece=>{if(block.bottom<=piece.top||block.top>=piece.bottom)return [piece];const out=[];if(block.top>piece.top)out.push({top:piece.top,bottom:block.top});if(block.bottom<piece.bottom)out.push({top:block.bottom,bottom:piece.bottom});return out});
 }
 for(const piece of pieces){const sy=(piece.top-top)/height*sprite.height,sh=(piece.bottom-piece.top)/height*sprite.height;VIEW.context.drawImage(sprite,u,sy,1,sh,x,piece.top,1,piece.bottom-piece.top)}
}
function drawWardrobeInterior(){
 ctx.save();ctx.fillStyle='#060403ed';ctx.fillRect(0,0,350,700);ctx.fillRect(650,0,350,700);ctx.fillRect(350,0,300,150);ctx.fillRect(350,555,300,145);
 const timber=ctx.createLinearGradient(350,0,650,0);timber.addColorStop(0,'#160e09');timber.addColorStop(.5,'#302117');timber.addColorStop(1,'#0c0806');ctx.fillStyle=timber;
 for(let y=154;y<555;y+=29){ctx.fillRect(350,y,300,22);ctx.fillStyle='#68503155';ctx.fillRect(350,y,300,1);ctx.fillStyle=timber}
 ctx.strokeStyle='#765b3766';ctx.lineWidth=3;ctx.strokeRect(347,148,306,410);
 const elapsed=world.player.hidingSeconds||0,stress=Math.max(0,(elapsed-3)/7),pulse=(1-Math.cos(elapsed*Math.PI*1.15))/2;
 if(stress>0){const red=ctx.createRadialGradient(500,350,80,500,350,620);red.addColorStop(0,'rgba(160,0,20,'+(stress*pulse*.12)+')');red.addColorStop(1,'rgba(180,0,18,'+(stress*(.15+pulse*.5))+')');ctx.fillStyle=red;ctx.fillRect(0,0,1000,700)}ctx.restore();
}
function makeFloorTexture(){
 const tex=document.createElement('canvas');tex.width=tex.height=128;const c=tex.getContext('2d');c.drawImage(makeDetailedFloorTexture(),0,0,128,128);return c.getImageData(0,0,128,128).data;
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
 door.fillStyle='#24372d';door.beginPath();door.moveTo(154,23);door.lineTo(166,33);door.lineTo(166,249);door.lineTo(154,256);door.closePath();door.fill();door.fillStyle='#a2b89b';door.beginPath();door.moveTo(38,23);door.lineTo(49,16);door.lineTo(166,33);door.lineTo(154,23);door.closePath();door.fill();door.fillStyle='#14211b';door.fillRect(36,253,122,3);door.fillStyle='#7e8b75';door.fillRect(31,256,134,4);
 const brass=door.createRadialGradient(125,141,0,126,143,5);brass.addColorStop(0,'#fff0c1');brass.addColorStop(.5,'#b19551');brass.addColorStop(1,'#3b3425');door.fillStyle=brass;door.beginPath();door.arc(126,143,5,0,7);door.fill();
 relic.fillStyle='#ffeeb4';relic.beginPath();relic.moveTo(96,88);relic.lineTo(110,133);relic.lineTo(96,176);relic.lineTo(89,132);relic.closePath();relic.fill();relic.fillStyle='#b28537';relic.beginPath();relic.moveTo(110,133);relic.lineTo(120,134);relic.lineTo(96,176);relic.closePath();relic.fill();relic.fillStyle='#fff7d5';relic.beginPath();relic.ellipse(94,113,2,10,-.18,0,7);relic.fill();
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
 let player=world.player,p=player.hidingId?{...player,height:.5,horizonRatio:.5,distance:0}:getCameraPose(),angle=p.angle||0,dir={x:Math.cos(angle),y:Math.sin(angle)},plane={x:-dir.y*VIEW.fov*((canvas.clientWidth||1000)/(canvas.clientHeight||700))/(1000/700),y:dir.x*VIEW.fov*((canvas.clientWidth||1000)/(canvas.clientHeight||700))/(1000/700)};
 let walking=mode==='playing'&&player.motion>0,bob=walking?Math.sin((player.gaitPhase||0)*2)*(player.running?5:2)*(cameraMode==='third'?.35:1):0,horizon=H*(p.horizonRatio+(player.lookOffset||0))+bob;
 const gpuRendered=renderGpuScene(p,horizon);
 if(!gpuRendered)drawSurfaces(p,dir,plane,horizon);
 const z=new Float32Array(W);
 for(let x=0;x<W;x++){let camera=2*x/W-1,ray=castRay(p,dir.x+plane.x*camera,dir.y+plane.y*camera);z[x]=ray.depth;if(gpuRendered)continue;let height=H/ray.depth,top=horizon-height*(1-p.height);const walls=difficulty==='psycho'?(VIEW.barePsychoWalls||=makeDecorTextures(true,true)):(VIEW.bareNormalWalls||=makeDecorTextures(false,true)),texture=walls[Math.abs(ray.x*17+ray.y*31+ray.side*7+(world.decorSeed||0))%walls.length];c.drawImage(texture,Math.floor(ray.u*511),0,1,512,x,top,1,height);let beam=Math.exp(-camera*camera*3),shade=difficulty==='psycho'?1-(flashlightOn?Math.max(.004,.92*Math.exp(-camera*camera*7)/(1+ray.depth*.24)):.003):Math.min(.94,.08+ray.depth*.052+(ray.side?.10:0)+(1-beam)*.24+(flashlightOn?0:.48));c.fillStyle=difficulty==='psycho'?`rgba(0,0,0,${shade})`:`rgba(4,9,11,${shade})`;c.fillRect(x,top,1,height);c.fillStyle=`rgba(0,0,0,${Math.min(.72,.25+ray.depth*.024)})`;c.fillRect(x,top+height*.96,1,height*.04);if(difficulty!=='psycho'&&(ray.x+ray.y)%4===0){c.fillStyle=`rgba(174,208,183,${Math.max(.02,.24-ray.depth*.016)})`;c.fillRect(x,top+height*.16,1,height*.004)}}
 drawFurniture(p,dir,plane,horizon,z,!gpuRendered);
 let items=[{...world.exit,type:'door'},...(gpuRendered?[]:(world.wallPictures||[]).map(p=>{const pose=picturePose(p);return {...p,x:pose.x,y:pose.z,type:'picture',pose}})),...(gpuRendered?[]:(world.spiders||[]).map(s=>({...s,type:'spider'}))),...(gpuRendered?[]:world.relics.filter(r=>!r.taken).map(r=>({...r,type:'relic'}))),...(gpuRendered?[]:[{...world.enemy,type:'enemy'}])];
 if(!gpuRendered&&typeof coopTeammates==='function')items.push(...coopTeammates().map(p=>({...p,type:'teammate'})));
 if(!gpuRendered&&world.coopFloor!==undefined)items.push({...world.stairs,type:'relic'},...(!coop.clues[world.coopFloor]?[{...world.clue,type:'relic'}]:[]));
 if(!gpuRendered&&!player.hidingId&&cameraMode==='third'&&p.distance>=.42)items.push({...player,type:'player'});
 let objects=items.map(o=>({...o,...projectObject(o,p,dir,plane)})).filter(o=>o.depth>.08).sort((a,b)=>b.depth-a.depth);
 for(let o of objects){let height=H/o.depth*(o.type==='picture'?.61*Math.max(.08,Math.cos(o.pose.tilt)):o.type==='spider'?.055:o.type==='relic'?.48:o.type==='enemy'?1.04:o.type==='player'?.88:.94),width=height*.75,screen=W/2*(1+o.side/o.depth),bottom=horizon+H*p.height/o.depth,top=bottom-height;if(o.type==='picture')top=horizon-H*(o.pose.height-p.height)/o.depth-height/2; if(o.type==='relic')top=horizon-height/2+Math.sin(world.time*3)*4/o.depth;let left=screen-width/2,right=screen+width/2;if(right<0||left>W)continue;let sprite=o.type==='picture'?getPictureSprite(o):o.type==='spider'?getSpiderSprite(o):o.type==='enemy'?getEnemySprite(o):o.type==='teammate'?getTeammateSprite(o):o.type==='player'?getPlayerSprite():VIEW.sprites[o.type];c.globalAlpha=(o.type==='player'?1:Math.max(.3,1-o.depth/18))*(difficulty==='psycho'&&o.type!=='relic'?(flashlightOn?Math.max(.02,Math.exp(-Math.pow(o.side/o.depth,2)*7)/(1+o.depth*.14)):.015):1);for(let x=Math.max(0,Math.floor(left));x<Math.min(W,right);x++)if(o.depth<z[x]){let u=Math.max(0,Math.min(sprite.width-1,Math.floor((x-left)/width*sprite.width)));drawOccludedSpriteColumn(sprite,u,x,top,height,o.depth)}c.globalAlpha=1}
 if(!gpuRendered&&difficulty==='normal'){c.fillStyle='rgba(0,0,0,'+(1-normalLightLevel(world.time||0))*.55+')';c.fillRect(0,0,W,H);}
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(VIEW.buffer,0,0,1000,700);
 if(!player.hidingId&&cameraMode==='third'&&p.distance<.42){ctx.save();ctx.translate(500-96*2.7,350-35*2.7);ctx.scale(2.7,2.7);drawSurvivorBack(ctx,player.gaitPhase||0,walking?1:0,player.running);ctx.restore()}
 let vignette=ctx.createRadialGradient(500,340,180,500,340,670);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#00000070');ctx.fillStyle=vignette;ctx.fillRect(0,0,1000,700);
 // Your customized sleeve and a handheld flashlight stay visible in first person.
 if(player.hidingId)drawWardrobeInterior();
 if(!gpuRendered&&!player.hidingId&&cameraMode==='first'){ctx.save();if(difficulty==='psycho')ctx.globalAlpha=flashlightOn?.7:.035;drawFlashlight(bob);ctx.restore()};
 ctx.fillStyle='#b0c5a8';ctx.font='11px sans-serif';ctx.fillText(cameraMode==='third'?'THIRD PERSON · V TO SWITCH':'FIRST PERSON · V TO SWITCH',28,53);
 ctx.fillStyle='#dce8c388';ctx.fillRect(497,347,6,6);if(!player.hidingId&&(difficulty!=='psycho'||wallet.upgrades.relicFinder||wallet.upgrades.enemyTracker))drawMiniMap();ctx.fillStyle='#b6c2aa';ctx.font='12px sans-serif';ctx.fillText('STAMINA',28,667);ctx.fillStyle='#29362c';ctx.fillRect(100,658,135,7);ctx.fillStyle=world.stamina>25?'#c6e69a':'#d18766';ctx.fillRect(100,658,world.stamina*1.35,7);ctx.fillStyle='#99ad98';ctx.font='11px sans-serif';ctx.fillText(deviceMode==='phone'?'JOYSTICK TO MOVE · SWIPE TO LOOK':document.pointerLockElement===canvas?'MOUSE LOOK ACTIVE · ESC TO RELEASE':'CLICK TO LOOK · Q / E OR ← / → TO TURN',28,31);if(difficulty==='psycho'){ctx.fillStyle=flashlightOn?'#cfdbc0':'#e2a9ab';ctx.fillText('PSYCHO MODE · '+(flashlightOn?'FLASHLIGHT ON':'PRESS F / TAP LIGHT — FLASHLIGHT OFF'),28,78);}
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
function drawMiniMap(){
 const p=world.player,full=wallet.upgrades.relicFinder||wallet.upgrades.enemyTracker,x0=855,y0=40,cell=full?126/world.size:9,r=6,originX=full?0:Math.floor(p.x)-r,originY=full?0:Math.floor(p.y)-r,size=full?world.size:13;
 ctx.fillStyle='#07100dea';ctx.fillRect(x0-10,y0-10,145,164);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){ctx.fillStyle=world.grid[y+originY]?.[x+originX]===0?'#33473a':'#142019';ctx.fillRect(x0+x*cell,y0+y*cell,Math.max(1,cell-.7),Math.max(1,cell-.7));}
 const point=(item,color,radius)=>{const x=x0+(item.x-originX)*cell,y=y0+(item.y-originY)*cell;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,radius,0,7);ctx.fill();};point(p,profile.color,3);ctx.strokeStyle='#e3efc8';ctx.beginPath();const px=x0+(p.x-originX)*cell,py=y0+(p.y-originY)*cell;ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(p.angle||0)*8,py+Math.sin(p.angle||0)*8);ctx.stroke();
 if(wallet.upgrades.relicFinder)for(const relic of world.relics)if(!relic.taken)point(relic,'#f4d477',2.8);
 if(wallet.upgrades.enemyTracker)point(world.enemy,'#ef6767',3);
 ctx.fillStyle='#a1b597';ctx.font='9px sans-serif';ctx.fillText(full?'MAZE MAP':'LOCAL MAP',x0,y0+130);if(full){ctx.fillStyle='#cfbf93';ctx.fillText((wallet.upgrades.relicFinder?'Gold: relics ':'')+(wallet.upgrades.enemyTracker?'Red: enemy':''),x0,y0+143);}
}


// Weathered timber, splintered edges and missing sections, shared by both renderers.
function makeDetailedFloorTexture(){
 const tile=document.createElement('canvas');tile.width=tile.height=512;const c=tile.getContext('2d'),image=c.createImageData(512,512);let seed=19287;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4,board=Math.floor(x/85.333),u=x%85.333,gap=u<3||u>82,warp=Math.sin(y*.018+board)*3,grain=Math.sin((u+warp)*1.3)*4+Math.sin((u+warp)*.38)*8,wear=Math.sin(y*.023+board*2)*5+Math.cos(y*.007+u*.09)*7,tone=[8,-12,2,-5,14,-8][board],end=(y+(board%3)*153)%512<4,base=gap||end?13:104+tone+grain+wear+(random()-.5)*9;image.data[i]=base*1.02;image.data[i+1]=base*.99;image.data[i+2]=base*.92;image.data[i+3]=255;}c.putImageData(image,0,0);
 for(let board=0;board<6;board++){
  const left=board*512/6;
  for(let i=0;i<32;i++){const x=left+5+random()*74,y=random()*512;c.strokeStyle=i%3?'#25252158':'#d2cbb338';c.lineWidth=.4+random()*.8;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+2,y+30,x-3,y+70,x+1,y+120);c.stroke();}
  const knotX=left+20+random()*40,knotY=65+random()*380;c.strokeStyle='#25242188';for(let ring=0;ring<5;ring++){c.beginPath();c.ellipse(knotX,knotY,2+ring*1.8,5+ring*7,.06,0,7);c.stroke();}
  for(let n=0;n<2;n++){const start=40+random()*340,length=22+random()*90,edge=n?left+82:left+2;c.fillStyle='#090b0c';c.beginPath();c.moveTo(edge,start);c.lineTo(edge+(n?-12:12),start+10);c.lineTo(edge+(n?-4:4),start+25);c.lineTo(edge+(n?-10:10),start+length*.7);c.lineTo(edge,start+length);c.closePath();c.fill();c.strokeStyle='#c0b59a66';c.lineWidth=1;c.beginPath();c.moveTo(edge+(n?-13:13),start+9);c.lineTo(edge+(n?-5:5),start+35);c.lineTo(edge+(n?-11:11),start+length*.7);c.stroke();}
  for(const y of [13+(board%3)*153,498])for(const x of [left+12,left+72]){c.fillStyle='#292b28';c.beginPath();c.arc(x,y%512,1.8,0,7);c.fill();c.fillStyle='#afa99566';c.fillRect(x-1,y%512-1,1,1);}
 }
 return tile;
}

function getSpiderSprite(spider){if(!VIEW.spiderSprite){VIEW.spiderSprite=document.createElement('canvas');VIEW.spiderSprite.width=192;VIEW.spiderSprite.height=256;}const c=VIEW.spiderSprite.getContext('2d');c.clearRect(0,0,192,256);c.strokeStyle='#211b15';c.lineWidth=4;for(const side of [-1,1])for(let i=0;i<4;i++){const gait=Math.sin((spider.phase||0)+i*2+side)*8;c.beginPath();c.moveTo(96+side*10,173+i*10);c.lineTo(96+side*(35+gait),153+i*21);c.lineTo(96+side*(63+gait),135+i*30);c.stroke();}c.fillStyle='#30251a';c.beginPath();c.ellipse(96,201,19,25,0,0,7);c.fill();c.beginPath();c.ellipse(96,168,13,14,0,0,7);c.fill();return VIEW.spiderSprite;}

function getPictureSprite(picture){const kind=picture.kind;VIEW.pictureSprites||={};if(!VIEW.pictureSprites[kind]){const sprite=document.createElement('canvas');sprite.width=256;sprite.height=310;sprite.getContext('2d').drawImage(VIEW.normalWalls[kind],126,63,260,310,0,0,256,310);VIEW.pictureSprites[kind]=sprite;}if(!picture.pose?.roll)return VIEW.pictureSprites[kind];VIEW.rattlingSprite||=document.createElement('canvas');VIEW.rattlingSprite.width=256;VIEW.rattlingSprite.height=310;const c=VIEW.rattlingSprite.getContext('2d');c.clearRect(0,0,256,310);c.save();c.translate(128,155);c.rotate(picture.pose.roll);c.drawImage(VIEW.pictureSprites[kind],-128,-155);c.restore();return VIEW.rattlingSprite;}

function drawUpgradeMap(){if(!world)return;const c=$('upgradeMap').getContext('2d'),cell=450/world.size;c.fillStyle='#0b1210';c.fillRect(0,0,450,450);for(let y=0;y<world.size;y++)for(let x=0;x<world.size;x++){c.fillStyle=world.grid[y][x]===0?'#4a6151':'#17231c';c.fillRect(x*cell,y*cell,cell-1,cell-1);}const dot=(p,color)=>{c.fillStyle=color;c.beginPath();c.arc(p.x*cell,p.y*cell,5,0,7);c.fill();};dot(world.player,'#c6e69a');dot(world.exit,'#a0cbcf');if(wallet.upgrades.relicFinder)for(const r of world.relics)if(!r.taken)dot(r,'#f4d477');if(wallet.upgrades.enemyTracker)dot(world.enemy,'#ef6767');$('mapLegend').textContent='Green: you. Blue: exit.'+(wallet.upgrades.relicFinder?' Gold: remaining relics.':'')+(wallet.upgrades.enemyTracker?' Red: Slenderman.':'');}

function getTeammateSprite(entity){const saved=profile;try{profile=entity.profile||profile;const result=document.createElement('canvas');result.width=576;result.height=768;const c=result.getContext('2d');c.scale(3,3);drawSurvivorBack(c,entity.gaitPhase||0,entity.motion||0,entity.running);return result;}finally{profile=saved;}}
