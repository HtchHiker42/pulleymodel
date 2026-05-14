'use strict';

/* ═══════════════════════════════════════════════════════
   PULLEY SIMULATION — Three.js r128
   Physics dimensions (metres):
     Table height  : 0.75 m
     Table top     : 1.2 m wide, 0.7 m deep, 0.06 m thick
     Table legs    : solid, 0.08 m square cross-section
     Board         : 0.10 m wide, 0.40 m tall, 0.18 m deep
     Pulley        : ⌀ 0.25 m (r=0.125), axis = Z (juts toward viewer)
     Rope          : ≤ 10 m, ⌀ 0.02 m
     Weight        : 0.20×0.20×0.20 m, 10 kg
   ═══════════════════════════════════════════════════════ */

const THREE = window.THREE;

/* ── Renderer ── */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const vp = document.getElementById('viewport');
vp.appendChild(renderer.domElement);

function setSize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => { setSize(); render(); });

/* ── Scene & Camera ── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090f);
scene.fog = new THREE.FogExp2(0x07090f, 0.045);

const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 60);
camera.position.set(2.8, 1.9, 3.4);
camera.lookAt(0.3, 0.55, 0);
setSize();

/* ── Orbit controls (manual, no OrbitControls in r128 base) ── */
let isDrag = false, prevMouse = { x: 0, y: 0 };
let spherical = { theta: 0.72, phi: 0.88, r: 4.2 };
let target = new THREE.Vector3(0.3, 0.55, 0);

function updateCamera() {
  const { theta, phi, r } = spherical;
  camera.position.set(
    target.x + r * Math.sin(phi) * Math.sin(theta),
    target.y + r * Math.cos(phi),
    target.z + r * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(target);
}
updateCamera();

renderer.domElement.addEventListener('mousedown', e => {
  isDrag = true; prevMouse = { x: e.clientX, y: e.clientY };
});
window.addEventListener('mouseup', () => isDrag = false);
window.addEventListener('mousemove', e => {
  if (!isDrag) return;
  const dx = e.clientX - prevMouse.x, dy = e.clientY - prevMouse.y;
  spherical.theta -= dx * 0.007;
  spherical.phi   = Math.max(0.12, Math.min(1.45, spherical.phi + dy * 0.006));
  prevMouse = { x: e.clientX, y: e.clientY };
  updateCamera(); render();
});
renderer.domElement.addEventListener('wheel', e => {
  spherical.r = Math.max(1.5, Math.min(10, spherical.r + e.deltaY * 0.004));
  e.preventDefault(); updateCamera(); render();
}, { passive: false });

let touchStart = null;
renderer.domElement.addEventListener('touchstart', e => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
renderer.domElement.addEventListener('touchmove', e => {
  if (!touchStart) return;
  const dx = e.touches[0].clientX - touchStart.x;
  const dy = e.touches[0].clientY - touchStart.y;
  spherical.theta -= dx * 0.009;
  spherical.phi = Math.max(0.12, Math.min(1.45, spherical.phi + dy * 0.007));
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  updateCamera(); render(); e.preventDefault();
}, { passive: false });

/* ── Lighting ── */
scene.add(new THREE.AmbientLight(0x1a2240, 2.0));

const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.position.set(4, 6, 3);
sun.castShadow = true;
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far  = 20;
sun.shadow.camera.left = -4; sun.shadow.camera.right = 4;
sun.shadow.camera.top  =  4; sun.shadow.camera.bottom = -4;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x3355aa, 0.6);
fill.position.set(-3, 2, -2); scene.add(fill);

const rim = new THREE.PointLight(0x88aaff, 0.8, 8);
rim.position.set(-1, 2.5, -1); scene.add(rim);

/* ── Materials ── */
const MAT = {
  floor:    new THREE.MeshStandardMaterial({ color: 0x0e1520, roughness: 0.95, metalness: 0.0 }),
  tableTop: new THREE.MeshStandardMaterial({ color: 0x8B6343, roughness: 0.6,  metalness: 0.0 }),
  tableEdge:new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.7,  metalness: 0.0 }),
  tableLeg: new THREE.MeshStandardMaterial({ color: 0x5a3d22, roughness: 0.8,  metalness: 0.0 }),
  board:    new THREE.MeshStandardMaterial({ color: 0x9c6e3a, roughness: 0.75, metalness: 0.0 }),
  pulley:   new THREE.MeshStandardMaterial({ color: 0x7b8cde, roughness: 0.25, metalness: 0.7 }),
  pulleyHub:new THREE.MeshStandardMaterial({ color: 0xb0baee, roughness: 0.2,  metalness: 0.85}),
  axle:     new THREE.MeshStandardMaterial({ color: 0xd0d8f0, roughness: 0.15, metalness: 0.9 }),
  rope:     new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.85, metalness: 0.0 }),
  weight:   new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.55, metalness: 0.35}),
  weightBand: new THREE.MeshStandardMaterial({ color: 0x992222, roughness: 0.6, metalness: 0.2}),
  handle:   new THREE.MeshStandardMaterial({ color: 0x2d6644, roughness: 0.65, metalness: 0.1 }),
  handleGrip: new THREE.MeshStandardMaterial({ color: 0x1a4030, roughness: 0.85, metalness: 0.0}),
  skin:     new THREE.MeshStandardMaterial({ color: 0xd4956a, roughness: 0.8,  metalness: 0.0 }),
  shirt:    new THREE.MeshStandardMaterial({ color: 0x2255aa, roughness: 0.9,  metalness: 0.0 }),
  pants:    new THREE.MeshStandardMaterial({ color: 0x334466, roughness: 0.85, metalness: 0.0 }),
  shoes:    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9,  metalness: 0.1 }),
  arrowGreen: new THREE.MeshStandardMaterial({ color: 0x4caf7a, roughness: 0.4, metalness: 0.2, emissive: 0x1a4a30 }),
  arrowRed:   new THREE.MeshStandardMaterial({ color: 0xe87040, roughness: 0.4, metalness: 0.2, emissive: 0x4a1a00 }),
};

