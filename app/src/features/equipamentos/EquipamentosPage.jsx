import { useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { deleteRow, insertRow, updateRow } from '../../lib/supabase.js';
import { useConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';
import { normalizeTextKey, sameText } from '../../lib/reports.js';

const statusConfig = {
  em_servico: { label: 'Em Serviço', className: '', dot: 'green' },
  disponivel: { label: 'Disponível', className: 'info-pill', dot: 'yellow' },
  manutencao: { label: 'Manutenção', className: 'warn-pill', dot: 'red' },
};

function emptyEquipamento() {
  return { nome: '', modelo: '', placa: '', ico: '🚜', operador: '', status: 'em_servico' };
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function EquipamentoModal({ equipamento, funcionarios, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ ...emptyEquipamento(), ...(equipamento || {}) }));
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
      setError('Informe o nome ou apelido do equipamento.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nome,
        modelo: cleanText(values.modelo),
        placa: cleanText(values.placa).toUpperCase(),
        ico: values.ico || '🚜',
        operador: values.operador || null,
        status: values.status || 'em_servico',
      }, values.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="quick-modal entity-modal" onSubmit={handleSubmit}>
        <header>
          <strong>{values.id ? 'Editar Equipamento' : 'Novo Equipamento'}</strong>
          <button type="button" className="icon-button dark" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="quick-body">
          <label className="fg">
            <span className="fl">Nome / Apelido</span>
            <input autoFocus value={values.nome} onChange={(event) => setField('nome', event.target.value)} required placeholder="Ex: Escavadeira 02" />
          </label>
          <div className="form-grid cols-3">
            <label className="fg">
              <span className="fl">Modelo</span>
              <input value={values.modelo} onChange={(event) => setField('modelo', event.target.value)} placeholder="CAT 320 · 2022" />
            </label>
            <label className="fg">
              <span className="fl">Placa / ID</span>
              <input value={values.placa} onChange={(event) => setField('placa', event.target.value)} />
            </label>
            <label className="fg">
              <span className="fl">Ícone</span>
              <select value={values.ico} onChange={(event) => setField('ico', event.target.value)}>
                <option>🚜</option>
                <option>🚛</option>
                <option>🏗️</option>
                <option>🚧</option>
                <option>⛏️</option>
                <option>🚒</option>
              </select>
            </label>
          </div>
          <div className="form-grid cols-2">
            <label className="fg">
              <span className="fl">Operador</span>
              <select value={values.operador || ''} onChange={(event) => setField('operador', event.target.value)}>
                <option value="">Sem operador</option>
                {funcionarios.map((funcionario) => (
                  <option key={funcionario.id || funcionario.nome} value={funcionario.nome}>{funcionario.nome}</option>
                ))}
              </select>
            </label>
            <label className="fg">
              <span className="fl">Status</span>
              <select value={values.status} onChange={(event) => setField('status', event.target.value)}>
                <option value="em_servico">Em Serviço</option>
                <option value="disponivel">Disponível</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </label>
          </div>
          {error ? <p className="form-error in-modal">{error}</p> : null}
        </div>
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Equipamento'}</button>
        </footer>
      </form>
    </div>
  );
}

