import { useMemo, useState } from 'react';
import { CalendarDays, Clock, Download, Filter, Printer, RotateCcw, Trophy, UserRound } from 'lucide-react';
import { printHtml } from '../../lib/printHtml.js';
import { dateBR, getMonthBounds, machineForFicha, minutesToDecimal, minutesToText, workMinutes } from '../../lib/reports.js';
import { downloadXlsx } from '../../lib/xlsx.js';
import binhottiLogoColor from '../../assets/binhotti-logo-color.png';

function buildRows(data, filters) {
  return (data?.fichas || [])
    .filter((ficha) => {
      if (filters.ini && ficha.data < filters.ini) return false;
      if (filters.fim && ficha.data > filters.fim) return false;
      if (filters.operador && ficha.operador !== filters.operador) return false;
      return true;
    })
    .map((ficha) => {
      const minutos = workMinutes(ficha);
      return {
        data: ficha.data,
        codigo: ficha.codigo || '',
        operador: ficha.operador || 'Sem operador',
        maquina: machineForFicha(ficha, data),
        manha: `${ficha.manha_ini || '--:--'} - ${ficha.manha_fim || '--:--'}`,
        tarde: `${ficha.tarde_ini || '--:--'} - ${ficha.tarde_fim || '--:--'}`,
        minutos,
      };
    });
}

function summarize(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.operador)) {
      map.set(row.operador, { operador: row.operador, maquinas: new Set(), dias: new Set(), fichas: 0, minutos: 0 });
    }
    const item = map.get(row.operador);
    item.fichas += 1;
    item.minutos += row.minutos;
    if (row.data) item.dias.add(row.data);
    if (row.maquina && row.maquina !== '-') item.maquinas.add(row.maquina);
  }
  return Array.from(map.values())
    .map((item) => ({
      operador: item.operador,
      maquinas: Array.from(item.maquinas).join(', ') || '-',
      dias: item.dias.size,
      fichas: item.fichas,
      minutos: item.minutos,
      mediaDia: item.dias.size ? Math.round(item.minutos / item.dias.size) : 0,
    }))
    .sort((a, b) => b.minutos - a.minutos || a.operador.localeCompare(b.operador));
}

function isoDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10);
}

function lastDaysBounds(days) {
  const fim = new Date();
  const ini = new Date();
  ini.setDate(fim.getDate() - (days - 1));
  return { ini: isoDate(ini), fim: isoDate(fim) };
}

function previousMonthBounds() {
  const today = new Date();
  return getMonthBounds(new Date(today.getFullYear(), today.getMonth() - 1, 1));
}

function exportHoursXlsx(summary, rows, filters) {
  if (!summary.length) return;
  const lines = [
    [' '],
    [' '],
    ['Horas dos Funcionários'],
    [`Período: ${dateBR(filters.ini)} a ${dateBR(filters.fim)}`],
    [`Funcionários: ${summary.length}`, `Fichas: ${rows.length}`, `Total: ${minutesToText(summary.reduce((sum, item) => sum + item.minutos, 0))}`],
    ['Funcionário', 'Máquina', 'Dias', 'Fichas', 'Horas', 'Média/dia', 'Horas decimais'],
    ...summary.map((item) => [item.operador, item.maquinas, item.dias, item.fichas, minutesToText(item.minutos), minutesToText(item.mediaDia), minutesToDecimal(item.minutos)]),
    [''],
    ['Detalhamento por ficha'],
    ['Data', 'Ficha', 'Funcionário', 'Máquina', 'Manhã', 'Tarde', 'Horas', 'Horas decimais'],
    ...rows.map((row) => [
      dateBR(row.data),
      row.codigo,
      row.operador,
      row.maquina,
      row.manha,
      row.tarde,
      minutesToText(row.minutos),
      minutesToDecimal(row.minutos),
    ]),
  ];
  downloadXlsx('horas-funcionarios-binhotti.xlsx', 'Horas Funcionarios', lines, { headerRow: 5, logoUrl: binhottiLogoColor });
}