/* ── Helpers ── */
function mesh(geo, mat, castShadow = true, receiveShadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  return m;
}

function makeCylinder(rTop, rBot, h, segs, mat) {
  return mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat);
}

function makeBox(w, h, d, mat) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function makeSphere(r, w, h, mat) {
  return mesh(new THREE.SphereGeometry(r, w, h), mat);
}

function arrowMesh(length, mat) {
  const g = new THREE.Group();
  const shaft = makeCylinder(0.02, 0.02, length * 0.78, 8, mat);
  shaft.position.y = length * 0.39;
  g.add(shaft);
  const head = makeCylinder(0, 0.055, length * 0.22, 10, mat);
  head.position.y = length * 0.89;
  g.add(head);
  return g;
}

/* ════════════════════════════════════════
   SCENE DIMENSIONS
   ════════════════════════════════════════ */
const TABLE_W  = 1.2;   // X
const TABLE_D  = 0.7;   // Z
const TABLE_TH = 0.06;  // tabletop thickness Y
const TABLE_H  = 0.75;  // floor to tabletop TOP surface
const LEG_W    = 0.07;  // leg cross-section
const LEG_H    = TABLE_H - TABLE_TH;

const TABLE_TOP_Y = TABLE_H;  // Y of top surface

// Table is centred at X=0.35, Z=0
const TABLE_CX = TABLE_W / 2 - 0.2;   // 0.40
const TABLE_CZ = 0.0;

// Board is on the LEFT edge of the table (-X side)
const BOARD_X  = TABLE_CX - TABLE_W / 2;  // left edge X = -0.20
const BOARD_W  = 0.08;
const BOARD_H  = 0.40;
const BOARD_D  = 0.16;
const BOARD_Y  = TABLE_TOP_Y + BOARD_H / 2;  // sitting on table top

// Pulley: axis along Z (juts toward viewer)
const PX = BOARD_X - BOARD_W / 2 - 0.01;   // just proud of board face
const PY = BOARD_Y + BOARD_H / 2 + 0.005;   // top of board
const PZ = 0;
const PR = 0.125;  // radius = 0.125 m (⌀ 0.25 m)

// Rope properties
const ROPE_R = 0.012;
const MAX_PULL = 0.65;  // metres of rope that can be pulled (limited by table height)

