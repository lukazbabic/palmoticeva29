// Palmotićeva 29 · interactive 3D viewer
// Built into viewer.bundle.js (classic script). Models load from ./models/<key>.js as plain scripts. and exposes a small API on window.P29Viewer.
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const BASE_POINTS = {
  'Kancelarija 01': [8.4, .2, -6.8], 'Kancelarija 02': [2.8, .2, -6.5], 'Kancelarija 03': [2.0, .2, -2.0],
  'Sala za sastanke': [5.93, .2, -2.4], 'Čekaonica': [9.5, .2, -2.2], 'Kantina': [13.0, .2, -2.4],
  'Kuhinja': [12.7, .2, -8.0], 'Toalet': [12.5, .2, -5.7]
};
const ROOM_ID = {
  'Kancelarija 01': 'office-01', 'Kancelarija 02': 'office-02', 'Kancelarija 03': 'office-03',
  'Sala za sastanke': 'meeting', 'Čekaonica': 'waiting', 'Kantina': 'canteen', 'Kuhinja': 'kitchen',
  'Toalet': 'bathroom', 'Meeting room': 'meeting-large', 'Shared lounge': 'lounge',
  'Brainstorming room': 'lower-level', 'East storage': 'storage'
};
const VIEWS = {
  'office-01': [[9.93, 1.65, -5.16], [8.51, 1.2, -7.6]], 'office-02': [[5, 1.65, -4.84], [2.49, 1.2, -7.31]],
  'office-03': [[3.89, 1.65, -.31], [1.33, 1.2, -2.56]], 'meeting': [[7.13, 1.65, -4.07], [5.73, 1.2, -1.6]],
  'waiting': [[8.49, 1.65, -.22], [10.44, 1.25, -2.67]], 'canteen': [[12.04, 1.65, -4.47], [13.11, 1.2, -1.09]],
  'kitchen': [[10.71, 1.65, -8.51], [13.04, 1.3, -7.42]], 'bathroom': [[11.82, 1.6, -4.96], [12.93, 1.2, -6.31]],
  'lower-level': [[.42, 1.65, -4.24], [3.18, 1.2, -6.96]], 'meeting-large': [[3.89, 1.65, -.31], [1.33, 1.2, -2.56]],
  'lounge': [[7.13, 1.65, -4.07], [5.73, 1.2, -1.6]], 'storage': [[3.2, 1.6, -5.2], [5.2, 1.1, -6.6]]
};

const host = document.getElementById('viewer-canvas');
const hotLayer = document.getElementById('viewer-hotspots');
const emit = (name, detail) => window.dispatchEvent(new CustomEvent('p29:' + name, { detail }));

