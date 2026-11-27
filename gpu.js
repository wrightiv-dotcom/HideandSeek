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
  uniform sampler2DArray materials;uniform sampler2D shadowMap;uniform sampler2D grid;uniform int gridSize;uniform vec3 lampPos[8];uniform int lampCount;uniform float lampLevel;uniform float time;uniform mat4 lightVP;uniform vec2 shadowTexel;uniform vec3 lightEye;uniform vec3 eye;uniform vec3 forward;uniform vec3 tint;uniform float solid;uniform float psycho;uniform float flashlight;uniform float emission;uniform float normalLight;uniform float dread;uniform vec2 resolution;uniform float detail;uniform float sculpted;
  float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  // Maze walls stored one texel per cell let lamps respect walls and corners gather occlusion.
  bool wallAt(ivec2 c){if(c.x<0||c.y<0||c.x>=gridSize||c.y>=gridSize)return true;return texelFetch(grid,c,0).r>.5;}
  float cellDistance(vec2 q,ivec2 k){vec2 lo=vec2(k),d=max(max(lo-q,q-lo-1.0),vec2(0));return length(d);}
  float lineOfSight(vec2 a,vec2 b){
   vec2 d=b-a;ivec2 cell=ivec2(floor(a)),target=ivec2(floor(b)),stepDir=ivec2(sign(d));vec2 inv=1.0/max(abs(d),vec2(1e-5));
   vec2 tMax=vec2((d.x>0.0?float(cell.x)+1.0-a.x:a.x-float(cell.x))*inv.x,(d.y>0.0?float(cell.y)+1.0-a.y:a.y-float(cell.y))*inv.y);
   for(int i=0;i<14;i++){if(cell==target)return 1.0;if(tMax.x<tMax.y){tMax.x+=inv.x;cell.x+=stepDir.x;}else{tMax.y+=inv.y;cell.y+=stepDir.y;}if(wallAt(cell))return 0.0;}
   return 0.0;
  }
  float gridOcclusion(vec3 p,vec3 n){
   if(gridSize<=0)return 1.0;
   vec2 q=p.xz+n.xz*.02;ivec2 c=ivec2(floor(q));float occ=0.0;
   if(abs(n.y)>.5){for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ivec2 k=c+ivec2(x,y);if((x!=0||y!=0)&&wallAt(k))occ+=.27*exp(-cellDistance(q,k)*7.5);}}
   else{vec2 t=vec2(-n.z,n.x);for(int s=-1;s<=1;s+=2){ivec2 k=c+ivec2(round(t*float(s)));if(wallAt(k))occ+=.34*exp(-cellDistance(q,k)*7.5);}
    occ+=.30*exp(-max(p.y,0.0)*9.0)+(p.y<=1.001?.20*exp(-max(1.0-p.y,0.0)*11.0):0.0);}
   return clamp(1.0-occ,.42,1.0);
  }
  vec3 specular(vec3 n,vec3 v,vec3 l,float roughness,vec3 f0){
   vec3 h=normalize(l+v);float ndv=max(.001,dot(n,v)),ndl=max(0.0,dot(n,l)),ndh=max(0.0,dot(n,h)),vdh=max(0.0,dot(v,h));
   float a=roughness*roughness,a2=a*a,den=ndh*ndh*(a2-1.0)+1.0,D=a2/(3.14159265*den*den+.0001),k=(roughness+1.0)*(roughness+1.0)/8.0,G=ndv/(ndv*(1.0-k)+k)*ndl/(ndl*(1.0-k)+k+.0001);
   vec3 F=f0+(1.0-f0)*pow(1.0-vdh,5.0);return D*G*F/(4.0*ndv*max(.001,ndl))*ndl;
  }
  void main(){
   vec3 op=objectPosition*detail;
   vec3 albedo=solid>.5?tint:texture(materials,uv).rgb;
   vec3 geometric=normalize(worldNormal),n=geometric;
   bool faceless=solid>1.5&&solid<2.5,skin=faceless||(solid>4.5&&solid<5.5),tendril=solid>5.5,cloth=solid>2.5&&solid<3.5,metal=solid>3.5&&solid<4.5;
   if(skin){
    float mottling=noise(op*10.0)*.65+noise(op*35.0)*.35;
    albedo*=faceless?mix(.955,1.02,mottling):mix(.94,1.025,mottling);
    float vein=pow(1.0-abs(sin(op.x*38.0+sin(op.y*24.0)*2.0)),18.0);
    if(faceless&&sculpted<.5){
     float front=smoothstep(.12,.7,op.z);
     float sockets=exp(-pow((abs(op.x)-.36)*4.2,2.0)-pow((op.y-.10)*5.5,2.0))*front;
     float cheek=exp(-pow((abs(op.x)-.46)*3.6,2.0)-pow((op.y+.28)*4.0,2.0))*front;
     float brow=exp(-pow((op.y-.31)*8.0,2.0))*front*(1.0-abs(op.x));
     albedo=mix(albedo,albedo*vec3(.50,.52,.60),clamp(sockets*.34+cheek*.12,0.0,.4))*(1.0+brow*.05);
     albedo=mix(albedo,albedo*vec3(.78,.84,1.0),vein*.10*smoothstep(.2,.6,abs(op.x)));
    }else albedo*=1.0-vein*.045;
   }
   if(cloth){float weave=sin(op.x*460.0)*sin(op.y*610.0)*clamp(1.0-length(fwidth(op.xy))*280.0,0.0,1.0);albedo*=.94+weave*.035+noise(op*32.0)*.10;}
   albedo=pow(max(albedo,vec3(.0)),vec3(2.2));if(sculpted>.5)albedo*=uv.x;
   vec3 delta=eye-worldPosition;float dist=length(delta);vec3 v=delta/max(dist,.0001);
   vec3 toLight=lightEye-worldPosition;float lightDist2=dot(toLight,toLight);vec3 l=toLight*inversesqrt(max(lightDist2,.0001));
   if(solid<.5){
    float height=dot(albedo,vec3(.299,.587,.114));vec3 surfaceGradient=dFdx(height)*cross(dFdy(worldPosition),n)+dFdy(height)*cross(n,dFdx(worldPosition));float determinant=dot(dFdx(worldPosition),cross(dFdy(worldPosition),n));n=normalize(n-sign(determinant)*surfaceGradient*.06/(abs(determinant)+.0001));
   }
   float wet=solid<.5&&uv.z>13.5&&uv.z<14.5?smoothstep(.65,.85,noise(worldPosition*2.0))*.25:0.0;
   float roughness=faceless?.40:skin?.55:tendril?.32:cloth?.94:metal?.30:solid<.5?(uv.z>=15.0&&uv.z<21.0?.22:mix(.78,.30,wet)):.65;
   vec3 f0=metal?mix(vec3(.35),albedo,.6):vec3(.04);
   float occlusion=solid<.5?gridOcclusion(worldPosition,geometric):1.0;
   float contact=1.0-.30*exp(-max(worldPosition.y,0.0)*24.0)*(1.0-abs(n.y));
   // Flashlight: bright reflector hotspot, faint ring, wide soft spill and inverse-square falloff.
   vec3 beamDir=normalize(forward);float along=dot(-l,beamDir);
   float cookie=.90+.10*noise(vec3((-l-beamDir*along).xy*55.0,3.0));
   float beam=(smoothstep(.935,.993,along)+smoothstep(.976,.983,along)*(1.0-smoothstep(.986,.992,along))*.18+smoothstep(.78,.95,along)*.20)*cookie;
   float visibility=1.0;vec4 shadowClip=lightVP*vec4(worldPosition,1.0);vec3 shadowUV=shadowClip.xyz/shadowClip.w*.5+.5;
   if(flashlight>.5&&shadowClip.w>0.0&&all(greaterThan(shadowUV,vec3(0)))&&all(lessThan(shadowUV,vec3(1)))){visibility=0.0;float bias=.00008+.00016*(1.0-max(0.0,dot(n,l)));for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float depth=texture(shadowMap,shadowUV.xy+vec2(x,y)*shadowTexel).r;visibility+=shadowUV.z-bias<=depth?1.0/9.0:0.0;}}
   vec3 torch=vec3(1.0,.94,.84)*flashlight*beam*visibility*2.6/(lightDist2+.30);
   float ndl=skin?max(0.0,(dot(n,l)+.3)/1.3):max(0.0,dot(n,l));
   vec3 lit=albedo*torch*(ndl+.04)+specular(n,v,l,roughness,f0)*torch*.9;
   float sheen=pow(1.0-max(0.0,dot(n,v)),5.0);
   if(cloth)lit+=torch*vec3(.55,.58,.65)*sheen*max(0.0,dot(n,l))*.35;
   if(tendril)lit+=torch*vec3(.30,.32,.36)*sheen*.25;
   // Ceiling lamps: warm tungsten point lights, shaded downward, blocked by maze walls.
   vec2 probe=worldPosition.xz+geometric.xz*.03;
   for(int i=0;i<8;i++){
    if(i>=lampCount||lampLevel<=0.0)break;
    vec3 L=lampPos[i]-worldPosition;float d2=dot(L,L);if(d2>18.0)continue;
    vec3 ld=L*inversesqrt(d2);float lndl=skin?max(0.0,(dot(n,ld)+.3)/1.3):max(0.0,dot(n,ld));if(lndl<=0.0)continue;
    if(lineOfSight(probe,lampPos[i].xz)<.5)continue;
    float window=pow(clamp(1.0-pow(d2/18.0,2.0),0.0,1.0),2.0),shade=.16+.84*smoothstep(-.05,.65,ld.y);
    vec3 radiance=vec3(1.0,.71,.44)*lampLevel*1.05*shade*window/(d2+.12);
    lit+=albedo*radiance*lndl+specular(n,v,ld,roughness,f0)*radiance*.8;
    if(skin)lit+=albedo*vec3(.9,.35,.25)*radiance*pow(max(0.0,dot(-n,ld)),2.0)*.12;
   }
   float moon=max(0.0,dot(n,normalize(vec3(-.4,.8,-.6))));float rim=pow(1.0-max(0.0,dot(n,v)),3.0);
   float ambient=mix(.10*normalLight,.002,psycho);
   lit+=albedo*vec3(.80,.88,1.0)*ambient*(.55+.45*max(0.0,n.y*.5+.5))*occlusion*contact;
   lit+=albedo*vec3(.18,.29,.39)*(moon*.10+rim*.06)*occlusion*(1.0-psycho);
   lit+=f0*vec3(.035,.047,.062)*rim*(1.0-psycho);
   if(skin)lit+=albedo*vec3(.13,.09,.08)*torch*pow(max(0.0,dot(-n,l)),2.0)*.22;
   lit*=mix(1.0,occlusion,.55);
   lit+=albedo*emission;
   float fog=1.0-exp(-dist*dist*.0035);lit=mix(lit,vec3(.024,.030,.034)*mix(1.0,.025,psycho),fog);
   // Light scattered by dust inside the flashlight beam.
   lit+=vec3(1.0,.94,.84)*flashlight*smoothstep(.86,.995,dot(-v,beamDir))*(1.0-exp(-dist*.45))*.028;
   lit*=1.7;vec3 mapped=clamp((lit*(2.51*lit+.03))/(lit*(2.43*lit+.59)+.14),0.0,1.0);
   mapped=pow(mapped,vec3(1.0/2.2));
   mapped+=(hash(vec3(gl_FragCoord.xy,floor(time*24.0)))-.5)*.028*(1.0-mapped*.6);
   if(dread>.001){
    float frame=floor(time*30.0),tear=step(1.0-dread*.2,hash(vec3(floor(gl_FragCoord.y/14.0),frame,7.0)));
    float snow=hash(vec3(floor(gl_FragCoord.xy/vec2(2.0+tear*9.0,2.0)),frame));
    mapped=mix(mapped,vec3(dot(mapped,vec3(.3,.59,.11))),dread*.5);
    mapped=mix(mapped,vec3(snow)*vec3(.90,.94,1.0),clamp(dread*dread*.32+tear*dread*.38,0.0,.75));
    mapped*=1.0-dread*.16*step(.5,fract(gl_FragCoord.y*.25+time*9.0));
    mapped*=1.0-dread*.35*smoothstep(.25,1.0,length((gl_FragCoord.xy/resolution-.5)*vec2(resolution.x/resolution.y,1.0)));
   }
   color=vec4(mapped,1.0);
  }`;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const uniforms={};for(const name of ['vp','model','normalMatrix','materials','eye','forward','tint','solid','psycho','flashlight','emission','shadowMap','lightVP','shadowTexel','lightEye','normalLight','grid','gridSize','lampPos','lampCount','lampLevel','time','dread','resolution','detail','sculpted'])uniforms[name]=gl.getUniformLocation(program,name);
  const depthProgram=gl.createProgram();gl.attachShader(depthProgram,shader(gl.VERTEX_SHADER,'#version 300 es\nprecision highp float;layout(location=0) in vec3 position;uniform mat4 vp;uniform mat4 model;void main(){gl_Position=vp*model*vec4(position,1.0);}'));gl.attachShader(depthProgram,shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;void main(){}'));gl.linkProgram(depthProgram);if(!gl.getProgramParameter(depthProgram,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(depthProgram));
  const depthUniforms={vp:gl.getUniformLocation(depthProgram,'vp'),model:gl.getUniformLocation(depthProgram,'model'),normalMatrix:null,tint:null,solid:null,emission:null};
  const shadowSize=deviceMode==='phone'?512:1024,shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const shadowFramebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Shadow framebuffer incomplete');gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  const gridTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,gridTexture);for(const [key,value] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,key,value);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,1,1,0,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array([0]));
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
  const tube=[];addSurface(tube,(v,a)=>{const y=v*2-1,r=Math.sqrt(Math.max(0,1-Math.pow(Math.abs(y),8)));return [Math.cos(a)*r,y,Math.sin(a)*r]},10,12);
  const lowSphere=[];for(let y=0;y<8;y++)for(let x=0;x<12;x++){const a=y*Math.PI/8,b=x*Math.PI*2/12,A=(y+1)*Math.PI/8,B=(x+1)*Math.PI*2/12;for(const p of [point(a,b),point(A,b),point(A,B),point(a,b),point(A,B),point(a,B)])lowSphere.push(...p,...p,0,0,0)}
  const slenderSkull=[];addSurface(slenderSkull,(v,a)=>{const phi=(.998-v*.996)*Math.PI,bell=(u,c,w)=>Math.exp(-Math.pow((u-c)/w,2));let x=Math.sin(phi)*Math.cos(a),y=Math.cos(phi),z=Math.sin(phi)*Math.sin(a);
   const face=Math.max(0,z),ax=Math.abs(x);if(y<0){x*=1-.38*Math.pow(-y,1.25);z*=1-.14*(-y)}z-=.10*face*face*z;
   z+=face*(-.14*bell(ax,.33,.16)*bell(y,.12,.14)+.05*bell(y,.31,.075)*(1-.6*ax)+.05*bell(x,0,.075)*bell(y,-.05,.21)-.018*bell(x,0,.25)*bell(y,-.43,.08)+.04*bell(y,-.84,.12)*bell(x,0,.3));
   x+=Math.sign(x)*(.05*bell(ax,.55,.15)*bell(y,-.08,.13)*face-.045*bell(y,.24,.16)*bell(z,.25,.3)*Math.max(0,ax-.5));return [x,y,z]},48,64);
  const jacketSkirt=[];{const rows=6,cols=30,gap=.38,start=Math.PI/2+gap,span=Math.PI*2-gap*2,P=(j,k)=>{const v=j/rows,a=start+k/cols*span,r=1+.22*v,n=[Math.cos(a),.11,Math.sin(a)*.8],l=Math.hypot(...n);return [[Math.cos(a)*r,1-2*v,Math.sin(a)*r*.8],n.map(x=>x/l)]};for(let j=0;j<rows;j++)for(let k=0;k<cols;k++)for(const [J,K] of [[j,k],[j+1,k],[j+1,k+1],[j,k],[j+1,k+1],[j,k+1]]){const [p,n]=P(J,K);jacketSkirt.push(...p,...n,0,0,0)}}
  const roundBox=[];
  const rounded=p=>{const core=p.map(v=>Math.max(-.78,Math.min(.78,v))),offset=p.map((v,i)=>v-core[i]),length=Math.hypot(...offset),n=offset.map(v=>v/length);return {p:core.map((v,i)=>v+n[i]*.22),n}};
  for(let face=0;face<6;face++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){
   const point=(u,v)=>{const a=-1+u/4,b=-1+v/4;return rounded(face===0?[1,a,b]:face===1?[-1,a,b]:face===2?[a,1,b]:face===3?[a,-1,b]:face===4?[a,b,1]:[a,b,-1])};
   for(const p of [point(x,y),point(x+1,y),point(x+1,y+1),point(x,y),point(x+1,y+1),point(x,y+1)])roundBox.push(...p.p,...p.n,0,0,0);
  }
  const pictureMeshes=[2,6,7,8,9,10].map((kind,index)=>{const data=[],quad=(points,n,layer,crop=false)=>{for(const i of [0,1,2,0,2,3]){const uv=[[0,1],[1,1],[1,0],[0,0]][i];data.push(...points[i],...n,crop?(126+uv[0]*260)/512:uv[0],crop?(63+uv[1]*310)/512:uv[1],layer);}};quad([[-.256,-.305,.016],[.256,-.305,.016],[.256,.305,.016],[-.256,.305,.016]],[0,0,1],15+index,true);quad([[.256,-.305,-.016],[-.256,-.305,-.016],[-.256,.305,-.016],[.256,.305,-.016]],[0,0,-1],13);for(const sign of [-1,1]){quad([[sign*.256,-.305,-.016],[sign*.256,-.305,.016],[sign*.256,.305,.016],[sign*.256,.305,-.016]],[sign,0,0],13);quad([[-.256,sign*.305,-.016],[.256,sign*.305,-.016],[.256,sign*.305,.016],[-.256,sign*.305,.016]],[0,sign,0],13);}return geometry(data);});
  const survivorCoat=[],hairCap=[],keyRing=[];
  addSurface(survivorCoat,(v,a)=>{const y=v*2-1,width=.84+.13*Math.exp(-Math.pow((y-.60)*3,2))-.10*Math.exp(-Math.pow((y+.05)*3,2));return [Math.cos(a)*width,y,Math.sin(a)*(.76+.05*Math.cos(y*2))];},28,48);
  addSurface(hairCap,(v,a)=>{const phi=v*Math.acos(.24);return [Math.sin(phi)*Math.cos(a),Math.cos(phi),Math.sin(phi)*Math.sin(a)];},20,48);
  addSurface(keyRing,(v,a)=>{const b=v*Math.PI*2,r=.72+.20*Math.cos(b);return [Math.cos(a)*r,.20*Math.sin(b),Math.sin(a)*r];},16,32);
  const coatMesh=amount=>{const data=roundBox.slice();for(let i=0;i<data.length;i+=9){const y=data[i+1],factor=1-amount+amount*Math.abs(y),x=data[i];data[i]*=factor;data[i+4]-=data[i+3]*x*amount*Math.sign(y)/factor;data[i+3]/=factor}return geometry(data)};
  const gem=[],ring=[[1,0,0],[0,0,1],[-1,0,0],[0,0,-1]];
  for(const sign of [-1,1])for(let i=0;i<4;i++){const a=[0,sign,0],b=ring[i],c=ring[(i+1)%4],d=b.map((v,j)=>v-a[j]),e=c.map((v,j)=>v-a[j]),n=[d[1]*e[2]-d[2]*e[1],d[2]*e[0]-d[0]*e[2],d[0]*e[1]-d[1]*e[0]],length=Math.hypot(...n);for(const p of [a,b,c])gem.push(...p,...n.map(v=>v/length),0,0,0)}
  GPU={gl,program,uniforms,pictureMeshes,gridTexture,gridSize:0,depthProgram,depthUniforms,shadowTexture,shadowFramebuffer,shadowSize,surface,textures,geometry,sphere:geometry(sphere),survivorCoat:geometry(survivorCoat),survivorHead:geometry(skull),hairCap:geometry(hairCap),keyRing:geometry(keyRing),slenderHead:geometry(slenderSkull),jacketSkirt:geometry(jacketSkirt),slenderSuit:geometry(tailored),sleeve:geometry(sleeve),tube:geometry(tube),lowSphere:geometry(lowSphere),lapels:geometry(lapel),shirt:geometry(shirt),roundBox:geometry(roundBox),coatMale:coatMesh(.15),coatFemale:coatMesh(.23),gem:geometry(gem),scene:null,grid:null,furniture:null};
  requestCharacterModels();surface.addEventListener('webglcontextlost',event=>{event.preventDefault();GPU=null;gpuUnavailable=true});surface.addEventListener('webglcontextrestored',()=>{GPU=null;gpuUnavailable=false});gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);return GPU;
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
  const layer=Math.abs(x*17+y*31+(world.decorSeed||0))%11,tall=world.stairwell&&(x>=world.stairwell.originalSize||y>=world.stairwell.originalSize),base=tall&&world.coopFloor===1?-1.2:0,height=tall?2.4:1;box(x+.5,base+height/2,y+.5,1,height,1,[layer,layer,(layer+7)%11,(layer+7)%11,0]);
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
 for(let y=1;y<world.size-1;y++)for(let x=1;x<world.size-1;x++)if(world.grid[y][x]===0&&(!world.stairwell||x<world.stairwell.originalSize)&&((x*37+y*61+(world.decorSeed||0))%11===0)){
  const seed=Math.abs(x*117+y*83+(world.decorSeed||0));
  for(let k=0;k<2;k++){const angle=(seed%23)*.17+k*.48,dx=Math.cos(angle),dz=Math.sin(angle),length=.30+((seed+k*13)%29)*.009,width=.055+((seed+k)%5)*.009,X=x+.35+k*.25,Z=y+.40+k*.12,lift=.008+(seed%5)*.003;
   const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([along,across])=>[X+dx*along*length/2-dz*across*width/2,.008+(along+1)*lift/2,Z+dz*along*length/2+dx*across*width/2]);
   const normal=[-dx*lift/length,1,-dz*lift/length],n=Math.hypot(...normal);for(const index of [0,1,2,0,2,3]){const along=index===0||index===3?0:1,across=index<2?0:1;vertices.push(...points[index],...normal.map(v=>v/n),((seed%6)+.15+across*.7)/6,along,14);}
   for(let i=0;i<4;i++){const p=points[i],q=points[(i+1)%4],nx=q[2]-p[2],nz=p[0]-q[0],d=Math.hypot(nx,nz);face([p,q,[q[0],.002,q[2]],[p[0],.002,p[2]]],[nx/d,0,nz/d],14);}
   g.floorDebrisCount++;
  }
 }
 const mazeSize=world.stairwell?.originalSize||world.size;
 face([[0,0,0],[mazeSize,0,0],[mazeSize,0,mazeSize],[0,0,mazeSize]],[0,1,0],14,mazeSize);
 face([[0,1,mazeSize],[mazeSize,1,mazeSize],[mazeSize,1,0],[0,1,0]],[0,-1,0],1,mazeSize);
 if(world.stairwell){const s=world.stairwell,base=world.coopFloor===1?-s.rise:0,wood=[13,13,13,13,14];
  face([[s.minX,base,1],[s.maxX,base,1],[s.maxX,base,9],[s.minX,base,9]],[0,1,0],14,8);
  face([[s.minX,base+2.4,9],[s.maxX,base+2.4,9],[s.maxX,base+2.4,1],[s.minX,base+2.4,1]],[0,-1,0],13,8);
  const row=world.coopFloor===0?1:7;face([[mazeSize,1,row+1],[s.minX,1,row+1],[s.minX,1,row],[mazeSize,1,row]],[0,-1,0],13,1);face([[mazeSize,0,row],[s.minX,0,row],[s.minX,0,row+1],[mazeSize,0,row+1]],[0,1,0],14,1);
  for(let step=0;step<20;step++){const height=(step+1)*s.rise/20,z=s.start+(step+.5)*(s.end-s.start)/20;box(s.x,base+height/2,z,s.maxX-s.minX-.08,height,(s.end-s.start)/20,wood);}
  box(s.x,base+s.rise-.04,8,s.maxX-s.minX,.08,2,wood);
  for(const side of [-1,1])for(let post=0;post<=5;post++){const z=s.start+post,ground=base+(z-s.start)/(s.end-s.start)*s.rise;box(s.x+side*1.3,ground+.28,z,.035,.56,.035,[13,13,13,13,13]);}
 }
 for(let y=1;y<mazeSize-1;y++)for(let x=1;x<mazeSize-1;x++)if(world.grid[y][x]===0&&(x*13+y*17)%11===0){g.lamps.push({x:x+.5,y:y+.5});box(x+.5,.978,y+.5,.17,.035,.10,[13,13,13,13,13]);}
 for(let x=2;x<mazeSize;x+=3)box(x,.995,mazeSize/2,.045,.03,mazeSize,[13,13,13,13,13]);
 for(const item of world.furniture||[]){const b=furnitureBounds(item),front=item.type==='wardrobe'?11:12,layers=[13,13,13,13,13];layers[item.nx===1?0:item.nx===-1?1:item.ny===1?2:3]=front;box(item.x,item.height/2,item.y,b.maxX-b.minX,item.height,b.maxY-b.minY,layers);
  const nx=item.nx||0,nz=item.ny||0,tx=-nz,tz=nx,depth=nx?(b.maxX-b.minX)/2:(b.maxY-b.minY)/2,width=nx?b.maxY-b.minY:b.maxX-b.minX,frontX=item.x+nx*(depth+.008),frontZ=item.y+nz*(depth+.008),wood=[13,13,13,13,13];
  const trim=(offset,height,w,h)=>box(frontX+tx*offset,height,frontZ+tz*offset,nx?.025:w,h,nz?.025:w,wood);
  trim(0,item.height-.018,width+.03,.035);trim(0,.035,width+.02,.055);for(const sign of [-1,1]){trim(sign*(width/2-.017),item.height/2,.026,item.height-.04);for(const Y of [.30,.67])if(Y<item.height-.05){trim(sign*width*.235,Y,width*.39,.015);}}
  for(const sign of [-1,1])for(const h of [.20,.62])if(h<item.height)trim(sign*(width/2-.045),h,.015,.043);
 }

 const cells=new Uint8Array(world.size*world.size);for(let y=0;y<world.size;y++)for(let x=0;x<world.size;x++)cells[y*world.size+x]=world.grid[y][x]?255:0;
 g.gl.activeTexture(g.gl.TEXTURE2);g.gl.bindTexture(g.gl.TEXTURE_2D,g.gridTexture);g.gl.pixelStorei(g.gl.UNPACK_ALIGNMENT,1);g.gl.texImage2D(g.gl.TEXTURE_2D,0,g.gl.R8,world.size,world.size,0,g.gl.RED,g.gl.UNSIGNED_BYTE,cells);g.gl.activeTexture(g.gl.TEXTURE0);g.gridSize=world.size;
 if(g.scene){g.gl.deleteVertexArray(g.scene.vao);g.gl.deleteBuffer(g.scene.buffer)}g.scene=g.geometry(vertices);g.grid=world.grid;g.furniture=world.furniture;g.seed=world.decorSeed;
}
function gpuColor(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
function drawGpuSphere(g,center,scale,color,yaw=0,emission=0,mesh=g.sphere,material=1){
 gpuSurface(g,1,0);
 const gl=g.gl,u=g.uniforms,c=Math.cos(yaw),s=Math.sin(yaw),model=new Float32Array([c*scale[0],0,-s*scale[0],0,0,scale[1],0,0,s*scale[2],0,c*scale[2],0,...center,1]);
 gl.uniformMatrix4fv(u.model,false,model);gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([c/scale[0],0,-s/scale[0],0,1/scale[1],0,s/scale[2],0,c/scale[2]]));gpuSurface(g,mesh.detail||1,mesh.indexed?1:0);gl.uniform3fv(u.tint,color);gl.uniform1f(u.solid,material);gl.uniform1f(u.emission,emission);gl.bindVertexArray(mesh.vao);if(mesh.indexed)gl.drawElements(gl.TRIANGLES,mesh.count,mesh.indexType,0);else gl.drawArrays(gl.TRIANGLES,0,mesh.count);
}
function drawGpuLimb(g,a,b,r,color,material=1,meshOverride=null){
 gpuSurface(g,1,0);
 const delta=b.map((v,i)=>v-a[i]),length=Math.hypot(...delta),up=delta.map(v=>v/length),helper=Math.abs(up[1])>.95?[1,0,0]:[0,1,0];
 let right=[up[1]*helper[2]-up[2]*helper[1],up[2]*helper[0]-up[0]*helper[2],up[0]*helper[1]-up[1]*helper[0]],size=Math.hypot(...right);right=right.map(v=>v/size);const back=[right[1]*up[2]-right[2]*up[1],right[2]*up[0]-right[0]*up[2],right[0]*up[1]-right[1]*up[0]];
 const model=new Float32Array([...right.map(v=>v*r),0,...up.map(v=>v*length*.6),0,...back.map(v=>v*r),0,...a.map((v,i)=>(v+b[i])/2),1]),gl=g.gl,u=g.uniforms;
 gl.uniformMatrix4fv(u.model,false,model);gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([...right.map(v=>v/r),...up.map(v=>v/(length*.6)),...back.map(v=>v/r)]));gl.uniform3fv(u.tint,color);gl.uniform1f(u.solid,material);gl.uniform1f(u.emission,0);const mesh=meshOverride||(material===3?g.sleeve:g.sphere);gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
}
// Sculpted character models (assets/models/characters.glb, built by scripts/build-character-models.cjs).
// They load in the background; until then, or if they cannot load, the built-in shapes are drawn.
let characterModelData=null,characterModelRequest=null;
function requestCharacterModels(){
 if(characterModelRequest||typeof fetch!=='function'||typeof location==='undefined'||location.protocol==='file:')return;
 characterModelRequest=fetch('assets/models/characters.glb').then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.arrayBuffer()}).then(buffer=>{characterModelData=parseCharacterModels(buffer)}).catch(error=>console.warn('Sculpted character models not loaded; using built-in shapes.',error.message));
}
function parseCharacterModels(buffer){
 const view=new DataView(buffer);if(view.getUint32(0,true)!==0x46546C67)throw Error('not a glTF binary');
 const jsonLength=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength))),binStart=20+jsonLength+8;
 const read=index=>{const a=json.accessors[index],v=json.bufferViews[a.bufferView],Type={5126:Float32Array,5121:Uint8Array,5123:Uint16Array,5125:Uint32Array}[a.componentType];return new Type(buffer,binStart+(v.byteOffset||0)+(a.byteOffset||0),{SCALAR:1,VEC3:3,VEC4:4}[a.type]*a.count)};
 const models={};
 for(const mesh of json.meshes){
  const prim=mesh.primitives[0],P=read(prim.attributes.POSITION),N=read(prim.attributes.NORMAL),C=read(prim.attributes.COLOR_0),bounds=json.accessors[prim.attributes.POSITION],count=P.length/3,data=new Float32Array(count*9);
  for(let i=0;i<count;i++){const o=i*9;data[o]=P[i*3];data[o+1]=P[i*3+1];data[o+2]=P[i*3+2];data[o+3]=N[i*3];data[o+4]=N[i*3+1];data[o+5]=N[i*3+2];data[o+6]=C[i*4]/255}
  const extent=Math.max(...bounds.max.map((v,k)=>Math.max(Math.abs(v),Math.abs(bounds.min[k]))));
  models[mesh.name]={data,indices:read(prim.indices),detail:1/Math.max(extent,.001)};
 }
 return models;
}
function gpuCharacterModels(g){
 if(g.models)return g.models;if(!characterModelData){requestCharacterModels();return null}
 const gl=g.gl,models={};
 for(const [name,m] of Object.entries(characterModelData)){
  const vao=gl.createVertexArray(),buffer=gl.createBuffer(),index=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,m.data,gl.STATIC_DRAW);
  for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12)}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,m.indices,gl.STATIC_DRAW);gl.bindVertexArray(null);
  models[name]={vao,count:m.indices.length,indexed:true,indexType:m.indices instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,detail:m.detail};
 }
 return g.models=models;
}
function gpuSurface(g,detail,sculpted){const u=g.uniforms;g.gl.uniform1f(u.detail,detail);g.gl.uniform1f(u.sculpted,sculpted)}
// Places a limb part authored hanging down -Y from its joint, stretched to reach the next joint.
function gpuBone(g,mesh,A,B,length,color,material,S,F,emission=0){
 if(!mesh)return;const {add,norm}=slenderVec,d=[A[0]-B[0],A[1]-B[1],A[2]-B[2]],l=Math.hypot(...d)||1,Y=[d[0]/l,d[1]/l,d[2]/l],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const Z=norm(add(F,Y,-dot(F,Y))),X=norm(add(add(S,Y,-dot(S,Y)),Z,-dot(S,Z)));drawGpuOriented(g,A,X,Y,Z,[1,l/length,1],color,mesh,material,emission);
}
// Hand parts are authored with fingers along -Y, palm facing +X (toward the body) and thumb toward +Z.
function gpuHand(g,mesh,wrist,elbow,sign,color,material,S,F,emission=0){
 if(!mesh)return;const {add,scale,norm}=slenderVec,dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],fd=norm(add(wrist,elbow,-1)),inward=scale(S,-sign),X=norm(add(inward,fd,-dot(inward,fd))),Z=norm(add(add(F,fd,-dot(F,fd)),X,-dot(F,X)));
 drawGpuOriented(g,wrist,X,scale(fd,-1),Z,[1,1,1],color,mesh,material,emission);
}
function drawGpuSurvivorModel(g,entity,M){
 const look=entity.profile||getSurvivorProfile(),female=look.gender==='female',tag=female?'f':'m',yaw=entity.angle||0,phase=entity.gaitPhase||0,stride=Math.sin(phase)*(entity.motion||0);
 const F=[Math.cos(yaw),0,Math.sin(yaw)],S=[-Math.sin(yaw),0,Math.cos(yaw)],U=[0,1,0],bob=Math.abs(stride)*.006+Math.sin((world?.time||0)*1.7)*.001,base=entity.elevation||0;
 const W=(x,y,z)=>[entity.x+S[0]*x+F[0]*z,base+y+bob,entity.y+S[2]*x+F[2]*z];
 const skin=gpuColor(look.skin),coat=gpuColor(look.color).map(v=>v*.56+.035),pants=[.075,.10,.115],boots=[.045,.04,.033],hair=[.075,.042,.024],lip=skin.map((v,i)=>v*(i===0?.80:.60));
 const put=(mesh,at,color,material,sx=1)=>mesh&&drawGpuOriented(g,at,S,U,F,[sx,1,1],color,mesh,material);
 const narrow=female?.95:1;
 for(const sign of [-1,1]){
  const swing=stride*sign*(entity.running?.12:.075),kneeY=.245+Math.max(0,swing)*.20,footY=.035+Math.max(0,swing)*.26;
  const hip=W(sign*.051,.45,0),knee=W(sign*.052,kneeY,swing),ankle=W(sign*.052,footY+.004,-swing+.004);
  gpuBone(g,M.survivor_thigh,hip,knee,.205,pants,3,S,F);gpuBone(g,M.survivor_shin,knee,ankle,.21,pants,3,S,F);put(M.survivor_boot,ankle,boots,1);
  const armSwing=-swing*.65,shoulder=W(sign*.128*narrow,.711,0),elbow=W(sign*.142*narrow,.58,armSwing),wrist=W(sign*.145*narrow,.445,armSwing*.6);
  gpuBone(g,M.survivor_upper_arm,shoulder,elbow,.135,coat,3,S,F);gpuBone(g,M.survivor_forearm,elbow,wrist,.137,coat,3,S,F);gpuHand(g,M.survivor_hand,wrist,elbow,sign,skin,5,S,F);
 }
 const hips=W(0,.445,0);put(M.survivor_pelvis,hips,pants,3,female?.94:1);
 put(M[`survivor_torso_${look.outfit==='padded'?'padded':'field'}_${tag}`],hips,coat,3);
 if(look.outfit!=='padded')put(M[`survivor_zip_${tag}`],hips,[.29,.29,.26],4);
 if(look.outfit==='tactical')put(M[`survivor_vest_${tag}`],hips,[.095,.12,.105],3);
 put(M.survivor_backpack,hips,[.11,.14,.12],3);
 const head=W(0,.843,0);put(M[`survivor_head_${tag}`],head,skin,5);put(M.survivor_eyes,head,[.74,.73,.69],1);put(M.survivor_irises,head,[.10,.13,.11],1);put(M[`survivor_brows_${tag}`],head,hair,1);put(M[`survivor_lips_${tag}`],head,lip,5);
 if(look.hair==='hood')put(M.survivor_hood,head,coat,3);else put(look.hair==='long'?M.survivor_hair_long:female?M.survivor_hair_bob:M.survivor_hair_short,head,hair,1);
}
function drawGpuCharacter(g,entity,enemy,p){return enemy?drawGpuSlender(g,entity,p):drawGpuSurvivor(g,entity)}
function drawGpuOriented(g,center,X,Y,Z,scale,color,mesh,material=1,emission=0){
 const gl=g.gl,u=g.uniforms,[a,b,c]=scale;
 gl.uniformMatrix4fv(u.model,false,new Float32Array([X[0]*a,X[1]*a,X[2]*a,0,Y[0]*b,Y[1]*b,Y[2]*b,0,Z[0]*c,Z[1]*c,Z[2]*c,0,center[0],center[1],center[2],1]));
 gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([X[0]/a,X[1]/a,X[2]/a,Y[0]/b,Y[1]/b,Y[2]/b,Z[0]/c,Z[1]/c,Z[2]/c]));
 gpuSurface(g,mesh.detail||1,mesh.indexed?1:0);gl.uniform3fv(u.tint,color);gl.uniform1f(u.solid,material);gl.uniform1f(u.emission,emission);gl.bindVertexArray(mesh.vao);if(mesh.indexed)gl.drawElements(gl.TRIANGLES,mesh.count,mesh.indexType,0);else gl.drawArrays(gl.TRIANGLES,0,mesh.count);
}
const slenderVec={add:(a,b,k=1)=>[a[0]+b[0]*k,a[1]+b[1]*k,a[2]+b[2]*k],scale:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const l=Math.hypot(...a)||1;return [a[0]/l,a[1]/l,a[2]/l]}};
let slenderSpread=0,slenderSpreadTime=0;
// Corner-cutting subdivision turns a few joint positions into a smooth curve.
function slenderSmooth(points,iterations=2){let list=points;for(let k=0;k<iterations;k++){const out=[list[0]];for(let i=0;i<list.length-1;i++){const a=list[i],b=list[i+1];out.push(a.map((v,j)=>v*.75+b[j]*.25),a.map((v,j)=>v*.25+b[j]*.75))}out.push(list[list.length-1]);list=out}return list}
// One continuous tapered tube along a curve, with parallel-transported rings (no beaded joints).
function appendGpuTube(data,points,radius,sides=10){
 const count=points.length,stride=(sides+1)*6,ring=new Float32Array(count*stride);let nx=0,ny=0,nz=0;
 for(let i=0;i<count;i++){
  const a=points[Math.max(0,i-1)],b=points[Math.min(count-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1],tz=b[2]-a[2];const tl=Math.hypot(tx,ty,tz)||1;tx/=tl;ty/=tl;tz/=tl;
  if(i===0){const hx=Math.abs(ty)>.9?1:0,hy=Math.abs(ty)>.9?0:1,cx=ty*0-tz*hy,cy=tz*hx-tx*0,cz=tx*hy-ty*hx;nx=cy*tz-cz*ty;ny=cz*tx-cx*tz;nz=cx*ty-cy*tx}else{const d=nx*tx+ny*ty+nz*tz;nx-=tx*d;ny-=ty*d;nz-=tz*d}
  const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;const bx=ty*nz-tz*ny,by=tz*nx-tx*nz,bz=tx*ny-ty*nx,r=radius(i/(count-1)),p=points[i];
  for(let k=0;k<=sides;k++){const angle=k/sides*Math.PI*2,c=Math.cos(angle),sn=Math.sin(angle),dx=nx*c+bx*sn,dy=ny*c+by*sn,dz=nz*c+bz*sn,o=i*stride+k*6;ring[o]=p[0]+dx*r;ring[o+1]=p[1]+dy*r;ring[o+2]=p[2]+dz*r;ring[o+3]=dx;ring[o+4]=dy;ring[o+5]=dz}
 }
 const need=data.length+(count-1)*sides*54;if(need>data.buffer.length){const grown=new Float32Array(Math.max(need,data.buffer.length*2));grown.set(data.buffer.subarray(0,data.length));data.buffer=grown}const out=data.buffer;
 const put=o=>{const w=data.length;out[w]=ring[o];out[w+1]=ring[o+1];out[w+2]=ring[o+2];out[w+3]=ring[o+3];out[w+4]=ring[o+4];out[w+5]=ring[o+5];out[w+6]=0;out[w+7]=0;out[w+8]=0;data.length=w+9};
 for(let i=0;i<count-1;i++)for(let k=0;k<sides;k++){const A=i*stride+k*6,B=A+stride;put(A);put(B);put(B+6);put(A);put(B+6);put(A+6)}
}
function flushGpuTubes(g,batches,key){
 const gl=g.gl,u=g.uniforms;gpuSurface(g,12,0);
 if(!g.dynamicTube){const vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12)}g.dynamicTube={vao,buffer}}
 gl.uniformMatrix4fv(u.model,false,gpuIdentity());gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([1,0,0,0,1,0,0,0,1]));gl.uniform1f(u.emission,0);
 gl.bindVertexArray(g.dynamicTube.vao);gl.bindBuffer(gl.ARRAY_BUFFER,g.dynamicTube.buffer);
 if(batches){let total=0;for(const batch of batches.values())total+=batch.data.length;if(!g.tubePacked||g.tubePacked.length<total)g.tubePacked=new Float32Array(Math.max(total,65536));const packed=g.tubePacked,ranges=[];let offset=0;for(const batch of batches.values()){packed.set(batch.data.buffer.subarray(0,batch.data.length),offset);ranges.push({color:batch.color,material:batch.material,first:offset/9,count:batch.data.length/9});offset+=batch.data.length}gl.bufferData(gl.ARRAY_BUFFER,packed.subarray(0,total),gl.DYNAMIC_DRAW);g.dynamicTube.ranges=ranges;g.dynamicTube.key=key}
 for(const range of g.dynamicTube.ranges){gl.uniform3fv(u.tint,range.color);gl.uniform1f(u.solid,range.material);gl.drawArrays(gl.TRIANGLES,range.first,range.count)}
}
// A gaunt, too-tall figure: hunched under the ceiling, sculpted faceless head turned toward the viewer,
// arms hanging past the knees, long jointed fingers and back tendrils that unfurl during a chase.
function drawGpuSlender(g,entity,p,options={}){
 if(options.lunge===undefined&&world?.grid&&typeof wall==='function'){const clear=(b)=>{const d=Math.hypot(b.x-p.x,b.y-p.y);for(let k=.1;k<d;k+=.1)if(wall(p.x+(b.x-p.x)*k/d,p.y+(b.y-p.y)*k/d))return false;return true};const dx=entity.x-p.x,dy=entity.y-p.y,d=Math.hypot(dx,dy);if(d>1.2){const ahead=(dx*Math.cos(p.angle||0)+dy*Math.sin(p.angle||0))/d;if(ahead<-.35)return;const ox=-dy/d*.4,oy=dx/d*.4;if(!clear(entity)&&!clear({x:entity.x+ox,y:entity.y+oy})&&!clear({x:entity.x-ox,y:entity.y-oy}))return}}
 const {add,scale,cross,norm}=slenderVec,t=options.time??(world?.time||0),lunge=options.lunge,phone=deviceMode==='phone';
 const hunting=lunge!==undefined||entity.state==='chase';
 if(t!==slenderSpreadTime){const dt=Math.min(.1,Math.abs(t-slenderSpreadTime));slenderSpread+=((hunting?1:0)-slenderSpread)*Math.min(1,dt*2.2);slenderSpreadTime=t}
 const spread=lunge!==undefined?1:slenderSpread,phase=entity.gaitPhase||0,motion=entity.motion||0,stride=Math.sin(phase)*motion;
 const yaw=entity.moveAngle??Math.atan2(p.y-entity.y,p.x-entity.x),F=[Math.cos(yaw),0,Math.sin(yaw)],S=[-Math.sin(yaw),0,Math.cos(yaw)],U=[0,1,0];
 const sway=Math.sin(phase)*motion*.006,base=[entity.x+S[0]*sway,entity.elevation||0,entity.y+S[2]*sway];
 const W=(x,y,z)=>[base[0]+S[0]*x+F[0]*z,base[1]+y,base[2]+S[2]*x+F[2]*z];
 const suit=[.020,.021,.025],lapel=[.033,.035,.040],shirt=[.80,.81,.80],tie=[.008,.009,.012],skin=[.82,.83,.83],hand=[.71,.72,.73],shoe=[.012,.012,.013],tendril=[.010,.010,.013];
 const poseKey=[t,entity.x,entity.y,phase,motion,spread,p.x,p.y,p.height,lunge,deviceMode].join(),cached=g.dynamicTube&&g.dynamicTube.key===poseKey;
 const batches=new Map(),tube=(points,radius,color,material,sides=10,smooth=2)=>{if(cached)return;const key=color.join()+'|'+material;if(!batches.has(key)){g.tubeStore=g.tubeStore||new Map();const store=g.tubeStore.get(key)||{buffer:new Float32Array(16384),length:0};store.length=0;g.tubeStore.set(key,store);batches.set(key,{color,material,data:store})}appendGpuTube(batches.get(key).data,smooth?slenderSmooth(points,smooth):points,radius,sides)};
 const ball=(c,s,color,material=1,X=S,Y=U,Z=F,mesh=g.sphere)=>drawGpuOriented(g,c,X,Y,Z,s,color,mesh,material);
 const M=gpuCharacterModels(g)?.slender_head?g.models:null;
 const sides=phone?8:12;
 // Long, thin legs with a gliding, low-lift stride; the trouser tube narrows to the ankle.
 const hipY=.56;
 for(const sign of [-1,1]){
  const swing=stride*sign*(entity.running?.10:.065),lift=Math.max(0,swing)*.10;
  const hip=W(sign*.033,hipY+.02,0),knee=W(sign*.035,.29+lift,.012+swing*.55),ankle=W(sign*.036,.050+lift*.6,-swing*.35+.004);
  if(M){gpuBone(g,M.slender_thigh,hip,knee,.29,suit,3,S,F);gpuBone(g,M.slender_shin,knee,ankle,.235,suit,3,S,F);drawGpuOriented(g,ankle,S,U,F,[1,1,1],shoe,M.slender_shoe,1);continue}
  tube([hip,knee,ankle],s=>.0215-.0065*s+.0012*Math.exp(-Math.pow((s-.5)/.07,2)),suit,3,sides,3);
  ball(W(sign*.036,.054+lift*.6,-swing*.35+.004),[.0172,.011,.0185],suit,3);
  ball(W(sign*.036,.017+lift*.6,-swing*.35+.026),[.0158,.0128,.046],shoe,1);
 }
 // Narrow tailored torso, hunched forward; hunting deepens the stoop.
 const lean=.10+spread*.07+(lunge!==undefined?.18:0),spine=[F[0]*Math.sin(lean),Math.cos(lean),F[2]*Math.sin(lean)],front=[F[0]*Math.cos(lean),-Math.sin(lean),F[2]*Math.cos(lean)];
 const hipC=W(0,hipY,0),torso=.26,top=add(hipC,spine,torso),mid=add(hipC,spine,torso*.5);
 if(M){drawGpuOriented(g,hipC,S,spine,front,[1,1,1],suit,M.slender_jacket,3);drawGpuOriented(g,hipC,S,spine,front,[1,1,1],shirt,M.slender_shirt,1);drawGpuOriented(g,hipC,S,spine,front,[1,1,1],tie,M.slender_tie,1)}else{
 ball(add(hipC,spine,.012),[.044,.034,.031],suit,3,S,spine,front);
 drawGpuOriented(g,add(hipC,spine,-.022),S,spine,front,[.063,.066,.046],suit,g.jacketSkirt,3);
 drawGpuOriented(g,mid,S,spine,front,[.068,torso*.5,.045],suit,g.slenderSuit,3);
 drawGpuOriented(g,add(mid,spine,.046),S,spine,front,[.050,.083,.046],shirt,g.shirt,1);
 drawGpuOriented(g,mid,S,spine,front,[.068,torso*.5,.045],lapel,g.lapels,3);
 const knot=add(add(top,spine,-.024),front,.050);ball(knot,[.0075,.0085,.006],tie,1,S,spine,front);
 tube([knot,add(add(mid,spine,.02),front,.0515),add(add(mid,spine,-.035),front,.051)],s=>.0042+.0022*s,tie,1,8,1);
 for(const k of [.040,.080])ball(add(add(mid,spine,-k),front,.047),[.0036,.0036,.0024],[.05,.05,.056],4,S,spine,front);}
 // Neck and the sculpted, featureless head, always turned to watch the viewer.
 const neckBase=add(top,spine,.004),neckAngle=lean+.42+spread*.12+(lunge!==undefined?.25:0),neckDir=[F[0]*Math.sin(neckAngle),Math.cos(neckAngle),F[2]*Math.sin(neckAngle)],neckTop=add(neckBase,neckDir,.042);
 if(!M)ball(add(neckBase,neckDir,.006),[.027,.010,.025],shirt,1,S,neckDir,norm(cross(S,neckDir)));
 tube([add(neckBase,neckDir,-.006),neckTop,add(neckTop,neckDir,.016)],s=>.0165-.002*s,skin,5,sides,1);
 const target=options.target||[p.x,p.height??.5,p.y];
 let rel=Math.atan2(target[2]-neckTop[2],target[0]-neckTop[0])-yaw;rel=Math.atan2(Math.sin(rel),Math.cos(rel));rel=Math.max(-1.7,Math.min(1.7,rel));
 const headYaw=yaw+rel,flat=Math.hypot(target[0]-neckTop[0],target[2]-neckTop[2]),pitch=Math.max(-.2,Math.min(.75,Math.atan2(neckTop[1]+.05-target[1],flat)));
 const twitch=Math.pow(Math.max(0,Math.sin(t*.9+1.3)),40),roll=.20+.07*Math.sin(t*.37)+twitch*.22*Math.sin(t*31)+(lunge!==undefined?Math.sin(t*23)*.10:0);
 const F0=[Math.cos(headYaw),0,Math.sin(headYaw)],S0=[-Math.sin(headYaw),0,Math.cos(headYaw)],F1=add(scale(F0,Math.cos(pitch)),[0,-Math.sin(pitch),0]),U1=add([0,Math.cos(pitch),0],F0,Math.sin(pitch));
 const S2=add(scale(S0,Math.cos(roll)),U1,Math.sin(roll)),U2=add(scale(U1,Math.cos(roll)),S0,-Math.sin(roll));
 if(M)drawGpuOriented(g,add(add(neckTop,U2,.058),F1,.004),S2,U2,F1,[1,1,1],skin,M.slender_head,2,.012);else drawGpuOriented(g,add(add(neckTop,U2,.060),F1,.004),S2,U2,F1,[.048,.072,.054],skin,g.slenderHead,2,.012);
 // Arms long enough for the fingertips to hang below the knees; they reach forward while hunting.
 for(const sign of [-1,1]){
  const shoulder=add(add(top,S,sign*.072),spine,-.016);if(!M)ball(shoulder,[.029,.023,.031],suit,3,S,spine,front);
  const joint=add(add(top,S,sign*.079),spine,-.026),armSwing=-stride*sign*.04;
  const elbow=add(joint,add(add(scale(S,sign*.012),scale(F,armSwing+spread*.05)),[0,-.25,0]));
  const reach=.08+spread*.55+(lunge!==undefined?.55:0),fd=norm(add(add(scale(F,Math.sin(reach)),[0,-Math.cos(reach),0]),S,sign*.03)),wrist=add(elbow,fd,.235);
  if(M){gpuBone(g,M.slender_upper_arm,joint,elbow,.25,suit,3,S,F);gpuBone(g,M.slender_forearm,elbow,wrist,.232,suit,3,S,F);gpuBone(g,M.slender_cuff,elbow,wrist,.232,shirt,1,S,F);gpuHand(g,spread>.5?M.slender_hand_claw:M.slender_hand_relaxed,wrist,elbow,sign,hand,5,S,F);continue}
  tube([joint,elbow,wrist],s=>.0162-.0042*s,suit,3,sides,3);
  const across=norm(cross(fd,scale(S,-sign))),inward=cross(across,fd);
  drawGpuOriented(g,add(wrist,fd,-.004),inward,fd,across,[.0132,.0068,.0132],shirt,g.sphere,1);
  tube([add(wrist,fd,-.002),add(wrist,fd,.012)],s=>.0078+.001*s,hand,5,sides,0);
  const palm=add(wrist,fd,.026);drawGpuOriented(g,palm,inward,fd,across,[.0072,.027,.0152],hand,g.sphere,5);
  const curl=.24-spread*.15;
  for(let i=0;i<4;i++){
   let at=add(add(palm,fd,.021),across,(i-1.5)*.0082);const points=[at],splay=norm(add(fd,across,(i-1.5)*.12*(1+spread*1.5))),lengths=[.034,.027,.021],shorter=i===0||i===3?.86:1;
   ball(at,[.0042,.0042,.0042],hand,5,S,U,F,g.lowSphere);
   for(let k=0;k<3;k++){const bend=(curl+.05*Math.sin(t*2.7+i*1.3+sign))*(k+1),dir=norm(add(scale(splay,Math.cos(bend)),inward,Math.sin(bend)));at=add(at,dir,lengths[k]*shorter);points.push(at)}
   tube(points,s=>.0037-.0014*s+.0004*Math.exp(-Math.pow((s-.38)/.06,2))+.0004*Math.exp(-Math.pow((s-.7)/.05,2)),hand,5,8,2);ball(at,[.0024,.0024,.0024],hand,5,S,U,F,g.lowSphere);
  }
  const thumbStart=add(add(palm,across,.012),inward,.004),thumbDir=norm(add(add(scale(fd,.62),across,.45),inward,.42)),thumbMid=add(thumbStart,thumbDir,.024),thumbTip=add(thumbMid,norm(add(thumbDir,fd,.5)),.019);
  tube([thumbStart,thumbMid,thumbTip],s=>.0042-.0016*s,hand,5,8,2);ball(thumbTip,[.0026,.0026,.0026],hand,5,S,U,F,g.lowSphere);
 }
 // Back tendrils: short and drooping at rest, long and spread like wings while hunting.
 const count=phone?4:6,segments=phone?12:20;
 for(let i=0;i<count;i++){
  const sideSign=i%2?1:-1,tier=Math.floor(i/2);let at=add(add(add(top,spine,-.035-tier*.035),front,-.036),S,sideSign*.025);const points=[at];
  const length=(.22+spread*.58)*(1-tier*.12),dir=norm(add(add(scale(F,-(.75-spread*.35)),S,sideSign*(.35+spread*.75)),U,spread*(.45-tier*.32)-(1-spread)*(.25+tier*.2)));
  for(let k=0;k<segments;k++){const s=(k+1)/segments,speed=1.2+spread*1.6;
   const bend=add(scale(U,Math.sin(t*speed+i*1.9+s*5.5)*.55*s-(1-spread)*.6*s),S,Math.cos(t*(speed*.85)+i*2.7+s*4.2)*.45*s*sideSign);
   at=add(at,norm(add(dir,bend)),length/segments);points.push(at)}
  tube(points,s=>.0118*Math.pow(1-s,.9)+.0009,tendril,6,phone?7:10,1);
 }
 flushGpuTubes(g,cached?null:batches,poseKey);
}
function drawGpuPictures(g,p){ensureWallPictures();const gl=g.gl,u=g.uniforms;for(const picture of world.wallPictures){if(distance(picture,p)>8)continue;const pose=picturePose(picture),ct=Math.cos(pose.tilt),st=Math.sin(pose.tilt),cr=Math.cos(pose.roll),sr=Math.sin(pose.roll),right=[picture.ny,0,-picture.nx],up=[-picture.nx*st,ct,-picture.ny*st],front=[picture.nx*ct,st,picture.ny*ct],R=right.map((v,i)=>v*cr+up[i]*sr),U=up.map((v,i)=>v*cr-right[i]*sr),mesh=g.pictureMeshes[[2,6,7,8,9,10].indexOf(picture.kind)];if(!mesh)continue;gl.uniformMatrix4fv(u.model,false,new Float32Array([...R,0,...U,0,...front,0,pose.x,pose.height,pose.z,1]));gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([...R,...U,...front]));gl.uniform1f(u.solid,0);gl.uniform1f(u.emission,0);gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}}
function drawGpuKey(g,key){
 const height=.17+Math.sin((world.time||0)*2)*.008,color=key.id==='stair'?[.58,.42,.17]:[.57,.60,.62];
 drawGpuSphere(g,[key.x-.075,height,key.y],[.054,.054,.054],color,0,.13,g.keyRing,4);
 drawGpuLimb(g,[key.x-.035,height,key.y],[key.x+.13,height,key.y],.010,color,4);
 for(const x of [.07,.12])drawGpuSphere(g,[key.x+x,height-.023,key.y],[.012,.028,.010],color,0,.10,g.roundBox,4);
}
function drawGpuSurvivor(g,entity){
 const sculpted=gpuCharacterModels(g);if(sculpted?.survivor_head_m)return drawGpuSurvivorModel(g,entity,sculpted);
 const appearance=entity.profile||getSurvivorProfile(),yaw=entity.angle||0,phase=entity.gaitPhase||0,stride=Math.sin(phase)*(entity.motion||0),front=[Math.cos(yaw),Math.sin(yaw)],side=[-front[1],front[0]],base=entity.elevation||0,bob=Math.abs(stride)*.006+Math.sin((world.time||0)*1.7)*.001;
 const skin=gpuColor(appearance.skin),coat=gpuColor(appearance.color).map(v=>v*.56+.035),pants=[.075,.10,.115],boots=[.045,.04,.033],hair=[.075,.042,.024],seam=coat.map(v=>v*.58),lip=skin.map((v,i)=>v*(i===0?.72:.49));
 const local=(x,y,z)=>[entity.x+side[0]*x+front[0]*z,base+y+bob,entity.y+side[1]*x+front[1]*z];
 const part=(x,y,z,scale,color,mesh=g.sphere,material=1)=>drawGpuSphere(g,local(x,y,z),scale,color,-yaw+Math.PI/2,0,mesh,material);
 const limb=(a,b,r,color,material=3)=>drawGpuLimb(g,local(...a),local(...b),r,color,material);
 // Anatomical proportions: smaller sculpted skull, defined shoulders, hips and long legs.
 part(0,.445,0,[.086,.043,.063],pants,g.roundBox,3);
 for(const sign of [-1,1]){
  const swing=stride*sign*(entity.running?.12:.075),knee=.245+Math.max(0,swing)*.20,foot=.035+Math.max(0,swing)*.26;
  limb([sign*.051,.45,0],[sign*.052,knee,swing],.033,pants);limb([sign*.052,knee,swing],[sign*.052,foot,-swing],.025,pants);
  part(sign*.052,knee,swing,[.029,.028,.031],pants,g.sphere,3);part(sign*.052,foot,-swing+.020,[.032,.025,.055],boots,g.roundBox);
  part(sign*.052,foot-.018,-swing+.02,[.034,.008,.057],[.024,.022,.019],g.roundBox);
  limb([sign*.037,.40,.042],[sign*.039,knee+.015,swing+.027],.0016,[.14,.16,.17]);
  const arm=sign*.128,elbow=.58,hand=.445,armSwing=-swing*.65;
  part(sign*.111,.714,0,[.035,.041,.043],coat,g.sphere,3);
  limb([arm,.711,0],[sign*.142,elbow,armSwing],.031,coat);part(sign*.142,elbow,armSwing,[.030,.026,.030],coat,g.sphere,3);
  limb([sign*.142,elbow,armSwing],[sign*.145,hand,armSwing*.6],.024,coat);
  part(sign*.145,hand+.015,armSwing*.6,[.026,.012,.027],seam,g.roundBox,3);
  part(sign*.145,hand-.017,armSwing*.6,[.020,.031,.014],skin,g.sphere,5);
  for(let finger=0;finger<4;finger++)limb([sign*.135+sign*finger*.005,hand-.023,armSwing*.6+.006],[sign*.135+sign*finger*.005,hand-.052+(finger===3?.006:0),armSwing*.6+.010],.0028,skin,5);
 }
 part(0,.588,0,[appearance.gender==='female'?.102:.113,.164,.080],coat,g.survivorCoat,3);
 part(0,.758,0,[.026,.035,.026],skin,g.sphere,5);
 const head=.843;part(0,head,0,[.056,.069,.057],skin,g.survivorHead,5);
 for(const sign of [-1,1]){
  part(sign*.055,head-.006,-.002,[.010,.017,.012],skin,g.sphere,5);part(sign*.057,head-.004,.001,[.004,.009,.005],skin.map(v=>v*.76),g.sphere,5);
  part(sign*.021,head+.010,.051,[.013,.0065,.004],skin,g.sphere,5);
  part(sign*.021,head+.011,.054,[.010,.004,.003],[.72,.71,.66]);
  part(sign*.021,head+.011,.0565,[.0035,.0037,.0017],[.12,.15,.13]);part(sign*.021,head+.011,.058,[.0017,.0024,.0007],[.015,.021,.020]);
  limb([sign*.011,head+.017,.055],[sign*.031,head+.017,.052],.0015,hair,1);
  limb([sign*.011,head+.023,.053],[sign*.031,head+.025,.047],.0022,hair,1);
 }
 part(0,head-.006,.055,[.005,.014,.005],skin,g.sphere,5);part(0,head-.018,.060,[.007,.005,.006],skin,g.sphere,5);
 for(const sign of [-1,1])part(sign*.004,head-.021,.060,[.002,.0013,.0015],skin.map(v=>v*.45));
 part(0,head-.035,.049,[.012,.0018,.0025],lip);part(0,head-.038,.049,[.011,.002,.002],lip.map(v=>v*1.15));
 part(0,head+.002,-.001,[.058,.070,.059],hair,g.hairCap,3);
 for(let i=0;i<12;i++){const a=i*Math.PI*2/12;limb([Math.cos(a)*.028,head+.060,Math.sin(a)*.028],[Math.cos(a)*.051,head+.032,Math.sin(a)*.051],.002,hair.map(v=>v*1.35),1);}
 if(appearance.hair==='long')part(0,head-.012,-.044,[.054,.10,.028],hair,g.survivorHead,3);
 if(appearance.hair==='hood')part(0,head-.014,-.026,[.064,.083,.046],coat,g.survivorHead,3);
 // Layered collar, front zip, seams, cuffs and functional pockets.
 for(const sign of [-1,1]){part(sign*.031,.737,.025,[.021,.013,.030],seam,g.roundBox,3);part(sign*.063,.563,.060,[.028,.037,.019],seam,g.roundBox,3);limb([sign*.087,.68,.030],[sign*.084,.46,.033],.0015,seam);}
 limb([0,.444,.064],[0,.733,.044],.0017,[.29,.29,.26],4);part(.005,.689,.053,[.0035,.007,.002],[.44,.44,.40],g.roundBox,4);
 if(appearance.outfit==='padded')for(let y=.46;y<.70;y+=.032)limb([-.085,y,.047],[.085,y,.047],.0017,seam);
 if(appearance.outfit==='tactical'){part(0,.605,.036,[.10,.108,.050],[.095,.12,.105],g.survivorCoat,3);for(const sign of [-1,1])part(sign*.047,.566,.079,[.037,.046,.018],[.15,.17,.14],g.roundBox,3);}
 part(0,.620,-.090,[.077,.103,.035],[.11,.14,.12],g.roundBox,3);part(0,.590,-.129,[.064,.035,.014],[.15,.18,.145],g.roundBox,3);
 for(const sign of [-1,1]){limb([sign*.066,.73,-.075],[sign*.054,.49,.059],.006,[.10,.12,.10]);part(sign*.049,.688,-.126,[.010,.006,.004],[.33,.32,.27],g.roundBox,4);}
}
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
 const M=gpuCharacterModels(g);
 if(M?.fp_flashlight){const {add,scale,norm}=slenderVec,S3=[r[0],0,r[1]],F3=[f[0],0,f[1]],axis=norm(add(scale([0,1,0],.731),F3,.682)),across=norm(add(scale([0,1,0],-.682),F3,.731)),tail=local(.12,-.165,.25);
  gpuBone(g,M.survivor_forearm,local(.135,-.35,.115),local(.12,-.23,.241),.137,sleeve,3,S3,F3,baseGlow*.5);
  drawGpuOriented(g,tail,S3,axis,across,[1,1,1],metal,M.fp_flashlight,4,baseGlow*.4);drawGpuOriented(g,tail,S3,axis,across,[1,1,1],[.72,.80,.81],M.fp_lens,1,flashlightOn?.75:baseGlow);drawGpuOriented(g,tail,S3,axis,across,[1,1,1],skin,M.fp_hand,5,baseGlow*.3);return}
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
 if(flashlightOn){gl.useProgram(g.depthProgram);const saved=g.uniforms;g.uniforms=g.depthUniforms;try{gl.uniformMatrix4fv(g.uniforms.vp,false,light.vp);gl.uniformMatrix4fv(g.uniforms.model,false,gpuIdentity());gl.bindVertexArray(g.scene.vao);gl.drawArrays(gl.TRIANGLES,0,g.scene.count);if(difficulty==='psycho'){gl.bindVertexArray(g.damage.vao);gl.drawArrays(gl.TRIANGLES,0,g.damage.count);}drawGpuPictures(g,p);drawGpuCharacter(g,world.enemy,true,p);if(cameraMode==='third'&&!world.player.hidingId)drawGpuCharacter(g,world.player,false,p);if(typeof coopTeammates==='function')for(const teammate of coopTeammates())drawGpuCharacter(g,teammate,false,p);}finally{g.uniforms=saved;}}
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
  gl.uniform1i(u.grid,2);gl.uniform1i(u.gridSize,g.gridSize);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,g.gridTexture);gl.uniform1f(u.time,world.time||0);
  const nearLamps=(g.lamps||[]).map(lamp=>({lamp,d:(lamp.x-p.x)**2+(lamp.y-p.y)**2})).filter(item=>item.d<100).sort((a,b)=>a.d-b.d).slice(0,deviceMode==='phone'?4:8),lampData=new Float32Array(24);nearLamps.forEach(({lamp},i)=>lampData.set([lamp.x,.93,lamp.y],i*3));
  gl.uniform3fv(u.lampPos,lampData);gl.uniform1i(u.lampCount,nearLamps.length);gl.uniform1f(u.lampLevel,difficulty==='psycho'?0:normalLightLevel(world.time||0));
  gl.uniform1f(u.dread,typeof slenderDread==='number'?slenderDread:0);gl.uniform2f(u.resolution,g.surface.width,g.surface.height);
  const camera=gpuCamera(p,horizon);gl.uniformMatrix4fv(u.vp,false,camera.vp);gl.uniformMatrix4fv(u.model,false,gpuIdentity());gl.uniformMatrix3fv(u.normalMatrix,false,new Float32Array([1,0,0,0,1,0,0,0,1]));gl.uniform3fv(u.eye,camera.eye);gl.uniform3fv(u.forward,camera.forward);gl.uniform1f(u.psycho,difficulty==='psycho'?1:0);gl.uniform1f(u.flashlight,flashlightOn?1:0);gl.uniform1f(u.solid,0);gl.uniform1f(u.emission,0);gl.uniform1i(u.materials,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,g.textures[difficulty==='psycho'?1:0]);gl.bindVertexArray(g.scene.vao);gl.drawArrays(gl.TRIANGLES,0,g.scene.count);
  if(difficulty==='psycho'){gl.bindVertexArray(g.damage.vao);gl.drawArrays(gl.TRIANGLES,0,g.damage.count);}drawGpuPictures(g,p);
  drawGpuCharacter(g,world.enemy,true,p);if(cameraMode==='third'&&!world.player.hidingId&&p.distance>.42)drawGpuCharacter(g,world.player,false,p);
  if(typeof coopTeammates==='function')for(const teammate of coopTeammates())drawGpuCharacter(g,teammate,false,p);
  if(world.coopFloor!==undefined){
   const s=world.stairwell,base=world.coopFloor===1?-s.rise:0;for(const side of [-1,1])drawGpuLimb(g,[s.x+side*1.3,base+.56,s.start],[s.x+side*1.3,base+s.rise+.56,s.end],.022,[.20,.14,.09]);
   if(!coop.clues[world.coopFloor])drawGpuSphere(g,[world.clue.x,.25,world.clue.y],[.12,.01,.15],[.85,.76,.52],world.time*.2,.25,g.roundBox);
   if(world.looseKey&&!coop.keys[world.looseKey.id])drawGpuKey(g,world.looseKey);

  }
  for(const spider of world.spiders||[])if(distance(spider,p)<5&&(spider.x-p.x)*Math.cos(p.angle||0)+(spider.y-p.y)*Math.sin(p.angle||0)>0)drawGpuSpider(g,spider);
  for(const lamp of g.lamps||[])drawGpuSphere(g,[lamp.x,.954,lamp.y],[.066,.008,.028],difficulty==='psycho'?[.06,.06,.06]:[.90,.78,.55],0,difficulty==='psycho'?0:normalLightLevel(world.time||0)*1.5,g.roundBox);
  for(const item of world.furniture||[]){const b=furnitureBounds(item),nx=item.nx||0,nz=item.ny||0,depth=nx?(b.maxX-b.minX)/2:(b.maxY-b.minY)/2;for(const sign of [-1,1])drawGpuSphere(g,[item.x+nx*(depth+.025)-nz*sign*.035,item.height*.53,item.y+nz*(depth+.025)+nx*sign*.035],[nx?.019:.010,.029,nz?.019:.010],[.39,.29,.13],0,0,g.sphere,4);}
  for(const relic of world.relics)if(!relic.taken)drawGpuSphere(g,[relic.x,.52+Math.sin(world.time*3)*.018,relic.y],[.105,.16,.105],[.97,.72,.23],world.time*.7,.9,g.gem);
  if((cameraMode==='first'||p.distance<.42)&&!world.player.hidingId)drawGpuFlashlight(g,p);
  gl.flush();VIEW.context.drawImage(g.surface,0,0,1000,700);return true;
 }catch(error){console.warn('3D render fallback:',error.message);gpuUnavailable=true;GPU=null;return false}
}
// Catch scare: the figure lunges out of the dark into the flashlight, head jerking, through heavy static.
function renderGpuJumpscare(time){
 const g=initGpu();if(!g)return false;const gl=g.gl,u=g.uniforms;
 try{
  gl.bindFramebuffer(gl.FRAMEBUFFER,g.shadowFramebuffer);gl.viewport(0,0,g.shadowSize,g.shadowSize);gl.clear(gl.DEPTH_BUFFER_BIT);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  const width=deviceMode==='phone'?800:Math.min(1800,Math.max(1000,Math.round(canvas.clientWidth||1000)));if(g.surface.width!==width){g.surface.width=width;g.surface.height=width*.7}
  gl.viewport(0,0,g.surface.width,g.surface.height);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(g.program);
  const shake=Math.max(0,1-time*1.2),pose={x:0,y:0,angle:Math.sin(time*61)*.025*shake,height:.84},camera=gpuCamera(pose,420+Math.cos(time*53)*10*shake);
  const approach=Math.min(1,time/.22),entity={x:1.15-.62*approach*approach,y:Math.sin(time*37)*.012,moveAngle:Math.PI,motion:0,state:'chase'};
  gl.uniformMatrix4fv(u.vp,false,camera.vp);gl.uniformMatrix4fv(u.lightVP,false,camera.vp);gl.uniform3fv(u.eye,camera.eye);gl.uniform3fv(u.lightEye,[camera.eye[0]+.02,camera.eye[1]-.11,camera.eye[2]+.07]);gl.uniform3fv(u.forward,[camera.forward[0],.12,camera.forward[2]]);
  gl.uniform2f(u.shadowTexel,1/g.shadowSize,1/g.shadowSize);gl.uniform1i(u.shadowMap,1);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,g.shadowTexture);gl.uniform1i(u.grid,2);gl.uniform1i(u.gridSize,0);gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(u.lampCount,0);gl.uniform1f(u.lampLevel,0);gl.uniform1f(u.normalLight,0);gl.uniform1f(u.psycho,1);gl.uniform1f(u.flashlight,.38);gl.uniform1f(u.time,time);gl.uniform1f(u.dread,Math.min(1,.55+time*.6)*(.85+.15*Math.sin(time*40)));gl.uniform2f(u.resolution,g.surface.width,g.surface.height);
  drawGpuSlender(g,entity,pose,{time:20+time,lunge:time,target:camera.eye});
  gl.flush();ctx.drawImage(g.surface,0,0,1000,700);return true;
 }catch(error){console.warn('3D jumpscare fallback:',error.message);return false}
}
