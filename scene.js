'use strict';
/* ═══════════════════════════════════════════════════════
   FIXED PULLEY — solid 3-D simulation
   Weight path (t 0→1):
     Phase A (0→PA)    Hangs and rises vertically left of table
     Phase B (PA→PB)   Rides OVER the pulley rim (outside, centre at PR+W_HALF from pulley centre)
     Phase C (PB→1)    Slides along tabletop from left edge toward right
   All materials fully opaque — no transparency anywhere.
   Smooth ping-pong play/pause button.
   ═══════════════════════════════════════════════════════ */

const T = window.THREE;

/* ─── Renderer ─── */
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = T.PCFSoftShadowMap;
renderer.toneMapping        = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById('vp').appendChild(renderer.domElement);

/* ─── Camera ─── */
const camera = new T.PerspectiveCamera(42, 1, 0.01, 80);
let sph = { th: -0.50, ph: 0.72, r: 5.5 };
const tgt = new T.Vector3(0.5, 0.9, 0.0);
function camSync() {
  camera.position.set(
    tgt.x + sph.r * Math.sin(sph.ph) * Math.sin(sph.th),
    tgt.y + sph.r * Math.cos(sph.ph),
    tgt.z + sph.r * Math.sin(sph.ph) * Math.cos(sph.th)
  );
  camera.lookAt(tgt);
}
camSync();

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  draw();
}
window.addEventListener('resize', onResize);

// Orbit
let drag = false, lx = 0, ly = 0;
renderer.domElement.addEventListener('mousedown', e => { drag=true; lx=e.clientX; ly=e.clientY; });
window.addEventListener('mouseup', () => { drag=false; });
window.addEventListener('mousemove', e => {
  if (!drag) return;
  sph.th -= (e.clientX - lx) * 0.008; lx = e.clientX;
  sph.ph  = Math.max(0.10, Math.min(1.50, sph.ph + (e.clientY - ly) * 0.006)); ly = e.clientY;
  camSync(); draw();
});
renderer.domElement.addEventListener('wheel', e => {
  sph.r = Math.max(2.0, Math.min(15, sph.r + e.deltaY * 0.004));
  e.preventDefault(); camSync(); draw();
}, { passive: false });
let tx=0,ty=0;
renderer.domElement.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{
  sph.th-=(e.touches[0].clientX-tx)*0.010; tx=e.touches[0].clientX;
  sph.ph=Math.max(0.10,Math.min(1.50,sph.ph+(e.touches[0].clientY-ty)*0.008)); ty=e.touches[0].clientY;
  camSync(); draw(); e.preventDefault();
},{passive:false});

/* ─── Scene ─── */
const scene = new T.Scene();
scene.background = new T.Color(0x06080f);
scene.fog = new T.FogExp2(0x06080f, 0.028);

/* ─── Lights ─── */
scene.add(new T.AmbientLight(0x1a2244, 2.8));

const sun = new T.DirectionalLight(0xfff5e0, 3.0);
sun.position.set(5, 9, 4);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left:-5, right:5, top:5, bottom:-5, near:0.1, far:26 });
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0003;
scene.add(sun);

const fill = new T.DirectionalLight(0x2244bb, 0.9); fill.position.set(-5, 2, -4); scene.add(fill);
const rim  = new T.PointLight(0x6688ff, 1.2, 14);   rim.position.set(-2, 4, -2);  scene.add(rim);
const warm = new T.PointLight(0xffcc88, 0.7, 9);    warm.position.set(4, 3, 2);   scene.add(warm);

/* ─── Fully opaque materials — no transparency ─── */
function solidMat(hexColor, roughness=0.65, metalness=0, emissiveHex=null, emissiveIntensity=0.4) {
  const params = { color: hexColor, roughness, metalness };
  if (emissiveHex !== null) { params.emissive = emissiveHex; params.emissiveIntensity = emissiveIntensity; }
  return new T.MeshStandardMaterial(params);
}

