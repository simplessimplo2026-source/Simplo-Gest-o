import { useMemo, useState } from 'react';
import { BarChart3, Brain, Download, FileSpreadsheet, Filter, MapPin, Package, Printer, RotateCcw, UserRound, Wrench, FileText } from 'lucide-react';
import { escapeHtml, printHtml } from '../../lib/printHtml.js';
import { dateBR, getMonthBounds, machineForFicha } from '../../lib/reports.js';
import { downloadXlsx } from '../../lib/xlsx.js';
import { DateInput } from '../../components/DateInput.jsx';
import { buildReportTotalRow } from './relatorioHelpers.js';
import binhottiLogoColor from '../../assets/binhotti-logo-color.png';

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

function num(value) {
  const parsed = Number(String(value || 0).replace(',', '.'));
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
  return 'un';
}

function serviceDescription(service, machineName) {
  let description = '';
  if (service.tipo === 'diaria') description = service.diaria === 'meia' ? 'Meia diária' : 'Diária';
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

function buildRows(data, filters) {
  const fichas = data?.fichas || [];
  const servicos = data?.ficha_servicos || [];
  const clientes = data?.clientes || [];

  return servicos.map((service) => {
    const ficha = fichas.find((item) => String(item.id) === String(service.ficha_id)) || {};
    const cliente = clientFromService(service, clientes);
    const obra = service.endereco || service.obra || service.local || cliente || 'Sem obra';
    const maquina = ficha.maquina || service.maquina || machineForFicha(ficha, data) || '';
    const row = {
      data: ficha.data || service.data || '',
      ficha_id: service.ficha_id,
      codigo: ficha.codigo || '',
      pedido: service.nota_pedido || service.pedido_numero || service.n_pedido || ficha.codigo || '',
      cliente,
      cli_id: service.cli_id || '',
      obra,
      maquina,
      operador: ficha.operador || service.operador || '',
      tipo: service.tipo || '',
      material: service.material || '',
      barreiro: service.barreiro || '',
      descricao: serviceDescription(service, maquina),
      unidade: serviceUnit(service),
      quantidade: serviceQuantity(service),
      valor: num(service.valor),
    };
    row.texto = [row.codigo, row.pedido, row.cliente, row.obra, row.maquina, row.operador, row.tipo, row.material, row.barreiro, row.descricao]
      .join(' ')
      .toLowerCase();
    return row;
  }).filter((row) => {
    if (filters.ini && row.data && row.data < filters.ini) return false;
    if (filters.fim && row.data && row.data > filters.fim) return false;
    if (filters.cliente && String(row.cli_id) !== String(filters.cliente)) return false;
    if (filters.maquina && row.maquina !== filters.maquina) return false;
    if (filters.busca && !row.texto.includes(filters.busca.toLowerCase().trim())) return false;
    return true;
  });
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
    return { title: 'Clientes e obras no período', headers: ['Cliente', 'Obra', 'Fichas', 'Serviços', 'Quantidade', 'Valor'], body };
  }
  if (tab === 'maquinas') {
    const body = groupRows(rows, (row) => row.maquina || 'Sem máquina').map((item) => [item.nome, item.fichasCount, item.obrasCount, item.servicos, qtd(item.qtd), money(item.valor)]);
    return { title: 'Uso das máquinas por obra', headers: ['Máquina', 'Fichas', 'Obras', 'Serviços', 'Quantidade', 'Valor'], body };
  }
  if (tab === 'materiais') {
    const body = groupRows(rows.filter((row) => row.material), (row) => row.material).map((item) => [item.nome, item.servicos, item.obrasCount, qtd(item.qtd), money(item.valor)]);
    return { title: 'Materiais lançados em serviços', headers: ['Material', 'Lançamentos', 'Obras', 'Quantidade', 'Valor'], body };
  }
  if (tab === 'barreiros') {
    const body = groupRows(rows.filter((row) => row.barreiro), (row) => row.barreiro).map((item) => [item.nome, item.servicos, item.obrasCount, qtd(item.qtd), money(item.valor)]);
    return { title: 'Origem dos materiais / barreiros', headers: ['Barreiro', 'Lançamentos', 'Obras', 'Quantidade', 'Valor'], body };
  }
  if (tab === 'pedidos') {
    const body = groupRows(rows, (row) => row.pedido || 'Sem pedido').map((item) => [item.nome, item.clientesCount, item.obrasCount, item.servicos, money(item.valor)]);
    return { title: 'Pedidos, notas e contratos', headers: ['Pedido / Nota / Contrato', 'Clientes', 'Obras', 'Serviços', 'Valor'], body };
  }
  const body = rows
    .slice()
    .sort((a, b) => String(b.data).localeCompare(String(a.data)))
    .slice(0, 20)
    .map((row) => [dateBR(row.data), row.pedido || '-', row.cliente, row.obra, row.maquina || '-', row.operador || '-', row.descricao, `${qtd(row.quantidade)} ${row.unidade}`, money(row.valor)]);
  return { title: 'Últimos serviços filtrados', headers: ['Data', 'Pedido', 'Cliente', 'Obra', 'Máquina', 'Operador', 'Serviço', 'Quantidade', 'Valor'], body };
}

