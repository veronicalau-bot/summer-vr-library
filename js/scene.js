/**
 * scene.js — Three.js beach scene with WebXR support.
 *
 * Non-XR mode: slow ambient camera drift to show off the 3D beach
 *              as an immersive background for the 2D book UI.
 * XR mode:     Three.js WebXR manager takes over camera (headset pose).
 */

import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/* GLB filename with space — encodeURIComponent handles the space only
   (parentheses are valid URI chars, not encoded). */
const GLB_FILENAME = 'free_hdri_background_realistic_beach (3).glb';
const GLB_PATH     = './glb/' + encodeURIComponent(GLB_FILENAME);
const BALL_FILENAME = 'beach_ball.glb';
const BALL_PATH     = './glb/' + encodeURIComponent(BALL_FILENAME);

export class BeachScene {
  constructor(canvas) {
    this._canvas   = canvas;
    this._renderer = null;
    this._scene    = null;
    this._camera   = null;
    this._clock    = new THREE.Clock();
    this._xrActive = false;
    this._onProgressCb = null;
    this._yaw = 0;        // horizontal look angle
    this._pitch = 0;      // vertical look angle
    this._isDragging = false;

    // Beach ball state (lightweight physics)
    this._ball = null;
    this._ballRadius = 0.35;
    this._ballFloorY = -1.25;
    this._ballVelocity = new THREE.Vector3(0, 0, 0);
    this._ballGrabbedBy = -1;
    this._ballBoundsRadius = 7.5;

    // Desktop interaction helpers
    this._raycaster = new THREE.Raycaster();
    this._pointerNdc = new THREE.Vector2();

    // XR controller interaction state
    this._controllers = [];
    this._controllerState = [
      { history: [], lastPos: new THREE.Vector3(), initialized: false, hitCooldown: 0 },
      { history: [], lastPos: new THREE.Vector3(), initialized: false, hitCooldown: 0 },
    ];

    // Reusable temp objects to reduce allocations
    this._tmpV1 = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._tmpV3 = new THREE.Vector3();
    this._tmpQ1 = new THREE.Quaternion();
  }

  /** Register a progress callback: (percent: number) => void */
  onProgress(cb) {
    this._onProgressCb = cb;
    return this;
  }

  /** Initialize renderer, scene, camera, lights; then load the GLB. */
  async init() {
    this._setupRenderer();
    this._setupScene();
    this._setupCamera();
    this._setupLights();
    this._setupXRControllers();
    window.addEventListener('resize', () => this._handleResize());
    this._setupMouseLook(this._canvas);
    this._renderer.setAnimationLoop(() => this._tick());
    await this._loadGLB();
    await this._loadBeachBall();
  }

  /* ── Renderer ──────────────────────────────────────────── */
  _setupRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas:           this._canvas,
      antialias:        true,
      powerPreference:  'high-performance',
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(window.innerWidth, window.innerHeight);

    // WebXR
    this._renderer.xr.enabled = true;
    this._renderer.xr.setReferenceSpaceType('local-floor');

