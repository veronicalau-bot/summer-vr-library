/**
 * cards.js — Book card rendering, QR auto-generation, and modal.
 *
 * QR codes are generated client-side from each book's book_link
 * using the globally loaded qrcode library (CDN).
 *
 * Security notes:
 *   - All text content set via .textContent (never innerHTML with user data)
 *   - External URLs validated upstream in data.js (https:// only)
 *   - Links have rel="noopener noreferrer" and target="_blank"
 */

/* ── QR helpers ──────────────────────────────────────────── */

/**
 * Generate a QR code as a data URL for the given https URL.
 * Uses callback-style API of qrcode@1.5.x for broad compatibility.
 * @param {string} url   - The HTTPS URL to encode
 * @param {number} px    - Output pixel size (use 2× for retina)
 * @returns {Promise<string>}
 */
function qrDataURL(url, px) {
  return new Promise((resolve, reject) => {
    /* global QRCode */
    if (typeof QRCode === 'undefined' || !QRCode || !QRCode.toDataURL) {
      reject(new Error('QRCode library not loaded'));
      return;
    }
    QRCode.toDataURL(
      url,
      {
        width:  px,
        margin: 1,
        color:  { dark: '#0f1e37', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      },
      (err, dataUrl) => {
        if (err) reject(err);
        else resolve(dataUrl);
      },
    );
  });
}

/**
 * Build a QR wrapper element (label + <img>).
 * Image src is populated asynchronously.
 *
 * @param {string} url        - URL to encode
 * @param {number} displayPx  - CSS display size in px
 * @param {string} [label]
 */
function makeQREl(url, displayPx, label = '掃描 QR') {
  const wrap = document.createElement('div');
  wrap.className = 'qr-wrap';

  if (!url) {
    // No valid link → hide QR area entirely
    wrap.style.display = 'none';
    return wrap;
  }

  const lbl = document.createElement('span');
  lbl.className = 'qr-label';
  lbl.textContent = label;
  wrap.appendChild(lbl);

  const img = document.createElement('img');
  img.alt    = 'QR Code';
  img.width  = displayPx;
  img.height = displayPx;
  img.className = 'qr-img';
  wrap.appendChild(img);

  // Generate at 2× for retina; display at displayPx
  qrDataURL(url, displayPx * 2)
    .then(src  => { img.src = src; })
    .catch(()  => {
      // Graceful fallback: show a small message instead of a blank square
      img.style.display = 'none';
      const err = document.createElement('span');
      err.className = 'qr-error';
      err.textContent = 'QR 無法產生';
      wrap.appendChild(err);
    });

  return wrap;
}

/* ── Modal ───────────────────────────────────────────────── */

function openModal(book) {
  const modal = document.getElementById('book-modal');
  const body  = document.getElementById('modal-body');

  // Clear previous content safely
  while (body.firstChild) body.removeChild(body.firstChild);

  // Title
  const h2 = document.createElement('h2');
  h2.id          = 'modal-title';
  h2.textContent = book.title;
  body.appendChild(h2);

  // Author · Year · Language
  const meta = document.createElement('p');
  meta.className = 'modal-meta';
  meta.textContent = [book.author, book.year, book.lang]
    .filter(Boolean).join(' · ');
  body.appendChild(meta);

  // Tags
  if (book.tags.length > 0) {
    const tagsEl = makeTags(book.tags);
    body.appendChild(tagsEl);
  }

  // Summary
  if (book.summary) {
    const p = document.createElement('p');
    p.className   = 'modal-summary';
    p.textContent = book.summary;
    body.appendChild(p);
  }

  // Link + large QR
  if (book.book_link) {
    const link = makeLink(book.book_link, '前往連結');
    body.appendChild(link);

    const qrEl = makeQREl(book.book_link, 160, '掃描 QR 前往');
    qrEl.classList.add('modal-qr');
    body.appendChild(qrEl);
  }

  modal.hidden = false;
  document.getElementById('modal-close').focus();
}

export function setupModal() {
  const modal    = document.getElementById('book-modal');
  const closeBtn = document.getElementById('modal-close');
  const backdrop = document.getElementById('modal-backdrop');

  closeBtn.addEventListener('click',  () => { modal.hidden = true; });
  backdrop.addEventListener('click',  () => { modal.hidden = true; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) modal.hidden = true;
  });
}