// Weight starts hanging at bottom of pulley
const WEIGHT_W = 0.20;
const WEIGHT_H_dim = 0.20;
const WEIGHT_HANG_ROPE = 0.10;  // slack below pulley at rest

// Handle starts on table top, near right edge
const HANDLE_REST_X = TABLE_CX + TABLE_W / 2 - 0.22;
const HANDLE_Y = TABLE_TOP_Y + 0.04;
const HANDLE_Z = 0;

/* ════════════════════════════════════════
   BUILD STATIC GEOMETRY
   ════════════════════════════════════════ */

/* Floor */
const floorMesh = mesh(new THREE.PlaneGeometry(12, 12), MAT.floor, false, true);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = -0.001;
scene.add(floorMesh);

/* Floor grid lines */
{
  const grid = new THREE.GridHelper(12, 48, 0x111c2c, 0x111c2c);
  grid.position.y = 0.001;
  scene.add(grid);
}

/* ── TABLE (solid, physically correct) ── */
const tableGroup = new THREE.Group();
scene.add(tableGroup);

// Tabletop
const topMesh = makeBox(TABLE_W, TABLE_TH, TABLE_D, MAT.tableTop);
topMesh.position.set(TABLE_CX, TABLE_TOP_Y - TABLE_TH / 2, TABLE_CZ);
tableGroup.add(topMesh);

// Solid apron / skirt around table (makes it look non-hollow)
const APRON_H = 0.08, APRON_TH = 0.04;
// Front apron
const apronF = makeBox(TABLE_W - LEG_W * 2, APRON_H, APRON_TH, MAT.tableEdge);
apronF.position.set(TABLE_CX, TABLE_TOP_Y - TABLE_TH - APRON_H / 2, TABLE_CZ + TABLE_D / 2 - APRON_TH / 2);
tableGroup.add(apronF);
// Back apron
const apronB = makeBox(TABLE_W - LEG_W * 2, APRON_H, APRON_TH, MAT.tableEdge);
apronB.position.set(TABLE_CX, TABLE_TOP_Y - TABLE_TH - APRON_H / 2, TABLE_CZ - TABLE_D / 2 + APRON_TH / 2);
tableGroup.add(apronB);
// Left apron
const apronL = makeBox(APRON_TH, APRON_H, TABLE_D - LEG_W * 2, MAT.tableEdge);
apronL.position.set(TABLE_CX - TABLE_W / 2 + APRON_TH / 2, TABLE_TOP_Y - TABLE_TH - APRON_H / 2, TABLE_CZ);
tableGroup.add(apronL);
// Right apron
const apronR = makeBox(APRON_TH, APRON_H, TABLE_D - LEG_W * 2, MAT.tableEdge);
apronR.position.set(TABLE_CX + TABLE_W / 2 - APRON_TH / 2, TABLE_TOP_Y - TABLE_TH - APRON_H / 2, TABLE_CZ);
tableGroup.add(apronR);

// 4 solid legs
[
  [TABLE_CX - TABLE_W / 2 + LEG_W / 2, TABLE_CZ - TABLE_D / 2 + LEG_W / 2],
  [TABLE_CX + TABLE_W / 2 - LEG_W / 2, TABLE_CZ - TABLE_D / 2 + LEG_W / 2],
  [TABLE_CX - TABLE_W / 2 + LEG_W / 2, TABLE_CZ + TABLE_D / 2 - LEG_W / 2],
  [TABLE_CX + TABLE_W / 2 - LEG_W / 2, TABLE_CZ + TABLE_D / 2 - LEG_W / 2],
].forEach(([lx, lz]) => {
  const leg = makeBox(LEG_W, LEG_H, LEG_W, MAT.tableLeg);
  leg.position.set(lx, LEG_H / 2, lz);
  tableGroup.add(leg);
  // Foot pad
  const foot = makeBox(LEG_W + 0.02, 0.015, LEG_W + 0.02, MAT.tableLeg);
  foot.position.set(lx, 0.008, lz);
  tableGroup.add(foot);
});

/* ── WOODEN BOARD ── */
const boardMesh = makeBox(BOARD_W, BOARD_H, BOARD_D, MAT.board);
boardMesh.position.set(BOARD_X, BOARD_Y, 0);
scene.add(boardMesh);

