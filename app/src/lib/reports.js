export function dateBR(value) {
  if (!value) return '-';
  const parts = String(value).split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

export function getMonthBounds(date = new Date()) {
  const ini = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
  const fim = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
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

export function machineForFuncionario(funcionario, data) {
  if (!funcionario) return '-';
  const equipamento = data?.equipamentos?.find((item) => funcionario.maquina && item.nome === funcionario.maquina)
    || data?.equipamentos?.find((item) => item.operador === funcionario.nome);
  return equipamento?.nome || funcionario.maquina || '-';
}

export function machineForFicha(ficha, data) {
  if (ficha?.maquina && ficha.maquina !== '-') return ficha.maquina;
  const funcionario = data?.funcionarios?.find((item) => item.nome === ficha?.operador);
  return machineForFuncionario(funcionario, data);
}

