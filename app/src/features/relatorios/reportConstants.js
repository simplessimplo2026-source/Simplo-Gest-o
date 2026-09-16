export const tabs = [
  { id: 'geral', label: 'Resumo geral' },
  { id: 'clientes', label: 'Cliente / obra' },
  { id: 'maquinas', label: 'Máquina por obra' },
  { id: 'materiais', label: 'Material usado' },
  { id: 'barreiros', label: 'Barreiro / origem' },
  { id: 'pedidos', label: 'Pedido / contrato' },
];

export const reportFields = [
  { id: 'data', label: 'Data', value: (row) => dateBR(row.data), group: 'Ficha' },
  { id: 'codigo', label: 'Código da ficha', value: (row) => row.codigo || 'Sem código', group: 'Ficha' },
  { id: 'pedido', label: 'Nº Pedido / Nota', value: (row) => row.pedido || 'Não informado', group: 'Pedido' },
  { id: 'cliente', label: 'Cliente', value: (row) => row.cliente || '-', group: 'Cliente / obra' },
  { id: 'obra', label: 'Obra', value: (row) => row.obra || '-', group: 'Cliente / obra' },
  { id: 'descricao', label: 'Descrição', value: (row) => row.descricao || '-', group: 'Serviço' },
  { id: 'cobranca', label: 'Cobrança', value: (row) => row.cobranca || '-', group: 'Valores' },
  { id: 'material', label: 'Material', value: (row) => row.material || '-', group: 'Serviço' },
  { id: 'barreiro', label: 'Barreiro', value: (row) => row.barreiro || '-', group: 'Serviço' },
  { id: 'maquina', label: 'Máquina', value: (row) => row.maquina || '-', group: 'Equipe' },
  { id: 'placa', label: 'Placa', value: (row) => row.placa || '-', group: 'Equipe' },
  { id: 'operador', label: 'Operador', value: (row) => row.operador || '-', group: 'Equipe' },
  { id: 'unidade', label: 'Unidade', value: (row) => displayUnit(row.unidade), group: 'Valores' },
  { id: 'quantidade', label: 'Quantidade', value: (row) => qtd(row.quantidade), group: 'Valores' },
  { id: 'valor_unitario', label: 'Valor unitário', value: (row) => money(hasValue(row.valor_unitario) ? row.valor_unitario : (num(row.quantidade) ? num(row.valor) / num(row.quantidade) : 0)), group: 'Valores' },
  { id: 'valor', label: 'Valor total', value: (row) => money(row.valor), group: 'Valores' },
];

export const reportTemplates = [
  {
    id: 'padrao-cliente',
    label: 'Modelo por obra',
    desc: 'Modelo parecido com a planilha da cliente.',
    fields: ['data', 'pedido', 'descricao', 'cobranca', 'unidade', 'quantidade', 'valor_unitario', 'valor'],
  },
  {
    id: 'operacional',
    label: 'Operacional completo',
    desc: 'Cliente, obra, máquina, operador e serviço.',
    fields: ['data', 'pedido', 'cliente', 'obra', 'maquina', 'placa', 'operador', 'descricao', 'cobranca', 'unidade', 'quantidade', 'valor'],
  },
  {
    id: 'materiais',
    label: 'Materiais e origem',
    desc: 'Material, barreiro, obra e quantidade.',
    fields: ['data', 'pedido', 'cliente', 'obra', 'material', 'barreiro', 'unidade', 'quantidade'],
  },
  {
    id: 'horas-maquinas',
    label: 'Máquinas e operadores',
    desc: 'Uso de equipamento e equipe por obra.',
    fields: ['data', 'pedido', 'obra', 'maquina', 'placa', 'operador', 'descricao', 'cobranca', 'quantidade', 'unidade', 'valor_unitario', 'valor'],
  },
];

export const SAVED_REPORTS_KEY = 'binhotti-report-models-v1';

export const reportTemplateHints = {
  'padrao-cliente': 'Ideal para enviar por obra: cliente e obra ficam no cabecalho, e a tabela fica mais limpa.',
  operacional: 'Bom para conferencia interna: mostra equipe, maquina, cliente, obra e servico.',
  materiais: 'Focado em materiais: separa material, origem, unidade e quantidade.',
  'horas-maquinas': 'Focado em frota e equipe: mostra onde a maquina trabalhou e quem operou.',
};

export const REPORT_BRAND_CSS = `
  .report-brand{display:inline-block;line-height:1;color:#1B3A6B;margin:0 0 10px}
  .report-brand strong{display:block;font-family:Georgia,"Times New Roman",serif;font-size:30px;font-weight:900;letter-spacing:0}
  .report-brand span{display:flex;align-items:center;gap:8px;margin-top:4px;color:#C0272D;font-size:9px;font-weight:900;letter-spacing:2px}
  .report-brand span:before,.report-brand span:after{content:"";display:block;width:52px;height:2px;background:#C0272D}
`;

function reportBrandHtml() {
  return '<div class="report-brand"><strong>BINHOTTI</strong><span>TERRAPLENAGEM</span></div>';
}

// Helper functions - these will be imported from reports.js
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

function displayUnit(unit) {
  const value = String(unit || '-').trim();
  if (value.toLowerCase() === 'h') return 'Hora';
  return value;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function dateBR(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('pt-BR');
}

function firstValue(...values) {
  return values.find((v) => hasValue(v));
}

// Export helper functions
export { reportBrandHtml, num, money, qtd, displayUnit, hasValue, dateBR, firstValue };
