#!/usr/bin/env node
/* Builds assets/models/characters.glb from scratch.
 * Every part is sculpted as a signed distance field (smoothly blended spheres, capsules, cones and
 * carved details), meshed with surface nets, projected onto the exact surface, given analytic normals
 * and baked ambient occlusion (stored as vertex colour), then written as a standard glTF 2.0 binary.
 * Units match the game: one unit is roughly two metres; +Y is up and +Z is the front of each part.
 * Usage: node scripts/build-character-models.cjs
 */
const fs=require('node:fs'),path=require('node:path');

// ---------- distance-field toolkit ----------
const len2=(x,y)=>Math.sqrt(x*x+y*y),len3=(x,y,z)=>Math.sqrt(x*x+y*y+z*z),clamp=(v,a,b)=>v<a?a:v>b?b:v;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const sph=(x,y,z,cx,cy,cz,r)=>len3(x-cx,y-cy,z-cz)-r;
function ell(x,y,z,cx,cy,cz,rx,ry,rz){const px=(x-cx)/rx,py=(y-cy)/ry,pz=(z-cz)/rz,k0=len3(px,py,pz),k1=len3(px/rx,py/ry,pz/rz);return k1>1e-9?k0*(k0-1)/k1:-Math.min(rx,ry,rz)}
function cone(x,y,z,ax,ay,az,bx,by,bz,ra,rb){const px=x-ax,py=y-ay,pz=z-az,dx=bx-ax,dy=by-ay,dz=bz-az,dd=dx*dx+dy*dy+dz*dz;let t=dd>0?(px*dx+py*dy+pz*dz)/dd:0;t=clamp(t,0,1);return len3(px-dx*t,py-dy*t,pz-dz*t)-(ra+(rb-ra)*t)}
function box(x,y,z,cx,cy,cz,hx,hy,hz,r=0){const qx=Math.abs(x-cx)-hx+r,qy=Math.abs(y-cy)-hy+r,qz=Math.abs(z-cz)-hz+r;return len3(Math.max(qx,0),Math.max(qy,0),Math.max(qz,0))+Math.min(Math.max(qx,qy,qz),0)-r}
function seg2(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);return len2(x-ax-dx*t,y-ay-dy*t)}
function smin(a,b,k){if(k<=0)return Math.min(a,b);const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25}
const smax=(a,b,k)=>-smin(-a,-b,k);
function hash3(i,j,k){let n=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(k,1274126177))|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296}
function noise(x,y,z){const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z),fx=x-i,fy=y-j,fz=z-k,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz),L=(a,b,t)=>a+(b-a)*t;
 return L(L(L(hash3(i,j,k),hash3(i+1,j,k),u),L(hash3(i,j+1,k),hash3(i+1,j+1,k),u),v),L(L(hash3(i,j,k+1),hash3(i+1,j,k+1),u),L(hash3(i,j+1,k+1),hash3(i+1,j+1,k+1),u),v),w)*2-1}
// Piecewise smooth profile through [y,value] pairs.
function profile(points){return y=>{if(y<=points[0][0])return points[0][1];for(let i=1;i<points.length;i++)if(y<=points[i][0]){const [y0,a]=points[i-1],[y1,b]=points[i],t=smooth(0,1,(y-y0)/(y1-y0));return a+(b-a)*t}return points[points.length-1][1]}}
// Rounded super-ellipse cross-section lofted along Y: a tailored garment silhouette.
function loft(W,D,power=2.4){return (x,y,z)=>{const w=W(y),d=D(y),q=Math.pow(Math.abs(x)/w,power)+Math.pow(Math.abs(z)/d,power);return (Math.pow(q,1/power)-1)*Math.min(w,d)*.9}}
function frontOf(W,D,power=2.4){return (x,y)=>{const w=W(y),d=D(y),t=Math.min(.999,Math.pow(Math.abs(x)/w,power));return d*Math.pow(1-t,1/power)}}

// ---------- surface nets mesher ----------
function surfaceNet(sdf,lo,hi,h){
 const n=[0,1,2].map(a=>Math.ceil((hi[a]-lo[a])/h)+1),[nx,ny,nz]=n,f=new Float32Array(nx*ny*nz),I=(i,j,k)=>i+nx*(j+ny*k);
 for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)f[I(i,j,k)]=sdf(lo[0]+i*h,lo[1]+j*h,lo[2]+k*h);
 const cells=new Int32Array((nx-1)*(ny-1)*(nz-1)).fill(-1),C=(i,j,k)=>i+(nx-1)*(j+(ny-1)*k),pos=[];
 const corners=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],edges=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
 const grad=(x,y,z,e)=>[sdf(x+e,y,z)-sdf(x-e,y,z),sdf(x,y+e,z)-sdf(x,y-e,z),sdf(x,y,z+e)-sdf(x,y,z-e)];
 const v=new Float32Array(8);
 for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
  let mask=0;for(let c=0;c<8;c++){const o=corners[c];v[c]=f[I(i+o[0],j+o[1],k+o[2])];if(v[c]<0)mask|=1<<c}
  if(mask===0||mask===255)continue;
  let sx=0,sy=0,sz=0,count=0;
  for(const [a,b] of edges){if((v[a]<0)===(v[b]<0))continue;const t=v[a]/(v[a]-v[b]),A=corners[a],B=corners[b];sx+=A[0]+(B[0]-A[0])*t;sy+=A[1]+(B[1]-A[1])*t;sz+=A[2]+(B[2]-A[2])*t;count++}
  let x=lo[0]+(i+sx/count)*h,y=lo[1]+(j+sy/count)*h,z=lo[2]+(k+sz/count)*h;
  // Project onto the true surface, staying near the cell.
  for(let step=0;step<3;step++){const d=sdf(x,y,z),g=grad(x,y,z,h*.25),gg=g[0]*g[0]+g[1]*g[1]+g[2]*g[2];if(gg<1e-14)break;const k2=d*(2*h*.25)/gg;const nxp=x-g[0]*k2,nyp=y-g[1]*k2,nzp=z-g[2]*k2;
   if(Math.abs(nxp-(lo[0]+(i+.5)*h))>h*1.2||Math.abs(nyp-(lo[1]+(j+.5)*h))>h*1.2||Math.abs(nzp-(lo[2]+(k+.5)*h))>h*1.2)break;x=nxp;y=nyp;z=nzp}
  cells[C(i,j,k)]=pos.length/3;pos.push(x,y,z);
 }
 const idx=[],quad=(a,b,c,d,flip)=>{if(flip)idx.push(a,c,b,a,d,c);else idx.push(a,b,c,a,c,d)};
 for(let k=1;k<nz-1;k++)for(let j=1;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=f[I(i,j,k)],b=f[I(i+1,j,k)];if((a<0)===(b<0))continue;quad(cells[C(i,j-1,k-1)],cells[C(i,j,k-1)],cells[C(i,j,k)],cells[C(i,j-1,k)],a>=0)}
 for(let k=1;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=1;i<nx-1;i++){const a=f[I(i,j,k)],b=f[I(i,j+1,k)];if((a<0)===(b<0))continue;quad(cells[C(i-1,j,k-1)],cells[C(i-1,j,k)],cells[C(i,j,k)],cells[C(i,j,k-1)],a>=0)}
 for(let k=0;k<nz-1;k++)for(let j=1;j<ny-1;j++)for(let i=1;i<nx-1;i++){const a=f[I(i,j,k)],b=f[I(i,j,k+1)];if((a<0)===(b<0))continue;quad(cells[C(i-1,j-1,k)],cells[C(i,j-1,k)],cells[C(i,j,k)],cells[C(i-1,j,k)],a>=0)}
 const positions=new Float32Array(pos),count=positions.length/3,normals=new Float32Array(count*3);
 for(let q=0;q<count;q++){const g=grad(positions[q*3],positions[q*3+1],positions[q*3+2],h*.35),l=Math.hypot(...g)||1;normals[q*3]=g[0]/l;normals[q*3+1]=g[1]/l;normals[q*3+2]=g[2]/l}
 return {positions,normals,indices:count<65536?new Uint16Array(idx):new Uint32Array(idx)};
}
// Ambient occlusion from the distance field: how much nearby surface crowds each vertex.
function bakeOcclusion(mesh,env,reach){
 const {positions:p,normals:n}=mesh,count=p.length/3,colors=new Uint8Array(count*4);
 for(let q=0;q<count;q++){let occ=0,w=1;for(let s=1;s<=5;s++){const d=reach*s/5,x=p[q*3]+n[q*3]*d,y=p[q*3+1]+n[q*3+1]*d,z=p[q*3+2]+n[q*3+2]*d;occ+=w*Math.max(0,d-env(x,y,z))/reach;w*=.6}
  const ao=clamp(1-occ*1.15,.45,1),b=Math.round(ao*255);colors.set([b,b,b,255],q*4)}
 mesh.colors=colors;return mesh;
}

