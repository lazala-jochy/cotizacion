# Activación por Product Key (offline)

## Flujo admin

1) Generar Product Key

```bash
npm run license:generate -- \
  --plan enterprise \
  --expiresAt 2027-05-27 \
  --features dashboard,inventory,reports \
  --licenseId LIC-EMPRESA-001
```

2) Entregar solo el Product Key al cliente (formato `XXXX-XXXX-XXXX-XXXX`).

3) El software valida offline contra `asset/licensing/product-catalog.json` firmado con RSA.

## Opciones

- `--privateKey`: ruta de private key PEM (default `scripts/licensing/license-private.pem`)
- `--catalog`: ruta de catálogo firmado (default `asset/licensing/product-catalog.json`)
- `--issuedAt`: fecha de emisión
- `--notes`: notas internas

> Importante: la llave privada no debe distribuirse ni subirse al repositorio.
