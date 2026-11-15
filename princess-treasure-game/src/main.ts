import * as THREE from 'three';
import { buildGarden, type Collider } from './garden';
import { Input } from './input';
import { Princess, ROSE } from './princess';

// ---------- Renderer ----------
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
// Cap pixel ratio so tablets with very dense screens stay smooth.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------- Scene: storybook sky, warm light ----------
const scene = new THREE.Scene();
scene.background = skyTexture();
scene.fog = new THREE.Fog(0xf9dbe6, 30, 70);

const hemi = new THREE.HemisphereLight(0xfff1f7, 0x8ccf7a, 1.1);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe2b8, 2.2);
sun.position.set(12, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22;
sun.shadow.camera.bottom = -22;
sun.shadow.camera.far = 60;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);

const garden = buildGarden();
scene.add(garden.group);

// ---------- Princess ----------
const princess = new Princess(ROSE);
princess.position.set(0, 0, 7);
princess.root.rotation.y = Math.PI;
scene.add(princess.root);

// ---------- Camera: gentle follow from behind and above ----------
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const CAM_OFFSET = new THREE.Vector3(0, 6.5, 8.5);
const camTarget = new THREE.Vector3();
camera.position.copy(princess.position).add(CAM_OFFSET);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Pull the camera back a little on tall (portrait tablet / phone) screens.
  camera.fov = w / h < 1 ? 62 : 50;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Input ----------
const input = new Input(
  document.getElementById('joystick')!,
  document.getElementById('joystick-knob')!,
);
const hint = document.getElementById('hint')!;

// ---------- Collision ----------
function collide(p: THREE.Vector3, r: number): THREE.Vector3 {
  // Push out of round obstacles (fountain, bushes, trees, benches).
  for (const c of garden.colliders as Collider[]) {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + r;
    if (d < min && d > 1e-5) {
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
  }
  // Stay inside the garden.
  const d = Math.hypot(p.x, p.z);
  const max = garden.bounds - r;
  if (d > max) {
    p.x *= max / d;
    p.z *= max / d;
  }
  return p;
}

// ---------- Loop ----------
const clock = new THREE.Clock();
const dir = new THREE.Vector2();

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  const t = clock.elapsedTime;

  // Screen-relative controls: up = away from the camera (north), right = east.
  const m = input.move();
  dir.set(m.x, -m.y);
  princess.update(dt, dir, collide);

  if (input.touched && !hint.classList.contains('hide')) hint.classList.add('hide');

  // Smooth follow.
  const desired = princess.position.clone().add(CAM_OFFSET);
  camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
  camTarget.lerp(princess.position.clone().setY(1.2), 1 - Math.exp(-dt * 6));
  camera.lookAt(camTarget);

  // Keep the shadow camera centred on the action.
  sun.target.position.copy(princess.position);
  sun.position.copy(princess.position).add(new THREE.Vector3(12, 20, 10));
  sun.target.updateMatrixWorld();

  garden.update(t);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
camTarget.copy(princess.position).setY(1.2);
requestAnimationFrame(frame);

// Expose a tiny hook for automated screenshots / debugging.
(window as unknown as { __game: unknown }).__game = { princess, camera };

function skyTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#9fd3ff');
  g.addColorStop(0.55, '#ffd9ea');
  g.addColorStop(1, '#ffe9c9');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