const mat = {
  floor:    solidMat(0x0b0f18, 0.97),
  grid:     solidMat(0x0e1826, 0.97),
  tableTop: solidMat(0x8B6030, 0.50),    // warm oak
  tableEdge:solidMat(0x6a4520, 0.65),
  tableLeg: solidMat(0x4e3010, 0.78),
  board:    solidMat(0x9a6828, 0.68),
  pRim:     solidMat(0x6677dd, 0.18, 0.82),  // blue metallic pulley
  pFace:    solidMat(0x4455bb, 0.22, 0.75),
  pGroove:  solidMat(0x222244, 0.28, 0.70),
  pHub:     solidMat(0xaabbd8, 0.16, 0.90),
  axle:     solidMat(0xd8e4f0, 0.12, 0.94),
  rope:     solidMat(0xf5a623, 0.78),        // orange rope
  wFace:    solidMat(0xcc2222, 0.48, 0.32),  // red weight
  wEdge:    solidMat(0x991111, 0.55, 0.28),
  wBand:    solidMat(0x771111, 0.60, 0.22),
  skin:     solidMat(0xd49060, 0.75),
  shirt:    solidMat(0x1a4a99, 0.80),
  pants:    solidMat(0x223355, 0.80),
  shoes:    solidMat(0x0e0e0e, 0.88, 0.12),
  hair:     solidMat(0x1a0e04, 0.88),
  belt:     solidMat(0x0e0e0e, 0.74, 0.22),
  arrowG:   solidMat(0x4caf7a, 0.32, 0.18, 0x0c3020, 0.5),
  arrowR:   solidMat(0xe87040, 0.32, 0.18, 0x3a1000, 0.5),
};

/* ─── Geometry helpers ─── */
function mesh(geo, m, cast=true, recv=true) {
  const o = new T.Mesh(geo, m);
  o.castShadow = cast; o.receiveShadow = recv;
  return o;
}
function Box(w,h,d,m)       { return mesh(new T.BoxGeometry(w,h,d), m); }
function Cyl(rt,rb,h,s,m)   { return mesh(new T.CylinderGeometry(rt,rb,h,s), m); }
function Sph(r,w,h,m)       { return mesh(new T.SphereGeometry(r,w,h), m); }
function Tor(R,r,s,t,m)     { return mesh(new T.TorusGeometry(R,r,s,t), m); }
function at(o,x,y,z)        { o.position.set(x,y,z); scene.add(o); return o; }
function atG(o,g,x,y,z)     { o.position.set(x,y,z); g.add(o); return o; }

/* ════════════════════════════════════════
   WORLD DIMENSIONS  (metres)
   ════════════════════════════════════════ */
const TW=1.20, TD=0.70, TH=0.75, TTH=0.06;
const TCX=0.40;
const TLX = TCX - TW/2;   // -0.20  table left edge
const TRX = TCX + TW/2;   //  1.00  table right edge
const TTY = TH;            //  0.75  tabletop Y

const BW=0.08, BH=0.40, BD=0.16;
const BCX = TLX - BW/2;   // -0.24  board centre X
const BCY = TTY + BH/2;   //  0.95  board centre Y

const PR = 0.125;          // pulley radius (⌀0.25 m)
// Pulley centre — positioned so its bottom touches just above board top
const PCX = BCX - BW/2 - 0.006;   // -0.286
const PCY = TTY + BH - PR - 0.01; //  1.115
const PCZ = 0.0;

const ROPE_R  = 0.012;
const W_CUBE  = 0.20;
const W_HALF  = W_CUBE / 2;

/* ── Phase boundaries ──
   Weight travels: rise → arc over rim → slide on table
   Riding over the pulley means weight centre is at (PR + W_HALF) from pulley centre
   Arc angle: -π/2 (bottom) → +π/2 (top) — weight goes over the TOP of the pulley
   But we want it to go bottom → right, not over the top.
   Correct arc: bottom (-π/2) → right (0) — quarter circle on the right-hand side
   Weight centre offset from pulley centre = PR + W_HALF (outside the rim)
*/
const W_OFFSET = PR + W_HALF + 0.008;  // weight centre rides on outside of rim

// Phase A: weight rises from rest up to bottom of pulley
const W_REST_Y   = PCY - PR - 0.18 - W_HALF;           // start position
const RISE_DIST  = (PCY - PR - W_HALF) - W_REST_Y;     // vertical distance to rise until weight bottom touches pulley bottom

// Phase B: arc from angle=-π/2 (bottom) to angle=0 (right side), weight rides OVER rim
const ARC_ANGLE  = Math.PI / 2;      // quarter circle
const ARC_LEN    = ARC_ANGLE * W_OFFSET;   // arc length at weight-centre radius

