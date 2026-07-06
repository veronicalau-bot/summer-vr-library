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
    window.addEventListener('resize', () => this._handleResize());
    this._setupMouseLook(this._canvas);
    this._renderer.setAnimationLoop(() => this._tick());
    await this._loadGLB();
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

  /* ── Animation loop ────────────────────────────────────── */
  _tick() {
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
    this._renderer.render(this._scene, this._camera);
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