// ---------- quadric edge-collapse simplification ----------
// Merges vertices where the surface is flat and keeps them where it curves (Garland-Heckbert quadrics).
class MinHeap{constructor(){this.keys=[];this.items=[]}
 push(key,item){const k=this.keys,it=this.items;let i=k.length;k.push(key);it.push(item);while(i>0){const p=(i-1)>>1;if(k[p]<=key)break;k[i]=k[p];it[i]=it[p];i=p}k[i]=key;it[i]=item}
 pop(){const k=this.keys,it=this.items,top=it[0],topKey=k[0],lastK=k.pop(),lastI=it.pop();if(k.length){let i=0;const n=k.length;while(true){let c=2*i+1;if(c>=n)break;if(c+1<n&&k[c+1]<k[c])c++;if(k[c]>=lastK)break;k[i]=k[c];it[i]=it[c];i=c}k[i]=lastK;it[i]=lastI}this.lastKey=topKey;return top}
 get size(){return this.keys.length}}
function simplify(mesh,targetTris){
 const P=Float64Array.from(mesh.positions),F=Int32Array.from(mesh.indices),nv=P.length/3,nf=F.length/3;if(nf<=targetTris)return mesh;
 const Q=new Float64Array(nv*10),vf=Array.from({length:nv},()=>[]),faceAlive=new Uint8Array(nf).fill(1),dead=new Uint8Array(nv),stamp=new Int32Array(nv);
 const faceNormal=(f,moved=-1,mx=0,my=0,mz=0)=>{const g=i=>{const v=F[f*3+i];return v===moved?[mx,my,mz]:[P[v*3],P[v*3+1],P[v*3+2]]},a=g(0),b=g(1),c=g(2),ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=c[0]-a[0],wy=c[1]-a[1],wz=c[2]-a[2];return [uy*wz-uz*wy,uz*wx-ux*wz,ux*wy-uy*wx]};
 for(let f=0;f<nf;f++){const n=faceNormal(f),l=Math.hypot(...n);if(l<1e-14)continue;const a=n[0]/l,b=n[1]/l,c=n[2]/l,v0=F[f*3],d=-(a*P[v0*3]+b*P[v0*3+1]+c*P[v0*3+2]),w=l*.5,q=[a*a,a*b,a*c,a*d,b*b,b*c,b*d,c*c,c*d,d*d];
  for(let i=0;i<3;i++){const v=F[f*3+i];for(let j=0;j<10;j++)Q[v*10+j]+=q[j]*w;vf[v].push(f)}}
 const err=(q,x,y,z)=>q[0]*x*x+2*q[1]*x*y+2*q[2]*x*z+2*q[3]*x+q[4]*y*y+2*q[5]*y*z+2*q[6]*y+q[7]*z*z+2*q[8]*z+q[9];
 const heap=new MinHeap(),q=new Float64Array(10);
 const consider=(a,b)=>{for(let j=0;j<10;j++)q[j]=Q[a*10+j]+Q[b*10+j];let best=Infinity,bx=0,by=0,bz=0;
  for(const t of [0,.5,1]){const x=P[a*3]+(P[b*3]-P[a*3])*t,y=P[a*3+1]+(P[b*3+1]-P[a*3+1])*t,z=P[a*3+2]+(P[b*3+2]-P[a*3+2])*t,e=err(q,x,y,z);if(e<best){best=e;bx=x;by=y;bz=z}}
  heap.push(best,[a,b,stamp[a],stamp[b],bx,by,bz])};
 const seen=new Set();for(let f=0;f<nf;f++)for(let i=0;i<3;i++){const a=F[f*3+i],b=F[f*3+(i+1)%3],key=a<b?a*nv+b:b*nv+a;if(!seen.has(key)){seen.add(key);consider(a,b)}}
 let alive=nf;
 while(alive>targetTris&&heap.size){
  const [a,b,sa,sb,x,y,z]=heap.pop();if(dead[a]||dead[b]||stamp[a]!==sa||stamp[b]!==sb)continue;
  let ok=true;{const na=new Set(),nb=new Set();for(const f of vf[a])if(faceAlive[f])for(let i=0;i<3;i++)na.add(F[f*3+i]);for(const f of vf[b])if(faceAlive[f])for(let i=0;i<3;i++)nb.add(F[f*3+i]);let common=0;for(const v of na)if(v!==a&&v!==b&&nb.has(v))common++;if(common!==2)continue}
  for(const v of [a,b])for(const f of vf[v]){if(!faceAlive[f])continue;const has=F[f*3]===a||F[f*3+1]===a||F[f*3+2]===a,hasB=F[f*3]===b||F[f*3+1]===b||F[f*3+2]===b;if(has&&hasB)continue;
   const before=faceNormal(f),after=faceNormal(f,v,x,y,z),lb=Math.hypot(...before),la=Math.hypot(...after);if(la<1e-14||(before[0]*after[0]+before[1]*after[1]+before[2]*after[2])/(lb*la+1e-30)<.3){ok=false;break}}
  if(!ok)continue;
  P[a*3]=x;P[a*3+1]=y;P[a*3+2]=z;for(let j=0;j<10;j++)Q[a*10+j]+=Q[b*10+j];
  for(const f of vf[b]){if(!faceAlive[f])continue;const hasA=F[f*3]===a||F[f*3+1]===a||F[f*3+2]===a;if(hasA){faceAlive[f]=0;alive--;continue}for(let i=0;i<3;i++)if(F[f*3+i]===b)F[f*3+i]=a;vf[a].push(f)}
  dead[b]=1;stamp[a]++;vf[a]=[...new Set(vf[a].filter(f=>faceAlive[f]))];vf[b]=[];
  const neighbours=new Set();for(const f of vf[a])for(let i=0;i<3;i++){const v=F[f*3+i];if(v!==a)neighbours.add(v)}for(const v of neighbours){stamp[v]++;}
  for(const v of neighbours){for(const f of vf[v])for(let i=0;i<3;i++){const w=F[f*3+i];if(w!==v&&!dead[w])consider(v,w)}}
 }
 const remap=new Int32Array(nv).fill(-1),pos=[],idx=[];
 for(let f=0;f<nf;f++){if(!faceAlive[f])continue;const tri=[F[f*3],F[f*3+1],F[f*3+2]];if(tri[0]===tri[1]||tri[1]===tri[2]||tri[0]===tri[2])continue;for(const v of tri){if(remap[v]<0){remap[v]=pos.length/3;pos.push(P[v*3],P[v*3+1],P[v*3+2])}idx.push(remap[v])}}
 const count=pos.length/3;return {positions:new Float32Array(pos),normals:new Float32Array(count*3),indices:count<65536?new Uint16Array(idx):new Uint32Array(idx)};
}
// After simplification: snap vertices back onto the exact surface and take normals from the field.
function finish(mesh,sdf,h){const p=mesh.positions,n=mesh.normals,count=p.length/3,e=h*.35;
 for(let q=0;q<count;q++){let x=p[q*3],y=p[q*3+1],z=p[q*3+2];
  for(let s=0;s<3;s++){const d=sdf(x,y,z),gx=sdf(x+e,y,z)-sdf(x-e,y,z),gy=sdf(x,y+e,z)-sdf(x,y-e,z),gz=sdf(x,y,z+e)-sdf(x,y,z-e),gg=gx*gx+gy*gy+gz*gz;if(gg<1e-16)break;const k=d*2*e/gg;if(Math.abs(k)*Math.sqrt(gg)>h)break;x-=gx*k;y-=gy*k;z-=gz*k}
  p[q*3]=x;p[q*3+1]=y;p[q*3+2]=z;const gx=sdf(x+e,y,z)-sdf(x-e,y,z),gy=sdf(x,y+e,z)-sdf(x,y-e,z),gz=sdf(x,y,z+e)-sdf(x,y,z-e),l=Math.hypot(gx,gy,gz)||1;n[q*3]=gx/l;n[q*3+1]=gy/l;n[q*3+2]=gz/l}
 return mesh}
