import * as THREE from 'three';

export interface PrincessLook {
  dress: number;
  dressTrim: number;
  hair: number;
  skin: number;
}

export const ROSE: PrincessLook = {
  dress: 0xf28bb5,
  dressTrim: 0xffe0ec,
  hair: 0xf3c86b,
  skin: 0xf9d7c3,
};

export const LILAC: PrincessLook = {
  dress: 0xa98bf0,
  dressTrim: 0xe8ddff,
  hair: 0x6b3f2a,
  skin: 0xe8b896,
};

const WALK_SPEED = 4.2; // world units per second
const TURN_SPEED = 12; // how quickly she faces her walking direction

/**
 * A stylised low-poly princess built from primitives, with procedural idle and
 * walk animations. Built in code so v1 needs no external model downloads; it
 * can be swapped for a rigged glTF later without changing the game logic.
 */
export class Princess {
  readonly root = new THREE.Group();
  readonly radius = 0.45;

  private body = new THREE.Group();
  private dress: THREE.Mesh;
  private head = new THREE.Group();
  private armL: THREE.Group;
  private armR: THREE.Group;
  private footL: THREE.Mesh;
  private footR: THREE.Mesh;

  private heading = 0;
  private walkPhase = 0;
  private walkAmount = 0; // 0 idle → 1 walking, smoothed
  private time = Math.random() * 10;