// Phase C: weight slides along table from where it lands to the right
// Weight lands at x=(PCX+W_OFFSET), y=TTY+W_HALF when angle=0
const W_LAND_X   = PCX + W_OFFSET;
const W_SLIDE_TO = TRX - 0.24;
const SLIDE_DIST = W_SLIDE_TO - W_LAND_X;

const TOTAL_DIST = RISE_DIST + ARC_LEN + SLIDE_DIST;
const PA = RISE_DIST  / TOTAL_DIST;    // end of phase A
const PB = PA + ARC_LEN / TOTAL_DIST;  // end of phase B

// Person
const PX0     = TRX + 0.72;
const MAX_WALK = 0.55;

/* ════════════════════════════════════════
   STATIC SCENE OBJECTS
   ════════════════════════════════════════ */

/* Floor */
const floorM = mesh(new T.PlaneGeometry(18,18), mat.floor, false, true);
floorM.rotation.x = -Math.PI/2; floorM.position.y = 0; scene.add(floorM);
const grid = new T.GridHelper(18, 72, 0x0d1624, 0x0d1624);
grid.position.y = 0.001; scene.add(grid);

/* ── TABLE ── */
// Top slab
at(Box(TW, TTH, TD, mat.tableTop), TCX, TTY - TTH/2, 0);

// Aprons
const APH=0.09, APT=0.038, LGW=0.072;
[
  [TCX,   TTY-TTH-APH/2,  TD/2-APT/2,  TW-LGW*2, APH, APT],
  [TCX,   TTY-TTH-APH/2, -TD/2+APT/2,  TW-LGW*2, APH, APT],
  [TLX+APT/2, TTY-TTH-APH/2, 0,         APT, APH, TD-LGW*2],
  [TRX-APT/2, TTY-TTH-APH/2, 0,         APT, APH, TD-LGW*2],
].forEach(([x,y,z,w,h,d]) => at(Box(w,h,d,mat.tableEdge), x, y, z));

// 4 solid legs
[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) => {
  const LH = TTY - TTH;
  at(Box(LGW, LH, LGW, mat.tableLeg), TCX+sx*(TW/2-LGW/2), LH/2, sz*(TD/2-LGW/2));
  at(Box(LGW+0.022, 0.018, LGW+0.022, mat.tableLeg), TCX+sx*(TW/2-LGW/2), 0.009, sz*(TD/2-LGW/2));
});

/* ── BOARD ── */
at(Box(BW, BH, BD, mat.board), BCX, BCY, PCZ);
// Mounting bolts
[-0.10, 0.10].forEach(dy => {
  const bolt = Cyl(0.009, 0.009, BW+0.022, 8, mat.axle);
  bolt.rotation.z = Math.PI/2;
  at(bolt, BCX, BCY+dy, PCZ);
});

/* ── PULLEY ── */
const pulleyG = new T.Group();
pulleyG.position.set(PCX, PCY, PCZ);
scene.add(pulleyG);

// Outer rim (torus)
atG(Tor(PR, 0.018, 18, 72, mat.pRim), pulleyG, 0, 0, 0);
// Groove ring
atG(Tor(PR-0.006, 0.010, 10, 72, mat.pGroove), pulleyG, 0, 0, 0);
// Disk body
const diskM = Cyl(PR-0.020, PR-0.020, 0.074, 32, mat.pFace);
diskM.rotation.x = Math.PI/2; pulleyG.add(diskM);
// Hub
const hubM = Cyl(0.026, 0.026, 0.100, 14, mat.pHub);
hubM.rotation.x = Math.PI/2; pulleyG.add(hubM);
// Axle (runs through board)
const axleM = Cyl(0.011, 0.011, BD+0.070, 10, mat.axle);
axleM.rotation.x = Math.PI/2; pulleyG.add(axleM);
// 6 spokes
for (let i=0; i<6; i++) {
  const a = (i/6)*Math.PI*2;
  const sp = Cyl(0.007, 0.007, PR*0.78, 6, mat.pHub);
  sp.position.set(Math.cos(a)*PR*0.39, Math.sin(a)*PR*0.39, 0);
  sp.rotation.z = a + Math.PI/2;
  pulleyG.add(sp);
}
// Mounting bracket (U-shape connecting axle to board face)
const brktM = Box(0.040, 0.058, BD*0.62, mat.axle);
brktM.position.set(BW/2+0.020, 0, 0); pulleyG.add(brktM);