const BUDGET={slender_head:7000,slender_jacket:7000,slender_shirt:3000,slender_tie:900,slender_upper_arm:1400,slender_forearm:1400,slender_cuff:500,slender_hand_relaxed:4200,slender_hand_claw:4200,slender_thigh:1400,slender_shin:1200,slender_shoe:1600,
 survivor_head_m:8000,survivor_head_f:8000,survivor_brows_m:300,survivor_brows_f:300,survivor_lips_m:700,survivor_lips_f:700,survivor_torso_field_m:6500,survivor_torso_field_f:6500,survivor_torso_padded_m:6000,survivor_torso_padded_f:6000,survivor_zip_m:700,survivor_zip_f:700,survivor_vest_m:5000,survivor_vest_f:5000,
 survivor_eyes:1200,survivor_irises:400,survivor_hair_short:4000,survivor_hair_bob:4500,survivor_hair_long:5000,survivor_hood:5000,survivor_backpack:4000,survivor_pelvis:1400,survivor_upper_arm:1400,survivor_forearm:1500,survivor_hand:3200,survivor_thigh:1500,survivor_shin:1400,survivor_boot:3500,
 fp_flashlight:3600,fp_lens:500,fp_hand:4200};

function inspect(mesh,sdf,h){const P=mesh.positions,I=mesh.indices,edges=new Map();let folded=0;for(let t=0;t<I.length;t+=3){const a=I[t],b=I[t+1],c=I[t+2];for(const [u,v] of [[a,b],[b,c],[c,a]]){const k=u<v?u+','+v:v+','+u;edges.set(k,(edges.get(k)||0)+1)}
 const ux=P[b*3]-P[a*3],uy=P[b*3+1]-P[a*3+1],uz=P[b*3+2]-P[a*3+2],wx=P[c*3]-P[a*3],wy=P[c*3+1]-P[a*3+1],wz=P[c*3+2]-P[a*3+2],nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx,cx=(P[a*3]+P[b*3]+P[c*3])/3,cy=(P[a*3+1]+P[b*3+1]+P[c*3+1])/3,cz=(P[a*3+2]+P[b*3+2]+P[c*3+2])/3,e=h*.3,gx=sdf(cx+e,cy,cz)-sdf(cx-e,cy,cz),gy=sdf(cx,cy+e,cz)-sdf(cx,cy-e,cz),gz=sdf(cx,cy,cz+e)-sdf(cx,cy,cz-e);if(nx*gx+ny*gy+nz*gz<0)folded++}
 let bad=0;for(const n of edges.values())if(n!==2)bad++;let off=0,worst=0;for(let q=0;q<P.length/3;q++){const d=Math.abs(sdf(P[q*3],P[q*3+1],P[q*3+2]));worst=Math.max(worst,d);if(d>h*.5)off++}return {badEdges:bad,folded,offSurface:off,worst:+worst.toFixed(4),tris:I.length/3}}