// Board mounting bolt
const bolt = makeCylinder(0.012, 0.012, 0.1, 8, MAT.axle);
bolt.rotation.z = Math.PI / 2;
bolt.position.set(BOARD_X + 0.01, BOARD_Y - 0.08, 0);
scene.add(bolt);

/* ── PULLEY ── */
const pulleyGroup = new THREE.Group();
pulleyGroup.position.set(PX, PY, PZ);
scene.add(pulleyGroup);

// Outer rim torus
const rimTorus = mesh(new THREE.TorusGeometry(PR, 0.018, 16, 64), MAT.pulley);
pulleyGroup.add(rimTorus);

// Groove torus (darker, to show rope groove)
const grooveTorus = mesh(new THREE.TorusGeometry(PR - 0.01, 0.012, 10, 64),
  new THREE.MeshStandardMaterial({ color: 0x3344aa, roughness: 0.3, metalness: 0.6 }));
pulleyGroup.add(grooveTorus);

// Disk body
const disk = makeCylinder(PR - 0.022, PR - 0.022, 0.08, 32, MAT.pulley);
disk.rotation.x = Math.PI / 2;
pulleyGroup.add(disk);

// Hub
const hub = makeCylinder(0.028, 0.028, 0.10, 16, MAT.pulleyHub);
hub.rotation.x = Math.PI / 2;
pulleyGroup.add(hub);

// Axle through hub
const axleMesh = makeCylinder(0.012, 0.012, 0.22, 10, MAT.axle);
axleMesh.rotation.x = Math.PI / 2;
pulleyGroup.add(axleMesh);

// 6 spokes
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  const spoke = makeCylinder(0.008, 0.008, PR - 0.042, 6, MAT.pulleyHub);
  spoke.rotation.x = Math.PI / 2;
  spoke.position.set(Math.cos(a) * (PR - 0.042) / 2, Math.sin(a) * (PR - 0.042) / 2, 0);
  spoke.rotation.z = a + Math.PI / 2;
  // Actually: spokes radiate from centre
  const spokeR = makeCylinder(0.006, 0.006, PR * 0.75, 6, MAT.pulleyHub);
  spokeR.rotation.z = a;
  spokeR.position.set(Math.cos(a) * PR * 0.375, Math.sin(a) * PR * 0.375, 0);
  pulleyGroup.add(spokeR);
}

// Pulley axis is Z, so the torus already lies in XY plane — correct orientation

/* ── WEIGHT (dynamic) ── */
const weightGroup = new THREE.Group();
scene.add(weightGroup);

const weightBody = makeBox(WEIGHT_W, WEIGHT_H_dim, WEIGHT_W, MAT.weight);
weightGroup.add(weightBody);

// Bands around weight
[-0.04, 0, 0.04].forEach(dy => {
  const band = makeBox(WEIGHT_W + 0.005, 0.025, WEIGHT_W + 0.005, MAT.weightBand);
  band.position.y = dy;
  weightGroup.add(band);
});

// Hook/ring on top
const ring = mesh(new THREE.TorusGeometry(0.025, 0.006, 8, 16), MAT.axle);
ring.position.y = WEIGHT_H_dim / 2 + 0.02;
weightGroup.add(ring);

/* ── HANDLE (dynamic) ── */
const handleGroup = new THREE.Group();
scene.add(handleGroup);

const handleBar = makeCylinder(0.024, 0.024, 0.28, 14, MAT.handle);
handleBar.rotation.z = Math.PI / 2;
handleGroup.add(handleBar);

// Grip wraps
[-0.08, 0.08].forEach(dx => {
  const wrap = makeCylinder(0.028, 0.028, 0.075, 12, MAT.handleGrip);
  wrap.rotation.z = Math.PI / 2;
  wrap.position.x = dx;
  handleGroup.add(wrap);
});

// End caps
[-0.14, 0.14].forEach(dx => {
  const cap = makeSphere(0.028, 10, 8, MAT.axle);
  cap.position.x = dx;
  handleGroup.add(cap);
});

/* ── PERSON ── */
const personGroup = new THREE.Group();
scene.add(personGroup);
personGroup.position.set(HANDLE_REST_X + 0.6, 0, 0);

