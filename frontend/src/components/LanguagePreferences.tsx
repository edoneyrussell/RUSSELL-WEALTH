import { useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { getLanguage, setLanguage, type Language } from '../i18n/language.ts';

export default function LanguagePreferences() {
  const [selected, setSelected] = useState<Language>(getLanguage);
  const current = getLanguage();
  const saved = new URLSearchParams(window.location.hash.slice(1)).get('saved') === 'language';
  return <form className="rw-language-preferences max-w-xl space-y-4" onSubmit={event => {
    event.preventDefault();
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#languages&saved=language`);
    setLanguage(selected);
  }}>
    <p className="text-sm leading-6 text-[#91a498]">Choose the language used throughout Russell Wealth. Your choice is remembered on this device.</p>
    <label className="block text-sm font-medium" htmlFor="website-language">Website language</label>
    <div className="relative">
      <Languages aria-hidden="true" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a4cfb5]" />
      <select id="website-language" value={selected} onChange={event => setSelected(event.target.value as Language)} className="rw-fintech-field min-h-11 w-full rounded-xl border py-3 pl-10 pr-4 text-sm">
        <option value="en" translate="no">English</option>
        <option value="fr" translate="no">Français</option>
      </select>
    </div>
    <div className="flex flex-wrap items-center gap-4">
      <button type="submit" disabled={selected === current} className="rw-fintech-primary disabled:cursor-default disabled:opacity-50">Update language</button>
      {saved && selected === current && <p role="status" className="flex items-center gap-2 text-xs text-[#a4cfb5]"><Check size={15} aria-hidden="true" />Language updated.</p>}
    </div>
  </form>;
}
