import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import gsap from 'gsap';
import {
  ChapterId,
  ChapterVisualKind,
  CurveKind,
  DecayMode,
  HologramSpec,
  IsotopePreset,
} from '../types/lesson';
import { NUCLEAR_CHAPTERS } from '../data/nuclearPhysicsCurriculum';
import { evaluateAstonElPerA } from '../data/nuclearCurves';
import {
  createContactShadowTexture,
  createCoursePageTexture,
  createGlowSpriteTexture,
  createHandwrittenSheetTexture,
  createPolarLabFloorTexture,
  drawComparatorPlateCanvas,
  drawVideoMonitorFrame,
} from './textures';

const CHAPTER_SHEET_IMAGE: Record<ChapterId, { path: string; upright: boolean }> = {
  'intro-nucleus': { path: '/assets/aistudio/image_be2751a4.png', upright: false },
  'decay-alpha': { path: '/assets/aistudio/image_859f4ae9.png', upright: false },
  'decay-beta-minus': { path: '/assets/aistudio/image_94d7d36d.png', upright: false },
  'decay-beta-plus': { path: '/assets/aistudio/image_1a7dee44.png', upright: false },
  'decay-gamma': { path: '/assets/aistudio/image_94d7d36d.png', upright: false },
  'decay-law': { path: '/assets/aistudio/image_77a424f7.png', upright: false },
  'half-life': { path: '/assets/aistudio/image_a1b7dde6.png', upright: false },
  'activity-dating': { path: '/assets/aistudio/image_d99de1a1.png', upright: false },
  'segre-diagram': { path: '/assets/aistudio/image_f59d4205.png', upright: false },
  'usual-curves': { path: '/assets/aistudio/image_8defac2c.png', upright: true },
  'mass-defect': { path: '/assets/aistudio/image_07d4d11b.png', upright: false },
};

export interface NuclearSceneCallbacks {
  onContextLost?: (lost: boolean) => void;
  onSelectChapter?: (index: number) => void;
  onFocusActivePage?: () => void;
  onTogglePageFlip?: () => void;
}

export interface SceneStateUpdate {
  chapterId: ChapterId;
  chapterIndex: number;
  visualKind: ChapterVisualKind;
  fxColorHex: string;
  videoTitle: string;
  videoCaption: string;
  videoPlaying: boolean;
  pageReaderMode: boolean;
  pageFlipped: boolean;
  isotope: IsotopePreset;
  electronCount: number;
  explodeAmount: number;
  decayProgress: number; // normalized time t / t_half (0..4)
  curveKind: CurveKind;
  showTangent: boolean;
  reducedMotion: boolean;
  holograms: HologramSpec[];
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  fov?: number;
  massDefect: {
    Z: number;
    N: number;
    deltaMassU: number;
    bindingEnergyMeV: number;
    bindingRatio: number;
    pulseCount: number;
  };
  comparator: {
    active: boolean;
    explode: number;
    left: {
      id: string;
      symbol: string;
      name: string;
      A: number;
      Z: number;
      N: number;
      stable: boolean;
      deltaMassU: number;
      bindingEnergyMeV: number;
      energyPerNucleonMeV: number;
    };
    right: {
      id: string;
      symbol: string;
      name: string;
      A: number;
      Z: number;
      N: number;
      stable: boolean;
      deltaMassU: number;
      bindingEnergyMeV: number;
      energyPerNucleonMeV: number;
    };
  };
}

interface EmittedParticle {
  group: THREE.Group;
  velocity: THREE.Vector3;
  age: number;
  maxAge: number;
  mode: DecayMode;
  ringMesh?: THREE.Mesh;
}

// Preallocated module-scope math helpers (Zero-GC render loop)
const _v1 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _s1 = new THREE.Vector3();

const MAX_NUCLEONS = 250;
const MAX_ELECTRONS = 28;
const MAX_SAMPLE_ATOMS = 64;
const MAX_AMBIENT_SPARKS = 500;