// ---------- glTF 2.0 binary writer ----------
function writeGlb(parts,file){
 const views=[],accessors=[],meshes=[],nodes=[],materials=[],chunks=[];let offset=0;
 const add=(typed,target)=>{const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad}views.push({buffer:0,byteOffset:offset,byteLength:typed.byteLength,target});chunks.push(Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength));offset+=typed.byteLength;return views.length-1};
 parts.forEach((part,index)=>{
  const {positions:P}=part,count=P.length/3,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let q=0;q<count;q++)for(let a=0;a<3;a++){min[a]=Math.min(min[a],P[q*3+a]);max[a]=Math.max(max[a],P[q*3+a])}
  accessors.push({bufferView:add(P,34962),componentType:5126,count,type:'VEC3',min,max});const position=accessors.length-1;
  accessors.push({bufferView:add(part.normals,34962),componentType:5126,count,type:'VEC3'});const normal=accessors.length-1;
  accessors.push({bufferView:add(part.colors,34962),componentType:5121,normalized:true,count,type:'VEC4'});const color=accessors.length-1;
  accessors.push({bufferView:add(part.indices,34963),componentType:part.indices instanceof Uint16Array?5123:5125,count:part.indices.length,type:'SCALAR'});const indices=accessors.length-1;
  materials.push({name:part.name,pbrMetallicRoughness:{baseColorFactor:[...part.color,1],metallicFactor:part.metal?.8:0,roughnessFactor:part.rough??.7}});
  meshes.push({name:part.name,primitives:[{attributes:{POSITION:position,NORMAL:normal,COLOR_0:color},indices,material:index}]});
  nodes.push({name:part.name,mesh:index,translation:part.show||[0,0,0]});
 });
 const json=Buffer.from(JSON.stringify({asset:{version:'2.0',generator:'Hollow House character builder'},scene:0,scenes:[{name:'Characters',nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,accessors,bufferViews:views,buffers:[{byteLength:offset}]}));
 const jsonPad=Buffer.alloc((4-json.length%4)%4,0x20),bin=Buffer.concat(chunks),binPad=Buffer.alloc((4-bin.length%4)%4);
 const jsonChunk=Buffer.concat([json,jsonPad]),binChunk=Buffer.concat([bin,binPad]),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
 header.writeUInt32LE(0x46546C67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jsonChunk.length+8+binChunk.length,8);
 jh.writeUInt32LE(jsonChunk.length,0);jh.writeUInt32LE(0x4E4F534A,4);bh.writeUInt32LE(binChunk.length,0);bh.writeUInt32LE(0x004E4942,4);
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.concat([header,jh,jsonChunk,bh,binChunk]));
}

// =====================================================================
// SLENDER FIGURE (tall, gaunt, faceless; dark suit)
// =====================================================================
function slenderHead(x,y,z){
 const ax=Math.abs(x);
 let d=ell(x,y,z,0,.012,-.004,.047,.060,.052);
 d=smin(d,ell(x,y,z,0,-.022,.008,.035,.050,.044),.022);
 d=smin(d,ell(x,y,z,0,-.062,.024,.015,.011,.013),.014);
 d=smin(d,ell(ax,y,z,.025,-.006,.036,.010,.007,.006),.014);
 d=smin(d,cone(ax,y,z,0,.021,.046,.023,.019,.043,.0052,.0045),.014);
 d=smin(d,cone(x,y,z,0,.008,.052,0,-.010,.053,.0014,.0018),.010);
 d=smax(d,-ell(ax,y,z,.017,.006,.060,.0125,.0085,.0055),.0045);
 d=smax(d,-ell(ax,y,z,.047,.012,.022,.009,.018,.014),.012);
 d=smax(d,-ell(ax,y,z,.026,-.032,.041,.009,.010,.005),.008);
 return d+noise(x*400,y*400,z*400)*.00025;
}
const SW=profile([[-.098,.069],[-.04,.064],[0,.060],[.07,.055],[.16,.063],[.225,.068],[.262,.052],[.285,.03]]),SD=profile([[-.098,.045],[0,.042],[.07,.039],[.16,.044],[.225,.040],[.262,.032],[.285,.02]]);
const slenderLoft=loft(SW,SD),slenderFront=frontOf(SW,SD),slenderV=y=>.004+(y-.05)*.15;
function slenderJacket(x,y,z){
 const ax=Math.abs(x);let d=slenderLoft(x,y,z);
 d=smax(d,-.098-y,.004);d=smax(d,y-.285,.006);
 d=smin(d,cone(ax,y,z,0,.236,-.003,.060,.236,-.003,.025,.025),.02);
 const ring=len2(len2(x,z*1.15)-.024,y-.262)-.0075;d=smin(d,smax(ring,z-.012,.004),.006);
 d=smax(d,-cone(x,y,z,0,.24,0,0,.33,0,.0165,.0165),.004);
 const front=slenderFront(x,y);
 d=smax(d,-Math.max(ax-slenderV(y),.05-y,(front-.006)-z),.002);
 const lapel=Math.max(seg2(ax,y,.012,.05,.050,.258)-.0095,Math.abs(z-(front+.0022))-.0026);d=smin(d,smax(lapel,-sph(ax,y,z,.054,.226,front+.002,.006),.002),.003);
 const gap=Math.max(0,.045-y)*.36;d=smax(d,-Math.max(ax-gap,y-.045,(slenderFront(0,y)-.010)-z),.002);
 d=smin(d,sph(x,y,z,0,.042,slenderFront(0,.042)+.0015,.0042),.001);
 d=smin(d,box(ax,y,z,.036,.012,slenderFront(.036,.012)+.0006,.016,.0045,.0018,.001),.002);
 d=smax(d,-box(x,y,z,0,-.075,-SD(-.075),.0012,.028,.006),.001);
 const waist=smooth(.02,.06,y)*(1-smooth(.09,.13,y))*smooth(.02,.05,ax);
 return d+.0007*Math.sin(y*180+Math.sin(x*90)*2)*waist+noise(x*90,y*90,z*90)*.0005;
}
function slenderShirt(x,y,z){
 const front=slenderFront(0,y);let d=Math.max(Math.abs(x)-(slenderV(y)+.003),.046-y,y-.257,Math.abs(z-(front-.0058))-.0036);
 d=Math.min(d,smax(len2(len2(x,z*1.1)-.0185,y-.268)-.004,-.005-z,.002));
 d=Math.min(d,cone(Math.abs(x),y,z,.006,.264,.022,.020,.246,.027,.004,.0015));
 return d;
}
function slenderTie(x,y,z){
 const front=slenderFront(0,y);let d=ell(x,y,z,0,.252,.0205,.0065,.0075,.005);
 const blade=Math.max(Math.abs(x)-(.0045+(.244-y)*.03),Math.abs(z-(front-.0005))-.0016,y-.246,(.058+Math.abs(x)*.8)-y);
 return smin(d,blade,.002);
}
const sleeve=(r0,r1,length,folds)=>(x,y,z)=>{let d=cone(x,y,z,0,.008,0,0,-length,0,r0,r1);const t=clamp(-y/length,0,1);
 d-=folds*.0011*Math.sin(Math.atan2(z,x)*3+t*14)*smooth(.7,.95,t)*smooth(.0,.6,z/Math.max(len2(x,z),1e-6)+.5);
 return d+noise(x*160,y*160,z*160)*.0004};