// Body proportions (rough humanoid at ~1.75m)
const HEAD_Y = 1.62, TORSO_TOP = 1.42, TORSO_BOT = 0.92;
const HIP_Y  = 0.90, KNEE_Y = 0.50, FOOT_Y = 0.0;

// Head
const head = makeSphere(0.11, 16, 12, MAT.skin);
head.position.set(0, HEAD_Y, 0);
personGroup.add(head);

// Neck
const neck = makeCylinder(0.04, 0.04, 0.08, 8, MAT.skin);
neck.position.set(0, TORSO_TOP + 0.07, 0);
personGroup.add(neck);

// Torso
const torso = makeBox(0.36, TORSO_TOP - TORSO_BOT, 0.22, MAT.shirt);
torso.position.set(0, (TORSO_TOP + TORSO_BOT) / 2, 0);
personGroup.add(torso);

// Hips
const hips = makeBox(0.32, 0.10, 0.20, MAT.pants);
hips.position.set(0, HIP_Y, 0);
personGroup.add(hips);

// Upper arms (will be rotated dynamically)
const leftUpperArm  = new THREE.Group();
const rightUpperArm = new THREE.Group();
personGroup.add(leftUpperArm);
personGroup.add(rightUpperArm);

const armGeoU = new THREE.CylinderGeometry(0.042, 0.035, 0.30, 10);
const leftUA  = mesh(armGeoU.clone(), MAT.shirt);
leftUA.position.y = -0.15;
leftUpperArm.position.set(-0.20, TORSO_TOP - 0.04, 0);
leftUpperArm.add(leftUA);

const rightUA = mesh(armGeoU.clone(), MAT.shirt);
rightUA.position.y = -0.15;
rightUpperArm.position.set(0.20, TORSO_TOP - 0.04, 0);
rightUpperArm.add(rightUA);

// Forearms
const leftForeArm  = new THREE.Group();
const rightForeArm = new THREE.Group();
leftUpperArm.add(leftForeArm);
rightUpperArm.add(rightForeArm);
leftForeArm.position.y  = -0.30;
rightForeArm.position.y = -0.30;

const armGeoF = new THREE.CylinderGeometry(0.034, 0.028, 0.28, 10);
const leftFA  = mesh(armGeoF.clone(), MAT.skin);
leftFA.position.y  = -0.14;
leftForeArm.add(leftFA);
const rightFA = mesh(armGeoF.clone(), MAT.skin);
rightFA.position.y = -0.14;
rightForeArm.add(rightFA);

// Hands
const leftHand  = makeSphere(0.045, 10, 8, MAT.skin);
const rightHand = makeSphere(0.045, 10, 8, MAT.skin);
leftHand.position.y  = -0.28;
rightHand.position.y = -0.28;
leftForeArm.add(leftHand);
rightForeArm.add(rightHand);

// Legs
function makeLeg(side) {
  const g = new THREE.Group();
  // Upper leg
  const upper = makeCylinder(0.07, 0.058, 0.40, 10, MAT.pants);
  upper.position.y = -0.20;
  g.add(upper);
  // Lower leg
  const lower = new THREE.Group();
  lower.position.y = -0.40;
  g.add(lower);
  const shin = makeCylinder(0.052, 0.042, 0.38, 10, MAT.pants);
  shin.position.y = -0.19;
  lower.add(shin);
  // Foot
  const foot = makeBox(0.10, 0.06, 0.22, MAT.shoes);
  foot.position.set(0, -0.41, 0.05);
  lower.add(foot);
  g.position.set(side * 0.10, HIP_Y, 0);
  return { g, lower };
}
const leftLeg  = makeLeg(-1);
const rightLeg = makeLeg( 1);
personGroup.add(leftLeg.g);
personGroup.add(rightLeg.g);

/* ── FORCE ARROWS ── */
const forceArrow = arrowMesh(0.55, MAT.arrowGreen);
scene.add(forceArrow);

const gravArrow = arrowMesh(0.45, MAT.arrowRed);
gravArrow.rotation.x = Math.PI; // point downward
scene.add(gravArrow);

