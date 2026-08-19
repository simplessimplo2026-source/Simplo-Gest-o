import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, Brain, CheckSquare, Download, Eye, FileSpreadsheet, Filter, MapPin, Package, Printer, RotateCcw, Save, Trash2, UserRound, Wrench, FileText } from 'lucide-react';
import { escapeHtml, printHtml } from '../../lib/printHtml.js';
import { dateBR, equipmentForFicha as resolveEquipmentForFicha, getMonthBounds, machineForFicha } from '../../lib/reports.js';
import { downloadXlsx } from '../../lib/xlsx.js';
import { DateInput } from '../../components/DateInput.jsx';
import { buildReportTotalRow } from './relatorioHelpers.js';
import { MATERIAL_UNIT_OPTIONS } from '../../lib/units.js';

const tabs = [
  { id: 'geral', label: 'Resumo geral' },
  { id: 'clientes', label: 'Cliente / obra' },
  { id: 'maquinas', label: 'Máquina por obra' },
  { id: 'materiais', label: 'Material usado' },
  { id: 'barreiros', label: 'Barreiro / origem' },
  { id: 'pedidos', label: 'Pedido / contrato' },
];

const presets = [
  { id: 'clientes', label: 'Cliente / obra', desc: 'Movimento por cliente e endereço', icon: UserRound },
  { id: 'maquinas', label: 'Máquina por obra', desc: 'Uso da frota por obra', icon: Wrench },
  { id: 'materiais', label: 'Material usado', desc: 'Materiais lançados nas fichas', icon: Package },
  { id: 'barreiros', label: 'Barreiro / origem', desc: 'Origem dos materiais', icon: MapPin },
  { id: 'pedidos', label: 'Pedido / contrato', desc: 'Notas, pedidos e contratos', icon: FileText },
  { id: 'geral', label: 'Resumo geral', desc: 'Últimos serviços filtrados', icon: BarChart3 },
];

const reportFields = [
  { id: 'data', label: 'Data', value: (row) => dateBR(row.data), group: 'Ficha' },
  { id: 'codigo', label: 'Codigo', value: (row) => row.codigo || '-', group: 'Ficha' },
  { id: 'pedido', label: 'N pedido', value: (row) => row.pedido || '-', group: 'Pedido' },
  { id: 'cliente', label: 'Cliente', value: (row) => row.cliente || '-', group: 'Cliente / obra' },
  { id: 'obra', label: 'Obra', value: (row) => row.obra || '-', group: 'Cliente / obra' },
  { id: 'descricao', label: 'Descricao', value: (row) => row.descricao || '-', group: 'Servico' },
  { id: 'material', label: 'Material', value: (row) => row.material || '-', group: 'Servico' },
  { id: 'barreiro', label: 'Barreiro', value: (row) => row.barreiro || '-', group: 'Servico' },
  { id: 'maquina', label: 'Maquina', value: (row) => row.maquina || '-', group: 'Equipe' },
  { id: 'placa', label: 'Placa', value: (row) => row.placa || '-', group: 'Equipe' },
  { id: 'operador', label: 'Operador', value: (row) => row.operador || '-', group: 'Equipe' },
  { id: 'unidade', label: 'Unidade', value: (row) => displayUnit(row.unidade), group: 'Valores' },
  { id: 'quantidade', label: 'Quantidade', value: (row) => qtd(row.quantidade), group: 'Valores' },
  { id: 'valor_unitario', label: 'Valor unitario', value: (row) => money(row.valor_unitario || (num(row.quantidade) ? num(row.valor) / num(row.quantidade) : 0)), group: 'Valores' },
  { id: 'valor', label: 'Valor total', value: (row) => money(row.valor), group: 'Valores' },
];

const reportTemplates = [
  {
    id: 'padrao-cliente',
    label: 'Modelo por obra',
    desc: 'Modelo parecido com a planilha da cliente.',
    fields: ['data', 'pedido', 'descricao', 'unidade', 'quantidade', 'valor_unitario', 'valor'],
  },
  {
    id: 'operacional',
    label: 'Operacional completo',
    desc: 'Cliente, obra, maquina, operador e servico.',
    fields: ['data', 'pedido', 'cliente', 'obra', 'maquina', 'operador', 'descricao', 'unidade', 'quantidade', 'valor'],
  },
  {
    id: 'materiais',
    label: 'Materiais e origem',
    desc: 'Material, barreiro, obra e quantidade.',
    fields: ['data', 'pedido', 'cliente', 'obra', 'material', 'barreiro', 'unidade', 'quantidade'],
  },
  {
    id: 'horas-maquinas',
    label: 'Maquinas e operadores',
    desc: 'Uso de equipamento e equipe por obra.',
    fields: ['data', 'pedido', 'obra', 'maquina', 'placa', 'operador', 'descricao', 'quantidade', 'unidade'],
  },
];

const SAVED_REPORTS_KEY = 'binhotti-report-models-v1';

const reportTemplateHints = {
  'padrao-cliente': 'Ideal para enviar por obra: cliente e obra ficam no cabecalho, e a tabela fica mais limpa.',
  operacional: 'Bom para conferencia interna: mostra equipe, maquina, cliente, obra e servico.',
  materiais: 'Focado em materiais: separa material, origem, unidade e quantidade.',
  'horas-maquinas': 'Focado em frota e equipe: mostra onde a maquina trabalhou e quem operou.',
};

function readSavedReportModels() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_REPORTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedReportModels(models) {
  localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(models));
}

const REPORT_BRAND_CSS = `
  .report-brand{display:inline-block;line-height:1;color:#1B3A6B;margin:0 0 10px}
  .report-brand strong{display:block;font-family:Georgia,"Times New Roman",serif;font-size:30px;font-weight:900;letter-spacing:0}
  .report-brand span{display:flex;align-items:center;gap:8px;margin-top:4px;color:#C0272D;font-size:9px;font-weight:900;letter-spacing:2px}
  .report-brand span:before,.report-brand span:after{content:"";display:block;width:52px;height:2px;background:#C0272D}
`;

function reportBrandHtml() {
  return '<div class="report-brand"><strong>BINHOTTI</strong><span>TERRAPLENAGEM</span></div>';
}

