import {
  WebGLRenderer,
  Scene,
  FogExp2,
  PerspectiveCamera,
  Group,
  BufferGeometry,
  BufferAttribute,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
  AdditiveBlending,
  LineSegments,
  LineBasicMaterial,
  Line,
  Color,
  Vector2,
  Vector3,
  Clock,
  Raycaster,
  ColorManagement,
  LinearSRGBColorSpace,
} from 'three';

import { state } from './state.js';

/* Additive point clouds were tuned without colour management. Keep three's
   newer sRGB pipeline out of the way so the palette renders as designed. */
ColorManagement.enabled = false;

const VERT = /* glsl */ `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (320.0 / max(-mv.z, 0.001));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 2.4);
    gl_FragColor = vec4(vColor, a);
  }
`;

const pointMaterial = () =>
  new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });

/* Palette */
const VOID = 0x070b14;
const TRAFFIC = 0x35e0d4;
const INSPECT = 0x7b6cf6;
const DETECT = 0xffb347;

/**
 * One alert per section, seeded at the depth where that section sits.
 * Descending the helix means passing the events in reading order.
 * Hovering reads the event. Clicking triages you to it.
 */
const ALERTS = [
  { id: 'profile', rule: 'profile.summary', sev: 'info' },
  { id: 'trace', rule: 'employment.trace', sev: 'info' },
  { id: 'toolchain', rule: 'toolchain.enumerated', sev: 'low' },
  { id: 'fieldwork', rule: 'project.stylometry', sev: 'medium' },
  { id: 'labs', rule: 'lab.interactive', sev: 'high' },
  { id: 'research', rule: 'publication.ieee', sev: 'medium' },
  { id: 'credentials', rule: 'credentials.verified', sev: 'low' },
  { id: 'handshake', rule: 'contact.syn', sev: 'high' },
];

