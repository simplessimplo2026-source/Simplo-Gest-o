import { useState } from 'react';
import { Check, ChevronDown, Clock } from 'lucide-react';

export function Field({ label, children }) {
  return (
    <label className="fg">
      <span className="fl">{label}</span>
      {children}
    </label>
  );
}

export function Section({ icon, title, aside, children }) {
  return (
    <section className="ficha-section">
      <header>
        <div><span>{icon}</span>{title}</div>
        {aside}
      </header>
      <div className="ficha-section-body">{children}</div>
    </section>
  );
}

const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hour = String(Math.floor(index / 4)).padStart(2, '0');
  const minute = String((index % 4) * 15).padStart(2, '0');
  return `${hour}:${minute}`;
});

function cleanTimeDraft(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (value.includes(':')) return value.replace(/[^\d:]/g, '').slice(0, 5);
  if (digits.length > 2) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return digits;
}

export function TimeField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);

  function chooseTime(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <label className={`fg time-field ${open ? 'open' : ''}`}>
      <span className="fl">{label}</span>
      <div
        className="time-control"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <input
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => onChange(cleanTimeDraft(event.target.value))}
          placeholder="--:--"
          inputMode="numeric"
          maxLength={5}
        />
        <button type="button" onClick={() => setOpen((current) => !current)} aria-label={`Escolher ${label}`}>
          <Clock size={15} />
        </button>
        {open ? (
          <div className="time-popover">
            <button type="button" className="muted-option" onClick={() => chooseTime('')}>Limpar</button>
            {TIME_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                className={value === option ? 'active' : ''}
                onClick={() => chooseTime(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </label>
  );
}

function optionMatches(option, term) {
  if (!term) return true;
  const normalizedTerm = String(term || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normalizedLabel = [option.label, option.meta]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalizedLabel.includes(normalizedTerm);
}

export function ChoiceSelect({ value, onChange, options, placeholder = 'Selecione...', emptyLabel = '', disabled = false, searchable = true }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((option) => String(option.value) === String(value));
  const selectedLabel = selected?.meta ? `${selected.label} - ${selected.meta}` : selected?.label;
  const filteredOptions = options.filter((option) => optionMatches(option, search));
  const menuOptions = emptyLabel && !search ? [{ value: '', label: emptyLabel, muted: true }, ...filteredOptions] : filteredOptions;

  function choose(optionValue) {
    onChange(optionValue);
    setSearch('');
    setOpen(false);
  }

  function openMenu() {
    if (disabled) return;
    setOpen(true);
    setSearch('');
  }

  return (
    <div
      className={`choice-select ${open ? 'open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setSearch('');
        }
      }}
    >
      <div className={`choice-trigger ${selected ? '' : 'placeholder'} ${searchable ? 'searchable' : ''}`}>
        {searchable ? (
          <input
            value={open ? search : ''}
            onFocus={openMenu}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
            }}
            placeholder={open ? (selectedLabel || placeholder) : (selectedLabel || placeholder)}
            disabled={disabled}
            aria-expanded={open}
          />
        ) : (
          <button type="button" onClick={() => setOpen((current) => !current)} disabled={disabled} aria-expanded={open}>
            <span>{selectedLabel || placeholder}</span>
          </button>
        )}
        <button type="button" className="choice-chevron" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} disabled={disabled} aria-label="Abrir opções">
          <ChevronDown size={16} />
        </button>
      </div>
      {open ? (
        <div className="choice-menu">
          {menuOptions.length ? menuOptions.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <button
                type="button"
                key={`${option.value}-${option.label}`}
                className={`${active ? 'active' : ''} ${option.muted ? 'muted-option' : ''}`}
                onClick={() => choose(option.value)}
              >
                <span className="choice-option-text">
                  <strong>{option.label}</strong>
                  {option.meta ? <small>{option.meta}</small> : null}
                </span>
                {active ? <Check size={14} /> : null}
              </button>
            );
          }) : (
            <button type="button" className="muted-option" disabled>Nenhuma opção cadastrada</button>
          )}
        </div>
      ) : null}
    </div>
  );
}

