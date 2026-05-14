'use strict';
/*
  FIXED PULLEY — correct physics
  ─────────────────────────────
  • Pulley is mounted on a wooden board bolted to the LEFT edge of the table,
    axis along Z (wheel faces the viewer).
  • One rope end hangs vertically on the LEFT (outside) of the table — weight hangs here.
  • Rope goes UP and OVER the pulley groove (arc in XY plane).
  • Other rope end exits the pulley to the RIGHT, runs horizontally ALONG the table top.
  • Person stands to the RIGHT of the table, PULLS the rope end AWAY from the table (outward, +X).
  • Pull 1 m → weight rises 1 m (fixed pulley, 1:1, direction-change only).
  • Person's FEET and BODY stay fixed. Only arms/hands extend outward.
  • Pulley wheel spins as rope moves over it.
*/

const THREE = window.THREE;

/* ── Renderer ── */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('viewport').appendChild(renderer.domElement);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  render();
}
window.addEventListener('resize', resize);

/* ── Camera ── */
const camera = new THREE.PerspectiveCamera(44, 1, 0.01, 80);
// Start slightly right-of-centre, above, in front
let sph = { theta: -0.55, phi: 0.78, r: 4.6 };
const target = new THREE.Vector3(0.4, 0.7, 0);
function updateCam() {
  camera.position.set(
    target.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.theta),
    target.y + sph.r * Math.cos(sph.phi),
    target.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.theta)
  );
  camera.lookAt(target);
}
updateCam();

/* Orbit */
let drag = false, px = 0, py = 0;
renderer.domElement.addEventListener('mousedown', e => { drag=true; px=e.clientX; py=e.clientY; });
window.addEventListener('mouseup', () => drag=false);
window.addEventListener('mousemove', e => {
  if (!drag) return;
  sph.theta -= (e.clientX-px)*0.008; px=e.clientX;
  sph.phi = Math.max(0.15, Math.min(1.45, sph.phi+(e.clientY-py)*0.006)); py=e.clientY;
  updateCam(); render();
});
renderer.domElement.addEventListener('wheel', e => {
  sph.r = Math.max(1.8, Math.min(12, sph.r + e.deltaY*0.004));
  e.preventDefault(); updateCam(); render();
}, { passive:false });
let t0x=0, t0y=0;
renderer.domElement.addEventListener('touchstart', e=>{ t0x=e.touches[0].clientX; t0y=e.touches[0].clientY; },{passive:true});
renderer.domElement.addEventListener('touchmove', e=>{
  sph.theta -= (e.touches[0].clientX-t0x)*0.01; t0x=e.touches[0].clientX;
  sph.phi = Math.max(0.15,Math.min(1.45,sph.phi+(e.touches[0].clientY-t0y)*0.008)); t0y=e.touches[0].clientY;
  updateCam(); render(); e.preventDefault();
},{passive:false});

/* ── Scene ── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a12);
scene.fog = new THREE.FogExp2(0x070a12, 0.038);

/* ── Lights ── */
scene.add(new THREE.AmbientLight(0x1a2244, 2.2));
const sun = new THREE.DirectionalLight(0xfff6e8, 2.6);
sun.position.set(3, 7, 4);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left:-3,right:3,top:3,bottom:-3,near:0.1,far:20 });
sun.shadow.mapSize.set(2048,2048); sun.shadow.bias=-0.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x3355bb, 0.7); fill.position.set(-3,2,-3); scene.add(fill);
const rim  = new THREE.PointLight(0x6688ff, 1.0, 10);   rim.position.set(-2,3,-1);  scene.add(rim);

