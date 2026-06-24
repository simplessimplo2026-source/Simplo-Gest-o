import { useMemo, useState } from 'react';
import { Box, CheckCircle2, Edit3, Layers3, Plus, Search, Trash2, X } from 'lucide-react';
import { deleteRow, insertRow, updateRow } from '../../lib/supabase.js';
import { useConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';
import { normalizeTextKey } from '../../lib/reports.js';
import { MATERIAL_UNIT_OPTIONS, materialUnitLabels, parseMaterialUnits } from '../../lib/units.js';

function emptyMaterial() {
  return { nome: '', usos: 0, unidades: ['m3'] };
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getMaterialUnits(value) {
  return parseMaterialUnits(value, ['m3'])
    .map((unitId) => MATERIAL_UNIT_OPTIONS.find((option) => option.id === unitId))
    .filter(Boolean);
}

function MaterialModal({ material, onClose, onSave }) {
  const [values, setValues] = useState(() => ({
    ...emptyMaterial(),
    ...(material || {}),
    unidades: parseMaterialUnits(material?.unidades, ['m3']),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleUnit(unitId) {
    setValues((current) => {
      const selected = parseMaterialUnits(current.unidades, []);
      const next = selected.includes(unitId)
        ? selected.filter((item) => item !== unitId)
        : [...selected, unitId];
      return { ...current, unidades: next };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const nome = cleanText(values.nome);
    if (!nome) {
      setError('Informe o nome do material.');
      return;
    }
    const unidades = parseMaterialUnits(values.unidades, []);
    if (!unidades.length) {
      setError('Selecione pelo menos uma unidade para este material.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nome,
        usos: Number(values.usos || 0),
        unidades: JSON.stringify(unidades),
      }, values.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="quick-modal entity-modal" onSubmit={handleSubmit}>
        <header>
          <strong>{values.id ? 'Editar Material' : 'Novo Material'}</strong>
          <button type="button" className="icon-button dark" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="quick-body">
          <label className="fg">
            <span className="fl">Nome do Material</span>
            <input
              autoFocus
              value={values.nome}
              onChange={(event) => setValues({ ...values, nome: event.target.value })}
              required
              placeholder="Ex: Terra comum, brita, areia..."
            />
          </label>
          <div className="fg">
            <span className="fl">Unidades permitidas na ficha</span>
            <p className="material-modal-note">
              Marque somente as medidas que fazem sentido para este material. Na ficha diaria, o sistema mostra apenas estas opcoes.
            </p>
            <div className="unit-toggle-grid">
              {MATERIAL_UNIT_OPTIONS.map((unit) => {
                const checked = parseMaterialUnits(values.unidades, []).includes(unit.id);
                return (
                  <label className={`unit-toggle ${checked ? 'active' : ''}`} key={unit.id}>
                    <input type="checkbox" checked={checked} onChange={() => toggleUnit(unit.id)} />
                    <strong>{unit.short}</strong>
                    <span>{unit.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {error ? <p className="form-error in-modal">{error}</p> : null}
        </div>
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Material'}</button>
        </footer>
      </form>
    </div>
  );
}

export function MateriaisPage({ data, onReload }) {
  const [query, setQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('todos');
  const [modalMaterial, setModalMaterial] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  const materialStats = useMemo(() => {
    const all = data?.materiais || [];
    const unitCounts = MATERIAL_UNIT_OPTIONS.map((unit) => ({
      ...unit,
      count: all.filter((material) => parseMaterialUnits(material.unidades, ['m3']).includes(unit.id)).length,
    }));
    const topUnit = [...unitCounts].sort((a, b) => b.count - a.count)[0] || MATERIAL_UNIT_OPTIONS[0];
    const multiUnit = all.filter((material) => parseMaterialUnits(material.unidades, ['m3']).length > 1).length;
    return {
      total: all.length,
      multiUnit,
      topUnit,
      unitCounts,
    };
  }, [data]);

  const materiais = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...(data?.materiais || [])]
      .filter((material) => !term || String(material.nome || '').toLowerCase().includes(term))
      .filter((material) => unitFilter === 'todos' || parseMaterialUnits(material.unidades, ['m3']).includes(unitFilter))
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  }, [data, query, unitFilter]);

  function openNew() {
    setModalMaterial(null);
    setModalOpen(true);
  }

  function openEdit(material) {
    setModalMaterial(material);
    setModalOpen(true);
  }

  async function handleSave(payload, id) {
    try {
      const duplicate = (data?.materiais || []).find((material) => (
        (!id || String(material.id) !== String(id))
        && normalizeTextKey(material.nome) === normalizeTextKey(payload.nome)
      ));
      if (duplicate) {
        throw new Error(`Material ja cadastrado: ${duplicate.nome}.`);
      }
      if (id) await updateRow('materiais', id, payload);
      else await insertRow('materiais', payload);
      setModalOpen(false);
      await onReload();
      notifyToast({
        title: id ? 'Material atualizado' : 'Material cadastrado',
        message: payload.nome || 'Cadastro salvo com sucesso.',
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao salvar material',
        message: error.message || 'Confira os dados e tente novamente.',
      });
      throw error;
    }
  }

  async function handleDelete(material) {
    const confirmed = await confirm({
      title: 'Excluir material?',
      message: `O material ${material.nome || '-'} sera removido do cadastro.`,
      details: 'Revise se este material ainda aparece em fichas recentes antes de excluir.',
      confirmLabel: 'Excluir material',
    });
    if (!confirmed) return;
    setBusyId(String(material.id));
    try {
      await deleteRow('materiais', material.id);
      await onReload();
      notifyToast({
        title: 'Material excluido',
        message: `${material.nome || '-'} foi removido do cadastro.`,
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao excluir material',
        message: error.message || 'Tente novamente em alguns instantes.',
      });
    } finally {
      setBusyId('');
    }
  }

  return (
    <section>
      <div className="materials-command">
        <div className="materials-command-copy">
          <span>Cadastro operacional</span>
          <h2>Materiais e unidades</h2>
          <p>Defina quais medidas aparecem na ficha diaria para cada material. Isso deixa o lancamento mais rapido e os relatorios mais limpos.</p>
        </div>
        <div className="materials-command-panel">
          <div>
            <span>materiais</span>
            <strong>{materialStats.total}</strong>
          </div>
          <div>
            <span>multiunidade</span>
            <strong>{materialStats.multiUnit}</strong>
          </div>
          <div>
            <span>mais usada</span>
            <strong>{materialStats.topUnit?.short || '-'}</strong>
          </div>
        </div>
        <button className="primary-button" type="button" onClick={openNew}><Plus size={16} /> Novo Material</button>
      </div>

      <div className="list-toolbar materials-toolbar">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar material..." />
        </label>
        <div className="material-filter-row" aria-label="Filtrar materiais por unidade">
          <button type="button" className={unitFilter === 'todos' ? 'active' : ''} onClick={() => setUnitFilter('todos')}>
            Todos <span>{materialStats.total}</span>
          </button>
          {materialStats.unitCounts.map((unit) => (
            <button
              type="button"
              key={unit.id}
              className={unitFilter === unit.id ? 'active' : ''}
              onClick={() => setUnitFilter(unit.id)}
            >
              {unit.short} <span>{unit.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="entity-grid">
        {materiais.map((material) => {
          const units = getMaterialUnits(material.unidades);
          return (
            <article className="entity-card material-card" key={material.id}>
              <header>
                <div className="entity-avatar"><Box size={22} /></div>
                <span className="material-card-status"><CheckCircle2 size={14} /> Ativo na ficha</span>
              </header>
              <div className="entity-body">
                <h3>{material.nome || '-'}</h3>
                <p>Material disponivel para lancamentos e relatorios.</p>
                <div className="material-unit-pills">
                  {units.map((unit) => (
                    <span key={unit.id}>
                      <strong>{unit.short}</strong>
                      {unit.label}
                    </span>
                  ))}
                </div>
                <dl>
                  <div><dt>Unidades</dt><dd>{materialUnitLabels(material.unidades)}</dd></div>
                  <div><dt>Usos no mes</dt><dd>{Number(material.usos || 0)} registros</dd></div>
                </dl>
              </div>
              <footer>
                <button className="ghost-button compact" type="button" onClick={() => openEdit(material)}><Edit3 size={14} /> Editar</button>
                <button className="danger-button compact" type="button" disabled={busyId === String(material.id)} onClick={() => handleDelete(material)}><Trash2 size={14} /></button>
              </footer>
            </article>
          );
        })}
        {!materiais.length ? (
          <section className="panel empty-panel entity-empty material-empty-panel">
            <Layers3 size={28} />
            <h2>Nenhum material encontrado</h2>
            <p>Ajuste a busca ou cadastre um novo material.</p>
          </section>
        ) : null}
      </div>

      {modalOpen ? (
        <MaterialModal
          material={modalMaterial}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}
