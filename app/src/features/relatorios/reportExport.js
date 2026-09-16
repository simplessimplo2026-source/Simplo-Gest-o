import { escapeHtml, printHtml } from '../../lib/printHtml.js';
import { dateBR } from '../../lib/reports.js';
import { downloadXlsx } from '../../lib/xlsx.js';
import { buildReportTotalRow } from './relatorioHelpers.js';
import { REPORT_BRAND_CSS, reportBrandHtml, num, money, qtd, displayUnit } from './reportConstants.js';

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

function reportContext(rows, filters, data) {
  const selectedCliente = filters.cliente
    ? (data?.clientes || []).find((cliente) => String(cliente.id) === String(filters.cliente))
    : null;
  const clientes = Array.from(new Set(rows.map((row) => row.cliente).filter(Boolean)));
  const obras = Array.from(new Set(rows.map((row) => row.obra).filter(Boolean)));
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

export { quantityByUnit, reportContext, datasetForOutput };
export function exportDatasetXlsx(dataset, rows, filters, totals, data) {
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

export function printDataset(dataset, filters, totals, rows, data) {
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

export function exportDesignerXlsx(dataset, rows, filters, totals, data) {
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

export function printDesignerDataset(dataset, filters, totals, rows, data) {
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
