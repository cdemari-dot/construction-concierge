"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";

// A procedural 3D construction site rendered with physically based materials: a glass-and-concrete tower that rises
// floor by floor beside a working tower crane, at golden hour, with soft shadows, reflections and drifting dust.
// Built entirely in code (no model files). Lazy-loaded; falls back to a still gradient if WebGL is unavailable
// or the visitor prefers reduced motion.

const FLOORS = 14;
const FLOOR_H = 3.3;
const W = 16;
const D = 11;

function noiseTexture(THREEm: typeof THREE, base: [number, number, number], spread: number, size = 256, blotch = 0.08) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const n = (Math.random() - 0.5) * spread;
    const x = i % size;
    const y = (i / size) | 0;
    const b = Math.sin(x * 0.045) * Math.cos(y * 0.037) * blotch * 255;
    img.data[i * 4] = Math.max(0, Math.min(255, base[0] + n + b));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + n + b));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + n + b));
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREEm.CanvasTexture(c);
  t.wrapS = t.wrapT = THREEm.RepeatWrapping;
  t.colorSpace = THREEm.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function ConstructionScene() {
  const mount = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      let T: typeof THREE;
      let RoomEnvironment: typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment;
      try {
        T = await import("three");
        ({ RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js"));
      } catch {
        setFailed(true);
        return;
      }
      if (disposed) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      } catch {
        setFailed(true);
        return;
      }
      const small = el.clientWidth < 700;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";

      const scene = new T.Scene();
      const horizon = new T.Color(0xf0b987);
      // Golden-hour sky: a big inverted sphere with a vertical gradient.
      const skyMat = new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new T.Color(0x16314f) }, mid: { value: new T.Color(0x9a7a86) }, low: { value: horizon } },
        vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low; void main(){ float h = clamp(vP.y*1.4+0.1,0.0,1.0); vec3 c = mix(low, mid, smoothstep(0.0,0.35,h)); c = mix(c, top, smoothstep(0.3,1.0,h)); gl_FragColor = vec4(c,1.0); }",
      });
      scene.add(new T.Mesh(new T.SphereGeometry(400, 32, 16), skyMat));
      scene.fog = new T.Fog(horizon, 90, 260);

      const pmrem = new T.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.75;

      const camera = new T.PerspectiveCamera(36, el.clientWidth / el.clientHeight, 0.5, 600);

      const sun = new T.DirectionalLight(0xffc58a, 3.2);
      sun.position.set(-48, 38, 34);
      sun.castShadow = true;
      sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
      const sc = sun.shadow.camera;
      sc.left = -50;
      sc.right = 50;
      sc.top = 60;
      sc.bottom = -30;
      sc.near = 10;
      sc.far = 160;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.04;
      scene.add(sun);
      scene.add(new T.HemisphereLight(0x9bbcf0, 0x8a6a4a, 0.8));

      // ---------- materials ----------
      const concreteTex = noiseTexture(T, [168, 164, 156], 46, 256, 0.06);
      concreteTex.repeat.set(3, 2);
      const concrete = new T.MeshStandardMaterial({ map: concreteTex, roughness: 0.92, metalness: 0.0, bumpMap: concreteTex, bumpScale: 0.6 });
      const darkConcrete = new T.MeshStandardMaterial({ map: concreteTex, color: 0x9a968c, roughness: 0.95 });
      const steel = new T.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.55, metalness: 0.85 });
      const craneYellow = new T.MeshStandardMaterial({ color: 0xf2b300, roughness: 0.42, metalness: 0.35 });
      const craneDark = new T.MeshStandardMaterial({ color: 0x23262b, roughness: 0.6, metalness: 0.6 });
      const glass = new T.MeshPhysicalMaterial({
        color: 0x8ec3d6,
        metalness: 0.15,
        roughness: 0.04,
        transparent: true,
        opacity: 0.5,
        envMapIntensity: 1.9,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        side: T.DoubleSide,
      });
      const mullionMat = new T.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.5, metalness: 0.8 });

      // ---------- ground ----------
      const groundTex = noiseTexture(T, [104, 92, 78], 34, 512, 0.02);
      groundTex.repeat.set(70, 70);
      const ground = new T.Mesh(new T.PlaneGeometry(500, 500), new T.MeshStandardMaterial({ map: groundTex, roughness: 1, color: 0xb8a58c }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      // Concrete pad under the tower.
      const pad = new T.Mesh(new T.BoxGeometry(W + 10, 0.5, D + 10), concrete);
      pad.position.y = 0.25;
      pad.receiveShadow = true;
      scene.add(pad);

      // ---------- tower ----------
      const tower = new T.Group();
      scene.add(tower);
      const baseY = 0.5;
      const slabGeo = new T.BoxGeometry(W, 0.36, D);
      const colGeo = new T.BoxGeometry(0.62, FLOOR_H - 0.36, 0.62);
      const colPos: [number, number][] = [];
      for (let i = 0; i <= 4; i++) for (const z of [-D / 2 + 0.5, D / 2 - 0.5]) colPos.push([-W / 2 + 0.5 + (i * (W - 1)) / 4, z]);
      colPos.push([-W / 2 + 0.5, 0], [W / 2 - 0.5, 0]);

      type Floor = { group: THREE.Group; slab: THREE.Mesh; cols: THREE.Mesh[]; skin: THREE.Group };
      const floors: Floor[] = [];
      // Vertical mullions for each floor facade.
      const perim = (W + D) * 2;
      const mullionGeo = new T.BoxGeometry(0.09, FLOOR_H - 0.36, 0.09);
      for (let f = 0; f < FLOORS; f++) {
        const group = new T.Group();
        group.position.y = baseY + f * FLOOR_H;
        const slab = new T.Mesh(slabGeo, concrete);
        slab.position.y = 0.18;
        slab.castShadow = slab.receiveShadow = true;
        group.add(slab);
        const cols = colPos.map(([x, z]) => {
          const c = new T.Mesh(colGeo, darkConcrete);
          c.position.set(x, 0.36 + (FLOOR_H - 0.36) / 2, z);
          c.castShadow = c.receiveShadow = true;
          group.add(c);
          return c;
        });
        const skin = new T.Group();
        const bandH = FLOOR_H - 0.36;
        const mk = (w: number, x: number, z: number, ry: number) => {
          const p = new T.Mesh(new T.PlaneGeometry(w, bandH), glass);
          p.position.set(x, 0.36 + bandH / 2, z);
          p.rotation.y = ry;
          skin.add(p);
        };
        mk(W, 0, D / 2, 0);
        mk(W, 0, -D / 2, Math.PI);
        mk(D, W / 2, 0, Math.PI / 2);
        mk(D, -W / 2, 0, -Math.PI / 2);
        const n = Math.round(perim / 1.7);
        const inst = new T.InstancedMesh(mullionGeo, mullionMat, n);
        const m = new T.Matrix4();
        for (let i = 0; i < n; i++) {
          const t = (i / n) * perim;
          let x: number, z: number;
          if (t < W) (x = -W / 2 + t), (z = D / 2);
          else if (t < W + D) (x = W / 2), (z = D / 2 - (t - W));
          else if (t < 2 * W + D) (x = W / 2 - (t - W - D)), (z = -D / 2);
          else (x = -W / 2), (z = -D / 2 + (t - 2 * W - D));
          m.setPosition(x, 0.36 + bandH / 2, z);
          inst.setMatrixAt(i, m);
        }
        skin.add(inst);
        group.add(skin);
        tower.add(group);
        floors.push({ group, slab, cols, skin });
      }
      // Roof detail: parapet + mechanical box that appear with the last floor.
      const roof = new T.Group();
      roof.position.y = baseY + FLOORS * FLOOR_H;
      const parapet = new T.Mesh(new T.BoxGeometry(W + 0.3, 0.9, D + 0.3), concrete);
      parapet.position.y = 0.45;
      parapet.castShadow = true;
      const mech = new T.Mesh(new T.BoxGeometry(6, 2.6, 4), steel);
      mech.position.set(-2, 2.2, 0);
      mech.castShadow = true;
      roof.add(parapet, mech);
      tower.add(roof);

      // ---------- tower crane ----------
      const crane = new T.Group();
      crane.position.set(W / 2 + 7, 0, -D / 2 - 1.5);
      scene.add(crane);
      const mastH = FLOORS * FLOOR_H + 14;
      const legs: [number, number][] = [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]];
      for (const [x, z] of legs) {
        const leg = new T.Mesh(new T.BoxGeometry(0.22, mastH, 0.22), craneYellow);
        leg.position.set(x, mastH / 2, z);
        leg.castShadow = true;
        crane.add(leg);
      }
      const brace = new T.BoxGeometry(0.1, 2.9, 0.1);
      for (let y = 0; y < mastH - 2; y += 2.4) {
        for (const [a, b, ry] of [[0, 0.9, 0], [0, -0.9, 0], [0.9, 0, Math.PI / 2], [-0.9, 0, Math.PI / 2]] as [number, number, number][]) {
          const d = new T.Mesh(brace, craneYellow);
          d.position.set(a, y + 1.2, b);
          d.rotation.set(0, ry, 0.62 * (((y / 2.4) | 0) % 2 ? 1 : -1));
          crane.add(d);
        }
        const ring = new T.Mesh(new T.BoxGeometry(1.9, 0.1, 0.1), craneYellow);
        ring.position.set(0, y, 0.9);
        crane.add(ring);
        const ring2 = ring.clone();
        ring2.position.z = -0.9;
        crane.add(ring2);
      }
      const slew = new T.Group();
      slew.position.y = mastH;
      crane.add(slew);
      const cab = new T.Mesh(new T.BoxGeometry(1.8, 1.7, 1.6), craneDark);
      cab.position.set(-0.4, 0.9, 1.3);
      cab.castShadow = true;
      const cabGlass = new T.Mesh(new T.BoxGeometry(0.1, 1.0, 1.2), glass);
      cabGlass.position.set(0.55, 1.05, 1.3);
      const jibLen = 34;
      const jib = new T.Mesh(new T.BoxGeometry(jibLen, 0.7, 1.3), craneYellow);
      jib.position.set(-jibLen / 2 + 6, 1.2, 0);
      jib.castShadow = true;
      const counterLen = 11;
      const counter = new T.Mesh(new T.BoxGeometry(counterLen, 0.7, 1.3), craneYellow);
      counter.position.set(counterLen / 2 + 0.6, 1.2, 0);
      const weight = new T.Mesh(new T.BoxGeometry(2.6, 2.4, 1.6), craneDark);
      weight.position.set(counterLen - 1.2, 0.6, 0);
      weight.castShadow = true;
      const apex = new T.Mesh(new T.CylinderGeometry(0.1, 0.5, 6, 6), craneYellow);
      apex.position.set(0, 4.3, 0);
      const tie1 = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 22, 5), steel);
      tie1.position.set(-8.6, 3.0, 0);
      tie1.rotation.z = Math.atan2(-6.6, 22) + Math.PI / 2 + 0.3;
      const tie2 = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 10, 5), steel);
      tie2.position.set(5.2, 3.7, 0);
      tie2.rotation.z = -1.18;
      slew.add(cab, cabGlass, jib, counter, weight, apex, tie1, tie2);
      const trolley = new T.Group();
      const tbody = new T.Mesh(new T.BoxGeometry(1.2, 0.5, 1.5), craneDark);
      trolley.add(tbody);
      trolley.position.set(-18, 0.55, 0);
      slew.add(trolley);
      const cable = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 4), steel);
      cable.position.y = -0.5;
      trolley.add(cable);
      const hook = new T.Mesh(new T.BoxGeometry(0.6, 0.9, 0.6), craneYellow);
      trolley.add(hook);
      const load = new T.Mesh(new T.BoxGeometry(2.4, 0.5, 1.4), new T.MeshStandardMaterial({ color: 0xb98a55, roughness: 0.8 }));
      trolley.add(load);
      const beacon = new T.PointLight(0xff5533, 6, 18);
      beacon.position.set(0, 6.7, 0);
      slew.add(beacon);

      // ---------- site props ----------
      const fenceMat = new T.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.5, metalness: 0.7, transparent: true, opacity: 0.55 });
      const fenceR = 26;
      for (let i = -fenceR; i <= fenceR; i += 2) {
        for (const [x, z] of [[i, fenceR * 0.72], [i, -fenceR * 0.72]] as [number, number][]) {
          const post = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.2, 6), steel);
          post.position.set(x, 1.1, z);
          scene.add(post);
        }
      }
      for (const z of [fenceR * 0.72, -fenceR * 0.72]) {
        const panel = new T.Mesh(new T.PlaneGeometry(fenceR * 2, 2), fenceMat);
        panel.position.set(0, 1.1, z);
        scene.add(panel);
      }
      const bin = new T.Mesh(new T.BoxGeometry(6, 1.9, 2.4), new T.MeshStandardMaterial({ color: 0x2f6f5e, roughness: 0.5, metalness: 0.5 }));
      bin.position.set(-17, 1.45, 11);
      bin.rotation.y = 0.18;
      bin.castShadow = bin.receiveShadow = true;
      scene.add(bin);
      const pile = new T.Mesh(new T.ConeGeometry(3.2, 2.1, 12), new T.MeshStandardMaterial({ map: groundTex, color: 0x9b9486, roughness: 1 }));
      pile.position.set(15, 1.05, 12);
      pile.castShadow = true;
      scene.add(pile);
      const palletMat = new T.MeshStandardMaterial({ color: 0xa6804d, roughness: 0.9 });
      for (let i = 0; i < 6; i++) {
        const stack = new T.Mesh(new T.BoxGeometry(2.4, 0.45 * (2 + (i % 3)), 1.6), palletMat);
        stack.position.set(-12 + (i % 3) * 2.8, 0.5 + 0.225 * (2 + (i % 3)), 14 + ((i / 3) | 0) * 2);
        stack.castShadow = stack.receiveShadow = true;
        scene.add(stack);
      }
      const coneMat = new T.MeshStandardMaterial({ color: 0xff6a1f, roughness: 0.6 });
      for (let i = 0; i < 7; i++) {
        const cone = new T.Mesh(new T.ConeGeometry(0.28, 0.75, 10), coneMat);
        cone.position.set(-8 + i * 2.1, 0.37, 18.5);
        cone.castShadow = true;
        scene.add(cone);
      }

      // Drifting dust motes catch the low sun.
      const dustN = small ? 220 : 520;
      const dustGeo = new T.BufferGeometry();
      const dp = new Float32Array(dustN * 3);
      for (let i = 0; i < dustN; i++) {
        dp[i * 3] = (Math.random() - 0.5) * 120;
        dp[i * 3 + 1] = Math.random() * 40;
        dp[i * 3 + 2] = (Math.random() - 0.5) * 120;
      }
      dustGeo.setAttribute("position", new T.BufferAttribute(dp, 3));
      const dust = new T.Points(dustGeo, new T.PointsMaterial({ color: 0xffe2b8, size: 0.22, transparent: true, opacity: 0.45, depthWrite: false }));
      scene.add(dust);

      // ---------- animation ----------
      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      const ease = (x: number) => 1 - Math.pow(1 - x, 3);
      const start = performance.now();
      const BUILD_MS = reduce ? 1 : 9000;
      let visible = true;
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
      io.observe(el);

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden) return;
        const t = (now - start) / 1000;
        const build = Math.min(1, (now - start) / BUILD_MS);
        const p = ease(build) * (FLOORS + 0.999);
        floors.forEach((f, i) => {
          const k = Math.max(0, Math.min(1, p - i));
          f.group.visible = k > 0;
          f.slab.scale.y = Math.max(0.001, Math.min(1, k * 3));
          const colK = Math.max(0, Math.min(1, (k - 0.15) * 1.6));
          f.cols.forEach((c) => {
            c.scale.y = Math.max(0.001, colK);
            c.position.y = 0.36 + ((FLOOR_H - 0.36) / 2) * colK;
          });
          f.skin.visible = k > 0.7;
          f.skin.scale.y = Math.max(0.001, Math.min(1, (k - 0.7) * 3.3));
          f.skin.position.y = 0;
        });
        roof.visible = p > FLOORS - 0.1;

        // Crane: slow swing, trolley in and out, load raised alongside the tower as it grows.
        const topY = baseY + Math.min(FLOORS, p) * FLOOR_H;
        slew.rotation.y = Math.sin(t * 0.18) * 0.7 - 0.55;
        trolley.position.x = -16 + Math.sin(t * 0.33 + 1) * 6;
        const drop = Math.max(2, mastH - topY - 1.5 - Math.sin(t * 0.5) * 3);
        cable.scale.y = drop;
        cable.position.y = -drop / 2;
        hook.position.y = -drop - 0.4;
        load.position.y = -drop - 1.2;
        beacon.intensity = 4 + Math.sin(t * 5) * 3;

        const pos = dust.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < dustN; i++) {
          pos.array[i * 3] += Math.sin(t * 0.3 + i) * 0.004 + 0.003;
          pos.array[i * 3 + 1] += Math.cos(t * 0.2 + i * 1.3) * 0.003;
          if (pos.array[i * 3] > 60) pos.array[i * 3] = -60;
        }
        pos.needsUpdate = true;

        // Camera: slow orbit, a little mouse parallax, and it rises with the building.
        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;
        const scrollK = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
        const az = (reduce ? 0 : t * 0.045) - 0.62 + mouse.x * 0.16 + scrollK * 0.5;
        const rad = (el.clientWidth < 700 ? 124 : 96) - scrollK * 14;
        const camY = 15 + Math.min(1, build) * 16 + mouse.y * -4 + scrollK * 10;
        camera.position.set(Math.sin(az) * rad, camY, Math.cos(az) * rad);
        camera.lookAt(0, 8 + Math.min(1, build) * 13 - scrollK * 4, 0);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(frame);

      const frameCamera = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        camera.aspect = w / h;
        if (w > 980) camera.setViewOffset(w, h, -w * 0.2, h * 0.03, w, h);
        else camera.clearViewOffset();
        camera.updateProjectionMatrix();
      };
      frameCamera();
      const onResize = () => {
        renderer.setSize(el.clientWidth, el.clientHeight);
        frameCamera();
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(el);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose?.();
        });
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (disposed) cleanup();
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={mount} className={`scene3d${failed ? " failed" : ""}`} aria-hidden="true" />;
}
