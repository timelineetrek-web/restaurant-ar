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
document.body.appendChild(renderer.domElement);

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
scene.add(light);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.12, 0.15, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x33aaff })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 0.18, 0.18),
  new THREE.MeshStandardMaterial({ color: 0x1683ff, roughness: 0.35, metalness: 0.15 })
);
cube.visible = false;
scene.add(cube);

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
  hitTestSource = await session.requestHitTestSource({ space: await session.requestReferenceSpace('viewer') });
  placed = false;
  cube.visible = false;
  status.textContent = 'Move your phone until the blue ring appears';
});

renderer.xr.addEventListener('sessionend', () => {
  hitTestSource = null;
  localReferenceSpace = null;
  reticle.visible = false;
  cube.visible = false;
  status.textContent = 'AR session ended';
});

const sessionSelectHandler = (event) => {
  if (!reticle.visible) return;
  cube.position.setFromMatrixPosition(reticle.matrix);
  cube.quaternion.setFromRotationMatrix(reticle.matrix);
  cube.visible = true;
  placed = true;
  status.textContent = 'Object placed — move around it or tap another surface';
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