/* ── WEIGHT ── (dynamic group) */
const wGroup = new T.Group();
scene.add(wGroup);

// Main body
wGroup.add(Box(W_CUBE, W_CUBE, W_CUBE, mat.wFace));
// Edge detail strips (makes it look solid/real)
[
  [W_CUBE+0.003, 0.024, W_CUBE+0.003, mat.wBand, 0,-0.06,0],
  [W_CUBE+0.003, 0.024, W_CUBE+0.003, mat.wBand, 0, 0.00,0],
  [W_CUBE+0.003, 0.024, W_CUBE+0.003, mat.wBand, 0, 0.06,0],
].forEach(([w,h,d,m,dx,dy,dz]) => {
  const b = Box(w,h,d,m); b.position.set(dx,dy,dz); wGroup.add(b);
});
// Hook ring on top
const hookRing = Tor(0.024, 0.007, 10, 18, mat.axle);
hookRing.position.y = W_HALF + 0.024;
wGroup.add(hookRing);

/* ════════════════════════════════════════
   PERSON — full articulated body
   ════════════════════════════════════════ */
const person = new T.Group();
person.rotation.y = Math.PI;   // face -X (toward table)
scene.add(person);

// Head
const headG = new T.Group(); headG.position.set(0, 1.70, 0); person.add(headG);
headG.add(Sph(0.106, 22, 15, mat.skin));
const hairS = Sph(0.109, 18, 11, mat.hair); hairS.scale.y=0.55; hairS.position.y=0.056; headG.add(hairS);
[-1,1].forEach(s => { const e=Sph(0.028,8,6,mat.skin); e.position.set(s*0.112,-0.004,0); headG.add(e); });

// Neck
const neckM = Cyl(0.038, 0.043, 0.09, 10, mat.skin);
neckM.position.set(0, 1.505, 0); person.add(neckM);

// Torso
const chestM = Box(0.38, 0.30, 0.22, mat.shirt); chestM.position.set(0, 1.24, 0); person.add(chestM);
const abdoM  = Box(0.34, 0.20, 0.20, mat.shirt);  abdoM.position.set(0, 0.99, 0);  person.add(abdoM);
// Shirt collar
const collar = Box(0.20, 0.04, 0.07, mat.skin); collar.position.set(0, 1.375, -0.10); person.add(collar);
// Belt
const beltM = Box(0.36, 0.04, 0.21, mat.belt); beltM.position.set(0, 0.885, 0); person.add(beltM);
// Hips
const hipM = Box(0.34, 0.14, 0.21, mat.pants); hipM.position.set(0, 0.82, 0); person.add(hipM);

// Legs
function mkLeg(side) {
  const g = new T.Group(); g.position.set(side*0.100, 0.76, 0);
  const thigh = new T.Group();
  Cyl(0.065,0.054,0.40,12,mat.pants).position.y=-0.20; thigh.add(thigh.children[0]||thigh);
  const thighM = Cyl(0.065,0.054,0.40,12,mat.pants); thighM.position.y=-0.20; thigh.add(thighM);
  g.add(thigh);
  const knee = new T.Group(); knee.position.y=-0.40; thigh.add(knee);
  const shinM = Cyl(0.050,0.038,0.40,12,mat.pants); shinM.position.y=-0.20; knee.add(shinM);
  const footG = new T.Group(); footG.position.y=-0.41; knee.add(footG);
  const shoeM = Box(0.105,0.066,0.26,mat.shoes); shoeM.position.set(0,0,0.062); footG.add(shoeM);
  Box(0.110,0.019,0.265,mat.belt).position.set(0,-0.033,0.062);
  const sole = Box(0.110,0.019,0.265,mat.belt); sole.position.set(0,-0.033,0.062); footG.add(sole);
  return { g, thigh, knee, footG };
}
const legL = mkLeg(-1); person.add(legL.g);
const legR = mkLeg( 1); person.add(legR.g);

