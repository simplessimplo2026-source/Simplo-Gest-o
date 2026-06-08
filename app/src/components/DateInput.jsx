import { useEffect, useState } from 'react';
import { brDateToISO, isoToBRDate, maskDateBR } from '../lib/reports.js';

export function DateInput({ value, onChange, className = '', placeholder = 'dd/mm/aaaa', ...props }) {
  const [text, setText] = useState(() => isoToBRDate(value));

  useEffect(() => {
    setText(isoToBRDate(value));
  }, [value]);

  function handleChange(event) {
    const masked = maskDateBR(event.target.value);
    setText(masked);
    const iso = brDateToISO(masked);
    if (iso || !masked) onChange(iso);
  }

  function handleBlur() {
    setText(isoToBRDate(value));
  }

  return (
    <input
      {...props}
      className={['date-input', className].filter(Boolean).join(' ')}
      type="text"
      inputMode="numeric"
      maxLength={10}
      placeholder={placeholder}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