const slenderUpper=sleeve(.0178,.0146,.25,1),slenderFore=(x,y,z)=>sleeve(.0146,.0122,.232,.6)(x,y,z);
function slenderCuff(x,y,z){return smax(cone(x,y,z,0,-.229,0,0,-.244,0,.0131,.0129),-cone(x,y,z,0,-.22,0,0,-.25,0,.0115,.0115),.001)}
function makeHand({palm,fingers,thumb,curls,splay,wrist,tendons,nails}){
 return (x,y,z)=>{
  let d=cone(x,y,z,0,.012,0,0,-.012,0,wrist,wrist*1.05);
  d=smin(d,box(x,y,z,0,-palm.length*.55,0,palm.thick,palm.length*.5,palm.width,palm.thick*.7),.008);
  let digits=Infinity;
  fingers.forEach((finger,i)=>{let px=0,py=-palm.length,pz=finger.z,angle=0,fd=Infinity;const dirZ=finger.z*splay;
   for(let k=0;k<3;k++){angle+=curls[k];const L=finger.lengths[k],dx=Math.sin(angle)*L,dy=-Math.cos(angle)*L,qx=px+dx,qy=py+dy,qz=pz+dirZ*L*4,r0=finger.radius*(1-k*.14),r1=finger.radius*(1-(k+1)*.14);
    fd=smin(fd,cone(x,y,z,px,py,pz,qx,qy,qz,r0,r1),.0012);fd=smin(fd,sph(x,y,z,px,py,pz,r0*1.08),.001);
    if(k===2&&nails)fd=smin(fd,ell(x,y,z,qx-Math.cos(angle)*r1*.35-dx*.25,qy-dy*.25-Math.sin(angle)*r1*.0,qz,r1*.55,L*.28,r1*.75),.0008);
    px=qx;py=qy;pz=qz}
   fd=smin(fd,sph(x,y,z,px,py,pz,finger.radius*.86*.82),.001);digits=Math.min(digits,fd);
  });
  d=smin(d,digits,.003);
  let tx=thumb.base[0],ty=thumb.base[1],tz=thumb.base[2];for(const [L,r,dx,dy,dz] of thumb.segments){const qx=tx+dx*L,qy=ty+dy*L,qz=tz+dz*L;d=smin(d,cone(x,y,z,tx,ty,tz,qx,qy,qz,r,r*.86),.004);tx=qx;ty=qy;tz=qz}
  if(tendons)for(const finger of fingers)d=smin(d,cone(x,y,z,-palm.thick*.85,-.004,finger.z*.6,-palm.thick*.95,-palm.length*.92,finger.z,.0011,.0011),.0015);
  return d+noise(x*500,y*500,z*500)*.00012;
 };
}
const slenderFingers=[[.0126,.95],[.0042,1],[-.0042,.96],[-.0124,.80]].map(([z,s])=>({z,radius:.0033,lengths:[.034*s,.027*s,.021*s]}));
const slenderThumb={base:[.003,-.010,.013],segments:[[.026,.0042,.42,-.62,.66],[.020,.0034,.45,-.85,.30]]};
const slenderHandRelaxed=makeHand({palm:{length:.05,width:.0150,thick:.0062},fingers:slenderFingers,thumb:slenderThumb,curls:[.25,.35,.30],splay:.10,wrist:.0076,tendons:true,nails:true});
const slenderHandClaw=makeHand({palm:{length:.05,width:.0150,thick:.0062},fingers:slenderFingers,thumb:slenderThumb,curls:[.12,.34,.46],splay:.45,wrist:.0076,tendons:true,nails:true});
function trouser(r0,r1,length,crease,hem){return (x,y,z)=>{let d=cone(x,y,z,0,.010,0,0,-length,0,r0,r1);const t=clamp(-y/length,0,1);
 d-=crease*.0010*Math.max(0,1-Math.abs(x)/.004)*(z>0?1:0);
 if(hem)d-=.0009*Math.sin(Math.atan2(z,x)*4+2)*smooth(.86,1,t);
 return d+noise(x*150,y*150,z*150)*.0004}}
const slenderThigh=trouser(.0212,.0176,.29,1,false),slenderShin=trouser(.0174,.0154,.235,1,true);
function oxford(x,y,z){
 const ax=Math.abs(x);let d=ell(x,y,z,0,-.032,.018,.0165,.0165,.050);
 d=smin(d,ell(x,y,z,0,-.036,.058,.012,.012,.022),.012);
 d=smax(d,-(y+.0175),.006);
 d=smin(d,box(x,y,z,0,-.0465,.018,.0175,.0035,.054,.003),.002);
 d=smin(d,box(x,y,z,0,-.043,-.018,.0155,.007,.012,.003),.003);
 d=smax(d,-cone(x,y,z,0,-.02,-.004,0,.02,-.004,.0128,.0128),.004);
 for(let i=0;i<3;i++)d=smin(d,cone(ax,y,z,0,-.0185+.0003*i,.010+i*.008,.007,-.0185,.010+i*.008,.0008,.0008),.0008);
 return d;
}

// =====================================================================
// SURVIVORS (customisable explorers)
// =====================================================================
function survivorHead(female){
 const jaw=female?[.036,.022,.036]:[.042,.025,.040],chin=female?[.013,.010,.012]:[.017,.012,.014],brow=female?.005:.0072,neck=female?.025:.029;
 return (x,y,z)=>{
  const ax=Math.abs(x);
  let d=ell(x,y,z,0,.012,-.006,.054,.060,.058);
  d=smin(d,ell(x,y,z,0,-.016,.012,.045,.055,.048),.02);
  d=smin(d,ell(x,y,z,0,-.045,.010,...jaw),.015);
  d=smin(d,ell(x,y,z,0,-.060,.031,...chin),.012);
  d=smin(d,ell(ax,y,z,.030,-.004,.035,.013,.010,.011),.012);
  if(female)d=smin(d,ell(ax,y,z,.024,-.020,.038,.012,.011,.010),.012);
  d=smin(d,cone(ax,y,z,0,.019,.046,.028,.018+(female?.002:0),.042,brow,brow*.8),.010);
  d=smax(d,-ell(ax,y,z,.020,.008,.050,.0135,.010,.012),.006);
  // Eyelids: thin shells around the eyeballs with an open slit.
  const lid=Math.abs(len3(ax-.020,y-.008,z-.0435)-.0125)-.0017;d=smin(d,smax(smax(lid,.0050-Math.abs(y-.0072),.0015),.040-z,.002),.0022);
  // Nose: bridge, tip, wings and nostrils.
  d=smin(d,cone(x,y,z,0,.006,.050,0,-.020,.064,.0052,.0072),.006);
  d=smin(d,sph(x,y,z,0,-.022,.0625,female?.0075:.0086),.005);
  d=smin(d,sph(ax,y,z,.0085,-.0255,.0555,.0055),.004);
  d=smax(d,-sph(ax,y,z,.0046,-.0305,.0585,.0027),.0015);
  d=smax(d,-cone(x,y,z,-.016,-.0405,.0545,.016,-.0405,.0545,.0011,.0011),.0018);
  d=smax(d,-cone(x,y,z,0,-.030,.059,0,-.035,.058,.0016,.0016),.002);
  // Ears with a hollow bowl.
  d=smin(d,ell(ax,y,z,.055,-.002,-.002,.0075,.017,.012),.006);
  d=smax(d,-sph(ax,y,z,.0605,-.002,.001,.0055),.003);
  d=smin(d,cone(x,y,z,0,-.04,-.008,0,-.118,-.006,neck,neck*1.04),.015);
  if(!female)d=smin(d,sph(x,y,z,0,-.076,.021,.0055),.006);
  return d+noise(x*450,y*450,z*450)*.0002;
 };
}
const survivorEyes=(x,y,z)=>sph(Math.abs(x),y,z,.020,.008,.0435,.0115);
const survivorIrises=(x,y,z)=>ell(Math.abs(x),y,z,.020,.008,.0546,.0051,.0051,.0016);
const survivorBrows=female=>(x,y,z)=>cone(Math.abs(x),y,z,.0095,.0205,.0505,.031,.0225,.0455,female?.0019:.0025,female?.0012:.0018);
const survivorLips=female=>(x,y,z)=>{const s=female?1.12:1;return Math.min(ell(x,y,z,0,-.0372,.0536,.0112,.0026*s,.0045),ell(x,y,z,0,-.0436,.0530,.0102,.0032*s,.0045))};
const cranium=(x,y,z,grow)=>ell(x,y,z,0,.012,-.006,.054+grow,.060+grow,.058+grow);
function hairShort(x,y,z){const line=-.030+.088*smooth(-.01,.05,z)-.012*(1-smooth(.0,.03,Math.abs(x)-.035));let d=cranium(x,y,z,.0045)+noise(x*260,y*90,z*260)*.0016;return smax(d,line-y,.004)}
function hairBob(x,y,z){let d=smin(cranium(x,y,z,.010),ell(x,y,z,0,-.025,-.012,.064,.055,.060),.02)+noise(x*240,y*60,z*240)*.0018;d=smax(d,-.072-y,.006);
 d=smax(d,-box(x,y,z,0,-.024,.075,.041,.048,.05,.02),.006);return smin(d,smax(cranium(x,y,z,.006),.036-y+.018*smooth(.03,.06,z),.004),.003)}