// Arms
function mkArm(side) {
  const shoulder = new T.Group(); shoulder.position.set(side*0.216, 1.34, 0);
  const upperM = Cyl(0.039,0.031,0.31,12,mat.shirt); upperM.position.y=-0.155; shoulder.add(upperM);
  const elbow = new T.Group(); elbow.position.y=-0.31; shoulder.add(elbow);
  const foreM = Cyl(0.029,0.023,0.29,12,mat.skin); foreM.position.y=-0.145; elbow.add(foreM);
  const handG = new T.Group(); handG.position.y=-0.295; elbow.add(handG);
  handG.add(Sph(0.040,12,9,mat.skin));
  [[-0.025,0.034,-0.008],[0,0.041,-0.004],[0.025,0.036,-0.007]].forEach(([fx,fy,fz])=>{
    const f=Sph(0.015,6,5,mat.skin); f.position.set(fx,fy,fz); handG.add(f);
  });
  return { shoulder, elbow, handG };
}
const armL = mkArm(-1); person.add(armL.shoulder);
const armR = mkArm( 1); person.add(armR.shoulder);

/* ── Force arrows ── */
function mkArrow(m, len=0.55) {
  const g = new T.Group();
  const s = Cyl(0.018,0.018,len*0.76,8,m); s.position.y=len*0.38; g.add(s);
  const h = Cyl(0,0.050,len*0.24,10,m); h.position.y=len*0.88; g.add(h);
  return g;
}
const arrowPull = mkArrow(mat.arrowG, 0.52); arrowPull.rotation.z=-Math.PI/2; scene.add(arrowPull);
const arrowGrav = mkArrow(mat.arrowR, 0.42); arrowGrav.rotation.z=Math.PI;     scene.add(arrowGrav);

/* ── Rope pool ── */
const ropeObjs = [];
function clearRope() {
  ropeObjs.forEach(m => { scene.remove(m); m.geometry.dispose(); });
  ropeObjs.length = 0;
}
function addSeg(a, b) {
  const d = new T.Vector3().subVectors(b, a);
  const l = d.length();
  if (l < 0.004) return;
  const m = mesh(new T.CylinderGeometry(ROPE_R, ROPE_R, l, 9), mat.rope);
  m.position.copy(new T.Vector3().addVectors(a,b).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), d.normalize());
  scene.add(m); ropeObjs.push(m);
}

/* ── HTML labels ── */
const LBLS = [
  { id:'lp', text:'Pulley ⌀0.25 m', wx:PCX,      wy:PCY+PR+0.16, wz:0.24,  col:'#8899ff' },
  { id:'lb', text:'Board 0.10 m',   wx:BCX-0.18, wy:BCY+0.16,    wz:-0.25, col:'#cc9944' },
  { id:'lt', text:'Table h=0.75 m', wx:TRX+0.08, wy:TTY+0.10,    wz:TD/2,  col:'#5577aa' },
  { id:'lw', text:'10 kg',          wx:0,         wy:0,            wz:0.22,  col:'#ff5555' },
];
LBLS.forEach(d => {
  const el = document.createElement('div');
  el.className='lbl3d'; el.id=d.id; el.textContent=d.text;
  el.style.color=d.col; el.style.borderColor=d.col+'44';
  document.body.appendChild(el);
});
function syncLabels() {
  const W=window.innerWidth, H=window.innerHeight;
  LBLS.forEach(d => {
    const wx = d.id==='lw' ? wGroup.position.x : d.wx;
    const wy = d.id==='lw' ? wGroup.position.y + 0.08 : d.wy;
    const v  = new T.Vector3(wx, wy, d.wz).project(camera);
    const el = document.getElementById(d.id);
    if (v.z > 1) { el.style.opacity='0'; return; }
    el.style.opacity='1';
    el.style.left = ((v.x+1)/2*W) + 'px';
    el.style.top  = ((-v.y+1)/2*H) + 'px';
  });
}

/* ════════════════════════════════════════
   WEIGHT STATE — returns {wx,wy,rz} given t
   Key: weight rides OUTSIDE the pulley rim,
   so its centre is at distance W_OFFSET = PR + W_HALF from pulley centre.
   ════════════════════════════════════════ */