function num(value) {
  const raw = String(value || 0).trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return num(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function qtd(value) {
  return num(value).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function serviceQuantity(service) {
  if (service.tipo === 'diaria') return service.diaria === 'meia' ? 0.5 : 1;
  return num(service.quantidade);
}

function serviceUnit(service) {
  if (service.tipo === 'diaria') return 'diária';
  if (service.tipo === 'metragem') return 'm³';
  if (service.tipo === 'hora') return 'Hora';
  return 'un';
}

function displayUnit(unit) {
  const value = String(unit || '-').trim();
  if (value.toLowerCase() === 'h') return 'Hora';
  return value;
}

function serviceMeasures(service) {
  if (service.tipo === 'diaria' || service.tipo === 'hora') {
    return [{ quantidade: serviceQuantity(service), unidade: serviceUnit(service), label: '' }];
  }
  const entries = MATERIAL_UNIT_OPTIONS
    .map((unit) => ({ quantidade: num(service[unit.field]), unidade: unit.report, label: unit.label }))
    .filter((entry) => entry.quantidade);
  if (entries.length) return entries;
  return [{ quantidade: serviceQuantity(service), unidade: serviceUnit(service), label: '' }];
}

function serviceDescription(service, machineName) {
  let description = '';
  if (service.tipo === 'diaria') {
    description = service.diaria === 'meia' ? 'Meia diária' : 'Diária';
  }
  else if (service.tipo === 'hora') {
    const ranges = [
      service.hora_manha_ini && service.hora_manha_fim ? `${service.hora_manha_ini}-${service.hora_manha_fim}` : '',
      service.hora_tarde_ini && service.hora_tarde_fim ? `${service.hora_tarde_ini}-${service.hora_tarde_fim}` : '',
    ].filter(Boolean).join(' / ');
    description = ranges ? `Serviço por hora - ${ranges}` : 'Serviço por hora';
  }
  else if (service.material) description = service.material;
  else if (service.tipo === 'metragem') description = 'Serviço de terraplenagem';
  else if (service.tipo === 'quantidade') description = 'Serviço por quantidade';
  else description = service.tipo || 'Serviço';

  if (service.barreiro && !description.includes(service.barreiro)) description += ` - Barreiro: ${service.barreiro}`;
  if (machineName && machineName !== '-' && !description.includes(machineName)) description += ` - Equipamento: ${machineName}`;
  return description;
}

function clientFromService(service, clientes) {
  if (service.cli_id) {
    const cliente = clientes.find((item) => String(item.id) === String(service.cli_id));
    if (cliente) return cliente.fantasia || cliente.nome || service.cliente || 'Sem cliente';
  }
  return service.cliente || 'Sem cliente';
}

function clientObjectFromService(service, clientes) {
  if (service.cli_id) {
    const cliente = clientes.find((item) => String(item.id) === String(service.cli_id));
    if (cliente) return cliente;
  }
  const serviceName = normalizeKey(service.cliente || service.cliente_nome);
  return clientes.find((cliente) => {
    const names = [cliente.fantasia, cliente.nome].map(normalizeKey).filter(Boolean);
    return serviceName && names.includes(serviceName);
  }) || null;
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

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function machineOptionValue(equipamento) {
  if (!equipamento) return '';
  if (equipamento.id) return `eq:${equipamento.id}`;
  return [equipamento.nome, equipamento.placa].filter(Boolean).join(' - ');
}

function machineOptionLabel(equipamento) {
  if (!equipamento) return '';
  return [equipamento.nome, equipamento.placa].filter(Boolean).join(' - ') || equipamento.nome || equipamento.placa || '';
}

function machineFilterMatches(row, selectedMachine) {
  if (!selectedMachine) return true;
  const selected = String(selectedMachine);
  if (selected.startsWith('eq:')) {
    return String(row.equipamento_id || '') === selected.slice(3);
  }

  const selectedKey = normalizeKey(selected);
  const rowKeys = [
    row.equipamento_id,
    row.maquina,
    row.placa,
    [row.maquina, row.placa].filter(Boolean).join(' - '),
    [row.maquina, row.placa].filter(Boolean).join(' '),
  ].map(normalizeKey).filter(Boolean);

  return rowKeys.some((key) => key === selectedKey || key.includes(selectedKey) || selectedKey.includes(key));
}

function serviceContractRoot(service) {
  return String(service?.contrato_id || '').split(':')[0];
}

function contractValueForType(contract, type) {
  if (!contract) return 0;
  if (type === 'hora') return num(contract.valor_hora);
  if (type === 'diaria') return num(contract.valor_diaria || contract.valor);
  return num(contract.valor);
}

function equipmentByFicha(ficha, data) {
  const resolved = resolveEquipmentForFicha(ficha, data);
  if (resolved) return resolved;

  const machineName = ficha?.maquina || machineForFicha(ficha, data);
  const key = normalizeKey(machineName);
  const equipamentos = data?.equipamentos || [];
  return equipamentos.find((item) => normalizeKey([item.nome, item.placa].filter(Boolean).join(' - ')) === key)
    || equipamentos.find((item) => normalizeKey(item.placa) === key)
    || equipamentos.find((item) => {
      const plate = normalizeKey(item.placa);
      return key && plate && key.includes(plate);
    })
    || null;
}

function contractEquipmentValue(contract, equipamento, type) {
  if (!contract || !equipamento) return 0;
  const equipmentKeys = [
    equipamento.id,
    equipamento.nome,
    equipamento.placa,
    [equipamento.nome, equipamento.placa].filter(Boolean).join(' - '),
  ].map(normalizeKey).filter(Boolean);

  const match = (contract.equipamentos || []).find((item) => {
    const itemKeys = [
      item.equipamento_id,
      item.equipamento_nome,
      item.equipamento_placa,
      [item.equipamento_nome, item.equipamento_placa].filter(Boolean).join(' - '),
    ].map(normalizeKey).filter(Boolean);
    return itemKeys.some((key) => equipmentKeys.includes(key));
  });

  if (!match) return 0;
  if (type === 'hora') return num(match.valor_hora);
  if (type === 'diaria') return num(match.valor_diaria);
  return num(match.valor);
}

function linkedContractForService(service, cliente) {
  const contracts = parseContracts(cliente?.contratos_servicos);
  if (!contracts.length) return null;

  const rootId = serviceContractRoot(service);
  if (rootId) {
    const byId = contracts.find((contract) => String(contract.id) === String(rootId));
    if (byId) return byId;
  }

  const serviceNames = [
    service.contrato_nome,
    service.endereco,
    service.obra,
    service.local,
  ].map(normalizeKey).filter(Boolean);

  const byName = contracts.find((contract) => {
    const contractNames = [contract.obra, contract.nome].map(normalizeKey).filter(Boolean);
    return contractNames.some((name) => serviceNames.includes(name));
  });
  if (byName) return byName;

  return null;
}

function groupRows(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row) || 'Sem informação';
    if (!map.has(key)) {
      map.set(key, {
        nome: key,
        servicos: 0,
        fichas: new Set(),
        obras: new Set(),
        clientes: new Set(),
        materiais: new Set(),
        qtd: 0,
        valor: 0,
      });
    }
    const item = map.get(key);
    item.servicos += 1;
    if (row.ficha_id) item.fichas.add(String(row.ficha_id));
    if (row.obra) item.obras.add(row.obra);
    if (row.cliente) item.clientes.add(row.cliente);
    if (row.material) item.materiais.add(row.material);
    item.qtd += num(row.quantidade);
    item.valor += num(row.valor);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      fichasCount: item.fichas.size,
      obrasCount: item.obras.size,
      clientesCount: item.clientes.size,
      materiaisCount: item.materiais.size,
    }))
    .sort((a, b) => b.servicos - a.servicos || b.valor - a.valor);
}

