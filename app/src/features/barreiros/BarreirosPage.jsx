import { useMemo, useState } from 'react';
import { Edit3, MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import { deleteRow, insertRow, updateRow } from '../../lib/supabase.js';
import { useConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';
import { normalizeTextKey } from '../../lib/reports.js';

const statusConfig = {
  ativo: { label: 'Ativo', className: '' },
  preferencial: { label: 'Preferencial', className: 'warn-pill' },
  inativo: { label: 'Inativo', className: 'muted-pill' },
};

const tipos = ['Barreiro', 'Pedreira', 'Mineradora', 'Fornecedor Próprio'];

function emptyBarreiro() {
  return { nome: '', tipo: 'Barreiro', status: 'ativo', usos: 0 };
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function BarreiroModal({ barreiro, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ ...emptyBarreiro(), ...(barreiro || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const nome = cleanText(values.nome);
    if (!nome) {
      setError('Informe o nome do barreiro.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nome,
        tipo: values.tipo || 'Barreiro',
        status: values.status || 'ativo',
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
          <strong>{values.id ? 'Editar Barreiro' : 'Novo Barreiro'}</strong>
          <button type="button" className="icon-button dark" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="quick-body">
          <label className="fg">
            <span className="fl">Nome</span>
            <input autoFocus value={values.nome} onChange={(event) => setField('nome', event.target.value)} required placeholder="Ex: Barreiro São João" />
          </label>
          <div className="form-grid cols-2">
            <label className="fg">
              <span className="fl">Tipo</span>
              <select value={values.tipo} onChange={(event) => setField('tipo', event.target.value)}>
                {tipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </label>
            <label className="fg">
              <span className="fl">Status</span>
              <select value={values.status} onChange={(event) => setField('status', event.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="preferencial">Preferencial</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
          </div>
          {error ? <p className="form-error in-modal">{error}</p> : null}
        </div>
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Barreiro'}</button>
        </footer>
      </form>
    </div>
  );
}

export function BarreirosPage({ data, onReload }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('todos');
  const [modalBarreiro, setModalBarreiro] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  const barreiros = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...(data?.barreiros || [])]
      .filter((barreiro) => {
        if (status !== 'todos' && (barreiro.status || 'ativo') !== status) return false;
        if (!term) return true;
        return [barreiro.nome, barreiro.tipo]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  }, [data, query, status]);

  function openNew() {
    setModalBarreiro(null);
    setModalOpen(true);
  }

  function openEdit(barreiro) {
    setModalBarreiro(barreiro);
    setModalOpen(true);
  }

  async function handleSave(payload, id) {
    try {
      const duplicate = (data?.barreiros || []).find((barreiro) => (
        (!id || String(barreiro.id) !== String(id))
        && normalizeTextKey(barreiro.nome) === normalizeTextKey(payload.nome)
      ));
      if (duplicate) {
        throw new Error(`Barreiro já cadastrado: ${duplicate.nome}.`);
      }
      if (id) await updateRow('barreiros', id, payload);
      else await insertRow('barreiros', payload);
      setModalOpen(false);
      await onReload();
      notifyToast({
        title: id ? 'Barreiro atualizado' : 'Barreiro cadastrado',
        message: payload.nome || 'Cadastro salvo com sucesso.',
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao salvar barreiro',
        message: error.message || 'Confira os dados e tente novamente.',
      });
      throw error;
    }
  }

  async function handleDelete(barreiro) {
    const confirmed = await confirm({
      title: 'Excluir barreiro?',
      message: `O barreiro ${barreiro.nome || '-'} será removido do cadastro.`,
      details: 'Revise se ele ainda está sendo usado em fichas antes de excluir.',
      confirmLabel: 'Excluir barreiro',
    });
    if (!confirmed) return;
    setBusyId(String(barreiro.id));
    try {
      await deleteRow('barreiros', barreiro.id);
      await onReload();
      notifyToast({
        title: 'Barreiro excluído',
        message: `${barreiro.nome || '-'} foi removido do cadastro.`,
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao excluir barreiro',
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
          <h2>Barreiros</h2>
          <p>{barreiros.length} barreiro(s) encontrado(s)</p>
        </div>
        <button className="primary-button" type="button" onClick={openNew}><Plus size={16} /> Novo Barreiro</button>
      </div>

      <div className="list-toolbar">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar barreiro..." />
        </label>
        <div className="filter-pills">
          <button type="button" className={status === 'todos' ? 'active' : ''} onClick={() => setStatus('todos')}>Todos</button>
          <button type="button" className={status === 'ativo' ? 'active' : ''} onClick={() => setStatus('ativo')}>Ativos</button>
          <button type="button" className={status === 'preferencial' ? 'active' : ''} onClick={() => setStatus('preferencial')}>Preferenciais</button>
          <button type="button" className={status === 'inativo' ? 'active' : ''} onClick={() => setStatus('inativo')}>Inativos</button>
        </div>
      </div>

      <div className="entity-grid">
        {barreiros.map((barreiro) => {
          const statusInfo = statusConfig[barreiro.status || 'ativo'] || statusConfig.ativo;
          return (
            <article className="entity-card" key={barreiro.id}>
              <header>
                <div className="entity-avatar"><MapPin size={22} /></div>
                <span className={`status-pill ${statusInfo.className}`}>{statusInfo.label}</span>
              </header>
              <div className="entity-body">
                <h3>{barreiro.nome || '-'}</h3>
                <p>{barreiro.tipo || '-'}</p>
                <dl>
                  <div><dt>Usos no mês</dt><dd>{Number(barreiro.usos || 0)} registros</dd></div>
                </dl>
              </div>
              <footer>
                <button className="ghost-button compact" type="button" onClick={() => openEdit(barreiro)}><Edit3 size={14} /> Editar</button>
                <button className="danger-button compact" type="button" disabled={busyId === String(barreiro.id)} onClick={() => handleDelete(barreiro)}><Trash2 size={14} /></button>
              </footer>
            </article>
          );
        })}
        {!barreiros.length ? (
          <section className="panel empty-panel entity-empty">
            <h2>Nenhum barreiro encontrado</h2>
            <p>Ajuste a busca ou cadastre um novo barreiro.</p>
          </section>
        ) : null}
      </div>

      {modalOpen ? (
        <BarreiroModal
          barreiro={modalBarreiro}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}
