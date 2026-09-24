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

// --- Touch controls ---
// One finger: rotate the food after it has been placed.
// Two fingers: pinch to scale the food.
// A short single tap before placement places the food.
// A short single tap on the burger selects it.
let touches = new Map();
let gestureStartDistance = 0;
let gestureStartScale = 1;
let lastSingleTouch = null;
let touchMoved = false;

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

renderer.domElement.addEventListener('touchstart', (event) => {
  event.preventDefault();
  for (const touch of event.changedTouches) {
    touches.set(touch.identifier, touch);
  }

  touchMoved = false;

  if (touches.size === 1) {
    const touch = [...touches.values()][0];
    lastSingleTouch = { x: touch.clientX, y: touch.clientY };
  } else if (touches.size === 2 && placed) {
    const pair = [...touches.values()];
    gestureStartDistance = distance(pair[0], pair[1]);
    gestureStartScale = burger.scale.x;
    lastSingleTouch = null;
  }
}, { passive: false });

renderer.domElement.addEventListener('touchmove', (event) => {
  event.preventDefault();
  for (const touch of event.changedTouches) {
    touches.set(touch.identifier, touch);
  }

  if (!placed) return;

  if (touches.size === 1 && lastSingleTouch) {
    const touch = [...touches.values()][0];
    const dx = touch.clientX - lastSingleTouch.x;
    const dy = touch.clientY - lastSingleTouch.y;
    if (Math.hypot(dx, dy) > 6) touchMoved = true;
    if (selected) {
      burger.rotation.y += dx * 0.012;
    }
    lastSingleTouch = { x: touch.clientX, y: touch.clientY };
  } else if (touches.size >= 2 && gestureStartDistance > 0) {
    const pair = [...touches.values()].slice(0, 2);
    const currentDistance = distance(pair[0], pair[1]);
    const scale = THREE.MathUtils.clamp(
      gestureStartScale * (currentDistance / gestureStartDistance),
      0.16,
      0.75
    );
    burger.scale.setScalar(scale);
    // The selection ring is part of the burger, so it scales with it too.
    touchMoved = true;
  }
}, { passive: false });

renderer.domElement.addEventListener('touchend', (event) => {
  event.preventDefault();
  for (const touch of event.changedTouches) {
    touches.delete(touch.identifier);
  }

  if (touches.size === 0) {
    if (!touchMoved && event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      if (!placed) {
        placeBurger();
      } else {
        // Tap the burger area to select/deselect. A simple distance check keeps
        // the interaction forgiving on a phone screen.
        const canvasRect = renderer.domElement.getBoundingClientRect();
        const x = ((touch.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
        const y = -((touch.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
        const xrCamera = renderer.xr.getCamera(camera);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), xrCamera);
        const hits = raycaster.intersectObjects(burger.children, true).filter(hit => hit.object !== selectionRing);
        if (hits.length) selectBurger(!selected);
      }
    }
    lastSingleTouch = null;
    gestureStartDistance = 0;
  }
}, { passive: false });

renderer.domElement.addEventListener('touchcancel', () => {
  touches.clear();
  lastSingleTouch = null;
  gestureStartDistance = 0;
});

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