function groupRowsByUnit(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const name = keyFn(row) || 'Sem informacao';
    const unit = displayUnit(row.unidade);
    const key = `${name}|${unit}`;
    if (!map.has(key)) {
      map.set(key, {
        nome: name,
        unidade: unit,
        servicos: 0,
        fichas: new Set(),
        obras: new Set(),
        clientes: new Set(),
        qtd: 0,
        valor: 0,
      });
    }
    const item = map.get(key);
    item.servicos += 1;
    if (row.ficha_id) item.fichas.add(String(row.ficha_id));
    if (row.obra) item.obras.add(row.obra);
    if (row.cliente) item.clientes.add(row.cliente);
    item.qtd += num(row.quantidade);
    item.valor += num(row.valor);
  });

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      fichasCount: item.fichas.size,
      obrasCount: item.obras.size,
      clientesCount: item.clientes.size,
    }))
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome)) || String(a.unidade).localeCompare(String(b.unidade)));
}

function quantityByUnit(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const unit = displayUnit(row.unidade);
    map.set(unit, (map.get(unit) || 0) + num(row.quantidade));
  });
  return Array.from(map.entries())
    .filter(([, value]) => value)
    .map(([unit, value]) => `${qtd(value)} ${displayUnit(unit)}`)
    .join(' | ');
}

function buildRows(data, filters) {
  const fichas = data?.fichas || [];
  const servicos = data?.ficha_servicos || [];
  const clientes = data?.clientes || [];

  return servicos.flatMap((service) => {
    const ficha = fichas.find((item) => String(item.id) === String(service.ficha_id)) || {};
    const clienteObj = clientObjectFromService(service, clientes);
    const cliente = clienteObj
      ? (clienteObj.fantasia || clienteObj.nome || service.cliente || 'Sem cliente')
      : clientFromService(service, clientes);
    const linkedContract = linkedContractForService(service, clienteObj);
    const obra = linkedContract?.obra || linkedContract?.nome || service.contrato_nome || service.endereco || service.obra || service.local || cliente || 'Sem obra';
    const equipamento = equipmentByFicha(ficha, data);
    const maquina = equipamento?.nome || machineForFicha(ficha, data) || service.maquina || '';
    const placa = equipamento?.placa || '';
    return serviceMeasures(service).map((measure) => {
      const linkedUnitValue = contractEquipmentValue(linkedContract, equipamento, service.tipo) || contractValueForType(linkedContract, service.tipo);
      const storedUnitValue = num(service.valor_unitario);
      const valorUnitario = storedUnitValue || linkedUnitValue;
      const storedTotal = num(service.valor_total ?? service.valor);
      const valorTotal = storedTotal || (valorUnitario && num(measure.quantidade) ? valorUnitario * num(measure.quantidade) : 0);
      const row = {
      data: ficha.data || service.data || '',
      ficha_id: service.ficha_id,
      codigo: ficha.codigo || '',
      pedido: service.nota_pedido || service.pedido_numero || service.n_pedido || ficha.codigo || '',
      cliente,
      cli_id: service.cli_id || clienteObj?.id || '',
      obra,
      equipamento_id: equipamento?.id || '',
      maquina,
      placa,
      operador: ficha.operador || service.operador || '',
      tipo: service.tipo || '',
      material: service.material || '',
      barreiro: service.barreiro || '',
      descricao: serviceDescription(service, maquina),
      unidade: displayUnit(measure.unidade),
      quantidade: measure.quantidade,
      valor_unitario: valorUnitario,
      valor: valorTotal,
      };
      row.texto = [row.codigo, row.pedido, row.cliente, row.obra, row.maquina, row.placa, row.operador, row.tipo, row.material, row.barreiro, row.descricao, row.unidade]
        .join(' ')
        .toLowerCase();
      return row;
    });
  }).filter((row) => {
    if (filters.ini && row.data && row.data < filters.ini) return false;
    if (filters.fim && row.data && row.data > filters.fim) return false;
    if (filters.cliente && String(row.cli_id) !== String(filters.cliente)) return false;
    if (!machineFilterMatches(row, filters.maquina)) return false;
    if (filters.busca && !row.texto.includes(filters.busca.toLowerCase().trim())) return false;
    return true;
  }).sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || String(a.codigo || '').localeCompare(String(b.codigo || '')));
}

