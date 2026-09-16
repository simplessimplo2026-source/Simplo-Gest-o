import { dateBR, num, money, qtd } from './reportConstants.js';
import { reportFields } from './reportConstants.js';
import { groupRows, groupRowsByUnit, groupMachineRows } from './reportGrouping.js';

function uniqueValues(rows, field) {
  return Array.from(new Set(rows.map((row) => row[field]).filter(Boolean)));
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
    const body = groupMachineRows(rows).map((item) => [item.nome, item.fichasCount, item.obrasCount, item.servicos, qtd(item.qtd), money(item.valor)]);
    return { kind: tab, title: 'Uso das máquinas por obra', headers: ['Máquina', 'Fichas', 'Obras', 'Serviços', 'Quantidade', 'Valor'], body };
  }
  if (tab === 'materiais') {
    return {
      kind: tab,
      title: 'Materiais lancados em servicos',
      headers: ['Material', 'Unidade', 'Lancamentos', 'Obras', 'Quantidade', 'Valor'],
      body: groupRowsByUnit(rows.filter((row) => row.material), (row) => row.material).map((item) => [item.nome, item.unidade, item.servicos, item.obrasCount, qtd(item.qtd), money(item.valor)]),
    };
  }
  if (tab === 'barreiros') {
    return {
      kind: tab,
      title: 'Origem dos materiais / barreiros',
      headers: ['Barreiro', 'Unidade', 'Lancamentos', 'Obras', 'Quantidade', 'Valor'],
      body: groupRowsByUnit(rows.filter((row) => row.barreiro), (row) => row.barreiro).map((item) => [item.nome, item.unidade, item.servicos, item.obrasCount, qtd(item.qtd), money(item.valor)]),
    };
  }
  if (tab === 'pedidos') {
    const body = groupRows(rows, (row) => row.pedido || 'Sem pedido').map((item) => [item.nome, item.clientesCount, item.obrasCount, item.servicos, money(item.valor)]);
    return { kind: tab, title: 'Pedidos, notas e contratos', headers: ['Pedido / Nota / Contrato', 'Clientes', 'Obras', 'Serviços', 'Valor'], body };
  }
  const body = rows
    .slice()
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')) || String(a.codigo || '').localeCompare(String(b.codigo || '')))
    .map((row) => [dateBR(row.data), row.codigo || 'Sem código', row.pedido || 'Não informado', row.cliente, row.obra, row.maquina || '-', row.operador || '-', row.descricao, `${qtd(row.quantidade)} ${row.unidade}`, money(row.valor)]);
  return { kind: tab, title: 'Serviços filtrados por data', headers: ['Data', 'Código da ficha', 'Nº Pedido / Nota', 'Cliente', 'Obra', 'Máquina', 'Operador', 'Serviço', 'Quantidade', 'Valor'], body };
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

export { datasetForTab, reportContext, datasetForOutput, datasetFromFields, reportReadiness, moveField };