    // PBR colour pipeline
    this._renderer.outputColorSpace   = THREE.SRGBColorSpace;
    this._renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;
  }

  /* ── Scene ─────────────────────────────────────────────── */
  _setupScene() {
    this._scene            = new THREE.Scene();
    // Warm sky-blue fallback until the GLB loads
    this._scene.background = new THREE.Color(0x87ceeb);
    this._scene.fog        = new THREE.FogExp2(0x87ceeb, 0.006);
  }

  /* ── Camera ────────────────────────────────────────────── */
  _setupCamera() {
    this._camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      500,
    );
    // Place camera at sphere centre — photosphere/HDRI GLBs surround the camera
    this._camera.position.set(0, 0, 0);
    // YXZ: yaw (Y-axis) applied before pitch (X-axis) — natural look-around
    this._camera.rotation.order = 'YXZ';
  }

  /* ── Lights ────────────────────────────────────────────── */
  _setupLights() {
    // Ambient fill
    this._scene.add(new THREE.AmbientLight(0xfff4e0, 2.2));

    // Sun-like directional
    const sun = new THREE.DirectionalLight(0xfff8e7, 3.0);
    sun.position.set(10, 20, 5);
    this._scene.add(sun);

    // Sky / ground hemisphere (sky blue above, sandy below)
    this._scene.add(new THREE.HemisphereLight(0x87ceeb, 0xd4a05a, 1.2));
  }

  /* ── GLB loader ────────────────────────────────────────── */
  async _loadGLB() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/draco/',
    );

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    return new Promise(resolve => {
      loader.load(
        GLB_PATH,

        /* onLoad */
        gltf => {
          const model = gltf.scene;

          // Auto-fit: scale the model to ~60 units so the camera
          // sits comfortably inside the environment.
          const box    = new THREE.Box3().setFromObject(model);
          const size   = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale  = 60 / maxDim;
          model.scale.setScalar(scale);

          // Re-compute bounding box after scaling
          box.setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());

          // Centre entire model at world origin so the camera (at 0,0,0)
          // is inside the photosphere/HDRI environment.
          model.position.sub(center);

          this._scene.add(model);

          // GLB provides its own sky — remove the solid fallback
          this._scene.background = null;
          this._scene.fog        = null;

          if (this._onProgressCb) this._onProgressCb(100);
          resolve();
        },

        /* onProgress */
        ({ loaded, total }) => {
          if (total > 0 && this._onProgressCb) {
            this._onProgressCb(Math.round((loaded / total) * 100));
          }
        },

        /* onError — degrade gracefully; sky-blue scene still shows */
        err => {
          console.warn('[BeachScene] GLB load error:', err.message ?? err);
          if (this._onProgressCb) this._onProgressCb(100);
          resolve();
        },
      );
    });
  }

  /* ── Beach ball loader ─────────────────────────────────── */
  async _loadBeachBall() {
    const loader = new GLTFLoader();

    return new Promise(resolve => {
      loader.load(
        BALL_PATH,

        gltf => {
          const ball = gltf.scene;

          // Scale to a predictable gameplay size.
          const box = new THREE.Box3().setFromObject(ball);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const targetDiameter = this._ballRadius * 2;
          const scale = targetDiameter / maxDim;
          ball.scale.setScalar(scale);

          // Place a little in front of the user.
          ball.position.set(0.5, this._ballFloorY + this._ballRadius, -2.4);

          ball.traverse(obj => {
            if (obj.isMesh) {
              obj.castShadow = false;
              obj.receiveShadow = false;
            }
          });

          this._ball = ball;
          this._scene.add(ball);
          resolve();
        },

        undefined,

        err => {
          console.warn('[BeachScene] beach_ball.glb load error:', err.message ?? err);
          resolve();
        },
      );
    });
  }

  /* ── Animation loop ────────────────────────────────────── */
  _tick() {
    const dt = Math.min(this._clock.getDelta(), 0.033);

    if (!this._xrActive) {
      if (!this._isDragging) {
        // Slow auto-pan when idle — gently explore the beach
        this._yaw -= 0.0002;
      }
      // Clamp pitch to prevent gimbal flip
      this._pitch = Math.max(-Math.PI * 0.40, Math.min(Math.PI * 0.40, this._pitch));
      this._camera.rotation.y = this._yaw;
      this._camera.rotation.x = this._pitch;
    }

    this._updateXRControllerState(dt);
    this._updateBeachBall(dt);

    this._renderer.render(this._scene, this._camera);
  }

  /* ── Beach ball update + simple physics ───────────────── */
  _updateBeachBall(dt) {
    if (!this._ball) return;

    // If grabbed in XR, follow hand/controller and skip gravity.
    if (this._ballGrabbedBy >= 0) {
      const ctrl = this._controllers[this._ballGrabbedBy];
      if (!ctrl) {
        this._ballGrabbedBy = -1;
      } else {
        const ctrlPos = this._tmpV1.setFromMatrixPosition(ctrl.matrixWorld);
        const forward = this._tmpV2.set(0, 0, -1).applyQuaternion(
          this._tmpQ1.setFromRotationMatrix(ctrl.matrixWorld),
        ).normalize();

        this._ball.position.copy(ctrlPos).addScaledVector(forward, 0.22);
        this._ballVelocity.set(0, 0, 0);
        return;
      }
    }

    // Gravity + drag.
    this._ballVelocity.y += -4.8 * dt;
    this._ball.position.addScaledVector(this._ballVelocity, dt);
    this._ballVelocity.multiplyScalar(Math.pow(0.992, dt * 60));

    // Ground bounce (virtual floor).
    const minY = this._ballFloorY + this._ballRadius;
    if (this._ball.position.y < minY) {
      this._ball.position.y = minY;
      if (Math.abs(this._ballVelocity.y) > 0.12) {
        this._ballVelocity.y = -this._ballVelocity.y * 0.72;
      } else {
        this._ballVelocity.y = 0;
      }
      this._ballVelocity.x *= 0.94;
      this._ballVelocity.z *= 0.94;
    }

    // Keep the ball in a playable circle around the user.
    const horizontal = this._tmpV3.set(this._ball.position.x, 0, this._ball.position.z);
    const dist = horizontal.length();
    if (dist > this._ballBoundsRadius) {
      horizontal.normalize().multiplyScalar(this._ballBoundsRadius);
      this._ball.position.x = horizontal.x;
      this._ball.position.z = horizontal.z;

      const normal = horizontal.normalize();
      const vn = this._ballVelocity.dot(normal);
      if (vn > 0) {
        this._ballVelocity.addScaledVector(normal, -1.8 * vn);
      }
    }

    // Spin a little from movement for extra life.
    this._ball.rotation.x += this._ballVelocity.z * dt * 1.2;
    this._ball.rotation.z -= this._ballVelocity.x * dt * 1.2;
  }

  _applyBallImpulse(impulse) {
    if (!this._ball || this._ballGrabbedBy >= 0) return;
    this._ballVelocity.add(impulse);
  }

  _hitBallFromPointer(clientX, clientY, strength = 1) {
    if (!this._ball || this._xrActive) return false;

    const rect = this._canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    this._pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._pointerNdc, this._camera);
    const hits = this._raycaster.intersectObject(this._ball, true);
    if (hits.length === 0) return false;

    const forward = this._tmpV1;
    this._camera.getWorldDirection(forward);

    const impulse = this._tmpV2.copy(forward)
      .multiplyScalar(1.4 * strength)
      .add(new THREE.Vector3(0, 0.45 * strength, 0));

    this._applyBallImpulse(impulse);
    return true;
  }

  /* ── XR controller interaction ────────────────────────── */
  _setupXRControllers() {
    for (let i = 0; i < 2; i += 1) {
      const ctrl = this._renderer.xr.getController(i);
      ctrl.addEventListener('selectstart', () => this._onXRSelectStart(i));
      ctrl.addEventListener('selectend', () => this._onXRSelectEnd(i));
      this._scene.add(ctrl);
      this._controllers[i] = ctrl;
    }
  }

  _updateXRControllerState(dt) {
    if (!this._xrActive || !this._ball) return;

    const now = performance.now();

    for (let i = 0; i < this._controllers.length; i += 1) {
      const ctrl = this._controllers[i];
      const state = this._controllerState[i];
      if (!ctrl || !state) continue;

      const pos = this._tmpV1.setFromMatrixPosition(ctrl.matrixWorld);

      if (!state.initialized) {
        state.lastPos.copy(pos);
        state.initialized = true;
      }

      const velocity = this._tmpV2.copy(pos).sub(state.lastPos).multiplyScalar(1 / Math.max(dt, 1e-4));
      state.lastPos.copy(pos);

      state.history.push({
        t: now,
        pos: pos.clone(),
      });
      if (state.history.length > 8) state.history.shift();

      if (state.hitCooldown > 0) state.hitCooldown -= dt;

      // Hand/controller "pat" when moving quickly near the ball.
      if (this._ballGrabbedBy < 0 && state.hitCooldown <= 0) {
        const dist = pos.distanceTo(this._ball.position);
        const speed = velocity.length();
        if (dist <= this._ballRadius + 0.16 && speed > 0.85) {
          const impulse = this._tmpV3.copy(velocity).multiplyScalar(0.06);
          impulse.y += 0.05;
          this._applyBallImpulse(impulse);
          state.hitCooldown = 0.12;
        }
      }
    }
  }

  _onXRSelectStart(index) {
    if (!this._ball || this._ballGrabbedBy >= 0) return;

    const ctrl = this._controllers[index];
    if (!ctrl) return;

    const ctrlPos = this._tmpV1.setFromMatrixPosition(ctrl.matrixWorld);
    const dist = ctrlPos.distanceTo(this._ball.position);
    if (dist <= this._ballRadius + 0.25) {
      this._ballGrabbedBy = index;
      this._ballVelocity.set(0, 0, 0);
    }
  }

  _onXRSelectEnd(index) {
    if (!this._ball || this._ballGrabbedBy !== index) return;

    const state = this._controllerState[index];
    const history = state?.history ?? [];

    let releaseVelocity = new THREE.Vector3();
    if (history.length >= 2) {
      const oldest = history[0];
      const newest = history[history.length - 1];
      const dtMs = Math.max(1, newest.t - oldest.t);
      releaseVelocity = newest.pos.clone().sub(oldest.pos).multiplyScalar(1000 / dtMs);
    } else {
      const ctrl = this._controllers[index];
      if (ctrl) {
        releaseVelocity = this._tmpV1.set(0, 0, -1)
          .applyQuaternion(this._tmpQ1.setFromRotationMatrix(ctrl.matrixWorld))
          .multiplyScalar(1.8);
      }
    }

    releaseVelocity.y += 0.45;
    this._ballVelocity.copy(releaseVelocity.multiplyScalar(1.05));
    this._ballGrabbedBy = -1;
  }

  /* ── Mouse / touch look-around ──────────────────────────── */
  _setupMouseLook(canvas) {
    let lastX = 0, lastY = 0;

    const onDown = (x, y) => {
      this._isDragging = true;
      lastX = x;
      lastY = y;
    };
    const onMove = (x, y) => {
      if (!this._isDragging || this._xrActive) return;
      this._yaw   -= (x - lastX) * 0.004;
      this._pitch -= (y - lastY) * 0.004;
      lastX = x;
      lastY = y;
    };
    const onUp = () => { this._isDragging = false; };

    // Mouse
    canvas.addEventListener('mousedown',   e => onDown(e.clientX, e.clientY));
    document.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    document.addEventListener('mouseup',   onUp);

    // Ball interactions (desktop):
    // - click: pat/push the ball
    // - double-click: stronger throw impulse
    canvas.addEventListener('click', e => {
      this._hitBallFromPointer(e.clientX, e.clientY, 1.0);
    });
    canvas.addEventListener('dblclick', e => {
      this._hitBallFromPointer(e.clientX, e.clientY, 1.9);
    });

    // Touch
    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0];
      onDown(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', onUp, { passive: true });
  }

  /* ── Resize ────────────────────────────────────────────── */
  _handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
  }

  /* ── Public API ────────────────────────────────────────── */
  setXRActive(active) { this._xrActive = active; }

  /** Call after XR session ends to restore 2D render dimensions. */
  restoreSize() { this._handleResize(); }

  getRenderer() { return this._renderer; }
  getCamera()   { return this._camera;   }
}