function Table({ headers, rows, empty }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.join('|')}-${index}`}>
              {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
          {!rows.length ? <tr><td className="empty-cell" colSpan={headers.length}>{empty || 'Sem dados para estes filtros.'}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function datasetForTab(tab, rows) {
  if (tab === 'clientes') {
    const body = groupRows(rows, (row) => `${row.cliente}|${row.obra}`).map((item) => {
      const [cliente, ...obra] = item.nome.split('|');
      return [cliente, obra.join('|') || '-', item.fichasCount, item.servicos, qtd(item.qtd), money(item.valor)];
    });
    return { kind: tab, title: 'Clientes e obras no período', headers: ['Cliente', 'Obra', 'Fichas', 'Serviços', 'Quantidade', 'Valor'], body };
  }
  if (tab === 'maquinas') {
    const body = groupRows(rows, (row) => row.maquina || 'Sem máquina').map((item) => [item.nome, item.fichasCount, item.obrasCount, item.servicos, qtd(item.qtd), money(item.valor)]);
    return { kind: tab, title: 'Uso das máquinas por obra', headers: ['Máquina', 'Fichas', 'Obras', 'Serviços', 'Quantidade', 'Valor'], body };
  }
  if (tab === 'materiais') {
    return {
      kind: tab,
      title: 'Materiais lancados em servicos',
      headers: ['Material', 'Unidade', 'Lancamentos', 'Obras', 'Quantidade', 'Valor'],
      body: groupRowsByUnit(rows.filter((row) => row.material), (row) => row.material).map((item) => [item.nome, item.unidade, item.servicos, item.obrasCount, qtd(item.qtd), money(item.valor)]),
    };
    const body = groupRowsByUnit(rows.filter((row) => row.material), (row) => row.material).map((item) => [item.nome, item.unidade, item.servicos, item.obrasCount, qtd(item.qtd), money(item.valor)]);
    return { kind: tab, title: 'Materiais lançados em serviços', headers: ['Material', 'Lançamentos', 'Obras', 'Quantidade', 'Valor'], body };
  }
  if (tab === 'barreiros') {
    return {
      kind: tab,
      title: 'Origem dos materiais / barreiros',
      headers: ['Barreiro', 'Unidade', 'Lancamentos', 'Obras', 'Quantidade', 'Valor'],
      body: groupRowsByUnit(rows.filter((row) => row.barreiro), (row) => row.barreiro).map((item) => [item.nome, item.unidade, item.servicos, item.obrasCount, qtd(item.qtd), money(item.valor)]),
    };
    const body = groupRows(rows.filter((row) => row.barreiro), (row) => row.barreiro).map((item) => [item.nome, item.servicos, item.obrasCount, qtd(item.qtd), money(item.valor)]);
    return { kind: tab, title: 'Origem dos materiais / barreiros', headers: ['Barreiro', 'Lançamentos', 'Obras', 'Quantidade', 'Valor'], body };
  }
  if (tab === 'pedidos') {
    const body = groupRows(rows, (row) => row.pedido || 'Sem pedido').map((item) => [item.nome, item.clientesCount, item.obrasCount, item.servicos, money(item.valor)]);
    return { kind: tab, title: 'Pedidos, notas e contratos', headers: ['Pedido / Nota / Contrato', 'Clientes', 'Obras', 'Serviços', 'Valor'], body };
  }
  const body = rows
    .slice()
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || String(a.codigo || '').localeCompare(String(b.codigo || '')))
    .map((row) => [dateBR(row.data), row.pedido || '-', row.cliente, row.obra, row.maquina || '-', row.operador || '-', row.descricao, `${qtd(row.quantidade)} ${row.unidade}`, money(row.valor)]);
  return { kind: tab, title: 'Serviços filtrados por data', headers: ['Data', 'Pedido', 'Cliente', 'Obra', 'Máquina', 'Operador', 'Serviço', 'Quantidade', 'Valor'], body };
}

function uniqueValues(rows, field) {
  return Array.from(new Set(rows.map((row) => row[field]).filter(Boolean)));
}

function reportContext(rows, filters, data) {
  const selectedCliente = filters.cliente
    ? (data?.clientes || []).find((cliente) => String(cliente.id) === String(filters.cliente))
    : null;
  const clientes = uniqueValues(rows, 'cliente');
  const obras = uniqueValues(rows, 'obra');
  return {
    cliente: selectedCliente?.fantasia || selectedCliente?.nome || (clientes.length === 1 ? clientes[0] : clientes.length ? 'Vários clientes' : 'Todos os clientes'),
    obra: obras.length === 1 ? obras[0] : obras.length ? 'Várias obras' : 'Todas as obras',
    singleCliente: clientes.length === 1,
    singleObra: obras.length === 1,
  };
}

function datasetForOutput(dataset, context) {
  if (dataset.kind !== 'geral') return dataset;
  const removable = [];
  if (context.singleCliente) removable.push(dataset.headers.indexOf('Cliente'));
  if (context.singleObra) removable.push(dataset.headers.indexOf('Obra'));
  const indexes = removable.filter((index) => index >= 0);
  if (!indexes.length) return dataset;
  return {
    ...dataset,
    headers: dataset.headers.filter((_, index) => !indexes.includes(index)),
    body: dataset.body.map((row) => row.filter((_, index) => !indexes.includes(index))),
  };
}

function datasetFromFields(rows, fields, title = 'Relatorio editavel') {
  const selected = fields
    .map((fieldId) => reportFields.find((field) => field.id === fieldId))
    .filter(Boolean);
  return {
    kind: 'custom',
    title,
    headers: selected.map((field) => field.label),
    body: rows.map((row) => selected.map((field) => field.value(row))),
  };
}

function reportReadiness(rows, fields, context) {
  if (!rows.length) return { level: 'warn', title: 'Sem dados para gerar', text: 'Ajuste periodo, cliente, maquina ou busca para montar o relatorio.' };
  if (!fields.includes('data')) return { level: 'warn', title: 'Inclua a data', text: 'A data ajuda a Sabrina conferir a ordem dos lancamentos.' };
  if (!fields.includes('descricao')) return { level: 'warn', title: 'Inclua a descricao', text: 'A descricao deixa o PDF mais claro para cliente e financeiro.' };
  if (!context.singleCliente && !fields.includes('cliente')) return { level: 'warn', title: 'Varios clientes no filtro', text: 'Inclua Cliente na tabela ou filtre um cliente especifico.' };
  if (!context.singleObra && !fields.includes('obra')) return { level: 'warn', title: 'Varias obras no filtro', text: 'Inclua Obra na tabela ou filtre uma obra pela busca.' };
  return { level: 'ok', title: 'Pronto para gerar', text: 'O relatorio esta com contexto, ordem e campos suficientes para conferencia.' };
}

function moveField(fields, fieldId, direction) {
  const index = fields.indexOf(fieldId);
  if (index < 0) return fields;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= fields.length) return fields;
  const next = [...fields];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function exportDatasetXlsx(dataset, rows, filters, totals, data) {
  if (!dataset.body.length) return;
  const context = reportContext(rows, filters, data);
  const outputDataset = datasetForOutput(dataset, context);
  const unitSummary = quantityByUnit(rows) || qtd(totals.qtd);
  const totalRow = buildReportTotalRow(outputDataset.headers, { ...totals, qtdLabel: unitSummary });
  const slug = outputDataset.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\W+/g, '-')
    .replace(/^-|-$/g, '') || 'relatorio';
  const excelRows = [
    ['BINHOTTI'],
    ['TERRAPLENAGEM'],
    [outputDataset.title],
    [`Período: ${dateBR(filters.ini)} a ${dateBR(filters.fim)}`],
    [`Cliente: ${context.cliente}`, `Obra: ${context.obra}`],
    [`Lançamentos: ${rows.length}`, `Quantidade: ${qtd(totals.qtd)}`, `Valor total: ${money(totals.valor)}`],
    [`Resumo por unidade: ${unitSummary}`],
    outputDataset.headers,
    ...outputDataset.body,
    totalRow,
    ['Gerado por Simplo Gestão - Central de Relatórios Binhotti'],
  ];
  downloadXlsx(`relatorio-binhotti-${slug}.xlsx`, outputDataset.title, excelRows, { headerRow: 7, logo: false });
}

function printDataset(dataset, filters, totals, rows, data) {
  if (!dataset.body.length) return;
  const esc = escapeHtml;
  const context = reportContext(rows, filters, data);
  const outputDataset = datasetForOutput(dataset, context);
  const unitSummary = quantityByUnit(rows) || qtd(totals.qtd);
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(outputDataset.title)}</title><style>
    ${REPORT_BRAND_CSS}
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:14mm;color:#1A1A1A}
    .top{border-top:7px solid #1B3A6B;padding:14px 0 12px;border-bottom:1px solid #D9DEE8;margin-bottom:12px}
    .title{font-size:16px;font-weight:900;color:#1B3A6B;margin-top:14px;text-transform:uppercase}.meta{font-size:11px;color:#3E4757;margin-top:5px}
    .context{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}.context div{border:1px solid #D6DCE7;padding:8px;background:#fff}.context span{display:block;font-size:9px;color:#5B6472;text-transform:uppercase;font-weight:800}.context strong{display:block;margin-top:3px;color:#1B3A6B;font-size:13px}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 12px}.summary div{border:1px solid #D6DCE7;border-left:4px solid #C0272D;padding:8px;background:#F8FAFD}.summary span{display:block;font-size:9px;color:#5B6472;text-transform:uppercase;font-weight:800}.summary strong{display:block;margin-top:3px;color:#1B3A6B;font-size:14px}
    .unit-summary{border:1px solid #D6DCE7;border-left:4px solid #1B3A6B;background:#F8FAFD;padding:8px 10px;margin:0 0 12px}.unit-summary span{display:block;font-size:9px;color:#5B6472;text-transform:uppercase;font-weight:800}.unit-summary strong{display:block;margin-top:3px;color:#1B3A6B;font-size:13px}
    table{width:100%;border-collapse:collapse}th{background:#1B3A6B;color:#fff;font-size:9px;text-transform:uppercase;padding:6px;border:1px solid #16315C}
    td{font-size:10px;padding:6px;border:1px solid #D6DCE7;vertical-align:top}tbody tr:nth-child(even){background:#F8FAFD}.foot{margin-top:18px;font-size:10px;color:#3E4757;text-align:right}
    @media print{@page{size:A4 landscape;margin:10mm}body{padding:0}}
  </style></head><body>
    <div class="top">${reportBrandHtml()}<div class="title">${esc(outputDataset.title)}</div><div class="meta">Período: ${esc(dateBR(filters.ini))} a ${esc(dateBR(filters.fim))}</div></div>
    <div class="context"><div><span>Cliente</span><strong>${esc(context.cliente)}</strong></div><div><span>Obra</span><strong>${esc(context.obra)}</strong></div></div>
    <div class="unit-summary"><span>Quantidades por unidade</span><strong>${esc(unitSummary)}</strong></div>
    <div class="summary"><div><span>Linhas</span><strong>${dataset.body.length}</strong></div><div><span>Serviços</span><strong>${totals.servicos}</strong></div><div><span>Quantidade</span><strong>${qtd(totals.qtd)}</strong></div><div><span>Valor</span><strong>${money(totals.valor)}</strong></div></div>
    <table><thead><tr>${outputDataset.headers.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${outputDataset.body.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="foot">Gerado por Simplo Gestão</div>
  </body></html>`;
  printHtml(html);
}

