# 3D Desktop Mascot Pet 🐰

A borderless, transparent, interactive 3D desktop companion pet for Windows powered by **Electron**, **Three.js**, and **i18next**.

> 📖 **Full User Manual:** For complete guides on controls, custom 3D model loading, FPS camera flight, physics throwing, stage spotlights, Z-axis roll spin, panel edge resizing, dynamic battery saver mode, sakura rain particle simulation, and 12-language setup, please see **[USER_MANUAL.md](USER_MANUAL.md)**.

---

## 🛠️ How to Rebuild Executable from GitHub Repository

Follow these step-by-step instructions to clone, set up dependencies, run tests, and compile the standalone Windows executable from the source code.

### 1. System Prerequisites
Ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **Git**: ([Download Git](https://git-scm.com/))
- **Windows OS**: Windows 10 or 11 (x64)

---

### 2. Clone the Repository
Open Command Prompt (`cmd`) or Terminal and clone the repository:
```bash
git clone https://github.com/your-username/desktop-3d-pet.git
cd desktop-3d-pet
```

---

### 3. Install Dependencies
Install all required Node modules (`three`, `i18next`, `@skyatnpm/steamworks-js`, `electron`, `electron-packager`):
```bash
npm install
```

---

## 🌐 Language Localization Prerequisites & Setup

Desktop Pet uses **i18next** to support **12 core mainstream languages** natively across all UI controls, studio tabs, 3D preview viewports, and HUD badges (accounting for >95% of active global desktop users). Unlisted system languages automatically fall back to English (`en`).

### 1. Localization Prerequisites
- **`i18next` Package**: Installed automatically during `npm install` (`"i18next": "^26.3.6"` in `package.json`).
- **Locale Folder Structure**: The application expects translation files in `locales/<lang-code>/translation.json`.

### 2. Generating & Building Locale Files (Mandatory)
Before starting the dev server or packaging the application executable, you **must run the locale generator script**:
```bash
node scratch_create_locales.js
```
This script performs a 100% key parity build across all 12 core language codes:
- Creates `locales/<lang>/translation.json` for all 12 core languages.
- Ensures all **164 UI keys** exist in every language dictionary with fallback protection to guarantee no missing text errors.

### 3. Supported Languages Scope (12 Core Locales)
| Language Code | Language Name |
| :--- | :--- |
| `en` | English |
| `zh-CN` | 简体中文 (Simplified Chinese) |
| `zh-TW` | 繁體中文 (Traditional Chinese) |
| `ja` | 日本語 (Japanese) |
| `ko` | 한국어 (Korean) |
| `fr` | Français (French) |
| `de` | Deutsch (German) |
| `es` | Español - España (Spanish - Spain) |
| `es-419` | Español - Latinoamérica (Spanish - Latin America) |
| `it` | Italiano (Italian) |
| `pt-BR` | Português - Brasil (Portuguese - Brazil) |
| `ru` | Русский (Russian) |

### 4. Adding or Updating Custom Translations
If you add new UI elements or want to edit existing translations:
1. Open `scratch_create_locales.js`.
2. Add or modify translation keys inside `textureTranslations`, `soundTranslations`, `sakuraTranslations`, or `newTranslations`.
3. Run `node scratch_create_locales.js` to propagate the changes to all 12 `translation.json` files.
4. Rebuild the app binary with `npm run build`.

---

## ⚡ Key Real-Time Capabilities & Studio Suite

### 1. 🎨 Custom Texture Studio & 3D Waving Country Flag (Texture Tab)
- **Image Texture Ingestion**: Upload custom PNG, JPG, WebP, or SVG images via drag-and-drop or file picker to map directly onto native 3D meshes in real-time.
- **Native 3D Waving Country Flag Mesh**: Polished brass flagpole, weighted obsidian base, decorative finial, and a subdivided double-sided cloth plane mesh.
- **Real-Time Cloth Wave Physics Simulation**: Harmonic traveling sine ripples, longitudinal chord contraction, and corner flutter with dynamic normal recalculations.
- **Preset Flag Styles**: 5 procedural canvas flag styles (🦁 *Royal Tricolor*, 🌐 *World Globe*, ⚡ *Cyber Neon*, ⭐ *Royal Star*, 🌈 *Pride Rainbow*).
- **Surface Shaders & Wind Tuning**: Sliders for wind speed ($0.5\times$–$10.0\times$), wave amplitude ($0.05\times$–$1.50\times$), texture repeat X/Y ($1.0\times$–$6.0\times$), surface roughness, and metalness.

### 2. 🎵 Atmospheric Audio Synthesizer & Sound FX (Sound Tab)
- **Ambient Weather Audio**: Procedural ambient sound loops for Sakura Blossom Rain and Winter Snowfall.
- **Rhythmic Drum Synthesizer**: 16-step upbeat rhythm generator.
- **Atmosphere Synchronization**: Automatic audio track playback synced with active atmosphere particle toggles.
- **Interactive SFX**: Mascot click interaction audio and physics collision bounce sound effects.

### 3. 🌸 Atmosphere & Visual FX (Atmosphere Tab)
- **3D Sakura Petal Rain & Snow Simulation**: Real-time particle systems featuring curved petal geometry, natural tumbling aerodynamics, sinusoidal breeze drift, and viewport boundary wrapping.
- **Dedicated Atmosphere Tab**: Complete ambient controls and effect toggles organized cleanly in the Studio Suite navigation bar.

### 4. 🌀 Performance & Motion Diagnostics (Motion Tab)
The **Motion & Spin** tab includes a built-in real-time diagnostics dashboard:
- **Live Rendering FPS**: Smoothly computes actual viewport frame rate against target FPS with an adaptive health badge (`OPTIMAL 🟢`, `NORMAL 🟡`, `THROTTLED 🟠`).
- **Frame Render Latency**: Displays millisecond render time per frame (`ms`) with an animated gauge.
- **Angular Motion Magnitude**: Real-time Euclidean angular velocity magnitude ($\text{Magnitude} = \sqrt{\omega_x^2 + \omega_y^2 + \omega_z^2} + \text{bobbing} + \text{physics}$) with percentage meter.
- **V8 Heap Memory Usage**: Real-time Chromium/V8 heap memory allocation tracking (`usedMB / totalMB`).
- **Dynamic Battery Saver**: Configurable frame rate throttling when idle or unfocused.

### 5. 🎯 Real-Time Model Loading & Animation Synchronization (Display Tab)
- **Instant Thumbnail Selection**: Clicking any model card in the Settings panel immediately loads the 3D asset into the active viewport with monotonic race-condition protection (`loadToken`).
- **Dynamic Animation List**: Automatically queries and populates all skeletal animation clips built into imported `.glb` / `.gltf` files (`<select id="anim-select">`) and immediately plays the chosen loop.

### 6. 🔦 Multi-Source Stage Lighting & 3D Preview (Lighting Tab)
- **Dynamic Spotlights**: Add, colorize, and position multi-source spotlight cones in 3D space with helper rays and real-time intensity dials.
- **Lighting Presets**: Instant one-click presets including *Dual Concert Lights* and *Dark Stage Mode*.
- **Interactive 3D Preview Viewport**: Secondary offscreen WebGL renderer with Front, Top, Iso camera views and zoom controls.

### 7. ⚡ Momentum Physics Engine (Physics Tab)
- **Interactive Throwing**: Hold **D + Left Mouse Drag** to throw the mascot across your desktop with realistic momentum, gravitational acceleration, and ground landing bounce dynamics.

### 8. 📐 60 FPS Direction-Aware Window Edge Resizing
- **`requestAnimationFrame` Throttling**: Eliminates event-loop congestion and frame drops during window edge dragging.
- **Direction-Aware Anchoring**: Pulling East/South edges smoothly resizes window bounds without erratic coordinate jitter, while West/North pulls dynamically track cursor displacement.

---

## 🚀 Running, Testing & Packaging

### 1. Run in Development Mode
Launch the application in development mode:
```bash
npm start
```

### 2. Run Automated Unit Test Suite (9 Test Suites)
Run the automated unit tests covering all core systems:
```bash
# Standard Command Prompt / Bash:
npm test

# Direct Node execution (PowerShell / Command Prompt):
node tests/run_tests.mjs
```
The test runner validates:
1. **SettingsManager**: Default configurations, `.tmp` atomic write staging, and config auto-healing.
2. **PhysicsEngine**: Kinematic integration, velocity dampening, and boundary collision response.
3. **12-Locale Parity**: 100% key existence across all 12 language dictionaries (`locales/*/translation.json`).
4. **AppStore**: Reactive proxy mutations, subscriber callback notifications, and batch state changes.
5. **GPUAssetManager**: Recursive geometry/texture GPU memory disposal and VRAM leak prevention.
6. **Electron Security & Preload Bridge**: Context isolation and idle FPS throttling configuration.
7. **SoundManager**: Master & track volume clamping, snapshot state retrieval, and atmosphere audio sync.
8. **FlagMeshBuilder & Cloth Wave Simulation**: Procedural flag presets, vertex array deformation, and normal recalculations.
9. **SettingsManager Texture Configuration**: Custom texture paths, flag presets, wind physics, and surface shader parameters.

### 3. Build Standalone Production Executable
To package the app into a standalone Windows executable binary (`DesktopPet.exe` inside `DesktopPet-win32-x64/`):
```cmd
# Standard Command Prompt (cmd) / PowerShell (via cmd wrapper):
cmd /c npm run build
```

Alternatively, if building directly via Command Prompt:
```cmd
npx electron-packager . DesktopPet --platform=win32 --arch=x64 --overwrite
```

---

### ⚠️ PowerShell Script Execution Policy Troubleshooting

If running `npm run build` or `npm test` inside PowerShell returns an execution policy restriction error:
> *npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.*

**Solution Option A (Recommended):** Wrap command execution with standard Windows Command Prompt (`cmd`):
```cmd
cmd /c npm run build
cmd /c npm test
```

**Solution Option B:** Temporarily bypass script execution policy in PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
npm run build
```

---

## 📁 Output Build Artifacts

After running `npm run build`, the production output will be generated at:
```
DesktopPet-win32-x64/
  ├── DesktopPet.exe         <-- Standalone executable
  ├── resources/app/         <-- Bundled source code & assets
  ├── steam_appid.txt        <-- Steam integration configuration
  └── ...
```
Double-click `DesktopPet.exe` to launch the standalone application!

---

## 🏗️ Codebase Architecture & Modular Structure

The project follows a modular, decoupled domain structure designed for performance, maintainability, and clean separation of concerns:

```
src/
├── core/                       <-- 3D WebGL & Application Core
│   ├── AnimationLoopManager.js <-- Main RAF render loop manager
│   ├── AppInitializer.js       <-- Application bootstrap & WebGL setup
│   ├── FlagMeshBuilder.js      <-- Native 3D Flag mesh, procedural textures & wave physics
│   ├── LightingManager.js      <-- Multi-source stage spotlight controls
│   ├── MascotBuilder.js        <-- Procedural 3D mesh fallback builder
│   ├── MascotInteractionHandler.js <-- Procedural animations & interaction SFX
│   ├── ModelLoader.js          <-- GLTF/GLB & native mesh loader with race protection
│   ├── SakuraRainManager.js    <-- 3D Cherry blossom petal rain particle engine
│   ├── SnowFallManager.js      <-- 3D Winter snowflake particle engine
│   └── SoundManager.js         <-- Web Audio API synthesizer, ambient loops & SFX
├── managers/                   <-- State & Persistence Managers
│   ├── AppStore.js             <-- Reactive Proxy state store with subscriber system
│   └── SettingsManager.js      <-- Atomic settings JSON staging & config healing
├── main/                       <-- Electron Main Process Services
│   ├── Logger.js               <-- Diagnostics logger & IPC console stream
│   └── SteamService.js         <-- Steamworks API wrapper & Steam overlay handler
└── ui/                         <-- Studio UI & Viewport Controls
    ├── PerformanceMonitorUI.js <-- Real-time FPS, latency, magnitude & memory monitor
    ├── PreviewGenerator.js     <-- Isolated 3D thumbnail generation & mascot cards
    ├── PreviewViewportEngine.js<-- Secondary WebGL preview canvas renderer
    ├── SettingsPanelResizeHandler.js <-- 60 FPS direction-aware edge resize handler
    ├── SettingsPanelUI.js      <-- Studio control suite UI
    ├── SoundTabUI.js           <-- Ambient audio tracks, volume dials & atmosphere sync
    ├── SpotlightCardsUI.js     <-- Real-time spotlight card visualizers
    ├── StudioTabManager.js     <-- Studio tab router & scroll arrow navigation
    └── TextureTabUI.js         <-- Custom texture dropzone, flag presets & shader dials
```

---

