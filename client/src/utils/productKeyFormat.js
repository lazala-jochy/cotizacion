export function formatProductKeyInput(value) {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!raw.startsWith('LISC')) {
    return value.toUpperCase();
  }
  const body = raw.slice(4);
  const groups = body.match(/.{1,5}/g) || [];
  return `LISC-${groups.join('-')}`.replace(/-+$/, '');
}

export function maskProductKey(key) {
  if (!key) return '';
  const parts = key.split('-');
  if (parts.length < 3) return key;
  return `${parts[0]}-${parts[1]}-•••••-${parts[parts.length - 1]}`;
}