function hairLong(x,y,z){let d=smin(cranium(x,y,z,.009),ell(x,y,z,0,-.085,-.040,.056,.105,.030),.03)+noise(x*300,y*40,z*300)*.0022;d=smax(d,-.19-y,.01);
 d=smax(d,-box(x,y,z,0,-.03,.076,.040,.052,.05,.02),.006);d=smax(d,-cone(x,y,z,0,-.075,.01,0,-.2,.02,.031,.034),.006);return d}
function hood(x,y,z){const outer=smin(cranium(x,y,z,.017),ell(x,y,z,0,-.075,-.022,.070,.060,.065),.03),inner=smin(cranium(x,y,z,.007),cone(x,y,z,0,-.04,-.008,0,-.14,-.006,.034,.034),.02);
 let d=smax(outer,-inner,.003);d=smax(d,-ell(x,y,z,0,-.020,.085,.046,.060,.050),.006);d=smax(d,-.135-y,.006);
 const rim=Math.abs(ell(x,y,z,0,-.020,.085,.046,.060,.050))-.004;d=smin(d,smax(rim,outer-.002,.002),.004);return d+noise(x*120,y*120,z*120)*.0007}
function survivorTorso(female,padded){
 const W=profile(female?[[-.04,.104],[0,.100],[.08,.088],[.17,.100],[.245,.108],[.285,.07],[.31,.04]]:[[-.04,.102],[0,.100],[.08,.096],[.17,.107],[.245,.113],[.285,.072],[.31,.04]]);
 const D=profile([[-.04,.066],[0,.064],[.08,.062],[.17,.068],[.245,.060],[.285,.050],[.31,.04]]),body=loft(W,D,2.2),front=frontOf(W,D,2.2);
 return {front,sdf:(x,y,z)=>{
  const ax=Math.abs(x);let d=body(x,y,z)-(padded?.005:0);
  d=smax(d,-.042-y,.006);d=smax(d,y-.33,.006);
  d=smin(d,cone(ax,y,z,0,.258,-.006,.094,.258,-.006,.034,.034),.03);
  if(female)d=smin(d,ell(ax,y,z,.038,.172,.044,.034,.030,.026),.022);
  d=smin(d,smax(cone(x,y,z,0,.282,-.002,0,.33,-.002,.047,.045),-Math.max(Math.abs(x)-.006,-z),.002),.01);
  d=smax(d,-cone(x,y,z,0,.27,0,0,.36,0,.031,.031),.004);
  d=smax(d,-Math.max(Math.abs(x)-.0012,-z,Math.abs(z-front(0,y))-.004),.0015);
  for(const s of [-1,1])d=smax(d,-Math.max(Math.abs(x-s*.008)-.0006,Math.abs(z-front(.008,y))-.0012),.0008);
  if(padded){const band=Math.abs(Math.sin((y+.01)*Math.PI/.034));d-=.0035*Math.pow(band,.6)}
  else{
   for(const s of [-1,1]){d=smin(d,box(x,y,z,s*.050,.185,front(.05,.185)+.001,.024,.006,.003,.0015),.0015);d=smin(d,box(x,y,z,s*.050,.160,front(.05,.16)-.0008,.022,.022,.002,.0015),.002);
    d=smin(d,box(x,y,z,s*.060,.055,front(.06,.055)+.0012,.028,.007,.003,.0015),.0015);d=smin(d,box(x,y,z,s*.060,.030,front(.06,.03)-.0005,.026,.026,.0022,.0015),.002);}
  }
  d+=.0012*Math.sin(y*150+Math.sin(x*70)*2.5)*smooth(.04,.08,y)*(1-smooth(.12,.16,y))*smooth(.06,.09,ax);
  return d+noise(x*110,y*110,z*110)*.0006;
 }};
}
function survivorZip(front){return (x,y,z)=>{let d=Math.max(Math.abs(x)-.0026,Math.abs(z-(front(0,y)+.0012))-.0014,-.038-y,y-.32);d=Math.min(d,box(x,y,z,0,.296,front(0,.296)+.004,.0028,.008,.0016,.001));return d}}
function survivorVest(front){const W=profile([[.03,.110],[.17,.116],[.25,.118],[.29,.08]]),D=profile([[.03,.072],[.17,.078],[.25,.070],[.29,.055]]),body=loft(W,D,2.2);
 return (x,y,z)=>{const ax=Math.abs(x);let d=smax(body(x,y,z),-body(x,y,z)-.007,.002);d=smax(d,Math.max(.035-y,y-.29),.004);d=smax(d,-cone(x,y,z,0,.25,0,0,.36,0,.05,.05),.006);
  d=smax(d,-box(ax,y,z,.118,.16,0,.02,.06,.03,.01),.006);
  for(const [px,py,w,h] of [[.045,.13,.024,.03],[.045,.075,.024,.025],[.0,.215,.02,.018]])d=smin(d,box(ax,y,z,px,py,front(px,py)+.012,w,h,.009,.003),.002);
  for(const py of [.10,.16,.22])d=smin(d,box(x,y,z,0,py,-front(0,py)-.008,.07,.003,.002,.001),.001);
  return d}}
