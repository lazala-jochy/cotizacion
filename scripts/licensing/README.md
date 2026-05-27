# Licencias offline (Machine ID + archivo .lic)

## Flujo

1. El cliente abre la app y ve su **Machine ID** en la pantalla de activación.
2. Envía ese ID al proveedor.
3. El proveedor genera un archivo `.lic` con el script (firma RSA + contenido cifrado AES-256-GCM ligado a ese Machine ID).
4. El cliente importa el `.lic` en la app.
5. La app valida **offline**: firma, descifrado, `machineId`, expiración e integridad.

## Generar licencia (admin)

```bash
npm run license:generate -- \
  --machineId "ABCD-EF12-3456-7890" \
  --company "Empresa Demo" \
  --issuedAt "2026-05-27" \
  --expiresAt "2027-05-27" \
  --plan "enterprise" \
  --features "dashboard,inventory,reports" \
  --out "./empresa-demo.lic"
```

- `--privateKey`: ruta al PEM privado (por defecto `scripts/licensing/license-private.pem`).
- El **Machine ID** debe ser exactamente el que muestra la app en el equipo del cliente.

## Archivos

- Llave pública (en la app): `asset/licensing/license-public.pem`
- Llave privada (solo admin, no distribuir): `scripts/licensing/license-private.pem`

## Persistencia en el cliente

La licencia activa se guarda en la carpeta de datos de la app (por usuario), típicamente:

- macOS: `~/Library/Application Support/Cotizaciones/license/license.dat`
- Windows: `%APPDATA%/Cotizaciones/license/license.dat`

El contenido es el mismo JSON firmado del archivo `.lic` importado.
