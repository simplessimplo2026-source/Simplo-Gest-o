export const MATERIAL_UNIT_OPTIONS = [
  { id: 'm3', label: 'Metro cubico', short: 'm3', report: 'm3', field: 'qtd_m3' },
  { id: 'm2', label: 'Metro quadrado', short: 'm2', report: 'm2', field: 'qtd_m2' },
  { id: 'kg', label: 'Peso', short: 'kg', report: 'kg', field: 'qtd_kg' },
  { id: 'litro', label: 'Litragem', short: 'L', report: 'L', field: 'qtd_litro' },
  { id: 'un', label: 'Unidade', short: 'un', report: 'un', field: 'qtd_unidade' },
];

export function parseMaterialUnits(value, fallback = ['m3']) {
  if (Array.isArray(value)) {
    const valid = value.filter((unit) => MATERIAL_UNIT_OPTIONS.some((option) => option.id === unit));
    return valid.length ? valid : fallback;
  }
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parseMaterialUnits(parsed, fallback);
  } catch {
    // Old rows may store a comma separated list.
  }
  const valid = raw
    .split(',')
    .map((item) => item.trim())
    .filter((unit) => MATERIAL_UNIT_OPTIONS.some((option) => option.id === unit));
  return valid.length ? valid : fallback;
}

export function materialUnitLabels(value, fallback = ['m3']) {
  const units = parseMaterialUnits(value, fallback);
  return units
    .map((unit) => MATERIAL_UNIT_OPTIONS.find((option) => option.id === unit)?.short || unit)
    .join(', ');
}

export function materialUnitOptions(value, fallback = ['m3']) {
  const units = parseMaterialUnits(value, fallback);
  return MATERIAL_UNIT_OPTIONS.filter((option) => units.includes(option.id));
}

export function hasAnyMeasure(service) {
  return MATERIAL_UNIT_OPTIONS.some((option) => {
    const value = service?.[option.field];
    return value !== '' && value !== null && value !== undefined;
  });
}

export function firstMeasureValue(service) {
  const option = MATERIAL_UNIT_OPTIONS.find((item) => {
    const value = service?.[item.field];
    return value !== '' && value !== null && value !== undefined;
  });
  return option ? service[option.field] : '';
}