/* ── Card factory ────────────────────────────────────────── */

export function createCard(book) {
  const card = document.createElement('article');
  card.className = 'book-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');

  // ── Cover ──────────────────────────────────────────────
  const cover = document.createElement('div');
  cover.className = 'card-cover';

  if (book.cover_image_url) {
    const img = document.createElement('img');
    img.src     = book.cover_image_url;
    img.alt     = `${book.title} 封面`;
    img.loading = 'lazy';
    img.onerror = () => {
      // Replace broken image with emoji placeholder (no innerHTML)
      cover.removeChild(img);
      cover.appendChild(makePlaceholder());
    };
    cover.appendChild(img);
  } else {
    cover.appendChild(makePlaceholder());
  }
  card.appendChild(cover);

  // ── Info ────────────────────────────────────────────────
  const info = document.createElement('div');
  info.className = 'card-info';

  const title = document.createElement('h2');
  title.className   = 'card-title';
  title.textContent = book.title;
  info.appendChild(title);

  const metaEl = document.createElement('p');
  metaEl.className   = 'card-meta';
  metaEl.textContent = `${book.author} · ${book.year}`;
  info.appendChild(metaEl);

  if (book.tags.length > 0) {
    info.appendChild(makeTags(book.tags.slice(0, 3)));
  }

  card.appendChild(info);

  // ── Actions (link + compact QR) ─────────────────────────
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  if (book.book_link) {
    const link = makeLink(book.book_link, '前往連結');
    // Prevent card click handler from firing when clicking the link
    link.addEventListener('click', e => e.stopPropagation());
    actions.appendChild(link);
    actions.appendChild(makeQREl(book.book_link, 48, '掃描 QR'));
  } else {
    const noLink = document.createElement('span');
    noLink.className   = 'no-link';
    noLink.textContent = '無可用連結';
    actions.appendChild(noLink);
  }
  card.appendChild(actions);

  // ── Interaction: open modal ─────────────────────────────
  card.addEventListener('click', e => {
    if (e.target.closest('a')) return; // let links bubble normally
    openModal(book);
  });
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(book);
    }
  });

  return card;
}

/* ── Render + filter ─────────────────────────────────────── */

/**
 * Replace the grid contents with cards for the given books array.
 */
export function renderCards(books, container) {
  while (container.firstChild) container.removeChild(container.firstChild);

  if (books.length === 0) {
    const msg = document.createElement('p');
    msg.className   = 'empty-msg';
    msg.textContent = '找不到相關書目';
    container.appendChild(msg);
    return;
  }

  const frag = document.createDocumentFragment();
  books.forEach(book => frag.appendChild(createCard(book)));
  container.appendChild(frag);
}

/**
 * Wire up the tag selector to re-render the grid.
 */
export function setupFilters(books, container, tagSelect) {
  // Populate tag options
  const allTags = [...new Set(books.flatMap(b => b.tags))].sort();
  allTags.forEach(tag => {
    const opt = document.createElement('option');
    opt.value       = tag;
    opt.textContent = tag;
    tagSelect.appendChild(opt);
  });

  function apply() {
    const t = tagSelect.value;
    const filtered = books.filter(b => {
      const matchT = !t || b.tags.includes(t);
      return matchT;
    });
    renderCards(filtered, container);
  }

  tagSelect.addEventListener('change', apply);
}

/* ── Small helpers (no innerHTML) ────────────────────────── */

function makePlaceholder() {
  const span = document.createElement('span');
  span.className = 'cover-placeholder';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = '📖';
  return span;
}

function makeTags(tags) {
  const wrap = document.createElement('div');
  wrap.className = 'card-tags';
  tags.forEach(tag => {
    const span = document.createElement('span');
    span.className   = 'tag';
    span.textContent = tag;
    wrap.appendChild(span);
  });
  return wrap;
}

function makeLink(href, label) {
  const a = document.createElement('a');
  a.href        = href;
  a.target      = '_blank';
  a.rel         = 'noopener noreferrer';
  a.className   = 'btn btn-link';
  a.textContent = label;
  return a;
}
