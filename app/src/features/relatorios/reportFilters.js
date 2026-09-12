import { reportMachineOptions } from './relatorioHelpers.js';
import { getMonthBounds } from '../../lib/reports.js';

export function readSavedReportModels() {
  try {
    const parsed = JSON.parse(localStorage.getItem('binhotti-report-models-v1') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSavedReportModels(models) {
  localStorage.setItem('binhotti-report-models-v1', JSON.stringify(models));
}

export function getInitialFilters() {
  const bounds = getMonthBounds();
  return { ini: bounds.ini, fim: bounds.fim, cliente: '', maquina: '', busca: '' };
}

export function getMachineOptions(data) {
  return reportMachineOptions(data);
}

export function getSelectedClienteLabel(data, clienteId) {
  if (!clienteId) return '';
  const cliente = (data?.clientes || []).find((item) => String(item.id) === String(clienteId));
  return cliente?.fantasia || cliente?.nome || '';
}

export function getSelectedMachineLabel(machines, machineValue) {
  if (!machineValue) return '';
  return machines.find((machine) => machine.value === machineValue)?.label || machineValue;
}

export function updateFilter(filters, key, value) {
  return { ...filters, [key]: value };
}

export function resetFiltersToMonthBounds() {
  const bounds = getMonthBounds();
  return { ini: bounds.ini, fim: bounds.fim, cliente: '', maquina: '', busca: '' };
}
