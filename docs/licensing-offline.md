# Sistema de activación por Product Key (offline)

## Objetivo

Implementar activación local estilo Microsoft Office/Windows:

- Product Key tipo `XXXX-XXXX-XXXX-XXXX`
- Validación 100% offline
- Sin APIs externas ni internet
- Sin tocar módulos de negocio existentes

## Módulos agregados (desacoplados)

- `electron/licensing/crypto.service.js`
- `electron/licensing/validation.service.js`
- `electron/licensing/license.service.js`
- `electron/licensing/activation.service.js`
- `client/src/pages/ActivationPage.jsx`

Integración mínima:

- `electron/main.js`: IPC de activación
- `electron/preload.js`: bridge seguro
- `client/src/App.jsx`: gate de activación antes del sistema

## Flujo de activación

1. Al iniciar, la app consulta `license:get-activation-state`.
2. Si no hay activación válida, bloquea acceso y muestra `ActivationPage`.
3. Usuario introduce Product Key y pulsa **Activar**.
4. Validaciones locales:
   - formato
   - checksum matemático
   - firma RSA del catálogo
   - existencia del key hash
   - expiración de licencia
5. Si es válido, guarda activación local segura.
6. Se habilita el sistema normal.

## Formato Product Key

- `XXXX-XXXX-XXXX-XXXX`
- alfabeto seguro sin caracteres ambiguos
- checksum en el último carácter

Ejemplo:

- `LZLA-9F2K-X8P1-QW7M`

## Seguridad implementada

- RSA (`license-public.pem` en app, private key solo admin)
- Catálogo firmado digitalmente (`product-catalog.json`)
- Verificación de integridad y firma del catálogo
- Hash SHA-256 del Product Key para lookup (no se guarda key en claro en catálogo)
- Registro local con hash de integridad (`recordHash`)
- Validación de expiración y corrupción

## Persistencia local

Archivo de activación:

- macOS/Windows: `app.getPath('userData')/license/activation.dat`

No usa `localStorage`.

## Generación administrativa de Product Keys

```bash
npm run license:generate -- \
  --plan enterprise \
  --expiresAt 2027-05-27 \
  --features dashboard,inventory,reports \
  --licenseId LIC-EMPRESA-001
```

Este comando:

- genera clave única criptográfica
- aplica checksum
- agrega entrada firmada al catálogo local
- imprime Product Key final para entregar al cliente

## Archivos relevantes

- Llave pública: `asset/licensing/license-public.pem`
- Catálogo firmado: `asset/licensing/product-catalog.json`
- Llave privada (admin): `scripts/licensing/license-private.pem`

> Nunca distribuir ni versionar la llave privada en producción.
