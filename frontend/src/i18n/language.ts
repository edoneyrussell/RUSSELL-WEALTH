import french from './fr.json' with { type: 'json' };

export type Language = 'en' | 'fr';
export const languageKey = 'rw-language';
let currentLanguage: Language = 'en';
try { if (localStorage.getItem(languageKey) === 'fr') currentLanguage = 'fr'; } catch { /* Storage may be restricted. */ }
export const getLanguage = (): Language => currentLanguage;
export const getLocale = (englishLocale = 'en-CA') => currentLanguage === 'fr' ? 'fr-CA' : englishLocale;
export function setLanguage(language: Language) {
  currentLanguage = language;
  try { localStorage.setItem(languageKey, language); } catch { /* Keep the in-memory preference. */ }
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent('rw-language-changed', {detail: language}));
}
const translations: Record<string, string> = french;
const normalized = new Map(Object.entries(translations).map(([en, fr]) => [en.toLowerCase(), fr]));
const templates = Object.entries(translations).filter(([key]) => /\{\d+\}/.test(key)).map(([en, fr]) => ({
  pattern: new RegExp('^' + en.split(/\{\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$', 'i'), fr,
}));
/** Translate presentation text only; API values, URLs, account names and event logic stay in English. */
export function t(text: string): string {
  if (currentLanguage !== 'fr') return text;
  if (/^[-+−]?\d+\.\d+[%kM]?$/.test(text.trim())) {
    return text.replace('.', ',').replace(/%$/, '\u00a0%').replace(/k$/, ' k');
  }
  if (!/[a-z]/i.test(text)) return text;
  const value = text.trim().replace(/\s+/g, ' ');
  let translated = translations[value];
  if (!translated) {
    translated = normalized.get(value.toLowerCase()) ?? '';
    if (translated && value === value.toUpperCase()) translated = translated.toLocaleUpperCase('fr-CA');
  }
  if (!translated) for (const template of templates) {
    const match = value.match(template.pattern);
    if (match) { translated = template.fr.replace(/\{(\d+)\}/g, (_, index) => t(match[Number(index) + 1])); break; }
  }
  if (!translated) return text;
  return text.replace(text.trim(), translated);
}
/** Read the source label for legacy navigation that identifies actions by their text. */
export function sourceText(element: Node): string {
  if (element instanceof HTMLElement && element.dataset.rwSource !== undefined) return element.dataset.rwSource;
  if (element.nodeType === Node.TEXT_NODE) return element.textContent ?? '';
  return Array.from(element.childNodes, sourceText).join('');
}
