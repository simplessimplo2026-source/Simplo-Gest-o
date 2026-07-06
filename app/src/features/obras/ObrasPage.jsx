import { useMemo, useState } from 'react';
import { Building2, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { updateRow } from '../../lib/supabase.js';
import { useConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseContracts(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isMissingContractsColumn(error) {
  return /contratos_servicos|schema cache|column/i.test(error?.message || '');
}

function normalizeContracts(contracts) {
  return (Array.isArray(contracts) ? contracts : []).map((contract) => ({
    id: contract.id || crypto.randomUUID(),
    obra: cleanText(contract.obra || contract.nome),
    nome: cleanText(contract.nome || contract.obra),
    tipo: contract.tipo || 'diaria',
    valor: cleanText(contract.valor),
    valor_hora: cleanText(contract.valor_hora
      || contract.equipamentos?.find((item) => item.valor_hora || item.tipo === 'hora')?.valor_hora
      || (contract.equipamentos?.find((item) => item.tipo === 'hora')?.valor)
      || (contract.tipo === 'hora' ? contract.valor : '')),
    valor_diaria: cleanText(contract.valor_diaria
      || contract.equipamentos?.find((item) => item.valor_diaria || item.tipo === 'diaria')?.valor_diaria
      || (contract.equipamentos?.find((item) => item.tipo === 'diaria')?.valor)
      || (contract.tipo === 'diaria' ? contract.valor : '')),
    status: contract.status || 'ativo',
    equipamentos: Array.isArray(contract.equipamentos)
      ? contract.equipamentos.map((item) => ({
        id: item.id || crypto.randomUUID(),
        equipamento_id: item.equipamento_id || '',
        equipamento_nome: cleanText(item.equipamento_nome),
        equipamento_placa: cleanText(item.equipamento_placa),
        tipo: item.tipo || contract.tipo || 'diaria',
        valor: cleanText(item.valor),
        valor_hora: cleanText(item.valor_hora || (item.tipo === 'hora' ? item.valor : '')),
        valor_diaria: cleanText(item.valor_diaria || (item.tipo === 'diaria' ? item.valor : '')),
        valor_metragem: cleanText(item.valor_metragem || (item.tipo === 'metragem' ? item.valor : '')),
        valor_quantidade: cleanText(item.valor_quantidade || (item.tipo === 'quantidade' ? item.valor : '')),
      }))
      : [],
  }));
}

function emptyObra(clienteId = '') {
  return {
    id: crypto.randomUUID(),
    cliente_id: clienteId,
    obra: '',
    tipo: 'diaria',
    valor: '',
    valor_hora: '',
    valor_diaria: '',
    status: 'ativo',
    equipamentos: [],
  };
}

function normalizeKey(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return parseNumber(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function displayChargeType(value) {
  const map = {
    diaria: 'Diária',
    hora: 'Hora máquina',
    metragem: 'Metragem',
    quantidade: 'Quantidade',
  };
  return map[value] || value || '-';
}

function displayUnit(value) {
  return value === 'h' ? 'Hora' : value || '-';
}

function serviceBelongsToObra(service, obra, cliente) {
  const contractRootId = String(service?.contrato_id || '').split(':')[0];
  if (contractRootId && String(contractRootId) === String(obra.id)) return true;

  const serviceClientId = service?.cli_id || service?.cliente_id;
  const clientMatches = !serviceClientId || String(serviceClientId) === String(cliente.id);
  if (!clientMatches) return false;

  const obraNames = [obra.obra, obra.nome].map(normalizeKey).filter(Boolean);
  const serviceNames = [service?.contrato_nome, service?.endereco, service?.obra, service?.local].map(normalizeKey).filter(Boolean);
  return obraNames.some((name) => serviceNames.includes(name));
}

function serviceQuantityLabel(service) {
  const quantidade = parseNumber(service?.quantidade);
  const tipo = service?.tipo || service?.modelo_cobranca;
  if (tipo === 'diaria') return `${quantidade || 1} diária`;
  if (tipo === 'hora') return `${quantidade || 0} Hora`;
  if (service?.qtd_m3) return `${service.qtd_m3} m3`;
  if (service?.qtd_m2) return `${service.qtd_m2} m2`;
  if (service?.qtd_kg) return `${service.qtd_kg} kg`;
  if (service?.qtd_litro) return `${service.qtd_litro} L`;
  if (service?.qtd_unidade) return `${service.qtd_unidade} un`;
  return `${quantidade || 0} ${displayUnit(service?.unidade)}`;
}

function ObraModal({ obra, clientes, activity = [], onClose, onSave }) {
  const [values, setValues] = useState(() => ({ ...emptyObra(clientes[0]?.id || ''), ...(obra || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!values.cliente_id) {
      setError('Selecione o cliente da obra.');
      return;
    }
    if (!cleanText(values.obra)) {
      setError('Informe o nome da obra.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...values,
        obra: cleanText(values.obra),
        nome: cleanText(values.obra),
        valor: cleanText(values.valor),
        valor_hora: cleanText(values.valor_hora),
        valor_diaria: cleanText(values.valor_diaria),
        equipamentos: [],
      });
    } catch (error) {
      setError(isMissingContractsColumn(error)
        ? 'A coluna contratos_servicos ainda não existe no Supabase. Rode o SQL supabase-add-contratos-servicos-clientes.sql e tente novamente.'
        : (error.message || 'Não foi possível salvar a obra.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="quick-modal entity-modal obra-modal" onSubmit={handleSubmit}>
        <header>
          <strong>{obra ? 'Editar Obra' : 'Nova Obra'}</strong>
          <button type="button" className="icon-button dark" onClick={onClose} aria-label="Fechar"><X size={17} /></button>
        </header>
        <div className="quick-body">
          <div className="form-grid cols-2">
            <label className="fg">
              <span className="fl">Cliente</span>
              <select value={values.cliente_id} onChange={(event) => setField('cliente_id', event.target.value)} disabled={Boolean(obra)}>
                <option value="">Selecione...</option>
                {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.fantasia || cliente.nome || '-'}</option>)}
              </select>
            </label>
            <label className="fg">
              <span className="fl">Obra</span>
              <input autoFocus value={values.obra || ''} onChange={(event) => setField('obra', event.target.value)} placeholder="Ex: Barra View" />
            </label>
          </div>
          <div className="form-grid cols-3 obra-price-grid">
            <label className="fg">
              <span className="fl">Valor hora</span>
              <input inputMode="decimal" value={values.valor_hora || ''} onChange={(event) => setField('valor_hora', event.target.value)} placeholder="Ex: 200,00" />
            </label>
            <label className="fg">
              <span className="fl">Valor diária</span>
              <input inputMode="decimal" value={values.valor_diaria || ''} onChange={(event) => setField('valor_diaria', event.target.value)} placeholder="Ex: 2000,00" />
            </label>
            <label className="fg">
              <span className="fl">Status</span>
              <select value={values.status || 'ativo'} onChange={(event) => setField('status', event.target.value)}>
                <option value="ativo">Ativa</option>
                <option value="pausado">Pausada</option>
                <option value="finalizado">Finalizada</option>
              </select>
            </label>
          </div>

          <section className="obra-linked-services">
            <header>
              <div>
                <strong>Movimento vinculado a obra</strong>
                <span>{activity.length} serviço(s) vindo(s) das fichas</span>
              </div>
              <b>{money(activity.reduce((total, item) => total + parseNumber(item.valor_total ?? item.valor), 0))}</b>
            </header>
            {activity.length ? (
              <div className="obra-service-list">
                {activity.slice(0, 10).map((item, index) => (
                  <article key={`${item.id || item.ficha_id}-${index}`}>
                    <span>{item.ficha?.data || item.data || '-'}</span>
                    <strong>{item.ficha?.codigo || item.nota_pedido || '-'}</strong>
                    <em>{item.ficha?.maquina || item.maquina || item.equipamento_nome || '-'}</em>
                    <b>{displayChargeType(item.modelo_cobranca || item.tipo)} · {serviceQuantityLabel(item)}</b>
                    <small>{money(item.valor_total ?? item.valor)}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p>Nenhum serviço de ficha foi vinculado a esta obra ainda.</p>
            )}
          </section>
          {error ? <p className="form-error in-modal">{error}</p> : null}
        </div>
        <footer>
          <button type="button" className="ghost-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Obra'}</button>
        </footer>
      </form>
    </div>
  );
}

export function ObrasPage({ data, onReload }) {
  const [query, setQuery] = useState('');
  const [modalObra, setModalObra] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  const clientes = data?.clientes || [];
  const fichas = data?.fichas || [];
  const fichaServicos = data?.ficha_servicos || [];

  const obras = useMemo(() => {
    const term = query.trim().toLowerCase();
    return clientes.flatMap((cliente) => (
      normalizeContracts(parseContracts(cliente.contratos_servicos)).map((obra) => {
        const activity = fichaServicos
          .filter((service) => serviceBelongsToObra(service, obra, cliente))
          .map((service) => ({
            ...service,
            ficha: fichas.find((ficha) => String(ficha.id || '') === String(service.ficha_id || '')) || {},
          }))
          .sort((a, b) => String(b.ficha?.data || b.data || '').localeCompare(String(a.ficha?.data || a.data || '')));
        const valorApurado = activity.reduce((total, service) => total + parseNumber(service.valor_total ?? service.valor), 0);
        return {
          ...obra,
          cliente_id: cliente.id,
          cliente_nome: cliente.fantasia || cliente.nome || '-',
          activity,
          total_servicos: activity.length,
          total_valor: valorApurado,
        };
      })
    ))
      .filter((obra) => {
        if (!term) return true;
        return [obra.obra, obra.cliente_nome, obra.tipo]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      })
      .sort((a, b) => String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || '')) || String(a.obra || '').localeCompare(String(b.obra || '')));
  }, [clientes, fichaServicos, fichas, query]);

  function openNew() {
    setModalObra(null);
    setModalOpen(true);
  }

  function openEdit(obra) {
    setModalObra(obra);
    setModalOpen(true);
  }

  async function saveObra(nextObra) {
    const cliente = clientes.find((item) => String(item.id) === String(nextObra.cliente_id));
    if (!cliente) throw new Error('Cliente da obra não encontrado.');

    const contracts = normalizeContracts(parseContracts(cliente.contratos_servicos));
    const exists = contracts.some((item) => String(item.id) === String(nextObra.id));
    const updatedContracts = exists
      ? contracts.map((item) => (String(item.id) === String(nextObra.id) ? nextObra : item))
      : [...contracts, nextObra];

    await updateRow('clientes', cliente.id, {
      contratos_servicos: JSON.stringify(normalizeContracts(updatedContracts)),
    });
    setModalOpen(false);
    await onReload();
    notifyToast({
      title: exists ? 'Obra atualizada' : 'Obra cadastrada',
      message: `${nextObra.obra} - ${cliente.fantasia || cliente.nome || '-'}`,
    });
  }

  async function deleteObra(obra) {
    const confirmed = await confirm({
      title: 'Excluir obra?',
      message: `A obra ${obra.obra || '-'} será removida do cliente ${obra.cliente_nome || '-'}.`,
      details: 'Os lançamentos antigos permanecem salvos, mas a obra deixa de aparecer nas novas fichas.',
      confirmLabel: 'Excluir obra',
    });
    if (!confirmed) return;

    const cliente = clientes.find((item) => String(item.id) === String(obra.cliente_id));
    if (!cliente) return;
    setBusyId(String(obra.id));
    try {
      const contracts = normalizeContracts(parseContracts(cliente.contratos_servicos));
      await updateRow('clientes', cliente.id, {
        contratos_servicos: JSON.stringify(contracts.filter((item) => String(item.id) !== String(obra.id))),
      });
      await onReload();
      notifyToast({ title: 'Obra excluída', message: obra.obra || 'Cadastro removido.' });
    } catch (error) {
      notifyToast({ type: 'error', title: 'Falha ao excluir obra', message: error.message || 'Tente novamente.' });
    } finally {
      setBusyId('');
    }
  }

  return (
    <section>
      <div className="screen-actions">
        <div>
          <h2>Obras</h2>
          <p>{obras.length} obra(s) cadastrada(s) para clientes</p>
        </div>
        <button className="primary-button" type="button" onClick={openNew}><Plus size={16} /> Nova Obra</button>
      </div>

      <div className="list-toolbar">
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar obra, cliente ou modelo..." />
        </label>
      </div>

      <div className="entity-grid obras-grid">
        {obras.map((obra) => (
          <article className="entity-card obra-card" key={`${obra.cliente_id}-${obra.id}`}>
            <header>
              <div className="entity-avatar"><Building2 size={22} /></div>
              <span className="status-pill">{obra.status === 'ativo' ? 'Ativa' : obra.status || 'Ativa'}</span>
            </header>
            <div className="entity-body">
              <h3>{obra.obra || '-'}</h3>
              <p>{obra.cliente_nome}</p>
              <dl>
                <div><dt>Hora</dt><dd>{obra.valor_hora ? money(obra.valor_hora) : '-'}</dd></div>
                <div><dt>Diária</dt><dd>{obra.valor_diaria ? money(obra.valor_diaria) : '-'}</dd></div>
                <div><dt>Serviços</dt><dd>{obra.total_servicos || '-'}</dd></div>
                <div><dt>Apurado</dt><dd>{money(obra.total_valor)}</dd></div>
              </dl>
            </div>
            <footer>
              <button className="ghost-button compact" type="button" onClick={() => openEdit(obra)}><Edit3 size={14} /> Editar</button>
              <button className="danger-button compact" type="button" disabled={busyId === String(obra.id)} onClick={() => deleteObra(obra)}><Trash2 size={14} /></button>
            </footer>
          </article>
        ))}
        {!obras.length ? (
          <section className="panel empty-panel entity-empty">
            <h2>Nenhuma obra cadastrada</h2>
            <p>Cadastre uma obra para vincular valores de hora e diária nas fichas.</p>
          </section>
        ) : null}
      </div>

      {modalOpen ? (
        <ObraModal
          obra={modalObra}
          clientes={clientes}
          activity={modalObra?.activity || []}
          onClose={() => setModalOpen(false)}
          onSave={saveObra}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}