export function initHelix(canvas) {
  const { reduce, mobile } = state;

  const COUNT = mobile ? 190 : 300;
  const RADIUS = 3.7;
  const DY = 0.29;
  const DTHETA = 0.163;
  const HEIGHT = COUNT * DY;
  const DUST = mobile ? 500 : 1400;
  const PACKETS = mobile ? 14 : 30;

  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, alpha: false });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(VOID, 1);

  const scene = new Scene();
  scene.fog = new FogExp2(VOID, 0.03);

  const camera = new PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 17);

  const helix = new Group();
  scene.add(helix);

  /* Position on a strand as a pure function of ring index — packets reuse this. */
  const ringY = (i) => HEIGHT * 0.5 - i * DY;
  const strandPoint = (i, side) => {
    const th = i * DTHETA + (side ? Math.PI : 0);
    return [Math.cos(th) * RADIUS, ringY(i), Math.sin(th) * RADIUS];
  };

  const alertRing = ALERTS.map((_, k) => Math.floor(((k + 0.6) / ALERTS.length) * COUNT));

  /* ---------------- strands ---------------- */
  const N = COUNT * 2;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const target = new Float32Array(N * 3);
  const start = new Float32Array(N * 3);

  const cTraffic = new Color(TRAFFIC);
  const cInspect = new Color(INSPECT);
  const cDetect = new Color(DETECT);

  const rungPos = [];
  const rungCol = [];
  const pathA = [];
  const pathB = [];

  for (let i = 0; i < COUNT; i++) {
    const [ax, y, az] = strandPoint(i, 0);
    const [bx, , bz] = strandPoint(i, 1);

    pathA.push(new Vector3(ax, y, az));
    pathB.push(new Vector3(bx, y, bz));

    const iA = i * 2;
    const iB = iA + 1;

    target.set([ax, y, az], iA * 3);
    target.set([bx, y, bz], iB * 3);

    for (const idx of [iA, iB]) {
      start[idx * 3 + 0] = (Math.random() - 0.5) * 46;
      start[idx * 3 + 1] = (Math.random() - 0.5) * HEIGHT * 1.5;
      start[idx * 3 + 2] = (Math.random() - 0.5) * 46;
    }

    colors.set([cTraffic.r, cTraffic.g, cTraffic.b], iA * 3);
    colors.set([cInspect.r, cInspect.g, cInspect.b], iB * 3);
    sizes[iA] = sizes[iB] = 1.5;

    if (i % 3 === 0) {
      rungPos.push(ax, y, az, bx, y, bz);
      const mix = new Color().copy(cTraffic).lerp(cInspect, 0.5);
      const f = 0.3 + 0.3 * Math.sin((i / COUNT) * Math.PI);
      rungCol.push(mix.r * f, mix.g * f, mix.b * f, mix.r * f, mix.g * f, mix.b * f);
    }
  }

  positions.set(start);

  const nodeGeo = new BufferGeometry();
  nodeGeo.setAttribute('position', new BufferAttribute(positions, 3));
  nodeGeo.setAttribute('color', new BufferAttribute(colors, 3));
  nodeGeo.setAttribute('size', new BufferAttribute(sizes, 1));
  helix.add(new Points(nodeGeo, pointMaterial()));

  const rungGeo = new BufferGeometry();
  rungGeo.setAttribute('position', new Float32BufferAttribute(rungPos, 3));
  rungGeo.setAttribute('color', new Float32BufferAttribute(rungCol, 3));
  const rungs = new LineSegments(
    rungGeo,
    new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    })
  );
  helix.add(rungs);

  const backbone = (path, color) => {
    const line = new Line(
      new BufferGeometry().setFromPoints(path),
      new LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    );
    helix.add(line);
    return line;
  };
  const strandA = backbone(pathA, TRAFFIC);
  const strandB = backbone(pathB, INSPECT);

  /* -------- alerts: their own cloud, so raycasting only tests these -------- */
  const aPos = new Float32Array(ALERTS.length * 2 * 3);
  const aCol = new Float32Array(ALERTS.length * 2 * 3);
  const aSize = new Float32Array(ALERTS.length * 2);

  alertRing.forEach((ring, k) => {
    const [ax, y, az] = strandPoint(ring, 0);
    const [bx, , bz] = strandPoint(ring, 1);
    aPos.set([ax, y, az], k * 6);
    aPos.set([bx, y, bz], k * 6 + 3);
    aCol.set([cDetect.r, cDetect.g, cDetect.b], k * 6);
    aCol.set([cDetect.r, cDetect.g, cDetect.b], k * 6 + 3);
    aSize[k * 2] = aSize[k * 2 + 1] = 3.6;
  });

  const alertGeo = new BufferGeometry();
  alertGeo.setAttribute('position', new BufferAttribute(aPos, 3));
  alertGeo.setAttribute('color', new BufferAttribute(aCol, 3));
  alertGeo.setAttribute('size', new BufferAttribute(aSize, 1));
  const alertPts = new Points(alertGeo, pointMaterial());
  alertPts.material.opacity = 0;
  helix.add(alertPts);

  /* ---------------- packets in flight ---------------- */
  const pPos = new Float32Array(PACKETS * 3);
  const pCol = new Float32Array(PACKETS * 3);
  const pSize = new Float32Array(PACKETS);
  const packets = [];

  for (let k = 0; k < PACKETS; k++) {
    const side = k % 2;
    packets.push({ side, t: Math.random(), speed: 0.045 + Math.random() * 0.05 });
    const c = side ? cInspect : cTraffic;
    pCol.set([Math.min(1, c.r * 1.6), Math.min(1, c.g * 1.6), Math.min(1, c.b * 1.6)], k * 3);
    pSize[k] = 2.3 + Math.random() * 1.1;
  }

  const packetGeo = new BufferGeometry();
  packetGeo.setAttribute('position', new BufferAttribute(pPos, 3));
  packetGeo.setAttribute('color', new BufferAttribute(pCol, 3));
  packetGeo.setAttribute('size', new BufferAttribute(pSize, 1));
  const packetPts = new Points(packetGeo, pointMaterial());
  packetPts.material.opacity = 0;
  helix.add(packetPts);

  /* ---------------- ambient dust ---------------- */
  const dp = new Float32Array(DUST * 3);
  const dc = new Float32Array(DUST * 3);
  const ds = new Float32Array(DUST);
  const dustColor = new Color(0x2a3a5c);

  for (let j = 0; j < DUST; j++) {
    dp[j * 3 + 0] = (Math.random() - 0.5) * 60;
    dp[j * 3 + 1] = (Math.random() - 0.5) * HEIGHT * 1.8;
    dp[j * 3 + 2] = (Math.random() - 0.5) * 60;
    dc.set([dustColor.r, dustColor.g, dustColor.b], j * 3);
    ds[j] = Math.random() * 1.2 + 0.3;
  }

  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute('position', new BufferAttribute(dp, 3));
  dustGeo.setAttribute('color', new BufferAttribute(dc, 3));
  dustGeo.setAttribute('size', new BufferAttribute(ds, 1));
  const dust = new Points(dustGeo, pointMaterial());
  scene.add(dust);

  /* ------------------------------------------------------------------ *
   * Alert inspection
   * ------------------------------------------------------------------ */
  const card = document.getElementById('alert');
  const ray = new Raycaster();
  ray.params.Points.threshold = 0.55;
  const ndc = new Vector2();
  const proj = new Vector3();
  let hovered = -1;
  let pointer = null;

  function setHover(k) {
    if (k === hovered) return;
    hovered = k;

    if (k < 0) {
      if (card) card.hidden = true;
      canvas.style.cursor = '';
      return;
    }
    if (card) {
      const sev = card.querySelector('.sev');
      card.hidden = false;
      sev.textContent = ALERTS[k].sev;
      sev.dataset.sev = ALERTS[k].sev;
      card.querySelector('.rule').textContent = ALERTS[k].rule;
    }
    canvas.style.cursor = 'pointer';
  }

  function placeCard() {
    if (hovered < 0 || !card) return;
    proj.fromBufferAttribute(alertGeo.attributes.position, hovered * 2);
    helix.localToWorld(proj);
    proj.project(camera);
    const x = (proj.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-proj.y * 0.5 + 0.5) * window.innerHeight;
    card.style.transform = `translate(${Math.round(x + 16)}px, ${Math.round(y - 14)}px)`;
  }

  if (!mobile && !reduce) {
    window.addEventListener(
      'pointermove',
      (e) => {
        pointer = { x: e.clientX, y: e.clientY };
      },
      { passive: true }
    );

    canvas.addEventListener('click', () => {
      if (hovered < 0) return;
      const el = document.getElementById(ALERTS[hovered].id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------------- loop ---------------- */
  const clock = new Clock();
  const accent = { ...state.accentTarget };
  const fogColor = new Color(VOID);
  const tint = new Color();
  let assembly = 0;
  let scrollSmooth = 0;
  let mx = 0;
  let my = 0;
  let tmx = 0;
  let tmy = 0;

  if (!reduce && !mobile) {
    window.addEventListener(
      'pointermove',
      (e) => {
        tmx = e.clientX / window.innerWidth - 0.5;
        tmy = e.clientY / window.innerHeight - 0.5;
      },
      { passive: true }
    );
  }

  function frame() {
    requestAnimationFrame(frame);

    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);

    if (assembly < 1) {
      assembly = Math.min(1, assembly + dt / (reduce ? 0.01 : 2.1));
      const e = 1 - (1 - assembly) ** 3;
      const p = nodeGeo.attributes.position.array;
      for (let i = 0; i < p.length; i++) {
        p[i] = start[i] + (target[i] - start[i]) * e;
      }
      nodeGeo.attributes.position.needsUpdate = true;
      rungs.material.opacity = e * 0.5;
      strandA.material.opacity = e * 0.32;
      strandB.material.opacity = e * 0.32;
      alertPts.material.opacity = e;
      packetPts.material.opacity = e;
    }

    /* Packets travel the strands. */
    if (!reduce) {
      const pp = packetGeo.attributes.position.array;
      for (let k = 0; k < packets.length; k++) {
        const pk = packets[k];
        pk.t += pk.speed * dt;
        if (pk.t > 1) pk.t -= 1;
        const [x, y, z] = strandPoint(pk.t * (COUNT - 1), pk.side);
        pp[k * 3 + 0] = x;
        pp[k * 3 + 1] = y;
        pp[k * 3 + 2] = z;
      }
      packetGeo.attributes.position.needsUpdate = true;
    }

    /* Alerts breathe; the one nearest the camera breathes hardest. */
    if (!reduce) {
      const sz = alertGeo.attributes.size.array;
      for (let k = 0; k < ALERTS.length; k++) {
        const near = 1 - Math.min(1, Math.abs(ringY(alertRing[k]) - camera.position.y) / 14);
        const pulse = 1 + (0.5 + 0.9 * near) * (0.5 + 0.5 * Math.sin(t * 2.1 + k));
        sz[k * 2] = sz[k * 2 + 1] = 3.6 * pulse * (hovered === k ? 1.7 : 1);
      }
      alertGeo.attributes.size.needsUpdate = true;
    }

    /* Descend the capture. */
    scrollSmooth += (state.scroll - scrollSmooth) * (reduce ? 1 : 0.07);
    const camY = HEIGHT * 0.5 - 4 - scrollSmooth * (HEIGHT - 8);

    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;

    camera.position.set(mx * 2.6, camY + my * -1.6, 17 - scrollSmooth * 6.5);
    camera.lookAt(0, camY - 1.2, 0);

    if (!reduce) {
      helix.rotation.y = t * 0.045 + scrollSmooth * 2.4;
      dust.rotation.y = -t * 0.012;
    }

    if (pointer) {
      ndc.x = (pointer.x / window.innerWidth) * 2 - 1;
      ndc.y = -(pointer.y / window.innerHeight) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(alertPts, false)[0];
      setHover(hit ? Math.floor(hit.index / 2) : -1);
      placeCard();
    }

    accent.r += (state.accentTarget.r - accent.r) * 0.04;
    accent.g += (state.accentTarget.g - accent.g) * 0.04;
    accent.b += (state.accentTarget.b - accent.b) * 0.04;

    document.documentElement.style.setProperty(
      '--accent',
      `rgb(${Math.round(accent.r)},${Math.round(accent.g)},${Math.round(accent.b)})`
    );

    tint.setRGB(accent.r / 255, accent.g / 255, accent.b / 255);
    fogColor.setHex(VOID).lerp(tint, 0.045);
    scene.fog.color.copy(fogColor);
    renderer.setClearColor(fogColor, 1);

    renderer.render(scene, camera);
  }

  frame();
}