export class NuclearSceneEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Camera transition targets
  private desiredCamPos = new THREE.Vector3(0, 0.3, 8.2);
  private desiredTarget = new THREE.Vector3(0, 0.1, 0);
  private desiredFov = 45;
  private cameraAutoFlight = true;

  // Textures & disposable resources
  private glowTexture: THREE.CanvasTexture;
  private floorTexture: THREE.CanvasTexture;
  private shadowTexture: THREE.CanvasTexture;
  private coursePageTextures: THREE.CanvasTexture[] = [];

  // Scene groups
  private nucleusAssembly = new THREE.Group();
  private segreGroup = new THREE.Group();
  private decayGroup = new THREE.Group();
  private massDefectGroup = new THREE.Group();
  private comparatorGroup = new THREE.Group();
  private coursePagesGroup = new THREE.Group();
  private particlesGroup = new THREE.Group();
  private videoGroup = new THREE.Group();

  // 3D Course Pages & Raycasting
  private coursePageAssemblies: THREE.Group[] = [];
  private coursePageBorders: THREE.LineSegments[] = [];
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };
  private hoveredPageIndex = -1;
  private activeChapterIndex = 0;
  private pageReaderMode = false;
  private pageFlipped = false;
  private comparatorMode = false;
  private lastCamPosPreset: [number, number, number] = [0, 0.3, 8.2];
  private lastCamTargetPreset: [number, number, number] = [0, 0.1, 0];

  // VideoPlane 3D canvas texture
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D | null;
  private videoTexture: THREE.CanvasTexture;
  private videoMesh!: THREE.Mesh;
  private videoBorderMat!: THREE.MeshBasicMaterial;
  private videoTitle = '';
  private videoCaption = '';
  private videoAccentHex = '#00e5ff';
  private videoPlaying = true;
  private lastVideoDraw = 0;

  // Nucleon InstancedMeshes
  private protonMesh!: THREE.InstancedMesh;
  private neutronMesh!: THREE.InstancedMesh;
  private protonSeeds: THREE.Vector3[] = [];
  private neutronSeeds: THREE.Vector3[] = [];
  private activeProtons = 6;
  private activeNeutrons = 6;
  private explodeAmount = 0;
  private targetExplode = 0;

  // Electron shells & valence electrons
  private orbitalRings: THREE.Mesh[] = [];
  private electronMeshes: THREE.Mesh[] = [];
  private activeElectrons = 6;
  private containmentShell!: THREE.Mesh;
  private coreGlowSprite!: THREE.Sprite;
  private floorHaloRing!: THREE.Mesh;

  // Ambient cosmic dust
  private sparkPoints!: THREE.Points;

  // Active emitted particles
  private activeEmissions: EmittedParticle[] = [];
  private flashLight!: THREE.PointLight;
  private flashIntensity = 0;

  // Segré interactive elements
  private segreIsotopeBeam!: THREE.Mesh;
  private segreSelectedMarker!: THREE.Mesh;

  // Decay & multi-curve 3D elements
  private activeCurveKind: CurveKind = 'decay-nd';
  private decayPrimaryTube!: THREE.Mesh;
  private decayTubeMat!: THREE.MeshStandardMaterial;
  private decayDaughterTube!: THREE.Mesh;
  private decayDaughterCursorMesh!: THREE.Mesh;
  private decayLogLinearTube!: THREE.Mesh;
  private logSlopeGroup = new THREE.Group();
  private decayLnNtTube!: THREE.Mesh;
  private decayLnNegGroup = new THREE.Group();
  private lnDownSlopeGroup = new THREE.Group();
  private decayAstonGroup = new THREE.Group();
  private decayCursorMesh!: THREE.Mesh;
  private decayCursorMat!: THREE.MeshStandardMaterial;
  private halfMarkerMesh!: THREE.Mesh;
  private decayTangentGroup = new THREE.Group();
  private sampleAtomsMesh!: THREE.InstancedMesh;
  private sampleAtomPositions: THREE.Vector3[] = [];

  // Mass Defect & Binding Energy 3D Comparator elements
  private mdBeamGroup = new THREE.Group();
  private mdLeftPanGroup = new THREE.Group();
  private mdRightPanGroup = new THREE.Group();
  private mdFreeProtonsMesh!: THREE.InstancedMesh;
  private mdFreeNeutronsMesh!: THREE.InstancedMesh;
  private mdBoundProtonsMesh!: THREE.InstancedMesh;
  private mdBoundNeutronsMesh!: THREE.InstancedMesh;
  private mdEnergyColumnMesh!: THREE.Mesh;
  private mdEnergyRings: THREE.Mesh[] = [];
  private mdPulseRingMesh!: THREE.Mesh;
  private mdZ = 6;
  private mdN = 6;
  private mdDeltaMassU = 0.0989;
  private mdEnergyMeV = 92.16;
  private mdBindingRatio = 1.0;
  private mdTargetBindingRatio = 1.0;
  private mdBeamTilt = 0;
  private mdTargetBeamTilt = -0.18;
  private mdLastPulseCount = 0;
  private mdPulseAge = 10;

  // Dual-Isotope 3D Comparator elements
  private compLeftNucleusGroup = new THREE.Group();
  private compRightNucleusGroup = new THREE.Group();
  private compLeftProtonsMesh!: THREE.InstancedMesh;
  private compLeftNeutronsMesh!: THREE.InstancedMesh;
  private compRightProtonsMesh!: THREE.InstancedMesh;
  private compRightNeutronsMesh!: THREE.InstancedMesh;
  private compLeftEnergyBar!: THREE.Mesh;
  private compRightEnergyBar!: THREE.Mesh;
  private compLeftCohesionRing!: THREE.Mesh;
  private compRightCohesionRing!: THREE.Mesh;
  private compDiffBeam!: THREE.Mesh;
  private compLeftPlateCanvas!: HTMLCanvasElement;
  private compLeftPlateCtx: CanvasRenderingContext2D | null = null;
  private compLeftPlateTex!: THREE.CanvasTexture;
  private compRightPlateCanvas!: HTMLCanvasElement;
  private compRightPlateCtx: CanvasRenderingContext2D | null = null;
  private compRightPlateTex!: THREE.CanvasTexture;
  private compLastLeftKey = '';
  private compLastRightKey = '';
  private compLeftZ = 6;
  private compLeftN = 6;
  private compLeftElMeV = 92.16;
  private compLeftElPerA = 7.68;
  private compRightZ = 6;
  private compRightN = 8;
  private compRightElMeV = 105.28;
  private compRightElPerA = 7.52;
  private compExplode = 0;
  private compTargetExplode = 0;
  private compBeamTilt = 0;
  private compTargetBeamTilt = 0;

  // Chapter visibility weights (smoothly damped)
  private activeChapter: ChapterId = 'intro-nucleus';
  private activeVisualKind: ChapterVisualKind = 'nucleus-intro';
  private reducedMotion = false;
  private nucleusWeight = 1;
  private segreWeight = 0;
  private decayWeight = 0;
  private massDefectWeight = 0;
  private comparatorWeight = 0;

  private callbacks: NuclearSceneCallbacks;

  constructor(
    container: HTMLElement,
    initial: SceneStateUpdate,
    callbacks: NuclearSceneCallbacks = {}
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = this.detectSoftwareGl();

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090f);
    this.scene.fog = new THREE.FogExp2(0x07090f, 0.022);

    // Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(
      initial.fov ?? 45,
      width / height,
      0.1,
      120
    );
    this.camera.position.set(...initial.cameraPos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 19;
    this.controls.maxPolarAngle = Math.PI * 0.78;
    this.controls.target.set(...initial.cameraTarget);
    this.controls.addEventListener('start', () => {
      this.cameraAutoFlight = false;
    });

    // Post-processing (Bloom + OutputPass) strictly on GPU hardware
    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.26,
        0.48,
        0.88
      );
      this.composer.addPass(bloomPass);
      this.composer.addPass(new OutputPass());
    }

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.glowTexture = createGlowSpriteTexture();
    this.floorTexture = createPolarLabFloorTexture(maxAniso);
    this.shadowTexture = createContactShadowTexture();

    // Procedural VideoPlane 16:9 CanvasTexture
    this.videoCanvas = document.createElement('canvas');
    this.videoCanvas.width = 640;
    this.videoCanvas.height = 360;
    this.videoCtx = this.videoCanvas.getContext('2d');
    this.videoTexture = new THREE.CanvasTexture(this.videoCanvas);
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;
    this.videoTexture.anisotropy = maxAniso;

    this.setupLighting();
    this.buildLabFloor();
    this.buildCosmicDust();
    this.buildNucleusAssembly();
    this.buildSegreDiagram();
    this.buildDecayVisuals();
    this.buildMassDefectVisuals();
    this.buildComparatorVisuals(maxAniso);
    this.buildVideoPlane();
    this.buildCoursePages3D(maxAniso);

    this.scene.add(this.nucleusAssembly);
    this.scene.add(this.segreGroup);
    this.scene.add(this.decayGroup);
    this.scene.add(this.massDefectGroup);
    this.scene.add(this.comparatorGroup);
    this.scene.add(this.coursePagesGroup);
    this.scene.add(this.particlesGroup);
    this.scene.add(this.videoGroup);

    this.applyState(initial, true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    this.tick();
  }

  private detectSoftwareGl(): boolean {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.callbacks.onContextLost?.(true);
  };

  private handleContextRestored = () => {
    this.callbacks.onContextLost?.(false);
  };

  private resolvePageIndexFromObject(obj: THREE.Object3D | null): number {
    let cur = obj;
    while (cur) {
      if (typeof cur.userData?.pageIndex === 'number') {
        return cur.userData.pageIndex;
      }
      cur = cur.parent;
    }
    return -1;
  }

  private updatePointerNdc(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerMove = (e: PointerEvent) => {
    this.updatePointerNdc(e);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.coursePageAssemblies, true);
    const hitIdx = hits.length > 0 ? this.resolvePageIndexFromObject(hits[0].object) : -1;
    if (hitIdx !== this.hoveredPageIndex) {
      this.hoveredPageIndex = hitIdx;
      this.renderer.domElement.style.cursor = hitIdx >= 0 ? 'pointer' : 'grab';
      this.updatePageBorderHighlights();
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent) => {
    const dragDist = Math.hypot(
      e.clientX - this.pointerDownPos.x,
      e.clientY - this.pointerDownPos.y
    );
    if (dragDist > 6) return;

    this.updatePointerNdc(e);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.coursePageAssemblies, true);
    if (hits.length === 0) return;

    const hitIdx = this.resolvePageIndexFromObject(hits[0].object);
    if (hitIdx < 0) return;

    if (hitIdx !== this.activeChapterIndex) {
      this.callbacks.onSelectChapter?.(hitIdx);
    } else if (!this.pageReaderMode) {
      this.callbacks.onFocusActivePage?.();
    } else {
      this.callbacks.onTogglePageFlip?.();
    }
  };

  private setupLighting() {
    const hemi = new THREE.HemisphereLight(0x3b82f6, 0x05060f, 0.88);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1de, 2.2);
    keyLight.position.set(6, 9, 6);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 30;
      keyLight.shadow.camera.left = -8;
      keyLight.shadow.camera.right = 8;
      keyLight.shadow.camera.top = 8;
      keyLight.shadow.camera.bottom = -8;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    const rimCyan = new THREE.DirectionalLight(0x00e5ff, 1.5);
    rimCyan.position.set(-7, 4, -6);
    this.scene.add(rimCyan);

    const rimWarm = new THREE.PointLight(0xff5a3c, 2.4, 14, 2);
    rimWarm.position.set(3.5, -1.2, 3.2);
    this.scene.add(rimWarm);

    this.flashLight = new THREE.PointLight(0x00e5ff, 0, 14, 2);
    this.flashLight.position.set(0, 0.2, 0);
    this.scene.add(this.flashLight);
  }

  private buildLabFloor() {
    const floorGeo = new THREE.CircleGeometry(22, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTexture,
      roughness: 0.78,
      metalness: 0.22,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.35;
    floor.receiveShadow = !this.isSoftwareGl;
    this.scene.add(floor);

    const shadowGeo = new THREE.PlaneGeometry(5.5, 5.5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.56,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -2.32;
    this.scene.add(contactShadow);

    // Subtle segmented calibration halo ring on floor beneath central stage
    const haloGeo = new THREE.RingGeometry(2.15, 2.22, 64, 1, 0, Math.PI * 1.45);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.floorHaloRing = new THREE.Mesh(haloGeo, haloMat);
    this.floorHaloRing.rotation.x = -Math.PI / 2;
    this.floorHaloRing.position.y = -2.31;
    this.scene.add(this.floorHaloRing);
  }

  private buildCosmicDust() {
    const positions = new Float32Array(MAX_AMBIENT_SPARKS * 3);
    const colors = new Float32Array(MAX_AMBIENT_SPARKS * 3);
    const cCyan = new THREE.Color(0x00e5ff);
    const cBlue = new THREE.Color(0x3b82f6);
    const cAmber = new THREE.Color(0xffb703);

    for (let i = 0; i < MAX_AMBIENT_SPARKS; i++) {
      const r = 3.8 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.35) * 10;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      const pick = Math.random();
      const c = pick > 0.35 ? cCyan : pick > 0.15 ? cBlue : cAmber;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      map: this.glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.sparkPoints = new THREE.Points(geo, mat);
    this.scene.add(this.sparkPoints);
  }

  private buildVideoPlane() {
    // 16:9 3D floating monitor plane beneath the active 3D course page
    this.videoGroup.position.set(3.15, -1.0, -0.35);
    this.videoGroup.rotation.y = -0.36;

    const planeGeo = new THREE.PlaneGeometry(2.4, 1.35);
    const planeMat = new THREE.MeshBasicMaterial({
      map: this.videoTexture,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });
    this.videoMesh = new THREE.Mesh(planeGeo, planeMat);
    this.videoGroup.add(this.videoMesh);

    // Glowing cyan border frame
    const borderGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.46, 1.41));
    this.videoBorderMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
    });
    const border = new THREE.LineSegments(borderGeo, this.videoBorderMat);
    border.position.z = 0.01;
    this.videoGroup.add(border);
  }

  private buildCoursePages3D(maxAniso: number) {
    const frameGeo = new THREE.BoxGeometry(3.56, 2.7, 0.055);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0b101d,
      metalness: 0.78,
      roughness: 0.28,
    });
    const faceGeo = new THREE.PlaneGeometry(3.42, 2.56);
    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.6, 2.74, 0.065));

    NUCLEAR_CHAPTERS.forEach((chapter, idx) => {
      const pageGroup = new THREE.Group();
      pageGroup.userData = { pageIndex: idx, baseY: 0, phase: idx * 0.7 };

      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = !this.isSoftwareGl;
      frameMesh.receiveShadow = !this.isSoftwareGl;
      frameMesh.userData = { pageIndex: idx };
      pageGroup.add(frameMesh);

      const borderMat = new THREE.LineBasicMaterial({
        color: chapter.fxColorHex,
        transparent: true,
        opacity: 0.36,
      });
      const borderLines = new THREE.LineSegments(borderGeo, borderMat);
      this.coursePageBorders.push(borderLines);
      pageGroup.add(borderLines);

      // Front Face: High-res structured Course Page
      const frontTex = createCoursePageTexture(
        {
          index: chapter.index,
          totalChapters: NUCLEAR_CHAPTERS.length - 1,
          title: chapter.title,
          subtitle: chapter.subtitle,
          sheetRefs: chapter.sheetRefs,
          keyDefinition: chapter.keyDefinition,
          fxColorHex: chapter.fxColorHex,
          formulaLines:
            chapter.holograms[0]?.formulaLines ??
            chapter.formulas.map((f) => f.title),
          captions: chapter.formulas.map((f) => f.caption),
          highlightText: chapter.highlights
            .map((h) => `${h.label} : ${h.detail}`)
            .join(' · '),
        },
        maxAniso
      );
      this.coursePageTextures.push(frontTex);

      const frontMat = new THREE.MeshBasicMaterial({
        map: frontTex,
      });
      const frontPlane = new THREE.Mesh(faceGeo, frontMat);
      frontPlane.position.z = 0.031;
      frontPlane.userData = { pageIndex: idx };
      pageGroup.add(frontPlane);

      // Back Face: Original Upright Handwritten Sheet
      const sheetInfo = CHAPTER_SHEET_IMAGE[chapter.id];
      const backTex = createHandwrittenSheetTexture(
        sheetInfo.path,
        chapter.sheetRefs,
        chapter.fxColorHex,
        maxAniso,
        sheetInfo.upright
      );
      this.coursePageTextures.push(backTex);

      const backMat = new THREE.MeshBasicMaterial({
        map: backTex,
      });
      const backPlane = new THREE.Mesh(faceGeo, backMat);
      backPlane.position.z = -0.031;
      backPlane.rotation.y = Math.PI;
      backPlane.userData = { pageIndex: idx };
      pageGroup.add(backPlane);

      this.coursePageAssemblies.push(pageGroup);
      this.coursePagesGroup.add(pageGroup);
    });
  }

  private updatePageBorderHighlights() {
    this.coursePageBorders.forEach((border, idx) => {
      const mat = border.material as THREE.LineBasicMaterial;
      if (idx === this.activeChapterIndex) {
        mat.opacity = 0.94;
      } else if (idx === this.hoveredPageIndex) {
        mat.opacity = 0.78;
      } else {
        mat.opacity = 0.32;
      }
    });
  }

  private buildNucleusAssembly() {
    this.nucleusAssembly.position.set(0, 0.25, 0);

    // Inner strong-force energy core glow
    const coreMat = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: 0xff5a3c,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreGlowSprite = new THREE.Sprite(coreMat);
    this.coreGlowSprite.scale.set(2.9, 2.9, 1);
    this.nucleusAssembly.add(this.coreGlowSprite);

    const nucleonGeo = new THREE.SphereGeometry(0.19, 20, 16);

    // Protons: warm red-orange (#ff5a3c) with clearcoat
    const protonMat = new THREE.MeshPhysicalMaterial({
      color: 0xff5a3c,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.65,
      roughness: 0.16,
      metalness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    });

    // Neutrons: icy electric cyan-blue (#9fd8ff)
    const neutronMat = new THREE.MeshPhysicalMaterial({
      color: 0x9fd8ff,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.3,
      roughness: 0.48,
      metalness: 0.35,
    });

    this.protonMesh = new THREE.InstancedMesh(nucleonGeo, protonMat, MAX_NUCLEONS);
    this.neutronMesh = new THREE.InstancedMesh(nucleonGeo, neutronMat, MAX_NUCLEONS);
    this.protonMesh.frustumCulled = false;
    this.neutronMesh.frustumCulled = false;
    this.protonMesh.castShadow = !this.isSoftwareGl;
    this.neutronMesh.castShadow = !this.isSoftwareGl;

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < MAX_NUCLEONS; i++) {
      const layerR = 0.22 * Math.cbrt(i + 0.6);
      const y = 1 - ((i % 47) / 46) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      this.protonSeeds.push(
        new THREE.Vector3(
          Math.cos(theta) * radiusAtY * layerR,
          y * layerR,
          Math.sin(theta) * radiusAtY * layerR
        )
      );
      const thetaN = goldenAngle * (i + 0.5) + 1.1;
      this.neutronSeeds.push(
        new THREE.Vector3(
          Math.cos(thetaN) * radiusAtY * layerR,
          -y * layerR,
          Math.sin(thetaN) * radiusAtY * layerR
        )
      );
    }

    this.nucleusAssembly.add(this.protonMesh);
    this.nucleusAssembly.add(this.neutronMesh);

    const shellGeo = new THREE.IcosahedronGeometry(1.55, 2);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x00e5ff,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      wireframe: true,
    });
    this.containmentShell = new THREE.Mesh(shellGeo, shellMat);
    this.nucleusAssembly.add(this.containmentShell);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.52,
    });

    const ringConfigs = [
      { radius: 2.05, tiltX: Math.PI * 0.36, tiltZ: 0.2 },
      { radius: 2.55, tiltX: -Math.PI * 0.32, tiltZ: 0.65 },
      { radius: 3.05, tiltX: Math.PI * 0.44, tiltZ: -0.55 },
    ];

    ringConfigs.forEach((cfg) => {
      const torusGeo = new THREE.TorusGeometry(cfg.radius, 0.016, 12, 96);
      const ring = new THREE.Mesh(torusGeo, ringMat);
      ring.rotation.set(cfg.tiltX, 0, cfg.tiltZ);
      this.orbitalRings.push(ring);
      this.nucleusAssembly.add(ring);
    });

    const eGeo = new THREE.SphereGeometry(0.075, 14, 12);
    const eMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.8,
      roughness: 0.15,
      metalness: 0.2,
    });
    const spriteMat = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < MAX_ELECTRONS; i++) {
      const eMesh = new THREE.Mesh(eGeo, eMat);
      const glow = new THREE.Sprite(spriteMat);
      glow.scale.set(0.45, 0.45, 1);
      eMesh.add(glow);
      this.electronMeshes.push(eMesh);
      this.nucleusAssembly.add(eMesh);
    }
  }

  private buildSegreDiagram() {
    this.segreGroup.position.set(0, -0.4, 0);
    this.segreGroup.visible = false;

    const scaleZ = 0.062;
    const scaleN = 0.044;
    const originX = -3.1;
    const originY = -1.1;

    const plateGeo = new THREE.BoxGeometry(7.2, 0.1, 1.4);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x0b1020,
      metalness: 0.75,
      roughness: 0.35,
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, originY - 0.12, 0);
    this.segreGroup.add(plate);

    const axisMat = new THREE.MeshStandardMaterial({
      color: 0x7a8aa8,
      metalness: 0.85,
      roughness: 0.22,
    });
    const zAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 6.6, 12), axisMat);
    zAxis.rotation.z = -Math.PI / 2;
    zAxis.position.set(0.1, originY, 0);
    this.segreGroup.add(zAxis);

    const nAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 6.8, 12), axisMat);
    nAxis.position.set(originX, originY + 3.4, 0);
    this.segreGroup.add(nAxis);

    const bisectorCurve = new THREE.LineCurve3(
      new THREE.Vector3(originX, originY, 0),
      new THREE.Vector3(originX + 95 * scaleZ, originY + 95 * scaleN, 0)
    );
    const bisectorGeo = new THREE.TubeGeometry(bisectorCurve, 8, 0.018, 8, false);
    const bisectorMat = new THREE.MeshBasicMaterial({
      color: 0x7a8aa8,
      transparent: true,
      opacity: 0.65,
    });
    this.segreGroup.add(new THREE.Mesh(bisectorGeo, bisectorMat));

    const nuclides: { z: number; n: number; kind: 'stable' | 'beta-minus' | 'beta-plus' | 'alpha' }[] = [];
    for (let z = 1; z <= 96; z += 2) {
      const nStable = z <= 20 ? z : Math.round(z + 0.0056 * z * z);
      for (let dn = -10; dn <= 10; dn += 2) {
        const n = nStable + dn;
        if (n < 0 || n > 154) continue;
        let kind: 'stable' | 'beta-minus' | 'beta-plus' | 'alpha' = 'stable';
        if (z > 82 || z + n > 200) kind = 'alpha';
        else if (dn > 2) kind = 'beta-minus';
        else if (dn < -2) kind = 'beta-plus';
        nuclides.push({ z, n, kind });
      }
    }

    const cellGeo = new THREE.BoxGeometry(0.11, 0.11, 0.16);
    const cellMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.4,
    });
    const cloudMesh = new THREE.InstancedMesh(cellGeo, cellMat, nuclides.length);
    const colorMap = {
      stable: new THREE.Color(0x10b981),
      'beta-minus': new THREE.Color(0x00e5ff),
      'beta-plus': new THREE.Color(0xff4dff),
      alpha: new THREE.Color(0xffb703),
    };

    nuclides.forEach((item, idx) => {
      const x = originX + item.z * scaleZ;
      const y = originY + item.n * scaleN;
      const zDepth = item.kind === 'stable' ? 0.12 : 0;
      _v1.set(x, y, zDepth);
      _q1.identity();
      _s1.set(1, 1, item.kind === 'stable' ? 1.5 : 0.85);
      _m1.compose(_v1, _q1, _s1);
      cloudMesh.setMatrixAt(idx, _m1);
      cloudMesh.setColorAt(idx, colorMap[item.kind]);
    });
    cloudMesh.instanceMatrix.needsUpdate = true;
    if (cloudMesh.instanceColor) cloudMesh.instanceColor.needsUpdate = true;
    cloudMesh.computeBoundingSphere();
    this.segreGroup.add(cloudMesh);

    const beamGeo = new THREE.CylinderGeometry(0.022, 0.022, 6.4, 12);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.65,
    });
    this.segreIsotopeBeam = new THREE.Mesh(beamGeo, beamMat);
    this.segreGroup.add(this.segreIsotopeBeam);

    const markerGeo = new THREE.OctahedronGeometry(0.18, 0);
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.8,
      roughness: 0.1,
    });
    this.segreSelectedMarker = new THREE.Mesh(markerGeo, markerMat);
    this.segreGroup.add(this.segreSelectedMarker);
  }

  private buildDecayVisuals() {
    this.decayGroup.position.set(0, -0.35, 0);
    this.decayGroup.visible = false;

    const originX = -3.4;
    const originY = -1.1;
    const widthX = 5.2;
    const heightY = 3.2;

    const axisMat = new THREE.MeshStandardMaterial({
      color: 0x7a8aa8,
      metalness: 0.8,
      roughness: 0.25,
    });
    const tAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, widthX + 0.4, 12), axisMat);
    tAxis.rotation.z = -Math.PI / 2;
    tAxis.position.set(originX + widthX / 2, originY, 0);
    this.decayGroup.add(tAxis);

    const nAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, heightY + 0.4, 12), axisMat);
    nAxis.position.set(originX, originY + heightY / 2, 0);
    this.decayGroup.add(nAxis);

    const maxHalfLives = 4.0;
    const tauHalfLives = 1 / Math.LN2;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const tNorm = u * maxHalfLives;
      const yNorm = Math.exp(-tNorm * Math.LN2);
      pts.push(new THREE.Vector3(originX + u * widthX, originY + yNorm * heightY, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.045, 12, false);
    this.decayTubeMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.3,
    });
    this.decayPrimaryTube = new THREE.Mesh(tubeGeo, this.decayTubeMat);
    this.decayGroup.add(this.decayPrimaryTube);

    // 2. Daughter / Disintegrated curve N_D(t) = N0(1 - e^-λt)
    const daughterPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const tNorm = u * maxHalfLives;
      const yNorm = 1 - Math.exp(-tNorm * Math.LN2);
      daughterPts.push(new THREE.Vector3(originX + u * widthX, originY + yNorm * heightY, 0.02));
    }
    const daughterTubeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(daughterPts),
      64,
      0.04,
      12,
      false
    );
    const daughterMat = new THREE.MeshStandardMaterial({
      color: 0xf96449,
      emissive: 0xf96449,
      emissiveIntensity: 0.78,
      roughness: 0.22,
      metalness: 0.25,
    });
    this.decayDaughterTube = new THREE.Mesh(daughterTubeGeo, daughterMat);
    this.decayGroup.add(this.decayDaughterTube);

    const daughterCursorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf96449,
      emissiveIntensity: 1.7,
    });
    this.decayDaughterCursorMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 16, 12),
      daughterCursorMat
    );
    this.decayGroup.add(this.decayDaughterCursorMesh);

    // 3. Log-linear curve ln(N0 / N(t)) = λt
    const logLine = new THREE.LineCurve3(
      new THREE.Vector3(originX, originY, 0.02),
      new THREE.Vector3(originX + widthX, originY + heightY, 0.02)
    );
    const logMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    this.decayLogLinearTube = new THREE.Mesh(
      new THREE.TubeGeometry(logLine, 8, 0.045, 12, false),
      logMat
    );
    this.decayLogLinearTube.visible = false;
    this.decayGroup.add(this.decayLogLinearTube);

    // Slope triangle on log-linear curve (Δt = t1/2, Δy = ln2)
    const slopeMat = new THREE.MeshStandardMaterial({
      color: 0xf5b041,
      emissive: 0xf5b041,
      emissiveIntensity: 0.95,
    });
    const x1 = originX + widthX * 0.25;
    const x2 = originX + widthX * 0.5;
    const y1 = originY + heightY * 0.25;
    const y2 = originY + heightY * 0.5;
    const runGeo = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(x1, y1, 0.04), new THREE.Vector3(x2, y1, 0.04)),
      4,
      0.024,
      8,
      false
    );
    const riseGeo = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(x2, y1, 0.04), new THREE.Vector3(x2, y2, 0.04)),
      4,
      0.024,
      8,
      false
    );
    this.logSlopeGroup.add(new THREE.Mesh(runGeo, slopeMat));
    this.logSlopeGroup.add(new THREE.Mesh(riseGeo, slopeMat));
    this.logSlopeGroup.visible = false;
    this.decayGroup.add(this.logSlopeGroup);

    // 3b. Fiche 11: ln N(t) = -λt + ln N0 (descending line)
    const lnNtLine = new THREE.LineCurve3(
      new THREE.Vector3(originX, originY + heightY, 0.02),
      new THREE.Vector3(originX + widthX, originY, 0.02)
    );
    const lnNtMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    this.decayLnNtTube = new THREE.Mesh(
      new THREE.TubeGeometry(lnNtLine, 8, 0.045, 12, false),
      lnNtMat
    );
    this.decayLnNtTube.visible = false;
    this.decayGroup.add(this.decayLnNtTube);

    // 3c. Fiche 11: ln(N(t)/N0) = -λt (top y=0 horizontal reference + descending violet line)
    const zeroRefBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, widthX + 0.3, 10),
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    zeroRefBar.rotation.z = -Math.PI / 2;
    zeroRefBar.position.set(originX + widthX / 2, originY + heightY, 0.01);
    this.decayLnNegGroup.add(zeroRefBar);

    const lnNegLine = new THREE.LineCurve3(
      new THREE.Vector3(originX, originY + heightY, 0.02),
      new THREE.Vector3(originX + widthX, originY, 0.02)
    );
    const lnNegMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0xc084fc,
      emissiveIntensity: 0.92,
      roughness: 0.2,
    });
    this.decayLnNegGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(lnNegLine, 8, 0.045, 12, false), lnNegMat)
    );
    this.decayLnNegGroup.visible = false;
    this.decayGroup.add(this.decayLnNegGroup);

    // Slope triangle on descending Fiche 11 curves (Δt = t1/2, Δln N = -ln2)
    const dnY1 = originY + heightY * 0.75;
    const dnY2 = originY + heightY * 0.5;
    const dnRunGeo = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(x1, dnY1, 0.04), new THREE.Vector3(x2, dnY1, 0.04)),
      4,
      0.024,
      8,
      false
    );
    const dnDropGeo = new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(x2, dnY1, 0.04), new THREE.Vector3(x2, dnY2, 0.04)),
      4,
      0.024,
      8,
      false
    );
    this.lnDownSlopeGroup.add(new THREE.Mesh(dnRunGeo, slopeMat));
    this.lnDownSlopeGroup.add(new THREE.Mesh(dnDropGeo, slopeMat));
    this.lnDownSlopeGroup.visible = false;
    this.decayGroup.add(this.lnDownSlopeGroup);

    // 4. Aston Binding-Energy Curve (El/A vs A)
    const astonPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 84; i++) {
      const u = i / 84;
      const massA = 2 + u * 236;
      const elPerA = evaluateAstonElPerA(massA);
      const yNorm = Math.min(1, elPerA / 9.5);
      astonPts.push(new THREE.Vector3(originX + u * widthX, originY + yNorm * heightY, 0.02));
    }
    const astonMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xffb703,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.3,
    });
    this.decayAstonGroup.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(astonPts), 84, 0.048, 12, false),
        astonMat
      )
    );
    // Aston key landmark beacons (4He, 56Fe stability peak, 238U)
    [
      { A: 4, hex: 0xff4dff },
      { A: 56, hex: 0x10b981 },
      { A: 238, hex: 0xff5a3c },
    ].forEach((lm) => {
      const u = (lm.A - 2) / 236;
      const yNorm = Math.min(1, evaluateAstonElPerA(lm.A) / 9.5);
      const pin = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11, 0),
        new THREE.MeshStandardMaterial({
          color: lm.hex,
          emissive: lm.hex,
          emissiveIntensity: 1.4,
        })
      );
      pin.position.set(originX + u * widthX, originY + yNorm * heightY, 0.08);
      this.decayAstonGroup.add(pin);
    });
    this.decayAstonGroup.visible = false;
    this.decayGroup.add(this.decayAstonGroup);

    const tauX = originX + (tauHalfLives / maxHalfLives) * widthX;
    const tanCurve = new THREE.LineCurve3(
      new THREE.Vector3(originX, originY + heightY, 0.04),
      new THREE.Vector3(tauX, originY, 0.04)
    );
    const tanGeo = new THREE.TubeGeometry(tanCurve, 8, 0.026, 8, false);
    const tanMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xffb703,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });
    this.decayTangentGroup.add(new THREE.Mesh(tanGeo, tanMat));

    const markerGeo = new THREE.SphereGeometry(0.085, 16, 12);
    const tauMarker = new THREE.Mesh(markerGeo, tanMat);
    tauMarker.position.set(tauX, originY, 0.04);
    this.decayTangentGroup.add(tauMarker);

    const nTauMarker = new THREE.Mesh(markerGeo, tanMat);
    nTauMarker.position.set(tauX, originY + Math.exp(-1) * heightY, 0.04);
    this.decayTangentGroup.add(nTauMarker);
    this.decayGroup.add(this.decayTangentGroup);

    const halfX = originX + (1.0 / maxHalfLives) * widthX;
    const halfY = originY + 0.5 * heightY;
    const halfMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xffb703,
      emissiveIntensity: 1.25,
    });
    this.halfMarkerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), halfMat);
    this.halfMarkerMesh.position.set(halfX, halfY, 0.05);
    this.decayGroup.add(this.halfMarkerMesh);

    this.decayCursorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.8,
    });
    this.decayCursorMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14), this.decayCursorMat);
    this.decayGroup.add(this.decayCursorMesh);

    const chamberX = 3.1;
    const chamberPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.3, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x0b1020, metalness: 0.85, roughness: 0.25 })
    );
    chamberPedestal.position.set(chamberX, originY - 0.12, 0.2);
    this.decayGroup.add(chamberPedestal);

    const glassWall = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 2.2, 32, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0x00e5ff,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    glassWall.position.set(chamberX, originY + 1.0, 0.2);
    glassWall.renderOrder = 3;
    this.decayGroup.add(glassWall);

    const sampleGeo = new THREE.SphereGeometry(0.11, 14, 12);
    const sampleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.3,
    });
    this.sampleAtomsMesh = new THREE.InstancedMesh(sampleGeo, sampleMat, MAX_SAMPLE_ATOMS);
    this.sampleAtomsMesh.frustumCulled = false;

    for (let ix = 0; ix < 4; ix++) {
      for (let iy = 0; iy < 4; iy++) {
        for (let iz = 0; iz < 4; iz++) {
          this.sampleAtomPositions.push(
            new THREE.Vector3(
              chamberX + (ix - 1.5) * 0.36,
              originY + 0.32 + iy * 0.42,
              0.2 + (iz - 1.5) * 0.36
            )
          );
        }
      }
    }
    this.decayGroup.add(this.sampleAtomsMesh);
  }

  private buildMassDefectVisuals() {
    this.massDefectGroup.position.set(-0.35, -0.35, 0);
    this.massDefectGroup.visible = false;

    const basePlinthGeo = new THREE.CylinderGeometry(3.35, 3.6, 0.22, 48);
    const obsidianMetal = new THREE.MeshStandardMaterial({
      color: 0x0b1020,
      metalness: 0.85,
      roughness: 0.28,
    });
    const basePlinth = new THREE.Mesh(basePlinthGeo, obsidianMetal);
    basePlinth.position.set(0, -1.85, 0);
    basePlinth.receiveShadow = !this.isSoftwareGl;
    this.massDefectGroup.add(basePlinth);

    // Central turned fulcrum pillar (LatheGeometry silhouette)
    const lathePts = [
      new THREE.Vector2(0.45, -1.74),
      new THREE.Vector2(0.4, -1.55),
      new THREE.Vector2(0.18, -1.2),
      new THREE.Vector2(0.14, 0.05),
      new THREE.Vector2(0.28, 0.22),
      new THREE.Vector2(0.0, 0.28),
    ];
    const titaniumMat = new THREE.MeshPhysicalMaterial({
      color: 0x334155,
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.6,
    });
    const fulcrumPillar = new THREE.Mesh(new THREE.LatheGeometry(lathePts, 32), titaniumMat);
    fulcrumPillar.castShadow = !this.isSoftwareGl;
    this.massDefectGroup.add(fulcrumPillar);

    // Calibration ring on fulcrum hub
    const hubRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.022, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0xffb703,
        emissive: 0xffb703,
        emissiveIntensity: 0.9,
      })
    );
    hubRing.position.set(0, 0.2, 0.14);
    this.massDefectGroup.add(hubRing);

    // Articulated Balance Beam pivoted at (0, 0.2, 0)
    this.mdBeamGroup.position.set(0, 0.2, 0);
    const beamBar = new THREE.Mesh(
      new THREE.BoxGeometry(5.1, 0.12, 0.2),
      new THREE.MeshPhysicalMaterial({
        color: 0x64748b,
        metalness: 0.9,
        roughness: 0.2,
        clearcoat: 0.8,
      })
    );
    beamBar.castShadow = !this.isSoftwareGl;
    this.mdBeamGroup.add(beamBar);

    const panRingMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      metalness: 0.8,
      roughness: 0.22,
    });
    const amberPanMat = new THREE.MeshStandardMaterial({
      color: 0xffb703,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.22,
    });
    const sapphirePlateMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.84,
      clearcoat: 1.0,
    });

    // Left Pan Assembly: Separated Nucleons (Z*mp + N*mn)
    this.mdLeftPanGroup.position.set(-2.25, -0.35, 0);
    const leftStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 12), titaniumMat);
    leftStem.position.set(0, 0.21, 0);
    const leftDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.04, 0.1, 36), sapphirePlateMat);
    const leftRim = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.03, 12, 48), panRingMat);
    leftRim.rotation.x = Math.PI / 2;
    this.mdLeftPanGroup.add(leftStem, leftDisc, leftRim);
    this.mdBeamGroup.add(this.mdLeftPanGroup);

    // Right Pan Assembly: Bound Nucleus m(X)
    this.mdRightPanGroup.position.set(2.25, -0.35, 0);
    const rightStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 12), titaniumMat);
    rightStem.position.set(0, 0.21, 0);
    const rightDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.04, 0.1, 36), sapphirePlateMat);
    const rightRim = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.03, 12, 48), amberPanMat);
    rightRim.rotation.x = Math.PI / 2;
    this.mdRightPanGroup.add(rightStem, rightDisc, rightRim);
    this.mdBeamGroup.add(this.mdRightPanGroup);

    // Nucleon InstancedMeshes on both pans
    const nucleonGeo = new THREE.SphereGeometry(0.13, 16, 12);
    const pMat = new THREE.MeshPhysicalMaterial({
      color: 0xff5a3c,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.65,
      roughness: 0.18,
      clearcoat: 0.85,
    });
    const nMat = new THREE.MeshPhysicalMaterial({
      color: 0x9fd8ff,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35,
      roughness: 0.42,
      metalness: 0.3,
    });

    this.mdFreeProtonsMesh = new THREE.InstancedMesh(nucleonGeo, pMat, MAX_NUCLEONS);
    this.mdFreeNeutronsMesh = new THREE.InstancedMesh(nucleonGeo, nMat, MAX_NUCLEONS);
    this.mdBoundProtonsMesh = new THREE.InstancedMesh(nucleonGeo, pMat, MAX_NUCLEONS);
    this.mdBoundNeutronsMesh = new THREE.InstancedMesh(nucleonGeo, nMat, MAX_NUCLEONS);
    [
      this.mdFreeProtonsMesh,
      this.mdFreeNeutronsMesh,
      this.mdBoundProtonsMesh,
      this.mdBoundNeutronsMesh,
    ].forEach((im) => {
      im.frustumCulled = false;
      im.castShadow = !this.isSoftwareGl;
    });

    this.mdLeftPanGroup.add(this.mdFreeProtonsMesh, this.mdFreeNeutronsMesh);
    this.mdRightPanGroup.add(this.mdBoundProtonsMesh, this.mdBoundNeutronsMesh);
    this.massDefectGroup.add(this.mdBeamGroup);

    // Central E = Δm·c² Photon Energy Release Conduit
    const conduitGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 2.35, 24, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xffb703,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    conduitGlass.position.set(0, 1.55, 0);
    conduitGlass.renderOrder = 3;
    this.massDefectGroup.add(conduitGlass);

    this.mdEnergyColumnMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 2.2, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffb703,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.55,
        transparent: true,
        opacity: 0.82,
      })
    );
    this.mdEnergyColumnMesh.position.set(0, 0.45, 0);
    this.massDefectGroup.add(this.mdEnergyColumnMesh);

    const energyRingGeo = new THREE.TorusGeometry(0.42, 0.022, 10, 40);
    const energyRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.72,
    });
    for (let i = 0; i < 4; i++) {
      const rMesh = new THREE.Mesh(energyRingGeo, energyRingMat.clone());
      rMesh.rotation.x = Math.PI / 2;
      rMesh.position.set(0, 0.65 + i * 0.55, 0);
      this.mdEnergyRings.push(rMesh);
      this.massDefectGroup.add(rMesh);
    }

    this.mdPulseRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.04, 12, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
      })
    );
    this.mdPulseRingMesh.rotation.x = Math.PI / 2;
    this.mdPulseRingMesh.position.set(0, 1.5, 0);
    this.massDefectGroup.add(this.mdPulseRingMesh);
  }

  private buildComparatorVisuals(maxAniso: number) {
    // Positioned right-of-center so the left 410px HUD overlay never blocks either isotope
    this.comparatorGroup.position.set(1.05, -0.35, 0);
    this.comparatorGroup.visible = false;

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x0b1020,
      metalness: 0.85,
      roughness: 0.28,
    });
    const titaniumMat = new THREE.MeshPhysicalMaterial({
      color: 0x475569,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 0.65,
    });
    const sapphireMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.14,
      metalness: 0.22,
      transparent: true,
      opacity: 0.88,
      clearcoat: 0.9,
    });

    // Stepped Comparator Bridge Base connecting Left (-2.05) and Right (+2.05) stations
    const bridgeBase = new THREE.Mesh(
      new THREE.BoxGeometry(6.3, 0.2, 2.55),
      obsidianMat
    );
    bridgeBase.position.set(0, -1.85, 0.05);
    bridgeBase.receiveShadow = !this.isSoftwareGl;
    this.comparatorGroup.add(bridgeBase);

    const railBeam = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.09, 0.24),
      titaniumMat
    );
    railBeam.position.set(0, -1.7, -0.1);
    this.comparatorGroup.add(railBeam);

    // Central differential fulcrum & tilted comparator beam
    const centerPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.18, 1.15, 24),
      titaniumMat
    );
    centerPillar.position.set(0, -1.2, -0.75);
    this.comparatorGroup.add(centerPillar);

    this.compDiffBeam = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.075, 0.14),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.88,
        roughness: 0.2,
      })
    );
    this.compDiffBeam.position.set(0, -0.62, -0.75);
    this.comparatorGroup.add(this.compDiffBeam);

    // Build Left (Cyan) and Right (Amber) Pedestal Stations
    const buildStation = (
      xPos: number,
      accentHex: number,
      nucleusGroup: THREE.Group
    ) => {
      const station = new THREE.Group();
      station.position.set(xPos, 0, 0);

      const lathePts = [
        new THREE.Vector2(0.88, -1.75),
        new THREE.Vector2(0.76, -1.58),
        new THREE.Vector2(0.32, -1.32),
        new THREE.Vector2(0.28, -0.72),
        new THREE.Vector2(0.95, -0.58),
        new THREE.Vector2(0.0, -0.56),
      ];
      const pedestal = new THREE.Mesh(
        new THREE.LatheGeometry(lathePts, 36),
        titaniumMat
      );
      pedestal.castShadow = !this.isSoftwareGl;
      station.add(pedestal);

      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(1.04, 0.96, 0.08, 36),
        sapphireMat
      );
      disc.position.y = -0.52;
      station.add(disc);

      const rimRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.06, 0.032, 12, 48),
        new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: accentHex,
          emissiveIntensity: 0.85,
          metalness: 0.6,
          roughness: 0.2,
        })
      );
      rimRing.rotation.x = Math.PI / 2;
      rimRing.position.y = -0.5;
      station.add(rimRing);

      // Cohesion (El/A) vertical halo ring around the hovering nucleus
      const cohesionRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.22, 0.022, 12, 64),
        new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: accentHex,
          emissiveIntensity: 0.75,
          transparent: true,
          opacity: 0.65,
        })
      );
      cohesionRing.position.set(0, 0.78, 0);
      cohesionRing.rotation.x = Math.PI * 0.42;
      station.add(cohesionRing);

      // Background Energy Column Tube (Binding Energy El = Δm·c²)
      const tubeShell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 2.25, 20, 1, true),
        new THREE.MeshPhysicalMaterial({
          color: accentHex,
          roughness: 0.12,
          metalness: 0.1,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      tubeShell.position.set(0, 0.55, -1.18);
      tubeShell.renderOrder = 3;
      station.add(tubeShell);

      const energyBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.12, 2.1, 18),
        new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: accentHex,
          emissiveIntensity: 1.45,
          transparent: true,
          opacity: 0.88,
        })
      );
      energyBar.position.set(0, -0.5, -1.18);
      station.add(energyBar);

      nucleusGroup.position.set(0, 0.78, 0);
      station.add(nucleusGroup);

      this.comparatorGroup.add(station);
      return { cohesionRing, energyBar };
    };

    const leftBuilt = buildStation(-2.05, 0x38bdf8, this.compLeftNucleusGroup);
    this.compLeftCohesionRing = leftBuilt.cohesionRing;
    this.compLeftEnergyBar = leftBuilt.energyBar;

    const rightBuilt = buildStation(2.05, 0xffb703, this.compRightNucleusGroup);
    this.compRightCohesionRing = rightBuilt.cohesionRing;
    this.compRightEnergyBar = rightBuilt.energyBar;

    // Nucleon InstancedMeshes for Side-by-Side Nuclei
    const nucleonGeo = new THREE.SphereGeometry(0.145, 16, 12);
    const pMat = new THREE.MeshPhysicalMaterial({
      color: 0xff5a3c,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.65,
      roughness: 0.18,
      clearcoat: 0.88,
    });
    const nMat = new THREE.MeshPhysicalMaterial({
      color: 0x9fd8ff,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35,
      roughness: 0.42,
      metalness: 0.3,
    });

    this.compLeftProtonsMesh = new THREE.InstancedMesh(nucleonGeo, pMat, MAX_NUCLEONS);
    this.compLeftNeutronsMesh = new THREE.InstancedMesh(nucleonGeo, nMat, MAX_NUCLEONS);
    this.compRightProtonsMesh = new THREE.InstancedMesh(nucleonGeo, pMat, MAX_NUCLEONS);
    this.compRightNeutronsMesh = new THREE.InstancedMesh(nucleonGeo, nMat, MAX_NUCLEONS);
    [
      this.compLeftProtonsMesh,
      this.compLeftNeutronsMesh,
      this.compRightProtonsMesh,
      this.compRightNeutronsMesh,
    ].forEach((im) => {
      im.frustumCulled = false;
      im.castShadow = !this.isSoftwareGl;
    });

    this.compLeftNucleusGroup.add(this.compLeftProtonsMesh, this.compLeftNeutronsMesh);
    this.compRightNucleusGroup.add(this.compRightProtonsMesh, this.compRightNeutronsMesh);

    // Two Holographic 3D Spec Plates below each pedestal
    const createSpecPlate = (xPos: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.65, 1.325),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.96,
        })
      );
      mesh.position.set(xPos, -1.16, 1.32);
      mesh.rotation.x = -0.24;
      this.comparatorGroup.add(mesh);
      return { canvas, ctx, tex };
    };

    const lp = createSpecPlate(-2.05);
    this.compLeftPlateCanvas = lp.canvas;
    this.compLeftPlateCtx = lp.ctx;
    this.compLeftPlateTex = lp.tex;

    const rp = createSpecPlate(2.05);
    this.compRightPlateCanvas = rp.canvas;
    this.compRightPlateCtx = rp.ctx;
    this.compRightPlateTex = rp.tex;
  }

  public applyState(state: SceneStateUpdate, immediate = false) {
    const chapterChanged = this.activeChapter !== state.chapterId;
    const readerChanged = this.pageReaderMode !== state.pageReaderMode;
    const flipChanged = this.pageFlipped !== state.pageFlipped;

    this.activeChapter = state.chapterId;
    this.activeChapterIndex = state.chapterIndex;
    this.activeVisualKind = state.visualKind;
    this.reducedMotion = state.reducedMotion;
    this.pageReaderMode = state.pageReaderMode;
    this.pageFlipped = state.pageFlipped;
    this.lastCamPosPreset = state.cameraPos;
    this.lastCamTargetPreset = state.cameraTarget;

    this.activeProtons = Math.min(state.isotope.Z, MAX_NUCLEONS);
    this.activeNeutrons = Math.min(state.isotope.N, MAX_NUCLEONS);
    this.activeElectrons = Math.min(Math.max(state.electronCount, 0), MAX_ELECTRONS);
    this.targetExplode = state.explodeAmount;
    this.activeCurveKind = state.curveKind;

    // Mass Defect live parameters
    this.mdZ = Math.min(state.massDefect.Z, MAX_NUCLEONS);
    this.mdN = Math.min(state.massDefect.N, MAX_NUCLEONS);
    this.mdDeltaMassU = state.massDefect.deltaMassU;
    this.mdEnergyMeV = state.massDefect.bindingEnergyMeV;
    this.mdTargetBindingRatio = state.massDefect.bindingRatio;
    const clampedDefectNorm = THREE.MathUtils.clamp(
      this.mdDeltaMassU / 1.8,
      0.06,
      1.0
    );
    this.mdTargetBeamTilt =
      (0.06 + clampedDefectNorm * 0.16) * this.mdTargetBindingRatio;

    if (
      !immediate &&
      state.massDefect.pulseCount !== this.mdLastPulseCount
    ) {
      this.mdLastPulseCount = state.massDefect.pulseCount;
      this.mdPulseAge = 0;
      this.flashLight.color.setHex(0xffb703);
      this.flashIntensity = 6.5;
    } else if (immediate) {
      this.mdLastPulseCount = state.massDefect.pulseCount;
      this.mdBeamTilt = this.mdTargetBeamTilt;
      this.mdBindingRatio = this.mdTargetBindingRatio;
    }

    // Dual-Isotope Comparator state sync
    const compChanged = this.comparatorMode !== state.comparator.active;
    this.comparatorMode = state.comparator.active;
    this.compLeftZ = Math.min(state.comparator.left.Z, MAX_NUCLEONS);
    this.compLeftN = Math.min(state.comparator.left.N, MAX_NUCLEONS);
    this.compLeftElMeV = state.comparator.left.bindingEnergyMeV;
    this.compLeftElPerA = state.comparator.left.energyPerNucleonMeV;

    this.compRightZ = Math.min(state.comparator.right.Z, MAX_NUCLEONS);
    this.compRightN = Math.min(state.comparator.right.N, MAX_NUCLEONS);
    this.compRightElMeV = state.comparator.right.bindingEnergyMeV;
    this.compRightElPerA = state.comparator.right.energyPerNucleonMeV;

    this.compTargetExplode = state.comparator.explode;
    const dmDiff =
      state.comparator.right.deltaMassU - state.comparator.left.deltaMassU;
    const dmMax = Math.max(
      state.comparator.left.deltaMassU,
      state.comparator.right.deltaMassU,
      0.01
    );
    this.compTargetBeamTilt = THREE.MathUtils.clamp(
      -(dmDiff / dmMax) * 0.22,
      -0.24,
      0.24
    );

    const leftKey = `${state.comparator.left.id}-${state.comparator.left.A}-${state.comparator.left.Z}`;
    if (leftKey !== this.compLastLeftKey && this.compLeftPlateCtx) {
      this.compLastLeftKey = leftKey;
      drawComparatorPlateCanvas(
        this.compLeftPlateCtx,
        this.compLeftPlateCanvas.width,
        this.compLeftPlateCanvas.height,
        {
          slotLabel: 'ISOTOPE A',
          symbol: state.comparator.left.symbol,
          name: state.comparator.left.name,
          A: state.comparator.left.A,
          Z: state.comparator.left.Z,
          N: state.comparator.left.N,
          stable: state.comparator.left.stable,
          deltaMassU: state.comparator.left.deltaMassU,
          bindingEnergyMeV: state.comparator.left.bindingEnergyMeV,
          energyPerNucleonMeV: state.comparator.left.energyPerNucleonMeV,
          accentHex: '#38bdf8',
        }
      );
      this.compLeftPlateTex.needsUpdate = true;
    }

    const rightKey = `${state.comparator.right.id}-${state.comparator.right.A}-${state.comparator.right.Z}`;
    if (rightKey !== this.compLastRightKey && this.compRightPlateCtx) {
      this.compLastRightKey = rightKey;
      drawComparatorPlateCanvas(
        this.compRightPlateCtx,
        this.compRightPlateCanvas.width,
        this.compRightPlateCanvas.height,
        {
          slotLabel: 'ISOTOPE B',
          symbol: state.comparator.right.symbol,
          name: state.comparator.right.name,
          A: state.comparator.right.A,
          Z: state.comparator.right.Z,
          N: state.comparator.right.N,
          stable: state.comparator.right.stable,
          deltaMassU: state.comparator.right.deltaMassU,
          bindingEnergyMeV: state.comparator.right.bindingEnergyMeV,
          energyPerNucleonMeV: state.comparator.right.energyPerNucleonMeV,
          accentHex: '#ffb703',
        }
      );
      this.compRightPlateTex.needsUpdate = true;
    }

    this.videoTitle = state.videoTitle;
    this.videoCaption = state.videoCaption;
    this.videoAccentHex = state.fxColorHex;
    this.videoPlaying = state.videoPlaying;
    this.videoBorderMat.color.set(state.fxColorHex);
    (this.coreGlowSprite.material as THREE.SpriteMaterial).color.set(state.fxColorHex);

    // Toggle which 3D curve meshes are active
    const isExpMode =
      this.activeCurveKind === 'decay-nd' || this.activeCurveKind === 'activity';
    this.decayPrimaryTube.visible = isExpMode;
    this.decayDaughterTube.visible = this.activeCurveKind === 'decay-nd';
    this.decayDaughterCursorMesh.visible = this.activeCurveKind === 'decay-nd';
    this.halfMarkerMesh.visible = isExpMode;
    this.decayTangentGroup.visible = isExpMode && state.showTangent;
    this.decayLogLinearTube.visible = this.activeCurveKind === 'log-linear';
    this.logSlopeGroup.visible =
      this.activeCurveKind === 'log-linear' && state.showTangent;
    this.decayLnNtTube.visible = this.activeCurveKind === 'ln-nt';
    this.decayLnNegGroup.visible = this.activeCurveKind === 'ln-neg';
    this.lnDownSlopeGroup.visible =
      (this.activeCurveKind === 'ln-nt' || this.activeCurveKind === 'ln-neg') &&
      state.showTangent;
    this.decayAstonGroup.visible = this.activeCurveKind === 'aston';

    // Recolor primary curve & cursor cleanly per curve mode
    if (this.activeCurveKind === 'activity') {
      this.decayTubeMat.color.setHex(0xff5a3c);
      this.decayTubeMat.emissive.setHex(0xff5a3c);
      this.decayCursorMat.emissive.setHex(0xff5a3c);
    } else if (this.activeCurveKind === 'log-linear') {
      this.decayCursorMat.emissive.setHex(0x10b981);
    } else if (this.activeCurveKind === 'ln-nt') {
      this.decayCursorMat.emissive.setHex(0xf59e0b);
    } else if (this.activeCurveKind === 'ln-neg') {
      this.decayCursorMat.emissive.setHex(0xc084fc);
    } else if (this.activeCurveKind === 'aston') {
      this.decayCursorMat.emissive.setHex(0xffb703);
    } else {
      this.decayTubeMat.color.setHex(0x00e5ff);
      this.decayTubeMat.emissive.setHex(0x00e5ff);
      this.decayCursorMat.emissive.setHex(0x00e5ff);
    }

    // Update Segré beam & marker
    const scaleZ = 0.062;
    const scaleN = 0.044;
    const originX = -3.1;
    const originY = -1.1;
    const isoX = originX + state.isotope.Z * scaleZ;
    const isoY = originY + state.isotope.N * scaleN;
    this.segreIsotopeBeam.position.set(isoX, originY + 3.2, 0.14);
    this.segreSelectedMarker.position.set(isoX, isoY, 0.24);

    // Update 3D curve cursor(s) & sample lattice colors
    const maxHalfLives = 4.0;
    const widthX = 5.2;
    const heightY = 3.2;
    const originDecayX = -3.4;
    const originDecayY = -1.1;
    const clampedT = THREE.MathUtils.clamp(state.decayProgress, 0, maxHalfLives);
    const uNorm = clampedT / maxHalfLives;
    const expYNorm = Math.exp(-clampedT * Math.LN2);

    if (this.activeCurveKind === 'log-linear') {
      this.decayCursorMesh.position.set(
        originDecayX + uNorm * widthX,
        originDecayY + uNorm * heightY,
        0.08
      );
    } else if (this.activeCurveKind === 'ln-nt' || this.activeCurveKind === 'ln-neg') {
      this.decayCursorMesh.position.set(
        originDecayX + uNorm * widthX,
        originDecayY + (1 - uNorm) * heightY,
        0.08
      );
    } else if (this.activeCurveKind === 'aston') {
      const massA = 2 + uNorm * 236;
      const astonYNorm = Math.min(1, evaluateAstonElPerA(massA) / 9.5);
      this.decayCursorMesh.position.set(
        originDecayX + uNorm * widthX,
        originDecayY + astonYNorm * heightY,
        0.08
      );
    } else {
      this.decayCursorMesh.position.set(
        originDecayX + uNorm * widthX,
        originDecayY + expYNorm * heightY,
        0.08
      );
      this.decayDaughterCursorMesh.position.set(
        originDecayX + uNorm * widthX,
        originDecayY + (1 - expYNorm) * heightY,
        0.09
      );
    }

    const remainingCount = Math.round(expYNorm * MAX_SAMPLE_ATOMS);
    const cActive = new THREE.Color(
      this.activeCurveKind === 'aston' ? 0xffb703 : 0xff5a3c
    );
    const cDecayed = new THREE.Color(
      this.activeCurveKind === 'log-linear' ? 0x10b981 : 0x3b82f6
    );
    for (let i = 0; i < MAX_SAMPLE_ATOMS; i++) {
      const p = this.sampleAtomPositions[i];
      _v1.copy(p);
      _q1.identity();
      const isRemaining =
        this.activeCurveKind === 'aston'
          ? i < Math.max(4, Math.round(uNorm * MAX_SAMPLE_ATOMS))
          : i < remainingCount;
      _s1.setScalar(isRemaining ? 1.08 : 0.78);
      _m1.compose(_v1, _q1, _s1);
      this.sampleAtomsMesh.setMatrixAt(i, _m1);
      this.sampleAtomsMesh.setColorAt(i, isRemaining ? cActive : cDecayed);
    }
    this.sampleAtomsMesh.instanceMatrix.needsUpdate = true;
    if (this.sampleAtomsMesh.instanceColor) {
      this.sampleAtomsMesh.instanceColor.needsUpdate = true;
    }
    this.sampleAtomsMesh.computeBoundingSphere();

    if (chapterChanged || readerChanged || flipChanged || compChanged || immediate) {
      if (this.comparatorMode) {
        this.desiredCamPos.set(0.35, 1.35, 9.5);
        this.desiredTarget.set(0.55, 0.15, 0);
        this.desiredFov = 45;
      } else if (this.pageReaderMode) {
        this.desiredCamPos.set(0, 0.42, 7.05);
        this.desiredTarget.set(0, 0.4, 2.4);
        this.desiredFov = 45;
      } else {
        this.desiredCamPos.set(...state.cameraPos);
        this.desiredTarget.set(...state.cameraTarget);
        this.desiredFov = state.fov ?? 45;
      }

      if (chapterChanged || readerChanged || compChanged || immediate) {
        this.cameraAutoFlight = true;
      }

      this.layoutCoursePages3D(immediate);
      this.updatePageBorderHighlights();

      if (chapterChanged || immediate) {
        const vMat = this.videoMesh.material as THREE.MeshBasicMaterial;
        gsap.fromTo(vMat, { opacity: 0.2 }, { opacity: 0.94, duration: 0.65, ease: 'power2.out' });

        if (!immediate && !this.reducedMotion && !this.pageReaderMode && !this.comparatorMode) {
          if (state.visualKind === 'emission-alpha') this.triggerDecay('alpha');
          else if (state.visualKind === 'emission-beta-minus') this.triggerDecay('beta-minus');
          else if (state.visualKind === 'emission-beta-plus') this.triggerDecay('beta-plus');
          else if (state.visualKind === 'emission-gamma') this.triggerDecay('gamma');
        }
      }

      if (immediate) {
        this.camera.position.copy(this.desiredCamPos);
        this.controls.target.copy(this.desiredTarget);
        const isNucleus =
          !this.comparatorMode &&
          (state.visualKind === 'nucleus-intro' ||
            state.visualKind.startsWith('emission-'));
        this.nucleusWeight = isNucleus ? 1 : 0;
        this.segreWeight = !this.comparatorMode && state.visualKind === 'segre-scatter' ? 1 : 0;
        this.decayWeight = !this.comparatorMode && state.visualKind.startsWith('curve-') ? 1 : 0;
        this.massDefectWeight = !this.comparatorMode && state.visualKind === 'mass-defect' ? 1 : 0;
        this.comparatorWeight = this.comparatorMode ? 1 : 0;
        this.compExplode = this.compTargetExplode;
        this.compBeamTilt = this.compTargetBeamTilt;
      }
    }
  }

  public focusCameraPreset(pos: [number, number, number], target: [number, number, number]) {
    if (this.pageReaderMode) {
      this.desiredCamPos.set(0, 0.42, 7.05);
      this.desiredTarget.set(0, 0.4, 2.4);
    } else {
      this.desiredCamPos.set(...pos);
      this.desiredTarget.set(...target);
    }
    this.cameraAutoFlight = true;
  }

  private layoutCoursePages3D(immediate = false) {
    const camVec = new THREE.Vector3(...this.lastCamPosPreset);
    const targetVec = new THREE.Vector3(...this.lastCamTargetPreset);
    const forwardDir = targetVec.clone().sub(camVec).normalize();
    const rightDir = new THREE.Vector3()
      .crossVectors(forwardDir, new THREE.Vector3(0, 1, 0))
      .normalize();

    // Compute camera-aware right flank position for active 3D course page
    const activeStagePos = targetVec
      .clone()
      .addScaledVector(rightDir, 3.15)
      .addScaledVector(forwardDir, 0.35);
    activeStagePos.y += 1.05;

    const activeYaw =
      Math.atan2(camVec.x - activeStagePos.x, camVec.z - activeStagePos.z) +
      (this.pageFlipped ? Math.PI : 0);

    // Position VideoPlane cleanly below active 3D page (or shrink out during Reader / Comparator mode)
    const videoTargetPos = this.pageReaderMode || this.comparatorMode
      ? new THREE.Vector3(activeStagePos.x, activeStagePos.y - 2.2, activeStagePos.z)
      : new THREE.Vector3(activeStagePos.x, activeStagePos.y - 1.9, activeStagePos.z);
    const videoYaw = Math.atan2(camVec.x - videoTargetPos.x, camVec.z - videoTargetPos.z);
    const videoScale = this.pageReaderMode || this.comparatorMode ? 0.001 : 0.74;

    if (immediate || this.reducedMotion) {
      this.videoGroup.position.copy(videoTargetPos);
      this.videoGroup.rotation.set(0, videoYaw, 0);
      this.videoGroup.scale.setScalar(videoScale);
    } else {
      gsap.to(this.videoGroup.position, {
        x: videoTargetPos.x,
        y: videoTargetPos.y,
        z: videoTargetPos.z,
        duration: 0.7,
        ease: 'power3.out',
      });
      gsap.to(this.videoGroup.rotation, {
        y: videoYaw,
        duration: 0.7,
        ease: 'power3.out',
      });
      gsap.to(this.videoGroup.scale, {
        x: videoScale,
        y: videoScale,
        z: videoScale,
        duration: 0.5,
        ease: 'power2.out',
      });
    }

    const total = this.coursePageAssemblies.length;
    const otherSlots = Math.max(1, total - 1);
    let slotCursor = 0;

    this.coursePageAssemblies.forEach((page, idx) => {
      const isActive = idx === this.activeChapterIndex;
      let tx = 0;
      let ty = 0;
      let tz = 0;
      let ry = 0;
      let sc = 0.6;

      if (isActive && !this.comparatorMode) {
        if (this.pageReaderMode) {
          tx = 0;
          ty = 0.44;
          tz = 2.4;
          ry = this.pageFlipped ? Math.PI : 0;
          sc = 1.02;
        } else {
          tx = activeStagePos.x;
          ty = activeStagePos.y;
          tz = activeStagePos.z;
          ry = activeYaw;
          sc = 0.86;
        }
      } else {
        // Fan non-active pages in a majestic 3D curved arc behind the observatory
        const u = otherSlots > 1 ? slotCursor / (otherSlots - 1) : 0.5;
        slotCursor++;
        const arcAngle = THREE.MathUtils.lerp(-Math.PI * 0.86, -Math.PI * 0.14, u);
        const radius = this.pageReaderMode ? 10.6 : 9.4;
        tx = Math.cos(arcAngle) * radius;
        tz = Math.sin(arcAngle) * radius;
        ty = (this.pageReaderMode ? 2.15 : 2.55) + Math.sin(u * Math.PI) * 0.55;
        ry = Math.atan2(0 - tx, 3.0 - tz);
        sc = this.pageReaderMode ? 0.54 : 0.62;
      }

      page.userData.baseY = ty;
      page.userData.isActive = isActive;

      if (immediate || this.reducedMotion) {
        page.position.set(tx, ty, tz);
        page.rotation.set(0, ry, 0);
        page.scale.setScalar(sc);
      } else {
        gsap.to(page.position, {
          x: tx,
          y: ty,
          z: tz,
          duration: 0.8,
          ease: 'power3.out',
        });
        gsap.to(page.rotation, {
          x: 0,
          y: ry,
          z: 0,
          duration: 0.78,
          ease: 'power3.inOut',
        });
        gsap.to(page.scale, {
          x: sc,
          y: sc,
          z: sc,
          duration: 0.75,
          ease: 'power3.out',
        });
      }
    });
  }

  public triggerDecay(mode: DecayMode) {
    const emissionGroup = new THREE.Group();
    emissionGroup.position.copy(this.nucleusAssembly.position);

    const dir = new THREE.Vector3(
      mode === 'beta-minus' ? 0.9 : (Math.random() - 0.4) * 0.8 + 0.5,
      (Math.random() - 0.3) * 0.5 + 0.2,
      0.5
    ).normalize();

    if (mode === 'alpha') {
      const pGeo = new THREE.SphereGeometry(0.16, 16, 12);
      const pMat = new THREE.MeshPhysicalMaterial({
        color: 0xff5a3c,
        emissive: 0xffb703,
        emissiveIntensity: 1.0,
        clearcoat: 0.9,
      });
      const nMat = new THREE.MeshPhysicalMaterial({
        color: 0x9fd8ff,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.45,
        roughness: 0.35,
      });
      const offsets = [
        [0.11, 0.1, 0],
        [-0.11, -0.1, 0],
        [0.1, -0.11, 0.11],
        [-0.1, 0.11, -0.11],
      ];
      offsets.forEach(([ox, oy, oz], i) => {
        const m = new THREE.Mesh(pGeo, i < 2 ? pMat : nMat);
        m.position.set(ox, oy, oz);
        emissionGroup.add(m);
      });
      this.flashLight.color.setHex(0xffb703);
    } else if (mode === 'beta-minus' || mode === 'beta-plus') {
      const hex = mode === 'beta-minus' ? 0x00e5ff : 0xff4dff;
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 12),
        new THREE.MeshStandardMaterial({
          color: hex,
          emissive: hex,
          emissiveIntensity: 2.2,
        })
      );
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.glowTexture,
          color: hex,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
        })
      );
      sprite.scale.set(0.95, 0.95, 1);
      emissionGroup.add(core);
      emissionGroup.add(sprite);
      this.flashLight.color.setHex(mode === 'beta-plus' ? 0xffffff : hex);
    } else {
      const ringGeo = new THREE.TorusGeometry(0.4, 0.036, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.lookAt(dir);
      emissionGroup.add(ring);
      this.flashLight.color.setHex(0xffffff);
      this.particlesGroup.add(emissionGroup);
      this.activeEmissions.push({
        group: emissionGroup,
        velocity: dir.multiplyScalar(3.4),
        age: 0,
        maxAge: 2.2,
        mode,
        ringMesh: ring,
      });
      this.flashIntensity = 5.5;
      return;
    }

    const waveGeo = new THREE.RingGeometry(0.4, 0.48, 32);
    const waveMat = new THREE.MeshBasicMaterial({
      color: this.flashLight.color.getHex(),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const shock = new THREE.Mesh(waveGeo, waveMat);
    shock.lookAt(dir);
    emissionGroup.add(shock);

    // Glowing particle detector streak tail behind particle
    const streakLen = mode === 'alpha' ? 1.15 : 1.75;
    const streakGeo = new THREE.ConeGeometry(mode === 'alpha' ? 0.14 : 0.08, streakLen, 12);
    streakGeo.rotateX(Math.PI / 2);
    const streakMat = new THREE.MeshBasicMaterial({
      color: this.flashLight.color.getHex(),
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const streak = new THREE.Mesh(streakGeo, streakMat);
    const backOffset = dir.clone().multiplyScalar(-streakLen * 0.52);
    streak.position.copy(backOffset);
    streak.lookAt(dir.clone().multiplyScalar(2));
    emissionGroup.add(streak);

    this.particlesGroup.add(emissionGroup);
    this.activeEmissions.push({
      group: emissionGroup,
      velocity: dir.multiplyScalar(mode === 'alpha' ? 2.6 : 4.2),
      age: 0,
      maxAge: 2.4,
      mode,
      ringMesh: shock,
    });

    this.flashIntensity = 6.0;
    gsap.fromTo(
      this.nucleusAssembly.scale,
      { x: 1.09, y: 1.09, z: 1.09 },
      { x: 1, y: 1, z: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)' }
    );
  }

  private updateNucleons(elapsed: number, delta: number) {
    this.explodeAmount = THREE.MathUtils.damp(
      this.explodeAmount,
      this.targetExplode,
      6,
      delta
    );

    const totalA = Math.max(1, this.activeProtons + this.activeNeutrons);
    const baseSpread = totalA > 60 ? 0.65 : totalA > 20 ? 0.88 : 1.05;
    const explodeFactor = 1 + this.explodeAmount * 1.45;
    const nucleonScale = totalA > 100 ? 0.68 : totalA > 25 ? 0.85 : 1.0;

    this.protonMesh.count = this.activeProtons;
    for (let i = 0; i < this.activeProtons; i++) {
      const seed = this.protonSeeds[i];
      const jitter = this.reducedMotion ? 0 : Math.sin(elapsed * 2.8 + i * 1.7) * 0.018;
      _v1.copy(seed).multiplyScalar(baseSpread * explodeFactor + jitter);
      _q1.identity();
      _s1.setScalar(nucleonScale);
      _m1.compose(_v1, _q1, _s1);
      this.protonMesh.setMatrixAt(i, _m1);
    }
    this.protonMesh.instanceMatrix.needsUpdate = true;

    this.neutronMesh.count = this.activeNeutrons;
    for (let i = 0; i < this.activeNeutrons; i++) {
      const seed = this.neutronSeeds[i];
      const jitter = this.reducedMotion ? 0 : Math.cos(elapsed * 2.6 + i * 1.3) * 0.018;
      _v1.copy(seed).multiplyScalar(baseSpread * explodeFactor + jitter);
      _q1.identity();
      _s1.setScalar(nucleonScale);
      _m1.compose(_v1, _q1, _s1);
      this.neutronMesh.setMatrixAt(i, _m1);
    }
    this.neutronMesh.instanceMatrix.needsUpdate = true;

    if (!this.reducedMotion) {
      this.nucleusAssembly.rotation.y = elapsed * 0.18;
      this.containmentShell.rotation.y = -elapsed * 0.25;
      this.containmentShell.rotation.x = elapsed * 0.12;
    }

    const ringRadii = [2.05, 2.55, 3.05];
    for (let i = 0; i < MAX_ELECTRONS; i++) {
      const eMesh = this.electronMeshes[i];
      if (i >= this.activeElectrons) {
        eMesh.visible = false;
        continue;
      }
      eMesh.visible = true;
      const ringIdx = i % 3;
      const ring = this.orbitalRings[ringIdx];
      const r = ringRadii[ringIdx];
      const speed = this.reducedMotion ? 0 : 1.4 - ringIdx * 0.28;
      const angle =
        elapsed * speed +
        (i * Math.PI * 2) / Math.max(1, Math.ceil(this.activeElectrons / 3));

      _v1.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      _v1.applyEuler(ring.rotation);
      eMesh.position.copy(_v1);
    }
  }

  private updateEmissions(delta: number) {
    if (this.flashIntensity > 0.01) {
      this.flashIntensity = THREE.MathUtils.damp(this.flashIntensity, 0, 7, delta);
      this.flashLight.intensity = this.flashIntensity;
    } else {
      this.flashLight.intensity = 0;
    }

    for (let i = this.activeEmissions.length - 1; i >= 0; i--) {
      const p = this.activeEmissions[i];
      p.age += delta;
      if (p.age >= p.maxAge) {
        this.particlesGroup.remove(p.group);
        p.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.geometry.dispose();
            if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
            else m.material.dispose();
          }
        });
        this.activeEmissions.splice(i, 1);
        continue;
      }

      _v1.copy(p.velocity).multiplyScalar(delta);
      p.group.position.add(_v1);
      p.group.rotation.x += delta * 2.4;
      p.group.rotation.y += delta * 3.1;

      if (p.ringMesh) {
        const s = 1 + p.age * (p.mode === 'gamma' ? 5.8 : 3.2);
        p.ringMesh.scale.setScalar(s);
        const mat = p.ringMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.85 * (1 - p.age / p.maxAge));
      }
    }
  }

  private updateMassDefectVisuals(elapsed: number, delta: number) {
    if (this.massDefectWeight <= 0.02) return;

    this.mdBeamTilt = THREE.MathUtils.damp(
      this.mdBeamTilt,
      this.mdTargetBeamTilt,
      5.5,
      delta
    );
    this.mdBindingRatio = THREE.MathUtils.damp(
      this.mdBindingRatio,
      this.mdTargetBindingRatio,
      5.5,
      delta
    );

    // Positive tilt tilts left pan down (heavier free nucleons) and right pan up (lighter bound nucleus)
    this.mdBeamGroup.rotation.z = this.mdBeamTilt;
    // Keep suspended pans upright horizontally
    this.mdLeftPanGroup.rotation.z = -this.mdBeamTilt;
    this.mdRightPanGroup.rotation.z = -this.mdBeamTilt;

    const totalA = Math.max(1, this.mdZ + this.mdN);
    const scaleFactor = totalA > 100 ? 0.48 : totalA > 30 ? 0.68 : 0.88;
    const freeSpread = totalA > 100 ? 0.56 : totalA > 30 ? 0.7 : 0.86;
    const boundSpread =
      (totalA > 100 ? 0.36 : totalA > 30 ? 0.46 : 0.58) *
      (1 + (1 - this.mdBindingRatio) * 0.42);
    const nucleonHoverY = totalA > 100 ? 0.86 : 0.72;

    this.mdFreeProtonsMesh.count = this.mdZ;
    this.mdBoundProtonsMesh.count = this.mdZ;
    for (let i = 0; i < this.mdZ; i++) {
      const seed = this.protonSeeds[i];
      const bob = this.reducedMotion ? 0 : Math.sin(elapsed * 2.2 + i * 0.7) * 0.025;
      _v1.copy(seed).multiplyScalar(freeSpread);
      _v1.y += nucleonHoverY + bob;
      _q1.identity();
      _s1.setScalar(scaleFactor);
      _m1.compose(_v1, _q1, _s1);
      this.mdFreeProtonsMesh.setMatrixAt(i, _m1);

      _v1.copy(seed).multiplyScalar(boundSpread);
      _v1.y += nucleonHoverY - 0.04;
      _m1.compose(_v1, _q1, _s1);
      this.mdBoundProtonsMesh.setMatrixAt(i, _m1);
    }
    this.mdFreeProtonsMesh.instanceMatrix.needsUpdate = true;
    this.mdBoundProtonsMesh.instanceMatrix.needsUpdate = true;

    this.mdFreeNeutronsMesh.count = this.mdN;
    this.mdBoundNeutronsMesh.count = this.mdN;
    for (let i = 0; i < this.mdN; i++) {
      const seed = this.neutronSeeds[i];
      const bob = this.reducedMotion ? 0 : Math.cos(elapsed * 2.0 + i * 0.6) * 0.025;
      _v1.copy(seed).multiplyScalar(freeSpread);
      _v1.y += nucleonHoverY + bob;
      _q1.identity();
      _s1.setScalar(scaleFactor);
      _m1.compose(_v1, _q1, _s1);
      this.mdFreeNeutronsMesh.setMatrixAt(i, _m1);

      _v1.copy(seed).multiplyScalar(boundSpread);
      _v1.y += nucleonHoverY - 0.04;
      _m1.compose(_v1, _q1, _s1);
      this.mdBoundNeutronsMesh.setMatrixAt(i, _m1);
    }
    this.mdFreeNeutronsMesh.instanceMatrix.needsUpdate = true;
    this.mdBoundNeutronsMesh.instanceMatrix.needsUpdate = true;

    // E = Δm·c² photon energy conduit height & rising pulse rings
    const energyLevel =
      THREE.MathUtils.clamp(this.mdEnergyMeV / 1800, 0.14, 1.0) *
      this.mdBindingRatio;
    this.mdEnergyColumnMesh.scale.set(
      0.7 + energyLevel * 0.5,
      Math.max(0.05, energyLevel),
      0.7 + energyLevel * 0.5
    );
    this.mdEnergyColumnMesh.position.y = 0.38 + 1.1 * energyLevel;

    this.mdEnergyRings.forEach((ring, idx) => {
      const phase = this.reducedMotion
        ? idx * 0.25
        : (elapsed * 0.45 + idx * 0.25) % 1;
      ring.position.y = 0.55 + phase * 2.05;
      ring.scale.setScalar(0.65 + Math.sin(phase * Math.PI) * 0.45);
      const rMat = ring.material as THREE.MeshBasicMaterial;
      rMat.opacity = Math.sin(phase * Math.PI) * 0.85 * Math.max(0.15, this.mdBindingRatio);
    });

    this.mdPulseRingMesh.scale.setScalar(1); // keep reference reachable
    if (this.mdPulseAge < 1.4) {
      this.mdPulseAge += delta;
      const p = Math.min(1, this.mdPulseAge / 1.4);
      this.mdPulseRingMesh.scale.setScalar(1 + p * 6.5);
      (this.mdPulseRingMesh.material as THREE.MeshBasicMaterial).opacity =
        (1 - p) * 0.9;
    } else {
      (this.mdPulseRingMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  private updateComparatorVisuals(elapsed: number, delta: number) {
    if (this.comparatorWeight <= 0.02) return;

    this.compExplode = THREE.MathUtils.damp(
      this.compExplode,
      this.compTargetExplode,
      6.0,
      delta
    );
    this.compBeamTilt = THREE.MathUtils.damp(
      this.compBeamTilt,
      this.compTargetBeamTilt,
      5.5,
      delta
    );
    this.compDiffBeam.rotation.z = this.compBeamTilt;

    const updateOneNucleus = (
      Z: number,
      N: number,
      pMesh: THREE.InstancedMesh,
      nMesh: THREE.InstancedMesh,
      group: THREE.Group,
      phaseSign: number
    ) => {
      const totalA = Math.max(1, Z + N);
      const baseSpread = totalA > 100 ? 0.52 : totalA > 30 ? 0.68 : 0.85;
      const explodeFactor = 1 + this.compExplode * 1.18;
      const scaleFactor = totalA > 100 ? 0.56 : totalA > 30 ? 0.74 : 0.95;

      pMesh.count = Z;
      for (let i = 0; i < Z; i++) {
        const seed = this.protonSeeds[i];
        const jitter = this.reducedMotion ? 0 : Math.sin(elapsed * 2.5 + i * 1.4) * 0.015;
        _v1.copy(seed).multiplyScalar(baseSpread * explodeFactor + jitter);
        _q1.identity();
        _s1.setScalar(scaleFactor);
        _m1.compose(_v1, _q1, _s1);
        pMesh.setMatrixAt(i, _m1);
      }
      pMesh.instanceMatrix.needsUpdate = true;

      nMesh.count = N;
      for (let i = 0; i < N; i++) {
        const seed = this.neutronSeeds[i];
        const jitter = this.reducedMotion ? 0 : Math.cos(elapsed * 2.3 + i * 1.1) * 0.015;
        _v1.copy(seed).multiplyScalar(baseSpread * explodeFactor + jitter);
        _q1.identity();
        _s1.setScalar(scaleFactor);
        _m1.compose(_v1, _q1, _s1);
        nMesh.setMatrixAt(i, _m1);
      }
      nMesh.instanceMatrix.needsUpdate = true;

      if (!this.reducedMotion) {
        group.rotation.y = elapsed * 0.28 * phaseSign;
      }
    };

    updateOneNucleus(
      this.compLeftZ,
      this.compLeftN,
      this.compLeftProtonsMesh,
      this.compLeftNeutronsMesh,
      this.compLeftNucleusGroup,
      1
    );
    updateOneNucleus(
      this.compRightZ,
      this.compRightN,
      this.compRightProtonsMesh,
      this.compRightNeutronsMesh,
      this.compRightNucleusGroup,
      -1
    );

    // Relative Binding Energy Bars (height proportional to E_l normalized against max of pair)
    const maxE = Math.max(this.compLeftElMeV, this.compRightElMeV, 10);
    const leftLevel = THREE.MathUtils.clamp(this.compLeftElMeV / maxE, 0.08, 1.0);
    const rightLevel = THREE.MathUtils.clamp(this.compRightElMeV / maxE, 0.08, 1.0);

    this.compLeftEnergyBar.scale.set(1, leftLevel, 1);
    this.compLeftEnergyBar.position.y = -0.5 + 1.05 * leftLevel;

    this.compRightEnergyBar.scale.set(1, rightLevel, 1);
    this.compRightEnergyBar.position.y = -0.5 + 1.05 * rightLevel;

    // Cohesion ring glow & subtle speed reflects E_l / A stability
    const leftCohesionScale = 0.86 + (this.compLeftElPerA / 9.0) * 0.3;
    const rightCohesionScale = 0.86 + (this.compRightElPerA / 9.0) * 0.3;
    this.compLeftCohesionRing.scale.setScalar(leftCohesionScale);
    this.compRightCohesionRing.scale.setScalar(rightCohesionScale);
    if (!this.reducedMotion) {
      this.compLeftCohesionRing.rotation.z = elapsed * 0.4;
      this.compRightCohesionRing.rotation.z = -elapsed * 0.4;
    }
  }

  private tick = () => {
    if (this.disposed) return;

    const delta = Math.min(this.clock.getDelta(), 0.08);
    const elapsed = this.clock.getElapsedTime();

    if (this.cameraAutoFlight) {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.desiredCamPos.x, 4.2, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.desiredCamPos.y, 4.2, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.desiredCamPos.z, 4.2, delta);

      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.desiredTarget.x, 4.5, delta);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.desiredTarget.y, 4.5, delta);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.desiredTarget.z, 4.5, delta);

      if (Math.abs(this.camera.fov - this.desiredFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, this.desiredFov, 4.5, delta);
        this.camera.updateProjectionMatrix();
      }

      if (this.camera.position.distanceTo(this.desiredCamPos) < 0.025) {
        this.cameraAutoFlight = false;
      }
    }

    const isNucleus =
      !this.comparatorMode &&
      (this.activeVisualKind === 'nucleus-intro' ||
        this.activeVisualKind.startsWith('emission-'));
    const isSegre = !this.comparatorMode && this.activeVisualKind === 'segre-scatter';
    const isDecay = !this.comparatorMode && this.activeVisualKind.startsWith('curve-');
    const isMassDefect = !this.comparatorMode && this.activeVisualKind === 'mass-defect';
    const isComparator = this.comparatorMode;

    this.nucleusWeight = THREE.MathUtils.damp(this.nucleusWeight, isNucleus ? 1 : 0, 6, delta);
    this.segreWeight = THREE.MathUtils.damp(this.segreWeight, isSegre ? 1 : 0, 6, delta);
    this.decayWeight = THREE.MathUtils.damp(this.decayWeight, isDecay ? 1 : 0, 6, delta);
    this.massDefectWeight = THREE.MathUtils.damp(this.massDefectWeight, isMassDefect ? 1 : 0, 6, delta);
    this.comparatorWeight = THREE.MathUtils.damp(this.comparatorWeight, isComparator ? 1 : 0, 6, delta);

    this.nucleusAssembly.visible = this.nucleusWeight > 0.02;
    this.nucleusAssembly.scale.setScalar(Math.max(0.001, this.nucleusWeight));

    this.segreGroup.visible = this.segreWeight > 0.02;
    this.segreGroup.scale.setScalar(Math.max(0.001, this.segreWeight));
    if (!this.reducedMotion) this.segreSelectedMarker.rotation.y = elapsed * 2.2;

    this.decayGroup.visible = this.decayWeight > 0.02;
    this.decayGroup.scale.setScalar(Math.max(0.001, this.decayWeight));

    this.massDefectGroup.visible = this.massDefectWeight > 0.02;
    this.massDefectGroup.scale.setScalar(Math.max(0.001, this.massDefectWeight));
    this.updateMassDefectVisuals(elapsed, delta);

    this.comparatorGroup.visible = this.comparatorWeight > 0.02;
    this.comparatorGroup.scale.setScalar(Math.max(0.001, this.comparatorWeight));
    this.updateComparatorVisuals(elapsed, delta);

    // Pulse t1/2 marker in Half-Life chapter
    if (this.activeVisualKind === 'curve-halflife' && !this.reducedMotion) {
      const pulse = 1 + Math.sin(elapsed * 5.0) * 0.28;
      this.halfMarkerMesh.scale.setScalar(pulse);
    } else {
      this.halfMarkerMesh.scale.setScalar(1);
    }

    // Gentle floating bob on 3D course pages & floor calibration halo
    if (!this.reducedMotion) {
      this.coursePageAssemblies.forEach((page) => {
        const { baseY, phase, isActive } = page.userData as {
          baseY?: number;
          phase?: number;
          isActive?: boolean;
        };
        if (typeof baseY === 'number' && typeof phase === 'number' && !gsap.isTweening(page.position)) {
          const amp = isActive && this.pageReaderMode ? 0.015 : 0.055;
          page.position.y = baseY + Math.sin(elapsed * 1.3 + phase) * amp;
        }
      });
      this.sparkPoints.rotation.y = elapsed * 0.015;
      this.floorHaloRing.rotation.z = elapsed * 0.22;
      const coreScale = 2.8 + Math.sin(elapsed * 2.4) * 0.25;
      this.coreGlowSprite.scale.set(coreScale, coreScale, 1);
    }

    // Throttle 3D VideoPlane canvas redraw (~24fps when playing)
    if (this.videoCtx && (elapsed - this.lastVideoDraw > 0.042 || this.lastVideoDraw === 0)) {
      this.lastVideoDraw = elapsed;
      drawVideoMonitorFrame(
        this.videoCtx,
        this.videoCanvas.width,
        this.videoCanvas.height,
        this.videoTitle,
        this.videoCaption,
        this.videoAccentHex,
        elapsed,
        this.videoPlaying && !this.reducedMotion
      );
      this.videoTexture.needsUpdate = true;
    }

    this.updateNucleons(elapsed, delta);
    this.updateEmissions(delta);

    this.controls.update();

    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private handleResize = () => {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);

    this.controls.dispose();
    this.glowTexture.dispose();
    this.floorTexture.dispose();
    this.shadowTexture.dispose();
    this.videoTexture.dispose();
    this.compLeftPlateTex?.dispose();
    this.compRightPlateTex?.dispose();
    this.coursePageTextures.forEach((t) => t.dispose());

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      }
    });

    this.composer?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