function printHours(summary, rowsDetail, filters) {
  if (!summary.length) return;
  const totalMin = summary.reduce((sum, item) => sum + item.minutos, 0);
  const dias = new Set(rowsDetail.map((row) => row.data).filter(Boolean)).size;
  const rows = summary.map((item) => `
    <tr>
      <td><strong>${item.operador}</strong></td>
      <td>${item.maquinas}</td>
      <td class="num">${item.dias}</td>
      <td class="num">${item.fichas}</td>
      <td class="num">${minutesToText(item.minutos)}</td>
      <td class="num">${minutesToText(item.mediaDia)}</td>
      <td class="num">${minutesToDecimal(item.minutos)}</td>
    </tr>
  `).join('');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Horas dos Funcionários</title><style>
    body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:14mm;color:#1A1A1A}
    .top{border-top:7px solid #1B3A6B;padding:14px 0 12px;border-bottom:1px solid #D9DEE8;margin-bottom:12px}
    .report-logo{display:block;width:190px;max-width:42%;height:auto}
    .title{font-size:16px;font-weight:900;color:#1B3A6B;margin-top:14px;text-transform:uppercase}.meta{font-size:11px;color:#3E4757;margin-top:5px}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 12px}.summary div{border:1px solid #D6DCE7;border-left:4px solid #C0272D;padding:8px;background:#F8FAFD}.summary span{display:block;font-size:9px;color:#5B6472;text-transform:uppercase;font-weight:800}.summary strong{display:block;margin-top:3px;color:#1B3A6B;font-size:14px}
    table{width:100%;border-collapse:collapse}th{background:#1B3A6B;color:#fff;font-size:10px;text-transform:uppercase;padding:7px;border:1px solid #16315C}
    td{font-size:11px;padding:7px;border:1px solid #D6DCE7}.num{text-align:right;font-weight:700}tbody tr:nth-child(even){background:#F8FAFD}
    @media print{@page{size:A4 landscape;margin:10mm}body{padding:0}}
  </style></head><body><div class="top"><img class="report-logo" src="${binhottiLogoColor}" alt="BINHOTTI TERRAPLENAGEM"><div class="title">Horas dos Funcionários</div><div class="meta">Período: ${dateBR(filters.ini)} a ${dateBR(filters.fim)}</div></div>
  <div class="summary"><div><span>Funcionários</span><strong>${summary.length}</strong></div><div><span>Fichas</span><strong>${rowsDetail.length}</strong></div><div><span>Dias</span><strong>${dias}</strong></div><div><span>Total</span><strong>${minutesToText(totalMin)}</strong></div></div>
  <table><thead><tr><th>Funcionário</th><th>Máquina</th><th>Dias</th><th>Fichas</th><th>Horas</th><th>Média/dia</th><th>Horas decimais</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  printHtml(html);
}

export function HoursReport({ data }) {
  const bounds = getMonthBounds();
  const [filters, setFilters] = useState({ ini: bounds.ini, fim: bounds.fim, operador: '' });
  const operadores = useMemo(() => {
    const names = new Set([...(data?.funcionarios || []).map((f) => f.nome), ...(data?.fichas || []).map((f) => f.operador)]);
    return Array.from(names).filter(Boolean).sort();
  }, [data]);
  const rows = useMemo(() => buildRows(data, filters), [data, filters]);
  const sortedRows = useMemo(() => rows.slice().sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || b.minutos - a.minutos), [rows]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const totalMin = rows.reduce((total, row) => total + row.minutos, 0);
  const diasApurados = new Set(rows.map((row) => row.data).filter(Boolean)).size;
  const destaque = summary[0];
  const selectedOperador = filters.operador || '';
  const mediaGeral = diasApurados ? Math.round(totalMin / diasApurados) : 0;

  function applyBounds(nextBounds) {
    setFilters((current) => ({ ...current, ...nextBounds }));
  }

  function resetFilters() {
    setFilters({ ini: bounds.ini, fim: bounds.fim, operador: '' });
  }

  const filterChips = [
    `Período: ${dateBR(filters.ini)} a ${dateBR(filters.fim)}`,
    selectedOperador ? `Funcionário: ${selectedOperador}` : 'Funcionários: todos',
    `${rows.length} ficha(s)`,
  ];

  return (
    <section>
      <div className="report-header">
        <div>
          <h2>Horas dos Funcionários</h2>
          <p>Consulta rápida para fechamento mensal e bonificações.</p>
        </div>
        <div className="button-row">
          <button className="ghost-button" type="button" disabled={!summary.length} onClick={() => exportHoursXlsx(summary, sortedRows, filters)}><Download size={16} /> Gerar Excel</button>
          <button className="primary-button" type="button" disabled={!summary.length} onClick={() => printHours(summary, sortedRows, filters)}><Printer size={16} /> PDF</button>
        </div>
      </div>

      <section className="hours-overview">
        <article className="hours-total-card">
          <Clock size={20} />
          <span>Horas no período</span>
          <strong>{minutesToText(totalMin)}</strong>
          <small>{minutesToDecimal(totalMin)} horas decimais para conferência</small>
        </article>
        <article>
          <Trophy size={19} />
          <span>Maior volume</span>
          <strong>{destaque?.operador || '-'}</strong>
          <small>{destaque ? minutesToText(destaque.minutos) : 'sem lançamentos'}</small>
        </article>
        <article>
          <UserRound size={19} />
          <span>Funcionários</span>
          <strong>{summary.length}</strong>
          <small>com horas no filtro</small>
        </article>
        <article>
          <CalendarDays size={19} />
          <span>Dias apurados</span>
          <strong>{diasApurados}</strong>
          <small>{dateBR(filters.ini)} a {dateBR(filters.fim)}</small>
        </article>
      </section>

      <section className="selected-report-card hours-control-card">
        <div>
          <span>Consulta de horas</span>
          <strong>{selectedOperador || 'Todos os funcionários'}</strong>
          <small>Total: {minutesToText(totalMin)} | Média por dia operado: {minutesToText(mediaGeral)}</small>
          <div className="report-filter-chips">
            {filterChips.map((chip) => <em key={chip}><Filter size={12} /> {chip}</em>)}
          </div>
        </div>
        <div className="button-row period-actions">
          <button className="ghost-button" type="button" onClick={() => applyBounds(bounds)}>Mês atual</button>
          <button className="ghost-button" type="button" onClick={() => applyBounds(previousMonthBounds())}>Mês anterior</button>
          <button className="ghost-button" type="button" onClick={() => applyBounds(lastDaysBounds(7))}>7 dias</button>
          <button className="ghost-button" type="button" onClick={resetFilters}><RotateCcw size={15} /> Limpar</button>
        </div>
      </section>

      <section className="panel filters-grid">
        <label>
          Data inicial
          <input type="date" value={filters.ini} onChange={(event) => setFilters({ ...filters, ini: event.target.value })} />
        </label>
        <label>
          Data final
          <input type="date" value={filters.fim} onChange={(event) => setFilters({ ...filters, fim: event.target.value })} />
        </label>
        <label>
          Funcionário
          <select value={filters.operador} onChange={(event) => setFilters({ ...filters, operador: event.target.value })}>
            <option value="">Todos os funcionários</option>
            {operadores.map((operador) => <option key={operador} value={operador}>{operador}</option>)}
          </select>
        </label>
      </section>

      <div className="stats-grid compact">
        <article className="stat-card"><span>Funcionários</span><strong>{summary.length}</strong><small>no período</small></article>
        <article className="stat-card"><span>Fichas</span><strong>{rows.length}</strong><small>lançadas</small></article>
        <article className="stat-card"><span>Período</span><strong>{diasApurados}</strong><small>dia(s) com lançamento</small></article>
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>Resumo por funcionário</h2>
          <span>{dateBR(filters.ini)} a {dateBR(filters.fim)}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Máquina</th>
                <th>Dias</th>
                <th>Fichas</th>
                <th>Horas</th>
                <th>Média/dia</th>
                <th>Horas decimais</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((item) => (
                <tr key={item.operador}>
                  <td><strong>{item.operador}</strong></td>
                  <td>{item.maquinas}</td>
                  <td>{item.dias}</td>
                  <td>{item.fichas}</td>
                  <td>{minutesToText(item.minutos)}</td>
                  <td>{minutesToText(item.mediaDia)}</td>
                  <td>{minutesToDecimal(item.minutos)}</td>
                </tr>
              ))}
              {!summary.length ? <tr><td colSpan="7" className="empty-cell">Nenhuma ficha encontrada.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Detalhamento por ficha</h2>
          <span>{rows.length} lançamento(s)</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Ficha</th>
                <th>Funcionário</th>
                <th>Máquina</th>
                <th>Manhã</th>
                <th>Tarde</th>
                <th>Horas</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => (
                <tr key={`${row.data}-${row.codigo}-${row.operador}-${index}`}>
                  <td className="mono">{dateBR(row.data)}</td>
                  <td className="mono muted">{row.codigo || '-'}</td>
                  <td><strong>{row.operador}</strong></td>
                  <td>{row.maquina}</td>
                  <td className="mono">{row.manha}</td>
                  <td className="mono">{row.tarde}</td>
                  <td className="mono">{minutesToText(row.minutos)}</td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan="7" className="empty-cell">Nenhum lançamento encontrado.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
