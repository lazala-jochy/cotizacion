# Cotizaciones (Desktop)

App desktop multiusuario para generar cotizaciones, guardar clientes y configurar los datos de **tu empresa** (emisor) por cuenta.

**Stack:** Electron · React · Express · SQLite

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|----------------|
| [Node.js](https://nodejs.org/) | 18 LTS o superior |
| npm | Incluido con Node.js |

Comprueba tu instalación:

```bash
node -v
npm -v
```

---

## Ejecutar en local (desarrollo)

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio> cotizacion
cd cotizacion
npm install
```

> En macOS, si `better-sqlite3` falla al compilar, instala las herramientas de Xcode:  
> `xcode-select --install`

### 2. Iniciar la app en modo desarrollo

```bash
npm run dev
```

Esto levanta en paralelo:

- **API Express** → `http://127.0.0.1:3847`
- **Frontend Vite** → `http://localhost:5173`
- **Ventana Electron** (se abre sola cuando todo está listo)

> Usa **`npm`** (con **p**), no `nm` — en Mac `nm` es una herramienta de Xcode.

### 3. Iniciar sesión

| Campo | Valor (demo) |
|-------|----------------|
| Email | `admin@demo.local` |
| Contraseña | `admin123` |

También puedes crear una cuenta nueva desde **Crear cuenta**.

### 4. Detener la app

Presiona `Ctrl + C` en la terminal donde corre `npm run dev`.

Si el puerto queda ocupado (`EADDRINUSE`):

```bash
npm run free-ports
npm run dev
```

(`npm run dev` ya libera los puertos automáticamente antes de iniciar.)

### Otros comandos útiles

```bash
# Solo API (sin Electron)
npm run dev:server

# Solo frontend (sin Electron)
npm run dev:client

# Compilar frontend + abrir Electron (sin hot-reload)
npm run build
npm start
```

---

## Crear instalador por sistema operativo

Los instaladores se generan con **electron-builder**. El resultado queda en la carpeta `release/`.

### Paso previo (todos los SO)

Desde la raíz del proyecto:

```bash
npm install
npm run build    # compila el frontend React → carpeta dist/
```

### macOS (.dmg y .zip)

**Requisitos:** Mac con Xcode Command Line Tools.

```bash
npm run dist
```

**Salida en `release/`:**

| Archivo | Uso |
|---------|-----|
| `Cotizaciones-x.x.x.dmg` | Instalador (arrastrar a Aplicaciones) |
| `Cotizaciones-x.x.x-mac.zip` | Archivo portable |

**Instalar en otra Mac:** abre el `.dmg`, arrastra la app a **Aplicaciones**.

> La primera vez macOS puede bloquear apps no firmadas:  
> **Ajustes del Sistema → Privacidad y seguridad → Abrir de todas formas**.

**Firmar para distribución (opcional):** configura certificado Apple Developer en variables de entorno o en `package.json` → `build.mac.identity`.

---

### Windows (.exe instalador NSIS)

**Requisitos:** idealmente compilar **desde Windows** (o usar CI con `windows-latest`).

```bash
npm run dist
```

**Salida en `release/`:**

| Archivo | Uso |
|---------|-----|
| `Cotizaciones Setup x.x.x.exe` | Instalador con asistente |

**Instalar:** ejecuta el `.exe` y sigue el asistente.

**Desde Mac:** `npm run dist` usa `prebuild-install` para el binario Windows correcto antes de empaquetar. Si el `.exe` falla con *not a valid win32 application*, vuelve a publicar con `npm run dist:publish` (no mezcles builds viejos).

---

### Linux (.AppImage)

Agrega el target Linux en `package.json` si aún no está:

```json
"linux": {
  "target": ["AppImage"],
  "category": "Office"
}
```

Luego, en una máquina Linux:

```bash
npm run dist
```

**Salida:** `Cotizaciones-x.x.x.AppImage`

**Ejecutar:**

```bash
chmod +x "Cotizaciones-"*.AppImage
./"Cotizaciones-"*.AppImage
```

---

### Resumen de comandos por SO

| Sistema | Comando | Instalador generado |
|---------|---------|---------------------|
| macOS + Windows (desde Mac) | `npm run dist` | `.dmg`, `.zip`, `Setup.exe` |
| Solo Mac | `npm run dist:mac` | `.dmg`, `.zip` |
| Solo Windows | `npm run dist:win` | `Setup.exe` (NSIS) |
| Linux | `npm run dist` | `.AppImage` (con target `linux` configurado) |

---

## Publicar cambios y actualizar la app instalada

La app usa **`electron-updater`** + **GitHub Releases**.

| Acción | ¿Actualiza apps ya instaladas? |
|--------|-------------------------------|
| `git push` (solo código) | **No** |
| `npm run dist` (sin publicar) | **No** (solo genera `.dmg` local en `release/`) |
| `npm run dist:publish` con `version` nueva | **Sí** |

> En `npm run dev` las actualizaciones **no funcionan**. Solo en la app instalada desde un Release.

**Repositorio configurado:** [github.com/lazala-jochy/cotizacion](https://github.com/lazala-jochy/cotizacion)

---

### Lo que ya está en `package.json`

Estos campos ya están definidos en el proyecto (no uses placeholders):

```json
{
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/lazala-jochy/cotizacion.git"
  },
  "build": {
    "appId": "com.cotizaciones.desktop",
    "productName": "Cotizaciones",
    "publish": {
      "provider": "github",
      "owner": "lazala-jochy",
      "repo": "cotizacion",
      "private": true
    }
  }
}
```

| Campo | Para qué sirve |
|-------|----------------|
| `version` | Versión actual; **súbela en cada release** (`1.0.1`, `1.1.0`…) |
| `repository.url` | Enlace al repo (electron-builder / metadatos) |
| `build.publish.owner` | Usuario de GitHub |
| `build.publish.repo` | Nombre del repo |
| `build.publish.private` | `true` = repo privado (requiere token al compilar) |
| `build.appId` | ID de la app; **no cambiar** después del primer release público |

---

### Repo privado (tu caso)

GitHub **no permite** que la app instalada vea releases sin autenticación. Por eso:

1. Al compilar (`npm run dist:publish`), el token se guarda en `electron/update-token.json` (no se sube a git).
2. Esa build puede buscar actualizaciones en el repo privado.
3. Cada vez que publiques una versión nueva, debes **recompilar e instalar** (o los usuarios reciben el update automático si ya tienen una build con token embebido).

**Crear token (fine-grained recomendado):**

- Repositorio: solo `lazala-jochy/cotizacion`
- Permisos: **Contents → Read and write** (para publicar) y **Metadata → Read**

**Publicar (obligatorio `GH_TOKEN` antes):**

```bash
export GH_TOKEN=ghp_tu_token
cd /Users/joserosario/Desktop/cotizacion
npm version patch
git push origin main
npm run dist:publish
```

El script `predist:publish` falla si no hay `GH_TOKEN`.

**Instalar:** descarga el `.dmg` del Release y ábrelo. Luego **Buscar actualizaciones** debería funcionar.

> El token queda dentro del `.app`. Usa un token solo para esta app; no compartas el instalador públicamente si te preocupa la seguridad.

---

### Configuración inicial (una sola vez)

#### 1. Subir el proyecto a GitHub

```bash
cd /Users/joserosario/Desktop/cotizacion
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/lazala-jochy/cotizacion.git
git push -u origin main
```

(Si el remote ya existe, solo `git push origin main`.)

#### 2. Configurar el token `GH_TOKEN`

Necesitas el token de GitHub para que `electron-builder` cree Releases y suba los instaladores.

1. **GitHub → Settings → Developer settings → Personal access tokens**
2. Crear token:
   - **Classic:** scope `repo` (repo privado) o `public_repo` (repo público)
   - **Fine-grained:** permiso **Contents: Read and write** en `lazala-jochy/cotizacion`
3. Copiar el token (`ghp_...`) — solo se muestra una vez

**En la terminal (sesión actual):**

```bash
export GH_TOKEN=ghp_pega_aqui_tu_token
```

**Guardarlo permanente (Mac, zsh):**

```bash
echo 'export GH_TOKEN=ghp_pega_aqui_tu_token' >> ~/.zshrc
source ~/.zshrc
```

**Verificar:**

```bash
echo $GH_TOKEN
```

> **Nunca** subas el token al repo. No va en `package.json` ni en commits.

#### 3. Primera publicación

```bash
cd /Users/joserosario/Desktop/cotizacion
npm install
export GH_TOKEN=ghp_pega_aqui_tu_token   # si no está en ~/.zshrc
npm run dist:publish
```

Comprueba en: **https://github.com/lazala-jochy/cotizacion/releases**  
Debe aparecer el tag `v1.0.0` con el `.dmg` y archivos `latest-mac.yml`.

Distribuye el `.dmg` de `release/` para que los usuarios instalen la app por primera vez.

---

### Publicar nuevos cambios (cada actualización)

Copia y ejecuta este flujo cada vez que quieras que **quien ya tiene la app instalada** reciba la nueva versión:

```bash
cd /Users/joserosario/Desktop/cotizacion

# 1. Subir código
git add .
git commit -m "Descripción de tus cambios"
git push origin main

# 2. Subir versión (elige una)
npm version patch    # 1.0.0 → 1.0.1  (correcciones)
# npm version minor  # 1.0.0 → 1.1.0  (funciones nuevas)
# npm version major  # 1.0.0 → 2.0.0  (cambios grandes)

git add package.json package-lock.json
git commit -m "Release $(node -p "require('./package.json').version")"
git push origin main

# 3. Token activo
export GH_TOKEN=ghp_pega_aqui_tu_token

# 4. Compilar y publicar Release en GitHub
npm run dist:publish
```

**Qué hace `npm run dist:publish` (desde Mac):**

1. `vite build` → genera `dist/`
2. Descarga el binario correcto de `better-sqlite3` para **Windows** y luego para **macOS** (`prebuild-install`)
3. Genera `.exe` (NSIS) y `.dmg`/`.zip` y los sube al mismo Release en GitHub

> Si falla el instalador NSIS en Mac: `brew install --cask wine-stable`

---

### Cómo se actualiza la app instalada (usuarios finales)

Los usuarios **no** necesitan el token ni ejecutar comandos.

1. Instalar una vez desde el `.dmg` del Release en GitHub.
2. Cuando publiques una versión mayor:
   - Al **abrir la app** (~5 s): busca actualización sola.
   - O en el menú lateral: **Buscar actualizaciones**.
3. Si hay versión nueva: mensaje *"Descargando…"* → *"Se instalará al reiniciar la app"*.
4. **Cerrar y volver a abrir** la app → queda en la versión nueva.

---

### Publicar solo para un sistema operativo

```bash
export GH_TOKEN=ghp_pega_aqui_tu_token

npm run build && npx electron-builder --mac --publish always
npm run build && npx electron-builder --win --x64 --publish always
npm run build && npx electron-builder --linux --publish always
```

---

### Checklist por release

- [ ] Probado en local: `npm run dev`
- [ ] `git push` con los cambios
- [ ] `version` incrementada en `package.json`
- [ ] `echo $GH_TOKEN` muestra el token
- [ ] `npm run dist:publish` sin errores
- [ ] Release en GitHub con `.dmg` y `latest-mac.yml`
- [ ] Probar en Mac con la versión anterior instalada → **Buscar actualizaciones**

---

### Errores frecuentes

| Error | Solución |
|-------|----------|
| `GH_TOKEN` vacío | `export GH_TOKEN=...` antes de `dist:publish` |
| `404` / `Bad credentials` | Token válido y con acceso a `lazala-jochy/cotizacion` |
| La app no actualiza | Subiste `version` y hay Release nuevo con número mayor |
| Falta `latest-mac.yml` | Volver a ejecutar `npm run dist:publish` |
| Updates en `npm run dev` | Normal: no aplica; usar app instalada del `.dmg` |
| Error `404` / `releases.atom` | Repo privado: recompila con `export GH_TOKEN=... && npm run dist:publish`. O aún no hay Release en GitHub |
| Repo privado sin token en la app | La instalación es anterior al soporte privado; instala un `.dmg` nuevo generado con `GH_TOKEN` exportado |

---

### Automatizar con GitHub Actions (recomendado para Mac + Windows)

El repo incluye `.github/workflows/release.yml`: compila **macOS** y **Windows** en paralelo (cada uno en su SO).

**Importante:** GitHub Actions **no** lee tu archivo `.env` local (está en `.gitignore`). Son dos lugares distintos:

| Dónde | Para qué |
|-------|----------|
| `.env` en tu Mac/PC | `npm run dist:publish` local |
| Secret `GH_TOKEN` en GitHub | Actions + token embebido para auto-update en repo privado |

1. **Publicar releases (obligatorio):** el workflow usa el token integrado `github.token` — no necesitas secret para que suba el `.dmg` / `.exe`.

2. **Auto-actualización en repo privado (recomendado):** copia el **mismo** valor que tienes en `.env`:
   - Repo en GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Nombre: `GH_TOKEN`
   - Valor: tu `ghp_...` (Contents Read and Write en el repo)

3. Publicar con tag:

```bash
npm version patch
git push origin main
git tag v$(node -p "require('./package.json').version")
git push origin --tags
```

---

## Dónde se guardan los datos

La base SQLite **no** va en el repositorio. Se guarda en el equipo del usuario:

| SO | Ruta |
|----|------|
| macOS / Linux | `~/.cotizaciones-app/cotizaciones.db` |
| Windows | `%USERPROFILE%\.cotizaciones-app\cotizaciones.db` |

---

## Configuración del emisor (tu empresa)

Los datos del emisor **no están fijos** en el código. Cada usuario los configura en la app:

**Menú → Emisor** (o `/configuracion`)

| Campo | Ejemplo (referencia) |
|-------|----------------------|
| Nombre / razón social | ALTITUDE CONSULTING |
| RNC | 04900920846 |
| Dirección | av princial, la mata, cotui, rd |
| Teléfono | 849-405-8727 |
| Email | jochylazala@gmail.com |

---

## Flujo de cotización

| Estado | Descripción |
|--------|-------------|
| Creada | Recién creada, editable. No enviada al cliente. |
| Enviada | Enviada al cliente para revisión. |
| Aprobada | El cliente aceptó. Trabajo confirmado. |
| En proceso | El trabajo está activo. |
| Completada | Trabajo terminado; puede faltar cobro. |
| Pago parcial | Hay pagos registrados; falta saldo. |
| Pagada | Cobrada por completo. |
| Cancelada | Cancelada; no continúa el flujo. |

**Pagos:** desde el detalle de la cotización (estado aprobada o posterior) puedes registrar pagos parciales o totales. El PDF incluye estado, pagado, pendiente e historial.

---

## Estructura del proyecto

```
cotizacion/
├── client/          # React (UI)
├── server/          # Express + SQLite
├── electron/        # Proceso principal Electron
├── dist/            # Build del frontend (generado, no se sube a git)
├── release/         # Instaladores (generado, no se sube a git)
└── package.json
```

---

## Qué no subir al repositorio

Todo lo listado en [`.gitignore`](.gitignore), en especial:

- `node_modules/`
- `dist/` y `release/`
- `.env` y archivos con secretos
- bases de datos `*.db`
- instaladores (`.dmg`, `.exe`, etc.)

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| `nm: error: run` | Usar `npm run dev`, no `nm run dev` |
| `EADDRINUSE` puerto 3847 | `npm run free-ports` o cierra la app instalada / otra terminal con el servidor |
| Pantalla en blanco en dev | Verificar que API y Vite estén arriba antes de abrir Electron |
| `better-sqlite3` no compila | `xcode-select --install` (Mac) o instalar build tools en Linux |
| `NODE_MODULE_VERSION` / `ERR_DLOPEN_FAILED` | En dev: `npm run rebuild:dev`. En Mac: `npm run dist:publish`. En Windows: compilar en PC o con GitHub Actions |
| `better_sqlite3.node is not a valid win32 application` | Release antiguo sin `prebuild-install`. Ejecuta `npm run dist:publish` de nuevo desde Mac (script `dist-all.sh`) |
| Windows: *fallo al desinstalar archivos antiguos* (código 2) | La app no cerró a tiempo. Instala **v1.6.12+**. Cierra Cotizaciones en el Administrador de tareas e instala el `.exe` manualmente |
| Windows: *Installer integrity check has failed* (NSIS) | Instalador generado en Mac sin parche CRC. Usa **v1.6.13+** o el `.exe` del workflow de GitHub (Windows). Si ya está roto, desinstala a mano (ver abajo) |

**Desinstalar manualmente en Windows** (si el desinstalador NSIS falla):

```powershell
taskkill /F /IM Cotizaciones.exe 2>$null
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Programs\Cotizaciones" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:ProgramFiles\Cotizaciones" -ErrorAction SilentlyContinue
```

Luego instala el `.exe` nuevo del release **v1.6.13**. Tus datos siguen en `%USERPROFILE%\.cotizaciones-app\`.
| App instalada pantalla en blanco | Servidor no arrancó (SQLite mal compilado). Reinstala el instalador del último release |

---

## Licencia

MIT
