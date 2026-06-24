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

export function funcionarioByName(name, data) {
  const funcionarios = data?.funcionarios || [];
  return funcionarios.find((item) => sameText(item.nome, name))
    || funcionarios.find((item) => sameTextLoose(item.nome, name));
}

function findEquipamentoByName(name, data) {
  const equipamentos = data?.equipamentos || [];
  const key = normalizeTextKey(name);
  return equipamentos.find((item) => sameText(item.nome, name))
    || equipamentos.find((item) => sameText(item.placa, name))
    || equipamentos.find((item) => {
      const nome = normalizeTextKey(item.nome);
      const placa = normalizeTextKey(item.placa);
      const display = normalizeTextKey([item.nome, item.placa].filter(Boolean).join(' '));
      return key && ((nome && key.includes(nome)) || (placa && key.includes(placa)) || display === key);
    })
    || equipamentos.find((item) => sameTextLoose(item.nome, name));
}

function findEquipamentoByOperator(operatorName, data) {
  const equipamentos = data?.equipamentos || [];
  return equipamentos.find((item) => sameText(item.operador, operatorName))
    || equipamentos.find((item) => sameTextLoose(item.operador, operatorName));
}

export function equipamentoForFuncionario(funcionario, data) {
  if (!funcionario) return null;
  const equipamentos = data?.equipamentos || [];
  const byOperator = findEquipamentoByOperator(funcionario.nome, data);
  if (byOperator) return byOperator;

  if (isMissingMachineValue(funcionario.maquina)) return null;
  const exactByName = equipamentos.find((item) => sameText(item.nome, funcionario.maquina));
  if (exactByName) return exactByName;
  return equipamentos.find((item) => sameTextLoose(item.nome, funcionario.maquina)) || null;
}

export function machineForFuncionario(funcionario, data) {
  if (!funcionario) return '-';
  const equipamento = equipamentoForFuncionario(funcionario, data);
  return equipamento?.nome || (!isMissingMachineValue(funcionario.maquina) ? funcionario.maquina : '-');
}

export function machineForFicha(ficha, data) {
  if (!isMissingMachineValue(ficha?.maquina)) {
    const equipamento = findEquipamentoByName(ficha.maquina, data);
    return equipamento?.nome || ficha.maquina;
  }
  const funcionario = funcionarioByName(ficha?.operador, data);
  const maquinaFuncionario = machineForFuncionario(funcionario, data);
  if (!isMissingMachineValue(maquinaFuncionario)) return maquinaFuncionario;
  const equipamento = findEquipamentoByOperator(ficha?.operador, data);
  return equipamento?.nome || '-';
}

export function equipmentForFicha(ficha, data) {
  if (!ficha) return null;
  if (!isMissingMachineValue(ficha.maquina)) {
    const byMachine = findEquipamentoByName(ficha.maquina, data);
    if (byMachine) return byMachine;
  }
  const funcionario = funcionarioByName(ficha.operador, data);
  return equipamentoForFuncionario(funcionario, data) || findEquipamentoByOperator(ficha.operador, data) || null;
}
