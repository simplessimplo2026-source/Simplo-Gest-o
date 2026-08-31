import { firstValue, matchContractEquipment } from '../../lib/serviceLinks.js';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardList, Clock, FileText, MessageSquareText, Plus, Trash2, UserRound, Wrench, X } from 'lucide-react';
import { insertRow, loadFichaServicos } from '../../lib/supabase.js';
import { dateBR, equipmentForFicha, minutesToText, normalizeTextKey, workMinutes } from '../../lib/reports.js';
import { DateInput } from '../../components/DateInput.jsx';
import { notifyToast } from '../../components/ToastHost.jsx';
import { fichaInitialValues, fichaPayload, hasServiceContent, machineInfoForOperator, newService } from './fichaHelpers.js';
import { MATERIAL_UNIT_OPTIONS, hasAnyMeasure, materialUnitOptions } from '../../lib/units.js';

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
    <label className={`fg time-field ${open ? 'open' : ''}`}>
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

function optionMatches(option, term) {
  if (!term) return true;
  const normalizedTerm = String(term || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normalizedLabel = [option.label, option.meta]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalizedLabel.includes(normalizedTerm);
}

function ChoiceSelect({ value, onChange, options, placeholder = 'Selecione...', emptyLabel = '', disabled = false, searchable = true }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((option) => String(option.value) === String(value));
  const selectedLabel = selected?.meta ? `${selected.label} - ${selected.meta}` : selected?.label;
  const filteredOptions = options.filter((option) => optionMatches(option, search));
  const menuOptions = emptyLabel && !search ? [{ value: '', label: emptyLabel, muted: true }, ...filteredOptions] : filteredOptions;

  function choose(optionValue) {
    onChange(optionValue);
    setSearch('');
    setOpen(false);
  }

  function openMenu() {
    if (disabled) return;
    setOpen(true);
    setSearch('');
  }

  return (
    <div
      className={`choice-select ${open ? 'open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setSearch('');
        }
      }}
    >
      <div className={`choice-trigger ${selected ? '' : 'placeholder'} ${searchable ? 'searchable' : ''}`}>
        {searchable ? (
          <input
            value={open ? search : ''}
            onFocus={openMenu}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
            }}
            placeholder={open ? (selectedLabel || placeholder) : (selectedLabel || placeholder)}
            disabled={disabled}
            aria-expanded={open}
          />
        ) : (
          <button type="button" onClick={() => setOpen((current) => !current)} disabled={disabled} aria-expanded={open}>
            <span>{selectedLabel || placeholder}</span>
          </button>
        )}
        <button type="button" className="choice-chevron" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)} disabled={disabled} aria-label="Abrir opções">
          <ChevronDown size={16} />
        </button>
      </div>
      {open ? (
        <div className="choice-menu">
          {menuOptions.length ? menuOptions.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <button
                type="button"
                key={`${option.value}-${option.label}`}
                className={`${active ? 'active' : ''} ${option.muted ? 'muted-option' : ''}`}
                onClick={() => choose(option.value)}
              >
                <span className="choice-option-text">
                  <strong>{option.label}</strong>
                  {option.meta ? <small>{option.meta}</small> : null}
                </span>
                {active ? <Check size={14} /> : null}
              </button>
            );
          }) : (
            <button type="button" className="muted-option" disabled>Nenhuma opção cadastrada</button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function serviceTypeLabel(type) {
  if (type === 'diaria') return 'Diária';
  if (type === 'hora') return 'Hora';
  if (type === 'quantidade') return 'Quantidade';
  return 'Metragem';
}

function parseMoney(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyBR(value) {
  return parseMoney(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseContracts(cliente) {
  if (!cliente?.contratos_servicos) return [];
  if (Array.isArray(cliente.contratos_servicos)) return cliente.contratos_servicos;
  try {
    const parsed = JSON.parse(cliente.contratos_servicos);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function rangeMinutes(start, end) {
  const ini = timeToMinutes(start);
  let fim = timeToMinutes(end);
  if (ini === null || fim === null) return 0;
  if (fim < ini) fim += 24 * 60;
  return Math.max(0, fim - ini);
}

function serviceHourMinutes(service) {
  return rangeMinutes(service.hora_manha_ini, service.hora_manha_fim)
    + rangeMinutes(service.hora_tarde_ini, service.hora_tarde_fim);
}

function serviceChargeQuantity(service) {
  if (service.tipo === 'diaria') return service.diaria === 'meia' ? 0.5 : 1;
  if (service.tipo === 'hora') return Number((serviceHourMinutes(service) / 60).toFixed(2));
  const value = MATERIAL_UNIT_OPTIONS.map((unit) => service[unit.field]).find((entry) => String(entry || '').trim());
  return parseMoney(value || service.quantidade);
}

function serviceChargeTotal(service) {
  const unitValue = parseMoney(service.valor_unitario);
  const quantity = serviceChargeQuantity(service);
  return String(service.valor_unitario ?? '').trim() !== '' && quantity !== null
    ? unitValue * quantity : parseMoney(firstValue(service.valor_total, service.valor));
}

function equipmentDisplayValue(equipamento) {
  if (!equipamento?.nome) return '';
  const name = String(equipamento.nome || '').trim();
  const plate = String(equipamento.placa || '').trim();
  if (!plate) return name;
  return name.toLowerCase().includes(plate.toLowerCase()) ? name : `${name} - ${plate}`;
}

function equipmentOptionLabel(equipamento) {
  const value = equipmentDisplayValue(equipamento);
  return [value, equipamento.operador ? `(${equipamento.operador})` : ''].filter(Boolean).join(' ');
}

const contractEquipmentMatch = matchContractEquipment;

function contractMaterialMatch(contract, materialName = '', unitId = '') {
  const items = Array.isArray(contract?.materiais) ? contract.materiais : [];
  const materialKey = normalizeTextKey(materialName);
  const unitKey = normalizeTextKey(unitId);
  if (!materialKey) return null;
  return items.find((item) => {
    const itemMaterialKey = normalizeTextKey(item.material_nome || item.nome);
    const itemUnitKey = normalizeTextKey(item.unidade || item.unit);
    return itemMaterialKey === materialKey && (!unitKey || !itemUnitKey || itemUnitKey === unitKey);
  }) || null;
}

function serviceMaterialUnitId(service, material) {
  const filledUnit = MATERIAL_UNIT_OPTIONS.find((unit) => String(service?.[unit.field] || '').trim());
  if (filledUnit) return filledUnit.id;
  return materialUnitOptions(material?.unidades, service?.tipo === 'quantidade' ? ['un'] : ['m3'])[0]?.id || '';
}

function contractValueForEquipment(contract, currentEquipment, tipo) {
  const match = contractEquipmentMatch(contract, currentEquipment);
  if (tipo === 'hora') return firstValue(match?.valor_hora, contract.valor_hora);
  if (tipo === 'diaria') return firstValue(match?.valor_diaria, contract.valor_diaria, contract.valor);
  return firstValue(match?.valor, contract.valor);
}

function contractValueForService(contract, currentEquipment, service = {}, material = null) {
  if (service.tipo === 'hora' || service.tipo === 'diaria') {
    return contractValueForEquipment(contract, currentEquipment, service.tipo);
  }
  const unitId = serviceMaterialUnitId(service, material);
  const match = contractMaterialMatch(contract, service.material, unitId);
  return firstValue(match?.valor, contract.valor);
}

function contractEquipmentOptions(contracts, currentEquipment = {}, preferredType = '', service = {}, material = null) {
  const rows = [];

  function pushRow({ id, contract, tipo, valor, matched, sourceLabel = '' }) {
    if (valor === '' || valor === null || valor === undefined) return;
    rows.push({
      id,
      contract,
      tipo,
      valor,
      label: contract.obra || contract.nome || 'Obra',
      meta: `${serviceTypeLabel(tipo)} - ${moneyBR(valor)}${matched ? ` - ${sourceLabel || 'valor específico'}` : ''}`,
      matched: Boolean(matched),
    });
  }

  contracts.forEach((contract) => {
    const matchedEquipment = contractEquipmentMatch(contract, currentEquipment);
    const matchedMaterial = contractMaterialMatch(contract, service.material, serviceMaterialUnitId(service, material));
    pushRow({
      id: `${contract.id}:hora`,
      contract,
      tipo: 'hora',
      valor: contractValueForEquipment(contract, currentEquipment, 'hora'),
      matched: matchedEquipment?.valor_hora,
      sourceLabel: 'valor da máquina',
    });
    pushRow({
      id: `${contract.id}:diaria`,
      contract,
      tipo: 'diaria',
      valor: contractValueForEquipment(contract, currentEquipment, 'diaria'),
      matched: matchedEquipment?.valor_diaria,
      sourceLabel: 'valor da máquina',
    });
    if (service.material && service.tipo !== 'hora' && service.tipo !== 'diaria') {
      pushRow({
        id: `${contract.id}:material`,
        contract,
        tipo: service.tipo || 'quantidade',
        valor: contractValueForService(contract, currentEquipment, service, material),
        matched: matchedMaterial?.valor,
        sourceLabel: 'valor do material',
      });
    }
    pushRow({
      id: `${contract.id}:legacy`,
      contract,
      tipo: contract.tipo || 'diaria',
      valor: contract.valor ?? '',
    });
  });

  return rows.sort((a, b) => {
    const aType = a.tipo === preferredType ? 1 : 0;
    const bType = b.tipo === preferredType ? 1 : 0;
    return Number(b.matched) - Number(a.matched)
      || bType - aType
      || a.label.localeCompare(b.label);
  });
}

function contractRootId(contractId) {
  return String(contractId || '').split(':')[0];
}

function bestContractOption(contracts, currentEquipment, serviceType, preferredContractId = '') {
  const options = contractEquipmentOptions(contracts, currentEquipment, serviceType);
  const preferredRoot = contractRootId(preferredContractId);
  const sameWork = preferredRoot ? options.filter((option) => String(option.contract?.id) === preferredRoot) : options;
  const pool = preferredRoot ? sameWork : options;
  return pool.find((option) => option.tipo === serviceType)
    || pool[0]
    || null;
}

function contractPatchFromOption(option, service) {
  if (!option) {
    return { contrato_id: '', contrato_nome: '', modelo_cobranca: '', valor_unitario: '', valor_total: '' };
  }
  const contract = option.contract;
  return {
    contrato_id: option.id,
    contrato_nome: contract.nome || contract.obra || '',
    endereco: contract.obra || service.endereco,
    modelo_cobranca: option.tipo || service.tipo,
    tipo: option.tipo || service.tipo,
    valor_unitario: option.valor ?? '',
    valor_total: '',
    valor: '',
  };
}

function QuickCreateModal({ request, onCancel, onSave, saving, error }) {
  const [values, setValues] = useState({ nome: '', fantasia: '', cidade: '', tel: '', unidades: ['m3'] });
  const isCliente = request?.type === 'cliente';
  const isMaterial = request?.type === 'material';
  const title = isCliente
    ? 'Novo Cliente'
    : isMaterial
      ? 'Novo Material'
      : 'Novo Barreiro';

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleMaterialUnit(unitId) {
    setValues((current) => {
      const selected = current.unidades || [];
      const next = selected.includes(unitId)
        ? selected.filter((item) => item !== unitId)
        : [...selected, unitId];
      return { ...current, unidades: next };
    });
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
          {isMaterial ? (
            <div className="fg">
              <span className="fl">Unidades permitidas</span>
              <p className="material-modal-note">
                Escolha quais campos aparecem na ficha quando este material for selecionado.
              </p>
              <div className="unit-toggle-grid compact-units">
                {MATERIAL_UNIT_OPTIONS.map((unit) => {
                  const checked = (values.unidades || []).includes(unit.id);
                  return (
                    <label className={`unit-toggle ${checked ? 'active' : ''}`} key={unit.id}>
                      <input type="checkbox" checked={checked} onChange={() => toggleMaterialUnit(unit.id)} />
                      <strong>{unit.short}</strong>
                      <span>{unit.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
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

function ServiceCard({ index, service, lookups, currentEquipment, onChange, onCreateLookup, onRemove }) {
  const cliente = lookups.clientes.find((item) => String(item.id) === String(service.cli_id));
  const material = lookups.materiais.find((item) => item.nome === service.material);
  const selectedUnits = service.material ? materialUnitOptions(material?.unidades, service.tipo === 'quantidade' ? ['un'] : ['m3']) : [];
  const contratos = parseContracts(cliente);
  const contractOptions = contractEquipmentOptions(contratos, currentEquipment, service.tipo, service, material);
  const totalContrato = serviceChargeTotal(service);

  function update(field, value) {
    const patch = { [field]: value };
    if (field === 'cli_id') {
      const nextCliente = lookups.clientes.find((item) => String(item.id) === String(value));
      patch.cliente = nextCliente?.fantasia || nextCliente?.nome || '';
      patch.endereco = nextCliente?.cidade || '';
      patch.tel = nextCliente?.tel || '';
      patch.contrato_id = '';
      patch.contrato_nome = '';
      patch.modelo_cobranca = '';
      patch.valor_unitario = '';
      patch.valor_total = '';
      patch.valor = '';
    }
    if (field === 'tipo') {
      const option = bestContractOption(contratos, currentEquipment, value, service.contrato_id);
      if (option && service.contrato_id) {
        Object.assign(patch, contractPatchFromOption(option, { ...service, tipo: value }));
      }
    }
    if (field === 'material') {
      const nextMaterial = lookups.materiais.find((item) => item.nome === value);
      const allowed = new Set(materialUnitOptions(nextMaterial?.unidades, service.tipo === 'quantidade' ? ['un'] : ['m3']).map((unit) => unit.field));
      MATERIAL_UNIT_OPTIONS.forEach((unit) => {
        if (!allowed.has(unit.field)) patch[unit.field] = '';
      });
      patch.quantidade = '';
      const option = contractEquipmentOptions(contratos, currentEquipment, service.tipo, { ...service, material: value }, nextMaterial)
        .find((item) => String(item.contract?.id) === contractRootId(service.contrato_id) && item.tipo === service.tipo);
      if (option && service.contrato_id) Object.assign(patch, contractPatchFromOption(option, { ...service, material: value }));
    }
    onChange({ ...service, ...patch });
  }

  function applyContract(contractId) {
    const option = contractOptions.find((item) => String(item.id) === String(contractId));
    onChange({ ...service, ...contractPatchFromOption(option, service) });
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
              <button type="button" className={service.tipo === 'hora' ? 'active' : ''} onClick={() => update('tipo', 'hora')}>Hora</button>
              <button type="button" className={service.tipo === 'diaria' ? 'active' : ''} onClick={() => update('tipo', 'diaria')}>Diária</button>
            </div>
          </div>
        </div>

        {service.tipo === 'diaria' ? (
          <div>
            <div>
              <div className="fl service-label">Período da Diária</div>
              <div className="segmented slim">
                <button type="button" className={service.diaria === 'completa' ? 'active' : ''} onClick={() => update('diaria', 'completa')}>Dia Completo</button>
                <button type="button" className={service.diaria === 'meia' ? 'active' : ''} onClick={() => update('diaria', 'meia')}>Meia Diária</button>
              </div>
            </div>
          </div>
        ) : service.tipo === 'hora' ? (
          <section className="hour-work-panel">
            <header>
              <div>
                <strong>Período trabalhado</strong>
                <span>Preencha manhã, tarde ou ambos.</span>
              </div>
              <strong>{minutesToText(serviceHourMinutes(service))}</strong>
            </header>
            <div className="hour-work-grid">
              <TimeField label="Manhã início" value={service.hora_manha_ini || ''} onChange={(value) => update('hora_manha_ini', value)} />
              <TimeField label="Manhã fim" value={service.hora_manha_fim || ''} onChange={(value) => update('hora_manha_fim', value)} />
              <TimeField label="Tarde início" value={service.hora_tarde_ini || ''} onChange={(value) => update('hora_tarde_ini', value)} />
              <TimeField label="Tarde fim" value={service.hora_tarde_fim || ''} onChange={(value) => update('hora_tarde_fim', value)} />
            </div>
          </section>
        ) : (
          <div className="material-measure-layout">
            <div className="form-grid cols-2">
              <Field label="Material">
                <ChoiceSelect
                  value={service.material}
                  onChange={(value) => update('material', value)}
                  placeholder="Selecione o material..."
                  emptyLabel="Selecione o material..."
                  options={lookups.materiais.map((item) => ({ value: item.nome, label: item.nome }))}
                />
                <button type="button" className="inline-add" onClick={() => onCreateLookup('material', service.localId)}>+ Novo material</button>
              </Field>
              <Field label="Barreiro">
                <ChoiceSelect
                  value={service.barreiro}
                  onChange={(value) => update('barreiro', value)}
                  placeholder="Selecione o barreiro..."
                  emptyLabel="Selecione o barreiro..."
                  options={lookups.barreiros.map((barreiro) => ({ value: barreiro.nome, label: barreiro.nome }))}
                />
                <button type="button" className="inline-add" onClick={() => onCreateLookup('barreiro', service.localId)}>+ Novo barreiro</button>
              </Field>
            </div>
            {service.material ? (
              <div className="material-unit-grid">
                {selectedUnits.map((unit) => (
                  <Field label={`${unit.label} (${unit.short})`} key={unit.id}>
                    <input inputMode="decimal" value={service[unit.field] || ''} onChange={(event) => update(unit.field, event.target.value)} placeholder="0" />
                  </Field>
                ))}
              </div>
            ) : (
              <div className="unit-empty-note">
                Selecione o material para liberar as unidades cadastradas nele.
              </div>
            )}
          </div>
        )}

        <div className="service-bottom-grid">
          <div className="client-box">
            <div className="box-title">Cliente</div>
            <Field label="Cliente">
              <ChoiceSelect
                value={service.cli_id}
                onChange={(value) => update('cli_id', value)}
                placeholder="Selecione o cliente..."
                emptyLabel="Selecione o cliente..."
                options={lookups.clientes.map((item) => ({ value: item.id, label: item.fantasia || item.nome }))}
              />
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
            <div className="contract-panel">
              <div className="box-title">Obra / valor automático</div>
              <div className="form-grid cols-3">
                <Field label="Obra">
                  <ChoiceSelect
                    value={service.contrato_id}
                    onChange={applyContract}
                    placeholder={contractOptions.length ? 'Selecione a obra...' : 'Sem obra cadastrada'}
                    emptyLabel={contractOptions.length ? 'Selecione a obra...' : 'Sem obra cadastrada'}
                    options={contractOptions.map((option) => ({
                      value: option.id,
                      label: option.label,
                    }))}
                  />
                </Field>
                <Field label="Valor unitário">
                  <input inputMode="decimal" value={service.valor_unitario || ''} onChange={(event) => update('valor_unitario', event.target.value)} placeholder="0,00" />
                </Field>
                <Field label="Total calculado">
                  <input value={moneyBR(totalContrato)} readOnly />
                </Field>
              </div>
              <small>Ao escolher a obra, o valor vem do cadastro dela. Se trocar entre diária e hora, o app usa o valor correspondente da própria obra.</small>
            </div>
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
                  <input inputMode="decimal" value={service.valor} onChange={(event) => update('valor', event.target.value)} placeholder="0,00" />
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
  const [servicesError, setServicesError] = useState('');
  const [originalServiceIds, setOriginalServiceIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let alive = true;
    setServicesError('');
    setOriginalServiceIds([]);
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
      await onSave(fichaPayload(values, data), values.id, services, originalServiceIds);
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