export function EquipamentosPage({ data, onReload }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('todos');
  const [modalEquipamento, setModalEquipamento] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  const equipamentos = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...(data?.equipamentos || [])]
      .filter((equipamento) => {
        if (status !== 'todos' && equipamento.status !== status) return false;
        if (!term) return true;
        return [equipamento.nome, equipamento.modelo, equipamento.placa, equipamento.operador]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  }, [data, query, status]);

  function openNew() {
    setModalEquipamento(null);
    setModalOpen(true);
  }

  function openEdit(equipamento) {
    setModalEquipamento(equipamento);
    setModalOpen(true);
  }

  async function syncFuncionarioMachine(payload, previous, savedEquipmentId) {
    const funcionarios = data?.funcionarios || [];
    const previousOperator = previous?.operador || '';
    const nextOperator = payload.operador || '';
    const previousName = previous?.nome || '';
    const nextName = payload.nome || '';

    if (previousOperator && previousOperator !== nextOperator) {
      const oldFuncionario = funcionarios.find((funcionario) => sameText(funcionario.nome, previousOperator));
      if (oldFuncionario?.id && (!oldFuncionario.maquina || oldFuncionario.maquina === previousName || oldFuncionario.maquina === nextName)) {
        await updateRow('funcionarios', oldFuncionario.id, { maquina: null });
      }
    }

    if (nextOperator) {
      const duplicatedLinks = (data?.equipamentos || []).filter((equipamento) => (
        equipamento.id
        && String(equipamento.id) !== String(savedEquipmentId || previous?.id || '')
        && sameText(equipamento.operador, nextOperator)
      ));
      for (const equipamento of duplicatedLinks) {
        await updateRow('equipamentos', equipamento.id, { operador: null });
      }

      const nextFuncionario = funcionarios.find((funcionario) => sameText(funcionario.nome, nextOperator));
      if (nextFuncionario?.id && nextFuncionario.maquina !== nextName) {
        await updateRow('funcionarios', nextFuncionario.id, { maquina: nextName });
      }
    }
  }

  async function handleSave(payload, id) {
    try {
      const duplicate = (data?.equipamentos || []).find((equipamento) => {
        if (id && String(equipamento.id) === String(id)) return false;
        const samePlate = normalizeTextKey(payload.placa)
          && normalizeTextKey(equipamento.placa) === normalizeTextKey(payload.placa);
        const sameNameAndModel = !normalizeTextKey(payload.placa)
          && normalizeTextKey(payload.modelo)
          && normalizeTextKey(equipamento.nome) === normalizeTextKey(payload.nome)
          && normalizeTextKey(equipamento.modelo) === normalizeTextKey(payload.modelo);
        return samePlate || sameNameAndModel;
      });
      if (duplicate) {
        throw new Error(`Equipamento já cadastrado: ${duplicate.nome}${duplicate.placa ? ` (${duplicate.placa})` : ''}.`);
      }
      const savedEquipment = id ? await updateRow('equipamentos', id, payload) : await insertRow('equipamentos', payload);
      await syncFuncionarioMachine(payload, modalEquipamento, savedEquipment?.id || id);
      setModalOpen(false);
      await onReload();
      notifyToast({
        title: id ? 'Equipamento atualizado' : 'Equipamento cadastrado',
        message: payload.nome || 'Cadastro salvo com sucesso.',
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao salvar equipamento',
        message: error.message || 'Confira os dados e tente novamente.',
      });
      throw error;
    }
  }

  async function handleDelete(equipamento) {
    const confirmed = await confirm({
      title: 'Excluir equipamento?',
      message: `O equipamento ${equipamento.nome || '-'} será removido da frota.`,
      details: 'Se houver ficha usando este equipamento, revise antes de excluir.',
      confirmLabel: 'Excluir equipamento',
    });
    if (!confirmed) return;
    setBusyId(String(equipamento.id));
    try {
      const funcionario = (data?.funcionarios || []).find((item) => item.nome === equipamento.operador || item.maquina === equipamento.nome);
      if (funcionario?.id && (!funcionario.maquina || funcionario.maquina === equipamento.nome)) {
        await updateRow('funcionarios', funcionario.id, { maquina: null });
      }
      await deleteRow('equipamentos', equipamento.id);
      await onReload();
      notifyToast({
        title: 'Equipamento excluído',
        message: `${equipamento.nome || '-'} foi removido da frota.`,
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao excluir equipamento',
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
          <h2>Equipamentos</h2>
          <p>{equipamentos.length} equipamento(s) encontrado(s)</p>
        </div>
        <button className="primary-button" type="button" onClick={openNew}><Plus size={16} /> Novo Equipamento</button>
      </div>

      <div className="list-toolbar">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar equipamento..." />
        </label>
        <div className="filter-pills">
          <button type="button" className={status === 'todos' ? 'active' : ''} onClick={() => setStatus('todos')}>Todos</button>
          <button type="button" className={status === 'em_servico' ? 'active' : ''} onClick={() => setStatus('em_servico')}>Em Serviço</button>
          <button type="button" className={status === 'disponivel' ? 'active' : ''} onClick={() => setStatus('disponivel')}>Disponíveis</button>
          <button type="button" className={status === 'manutencao' ? 'active' : ''} onClick={() => setStatus('manutencao')}>Manutenção</button>
        </div>
      </div>

      <div className="entity-grid">
        {equipamentos.map((equipamento) => {
          const statusInfo = statusConfig[equipamento.status] || statusConfig.em_servico;
          return (
            <article className="entity-card equipment-card" key={equipamento.id}>
              <header>
                <div className="entity-avatar icon-avatar">{equipamento.ico || '🚜'}</div>
                <div className="equipment-id">
                  <span className={`status-dot ${statusInfo.dot}`} />
                  <strong>{equipamento.placa || '-'}</strong>
                </div>
              </header>
              <div className="entity-body">
                <h3>{equipamento.nome || '-'}</h3>
                <p>{equipamento.modelo || '-'}</p>
                <dl>
                  <div><dt>Operador</dt><dd>{equipamento.operador || '-'}</dd></div>
                  <div><dt>Status</dt><dd><span className={`status-pill ${statusInfo.className}`}>{statusInfo.label}</span></dd></div>
                </dl>
              </div>
              <footer>
                <button className="ghost-button compact" type="button" onClick={() => openEdit(equipamento)}><Edit3 size={14} /> Editar</button>
                <button className="danger-button compact" type="button" disabled={busyId === String(equipamento.id)} onClick={() => handleDelete(equipamento)}><Trash2 size={14} /></button>
              </footer>
            </article>
          );
        })}
        {!equipamentos.length ? (
          <section className="panel empty-panel entity-empty">
            <h2>Nenhum equipamento encontrado</h2>
            <p>Ajuste a busca ou cadastre um novo equipamento.</p>
          </section>
        ) : null}
      </div>

      {modalOpen ? (
        <EquipamentoModal
          equipamento={modalEquipamento}
          funcionarios={data?.funcionarios || []}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}
