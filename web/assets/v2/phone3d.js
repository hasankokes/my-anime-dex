// 3D hero phone: the app's own UI playing on a glossy phone you can spin.
// Loaded on demand by main.js; throws if WebGL is unavailable so the CSS phone stays.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const W = 1.0, H = 2.1, D = 0.1, R = 0.14; // phone body
const SW = 0.9, SH = SW * (1174 / 540), SR = 0.1; // screen, same aspect as the captures

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 12);
  // ShapeGeometry UVs are in shape units; map them to 0..1 so textures fill the rect
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  return g;
}

export async function mountPhone(host, { videoSrc, logoSrc, pointer, onReady }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'pan-y';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 6.4);

  const phone = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.add(phone);
  scene.add(tilt);

  // body: brushed dark titanium
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x1b1c1f, metalness: 0.85, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2 });
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 8, R), bodyMat));

  // front glass + screen
  const glass = new THREE.Mesh(roundedRect(W - 0.03, H - 0.03, R - 0.015), new THREE.MeshPhysicalMaterial({ color: 0x030303, roughness: 0.05, clearcoat: 1, metalness: 0 }));
  glass.position.z = D / 2 + 0.001;
  phone.add(glass);

  const video = document.createElement('video');
  video.muted = true; video.loop = true; video.playsInline = true; video.setAttribute('playsinline', ''); video.crossOrigin = 'anonymous';
  video.src = videoSrc;
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(roundedRect(SW, SH, SR), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.z = D / 2 + 0.002;
  phone.add(screen);

  // a faint glass sheen that slides as the phone turns
  const sheen = new THREE.Mesh(roundedRect(SW, SH, SR), new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.12, roughness: 0, metalness: 0, clearcoat: 1, color: 0xffffff }));
  sheen.position.z = D / 2 + 0.003;
  phone.add(sheen);

  // back: matte panel, camera bump and the app logo
  const back = new THREE.Mesh(roundedRect(W - 0.03, H - 0.03, R - 0.015), new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.55, metalness: 0.2, clearcoat: 0.6 }));
  back.position.z = -D / 2 - 0.001; back.rotation.y = Math.PI;
  phone.add(back);
  const bump = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.4, 0.04, 4, 0.08), bodyMat);
  bump.position.set(0.22, 0.76, -D / 2 - 0.02);
  phone.add(bump);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.4, clearcoat: 1 });
  const ringMat = new THREE.MeshPhysicalMaterial({ color: 0x3a3b3f, roughness: 0.25, metalness: 1 });
  for (const [x, y] of [[0.13, 0.85], [0.13, 0.67], [0.31, 0.76]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 32), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, y, -D / 2 - 0.05); phone.add(ring);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.032, 32), lensMat);
    lens.rotation.x = Math.PI / 2; lens.position.set(x, y, -D / 2 - 0.052); phone.add(lens);
  }
  new THREE.TextureLoader().load(logoSrc, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false }));
    logo.position.set(0, -0.05, -D / 2 - 0.003); logo.rotation.y = Math.PI;
    phone.add(logo);
  });

  // side buttons
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x26272b, metalness: 1, roughness: 0.3 });
  for (const [x, y, h] of [[-W / 2 - 0.005, 0.5, 0.12], [-W / 2 - 0.005, 0.28, 0.2], [-W / 2 - 0.005, 0.02, 0.2], [W / 2 + 0.005, 0.36, 0.3]]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.03, h, 0.045, 2, 0.012), btnMat);
    b.position.set(x, y, 0); phone.add(b);
  }

  // light: soft key + yellow rim from behind (brand glow)
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.PointLight(0xfacc15, 14, 8, 1.6); rim.position.set(-1.2, 0.6, -1.4); scene.add(rim);
  const rim2 = new THREE.PointLight(0xf59e0b, 8, 8, 1.6); rim2.position.set(1.4, -0.8, -1.2); scene.add(rim2);

  // ---- sizing ----
  const fit = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole phone in frame on narrow screens
    const needH = H * 1.18, needW = W * (camera.aspect < 1 ? 1.8 : 2.3);
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const distH = needH / 2 / Math.tan(vFov / 2);
    const distW = needW / 2 / (Math.tan(vFov / 2) * camera.aspect);
    camera.position.z = Math.max(distH, distW);
    camera.updateProjectionMatrix();
  };
  fit();
  new ResizeObserver(fit).observe(host);

  // ---- interaction: drag to spin with inertia, tilt toward the cursor ----
  let spin = 0, vel = 0, dragging = false, lastX = 0, lastT = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastT = performance.now(); vel = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    spin += dx * 0.012;
    vel = (dx * 0.012) / Math.max(8, now - lastT) * 16;
    lastX = e.clientX; lastT = now;
  });
  const release = () => { dragging = false; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // ---- loop (paused off screen / hidden tab) ----
  let visible = true, raf = 0, ready = false;
  const clock = new THREE.Clock();
  const heroEl = host.closest('.hero');
  const frame = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    if (!dragging) {
      spin += vel; vel *= 0.94;
      if (Math.abs(vel) < 0.002) {
        // settle back to the nearest front-facing turn
        const target = Math.round(spin / (Math.PI * 2)) * Math.PI * 2;
        spin += (target - spin) * 0.05;
      }
    }
    const sway = Math.sin(t * 0.6) * 0.22 - 0.18;
    phone.rotation.y = spin + sway;
    phone.position.y = Math.sin(t * 1.1) * 0.05;
    const sp = heroEl ? Math.min(1, Math.max(0, window.scrollY / heroEl.offsetHeight)) : 0;
    tilt.rotation.x += ((pointer.ny * -0.18 + 0.1 + sp * 0.5) - tilt.rotation.x) * 0.08;
    tilt.rotation.y += ((pointer.nx * 0.3) - tilt.rotation.y) * 0.08;
    tilt.position.y = sp * 0.8;
    tilt.scale.setScalar(1 - sp * 0.12);
    sheen.material.opacity = 0.05 + Math.max(0, Math.sin(phone.rotation.y + 0.6)) * 0.12;
    renderer.render(scene, camera);
    if (!ready && video.readyState >= 2) { ready = true; onReady?.(); }
    raf = requestAnimationFrame(frame);
  };
  const resume = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) { video.play().catch(() => {}); resume(); } else video.pause();
  }).observe(host);
  document.addEventListener('visibilitychange', resume);

  await video.play().catch(() => {});
  resume();
}
