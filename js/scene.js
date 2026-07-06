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
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory }       from 'three/addons/webxr/XRHandModelFactory.js';

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
    this._ballFloorY = -1.25;      // desktop floor (camera at origin)
    this._ballFloorYDesktop = -1.25;
    this._ballFloorYXR = 0.0;      // local-floor ground is at y = 0
    this._ballVelocity = new THREE.Vector3(0, 0, 0);
    this._ballGrabbedBy = -1;
    this._ballBoundsRadius = 2.2;   // stay within arm's/step reach
    this._ballReturnRadius = 1.5;   // beyond this (when resting) it rolls back
    this._ballGrabRadius = 0.45;   // how close a hand must be to grab

    // Desktop interaction helpers
    this._raycaster = new THREE.Raycaster();
    this._pointerNdc = new THREE.Vector2();

    // XR controller interaction state
    this._controllers = [];      // target-ray spaces (events + pose)
    this._controllerGrips = [];  // grip spaces (controller mesh + physical pose)
    this._hands = [];            // hand spaces (Vision Pro hand tracking)
    this._controllerState = [
      { history: [], velHistory: [], lastPos: new THREE.Vector3(), smoothedVel: new THREE.Vector3(), initialized: false, hitCooldown: 0 },
      { history: [], velHistory: [], lastPos: new THREE.Vector3(), smoothedVel: new THREE.Vector3(), initialized: false, hitCooldown: 0 },
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
    const onGround = this._ball.position.y <= minY + 0.01;
    if (this._ball.position.y < minY) {
      this._ball.position.y = minY;
      if (Math.abs(this._ballVelocity.y) > 0.12) {
        this._ballVelocity.y = -this._ballVelocity.y * 0.72;
      } else {
        this._ballVelocity.y = 0;
      }
      // Stronger ground friction so it doesn't roll away forever.
      this._ballVelocity.x *= 0.90;
      this._ballVelocity.z *= 0.90;
    }

    // Play-area centre: the headset in XR, world origin on desktop.
    const center = this._tmpV1.set(0, 0, 0);
    if (this._xrActive && this._renderer.xr.isPresenting) {
      const xrCam = this._renderer.xr.getCamera();
      center.set(xrCam.position.x, 0, xrCam.position.z);
    }

    // Keep the ball within a reachable circle around the user.
    const offset = this._tmpV2.set(
      this._ball.position.x - center.x,
      0,
      this._ball.position.z - center.z,
    );
    const dist = offset.length();
    if (dist > this._ballBoundsRadius) {
      offset.normalize().multiplyScalar(this._ballBoundsRadius);
      this._ball.position.x = center.x + offset.x;
      this._ball.position.z = center.z + offset.z;

      const normal = offset.normalize();
      const vn = this._ballVelocity.dot(normal);
      if (vn > 0) {
        this._ballVelocity.addScaledVector(normal, -1.8 * vn);
      }
    }

    // Gentle auto-return: if it has settled too far away, roll it back
    // toward the user so it never gets stuck out of reach.
    if (onGround && dist > this._ballReturnRadius && this._ballVelocity.lengthSq() < 0.05) {
      const pull = this._tmpV3.set(
        center.x - this._ball.position.x,
        0,
        center.z - this._ball.position.z,
      );
      if (pull.lengthSq() > 1e-4) {
        pull.normalize();
        this._ballVelocity.addScaledVector(pull, 1.6 * dt);
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
    const controllerModelFactory = new XRControllerModelFactory();
    const handModelFactory       = new XRHandModelFactory();

    for (let i = 0; i < 2; i += 1) {
      // Target-ray space — fires select for both controllers (trigger)
      // and hands (pinch); also used for pose/velocity tracking.
      const ctrl = this._renderer.xr.getController(i);
      ctrl.addEventListener('selectstart', () => this._onXRSelectStart(i));
      ctrl.addEventListener('selectend',   () => this._onXRSelectEnd(i));
      ctrl.add(this._makeControllerRay());
      this._scene.add(ctrl);
      this._controllers[i] = ctrl;

      // Grip space — renders the physical controller model (Vive).
      const grip = this._renderer.xr.getControllerGrip(i);
      grip.add(controllerModelFactory.createControllerModel(grip));
      this._scene.add(grip);
      this._controllerGrips[i] = grip;

      // Hand space — renders tracked hands (Apple Vision Pro).
      const hand = this._renderer.xr.getHand(i);
      hand.add(handModelFactory.createHandModel(hand, 'mesh'));
      this._scene.add(hand);
      this._hands[i] = hand;
    }
  }

  /** Small pointer ray so users can see where a controller/hand aims. */
  _makeControllerRay() {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.6,
    });
    const line = new THREE.Line(geom, mat);
    line.name = 'controller-ray';
    line.scale.z = 1.2;
    return line;
  }

  /** Reposition the ball for the current mode (desktop vs XR reach). */
  _placeBallForMode() {
    if (!this._ball) return;

    if (this._xrActive) {
      // Local-floor: user stands on y = 0. Drop the ball in front,
      // at roughly chest height, so it is easy to reach, hit and throw.
      this._ballFloorY = this._ballFloorYXR;
      this._ball.position.set(0, 1.1, -0.9);
      this._ballVelocity.set(0, -0.2, 0);
    } else {
      // Desktop: camera sits at origin, floor is below.
      this._ballFloorY = this._ballFloorYDesktop;
      this._ball.position.set(0.5, this._ballFloorY + this._ballRadius, -2.4);
      this._ballVelocity.set(0, 0, 0);
    }
    this._ballGrabbedBy = -1;
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

      // Smoothed instantaneous velocity — tracks the *current* motion
      // direction so throws follow the final flick (not the wind-up).
      state.smoothedVel.lerp(velocity, 0.5);

      // Per-frame velocity ring buffer — lets a throw use the *peak* speed
      // just before release (the pinch often opens as the hand decelerates).
      state.velHistory.push({ t: now, v: velocity.clone() });
      if (state.velHistory.length > 12) state.velHistory.shift();

      state.history.push({
        t: now,
        pos: pos.clone(),
      });
      if (state.history.length > 8) state.history.shift();

      if (state.hitCooldown > 0) state.hitCooldown -= dt;

      // Hand/controller "pat" when moving near the ball.
      if (this._ballGrabbedBy < 0 && state.hitCooldown <= 0) {
        const dist = pos.distanceTo(this._ball.position);
        const speed = velocity.length();
        if (dist <= this._ballRadius + 0.35 && speed > 0.35) {
          // Transfer most of the hand speed to the ball for a satisfying hit.
          const impulse = this._tmpV3.copy(velocity).multiplyScalar(1.0);
          impulse.y += 0.3;
          this._applyBallImpulse(impulse);
          state.hitCooldown = 0.15;
        }
      }
    }
  }

  _onXRSelectStart(index) {
    if (!this._ball || this._ballGrabbedBy >= 0) return;

    const ctrl = this._controllers[index];
    if (!ctrl) return;

    const ctrlPos = this._tmpV1.setFromMatrixPosition(ctrl.matrixWorld);

    // (1) Near grab: hand physically close to the ball.
    let canGrab = ctrlPos.distanceTo(this._ball.position)
      <= this._ballRadius + this._ballGrabRadius;

    // (2) Far grab: pointer ray aimed at (or near) the ball.
    //     Uses a generous tolerance so aiming does not need to be pixel-perfect.
    if (!canGrab) {
      const dir = this._tmpV2.set(0, 0, -1)
        .applyQuaternion(this._tmpQ1.setFromRotationMatrix(ctrl.matrixWorld))
        .normalize();
      this._raycaster.set(ctrlPos, dir);
      this._raycaster.far = 15;
      const along = this._tmpV3.copy(this._ball.position).sub(ctrlPos).dot(dir);
      const rayDist = this._raycaster.ray.distanceToPoint(this._ball.position);
      if (along > 0 && along < 15 && rayDist <= this._ballRadius * 2.2) {
        canGrab = true;
      }
    }

    if (canGrab) {
      this._ballGrabbedBy = index;
      this._ballVelocity.set(0, 0, 0);
    }
  }

  _onXRSelectEnd(index) {
    if (!this._ball || this._ballGrabbedBy !== index) return;

    const state = this._controllerState[index];

    // Pick the *peak* hand velocity from the last ~250 ms. The pinch usually
    // opens as the hand is already decelerating, so the instantaneous release
    // speed is too low — the peak captures the actual throwing flick.
    const releaseVelocity = new THREE.Vector3();
    let best = null;
    const cutoff = performance.now() - 250;
    const velHistory = state?.velHistory ?? [];
    for (const e of velHistory) {
      if (e.t >= cutoff && (!best || e.v.lengthSq() > best.v.lengthSq())) {
        best = e;
      }
    }

    if (best && best.v.lengthSq() > 0.06) {
      releaseVelocity.copy(best.v).multiplyScalar(1.3);
    } else {
      // Hand barely moved — toss gently along where it points.
      const ctrl = this._controllers[index];
      if (ctrl) {
        releaseVelocity.set(0, 0, -1)
          .applyQuaternion(this._tmpQ1.setFromRotationMatrix(ctrl.matrixWorld))
          .multiplyScalar(2.5);
      }
    }

    // Clamp so an over-enthusiastic flick can't fling it out of the world.
    const maxSpeed = 8;
    if (releaseVelocity.length() > maxSpeed) {
      releaseVelocity.setLength(maxSpeed);
    }

    releaseVelocity.y += 0.5;
    this._ballVelocity.copy(releaseVelocity);
    this._ballGrabbedBy = -1;
    if (state) state.velHistory.length = 0;
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
  setXRActive(active) {
    this._xrActive = active;
    // Reset controller tracking so the first XR frame doesn't register
    // a huge phantom velocity from a stale last position.
    this._controllerState.forEach(s => {
      s.initialized = false;
      s.history.length = 0;
      s.velHistory.length = 0;
      s.smoothedVel.set(0, 0, 0);
      s.hitCooldown = 0;
    });
    this._placeBallForMode();
  }

  /** Call after XR session ends to restore 2D render dimensions. */
  restoreSize() { this._handleResize(); }

  getRenderer() { return this._renderer; }
  getCamera()   { return this._camera;   }
}
