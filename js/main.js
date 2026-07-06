/**
 * main.js — Application entry point.
 *
 * Boot sequence (parallel where possible):
 *   1. Start 3D scene init + book CSV fetch in parallel.
 *   2. Probe WebXR support; enable/disable VR button.
 *   3. Render book cards and wire up filters.
 *   4. Setup modal.
 *   5. Fade out loading screen.
 */

import { BeachScene }  from './scene.js';
import { XRController } from './xr.js';
import { fetchBooks }  from './data.js';
import { renderCards, setupFilters, setupModal } from './cards.js';

async function main() {
  /* ── DOM refs ─────────────────────────────────────────── */
  const loadingScreen = document.getElementById('loading-screen');
  const loadingText   = document.getElementById('loading-text');
  const uiOverlay     = document.getElementById('ui-overlay');
  const btnEnterVR    = document.getElementById('btn-enter-vr');
  const btnLabel      = btnEnterVR.querySelector('.btn-label');
  const xrStatus      = document.getElementById('xr-status');
  const carouselCard  = document.getElementById('carousel-card');
  const booksError    = document.getElementById('books-error');
  const tagFilter     = document.getElementById('tag-filter');

  /* ── 1. Init 3D scene + fetch books (parallel) ────────── */
  const canvas = document.getElementById('bg-canvas');
  const beach  = new BeachScene(canvas);

  beach.onProgress(pct => {
    loadingText.textContent = pct < 100
      ? `載入場景 ${pct}%…`
      : '場景就緒，載入書目…';
  });

  const [sceneResult, booksResult] = await Promise.allSettled([
    beach.init(),
    fetchBooks(),
  ]);

  if (sceneResult.status === 'rejected') {
    // Scene failed but we can still show book cards
    console.error('[main] Scene init failed:', sceneResult.reason);
  }

  /* ── 2. WebXR support check ───────────────────────────── */
  const xr = new XRController(beach.getRenderer(), {
    onEnter() {
      // VR user only sees the WebGL canvas — hide the 2D UI layer
      uiOverlay.style.display = 'none';
      beach.setXRActive(true);
    },
    onExit() {
      uiOverlay.style.display  = '';
      beach.setXRActive(false);
      beach.restoreSize();
      btnLabel.textContent = '進入 XR 沙灘';
      btnEnterVR.setAttribute('aria-label', '進入 XR 沙灘');
    },
  });

  const xrSupport = await xr.checkSupport();

  if (xrSupport === 'immersive-vr') {
    btnEnterVR.disabled = false;

    btnEnterVR.addEventListener('click', async () => {
      if (xr.isActive) {
        await xr.exitVR().catch(err => {
          console.error('[main] XR exit error:', err);
        });
      } else {
        try {
          btnLabel.textContent = '連接中…';
          btnEnterVR.disabled  = true;
          await xr.enterVR();
          btnLabel.textContent = '離開 XR';
          btnEnterVR.setAttribute('aria-label', '離開 XR 沙灘');
          btnEnterVR.disabled  = false;
        } catch (err) {
          // User may have dismissed the permission prompt
          btnLabel.textContent = '進入 XR 沙灘';
          btnEnterVR.disabled  = false;
          xrStatus.textContent = '⚠ XR 無法啟動';
          console.error('[main] XR enter error:', err);
        }
      }
    });
  } else {
    // Not supported — keep button disabled, show hint
    xrStatus.textContent    = '此裝置不支援 XR';
    btnEnterVR.title        = '需要支援 WebXR 的瀏覽器與 VR 裝置';
  }

  /* ── 3. Render book cards ─────────────────────────────── */
  if (booksResult.status === 'fulfilled') {
    const books = booksResult.value;
    renderCards(books, carouselCard);
    setupFilters(books, carouselCard, tagFilter);

    // Carousel arrow buttons
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    prevBtn.addEventListener('click', () => showCarouselIndex(-1));
    nextBtn.addEventListener('click', () => showCarouselIndex(1));
  } else {
    console.error('[main] Books fetch failed:', booksResult.reason);
    booksError.textContent = '書目資料載入失敗，請確認網路連線後重新整理。';
    booksError.hidden      = false;
  }

  /* ── 4. Wire up modal ─────────────────────────────────── */
  setupModal();

  /* ── 5. Fade loading screen out ───────────────────────── */
  loadingScreen.style.opacity = '0';
  loadingScreen.addEventListener(
    'transitionend',
    () => { loadingScreen.style.display = 'none'; },
    { once: true },
  );
}

main().catch(err => {
  console.error('[main] Fatal boot error:', err);
  const t = document.getElementById('loading-text');
  if (t) t.textContent = '頁面載入失敗，請重新整理。';
});
