import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.180.0/examples/jsm/webxr/ARButton.js';

const status = document.querySelector('#status');

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

// Temporary restaurant food model: a stylized burger made entirely from Three.js primitives.
// This keeps the prototype self-contained and avoids external model licensing while we test the UX.
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
  bottomBun.position.y = 0.06;
  bottomBun.castShadow = true;
  bottomBun.receiveShadow = true;
  burger.add(bottomBun);

  const lettuce = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.045, 10, 48), lettuceMat);
  lettuce.scale.y = 0.75;
  lettuce.position.y = 0.145;
  lettuce.castShadow = true;
  burger.add(lettuce);

  const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.16, 48), pattyMat);
  patty.position.y = 0.22;
  patty.castShadow = true;
  burger.add(patty);

  const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.035, 0.54), cheeseMat);
  cheese.position.y = 0.315;
  cheese.rotation.y = Math.PI / 4;
  cheese.castShadow = true;
  burger.add(cheese);

  const tomato = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.055, 48), tomatoMat);
  tomato.position.y = 0.355;
  tomato.castShadow = true;
  burger.add(tomato);

  const topBunBase = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.11, 48), bunMat);
  topBunBase.position.y = 0.435;
  topBunBase.castShadow = true;
  burger.add(topBunBase);

  const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.31, 48, 24), bunLightMat);
  topBun.scale.y = 0.52;
  topBun.position.y = 0.50;
  topBun.castShadow = true;
  burger.add(topBun);

  // A few sesame seeds give the top bun a more food-like appearance.
  const seedGeometry = new THREE.SphereGeometry(0.014, 12, 8);
  const seedPositions = [
    [-0.13, 0.635, 0.08], [0.02, 0.64, 0.13], [0.13, 0.635, 0.04],
    [-0.05, 0.65, -0.10], [0.15, 0.63, -0.10], [-0.17, 0.62, -0.03]
  ];
  for (const [x, y, z] of seedPositions) {
    const seed = new THREE.Mesh(seedGeometry, sesameMat);
    seed.position.set(x, y, z);
    seed.scale.set(1.2, 0.45, 0.65);
    seed.castShadow = true;
    burger.add(seed);
  }

  // Keep the burger at a sensible AR size: about 20 cm wide.
  burger.scale.setScalar(0.33);
  burger.rotation.y = Math.PI * 0.08;

  return burger;
}

const burger = makeBurger();
burger.visible = false;
scene.add(burger);

let hitTestSource = null;
let localReferenceSpace = null;
let placed = false;

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
  burger.visible = false;
  status.textContent = 'Move your phone until the blue ring appears';
});

renderer.xr.addEventListener('sessionend', () => {
  hitTestSource = null;
  localReferenceSpace = null;
  reticle.visible = false;
  burger.visible = false;
  status.textContent = 'AR session ended';
});

const sessionSelectHandler = () => {
  if (!reticle.visible) return;

  burger.position.setFromMatrixPosition(reticle.matrix);
  // Keep the burger upright while placing it on the detected horizontal surface.
  burger.quaternion.identity();
  burger.visible = true;
  placed = true;
  status.textContent = 'Burger placed — move around it or tap another surface';
};

renderer.domElement.addEventListener('click', sessionSelectHandler);

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
