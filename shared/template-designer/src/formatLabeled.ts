/** "Etiqueta: valor" solo si hay valor (para PDF y plantillas). */
export function formatLabeled(label: string, value?: string | null): string {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return `${label}: ${v}`;
}