/* ── Materials ── */
const M = {
  floor:    mat(0x0c1018, 0.95),
  tableTop: mat(0x7a5530, 0.60),
  tableEdge:mat(0x5e3d20, 0.70),
  leg:      mat(0x4a2e14, 0.80),
  board:    mat(0x8c5e28, 0.72),
  pulleyMetal: mat(0x6677cc, 0.22, 0.78),
  pulleyDark:  mat(0x222255, 0.30, 0.65),
  hub:         mat(0x99aadd, 0.18, 0.88),
  axle:        mat(0xccddee, 0.14, 0.92),
  rope:     mat(0xf5a623, 0.82),
  weight:   mat(0xcc2222, 0.52, 0.38),
  wband:    mat(0x881111, 0.58, 0.28),
  skin:     mat(0xd4956a, 0.78),
  shirt:    mat(0x1a4488, 0.85),
  pants:    mat(0x223355, 0.82),
  shoes:    mat(0x111111, 0.88, 0.12),
  hair:     mat(0x1a0f05, 0.90),
  arrowG:   matEmit(0x4caf7a, 0x0d3320),
  arrowR:   matEmit(0xe87040, 0x3a1000),
};
function mat(c,r=0.6,m=0){ return new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m}); }
function matEmit(c,e){ return new THREE.MeshStandardMaterial({color:c,roughness:0.4,metalness:0.2,emissive:e,emissiveIntensity:0.6}); }
function mk(geo,mat,cast=true,recv=true){const m=new THREE.Mesh(geo,mat);m.castShadow=cast;m.receiveShadow=recv;return m;}

/* ════════════════════════════
   WORLD DIMENSIONS (metres)
   ════════════════════════════
   Table: 1.2 m wide (X), 0.7 m deep (Z), 0.75 m tall (Y), 0.06 m thick top.
   Table sits centred at X=0.4, Z=0.
   Left edge of table at X = 0.4 - 0.6 = -0.2
   Board on left edge: 0.08 m wide (X), 0.40 m tall, 0.16 m deep (Z)
   Pulley centre: just left of board, at height of board top.
   Pulley radius: 0.125 m (⌀ 0.25 m). Axis = Z.
   Weight hangs on LEFT side of pulley (-X side), below table edge.
   Rope runs over top of pulley then RIGHT along table surface.
   Person stands to RIGHT of table, pulls rope in +X direction.
*/
const TW=1.2, TD=0.7, TH=0.75, TTH=0.06; // table
const TCX=0.4, TCZ=0.0;
const TABLE_LEFT  = TCX - TW/2;   // -0.20
const TABLE_RIGHT = TCX + TW/2;   //  1.00
const TABLE_TOP_Y = TH;

const BW=0.08, BH=0.40, BD=0.16;
const BOARD_CX = TABLE_LEFT - BW/2;  // -0.24  (board sits just at left edge)
const BOARD_CY = TABLE_TOP_Y + BH/2; //  0.95

const PR=0.125; // pulley radius
const PCX = BOARD_CX - BW/2 - 0.004; // pulley centre X ≈ -0.284
const PCY = TABLE_TOP_Y + BH - PR - 0.01;  // near top of board
const PCZ = 0.0;

const ROPE_R = 0.010;
const MAX_PULL = 0.50; // metres person can pull (limited by arm reach)
// Weight start position: hangs from bottom of pulley
const W_HALF = 0.10; // weight is 0.20 m cube, half = 0.10
const W_REST_Y = PCY - PR - 0.08 - W_HALF; // some slack below pulley at rest

// Rope exit point from pulley (right side, angle=0 → (PCX+PR, PCY))
const ROPE_EXIT_X = PCX + PR;
const ROPE_EXIT_Y = PCY;

// Person stands to right of table, body fixed
const PERSON_X  = TABLE_RIGHT + 0.55;
const PERSON_Z  = 0.0;
// Shoulder height
const SHOULDER_Y = 1.30;

/* ════════════════════════════
   BUILD STATIC SCENE
   ════════════════════════════ */

/* Floor */
const floor = mk(new THREE.PlaneGeometry(14,14), M.floor, false, true);
floor.rotation.x = -Math.PI/2; floor.position.y = -0.002; scene.add(floor);
scene.add(Object.assign(new THREE.GridHelper(14,56,0x0e1928,0x0e1928),{position:{x:0,y:0.001,z:0}}));

/* TABLE — solid wood, non-hollow */
// Top slab
const top = mk(new THREE.BoxGeometry(TW,TTH,TD), M.tableTop);
top.position.set(TCX, TH-TTH/2, TCZ); scene.add(top);

