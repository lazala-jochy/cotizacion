# Altitude Cotizaciones

App desktop para **ALTITUDE CONSULTING** — generar cotizaciones, guardar clientes y gestionar cuentas de usuario.

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
| Email | `admin@altitude.local` |
| Contraseña | `admin123` |

También puedes crear una cuenta nueva desde **Crear cuenta**.

### 4. Detener la app

Presiona `Ctrl + C` en la terminal donde corre `npm run dev`.

Si el puerto queda ocupado:

```bash
lsof -ti :3847 | xargs kill -9
lsof -ti :5173 | xargs kill -9
```

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
| `Altitude Cotizaciones-x.x.x.dmg` | Instalador (arrastrar a Aplicaciones) |
| `Altitude Cotizaciones-x.x.x-mac.zip` | Archivo portable |

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
| `Altitude Cotizaciones Setup x.x.x.exe` | Instalador con asistente |

**Instalar:** ejecuta el `.exe` y sigue el asistente.

**Compilar desde Mac/Linux hacia Windows (opcional):**

```bash
npm run build
npx electron-builder --win --x64
```

Puede requerir Wine; lo más fiable es GitHub Actions o una máquina Windows.

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

**Salida:** `Altitude Cotizaciones-x.x.x.AppImage`

**Ejecutar:**

```bash
chmod +x "Altitude Cotizaciones-"*.AppImage
./"Altitude Cotizaciones-"*.AppImage
```

---

### Resumen de comandos por SO

| Sistema | Comando | Instalador generado |
|---------|---------|---------------------|
| macOS | `npm run dist` | `.dmg`, `.zip` |
| Windows | `npm run dist` | `Setup.exe` (NSIS) |
| Linux | `npm run dist` | `.AppImage` (con target `linux` configurado) |

---

## Actualizaciones automáticas al subir cambios

La app usa **`electron-updater`** + **GitHub Releases**.

> **Importante:** subir código al repo (`git push`) **no actualiza** las apps ya instaladas.  
> Solo actualiza quien tenga la app empaquetada (`.dmg`, `.exe`, etc.) cuando publicas una **nueva versión** en GitHub Releases con `npm run dist:publish`.

En modo desarrollo (`npm run dev`) las actualizaciones están **desactivadas**.

---

### Configuración inicial (una sola vez)

#### 1. Repositorio en GitHub

Crea el repo y sube el proyecto:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/altitude-cotizaciones.git
git push -u origin main
```

#### 2. `package.json` — datos del repo y versión

Edita estas secciones con **tu usuario y nombre real del repo**:

```json
{
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/TU_USUARIO/altitude-cotizaciones.git"
  },
  "build": {
    "appId": "com.altitude.cotizaciones",
    "publish": {
      "provider": "github",
      "owner": "TU_USUARIO",
      "repo": "altitude-cotizaciones"
    }
  }
}
```

| Campo | Qué es |
|-------|--------|
| `version` | Versión de la app; **debes subirla** en cada release (`1.0.1`, `1.1.0`, etc.) |
| `build.publish.owner` | Tu usuario u organización de GitHub |
| `build.publish.repo` | Nombre del repositorio |
| `build.appId` | ID único de la app (no cambiar después del primer release) |

#### 3. Token de GitHub (`GH_TOKEN`)

`electron-builder` necesita un token para crear Releases y subir los instaladores.

1. Ve a **GitHub → Settings → Developer settings → Personal access tokens**
2. Crea un token (fine-grained o classic):
   - **Classic:** marca el scope `repo` (repositorio privado) o `public_repo` (solo público)
   - **Fine-grained:** permisos **Contents: Read and write** y **Metadata: Read**
3. Copia el token (solo se muestra una vez)

En tu Mac, exporta el token en la terminal (o agrégalo a `~/.zshrc`):

```bash
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

Para comprobar que está definido:

```bash
echo $GH_TOKEN
```

> **No subas el token al repo.** Ya está en `.gitignore` (`.env`, etc.).

#### 4. Repositorio público vs privado

| Tipo de repo | Token necesario |
|--------------|-----------------|
| Público | `public_repo` o fine-grained con acceso al repo |
| Privado | `repo` o fine-grained con acceso al repo |

Los usuarios finales **no** necesitan el token; solo tú al publicar.

---

### Flujo cada vez que subes cambios al repo

Sigue estos pasos **después** de hacer `git push` de tu código:

#### Paso 1 — Subir cambios al repositorio