function weightState(t) {
  if (t <= PA) {
    // Phase A: rise straight up
    const p = t / PA;  // 0→1
    return {
      wx: PCX,
      wy: W_REST_Y + p * RISE_DIST,
      rz: 0,
      phase: 'Rising'
    };
  }
  if (t <= PB) {
    // Phase B: arc over pulley rim (outside)
    const p = (t - PA) / (PB - PA);  // 0→1
    // Angle goes -π/2 (bottom) → 0 (right side), arc is CCW
    // Box hook must always point toward pulley centre (inward).
    // At bottom (angle=-π/2): hook points UP (rz=0, hook at local +Y ✓)
    // At right  (angle=0):    hook points LEFT toward pulley (rz=+π/2, hook at local +Y rotated CCW ✓)
    const angle = -Math.PI/2 + p * (Math.PI/2);
    return {
      wx: PCX + Math.cos(angle) * W_OFFSET,
      wy: PCY + Math.sin(angle) * W_OFFSET,
      rz: p * (Math.PI/2),    // CCW rotation so hook always faces pulley centre
      phase: 'Over pulley'
    };
  }
  // Phase C: slide along tabletop
  const p = (t - PB) / (1 - PB);  // 0→1
  return {
    wx: W_LAND_X + p * SLIDE_DIST,
    wy: TTY + W_HALF,
    rz: Math.PI/2,   // hook pointing left (toward where pulley was)

    phase: 'On table'
  };
}

/* ════════════════════════════════════════
   ROPE WAYPOINTS
   Always a continuous path from rope-attachment-on-weight → person's hands
   ════════════════════════════════════════ */
function buildRope(t, ws, personX) {
  clearRope();

  const { wx, wy, rz } = ws;
  // Rope attaches to top of weight (accounting for rotation)
  // In Phase A: top is at wx, wy+W_HALF
  // In Phase B/C: weight is rotated, so rope attaches from hookRing
  //   hookRing is at local y=W_HALF+0.024, rotated by rz
  //   world pos of hook = rotate (0, W_HALF+0.024, 0) by rz around Z then add (wx,wy)
  const hookLocal = new T.Vector3(0, W_HALF+0.024, 0);
  hookLocal.applyEuler(new T.Euler(0, 0, rz));
  const hookWorld = new T.Vector3(wx + hookLocal.x, wy + hookLocal.y, PCZ);

  const handY   = 1.06;
  const handX   = personX - 0.22;
  const handPt  = new T.Vector3(handX, handY, PCZ);

  if (t <= PA) {
    // Phase A: rope goes hook → straight up → quarter arc → horizontal to person
    const pulleyBot = new T.Vector3(PCX, PCY - PR, PCZ);

    // Vertical segment
    addSeg(hookWorld, pulleyBot);

    // Quarter arc from bottom (-π/2) to right (0)
    const N = 24;
    let prev = null;
    for (let i=0; i<=N; i++) {
      const a = -Math.PI/2 + (i/N)*(Math.PI/2);
      const pt = new T.Vector3(PCX + Math.cos(a)*PR, PCY + Math.sin(a)*PR, PCZ);
      if (prev) addSeg(prev, pt);
      prev = pt;
    }

    // Horizontal + slight sag to hands
    const exitPt = new T.Vector3(PCX + PR, PCY, PCZ);
    ropeSag(exitPt, handPt);

  } else if (t <= PB) {
    // Phase B: weight is on arc. The rope on the weight side is just the arc
    // remaining from the weight's position to the right-side exit.
    const p = (t - PA) / (PB - PA);
    const wAngle = -Math.PI/2 + p*(Math.PI/2);

    // Arc from weight's current angle to angle=0 (right side)
    // This is the rope still contacting the pulley groove
    const N = 20;
    let prev = null;
    for (let i=0; i<=N; i++) {
      const a = wAngle + (i/N)*(0 - wAngle);
      const pt = new T.Vector3(PCX + Math.cos(a)*PR, PCY + Math.sin(a)*PR, PCZ);
      if (prev) addSeg(prev, pt);
      prev = pt;
    }
    // The weight rides on the rim — connect hook to start of groove arc
    const arcStart = new T.Vector3(PCX + Math.cos(wAngle)*PR, PCY + Math.sin(wAngle)*PR, PCZ);
    addSeg(hookWorld, arcStart);

    const exitPt = new T.Vector3(PCX + PR, PCY, PCZ);
    ropeSag(exitPt, handPt);

  } else {
    // Phase C: weight on table, rope goes from hook up-left to pulley right exit, then to person
    const exitPt = new T.Vector3(PCX + PR, PCY, PCZ);
    addSeg(hookWorld, exitPt);
    ropeSag(exitPt, handPt);
  }
}

function ropeSag(from, to) {
  // Draw rope with a gentle mid-sag
  const midX = (from.x + to.x) / 2;
  const sagAmt = Math.max(0.015, (from.y - to.y) * 0.12 + 0.02);
  const midPt = new T.Vector3(midX, Math.min(from.y, to.y) - sagAmt, PCZ);
  addSeg(from, midPt);
  addSeg(midPt, to);
}

