import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.180.0/examples/jsm/webxr/ARButton.js';

const status = document.querySelector('#status');
const controlsHint = document.querySelector('#controls-hint');
const removeButton = document.querySelector('#remove-food');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 2.2);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
keyLight.position.set(2, 4, 2);
scene.add(keyLight);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.12, 0.15, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x33aaff })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

function makeBurger() {
  const burger = new THREE.Group();
  const bunMat = new THREE.MeshStandardMaterial({ color: 0xd9953f, roughness: 0.8 });
  const bunLightMat = new THREE.MeshStandardMaterial({ color: 0xf0b95d, roughness: 0.75 });
  const pattyMat = new THREE.MeshStandardMaterial({ color: 0x4a2415, roughness: 1.0 });
  const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xffc928, roughness: 0.65 });
  const lettuceMat = new THREE.MeshStandardMaterial({ color: 0x4fa83d, roughness: 0.9 });
  const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xd9342b, roughness: 0.7 });
  const sesameMat = new THREE.MeshStandardMaterial({ color: 0xffe8a3, roughness: 0.8 });

  const bottomBun = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 0.12, 48), bunMat);
  bottomBun.position.y = 0.06; bottomBun.castShadow = true; bottomBun.receiveShadow = true; burger.add(bottomBun);
  const lettuce = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.045, 10, 48), lettuceMat);
  lettuce.scale.y = 0.75; lettuce.position.y = 0.145; lettuce.castShadow = true; burger.add(lettuce);
  const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.16, 48), pattyMat);
  patty.position.y = 0.22; patty.castShadow = true; burger.add(patty);
  const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.035, 0.54), cheeseMat);
  cheese.position.y = 0.315; cheese.rotation.y = Math.PI / 4; cheese.castShadow = true; burger.add(cheese);
  const tomato = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.055, 48), tomatoMat);
  tomato.position.y = 0.355; tomato.castShadow = true; burger.add(tomato);
  const topBunBase = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.11, 48), bunMat);
  topBunBase.position.y = 0.435; topBunBase.castShadow = true; burger.add(topBunBase);
  const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.31, 48, 24), bunLightMat);
  topBun.scale.y = 0.52; topBun.position.y = 0.50; topBun.castShadow = true; burger.add(topBun);

  const seedGeometry = new THREE.SphereGeometry(0.014, 12, 8);
  const seedPositions = [
    [-0.13, 0.635, 0.08], [0.02, 0.64, 0.13], [0.13, 0.635, 0.04],
    [-0.05, 0.65, -0.10], [0.15, 0.63, -0.10], [-0.17, 0.62, -0.03]
  ];
  for (const [x, y, z] of seedPositions) {
    const seed = new THREE.Mesh(seedGeometry, sesameMat);
    seed.position.set(x, y, z); seed.scale.set(1.2, 0.45, 0.65); seed.castShadow = true; burger.add(seed);
  }

  burger.scale.setScalar(0.33);
  burger.rotation.y = Math.PI * 0.08;
  return burger;
}

const burger = makeBurger();
burger.visible = false;
scene.add(burger);

// A simple selection ring makes it obvious when the food is selected.
const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(0.32, 0.35, 48).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.9 })
);
selectionRing.position.y = 0.01;
selectionRing.visible = false;
burger.add(selectionRing);

let hitTestSource = null;
let localReferenceSpace = null;
let placed = false;
let selected = false;

const arButton = ARButton.createButton(renderer, {
  requiredFeatures: ['hit-test'],
  optionalFeatures: ['dom-overlay'],
  domOverlay: { root: document.body }
});
arButton.textContent = 'Start AR';
document.body.appendChild(arButton);

if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-ar')
    .then(supported => {
      status.textContent = supported ? 'AR is available — tap Start AR' : 'This browser/device does not support Web AR';
      if (!supported) arButton.style.display = 'none';
    })
    .catch(() => status.textContent = 'Could not check AR support');
} else {
  status.textContent = 'WebXR is not available in this browser';
  arButton.style.display = 'none';
}

renderer.xr.addEventListener('sessionstart', async () => {
  const session = renderer.xr.getSession();
  localReferenceSpace = await session.requestReferenceSpace('local');
  hitTestSource = await session.requestHitTestSource({
    space: await session.requestReferenceSpace('viewer')
  });
  placed = false;
  selected = false;
  burger.visible = false;
  selectionRing.visible = false;
  removeButton.hidden = true;
  controlsHint.hidden = true;
  status.textContent = 'Move your phone until the blue ring appears';
});

renderer.xr.addEventListener('sessionend', () => {
  hitTestSource = null;
  localReferenceSpace = null;
  reticle.visible = false;
  burger.visible = false;
  selectionRing.visible = false;
  removeButton.hidden = true;
  controlsHint.hidden = true;
  status.textContent = 'AR session ended';
});

function placeBurger() {
  if (!reticle.visible) return;
  burger.position.setFromMatrixPosition(reticle.matrix);
  burger.quaternion.identity();
  burger.visible = true;
  placed = true;
  selected = true;
  selectionRing.visible = true;
  removeButton.hidden = false;
  controlsHint.hidden = false;
  status.textContent = 'Burger placed — drag to rotate, pinch to resize';
}

function selectBurger(value = true) {
  selected = value;
  selectionRing.visible = value && placed;
  if (value && placed) status.textContent = 'Burger selected — drag to rotate, pinch to resize';
}

