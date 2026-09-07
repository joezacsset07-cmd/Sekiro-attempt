import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const C={speed:5.5,attackRange:2.6,attackTime:.34,attackImpact:.13,dodgeSpeed:13,dodgeTime:.28,deflectWindow:.18,blockPosture:16,deflectPosture:30,enemyDamage:15,enemyPosture:13,maxHP:100,maxPosture:100};
let scene,camera,renderer,player,boss,clock,running=false,keys={},pressed={},mouseGuard=false,shake=0,hitStop=0;

const ui={bossHP:document.querySelector('#boss-hp>div'),bossPosture:document.querySelector('#boss-posture'),playerHP:document.querySelector('#player-hp'),playerPosture:document.querySelector('#player-posture'),prompt:document.querySelector('#prompt'),start:document.querySelector('#start'),screen:document.querySelector('#start-screen')};

function mat(color,metal=0,rough=.75){return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough})}
function fighter(color,accent,blade){
 const g=new THREE.Group();const body=mat(color), acc=mat(accent,.15,.65), steel=mat(blade,.85,.22);
 const pelvis=new THREE.Mesh(new THREE.BoxGeometry(.62,.34,.42),acc);pelvis.position.y=.95;g.add(pelvis);
 const torso=new THREE.Mesh(new THREE.CylinderGeometry(.34,.28,.85,10),body);torso.position.y=1.42;g.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.24,16,12),body);head.position.y=2.08;g.add(head);
 for(const x of [-.18,.18]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.9,8),body);leg.position.set(x,.45,0);g.add(leg)}
 const shoulder=new THREE.Group();shoulder.position.set(.42,1.7,0);g.add(shoulder);
 const arm=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.62,8),body);arm.position.y=-.28;shoulder.add(arm);
 const sword=new THREE.Group();sword.position.y=-.62;shoulder.add(sword);
 const bladeMesh=new THREE.Mesh(new THREE.BoxGeometry(.07,1.12,.035),steel);bladeMesh.position.y=.62;sword.add(bladeMesh);
 const guard=new THREE.Mesh(new THREE.BoxGeometry(.22,.045,.055),acc);guard.position.y=.08;sword.add(guard);
 const hilt=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.24,8),mat(0x171214));hilt.position.y=-.04;sword.add(hilt);
 g.userData={torso,head,shoulder,sword,blade:bladeMesh};return g;
}

class Combatant{constructor(g,isBoss=false){this.group=g;this.isBoss=isBoss;this.hp=C.maxHP;this.posture=C.maxPosture;this.state='idle';this.timer=0;this.attackResolved=false;this.guard=false;this.iframe=false;this.cooldown=0;this.attackKind='slash';this.aiTimer=0;this.aiWindup=0;this.deflectable=false}}

