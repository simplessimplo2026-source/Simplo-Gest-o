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
