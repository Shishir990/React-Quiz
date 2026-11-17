// "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/131.0 Safari/537.36"
// -> { browser: 'Chrome', os: 'Windows', kind: 'desktop' }
// A rough guess for display only; order matters (Edge and Opera also say "Chrome").
const BROWSERS = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser/, 'Samsung Internet'],
  [/Firefox|FxiOS/, 'Firefox'],
  [/Chrome|CriOS/, 'Chrome'],
  [/Safari/, 'Safari'],
];

const SYSTEMS = [
  [/iPhone|iPod/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

const match = (ua, list) => list.find(([re]) => re.test(ua))?.[1] || '';

export function describeDevice(userAgent = '') {
  const browser = match(userAgent, BROWSERS);
  const os = match(userAgent, SYSTEMS);
  const kind = /iPad|Tablet/.test(userAgent) ? 'tablet'
    : /Mobi|iPhone|Android/.test(userAgent) ? 'phone'
    : 'desktop';

  // API tools (curl, Postman, ...) have no browser or OS we recognise
  const name = browser && os ? `${browser} on ${os}` : browser || os || 'Unknown device';
  return { name, browser, os, kind };
}