/* ── ROPE (dynamic, rebuilt each frame) ── */
let ropeSegments = [];

function clearRope() {
  ropeSegments.forEach(m => {
    scene.remove(m);
    m.geometry.dispose();
  });
  ropeSegments = [];
}

function addRopeSeg(p1, p2) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  if (len < 0.001) return;
  const geo = new THREE.CylinderGeometry(ROPE_R, ROPE_R, len, 8, 1);
  const m = mesh(geo, MAT.rope);
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  m.position.copy(mid);
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize()
  );
  scene.add(m);
  ropeSegments.push(m);
}

function buildRope(pull) {
  clearRope();

  // pull: 0–1 normalised
  // Weight rises by pull * MAX_PULL
  const raised = pull * MAX_PULL;

  // Weight Y position
  const weightRestY = TABLE_TOP_Y - WEIGHT_H_dim / 2 - WEIGHT_HANG_ROPE - PR * 2;
  const weightCurY  = weightRestY + raised;
  weightGroup.position.set(PX, weightCurY, PZ);

  // Bottom of pulley where hanging rope meets the groove
  const ropeBottomEntry = new THREE.Vector3(PX, PY - PR, PZ);

  // Top of weight hook
  const weightTop = new THREE.Vector3(PX, weightCurY + WEIGHT_H_dim / 2 + 0.02, PZ);

  // Vertical hang segment
  addRopeSeg(weightTop, ropeBottomEntry);

  // Arc over pulley (in XY plane, from bottom -π/2 going left to right = +π/2)
  const arcSteps = 24;
  let prev = null;
  for (let i = 0; i <= arcSteps; i++) {
    const angle = -Math.PI / 2 + (i / arcSteps) * Math.PI;
    const cur = new THREE.Vector3(
      PX + Math.cos(angle) * PR,
      PY + Math.sin(angle) * PR,
      PZ
    );
    if (prev) addRopeSeg(prev, cur);
    prev = cur;
  }

  // Rope exits pulley at the right side (angle = +π/2 → point is PX, PY+PR) — no wait:
  // angle=+π/2 → cos=0, sin=1 → (PX, PY+PR) = top of pulley
  // We want rope to exit to the right: angle=0 → cos=1, sin=0 → (PX+PR, PY)
  // Arc should go from bottom (−π/2) counterclockwise to right (0):
  // That means the rope enters the groove at the bottom and exits at the right side.
  // Let me fix: arc from angle=-π/2 to angle=0 (bottom to right)

  clearRope();

  // Vertical hang
  addRopeSeg(weightTop, ropeBottomEntry);

  // Arc from bottom of pulley (angle=-π/2) to right of pulley (angle=0)
  const arcSteps2 = 18;
  let prevP = null;
  for (let i = 0; i <= arcSteps2; i++) {
    const angle = -Math.PI / 2 + (i / arcSteps2) * (Math.PI / 2);
    const cur = new THREE.Vector3(
      PX + Math.cos(angle) * PR,
      PY + Math.sin(angle) * PR,
      PZ
    );
    if (prevP) addRopeSeg(prevP, cur);
    prevP = cur;
  }

  // Pulley exit point (right side, angle=0)
  const ropeExitX = PX + PR;
  const ropeExitY = PY;

  // Handle position: as you pull, handle moves away from pulley (toward +X)
  const handleX = HANDLE_REST_X - raised;
  const handleCurY = HANDLE_Y;
  handleGroup.position.set(handleX, handleCurY, HANDLE_Z);

  // Rope from pulley exit to handle (slight drape using a midpoint)
  const ropeStart = new THREE.Vector3(ropeExitX, ropeExitY, PZ);
  const ropeMid   = new THREE.Vector3(
    (ropeExitX + handleX) / 2,
    handleCurY + Math.max(0.02, (ropeExitY - handleCurY) * 0.5),
    PZ
  );
  const ropeEnd   = new THREE.Vector3(handleX - 0.14, handleCurY, HANDLE_Z);

  addRopeSeg(ropeStart, ropeMid);
  addRopeSeg(ropeMid,   ropeEnd);

  // Update person position & arm animation
  const personX = handleX + 0.52;
  personGroup.position.x = personX;

  // Lean forward slightly as they pull
  const lean = pull * 0.12;
  personGroup.rotation.z = lean;

  // Arms reach toward the handle
  const armReach = -Math.PI / 2 + pull * 0.35;
  leftUpperArm.rotation.z  =  0.25 + pull * 0.15;
  rightUpperArm.rotation.z = -0.25 - pull * 0.15;
  leftUpperArm.rotation.x  = armReach;
  rightUpperArm.rotation.x = armReach;
  leftForeArm.rotation.x   = 0.4 - pull * 0.2;
  rightForeArm.rotation.x  = 0.4 - pull * 0.2;

  // Legs (slight stride)
  const stride = pull * 0.15;
  leftLeg.g.rotation.x  =  stride;
  rightLeg.g.rotation.x = -stride;
  leftLeg.lower.rotation.x  = Math.max(0, stride * 0.5);
  rightLeg.lower.rotation.x = Math.max(0, stride * 0.3);

  // Force arrow (green) at handle, pointing right
  forceArrow.position.set(handleX + 0.16, handleCurY, HANDLE_Z);
  forceArrow.rotation.z = -Math.PI / 2;

  // Gravity arrow (red) below weight
  gravArrow.position.set(PX, weightCurY - WEIGHT_H_dim / 2 - 0.05, PZ);
  gravArrow.rotation.x = Math.PI;

  // Update HUD stats
  document.getElementById('stat-rope').textContent = (raised * 2).toFixed(2);   // rope pulled = 2× weight rise (fixed pulley)
  document.getElementById('stat-height').textContent = raised.toFixed(2);
}

