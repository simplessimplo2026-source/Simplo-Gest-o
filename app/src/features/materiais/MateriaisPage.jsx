import { useMemo, useState } from 'react';
import { Box, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { deleteRow, insertRow, updateRow } from '../../lib/supabase.js';
import { useConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';

function emptyMaterial() {
  return { nome: '', usos: 0 };
}

function MaterialModal({ material, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ ...emptyMaterial(), ...(material || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const nome = values.nome.trim();
    if (!nome) {
      setError('Informe o nome do material.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nome,
        usos: Number(values.usos || 0),
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
            <input autoFocus value={values.nome} onChange={(event) => setValues({ ...values, nome: event.target.value })} required placeholder="Ex: Terra comum, brita, areia..." />
          </label>
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
  const [modalMaterial, setModalMaterial] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  const materiais = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...(data?.materiais || [])]
      .filter((material) => !term || String(material.nome || '').toLowerCase().includes(term))
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  }, [data, query]);

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
      message: `O material ${material.nome || '-'} será removido do cadastro.`,
      details: 'Revise se este material ainda aparece em fichas recentes antes de excluir.',
      confirmLabel: 'Excluir material',
    });
    if (!confirmed) return;
    setBusyId(String(material.id));
    try {
      await deleteRow('materiais', material.id);
      await onReload();
      notifyToast({
        title: 'Material excluído',
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
      <div className="screen-actions">
        <div>
          <h2>Materiais</h2>
          <p>{materiais.length} material(is) cadastrado(s)</p>
        </div>
        <button className="primary-button" type="button" onClick={openNew}><Plus size={16} /> Novo Material</button>
      </div>

      <div className="list-toolbar">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar material..." />
        </label>
      </div>

      <div className="entity-grid">
        {materiais.map((material) => (
          <article className="entity-card" key={material.id}>
            <header>
              <div className="entity-avatar"><Box size={22} /></div>
            </header>
            <div className="entity-body">
              <h3>{material.nome || '-'}</h3>
              <p>Material disponível para ficha diária</p>
              <dl>
                <div><dt>Usos no mês</dt><dd>{Number(material.usos || 0)} registros</dd></div>
              </dl>
            </div>
            <footer>
              <button className="ghost-button compact" type="button" onClick={() => openEdit(material)}><Edit3 size={14} /> Editar</button>
              <button className="danger-button compact" type="button" disabled={busyId === String(material.id)} onClick={() => handleDelete(material)}><Trash2 size={14} /></button>
            </footer>
          </article>
        ))}
        {!materiais.length ? (
          <section className="panel empty-panel entity-empty">
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