function backpack(x,y,z){const ax=Math.abs(x);let d=box(x,y,z,0,.175,-.112,.074,.098,.038,.02);
 d=smin(d,box(x,y,z,0,.12,-.153,.06,.042,.014,.012),.006);d=smin(d,box(ax,y,z,.064,.15,-.11,.012,.05,.02,.008),.004);
 d=smax(d,-box(x,y,z,0,.205,-.151,.07,.0012,.004),.001);d=smax(d,-box(x,y,z,0,.162,-.168,.055,.0012,.004),.001);
 d=smin(d,smax(len2(len2(x,y-.275)-.022,z+.10)-.004,-(y-.27),.002),.004);
 for(const s of [-1,1]){const sx=s*.056;const strap=Math.min(cone(x,y,z,sx,.27,-.085,sx,.30,-.02,.007,.007),cone(x,y,z,sx,.30,-.02,sx,.288,.062,.007,.007),cone(x,y,z,sx,.288,.062,sx*1.15,.115,.084,.007,.0065));d=smin(d,strap,.004);}
 return d+noise(x*120,y*120,z*120)*.0006}
const coatSleeve=(r0,r1,length,cuff)=>(x,y,z)=>{let d=cone(x,y,z,0,.012,0,0,-length,0,r0,r1);const t=clamp(-y/length,0,1);
 d-=.0016*Math.sin(Math.atan2(z,x)*3+t*16)*smooth(.65,.95,t);if(cuff)d-=.0012*Math.abs(Math.sin(y*900))*smooth(.86,.9,t);return d+noise(x*130,y*130,z*130)*.0006};
const survivorFingers=[[.0138,.92],[.0046,1],[-.0046,.95],[-.0136,.78]].map(([z,s])=>({z,radius:.0041,lengths:[.019*s,.014*s,.011*s]}));
const survivorHand=makeHand({palm:{length:.040,width:.0170,thick:.0085},fingers:survivorFingers,thumb:{base:[.004,-.008,.015],segments:[[.018,.0058,.42,-.62,.66],[.014,.0050,.45,-.85,.30]]},curls:[.22,.30,.25],splay:.08,wrist:.0105,tendons:false,nails:true});
function pelvis(x,y,z){return smin(box(x,y,z,0,0,0,.074,.034,.050,.03),cone(Math.abs(x),y,z,.045,-.02,0,.051,-.05,0,.032,.031),.016)+noise(x*120,y*120,z*120)*.0005}
const pants=(r0,r1,length)=>(x,y,z)=>{let d=cone(x,y,z,0,.012,0,0,-length,0,r0,r1);const t=clamp(-y/length,0,1);d-=.0014*Math.sin(Math.atan2(z,x)*3+t*13)*smooth(.75,1,t);d-=.0009*Math.max(0,1-Math.abs(Math.atan2(x,-z))*3);return d+noise(x*120,y*120,z*120)*.0007};
function hikingBoot(x,y,z){const ax=Math.abs(x);let d=cone(x,y,z,0,.045,-.004,0,-.015,-.002,.030,.031);
 d=smin(d,ell(x,y,z,0,-.016,.030,.0305,.022,.056),.015);d=smin(d,ell(x,y,z,0,-.020,.070,.026,.017,.024),.012);
 d=smax(d,-(y+.031),.004);
 d=smin(d,box(x,y,z,0,-.034,.028,.033,.006,.064,.004),.003);
 d=smax(d,-Math.max(Math.abs(Math.sin(z*260))*.003-.0012,-(y+.037)),.0006);
 for(let i=0;i<5;i++)d=smin(d,cone(ax,y,z,0,.012-i*.009,.026+i*.004,.014,.012-i*.009,.022+i*.004,.0013,.0013),.001);
 d=smin(d,len2(len2(x,z+.004)-.0305,y-.045)-.0045,.004);
 return d+noise(x*160,y*160,z*160)*.0005}
// First-person flashlight along +Y, the gripping hand and the lens.
function flashlightBody(x,y,z){const r=len2(x,z),a=Math.atan2(z,x);let d=Math.max(r-.0172,-y,y-.085);
 d-=.0007*Math.max(0,Math.sin(a*18))*Math.max(0,Math.sin(y*700))*smooth(.012,.016,y)*(1-smooth(.058,.062,y));
 d=smin(d,cone(x,y,z,0,.08,0,0,.112,0,.019,.0275),.006);d=smax(d,-Math.max(r-.0215,.106-y),.001);
 d=smin(d,Math.max(r-.018,Math.abs(y+.004)-.005)-.001,.002);d=smin(d,box(x,y,z,.0175,.07,0,.004,.007,.005,.002),.002);return d}
const flashlightLens=(x,y,z)=>Math.max(len2(x,z)-.0212,Math.abs(y-.1075)-.0012);
function gripHand(x,y,z){const r=len2(x,z),a=Math.atan2(z,x);let d=Infinity;
 d=smin(d,box(x,y,z,.004,.034,.026,.020,.026,.008,.007),.01);
 let digits=Infinity;for(let i=0;i<4;i++){const yy=.060-i*.0128,rad=.0058-i*.0003,ring=.0172+rad*.9,torus=len2(r-ring,y-yy)-rad,lo=-1.25+i*.06,hi=1.65,excess=a<lo?lo-a:a>hi?a-hi:0,mask=excess>0?excess*ring:-Math.min(a-lo,hi-a)*ring;
  digits=Math.min(digits,smin(Math.max(torus,mask),sph(x,y,z,Math.cos(lo)*ring,yy,Math.sin(lo)*ring,rad*.95),.002))}
 d=smin(d,digits,.004);
 d=smin(d,cone(x,y,z,-.012,.022,.020,-.022,.050,.004,.0068,.006),.004);d=smin(d,cone(x,y,z,-.022,.050,.004,-.020,.068,-.008,.006,.005),.003);
 d=smin(d,cone(x,y,z,.004,.014,.030,.006,-.05,.036,.016,.019),.012);return d+noise(x*400,y*400,z*400)*.0002}