  constructor(look: PrincessLook) {
    const mat = (color: number, rough = 0.7) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
    const skin = mat(look.skin, 0.8);
    const hair = mat(look.hair, 0.6);
    const dressMat = mat(look.dress, 0.55);
    const trimMat = mat(look.dressTrim, 0.6);
    const gold = new THREE.MeshStandardMaterial({
      color: 0xffd34d,
      roughness: 0.25,
      metalness: 0.8,
      emissive: 0x6b4a00,
      emissiveIntensity: 0.3,
    });

    this.root.add(this.body);

    // Ball-gown skirt: a lathe profile that flares out at the hem.
    const skirtProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.62, 0.0),
      new THREE.Vector2(0.6, 0.08),
      new THREE.Vector2(0.5, 0.35),
      new THREE.Vector2(0.36, 0.7),
      new THREE.Vector2(0.24, 0.95),
      new THREE.Vector2(0.2, 1.0),
      new THREE.Vector2(0.0, 1.0),
    ];
    this.dress = new THREE.Mesh(new THREE.LatheGeometry(skirtProfile, 24), dressMat);
    this.dress.position.y = 0.06;
    this.body.add(this.dress);

    // Frilly hem.
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 32), trimMat);
    hem.rotation.x = Math.PI / 2;
    hem.position.y = 0.1;
    this.dress.add(hem);

    // Bodice.
    const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.4, 16), dressMat);
    bodice.position.y = 1.22;
    this.body.add(bodice);
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.04, 8, 24), trimMat);
    sash.rotation.x = Math.PI / 2;
    sash.position.y = 1.04;
    this.body.add(sash);

    // Puffy sleeves + arms.
    const makeArm = (side: 1 | -1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.24 * side, 1.36, 0);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), trimMat);
      shoulder.add(puff);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.34, 4, 8), skin);
      arm.position.y = -0.24;
      shoulder.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), skin);
      hand.position.y = -0.46;
      shoulder.add(hand);
      shoulder.rotation.z = 0.18 * side;
      this.body.add(shoulder);
      return shoulder;
    };
    this.armL = makeArm(-1);
    this.armR = makeArm(1);

    // Feet peeking out under the dress.
    const shoe = mat(look.dress, 0.4);
    const footGeo = new THREE.SphereGeometry(0.1, 10, 8);
    footGeo.scale(1, 0.6, 1.5);
    this.footL = new THREE.Mesh(footGeo, shoe);
    this.footR = new THREE.Mesh(footGeo, shoe);
    this.footL.position.set(-0.14, 0.05, 0.1);
    this.footR.position.set(0.14, 0.05, 0.1);
    this.root.add(this.footL, this.footR);

    // Head.
    this.head.position.y = 1.58;
    this.body.add(this.head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8), skin);
    neck.position.y = -0.12;
    this.head.add(neck);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 18), skin);
    face.position.y = 0.12;
    this.head.add(face);

    // Big friendly eyes, rosy cheeks, smile.
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2b1b2e });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), eyeMat);
      eye.scale.set(0.85, 1.15, 0.5);
      eye.position.set(0.095 * side, 0.14, 0.235);
      this.head.add(eye);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), shineMat);
      shine.position.set(0.095 * side + 0.012, 0.162, 0.258);
      this.head.add(shine);
      const cheek = new THREE.Mesh(
        new THREE.CircleGeometry(0.045, 14),
        new THREE.MeshBasicMaterial({ color: 0xff9fb5, transparent: true, opacity: 0.6 }),
      );
      cheek.position.set(0.15 * side, 0.06, 0.215);
      cheek.lookAt(cheek.position.clone().multiplyScalar(3));
      this.head.add(cheek);
    }
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.011, 6, 16, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xb3475f }),
    );
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.04, 0.245);
    this.head.add(smile);

    // Hair: a cap over the back of the head plus long locks down the back.
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.285, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hair,
    );
    hairCap.position.set(0, 0.14, -0.02);
    hairCap.rotation.x = -0.25;
    this.head.add(hairCap);
    const locks = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 6, 12), hair);
    locks.scale.set(1.25, 1, 0.6);
    locks.position.set(0, -0.12, -0.16);
    this.head.add(locks);
    const bangs = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), hair);
    bangs.scale.set(1.6, 0.55, 0.8);
    bangs.position.set(0, 0.32, 0.15);
    this.head.add(bangs);

    // Crown with little jewels.
    const crown = new THREE.Group();
    crown.position.set(0, 0.38, -0.02);
    crown.rotation.x = -0.15;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.08, 20, 1, true), gold);
    crown.add(band);
    const jewelColors = [0xff5c8a, 0x5cc8ff, 0x8cff7a, 0xff5c8a, 0x5cc8ff];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 6), gold);
      spike.position.set(Math.sin(a) * 0.15, 0.08, Math.cos(a) * 0.15);
      crown.add(spike);
      const jewel = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.025),
        new THREE.MeshStandardMaterial({
          color: jewelColors[i],
          emissive: jewelColors[i],
          emissiveIntensity: 0.4,
          roughness: 0.1,
        }),
      );
      jewel.position.set(Math.sin(a) * 0.162, 0.0, Math.cos(a) * 0.162);
      crown.add(jewel);
    }
    this.head.add(crown);

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  /**
   * Advance one frame. `dir` is the desired world-space walking direction on
   * the XZ plane (length 0..1). `collide` pushes a proposed position out of
   * obstacles and returns the corrected position.
   */
  update(
    dt: number,
    dir: THREE.Vector2,
    collide: (p: THREE.Vector3, r: number) => THREE.Vector3,
  ): void {
    this.time += dt;
    const speed = dir.length();

    if (speed > 0.01) {
      const target = Math.atan2(dir.x, dir.y);
      let delta = target - this.heading;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      this.heading += delta * Math.min(1, TURN_SPEED * dt);

      const next = this.root.position.clone();
      next.x += dir.x * WALK_SPEED * dt;
      next.z += dir.y * WALK_SPEED * dt;
      this.root.position.copy(collide(next, this.radius));
    }
    this.root.rotation.y = this.heading;

    // Smoothly blend between idle and walk poses.
    this.walkAmount += (Math.min(speed, 1) - this.walkAmount) * Math.min(1, dt * 8);
    this.walkPhase += dt * (4 + 7 * speed) * (speed > 0.01 ? 1 : 0);
    this.animate();
  }

  private animate(): void {
    const w = this.walkAmount;
    const idle = 1 - w;
    const s = Math.sin(this.walkPhase);
    const c = Math.cos(this.walkPhase * 2);

    // Walk: bounce, arm swing, stepping feet, swishing skirt, slight lean.
    // Idle: slow breathing and a gentle side-to-side sway.
    const breathe = Math.sin(this.time * 2.2);
    this.body.position.y = w * Math.abs(c) * 0.06 + idle * breathe * 0.012;
    this.body.rotation.x = w * 0.08;
    this.body.rotation.z = idle * Math.sin(this.time * 1.1) * 0.03 + w * s * 0.03;

    this.armL.rotation.x = w * s * 0.7;
    this.armR.rotation.x = -w * s * 0.7;
    this.armL.rotation.z = -0.18 - idle * breathe * 0.03;
    this.armR.rotation.z = 0.18 + idle * breathe * 0.03;

    this.footL.position.z = 0.1 + w * s * 0.18;
    this.footR.position.z = 0.1 - w * s * 0.18;
    this.footL.position.y = 0.05 + w * Math.max(0, s) * 0.06;
    this.footR.position.y = 0.05 + w * Math.max(0, -s) * 0.06;

    this.dress.rotation.y = w * s * 0.12;
    this.dress.scale.set(1 + w * c * 0.02, 1 - w * Math.abs(c) * 0.03, 1);

    this.head.rotation.y = idle * Math.sin(this.time * 0.6) * 0.25;
    this.head.rotation.z = idle * Math.sin(this.time * 0.9) * 0.05;
  }
}
