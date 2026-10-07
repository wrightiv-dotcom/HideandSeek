/* Detailed vector characters, drawn at high resolution without image downloads. */
function finishSurvivorDetails(c,back=false){
 c.save();c.lineWidth=.7;c.strokeStyle='#e0e9c94d';
 for(const side of [-1,1]){c.beginPath();c.moveTo(side*27,-32);c.quadraticCurveTo(side*29,-10,side*23,21);c.moveTo(side*30,-23);c.lineTo(side*33,-9);c.moveTo(side*26,10);c.lineTo(side*32,18);c.stroke()}
 c.strokeStyle='#14251fa6';c.lineWidth=1.5;for(const side of [-1,1]){c.beginPath();c.moveTo(side*7,15);c.quadraticCurveTo(side*12,12,side*18,17);c.moveTo(side*19,-31);c.lineTo(side*10,-19);c.stroke()}
 for(let x=-23;x<24;x+=4){c.fillStyle='#d7e0b955';c.fillRect(x,27,.8,1.7)}
 if(back){
  const pack=c.createLinearGradient(-23,0,24,0);pack.addColorStop(0,'#172521');pack.addColorStop(.18,'#485447');pack.addColorStop(.5,'#64705a');pack.addColorStop(.85,'#354638');pack.addColorStop(1,'#15251d');
  c.fillStyle='#0a1716aa';c.beginPath();c.roundRect(-21,-25,45,51,7);c.fill();c.fillStyle=pack;c.beginPath();c.roundRect(-23,-27,44,49,8);c.fill();
  c.strokeStyle='#b1b69977';c.lineWidth=.8;c.beginPath();c.roundRect(-21,-25,40,45,6);c.stroke();
  const pocket=c.createLinearGradient(0,-2,0,18);pocket.addColorStop(0,'#829079');pocket.addColorStop(.2,'#485946');pocket.addColorStop(1,'#263b2e');c.fillStyle=pocket;c.beginPath();c.roundRect(-16,-2,32,20,4);c.fill();c.strokeStyle='#151f18';c.strokeRect(-15,1,30,1);
  for(const x of [-17,14]){c.fillStyle='#192e22';c.fillRect(x,-34,4,51);c.fillStyle='#c0b38a';c.fillRect(x-1,-14,6,6);c.fillStyle='#28382b';c.fillRect(x,-13,4,3)}
  c.strokeStyle='#89927b';c.lineWidth=2;c.beginPath();c.moveTo(-7,-28);c.quadraticCurveTo(0,-37,7,-28);c.stroke();c.fillStyle='#d1c19b';c.fillRect(5,1,1.5,4);
 }else{
  c.strokeStyle='#111d17bb';c.lineWidth=7;c.beginPath();c.moveTo(-23,-40);c.quadraticCurveTo(-7,-4,21,26);c.stroke();c.strokeStyle='#8d79538c';c.lineWidth=4;c.stroke();c.strokeStyle='#e0c69c55';c.lineWidth=.6;c.stroke();
  c.save();c.translate(7,8);c.rotate(-.6);c.fillStyle='#cfbb86';c.fillRect(-4,-4,8,9);c.fillStyle='#2b3227';c.fillRect(-2,-2,4,5);c.restore();
  c.strokeStyle='#f6ddbe55';c.lineWidth=.7;c.beginPath();c.moveTo(-8,-63);c.quadraticCurveTo(-5,-61,-3,-63);c.moveTo(3,-62);c.quadraticCurveTo(8,-60,11,-63);c.moveTo(0,-67);c.lineTo(-1,-62);c.stroke();
  c.fillStyle='#d4a08c20';for(const x of [-11,9]){c.beginPath();c.ellipse(x,-61,4,3,0,0,7);c.fill()}
 }
 c.restore();
}
function finishShadowDetails(c){
 c.save();c.fillStyle='#a9b3af';for(const side of [-1,1]){c.beginPath();c.moveTo(96+side*10,60);c.lineTo(96+side*4,71);c.lineTo(96,64);c.closePath();c.fill()}
 c.strokeStyle='#8896a344';c.lineWidth=.7;for(const side of [-1,1]){c.beginPath();c.moveTo(96+side*14,68);c.lineTo(96+side*7,87);c.lineTo(96+side*16,91);c.lineTo(96+side*4,122);c.stroke()}
 c.strokeStyle='#a0a9ac22';c.lineWidth=.45;for(let x=81;x<=112;x+=4){c.beginPath();c.moveTo(x,88);c.lineTo(96+(x-96)*.62,150);c.stroke()}
 c.strokeStyle='#0b0c1488';c.lineWidth=1.5;c.beginPath();c.moveTo(98,120);c.lineTo(98,155);c.stroke();c.fillStyle='#9ca7a877';for(const y of [126,137,149]){c.beginPath();c.arc(99,y,.8,0,7);c.fill()}
 c.strokeStyle='#a7b6b54d';c.lineWidth=.6;c.beginPath();c.moveTo(86,21);c.bezierCurveTo(83,34,85,45,91,51);c.moveTo(104,19);c.quadraticCurveTo(111,33,104,48);c.stroke();c.restore();
}
function drawSurvivor(c,x,y,scale){
 c.save();c.translate(x,y);c.scale(scale,scale);
 const coat=profile.color,skin=profile.skin,outfit=profile.outfit||'field',female=profile.gender==='female';
 c.scale(female?.94:1,1);
 const shadow=c.createRadialGradient(0,78,1,0,78,40);shadow.addColorStop(0,'#00000088');shadow.addColorStop(1,'#00000000');c.fillStyle=shadow;c.fillRect(-45,66,90,26);
 // Boots, trouser folds, and a fitted coat give the survivor human proportions.
 for(const side of [-1,1]){
  const leg=c.createLinearGradient(side*8,0,side*26,0);leg.addColorStop(0,'#45524e');leg.addColorStop(.5,'#263630');leg.addColorStop(1,'#14211e');c.fillStyle=leg;c.beginPath();c.roundRect(side<0?-25:4,18,21,55,5);c.fill();c.strokeStyle='#65716a66';c.lineWidth=.8;c.beginPath();c.moveTo(side*17,24);c.lineTo(side*17,59);c.moveTo(side*8,43);c.lineTo(side*23,47);c.stroke();
  const boot=c.createLinearGradient(0,65,0,81);boot.addColorStop(0,'#3c4038');boot.addColorStop(.5,'#161f1c');boot.addColorStop(1,'#070e0c');c.fillStyle=boot;c.beginPath();c.roundRect(side<0?-28:4,65,26,17,4);c.fill();c.strokeStyle='#6a726555';c.lineWidth=.9;for(let i=0;i<3;i++){c.beginPath();c.moveTo(side*11,69+i*2);c.lineTo(side*21,69+i*2);c.stroke()}c.fillStyle='#a0a78a44';c.fillRect(side<0?-26:6,79,23,1);
 }
 const fabric=c.createLinearGradient(-34,0,34,0);fabric.addColorStop(0,'#24352b');fabric.addColorStop(.28,coat);fabric.addColorStop(.6,coat);fabric.addColorStop(1,'#293f30');c.fillStyle=fabric;
 for(const side of [-1,1]){c.save();c.rotate(side*-.07);c.beginPath();c.roundRect(side<0?-44:24,-36,20,65,9);c.fill();c.fillStyle='#263b2d';c.fillRect(side<0?-44:24,23,20,6);c.fillStyle=skin;c.beginPath();c.ellipse(side*34,34,7,11,side*.1,0,Math.PI*2);c.fill();c.strokeStyle='#57372b55';c.lineWidth=.7;for(let i=0;i<3;i++){c.beginPath();c.moveTo(side*(31+i*2),33);c.lineTo(side*(31+i*2),40);c.stroke()}c.restore();c.fillStyle=fabric}
 c.beginPath();if(female){c.moveTo(-19,-43);c.quadraticCurveTo(-30,-40,-25,-16);c.quadraticCurveTo(-20,-2,-24,12);c.lineTo(-30,31);c.quadraticCurveTo(0,37,30,31);c.lineTo(24,12);c.quadraticCurveTo(20,-2,25,-16);c.quadraticCurveTo(30,-40,19,-43)}else{c.moveTo(-22,-43);c.quadraticCurveTo(-36,-40,-32,-12);c.lineTo(-27,31);c.quadraticCurveTo(0,37,27,31);c.lineTo(32,-12);c.quadraticCurveTo(36,-40,22,-43)}c.closePath();c.fill();
 c.strokeStyle='#142a2566';c.lineWidth=.9;for(const side of [-1,1]){c.beginPath();c.moveTo(side*25,-28);c.lineTo(side*21,26);c.moveTo(side*20,16);c.lineTo(side*9,22);c.stroke()}
 if(outfit==='padded'){c.strokeStyle='#20342988';for(let y=-23;y<27;y+=9){c.beginPath();c.moveTo(-28,y);c.quadraticCurveTo(0,y+4,28,y);c.stroke()}}
 if(outfit==='tactical'){c.fillStyle='#1a2b2488';c.beginPath();c.roundRect(-26,-30,52,39,4);c.fill();c.strokeStyle='#607764';for(let side of [-1,1]){c.strokeRect(side<0?-23:5,-18,18,22);c.fillStyle='#92a386';c.fillRect(side<0?-18:10,-25,8,2)}}
 else{c.fillStyle='#2a3d2a66';for(const side of [-1,1]){c.beginPath();c.roundRect(side<0?-25:8,-14,17,19,2);c.fill();c.strokeStyle='#d4dcc366';c.strokeRect(side<0?-25:8,-14,17,19);c.fillStyle='#d7ddc399';c.beginPath();c.arc(side*17,-10,1,0,7);c.fill();c.fillStyle='#2a3d2a66'}}
 c.fillStyle='#182f25';c.fillRect(-1,-34,2,67);c.strokeStyle='#d3ddbd88';c.lineWidth=.7;c.beginPath();c.moveTo(1,-31);c.lineTo(1,31);c.stroke();c.fillStyle='#a2ac96';c.fillRect(1,-13,2,4);
 // Neck, collar, ears, facial shading, and individual hair strands.
 c.fillStyle=skin;c.beginPath();c.roundRect(-9,-56,18,17,5);c.fill();c.fillStyle='#4b393033';c.fillRect(-9,-51,18,4);c.fillStyle=coat;c.beginPath();c.moveTo(-22,-43);c.lineTo(-10,-51);c.lineTo(0,-36);c.lineTo(10,-51);c.lineTo(22,-43);c.lineTo(12,-31);c.lineTo(0,-36);c.lineTo(-12,-31);c.closePath();c.fill();
 c.save();c.translate(0,-65);c.scale(female?.92:1,female?.97:1);c.translate(0,65);
 if(profile.hair==='long'){c.fillStyle='#251e1d';c.beginPath();c.ellipse(0,-67,24,34,0,0,7);c.fill();c.fillRect(-23,-68,46,27)}
 const face=c.createRadialGradient(-6,-73,1,0,-65,28);face.addColorStop(0,skin);face.addColorStop(.7,skin);face.addColorStop(1,'#765444');c.fillStyle=face;for(const side of [-1,1]){c.beginPath();c.ellipse(side*18,-66,4,7,side*.15,0,7);c.fill()}c.beginPath();c.moveTo(-17,-78);c.bezierCurveTo(-22,-59,-12,-49,0,-48);c.bezierCurveTo(12,-49,22,-59,17,-78);c.quadraticCurveTo(0,-91,-17,-78);c.fill();
 c.strokeStyle='#543b3266';c.lineWidth=.8;c.beginPath();c.moveTo(0,-68);c.lineTo(-2,-60);c.lineTo(2,-59);c.moveTo(-4,-54);c.quadraticCurveTo(0,-52,5,-54);c.stroke();
 for(const side of [-1,1]){c.fillStyle='#f0e7d2';c.beginPath();c.ellipse(side*8,-68,4.5,1.8,side*.05,0,7);c.fill();c.fillStyle='#302b27';c.beginPath();c.arc(side*8,-68,1.7,0,7);c.fill();c.fillStyle='#ffffffbb';c.fillRect(side*8-.5,-69,1,1);c.strokeStyle='#342924';c.lineWidth=1.2;c.beginPath();c.moveTo(side*4,-73);c.lineTo(side*12,-72);c.stroke()}
 if(profile.hair==='hood'){c.strokeStyle=coat;c.lineWidth=9;c.beginPath();c.ellipse(0,-69,24,29,0,Math.PI*.75,Math.PI*2.25);c.stroke();c.strokeStyle='#21352e';c.lineWidth=1;c.beginPath();c.ellipse(0,-69,28,33,0,Math.PI*.75,Math.PI*2.25);c.stroke()}
 else{const hair=c.createLinearGradient(0,-92,0,-70);hair.addColorStop(0,'#4e3930');hair.addColorStop(1,'#251e1c');c.fillStyle=hair;c.beginPath();c.moveTo(-18,-69);c.bezierCurveTo(-30,-97,11,-100,21,-79);c.lineTo(19,-64);c.lineTo(14,-78);c.quadraticCurveTo(0,-75,-9,-81);c.lineTo(-17,-63);c.closePath();c.fill();c.strokeStyle='#91745c66';c.lineWidth=.7;for(let i=0;i<6;i++){c.beginPath();c.moveTo(-16+i*6,-84);c.quadraticCurveTo(-8+i*5,-94,9+i*2,-82);c.stroke()}if(profile.hair==='long'){c.strokeStyle='#6b4b3877';for(const side of [-1,1])for(let i=0;i<3;i++){c.beginPath();c.moveTo(side*(18+i),-75);c.quadraticCurveTo(side*(24+i),-58,side*(20+i),-38);c.stroke()}}}
 if(female){
  // A distinct face and short bob remain visible without changing hair preferences.
  c.strokeStyle='#392923';c.lineWidth=1;c.beginPath();for(const side of [-1,1]){c.moveTo(side*4,-69);c.quadraticCurveTo(side*8,-72,side*13,-69);c.moveTo(side*12,-69);c.lineTo(side*14,-71)}c.stroke();c.strokeStyle='#975f59';c.lineWidth=1.4;c.beginPath();c.moveTo(-4,-54);c.quadraticCurveTo(0,-52,4,-54);c.stroke();
  if(profile.hair==='short'){c.fillStyle='#30221e';for(const side of [-1,1]){c.beginPath();c.moveTo(side*17,-79);c.quadraticCurveTo(side*26,-65,side*20,-48);c.lineTo(side*14,-51);c.quadraticCurveTo(side*19,-65,side*14,-78);c.closePath();c.fill();c.strokeStyle='#98755b66';c.lineWidth=.8;c.beginPath();c.moveTo(side*19,-73);c.quadraticCurveTo(side*22,-61,side*18,-51);c.stroke()}}
 }
 c.restore();finishSurvivorDetails(c,false);c.restore();
}
function drawShadowEntity(c,phase=0,motion=0,running=false){
 c.save();const sway=Math.sin(phase)*2;
 // Wisps remain transparent so the body reads as a silhouette in the corridor.
 const aura=c.createRadialGradient(96,135,15,96,135,105);aura.addColorStop(0,'#05060bb0');aura.addColorStop(.6,'#07091266');aura.addColorStop(1,'#00000000');c.fillStyle=aura;c.fillRect(0,0,192,256);
 c.lineCap='round';for(const side of [-1,1])for(let i=0;i<3;i++){c.strokeStyle=i===0?'#090c13':'#10131ddd';c.lineWidth=5-i;const bend=Math.sin(phase+i)*6;c.beginPath();c.moveTo(96+side*12,87+i*16);c.bezierCurveTo(96+side*(56+i*5),51+i*33,96+side*(84-i*4),112+i*26+bend,96+side*(72-i*8),168+i*24);c.bezierCurveTo(96+side*60,189+i*16,96+side*84,193+i*13,96+side*(87-i*8),215+i*8);c.stroke()}
 const body=c.createLinearGradient(62,0,130,0);body.addColorStop(0,'#030408');body.addColorStop(.42,'#2c3440');body.addColorStop(.58,'#191e2a');body.addColorStop(1,'#020306');c.fillStyle=body;
 for(const side of [-1,1]){const stride=Math.sin(phase)*side*motion,lift=Math.max(0,stride)*(running?21:12),kneeX=96+side*13+stride*(running?7:4),kneeY=197-lift*.4,ankleX=96+side*16-stride*(running?6:3),ankleY=245-lift;c.fillStyle=body;c.beginPath();c.moveTo(96+side*11,153);c.quadraticCurveTo(kneeX+side*5,kneeY-17,kneeX+side*4,kneeY);c.lineTo(ankleX+side*5,ankleY);c.lineTo(ankleX+side*9,ankleY+7);c.lineTo(ankleX-side*7,ankleY+8);c.lineTo(kneeX-side*4,kneeY+3);c.lineTo(96+side*3,155);c.closePath();c.fill();c.strokeStyle='#34384366';c.lineWidth=.8;c.beginPath();c.moveTo(96+side*9,167);c.lineTo(kneeX,kneeY);c.lineTo(ankleX,ankleY-2);c.stroke()}
 c.save();c.translate(Math.sin(phase)*motion*(running?1.8:.8),-Math.abs(Math.sin(phase))*motion*(running?2.5:1));
 c.fillStyle=body;c.beginPath();c.moveTo(84,60);c.lineTo(71,67);c.lineTo(68,84);c.lineTo(82,147);c.lineTo(87,163);c.lineTo(105,163);c.lineTo(111,145);c.lineTo(124,84);c.lineTo(121,67);c.lineTo(108,60);c.closePath();c.fill();
 for(const side of [-1,1]){const stride=Math.sin(phase)*side*motion,elbowX=96+side*(40-stride*(running?9:3)),elbowY=140-stride*(running?16:5),handX=96+side*(49+sway)-stride*(running?8:4),handY=195-stride*(running?38:15);c.strokeStyle='#03050a';c.lineWidth=10;c.beginPath();c.moveTo(96+side*23,73);c.quadraticCurveTo(96+side*37,109,elbowX,elbowY);c.lineTo(handX,handY);c.stroke();c.strokeStyle='#33374299';c.lineWidth=1;c.beginPath();c.moveTo(96+side*25,80);c.lineTo(elbowX-side*2,elbowY);c.lineTo(handX-side*3,handY-5);c.stroke();c.strokeStyle='#080a11';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(handX+side*(i*2-3),handY-5);c.bezierCurveTo(handX+side*i*3,handY+8,handX+side*i*3,handY+19,handX+side*(i*4-3),handY+25+i*3);c.stroke()}}
 c.strokeStyle='#3b3c4744';c.lineWidth=.7;for(const side of [-1,1]){c.beginPath();c.moveTo(96+side*15,66);c.lineTo(96+side*8,93);c.lineTo(96+side*17,85);c.moveTo(96+side*18,97);c.lineTo(96+side*10,147);c.stroke()}
 c.fillStyle='#020309';c.beginPath();c.moveTo(94,69);c.lineTo(98,69);c.lineTo(101,116);c.lineTo(96,126);c.lineTo(92,116);c.closePath();c.fill();c.fillStyle='#242733';for(let y=125;y<150;y+=10){c.beginPath();c.arc(97,y,.9,0,7);c.fill()}
 const head=c.createRadialGradient(90,27,1,97,34,25);head.addColorStop(0,'#b7bfb5');head.addColorStop(.3,'#909d98');head.addColorStop(.72,'#4b5b62');head.addColorStop(1,'#17242d');c.fillStyle=head;c.beginPath();c.ellipse(96,35,16,27,0,0,7);c.fill();c.strokeStyle='#54515e44';c.lineWidth=.8;c.beginPath();c.ellipse(96,35,16,27,0,Math.PI*.92,Math.PI*1.52);c.stroke();
 c.save();c.beginPath();c.ellipse(96,35,16,27,0,0,7);c.clip();for(let i=0;i<280;i++){const x=80+(Math.sin(i*71.31)*.5+.5)*32,y=8+(Math.cos(i*39.73)*.5+.5)*54;c.fillStyle=i%3?'#9a91aa12':'#00000566';c.fillRect(x,y,.25+(i%4)*.12,.4)}c.restore();
 c.strokeStyle='#39354433';c.lineWidth=.35;for(let i=0;i<6;i++){c.beginPath();c.moveTo(86+i*4,18);c.bezierCurveTo(84+i*5,30,91+i*2,38,89+i*3,52);c.moveTo(85+i*4,23+i*3);c.lineTo(88+i*4,25+i*3);c.lineTo(87+i*4,30+i*3);c.stroke()}
 // Recessed, featureless facial shadows match the pale reference.
 for(const side of [-1,1]){const x=96+side*7,y=34,shade=c.createRadialGradient(x,y,0,x,y,8);shade.addColorStop(0,'#0c101bea');shade.addColorStop(.45,'#303946b0');shade.addColorStop(1,'#78838900');c.fillStyle=shade;c.fillRect(x-9,y-9,18,18)}
 c.fillStyle='#c1c9c9';c.beginPath();c.moveTo(88,59);c.lineTo(104,59);c.lineTo(98,82);c.lineTo(96,88);c.lineTo(94,82);c.closePath();c.fill();c.fillStyle='#05070b';c.beginPath();c.moveTo(95,63);c.lineTo(98,63);c.lineTo(100,93);c.lineTo(96,99);c.lineTo(93,93);c.closePath();c.fill();

 finishShadowDetails(c);c.restore();c.restore();
}
function drawSurvivorBack(c,phase=0,motion=0,running=false){
 const female=profile.gender==='female';
 c.save();c.translate(96,150);c.scale(female?1.12:1.2,1.2);
 const stride=Math.sin(phase)*motion,coat=profile.color,outfit=profile.outfit||'field';
 const shadow=c.createRadialGradient(0,80,2,0,80,42);shadow.addColorStop(0,'#00000099');shadow.addColorStop(1,'#00000000');c.fillStyle=shadow;c.fillRect(-48,67,96,28);
 // Articulated hips, knees, and ankles alternate between a planted and lifted foot.
 for(const side of [-1,1]){
  const step=stride*side,lift=Math.max(0,step)*(running?15:9),kx=side*15+step*2,ky=46-lift*.3,ax=side*15-step*3,ay=77-lift;
  const trousers=c.createLinearGradient(side*5,0,side*28,0);trousers.addColorStop(0,'#536058');trousers.addColorStop(.5,'#293d35');trousers.addColorStop(1,'#14241f');c.fillStyle=trousers;c.beginPath();c.moveTo(side*4,12);c.lineTo(side*26,12);c.lineTo(kx+side*10,ky);c.lineTo(ax+side*9,ay);c.lineTo(ax-side*9,ay);c.lineTo(kx-side*9,ky);c.closePath();c.fill();c.strokeStyle='#a0b49b33';c.lineWidth=1;c.beginPath();c.moveTo(side*17,23);c.lineTo(kx+side*4,ky);c.lineTo(ax+side*4,ay-3);c.stroke();
  const boot=c.createLinearGradient(0,ay-6,0,ay+9);boot.addColorStop(0,'#414b3e');boot.addColorStop(1,'#0d1713');c.fillStyle=boot;c.beginPath();c.roundRect(ax-11,ay-6,22,15,4);c.fill();c.fillStyle='#6b796355';c.fillRect(ax-9,ay+6,18,1);
 }
 c.save();c.translate(stride*(running?1.5:.7),-Math.abs(stride)*(running?3:1.5));
 const fabric=c.createLinearGradient(-37,0,38,0);fabric.addColorStop(0,'#23392c');fabric.addColorStop(.32,coat);fabric.addColorStop(.63,coat);fabric.addColorStop(1,'#2a4030');
 for(const side of [-1,1]){c.save();c.translate(side*29,-36);c.rotate(-side*.08-stride*side*(running?.24:.12));c.fillStyle=fabric;c.beginPath();c.roundRect(side<0?-17:-2,-4,19,64,8);c.fill();c.fillStyle='#263b2e';c.fillRect(side<0?-17:-2,51,19,8);c.fillStyle=profile.skin;c.beginPath();c.ellipse(side<0?-7:7,65,6,10,0,0,7);c.fill();if(side===1){c.fillStyle='#2b3d3b';c.beginPath();c.roundRect(2,49,9,29,3);c.fill();c.fillStyle='#dbe8b9';c.fillRect(2,49,9,3)}c.restore()}
 c.fillStyle=fabric;c.beginPath();if(female){c.moveTo(-18,-44);c.quadraticCurveTo(-29,-43,-25,-18);c.quadraticCurveTo(-20,-2,-24,11);c.lineTo(-30,28);c.quadraticCurveTo(0,34,30,28);c.lineTo(24,11);c.quadraticCurveTo(20,-2,25,-18);c.quadraticCurveTo(29,-43,18,-44)}else{c.moveTo(-21,-44);c.quadraticCurveTo(-36,-43,-31,-13);c.lineTo(-28,28);c.quadraticCurveTo(0,34,28,28);c.lineTo(31,-13);c.quadraticCurveTo(36,-43,21,-44)}c.closePath();c.fill();c.strokeStyle='#d6e4c144';c.lineWidth=.9;c.beginPath();c.moveTo(-27,-32);c.quadraticCurveTo(0,-26,27,-32);c.moveTo(0,-30);c.lineTo(0,26);c.moveTo(-26,27);c.lineTo(26,27);c.stroke();
 if(outfit==='padded'){c.strokeStyle='#233f2b88';for(let y=-24;y<27;y+=9){c.beginPath();c.moveTo(-28,y);c.quadraticCurveTo(0,y+4,28,y);c.stroke()}}
 if(outfit==='tactical'){c.fillStyle='#23372a';c.beginPath();c.roundRect(-22,-31,44,49,6);c.fill();c.strokeStyle='#78947699';c.lineWidth=1;c.strokeRect(-16,-22,32,22);c.fillStyle='#4a6145';c.fillRect(-14,-17,28,2);c.strokeStyle='#18271e';for(let y=4;y<16;y+=5){c.beginPath();c.moveTo(-16,y);c.lineTo(16,y);c.stroke()}}
 c.fillStyle=profile.skin;c.beginPath();c.roundRect(-8,-56,16,16,4);c.fill();
 if(profile.hair==='hood'){c.fillStyle=fabric;c.beginPath();c.ellipse(0,-64,25,30,0,0,7);c.fill();c.strokeStyle='#172d2466';c.lineWidth=1;c.beginPath();c.ellipse(0,-64,23,28,0,0,7);c.stroke();c.beginPath();c.moveTo(0,-89);c.lineTo(0,-37);c.stroke()}
 else{c.fillStyle=profile.skin;for(const side of [-1,1]){c.beginPath();c.ellipse(side*17,-65,3,7,0,0,7);c.fill()}const hair=c.createLinearGradient(-22,-87,20,-43);hair.addColorStop(0,'#594033');hair.addColorStop(.5,'#2d221d');hair.addColorStop(1,'#171815');c.fillStyle=hair;c.beginPath();c.ellipse(0,-67,20,26,0,0,7);c.fill();if(female&&profile.hair==='short'){c.beginPath();c.moveTo(-19,-71);c.quadraticCurveTo(-27,-56,-22,-44);c.quadraticCurveTo(0,-37,22,-44);c.quadraticCurveTo(27,-56,19,-71);c.closePath();c.fill()}if(profile.hair==='long'){c.beginPath();c.moveTo(-19,-66);c.lineTo(-25,-33);c.quadraticCurveTo(0,-20,25,-33);c.lineTo(19,-66);c.closePath();c.fill()}c.strokeStyle='#b0946b44';c.lineWidth=.65;for(let i=0;i<8;i++){const x=-15+i*4;c.beginPath();c.moveTo(x,-87+Math.abs(x)*.32);c.quadraticCurveTo(x-3,-64,x+(i%2?2:-2),profile.hair==='long'?-31:-46);c.stroke()}}
 finishSurvivorDetails(c,true);c.restore();c.restore();
}
function renderShadowJumpscare(c,time){
 c.fillStyle='#020205';c.fillRect(0,0,1000,700);const glow=c.createRadialGradient(500,290,5,500,290,600);glow.addColorStop(0,'#66130f');glow.addColorStop(.45,'#170b14');glow.addColorStop(1,'#010104');c.fillStyle=glow;c.fillRect(0,0,1000,700);
 c.save();c.translate(500+Math.sin(time*57)*9,290+Math.cos(time*47)*6);const zoom=6+Math.min(1,time/.22)*5;c.scale(zoom,zoom);c.translate(-96,-35);drawShadowEntity(c,time*5);c.restore();
 // Scratched darkness and rising tendrils amplify the sudden close-up.
 c.strokeStyle='#9a1b1b44';c.lineWidth=1;for(let i=0;i<13;i++){const x=(i*83+time*19)%1000;c.beginPath();c.moveTo(x,0);c.lineTo(x+Math.sin(i+time*9)*15,700);c.stroke()}
}
