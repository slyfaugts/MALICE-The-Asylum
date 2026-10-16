import * as THREE from 'three';
import { TextureLibrary } from './textures';

/**
 * Procedural 3D Composite Models for Horror Asylum
 * Every model is constructed with 3-12 distinct parts, grounded at bottom-center.
 */

export interface MonsterParts {
  root: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Mesh;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  torso: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  spineSegments: THREE.Mesh[];
  clothTats: THREE.Mesh[];
}

export class ModelFactory {
  /**
   * The Stalker Entity ("The Patient Zero"):
   * A 2.4m tall distorted humanoid creature with twitching neck, elongated clawed limbs,
   * glowing red eyes, and tattered shroud.
   */
  public static createMonster(): MonsterParts {
    const root = new THREE.Group();
    root.name = 'monster';

    // Materials
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0x222625,
      roughness: 0.85,
      metalness: 0.1,
    });

    const boneMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d3935,
      roughness: 0.6,
      metalness: 0.15,
    });

    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff1111,
    });

    const clothMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f1110,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // 1. Torso & Spine (Primary read)
    const torso = new THREE.Group();
    torso.position.y = 1.25;

    // Curved spine column
    const spineSegments: THREE.Mesh[] = [];
    for (let s = 0; s < 5; s++) {
      const vert = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.12, 6),
        boneMaterial
      );
      vert.position.set(0, s * 0.11 - 0.2, (s - 2) * 0.03);
      torso.add(vert);
      spineSegments.push(vert);
    }

    // Distorted Ribcage
    const ribsGroup = new THREE.Group();
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(0.18 - r * 0.02, 0.025, 6, 12, Math.PI * 1.4),
        boneMaterial
      );
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = Math.PI * 0.3;
      rib.position.set(0, r * 0.09 - 0.1, 0.05);
      ribsGroup.add(rib);
    }
    torso.add(ribsGroup);

    // Dark chest core mass
    const chestCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.12, 0.45, 7),
      skinMaterial
    );
    chestCore.position.y = 0.05;
    torso.add(chestCore);

    // 2. Neck and Head (Accent detail & focal point)
    const head = new THREE.Group();
    head.position.set(0, 0.38, 0.08);

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.18, 6),
      skinMaterial
    );
    neck.position.y = -0.05;
    head.add(neck);

    // Elongated distorted cranium
    const cranium = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      skinMaterial
    );
    cranium.scale.set(0.85, 1.35, 1.1);
    cranium.position.set(0, 0.1, 0);
    head.add(cranium);

    // Hollow eye sockets & piercing glowing eyes
    const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(-0.07, 0.12, 0.14);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(0.07, 0.12, 0.14);
    head.add(rightEye);

    // Drooping / unhinged jaw
    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.16),
      boneMaterial
    );
    jaw.position.set(0, -0.05, 0.08);
    jaw.rotation.x = 0.35; // Dropped open jaw
    head.add(jaw);

    torso.add(head);

    // 3. Spindly elongated arms
    const makeArm = (isLeft: boolean) => {
      const arm = new THREE.Group();
      const sign = isLeft ? -1 : 1;
      arm.position.set(sign * 0.24, 0.22, 0);

      // Upper arm
      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.035, 0.55, 6),
        skinMaterial
      );
      upperArm.position.set(0, -0.25, 0);
      upperArm.rotation.z = sign * 0.1;
      arm.add(upperArm);

      // Forearm
      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.03, 0.6, 6),
        skinMaterial
      );
      forearm.position.set(sign * 0.05, -0.75, 0.08);
      forearm.rotation.x = -0.2;
      arm.add(forearm);

      // Claw hand
      const hand = new THREE.Group();
      hand.position.set(sign * 0.05, -1.05, 0.15);
      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(
          new THREE.ConeGeometry(0.012, 0.22, 4),
          boneMaterial
        );
        finger.position.set((f - 1.5) * 0.025, -0.08, 0);
        finger.rotation.x = 0.3;
        hand.add(finger);
      }
      arm.add(hand);

      return arm;
    };

    const leftArm = makeArm(true);
    const rightArm = makeArm(false);
    torso.add(leftArm);
    torso.add(rightArm);

    // 4. Bent jointed legs
    const makeLeg = (isLeft: boolean) => {
      const leg = new THREE.Group();
      const sign = isLeft ? -1 : 1;
      leg.position.set(sign * 0.14, -0.3, 0);

      // Thigh
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.05, 0.65, 6),
        skinMaterial
      );
      thigh.position.set(0, -0.3, 0.05);
      thigh.rotation.x = -0.15;
      leg.add(thigh);

      // Shin
      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.04, 0.7, 6),
        skinMaterial
      );
      shin.position.set(0, -0.85, -0.05);
      shin.rotation.x = 0.2;
      leg.add(shin);

      // Elongated foot
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.05, 0.26),
        boneMaterial
      );
      foot.position.set(0, -1.2, 0.08);
      leg.add(foot);

      return leg;
    };

    const leftLeg = makeLeg(true);
    const rightLeg = makeLeg(false);
    torso.add(leftLeg);
    torso.add(rightLeg);

    // 5. Tattered shroud cloths
    const clothTats: THREE.Mesh[] = [];
    for (let c = 0; c < 3; c++) {
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry(0.25, 0.7),
        clothMaterial
      );
      cloth.position.set((c - 1) * 0.14, -0.2, 0.1);
      cloth.rotation.y = (c - 1) * 0.2;
      torso.add(cloth);
      clothTats.push(cloth);
    }

    root.add(torso);

    // Shadow grounding ring beneath monster
    const shadowGeo = new THREE.CircleGeometry(0.6, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    // Enable shadows
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child !== shadow) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return {
      root,
      head,
      jaw,
      leftEye,
      rightEye,
      torso,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      spineSegments,
      clothTats,
    };
  }

  /**
   * Hospital Gurney Bed (Composite 6-part model)
   */
  public static createGurney(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'gurney';

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x5a6361,
      roughness: 0.45,
      metalness: 0.75,
    });

    const mattressMat = new THREE.MeshStandardMaterial({
      color: 0x2e3532,
      roughness: 0.9,
      metalness: 0.05,
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.5,
      metalness: 0.5,
    });

    // 1. Platform frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.08, 2.2),
      steelMat
    );
    frame.position.y = 0.75;
    group.add(frame);

    // 2. Stained mattress
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.16, 2.08),
      mattressMat
    );
    mattress.position.set(0, 0.88, 0);
    group.add(mattress);

    // Raised head pillow rest
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.12, 0.45),
      mattressMat
    );
    pillow.position.set(0, 0.98, -0.75);
    pillow.rotation.x = 0.15;
    group.add(pillow);

    // 3. Legs and undercarriage truss
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8);
    const legPositions = [
      [-0.42, -0.85],
      [0.42, -0.85],
      [-0.42, 0.85],
      [0.42, 0.85],
    ];

    legPositions.forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(x, 0.38, z);
      group.add(leg);

      // Caster wheels
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10),
        wheelMat
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.06, z);
      group.add(wheel);
    });

    // 4. Side safety guard rails
    const railMat = steelMat;
    const railGeo = new THREE.BoxGeometry(0.04, 0.25, 1.4);
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-0.48, 1.05, 0.1);
    group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(0.48, 1.05, 0.1);
    group.add(rightRail);

    // 5. IV pole attached to corner
    const ivPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6),
      steelMat
    );
    ivPole.position.set(0.45, 1.4, -0.9);
    group.add(ivPole);

    // Saline bag
    const ivBag = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.16, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x88bbcc,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.7,
      })
    );
    ivBag.position.set(0.45, 1.95, -0.9);
    group.add(ivBag);

    // Contact shadow
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.4),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    group.add(shadow);

    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && c !== shadow) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    return group;
  }

  /**
   * Abandoned Wheelchair (Composite 5-part model)
   */
  public static createWheelchair(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'wheelchair';

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x47514e,
      roughness: 0.4,
      metalness: 0.8,
    });

    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x1e2422,
      roughness: 0.85,
      metalness: 0.1,
    });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.65), seatMat);
    seat.position.set(0, 0.55, 0);
    group.add(seat);

    // Backrest
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 0.05), seatMat);
    backrest.position.set(0, 0.9, -0.3);
    group.add(backrest);

    // Two big side wheels (Torus)
    const wheelGeo = new THREE.TorusGeometry(0.38, 0.025, 8, 20);
    const leftWheel = new THREE.Mesh(wheelGeo, metalMat);
    leftWheel.rotation.y = Math.PI / 2;
    leftWheel.position.set(-0.38, 0.45, -0.05);
    group.add(leftWheel);

    const rightWheel = new THREE.Mesh(wheelGeo, metalMat);
    rightWheel.rotation.y = Math.PI / 2;
    rightWheel.position.set(0.38, 0.45, -0.05);
    group.add(rightWheel);

    // Spokes center hub
    const hubGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
    const axle = new THREE.Mesh(hubGeo, metalMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.45, -0.05);
    group.add(axle);

    // Front small caster wheels
    const frontLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), metalMat);
    frontLeg1.position.set(-0.28, 0.25, 0.28);
    group.add(frontLeg1);

    const frontLeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), metalMat);
    frontLeg2.position.set(0.28, 0.25, 0.28);
    group.add(frontLeg2);

    // Footrests
    const footrest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.25), metalMat);
    footrest.position.set(0, 0.15, 0.4);
    group.add(footrest);

    // Push handles
    const handle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), metalMat);
    handle1.rotation.x = Math.PI / 2;
    handle1.position.set(-0.25, 1.15, -0.4);
    group.add(handle1);

    const handle2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), metalMat);
    handle2.rotation.x = Math.PI / 2;
    handle2.position.set(0.25, 1.15, -0.4);
    group.add(handle2);

    // Ground shadow
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    group.add(shadow);

    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && c !== shadow) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    return group;
  }

  /**
   * Steel Hospital Storage Locker
   */
  public static createLocker(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'locker';

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x2f3b38,
      roughness: 0.5,
      metalness: 0.6,
    });

    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x171f1d,
      roughness: 0.7,
      metalness: 0.4,
    });

    // Main locker column
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.6), steelMat);
    body.position.y = 1.1;
    group.add(body);

    // Door indent
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.62, 2.05, 0.03), darkSteelMat);
    door.position.set(0, 1.1, 0.29);
    group.add(door);

    // Chrome handle
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.9 })
    );
    handle.position.set(0.24, 1.15, 0.32);
    group.add(handle);

    // Ventilation louvers
    for (let l = 0; l < 4; l++) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.015, 0.01), steelMat);
      louver.position.set(0, 1.85 - l * 0.04, 0.31);
      group.add(louver);
    }

    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    return group;
  }

  /**
   * Fluorescent Ceiling Cage Fixture with flickering light
   */
  public static createFluorescentLight(flicker: boolean = true): { group: THREE.Group; light: THREE.PointLight; flicker: boolean } {
    const group = new THREE.Group();
    group.name = 'ceilingLight';

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x222625,
      roughness: 0.7,
      metalness: 0.5,
    });

    const emissiveMat = new THREE.MeshBasicMaterial({
      color: 0xedf7f2,
    });

    // Reflector tray housing
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 1.4), metalMat);
    tray.position.y = -0.04;
    group.add(tray);

    // Twin fluorescent tubes
    const tubeGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.25, 8);
    const tube1 = new THREE.Mesh(tubeGeo, emissiveMat);
    tube1.rotation.x = Math.PI / 2;
    tube1.position.set(-0.09, -0.09, 0);
    group.add(tube1);

    const tube2 = new THREE.Mesh(tubeGeo, emissiveMat);
    tube2.rotation.x = Math.PI / 2;
    tube2.position.set(0.09, -0.09, 0);
    group.add(tube2);

    // Cage guard ribs
    for (let r = -0.55; r <= 0.55; r += 0.18) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.015, 0.015), metalMat);
      rib.position.set(0, -0.13, r);
      group.add(rib);
    }

    // Point Light source
    const light = new THREE.PointLight(0xaad8cf, 1.2, 7.5, 1.5);
    light.position.set(0, -0.2, 0);
    light.castShadow = false; // Keep performance smooth across corridors
    group.add(light);

    return { group, light, flicker };
  }

  /**
   * Collectible Keycard Item (Floats & slowly rotates)
   */
  public static createKeycardItem(index: number): THREE.Group {
    const group = new THREE.Group();
    group.name = `keycard_${index}`;

    const cardTex = TextureLibrary.createKeycardTexture(index);
    const cardMat = new THREE.MeshStandardMaterial({
      map: cardTex,
      roughness: 0.3,
      metalness: 0.4,
    });

    const card = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.01, 0.2), cardMat);
    card.rotation.x = 0.3;
    card.rotation.z = 0.2;
    group.add(card);

    // Pulsing locator beacon ring
    const ringGeo = new THREE.RingGeometry(0.2, 0.24, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.12;
    group.add(ring);

    // Beacon light
    const beacon = new THREE.PointLight(0xff3333, 0.8, 3.5);
    beacon.position.y = 0.1;
    group.add(beacon);

    return group;
  }

  /**
   * Collectible Battery Item (Recharges flashlight)
   * 5-part composite industrial battery pack with dual terminals,
   * protective bumpers, ground shadow, and animated pulse locator ring.
   */
  public static createBatteryItem(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'battery_item';

    const battTex = TextureLibrary.createBatteryTexture();
    const battMat = new THREE.MeshStandardMaterial({
      map: battTex,
      roughness: 0.35,
      metalness: 0.5,
    });

    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8,
      metalness: 0.1,
    });

    const terminalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.2,
    });

    // 1. Main heavy-duty battery casing
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.16), battMat);
    body.position.y = 0.2;
    group.add(body);

    // 2. Rubberized protective end caps
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.18), bumperMat);
    topCap.position.y = 0.38;
    group.add(topCap);

    const bottomCap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.18), bumperMat);
    bottomCap.position.y = 0.03;
    group.add(bottomCap);

    // 3. Positive (+) circular terminal
    const posTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8),
      terminalMat
    );
    posTerminal.position.set(-0.06, 0.43, 0);
    group.add(posTerminal);

    // 4. Negative (-) hexagonal snap terminal
    const negTerminal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.06, 6),
      terminalMat
    );
    negTerminal.position.set(0.06, 0.43, 0);
    group.add(negTerminal);

    // 5. Pulsing yellow locator ring on floor
    const ringGeo = new THREE.RingGeometry(0.25, 0.32, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xeab308,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = 'locatorRing';
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);

    // Soft contact shadow
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    group.add(shadow);

    // Warm luminous beacon
    const light = new THREE.PointLight(0xfacc15, 1.2, 3.8, 1.6);
    light.position.y = 0.25;
    group.add(light);

    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && c !== ring && c !== shadow) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });

    return group;
  }
}