// 4 legs — solid square cross-section
const LEG_W=0.07, LEG_H=TH-TTH;
[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{
  const leg=mk(new THREE.BoxGeometry(LEG_W,LEG_H,LEG_W),M.leg);
  leg.position.set(TCX+sx*(TW/2-LEG_W/2), LEG_H/2, TCZ+sz*(TD/2-LEG_W/2));
  scene.add(leg);
  const foot=mk(new THREE.BoxGeometry(LEG_W+0.025,0.018,LEG_W+0.025),M.leg);
  foot.position.set(TCX+sx*(TW/2-LEG_W/2),0.009,TCZ+sz*(TD/2-LEG_W/2));
  scene.add(foot);
});

// Aprons (structural cross-members that make the table look solid/real)
const APH=0.09, APT=0.04;
// front/back
[1,-1].forEach(s=>{
  const a=mk(new THREE.BoxGeometry(TW-LEG_W*2,APH,APT),M.tableEdge);
  a.position.set(TCX, TH-TTH-APH/2, TCZ+s*(TD/2-APT/2)); scene.add(a);
});
// sides
[1,-1].forEach(s=>{
  const a=mk(new THREE.BoxGeometry(APT,APH,TD-LEG_W*2),M.tableEdge);
  a.position.set(TCX+s*(TW/2-APT/2), TH-TTH-APH/2, TCZ); scene.add(a);
});

/* WOODEN BOARD */
const board=mk(new THREE.BoxGeometry(BW,BH,BD),M.board);
board.position.set(BOARD_CX, BOARD_CY, PCZ); scene.add(board);

// Bolts holding board to table edge
[-0.10,0.10].forEach(dy=>{
  const bolt=mk(new THREE.CylinderGeometry(0.010,0.010,BW+0.02,8),M.axle);
  bolt.rotation.z=Math.PI/2;
  bolt.position.set(BOARD_CX, BOARD_CY+dy, PCZ); scene.add(bolt);
});

/* PULLEY (axis = Z, wheel in XY plane, juts toward viewer) */
const pulleyGroup=new THREE.Group();
pulleyGroup.position.set(PCX,PCY,PCZ);
scene.add(pulleyGroup);

// Outer rim
pulleyGroup.add(mk(new THREE.TorusGeometry(PR,0.016,16,72), M.pulleyMetal));
// Groove ring
pulleyGroup.add(mk(new THREE.TorusGeometry(PR-0.008,0.010,10,72), M.pulleyDark));
// Disk body
const disk=mk(new THREE.CylinderGeometry(PR-0.018,PR-0.018,0.072,32),M.pulleyMetal);
disk.rotation.x=Math.PI/2; pulleyGroup.add(disk);
// Hub
const hub=mk(new THREE.CylinderGeometry(0.026,0.026,0.095,14),M.hub);
hub.rotation.x=Math.PI/2; pulleyGroup.add(hub);
// Axle through board
const axleMesh=mk(new THREE.CylinderGeometry(0.011,0.011,BD+0.06,10),M.axle);
axleMesh.rotation.x=Math.PI/2; pulleyGroup.add(axleMesh);
// Spokes
for(let i=0;i<6;i++){
  const a=i*Math.PI/3;
  const sp=mk(new THREE.CylinderGeometry(0.006,0.006,PR*0.78,6),M.hub);
  sp.position.set(Math.cos(a)*PR*0.39, Math.sin(a)*PR*0.39, 0);
  sp.rotation.z = a; sp.rotation.x=Math.PI/2;
  // Actually spokes should stay in XY: rotate around Z
  sp.rotation.x=0; sp.rotation.z=a+Math.PI/2; // radial in XY
  // re-do: spoke cylinder default is along Y. To make it radial in XY at angle a:
  const sp2=mk(new THREE.CylinderGeometry(0.006,0.006,PR*0.80,6),M.hub);
  sp2.rotation.z = -(Math.PI/2 - a); // rotate so Y-axis cylinder points radially
  sp2.position.set(Math.cos(a)*PR*0.40, Math.sin(a)*PR*0.40, 0);
  pulleyGroup.add(sp2);
}

// Bracket attaching pulley axle to board (U-bracket)
const brk=mk(new THREE.BoxGeometry(0.04,0.06,BD*0.7),M.axle);
brk.position.set(BW/2+0.02, 0, 0); pulleyGroup.add(brk);

