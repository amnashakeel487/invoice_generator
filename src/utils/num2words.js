/**
 * Pakistani Lac/Crore Number-to-Words Converter
 * Port of num2words_pk.py
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function twoDigits(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]} ${ONES[o]}`;
}

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts = [];
  if (h > 0) parts.push(`${ONES[h]} Hundred`);
  if (r > 0) parts.push(twoDigits(r));
  return parts.join(' ');
}

function numberToWordsPk(number) {
  let num = parseFloat(number);
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const isNeg = num < 0;
  num = Math.abs(num);

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  const arab     = Math.floor(intPart / 1_000_000_000);
  const rem1     = intPart % 1_000_000_000;
  const crore    = Math.floor(rem1 / 10_000_000);
  const rem2     = rem1 % 10_000_000;
  const lac      = Math.floor(rem2 / 100_000);
  const rem3     = rem2 % 100_000;
  const thousand = Math.floor(rem3 / 1_000);
  const below    = rem3 % 1_000;

  const parts = [];
  if (arab > 0)     parts.push(`${threeDigits(arab)} Arab`);
  if (crore > 0)    parts.push(`${twoDigits(crore)} Crore`);
  if (lac > 0)      parts.push(`${twoDigits(lac)} Lac`);
  if (thousand > 0) parts.push(`${twoDigits(thousand)} Thousand`);
  if (below > 0)    parts.push(threeDigits(below));

  let words = parts.length > 0 ? parts.join(' ') : 'Zero';
  if (isNeg) words = `Minus ${words}`;

  let result = `Rupees ${words}`;
  if (decPart > 0) result += ` and ${twoDigits(decPart)} Paisas`;
  result += ' Only';

  return result;
}

module.exports = { numberToWordsPk };
