import { useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2, Trophy, UserRoundCog, X } from 'lucide-react';
import { deleteRow, insertRow, updateRow } from '../../lib/supabase.js';
import { useConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';

const cargos = ['Op. Escavadeira', 'Op. Trator', 'Op. Rolo Compactador', 'Motorista', 'Mecânico', 'Ajudante'];

const statusConfig = {
  ativo: { label: 'Ativo', className: '' },
  ferias: { label: 'De Férias', className: 'info-pill' },
  afastado: { label: 'Afastado', className: 'muted-pill' },
};

function emptyFuncionario() {
  return { nome: '', cargo: 'Op. Escavadeira', tel: '', maquina: '', status: 'ativo', dias: 0 };
}

function machineForFuncionario(funcionario, equipamentos) {
  const direct = funcionario.maquina;
  const byOperator = equipamentos.find((equipamento) => equipamento.operador === funcionario.nome)?.nome;
  return direct || byOperator || '-';
}

function normalizeNumber(value) {
  const parsed = Number(String(value || '0').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function FuncionarioModal({ funcionario, equipamentos, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ ...emptyFuncionario(), ...(funcionario || {}) }));
  const [saving, setSaving] = useState(false);

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        nome: values.nome.trim(),
        cargo: values.cargo || 'Op. Escavadeira',
        tel: values.tel.trim(),
        maquina: values.maquina || null,
        status: values.status || 'ativo',
        dias: normalizeNumber(values.dias),
      }, values.id, funcionario || null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="quick-modal entity-modal" onSubmit={handleSubmit}>
        <header>
          <strong>{values.id ? 'Editar Funcionário' : 'Novo Funcionário'}</strong>
          <button type="button" className="icon-button dark" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="quick-body">
          <label className="fg">
            <span className="fl">Nome Completo</span>
            <input autoFocus value={values.nome} onChange={(event) => setField('nome', event.target.value)} required placeholder="Nome do funcionário" />
          </label>
          <div className="form-grid cols-2">
            <label className="fg">
              <span className="fl">Cargo</span>
              <select value={values.cargo} onChange={(event) => setField('cargo', event.target.value)}>
                {cargos.map((cargo) => <option key={cargo} value={cargo}>{cargo}</option>)}
              </select>
            </label>
            <label className="fg">
              <span className="fl">Telefone</span>
              <input value={values.tel || ''} onChange={(event) => setField('tel', event.target.value)} placeholder="(47) 9..." />
            </label>
          </div>
          <div className="form-grid cols-3">
            <label className="fg">
              <span className="fl">Equipamento</span>
              <select value={values.maquina || ''} onChange={(event) => setField('maquina', event.target.value)}>
                <option value="">Sem equipamento</option>
                {equipamentos.map((equipamento) => (
                  <option key={equipamento.id || equipamento.nome} value={equipamento.nome}>
                    {equipamento.ico || '⬡'} {equipamento.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="fg">
              <span className="fl">Status</span>
              <select value={values.status} onChange={(event) => setField('status', event.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="ferias">De Férias</option>
                <option value="afastado">Afastado</option>
              </select>
            </label>
            <label className="fg">
              <span className="fl">Dias/Mês</span>
              <input type="number" min="0" step="1" value={values.dias || 0} onChange={(event) => setField('dias', event.target.value)} />
            </label>
          </div>
        </div>
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Funcionário'}</button>
        </footer>
      </form>
    </div>
  );
}

export function FuncionariosPage({ data, onReload }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('todos');
  const [modalFuncionario, setModalFuncionario] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  const equipamentos = data?.equipamentos || [];

  const funcionarios = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...(data?.funcionarios || [])]
      .filter((funcionario) => {
        if (status !== 'todos' && (funcionario.status || 'ativo') !== status) return false;
        if (!term) return true;
        const maquina = machineForFuncionario(funcionario, data?.equipamentos || []);
        return [funcionario.nome, funcionario.cargo, funcionario.tel, maquina]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  }, [data, query, status]);

  const ranking = useMemo(() => {
    return [...(data?.funcionarios || [])]
      .sort((a, b) => Number(b.dias || 0) - Number(a.dias || 0))
      .slice(0, 3);
  }, [data]);

  function openNew() {
    setModalFuncionario(null);
    setModalOpen(true);
  }

  function openEdit(funcionario) {
    setModalFuncionario(funcionario);
    setModalOpen(true);
  }

  async function syncEquipmentOperator(payload, previous) {
    const previousMachine = previous?.maquina;
    const nextMachine = payload.maquina;

    if (previousMachine && previousMachine !== nextMachine) {
      const oldEquipment = equipamentos.find((equipamento) => equipamento.nome === previousMachine);
      if (oldEquipment?.id && oldEquipment.operador === previous.nome) {
        await updateRow('equipamentos', oldEquipment.id, { operador: null });
      }
    }

    if (nextMachine) {
      const nextEquipment = equipamentos.find((equipamento) => equipamento.nome === nextMachine);
      if (nextEquipment?.id && nextEquipment.operador !== payload.nome) {
        await updateRow('equipamentos', nextEquipment.id, { operador: payload.nome });
      }
    }
  }

  async function handleSave(payload, id, previous) {
    try {
      if (id) await updateRow('funcionarios', id, payload);
      else await insertRow('funcionarios', payload);
      await syncEquipmentOperator(payload, previous);
      setModalOpen(false);
      await onReload();
      notifyToast({
        title: id ? 'Funcionário atualizado' : 'Funcionário cadastrado',
        message: payload.nome || 'Cadastro salvo com sucesso.',
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao salvar funcionário',
        message: error.message || 'Confira os dados e tente novamente.',
      });
      throw error;
    }
  }

  async function handleDelete(funcionario) {
    const confirmed = await confirm({
      title: 'Excluir funcionário?',
      message: `O funcionário ${funcionario.nome || '-'} será removido da equipe.`,
      details: 'O vínculo com equipamento também será limpo quando existir.',
      confirmLabel: 'Excluir funcionário',
    });
    if (!confirmed) return;
    setBusyId(String(funcionario.id));
    try {
      const equipment = equipamentos.find((item) => item.operador === funcionario.nome);
      if (equipment?.id) await updateRow('equipamentos', equipment.id, { operador: null });
      await deleteRow('funcionarios', funcionario.id);
      await onReload();
      notifyToast({
        title: 'Funcionário excluído',
        message: `${funcionario.nome || '-'} foi removido da equipe.`,
      });
    } catch (error) {
      notifyToast({
        type: 'error',
        title: 'Falha ao excluir funcionário',
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
          <h2>Funcionários</h2>
          <p>{funcionarios.length} funcionário(s) encontrado(s)</p>
        </div>
        <button className="primary-button" type="button" onClick={openNew}><Plus size={16} /> Novo Funcionário</button>
      </div>

      <section className="ranking-strip">
        <div>
          <Trophy size={18} />
          <strong>Ranking do mês</strong>
          <span>Dias lançados</span>
        </div>
        {ranking.map((funcionario, index) => (
          <article key={funcionario.id || funcionario.nome}>
            <b>{index + 1}</b>
            <span>{funcionario.nome || '-'}</span>
            <strong>{Number(funcionario.dias || 0)} dias</strong>
          </article>
        ))}
        {!ranking.length ? <p>Nenhum lançamento ainda</p> : null}
      </section>

      <div className="list-toolbar">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar funcionário..." />
        </label>
        <div className="filter-pills">
          <button type="button" className={status === 'todos' ? 'active' : ''} onClick={() => setStatus('todos')}>Todos</button>
          <button type="button" className={status === 'ativo' ? 'active' : ''} onClick={() => setStatus('ativo')}>Ativos</button>
          <button type="button" className={status === 'ferias' ? 'active' : ''} onClick={() => setStatus('ferias')}>Férias</button>
          <button type="button" className={status === 'afastado' ? 'active' : ''} onClick={() => setStatus('afastado')}>Afastados</button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>Equipe</h2>
          <span>Funcionários, cargos e equipamentos vinculados</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Cargo</th>
                <th>Equipamento</th>
                <th>Dias/Mês</th>
                <th>Status</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.map((funcionario) => {
                const statusInfo = statusConfig[funcionario.status || 'ativo'] || statusConfig.ativo;
                return (
                  <tr key={funcionario.id}>
                    <td>
                      <strong>{funcionario.nome || '-'}</strong>
                      <div className="muted mono">{funcionario.tel || '-'}</div>
                    </td>
                    <td>{funcionario.cargo || '-'}</td>
                    <td>{machineForFuncionario(funcionario, equipamentos)}</td>
                    <td className="mono right">{Number(funcionario.dias || 0)}</td>
                    <td><span className={`status-pill ${statusInfo.className}`}>{statusInfo.label}</span></td>
                    <td className="right">
                      <span className="row-actions">
                        <button className="ghost-button compact" type="button" onClick={() => openEdit(funcionario)}><Edit3 size={14} /> Editar</button>
                        <button className="danger-button compact" type="button" disabled={busyId === String(funcionario.id)} onClick={() => handleDelete(funcionario)}><Trash2 size={14} /></button>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!funcionarios.length ? (
                <tr><td className="empty-cell" colSpan="6"><UserRoundCog size={22} /> Nenhum funcionário encontrado.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen ? (
        <FuncionarioModal
          funcionario={modalFuncionario}
          equipamentos={equipamentos}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}
