/**
 * xr.js — WebXR session management.
 *
 * Targets both HTC Vive XR Elite (Chrome/Edge WebXR) and
 * Apple Vision Pro (visionOS Safari 18+ WebXR).
 *
 * Optional features requested:
 *   - local-floor   : floor-relative reference space (Vive)
 *   - bounded-floor : room-scale boundary (Vive)
 *   - hand-tracking : Vision Pro hand/finger input
 *   - layers        : compositor layers for crisper UI (Vision Pro)
 */

export class XRController {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {{ onEnter?: () => void, onExit?: () => void }} callbacks
   */
  constructor(renderer, { onEnter, onExit } = {}) {
    this._renderer = renderer;
    this._onEnter  = onEnter ?? (() => {});
    this._onExit   = onExit  ?? (() => {});
    this._session  = null;
  }

  /**
   * Probe whether immersive-vr is available.
   * @returns {Promise<'immersive-vr' | 'none'>}
   */
  async checkSupport() {
    if (!('xr' in navigator)) return 'none';
    try {
      const ok = await navigator.xr.isSessionSupported('immersive-vr');
      return ok ? 'immersive-vr' : 'none';
    } catch {
      return 'none';
    }
  }

  /** Request an immersive-vr session and bind it to the renderer. */
  async enterVR() {
    if (this._session) return; // guard: already in a session

    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: [
        'local-floor',
        'bounded-floor',
        'hand-tracking',
        'layers',
      ],
    });

    await this._renderer.xr.setSession(session);
    this._session = session;
    session.addEventListener('end', () => this._handleEnd(), { once: true });

    this._onEnter();
  }

  /** Gracefully end the current XR session. */
  async exitVR() {
    if (this._session) await this._session.end();
  }

  get isActive() {
    return this._session !== null;
  }

  _handleEnd() {
    this._session = null;
    this._onExit();
  }
}
