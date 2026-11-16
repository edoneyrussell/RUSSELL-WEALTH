import { useEffect, useState } from "react";
import { getLanguage, setLanguage } from '../i18n/language.ts';

export default function LanguageSelector() {
  const [selected, setSelected] = useState(getLanguage);
  useEffect(() => {
    const update = () => setSelected(getLanguage());
    window.addEventListener('rw-language-changed', update);
    return () => window.removeEventListener('rw-language-changed', update);
  }, []);

  return (
    <div className="rw-language-selector" role="group" aria-label="Language preference">
      {([ ["en", "🇨🇦 EN", "English"], ["fr", "🇫🇷 FR", "French"] ] as const).map(([value, label, name]) => (
        <button key={value} type="button" aria-label={name}
          aria-pressed={selected === value} onClick={() => { setSelected(value); setLanguage(value); }}>
          {label}
        </button>
      ))}
    </div>
  );
}
