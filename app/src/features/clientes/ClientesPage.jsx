import { useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { deleteRow, insertRow, updateRow } from '../../lib/supabase.js';
import { useConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';

function initials(cliente) {
  const name = cliente.fantasia || cliente.nome || '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

function emptyCliente() {
  return { nome: '', fantasia: '', cidade: '', tel: '', status: 'ativo' };
}

function ClienteModal({ cliente, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ ...emptyCliente(), ...(cliente || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const nome = values.nome.trim();
    if (!nome) {
      setError('Informe a razão social ou nome do cliente.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nome,
        fantasia: (values.fantasia || nome).trim(),
        cidade: values.cidade.trim(),
        tel: values.tel.trim(),
        status: values.status || 'ativo',
      }, values.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="quick-modal entity-modal" onSubmit={handleSubmit}>
        <header>
          <strong>{values.id ? 'Editar Cliente' : 'Novo Cliente'}</strong>
          <button type="button" className="icon-button dark" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="quick-body">
          <div className="form-grid cols-2">
            <label className="fg">
              <span className="fl">Razão Social / Nome</span>
              <input autoFocus value={values.nome} onChange={(event) => setField('nome', event.target.value)} required />
            </label>
            <label className="fg">
              <span className="fl">Nome Fantasia</span>
              <input value={values.fantasia} onChange={(event) => setField('fantasia', event.target.value)} />
            </label>
          </div>
          <div className="form-grid cols-2">
            <label className="fg">
              <span className="fl">Cidade / Obra</span>
              <input value={values.cidade} onChange={(event) => setField('cidade', event.target.value)} />
            </label>
            <label className="fg">
              <span className="fl">Telefone</span>
              <input value={values.tel} onChange={(event) => setField('tel', event.target.value)} />
            </label>
          </div>
          <label className="fg">
            <span className="fl">Status</span>
            <select value={values.status} onChange={(event) => setField('status', event.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </label>
          {error ? <p className="form-error in-modal">{error}</p> : null}
        </div>
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Cliente'}</button>
        </footer>
      </form>
    </div>
  );
}

export function ClientesPage({ data, onReload }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('todos');
  const [modalCliente, setModalCliente] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  const clientes = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...(data?.clientes || [])]
      .filter((cliente) => {
        if (status !== 'todos' && cliente.status !== status) return false;
        if (!term) return true;
        return [cliente.nome, cliente.fantasia, cliente.cidade, cliente.tel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => String(a.fantasia || a.nome || '').localeCompare(String(b.fantasia || b.nome || '')));
  }, [data, query, status]);

  function openNew() {
    setModalCliente(null);
    setModalOpen(true);
  }

  function openEdit(cliente) {
    setModalCliente(cliente);
    setModalOpen(true);
  }

  async function handleSave(payload, id) {
    try {
      if (id) await updateRow('clientes', id, payload);
      else await insertRow('clientes', payload);
      setModalOpen(false);
      await onReload();
      notifyToast({
        title: id ? 'Cliente atualizado' : 'Cliente cadastrado',
        message: payload.fantasia || payload.nome,
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao salvar cliente',
        message: error.message || 'Confira os dados e tente novamente.',
      });
      throw error;
    }
  }

  async function handleDelete(cliente) {
    const label = cliente.fantasia || cliente.nome;
    const confirmed = await confirm({
      title: 'Excluir cliente?',
      message: `O cliente ${label} será removido do cadastro.`,
      details: 'Confira se ele não está sendo usado em fichas ou orçamentos importantes.',
      confirmLabel: 'Excluir cliente',
    });
    if (!confirmed) return;
    setBusyId(String(cliente.id));
    try {
      await deleteRow('clientes', cliente.id);
      await onReload();
      notifyToast({
        title: 'Cliente excluído',
        message: `${label} foi removido do cadastro.`,
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao excluir cliente',
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
          <h2>Clientes</h2>
          <p>{clientes.length} cliente(s) encontrado(s)</p>
        </div>
        <button className="primary-button" type="button" onClick={openNew}><Plus size={16} /> Novo Cliente</button>
      </div>

      <div className="list-toolbar">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente..." />
        </label>
        <div className="filter-pills">
          <button type="button" className={status === 'todos' ? 'active' : ''} onClick={() => setStatus('todos')}>Todos</button>
          <button type="button" className={status === 'ativo' ? 'active' : ''} onClick={() => setStatus('ativo')}>Ativos</button>
          <button type="button" className={status === 'inativo' ? 'active' : ''} onClick={() => setStatus('inativo')}>Inativos</button>
        </div>
      </div>

      <div className="entity-grid">
        {clientes.map((cliente) => (
          <article className="entity-card" key={cliente.id}>
            <header>
              <div className="entity-avatar">{initials(cliente)}</div>
              <span className={`status-pill ${cliente.status === 'inativo' ? 'muted-pill' : ''}`}>{cliente.status === 'inativo' ? 'Inativo' : 'Ativo'}</span>
            </header>
            <div className="entity-body">
              <h3>{cliente.fantasia || cliente.nome || '-'}</h3>
              <p>{cliente.cidade || '-'}</p>
              <dl>
                <div><dt>Telefone</dt><dd>{cliente.tel || '-'}</dd></div>
                <div><dt>Contratos</dt><dd>-</dd></div>
                <div><dt>Total orçamentos</dt><dd>-</dd></div>
              </dl>
            </div>
            <footer>
              <button className="ghost-button compact" type="button" onClick={() => openEdit(cliente)}><Edit3 size={14} /> Editar</button>
              <button className="danger-button compact" type="button" disabled={busyId === String(cliente.id)} onClick={() => handleDelete(cliente)}><Trash2 size={14} /></button>
            </footer>
          </article>
        ))}
        {!clientes.length ? (
          <section className="panel empty-panel entity-empty">
            <h2>Nenhum cliente encontrado</h2>
            <p>Ajuste a busca ou cadastre um novo cliente.</p>
          </section>
        ) : null}
      </div>

      {modalOpen ? (
        <ClienteModal
          cliente={modalCliente}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}