removeButton.addEventListener('click', (event) => {
  event.stopPropagation();
  burger.visible = false;
  placed = false;
  selected = false;
  selectionRing.visible = false;
  removeButton.hidden = true;
  controlsHint.hidden = true;
  status.textContent = reticle.visible ? 'Surface found — tap to place' : 'Move your phone until the blue ring appears';
});

// --- Touch / pointer controls ---
// Version 4 uses Pointer Events on the whole page. This is more reliable on
// Android WebXR DOM-overlay sessions than listening only on the WebGL canvas.
// One finger drag = rotate, two fingers = pinch to resize, tap = select/deselect.
document.documentElement.style.touchAction = 'none';
document.body.style.touchAction = 'none';

const pointers = new Map();
let gestureMoved = false;
let lastX = 0;
let lastY = 0;
let pinchStartDistance = 0;
let pinchStartScale = 1;
let gestureMode = 'none';

function pointerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getViewCamera() {
  const xrCamera = renderer.xr.getCamera(camera);
  return xrCamera.isArrayCamera && xrCamera.cameras.length
    ? xrCamera.cameras[0]
    : xrCamera;
}

function isTapOnBurger(clientX, clientY) {
  if (!placed) return false;

  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );

  const viewCamera = getViewCamera();
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, viewCamera);

  const hits = raycaster.intersectObjects(burger.children, true)
    .filter(hit => hit.object !== selectionRing);

  if (hits.length) return true;

  // Fallback: use the burger's projected screen position.
  // This makes selection forgiving on small phone screens.
  const worldPos = new THREE.Vector3();
  burger.getWorldPosition(worldPos);
  const projected = worldPos.clone().project(viewCamera);

  const px = rect.left + (projected.x + 1) * 0.5 * rect.width;
  const py = rect.top + (1 - projected.y) * 0.5 * rect.height;
  return Math.hypot(clientX - px, clientY - py) < 140;
}

function onPointerDown(event) {
  if (event.pointerType !== 'touch') return;
  event.preventDefault();

  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}

  gestureMoved = false;

  if (pointers.size === 1) {
    const p = pointers.get(event.pointerId);
    lastX = p.x;
    lastY = p.y;
    gestureMode = placed ? 'rotate' : 'place';
  } else if (pointers.size === 2 && placed) {
    const pair = [...pointers.values()];
    pinchStartDistance = pointerDistance(pair[0], pair[1]);
    pinchStartScale = burger.scale.x;
    gestureMode = 'pinch';
  }
}

function onPointerMove(event) {
  if (event.pointerType !== 'touch' || !pointers.has(event.pointerId)) return;
  event.preventDefault();

  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (!placed) return;

  if (pointers.size === 1 && gestureMode === 'rotate') {
    const p = pointers.get(event.pointerId);
    const dx = p.x - lastX;
    const dy = p.y - lastY;

    if (Math.hypot(dx, dy) > 4) gestureMoved = true;

    if (selected) {
      burger.rotation.y += dx * 0.012;
      burger.rotation.x += dy * 0.004;
      burger.rotation.x = THREE.MathUtils.clamp(
        burger.rotation.x,
        -0.35,
        0.35
      );
    }

    lastX = p.x;
    lastY = p.y;
  } else if (pointers.size >= 2 && pinchStartDistance > 0) {
    const pair = [...pointers.values()].slice(0, 2);
    const currentDistance = pointerDistance(pair[0], pair[1]);

    const scale = THREE.MathUtils.clamp(
      pinchStartScale * (currentDistance / pinchStartDistance),
      0.16,
      0.75
    );

    burger.scale.setScalar(scale);
    gestureMoved = true;
  }
}

function onPointerUp(event) {
  if (event.pointerType !== 'touch') return;
  event.preventDefault();

  const wasSinglePointer = pointers.size === 1;
  const wasMoved = gestureMoved;
  const x = event.clientX;
  const y = event.clientY;

  pointers.delete(event.pointerId);
  try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}

  if (pointers.size > 0) {
    // If one finger remains after a pinch, restart the rotation baseline.
    if (pointers.size === 1) {
      const p = [...pointers.values()][0];
      lastX = p.x;
      lastY = p.y;
      gestureMode = 'rotate';
    }
    return;
  }

  if (wasSinglePointer && !wasMoved) {
    if (!placed) {
      placeBurger();
    } else if (isTapOnBurger(x, y)) {
      selectBurger(!selected);
    }
  }

  gestureMode = 'none';
  pinchStartDistance = 0;
}

function onPointerCancel(event) {
  if (event.pointerType === 'touch') {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) {
      gestureMode = 'none';
      pinchStartDistance = 0;
    }
  }
}

window.addEventListener('pointerdown', onPointerDown, { passive: false });
window.addEventListener('pointermove', onPointerMove, { passive: false });
window.addEventListener('pointerup', onPointerUp, { passive: false });
window.addEventListener('pointercancel', onPointerCancel, { passive: false });

renderer.setAnimationLoop((time, frame) => {
  if (frame && hitTestSource && localReferenceSpace) {
    const results = frame.getHitTestResults(hitTestSource);
    if (results.length) {
      const pose = results[0].getPose(localReferenceSpace);
      reticle.visible = true;
      reticle.matrix.fromArray(pose.transform.matrix);
      if (!placed) status.textContent = 'Surface found — tap to place';
    } else {
      reticle.visible = false;
      if (!placed) status.textContent = 'Move your phone until the blue ring appears';
    }
  }
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
