export const FORMA_PAGO_PRESETS = [
  'Efectivo / Transferencia',
  'Efectivo',
  'Transferencia',
  'Contra entrega',
];

export const FORMA_PAGO_CREDIT_VALUE = '__credito__';

const CREDIT_PATTERN = /cr[eé]dito\s*(?:[:\-—]\s*)?(\d+)\s*d[ií]as?/i;

export function parseFormaPago(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return { kind: FORMA_PAGO_PRESETS[0], creditDays: 30 };
  }

  const creditMatch = raw.match(CREDIT_PATTERN);
  if (creditMatch) {
    return {
      kind: FORMA_PAGO_CREDIT_VALUE,
      creditDays: Math.max(1, Number(creditMatch[1]) || 30),
    };
  }

  if (/^cr[eé]dito$/i.test(raw)) {
    return { kind: FORMA_PAGO_CREDIT_VALUE, creditDays: 30 };
  }

  if (FORMA_PAGO_PRESETS.includes(raw)) {
    return { kind: raw, creditDays: 30 };
  }

  if (/contra\s*entrega/i.test(raw)) {
    return { kind: 'Contra entrega', creditDays: 30 };
  }

  return { kind: raw, creditDays: 30, isLegacy: true };
}

export function buildFormaPago({ kind, creditDays }) {
  if (kind === FORMA_PAGO_CREDIT_VALUE) {
    const days = Math.max(1, Math.round(Number(creditDays) || 30));
    return `Crédito ${days} días`;
  }
  return kind || FORMA_PAGO_PRESETS[0];
}

export function getFormaPagoSelectValue(value) {
  const parsed = parseFormaPago(value);
  if (parsed.kind === FORMA_PAGO_CREDIT_VALUE) return FORMA_PAGO_CREDIT_VALUE;
  if (FORMA_PAGO_PRESETS.includes(parsed.kind)) return parsed.kind;
  if (parsed.isLegacy) return parsed.kind;
  return FORMA_PAGO_PRESETS[0];
}
