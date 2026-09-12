import { num, money, qtd, displayUnit } from './reportConstants.js';
import { reportMachineGroupKey, machineOptionLabel } from './relatorioHelpers.js';

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

function groupMachineRows(rows) {
  const labels = new Map(rows.map((row) => [reportMachineGroupKey(row),
    machineOptionLabel({ nome: row.maquina, placa: row.placa }) || 'Sem máquina']));
  return groupRows(rows, reportMachineGroupKey).map((group) => ({
    ...group, nome: labels.get(group.nome) || group.nome,
  }));
}

export { groupRows, groupRowsByUnit, groupMachineRows };
