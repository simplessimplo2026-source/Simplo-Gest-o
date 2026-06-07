import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Edit3, FileText, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { deleteRow, insertRow, updateRow } from '../../lib/supabase.js';
import { useConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';

const tipos = ['Hora', 'Diário', 'Mensal', 'Metragem', 'Carga'];

const statusConfig = {
  pendente: { label: 'Pendente', className: 'warn-pill' },
  aprovado: { label: 'Aprovado', className: '' },
};

function today() {
  return new Date().toISOString().split('T')[0];
}

function emptyOrcamento() {
  return { cli_id: '', num: '', data: today(), tipo: 'Hora', valor: '', status: 'pendente' };
}

function clientName(orcamento, clientes) {
  const cliente = clientes.find((item) => String(item.id) === String(orcamento.cli_id || orcamento.cliId));
  return cliente?.fantasia || cliente?.nome || orcamento.cliente || '-';
}

function moneyValue(value) {
  if (typeof value === 'number') return value;
  const normalized = String(value || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(,|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyLabel(value) {
  return moneyValue(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateLabel(value) {
  if (!value) return '-';
  const parts = String(value).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <article className="stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
      <Icon size={22} />
    </article>
  );
}

function OrcamentoModal({ orcamento, clientes, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ ...emptyOrcamento(), ...(orcamento || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!values.cli_id) {
      setError('Selecione o cliente.');
      return;
    }
    if (!values.num.trim()) {
      setError('Informe o número do orçamento.');
      return;
    }

    setSaving(true);
    try {
      const cliente = clientes.find((item) => String(item.id) === String(values.cli_id));
      await onSave({
        cli_id: values.cli_id || null,
        cliente: cliente?.fantasia || cliente?.nome || null,
        num: values.num.trim(),
        data: values.data || today(),
        tipo: values.tipo || 'Hora',
        valor: moneyValue(values.valor),
        status: values.status || 'pendente',
      }, values.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="quick-modal entity-modal" onSubmit={handleSubmit}>
        <header>
          <strong>{values.id ? 'Editar Orçamento' : 'Novo Orçamento'}</strong>
          <button type="button" className="icon-button dark" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="quick-body">
          <label className="fg">
            <span className="fl">Cliente Vinculado</span>
            <select value={values.cli_id || values.cliId || ''} onChange={(event) => setField('cli_id', event.target.value)} required>
              <option value="">Selecione o cliente...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.fantasia || cliente.nome}</option>
              ))}
            </select>
          </label>
          <div className="form-grid cols-2">
            <label className="fg">
              <span className="fl">Número</span>
              <input className="mono" value={values.num || ''} onChange={(event) => setField('num', event.target.value)} required placeholder="001-2026" />
            </label>
            <label className="fg">
              <span className="fl">Data</span>
              <input type="date" value={values.data || today()} onChange={(event) => setField('data', event.target.value)} />
            </label>
          </div>
          <div className="form-grid cols-2">
            <label className="fg">
              <span className="fl">Tipo</span>
              <select value={values.tipo || 'Hora'} onChange={(event) => setField('tipo', event.target.value)}>
                {tipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </label>
            <label className="fg">
              <span className="fl">Status</span>
              <select value={values.status || 'pendente'} onChange={(event) => setField('status', event.target.value)}>
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
              </select>
            </label>
          </div>
          <label className="fg">
            <span className="fl">Valor Total</span>
            <input className="mono" value={values.valor ?? ''} onChange={(event) => setField('valor', event.target.value)} placeholder="R$ 0,00" />
          </label>
          {error ? <p className="form-error in-modal">{error}</p> : null}
        </div>
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Orçamento'}</button>
        </footer>
      </form>
    </div>
  );
}

export function OrcamentosPage({ data, onReload }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('todos');
  const [modalOrcamento, setModalOrcamento] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  const clientes = data?.clientes || [];
  const orcamentosBase = data?.orcamentos || [];

  const orcamentos = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...orcamentosBase]
      .filter((orcamento) => {
        if (status !== 'todos' && (orcamento.status || 'pendente') !== status) return false;
        if (!term) return true;
        const cliente = clientName(orcamento, clientes);
        return [orcamento.num, cliente, orcamento.tipo, orcamento.valor, orcamento.data]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || String(a.num || '').localeCompare(String(b.num || '')));
  }, [orcamentosBase, clientes, query, status]);

  const totals = useMemo(() => {
    const aprovados = orcamentosBase.filter((orcamento) => orcamento.status === 'aprovado');
    const pendentes = orcamentosBase.filter((orcamento) => (orcamento.status || 'pendente') !== 'aprovado');
    const valor = orcamentosBase.reduce((sum, orcamento) => sum + moneyValue(orcamento.valor), 0);
    return {
      total: orcamentosBase.length,
      aprovados: aprovados.length,
      pendentes: pendentes.length,
      clientes: new Set(orcamentosBase.map((orcamento) => orcamento.cli_id || orcamento.cliId).filter(Boolean)).size,
      valor,
    };
  }, [orcamentosBase]);

  function openNew() {
    setModalOrcamento(null);
    setModalOpen(true);
  }

  function openEdit(orcamento) {
    setModalOrcamento(orcamento);
    setModalOpen(true);
  }

  async function handleSave(payload, id) {
    try {
      if (id) await updateRow('orcamentos', id, payload);
      else await insertRow('orcamentos', payload);
      setModalOpen(false);
      await onReload();
      notifyToast({
        title: id ? 'Orçamento atualizado' : 'Orçamento cadastrado',
        message: payload.num ? `Nº ${payload.num}` : 'Cadastro salvo com sucesso.',
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao salvar orçamento',
        message: error.message || 'Confira os dados e tente novamente.',
      });
      throw error;
    }
  }

  async function handleDelete(orcamento) {
    const confirmed = await confirm({
      title: 'Excluir orçamento?',
      message: `O orçamento ${orcamento.num || '-'} será removido do cadastro.`,
      details: 'Essa ação não altera fichas já lançadas, mas remove o registro comercial.',
      confirmLabel: 'Excluir orçamento',
    });
    if (!confirmed) return;
    setBusyId(String(orcamento.id));
    try {
      await deleteRow('orcamentos', orcamento.id);
      await onReload();
      notifyToast({
        title: 'Orçamento excluído',
        message: `O orçamento ${orcamento.num || '-'} foi removido.`,
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao excluir orçamento',
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
          <h2>Orçamentos</h2>
          <p>{orcamentos.length} orçamento(s) encontrado(s)</p>
        </div>
        <button className="primary-button" type="button" onClick={openNew}><Plus size={16} /> Novo Orçamento</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total" value={totals.total} sub={`${moneyLabel(totals.valor)} em registros`} icon={FileText} />
        <StatCard label="Aprovados" value={totals.aprovados} sub="prontos para execução" icon={CheckCircle2} />
        <StatCard label="Pendentes" value={totals.pendentes} sub="aguardando retorno" icon={Clock3} />
        <StatCard label="Clientes" value={totals.clientes} sub="com orçamento vinculado" icon={Users} />
      </div>

      <div className="list-toolbar">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar número, cliente, tipo..." />
        </label>
        <div className="filter-pills">
          <button type="button" className={status === 'todos' ? 'active' : ''} onClick={() => setStatus('todos')}>Todos</button>
          <button type="button" className={status === 'aprovado' ? 'active' : ''} onClick={() => setStatus('aprovado')}>Aprovados</button>
          <button type="button" className={status === 'pendente' ? 'active' : ''} onClick={() => setStatus('pendente')}>Pendentes</button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>Orçamentos</h2>
          <span>Controle comercial vinculado aos clientes</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Status</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((orcamento) => {
                const statusInfo = statusConfig[orcamento.status || 'pendente'] || statusConfig.pendente;
                return (
                  <tr key={orcamento.id}>
                    <td className="mono">{orcamento.num || '-'}</td>
                    <td><strong>{clientName(orcamento, clientes)}</strong></td>
                    <td><span className="type-chip">{orcamento.tipo || '-'}</span></td>
                    <td className="mono money-cell">{moneyLabel(orcamento.valor)}</td>
                    <td className="mono">{dateLabel(orcamento.data)}</td>
                    <td><span className={`status-pill ${statusInfo.className}`}>{statusInfo.label}</span></td>
                    <td className="right">
                      <span className="row-actions">
                        <button className="ghost-button compact" type="button" onClick={() => openEdit(orcamento)}><Edit3 size={14} /> Editar</button>
                        <button className="danger-button compact" type="button" disabled={busyId === String(orcamento.id)} onClick={() => handleDelete(orcamento)}><Trash2 size={14} /></button>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!orcamentos.length ? (
                <tr><td className="empty-cell" colSpan="7">Nenhum orçamento cadastrado.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen ? (
        <OrcamentoModal
          orcamento={modalOrcamento}
          clientes={clientes}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}
