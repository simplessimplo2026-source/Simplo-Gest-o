import { Activity, AlertTriangle, CalendarDays, CheckCircle2, Clock, FileText, Gauge, Truck, UserRound, Users } from 'lucide-react';
import { dateBR, getMonthBounds, machineForFicha, minutesToText, workMinutes } from '../../lib/reports.js';

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <article className="stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
      <Icon size={22} />
    </article>
  );
}

function InsightCard({ label, value, sub, icon: Icon, tone = 'blue' }) {
  return (
    <article className={`insight-card ${tone}`}>
      <span><Icon size={16} /> {label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
}

export function Dashboard({ data }) {
  const bounds = getMonthBounds();
  const clientesAtivos = data?.clientes?.filter((cliente) => cliente.status === 'ativo').length || 0;
  const equipamentos = data?.equipamentos || [];
  const fichas = data?.fichas || [];
  const orcamentos = data?.orcamentos || [];
  const fichasMes = fichas.filter((ficha) => ficha.data >= bounds.ini && ficha.data <= bounds.fim);
  const maquinasComOperador = equipamentos.filter((equipamento) => equipamento.operador).length;
  const ultimasFichas = sortByDateDesc(fichas).slice(0, 6);
  const ultimosOrcamentos = [...orcamentos].slice(-5).reverse();
  const horasMes = fichasMes.reduce((total, ficha) => total + workMinutes(ficha), 0);
  const diasOperados = new Set(fichasMes.map((ficha) => ficha.data).filter(Boolean)).size;
  const equipamentosSemOperador = Math.max(equipamentos.length - maquinasComOperador, 0);
  const orcamentosAprovados = orcamentos.filter((orcamento) => orcamento.status === 'aprovado').length;
  const orcamentosPendentes = orcamentos.filter((orcamento) => (orcamento.status || 'pendente') !== 'aprovado').length;
  const operadorMaisAtivo = Object.entries(fichasMes.reduce((acc, ficha) => {
    const operador = ficha.operador || 'Sem operador';
    acc[operador] = (acc[operador] || 0) + workMinutes(ficha);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0];
  const servicosMes = (data?.ficha_servicos || []).filter((servico) => {
    const ficha = fichas.find((item) => String(item.id) === String(servico.ficha_id));
    return ficha?.data >= bounds.ini && ficha?.data <= bounds.fim;
  }).length;

  return (
    <section>
      <section className="dashboard-hero">
        <div>
          <span>Operação Binhotti</span>
          <h2>Resumo do mês</h2>
          <p>{dateBR(bounds.ini)} a {dateBR(bounds.fim)}</p>
        </div>
        <div className="hero-metrics">
          <article><CalendarDays size={16} /><strong>{fichasMes.length}</strong><span>fichas</span></article>
          <article><Activity size={16} /><strong>{servicosMes}</strong><span>serviços</span></article>
          <article><Clock size={16} /><strong>{minutesToText(horasMes)}</strong><span>horas</span></article>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard label="Clientes ativos" value={clientesAtivos} sub="cadastrados no sistema" icon={Users} />
        <StatCard label="Máquinas em campo" value={equipamentos.length} sub={`${maquinasComOperador} com operador vinculado`} icon={Truck} />
        <StatCard label="Fichas do mês" value={fichasMes.length} sub={`${dateBR(bounds.ini)} a ${dateBR(bounds.fim)}`} icon={CalendarDays} />
        <StatCard label="Orçamentos" value={orcamentos.length} sub="registrados no sistema" icon={FileText} />
      </div>

      <section className="dashboard-insights">
        <InsightCard
          label="Operador destaque"
          value={operadorMaisAtivo?.[0] || '-'}
          sub={operadorMaisAtivo ? `${minutesToText(operadorMaisAtivo[1])} no mês` : 'sem fichas no período'}
          icon={UserRound}
        />
        <InsightCard
          label="Frota vinculada"
          value={`${maquinasComOperador}/${equipamentos.length || 0}`}
          sub={equipamentosSemOperador ? `${equipamentosSemOperador} equipamento(s) sem operador` : 'todos com operador vinculado'}
          icon={equipamentosSemOperador ? AlertTriangle : CheckCircle2}
          tone={equipamentosSemOperador ? 'warn' : 'green'}
        />
        <InsightCard
          label="Dias operados"
          value={diasOperados}
          sub={`${fichasMes.length} ficha(s), ${servicosMes} serviço(s)`}
          icon={Gauge}
        />
        <InsightCard
          label="Orçamentos aprovados"
          value={orcamentosAprovados}
          sub={`${orcamentosPendentes} pendente(s) no cadastro`}
          icon={CheckCircle2}
          tone={orcamentosPendentes ? 'warn' : 'green'}
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Últimas fichas lançadas</h2>
              <span>Operador, máquina e data do serviço</span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Data</th>
                  <th>Operador</th>
                  <th>Máquina</th>
                  <th>Horas</th>
                </tr>
              </thead>
              <tbody>
                {ultimasFichas.map((ficha) => (
                  <tr key={`${ficha.id || ficha.codigo}-${ficha.data}`}>
                    <td className="mono muted">{ficha.codigo || '-'}</td>
                    <td className="mono">{dateBR(ficha.data)}</td>
                    <td><strong>{ficha.operador || '-'}</strong></td>
                    <td>{machineForFicha(ficha, data)}</td>
                    <td className="mono">{minutesToText(workMinutes(ficha))}</td>
                  </tr>
                ))}
                {!ultimasFichas.length ? <tr><td colSpan="5" className="empty-cell"><span>Nenhuma ficha lançada ainda</span><small>Use Ficha Diária para iniciar os lançamentos.</small></td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>Frota e operadores</h2>
              <span>Vínculos que alimentam ficha e relatórios</span>
            </div>
          </div>
          <div className="fleet-list">
            {equipamentos.slice(0, 8).map((equipamento) => (
              <article className="fleet-row" key={equipamento.id || equipamento.nome}>
                <div>
                  <strong>{equipamento.nome || 'Equipamento'}</strong>
                  <span>{equipamento.placa || equipamento.modelo || '-'}</span>
                </div>
                <p className={equipamento.operador ? '' : 'attention'}>{equipamento.operador || 'Sem operador'}</p>
              </article>
            ))}
            {!equipamentos.length ? <div className="empty-cell"><span>Nenhum equipamento cadastrado</span><small>Cadastre a frota para alimentar fichas e relatórios.</small></div> : null}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Orçamentos recentes</h2>
            <span>Base para acompanhar propostas e futuras automações</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Equipamento</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ultimosOrcamentos.map((orcamento) => (
                <tr key={orcamento.id}>
                  <td><strong>{orcamento.cliente || '-'}</strong></td>
                  <td>{orcamento.tipo || '-'}</td>
                  <td>{orcamento.equipamento || '-'}</td>
                  <td className="mono money-cell">{Number(orcamento.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td><span className="status-pill">{orcamento.status || 'registrado'}</span></td>
                </tr>
              ))}
              {!ultimosOrcamentos.length ? <tr><td colSpan="5" className="empty-cell"><span>Nenhum orçamento cadastrado ainda</span><small>Os próximos orçamentos aparecerão aqui.</small></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
