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
  out vec3 worldPosition;out vec3 worldNormal;out vec3 uv;out vec3 objectPosition;
  void main(){vec4 p=model*vec4(position,1.0);objectPosition=position;worldPosition=p.xyz;worldNormal=normalize(normalMatrix*normal);uv=texcoord;gl_Position=vp*p;}`;
  const fragment=`#version 300 es
  precision highp float;precision highp sampler2DArray;
  in vec3 worldPosition;in vec3 worldNormal;in vec3 uv;in vec3 objectPosition;out vec4 color;
  uniform sampler2DArray materials;uniform sampler2D shadowMap;uniform mat4 lightVP;uniform vec2 shadowTexel;uniform vec3 lightEye;uniform vec3 eye;uniform vec3 forward;uniform vec3 tint;uniform float solid;uniform float psycho;uniform float flashlight;uniform float emission;uniform float normalLight;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  void main(){
   vec3 albedo=solid>.5?tint:texture(materials,uv).rgb;
   vec3 n=normalize(worldNormal);
   bool faceless=solid>1.5&&solid<2.5,skin=faceless||solid>4.5,cloth=solid>2.5&&solid<3.5,metal=solid>3.5&&solid<4.5;
   if(skin){
    float mottling=noise(objectPosition*10.0)*.65+noise(objectPosition*35.0)*.35;
    albedo*=mix(.70,1.07,mottling);
    float front=faceless?smoothstep(.1,.65,objectPosition.z):0.0;
    float sockets=exp(-pow((abs(objectPosition.x)-.38)*5.0,2.0)-pow((objectPosition.y-.07)*7.0,2.0))*front;
    float lower=exp(-pow((objectPosition.y+.44)*4.0,2.0))*front;
    albedo=mix(albedo,vec3(.12,.14,.17),clamp(sockets*.83+lower*.26,0.0,.86));
    float vein=pow(1.0-abs(sin(objectPosition.x*38.0+sin(objectPosition.y*24.0)*2.0)),18.0);
    albedo*=1.0-vein*.045;
   }
   if(cloth){float weave=sin(objectPosition.x*460.0)*sin(objectPosition.y*610.0)*clamp(1.0-length(fwidth(objectPosition.xy))*280.0,0.0,1.0);albedo*=.94+weave*.035+noise(objectPosition*32.0)*.10;}
   albedo=pow(max(albedo,vec3(.0)),vec3(2.2));
   vec3 delta=eye-worldPosition;float dist=length(delta);vec3 l=normalize(lightEye-worldPosition);
   float cone=pow(max(0.0,dot(normalize(worldPosition-eye),forward)),24.0);
   float diffuse=max(.0,dot(n,l));float attenuation=1.0/(1.0+dist*.25+dist*dist*.035);
   float ambient=mix(.23*normalLight,.002,psycho);
   vec4 shadowClip=lightVP*vec4(worldPosition,1.0);vec3 shadowUV=shadowClip.xyz/shadowClip.w*.5+.5;float visibility=1.0;
   if(flashlight>.5&&shadowClip.w>0.0&&all(greaterThan(shadowUV,vec3(0)))&&all(lessThan(shadowUV,vec3(1)))){visibility=0.0;float bias=.00008+.00016*(1.0-max(0.0,dot(n,l)));for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float depth=texture(shadowMap,shadowUV.xy+vec2(x,y)*shadowTexel).r;visibility+=shadowUV.z-bias<=depth?1.0/9.0:0.0;}}
   float lamp=flashlight*cone*attenuation*visibility;
   float grain=(hash(floor(worldPosition*140.0))-.5)*(solid>.5?.02:.035);
   float edge=mix(1.0,.83,smoothstep(.0,.045,min(fract(uv.x),1.0-fract(uv.x))));
   if(solid<.5){
    float layer=floor(uv.z+.5);vec2 tile=fract(uv.xy);
    float height=dot(albedo,vec3(.299,.587,.114));vec3 surfaceGradient=dFdx(height)*cross(dFdy(worldPosition),n)+dFdy(height)*cross(n,dFdx(worldPosition));float determinant=dot(dFdx(worldPosition),cross(dFdy(worldPosition),n));n=normalize(n-sign(determinant)*surfaceGradient*.045/(abs(determinant)+.0001));
    float seams=1.0;
    albedo*=mix(.68,1.0,smoothstep(.005,.035,seams));
   }
   diffuse=max(0.0,dot(n,l));
   float contact=1.0-.25*exp(-max(worldPosition.y,0.0)*28.0)*(1.0-abs(n.y));
   float rim=pow(1.0-max(0.0,dot(n,l)),3.0);
   float moon=max(0.0,dot(n,normalize(vec3(-.4,.8,-.6))));
   vec3 lit=albedo*(ambient*contact+lamp*(.18+1.05*diffuse));
   lit+=albedo*vec3(.18,.29,.39)*(moon*.27+rim*.13)*(1.0-psycho);
   float wet=solid<.5&&uv.z>13.5&&uv.z<14.5?smoothstep(.65,.85,noise(worldPosition*2.0))*.25:0.0;
   float roughness=skin?.55:cloth?.94:metal?.30:solid<.5?(uv.z>=15.0&&uv.z<21.0?.22:mix(.83,.24,wet)):.65;
   vec3 v=normalize(delta),halfway=normalize(l+v);float ndv=max(.001,dot(n,v)),ndl=max(0.0,dot(n,l)),ndh=max(0.0,dot(n,halfway)),vdh=max(0.0,dot(v,halfway));
   float alpha=roughness*roughness,a2=alpha*alpha,denominator=ndh*ndh*(a2-1.0)+1.0,distribution=a2/(3.14159265*denominator*denominator+.0001),k=(roughness+1.0)*(roughness+1.0)/8.0,geometry=ndv/(ndv*(1.0-k)+k)*ndl/(ndl*(1.0-k)+k+.0001);
   vec3 f0=metal?mix(vec3(.35),albedo,.6):vec3(.04),fresnel=f0+(1.0-f0)*pow(1.0-vdh,5.0);
   vec3 reflection=distribution*geometry*fresnel/(4.0*ndv*max(.001,ndl));
   lit+=reflection*lamp*ndl*.9;
   lit+=fresnel*vec3(.035,.047,.062)*rim*(1.0-psycho);

   if(skin)lit+=albedo*vec3(.13,.09,.08)*lamp*pow(max(0.0,dot(-n,l)),2.0)*.22;
   lit+=grain*(ambient+lamp)*albedo*.1;lit+=albedo*emission;
   float fog=1.0-exp(-dist*dist*.0035);lit=mix(lit,vec3(.024,.035,.041)*mix(1.0,.025,psycho),fog);
   lit*=1.55;vec3 mapped=clamp((lit*(2.51*lit+.03))/(lit*(2.43*lit+.59)+.14),0.0,1.0);
   color=vec4(pow(mapped,vec3(1.0/2.2)),1.0);
  }`;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const uniforms={};for(const name of ['vp','model','normalMatrix','materials','eye','forward','tint','solid','psycho','flashlight','emission','shadowMap','lightVP','shadowTexel','lightEye','normalLight'])uniforms[name]=gl.getUniformLocation(program,name);
  const depthProgram=gl.createProgram();gl.attachShader(depthProgram,shader(gl.VERTEX_SHADER,'#version 300 es\nprecision highp float;layout(location=0) in vec3 position;uniform mat4 vp;uniform mat4 model;void main(){gl_Position=vp*model*vec4(position,1.0);}'));gl.attachShader(depthProgram,shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;void main(){}'));gl.linkProgram(depthProgram);if(!gl.getProgramParameter(depthProgram,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(depthProgram));
  const depthUniforms={vp:gl.getUniformLocation(depthProgram,'vp'),model:gl.getUniformLocation(depthProgram,'model'),normalMatrix:null,tint:null,solid:null,emission:null};
  const shadowSize=deviceMode==='phone'?512:1024,shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const shadowFramebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Shadow framebuffer incomplete');gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  const textures=[];
  for(const [modeIndex,walls] of [makeDecorTextures(false,true),makeDecorTextures(true,true)].entries()){
   const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,10,gl.RGBA8,512,512,22);
   const floor=makeDetailedFloorTexture();
   const images=[...walls,VIEW.furnitureMaterials.wardrobe,VIEW.furnitureMaterials.cabinet,VIEW.furnitureMaterials.side,floor,...[2,6,7,8,9,10].map(k=>(modeIndex?VIEW.psychoWalls:VIEW.normalWalls)[k]),makeDecorTextures(false,true)[0]];
   images.forEach((image,layer)=>gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,512,512,1,gl.RGBA,gl.UNSIGNED_BYTE,image));
   gl.generateMipmap(gl.TEXTURE_2D_ARRAY);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);
   const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');if(anisotropy)gl.texParameterf(gl.TEXTURE_2D_ARRAY,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
   textures.push(texture);
  }
  const geometry=data=>{const vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12)}return {vao,buffer,count:data.length/9}};
  const sphere=[];const point=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];
  for(let y=0;y<28;y++)for(let x=0;x<40;x++){const a=y*Math.PI/28,b=x*Math.PI*2/40,A=(y+1)*Math.PI/28,B=(x+1)*Math.PI*2/40;for(const p of [point(a,b),point(A,b),point(A,B),point(a,b),point(A,B),point(a,B)])sphere.push(...p,...p,0,0,0)}
  // A tapered jaw, fuller cranium, and shallow brow replace the oval head.
  const skull=sphere.slice();for(let i=0;i<skull.length;i+=9){const y=skull[i+1],jaw=1-.24*Math.max(0,-y);skull[i]*=jaw;skull[i+2]*=1-.12*Math.max(0,-y);if(skull[i+2]>0){skull[i+2]-=.035*Math.exp(-Math.pow((y-.08)*7,2));}skull[i+3]/=jaw;}
  const lapel=[];for(const sign of [-1,1]){for(const p of [[sign*.90,1,.94],[sign*.15,-.35,1.10],[sign*.49,.38,1.18]])lapel.push(...p,0,0,1,0,0,0);}
  const shirt=[];for(const p of [[-.46,1,1.03],[.46,1,1.03],[0,-.46,1.05]])shirt.push(...p,0,0,1,0,0,0);
  const tailored=[];
  const suitPoint=(v,a)=>{const y=v*2-1,width=.84+.15*Math.exp(-Math.pow((y-.62)*2,2))-.08*Math.exp(-y*y*5);const cx=Math.cos(a),sz=Math.sin(a);return [Math.sign(cx)*Math.pow(Math.abs(cx),.68)*width,y,Math.sign(sz)*Math.pow(Math.abs(sz),.68)*(1-.1*Math.max(0,y))];};
  const addSurface=(data,point,rows,columns)=>{for(let j=0;j<rows;j++)for(let k=0;k<columns;k++){const vertex=(J,K)=>{const v=J/rows,a=K/columns*Math.PI*2,p=point(v,a),dv=point(Math.min(1,v+.001),a).map((x,i)=>x-point(Math.max(0,v-.001),a)[i]),da=point(v,a+.001).map((x,i)=>x-point(v,a-.001)[i]);const n=[dv[1]*da[2]-dv[2]*da[1],dv[2]*da[0]-dv[0]*da[2],dv[0]*da[1]-dv[1]*da[0]],length=Math.hypot(...n)||1;return [...p,...n.map(x=>x/length),0,0,0]};for(const [J,K] of [[j,k],[j+1,k],[j+1,k+1],[j,k],[j+1,k+1],[j,k+1]])data.push(...vertex(J,K));}};
  addSurface(tailored,suitPoint,20,40);
  const sleeve=[];addSurface(sleeve,(v,a)=>{const y=v*2-1,r=Math.sqrt(Math.max(0,1-Math.pow(Math.abs(y),16)))*(1-.12*y);return [Math.cos(a)*r,y,Math.sin(a)*r]},24,24);
  const roundBox=[];
  const rounded=p=>{const core=p.map(v=>Math.max(-.78,Math.min(.78,v))),offset=p.map((v,i)=>v-core[i]),length=Math.hypot(...offset),n=offset.map(v=>v/length);return {p:core.map((v,i)=>v+n[i]*.22),n}};
  for(let face=0;face<6;face++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){
   const point=(u,v)=>{const a=-1+u/4,b=-1+v/4;return rounded(face===0?[1,a,b]:face===1?[-1,a,b]:face===2?[a,1,b]:face===3?[a,-1,b]:face===4?[a,b,1]:[a,b,-1])};
   for(const p of [point(x,y),point(x+1,y),point(x+1,y+1),point(x,y),point(x+1,y+1),point(x,y+1)])roundBox.push(...p.p,...p.n,0,0,0);
  }
  const pictureMeshes=[2,6,7,8,9,10].map((kind,index)=>{const data=[],quad=(points,n,layer,crop=false)=>{for(const i of [0,1,2,0,2,3]){const uv=[[0,1],[1,1],[1,0],[0,0]][i];data.push(...points[i],...n,crop?(126+uv[0]*260)/512:uv[0],crop?(63+uv[1]*310)/512:uv[1],layer);}};quad([[-.256,-.305,.016],[.256,-.305,.016],[.256,.305,.016],[-.256,.305,.016]],[0,0,1],15+index,true);quad([[.256,-.305,-.016],[-.256,-.305,-.016],[-.256,.305,-.016],[.256,.305,-.016]],[0,0,-1],13);for(const sign of [-1,1]){quad([[sign*.256,-.305,-.016],[sign*.256,-.305,.016],[sign*.256,.305,.016],[sign*.256,.305,-.016]],[sign,0,0],13);quad([[-.256,sign*.305,-.016],[.256,sign*.305,-.016],[.256,sign*.305,.016],[-.256,sign*.305,.016]],[0,sign,0],13);}return geometry(data);});
  const coatMesh=amount=>{const data=roundBox.slice();for(let i=0;i<data.length;i+=9){const y=data[i+1],factor=1-amount+amount*Math.abs(y),x=data[i];data[i]*=factor;data[i+4]-=data[i+3]*x*amount*Math.sign(y)/factor;data[i+3]/=factor}return geometry(data)};
  const gem=[],ring=[[1,0,0],[0,0,1],[-1,0,0],[0,0,-1]];
  for(const sign of [-1,1])for(let i=0;i<4;i++){const a=[0,sign,0],b=ring[i],c=ring[(i+1)%4],d=b.map((v,j)=>v-a[j]),e=c.map((v,j)=>v-a[j]),n=[d[1]*e[2]-d[2]*e[1],d[2]*e[0]-d[0]*e[2],d[0]*e[1]-d[1]*e[0]],length=Math.hypot(...n);for(const p of [a,b,c])gem.push(...p,...n.map(v=>v/length),0,0,0)}
  GPU={gl,program,uniforms,pictureMeshes,depthProgram,depthUniforms,shadowTexture,shadowFramebuffer,shadowSize,surface,textures,geometry,sphere:geometry(sphere),slenderHead:geometry(skull),slenderSuit:geometry(tailored),sleeve:geometry(sleeve),lapels:geometry(lapel),shirt:geometry(shirt),roundBox:geometry(roundBox),coatMale:coatMesh(.15),coatFemale:coatMesh(.23),gem:geometry(gem),scene:null,grid:null,furniture:null};
  surface.addEventListener('webglcontextlost',event=>{event.preventDefault();GPU=null;gpuUnavailable=true});surface.addEventListener('webglcontextrestored',()=>{GPU=null;gpuUnavailable=false});gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);return GPU;
 }catch(error){console.warn('3D renderer unavailable; using canvas fallback.',error.message);gpuUnavailable=true;return null}
}
function gpuMatrixMultiply(a,b){const out=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[col*4+row]+=a[k*4+row]*b[col*4+k];return out}
function gpuIdentity(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
function gpuCamera(p,horizon){
 const angle=p.angle||0,f=[Math.cos(angle),0,Math.sin(angle)],right=[-f[2],0,f[0]],eye=[p.x,p.height,p.y];
 const view=new Float32Array([right[0],0,-f[0],0,0,1,0,0,right[2],0,-f[2],0,-right[0]*eye[0]-right[2]*eye[2],-eye[1],f[0]*eye[0]+f[2]*eye[2],1]);
 const near=.025,far=60,projection=new Float32Array([2/((canvas.clientWidth||1000)/(canvas.clientHeight||700)),0,0,0,0,2,0,0,0,2*horizon/700-1,-(far+near)/(far-near),-1,0,0,-2*far*near/(far-near),0]);
 return {vp:gpuMatrixMultiply(projection,view),eye,forward:[f[0],(horizon/700-.5)*1.5,f[2]]};
}
function buildGpuScene(g){
 const vertices=[];const damage=[];g.lamps=[];
 const face=(points,normal,layer,repeat=1)=>{for(const index of [0,1,2,0,2,3]){const uv=[[0,1],[1,1],[1,0],[0,0]][index];vertices.push(...points[index],...normal,uv[0]*repeat,uv[1]*repeat,layer)}};
 function box(x,y,z,w,h,d,layers){const X=x+w/2,x0=x-w/2,Y=y+h/2,y0=y-h/2,Z=z+d/2,z0=z-d/2;
  face([[X,y0,z0],[X,y0,Z],[X,Y,Z],[X,Y,z0]],[1,0,0],layers[0]);face([[x0,y0,Z],[x0,y0,z0],[x0,Y,z0],[x0,Y,Z]],[-1,0,0],layers[1]);
  face([[X,y0,Z],[x0,y0,Z],[x0,Y,Z],[X,Y,Z]],[0,0,1],layers[2]);face([[x0,y0,z0],[X,y0,z0],[X,Y,z0],[x0,Y,z0]],[0,0,-1],layers[3]);
  face([[x0,Y,z0],[X,Y,z0],[X,Y,Z],[x0,Y,Z]],[0,1,0],layers[4]);
 }
 for(let y=0;y<world.size;y++)for(let x=0;x<world.size;x++)if(world.grid[y][x]){
  const layer=Math.abs(x*17+y*31+(world.decorSeed||0))%11;box(x+.5,.5,y+.5,1,1,1,[layer,layer,(layer+7)%11,(layer+7)%11,0]);
  for(const [nx,nz] of [[1,0],[-1,0],[0,1],[0,-1]])if(world.grid[y+nz]?.[x+nx]===0){const X=x+.5+nx*.505,Z=y+.5+nz*.505;box(X,.037,Z,nx?.025:1,.055,nz?.025:1,[13,13,13,13,13]);box(X,.952,Z,nx?.026:1,.032,nz?.026:1,[13,13,13,13,13]);}

 }
 // Raised paint curls and gouge lips live on their own Psycho-only mesh.
 for(let y=1;y<world.size-1;y++)for(let x=1;x<world.size-1;x++)if(world.grid[y][x]&&(x*11+y*7)%5===0)for(const [nx,nz]of [[1,0],[-1,0],[0,1],[0,-1]])if(world.grid[y+nz]?.[x+nx]===0){const X=x+.5+nx*.504,Z=y+.5+nz*.504,local=(u,v,depth)=>[X+nz*u+nx*depth,v,Z-nx*u+nz*depth];
  for(let claw=0;claw<4;claw++)for(let segment=0;segment<6;segment++){const u=-.34+claw*.047+Math.sin(segment*.8)*.01,h=.79-segment*.069,nextU=-.34+claw*.047+Math.sin((segment+1)*.8)*.01;const points=[local(u,h,0),local(u+.009,h,.010),local(nextU+.009,h-.070,.009),local(nextU,h-.070,0)];for(const i of [0,1,2,0,2,3])damage.push(...points[i],nx,.18,nz,.1,.5,13);}
  for(let flake=0;flake<5;flake++){const u=-.11+flake*.065,v=.37+((x+y+flake)%4)*.085,points=[local(u,v,0),local(u+.037,v+.012,.026),local(u+.045,v+.074,.045),local(u-.007,v+.065,.008)];for(const i of [0,1,2,0,2,3])damage.push(...points[i],nx,.35,nz,.32+(i%2)*.10,.30+(i%3)*.07,21);}
 }
 if(g.damage){g.gl.deleteVertexArray(g.damage.vao);g.gl.deleteBuffer(g.damage.buffer);}g.damage=g.geometry(damage);
 // Low, tilted fragments cast shadows over the distressed planks.
 g.floorDebrisCount=0;
 for(let y=1;y<world.size-1;y++)for(let x=1;x<world.size-1;x++)if(world.grid[y][x]===0&&((x*37+y*61+(world.decorSeed||0))%11===0)){
  const seed=Math.abs(x*117+y*83+(world.decorSeed||0));
  for(let k=0;k<2;k++){const angle=(seed%23)*.17+k*.48,dx=Math.cos(angle),dz=Math.sin(angle),length=.30+((seed+k*13)%29)*.009,width=.055+((seed+k)%5)*.009,X=x+.35+k*.25,Z=y+.40+k*.12,lift=.008+(seed%5)*.003;
   const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([along,across])=>[X+dx*along*length/2-dz*across*width/2,.008+(along+1)*lift/2,Z+dz*along*length/2+dx*across*width/2]);
   const normal=[-dx*lift/length,1,-dz*lift/length],n=Math.hypot(...normal);for(const index of [0,1,2,0,2,3]){const along=index===0||index===3?0:1,across=index<2?0:1;vertices.push(...points[index],...normal.map(v=>v/n),((seed%6)+.15+across*.7)/6,along,14);}
   for(let i=0;i<4;i++){const p=points[i],q=points[(i+1)%4],nx=q[2]-p[2],nz=p[0]-q[0],d=Math.hypot(nx,nz);face([p,q,[q[0],.002,q[2]],[p[0],.002,p[2]]],[nx/d,0,nz/d],14);}
   g.floorDebrisCount++;
  }
 }
 face([[0,0,0],[world.size,0,0],[world.size,0,world.size],[0,0,world.size]],[0,1,0],14,world.size);
 face([[0,1,world.size],[world.size,1,world.size],[world.size,1,0],[0,1,0]],[0,-1,0],1,world.size);
 for(let y=1;y<world.size-1;y++)for(let x=1;x<world.size-1;x++)if(world.grid[y][x]===0&&(x*13+y*17)%23===0){g.lamps.push({x:x+.5,y:y+.5});box(x+.5,.978,y+.5,.17,.035,.10,[13,13,13,13,13]);}
 for(let x=2;x<world.size;x+=3)box(x,.995,world.size/2,.045,.03,world.size,[13,13,13,13,13]);
 for(const item of world.furniture||[]){const b=furnitureBounds(item),front=item.type==='wardrobe'?11:12,layers=[13,13,13,13,13];layers[item.nx===1?0:item.nx===-1?1:item.ny===1?2:3]=front;box(item.x,item.height/2,item.y,b.maxX-b.minX,item.height,b.maxY-b.minY,layers);
  const nx=item.nx||0,nz=item.ny||0,tx=-nz,tz=nx,depth=nx?(b.maxX-b.minX)/2:(b.maxY-b.minY)/2,width=nx?b.maxY-b.minY:b.maxX-b.minX,frontX=item.x+nx*(depth+.008),frontZ=item.y+nz*(depth+.008),wood=[13,13,13,13,13];
  const trim=(offset,height,w,h)=>box(frontX+tx*offset,height,frontZ+tz*offset,nx?.025:w,h,nz?.025:w,wood);
  trim(0,item.height-.018,width+.03,.035);trim(0,.035,width+.02,.055);for(const sign of [-1,1]){trim(sign*(width/2-.017),item.height/2,.026,item.height-.04);for(const Y of [.30,.67])if(Y<item.height-.05){trim(sign*width*.235,Y,width*.39,.015);}}
  for(const sign of [-1,1])for(const h of [.20,.62])if(h<item.height)trim(sign*(width/2-.045),h,.015,.043);
 }

 if(g.scene){g.gl.deleteVertexArray(g.scene.vao);g.gl.deleteBuffer(g.scene.buffer)}g.scene=g.geometry(vertices);g.grid=world.grid;g.furniture=world.furniture;g.seed=world.decorSeed;
}
function gpuColor(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
function drawGpuSphere(g,center,scale,color,yaw=0,emission=0,mesh=g.sphere,material=1){
 const gl=g.gl,u=g.uniforms,c=Math.cos(yaw),s=Math.sin(yaw),model=new Float32Array([c*scale[0],0,-s*scale[0],0,0,scale[1],0,0,s*scale[2],0,c*scale[2],0,...center,1]);
 gl.uniformMatrix4fv(u.model,false,model);gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([c/scale[0],0,-s/scale[0],0,1/scale[1],0,s/scale[2],0,c/scale[2]]));gl.uniform3fv(u.tint,color);gl.uniform1f(u.solid,material);gl.uniform1f(u.emission,emission);gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
}
function drawGpuLimb(g,a,b,r,color,material=1){
 const delta=b.map((v,i)=>v-a[i]),length=Math.hypot(...delta),up=delta.map(v=>v/length),helper=Math.abs(up[1])>.95?[1,0,0]:[0,1,0];
 let right=[up[1]*helper[2]-up[2]*helper[1],up[2]*helper[0]-up[0]*helper[2],up[0]*helper[1]-up[1]*helper[0]],size=Math.hypot(...right);right=right.map(v=>v/size);const back=[right[1]*up[2]-right[2]*up[1],right[2]*up[0]-right[0]*up[2],right[0]*up[1]-right[1]*up[0]];
 const model=new Float32Array([...right.map(v=>v*r),0,...up.map(v=>v*length*.6),0,...back.map(v=>v*r),0,...a.map((v,i)=>(v+b[i])/2),1]),gl=g.gl,u=g.uniforms;
 gl.uniformMatrix4fv(u.model,false,model);gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([...right.map(v=>v/r),...up.map(v=>v/(length*.6)),...back.map(v=>v/r)]));gl.uniform3fv(u.tint,color);gl.uniform1f(u.solid,material);gl.uniform1f(u.emission,0);const mesh=material===3?g.sleeve:g.sphere;gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
}
function drawGpuCharacter(g,entity,enemy,p){
 const profile=entity.profile||getSurvivorProfile();
 const phase=entity.gaitPhase||0,motion=entity.motion||0,stride=Math.sin(phase)*motion,yaw=enemy?(entity.moveAngle??Math.atan2(p.y-entity.y,p.x-entity.x)):(entity.angle||0);
 const forward=[Math.cos(yaw),Math.sin(yaw)],side=[-forward[1],forward[0]],base=[entity.x,0,entity.y];
 const breathing=Math.sin((world.time||0)*1.8+entity.x)*.002,bodyBob=motion?Math.abs(Math.sin(phase))* .005:0;
 const local=(x,y,z)=>[base[0]+side[0]*x+forward[0]*z,y+breathing+bodyBob,base[2]+side[1]*x+forward[1]*z];
 const skin=enemy?[.86,.88,.87]:gpuColor(profile.skin),coat=enemy?[.025,.029,.034]:gpuColor(profile.color),pants=enemy?[.027,.032,.043]:[.12,.18,.15],boots=[.035,.05,.045];
 const sphere=(x,y,z,scale,color,glow=0)=>drawGpuSphere(g,local(x,y,z),scale,color,-yaw+Math.PI/2,glow,g.sphere,(color===coat||color===pants)?3:color===skin?5:1);
 const box=(x,y,z,scale,color,mesh=g.roundBox)=>drawGpuSphere(g,local(x,y,z),scale,color,-yaw+Math.PI/2,0,mesh,color===coat?3:1);
 const limb=(a,b,r,color)=>drawGpuLimb(g,local(...a),local(...b),r,color,enemy&&(color===coat||color===pants)?3:1);
 const hip=enemy?.55:.37,shoulder=enemy?.81:.64,head=enemy?.91:.77;
 drawGpuSphere(g,[entity.x,.003,entity.y],[enemy?.14:.18,.002,.115],[.045,.06,.051]);
 for(const sign of [-1,1]){
  const swing=stride*sign*(entity.running?.14:.09),kneeY=hip*.55+Math.max(0,swing)*.24,footY=.04+Math.max(0,swing)*.33;
  limb([sign*.06,hip,0],[sign*.07,kneeY,swing],enemy?.029:.042,pants);limb([sign*.07,kneeY,swing],[sign*.075,footY,-swing],enemy?.026:.038,pants);
  sphere(sign*.075,footY,-swing+.025,[.040,.026,.064],boots);
  sphere(sign*.07,kneeY,swing,[enemy?.027:.038,.025,enemy?.028:.039],pants);
  const armX=enemy?.142:.135,elbow=enemy?.60:.48,hand=enemy?.35:.36;
  sphere(sign*(armX+.025),elbow,-swing*.9,[enemy?.027:.039,.027,enemy?.027:.04],coat);
  limb([sign*armX,shoulder,0],[sign*(armX+.025),elbow,-swing*.9],enemy?.032:.045,coat);limb([sign*(armX+.025),elbow,-swing*.9],[sign*(armX+.04),hand,swing],enemy?.024:.034,coat);
  sphere(sign*(armX+.04),hand,swing,[enemy?.019:.028,enemy?.045:.039,.024],skin);
  for(let finger=0;finger<(enemy?4:3);finger++){const x=sign*(armX+.032)+finger*.007*sign,length=enemy?.065+finger*.008:.027;limb([x,hand-.02,swing+.004],[x+sign*.008,hand-.02-length,swing+.014],enemy?.003:.0045,skin)}
 }
 box(0,(hip+shoulder)/2,0,[enemy?.105:profile.gender==='female'?.12:.14,(shoulder-hip)*.6,.083],coat,enemy?g.slenderSuit:profile.gender==='female'?g.coatFemale:g.coatMale);
 if(enemy)drawGpuSphere(g,local(0,head,0),[.062,.091,.064],skin,-yaw+Math.PI/2,0,g.slenderHead,2);else sphere(0,head,0,[.079,.094,.071],skin);
 sphere(0,shoulder+(enemy?.004:.025),0,enemy?[.026,.036,.028]:[.038,.047,.035],skin);
 if(enemy){
  for(const sign of [-1,1])sphere(sign*.119,shoulder-.021,0,[.043,.045,.069],coat);
  for(const sign of [-1,1]){box(sign*.020,shoulder-.010,.077,[.018,.021,.012],[.80,.82,.81],g.shirt);limb([sign*.077,shoulder-.014,.063],[sign*.027,shoulder-.14,.09],.006,[.19,.22,.27])}
  for(const y of [hip+.055,hip+.115,hip+.18])sphere(.015,y,.087,[.0035,.0035,.0045],[.31,.36,.38]);
  // White shirt and layered satin lapels sit above the wool jacket.
  box(0,shoulder-.095,.003,[.082,.10,.085],[.79,.81,.80],g.shirt);
  box(0,(hip+shoulder)/2,.005,[.105,(shoulder-hip)*.6,.085],[.052,.059,.065],g.lapels);
  sphere(0,shoulder-.024,.095,[.011,.015,.007],[.012,.015,.017]);
  for(const sign of [-1,1]){box(sign*.069,hip+.092,.087,[.029,.0025,.004],[.057,.064,.067]);limb([sign*.08,hip+.045,.077],[sign*.077,shoulder-.08,.082],.0012,[.085,.09,.095]);}
  sphere(0,head-.059,.026,[.037,.024,.038],skin);
  limb([0,shoulder-.023,.084],[0,hip+.035,.09],.009,[.007,.009,.013]);
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
function drawGpuPictures(g,p){ensureWallPictures();const gl=g.gl,u=g.uniforms;for(const picture of world.wallPictures){if(distance(picture,p)>8)continue;const pose=picturePose(picture),ct=Math.cos(pose.tilt),st=Math.sin(pose.tilt),cr=Math.cos(pose.roll),sr=Math.sin(pose.roll),right=[picture.ny,0,-picture.nx],up=[-picture.nx*st,ct,-picture.ny*st],front=[picture.nx*ct,st,picture.ny*ct],R=right.map((v,i)=>v*cr+up[i]*sr),U=up.map((v,i)=>v*cr-right[i]*sr),mesh=g.pictureMeshes[[2,6,7,8,9,10].indexOf(picture.kind)];if(!mesh)continue;gl.uniformMatrix4fv(u.model,false,new Float32Array([...R,0,...U,0,...front,0,pose.x,pose.height,pose.z,1]));gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([...R,...U,...front]));gl.uniform1f(u.solid,0);gl.uniform1f(u.emission,0);gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}}
function drawGpuSpider(g,spider){
 const angle=spider.angle||0,phase=spider.phase||0,c=Math.cos(angle),s=Math.sin(angle),local=(x,y,z)=>[spider.x+c*z-s*x,y,spider.y+s*z+c*x],color=[.075,.056,.041];
 drawGpuSphere(g,local(0,.019,-.012),[.019,.013,.027],color,-angle+Math.PI/2);drawGpuSphere(g,local(0,.018,.020),[.014,.010,.015],color);
 for(const side of [-1,1])for(let i=0;i<4;i++){const gait=Math.sin(phase+i*Math.PI*.7+side)*.006,root=local(side*.01,.02,(i-1.5)*.011),knee=local(side*(.036+gait),.028,(i-1.5)*.023),foot=local(side*(.056+gait),.003,(i-1.5)*.035);drawGpuLimb(g,root,knee,.0025,color);drawGpuLimb(g,knee,foot,.002,color);}
}
function drawGpuFlashlight(g,p){
 const yaw=p.angle||0,f=[Math.cos(yaw),Math.sin(yaw)],r=[-f[1],f[0]],bob=mode==='playing'?Math.sin((world.player.gaitPhase||0)*2)*(world.player.motion||0)*.004:0;
 const local=(x,y,z)=>[p.x+r[0]*x+f[0]*z,p.height+y+bob,p.y+r[1]*x+f[1]*z],skin=gpuColor(profile.skin),sleeve=gpuColor(profile.color),metal=[.09,.105,.11],baseGlow=difficulty==='psycho'?(flashlightOn?.08:0):.22;
 const sphere=(x,y,z,scale,color,glow=baseGlow)=>drawGpuSphere(g,local(x,y,z),scale,color,-yaw+Math.PI/2,glow);
 const limb=(a,b,radius,color)=>drawGpuLimb(g,local(...a),local(...b),radius,color,3);
 g.gl.clear(g.gl.DEPTH_BUFFER_BIT);
 limb([.13,-.28,.11],[.125,-.16,.23],.038,sleeve);sphere(.125,-.165,.235,[.039,.048,.036],skin);
 limb([.125,-.18,.24],[.125,-.105,.31],.022,metal);
 for(let i=0;i<8;i++)sphere(.125,-.172+i*.007,.245+i*.0065,[.024,.003,.022],[.16,.18,.185]);
 sphere(.125,-.096,.322,[.032,.019,.030],[.19,.21,.22]);sphere(.125,-.084,.331,[.026,.008,.025],[.72,.80,.81],flashlightOn?.75:baseGlow);
 for(let i=0;i<4;i++)sphere(.10,-.181+i*.012,.258,[.009,.007,.023],skin);
 sphere(.15,-.144,.267,[.011,.025,.012],skin);
}
function renderGpuShadow(g,p,horizon){
 const gl=g.gl,right=[-Math.sin(p.angle||0),Math.cos(p.angle||0)],lightPose={...p,x:p.x+right[0]*.10,y:p.y+right[1]*.10,height:p.height-.035},light=gpuCamera(lightPose,horizon);
 gl.bindFramebuffer(gl.FRAMEBUFFER,g.shadowFramebuffer);gl.viewport(0,0,g.shadowSize,g.shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);
 if(flashlightOn){gl.useProgram(g.depthProgram);const saved=g.uniforms;g.uniforms=g.depthUniforms;try{gl.uniformMatrix4fv(g.uniforms.vp,false,light.vp);gl.uniformMatrix4fv(g.uniforms.model,false,gpuIdentity());gl.bindVertexArray(g.scene.vao);gl.drawArrays(gl.TRIANGLES,0,g.scene.count);if(difficulty==='psycho'){gl.bindVertexArray(g.damage.vao);gl.drawArrays(gl.TRIANGLES,0,g.damage.count);}drawGpuPictures(g,p);drawGpuCharacter(g,world.enemy,true,p);if(cameraMode==='third'&&!world.player.hidingId)drawGpuCharacter(g,world.player,false,p);}finally{g.uniforms=saved;}}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);return light;
}
function renderGpuScene(p,horizon){
 const g=initGpu();if(!g)return false;
 const gl=g.gl,u=g.uniforms;
 try{
  if(g.grid!==world.grid||g.furniture!==world.furniture||g.seed!==world.decorSeed)buildGpuScene(g);
  const shadowSize=deviceMode==='phone'?512:1024;if(g.shadowSize!==shadowSize){g.shadowSize=shadowSize;gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,g.shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);}
  const light=renderGpuShadow(g,p,horizon);
  const width=deviceMode==='phone'?800:Math.min(1800,Math.max(1000,Math.round(canvas.clientWidth||1000)));if(g.surface.width!==width){g.surface.width=width;g.surface.height=width*.7}gl.viewport(0,0,g.surface.width,g.surface.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(g.program);
  gl.uniform1f(u.normalLight,normalLightLevel(world.time||0));gl.uniformMatrix4fv(u.lightVP,false,light.vp);gl.uniform3fv(u.lightEye,light.eye);gl.uniform2f(u.shadowTexel,1/g.shadowSize,1/g.shadowSize);gl.uniform1i(u.shadowMap,1);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,g.shadowTexture);
  const camera=gpuCamera(p,horizon);gl.uniformMatrix4fv(u.vp,false,camera.vp);gl.uniformMatrix4fv(u.model,false,gpuIdentity());gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([1,0,0,0,1,0,0,0,1]));gl.uniform3fv(u.eye,camera.eye);gl.uniform3fv(u.forward,camera.forward);gl.uniform1f(u.psycho,difficulty==='psycho'?1:0);gl.uniform1f(u.flashlight,flashlightOn?1:0);gl.uniform1f(u.solid,0);gl.uniform1f(u.emission,0);gl.uniform1i(u.materials,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,g.textures[difficulty==='psycho'?1:0]);gl.bindVertexArray(g.scene.vao);gl.drawArrays(gl.TRIANGLES,0,g.scene.count);
  if(difficulty==='psycho'){gl.bindVertexArray(g.damage.vao);gl.drawArrays(gl.TRIANGLES,0,g.damage.count);}drawGpuPictures(g,p);
  drawGpuCharacter(g,world.enemy,true,p);if(cameraMode==='third'&&!world.player.hidingId&&p.distance>.42)drawGpuCharacter(g,world.player,false,p);
  if(typeof coopTeammates==='function')for(const teammate of coopTeammates())drawGpuCharacter(g,teammate,false,p);
  if(world.coopFloor!==undefined){
   const s=world.stairs;for(let step=0;step<6;step++)drawGpuSphere(g,[s.x-.30+step*.12,.025+step*.035,s.y],[.07,.025+step*.035,.28],[.24,.19,.14],0,0,g.roundBox);for(const side of [-1,1])drawGpuLimb(g,[s.x-.36,.25,s.y+side*.32],[s.x+.36,.66,s.y+side*.32],.015,[.32,.27,.19]);drawGpuSphere(g,[s.x,.44,s.y],[.06,.02,.06],[.19,.59,.67],0,.9,g.gem);
   if(!coop.clues[world.coopFloor])drawGpuSphere(g,[world.clue.x,.25,world.clue.y],[.12,.01,.15],[.85,.76,.52],world.time*.2,.5,g.roundBox);
   const wardrobe=world.furniture.find(w=>w.id===world.keyWardrobe);if(wardrobe)drawGpuSphere(g,[wardrobe.x+wardrobe.nx*.36,.68,wardrobe.y+wardrobe.ny*.36],[.045,.025,.045],[.79,.58,.19],0,.25,g.roundBox);
  }
  for(const spider of world.spiders||[])if(distance(spider,p)<5&&(spider.x-p.x)*Math.cos(p.angle||0)+(spider.y-p.y)*Math.sin(p.angle||0)>0)drawGpuSpider(g,spider);
  for(const lamp of g.lamps||[])drawGpuSphere(g,[lamp.x,.954,lamp.y],[.066,.008,.028],difficulty==='psycho'?[.06,.06,.06]:[.90,.78,.55],0,difficulty==='psycho'?0:normalLightLevel(world.time||0)*1.5,g.roundBox);
  for(const item of world.furniture||[]){const b=furnitureBounds(item),nx=item.nx||0,nz=item.ny||0,depth=nx?(b.maxX-b.minX)/2:(b.maxY-b.minY)/2;for(const sign of [-1,1])drawGpuSphere(g,[item.x+nx*(depth+.025)-nz*sign*.035,item.height*.53,item.y+nz*(depth+.025)+nx*sign*.035],[nx?.019:.010,.029,nz?.019:.010],[.39,.29,.13],0,0,g.sphere,4);}
  for(const relic of world.relics)if(!relic.taken)drawGpuSphere(g,[relic.x,.52+Math.sin(world.time*3)*.018,relic.y],[.105,.16,.105],[.97,.72,.23],world.time*.7,.9,g.gem);
  if(cameraMode==='first'&&!world.player.hidingId)drawGpuFlashlight(g,p);
  gl.flush();VIEW.context.drawImage(g.surface,0,0,1000,700);return true;
 }catch(error){console.warn('3D render fallback:',error.message);gpuUnavailable=true;GPU=null;return false}
}
