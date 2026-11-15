import * as THREE from 'three';

export interface Collider {
  x: number;
  z: number;
  r: number;
}

export interface Garden {
  group: THREE.Group;
  colliders: Collider[];
  /** Radius of the walkable area around the origin. */
  bounds: number;
  update(time: number): void;
}

const mat = (color: number, roughness = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: false, ...extra });

const STONE = mat(0xefe2d0, 0.9);
const STONE_DARK = mat(0xd8c6b0, 0.9);
const ROOF = mat(0x8f7ad8, 0.6);
const ROOF_PINK = mat(0xe887ad, 0.6);
const LEAF = mat(0x6dbb5e, 0.85);
const LEAF_DARK = mat(0x4e9a4f, 0.85);
const HEDGE = mat(0x5aa758, 0.9);
const WOOD = mat(0xa8714a, 0.8);
const BARK = mat(0x8a5a3b, 0.9);
const WATER = new THREE.MeshStandardMaterial({
  color: 0x8fd8ff,
  roughness: 0.1,
  metalness: 0.1,
  transparent: true,
  opacity: 0.85,
  emissive: 0x2a6f99,
  emissiveIntensity: 0.15,
});
const FLOWER_COLORS = [0xff7eb3, 0xffd166, 0xffffff, 0xc58cff, 0xff9671, 0x7ed6ff];

function shadow<T extends THREE.Object3D>(o: T, cast = true, receive = true): T {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = cast;
      c.receiveShadow = receive;
    }
  });
  return o;
}