function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x100b12);scene.fog=new THREE.Fog(0x100b12,12,42);
 camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,100);renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.querySelector('#game').appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0x8894bd,0x251a15,1));const sun=new THREE.DirectionalLight(0xffc48c,2);sun.position.set(7,12,6);sun.castShadow=true;scene.add(sun);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(18,64),mat(0x24201d));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 for(let i=0;i<20;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(1.5+Math.random()*3,3+Math.random()*7,5),mat(0x16121a));const a=Math.random()*Math.PI*2,r=16+Math.random()*13;m.position.set(Math.cos(a)*r,(m.geometry.parameters.height/2)-.4,Math.sin(a)*r);scene.add(m)}
 player=new Combatant(fighter(0x4b4038,0x17151a,0xd9d6c8));boss=new Combatant(fighter(0x19171c,0x5a2220,0xeee5cc),true);player.group.position.set(0,0,3);boss.group.position.set(0,0,-2.5);scene.add(player.group,boss.group);clock=new THREE.Clock();updateUI();addEvents();requestAnimationFrame(loop);
}
function addEvents(){
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
 addEventListener('keydown',e=>{if(!keys[e.key.toLowerCase()])pressed[e.key.toLowerCase()]=true;keys[e.key.toLowerCase()]=true});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
 addEventListener('mousedown',e=>{if(e.button===0)pressed.mouse0=true;if(e.button===2)mouseGuard=true});addEventListener('mouseup',e=>{if(e.button===2)mouseGuard=false});addEventListener('contextmenu',e=>e.preventDefault());
 ui.start.onclick=()=>{ui.screen.classList.add('hidden');running=true;try{new AudioContext().resume()}catch{}};
}
function face(a,b){const dx=b.x-a.x,dz=b.z-a.z;a.rotation.y=Math.atan2(dx,dz)}
function popup(text){const p=document.createElement('div');p.className='popup';p.textContent=text;document.querySelector('#hud').appendChild(p);setTimeout(()=>p.remove(),800)}
function flash(){shake=Math.max(shake,.35);hitStop=.055}
function damage(target,hp,posture){target.hp=Math.max(0,target.hp-hp);target.posture=Math.min(target.maxPosture,target.posture+posture);target.lastPosture=performance.now();flash();if(target.hp<=0)die(target)}
function die(target){target.state='dead';target.group.userData.torso.rotation.x=.8;if(target===boss){popup('DEATHBLOW');setTimeout(()=>{running=false;ui.prompt.textContent='VICTORY';ui.prompt.style.opacity=1},300)}else{running=false;ui.prompt.textContent='YOU DIED';ui.prompt.style.opacity=1}}
function deflect(){boss.posture=Math.min(boss.maxPosture,boss.posture+C.deflectPosture);boss.state='stagger';boss.timer=.22;player.posture=Math.max(0,player.posture-5);popup('DEFLECT');flash()}
function playerAttack(){if(player.state!=='idle'||player.guard)return;player.state='attack';player.timer=0;player.attackResolved=false;face(player.group,boss.group)}
function dodge(){if(player.state!=='idle'||player.cooldown>0)return;let d=new THREE.Vector3();if(keys.w)d.z=-1;if(keys.s)d.z=1;if(keys.a)d.x=-1;if(keys.d)d.x=1;if(!d.lengthSq())d.z=1;d.normalize();player.dodgeDir=d;player.state='dodge';player.timer=0;player.iframe=true;player.cooldown=.4}
function playerUpdate(dt){
 player.guard=keys.k||mouseGuard;
 if(pressed.mouse0||pressed.j)playerAttack();if(pressed.shift||pressed.l)dodge();
 if(player.state==='attack'){player.timer+=dt;if(!player.attackResolved&&player.timer>=C.attackImpact){player.attackResolved=true;const d=player.group.position.distanceTo(boss.group.position);if(d<C.attackRange&&boss.state!=='dead'){damage(boss,9,11);popup('HIT');}}if(player.timer>=C.attackTime)player.state='idle'}
 else if(player.state==='dodge'){player.timer+=dt;player.group.position.addScaledVector(player.dodgeDir,C.dodgeSpeed*dt);if(player.timer>=C.dodgeTime){player.state='idle';player.iframe=false}}
 else{let v=new THREE.Vector3();if(keys.w)v.z-=1;if(keys.s)v.z+=1;if(keys.a)v.x-=1;if(keys.d)v.x+=1;if(v.lengthSq()){v.normalize();player.group.position.addScaledVector(v,C.speed*dt);player.state='move'}else player.state='idle'}
 player.cooldown=Math.max(0,player.cooldown-dt);face(player.group,boss.group.position);regen(player,dt);
}
function regen(x,dt){if(performance.now()-(x.lastPosture||0)>1100)x.posture=Math.max(0,x.posture-(8+4*x.hp/C.maxHP)*dt)}
function bossUpdate(dt){if(boss.state==='dead')return;face(boss.group,player.group.position);const d=boss.group.position.distanceTo(player.group.position);
 if(boss.state==='stagger'){boss.timer-=dt;if(boss.timer<=0)boss.state='idle';return}
 if(boss.state==='attack'){boss.timer+=dt;if(boss.timer>=boss.aiWindup){const blocked=player.guard&&!player.iframe;if(player.iframe){popup('DODGE');}else if(blocked){deflect()}else damage(player,C.enemyDamage,C.blockPosture);boss.state='recover';boss.timer=0}return}
 if(d>2.5){boss.group.position.z+=(player.group.position.z-boss.group.position.z)/d*2.8*dt;boss.group.position.x+=(player.group.position.x-boss.group.position.x)/d*2.8*dt;return}
 boss.aiTimer-=dt;if(boss.aiTimer<=0){boss.state='attack';boss.timer=0;boss.aiWindup=.5+Math.random()*.35;boss.deflectable=true;boss.aiTimer=1.3+Math.random()*.7;popup(Math.random()<.25?'DANGER':'')}
}
function updateModels(t){
 for(const x of [player,boss]){const p=x.group.userData;const moving=x.state==='move';p.torso.rotation.x=moving?Math.sin(t*10)*.05:0;p.torso.rotation.z=x.state==='stagger'?-.18:0;p.shoulder.rotation.z=x.state==='attack'?-1.2:0;p.sword.rotation.z=x.state==='attack'?-1.8:(x.guard?.6:0);if(x.state==='dodge')x.group.rotation.z=.25*Math.sin(x.timer*20)}
}
function updateUI(){ui.bossHP.style.width=`${boss.hp/C.maxHP*100}%`;ui.bossPosture.style.width=`${boss.posture/boss.maxPosture*100}%`;ui.playerHP.style.width=`${player.hp/C.maxHP*100}%`;ui.playerPosture.style.width=`${player.posture/C.maxPosture*100}%`;ui.prompt.style.opacity=boss.posture>=boss.maxPosture*.98?'1':'0';if(boss.posture>=boss.maxPosture*.98)ui.prompt.textContent='DEATHBLOW READY — F' }
function loop(){requestAnimationFrame(loop);let dt=Math.min(clock.getDelta(),.033);if(!running){renderer.render(scene,camera);return}if(hitStop>0){hitStop-=dt;dt*=.12}playerUpdate(dt);bossUpdate(dt);if(pressed.f&&boss.posture>=boss.maxPosture*.98&&player.group.position.distanceTo(boss.group.position)<3)die(boss);updateUI();updateModels(performance.now()/1000);const focus=player.group.position.clone().lerp(boss.group.position,.35);const off=new THREE.Vector3(0,3.2,6.5);camera.position.lerp(focus.clone().add(off),.08);camera.lookAt(focus.clone().add(new THREE.Vector3(0,1,0)));if(shake>0){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;shake*=.88}renderer.render(scene,camera);pressed={}}

init();
