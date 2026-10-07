/* GPU-lit 3D environment and rounded characters. Canvas renderer remains a fallback. */
let GPU=null,gpuUnavailable=false;
function initGpu(){
 if(GPU||gpuUnavailable)return GPU;
 const surface=document.createElement('canvas');surface.width=1000;surface.height=700;
 const gl=surface.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:true});
 if(!gl||typeof gl.getParameter(gl.VERSION)!=='string'){gpuUnavailable=true;return null}
 try{
  const vertex=`#version 300 es
  precision highp float;
  layout(location=0) in vec3 position;layout(location=1) in vec3 normal;layout(location=2) in vec3 texcoord;
  uniform mat4 vp;uniform mat4 model;uniform mat3 normalMatrix;
  out vec3 worldPosition;out vec3 worldNormal;out vec3 uv;
  void main(){vec4 p=model*vec4(position,1.0);worldPosition=p.xyz;worldNormal=normalize(normalMatrix*normal);uv=texcoord;gl_Position=vp*p;}`;
  const fragment=`#version 300 es
  precision highp float;precision highp sampler2DArray;
  in vec3 worldPosition;in vec3 worldNormal;in vec3 uv;out vec4 color;
  uniform sampler2DArray materials;uniform vec3 eye;uniform vec3 forward;uniform vec3 tint;uniform float solid;uniform float psycho;uniform float flashlight;uniform float emission;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  void main(){
   vec3 albedo=solid>.5?tint:texture(materials,uv).rgb;
   vec3 n=normalize(worldNormal),delta=eye-worldPosition;float dist=length(delta);vec3 l=normalize(delta);
   float cone=pow(max(0.0,dot(normalize(worldPosition-eye),forward)),24.0);
   float diffuse=max(.0,dot(n,l));float attenuation=1.0/(1.0+dist*.25+dist*dist*.035);
   float ambient=mix(.21,.002,psycho);float lamp=flashlight*cone*attenuation;
   float grain=(hash(floor(worldPosition*140.0))-.5)*(solid>.5?.02:.035);
   float edge=mix(1.0,.83,smoothstep(.0,.045,min(fract(uv.x),1.0-fract(uv.x))));
   vec3 lit=albedo*(ambient+lamp*(.22+.92*diffuse));
   float specular=pow(max(0.0,dot(reflect(-l,n),l)),solid>.5?38.0:22.0)*lamp;
   lit+=vec3(.75,.81,.72)*specular*(solid>.5?.035:.025);
   lit+=grain*(ambient+lamp)*vec3(.5,.65,.6);lit+=albedo*emission;
   float fog=1.0-exp(-dist*dist*.0035);lit=mix(lit,vec3(.024,.035,.041)*mix(1.0,.025,psycho),fog);
   color=vec4(pow(max(lit,vec3(0.0)),vec3(.87)),1.0);
  }`;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const uniforms={};for(const name of ['vp','model','normalMatrix','materials','eye','forward','tint','solid','psycho','flashlight','emission'])uniforms[name]=gl.getUniformLocation(program,name);
  const textures=[];
  for(const walls of [VIEW.normalWalls,VIEW.psychoWalls]){
   const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,10,gl.RGBA8,512,512,15);
   const floor=document.createElement('canvas');floor.width=floor.height=512;const small=document.createElement('canvas');small.width=small.height=128;const paint=small.getContext('2d'),pixels=paint.createImageData(128,128);pixels.data.set(VIEW.floorTexture);paint.putImageData(pixels,0,0);floor.getContext('2d').drawImage(small,0,0,512,512);
   const images=[...walls,VIEW.furnitureMaterials.wardrobe,VIEW.furnitureMaterials.cabinet,VIEW.furnitureMaterials.side,floor];
   images.forEach((image,layer)=>gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,512,512,1,gl.RGBA,gl.UNSIGNED_BYTE,image));
   gl.generateMipmap(gl.TEXTURE_2D_ARRAY);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);
   const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');if(anisotropy)gl.texParameterf(gl.TEXTURE_2D_ARRAY,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
   textures.push(texture);
  }
  const geometry=data=>{const vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12)}return {vao,buffer,count:data.length/9}};
  const sphere=[];const point=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];
  for(let y=0;y<14;y++)for(let x=0;x<24;x++){const a=y*Math.PI/14,b=x*Math.PI*2/24,A=(y+1)*Math.PI/14,B=(x+1)*Math.PI*2/24;for(const p of [point(a,b),point(A,b),point(A,B),point(a,b),point(A,B),point(a,B)])sphere.push(...p,...p,0,0,0)}
  const roundBox=[];
  const rounded=p=>{const core=p.map(v=>Math.max(-.78,Math.min(.78,v))),offset=p.map((v,i)=>v-core[i]),length=Math.hypot(...offset),n=offset.map(v=>v/length);return {p:core.map((v,i)=>v+n[i]*.22),n}};
  for(let face=0;face<6;face++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){
   const point=(u,v)=>{const a=-1+u/4,b=-1+v/4;return rounded(face===0?[1,a,b]:face===1?[-1,a,b]:face===2?[a,1,b]:face===3?[a,-1,b]:face===4?[a,b,1]:[a,b,-1])};
   for(const p of [point(x,y),point(x+1,y),point(x+1,y+1),point(x,y),point(x+1,y+1),point(x,y+1)])roundBox.push(...p.p,...p.n,0,0,0);
  }
  const coatMesh=amount=>{const data=roundBox.slice();for(let i=0;i<data.length;i+=9){const y=data[i+1],factor=1-amount+amount*Math.abs(y),x=data[i];data[i]*=factor;data[i+4]-=data[i+3]*x*amount*Math.sign(y)/factor;data[i+3]/=factor}return geometry(data)};
  const gem=[],ring=[[1,0,0],[0,0,1],[-1,0,0],[0,0,-1]];
  for(const sign of [-1,1])for(let i=0;i<4;i++){const a=[0,sign,0],b=ring[i],c=ring[(i+1)%4],d=b.map((v,j)=>v-a[j]),e=c.map((v,j)=>v-a[j]),n=[d[1]*e[2]-d[2]*e[1],d[2]*e[0]-d[0]*e[2],d[0]*e[1]-d[1]*e[0]],length=Math.hypot(...n);for(const p of [a,b,c])gem.push(...p,...n.map(v=>v/length),0,0,0)}
  GPU={gl,program,uniforms,surface,textures,geometry,sphere:geometry(sphere),roundBox:geometry(roundBox),coatMale:coatMesh(.15),coatFemale:coatMesh(.23),gem:geometry(gem),scene:null,grid:null,furniture:null};
  surface.addEventListener('webglcontextlost',event=>{event.preventDefault();GPU=null;gpuUnavailable=true});surface.addEventListener('webglcontextrestored',()=>{GPU=null;gpuUnavailable=false});gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);return GPU;
 }catch(error){console.warn('3D renderer unavailable; using canvas fallback.',error.message);gpuUnavailable=true;return null}
}
function gpuMatrixMultiply(a,b){const out=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];return out}
function gpuIdentity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
function gpuCamera(p,horizon){
 const angle=p.angle||0,f=[Math.cos(angle),0,Math.sin(angle)],right=[-f[2],0,f[0]],eye=[p.x,p.height,p.y];
 const view=new Float32Array([right[0],0,-f[0],0,0,1,0,0,right[2],0,-f[2],0,-right[0]*eye[0]-right[2]*eye[2],-eye[1],f[0]*eye[0]+f[2]*eye[2],1]);
 const near=.025,far=60,projection=new Float32Array([1.4,0,0,0,0,2,0,0,0,2*horizon/700-1,-(far+near)/(far-near),-1,0,0,-2*far*near/(far-near),0]);
 return {vp:gpuMatrixMultiply(projection,view),eye,forward:[f[0],(horizon/700-.5)*1.5,f[2]]};
}
function buildGpuScene(g){
 const vertices=[];
 const face=(points,normal,layer,repeat=1)=>{for(const index of [0,1,2,0,2,3]){const uv=[[0,1],[1,1],[1,0],[0,0]][index];vertices.push(...points[index],...normal,uv[0]*repeat,uv[1]*repeat,layer)}};
 function box(x,y,z,w,h,d,layers){const X=x+w/2,x0=x-w/2,Y=y+h/2,y0=y-h/2,Z=z+d/2,z0=z-d/2;
  face([[X,y0,z0],[X,y0,Z],[X,Y,Z],[X,Y,z0]],[1,0,0],layers[0]);face([[x0,y0,Z],[x0,y0,z0],[x0,Y,z0],[x0,Y,Z]],[-1,0,0],layers[1]);
  face([[X,y0,Z],[x0,y0,Z],[x0,Y,Z],[X,Y,Z]],[0,0,1],layers[2]);face([[x0,y0,z0],[X,y0,z0],[X,Y,z0],[x0,Y,z0]],[0,0,-1],layers[3]);
  face([[x0,Y,z0],[X,Y,z0],[X,Y,Z],[x0,Y,Z]],[0,1,0],layers[4]);
 }
 for(let y=0;y<world.size;y++)for(let x=0;x<world.size;x++)if(world.grid[y][x]){
  const layer=Math.abs(x*17+y*31+(world.decorSeed||0))%11;box(x+.5,.5,y+.5,1,1,1,[layer,layer,(layer+7)%11,(layer+7)%11,0]);
  for(const [nx,nz,picture] of [[1,0,layer],[-1,0,layer],[0,1,(layer+7)%11],[0,-1,(layer+7)%11]])if((picture===2||picture>=6)&&world.grid[y+nz]?.[x+nx]===0){
   const X=x+.5+nx*.515,Z=y+.5+nz*.515;
   for(const sign of [-1,1]){box(X+(nx?0:sign*.25),.574,Z+(nz?0:sign*.25),nx?.028:.023,.612,nz?.028:.023,[13,13,13,13,13]);box(X,.574+sign*.301,Z,nx?.028:.512,.018,nz?.028:.512,[13,13,13,13,13])}
  }
 }
 face([[0,0,0],[world.size,0,0],[world.size,0,world.size],[0,0,world.size]],[0,1,0],14,world.size);
 face([[0,1,world.size],[world.size,1,world.size],[world.size,1,0],[0,1,0]],[0,-1,0],1,world.size);
 for(let x=2;x<world.size;x+=3)box(x,.995,world.size/2,.045,.03,world.size,[13,13,13,13,13]);
 for(const item of world.furniture||[]){const b=furnitureBounds(item),front=item.type==='wardrobe'?11:12,layers=[13,13,13,13,13];layers[item.nx===1?0:item.nx===-1?1:item.ny===1?2:3]=front;box(item.x,item.height/2,item.y,b.maxX-b.minX,item.height,b.maxY-b.minY,layers)}
 if(g.scene){g.gl.deleteVertexArray(g.scene.vao);g.gl.deleteBuffer(g.scene.buffer)}g.scene=g.geometry(vertices);g.grid=world.grid;g.furniture=world.furniture;g.seed=world.decorSeed;
}
function gpuColor(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
function drawGpuSphere(g,center,scale,color,yaw=0,emission=0,mesh=g.sphere){
 const gl=g.gl,u=g.uniforms,c=Math.cos(yaw),s=Math.sin(yaw),model=new Float32Array([c*scale[0],0,-s*scale[0],0,0,scale[1],0,0,s*scale[2],0,c*scale[2],0,...center,1]);
 gl.uniformMatrix4fv(u.model,false,model);gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([c/scale[0],0,-s/scale[0],0,1/scale[1],0,s/scale[2],0,c/scale[2]]));gl.uniform3fv(u.tint,color);gl.uniform1f(u.solid,1);gl.uniform1f(u.emission,emission);gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
}
function drawGpuLimb(g,a,b,r,color){
 const delta=b.map((v,i)=>v-a[i]),length=Math.hypot(...delta),up=delta.map(v=>v/length),helper=Math.abs(up[1])>.95?[1,0,0]:[0,1,0];
 let right=[up[1]*helper[2]-up[2]*helper[1],up[2]*helper[0]-up[0]*helper[2],up[0]*helper[1]-up[1]*helper[0]],size=Math.hypot(...right);right=right.map(v=>v/size);const back=[right[1]*up[2]-right[2]*up[1],right[2]*up[0]-right[0]*up[2],right[0]*up[1]-right[1]*up[0]];
 const model=new Float32Array([...right.map(v=>v*r),0,...up.map(v=>v*length*.6),0,...back.map(v=>v*r),0,...a.map((v,i)=>(v+b[i])/2),1]),gl=g.gl,u=g.uniforms;
 gl.uniformMatrix4fv(u.model,false,model);gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([...right.map(v=>v/r),...up.map(v=>v/(length*.6)),...back.map(v=>v/r)]));gl.uniform3fv(u.tint,color);gl.uniform1f(u.solid,1);gl.uniform1f(u.emission,0);gl.bindVertexArray(g.sphere.vao);gl.drawArrays(gl.TRIANGLES,0,g.sphere.count);
}
function drawGpuCharacter(g,entity,enemy,p){
 const phase=entity.gaitPhase||0,motion=entity.motion||0,stride=Math.sin(phase)*motion,yaw=enemy?(entity.moveAngle??Math.atan2(p.y-entity.y,p.x-entity.x)):(entity.angle||0);
 const forward=[Math.cos(yaw),Math.sin(yaw)],side=[-forward[1],forward[0]],base=[entity.x,0,entity.y];
 const local=(x,y,z)=>[base[0]+side[0]*x+forward[0]*z,y,base[2]+side[1]*x+forward[1]*z];
 const skin=enemy?[.66,.72,.70]:gpuColor(profile.skin),coat=enemy?[.065,.079,.105]:gpuColor(profile.color),pants=enemy?[.027,.032,.043]:[.12,.18,.15],boots=[.035,.05,.045];
 const sphere=(x,y,z,scale,color,glow=0)=>drawGpuSphere(g,local(x,y,z),scale,color,-yaw+Math.PI/2,glow);
 const box=(x,y,z,scale,color,mesh=g.roundBox)=>drawGpuSphere(g,local(x,y,z),scale,color,-yaw+Math.PI/2,0,mesh);
 const limb=(a,b,r,color)=>drawGpuLimb(g,local(...a),local(...b),r,color);
 const hip=enemy?.55:.37,shoulder=enemy?.81:.64,head=enemy?.91:.77;
 drawGpuSphere(g,[entity.x,.003,entity.y],[enemy?.14:.18,.002,.115],[.045,.06,.051]);
 for(const sign of [-1,1]){
  const swing=stride*sign*(entity.running?.14:.09),kneeY=hip*.55+Math.max(0,swing)*.24,footY=.04+Math.max(0,swing)*.33;
  limb([sign*.06,hip,0],[sign*.07,kneeY,swing],enemy?.029:.042,pants);limb([sign*.07,kneeY,swing],[sign*.075,footY,-swing],enemy?.026:.038,pants);
  sphere(sign*.075,footY,-swing+.025,[.043,.034,.075],boots);
  const armX=enemy?.13:.135,elbow=enemy?.60:.48,hand=enemy?.35:.36;
  limb([sign*armX,shoulder,0],[sign*(armX+.025),elbow,-swing*.9],enemy?.024:.045,coat);limb([sign*(armX+.025),elbow,-swing*.9],[sign*(armX+.04),hand,swing],enemy?.018:.034,coat);
  sphere(sign*(armX+.04),hand,swing,[enemy?.019:.028,enemy?.045:.039,.024],enemy?[.08,.09,.11]:skin);
  for(let finger=0;finger<(enemy?4:3);finger++){const x=sign*(armX+.032)+finger*.007*sign,length=enemy?.065+finger*.008:.027;limb([x,hand-.02,swing+.004],[x+sign*.008,hand-.02-length,swing+.014],enemy?.003:.0045,enemy?[.12,.14,.15]:skin)}
 }
 box(0,(hip+shoulder)/2,0,[enemy?.105:profile.gender==='female'?.12:.14,(shoulder-hip)*.6,.083],coat,profile.gender==='female'&&!enemy?g.coatFemale:g.coatMale);
 sphere(0,head,0,[enemy?.065:.079,enemy?.085:.094,.071],skin);
 sphere(0,shoulder+.025,0,[.038,.047,.035],skin);
 if(enemy){
  for(const sign of [-1,1]){sphere(sign*.032,shoulder+.008,.079,[.027,.019,.011],[.57,.64,.63]);limb([sign*.077,shoulder-.014,.063],[sign*.027,shoulder-.14,.09],.006,[.19,.22,.27])}
  for(const y of [hip+.055,hip+.115,hip+.18])sphere(.015,y,.087,[.0035,.0035,.0045],[.31,.36,.38]);
  for(const sign of [-1,1])sphere(sign*.026,head+.01,.063,[.015,.009,.01],[.95,.015,.025],3.3);
  limb([0,shoulder+.025,.084],[0,hip+.035,.09],.009,[.007,.009,.013]);
  for(const sign of [-1,1])for(let i=0;i<3;i++){let previous=[sign*.09,shoulder-i*.045,-.065];for(let k=1;k<6;k++){const next=[sign*(.1+k*.045),shoulder-i*.045-k*.05+Math.sin(k+phase+i)*.028,-.06-k*.019];limb(previous,next,.009,[.018,.025,.033]);previous=next}}
 }else{
  for(const sign of [-1,1])sphere(sign*.075,head-.012,0,[.016,.028,.017],skin);
  sphere(0,head-.051,.006,[.061,.044,.062],skin);sphere(0,head-.041,.067,[.023,.0035,.006],[.24,.14,.11]);
  sphere(0,head+.052,-.005,[.082,.051,.075],[.11,.075,.053]);
  if(profile.hair==='long')sphere(0,head-.034,-.051,[.077,.13,.035],[.12,.078,.05]);
  if(profile.gender==='female'&&profile.hair==='short')for(const sign of [-1,1])sphere(sign*.07,head-.034,-.012,[.018,.077,.049],[.11,.075,.053]);
  if(profile.hair==='hood')sphere(0,head,-.032,[.091,.11,.055],coat);
  box(0,.52,-.105,[.092,.117,.045],[.17,.23,.17]);box(0,.475,-.148,[.075,.042,.020],[.24,.3,.21]);
  box(0,.50,-.169,[.063,.002,.002],[.065,.10,.065]);for(const sign of [-1,1]){box(sign*.058,.57,-.150,[.011,.009,.004],[.56,.49,.31]);limb([sign*.058,.64,-.12],[sign*.058,.44,-.165],.006,[.10,.14,.10])}
  limb([-.025,.639,-.11],[0,.662,-.11],.006,[.28,.34,.23]);limb([0,.662,-.11],[.025,.639,-.11],.006,[.28,.34,.23]);
  for(const sign of [-1,1])limb([sign*.077,.65,-.01],[sign*.07,.43,.06],.012,[.18,.19,.13]);
  const darker=coat.map(v=>v*.62);for(const sign of [-1,1])box(sign*.071,.51,.083,[.036,.048,.012],darker);
  limb([0,hip+.03,.083],[0,shoulder-.02,.083],.0028,[.27,.32,.26]);
  for(const y of [.43,.50,.57])sphere(.009,y,.085,[.003,.004,.003],[.69,.67,.49]);
  if(profile.outfit==='padded')for(let y=.41;y<.63;y+=.035)limb([-.092,y,.069],[.092,y,.069],.0025,darker);
  if(profile.outfit==='tactical'){box(0,.535,.082,[.111,.123,.026],[.11,.17,.125]);for(const sign of [-1,1])box(sign*.05,.50,.11,[.04,.058,.017],[.20,.27,.19])}
  for(const sign of [-1,1])sphere(sign*.031,head+.006,.068,[.01,.006,.007],[.02,.025,.021]);
  sphere(0,head-.015,.078,[.011,.021,.013],skin);
 }
}
function renderGpuScene(p,horizon){
 const g=initGpu();if(!g)return false;
 const gl=g.gl,u=g.uniforms;
 try{
  if(g.grid!==world.grid||g.furniture!==world.furniture||g.seed!==world.decorSeed)buildGpuScene(g);
  const width=deviceMode==='phone'?800:1000;if(g.surface.width!==width){g.surface.width=width;g.surface.height=width*.7}gl.viewport(0,0,g.surface.width,g.surface.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(g.program);
  const camera=gpuCamera(p,horizon);gl.uniformMatrix4fv(u.vp,false,camera.vp);gl.uniformMatrix4fv(u.model,false,gpuIdentity());gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([1,0,0,0,1,0,0,0,1]));gl.uniform3fv(u.eye,camera.eye);gl.uniform3fv(u.forward,camera.forward);gl.uniform1f(u.psycho,difficulty==='psycho'?1:0);gl.uniform1f(u.flashlight,flashlightOn?1:0);gl.uniform1f(u.solid,0);gl.uniform1f(u.emission,0);gl.uniform1i(u.materials,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,g.textures[difficulty==='psycho'?1:0]);gl.bindVertexArray(g.scene.vao);gl.drawArrays(gl.TRIANGLES,0,g.scene.count);
  drawGpuCharacter(g,world.enemy,true,p);if(cameraMode==='third'&&!world.player.hidingId&&p.distance>.42)drawGpuCharacter(g,world.player,false,p);
  for(const relic of world.relics)if(!relic.taken)drawGpuSphere(g,[relic.x,.52+Math.sin(world.time*3)*.018,relic.y],[.105,.16,.105],[.97,.72,.23],world.time*.7,.9,g.gem);
  gl.flush();VIEW.context.drawImage(g.surface,0,0,1000,700);return true;
 }catch(error){console.warn('3D render fallback:',error.message);gpuUnavailable=true;GPU=null;return false}
}
