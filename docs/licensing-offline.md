# Licenciamiento offline (Machine ID + archivo .lic)

## Resumen

- El cliente instala la app y obtiene un **Machine ID** estable (huella de hardware + SHA-256).
- El proveedor genera un archivo **`.lic`** firmado con RSA y cifrado con **AES-256-GCM** (clave derivada del Machine ID del cliente).
- La app valida **sin internet**: firma, descifrado, `machineId`, expiración e integridad.

## Módulos (Electron)

- `electron/licensing/machine.service.js` — Machine ID
- `electron/licensing/crypto.service.js` — RSA, AES-GCM, derivación de clave, serialización estable
- `electron/licensing/validation.service.js` — validación del sobre `.lic`
- `electron/licensing/license.service.js` — persistencia local (`license.dat`)
- `electron/licensing/activation.service.js` — diálogo de importación

## Generar `.lic` (admin)

```bash
npm run license:generate -- \
  --machineId "XXXX-XXXX-XXXX-XXXX" \
  --company "Empresa Demo" \
  --issuedAt "2026-05-27" \
  --expiresAt "2027-05-27" \
  --plan "enterprise" \
  --features "dashboard,inventory,reports" \
  --out "./empresa-demo.lic"
```

El `--machineId` debe ser el que muestra la app en el equipo del cliente.

## Llaves

- Pública (incluida en la app): `asset/licensing/license-public.pem`
- Privada (solo generación, **no** en instaladores): `scripts/licensing/license-private.pem`

## Persistencia del cliente

`app.getPath('userData')/license/license.dat` — contenido del JSON `.lic` importado (firmado).