/* ════════════════════════════════════════
   MAIN UPDATE
   ════════════════════════════════════════ */
let prevT = 0, pulleyAngle = 0;

function update(t) {
  const dt = t - prevT; prevT = t;

  // 1. Pulley spins (proportional to rope travel)
  pulleyAngle += dt * TOTAL_DIST / PR;
  pulleyG.rotation.z = -pulleyAngle;

  // 2. Weight
  const ws = weightState(t);
  wGroup.position.set(ws.wx, ws.wy, PCZ);
  wGroup.rotation.z = ws.rz;

  // 3. Person
  const personX = PX0 + t * MAX_WALK;
  person.position.set(personX, 0, 0);
  person.rotation.z = -t * 0.18;

  const stride = t * 1.8;
  const lPh = Math.sin(stride * Math.PI), rPh = -lPh;
  legL.thigh.rotation.x  =  lPh * 0.36; legL.knee.rotation.x = Math.max(0,-lPh*0.24); legL.footG.rotation.x = lPh*0.11;
  legR.thigh.rotation.x  =  rPh * 0.36; legR.knee.rotation.x = Math.max(0,-rPh*0.24); legR.footG.rotation.x = rPh*0.11;

  const armFwd = 0.55 + t * 0.38;
  const elbBend = -(0.18 + t * 0.22);
  armL.shoulder.rotation.x =  armFwd; armR.shoulder.rotation.x =  armFwd;
  armL.elbow.rotation.x    = elbBend; armR.elbow.rotation.x    = elbBend;
  armL.shoulder.rotation.z =  0.18 + t*0.08;
  armR.shoulder.rotation.z = -0.18 - t*0.08;
  headG.rotation.x = 0.10 + t*0.08;

  // 4. Rope
  buildRope(t, ws, personX);

  // 5. Force arrows
  const handPt = new T.Vector3(personX - 0.22, 1.06, PCZ);
  arrowPull.position.set(handPt.x - 0.10, handPt.y, PCZ);
  arrowGrav.position.set(ws.wx, ws.wy - W_HALF - 0.08, PCZ);
  arrowGrav.visible = (t < PB + 0.01);

  // 6. HUD
  const raised = t <= PA
    ? (t/PA * RISE_DIST).toFixed(2)
    : RISE_DIST.toFixed(2);
  document.getElementById('s-rise').textContent  = raised;
  document.getElementById('s-phase').textContent = ws.phase;
}

/* ════════════════════════════════════════
   SLIDER + PLAY/PAUSE
   ════════════════════════════════════════ */
const slider  = document.getElementById('sl');
const fillEl  = document.getElementById('fill');
const knobEl  = document.getElementById('knob');
const pctEl   = document.getElementById('pct');
const playBtn = document.getElementById('play-btn');

function setSlider(p) {
  p = Math.max(0, Math.min(1, p));
  slider.value = p * 100;
  fillEl.style.width = p*100 + '%';
  knobEl.style.left  = p*100 + '%';
  pctEl.textContent  = Math.round(p*100) + '%';
  update(p);
  syncLabels();
  draw();
}

slider.addEventListener('input', () => { stopAnim(); setSlider(slider.value/100); });

// Smooth ping-pong
let animId=null, animPlaying=false, animDir=1, animT=0, lastTs=0;
const SPEED = 0.00040; // fraction/ms — full cycle ~5s each way

function animFrame(ts) {
  if (!animPlaying) return;
  const dt = Math.min(ts - lastTs, 60); lastTs = ts;
  animT += animDir * dt * SPEED;
  if (animT >= 1) { animT=1; animDir=-1; }
  else if (animT <= 0) { animT=0; animDir=1; }
  setSlider(animT);
  animId = requestAnimationFrame(animFrame);
}
function startAnim() {
  animPlaying=true; lastTs=performance.now();
  playBtn.textContent='⏸ Pause';
  animId=requestAnimationFrame(animFrame);
}
function stopAnim() {
  animPlaying=false; cancelAnimationFrame(animId);
  playBtn.textContent='▶ Play';
}
playBtn.addEventListener('click', () => animPlaying ? stopAnim() : startAnim());

/* ─── Render ─── */
function draw() { renderer.render(scene, camera); }

onResize();
setSlider(0);
syncLabels();
draw();
