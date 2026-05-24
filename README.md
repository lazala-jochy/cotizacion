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

## Publicar actualizaciones automáticas (opcional)

La app usa `electron-updater` y GitHub Releases.

1. Crea un repositorio en GitHub.
2. En `package.json`, actualiza `build.publish.owner` y `build.publish.repo`.
3. Exporta un token con permiso `repo`:

```bash
export GH_TOKEN=tu_token_de_github
```

4. Publica:

```bash
npm run dist:publish
```

Los usuarios con la app instalada recibirán actualizaciones al iniciar o desde **Buscar actualizaciones** en el menú lateral.

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
