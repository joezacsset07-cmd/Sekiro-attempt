import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const C={speed:5.2,attackRange:2.72,attackTime:.52,attackImpact:.2,dodgeSpeed:11,dodgeTime:.4,dodgeIFrames:.26,deflectWindow:.22,blockPosture:17,deflectPosture:27,enemyDamage:14,enemyPosture:18,maxHP:100,maxPosture:100,postureRegenDelay:1.05};
let scene,camera,renderer,player,boss,clock,running=false,keys={},pressed={},mouseGuard=false,shake=0,hitStop=0,gameEnded=false;
const effects=[];
const ui={bossHP:document.querySelector('#boss-hp>div'),bossPosture:document.querySelector('#boss-posture'),playerHP:document.querySelector('#player-hp'),playerPosture:document.querySelector('#player-posture'),prompt:document.querySelector('#prompt'),promptSmall:document.querySelector('#prompt-small'),callout:document.querySelector('#combat-callout'),calloutTitle:document.querySelector('#combat-callout-title'),calloutSub:document.querySelector('#combat-callout-sub'),start:document.querySelector('#start'),screen:document.querySelector('#start-screen'),eyebrow:document.querySelector('.eyebrow'),title:document.querySelector('.panel h1'),description:document.querySelector('.panel p'),controls:document.querySelector('.panel-note'),playerLabel:document.querySelector('#player-label')};

function mat(color,metal=0,rough=.75,extra={}){return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough,...extra});}

