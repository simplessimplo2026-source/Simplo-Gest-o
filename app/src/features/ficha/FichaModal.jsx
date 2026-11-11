import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, Clock, FileText, MessageSquareText, Plus, UserRound, Wrench, X } from 'lucide-react';
import { insertRow, loadFichaServicos } from '../../lib/supabase.js';
import { dateBR, equipmentForFicha, minutesToText, normalizeTextKey, workMinutes } from '../../lib/reports.js';
import { DateInput } from '../../components/DateInput.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';
import { fichaInitialValues, fichaPayload, hasServiceContent, machineInfoForOperator, newService } from './fichaHelpers.js';
import { hasAnyMeasure } from '../../lib/units.js';
import { Field, Section, TimeField, ChoiceSelect } from './fichaFormComponents.jsx';
import { QuickCreateModal } from './QuickCreateModal.jsx';
import { ServiceCard } from './FichaServiceCard.jsx';
import { equipmentDisplayValue, equipmentOptionLabel } from './fichaServiceHelpers.js';

export function FichaModal({ data, ficha, onClose, onSave }) {
  const [values, setValues] = useState(() => fichaInitialValues(ficha));
  const [services, setServices] = useState(() => [newService()]);
  const [createdLookups, setCreatedLookups] = useState({ clientes: [], materiais: [], barreiros: [] });
  const [quickCreate, setQuickCreate] = useState(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [showMachineChange, setShowMachineChange] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [originalServiceIds, setOriginalServiceIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  // Mantém a mesma operação se a rede cair após o banco concluir o salvamento.
  // O RPC devolve o resultado já confirmado, sem duplicar ficha ou serviços.
  const saveRequestId = useRef(crypto.randomUUID());
  const draftFichaId = useRef(ficha?.id || crypto.randomUUID());

  useEffect(() => {
    let alive = true;
    setServicesError('');
    setOriginalServiceIds([]);
    const next = fichaInitialValues(ficha);
    saveRequestId.current = crypto.randomUUID();
    draftFichaId.current = ficha?.id || crypto.randomUUID();
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
        setOriginalServiceIds((rows || []).map((row) => row.id));
        setServices(rows?.length ? rows.map((row) => newService(row)) : [newService()]);
      })
      .catch((error) => {
        if (!alive) return;
        setServices([]);
        setServicesError(error.message || 'Falha ao carregar serviços. Feche e reabra a ficha.');
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
  const fichaEquipment = useMemo(() => equipmentForFicha(values, data), [values, data]);
  const visibleMachine = fichaEquipment?.nome || values.maquina || machineInfo.nome || '-';
  const visiblePlate = fichaEquipment?.placa || (!values.maquina ? machineInfo.placa : '') || '-';
  const isChangedMachine = Boolean(values.maquina && machineInfo.padrao && (
    normalizeTextKey(visibleMachine) !== normalizeTextKey(machineInfo.padrao)
    || normalizeTextKey(visiblePlate) !== normalizeTextKey(machineInfo.placa)
  ));
  const summaryDate = values.data ? dateBR(values.data) : 'Sem data';
  const summaryCode = values.codigo || 'Sem código';
  const summaryOperator = values.operador || 'Operador não selecionado';
  const summaryHours = minutesToText(workMinutes(values));

  function setField(field, value) {
    if (formError) setFormError('');
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleOperatorChange(value) {
    const info = machineInfoForOperator(value, data);
    if (formError) setFormError('');
    setValues((current) => ({
      ...current,
      operador: value,
      maquina: '',
      maquinaMotivo: '',
    }));
    setShowMachineChange(Boolean(value));
  }

  function updateService(localId, nextService) {
    if (formError) setFormError('');
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
    if (quickCreate.type === 'material' && !(valuesToSave.unidades || []).length) {
      setQuickError('Selecione pelo menos uma unidade para o material.');
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
          ? { nome, unidades: JSON.stringify(valuesToSave.unidades || ['m3']) }
          : { nome, status: 'ativo' });
        setCreatedLookups((current) => ({ ...current, [key]: [...current[key], saved] }));
        updateService(service.localId, { ...service, [field]: saved.nome });
      }

      setQuickCreate(null);
      setFormError('');
      notifyToast({ title: 'Cadastro criado', message: nome });
    } catch (error) {
      const message = error.message || 'Não foi possível salvar agora.';
      setQuickError(message);
      notifyToast({ type: 'error', title: 'Falha no cadastro rápido', message });
    } finally {
      setQuickSaving(false);
    }
  }

  function validateBeforeSave() {
    if (servicesError || loadingServices) return 'Não é seguro salvar: os serviços não foram carregados. Feche e reabra a ficha.';
    if (!values.data) return 'Informe a data do serviço.';
    if (!values.operador) return 'Selecione o operador da ficha.';
    if (!visibleMachine || visibleMachine === '-') return 'Selecione a máquina usada nesta ficha.';
    const filledServices = services.filter(hasServiceContent);
    if (!filledServices.length) return 'Adicione pelo menos um serviço ou cliente antes de salvar.';
    const missingClientIndex = filledServices.findIndex((service) => !service.cli_id && !service.cliente);
    if (missingClientIndex >= 0) return `Selecione o cliente do serviço ${String(missingClientIndex + 1).padStart(2, '0')}.`;
    const missingHourIndex = filledServices.findIndex((service) => {
      if (service.tipo !== 'hora') return false;
      const hasMorning = service.hora_manha_ini && service.hora_manha_fim;
      const hasAfternoon = service.hora_tarde_ini && service.hora_tarde_fim;
      return !hasMorning && !hasAfternoon;
    });
    if (missingHourIndex >= 0) return `Informe os horários do serviço ${String(missingHourIndex + 1).padStart(2, '0')}.`;
    const missingQuantityIndex = filledServices.findIndex((service) => service.tipo !== 'diaria' && service.tipo !== 'hora' && !hasAnyMeasure(service) && !String(service.quantidade || '').trim());
    if (missingQuantityIndex >= 0) return `Informe a quantidade/metragem do serviço ${String(missingQuantityIndex + 1).padStart(2, '0')}.`;
    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationMessage = validateBeforeSave();
    if (validationMessage) {
      setFormError(validationMessage);
      notifyToast({ type: 'error', title: 'Revise a ficha', message: validationMessage });
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      await onSave(fichaPayload(values, data), values.id, services, originalServiceIds, {
        requestId: saveRequestId.current,
        fichaId: draftFichaId.current,
        isNew: !ficha?.id,
        expectedRevision: ficha?.save_revision || 0,
      });
    } catch (error) {
      if (error.fichaId) setValues((current) => ({ ...current, id: error.fichaId }));
      if (error.services) {
        setServices(error.services);
        setOriginalServiceIds((current) => [...new Set([...current, ...error.services.map((item) => item.id).filter(Boolean)])]);
      }
      setFormError(error.message || 'Falha ao salvar. Confira os dados antes de tentar novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="ficha-modal ficha-modal-modern" onSubmit={handleSubmit}>
        <header className="modal-header ficha-modal-header">
          <div className="modal-title-stack">
            <span className="modal-kicker">Ficha diária</span>
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
                <ChoiceSelect
                  value={values.turno}
                  onChange={(value) => setField('turno', value)}
                  options={['Dia completo', 'Somente manhã', 'Somente tarde'].map((turno) => ({ value: turno, label: turno }))}
                />
              </Field>
            </div>
            <Field label="Operador">
              <ChoiceSelect
                value={values.operador}
                onChange={handleOperatorChange}
                placeholder="Selecione o operador..."
                emptyLabel="Selecione o operador..."
                options={(data?.funcionarios || []).map((funcionario) => ({
                  value: funcionario.nome,
                  label: `${funcionario.nome} - ${funcionario.cargo || 'Funcionário'}`,
                }))}
              />
            </Field>
            {values.operador ? (
              <div className="machine-bar">
                <div>
                  <span>Máquina</span>
                  <strong>{visibleMachine}</strong>
                </div>
                <div>
                  <span>Placa</span>
                  <strong>{visiblePlate}</strong>
                </div>
                <p>{isChangedMachine ? 'Troca pontual nesta ficha' : 'Preenchido automaticamente'}</p>
                <button type="button" className="ghost-button" onClick={() => setShowMachineChange((current) => !current)}>Selecionar/Trocar</button>
              </div>
            ) : null}
            {showMachineChange ? (
              <div className="machine-change">
                <div className="form-grid cols-2">
                  <Field label="Máquina alternativa">
                    <ChoiceSelect
                      value={values.maquina}
                      onChange={(value) => setField('maquina', value)}
                      placeholder="Usar máquina padrão"
                      emptyLabel="Usar máquina padrão"
                      options={(data?.equipamentos || []).map((equipamento) => ({
                        value: equipmentDisplayValue(equipamento),
                        label: equipmentOptionLabel(equipamento),
                      }))}
                    />
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
              {servicesError ? <p className="form-error" role="alert">{servicesError} Feche e reabra a ficha antes de salvar.</p> : loadingServices ? (
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
                    currentEquipment={{ id: fichaEquipment?.id, nome: visibleMachine, placa: visiblePlate === '-' ? '' : visiblePlate }}
                    onChange={(nextService) => updateService(service.localId, nextService)}
                    onCreateLookup={openQuickCreate}
                    onRemove={() => removeService(service.localId)}
                  />
                ))}
            </div>
            <button type="button" className="add-service-button" disabled={loadingServices || Boolean(servicesError)} onClick={() => setServices((current) => [...current, newService()])}>
              <Plus size={18} /> Adicionar Serviço / Cliente
            </button>
          </Section>

          <Section icon={<MessageSquareText size={15} />} title="Observações">
            <textarea rows="3" value={values.observacoes} onChange={(event) => setField('observacoes', event.target.value)} placeholder="Condições climáticas, problemas..." />
          </Section>
        </div>

        <footer className="modal-footer">
          <div className="footer-status">
            {formError ? <p className="form-error ficha-save-error">{formError}</p> : null}
          </div>
          <div className="footer-actions">
            <button type="button" className="ghost-button footer-cancel-button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary-button save-ficha-button" disabled={saving || loadingServices || Boolean(servicesError)}>
              {!saving ? <CheckCircle2 size={15} /> : null}
              {saving ? 'Salvando...' : 'Salvar ficha'}
            </button>
          </div>
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
