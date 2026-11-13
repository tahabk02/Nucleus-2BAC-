import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Segre3DCanvasProps {
  selectedZ: number;
  selectedN: number;
  heightClass?: string;
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export function Segre3DCanvas({
  selectedZ,
  selectedN,
  heightClass = 'h-[360px]',
}: Segre3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef({ z: selectedZ, n: selectedN });
  selectedRef.current = { z: selectedZ, n: selectedN };

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
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a12);
    scene.fog = new THREE.FogExp2(0x070a12, 0.045);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(5.4, 4.6, 5.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.5;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0, 0.2, 0);

    const hemi = new THREE.HemisphereLight(0x00f2fe, 0x0b0f19, 1.0);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xf3f4f6, 2.0);
    key.position.set(6, 9, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7f00ff, 1.4);
    rim.position.set(-5, 4, -5);
    scene.add(rim);

    // Coordinate base grid (Z along X, N along -Z)
    const gridHelper = new THREE.GridHelper(6.4, 16, 0x00f2fe, 0x1e293b);
    gridHelper.position.y = -0.02;
    scene.add(gridHelper);

    // N = Z diagonal bisector line
    const bisectorGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-3.0, 0.02, 3.0),
      new THREE.Vector3(3.0, 0.02, -0.8),
    ]);
    const bisectorMat = new THREE.LineBasicMaterial({
      color: 0xf3f4f6,
      transparent: true,
      opacity: 0.55,
    });
    scene.add(new THREE.Line(bisectorGeo, bisectorMat));

    // Build Segré scatter pillars
    const points: { z: number; n: number; h: number; color: number }[] = [];
    for (let z = 2; z <= 94; z += 2) {
      const nStable = Math.round(z + 0.0062 * z * z);
      if (z <= 82) {
        points.push({ z, n: nStable, h: 1.05, color: 0x00f2fe }); // Stable ridge
        points.push({ z, n: nStable + 3, h: 0.55, color: 0x7f00ff }); // Beta-
        points.push({ z, n: nStable + 6, h: 0.35, color: 0x7f00ff });
        if (z > 4) {
          points.push({ z, n: Math.max(1, nStable - 3), h: 0.55, color: 0xff5252 }); // Beta+
          points.push({ z, n: Math.max(1, nStable - 5), h: 0.35, color: 0xff5252 });
        }
      } else {
        points.push({ z, n: nStable, h: 0.72, color: 0xf59e0b }); // Alpha heavy
        points.push({ z, n: nStable + 4, h: 0.45, color: 0xf59e0b });
      }
    }

    const pillarGeo = new THREE.BoxGeometry(0.11, 1, 0.11);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.35,
    });
    const instanced = new THREE.InstancedMesh(pillarGeo, pillarMat, points.length);
    instanced.frustumCulled = false;

    const mapX = (z: number) => ((z / 100) - 0.5) * 6.0;
    const mapZ = (n: number) => (0.5 - (n / 155)) * 6.0;

    points.forEach((pt, idx) => {
      _p.set(mapX(pt.z), pt.h * 0.5, mapZ(pt.n));
      _s.set(1, pt.h, 1);
      _m.compose(_p, _q.identity(), _s);
      instanced.setMatrixAt(idx, _m);
      _c.setHex(pt.color);
      instanced.setColorAt(idx, _c);
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    scene.add(instanced);

    // Selected Isotope Beacon Ring + Vertical Pillar
    const beaconGroup = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.025, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0xf3f4f6 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1.55, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff5252,
        transparent: true,
        opacity: 0.85,
      })
    );
    beam.position.y = 0.78;
    beaconGroup.add(ring, beam);
    scene.add(beaconGroup);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
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
      const { z, n } = selectedRef.current;

      const tx = mapX(z);
      const tz = mapZ(n);
      beaconGroup.position.x = THREE.MathUtils.damp(beaconGroup.position.x, tx, 7, dt);
      beaconGroup.position.z = THREE.MathUtils.damp(beaconGroup.position.z, tz, 7, dt);
      ring.scale.setScalar(1 + 0.14 * Math.sin(elapsed * 4));

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
      controls.dispose();
      bisectorGeo.dispose();
      bisectorMat.dispose();
      pillarGeo.dispose();
      pillarMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full ${heightClass} rounded-xl overflow-hidden bg-[#070A12] border border-[#00F2FE]/22`}
      aria-label="Vue 3D de la vallée de stabilité de Segré"
    />
  );
}