```bash
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

Esto guarda el código en GitHub, pero **aún no** entrega actualización a quien tiene la app instalada.

#### Paso 2 — Incrementar la versión

En `package.json`, sube `version`. Ejemplos:

- Corrección pequeña: `1.0.0` → `1.0.1`
- Nueva función: `1.0.1` → `1.1.0`
- Cambio grande: `1.1.0` → `2.0.0`

```json
"version": "1.0.1"
```

Opcional con npm:

```bash
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

Haz commit del cambio de versión:

```bash
git add package.json
git commit -m "Bump version to 1.0.1"
git push origin main
```

#### Paso 3 — Generar instaladores y publicar en GitHub Releases

Con `GH_TOKEN` exportado:

```bash
npm run dist:publish
```

Ese comando:

1. Compila el frontend (`vite build`)
2. Empaqueta la app con `electron-builder`
3. Crea un **Release** en GitHub con el tag `v1.0.1` (según tu `version`)
4. Sube los archivos de `release/` (`.dmg`, `.exe`, `latest-mac.yml`, etc.)

Verifica en GitHub: **Repositorio → Releases** — debe aparecer la versión nueva con los assets adjuntos.

#### Paso 4 — Qué ven los usuarios con la app instalada

- Al abrir la app (unos segundos después): busca actualización automáticamente
- Menú lateral → **Buscar actualizaciones**
- Si hay versión nueva: descarga en segundo plano y avisa *"Se instalará al reiniciar la app"*
- Al cerrar y volver a abrir la app: se aplica la actualización

---

### Publicar solo para un sistema operativo

```bash
# Solo macOS
npm run build && npx electron-builder --mac --publish always

# Solo Windows
npm run build && npx electron-builder --win --publish always

# Solo Linux
npm run build && npx electron-builder --linux --publish always
```

---

### Automatizar con GitHub Actions (opcional)

Puedes publicar al hacer push de un tag, sin compilar en tu Mac.

Crea `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run dist:publish
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
```

**Configurar el secret en GitHub:**

1. Repo → **Settings → Secrets and variables → Actions**
2. **New repository secret** → nombre: `GH_TOKEN`, valor: tu token

**Publicar con tag:**

```bash
# Actualiza version en package.json primero, luego:
git add package.json
git commit -m "Release 1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

El workflow compilará y subirá el Release automáticamente.

---

### Checklist rápido por release

- [ ] Código probado en local (`npm run dev`)
- [ ] `git push` con los cambios
- [ ] `version` incrementada en `package.json`
- [ ] `build.publish.owner` y `repo` correctos
- [ ] `GH_TOKEN` exportado (o secret en Actions)
- [ ] `npm run dist:publish` ejecutado sin errores
- [ ] Release visible en GitHub con archivos `.dmg` / `.exe` / `latest-*.yml`
- [ ] Probar en una Mac/PC con la versión anterior instalada

---

### Errores frecuentes al publicar

| Error | Causa / solución |
|-------|------------------|
| `GH_TOKEN` no definido | `export GH_TOKEN=...` antes de `dist:publish` |
| `404` al publicar | `owner` o `repo` incorrectos en `package.json` |
| La app no detecta updates | La versión instalada es igual a la del Release; sube `version` |
| `Cannot find latest-mac.yml` | El Release no tiene assets; vuelve a ejecutar `dist:publish` |
| Updates en dev no funcionan | Es normal; solo funciona en app empaquetada (`npm run dist` + instalar) |
| Repo privado sin permisos | Token con scope `repo` |

---

### Resumen

| Acción | ¿Actualiza apps instaladas? |
|--------|----------------------------|
| `git push` (solo código) | No |
| `npm run dist` (sin publish) | No (solo genera instalador local) |
| `npm run dist:publish` con versión nueva | **Sí** |

---

## Dónde se guardan los datos

La base SQLite **no** va en el repositorio. Se guarda en el equipo del usuario:

| SO | Ruta |
|----|------|
| macOS / Linux | `~/.altitude-cotizaciones/cotizaciones.db` |
| Windows | `%USERPROFILE%\.altitude-cotizaciones\cotizaciones.db` |

---

## Configuración del emisor

Datos de **ALTITUDE CONSULTING** (nombre, RNC, dirección, teléfono, email):  
editar `server/config.js`.

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
| `EADDRINUSE` puerto 3847 | Cerrar instancia anterior o `lsof -ti :3847 \| xargs kill -9` |
| Pantalla en blanco en dev | Verificar que API y Vite estén arriba antes de abrir Electron |
| `better-sqlite3` no compila | `xcode-select --install` (Mac) o instalar build tools en Linux |

---

## Licencia

MIT — ALTITUDE CONSULTING