const scene = new THREE.Scene();
scene.background = new THREE.Color('#efeadf');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false }); }
catch (e) { emit('error', { key: null, message: 'WebGL is not available: ' + e.message }); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(host.clientWidth, host.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.07;
host.prepend(renderer.domElement);

const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, .025, 150);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.minDistance = .25; controls.maxDistance = 55;
controls.maxPolarAngle = Math.PI * .49;
// Do not hijack page scrolling until the visitor engages with the model.
controls.enableZoom = false;
renderer.domElement.addEventListener('pointerdown', () => { controls.enableZoom = true; host.classList.add('engaged'); });
host.addEventListener('mouseleave', () => { controls.enableZoom = false; host.classList.remove('engaged'); });

scene.add(new THREE.HemisphereLight(0xffffff, 0xb6baa9, 2.5));
for (const [x, y, z, p] of [[-8, 18, 5, 2.2], [18, 15, -12, 1.7], [6, 10, 18, .9]]) {
  const l = new THREE.DirectionalLight(0xffffff, p); l.position.set(x, y, z); scene.add(l);
}

let model = null, current = null, groups = {}, points = {}, hotspots = [], token = 0, mode = 'cutaway', focusRoom = null;
const cache = {};
const isBasement = () => current === 'B26A';

function loadScript(src) {
  return new Promise((ok, bad) => {
    const el = document.createElement('script'); el.src = src; el.async = true;
    el.onload = ok; el.onerror = () => bad(new Error('Could not load ' + src));
    document.head.append(el);
  });
}
async function fetchModel(key) {
  // Each model file is a plain script: (window.P29M=window.P29M||{})["key"]="<base64 of gzipped GLB>";
  // Plain <script> tags load on any host, including sandboxed frames where fetch() or modules are blocked.
  window.P29M = window.P29M || {};
  emit('progress', { key, pct: null });
  if (!window.P29M[key]) await loadScript(`models/${key}.js`);
  const b64 = window.P29M[key]; if (!b64) throw new Error('Model ' + key + ' is empty');
  const bin = atob(b64); let bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  return new Promise((ok, bad) => new GLTFLoader().parse(bytes.buffer, '', g => ok(g.scene), e => bad(e instanceof Error ? e : new Error(String(e && e.message || e)))));
}

function move(pos, target, fov = 42) {
  camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.set(...pos); controls.target.set(...target); controls.update();
}
function setVisibility(full) {
  for (const o of groups.upper || []) o.visible = full;
  for (const o of groups.ceilings || []) o.visible = full;
}
function overview() {
  mode = 'cutaway'; focusRoom = null; setVisibility(false);
  const tg = isBasement() ? [2.9, .3, -6.2] : [7.3, 0, -4.3], far = isBasement() ? [10, 11, 5] : [21, 23, 19];
  const a = host.clientWidth / host.clientHeight, f = a > 1.3 ? .66 : a > .9 ? .85 : 1.15;
  move(far.map((v, i) => tg[i] + (v - tg[i]) * f), tg);
  emit('mode', { mode });
}
function plan() {
  mode = 'cutaway'; focusRoom = null; setVisibility(false);
  const a = host.clientWidth / host.clientHeight, f = a > 1.3 ? .72 : a > .9 ? .9 : 1.35;
  move(isBasement() ? [2.9, 15 * f, -6.19] : [7.25, 28 * f, -4.19], isBasement() ? [2.9, 0, -6.2] : [7.25, 0, -4.2], 35);
  emit('mode', { mode });
}
function enter(roomId) {
  const v = VIEWS[roomId]; if (!v) return;
  mode = 'inside'; focusRoom = roomId; setVisibility(true);
  move(v[0], v[1], 70); emit('mode', { mode, room: roomId });
}

function buildHotspots() {
  hotLayer.innerHTML = ''; hotspots = [];
  for (const [name, p] of Object.entries(points)) {
    const id = ROOM_ID[name]; if (!id) continue;
    const b = document.createElement('button');
    b.className = 'hotspot'; b.type = 'button'; b.dataset.room = id;
    b.innerHTML = '<i></i><span></span>';
    b.addEventListener('click', () => emit('room', { room: id, layout: current }));
    hotLayer.append(b); hotspots.push([b, new THREE.Vector3(...p)]);
  }
  emit('hotspots', { rooms: hotspots.map(h => h[0].dataset.room) });
}

async function load(key) {
  if (key === current && model) return;
  const t = ++token; emit('loading', { key });
  try {
    if (!cache[key]) cache[key] = await fetchModel(key);
  } catch (e) { emit('error', { key, message: e.message }); return; }
  if (t !== token) return;
  if (model) scene.remove(model);
  current = key; model = cache[key]; scene.add(model);
  groups = { upper: [], ceilings: [] };
  model.traverse(o => {
    if (o.name.startsWith('GROUP_Walls_upper')) groups.upper.push(o);
    if (o.name.startsWith('GROUP_Ceilings')) groups.ceilings.push(o);
    if (o.isMesh) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (/Clear.glazing/i.test(m.name)) { m.transparent = true; m.opacity = .25; m.depthWrite = false; }
      else if (/Prism.glass/i.test(m.name)) { m.transparent = true; m.opacity = .7; m.roughness = .25; }
    }
  });
  if (key === 'B26A') points = { 'Brainstorming room': [2.9, .2, -6.2], 'East storage': [4.9, .2, -6.35] };
  else {
    points = JSON.parse(JSON.stringify(BASE_POINTS));
    if (key === '13') {
      points['Meeting room'] = points['Kancelarija 03']; delete points['Kancelarija 03'];
      points['Shared lounge'] = points['Sala za sastanke']; delete points['Sala za sastanke'];
    }
    if (key.startsWith('21')) points['Sala za sastanke'] = [5.93, .2, -1.9];
  }
  buildHotspots(); overview();
  emit('loaded', { key });
}

new ResizeObserver(() => {
  camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
  renderer.setSize(host.clientWidth, host.clientHeight);
}).observe(host);

const v = new THREE.Vector3();
(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  const w = host.clientWidth, h = host.clientHeight;
  for (const [el, p] of hotspots) {
    v.copy(p).project(camera);
    const x = (v.x * .5 + .5) * w, y = (-v.y * .5 + .5) * h;
    const hidden = v.z > 1 || x < 8 || y < 8 || x > w - 8 || y > h - 8 || (mode === 'inside');
    el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    el.classList.toggle('off', hidden);
  }
  renderer.render(scene, camera);
})();

window.P29Viewer = { load, overview, plan, enter, get current() { return current; }, get mode() { return mode; } };
emit('ready', {});
