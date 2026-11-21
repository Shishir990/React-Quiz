// Light/dark mode.
// Dark mode = the black + soft-lime look from Theme.css and SoftLime.css.
// Light mode = the app's original light design: those two sheets are switched
// off, so the page stylesheets show their own colours again.
// Both sheets are loaded as text into one <style> at the end of <head>, so they
// still come after (and win over) every page stylesheet. main.jsx calls
// installTheme() once all imports, and so all page stylesheets, have loaded.
import themeCss from './styles/Theme.css?inline';
import softLimeCss from './styles/SoftLime.css?inline';

const STORAGE_KEY = 'theme';
const SHEET_ID = 'dark-theme';

export const getTheme = () =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

const apply = (theme) => {
  document.documentElement.dataset.theme = theme;
  const sheet = document.getElementById(SHEET_ID);
  if (sheet) sheet.media = theme === 'light' ? 'not all' : 'all';
};

export function installTheme() {
  // Reuse the element on hot reload instead of stacking copies
  const sheet = document.getElementById(SHEET_ID) || document.createElement('style');
  sheet.id = SHEET_ID;
  sheet.textContent = `${themeCss}\n${softLimeCss}`;
  document.head.appendChild(sheet); // (re)appending moves it to the end
  // index.html already set data-theme from the saved choice; match the sheet to it
  apply(getTheme());
}

export function setTheme(theme) {
  apply(theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* private mode: still switches for this visit */ }
}