let characterTextures=null;
function getCharacterTextures(){
  if(characterTextures)return characterTextures;
  function canvasTexture(kind){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const ctx=canvas.getContext('2d');
    const base=kind==='cloth'?'#d1d1d1':kind==='skin'?'#dedede':'#d0d0d0';
    ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
    if(kind==='cloth'){
      for(let y=0;y<256;y+=4){ctx.fillStyle=y%8===0?'rgba(35,35,35,.19)':'rgba(255,255,255,.16)';ctx.fillRect(0,y,256,1);}
      for(let x=0;x<256;x+=4){ctx.fillStyle=x%8===0?'rgba(28,28,28,.16)':'rgba(255,255,255,.13)';ctx.fillRect(x,0,1,256);}
      for(let i=0;i<480;i++){ctx.fillStyle=Math.random()>.5?'rgba(20,20,20,.10)':'rgba(255,255,255,.12)';ctx.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*3,1);}
      ctx.strokeStyle='rgba(20,20,20,.12)';ctx.lineWidth=2;
      for(let y=12;y<256;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
    }else if(kind==='skin'){
      for(let i=0;i<180;i++){const x=Math.random()*256,y=Math.random()*256,r=1+Math.random()*8;ctx.fillStyle=Math.random()>.45?'rgba(70,70,70,.035)':'rgba(255,255,255,.12)';ctx.beginPath();ctx.ellipse(x,y,r,r*(.5+Math.random()),0,0,Math.PI*2);ctx.fill();}
      for(let i=0;i<250;i++){ctx.fillStyle='rgba(60,60,60,.12)';ctx.fillRect(Math.random()*256,Math.random()*256,1,1);}
    }else{
      for(let y=0;y<256;y+=6){ctx.fillStyle=y%12===0?'rgba(35,35,35,.14)':'rgba(255,255,255,.13)';ctx.fillRect(0,y,256,1);}
      for(let i=0;i<170;i++){ctx.strokeStyle=Math.random()>.5?'rgba(35,35,35,.22)':'rgba(255,255,255,.28)';ctx.lineWidth=Math.random()>.8?2:1;const x=Math.random()*256,y=Math.random()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+Math.random()*17,y-1+Math.random()*3);ctx.stroke();}
      for(let i=0;i<24;i++){ctx.fillStyle='rgba(50,50,50,.10)';ctx.fillRect(Math.random()*256,Math.random()*256,2+Math.random()*8,2+Math.random()*4);}
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;return texture;
  }
  characterTextures={cloth:canvasTexture('cloth'),skin:canvasTexture('skin'),metal:canvasTexture('metal')};
  return characterTextures;
}
function fighter(color,accent,blade,isBoss=false){
  const g=new THREE.Group(),tex=getCharacterTextures();
  const fabric=mat(color,.02,.96,{map:tex.cloth,bumpMap:tex.cloth,bumpScale:.018});
  const darkFabric=mat(isBoss?0x21191d:0x171a20,.04,.98,{map:tex.cloth,bumpMap:tex.cloth,bumpScale:.012});
  const skin=mat(isBoss?0x76564c:0xb77e5c,0,.84,{map:tex.skin,bumpMap:tex.skin,bumpScale:.008});
  const armor=mat(accent,.45,.55,{map:tex.metal,bumpMap:tex.metal,bumpScale:.022});
  const steel=mat(blade,.88,.24,{map:tex.metal,bumpMap:tex.metal,bumpScale:.012,emissive:0x18100c,emissiveIntensity:.12});
  const leather=mat(isBoss?0x3c171c:0x30241f,.05,.9,{map:tex.cloth,bumpMap:tex.cloth,bumpScale:.018});
  const cord=mat(isBoss?0x9b3832:0xb18a51,.25,.48,{map:tex.metal});
  const b={all:[],isBoss};
  function part(parent,geo,m,pos,rot,scale){
    const o=new THREE.Mesh(geo,m);if(pos)o.position.set(pos[0],pos[1],pos[2]);if(rot)o.rotation.set(rot[0],rot[1],rot[2]);if(scale)o.scale.set(scale[0],scale[1],scale[2]);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  function pivot(parent,x,y,z=0){const o=new THREE.Group();o.position.set(x,y,z);parent.add(o);b.all.push(o);return o;}
  function sphere(parent,m,pos,scale,rot){return part(parent,new THREE.SphereGeometry(1,18,14),m,pos,rot,scale);}
  function box(parent,m,pos,size,rot){return part(parent,new THREE.BoxGeometry(size[0],size[1],size[2]),m,pos,rot);}
  function ring(parent,m,pos,r,t,rot,scale){return part(parent,new THREE.TorusGeometry(r,t,8,24),m,pos,rot,scale);}

  // Feet and layered lower-leg protection.
  b.leftLeg=pivot(g,-.19,.86);b.rightLeg=pivot(g,.19,.86);
  for(const leg of [b.leftLeg,b.rightLeg]){
    part(leg,new THREE.CylinderGeometry(.13,.155,.48,12),fabric,[0,-.23,0]);
    sphere(leg,leather,[0,-.11,0],[.14,.20,.145]);
  }
  b.leftKnee=pivot(b.leftLeg,0,-.43);b.rightKnee=pivot(b.rightLeg,0,-.43);
  for(const knee of [b.leftKnee,b.rightKnee]){
    part(knee,new THREE.CylinderGeometry(.095,.115,.39,10),fabric,[0,-.19,0]);
    sphere(knee,armor,[0,-.18,.105],[.105,.22,.055]);
    box(knee,leather,[0,-.14,.152],[.22,.035,.018]);
    box(knee,leather,[0,-.28,.151],[.20,.035,.018]);
    box(knee,darkFabric,[0,-.405,.11],[.29,.12,.38],[.02,0,0]);
    box(knee,leather,[0,-.432,.20],[.24,.045,.22]);
  }
  // Feet peek out from the shin guards; straps read clearly from behind too.
  for(const leg of [b.leftLeg,b.rightLeg]){
    box(leg,darkFabric,[0,-.82,.12],[.28,.13,.42],[.02,0,0]);
    box(leg,leather,[0,-.785,.245],[.27,.035,.08]);
    box(leg,leather,[0,-.845,.245],[.27,.035,.08]);
  }

  // Hip armour, obi sash and split hanging cloth panels.
  box(g,darkFabric,[0,.91,0],[.68,.30,.45]);
  box(g,leather,[0,1.01,.018],[.70,.105,.48]);
  box(g,cord,[0,1.025,.266],[.43,.035,.018]);
  ring(g,leather,[0,.99,0],.30,.043,[Math.PI/2,0,0],[1,1,.9]);
  ring(g,cord,[0,1.015,0],.30,.012,[Math.PI/2,0,0],[1,1,.9]);
  for(const x of [-.23,0,.23]){
    box(g,leather,[x,.70,.205],[.20,.42,.07],[.04,0,x*.32]);
    box(g,armor,[x,.72,.248],[.17,.31,.025],[.04,0,x*.32]);
    box(g,cord,[x,.88,.267],[.15,.018,.012]);
    box(g,cord,[x,.58,.246],[.15,.018,.012]);
  }
  // Main torso and a layered lamellar chest plate.
  b.torso=pivot(g,0,1.1);
  part(b.torso,new THREE.CylinderGeometry(.295,.27,.73,16),fabric,[0,.19,0]);
  sphere(b.torso,darkFabric,[0,.15,-.055],[.31,.37,.26]);
  sphere(b.torso,armor,[0,.20,.178],[.29,.265,.105]);
  box(b.torso,leather,[0,.19,.276],[.43,.27,.035]);
  box(b.torso,armor,[0,.20,.298],[.35,.205,.025]);
  box(b.torso,cord,[0,.39,.316],[.30,.023,.018]);
  box(b.torso,cord,[0,.02,.316],[.30,.023,.018]);
  box(b.torso,leather,[-.13,.23,.319],[.018,.20,.016],[0,0,-.17]);
  box(b.torso,leather,[.13,.23,.319],[.018,.20,.016],[0,0,.17]);
  // Crossed cloth lapels give the torso a kimono silhouette.
  box(b.torso,fabric,[-.09,.38,.245],[.18,.38,.045],[0,0,-.46]);
  box(b.torso,fabric,[.09,.38,.252],[.18,.38,.045],[0,0,.46]);
  box(b.torso,cord,[0,.35,.325],[.035,.30,.015],[0,0,-.12]);
  // Back cloth / short mantle.
  box(b.torso,darkFabric,[0,-.02,-.245],[.55,.68,.06],[.08,0,0]);
  box(b.torso,leather,[0,-.33,-.265],[.48,.055,.018]);

  // Shoulder guards: rounded cap plus small overlapping lamella plates.
  for(const sign of [-1,1]){
    sphere(b.torso,armor,[sign*.34,.47,.025],[.20,.16,.20],[0,0,sign*.12]);
    sphere(b.torso,leather,[sign*.34,.44,.165],[.16,.12,.065]);
    for(let j=0;j<3;j++){
      box(b.torso,armor,[sign*(.36+j*.008),.39-j*.075,.20],[.29-j*.035,.075,.045],[0,0,sign*.10]);
      box(b.torso,leather,[sign*.36,.35-j*.075,.226],[.20,.018,.018],[0,0,sign*.10]);
    }
  }
  // Arms remain jointed so the combat animation drives the whole silhouette.
  b.leftArm=pivot(b.torso,-.38,.46);b.rightArm=pivot(b.torso,.38,.46);
  for(const arm of [b.leftArm,b.rightArm]){
    sphere(arm,leather,[0,-.02,0],[.15,.20,.15]);
    part(arm,new THREE.CylinderGeometry(.085,.105,.39,12),fabric,[0,-.21,0]);
  }
  b.leftElbow=pivot(b.leftArm,0,-.38);b.rightElbow=pivot(b.rightArm,0,-.38);
  for(const [elbow,sign] of [[b.leftElbow,-1],[b.rightElbow,1]]){
    part(elbow,new THREE.CylinderGeometry(.065,.082,.30,10),skin,[0,-.14,0]);
    sphere(elbow,leather,[0,-.16,.02],[.083,.17,.085]);
    box(elbow,armor,[0,-.15,.082],[.15,.20,.035],[0,0,sign*.12]);
    ring(elbow,cord,[0,-.055,0],.082,.012,[Math.PI/2,0,0],[1,1,.8]);
    sphere(elbow,leather,[0,-.33,.025],[.085,.09,.085]);
  }
  // Hands on the hilt and a visible secondary forearm wrap.
  sphere(b.leftElbow,skin,[0,-.34,.07],[.07,.075,.075]);
  sphere(b.rightElbow,skin,[0,-.34,.07],[.07,.075,.075]);
  box(b.leftElbow,leather,[0,-.21,.088],[.16,.105,.04]);
  box(b.rightElbow,leather,[0,-.21,.088],[.16,.105,.04]);

  // Head, tied hair and face wrapping.
  b.head=pivot(b.torso,0,.66,.005);
  sphere(b.head,skin,[0,.13,.015],[.17,.205,.155]);
  sphere(b.head,darkFabric,[0,.20,-.035],[.21,.19,.17]);
  sphere(b.head,leather,[0,.31,-.04],[.16,.105,.15]);
  box(b.head,leather,[0,.085,.135],[.30,.085,.055]);
  box(b.head,cord,[0,.13,.164],[.30,.023,.018]);
  // Brows and narrow eye slits visible beneath the headgear.
  box(b.head,darkFabric,[-.075,.18,.151],[.074,.018,.012],[0,0,-.06]);
  box(b.head,darkFabric,[.075,.18,.151],[.074,.018,.012],[0,0,.06]);
  box(b.head,steel,[0,.015,.167],[.19,.025,.018]);
  // Rear hair knot and two ties break the round-sphere silhouette.
  sphere(b.head,darkFabric,[0,.34,-.12],[.075,.085,.09]);
  box(b.head,cord,[0,.345,-.105],[.12,.018,.025]);

  if(isBoss){
    // The Ashen Warrior gets a dark kabuto, red menpo and unmistakable horns.
    sphere(b.head,armor,[0,.355,0],[.225,.12,.20]);
    box(b.head,leather,[0,.29,.125],[.32,.045,.12]);
    sphere(b.head,leather,[0,.075,.16],[.16,.12,.065]);
    box(b.head,cord,[0,.06,.218],[.23,.035,.022]);
    for(const sign of [-1,1]){
      part(b.head,new THREE.ConeGeometry(.052,.25,7),armor,[sign*.16,.40,.035],[0,0,-sign*.42]);
      box(b.head,armor,[sign*.19,.22,.09],[.065,.13,.045],[0,0,sign*.24]);
      box(b.head,cord,[sign*.075,.18,.219],[.065,.018,.02],[0,0,-sign*.12]);
    }
    part(b.head,new THREE.ConeGeometry(.045,.14,6),steel,[0,-.02,.225],[Math.PI,0,0]);
    box(b.head,armor,[0,.47,-.015],[.045,.20,.045],[0,0,.04]);
  }else{
    // A travelling shinobi hood and a tied cloth tail, rather than a bare ball head.
    sphere(b.head,darkFabric,[0,.25,-.11],[.225,.22,.14]);
    box(b.head,leather,[0,.275,-.02],[.33,.06,.28],[.08,0,0]);
    box(b.head,fabric,[-.105,.29,-.12],[.08,.25,.08],[.08,0,-.2]);
    box(b.head,fabric,[.10,.26,-.14],[.07,.23,.07],[.12,0,.2]);
  }

  // A curved, slightly tapered katana blade, tsuba and wrapped hilt.
  b.sword=pivot(b.rightElbow,0,-.32,.065);
  part(b.sword,new THREE.CylinderGeometry(.026,.031,.24,10),leather,[0,-.07,0]);
  for(let i=0;i<5;i++)box(b.sword,cord,[0,-.11+i*.035,.026],[.054,.012,.008],[0,0,i%2===0?.45:-.45]);
  part(b.sword,new THREE.CylinderGeometry(.05,.05,.035,12),armor,[0,.035,0],[0,0,Math.PI/2],[1,.7,1]);
  const bladeShape=new THREE.Shape();bladeShape.moveTo(-.026,.04);bladeShape.quadraticCurveTo(-.02,.30,-.014,.55);bladeShape.quadraticCurveTo(-.005,.88,.014,1.07);bladeShape.lineTo(.022,1.11);bladeShape.quadraticCurveTo(.039,.88,.028,.62);bladeShape.quadraticCurveTo(.025,.28,.026,.04);bladeShape.closePath();
  const bladeGeo=new THREE.ExtrudeGeometry(bladeShape,{depth:.025,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.004,bevelThickness:.004});
  b.blade=part(b.sword,bladeGeo,steel,[0,.04,-.012]);
  box(b.sword,armor,[.001,.53,.018],[.009,.84,.008]);
  // Sheathed spare blade across the back; purely cosmetic.
  const sheath=pivot(g,-.32,1.08,-.20);sheath.rotation.z=.12;
  part(sheath,new THREE.CylinderGeometry(.045,.035,.83,10),leather,[0,-.03,0],[0,0,-.95]);
  part(sheath,new THREE.CylinderGeometry(.025,.026,.73,8),darkFabric,[0,-.03,.005],[0,0,-.95]);
  box(sheath,cord,[.31,.33,0],[.09,.045,.055]);
  g.userData=b;return g;
}
class Combatant{
  constructor(g,isBoss=false){this.group=g;this.isBoss=isBoss;this.maxHP=isBoss?150:C.maxHP;this.hp=this.maxHP;this.maxPosture=C.maxPosture;this.posture=0;this.state='idle';this.timer=0;this.lastPostureAt=0;this.guard=false;this.iframe=false;this.parryWindow=0;this.cooldown=0;this.attack=null;this.attackResolved=false;this.attackQueue=null;this.comboStep=0;this.comboReset=0;this.dodgeDir=new THREE.Vector3();this.aiTimer=.75;this.aiCooldown=.75;this.currentBossAttack=null;this.dead=false;}
}
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x100b12);scene.fog=new THREE.FogExp2(0x100b12,.027);
 camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,100);renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.querySelector('#game').appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0x8894bd,0x251a15,1));const sun=new THREE.DirectionalLight(0xffc48c,2);sun.position.set(7,12,6);sun.castShadow=true;scene.add(sun);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(18,64),mat(0x24201d));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 for(let i=0;i<20;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(1.5+Math.random()*3,3+Math.random()*7,5),mat(0x16121a));const a=Math.random()*Math.PI*2,r=16+Math.random()*13;m.position.set(Math.cos(a)*r,(m.geometry.parameters.height/2)-.4,Math.sin(a)*r);scene.add(m)}
 player=new Combatant(fighter(0x4b4038,0x17151a,0xd9d6c8,false));boss=new Combatant(fighter(0x19171c,0x5a2220,0xeee5cc,true),true);player.group.position.set(0,0,3);boss.group.position.set(0,0,-2.5);scene.add(player.group,boss.group);clock=new THREE.Clock();updateUI();addEvents();requestAnimationFrame(loop);
}
function addEvents(){
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!keys[k])pressed[k]=true;keys[k]=true;if(k==='k'&&!e.repeat)pressed.guard=true;if(k==='r'&&gameEnded){resetFight();startGame();}});
  addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
  addEventListener('mousedown',e=>{if(e.button===0)pressed.mouse0=true;if(e.button===2){mouseGuard=true;pressed.guard=true;}});
  addEventListener('mouseup',e=>{if(e.button===2)mouseGuard=false;});addEventListener('contextmenu',e=>e.preventDefault());addEventListener('blur',()=>{keys={};pressed={};mouseGuard=false;});
  ui.start.onclick=()=>{if(gameEnded)resetFight();startGame();};
}
function startGame(){ui.screen.classList.add('hidden');ui.screen.classList.remove('end-screen');running=true;gameEnded=false;if(clock)clock.getDelta();}
function resetFight(){
  for(const x of [player,boss]){x.hp=x.maxHP;x.posture=0;x.state='idle';x.timer=0;x.lastPostureAt=0;x.guard=false;x.iframe=false;x.parryWindow=0;x.cooldown=0;x.attack=null;x.attackResolved=false;x.attackQueue=null;x.comboStep=0;x.comboReset=0;x.aiTimer=.7;x.aiCooldown=.7;x.currentBossAttack=null;x.dead=false;x.group.position.y=0;x.group.rotation.set(0,0,0);for(const bone of x.group.userData.all)bone.rotation.set(0,0,0);}
  player.group.position.set(0,0,3);boss.group.position.set(0,0,-2.5);gameEnded=false;running=false;hideCallout();setPrompt('','');updateUI();ui.eyebrow.textContent='Z A N S H I N';ui.title.textContent='THE ASHEN WARRIOR';ui.description.textContent='Steel remembers every mistake.';ui.start.textContent='BEGIN';ui.controls.textContent='Deflect at impact. Holding guard blocks, but drains your posture.';ui.screen.classList.remove('hidden','end-screen');
}
function face(group,target){const dx=target.x-group.position.x,dz=target.z-group.position.z;if(Math.abs(dx)+Math.abs(dz)>.001)group.rotation.y=Math.atan2(dx,dz);}
function distance(a,b){return Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);}
function forward(group){return new THREE.Vector3(Math.sin(group.rotation.y),0,Math.cos(group.rotation.y));}
function popup(text,kind=''){if(!text)return;const el=document.createElement('div');el.className='popup '+kind;el.textContent=text;document.querySelector('#hud').appendChild(el);setTimeout(()=>el.remove(),kind.includes('big')?1050:760);}
function flash(amount=.25,stop=.055){shake=Math.max(shake,amount);hitStop=Math.max(hitStop,stop);}
function showCallout(title,sub,kind=''){ui.calloutTitle.textContent=title;ui.calloutSub.textContent=sub;ui.callout.className='show '+kind;}
function hideCallout(){ui.callout.classList.remove('show','danger','heavy');}
function setPrompt(title,sub=''){ui.prompt.textContent=title;ui.promptSmall.textContent=sub;ui.prompt.style.opacity=title?'1':'0';}
function burst(position,color=0xffd58b,count=14){
  const arr=new Float32Array(count*3),vel=[];for(let i=0;i<count;i++){arr[i*3]=position.x;arr[i*3+1]=position.y;arr[i*3+2]=position.z;vel.push(new THREE.Vector3(Math.random()-.5,Math.random()*.9,Math.random()-.5).normalize().multiplyScalar(1.2+Math.random()*2.5));}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(arr,3));const pts=new THREE.Points(geo,new THREE.PointsMaterial({color,size:.07,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(pts);effects.push({obj:pts,type:'sparks',vel,life:.34,max:.34});
}
function slashTrail(actor,color=0xe1ecff,radius=1.15){
  const pos=actor.group.position.clone(),f=forward(actor.group),right=new THREE.Vector3(f.z,0,-f.x),center=pos.addScaledVector(f,.72),vertices=[],indices=[],steps=16;
  for(let i=0;i<=steps;i++){const a=-1.05+i/steps*2.1,p=center.clone().addScaledVector(right,Math.sin(a)*radius).addScaledVector(f,Math.cos(a)*.24);vertices.push(p.x,p.y+1.12,p.z,p.x,p.y+1.19,p.z);}
  for(let i=0;i<steps;i++){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);
  const obj=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(obj);effects.push({obj,type:'slash',life:.14,max:.14});
}
function updateEffects(dt){
  for(let i=effects.length-1;i>=0;i--){
    const e=effects[i];e.life-=dt;const alpha=Math.max(0,e.life/e.max);
    if(e.type==='slash'){e.obj.material.opacity=alpha*.78;e.obj.scale.setScalar(.9+(1-alpha)*.18);}
    else{const p=e.obj.geometry.getAttribute('position');for(let n=0;n<e.vel.length;n++){e.vel[n].y-=7*dt;p.array[n*3]+=e.vel[n].x*dt;p.array[n*3+1]+=e.vel[n].y*dt;p.array[n*3+2]+=e.vel[n].z*dt;}p.needsUpdate=true;e.obj.material.opacity=alpha;}
    if(e.life<=0){scene.remove(e.obj);e.obj.geometry.dispose();e.obj.material.dispose();effects.splice(i,1);}
  }
}
function endGame(victory){if(gameEnded)return;gameEnded=true;running=false;ui.eyebrow.textContent=victory?'Z A N S H I N  ·  VICTORY':'Z A N S H I N  ·  DEFEAT';ui.title.textContent=victory?'DEATHBLOW':'YOU DIED';ui.description.textContent=victory?'The Ashen Warrior falls. The duel is won.':'Steady your hands and return to the duel.';ui.start.textContent='FIGHT AGAIN';ui.controls.textContent='Press R to retry, or choose Fight Again.';ui.screen.classList.remove('hidden');ui.screen.classList.add('end-screen');hideCallout();}
function die(target){if(target.dead)return;target.dead=true;target.state='dead';target.timer=0;burst(target.group.position.clone().add(new THREE.Vector3(0,1.2,0)),target===boss?0xff6948:0xd7c8a2,28);flash(.45,.13);popup(target===boss?'DEATHBLOW':'YOU DIED','big');setTimeout(()=>endGame(target===boss),650);}
function breakBossPosture(){boss.state='postureBreak';boss.timer=0;boss.currentBossAttack=null;boss.attack=null;showCallout('POSTURE BROKEN','Close in and press F to deliver the deathblow.','heavy');popup('POSTURE BROKEN','big');burst(boss.group.position.clone().add(new THREE.Vector3(0,1.3,0)),0xffd078,26);flash(.5,.11);}
function addPosture(target,value){target.posture=Math.min(target.maxPosture,target.posture+value);target.lastPostureAt=performance.now()/1000;if(target.posture>=target.maxPosture){if(target===boss)breakBossPosture();else{target.posture=60;target.state='stagger';target.timer=0;target.guard=false;target.parryWindow=0;popup('POSTURE BROKEN','big');flash(.4,.1);}}}
function damage(target,hp,posture){
  if(target.dead||target.state==='postureBreak')return;const breaks=target!==boss&&target.posture+posture>=target.maxPosture;target.hp=Math.max(0,target.hp-hp);addPosture(target,posture);if(target.hp<=0){die(target);return;}target.lastPostureAt=performance.now()/1000;
  if(target===boss){burst(boss.group.position.clone().add(new THREE.Vector3(0,1.3,0)),0xf4d7a0,10);flash(.25,.055);if(boss.state==='windup'&&boss.currentBossAttack&&boss.timer<boss.currentBossAttack.windup*.4){boss.state='stagger';boss.timer=0;boss.currentBossAttack=null;boss.aiCooldown=.6;popup('INTERRUPT','small');}}
  else if(!breaks){target.state='hit';target.timer=0;flash(.24,.045);}
}
function deflectBossAttack(){
  const atk=boss.currentBossAttack||{name:'QUICK CUT'};addPosture(boss,atk.name==='HEAVY CUT'?34:27);
  boss.state=boss.state==='postureBreak'?'postureBreak':'stagger';boss.timer=0;boss.currentBossAttack=null;boss.aiCooldown=.48;player.posture=Math.max(0,player.posture-12);player.lastPostureAt=performance.now()/1000;
  popup('DEFLECT','big');slashTrail(player,0xfff0b6,1.25);const pos=player.group.position.clone().lerp(boss.group.position,.52).add(new THREE.Vector3(0,1.35,0));burst(pos,0xffe2a0,26);burst(pos,0xcfeaff,10);flash(.48,.095);hideCallout();
}
function playerAttack(kind='light'){
  if(player.dead||player.guard||['hit','guardHit','stagger','dodge'].includes(player.state))return;
  if(player.state==='attack'){player.attackQueue=kind;return;}face(player.group,boss.group.position);player.state='attack';player.timer=0;player.attackResolved=false;
  if(kind==='heavy')player.attack={type:'heavy',duration:.88,impact:.41,damage:22,posture:28,step:2};
  else{const chain=[{duration:.5,impact:.18,damage:10,posture:13,step:0},{duration:.55,impact:.22,damage:12,posture:15,step:1},{duration:.66,impact:.27,damage:15,posture:19,step:2}];player.attack={type:'light',...chain[player.comboStep%3]};}
}
function finishPlayerAttack(){
  const old=player.attack,queued=player.attackQueue;player.attackQueue=null;
  if(queued){player.state='idle';player.attack=null;if(queued==='light'&&old&&old.type==='light')player.comboStep=(old.step+1)%3;else if(queued==='heavy')player.comboStep=0;playerAttack(queued);return;}
  player.comboStep=old&&old.type==='light'?(old.step+1)%3:0;player.comboReset=old&&old.type==='light'?.68:0;player.attack=null;player.state='idle';player.timer=0;
}
function dodge(){
  if(player.dead||player.cooldown>0||['attack','hit','guardHit','stagger'].includes(player.state))return;
  let v=new THREE.Vector3((keys.d?1:0)-(keys.a?1:0),0,(keys.s?1:0)-(keys.w?1:0));if(v.lengthSq()<.001)v.copy(player.group.position).sub(boss.group.position);v.normalize();
  player.dodgeDir.copy(v);player.state='dodge';player.timer=0;player.iframe=true;player.cooldown=.55;player.parryWindow=0;player.guard=false;player.attackQueue=null;face(player.group,boss.group.position);
}
function resolveBossImpact(){
  const atk=boss.currentBossAttack||{damage:C.enemyDamage,posture:C.enemyPosture,name:'QUICK CUT'},d=distance(player.group,boss.group);if(d>(atk.perilous?2.95:2.7)){popup('MISS','small');return;}
  if(player.iframe){popup('DODGE','big');burst(player.group.position.clone().add(new THREE.Vector3(0,1.1,0)),0x9de4ff,10);flash(.12,.02);return;}
  if(player.guard&&player.parryWindow>0){deflectBossAttack();return;}
  if(player.guard&&atk.perilous){damage(player,atk.damage,atk.posture+18);popup('UNBLOCKABLE','danger');return;}
  if(player.guard){const hp=Math.max(2,atk.damage*.28),breaks=player.posture+atk.posture>=player.maxPosture;player.hp=Math.max(0,player.hp-hp);addPosture(player,atk.posture);player.lastPostureAt=performance.now()/1000;if(!breaks){player.state='guardHit';player.timer=0;}popup('GUARD','small');burst(player.group.position.clone().add(new THREE.Vector3(0,1.35,0)),0xdcbf8b,8);if(player.hp<=0)die(player);return;}
  damage(player,atk.damage,atk.posture);
}
function playerUpdate(dt){
  if(player.dead||gameEnded)return;
  const wantGuard=!!(keys.k||mouseGuard);if(pressed.guard)player.parryWindow=C.deflectWindow;else player.parryWindow=Math.max(0,player.parryWindow-dt);player.guard=wantGuard;
  if(pressed.mouse0||pressed.j)playerAttack('light');if(pressed.e)playerAttack('heavy');if(pressed.shift||pressed.l)dodge();
  if(player.state==='attack'){
    player.timer+=dt;const a=player.attack;
    if(a&&!player.attackResolved&&player.timer>=a.impact){player.attackResolved=true;const d=distance(player.group,boss.group),toBoss=boss.group.position.clone().sub(player.group.position).normalize(),dot=forward(player.group).dot(toBoss);if(d<=C.attackRange+(a.type==='heavy'?.18:0)&&dot>.02&&!boss.dead&&boss.state!=='postureBreak'){damage(boss,a.damage,a.posture);slashTrail(player,a.type==='heavy'?0xffd28e:0xd9eaff,a.type==='heavy'?1.38:1.15);burst(boss.group.position.clone().add(new THREE.Vector3(0,1.2,0)),0xf4d7a0,a.step===2?18:9);popup(a.step===2?'CLEAN HIT':'HIT','small');}else popup('MISS','tiny');}
    if(a&&player.timer>=a.duration)finishPlayerAttack();
  }else if(player.state==='dodge'){
    player.timer+=dt;const t=Math.min(1,player.timer/C.dodgeTime);player.group.position.addScaledVector(player.dodgeDir,C.dodgeSpeed*(1-.72*t)*dt);player.iframe=player.timer<C.dodgeIFrames;if(player.timer>=C.dodgeTime){player.state='idle';player.timer=0;player.iframe=false;}
  }else if(['hit','guardHit','stagger'].includes(player.state)){
    player.timer+=dt;const max=player.state==='stagger'?.85:player.state==='guardHit'?.25:.36;if(player.timer>=max){player.state='idle';player.timer=0;}
  }else{
    const v=new THREE.Vector3((keys.d?1:0)-(keys.a?1:0),0,(keys.s?1:0)-(keys.w?1:0));
    if(v.lengthSq()>.001){v.normalize();player.group.position.addScaledVector(v,(player.guard?1.95:C.speed)*dt);player.state=player.guard?'guard':'move';}else player.state=player.guard?'guard':'idle';
  }
  player.comboReset=Math.max(0,player.comboReset-dt);if(player.comboReset===0&&player.state!=='attack')player.comboStep=0;player.cooldown=Math.max(0,player.cooldown-dt);
  if(!['attack','dodge','hit','guardHit','stagger','dead'].includes(player.state))face(player.group,boss.group.position);
  const d=Math.hypot(player.group.position.x,player.group.position.z);if(d>13){player.group.position.x*=13/d;player.group.position.z*=13/d;}
}
function regen(x,dt){const now=performance.now()/1000,delay=x===boss?1.55:1.05;if(x.posture>0&&now-x.lastPostureAt>delay&&x.state!=='postureBreak'&&x.state!=='stagger'){const hp=x.hp/x.maxHP,rate=x===boss?(hp>.7?7:hp>.35?4:1.8):8;x.posture=Math.max(0,x.posture-rate*dt);}}
function startBossAttack(){
  const phase=boss.hp<=boss.maxHP*.5,r=Math.random();let a;
  if(phase&&r<.34)a={name:'PERILOUS ATTACK',tell:'Break away or deflect at the last instant.',windup:.78,active:.16,recovery:.8,damage:19,posture:24,perilous:true};
  else if(r<(phase?.68:.42))a={name:'HEAVY CUT',tell:'A crushing overhead strike.',windup:phase?.68:.82,active:.2,recovery:.92,damage:22,posture:26};
  else a={name:'QUICK CUT',tell:'A fast horizontal cut.',windup:phase?.4:.53,active:.17,recovery:.65,damage:14,posture:18};
  boss.currentBossAttack=a;boss.state='windup';boss.timer=0;boss.aiCooldown=(phase?.5:.72)+Math.random()*.4;showCallout(a.name,a.tell,a.perilous?'danger':a.name==='HEAVY CUT'?'heavy':'');if(a.perilous)popup('DANGER','danger big');
}
function bossUpdate(dt){
  if(boss.dead||gameEnded)return;face(boss.group,player.group.position);const d=distance(boss.group,player.group),phase=boss.hp<=boss.maxHP*.5;
  if(boss.state==='postureBreak'){boss.timer+=dt;if(d<3)setPrompt('F  —  DEATHBLOW','The warrior is exposed. End the duel.');else setPrompt('POSTURE BROKEN','Move close to the warrior to perform a deathblow.');if(pressed.f&&d<3){setPrompt('','');die(boss);return;}if(boss.timer>5.2){boss.posture=56;boss.state='recover';boss.timer=0;boss.aiCooldown=.8;hideCallout();setPrompt('','');popup('RECOVERED','small');}return;}
  setPrompt('','');
  if(boss.state==='stagger'){boss.timer+=dt;if(boss.timer>.42){boss.state='recover';boss.timer=0;hideCallout();}return;}
  if(boss.state==='windup'){boss.timer+=dt;if(boss.timer<boss.currentBossAttack.windup*.55)face(boss.group,player.group.position);if(boss.timer>=boss.currentBossAttack.windup){boss.state='active';boss.timer=0;slashTrail(boss,boss.currentBossAttack.perilous?0xff3852:0xff7956,boss.currentBossAttack.name==='HEAVY CUT'?1.42:1.18);boss.group.position.addScaledVector(forward(boss.group),boss.currentBossAttack.perilous?.72:.18);resolveBossImpact();hideCallout();}return;}
  if(boss.state==='active'){boss.timer+=dt;if(boss.timer>=(boss.currentBossAttack?boss.currentBossAttack.active:.17)){boss.state='recover';boss.timer=0;if(boss.currentBossAttack&&boss.currentBossAttack.perilous)boss.group.position.addScaledVector(forward(boss.group),-.28);}return;}
  if(boss.state==='recover'){boss.timer+=dt;if(boss.timer>=(boss.currentBossAttack?boss.currentBossAttack.recovery:.55)){boss.state='idle';boss.timer=0;boss.currentBossAttack=null;}return;}
  if(d>2.35){boss.group.position.addScaledVector(player.group.position.clone().sub(boss.group.position).setY(0).normalize(),(phase?3.05:2.7)*dt);boss.state='move';const n=Math.hypot(boss.group.position.x,boss.group.position.z);if(n>13)boss.group.position.multiplyScalar(13/n);return;}
  boss.state='idle';boss.aiCooldown-=dt;if(boss.aiCooldown<=0)startBossAttack();
}
function updateModels(t,dt){
  for(const x of [player,boss]){
    const b=x.group.userData,move=x.state==='move',guard=x.state==='guard',walk=move?Math.sin(t*9):0,bob=move?Math.abs(walk)*.045:Math.sin(t*1.7)*.012;
    x.group.position.y=THREE.MathUtils.damp(x.group.position.y,bob,dt,14);
    let torsoX=move?.04:0,torsoZ=0,lArm=.15,rArm=-.12,lElbow=-.1,rElbow=.08,swordZ=.22,swordX=.1,lLeg=walk*.42,rLeg=-walk*.42,lKnee=Math.max(0,-walk)*.35,rKnee=Math.max(0,walk)*.35;
    if(guard){torsoX=-.06;lArm=.42;rArm=-.62;lElbow=-.28;rElbow=.25;swordZ=-.25;swordX=-.12;}
    if(x.state==='attack'&&x.attack){const a=x.attack,p=Math.min(1,x.timer/a.duration),s=Math.sin(p*Math.PI),sign=a.step===1?-1:1;torsoX=p<.25?-.16:p<.55?.1:0;torsoZ=s*sign*.1;rArm=(a.type==='heavy'?-1:-.55)+s*(a.type==='heavy'?1.2:1.12)*sign;rElbow=p<.25?.6:-.25-s*.25;swordZ=p<.22?-.92:(a.type==='heavy'?1.35:1.05)*Math.sin(Math.min(1,Math.max(0,(p-.18)/.58))*Math.PI)*sign;swordX=a.type==='heavy'?-.45+s*.8:-.05+s*.48;lArm=.35+s*.24;lElbow=-.38;}
    if(x.state==='windup'&&x.currentBossAttack){const a=x.currentBossAttack,p=Math.min(1,x.timer/a.windup);torsoX=-.14-p*.12;torsoZ=Math.sin(p*Math.PI)*.1;rArm=a.name==='HEAVY CUT'?-1.2-p*.2:-.5-p*.3;rElbow=a.perilous?-.25:.65+p*.2;swordZ=a.name==='HEAVY CUT'?-.9-p*.4:-.5-p*.28;swordX=a.perilous?1:-.35;lArm=.42;}
    if(x.state==='active'&&x.currentBossAttack){const a=x.currentBossAttack,p=Math.min(1,x.timer/a.active),s=Math.sin((p*.82+.12)*Math.PI);torsoX=.22;torsoZ=.15*(1-p);rArm=-.9+s*1.5;rElbow=-.3-s*.36;swordZ=1.5*(1-p)-.15;swordX=a.perilous?1.3:.2;lArm=.34;}
    if(x.state==='dodge'){torsoX=.18;torsoZ=x.dodgeDir.x*-.3;rArm=.2;rElbow=.3;swordZ=.5;lArm=-.28;lLeg=-.75;rLeg=.7;}
    if(x.state==='hit'||x.state==='guardHit'||x.state==='stagger'){torsoX=.23;torsoZ=-.14;rArm=.55;rElbow=-.2;swordZ=.8;lArm=-.25;}
    if(x.state==='postureBreak'){torsoX=.48;torsoZ=-.08;rArm=.6;rElbow=-.2;swordZ=.95;swordX=-.55;lArm=-.25;lLeg=-.2;rLeg=.2;}
    if(x.state==='dead'){torsoX=x===boss?.95:-.62;rArm=.5;swordZ=.9;lArm=-.4;}
    b.torso.rotation.x=THREE.MathUtils.damp(b.torso.rotation.x,torsoX,dt,14);b.torso.rotation.z=THREE.MathUtils.damp(b.torso.rotation.z,torsoZ,dt,14);b.head.rotation.x=THREE.MathUtils.damp(b.head.rotation.x,x.state==='windup'?-.08:0,dt,10);
    b.leftArm.rotation.z=THREE.MathUtils.damp(b.leftArm.rotation.z,lArm+(move?-walk*.12:0),dt,18);b.rightArm.rotation.z=THREE.MathUtils.damp(b.rightArm.rotation.z,rArm+(move?walk*.12:0),dt,18);
    b.leftElbow.rotation.z=THREE.MathUtils.damp(b.leftElbow.rotation.z,lElbow,dt,18);b.rightElbow.rotation.z=THREE.MathUtils.damp(b.rightElbow.rotation.z,rElbow,dt,18);b.sword.rotation.z=THREE.MathUtils.damp(b.sword.rotation.z,swordZ,dt,20);b.sword.rotation.x=THREE.MathUtils.damp(b.sword.rotation.x,swordX,dt,16);
    b.leftLeg.rotation.x=THREE.MathUtils.damp(b.leftLeg.rotation.x,lLeg,dt,18);b.rightLeg.rotation.x=THREE.MathUtils.damp(b.rightLeg.rotation.x,rLeg,dt,18);b.leftKnee.rotation.x=THREE.MathUtils.damp(b.leftKnee.rotation.x,lKnee,dt,18);b.rightKnee.rotation.x=THREE.MathUtils.damp(b.rightKnee.rotation.x,rKnee,dt,18);
  }
}
function updateUI(){
  ui.bossHP.style.width=Math.max(0,boss.hp/boss.maxHP*100)+'%';ui.bossPosture.style.width=Math.min(100,boss.posture/boss.maxPosture*100)+'%';ui.playerHP.style.width=Math.max(0,player.hp/player.maxHP*100)+'%';ui.playerPosture.style.width=Math.min(100,player.posture/player.maxPosture*100)+'%';ui.playerLabel.textContent='WANDERER  ·  '+Math.ceil(player.hp)+' HP';
  const phase=boss.hp<=boss.maxHP*.5&&!boss.dead;document.querySelector('#boss-name').textContent=phase?'THE ASHEN WARRIOR  ·  ENRAGED':'THE ASHEN WARRIOR';document.querySelector('#boss-ui').classList.toggle('phase-two',phase);ui.bossPosture.parentElement.classList.toggle('danger-fill',boss.posture>=70);ui.playerPosture.parentElement.classList.toggle('danger-fill',player.posture>=70);
}
function loop(){
  requestAnimationFrame(loop);let dt=Math.min(clock.getDelta(),.033);
  if(!running){updateEffects(Math.min(dt,.04));renderer.render(scene,camera);pressed={};return;}
  if(hitStop>0){hitStop-=dt;dt*=.18;}
  playerUpdate(dt);bossUpdate(dt);regen(player,dt);regen(boss,dt);updateModels(performance.now()/1000,dt);updateEffects(dt);updateUI();
  const focus=player.group.position.clone().lerp(boss.group.position,.33),sep=distance(player.group,boss.group),off=new THREE.Vector3(0,3.15,THREE.MathUtils.clamp(8+sep*.25,8.2,11.5));camera.position.lerp(focus.add(off),1-Math.exp(-dt*3.5));camera.lookAt(player.group.position.clone().lerp(boss.group.position,.36).add(new THREE.Vector3(0,1.15,0)));
  if(shake>0){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake*.7;shake*=Math.exp(-dt*10);if(shake<.01)shake=0;}
  renderer.render(scene,camera);pressed={};
}
init();