// =====================================================================
const parts=[
 // name, sdf, bounds lo, hi, cell size, preview colour, occlusion reach, optional shared occlusion field
 ['slender_head',slenderHead,[-.062,-.095,-.072],[.062,.085,.075],.0019,[.82,.83,.83],.012],
 ['slender_jacket',slenderJacket,[-.095,-.11,-.065],[.095,.30,.065],.0027,[.03,.03,.035],.016],
 ['slender_shirt',slenderShirt,[-.05,.03,-.03],[.05,.29,.065],.0012,[.8,.81,.8],.006,(x,y,z)=>Math.min(slenderShirt(x,y,z),slenderJacket(x,y,z))],
 ['slender_tie',slenderTie,[-.02,.04,0],[.02,.265,.065],.0012,[.02,.02,.025],.004,(x,y,z)=>Math.min(slenderTie(x,y,z),slenderJacket(x,y,z),slenderShirt(x,y,z))],
 ['slender_upper_arm',slenderUpper,[-.024,-.27,-.024],[.024,.03,.024],.0021,[.03,.03,.035],.008],
 ['slender_forearm',slenderFore,[-.021,-.25,-.021],[.021,.03,.021],.0019,[.03,.03,.035],.008],
 ['slender_cuff',slenderCuff,[-.016,-.25,-.016],[.016,-.222,.016],.0009,[.8,.81,.8],.003],
 ['slender_hand_relaxed',slenderHandRelaxed,[-.025,-.165,-.03],[.045,.022,.04],.00085,[.71,.72,.73],.006],
 ['slender_hand_claw',slenderHandClaw,[-.025,-.165,-.045],[.045,.022,.055],.00085,[.71,.72,.73],.006],
 ['slender_thigh',slenderThigh,[-.026,-.31,-.026],[.026,.035,.026],.0024,[.03,.03,.035],.008],
 ['slender_shin',slenderShin,[-.022,-.255,-.022],[.022,.03,.022],.0022,[.03,.03,.035],.008],
 ['slender_shoe',oxford,[-.024,-.056,-.04],[.024,.006,.086],.0013,[.015,.015,.016],.008],
];
for(const female of [false,true]){
 const tag=female?'f':'m',head=survivorHead(female),face=(x,y,z)=>Math.min(head(x,y,z),survivorEyes(x,y,z));
 parts.push([`survivor_head_${tag}`,head,[-.072,-.13,-.075],[.072,.085,.082],.0019,[.89,.69,.55],.014,face]);
 parts.push([`survivor_brows_${tag}`,survivorBrows(female),[-.04,.012,.035],[.04,.03,.058],.0007,[.1,.06,.04],.003,(x,y,z)=>Math.min(head(x,y,z),survivorBrows(female)(x,y,z))]);
 parts.push([`survivor_lips_${tag}`,survivorLips(female),[-.02,-.052,.044],[.02,-.03,.064],.0007,[.65,.35,.32],.003,(x,y,z)=>Math.min(head(x,y,z),survivorLips(female)(x,y,z))]);
 for(const padded of [false,true]){const torso=survivorTorso(female,padded);parts.push([`survivor_torso_${padded?'padded':'field'}_${tag}`,torso.sdf,[-.165,-.06,-.105],[.165,.345,.105],.0034,[.3,.45,.36],.02]);
  if(!padded){parts.push([`survivor_zip_${tag}`,survivorZip(torso.front),[-.01,-.045,-.01],[.01,.325,.09],.0011,[.45,.45,.42],.004,(x,y,z)=>Math.min(torso.sdf(x,y,z),survivorZip(torso.front)(x,y,z))]);
   parts.push([`survivor_vest_${tag}`,survivorVest(torso.front),[-.14,.02,-.105],[.14,.30,.11],.0032,[.1,.15,.12],.012,(x,y,z)=>Math.min(torso.sdf(x,y,z),survivorVest(torso.front)(x,y,z))]);}}
}
parts.push(
 ['survivor_eyes',survivorEyes,[-.035,-.006,.028],[.035,.022,.058],.0008,[.85,.84,.80],.006,(x,y,z)=>Math.min(survivorEyes(x,y,z),survivorHead(false)(x,y,z))],
 ['survivor_irises',survivorIrises,[-.03,0,.050],[.03,.016,.058],.00045,[.18,.22,.18],.002],
 ['survivor_hair_short',hairShort,[-.07,-.04,-.075],[.07,.085,.07],.0019,[.08,.05,.03],.01],
 ['survivor_hair_bob',hairBob,[-.08,-.09,-.085],[.08,.09,.08],.002,[.08,.05,.03],.012],
 ['survivor_hair_long',hairLong,[-.075,-.205,-.085],[.075,.085,.075],.0021,[.08,.05,.03],.012],
 ['survivor_hood',hood,[-.095,-.15,-.10],[.095,.098,.10],.0024,[.3,.45,.36],.014],
 ['survivor_backpack',backpack,[-.095,.05,-.18],[.095,.32,.09],.003,[.11,.14,.12],.014],
 ['survivor_pelvis',pelvis,[-.13,-.1,-.1],[.13,.08,.1],.0034,[.08,.1,.12],.012],
 ['survivor_upper_arm',coatSleeve(.0365,.0305,.135,false),[-.045,-.155,-.045],[.045,.055,.045],.0026,[.3,.45,.36],.01],
 ['survivor_forearm',coatSleeve(.030,.0255,.137,true),[-.038,-.155,-.038],[.038,.048,.038],.0023,[.3,.45,.36],.008],
 ['survivor_hand',survivorHand,[-.025,-.11,-.03],[.04,.026,.045],.0007,[.89,.69,.55],.006],
 ['survivor_thigh',pants(.0405,.0335,.205),[-.05,-.225,-.05],[.05,.06,.05],.0028,[.08,.1,.12],.01],
 ['survivor_shin',pants(.0335,.027,.21),[-.042,-.23,-.042],[.042,.052,.042],.0026,[.08,.1,.12],.01],
 ['survivor_boot',hikingBoot,[-.042,-.046,-.045],[.042,.056,.1],.0019,[.06,.05,.04],.01],
 ['fp_flashlight',flashlightBody,[-.03,-.014,-.03],[.035,.118,.03],.0011,[.1,.11,.12],.006],
 ['fp_lens',flashlightLens,[-.024,.104,-.024],[.024,.111,.024],.0008,[.9,.9,.85],.002],
 ['fp_hand',gripHand,[-.03,-.05,-.045],[.075,.085,.035],.0012,[.89,.69,.55],.008],
);
const started=Date.now(),built=[];let total=0;
const only=process.env.BUILD_ONLY?process.env.BUILD_ONLY.split(","):null;
parts.forEach(([name,sdf,lo,hi,h,color,reach,env],i)=>{
 if(only&&!only.includes(name))return;
 if(process.env.INSPECT){const raw=surfaceNet(sdf,lo,hi,h);console.log(name,"raw",JSON.stringify(inspect(raw,sdf,h)),"simplified",JSON.stringify(inspect(finish(simplify(raw,BUDGET[name]||3000),sdf,h),sdf,h)));return}
 const mesh=bakeOcclusion(finish(simplify(surfaceNet(sdf,lo,hi,h),BUDGET[name]||3000),sdf,h),env||sdf,reach);mesh.name=name;mesh.color=color;mesh.show=[(i%8)*.22-.77,Math.floor(i/8)*-.3,0];built.push(mesh);
 const bytes=mesh.positions.byteLength*2+mesh.colors.byteLength+mesh.indices.byteLength;total+=bytes;
 console.log(name.padEnd(26),String(mesh.positions.length/3).padStart(6),'verts',String(mesh.indices.length/3).padStart(7),'tris',(bytes/1024).toFixed(0).padStart(5),'KB');
});
if(only||process.env.INSPECT){console.log("Partial or inspection run: model file not written.");process.exit(0)}
const out=path.join(__dirname,'..','assets','models','characters.glb');writeGlb(built,out);
console.log(`Wrote ${path.relative(process.cwd(),out)} (${(fs.statSync(out).size/1048576).toFixed(2)} MB) in ${((Date.now()-started)/1000).toFixed(1)} s`);
