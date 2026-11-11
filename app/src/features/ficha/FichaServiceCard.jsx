import { Trash2 } from 'lucide-react';
import { minutesToText } from '../../lib/reports.js';
import { MATERIAL_UNIT_OPTIONS, materialUnitOptions } from '../../lib/units.js';
import { ChoiceSelect, Field, TimeField } from './fichaFormComponents.jsx';
import { bestContractOption, contractEquipmentOptions, contractPatchFromOption, contractRootId, moneyBR, parseContracts, serviceChargeTotal, serviceHourMinutes, serviceTypeLabel } from './fichaServiceHelpers.js';

export function ServiceCard({ index, service, lookups, currentEquipment, onChange, onCreateLookup, onRemove }) {
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

