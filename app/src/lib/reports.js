export function dateBR(value) {
  if (!value) return '-';
  const parts = String(value).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

export function isoToBRDate(value) {
  if (!value) return '';
  const parts = String(value).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
}

export function maskDateBR(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function brDateToISO(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || '').trim());
  if (!match) return '';
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthBounds(date = new Date()) {
  const ini = localISODate(new Date(date.getFullYear(), date.getMonth(), 1));
  const fim = localISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return { ini, fim };
}

function parseTime(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function diffMinutes(start, end) {
  const a = parseTime(start);
  let b = parseTime(end);
  if (a === null || b === null) return 0;
  if (b < a) b += 24 * 60;
  return Math.max(0, b - a);
}

export function workMinutes(ficha) {
  return diffMinutes(ficha.manha_ini, ficha.manha_fim) + diffMinutes(ficha.tarde_ini, ficha.tarde_fim);
}

export function minutesToText(value) {
  const total = Math.round(value || 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}

export function minutesToDecimal(value) {
  return ((value || 0) / 60).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function normalizeTextKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2013\u2014-]/g, ' ')
    .replace(/[–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function sameText(a, b) {
  return Boolean(normalizeTextKey(a) && normalizeTextKey(a) === normalizeTextKey(b));
}

export function isMissingMachineValue(value) {
  const key = normalizeTextKey(value);
  return !key || ['sem maquina', 'nao informado', 'null', 'undefined'].includes(key);
}

function sameTextLoose(a, b) {
  const left = normalizeTextKey(a);
  const right = normalizeTextKey(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length < 8 || right.length < 8) return false;
  return left.includes(right) || right.includes(left);
}

function uniqueByName(name, equipamentos) {
  const key = normalizeTextKey(name);
  if (!key) return null;
  const matches = equipamentos.filter((item) => sameText(item.nome, name) || sameTextLoose(item.nome, name));
  return matches.length === 1 ? matches[0] : null;
}

export function funcionarioByName(name, data) {
  const funcionarios = data?.funcionarios || [];
  return funcionarios.find((item) => sameText(item.nome, name))
    || funcionarios.find((item) => sameTextLoose(item.nome, name));
}

function findEquipamentoByName(name, data, allowLoose = true) {
  const equipamentos = data?.equipamentos || [];
  const key = normalizeTextKey(name);
  const byPlate = equipamentos.find((item) => sameText(item.placa, name));
  if (byPlate) return byPlate;

  const byDisplay = findEquipamentoByExactDisplay(name, data);
  if (byDisplay) return byDisplay;

  const exactNames = equipamentos.filter((item) => sameText(item.nome, name));
  if (exactNames.length) return exactNames.length === 1 ? exactNames[0] : null;
  if (!allowLoose) return null;

  return equipamentos.find((item) => {
      const placa = normalizeTextKey(item.placa);
      return key && placa && key.includes(placa);
    })
    || equipamentos.find((item) => {
      const placa = normalizeTextKey(item.placa);
      const display = normalizeTextKey([item.nome, item.placa].filter(Boolean).join(' '));
      return key && ((placa && key.includes(placa)) || display === key);
    })
    || uniqueByName(name, equipamentos);
}

function findEquipamentoByOperator(operatorName, data) {
  const equipamentos = data?.equipamentos || [];
  return equipamentos.find((item) => sameText(item.operador, operatorName))
    || equipamentos.find((item) => sameTextLoose(item.operador, operatorName));
}

function findEquipamentoByExactDisplay(name, data) {
  const equipamentos = data?.equipamentos || [];
  const key = normalizeTextKey(name);
  if (!key) return null;
  return equipamentos.find((item) => {
    const display = normalizeTextKey([item.nome, item.placa].filter(Boolean).join(' '));
    const displayDash = normalizeTextKey([item.nome, item.placa].filter(Boolean).join(' - '));
    return display === key || displayDash === key;
  }) || null;
}

export function equipamentoForFuncionario(funcionario, data) {
  if (!funcionario) return null;
  const equipamentos = data?.equipamentos || [];
  const byOperator = findEquipamentoByOperator(funcionario.nome, data);
  if (byOperator) return byOperator;

  if (isMissingMachineValue(funcionario.maquina)) return null;
  const exactByDisplayOrPlate = findEquipamentoByName(funcionario.maquina, data);
  if (exactByDisplayOrPlate) return exactByDisplayOrPlate;
  return uniqueByName(funcionario.maquina, equipamentos);
}

export function machineForFuncionario(funcionario, data) {
  if (!funcionario) return '-';
  const equipamento = equipamentoForFuncionario(funcionario, data);
  return equipamento?.nome || (!isMissingMachineValue(funcionario.maquina) ? funcionario.maquina : '-');
}

export function machineForFicha(ficha, data) {
  const equipamento = equipmentForFicha(ficha, data);
  if (equipamento) return equipamento.nome || ficha?.maquina || '-';
  if (!isMissingMachineValue(ficha?.maquina)) return ficha.maquina;
  return machineForFuncionario(funcionarioByName(ficha?.operador, data), data);
}

export function equipmentForFicha(ficha, data) {
  if (!ficha) return null;
  if (!isMissingMachineValue(ficha.maquina)) {
    const byMachine = findEquipamentoByName(ficha.maquina, data, false);
    if (byMachine) return byMachine;
    // Old fichas may contain only a shared name. Use the operator only among
    // those matching machines, never to replace a different recorded machine.
    const candidates = (data?.equipamentos || []).filter((item) =>
      sameText(item.nome, ficha.maquina) && sameText(item.operador, ficha.operador));
    return candidates.length === 1 ? candidates[0] : null;
  }
  const funcionario = funcionarioByName(ficha.operador, data);
  return equipamentoForFuncionario(funcionario, data) || findEquipamentoByOperator(ficha.operador, data) || null;
}
