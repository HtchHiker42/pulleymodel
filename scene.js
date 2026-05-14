'use strict';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

/* ── Resize ── */
function resize() {
  const rect = cv.getBoundingClientRect();
  cv.width  = rect.width  * devicePixelRatio;
  cv.height = rect.height * devicePixelRatio;
  draw();
}
window.addEventListener('resize', resize);

/* ── Camera state ── */
let rotY  = -0.35;   // horizontal orbit
let rotX  =  0.30;   // vertical tilt (positive = looking down)
let camDist = 11;
let isDrag = false, lx = 0, ly = 0;

cv.addEventListener('mousedown',  e => { isDrag = true;  lx = e.clientX; ly = e.clientY; });
window.addEventListener('mouseup', () => isDrag = false);
window.addEventListener('mousemove', e => {
  if (!isDrag) return;
  rotY += (e.clientX - lx) * 0.010; lx = e.clientX;
  rotX += (e.clientY - ly) * 0.007; ly = e.clientY;
  rotX = Math.max(-0.05, Math.min(0.72, rotX));
  draw();
});
cv.addEventListener('wheel', e => {
  camDist += e.deltaY * 0.018;
  camDist = Math.max(5, Math.min(20, camDist));
  e.preventDefault();
  draw();
}, { passive: false });

let tx = 0, ty = 0;
cv.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
cv.addEventListener('touchmove', e => {
  rotY += (e.touches[0].clientX - tx) * 0.012; tx = e.touches[0].clientX;
  rotX += (e.touches[0].clientY - ty) * 0.009; ty = e.touches[0].clientY;
  rotX = Math.max(-0.05, Math.min(0.72, rotX));
  draw(); e.preventDefault();
}, { passive: false });

/* ── 3-D maths ── */
// World centre offset so scene sits nicely
const OX = 0.6, OY = 0.2, OZ = 0.0;

function project(wx, wy, wz) {
  const x = wx - OX, y = wy - OY, z = wz - OZ;

  // Rotate around Y (horizontal orbit)
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  const rx =  cy * x + sy * z;
  const rz = -sy * x + cy * z;

  // Rotate around X (tilt)
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  const ry  =  cx * y - sx * rz;
  const fz  =  sx * y + cx * rz;

  // True perspective
  const W = cv.width, H = cv.height;
  const fov = Math.min(W, H) * 1.05;
  const depth = camDist + fz;
  const scale = fov / Math.max(depth, 0.1);

  return { sx: W / 2 + rx * scale, sy: H / 2 - ry * scale, scale, fz };
}

/* ── Light direction (world space) ── */
const LIGHT = norm3(0.5, 1.0, 0.7);
function norm3(x, y, z) { const l = Math.sqrt(x*x+y*y+z*z); return [x/l, y/l, z/l]; }
function dot3(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }

/* ── Colour helpers ── */
function hexToRgb(h) {
  const n = parseInt(h.replace('#',''), 16);
  return [(n>>16)&255, (n>>8)&255, n&255];
}
function shadedColor(hex, normalWorld, ambient = 0.35) {
  // rotate normal same as camera so lighting is world-fixed
  const [nx, ny, nz] = normalWorld;
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  const rnx =  cy*nx + sy*nz;
  const rnz = -sy*nx + cy*nz;
  const rny =  cx*ny - sx*rnz;
  const diff = Math.max(0, dot3([rnx, rny, -1], LIGHT)); // -1 z = toward camera
  const f = ambient + (1 - ambient) * diff;
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(r*f)},${Math.round(g*f)},${Math.round(b*f)})`;
}

/* ── Draw primitives ── */

// Filled polygon from world-space vertices + a face normal
function face(verts, normalW, fillHex, strokeHex, lw = 0.6) {
  if (!verts.length) return;
  const ps = verts.map(v => project(...v));
  // Back-face cull: check winding in screen space
  const ax = ps[1].sx - ps[0].sx, ay = ps[1].sy - ps[0].sy;
  const bx = ps[2].sx - ps[0].sx, by = ps[2].sy - ps[0].sy;
  if (ax * by - ay * bx > 0) return; // back face
  ctx.beginPath();
  ctx.moveTo(ps[0].sx, ps[0].sy);
  for (let i = 1; i < ps.length; i++) ctx.lineTo(ps[i].sx, ps[i].sy);
  ctx.closePath();
  ctx.fillStyle = shadedColor(fillHex, normalW);
  ctx.fill();
  ctx.strokeStyle = strokeHex;
  ctx.lineWidth = lw * devicePixelRatio;
  ctx.stroke();
}

// Box: centre cx,cy,cz, half-extents hx,hy,hz
function box(cx, cy, cz, hx, hy, hz, col, edge) {
  const v = [
    [cx-hx, cy-hy, cz-hz], [cx+hx, cy-hy, cz-hz],
    [cx+hx, cy+hy, cz-hz], [cx-hx, cy+hy, cz-hz],
    [cx-hx, cy-hy, cz+hz], [cx+hx, cy-hy, cz+hz],
    [cx+hx, cy+hy, cz+hz], [cx-hx, cy+hy, cz+hz],
  ];
  const faces = [
    { i:[0,1,2,3], n:[0,0,-1] },
    { i:[5,4,7,6], n:[0,0, 1] },
    { i:[4,0,3,7], n:[-1,0,0] },
    { i:[1,5,6,2], n:[1,0, 0] },
    { i:[4,5,1,0], n:[0,-1,0] },
    { i:[3,2,6,7], n:[0, 1,0] },
  ];
  // Sort by average projected z for painters algorithm
  const sorted = faces.map(f => {
    const avgZ = f.i.reduce((s, k) => s + project(...v[k]).fz, 0) / 4;
    return { ...f, avgZ };
  }).sort((a, b) => b.avgZ - a.avgZ);
  sorted.forEach(f => face(f.i.map(k => v[k]), f.n, col, edge));
}

// Cylinder between two points
function cylinder(x1,y1,z1, x2,y2,z2, r, col, edgeCol, segs=20) {
  const dx=x2-x1, dy=y2-y1, dz=z2-z1;
  const len = Math.sqrt(dx*dx+dy*dy+dz*dz);
  if (len < 1e-6) return;
  const ax=dx/len, ay=dy/len, az=dz/len;
  // Perpendicular basis
  let ux, uy, uz;
  if (Math.abs(ax) < 0.9) { ux=0; uy=-az; uz=ay; }
  else { ux=-az; uy=0; uz=ax; }
  const ul = Math.sqrt(ux*ux+uy*uy+uz*uz); ux/=ul; uy/=ul; uz/=ul;
  const vx=ay*uz-az*uy, vy=az*ux-ax*uz, vz=ax*uy-ay*ux;

  const top=[], bot=[];
  for (let i=0;i<segs;i++) {
    const a=i/segs*Math.PI*2, c=Math.cos(a)*r, s=Math.sin(a)*r;
    top.push([x1+c*ux+s*vx, y1+c*uy+s*vy, z1+c*uz+s*vz]);
    bot.push([x2+c*ux+s*vx, y2+c*uy+s*vy, z2+c*uz+s*vz]);
  }

  // Side quads sorted back-to-front
  const quads = [];
  for (let i=0;i<segs;i++) {
    const ni=(i+1)%segs;
    const a=(i+0.5)/segs*Math.PI*2;
    const nx=Math.cos(a)*(ux)+Math.sin(a)*(vx);
    const ny=Math.cos(a)*(uy)+Math.sin(a)*(vy);
    const nz=Math.cos(a)*(uz)+Math.sin(a)*(vz);
    const avgZ=(project(...top[i]).fz+project(...bot[i]).fz+project(...top[ni]).fz+project(...bot[ni]).fz)/4;
    quads.push({verts:[top[i],top[ni],bot[ni],bot[i]], n:[nx,ny,nz], avgZ});
  }
  quads.sort((a,b)=>b.avgZ-a.avgZ);
  quads.forEach(q => face(q.verts, q.n, col, edgeCol || col, 0.4));

  // Caps
  const capFaces = [[top,[0,-1,0]],[bot,[0,1,0]]]; // rough normals
  capFaces.forEach(([ring, n]) => {
    const ps = ring.map(v => project(...v));
    const cx2 = ps.reduce((s,p)=>s+p.sx,0)/ps.length;
    const cy2 = ps.reduce((s,p)=>s+p.sy,0)/ps.length;
    ctx.beginPath(); ctx.moveTo(ps[0].sx,ps[0].sy);
    ps.forEach(p=>ctx.lineTo(p.sx,p.sy));
    ctx.closePath();
    ctx.fillStyle = shadedColor(col, n);
    ctx.fill();
    ctx.strokeStyle = edgeCol||col; ctx.lineWidth=0.4*devicePixelRatio; ctx.stroke();
  });
}

// Torus (for pulley rim) — axis along given direction
function torus(cx,cy,cz, R, r, ax,ay,az, col, segs=36, tubeSegs=16) {
  const len=Math.sqrt(ax*ax+ay*ay+az*az); ax/=len;ay/=len;az/=len;
  let ux,uy,uz;
  if(Math.abs(ax)<0.9){ux=0;uy=-az;uz=ay;}else{ux=-az;uy=0;uz=ax;}
  const ul=Math.sqrt(ux*ux+uy*uy+uz*uz);ux/=ul;uy/=ul;uz/=ul;
  const vx=ay*uz-az*uy,vy=az*ux-ax*uz,vz=ax*uy-ay*ux;

  // Build quad mesh
  const pts=[];
  for(let i=0;i<segs;i++){
    const a=i/segs*Math.PI*2;
    const ca=Math.cos(a),sa=Math.sin(a);
    // Centre of tube circle at angle a
    const tx=cx+R*(ca*ux+sa*vx);
    const ty=cy+R*(ca*uy+sa*vy);
    const tz=cz+R*(ca*uz+sa*vz);
    // Radial outward dir
    const ox=ca*ux+sa*vx, oy=ca*uy+sa*vy, oz=ca*uz+sa*vz;
    const row=[];
    for(let j=0;j<tubeSegs;j++){
      const b=j/tubeSegs*Math.PI*2;
      const cb=Math.cos(b),sb=Math.sin(b);
      row.push([tx+r*(cb*ox+sb*ax), ty+r*(cb*oy+sb*ay), tz+r*(cb*oz+sb*az)]);
    }
    pts.push(row);
  }

  const quads=[];
  for(let i=0;i<segs;i++){
    const ni=(i+1)%segs;
    for(let j=0;j<tubeSegs;j++){
      const nj=(j+1)%tubeSegs;
      const vs=[pts[i][j],pts[ni][j],pts[ni][nj],pts[i][nj]];
      // Normal: outward from tube surface
      const a=i/segs*Math.PI*2, b=(j+0.5)/tubeSegs*Math.PI*2;
      const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
      const ox=ca*ux+sa*vx,oy=ca*uy+sa*vy,oz=ca*uz+sa*vz;
      const nx=cb*ox+sb*ax, ny=cb*oy+sb*ay, nz=cb*oz+sb*az;
      const avgZ=vs.reduce((s,v)=>s+project(...v).fz,0)/4;
      quads.push({vs,n:[nx,ny,nz],avgZ});
    }
  }
  quads.sort((a,b)=>b.avgZ-a.avgZ);
  quads.forEach(q=>face(q.vs,q.n,col,col,0.3));
}

// Arrow with arrowhead
function arrow(x1,y1,z1, x2,y2,z2, col, rShaft=0.03) {
  const dx=x2-x1,dy=y2-y1,dz=z2-z1;
  const len=Math.sqrt(dx*dx+dy*dy+dz*dz);
  const headLen=0.18, headR=0.075;
  const mx=x1+dx/len*(len-headLen), my=y1+dy/len*(len-headLen), mz=z1+dz/len*(len-headLen);
  cylinder(x1,y1,z1, mx,my,mz, rShaft, col, col, 10);
  cylinder(mx,my,mz, x2,y2,z2, headR, col, col, 12);
}

// Screen-space label
function label(wx,wy,wz, text, col) {
  const p = project(wx,wy,wz);
  if (p.fz > camDist - 1) return;
  const fs = Math.round(10.5 * devicePixelRatio);
  ctx.font = `500 ${fs}px 'Segoe UI', sans-serif`;
  const tw = ctx.measureText(text).width;
  const pad = 5*devicePixelRatio, h = 15*devicePixelRatio;
  ctx.fillStyle = 'rgba(10,14,23,0.85)';
  ctx.beginPath();
  ctx.roundRect(p.sx-tw/2-pad, p.sy-h/2, tw+pad*2, h, 3*devicePixelRatio);
  ctx.fill();
  ctx.strokeStyle = col + '55';
  ctx.lineWidth = devicePixelRatio * 0.8;
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, p.sx, p.sy);
}

// Dashed leader line in screen space
function leader(wx1,wy1,wz1, wx2,wy2,wz2, col) {
  const a=project(wx1,wy1,wz1), b=project(wx2,wy2,wz2);
  ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy);
  ctx.strokeStyle=col+'77'; ctx.lineWidth=devicePixelRatio;
  ctx.setLineDash([3*devicePixelRatio, 4*devicePixelRatio]);
  ctx.stroke(); ctx.setLineDash([]);
}

/* ── Scene geometry ── */

// Dimensions (world units ≈ metres)
const TABLE_W  = 3.6;
const TABLE_D  = 1.6;
const TABLE_TH = 0.08;   // tabletop thickness
const TABLE_H  = 1.85;   // floor to tabletop top
const LEG_R    = 0.055;

// Tabletop top surface y
const TY = TABLE_H;
// Table centre x: table runs from x=0 to x=TABLE_W
const TX = TABLE_W / 2;
const TZ = 0;

// Board on left edge of table
const BOARD_X  = 0;                     // left edge of table
const BOARD_Y  = TY + 0.22;            // centre of board
const BOARD_W  = 0.12;
const BOARD_H  = 0.45;
const BOARD_D  = 0.22;

// Pulley: axis points in Z (toward viewer), centre above board
const PX = BOARD_X - BOARD_W/2;        // flush with left edge of board
const PY = BOARD_Y + BOARD_H/2 + 0.01;
const PZ = 0;                           // centred z
const PR = 0.34;                        // pulley radius
const GROOVE_R = 0.04;                  // rope groove radius

// Weight
const WX = PX;
const WEIGHT_H = 0.48;
const WY = PY - PR - 0.05 - 1.1 - WEIGHT_H/2;  // hangs below pulley
const WZ = PZ;

// Rope runs over top of pulley (pulley axis = Z, so rope arc is in XY plane at z=0)
// After the pulley the rope goes horizontally along table top toward +X
const ROPE_TABLE_Y = TY + 0.06;
const HANDLE_X = TABLE_W - 0.4;
const HANDLE_Z = 0;

function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);

  const W = cv.width, H = cv.height;
  ctx.fillStyle = '#0a0e17';
  ctx.fillRect(0, 0, W, H);

  /* ── Floor grid ── */
  for (let i = -8; i <= 8; i++) {
    for (let pass = 0; pass < 2; pass++) {
      const a = pass === 0
        ? project(i*0.5, 0, -4) 
        : project(-4, 0, i*0.5);
      const b = pass === 0
        ? project(i*0.5, 0,  4)
        : project( 4, 0, i*0.5);
      ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy);
      ctx.strokeStyle='#111820'; ctx.lineWidth=devicePixelRatio*0.6; ctx.stroke();
    }
  }

  /* ── Table legs ── */
  const legOffsets = [
    [0.18, 0.15], [0.18, TABLE_D-0.15],
    [TABLE_W-0.18, 0.15], [TABLE_W-0.18, TABLE_D-0.15]
  ];
  legOffsets.forEach(([lx, lz]) => {
    cylinder(lx, 0.02, lz - TABLE_D/2, lx, TY - TABLE_TH, lz - TABLE_D/2, LEG_R, '#1a2636','#223040', 10);
  });

  /* ── Tabletop ── */
  box(TX, TY - TABLE_TH/2, 0, TABLE_W/2, TABLE_TH/2, TABLE_D/2, '#1e2d42', '#263545');

  /* ── Wooden board (edge mount, sits on top of table at left edge) ── */
  box(BOARD_X, BOARD_Y, 0, BOARD_W/2, BOARD_H/2, BOARD_D/2, '#6b4210', '#8a5a20');

  /* ── Pulley ── */
  // Pulley axis = Z direction (juts out toward viewer)
  // Torus in XY plane at PZ
  torus(PX, PY, PZ, PR, GROOVE_R + 0.02, 0,0,1, '#5555bb', 40, 14);  // outer rim
  torus(PX, PY, PZ, PR, GROOVE_R,        0,0,1, '#222244', 40, 10);  // groove

  // Disk (pulley body)
  cylinder(PX, PY, PZ-0.06, PX, PY, PZ+0.06, PR-0.06, '#2a2a55', '#3a3a77', 28);
  // Hub
  cylinder(PX, PY, PZ-0.09, PX, PY, PZ+0.09, 0.07, '#9999cc', '#aaaadd', 14);
  // Axle
  cylinder(PX, PY, PZ-0.16, PX, PY, PZ+0.16, 0.03, '#ccccdd', '#ddddee', 10);
  // Spokes
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const sx = PX + Math.cos(a) * 0.07;
    const sy2 = PY + Math.sin(a) * 0.07;
    const ex = PX + Math.cos(a) * (PR - 0.08);
    const ey = PY + Math.sin(a) * (PR - 0.08);
    cylinder(sx, sy2, PZ, ex, ey, PZ, 0.018, '#5555aa', '#6666bb', 6);
  }

  /* ── Rope ── */
  // 1. Hanging segment: from bottom of pulley down to weight top
  const ropeTopY = PY - PR;
  const weightTopY = WY + WEIGHT_H / 2;
  {
    const pts = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push([PX, ropeTopY - t*(ropeTopY - weightTopY), PZ]);
    }
    for (let i = 0; i < pts.length-1; i++) {
      cylinder(...pts[i], ...pts[i+1], 0.035, '#cc8833', '#aa6622', 8);
    }
  }

  // 2. Arc over pulley top (from bottom-left around to right side)
  // Pulley axis=Z, so arc is in XY plane
  {
    const arcPts = [];
    const a0 = -Math.PI/2;   // bottom
    const a1 =  Math.PI/2;   // top, then to right
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (i/steps)*(Math.PI);  // bottom → top (π rotation)
      arcPts.push([PX + Math.cos(a)*PR, PY + Math.sin(a)*PR, PZ]);
    }
    for (let i = 0; i < arcPts.length-1; i++) {
      cylinder(...arcPts[i], ...arcPts[i+1], 0.035, '#cc8833', '#aa6622', 8);
    }
  }

  // 3. Horizontal rope along tabletop from pulley right side to handle
  {
    const startX = PX + PR;
    const pts = [
      [startX, PY, PZ],
      [startX + 0.4, ROPE_TABLE_Y, PZ],
      [HANDLE_X - 0.3, ROPE_TABLE_Y, PZ],
      [HANDLE_X - 0.05, ROPE_TABLE_Y, PZ],
    ];
    for (let i = 0; i < pts.length-1; i++) {
      cylinder(...pts[i], ...pts[i+1], 0.035, '#cc8833', '#aa6622', 8);
    }
  }

  /* ── Weight ── */
  box(WX, WY, WZ, 0.24, WEIGHT_H/2, 0.24, '#3a4a60', '#5a6a80');
  // Weight label band
  box(WX, WY, WZ, 0.245, 0.05, 0.245, '#2a3a50', '#445566');

  /* ── Handle ── */
  const HR = 0.055;
  cylinder(HANDLE_X-0.26, ROPE_TABLE_Y, HANDLE_Z, HANDLE_X+0.26, ROPE_TABLE_Y, HANDLE_Z, HR, '#1e3a2a','#2a4a38', 16);
  cylinder(HANDLE_X-0.26, ROPE_TABLE_Y, HANDLE_Z, HANDLE_X-0.13, ROPE_TABLE_Y, HANDLE_Z, HR+0.01, '#2d6644','#3a7755', 14);
  cylinder(HANDLE_X+0.13, ROPE_TABLE_Y, HANDLE_Z, HANDLE_X+0.26, ROPE_TABLE_Y, HANDLE_Z, HR+0.01, '#2d6644','#3a7755', 14);
  cylinder(HANDLE_X-0.265,ROPE_TABLE_Y, HANDLE_Z, HANDLE_X-0.255,ROPE_TABLE_Y, HANDLE_Z, HR+0.02, '#aabbcc','#ccddee', 12);
  cylinder(HANDLE_X+0.255,ROPE_TABLE_Y, HANDLE_Z, HANDLE_X+0.265,ROPE_TABLE_Y, HANDLE_Z, HR+0.02, '#aabbcc','#ccddee', 12);

  /* ── Force arrows ── */
  arrow(HANDLE_X+0.28, ROPE_TABLE_Y, HANDLE_Z, HANDLE_X+0.95, ROPE_TABLE_Y, HANDLE_Z, '#1D9E75');
  arrow(WX, WY - WEIGHT_H/2 - 0.05, WZ, WX, WY - WEIGHT_H/2 - 0.6, WZ, '#E24B4A');

  /* ── Labels ── */
  leader(PX, PY + PR + 0.05, PZ + 0.1,  PX + 0.3, PY + PR + 0.35, PZ + 0.4);
  label (PX + 0.3, PY + PR + 0.35, PZ + 0.4, 'Pulley  ⌀ 0.25 m', '#9999ff');

  leader(BOARD_X, BOARD_Y, -BOARD_D/2 - 0.05,  BOARD_X - 0.5, BOARD_Y + 0.1, -0.6);
  label (BOARD_X - 0.5, BOARD_Y + 0.1, -0.6, 'Wooden board  0.1 m', '#cc9944');

  leader(WX, WY, WZ + 0.26,  WX + 0.5, WY + 0.1, WZ + 0.6);
  label (WX + 0.5, WY + 0.1, WZ + 0.6, 'Weight  10 kg', '#8899cc');

  leader(HANDLE_X, ROPE_TABLE_Y + 0.1, HANDLE_Z + 0.1,  HANDLE_X, ROPE_TABLE_Y + 0.35, HANDLE_Z + 0.4);
  label (HANDLE_X, ROPE_TABLE_Y + 0.35, HANDLE_Z + 0.4, 'Handle (pull grip)', '#55cc88');

  leader(HANDLE_X + 0.65, ROPE_TABLE_Y, HANDLE_Z,  HANDLE_X + 0.65, ROPE_TABLE_Y + 0.35, HANDLE_Z + 0.35);
  label (HANDLE_X + 0.65, ROPE_TABLE_Y + 0.35, HANDLE_Z + 0.35, 'Applied force F', '#1D9E75');

  leader(WX + 0.28, WY - WEIGHT_H/2 - 0.35, WZ,  WX + 0.65, WY - WEIGHT_H/2 - 0.35, WZ + 0.35);
  label (WX + 0.65, WY - WEIGHT_H/2 - 0.35, WZ + 0.35, 'Gravity (mg)', '#E24B4A');

  leader(TX, TY + 0.05, TABLE_D/2 + 0.05,  TX + 0.2, TY + 0.28, TABLE_D/2 + 0.4);
  label (TX + 0.2, TY + 0.28, TABLE_D/2 + 0.4, 'Table surface', '#556688');

  leader(PX + 0.2, (ROPE_TABLE_Y + PY)/2, PZ + 0.05,  PX + 0.8, (ROPE_TABLE_Y + PY)/2 + 0.1, PZ + 0.45);
  label (PX + 0.8, (ROPE_TABLE_Y + PY)/2 + 0.1, PZ + 0.45, 'Rope  ≤ 10 m', '#cc8833');
}

resize();
