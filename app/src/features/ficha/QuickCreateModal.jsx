import { useState } from 'react';
import { X } from 'lucide-react';
import { MATERIAL_UNIT_OPTIONS } from '../../lib/units.js';
import { Field } from './fichaFormComponents.jsx';

export function QuickCreateModal({ request, onCancel, onSave, saving, error }) {
  const [values, setValues] = useState({ nome: '', fantasia: '', cidade: '', tel: '', unidades: ['m3'] });
  const isCliente = request?.type === 'cliente';
  const isMaterial = request?.type === 'material';
  const title = isCliente
    ? 'Novo Cliente'
    : isMaterial
      ? 'Novo Material'
      : 'Novo Barreiro';

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleMaterialUnit(unitId) {
    setValues((current) => {
      const selected = current.unidades || [];
      const next = selected.includes(unitId)
        ? selected.filter((item) => item !== unitId)
        : [...selected, unitId];
      return { ...current, unidades: next };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(values);
  }

  return (
    <div className="nested-backdrop">
      <form className="quick-modal" onSubmit={handleSubmit}>
        <header>
          <strong>{title}</strong>
          <button type="button" className="icon-button dark" onClick={onCancel} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="quick-body">
          <Field label={isCliente ? 'Razão Social / Nome' : 'Nome'}>
            <input autoFocus value={values.nome} onChange={(event) => setField('nome', event.target.value)} required />
          </Field>
          {isCliente ? (
            <>
              <Field label="Nome Fantasia">
                <input value={values.fantasia} onChange={(event) => setField('fantasia', event.target.value)} placeholder="Opcional" />
              </Field>
              <div className="form-grid cols-2">
                <Field label="Cidade / Obra">
                  <input value={values.cidade} onChange={(event) => setField('cidade', event.target.value)} />
                </Field>
                <Field label="Telefone">
                  <input value={values.tel} onChange={(event) => setField('tel', event.target.value)} />
                </Field>
              </div>
            </>
          ) : null}
          {isMaterial ? (
            <div className="fg">
              <span className="fl">Unidades permitidas</span>
              <p className="material-modal-note">
                Escolha quais campos aparecem na ficha quando este material for selecionado.
              </p>
              <div className="unit-toggle-grid compact-units">
                {MATERIAL_UNIT_OPTIONS.map((unit) => {
                  const checked = (values.unidades || []).includes(unit.id);
                  return (
                    <label className={`unit-toggle ${checked ? 'active' : ''}`} key={unit.id}>
                      <input type="checkbox" checked={checked} onChange={() => toggleMaterialUnit(unit.id)} />
                      <strong>{unit.short}</strong>
                      <span>{unit.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
          {error ? <p className="form-error in-modal">{error}</p> : null}
        </div>
        <footer>
          <button type="button" className="ghost-button" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </footer>
      </form>
    </div>
  );
}