/* WEIGHT — dynamic, group positioned each frame */
const weightGroup=new THREE.Group();
scene.add(weightGroup);
const wBody=mk(new THREE.BoxGeometry(0.20,0.20,0.20),M.weight);
weightGroup.add(wBody);
// bands
[-0.05,0,0.05].forEach(dy=>{
  const b=mk(new THREE.BoxGeometry(0.205,0.022,0.205),M.wband); b.position.y=dy; weightGroup.add(b);
});
// top hook ring
const hookRing=mk(new THREE.TorusGeometry(0.022,0.006,8,16),M.axle);
hookRing.position.y=0.11; weightGroup.add(hookRing);
// "10 kg" text cube (label face)
const labelFace=mk(new THREE.BoxGeometry(0.20,0.20,0.201),
  new THREE.MeshStandardMaterial({color:0xdd3333,roughness:0.5}));
weightGroup.add(labelFace);

/* ROPE — rebuilt each update */
let ropeObjs=[];
function clearRope(){ ropeObjs.forEach(o=>{scene.remove(o);o.geometry.dispose();}); ropeObjs=[]; }
function addSeg(a,b){
  const d=new THREE.Vector3().subVectors(b,a);
  const l=d.length(); if(l<0.001)return;
  const g=new THREE.CylinderGeometry(ROPE_R,ROPE_R,l,8);
  const m=mk(g,M.rope);
  m.position.copy(new THREE.Vector3().addVectors(a,b).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  scene.add(m); ropeObjs.push(m);
}

/* FORCE ARROWS — dynamic */
function makeArrow(mat, length=0.5){
  const g=new THREE.Group();
  const shaft=mk(new THREE.CylinderGeometry(0.018,0.018,length*0.78,8),mat);
  shaft.position.y=length*0.39; g.add(shaft);
  const head=mk(new THREE.CylinderGeometry(0,0.048,length*0.22,10),mat);
  head.position.y=length*0.89; g.add(head);
  return g;
}
const pullArrow = makeArrow(M.arrowG, 0.55);
scene.add(pullArrow);
const gravArrow = makeArrow(M.arrowR, 0.42);
gravArrow.rotation.x=Math.PI; // point down
scene.add(gravArrow);

/* ════════════════════════════
   PERSON — body FIXED, arms move
   ════════════════════════════
   Person stands to the right of the table, facing left (toward pulley, -X direction).
   Body never moves. Arms extend outward (+X) as slider increases.
*/
const personGroup=new THREE.Group();
personGroup.position.set(PERSON_X, 0, PERSON_Z);
personGroup.rotation.y = Math.PI; // face toward table (-X direction)
scene.add(personGroup);

// Head
const head=mk(new THREE.SphereGeometry(0.105,18,14),M.skin); head.position.set(0,1.68,0); personGroup.add(head);
// Hair
const hair=mk(new THREE.SphereGeometry(0.108,18,10),M.hair);
hair.position.set(0,1.74,0); hair.scale.y=0.55; personGroup.add(hair);
// Neck
const neck=mk(new THREE.CylinderGeometry(0.038,0.042,0.09,10),M.skin); neck.position.set(0,1.505,0); personGroup.add(neck);
// Torso
const torso=mk(new THREE.BoxGeometry(0.38,0.48,0.22),M.shirt); torso.position.set(0,1.16,0); personGroup.add(torso);
// Belt
const belt=mk(new THREE.BoxGeometry(0.38,0.04,0.22),M.shoes); belt.position.set(0,0.90,0); personGroup.add(belt);
// Hips
const hips=mk(new THREE.BoxGeometry(0.34,0.12,0.20),M.pants); hips.position.set(0,0.84,0); personGroup.add(hips);

// Legs — fixed stance, slight forward lean
[[-1,0.04],[1,-0.04]].forEach(([s,leanZ])=>{
  const ug=new THREE.Group(); ug.position.set(s*0.095,0.76,0); ug.rotation.z=leanZ; personGroup.add(ug);
  const upper=mk(new THREE.CylinderGeometry(0.066,0.055,0.42,10),M.pants); upper.position.y=-0.21; ug.add(upper);
  const lg=new THREE.Group(); lg.position.y=-0.42; ug.add(lg);
  const lower=mk(new THREE.CylinderGeometry(0.050,0.040,0.40,10),M.pants); lower.position.y=-0.20; lg.add(lower);
  const foot=mk(new THREE.BoxGeometry(0.105,0.065,0.24),M.shoes); foot.position.set(s*0.005,-0.43,0.06); lg.add(foot);
});

/* Arms — shoulders are fixed pivots, forearms extend outward */
// Arm anatomy: upper arm rotates at shoulder, forearm hinges at elbow
// At rest: arms hang slightly forward. When pulling: arms extend toward -Y (in person local space, since person faces -X in world)
// In PERSON LOCAL space: person faces +Z (since rotation.y=π flips).
// "Outward pull in world +X" means in person local space the arms extend in -Z direction.
// Shoulder joints (local to person, mirrored)
const leftShoulder  = new THREE.Group(); leftShoulder.position.set(-0.21, 1.34, 0);  personGroup.add(leftShoulder);
const rightShoulder = new THREE.Group(); rightShoulder.position.set( 0.21, 1.34, 0); personGroup.add(rightShoulder);

// Upper arms
const uArmL=mk(new THREE.CylinderGeometry(0.038,0.032,0.30,10),M.shirt);
const uArmR=mk(new THREE.CylinderGeometry(0.038,0.032,0.30,10),M.shirt);
uArmL.position.y=-0.15; uArmR.position.y=-0.15;
leftShoulder.add(uArmL); rightShoulder.add(uArmR);

// Elbow pivots
const elbowL=new THREE.Group(); elbowL.position.y=-0.30; leftShoulder.add(elbowL);
const elbowR=new THREE.Group(); elbowR.position.y=-0.30; rightShoulder.add(elbowR);

// Forearms
const fArmL=mk(new THREE.CylinderGeometry(0.030,0.025,0.28,10),M.skin);
const fArmR=mk(new THREE.CylinderGeometry(0.030,0.025,0.28,10),M.skin);
fArmL.position.y=-0.14; fArmR.position.y=-0.14;
elbowL.add(fArmL); elbowR.add(fArmR);

// Hands
const handL=mk(new THREE.SphereGeometry(0.040,10,8),M.skin); handL.position.y=-0.285; elbowL.add(handL);
const handR=mk(new THREE.SphereGeometry(0.040,10,8),M.skin); handR.position.y=-0.285; elbowR.add(handR);

/* ════════════════════════════
   LABELS
   ════════════════════════════ */
const LABELS=[
  {id:'l-pulley', text:'Pulley ⌀0.25 m', wx:PCX-0.05, wy:PCY+PR+0.14, wz:0.22, c:'#9999ff'},
  {id:'l-board',  text:'Board 0.10 m',   wx:BOARD_CX-0.18,wy:BOARD_CY+0.12,wz:-0.25,c:'#cc9944'},
  {id:'l-table',  text:'Table h=0.75 m', wx:TABLE_RIGHT+0.05,wy:TH+0.09,wz:TD/2+0.05,c:'#6688aa'},
  {id:'l-weight', text:'10 kg',           wx:PCX-0.22, wy:W_REST_Y+0.05, wz:0.22, c:'#ff6666'},
];
LABELS.forEach(d=>{
  const el=document.createElement('div');
  el.className='lbl3d'; el.id=d.id; el.textContent=d.text;
  el.style.color=d.c; el.style.borderColor=d.c+'44';
  document.body.appendChild(el);
});
function updateLabels(){
  const W=window.innerWidth,H=window.innerHeight;
  LABELS.forEach(d=>{
    const v=new THREE.Vector3(d.wx,d.wy,d.wz).project(camera);
    const el=document.getElementById(d.id);
    if(v.z>1){el.style.opacity='0';return;}
    el.style.opacity='1';
    el.style.left=(v.x+1)/2*W+'px';
    el.style.top=(-v.y+1)/2*H+'px';
  });
  // weight label follows weight
  const wl=document.getElementById('l-weight');
  const wv=new THREE.Vector3(PCX-0.22, weightGroup.position.y, 0.22).project(camera);
  if(wv.z<=1){ wl.style.left=(wv.x+1)/2*W+'px'; wl.style.top=(-wv.y+1)/2*H+'px'; }
}

/* ════════════════════════════
   UPDATE — called on slider change
   ════════════════════════════ */
let pulleyAngle=0, lastPull=0;

function update(pull /* 0..1 */) {
  const pulled = pull * MAX_PULL; // metres of rope pulled out

  /* 1. Weight rises by same amount (1:1 fixed pulley) */
  const weightY = W_REST_Y + pulled;
  weightGroup.position.set(PCX, weightY, PCZ);

  /* 2. Pulley rotation: arc-length = pulled, r=PR → angle = pulled/PR */
  const dPull = pull - lastPull;
  pulleyAngle += (dPull * MAX_PULL) / PR;
  pulleyGroup.rotation.z = -pulleyAngle; // spin in correct direction
  lastPull = pull;

  /* 3. Rope geometry
     Rope is ONE continuous rope:
       A) vertical segment: from weight hook top → bottom of pulley (rising as weight rises)
       B) arc: bottom of pulley → right side of pulley (fixed arc in XY, covers quarter circle)
       C) horizontal segment: right of pulley → person's hands (lengthens as person pulls out)
  */
  clearRope();

  // A) vertical hang
  const hookTop = new THREE.Vector3(PCX, weightY + 0.11, PCZ);
  const pulleyBot = new THREE.Vector3(PCX, PCY - PR, PCZ);
  addSeg(hookTop, pulleyBot);

  // B) Arc bottom → right of pulley (quarter circle CCW in XY: -π/2 to 0)
  const ARC_STEPS = 20;
  let prev = null;
  for(let i=0;i<=ARC_STEPS;i++){
    const a = -Math.PI/2 + (i/ARC_STEPS)*(Math.PI/2); // -90° to 0°
    const pt = new THREE.Vector3(
      PCX + Math.cos(a)*PR,
      PCY + Math.sin(a)*PR,
      PCZ
    );
    if(prev) addSeg(prev, pt);
    prev = pt;
  }

  // C) Horizontal segment: from pulley right side to person's hands
  // As person pulls, rope end moves outward in +X (world space)
  // Person faces -X in world (rotation.y=π), so their hands are in world +X when extended
  // Hand position in world: person is at PERSON_X, arms extend TOWARD the pulley (world -X)
  // But pulling = hands move AWAY from pulley, i.e., world +X of the rope exit point.
  // Rope exit is at (PCX+PR, PCY, PCZ). Person grabs rope and pulls it outward.
  // Hand X in world = ROPE_EXIT_X + 0.05 + pulled (rope gets longer between exit and hands)
  // But the rope is fixed length! The rope just re-distributes:
  //   as weight goes up, the horizontal segment SHORTENS on the weight side (the arc doesn't change).
  //   Actually: the horizontal rope between exit and person's hands lengthens as person pulls back.
  // Person's hand world X = ROPE_EXIT_X + 0.25 + pulled
  const handWorldX = ROPE_EXIT_X + 0.28 + pulled;
  const handWorldY = SHOULDER_Y - 0.18; // hands at roughly elbow height
  const ropeExit   = new THREE.Vector3(ROPE_EXIT_X, ROPE_EXIT_Y, PCZ);
  const handPos    = new THREE.Vector3(handWorldX, handWorldY, PCZ);

  // Slight rope drape (catenary-ish) using midpoint
  const midX = (ROPE_EXIT_X + handWorldX)/2;
  const sag  = Math.max(0, (ROPE_EXIT_Y - handWorldY)*0.3 + 0.04);
  const midPt= new THREE.Vector3(midX, Math.min(ROPE_EXIT_Y, handWorldY) - sag, PCZ);
  addSeg(ropeExit, midPt);
  addSeg(midPt, handPos);

  /* 4. Animate arms
     Person local space: faces +Z (world rotation.y=π).
     "Pulling rope in world +X" = in person's local space = -Z direction.
     Upper arm angle from body: rotate at shoulder.
     At rest (pull=0): arms hang slightly forward (-Z in local = toward table).
     At full pull (pull=1): arms extend forward more (pulled out = hands further from body toward +Z local? No.)

     Wait — person FACES the table (rotation.y=π, so local +Z = world -X).
     Person PULLS the rope AWAY from table = world +X = local -Z.
     So arms extend in local -Z as pull increases.
     shoulder rotation.x controls forward/back reach.
     At rest: arms hang down (rotation.x ~ 0, arms along -Y local).
     While pulling: upper arms rotate to point FORWARD (local +Z, toward table edge)
       and forearms extend to reach the rope coming off the pulley.

     Actually the cleaner model:
     - At rest: arms by side, slightly forward (rotation.x = ~0.3 rad forward)
     - Pulling: shoulder rotates so arm points toward rope end
       = in world, hands are at (handWorldX, handWorldY, 0)
       person is at (PERSON_X, 0, 0), shoulder at (PERSON_X ± 0.21, SHOULDER_Y, 0)
     - Compute angle from shoulder pivot to hand position in local XZ plane
  */

  // In person local space (rotation.y = π, so world-X maps to local+Z):
  // shoulder world pos: (PERSON_X ± 0.21, SHOULDER_Y, 0) (approx, ignoring person group rotation)
  // hand world pos: (handWorldX, handWorldY, 0)
  // vector from shoulder to hand in world: (handWorldX - (PERSON_X-0.21), handWorldY - SHOULDER_Y, 0)
  // (using -0.21 since person.rotation.y=π flips X)
  const shoulderWorldX = PERSON_X; // symmetric, use centre
  const dX = handWorldX - shoulderWorldX; // negative (hand is left of person in world)
  const dY = handWorldY - SHOULDER_Y;     // negative (hand below shoulder)
  // In person local space, world -X = local +Z
  // Arm reach angle from down (-Y local):
  const armAngleFromDown = Math.atan2(-dX, -dY); // angle in ZY plane
  // Upper arm: rotate around X (local) to reach
  // At rest armAngleFromDown ≈ 0; pulling = arm swings forward
  const uArmAngle = Math.min(Math.PI*0.55, armAngleFromDown * 0.7 + 0.2);
  const fArmAngle = Math.max(-0.4, -0.2 - pull * 0.5); // forearm bends inward slightly

  leftShoulder.rotation.x  = uArmAngle;
  rightShoulder.rotation.x = uArmAngle;
  elbowL.rotation.x = fArmAngle;
  elbowR.rotation.x = fArmAngle;
  // Slight outward splay
  leftShoulder.rotation.z  =  0.10 + pull*0.06;
  rightShoulder.rotation.z = -0.10 - pull*0.06;

  /* 5. Force arrows */
  // Pull arrow: at hand position, pointing away from table (+X world)
  pullArrow.position.set(handWorldX + 0.04, handWorldY, PCZ);
  pullArrow.rotation.z = -Math.PI/2; // point in +X

  // Gravity arrow: below weight, pointing down
  gravArrow.position.set(PCX, weightY - 0.13, PCZ);
  // already points down (rotation.x=π set at creation)

  /* 6. HUD */
  document.getElementById('stat-rope').textContent   = pulled.toFixed(2);
  document.getElementById('stat-height').textContent = pulled.toFixed(2);
}

/* ════════════════════════════
   SLIDER
   ════════════════════════════ */
const slider = document.getElementById('pull-slider');
const fill   = document.getElementById('slider-fill');
const thumb  = document.getElementById('slider-thumb');
const pctLbl = document.getElementById('pct-label');

slider.addEventListener('input', ()=>{
  const p = slider.value/100;
  fill.style.width = p*100+'%';
  thumb.style.left = p*100+'%';
  pctLbl.textContent = Math.round(p*100)+'%';
  update(p);
  updateLabels();
  render();
});

/* ════════════════════════════
   RENDER
   ════════════════════════════ */
function render(){ renderer.render(scene, camera); }

/* Init */
resize();
update(0);
updateLabels();
render();

// Re-render on camera change (already called in orbit handlers)
// Continuous animation not needed — only redraw on interaction
