import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { soundManager } from './audio';
import { TextureLibrary } from './textures';
import { ModelFactory, MonsterParts } from './models';
import { MapData, ASYLUM_LAYOUT, TileType, TILE_SIZE, WALL_HEIGHT, CollisionBox, Waypoint } from './map';
import { TouchController } from './touchControls';

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';
export type Difficulty = 'EASY' | 'NORMAL' | 'NIGHTMARE';
export type JumpscareType = 'GHOST_FACE' | 'BULB_BURST' | 'WHISPER_BEHIND' | 'RUSHING_STEPS' | 'SUDDEN_SHADOW' | null;

export interface GameHUDData {
  state: GameState;
  battery: number; // 0 - 100
  isFlashlightOn: boolean;
  batteryNotification: string | null;
  batteriesCollected: number;
  batteryLowWarning: boolean;
  isInDarkness: boolean;
  jumpscareActive: JumpscareType;
  jumpscareMessage: string | null;
  stamina: number; // 0 - 100
  heartbeatBpm: number;
  keysCollected: number;
  totalKeys: number;
  interactPrompt: string | null;
  scareIntensity: number; // 0 - 1
  isChased: boolean;
  survivedTime: number; // seconds
  isMobile: boolean;
  isPointerLocked: boolean;
}

// Reusable math objects to eliminate GC in render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _vec2Center = new THREE.Vector2(0, 0);
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export class HorrorGameEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock = new THREE.Clock();
  private animFrameId: number | null = null;

  // Touch Controller
  public touchController: TouchController = new TouchController();

  // Settings & State
  public gameState: GameState = 'TITLE';
  public difficulty: Difficulty = 'NORMAL';
  public mouseSensitivity: number = 0.0022;
  public isMuted: boolean = false;
  private onHUDUpdate?: (data: GameHUDData) => void;

  // Collision
  private collisionBoxes: CollisionBox[] = [];

  // Player properties
  private playerPos = new THREE.Vector3(0, 1.6, 0);
  private playerVel = new THREE.Vector3();
  private cameraPitch: number = 0;
  private cameraYaw: number = 0;
  private playerRadius: number = 0.45;
  private stamina: number = 100;
  private isSprinting: boolean = false;
  private headBobTimer: number = 0;
  private lastFootstepDist: number = 0;

  // Flashlight
  private flashlight!: THREE.SpotLight;
  private flashlightTarget!: THREE.Object3D;
  private flashlightBattery: number = 100;
  private isFlashlightOn: boolean = true;
  private flashlightDust!: THREE.Points;

  // Collectibles & Doors
  private keysCollected: number = 0;
  private totalKeys: number = 4;
  private keycardMeshes: { index: number; group: THREE.Group; collected: boolean }[] = [];
  private batteryMeshes: { id: number; group: THREE.Group; collected: boolean }[] = [];
  private batteriesCollected: number = 0;
  private batteryPickupMessage: string | null = null;
  private batteryPickupTimer: number = 0;
  private lowBatteryWarningCooldown: number = 0;
  private exitDoorMesh!: THREE.Mesh;
  private exitDoorTex!: THREE.CanvasTexture;
  private flickeringLights: { light: THREE.PointLight; baseIntensity: number; timer: number }[] = [];

  // Monster
  private monster!: MonsterParts;
  private monsterPos = new THREE.Vector3(0, 0, 0);
  private monsterYaw: number = 0;
  private monsterState: 'PATROL' | 'INVESTIGATE' | 'WINDUP' | 'CHASE' | 'ATTACK' = 'PATROL';
  private monsterTarget = new THREE.Vector3();
  private monsterPatrolWaypoints: Waypoint[] = [];
  private currentWaypointIdx: number = 0;
  private monsterSpeed: number = 2.4;
  private windupTimer: number = 0;
  private monsterAnimTimer: number = 0;
  private scareIntensity: number = 0;

  // Keyboard input state
  private keysHeld: Record<string, boolean> = {};

  // Timing
  private gameTime: number = 0;
  private titleCamAngle: number = 0;

  // Interaction raycaster
  private raycaster = new THREE.Raycaster();
  private interactPrompt: string | null = null;
  private currentInteractAction: (() => void) | null = null;

  // Pointer Lock Cooldown Tracking
  private lastPointerLockExitTime: number = 0;
  private pointerLockCooldownTimer: ReturnType<typeof setTimeout> | null = null;

  // Low-Light Jumpscare System State
  private darknessDuration: number = 0;
  private nextJumpscareCooldown: number = 12.0;
  private activeJumpscare: JumpscareType = null;
  private jumpscareTimer: number = 0;
  private jumpscareMessage: string | null = null;
  private cameraShake: number = 0;
  private isInLowLight: boolean = false;

  // Mouse Drag Look State (Seamless fallback if pointer lock is unengaged)
  private isMouseDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(container: HTMLElement, onHUDUpdate?: (data: GameHUDData) => void) {
    this.container = container;
    this.onHUDUpdate = onHUDUpdate;

    this.initThree();
    this.buildWorld();
    this.setupInputs();
    this.startLoop();
  }

  private initThree() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
    TextureLibrary.setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    // Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060807);
    this.scene.fog = new THREE.FogExp2(0x060807, 0.085);

    // Environment reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 80);
    this.camera.position.set(0, 1.6, 0);

    // Flashlight SpotLight setup
    this.flashlight = new THREE.SpotLight(0xf4faff, 2.6, 22, Math.PI / 5.5, 0.45, 1.2);
    this.flashlight.position.set(0, 1.5, 0);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.camera.near = 0.2;
    this.flashlight.shadow.camera.far = 25;
    this.flashlight.shadow.bias = -0.0005;

    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0, 1.5, -5);
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.scene.add(this.flashlight);

    // Flashlight Dust motes particle effect
    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 1.5;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
      dustPositions[i * 3 + 2] = -Math.random() * 6 - 0.5;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.flashlightDust = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.flashlightDust);

    // Very subtle horror ambient light
    const ambient = new THREE.HemisphereLight(0x0a1412, 0x030504, 0.25);
    this.scene.add(ambient);

    // Window resize
    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = () => {
    if (!this.renderer || !this.camera || !this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Build Asylum 3D Map, walls, floors, ceilings, props, and spawns
   */
  private buildWorld() {
    this.collisionBoxes = MapData.getCollisionBoxes();
    this.monsterPatrolWaypoints = MapData.getPatrolWaypoints();

    const floorTex = TextureLibrary.createFloorTexture();
    const wallTex = TextureLibrary.createWallTexture();
    const ceilingTex = TextureLibrary.createCeilingTexture();

    // 1. Floor & Ceiling
    const totalSizeX = MapData.gridWidth * TILE_SIZE;
    const totalSizeZ = MapData.gridHeight * TILE_SIZE;

    const floorGeo = new THREE.PlaneGeometry(totalSizeX, totalSizeZ);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.7,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingTex,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    this.scene.add(ceiling);

    // 2. Walls and Props
    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.85,
      metalness: 0.15,
    });

    let batteryCounter = 0;

    for (let gz = 0; gz < MapData.gridHeight; gz++) {
      for (let gx = 0; gx < MapData.gridWidth; gx++) {
        const val = ASYLUM_LAYOUT[gz][gx];
        const world = MapData.gridToWorld(gx, gz);

        // Wall
        if (val === TileType.WALL) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(world.x, WALL_HEIGHT / 2, world.z);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.scene.add(wall);
        }
        // Player Start
        else if (val === TileType.PLAYER_START) {
          this.playerPos.set(world.x, 1.6, world.z);
        }
        // Exit Door
        else if (val === TileType.EXIT_DOOR && gx === 10) {
          // Center tile of 3-tile exit portal
          this.exitDoorTex = TextureLibrary.createExitBlastDoorTexture(0, this.totalKeys);
          const doorGeo = new THREE.PlaneGeometry(TILE_SIZE * 3, WALL_HEIGHT * 0.95);
          const doorMat = new THREE.MeshStandardMaterial({
            map: this.exitDoorTex,
            roughness: 0.5,
            metalness: 0.7,
            side: THREE.DoubleSide,
          });
          this.exitDoorMesh = new THREE.Mesh(doorGeo, doorMat);
          this.exitDoorMesh.position.set(world.x, (WALL_HEIGHT * 0.95) / 2, world.z);
          this.scene.add(this.exitDoorMesh);
        }
        // Keycards 1 - 4
        else if (val >= TileType.KEY_1 && val <= TileType.KEY_4) {
          const keyIdx = val - TileType.KEY_1;
          const keyGroup = ModelFactory.createKeycardItem(keyIdx);
          keyGroup.position.set(world.x, 0.9, world.z);
          this.scene.add(keyGroup);
          this.keycardMeshes.push({ index: keyIdx, group: keyGroup, collected: false });
        }
        // Battery Pickup
        else if (val === TileType.BATTERY) {
          const battGroup = ModelFactory.createBatteryItem();
          battGroup.position.set(world.x, 0.4, world.z);
          this.scene.add(battGroup);
          this.batteryMeshes.push({ id: batteryCounter++, group: battGroup, collected: false });
        }
        // Props: Gurney
        else if (val === TileType.PROP_GURNEY) {
          const gurney = ModelFactory.createGurney();
          gurney.position.set(world.x, 0, world.z);
          gurney.rotation.y = (gx % 2 === 0 ? 0 : Math.PI / 2) + Math.random() * 0.3;
          this.scene.add(gurney);
        }
        // Props: Wheelchair
        else if (val === TileType.PROP_WHEELCHAIR) {
          const wheelchair = ModelFactory.createWheelchair();
          wheelchair.position.set(world.x, 0, world.z);
          wheelchair.rotation.y = Math.random() * Math.PI * 2;
          this.scene.add(wheelchair);
        }
        // Props: Locker
        else if (val === TileType.PROP_LOCKER) {
          const locker = ModelFactory.createLocker();
          locker.position.set(world.x, 0, world.z);
          this.scene.add(locker);
        }
        // Monster Spawn
        else if (val === TileType.MONSTER_SPAWN && this.monsterPos.x === 0) {
          this.monsterPos.set(world.x, 0, world.z);
        }

        // Procedural ceiling light fixtures in certain corridor junctions
        if (
          !MapData.isWall(gx, gz) &&
          val !== TileType.WALL &&
          (gx % 4 === 2) &&
          (gz % 4 === 2)
        ) {
          const lightObj = ModelFactory.createFluorescentLight(Math.random() < 0.6);
          lightObj.group.position.set(world.x, WALL_HEIGHT, world.z);
          this.scene.add(lightObj.group);
          this.flickeringLights.push({
            light: lightObj.light,
            baseIntensity: lightObj.light.intensity,
            timer: Math.random() * 10,
          });
        }
      }
    }

    // Add cryptic blood graffiti decals on specific corridor walls
    const decal1Tex = TextureLibrary.createBloodDecal("DON'T TURN AROUND");
    const decal1 = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: decal1Tex, transparent: true, depthWrite: false })
    );
    decal1.position.set(MapData.originX + 7.5 * TILE_SIZE, 1.8, MapData.originZ + 3.0 * TILE_SIZE + 0.05);
    this.scene.add(decal1);

    const decal2Tex = TextureLibrary.createBloodDecal('IT HUNTS BY SOUND');
    const decal2 = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: decal2Tex, transparent: true, depthWrite: false })
    );
    decal2.position.set(MapData.originX + 13.5 * TILE_SIZE, 1.8, MapData.originZ + 11.0 * TILE_SIZE + 0.05);
    this.scene.add(decal2);

    // 3. Spawn Monster
    this.monster = ModelFactory.createMonster();
    if (this.monsterPos.lengthSq() < 1) {
      // Default monster spawn far from player
      const startWp = this.monsterPatrolWaypoints[Math.floor(this.monsterPatrolWaypoints.length * 0.75)];
      if (startWp) this.monsterPos.set(startWp.x, 0, startWp.z);
    }
    this.monster.root.position.copy(this.monsterPos);
    this.scene.add(this.monster.root);

    // Set first patrol target
    if (this.monsterPatrolWaypoints.length > 0) {
      this.monsterTarget.set(this.monsterPatrolWaypoints[0].x, 0, this.monsterPatrolWaypoints[0].z);
    }
  }

  /**
   * Setup Keyboard, Mouse, and Touch Input Listeners
   */
  private setupInputs() {
    const handleKeyDown = (e: KeyboardEvent) => {
      this.keysHeld[e.code] = true;
      if (e.key) {
        this.keysHeld[e.key] = true;
        this.keysHeld[e.key.toLowerCase()] = true;
      }

      // Prevent window scroll on game action keys during gameplay
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) &&
        this.gameState === 'PLAYING'
      ) {
        e.preventDefault();
      }

      if (e.code === 'KeyF' || e.code === 'Space' || e.key === 'f' || e.key === 'F') {
        if (this.gameState === 'PLAYING') {
          this.toggleFlashlight();
        }
      }

      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        if (this.gameState === 'PLAYING' && this.currentInteractAction) {
          this.currentInteractAction();
        }
      }

      if (e.code === 'Escape') {
        if (this.gameState === 'PLAYING') {
          this.pauseGame();
        } else if (this.gameState === 'PAUSED') {
          this.resumeGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      this.keysHeld[e.code] = false;
      if (e.key) {
        this.keysHeld[e.key] = false;
        this.keysHeld[e.key.toLowerCase()] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleKeyDown);
    this.container.addEventListener('keydown', handleKeyDown);

    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('keyup', handleKeyUp);
    this.container.addEventListener('keyup', handleKeyUp);

    window.addEventListener('blur', () => {
      this.keysHeld = {};
      this.isMouseDown = false;
    });

    // Pointer Lock state listeners
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);

    // Mouse Look via Pointer Lock on click & Drag Look Fallback
    const onCanvasClick = () => {
      if (this.gameState === 'PLAYING') {
        this.requestSafePointerLock();
      }
      this.container.focus();
    };

    this.renderer.domElement.addEventListener('click', onCanvasClick);
    this.container.addEventListener('click', onCanvasClick);

    window.addEventListener('mousedown', (e) => {
      if (this.gameState === 'PLAYING') {
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.gameState !== 'PLAYING') return;

      if (document.pointerLockElement === this.renderer.domElement) {
        // Pointer Lock mode
        this.cameraYaw -= e.movementX * this.mouseSensitivity;
        this.cameraPitch -= e.movementY * this.mouseSensitivity;
        this.cameraPitch = Math.max(-1.48, Math.min(1.48, this.cameraPitch));
      } else if (this.isMouseDown) {
        // Drag Look fallback (when pointer lock is not active or denied)
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.cameraYaw -= dx * this.mouseSensitivity * 1.5;
        this.cameraPitch -= dy * this.mouseSensitivity * 1.5;
        this.cameraPitch = Math.max(-1.48, Math.min(1.48, this.cameraPitch));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    // Touch handlers with passive: false so preventDefault prevents mobile page gestures/cancelling
    const touchOpts = { passive: false };
    window.addEventListener('touchstart', (e) => this.touchController.handleTouchStart(e), touchOpts);
    window.addEventListener('touchmove', (e) => this.touchController.handleTouchMove(e), touchOpts);
    window.addEventListener('touchend', (e) => this.touchController.handleTouchEnd(e), touchOpts);
    window.addEventListener('touchcancel', (e) => this.touchController.handleTouchEnd(e), touchOpts);
  }

  public startGame(diff: Difficulty = 'NORMAL') {
    this.difficulty = diff;
    soundManager.init();
    this.gameState = 'PLAYING';
    this.gameTime = 0;
    this.keysCollected = 0;
    this.flashlightBattery = 100;
    this.stamina = 100;
    this.scareIntensity = 0;
    this.monsterState = 'PATROL';

    // Difficulty params
    if (this.difficulty === 'EASY') {
      this.monsterSpeed = 2.0;
    } else if (this.difficulty === 'NORMAL') {
      this.monsterSpeed = 2.6;
    } else {
      this.monsterSpeed = 3.3;
    }

    // Reset items
    this.keycardMeshes.forEach((k) => {
      k.collected = false;
      k.group.visible = true;
    });
    this.batteryMeshes.forEach((b) => {
      b.collected = false;
      b.group.visible = true;
    });
    this.batteriesCollected = 0;
    this.batteryPickupMessage = null;
    this.batteryPickupTimer = 0;
    this.lowBatteryWarningCooldown = 0;
    this.isFlashlightOn = true;
    this.flashlight.visible = true;
    this.flashlightDust.visible = true;

    // Reposition player at start
    const pStartWorld = MapData.gridToWorld(10, 9);
    this.playerPos.set(pStartWorld.x, 1.6, pStartWorld.z);
    this.cameraYaw = 0;
    this.cameraPitch = 0;

    // Reposition monster far
    const wp = this.monsterPatrolWaypoints[Math.floor(this.monsterPatrolWaypoints.length * 0.8)];
    if (wp) {
      this.monsterPos.set(wp.x, 0, wp.z);
      this.monster.root.position.copy(this.monsterPos);
    }

    // Update exit blast door graphic
    this.updateExitDoorGraphic();

    // Lock pointer safely on desktop
    this.requestSafePointerLock();
  }

  private onPointerLockChange = () => {
    if (!document.pointerLockElement) {
      this.lastPointerLockExitTime = performance.now();
    }
  };

  private onPointerLockError = () => {
    // Gracefully handle browser security error when pointer lock is requested during cooldown
  };

  public requestSafePointerLock() {
    if (this.touchController.joystickActive) return;
    if (document.pointerLockElement === this.renderer.domElement) return;

    // Check browser rate-limiting cooldown (Chromium enforces ~1250ms after exiting lock)
    const timeSinceExit = performance.now() - this.lastPointerLockExitTime;
    if (timeSinceExit < 1300) {
      if (!this.pointerLockCooldownTimer) {
        this.pointerLockCooldownTimer = setTimeout(() => {
          this.pointerLockCooldownTimer = null;
          if (this.gameState === 'PLAYING' && !document.pointerLockElement) {
            try {
              const res = this.renderer.domElement.requestPointerLock?.();
              if (res && typeof (res as Promise<void>).catch === 'function') {
                (res as Promise<void>).catch(() => {});
              }
            } catch (_) {}
          }
        }, Math.max(100, 1350 - timeSinceExit));
      }
      return;
    }

    try {
      const res = this.renderer.domElement.requestPointerLock?.();
      if (res && typeof (res as Promise<void>).catch === 'function') {
        (res as Promise<void>).catch(() => {});
      }
    } catch (_) {}
  }

  public exitSafePointerLock() {
    this.lastPointerLockExitTime = performance.now();
    if (this.pointerLockCooldownTimer) {
      clearTimeout(this.pointerLockCooldownTimer);
      this.pointerLockCooldownTimer = null;
    }
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock?.();
      } catch (_) {}
    }
  }

  public pauseGame() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.exitSafePointerLock();
    }
  }

  public resumeGame() {
    if (this.gameState === 'PAUSED') {
      this.gameState = 'PLAYING';
      this.requestSafePointerLock();
    }
  }

  public restartGame() {
    this.startGame(this.difficulty);
  }

  public returnToTitle() {
    this.gameState = 'TITLE';
    this.exitSafePointerLock();
  }

  public toggleFlashlight() {
    if (this.flashlightBattery <= 0) {
      soundManager.playEmptyClick();
      this.batteryPickupMessage = 'BATTERY DEPLETED - FIND POWER CELLS';
      this.batteryPickupTimer = 2.4;
      return;
    }
    this.isFlashlightOn = !this.isFlashlightOn;
    this.flashlight.visible = this.isFlashlightOn;
    this.flashlightDust.visible = this.isFlashlightOn;
    soundManager.playFlashlightClick(this.isFlashlightOn);
  }

  public collectBattery(batt: { id: number; group: THREE.Group; collected: boolean }) {
    if (batt.collected) return;
    batt.collected = true;
    batt.group.visible = false;
    this.batteriesCollected++;

    const prevCharge = this.flashlightBattery;
    this.flashlightBattery = Math.min(100, this.flashlightBattery + 45);
    const gained = Math.round(this.flashlightBattery - prevCharge);

    // Auto revive flashlight if it had drained to 0%
    if (!this.isFlashlightOn && prevCharge <= 0) {
      this.isFlashlightOn = true;
      this.flashlight.visible = true;
      this.flashlightDust.visible = true;
    }

    soundManager.playBatteryPickup();
    this.batteryPickupMessage = `+${gained}% POWER CELL INSTALLED`;
    this.batteryPickupTimer = 2.6;
  }

  public interact() {
    if (this.currentInteractAction) {
      this.currentInteractAction();
    }
  }

  private updateExitDoorGraphic() {
    if (!this.exitDoorMesh) return;
    this.exitDoorTex = TextureLibrary.createExitBlastDoorTexture(this.keysCollected, this.totalKeys);
    (this.exitDoorMesh.material as THREE.MeshStandardMaterial).map = this.exitDoorTex;
    (this.exitDoorMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
  }

  /**
   * Main 60fps Animation Loop
   */
  private startLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05); // Frame delta clamping

      if (this.gameState === 'TITLE') {
        this.updateTitleScreen(dt);
      } else if (this.gameState === 'PLAYING') {
        this.updateGameplay(dt);
      }

      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }

  /**
   * Atmospheric live 3D Title Screen Camera Pan
   */
  private updateTitleScreen(dt: number) {
    this.titleCamAngle += dt * 0.12;

    const centerX = 0;
    const centerZ = 0;
    const radius = 6.5;

    this.camera.position.set(
      centerX + Math.sin(this.titleCamAngle) * radius,
      1.7 + Math.sin(this.titleCamAngle * 1.5) * 0.15,
      centerZ + Math.cos(this.titleCamAngle) * radius
    );
    this.camera.lookAt(centerX, 1.2, centerZ);

    // Keep monster idle lurking in background
    if (this.monster) {
      this.monster.root.position.set(0, 0, -2);
      this.monster.root.rotation.y = Math.PI;
      this.animateMonsterLimbs(dt * 0.6, false);
    }

    // Flashlight off in title
    this.flashlight.visible = false;
    this.flashlightDust.visible = false;

    // Update flickering ceiling lights
    this.updateFlickeringLights(dt);
  }

  /**
   * Update active gameplay frame
   */
  private updateGameplay(dt: number) {
    this.gameTime += dt;

    // 1. Process Touch inputs into camera & movement
    if (this.touchController.state.toggleFlashlightJustPressed) {
      this.toggleFlashlight();
    }
    if (this.touchController.state.interactJustPressed && this.currentInteractAction) {
      this.currentInteractAction();
    }

    this.cameraYaw -= this.touchController.state.lookDeltaX * 1.5;
    this.cameraPitch -= this.touchController.state.lookDeltaY * 1.5;
    this.cameraPitch = Math.max(-1.48, Math.min(1.48, this.cameraPitch));

    // 2. Sprint & Stamina
    const wantSprint =
      this.keysHeld['ShiftLeft'] ||
      this.keysHeld['ShiftRight'] ||
      this.touchController.state.isSprinting;

    if (wantSprint && this.stamina > 5 && this.playerVel.lengthSq() > 0.05) {
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - dt * 20);
      if (this.stamina < 30) {
        soundManager.playBreathing((30 - this.stamina) / 30);
      }
    } else {
      this.isSprinting = false;
      this.stamina = Math.min(100, this.stamina + dt * 14);
    }

    // 3. Player Movement Calculation
    let moveFwd = 0;
    let moveRight = 0;

    const isW = this.keysHeld['KeyW'] || this.keysHeld['Keyw'] || this.keysHeld['w'] || this.keysHeld['W'] || this.keysHeld['ArrowUp'] || this.keysHeld['arrowup'] || this.keysHeld['KeyZ'] || this.keysHeld['z'];
    const isS = this.keysHeld['KeyS'] || this.keysHeld['Keys'] || this.keysHeld['s'] || this.keysHeld['S'] || this.keysHeld['ArrowDown'] || this.keysHeld['arrowdown'];
    const isA = this.keysHeld['KeyA'] || this.keysHeld['Keya'] || this.keysHeld['a'] || this.keysHeld['A'] || this.keysHeld['ArrowLeft'] || this.keysHeld['arrowleft'] || this.keysHeld['KeyQ'] || this.keysHeld['q'];
    const isD = this.keysHeld['KeyD'] || this.keysHeld['Keyd'] || this.keysHeld['d'] || this.keysHeld['D'] || this.keysHeld['ArrowRight'] || this.keysHeld['arrowright'];

    if (isW) moveFwd += 1;
    if (isS) moveFwd -= 1;
    if (isA) moveRight -= 1;
    if (isD) moveRight += 1;

    // Add mobile joystick and on-screen D-Pad values
    moveRight += this.touchController.state.moveX + this.touchController.dpadMoveX;
    moveFwd += this.touchController.state.moveZ + this.touchController.dpadMoveZ;

    // Clamp input vector
    const inputLen = Math.hypot(moveRight, moveFwd);
    if (inputLen > 1) {
      moveRight /= inputLen;
      moveFwd /= inputLen;
    }

    // Target velocity in world space
    const baseSpeed = this.isSprinting ? 5.2 : 2.8;
    const targetVel = _vec3A.set(0, 0, 0);

    if (inputLen > 0.05) {
      const sinYaw = Math.sin(this.cameraYaw);
      const cosYaw = Math.cos(this.cameraYaw);

      // Forward direction vector on XZ
      const fwdX = -sinYaw;
      const fwdZ = -cosYaw;
      // Right direction vector on XZ
      const rightX = cosYaw;
      const rightZ = -sinYaw;

      targetVel.x = (fwdX * moveFwd + rightX * moveRight) * baseSpeed;
      targetVel.z = (fwdZ * moveFwd + rightZ * moveRight) * baseSpeed;
    }

    // Exponential velocity damping
    this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, targetVel.x, 14, dt);
    this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, targetVel.z, 14, dt);

    // Apply movement & resolve collisions against walls
    const newPosX = this.playerPos.x + this.playerVel.x * dt;
    const newPosZ = this.playerPos.z + this.playerVel.z * dt;
    const resolved = MapData.resolveCircleCollision(newPosX, newPosZ, this.playerRadius, this.collisionBoxes);

    this.playerPos.x = resolved.x;
    this.playerPos.z = resolved.z;

    // Footstep audio & head bob
    const movedDist = Math.hypot(this.playerVel.x * dt, this.playerVel.z * dt);
    if (movedDist > 0.005) {
      this.lastFootstepDist += movedDist;
      const stepInterval = this.isSprinting ? 1.4 : 1.9;
      if (this.lastFootstepDist >= stepInterval) {
        this.lastFootstepDist = 0;
        soundManager.playFootstep(this.isSprinting);
      }
      this.headBobTimer += dt * (this.isSprinting ? 15 : 9);
    } else {
      this.headBobTimer = THREE.MathUtils.damp(this.headBobTimer, 0, 8, dt);
    }

    const headBobY = Math.sin(this.headBobTimer) * 0.045;
    const headBobX = Math.cos(this.headBobTimer * 0.5) * 0.025;

    // Jumpscare camera shake calculation
    const shakeOffsetX = (Math.random() - 0.5) * this.cameraShake * 0.35;
    const shakeOffsetY = (Math.random() - 0.5) * this.cameraShake * 0.35;
    this.cameraShake = Math.max(0, this.cameraShake - dt * 2.8);

    // Update Camera Transform
    _euler.set(this.cameraPitch, this.cameraYaw, 0);
    this.camera.quaternion.setFromEuler(_euler);
    this.camera.position.set(
      this.playerPos.x + headBobX + shakeOffsetX,
      1.6 + headBobY + shakeOffsetY,
      this.playerPos.z
    );

    // 4. Update Flashlight Rig & Battery Drain System
    const fwdDir = _vec3B.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.flashlight.position.copy(this.camera.position).addScaledVector(fwdDir, 0.15);
    this.flashlightTarget.position.copy(this.camera.position).addScaledVector(fwdDir, 6.0);

    // Dust motes tracking
    this.flashlightDust.position.copy(this.camera.position);
    this.flashlightDust.quaternion.copy(this.camera.quaternion);

    // Battery Drain over time
    if (this.isFlashlightOn) {
      let drainRate = 1.35; // Default ~74 seconds continuous use
      if (this.difficulty === 'EASY') drainRate = 0.85; // ~118 seconds
      else if (this.difficulty === 'NIGHTMARE') drainRate = 2.2; // ~45 seconds

      this.flashlightBattery = Math.max(0, this.flashlightBattery - dt * drainRate);

      if (this.flashlightBattery <= 0) {
        this.isFlashlightOn = false;
        this.flashlight.visible = false;
        this.flashlightDust.visible = false;
        soundManager.playBatteryDied();
        this.batteryPickupMessage = 'FLASHLIGHT BATTERY DIED';
        this.batteryPickupTimer = 3.0;
      }
    }

    // Low battery audio warning and timer
    if (this.lowBatteryWarningCooldown > 0) {
      this.lowBatteryWarningCooldown -= dt;
    }
    if (this.isFlashlightOn && this.flashlightBattery > 0 && this.flashlightBattery < 20) {
      if (this.lowBatteryWarningCooldown <= 0) {
        soundManager.playBatteryLowWarning();
        this.lowBatteryWarningCooldown = 12.0;
      }
    } else if (this.flashlightBattery >= 20) {
      this.lowBatteryWarningCooldown = 0;
    }

    // Battery notification banner timer
    if (this.batteryPickupTimer > 0) {
      this.batteryPickupTimer -= dt;
      if (this.batteryPickupTimer <= 0) {
        this.batteryPickupMessage = null;
      }
    }

    // Proximity to Monster
    const distToMonster = this.playerPos.distanceTo(this.monsterPos);
    const proximity = Math.max(0, 1 - distToMonster / 18);
    const isChasing = this.monsterState === 'CHASE' || this.monsterState === 'WINDUP';

    // Flashlight beam scaling & dynamic flicker based on charge & entity proximity
    if (this.isFlashlightOn) {
      const batRatio = this.flashlightBattery / 100;
      const baseIntensity = 2.8 * Math.max(0.35, Math.pow(batRatio, 0.6));
      this.flashlight.distance = 22 * Math.max(0.4, Math.pow(batRatio, 0.45));

      if (this.flashlightBattery < 10) {
        // Severe voltage drop and sputtering
        const flicker = Math.random() < 0.4 ? 0.15 : (0.6 + Math.random() * 0.6);
        this.flashlight.intensity = flicker;
        if (Math.random() < 0.08) soundManager.playStaticBurst(0.08);
      } else if (this.flashlightBattery < 22) {
        // Warning brownout flutter
        const flicker = Math.random() < 0.2 ? 0.5 : baseIntensity;
        this.flashlight.intensity = flicker;
      } else if (proximity > 0.5 && Math.random() < 0.25) {
        // Paranormal distortion
        this.flashlight.intensity = Math.random() < 0.3 ? 0.3 : 2.5;
        if (Math.random() < 0.05) soundManager.playStaticBurst(0.12);
      } else {
        this.flashlight.intensity = baseIntensity;
      }
    }

    // 5. Update Monster AI & Behavior
    this.updateMonsterAI(dt, distToMonster);

    // 6. Update Items & Collectibles Rotation and Pickups
    this.keycardMeshes.forEach((k) => {
      if (!k.collected) {
        k.group.rotation.y += dt * 1.5;
        k.group.position.y = 0.9 + Math.sin(this.gameTime * 2.5 + k.index) * 0.08;
      }
    });

    this.batteryMeshes.forEach((b) => {
      if (!b.collected) {
        b.group.rotation.y += dt * 1.8;
        b.group.position.y = 0.22 + Math.sin(this.gameTime * 3.0 + b.id) * 0.04;
        const ring = b.group.getObjectByName('locatorRing') as THREE.Mesh;
        if (ring) {
          const pulse = 1.0 + Math.sin(this.gameTime * 4.0 + b.id) * 0.15;
          ring.scale.set(pulse, pulse, 1);
        }

        // Proximity pickup when player walks over battery
        const distToPlayer = this.playerPos.distanceTo(b.group.position);
        if (distToPlayer < 1.35) {
          this.collectBattery(b);
        }
      }
    });

    // 7. Update Interaction Raycasting
    this.updateInteractions();

    // 8. Update Flickering Ceiling Lights
    this.updateFlickeringLights(dt);

    // 9. Update Horror Audio & Heartbeat
    soundManager.updateTension(proximity, isChasing);
    const bpm = 65 + proximity * 85 + (this.isSprinting ? 25 : 0);
    soundManager.tickHeartbeat(bpm, proximity);

    // Scare intensity for chromatic screen vignette
    const targetScare = isChasing ? Math.min(1, 0.4 + (1 - distToMonster / 12) * 0.6) : proximity * 0.4;
    this.scareIntensity = THREE.MathUtils.damp(this.scareIntensity, targetScare, 6, dt);

    // 10. Emit HUD Update
    if (this.onHUDUpdate) {
      this.onHUDUpdate({
        state: this.gameState,
        battery: Math.round(this.flashlightBattery),
        isFlashlightOn: this.isFlashlightOn,
        batteryNotification: this.batteryPickupMessage,
        batteriesCollected: this.batteriesCollected,
        batteryLowWarning: this.isFlashlightOn && this.flashlightBattery < 20,
        stamina: Math.round(this.stamina),
        heartbeatBpm: Math.round(bpm),
        keysCollected: this.keysCollected,
        totalKeys: this.totalKeys,
        interactPrompt: this.interactPrompt,
        scareIntensity: this.scareIntensity,
        isChased: isChasing,
        survivedTime: Math.round(this.gameTime),
        isMobile: this.touchController.getIsMobile(),
        isPointerLocked: document.pointerLockElement === this.renderer.domElement,
      });
    }

    // Reset touch frame edge triggers
    this.touchController.resetFrameDeltas();
  }

  /**
   * Monster AI Behavior Machine
   */
  private updateMonsterAI(dt: number, distToPlayer: number) {
    if (!this.monster) return;

    const hasLOS = MapData.hasLineOfSight(
      this.monsterPos.x,
      this.monsterPos.z,
      this.playerPos.x,
      this.playerPos.z
    );

    // Detect player: Line of sight + distance, or sprinting nearby, or flashlight shining at monster
    const canSee = hasLOS && distToPlayer < (this.isFlashlightOn ? 18 : 12);
    const heardRunning = this.isSprinting && distToPlayer < 10;

    // State transitions
    switch (this.monsterState) {
      case 'PATROL':
        if (canSee) {
          // Visible telegraph windup before charge
          this.monsterState = 'WINDUP';
          this.windupTimer = 0.75;
          soundManager.playMonsterAlert();
        } else if (heardRunning) {
          this.monsterState = 'INVESTIGATE';
          this.monsterTarget.copy(this.playerPos);
        } else {
          // Walk to current waypoint
          const distToWp = Math.hypot(
            this.monsterTarget.x - this.monsterPos.x,
            this.monsterTarget.z - this.monsterPos.z
          );
          if (distToWp < 1.2) {
            this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.monsterPatrolWaypoints.length;
            const nextWp = this.monsterPatrolWaypoints[this.currentWaypointIdx];
            this.monsterTarget.set(nextWp.x, 0, nextWp.z);
          }
          this.moveMonsterTowards(this.monsterTarget, this.monsterSpeed * 0.65, dt);
          this.animateMonsterLimbs(dt * 3.5, false);
        }
        break;

      case 'INVESTIGATE':
        if (canSee) {
          this.monsterState = 'WINDUP';
          this.windupTimer = 0.75;
          soundManager.playMonsterAlert();
        } else {
          const distToInvestigate = Math.hypot(
            this.monsterTarget.x - this.monsterPos.x,
            this.monsterTarget.z - this.monsterPos.z
          );
          if (distToInvestigate < 1.5) {
            this.monsterState = 'PATROL';
          } else {
            this.moveMonsterTowards(this.monsterTarget, this.monsterSpeed * 0.8, dt);
            this.animateMonsterLimbs(dt * 4.5, false);
          }
        }
        break;

      case 'WINDUP':
        this.windupTimer -= dt;
        // Monster stops, violently twitches neck/head & roars
        this.lookMonsterAt(this.playerPos);
        this.monster.head.rotation.y = (Math.random() - 0.5) * 0.6;
        this.monster.head.rotation.z = (Math.random() - 0.5) * 0.5;
        this.monster.leftArm.rotation.x = -1.2;
        this.monster.rightArm.rotation.x = -1.2;

        if (this.windupTimer <= 0) {
          this.monsterState = 'CHASE';
        }
        break;

      case 'CHASE':
        this.monsterTarget.copy(this.playerPos);
        this.moveMonsterTowards(this.monsterTarget, this.monsterSpeed * 1.45, dt);
        this.animateMonsterLimbs(dt * 8.5, true);

        // Lost line of sight and far away -> investigate last known position
        if (!hasLOS && distToPlayer > 14) {
          this.monsterState = 'INVESTIGATE';
        }

        // Kill distance!
        if (distToPlayer < 1.4) {
          this.monsterState = 'ATTACK';
          this.triggerGameOver();
        }
        break;

      case 'ATTACK':
        // Kill pose
        this.lookMonsterAt(this.playerPos);
        this.monster.leftArm.rotation.x = -1.6;
        this.monster.rightArm.rotation.x = -1.6;
        break;
    }

    this.monster.root.position.copy(this.monsterPos);
    this.monster.root.rotation.y = this.monsterYaw;
  }

  private moveMonsterTowards(target: THREE.Vector3, speed: number, dt: number) {
    const dx = target.x - this.monsterPos.x;
    const dz = target.z - this.monsterPos.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.05) {
      const step = Math.min(dist, speed * dt);
      const nextX = this.monsterPos.x + (dx / dist) * step;
      const nextZ = this.monsterPos.z + (dz / dist) * step;

      const resolved = MapData.resolveCircleCollision(nextX, nextZ, 0.5, this.collisionBoxes);
      this.monsterPos.x = resolved.x;
      this.monsterPos.z = resolved.z;

      this.monsterYaw = Math.atan2(dx, dz);
    }
  }

  private lookMonsterAt(target: THREE.Vector3) {
    const dx = target.x - this.monsterPos.x;
    const dz = target.z - this.monsterPos.z;
    this.monsterYaw = Math.atan2(dx, dz);
  }

  /**
   * Procedural Kinematic Animation for Monster Limbs
   */
  private animateMonsterLimbs(step: number, isSprinting: boolean) {
    this.monsterAnimTimer += step;
    const t = this.monsterAnimTimer;

    // Leg swinging
    const legAmp = isSprinting ? 0.75 : 0.45;
    this.monster.leftLeg.rotation.x = Math.sin(t) * legAmp;
    this.monster.rightLeg.rotation.x = -Math.sin(t) * legAmp;

    // Arm swinging & reaching claw
    const armAmp = isSprinting ? 1.1 : 0.5;
    this.monster.leftArm.rotation.x = -Math.sin(t) * armAmp - (isSprinting ? 0.6 : 0.1);
    this.monster.rightArm.rotation.x = Math.sin(t) * armAmp - (isSprinting ? 0.6 : 0.1);

    // Spine and head twitch
    this.monster.torso.position.y = 1.25 + Math.abs(Math.sin(t * 2)) * 0.08;
    this.monster.head.rotation.x = Math.sin(t * 1.5) * 0.15;
    this.monster.head.rotation.y = Math.cos(t) * 0.2;

    // Cloth rag flutter
    this.monster.clothTats.forEach((cloth, i) => {
      cloth.rotation.x = Math.sin(t * 3 + i) * 0.3 + (isSprinting ? 0.4 : 0);
    });
  }

  /**
   * Raycast Forward for Items, Batteries, and Exit Door
   */
  private updateInteractions() {
    this.interactPrompt = null;
    this.currentInteractAction = null;

    // Raycast straight forward from camera center
    this.raycaster.setFromCamera(_vec2Center, this.camera);
    this.raycaster.far = 2.8;

    // Check Keycards
    for (const key of this.keycardMeshes) {
      if (!key.collected && this.playerPos.distanceTo(key.group.position) < 2.5) {
        this.interactPrompt = `PICK UP WARD KEYCARD 0${key.index + 1}`;
        this.currentInteractAction = () => {
          key.collected = true;
          key.group.visible = false;
          this.keysCollected++;
          soundManager.playItemPickup();
          this.updateExitDoorGraphic();
        };
        return;
      }
    }

    // Check Batteries
    for (const batt of this.batteryMeshes) {
      if (!batt.collected && this.playerPos.distanceTo(batt.group.position) < 2.6) {
        this.interactPrompt = 'PICK UP 9V POWER CELL (+45%)';
        this.currentInteractAction = () => {
          this.collectBattery(batt);
        };
        return;
      }
    }

    // Check Exit Door
    if (this.exitDoorMesh) {
      const distToExit = this.playerPos.distanceTo(this.exitDoorMesh.position);
      if (distToExit < 4.0) {
        if (this.keysCollected >= this.totalKeys) {
          this.interactPrompt = 'DISENGAGE MAIN BLAST DOOR & ESCAPE';
          this.currentInteractAction = () => {
            this.triggerVictory();
          };
        } else {
          this.interactPrompt = `BLAST DOOR LOCKED (${this.keysCollected}/${this.totalKeys} KEYCARDS FOUND)`;
          this.currentInteractAction = null;
        }
      }
    }
  }

  /**
   * Dynamic flickering ceiling lights
   */
  private updateFlickeringLights(dt: number) {
    this.flickeringLights.forEach((item) => {
      item.timer -= dt;
      if (item.timer <= 0) {
        // Quick flicker burst
        item.light.intensity = Math.random() < 0.35 ? 0.05 : item.baseIntensity * (0.8 + Math.random() * 0.4);
        item.timer = Math.random() * 0.15;
        // Occasionally stay on steady for a few seconds
        if (Math.random() < 0.1) {
          item.timer = 1.5 + Math.random() * 3.0;
          item.light.intensity = item.baseIntensity;
        }
      }
    });
  }

  private triggerGameOver() {
    this.gameState = 'GAMEOVER';
    soundManager.playJumpscareSting();
    this.exitSafePointerLock();
  }

  private triggerVictory() {
    this.gameState = 'VICTORY';
    soundManager.playDoorOpen();
    this.exitSafePointerLock();
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.pointerLockCooldownTimer) {
      clearTimeout(this.pointerLockCooldownTimer);
      this.pointerLockCooldownTimer = null;
    }
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