function exportDatasetXlsx(dataset, rows, filters, totals) {
  if (!dataset.body.length) return;
  const totalRow = buildReportTotalRow(dataset.headers, totals);
  const excelRows = [
    [' '],
    [' '],
    [dataset.title],
    [`Período: ${dateBR(filters.ini)} a ${dateBR(filters.fim)}`],
    [`Lançamentos: ${rows.length}`, `Quantidade: ${qtd(totals.qtd)}`, `Valor total: ${money(totals.valor)}`],
    dataset.headers,
    ...dataset.body,
    totalRow,
    ['Gerado por Simplo Gestão - Central de Relatórios Binhotti'],
  ];
  downloadXlsx(`relatorio-binhotti-${dataset.title.toLowerCase().replace(/\W+/g, '-')}.xlsx`, dataset.title, excelRows, { headerRow: 5, logoUrl: binhottiLogoColor });
}

function printDataset(dataset, filters, totals) {
  if (!dataset.body.length) return;
  const esc = escapeHtml;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(dataset.title)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:14mm;color:#1A1A1A}
    .top{border-top:7px solid #1B3A6B;padding:14px 0 12px;border-bottom:1px solid #D9DEE8;margin-bottom:12px}
    .report-logo{display:block;width:190px;max-width:42%;height:auto}
    .title{font-size:16px;font-weight:900;color:#1B3A6B;margin-top:14px;text-transform:uppercase}.meta{font-size:11px;color:#3E4757;margin-top:5px}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 12px}.summary div{border:1px solid #D6DCE7;border-left:4px solid #C0272D;padding:8px;background:#F8FAFD}.summary span{display:block;font-size:9px;color:#5B6472;text-transform:uppercase;font-weight:800}.summary strong{display:block;margin-top:3px;color:#1B3A6B;font-size:14px}
    table{width:100%;border-collapse:collapse}th{background:#1B3A6B;color:#fff;font-size:9px;text-transform:uppercase;padding:6px;border:1px solid #16315C}
    td{font-size:10px;padding:6px;border:1px solid #D6DCE7;vertical-align:top}tbody tr:nth-child(even){background:#F8FAFD}.foot{margin-top:18px;font-size:10px;color:#3E4757;text-align:right}
    @media print{@page{size:A4 landscape;margin:10mm}body{padding:0}}
  </style></head><body>
    <div class="top"><img class="report-logo" src="${binhottiLogoColor}" alt="BINHOTTI TERRAPLENAGEM"><div class="title">${esc(dataset.title)}</div><div class="meta">Período: ${esc(dateBR(filters.ini))} a ${esc(dateBR(filters.fim))}</div></div>
    <div class="summary"><div><span>Linhas</span><strong>${dataset.body.length}</strong></div><div><span>Serviços</span><strong>${totals.servicos}</strong></div><div><span>Quantidade</span><strong>${qtd(totals.qtd)}</strong></div><div><span>Valor</span><strong>${money(totals.valor)}</strong></div></div>
    <table><thead><tr>${dataset.headers.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${dataset.body.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="foot">Gerado por Simplo Gestão</div>
  </body></html>`;
  printHtml(html);
}

export function RelatoriosPage({ data }) {
  const bounds = getMonthBounds();
  const [activeTab, setActiveTab] = useState('geral');
  const [filters, setFilters] = useState({ ini: bounds.ini, fim: bounds.fim, cliente: '', maquina: '', busca: '' });
  const [showAI, setShowAI] = useState(false);
  const activeReport = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const machines = useMemo(() => {
    const names = new Set();
    (data?.equipamentos || []).forEach((item) => { if (item.nome) names.add(item.nome); });
    (data?.fichas || []).forEach((item) => { if (item.maquina) names.add(item.maquina); });
    return Array.from(names).sort();
  }, [data]);

  const rows = useMemo(() => buildRows(data, filters), [data, filters]);
  const dataset = useMemo(() => datasetForTab(activeTab, rows), [activeTab, rows]);
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
    setShowAI(false);
  }

  function resetFilters() {
    setFilters({ ini: bounds.ini, fim: bounds.fim, cliente: '', maquina: '', busca: '' });
  }

  const filterChips = [
    `Período: ${dateBR(filters.ini)} a ${dateBR(filters.fim)}`,
    selectedCliente ? `Cliente: ${selectedCliente}` : 'Clientes: todos',
    filters.maquina ? `Máquina: ${filters.maquina}` : 'Máquinas: todas',
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
                {machines.map((machine) => <option key={machine} value={machine}>{machine}</option>)}
              </select>
            </label>
            <label>
              Busca livre
              <input value={filters.busca} onChange={(event) => updateFilter('busca', event.target.value)} placeholder="obra, pedido, material..." />
            </label>
          </div>
        </div>
      </section>

      <section className="selected-report-card">
        <div>
          <span>Relatório selecionado</span>
          <strong>{activeReport.label}</strong>
          <small>{rows.length} lançamento(s), {qtd(totals.qtd)} em quantidade, {money(totals.valor)} em valor.</small>
          <div className="report-filter-chips">
            {filterChips.map((chip) => <em key={chip}><Filter size={12} /> {chip}</em>)}
          </div>
        </div>
        <div className="button-row">
          <button className="ghost-button" type="button" onClick={resetFilters}><RotateCcw size={15} /> Limpar filtros</button>
          <button className="ghost-button" type="button" disabled={!dataset.body.length} onClick={() => exportDatasetXlsx(dataset, rows, filters, totals)}><FileSpreadsheet size={15} /> Gerar Excel</button>
          <button className="primary-button" type="button" disabled={!dataset.body.length} onClick={() => printDataset(dataset, filters, totals)}><Printer size={15} /> Gerar PDF</button>
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
        <article className="stat-card"><div><span>Quantidade</span><strong>{qtd(totals.qtd)}</strong><small>m³, unidades e diárias</small></div><Download size={22} /></article>
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
