/* Detailed vector characters, drawn at high resolution without image downloads. */
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
 c.beginPath();c.moveTo(-22,-43);c.quadraticCurveTo(-36,-40,-32,-12);c.lineTo(-27,31);c.quadraticCurveTo(0,37,27,31);c.lineTo(32,-12);c.quadraticCurveTo(36,-40,22,-43);c.closePath();c.fill();
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
 c.restore();c.restore();
}
function drawShadowEntity(c,phase=0){
 c.save();const sway=Math.sin(phase)*2;
 // Wisps remain transparent so the body reads as a silhouette in the corridor.
 const aura=c.createRadialGradient(96,135,15,96,135,105);aura.addColorStop(0,'#05060bb0');aura.addColorStop(.6,'#07091266');aura.addColorStop(1,'#00000000');c.fillStyle=aura;c.fillRect(0,0,192,256);
 c.lineCap='round';for(const side of [-1,1])for(let i=0;i<3;i++){c.strokeStyle=i===0?'#090c13':'#10131ddd';c.lineWidth=5-i;const bend=Math.sin(phase+i)*6;c.beginPath();c.moveTo(96+side*12,87+i*16);c.bezierCurveTo(96+side*(56+i*5),51+i*33,96+side*(84-i*4),112+i*26+bend,96+side*(72-i*8),168+i*24);c.bezierCurveTo(96+side*60,189+i*16,96+side*84,193+i*13,96+side*(87-i*8),215+i*8);c.stroke()}
 const body=c.createLinearGradient(62,0,130,0);body.addColorStop(0,'#030408');body.addColorStop(.42,'#191c25');body.addColorStop(.58,'#11141c');body.addColorStop(1,'#020306');c.fillStyle=body;
 for(const side of [-1,1]){c.beginPath();c.moveTo(96+side*10,151);c.bezierCurveTo(96+side*15,177,96+side*13,205,96+side*16,239);c.lineTo(96+side*24,250);c.lineTo(96+side*8,253);c.lineTo(96+side*4,192);c.lineTo(96+side*2,158);c.closePath();c.fill();c.strokeStyle='#34384366';c.lineWidth=.8;c.beginPath();c.moveTo(96+side*10,173);c.lineTo(96+side*12,235);c.stroke()}
 c.fillStyle=body;c.beginPath();c.moveTo(84,60);c.lineTo(71,67);c.lineTo(68,84);c.lineTo(82,147);c.lineTo(87,163);c.lineTo(105,163);c.lineTo(111,145);c.lineTo(124,84);c.lineTo(121,67);c.lineTo(108,60);c.closePath();c.fill();
 for(const side of [-1,1]){c.strokeStyle='#03050a';c.lineWidth=10;c.beginPath();c.moveTo(96+side*23,73);c.quadraticCurveTo(96+side*37,109,96+side*40,140);c.lineTo(96+side*(49+sway),195);c.stroke();c.strokeStyle='#33374299';c.lineWidth=1;c.beginPath();c.moveTo(96+side*25,80);c.quadraticCurveTo(96+side*35,118,96+side*40,145);c.lineTo(96+side*(46+sway),190);c.stroke();c.strokeStyle='#080a11';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(96+side*(46+i*2+sway),190);c.bezierCurveTo(96+side*(50+i*3),203,96+side*(50+i*3),214,96+side*(47+i*4),220+i*3);c.stroke()}}
 c.strokeStyle='#3b3c4744';c.lineWidth=.7;for(const side of [-1,1]){c.beginPath();c.moveTo(96+side*15,66);c.lineTo(96+side*8,93);c.lineTo(96+side*17,85);c.moveTo(96+side*18,97);c.lineTo(96+side*10,147);c.stroke()}
 c.fillStyle='#020309';c.beginPath();c.moveTo(94,69);c.lineTo(98,69);c.lineTo(101,116);c.lineTo(96,126);c.lineTo(92,116);c.closePath();c.fill();c.fillStyle='#242733';for(let y=125;y<150;y+=10){c.beginPath();c.arc(97,y,.9,0,7);c.fill()}
 const head=c.createRadialGradient(90,27,1,97,34,25);head.addColorStop(0,'#20232c');head.addColorStop(.55,'#0b0e15');head.addColorStop(1,'#000105');c.fillStyle=head;c.beginPath();c.ellipse(96,35,16,27,0,0,7);c.fill();c.strokeStyle='#54515e44';c.lineWidth=.8;c.beginPath();c.ellipse(96,35,16,27,0,Math.PI*.92,Math.PI*1.52);c.stroke();
 c.save();c.beginPath();c.ellipse(96,35,16,27,0,0,7);c.clip();for(let i=0;i<280;i++){const x=80+(Math.sin(i*71.31)*.5+.5)*32,y=8+(Math.cos(i*39.73)*.5+.5)*54;c.fillStyle=i%3?'#9a91aa12':'#00000566';c.fillRect(x,y,.25+(i%4)*.12,.4)}c.restore();
 c.strokeStyle='#39354433';c.lineWidth=.35;for(let i=0;i<6;i++){c.beginPath();c.moveTo(86+i*4,18);c.bezierCurveTo(84+i*5,30,91+i*2,38,89+i*3,52);c.moveTo(85+i*4,23+i*3);c.lineTo(88+i*4,25+i*3);c.lineTo(87+i*4,30+i*3);c.stroke()}
 for(const side of [-1,1]){const x=96+side*7,y=34;c.fillStyle='#010105';c.beginPath();c.ellipse(x,y,6,4,side*.14,0,7);c.fill();const glow=c.createRadialGradient(x,y,0,x,y,13);glow.addColorStop(0,'#ff271bcc');glow.addColorStop(.25,'#dc111585');glow.addColorStop(1,'#ff000000');c.fillStyle=glow;c.fillRect(x-14,y-14,28,28);c.shadowColor='#ff1818';c.shadowBlur=8;const fire=c.createRadialGradient(x,y,0,x,y,4);fire.addColorStop(0,'#ffdab1');fire.addColorStop(.2,'#ff7950');fire.addColorStop(.65,'#ff2218');fire.addColorStop(1,'#a50811');c.fillStyle=fire;c.beginPath();c.ellipse(x,y,4,1.7,side*.17,0,7);c.fill();c.shadowBlur=0}
 c.restore();
}
function renderShadowJumpscare(c,time){
 c.fillStyle='#020205';c.fillRect(0,0,1000,700);const glow=c.createRadialGradient(500,290,5,500,290,600);glow.addColorStop(0,'#66130f');glow.addColorStop(.45,'#170b14');glow.addColorStop(1,'#010104');c.fillStyle=glow;c.fillRect(0,0,1000,700);
 c.save();c.translate(500+Math.sin(time*57)*9,290+Math.cos(time*47)*6);const zoom=6+Math.min(1,time/.22)*5;c.scale(zoom,zoom);c.translate(-96,-35);drawShadowEntity(c,time*5);c.restore();
 // Scratched darkness and rising tendrils amplify the sudden close-up.
 c.strokeStyle='#9a1b1b44';c.lineWidth=1;for(let i=0;i<13;i++){const x=(i*83+time*19)%1000;c.beginPath();c.moveTo(x,0);c.lineTo(x+Math.sin(i+time*9)*15,700);c.stroke()}
}