/* ── 3D Labels (HTML overlay) ── */
const labelDefs = [
  { id: 'lbl-pulley',  text: 'Pulley  ⌀ 0.25 m', wx: PX + 0.05, wy: PY + PR + 0.12, wz: 0.18, col: '#9999ff' },
  { id: 'lbl-board',   text: 'Board  0.10 m',     wx: BOARD_X - 0.15, wy: BOARD_Y + 0.15, wz: -0.22, col: '#cc9944' },
  { id: 'lbl-table',   text: 'Table  h = 0.75 m', wx: TABLE_CX + 0.3, wy: TABLE_TOP_Y + 0.08, wz: TABLE_D / 2 + 0.1, col: '#7788aa' },
];

labelDefs.forEach(d => {
  const el = document.createElement('div');
  el.className = 'label3d';
  el.id = d.id;
  el.textContent = d.text;
  el.style.color = d.col;
  el.style.borderColor = d.col + '44';
  document.body.appendChild(el);
});

function updateLabels() {
  const W = window.innerWidth, H = window.innerHeight;
  labelDefs.forEach(d => {
    const v = new THREE.Vector3(d.wx, d.wy, d.wz);
    v.project(camera);
    const sx = (v.x + 1) / 2 * W;
    const sy = (-v.y + 1) / 2 * H;
    const el = document.getElementById(d.id);
    if (v.z > 1) { el.style.opacity = '0'; return; }
    el.style.opacity = '1';
    el.style.left = sx + 'px';
    el.style.top  = sy + 'px';
  });
}

/* ── Slider ── */
const slider = document.getElementById('pull-slider');
const sliderFill = document.getElementById('slider-fill');
const sliderTrack = document.getElementById('slider-track');

slider.addEventListener('input', () => {
  const pct = slider.value / 100;
  sliderFill.style.width = pct * 100 + '%';
  sliderTrack.style.setProperty('--thumb-pct', pct * 100 + '%');
  buildRope(pct);
  updateLabels();
  render();
});

/* ── Render ── */
function render() {
  renderer.render(scene, camera);
}

/* ── Init ── */
buildRope(0);
updateLabels();
render();

// Animate pulley spin when dragging
let lastPull = 0;
let pulleyAngle = 0;

renderer.domElement.addEventListener('mousemove', () => {
  render();
});

slider.addEventListener('input', () => {
  const pull = slider.value / 100;
  const delta = pull - lastPull;
  pulleyAngle += delta * MAX_PULL * (1 / PR) * (180 / Math.PI);
  pulleyGroup.rotation.z = (pulleyAngle * Math.PI) / 180;
  lastPull = pull;
});