function exportDesignerXlsx(dataset, rows, filters, totals, data) {
  if (!dataset.body.length) return;
  const context = reportContext(rows, filters, data);
  const outputDataset = datasetForOutput(dataset, context);
  const unitSummary = quantityByUnit(rows) || qtd(totals.qtd);
  const totalRow = buildReportTotalRow(outputDataset.headers, { ...totals, qtdLabel: unitSummary });
  const slug = outputDataset.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\W+/g, '-')
    .replace(/^-|-$/g, '') || 'relatorio';

  const excelRows = [
    ['BINHOTTI'],
    ['TERRAPLENAGEM'],
    [outputDataset.title],
    [`Periodo: ${dateBR(filters.ini)} a ${dateBR(filters.fim)}`],
    [`Cliente: ${context.cliente}`, `Obra: ${context.obra}`],
    [`Lancamentos: ${rows.length}`, `Quantidade: ${qtd(totals.qtd)}`, `Valor total: ${money(totals.valor)}`],
    [`Resumo por unidade: ${unitSummary}`],
    outputDataset.headers,
    ...outputDataset.body,
    totalRow,
    ['Gerado por Simplo Gestao - Central de Relatorios Binhotti'],
  ];

  downloadXlsx(`relatorio-binhotti-${slug}.xlsx`, outputDataset.title, excelRows, { headerRow: 7, logo: false });
}

