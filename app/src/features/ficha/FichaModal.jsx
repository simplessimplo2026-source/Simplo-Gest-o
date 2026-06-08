import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, Clock, FileText, MessageSquareText, Plus, Trash2, UserRound, Wrench, X } from 'lucide-react';
import { insertRow, loadFichaServicos } from '../../lib/supabase.js';
import { dateBR, minutesToText, workMinutes } from '../../lib/reports.js';
import { DateInput } from '../../components/DateInput.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';
import { fichaInitialValues, fichaPayload, machineInfoForOperator, newService } from './fichaHelpers.js';

function Field({ label, children }) {
  return (
    <label className="fg">
      <span className="fl">{label}</span>
      {children}
    </label>
  );
}

function Section({ icon, title, aside, children }) {
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

function TimeField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);

  function chooseTime(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <label className="fg time-field">
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

function serviceTypeLabel(type) {
  if (type === 'diaria') return 'Diaria';
  if (type === 'quantidade') return 'Quantidade';
  return 'Metragem';
}

function QuickCreateModal({ request, onCancel, onSave, saving, error }) {
  const [values, setValues] = useState({ nome: '', fantasia: '', cidade: '', tel: '' });
  const isCliente = request?.type === 'cliente';
  const title = isCliente
    ? 'Novo Cliente'
    : request?.type === 'material'
      ? 'Novo Material'
      : 'Novo Barreiro';

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
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

function ServiceCard({ index, service, lookups, onChange, onCreateLookup, onRemove }) {
  const cliente = lookups.clientes.find((item) => String(item.id) === String(service.cli_id));

  function update(field, value) {
    const patch = { [field]: value };
    if (field === 'cli_id') {
      const nextCliente = lookups.clientes.find((item) => String(item.id) === String(value));
      patch.cliente = nextCliente?.fantasia || nextCliente?.nome || '';
      patch.endereco = nextCliente?.cidade || '';
      patch.tel = nextCliente?.tel || '';
    }
    onChange({ ...service, ...patch });
  }

  return (
    <article className="service-card">
      <header>
        <div className="service-title">
          <strong><span>{String(index + 1).padStart(2, '0')}</span> Serviço</strong>
          <span>{service.cliente || 'Cliente ainda não selecionado'}</span>
        </div>
        <span className="service-type-chip">{serviceTypeLabel(service.tipo)}</span>
        <button type="button" className="danger-button compact" onClick={onRemove} aria-label={`Remover serviço ${index + 1}`}><Trash2 size={14} /></button>
      </header>
      <div className="service-body">
        <div className="service-priority-row">
          <Field label="Nº Pedido / Nota">
            <input value={service.nota_pedido} onChange={(event) => update('nota_pedido', event.target.value)} placeholder="Ex: 37" />
          </Field>

          <div>
            <div className="fl service-label">Tipo de Lançamento</div>
            <div className="segmented">
              <button type="button" className={service.tipo === 'metragem' ? 'active' : ''} onClick={() => update('tipo', 'metragem')}>Metragem</button>
              <button type="button" className={service.tipo === 'quantidade' ? 'active' : ''} onClick={() => update('tipo', 'quantidade')}>Quantidade</button>
              <button type="button" className={service.tipo === 'diaria' ? 'active' : ''} onClick={() => update('tipo', 'diaria')}>Diária</button>
            </div>
          </div>
        </div>

        {service.tipo === 'diaria' ? (
          <div>
            <div className="fl service-label">Período da Diária</div>
            <div className="segmented slim">
              <button type="button" className={service.diaria === 'completa' ? 'active' : ''} onClick={() => update('diaria', 'completa')}>Dia Completo</button>
              <button type="button" className={service.diaria === 'meia' ? 'active' : ''} onClick={() => update('diaria', 'meia')}>Meia Diária</button>
            </div>
          </div>
        ) : (
          <div className="form-grid cols-3">
            <Field label={service.tipo === 'metragem' ? 'Metragem (m³)' : 'Quantidade'}>
              <input type="number" step="0.1" value={service.quantidade} onChange={(event) => update('quantidade', event.target.value)} placeholder="0" />
            </Field>
            <Field label="Material">
              <select value={service.material} onChange={(event) => update('material', event.target.value)}>
                <option value="">Selecione o material...</option>
                {lookups.materiais.map((material) => <option key={material.id || material.nome} value={material.nome}>{material.nome}</option>)}
              </select>
              <button type="button" className="inline-add" onClick={() => onCreateLookup('material', service.localId)}>+ Novo material</button>
            </Field>
            <Field label="Barreiro">
              <select value={service.barreiro} onChange={(event) => update('barreiro', event.target.value)}>
                <option value="">Selecione o barreiro...</option>
                {lookups.barreiros.map((barreiro) => <option key={barreiro.id || barreiro.nome} value={barreiro.nome}>{barreiro.nome}</option>)}
              </select>
              <button type="button" className="inline-add" onClick={() => onCreateLookup('barreiro', service.localId)}>+ Novo barreiro</button>
            </Field>
          </div>
        )}

        <div className="service-bottom-grid">
          <div className="client-box">
            <div className="box-title">Cliente</div>
            <Field label="Cliente">
              <select value={service.cli_id} onChange={(event) => update('cli_id', event.target.value)}>
                <option value="">Selecione o cliente...</option>
                {lookups.clientes.map((item) => (
                  <option key={item.id} value={item.id}>{item.fantasia || item.nome}</option>
                ))}
              </select>
              <button type="button" className="inline-add" onClick={() => onCreateLookup('cliente', service.localId)}>+ Novo cliente</button>
            </Field>
            {cliente || service.endereco || service.tel ? (
              <div className="form-grid cols-2">
                <Field label="Endereço">
                  <input value={service.endereco} readOnly />
                </Field>
                <Field label="Telefone">
                  <input value={service.tel} readOnly />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="payment-box">
            <div className="box-title">Pagamento</div>
            <label className="check-row">
              <input type="checkbox" checked={service.pago} onChange={(event) => update('pago', event.target.checked)} />
              <span>Pago</span>
            </label>
            {service.pago ? (
              <div className="payment-fields">
                <Field label="Valor (R$)">
                  <input type="number" step="0.01" value={service.valor} onChange={(event) => update('valor', event.target.value)} placeholder="0,00" />
                </Field>
                <div>
                  <div className="fl service-label">Tipo</div>
                  <div className="segmented slim">
                    <button type="button" className={service.tipo_pagamento === 'pix' ? 'active' : ''} onClick={() => update('tipo_pagamento', 'pix')}>PIX</button>
                    <button type="button" className={service.tipo_pagamento === 'deb' ? 'active' : ''} onClick={() => update('tipo_pagamento', 'deb')}>Débito</button>
                    <button type="button" className={service.tipo_pagamento === 'cred' ? 'active' : ''} onClick={() => update('tipo_pagamento', 'cred')}>Crédito</button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="payment-hint">Marque quando este serviço ja tiver sido recebido.</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function FichaModal({ data, ficha, onClose, onSave }) {
  const [values, setValues] = useState(() => fichaInitialValues(ficha));
  const [services, setServices] = useState(() => [newService()]);
  const [createdLookups, setCreatedLookups] = useState({ clientes: [], materiais: [], barreiros: [] });
  const [quickCreate, setQuickCreate] = useState(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [showMachineChange, setShowMachineChange] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    const next = fichaInitialValues(ficha);
    setValues(next);
    setShowMachineChange(Boolean(next.maquina));

    if (!ficha?.id) {
      setServices([newService()]);
      return () => { alive = false; };
    }

    setLoadingServices(true);
    loadFichaServicos(ficha.id)
      .then((rows) => {
        if (!alive) return;
        setServices(rows?.length ? rows.map((row) => newService(row)) : [newService()]);
      })
      .catch(() => {
        if (alive) setServices([newService()]);
      })
      .finally(() => {
        if (alive) setLoadingServices(false);
      });

    return () => { alive = false; };
  }, [ficha]);

  const machineInfo = useMemo(() => machineInfoForOperator(values.operador, data), [values.operador, data]);
  const lookups = useMemo(() => ({
    clientes: [...(data?.clientes || []), ...createdLookups.clientes],
    materiais: [...(data?.materiais || []), ...createdLookups.materiais],
    barreiros: [...(data?.barreiros || []), ...createdLookups.barreiros],
  }), [data, createdLookups]);
  const visibleMachine = values.maquina || machineInfo.nome || '-';
  const isChangedMachine = values.maquina && machineInfo.padrao && values.maquina !== machineInfo.padrao;
  const summaryDate = values.data ? dateBR(values.data) : 'Sem data';
  const summaryCode = values.codigo || 'Sem código';
  const summaryOperator = values.operador || 'Operador não selecionado';
  const summaryHours = minutesToText(workMinutes(values));

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleOperatorChange(value) {
    const info = machineInfoForOperator(value, data);
    setValues((current) => ({
      ...current,
      operador: value,
      maquina: info.nome || '',
      maquinaMotivo: '',
    }));
    setShowMachineChange(Boolean(value));
  }

  function updateService(localId, nextService) {
    setServices((current) => current.map((item) => (item.localId === localId ? nextService : item)));
  }

  function removeService(localId) {
    setServices((current) => (current.length > 1 ? current.filter((item) => item.localId !== localId) : current));
  }

  function openQuickCreate(type, serviceLocalId) {
    setQuickError('');
    setQuickCreate({ type, serviceLocalId });
  }

  async function handleQuickCreate(valuesToSave) {
    setQuickError('');
    const nome = valuesToSave.nome.trim();
    if (!nome) {
      setQuickError('Informe o nome para continuar.');
      return;
    }
    setQuickSaving(true);
    const type = quickCreate.type;
    const service = services.find((item) => item.localId === quickCreate.serviceLocalId);
    if (!service) {
      setQuickSaving(false);
      return;
    }

    try {
      if (type === 'cliente') {
        const saved = await insertRow('clientes', {
          nome,
          fantasia: valuesToSave.fantasia.trim() || nome,
          cidade: valuesToSave.cidade.trim(),
          tel: valuesToSave.tel.trim(),
          status: 'ativo',
        });
        setCreatedLookups((current) => ({ ...current, clientes: [...current.clientes, saved] }));
        updateService(service.localId, {
          ...service,
          cli_id: saved.id,
          cliente: saved.fantasia || saved.nome,
          endereco: saved.cidade || '',
          tel: saved.tel || '',
        });
      } else {
        const table = type === 'material' ? 'materiais' : 'barreiros';
        const key = type === 'material' ? 'materiais' : 'barreiros';
        const field = type === 'material' ? 'material' : 'barreiro';
        const saved = await insertRow(table, type === 'material'
          ? { nome }
          : { nome, status: 'ativo' });
        setCreatedLookups((current) => ({ ...current, [key]: [...current[key], saved] }));
        updateService(service.localId, { ...service, [field]: saved.nome });
      }

      setQuickCreate(null);
      notifyToast({ title: 'Cadastro criado', message: nome });
    } catch (error) {
      const message = error.message || 'Não foi possível salvar agora.';
      setQuickError(message);
      notifyToast({ type: 'error', title: 'Falha no cadastro rápido', message });
    } finally {
      setQuickSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(fichaPayload(values, data), values.id, services);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="ficha-modal ficha-modal-modern" onSubmit={handleSubmit}>
        <header className="modal-header ficha-modal-header">
          <div className="modal-title-stack">
            <span className="modal-kicker">Ficha diaria</span>
            <strong>{values.id ? 'Editar lançamento' : 'Novo lançamento'}</strong>
            <small>{values.id ? `Código ${summaryCode}` : 'Operação, jornada, serviços e clientes em um único fluxo'}</small>
          </div>
          <div className="modal-header-actions">
            <span>{services.length} serviço(s)</span>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
          </div>
        </header>

        <div className="ficha-modal-body">
          <div className="modal-summary">
            <div>
              <span><CalendarDays size={14} /> Data</span>
              <strong>{summaryDate}</strong>
            </div>
            <div>
              <span><FileText size={14} /> Codigo</span>
              <strong>{summaryCode}</strong>
            </div>
            <div>
              <span><UserRound size={14} /> Operador</span>
              <strong>{summaryOperator}</strong>
            </div>
            <div>
              <span><Wrench size={14} /> Maquina</span>
              <strong>{visibleMachine}</strong>
            </div>
            <div>
              <span><ClipboardList size={14} /> Servicos</span>
              <strong>{services.length}</strong>
            </div>
            <div>
              <span><Clock size={14} /> Horas</span>
              <strong>{summaryHours}</strong>
            </div>
          </div>

          <Section icon={<ClipboardList size={15} />} title="Identificação da Ficha">
            <div className="form-grid cols-3">
              <Field label="Data do Serviço">
                <DateInput value={values.data} onChange={(value) => setField('data', value)} />
              </Field>
              <Field label="Código da Ficha">
                <input value={values.codigo} onChange={(event) => setField('codigo', event.target.value)} placeholder="Ex: 61967" />
              </Field>
              <Field label="Turno">
                <select value={values.turno} onChange={(event) => setField('turno', event.target.value)}>
                  <option>Dia completo</option>
                  <option>Somente manhã</option>
                  <option>Somente tarde</option>
                </select>
              </Field>
            </div>
            <Field label="Operador">
              <select value={values.operador} onChange={(event) => handleOperatorChange(event.target.value)}>
                <option value="">Selecione o operador...</option>
                {(data?.funcionarios || []).map((funcionario) => (
                  <option key={funcionario.id || funcionario.nome} value={funcionario.nome}>
                    {funcionario.nome} - {funcionario.cargo || 'Funcionário'}
                  </option>
                ))}
              </select>
            </Field>
            {values.operador ? (
              <div className="machine-bar">
                <div>
                  <span>Máquina</span>
                  <strong>{visibleMachine}</strong>
                </div>
                <div>
                  <span>Placa</span>
                  <strong>{machineInfo.placa || '-'}</strong>
                </div>
                <p>{isChangedMachine ? 'Troca pontual nesta ficha' : 'Preenchido automaticamente'}</p>
                <button type="button" className="ghost-button" onClick={() => setShowMachineChange((current) => !current)}>Selecionar/Trocar</button>
              </div>
            ) : null}
            {showMachineChange ? (
              <div className="machine-change">
                <div className="form-grid cols-2">
                  <Field label="Máquina alternativa">
                    <select value={values.maquina} onChange={(event) => setField('maquina', event.target.value)}>
                      <option value="">Usar máquina padrão</option>
                      {(data?.equipamentos || []).map((equipamento) => (
                        <option key={equipamento.id || equipamento.nome} value={equipamento.nome}>{equipamento.nome}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Motivo">
                    <input value={values.maquinaMotivo} onChange={(event) => setField('maquinaMotivo', event.target.value)} placeholder="Ex: manutenção..." />
                  </Field>
                </div>
              </div>
            ) : null}
          </Section>

          <Section icon={<Clock size={15} />} title="Controle de Jornada">
            <div className="form-grid cols-4">
              <TimeField label="Manhã Início" value={values.manha_ini} onChange={(value) => setField('manha_ini', value)} />
              <TimeField label="Manhã Fim" value={values.manha_fim} onChange={(value) => setField('manha_fim', value)} />
              <TimeField label="Tarde Início" value={values.tarde_ini} onChange={(value) => setField('tarde_ini', value)} />
              <TimeField label="Tarde Fim" value={values.tarde_fim} onChange={(value) => setField('tarde_fim', value)} />
              <Field label="Horímetro Ini"><input value={values.hor_ini} onChange={(event) => setField('hor_ini', event.target.value)} /></Field>
              <Field label="Horímetro Fim"><input value={values.hor_fim} onChange={(event) => setField('hor_fim', event.target.value)} /></Field>
              <Field label="KM Início"><input value={values.km_ini} onChange={(event) => setField('km_ini', event.target.value)} /></Field>
              <Field label="KM Fim"><input value={values.km_fim} onChange={(event) => setField('km_fim', event.target.value)} /></Field>
            </div>
            <div className="form-grid cols-2">
              <Field label="Diesel (L)"><input value={values.diesel} onChange={(event) => setField('diesel', event.target.value)} /></Field>
              <Field label="Posto"><input value={values.posto} onChange={(event) => setField('posto', event.target.value)} /></Field>
            </div>
          </Section>

          <Section icon={<Wrench size={15} />} title="Serviços e Clientes" aside={<small>{loadingServices ? 'carregando...' : `${services.length} serviço(s)`}</small>}>
            <div className="services-stack">
              {loadingServices ? (
                <div className="service-loading-card">
                  <span />
                  <span />
                  <span />
                </div>
              ) : services.map((service, index) => (
                  <ServiceCard
                    key={service.localId}
                    index={index}
                    service={service}
                    lookups={lookups}
                    onChange={(nextService) => updateService(service.localId, nextService)}
                    onCreateLookup={openQuickCreate}
                    onRemove={() => removeService(service.localId)}
                  />
                ))}
            </div>
            <button type="button" className="add-service-button" disabled={loadingServices} onClick={() => setServices((current) => [...current, newService()])}>
              <Plus size={18} /> Adicionar Serviço / Cliente
            </button>
          </Section>

          <Section icon={<MessageSquareText size={15} />} title="Observações">
            <textarea rows="3" value={values.observacoes} onChange={(event) => setField('observacoes', event.target.value)} placeholder="Condições climáticas, problemas..." />
          </Section>
        </div>

        <footer className="modal-footer">
          <button type="button" className="ghost-button footer-cancel-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button save-ficha-button" disabled={saving || loadingServices}>
            {!saving ? <CheckCircle2 size={15} /> : null}
            {saving ? 'Salvando...' : 'Salvar ficha'}
          </button>
        </footer>
      </form>

      {quickCreate ? (
        <QuickCreateModal
          request={quickCreate}
          onCancel={() => setQuickCreate(null)}
          onSave={handleQuickCreate}
          saving={quickSaving}
          error={quickError}
        />
      ) : null}
    </div>
  );
}
