import assert from 'node:assert/strict';
import test from 'node:test';
import { getLanguage, getLocale, setLanguage, t } from '../src/i18n/language.ts';
import { localizeProps } from '../src/i18n/presentation.ts';
import { landingContent } from '../src/content/landingContent.ts';

const saved = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value)}});
Object.defineProperty(globalThis, 'document', {configurable: true, value: {documentElement: {lang: 'en'}}});
Object.defineProperty(globalThis, 'window', {configurable: true, value: new EventTarget()});

test('language preference updates text, accessibility labels, locale and persistence', () => {
  setLanguage('fr');
  assert.equal(getLanguage(), 'fr');
  assert.equal(saved.get('rw-language'), 'fr');
  assert.equal(document.documentElement.lang, 'fr');
  assert.equal(getLocale(), 'fr-CA');
  assert.equal(t('Sign In'), 'Se connecter');
  const props = localizeProps('input', {placeholder: 'Email address', 'aria-label': 'Email address', value: 'my@example.com', type: 'email'}) as Record<string, unknown>;
  assert.equal(props.placeholder, 'Adresse courriel');
  assert.equal(props['aria-label'], 'Adresse courriel');
  assert.equal(props.value, 'my@example.com');
  setLanguage('en');
  assert.equal(t('Sign In'), 'Sign In');
  assert.equal(getLocale(), 'en-CA');
});

test('all public landing copy has a French translation while brand names remain unchanged', () => {
  setLanguage('fr');
  const names = new Set(['russellWealth', 'brandName', 'founderName', 'github', 'linkedin']);
  for (const [key, text] of Object.entries(landingContent)) {
    if (names.has(key)) assert.equal(t(text), text);
    else assert.notEqual(t(text), text, key);
  }
});

test('dynamic labels, uppercase headings and React fragments are localized', () => {
  setLanguage('fr');
  assert.equal(t('View daily baby portfolio'), 'Voir le portefeuille daily baby');
  assert.equal(t('12 active positions'), '12 positions actives');
  assert.equal(t('TOTAL PORTFOLIO VALUE'), 'VALEUR TOTALE DU PORTEFEUILLE');
  const props = localizeProps(Symbol.for('react.fragment'), {children: ['Showing ', 3, ' of ', 10, ' holdings']}) as Record<string, unknown>;
  assert.deepEqual(props.children, ['Affichage de ', 3, ' sur ', 10, ' placements']);
});

test('logos, explicit opt-outs, account data and navigation values are preserved', () => {
  setLanguage('fr');
  const logo = {src: '/assets/c8aca.png', alt: 'Russell Wealth'};
  assert.deepEqual(localizeProps('img', logo), {...logo, children: undefined});
  const account = {translate: 'no', children: 'Home'};
  assert.equal(localizeProps('span', account), account);
  const option = localizeProps('option', {value: 'SELF_DIRECTED', children: 'Self-directed'}) as Record<string, unknown>;
  assert.equal(option.value, 'SELF_DIRECTED');
  assert.equal(option.children, 'Autogéré');
  assert.equal(option['data-rw-source'], 'Self-directed');
  assert.equal(t('AAPL'), 'AAPL');
  assert.equal(t('daily baby'), 'daily baby');
});
