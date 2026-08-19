/** Shared helper utilities */

/**
 * Safely parse a float from a string that may contain units like "10kg", "5 liter", "Rs. 2500".
 */
function parseFloatSafely(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/,/g, '').trim();
  if (!s) return 0;
  const match = s.match(/[-+]?(?:\d+\.?\d*|\.\d+)/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Format a number with commas, e.g. 151500 → "151,500"
 */
function formatNumber(n) {
  const f = parseFloatSafely(n);
  if (f % 1 === 0) return f.toLocaleString('en-PK');
  return f.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Get today's date as DD-MM-YYYY
 */
function todayStr() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

module.exports = { parseFloatSafely, formatNumber, todayStr };