function printDesignerDataset(dataset, filters, totals, rows, data) {
  if (!dataset.body.length) return;
  const esc = escapeHtml;
  const context = reportContext(rows, filters, data);
  const outputDataset = datasetForOutput(dataset, context);
  const unitSummary = quantityByUnit(rows) || qtd(totals.qtd);
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(outputDataset.title)}</title><style>
    ${REPORT_BRAND_CSS}
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:14mm;color:#1A1A1A}
    .top{border-top:7px solid #1B3A6B;padding:14px 0 12px;border-bottom:1px solid #D9DEE8;margin-bottom:12px}
    .title{font-size:16px;font-weight:900;color:#1B3A6B;margin-top:14px;text-transform:uppercase}.meta{font-size:11px;color:#3E4757;margin-top:5px}
    .context{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}.context div{border:1px solid #D6DCE7;padding:8px;background:#fff}.context span{display:block;font-size:9px;color:#5B6472;text-transform:uppercase;font-weight:800}.context strong{display:block;margin-top:3px;color:#1B3A6B;font-size:13px}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 12px}.summary div{border:1px solid #D6DCE7;border-left:4px solid #C0272D;padding:8px;background:#F8FAFD}.summary span{display:block;font-size:9px;color:#5B6472;text-transform:uppercase;font-weight:800}.summary strong{display:block;margin-top:3px;color:#1B3A6B;font-size:14px}
    .unit-summary{border:1px solid #D6DCE7;border-left:4px solid #1B3A6B;background:#F8FAFD;padding:8px 10px;margin:0 0 12px}.unit-summary span{display:block;font-size:9px;color:#5B6472;text-transform:uppercase;font-weight:800}.unit-summary strong{display:block;margin-top:3px;color:#1B3A6B;font-size:13px}
    table{width:100%;border-collapse:collapse}th{background:#1B3A6B;color:#fff;font-size:9px;text-transform:uppercase;padding:6px;border:1px solid #16315C}
    td{font-size:10px;padding:6px;border:1px solid #D6DCE7;vertical-align:top}tbody tr:nth-child(even){background:#F8FAFD}.foot{margin-top:18px;font-size:10px;color:#3E4757;text-align:right}
    @media print{@page{size:A4 landscape;margin:10mm}body{padding:0}}
  </style></head><body>
    <div class="top">${reportBrandHtml()}<div class="title">${esc(outputDataset.title)}</div><div class="meta">Periodo: ${esc(dateBR(filters.ini))} a ${esc(dateBR(filters.fim))}</div></div>
    <div class="context"><div><span>Cliente</span><strong>${esc(context.cliente)}</strong></div><div><span>Obra</span><strong>${esc(context.obra)}</strong></div></div>
    <div class="unit-summary"><span>Quantidades por unidade</span><strong>${esc(unitSummary)}</strong></div>
    <div class="summary"><div><span>Linhas</span><strong>${outputDataset.body.length}</strong></div><div><span>Servicos</span><strong>${totals.servicos}</strong></div><div><span>Quantidade</span><strong>${qtd(totals.qtd)}</strong></div><div><span>Valor</span><strong>${money(totals.valor)}</strong></div></div>
    <table><thead><tr>${outputDataset.headers.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${outputDataset.body.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="foot">Gerado por Simplo Gestao</div>
  </body></html>`;
  printHtml(html);
}

export function RelatoriosPage({ data }) {
  const bounds = getMonthBounds();
  const [activeTab, setActiveTab] = useState('geral');
  const [filters, setFilters] = useState({ ini: bounds.ini, fim: bounds.fim, cliente: '', maquina: '', busca: '' });
  const [showAI, setShowAI] = useState(false);
  const [designerMode, setDesignerMode] = useState(true);
  const [customTitle, setCustomTitle] = useState('Relatorio personalizado');
  const [selectedFields, setSelectedFields] = useState(reportTemplates[0].fields);
  const [selectedTemplate, setSelectedTemplate] = useState(reportTemplates[0].id);
  const [savedModels, setSavedModels] = useState(readSavedReportModels);
  const activeReport = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const machines = useMemo(() => {
    const options = [];
    const seen = new Set();
    (data?.equipamentos || []).forEach((item) => {
      const value = machineOptionValue(item);
      const label = machineOptionLabel(item);
      if (!value || !label || seen.has(value)) return;
      seen.add(value);
      options.push({ value, label });
    });
    (data?.fichas || []).forEach((item) => {
      if (!item.maquina) return;
      const value = item.maquina;
      if (seen.has(value)) return;
      seen.add(value);
      options.push({ value, label: item.maquina });
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const rows = useMemo(() => buildRows(data, filters), [data, filters]);
  const dataset = useMemo(() => datasetForTab(activeTab, rows), [activeTab, rows]);
  const context = useMemo(() => reportContext(rows, filters, data), [rows, filters, data]);
  const designerTitle = selectedTemplate === 'padrao-cliente'
    ? `OBRA: ${String(context.obra || 'Todas as obras').toUpperCase()}`
    : customTitle || 'Relatorio personalizado';
  const customDataset = useMemo(() => datasetFromFields(rows, selectedFields, designerTitle), [rows, selectedFields, designerTitle]);
  const outputDataset = designerMode ? customDataset : dataset;
  const previewGroups = useMemo(() => groupRows(rows, (row) => `${row.cliente || 'Sem cliente'}|${row.obra || 'Sem obra'}`).slice(0, 4), [rows]);
  const selectedCliente = useMemo(() => {
    if (!filters.cliente) return '';
    const cliente = (data?.clientes || []).find((item) => String(item.id) === String(filters.cliente));
    return cliente?.fantasia || cliente?.nome || '';
  }, [data, filters.cliente]);

  const totals = useMemo(() => {
    const fichas = new Set(rows.map((row) => row.ficha_id).filter(Boolean));
    const obras = new Set(rows.map((row) => row.obra).filter(Boolean));
    return {
      servicos: rows.length,
      fichas: fichas.size,
      obras: obras.size,
      qtd: rows.reduce((sum, row) => sum + num(row.quantidade), 0),
      valor: rows.reduce((sum, row) => sum + num(row.valor), 0),
    };
  }, [rows]);
  const totalsByUnit = useMemo(() => quantityByUnit(rows), [rows]);
  const readiness = useMemo(() => reportReadiness(rows, selectedFields, context), [rows, selectedFields, context]);
  const selectedFieldLabels = useMemo(() => (
    selectedFields
      .map((fieldId) => reportFields.find((field) => field.id === fieldId)?.label || fieldId)
  ), [selectedFields]);

  const insights = useMemo(() => {
    const maquinas = groupRows(rows, (row) => row.maquina || 'Sem máquina');
    const clientes = groupRows(rows, (row) => row.cliente || 'Sem cliente');
    const materiais = groupRows(rows.filter((row) => row.material), (row) => row.material);
    const lines = [];
    if (!rows.length) lines.push('Nenhum serviço encontrado nos filtros atuais.');
    if (maquinas.length) lines.push(`Máquina mais usada: ${maquinas[0].nome} com ${maquinas[0].servicos} serviço(s) em ${maquinas[0].obrasCount} obra(s).`);
    if (clientes.length) lines.push(`Cliente/obra com mais movimento: ${clientes[0].nome} com ${clientes[0].servicos} lançamento(s).`);
    if (materiais.length) lines.push(`Material mais movimentado: ${materiais[0].nome} com ${qtd(materiais[0].qtd)} registrado(s).`);
    lines.push(`Total filtrado: ${rows.length} serviço(s), ${money(totals.valor)}.`);
    return lines;
  }, [rows, totals.valor]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function choosePreset(tab) {
    setActiveTab(tab);
    setDesignerMode(false);
    setShowAI(false);
  }

  function applyTemplate(templateId) {
    const template = reportTemplates.find((item) => item.id === templateId) || reportTemplates[0];
    setSelectedTemplate(template.id);
    setSelectedFields(template.fields);
    setCustomTitle(template.label);
    setDesignerMode(true);
  }

  function saveCurrentModel() {
    const title = (customTitle || designerTitle || 'Relatorio personalizado').trim();
    const model = {
      id: `${Date.now()}`,
      title,
      templateId: selectedTemplate,
      fields: selectedFields,
    };
    setSavedModels((current) => {
      const next = [model, ...current].slice(0, 8);
      writeSavedReportModels(next);
      return next;
    });
  }

  function applySavedModel(model) {
    setSelectedTemplate(model.templateId || 'personalizado');
    setSelectedFields(Array.isArray(model.fields) && model.fields.length ? model.fields : reportTemplates[0].fields);
    setCustomTitle(model.title || 'Relatorio personalizado');
    setDesignerMode(true);
  }

  function deleteSavedModel(modelId) {
    setSavedModels((current) => {
      const next = current.filter((model) => model.id !== modelId);
      writeSavedReportModels(next);
      return next;
    });
  }

  function toggleField(fieldId) {
    setSelectedFields((current) => {
      if (current.includes(fieldId)) {
        const next = current.filter((item) => item !== fieldId);
        return next.length ? next : current;
      }
      return [...current, fieldId];
    });
  }

  function resetFilters() {
    setFilters({ ini: bounds.ini, fim: bounds.fim, cliente: '', maquina: '', busca: '' });
  }

  const selectedMachineLabel = filters.maquina
    ? (machines.find((machine) => machine.value === filters.maquina)?.label || filters.maquina)
    : '';

  const filterChips = [
    `Período: ${dateBR(filters.ini)} a ${dateBR(filters.fim)}`,
    selectedCliente ? `Cliente: ${selectedCliente}` : 'Clientes: todos',
    selectedMachineLabel ? `Máquina: ${selectedMachineLabel}` : 'Máquinas: todas',
    filters.busca ? `Busca: ${filters.busca}` : null,
  ].filter(Boolean);

  return (
    <section>
      <div className="report-header">
        <div>
          <h2>Central de Relatórios</h2>
          <p>Cruze fichas, clientes, obras, máquinas, materiais, barreiros e pedidos.</p>
        </div>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => setShowAI((value) => !value)}><Brain size={15} /> Análise IA</button>
        </div>
      </div>

      <section className="report-lab-strip" aria-label="Resumo do laboratorio de relatorios">
        <article>
          <span>Modelo ativo</span>
          <strong>{designerMode ? customDataset.title : activeReport.label}</strong>
          <small>{designerMode ? `${selectedFields.length} coluna(s) editaveis` : 'relatorio pronto'}</small>
        </article>
        <article>
          <span>Dados filtrados</span>
          <strong>{rows.length}</strong>
          <small>{dateBR(filters.ini)} a {dateBR(filters.fim)}</small>
        </article>
        <article>
          <span>Quantidade</span>
          <strong>{totalsByUnit || qtd(totals.qtd)}</strong>
          <small>separado por unidade do lancamento</small>
        </article>
        <article>
          <span>Saida</span>
          <strong>PDF + Excel</strong>
          <small>com identidade Binhotti</small>
        </article>
        <article>
          <span>Modelos salvos</span>
          <strong>{savedModels.length}</strong>
          <small>layouts personalizados neste navegador</small>
        </article>
      </section>

      <section className="panel report-builder">
        <div className="report-step">
          <span>1. Escolha um relatório pronto</span>
          <div className="report-presets">
            {presets.map((preset) => (
              <button key={preset.id} className={activeTab === preset.id ? 'active' : ''} type="button" onClick={() => choosePreset(preset.id)}>
                <preset.icon size={15} />
                <span>
                  <strong>{preset.label}</strong>
                  <small>{preset.desc}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="report-step">
          <span>2. Refine o período e os filtros</span>
          <div className="filters-grid report-filters">
            <label>
              Data inicial
              <DateInput value={filters.ini} onChange={(value) => updateFilter('ini', value)} />
            </label>
            <label>
              Data final
              <DateInput value={filters.fim} onChange={(value) => updateFilter('fim', value)} />
            </label>
            <label>
              Cliente
              <select value={filters.cliente} onChange={(event) => updateFilter('cliente', event.target.value)}>
                <option value="">Todos os clientes</option>
                {(data?.clientes || []).map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.fantasia || cliente.nome}</option>)}
              </select>
            </label>
            <label>
              Máquina
              <select value={filters.maquina} onChange={(event) => updateFilter('maquina', event.target.value)}>
                <option value="">Todas as máquinas</option>
                {machines.map((machine) => <option key={machine.value} value={machine.value}>{machine.label}</option>)}
              </select>
            </label>
            <label>
              Busca livre
              <input value={filters.busca} onChange={(event) => updateFilter('busca', event.target.value)} placeholder="obra, pedido, material..." />
            </label>
          </div>
        </div>
      </section>


      <section className="panel report-designer">
        <div className="designer-topline">
          <div>
            <span>Designer de relatorio</span>
            <h3>Relatorio editavel</h3>
            <p>Monte o layout, escolha as colunas e confira a folha antes de exportar.</p>
          </div>
          <label className="designer-switch">
            <input type="checkbox" checked={designerMode} onChange={(event) => setDesignerMode(event.target.checked)} />
            <span>Usar relatorio editavel</span>
          </label>
          <button className="ghost-button" type="button" onClick={saveCurrentModel}><Save size={15} /> Salvar modelo</button>
        </div>

        <div className="designer-live-summary">
          <article>
            <span>Modelo</span>
            <strong>{selectedTemplate === 'padrao-cliente' ? 'Por obra' : customTitle || 'Personalizado'}</strong>
          </article>
          <article>
            <span>Colunas</span>
            <strong>{selectedFields.length}</strong>
          </article>
          <article>
            <span>Linhas filtradas</span>
            <strong>{rows.length}</strong>
          </article>
          <article>
            <span>Quantidades</span>
            <strong>{totalsByUnit || qtd(totals.qtd)}</strong>
          </article>
        </div>

        <div className="designer-guidance">
          <article>
            <span>Uso recomendado</span>
            <strong>{reportTemplates.find((template) => template.id === selectedTemplate)?.label || 'Relatorio personalizado'}</strong>
            <p>{reportTemplateHints[selectedTemplate] || 'Ajuste as colunas para montar um modelo proprio da Binhotti.'}</p>
          </article>
          <article className={`readiness-card ${readiness.level}`}>
            <span>Status do relatorio</span>
            <strong>{readiness.title}</strong>
            <p>{readiness.text}</p>
          </article>
        </div>

        <div className="designer-pipeline" aria-label="Fluxo de geracao do relatorio">
          <span className="active"><b>01</b> Modelo</span>
          <span className="active"><b>02</b> Campos</span>
          <span className="active"><b>03</b> Preview</span>
          <span><b>04</b> Exportar</span>
        </div>

        <div className="designer-layout">
          <aside className="designer-sidebar">
            <label className="fg">
              <span className="fl">Titulo do relatorio</span>
              <input
                value={selectedTemplate === 'padrao-cliente' ? designerTitle : customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                disabled={selectedTemplate === 'padrao-cliente'}
                placeholder="Ex: Obra Barra View"
              />
            </label>
            <div className="designer-block">
              <strong>Modelos prontos</strong>
              {reportTemplates.map((template) => (
                <button key={template.id} type="button" className={selectedTemplate === template.id ? 'active' : ''} onClick={() => applyTemplate(template.id)}>
                  <CheckSquare size={15} />
                  <span><b>{template.label}</b><small>{template.desc}</small></span>
                </button>
              ))}
            </div>
            <div className="designer-block saved-models">
              <strong>Modelos salvos</strong>
              {savedModels.map((model) => (
                <div className="saved-model-row" key={model.id}>
                  <button type="button" onClick={() => applySavedModel(model)}>
                    <CheckSquare size={15} />
                    <span><b>{model.title}</b><small>{model.fields?.length || 0} coluna(s)</small></span>
                  </button>
                  <button className="delete-saved-model" type="button" aria-label="Excluir modelo salvo" onClick={() => deleteSavedModel(model.id)}><Trash2 size={14} /></button>
                </div>
              ))}
              {!savedModels.length ? <small className="saved-empty">Nenhum modelo salvo ainda.</small> : null}
            </div>
          </aside>

          <div className="designer-fields">
            <div className="designer-block-title designer-fields-head">
              <div>
                <strong>Campos do relatorio</strong>
                <small>Escolha o que entra no PDF e no Excel. Os campos azuis ja estao no modelo.</small>
              </div>
              <span>{selectedFields.length}<small>colunas</small></span>
            </div>
            <div className="designer-mini-steps" aria-label="Configuracao do modelo">
              <span className={selectedTemplate ? 'done' : ''}>Modelo</span>
              <span className={selectedFields.length ? 'done' : ''}>Campos</span>
              <span className={rows.length ? 'done' : ''}>Dados</span>
              <span className={selectedFields.length && rows.length ? 'done' : ''}>Exportacao</span>
            </div>
            <div className="field-check-grid">
              {reportFields.map((field) => (
                <button
                  className={`field-toggle ${selectedFields.includes(field.id) ? 'active' : ''}`}
                  key={field.id}
                  type="button"
                  aria-pressed={selectedFields.includes(field.id)}
                  onClick={() => toggleField(field.id)}
                >
                  <span>
                    <strong>{field.label}</strong>
                    <small>{field.group}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="selected-fields-strip">
              <div className="selected-fields-head">
                <div>
                  <strong>Ordem final no PDF e Excel</strong>
                  <small>Use as setas para montar a sequencia exata das colunas.</small>
                </div>
                <em>{selectedFields.length} selecionada(s)</em>
              </div>
              <div>
                {selectedFields.map((fieldId, index) => {
                  const field = reportFields.find((item) => item.id === fieldId);
                  return (
                    <span key={fieldId}>
                      <b>{String(index + 1).padStart(2, '0')}</b>
                      {field?.label || fieldId}
                      <button type="button" aria-label="Mover para esquerda" onClick={() => setSelectedFields((current) => moveField(current, fieldId, -1))}><ArrowUp size={12} /></button>
                      <button type="button" aria-label="Mover para direita" onClick={() => setSelectedFields((current) => moveField(current, fieldId, 1))}><ArrowDown size={12} /></button>
                    </span>
                  );
                })}
                {!selectedFields.length ? <small className="saved-empty">Selecione pelo menos uma coluna para montar o relatorio.</small> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="report-preview">
          <div className="preview-sheet">
            <div className="preview-doc-head">
              <div>
                <span>Preview do modelo</span>
                <strong>Binhotti Terraplenagem</strong>
              </div>
              <small>{dateBR(filters.ini)} a {dateBR(filters.fim)}</small>
            </div>
            <div className="preview-title">
              <span>{designerTitle}</span>
              <small>{selectedFields.length} coluna(s) no PDF e Excel</small>
            </div>
            <div className="preview-unit-banner">
              <span>Quantidades por unidade</span>
              <strong>{totalsByUnit || qtd(totals.qtd)}</strong>
            </div>
            <div className="preview-context-grid">
              <article><span>Cliente</span><strong>{context.cliente}</strong></article>
              <article><span>Obra</span><strong>{context.obra}</strong></article>
              <article><span>Linhas</span><strong>{rows.length}</strong></article>
              <article><span>Valor</span><strong>{money(totals.valor)}</strong></article>
            </div>
            <div className="preview-groups">
              {previewGroups.map((group) => {
                const [cliente, ...obra] = group.nome.split('|');
                return <span key={group.nome}><b>{cliente}</b>{obra.join('|') || '-'}<em>{group.servicos} item(ns)</em></span>;
              })}
            </div>
            <div className="preview-column-list">
              <strong>Colunas selecionadas</strong>
              <div>
                {selectedFieldLabels.map((label, index) => <span key={`${label}-${index}`}>{index + 1}. {label}</span>)}
              </div>
            </div>
            <Table headers={customDataset.headers} rows={customDataset.body.slice(0, 8)} empty="Sem dados para visualizar." />
            <small className="preview-foot"><Eye size={13} /> Preview das primeiras linhas. PDF e Excel saem com todos os dados filtrados.</small>
          </div>
        </div>
      </section>
      <section className="selected-report-card">
        <div>
          <span>Relatório selecionado</span>
          <strong>{designerMode ? customDataset.title : activeReport.label}</strong>
          <small>{rows.length} lançamento(s), {qtd(totals.qtd)} em quantidade, {money(totals.valor)} em valor.</small>
          <div className="report-filter-chips">
            {filterChips.map((chip) => <em key={chip}><Filter size={12} /> {chip}</em>)}
          </div>
        </div>
        <div className="button-row">
          <button className="ghost-button" type="button" onClick={resetFilters}><RotateCcw size={15} /> Limpar filtros</button>
          <button className="ghost-button" type="button" disabled={!outputDataset.body.length} onClick={() => exportDesignerXlsx(outputDataset, rows, filters, totals, data)}><FileSpreadsheet size={15} /> Gerar Excel</button>
          <button className="primary-button" type="button" disabled={!outputDataset.body.length} onClick={() => printDesignerDataset(outputDataset, filters, totals, rows, data)}><Printer size={15} /> Gerar PDF</button>
        </div>
      </section>

      {showAI ? (
        <section className="ai-panel">
          <strong>Análise inteligente - Simplo IA</strong>
          {insights.map((line) => <p key={line}>{line}</p>)}
        </section>
      ) : null}

      <div className="stats-grid">
        <article className="stat-card"><div><span>Serviços</span><strong>{totals.servicos}</strong><small>{totals.fichas} ficha(s)</small></div><Download size={22} /></article>
        <article className="stat-card"><div><span>Obras</span><strong>{totals.obras}</strong><small>endereços/clientes</small></div><Download size={22} /></article>
        <article className="stat-card"><div><span>Quantidade</span><strong>{qtd(totals.qtd)}</strong><small>m³, unidades, horas e diárias</small></div><Download size={22} /></article>
        <article className="stat-card"><div><span>Valor</span><strong>{money(totals.valor)}</strong><small>serviços lançados</small></div><Download size={22} /></article>
      </div>

      <div className="tabs-row">
        {tabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} type="button" onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>{dataset.title}</h2>
          <span>Relatório selecionado: {activeReport.label}</span>
        </div>
        <Table headers={dataset.headers} rows={dataset.body} />
      </section>
    </section>
  );
}
