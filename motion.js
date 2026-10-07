/* Movement-driven gait and a wall-safe camera. Saved runs need no migration. */
function updateLocomotion(entity,before,dt,runningHint=false,isEnemy=false){
 const traveled=Math.hypot(entity.x-before.x,entity.y-before.y);
 const moving=dt>0&&traveled>.0001;
 entity.motion=moving?1:0;
 entity.running=moving&&(isEnemy?runningHint:traveled/dt>3.2);
 entity.gaitPhase=entity.gaitPhase||0;
 if(moving){const cycle=isEnemy?(entity.running?1.35:1.7):(entity.running?2.1:1.7);entity.gaitPhase=(entity.gaitPhase+traveled*Math.PI*2/cycle)%(Math.PI*2);entity.moveAngle=Math.atan2(entity.y-before.y,entity.x-before.x)}
 return traveled;
}
function getCameraPose(){
 const player=world.player,angle=player.angle||0;
 if(cameraMode!=='third')return {...player,height:.5,horizonRatio:.5,distance:0};
 let behind=0;
 // Sweep the entire boom: a camera must never pass through a corner or wall.
 for(let d=.04;d<=1.6;d+=.04){const x=player.x-Math.cos(angle)*d,y=player.y-Math.sin(angle)*d;if(!valid(x,y))break;behind=d}
 return {x:player.x-Math.cos(angle)*behind,y:player.y-Math.sin(angle)*behind,angle,height:.62,horizonRatio:.43,distance:behind};
}
function setCameraMode(value){
 cameraMode=value==='third'?'third':'first';
 $('cameraView').value=cameraMode;$('cameraSetting').value=cameraMode;
 persist();
}
