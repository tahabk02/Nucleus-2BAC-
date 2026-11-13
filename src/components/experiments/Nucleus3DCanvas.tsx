import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DecayMode } from '../../types/lesson';
import {
  createContactShadowTexture,
  createGlowSpriteTexture,
  createPolarLabFloorTexture,
} from '../../three/textures';

export type NucleusCameraPreset = 'atom' | 'nucleus' | 'exploded' | 'decay';

interface Nucleus3DCanvasProps {
  mode: 'explorer' | 'decay';
  protons: number;
  neutrons: number;
  electrons?: number;
  explodeAmount?: number;
  cameraPreset?: NucleusCameraPreset;
  decayMode?: DecayMode;
  decayStep?: 0 | 1 | 2;
  decayPulseKey?: number;
  heightClass?: string;
  onNucleusClick?: () => void;
}

const MAX_NUCLEONS = 250;
const MAX_ELECTRONS = 28;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _s1 = new THREE.Vector3();
const _m1 = new THREE.Matrix4();

export function Nucleus3DCanvas({
  mode,
  protons,
  neutrons,
  electrons = protons,
  explodeAmount = 0,
  cameraPreset = 'atom',
  decayMode = 'alpha',
  decayStep = 0,
  decayPulseKey = 0,
  heightClass = 'h-[360px] sm:h-[430px]',
  onNucleusClick,
}: Nucleus3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onNucleusClickRef = useRef(onNucleusClick);
  onNucleusClickRef.current = onNucleusClick;

  const stateRef = useRef({
    mode,
    protons,
    neutrons,
    electrons,
    explodeAmount,
    cameraPreset,
    decayMode,
    decayStep,
    splitProgress: decayStep === 2 ? 1 : 0,
    targetSplit: decayStep === 2 ? 1 : 0,
    cameraAnimating: false,
    targetCamPos: new THREE.Vector3(0, 1.15, 6.7),
    targetCamLook: new THREE.Vector3(0, 0, 0),
  });

  stateRef.current.mode = mode;
  stateRef.current.protons = Math.max(1, Math.min(MAX_NUCLEONS, protons));
  stateRef.current.neutrons = Math.max(0, Math.min(MAX_NUCLEONS, neutrons));
  stateRef.current.electrons = Math.max(0, Math.min(MAX_ELECTRONS, electrons));
  stateRef.current.explodeAmount = explodeAmount;
  stateRef.current.decayMode = decayMode;
  stateRef.current.decayStep = decayStep;
  stateRef.current.targetSplit = mode === 'decay' && decayStep === 2 ? 1 : 0;

  useEffect(() => {
    const st = stateRef.current;
    st.cameraPreset = cameraPreset;
    if (mode === 'decay') {
      st.targetCamPos.set(0.35, 1.05, 6.25);
      st.targetCamLook.set(0.25, 0, 0);
    } else if (cameraPreset === 'nucleus') {
      st.targetCamPos.set(0.5, 0.55, 3.6);
      st.targetCamLook.set(0, 0, 0);
    } else if (cameraPreset === 'exploded') {
      st.targetCamPos.set(0.8, 1.15, 5.2);
      st.targetCamLook.set(0, 0, 0);
    } else {
      st.targetCamPos.set(0, 1.15, 6.75);
      st.targetCamLook.set(0, 0, 0);
    }
    st.cameraAnimating = true;
  }, [cameraPreset, mode]);

  useEffect(() => {
    if (mode === 'decay' && decayPulseKey > 0) {
      stateRef.current.splitProgress = 0;
      stateRef.current.targetSplit = 1;
    }
  }, [mode, decayPulseKey]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
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
    })();

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a12);
    scene.fog = new THREE.FogExp2(0x070a12, 0.032);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 70);
    camera.position.copy(stateRef.current.targetCamPos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.6;
    controls.maxDistance = 12.5;
    controls.target.copy(stateRef.current.targetCamLook);

    const cancelAutoCam = () => {
      stateRef.current.cameraAnimating = false;
    };
    controls.addEventListener('start', cancelAutoCam);

    // 3-Point Sci-Fi Studio Lighting (Cool white key + Electric purple fill + Neon cyan rim)
    const hemi = new THREE.HemisphereLight(0x67e8f9, 0x0b0f19, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xf3f4f6, 2.25);
    keyLight.position.set(5, 7, 5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimCyan = new THREE.DirectionalLight(0x00f2fe, 1.35);
    rimCyan.position.set(-5, 2.5, -4);
    scene.add(rimCyan);

    const fillPurple = new THREE.PointLight(0x7f00ff, 2.6, 14);
    fillPurple.position.set(2.5, -1.6, 3.2);
    scene.add(fillPurple);

    const glowTex = createGlowSpriteTexture();
    const shadowTex = createContactShadowTexture();
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const floorTex = createPolarLabFloorTexture(maxAniso);

    // Observatory Calibration Polar Floor
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({
        map: floorTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -2.18;
    scene.add(floorMesh);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 4.8),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.65,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.15;
    scene.add(shadowPlane);

    // Subtle cosmic dust particles
    const starCount = 140;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 18;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x00f2fe,
      size: 0.045,
      transparent: true,
      opacity: 0.45,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const nucleusGroup = new THREE.Group();
    scene.add(nucleusGroup);

    // Volumetric Electric Purple (#7F00FF) & Neon Cyan (#00F2FE) Core Aura
    const corePurpleAura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x7f00ff,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    corePurpleAura.scale.set(3.4, 3.4, 1);
    nucleusGroup.add(corePurpleAura);

    const coreCyanAura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    coreCyanAura.scale.set(2.1, 2.1, 1);
    nucleusGroup.add(coreCyanAura);

    // Invisible click target sphere for raycasting zoom
    const clickProxy = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 16, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    nucleusGroup.add(clickProxy);

    // Coral Red Protons (#FF5252) & Silver/Ice-Blue Neutrons (#CBD5E1 / #93C5FD)
    const nucleonGeo = new THREE.SphereGeometry(0.185, 22, 18);
    const protonMat = new THREE.MeshPhysicalMaterial({
      color: 0xff5252,
      emissive: 0x5c0d14,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.16,
      clearcoat: 0.55,
      clearcoatRoughness: 0.22,
    });
    const neutronMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.22,
      roughness: 0.34,
      metalness: 0.22,
      clearcoat: 0.45,
      clearcoatRoughness: 0.25,
    });

    const protonMesh = new THREE.InstancedMesh(nucleonGeo, protonMat, MAX_NUCLEONS);
    const neutronMesh = new THREE.InstancedMesh(nucleonGeo, neutronMat, MAX_NUCLEONS);
    protonMesh.frustumCulled = false;
    neutronMesh.frustumCulled = false;
    protonMesh.castShadow = !isSoftwareGl;
    neutronMesh.castShadow = !isSoftwareGl;
    nucleusGroup.add(protonMesh, neutronMesh);

    const protonSeeds: THREE.Vector3[] = [];
    const neutronSeeds: THREE.Vector3[] = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < MAX_NUCLEONS; i++) {
      const r = 0.21 * Math.cbrt(i + 0.65);
      const y = 1 - ((i % 47) / 46) * 2;
      const radAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const thP = goldenAngle * i;
      protonSeeds.push(
        new THREE.Vector3(Math.cos(thP) * radAtY * r, y * r, Math.sin(thP) * radAtY * r)
      );
      const thN = goldenAngle * (i + 0.5) + 1.15;
      neutronSeeds.push(
        new THREE.Vector3(Math.cos(thN) * radAtY * r, -y * r, Math.sin(thN) * radAtY * r)
      );
    }

    // Neon Cyan Orbital Shells (#00F2FE)
    const orbitalRings: THREE.Mesh[] = [];
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.34,
    });
    [2.05, 2.55, 3.05].forEach((radius, idx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 10, 84), ringMat);
      ring.rotation.x = Math.PI * (0.28 + idx * 0.23);
      ring.rotation.y = idx * 0.64;
      nucleusGroup.add(ring);
      orbitalRings.push(ring);
    });

    const electronGeo = new THREE.SphereGeometry(0.068, 14, 14);
    const electronMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      emissive: 0x00f2fe,
      emissiveIntensity: 1.6,
      roughness: 0.15,
    });
    const electronMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < MAX_ELECTRONS; i++) {
      const e = new THREE.Mesh(electronGeo, electronMat);
      const eGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0x00f2fe,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      eGlow.scale.set(0.36, 0.36, 1);
      e.add(eGlow);
      nucleusGroup.add(e);
      electronMeshes.push(e);
    }

    // Emitted particle assembly for Decay Lab mode
    const emittedGroup = new THREE.Group();
    scene.add(emittedGroup);

    const alphaCluster = new THREE.Group();
    const alphaOffsets: [number, number, number, boolean][] = [
      [0.11, 0.09, 0, true],
      [-0.11, -0.09, 0, true],
      [0.09, -0.1, 0.09, false],
      [-0.09, 0.1, -0.09, false],
    ];
    alphaOffsets.forEach(([x, y, z, isP]) => {
      const s = new THREE.Mesh(nucleonGeo, isP ? protonMat : neutronMat);
      s.position.set(x, y, z);
      alphaCluster.add(s);
    });
    const alphaGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffb703,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    alphaGlow.scale.set(1.2, 1.2, 1);
    alphaCluster.add(alphaGlow);
    emittedGroup.add(alphaCluster);

    const betaOrbMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      emissive: 0x00f2fe,
      emissiveIntensity: 1.4,
      roughness: 0.18,
    });
    const betaOrb = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 16), betaOrbMat);
    const betaHaloMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const betaHalo = new THREE.Sprite(betaHaloMat);
    betaHalo.scale.set(1.05, 1.05, 1);
    betaOrb.add(betaHalo);
    emittedGroup.add(betaOrb);

    const gammaRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const gammaRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.036, 12, 48), gammaRingMat);
    emittedGroup.add(gammaRing);

    // Trajectory guide beam during decay emission
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x7f00ff,
      transparent: true,
      opacity: 0.45,
    });
    const trajectoryBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 2.4, 8),
      beamMat
    );
    trajectoryBeam.rotation.z = Math.PI / 2;
    trajectoryBeam.position.set(1.0, 0, 0);
    scene.add(trajectoryBeam);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on pointer click for interactive nucleus zoom
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (stateRef.current.mode !== 'explorer') return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(clickProxy, false);
      if (hits.length > 0 && onNucleusClickRef.current) {
        onNucleusClickRef.current();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (stateRef.current.mode !== 'explorer') {
        renderer.domElement.style.cursor = 'grab';
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(clickProxy, false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    const clock = new THREE.Clock();
    let dampedExplode = 0;
    let frameId = 0;
    let disposed = false;

    const handleResize = () => {
      if (!container || disposed) return;
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 6);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.elapsedTime;
      const st = stateRef.current;

      // Smoothly damp camera when preset transition is active
      if (st.cameraAnimating) {
        const alpha = 1 - Math.exp(-5.2 * dt);
        camera.position.lerp(st.targetCamPos, alpha);
        controls.target.lerp(st.targetCamLook, alpha);
        if (
          camera.position.distanceTo(st.targetCamPos) < 0.03 &&
          controls.target.distanceTo(st.targetCamLook) < 0.02
        ) {
          st.cameraAnimating = false;
        }
      }

      dampedExplode = THREE.MathUtils.damp(
        dampedExplode,
        st.mode === 'explorer' ? st.explodeAmount : st.decayStep === 1 ? 0.36 : 0,
        5.5,
        dt
      );
      st.splitProgress = THREE.MathUtils.damp(st.splitProgress, st.targetSplit, 3.8, dt);

      const isDecaySplit = st.mode === 'decay' && st.splitProgress > 0.02;
      const recoilX = isDecaySplit ? -0.78 * st.splitProgress : 0;
      nucleusGroup.position.x = recoilX;
      nucleusGroup.rotation.y = elapsed * 0.25;
      stars.rotation.y = elapsed * 0.02;

      const daughterProtons =
        st.mode === 'decay' && st.decayStep === 2
          ? Math.max(
              1,
              st.protons -
                (st.decayMode === 'alpha'
                  ? 2
                  : st.decayMode === 'beta-plus'
                  ? 1
                  : st.decayMode === 'beta-minus'
                  ? -1
                  : 0)
            )
          : st.protons;
      const daughterNeutrons =
        st.mode === 'decay' && st.decayStep === 2
          ? Math.max(
              0,
              st.neutrons -
                (st.decayMode === 'alpha'
                  ? 2
                  : st.decayMode === 'beta-minus'
                  ? 1
                  : st.decayMode === 'beta-plus'
                  ? -1
                  : 0)
            )
          : st.neutrons;

      const activeP = Math.min(MAX_NUCLEONS, daughterProtons);
      const activeN = Math.min(MAX_NUCLEONS, daughterNeutrons);
      const scaleFactor = activeP + activeN > 90 ? 0.72 : 1.0;

      for (let i = 0; i < MAX_NUCLEONS; i++) {
        if (i < activeP) {
          _v1.copy(protonSeeds[i]).multiplyScalar(scaleFactor);
          if (dampedExplode > 0.005) {
            _v1.x -= dampedExplode * 0.72;
            _v1.multiplyScalar(1 + dampedExplode * 0.85);
          }
          _s1.setScalar(scaleFactor);
          _m1.compose(_v1, _q1.identity(), _s1);
        } else {
          _m1.makeScale(0, 0, 0);
        }
        protonMesh.setMatrixAt(i, _m1);

        if (i < activeN) {
          _v1.copy(neutronSeeds[i]).multiplyScalar(scaleFactor);
          if (dampedExplode > 0.005) {
            _v1.x += dampedExplode * 0.72;
            _v1.multiplyScalar(1 + dampedExplode * 0.85);
          }
          _s1.setScalar(scaleFactor);
          _m1.compose(_v1, _q1.identity(), _s1);
        } else {
          _m1.makeScale(0, 0, 0);
        }
        neutronMesh.setMatrixAt(i, _m1);
      }
      protonMesh.instanceMatrix.needsUpdate = true;
      neutronMesh.instanceMatrix.needsUpdate = true;

      // Explorer mode orbitals & cyan electrons
      const showElectrons = st.mode === 'explorer';
      orbitalRings.forEach((ring, rIdx) => {
        ring.visible = showElectrons;
        ring.rotation.z = elapsed * (0.3 + rIdx * 0.12);
      });
      electronMeshes.forEach((em, idx) => {
        if (!showElectrons || idx >= st.electrons) {
          em.visible = false;
          return;
        }
        em.visible = true;
        const ringIdx = idx < 2 ? 0 : idx < 10 ? 1 : 2;
        const radius = [2.05, 2.55, 3.05][ringIdx];
        const ring = orbitalRings[ringIdx];
        const angle =
          elapsed * (1.35 - ringIdx * 0.22) + (idx * Math.PI * 2) / Math.max(1, st.electrons);
        _v2.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0).applyEuler(ring.rotation);
        em.position.copy(_v2);
      });

      // Decay Lab emitted particle + trajectory guide
      if (st.mode === 'decay' && st.splitProgress > 0.02) {
        emittedGroup.visible = true;
        trajectoryBeam.visible = true;
        const travel = 0.72 + st.splitProgress * 2.15;
        emittedGroup.position.set(travel, Math.sin(elapsed * 2.4) * 0.05, 0);
        emittedGroup.rotation.y = elapsed * 1.7;

        alphaCluster.visible = st.decayMode === 'alpha';
        betaOrb.visible = st.decayMode === 'beta-minus' || st.decayMode === 'beta-plus';
        gammaRing.visible = st.decayMode === 'gamma';

        if (st.decayMode === 'beta-minus') {
          betaOrbMat.emissive.setHex(0x00f2fe);
          betaHaloMat.color.setHex(0x00f2fe);
          beamMat.color.setHex(0x00f2fe);
        } else if (st.decayMode === 'beta-plus') {
          betaOrbMat.emissive.setHex(0x7f00ff);
          betaHaloMat.color.setHex(0xff5252);
          beamMat.color.setHex(0x7f00ff);
        } else if (st.decayMode === 'alpha') {
          beamMat.color.setHex(0xff5252);
        } else {
          beamMat.color.setHex(0x00f2fe);
        }

        if (st.decayMode === 'gamma') {
          const pulse = 1 + 0.42 * Math.sin(elapsed * 5.2);
          gammaRing.scale.setScalar(pulse);
        }
      } else {
        emittedGroup.visible = false;
        trajectoryBeam.visible = false;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', cancelAutoCam);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      controls.dispose();
      glowTex.dispose();
      shadowTex.dispose();
      floorTex.dispose();
      starGeo.dispose();
      starMat.dispose();
      nucleonGeo.dispose();
      protonMat.dispose();
      neutronMat.dispose();
      electronGeo.dispose();
      electronMat.dispose();
      ringMat.dispose();
      betaOrbMat.dispose();
      betaHaloMat.dispose();
      gammaRingMat.dispose();
      beamMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden bg-[#070A12] border border-[#00F2FE]/25 shadow-[0_0_28px_rgba(0,242,254,0.09)]`}
      aria-label="Simulateur 3D interactif du noyau atomique"
    />
  );
}
