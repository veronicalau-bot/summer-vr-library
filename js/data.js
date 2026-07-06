/**
 * data.js — Fetches and parses the Google Sheet CSV.
 * Uses PapaParse (loaded globally via CDN <script>).
 * All string values are sanitized via textContent trick before use.
 * Only https:// URLs are accepted for external links.
 */

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vRS8zcY5oANbUWysZis7HURnmB5Gq9N_SIXZ7Re_3nKiFfIr0sNZvI_Eo060kSzwSwr0NmonUfqbRVt' +
  '/pub?output=csv';

/** Return a plain text string — prevents XSS via DOM injection. */
function sanitize(value) {
  if (value === null || value === undefined) return '';
  const el = document.createElement('span');
  el.textContent = String(value).trim();
  return el.textContent;
}

/** Accept only https:// links; return null for anything else. */
function safeUrl(raw) {
  const str = sanitize(raw);
  if (!str) return null;
  try {
    const u = new URL(str);
    return u.protocol === 'https:' ? str : null;
  } catch {
    return null;
  }
}

/**
 * Fetch and parse the published Google Sheet as CSV.
 * Resolves with an array of book objects, sorted by sort_order.
 */
export function fetchBooks() {
  return new Promise((resolve, reject) => {
    /* global Papa */
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete({ data, errors }) {
        if (errors.length) {
          console.warn('[data] CSV parse warnings:', errors);
        }
        const books = data.map((row, idx) => ({
          id:              sanitize(row.id)    || String(idx + 1),
          title:           sanitize(row.title) || '（書名未填）',
          author:          sanitize(row.author)|| '（作者未知）',
          year:            sanitize(row.year)  || '—',
          summary:         sanitize(row.summary),
          book_link:       safeUrl(row.book_link),
          cover_image_url: safeUrl(row.cover_image_url),
          tags: sanitize(row.tags)
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
          lang:       sanitize(row.lang),
          sort_order: Number.isFinite(+sanitize(row.sort_order))
            ? +sanitize(row.sort_order)
            : 9999,
        }));

        books.sort((a, b) => a.sort_order - b.sort_order);
        resolve(books);
      },
      error(err) {
        reject(new Error(`CSV fetch failed: ${err.message}`));
      },
    });
  });
}