/** Deterministic pseudo-random so the garden looks the same every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function ground(radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 96, 0, Math.PI * 2);
  geo.rotateX(-Math.PI / 2);
  // Gentle colour variation across the lawn.
  const colors: number[] = [];
  const pos = geo.attributes.position;
  const a = new THREE.Color(0x9fdc7c);
  const b = new THREE.Color(0x7cc66a);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = 0.5 + 0.5 * Math.sin(x * 0.35) * Math.cos(z * 0.3 + x * 0.1);
    c.copy(a).lerp(b, n);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  m.receiveShadow = true;
  return m;
}

function paths(): THREE.Group {
  const g = new THREE.Group();
  const pathMat = mat(0xf3dfc1, 1);
  // Ring around the fountain.
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.6, 64), pathMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  g.add(ring);
  // Four paths leading out (north one goes to the castle gate).
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 10), pathMat);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = (i * Math.PI) / 2;
    const a = (i * Math.PI) / 2;
    p.position.set(Math.sin(a) * 9, 0.012, -Math.cos(a) * 9);
    g.add(p);
  }
  // Scatter stepping stones on the paths for texture.
  const r = rng(7);
  const stoneGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.04, 7);
  for (let i = 0; i < 70; i++) {
    const s = new THREE.Mesh(stoneGeo, r() > 0.5 ? STONE : STONE_DARK);
    const along = 4.8 + r() * 9;
    const across = (r() - 0.5) * 1.3;
    const k = Math.floor(r() * 4);
    const a = (k * Math.PI) / 2;
    s.position.set(
      Math.sin(a) * along + Math.cos(a) * across,
      0.02 + i * 0.0004, // tiny height offset so overlapping stones never flicker
      -Math.cos(a) * along + Math.sin(a) * across,
    );
    s.rotation.y = r() * Math.PI;
    s.receiveShadow = true;
    g.add(s);
  }
  return g;
}

function fountain(): { obj: THREE.Group; water: THREE.Mesh; spray: THREE.Group } {
  const g = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.6, 40), STONE);
  basin.position.y = 0.3;
  g.add(basin);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.14, 10, 48), STONE_DARK);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.62;
  g.add(rim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.18, 40), WATER);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.55;
  g.add(water);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 1.6, 16), STONE);
  pillar.position.y = 1.1;
  g.add(pillar);
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    STONE,
  );
  bowl.position.y = 2.05;
  g.add(bowl);
  const bowlWater = new THREE.Mesh(new THREE.CircleGeometry(0.74, 24), WATER);
  bowlWater.rotation.x = -Math.PI / 2;
  bowlWater.position.y = 2.0;
  g.add(bowlWater);

  // Little water droplets arcing out of the top bowl.
  const spray = new THREE.Group();
  spray.position.y = 2.05;
  const dropGeo = new THREE.SphereGeometry(0.06, 8, 6);
  for (let i = 0; i < 24; i++) {
    const d = new THREE.Mesh(dropGeo, WATER);
    d.userData.angle = (i / 24) * Math.PI * 2;
    d.userData.offset = (i % 4) / 4;
    spray.add(d);
  }
  g.add(spray);
  return { obj: shadow(g), water, spray };
}

function bush(r: () => number, size = 1, flowers = true): THREE.Group {
  const g = new THREE.Group();
  const blobs = 4 + Math.floor(r() * 3);
  for (let i = 0; i < blobs; i++) {
    const s = (0.45 + r() * 0.35) * size;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), r() > 0.5 ? LEAF : LEAF_DARK);
    const a = r() * Math.PI * 2;
    const d = r() * 0.45 * size;
    b.position.set(Math.cos(a) * d, s * 0.85, Math.sin(a) * d);
    g.add(b);
  }
  if (flowers) {
    const color = FLOWER_COLORS[Math.floor(r() * FLOWER_COLORS.length)];
    const fm = mat(color, 0.5, { emissive: color, emissiveIntensity: 0.08 });
    const fg = new THREE.IcosahedronGeometry(0.09 * size, 0);
    for (let i = 0; i < 14; i++) {
      const f = new THREE.Mesh(fg, fm);
      const a = r() * Math.PI * 2;
      const h = 0.4 + r() * 0.7;
      f.position.set(Math.cos(a) * 0.75 * size, h * size, Math.sin(a) * 0.75 * size);
      g.add(f);
    }
  }
  return shadow(g);
}

function tree(r: () => number, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 10), BARK);
  trunk.position.y = 1.1;
  g.add(trunk);
  const tiers = [
    { y: 2.6, s: 1.5 },
    { y: 3.4, s: 1.2 },
    { y: 4.0, s: 0.8 },
  ];
  for (const t of tiers) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(t.s, 1), r() > 0.5 ? LEAF : LEAF_DARK);
    c.position.set((r() - 0.5) * 0.3, t.y, (r() - 0.5) * 0.3);
    g.add(c);
  }
  g.scale.setScalar(scale);
  return shadow(g);
}

function bench(): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.6), WOOD);
  seat.position.y = 0.5;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.1), WOOD);
  back.position.set(0, 0.85, -0.27);
  back.rotation.x = -0.12;
  g.add(back);
  const legMat = mat(0x5b4a6b, 0.5, { metalness: 0.4 });
  for (const x of [-0.85, 0.85]) {
    for (const z of [-0.22, 0.22]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), legMat);
      leg.position.set(x, 0.25, z);
      g.add(leg);
    }
  }
  return shadow(g);
}

function tower(radius: number, height: number, roof: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, height, 24), STONE);
  body.position.y = height / 2;
  g.add(body);
  // Crenellations.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), STONE);
    m.position.set(Math.cos(a) * radius, height + 0.2, Math.sin(a) * radius);
    m.rotation.y = -a;
    g.add(m);
  }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.25, height * 0.6, 24), roof);
  cone.position.y = height + height * 0.3 + 0.15;
  g.add(cone);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), WOOD);
  flagPole.position.y = height + height * 0.6 + 0.6;
  g.add(flagPole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.35),
    mat(0xff7eb3, 0.6, { side: THREE.DoubleSide }),
  );
  flag.position.set(0.3, height + height * 0.6 + 0.9, 0);
  flag.name = 'flag';
  g.add(flag);
  // Windows.
  const winMat = mat(0x5a4a8a, 0.4, { emissive: 0xffc46b, emissiveIntensity: 0.25 });
  for (const y of [height * 0.45, height * 0.75]) {
    const w = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.3, 4, 8), winMat);
    w.position.set(0, y, radius - 0.05);
    w.scale.z = 0.3;
    g.add(w);
  }
  return shadow(g);
}

function castle(): THREE.Group {
  const g = new THREE.Group();
  // Back wall with a big arched gateway in the middle.
  const wallH = 4.2;
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(9, wallH, 1.2), STONE);
    w.position.set(side * 6.6, wallH / 2, 0);
    g.add(w);
    for (let i = 0; i < 11; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.2), STONE);
      m.position.set(side * 6.6 - 4.2 + i * 0.84, wallH + 0.25, 0);
      g.add(m);
    }
  }
  // Gatehouse over the arch.
  const gate = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 1.4), STONE_DARK);
  gate.position.set(0, wallH + 0.6, 0);
  g.add(gate);
  const pillarGeo = new THREE.BoxGeometry(0.5, wallH, 1.4);
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(pillarGeo, STONE_DARK);
    p.position.set(side * 1.85, wallH / 2, 0);
    g.add(p);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.25, 8, 24, Math.PI), STONE_DARK);
  arch.position.set(0, wallH - 1.2, 0.2);
  g.add(arch);
  // Dark doorway the princesses can peek into.
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, wallH - 1.2),
    mat(0x3a2a4a, 1),
  );
  door.position.set(0, (wallH - 1.2) / 2, -0.4);
  g.add(door);

  // Towers.
  const t1 = tower(1.5, 7, ROOF);
  t1.position.set(-11.4, 0, 0.2);
  const t2 = tower(1.5, 7, ROOF);
  t2.position.set(11.4, 0, 0.2);
  const t3 = tower(1.1, 6.2, ROOF_PINK);
  t3.position.set(-2.9, 0, -0.3);
  const t4 = tower(1.1, 6.2, ROOF_PINK);
  t4.position.set(2.9, 0, -0.3);
  const keep = tower(2.2, 10, ROOF);
  keep.position.set(0, 0, -5);
  g.add(t1, t2, t3, t4, keep);
  return shadow(g);
}

function hedgeRing(radius: number, gapAngles: number[], skipNorth: number): THREE.Group {
  const g = new THREE.Group();
  const segs = 64;
  const geo = new THREE.BoxGeometry(1, 1.2, 0.9);
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const wrapped = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(wrapped) < skipNorth) continue; // the castle wall closes the north side
    if (gapAngles.some((gap) => Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap))) < 0.09)) {
      continue;
    }
    const h = new THREE.Mesh(geo, HEDGE);
    h.position.set(Math.sin(a) * radius, 0.6, -Math.cos(a) * radius);
    h.rotation.y = -a;
    h.scale.x = (2 * Math.PI * radius) / segs + 0.05;
    g.add(h);
  }
  return shadow(g);
}

function sparkles(count: number, radius: number): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const r = rng(99);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * radius;
    pos[i * 3] = Math.cos(a) * d;
    pos[i * 3 + 1] = 0.5 + r() * 4;
    pos[i * 3 + 2] = Math.sin(a) * d;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,240,1)');
  grad.addColorStop(0.3, 'rgba(255,230,160,0.6)');
  grad.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.2,
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  pts.userData.base = pos.slice();
  return pts;
}

export function buildGarden(): Garden {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const r = rng(42);
  const bounds = 15;

  group.add(ground(60));
  group.add(paths());

  const f = fountain();
  group.add(f.obj);
  colliders.push({ x: 0, z: 0, r: 2.5 });

  // Castle along the north edge; the gateway arch sits at the end of the north path.
  const c = castle();
  c.position.set(0, 0, -bounds - 1.2);
  group.add(c);

  // Hedge ring with openings for the east, south and west paths.
  group.add(hedgeRing(bounds + 0.9, [Math.PI / 2, Math.PI, -Math.PI / 2], 0.72));

  // Flower bushes dotted around the lawn.
  const bushSpots: [number, number, number][] = [
    [-6.5, -6, 1.1],
    [6.8, -5.6, 1.2],
    [-9.5, 3.5, 1.0],
    [9.8, 4.2, 1.1],
    [-4.2, 9.5, 0.9],
    [5, 9.8, 1.0],
    [-11.5, -3.5, 0.9],
    [12, -2, 0.8],
  ];
  for (const [x, z, s] of bushSpots) {
    const b = bush(r, s);
    b.position.set(x, 0, z);
    group.add(b);
    colliders.push({ x, z, r: 0.9 * s });
  }

  // Trees towards the edges.
  const treeSpots: [number, number, number][] = [
    [-12, -9, 1.1],
    [12.5, -8.5, 1.0],
    [-13, 8, 1.0],
    [12.8, 9, 1.15],
    [-1.6, 13.2, 0.8],
  ];
  for (const [x, z, s] of treeSpots) {
    const t = tree(r, s);
    t.position.set(x, 0, z);
    group.add(t);
    colliders.push({ x, z, r: 0.45 * s });
  }

  // Benches facing the fountain.
  const benchSpots: [number, number][] = [
    [-5.4, 2.4],
    [5.4, -2.4],
  ];
  for (const [x, z] of benchSpots) {
    const b = bench();
    b.position.set(x, 0, z);
    b.lookAt(0, 0, 0);
    group.add(b);
    colliders.push({ x, z, r: 0.8 });
  }

  // Background trees outside the hedge for depth.
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.9) continue; // keep castle clear
    const d = bounds + 4 + r() * 10;
    const t = tree(r, 1 + r() * 0.6);
    t.position.set(Math.sin(a) * d, 0, -Math.cos(a) * d);
    group.add(t);
  }

  const motes = sparkles(70, bounds);
  group.add(motes);

  // Flags on the towers.
  const flags: THREE.Object3D[] = [];
  group.traverse((o) => {
    if (o.name === 'flag') flags.push(o);
  });

  const update = (t: number) => {
    // Fountain spray: droplets arc out and fall back into the basin.
    for (const d of f.spray.children) {
      const p = (t * 0.6 + d.userData.offset) % 1;
      const a = d.userData.angle as number;
      const dist = 0.3 + p * 1.2;
      d.position.set(Math.cos(a) * dist, 0.5 + p * 1.2 - p * p * 2.6, Math.sin(a) * dist);
    }
    f.water.rotation.z = t * 0.05;

    // Floating sparkles drift gently.
    const base = motes.userData.base as Float32Array;
    const arr = motes.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = base[i] + Math.sin(t * 0.4 + i) * 0.3;
      arr[i + 1] = base[i + 1] + Math.sin(t * 0.7 + i * 0.5) * 0.25;
      arr[i + 2] = base[i + 2] + Math.cos(t * 0.35 + i) * 0.3;
    }
    motes.geometry.attributes.position.needsUpdate = true;

    for (const fl of flags) fl.rotation.y = Math.sin(t * 2 + fl.id) * 0.3;
  };

  return { group, colliders, bounds, update };
}
