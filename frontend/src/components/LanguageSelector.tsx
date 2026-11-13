import { useState } from "react";

export default function LanguageSelector() {
  const [selected, setSelected] = useState<"en" | "fr">("en");

  return (
    <div className="rw-language-selector" role="group" aria-label="Language preference">
      {([ ["en", "🇨🇦 EN", "English"], ["fr", "🇫🇷 FR", "French"] ] as const).map(([value, label, name]) => (
        <button key={value} type="button" aria-label={name}
          aria-pressed={selected === value} onClick={() => setSelected(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}
