# Desktop 3D Display & Spatial AI Companion (T02 V4) 🖥️🐰✨

A high-performance, transparent, interactive **3D Desktop Spatial Companion & Atmosphere Hub** for Windows powered by **Electron**, **Three.js**, **Web Audio API**, and the **AI Function Director & Neural LLM Engine**.

> 📖 **Full User Manual:** For complete guides on Blender viewport navigation, custom 3D model loading, FPS camera flight, physics tossing, stage spotlights, dynamic battery saver mode, sakura rain particle simulation, and 12-language localization, please see **[USER_MANUAL.md](USER_MANUAL.md)**.

---

## ⚡ Core Systems & Studio Capabilities

```mermaid
graph TD
    User([👤 User]) -->|Natural Language / Chat| AI[🤖 AI Function Director]
    User -->|1-Click Manual Fallback| UI[📦 Universal File Holder Standard]
    
    subgraph Engine [✨ The Unified Desktop Core]
        AI --> Core[Interactive Controller & EventBus]
        UI --> Core
        
        Core --> P1[🐰 3D Spatial & Physics Engine]
        Core --> P2[🎼 Polyphonic Audio & Music Synthesizer]
        Core --> P3[🌸 Ambient 3D Particle Weather System]
        Core --> P4[🎨 Harmonic Cloth & Texture Dynamics]
    end
```

### 1. 🤖 AI Function Director (Tab 1)
* **Pure Conversational Chat Interface**: Streamlined, zero-clutter live conversational window with auto-scroll and quick action badges.
* **Dynamic AI Engine Mode Indicator (`#ai-mode-indicator`)**:
  * `🟢 Local LLM (llama3.2)` — Live when connected to local neural models (Ollama, LM Studio) or cloud endpoints (Groq, OpenRouter, DeepSeek, OpenAI).
  * `⚡ Fallback Mode` — Seamlessly active offline via the ultra-fast built-in heuristic semantic parser.
* **Auto-Start Local LLM Daemon**: Automatically launches the local Ollama background service on boot (`127.0.0.1:11434` with `llama3.2`).

### 2. 📦 Universal Asset Hub & Ingestion (Tab 2)
* **Central Drag-and-Drop Ingestion**: Universal dropzone supporting 3D Models (`.glb`, `.gltf`, `.fbx`, `.obj`), Textures (`.png`, `.jpg`, `.webp`, `.svg`), and Audio Scores (`.mid`, `.midi`, `.musicxml`, `.xml`).
* **Pooled 3D Snapshot Renderer**: Automatically captures beauty-angle thumbnail snapshots for 3D models with zero VRAM leaks.
* **Cross-Tab Ingestion**: Automatically propagates imported assets into Mascot, Texture, Atmosphere, and Music file holder grids.

### 3. 🐰 3D Mascot & Model Studio (Tab 3)
* **Standardized File Holder Grid**: Instant 1-click selection across procedural models (🐰 Bunny, 🎌 Country Flag) and custom GLTF/GLB models.
* **Skeletal Animation Selector**: Live animation clip dropdown with smooth cross-fading and idle bobbing dynamics.

### 4. 🌸 Atmosphere & Ambient Weather (Tab 4)
* **Single-Draw-Call Instanced Particles**: Single-pass GPU instanced particle systems for 3D cherry blossom petals and crystalline snowfall.
* **Standardized Weather Grid**:
  * 🌸 **Sakura Rain** (`.WEATHER` • Spring Blossom Petals)
  * ❄️ **Winter Snow** (`.WEATHER` • Glistening Crystalline Snowflakes)
  * 🌸❄️ **Dual Storm** (`.WEATHER` • Mixed Blossom & Snow Storm)
  * ☀️ **Clear Skies** (`.CLEAR` • Pure Clean View)
* **Audio-Atmosphere Sync**: Automatically activates weather storms when corresponding ambient music plays.

### 5. 🔦 Stage Lighting & 3D Viewport (Tab 5)
* **Multi-Source Stage Spotlights**: Up to 10 customizable spotlight beams with custom RGB hues, beam angles, and Dark Stage Mode.
* **Interactive 3D Viewport**: Full Blender-style orbit, pan, and zoom controls.

### 6. 🎨 Texture & Flag Cloth Dynamics (Tab 6)
* **Harmonic Cloth Wave Simulation**: Procedural waving flag with Verlet integration and real-time wind equations.
* **PBR Material Presets**: 9 built-in shader styles (Solar Eclipse, Geometric Prism, Zen Harmony, Mythic Dragon, Cyber Neon, Cosmic Nebula, Sakura Blossom, Nordic Aurora, Abyssal Wave) and custom texture image mapping.

### 7. 🎵 Sound & Classical Music Studio (Tab 7)
* **Universal Instrument Grid**: Standardized selectable cards for Grand Piano (`.MIDI`), Sheet Reader (`.XML`), Snow Wind (`.SYNTH`), Sakura Melody (`.SYNTH`), and Lo-Fi Drum Beat (`.SYNTH`).
* **Score & Track Library**: Pure Web Audio synthesis of Für Elise, Bach Minuet in G, Ode to Joy, Mozart Twinkle Variations, and imported `.mid` / `.xml` files.
* **Minimalist Transport**: Streamlined down to **Active Song Banner**, **Loop Toggle**, and **Play Button**.

### 8. ⚙️ System & Preferences Configuration Hub (Tab 8)
* **Centralized Neural LLM Settings**: Provider presets, endpoint URLs, model names, API keys, and connection testing.
* **Global Parameters**: Window width/height ($30\text{px}$ to $3840\text{px}$), model scale ($0.1\times$ to $5.0\times$), target frame rate ($15\text{–}240\text{ FPS}$), dynamic battery saver, and idle frame rate caps.
* **100% Zero-Missing 12-Language Localization**: Full translation parity across English, Chinese (Simplified/Traditional), Japanese, Korean, French, German, Spanish (EU/LATAM), Italian, Portuguese, and Russian.

---

## 🏛️ The "$O(1)$ Complexity" UI Philosophy

Traditional desktop software becomes bloated and unusable over time ($O(N^2)$ complexity growth) as every new feature introduces new menus, sliders, and buttons.

This app implements the **Universal File Holder Standard (`.studio-select-card`)**:
1. **Uniform Visual Contract**: Every selectable asset (Mascot, Cloth Texture, Weather Effect, Musical Instrument, Classical Score, and future SynapseFlow graphs) uses the identical card layout.
2. **"Tab UI as Complete History"**: The classical tabs represent a stable, loved physical archive. Adding 100 new features introduces **0 new UI complexity**—they are simply ingested as file cards or directed via natural language.

---

## 🤖 Neural LLM Setup & Modes

```mermaid
flowchart TD
    User([👤 User Command]) --> Chat[🤖 AI Director Chat]
    Chat --> Router{Endpoint Reachable?}
    
    Router -->|Yes: Ollama / Cloud| Neural[🟢 Local Neural LLM]
    Neural --> ToolDispatch[🛡️ Guardrail Tool Dispatcher]
    
    Router -->|No / Offline| Heuristic[⚡ Rule-Based NLP Fallback]
    Heuristic --> ToolDispatch
    
    ToolDispatch --> AppState[⚡ 1:1 Live DOM & WebGL Execution]
```

### Option 1: Built-in Local Ollama (Automatic)
* On application launch, [`main.js`](main.js) automatically starts `ollama.exe serve` on `http://127.0.0.1:11434` with `llama3.2`.
* Click **`🔄 Check`** under **⚙️ System Tab $\rightarrow$ Neural LLM Configuration** to verify.

### Option 2: LM Studio (Local Port 1234)
1. Open LM Studio, load any model, and click **Start Server**.
2. In the app's **⚙️ System Tab**, choose **LM Studio Local** from the Provider dropdown.

### Option 3: Free Fast Cloud Models (Groq / OpenRouter / DeepSeek / OpenAI)
1. Open **⚙️ System Tab $\rightarrow$ Neural LLM Configuration**.
2. Select **Groq Cloud** (Fast & Free) or **OpenRouter Cloud**.
3. Paste your free API key and click **`🔄 Check`**.

---

## 🧪 Automated Testing & Verification Suite

The repository features **14 comprehensive unit test suites** validating all critical subsystems:

```powershell
node tests/run_tests.mjs
```

### Test Coverage:
1. `SettingsManager` defaults, serialization & config healing
2. `PhysicsEngine` velocity, momentum & floor collision math
3. `12-Locale Key Parity` (135/135 keys verified across 12 languages)
4. `AppStore` reactive proxy state & subscriber notifications
5. `EventBus` channels, wildcards & reactive settings proxy
6. `GPUAssetManager` recursive VRAM & WebGL texture disposal
7. `Preload Security Bridge` & process isolation
8. `SoundManager` volume clamping & state snapshots
9. `FlagMeshBuilder` harmonic cloth wave equations
10. `TextureManager` PBR shader configurations
11. `PianoAudioEngine` frequency conversions & polyphonic note scheduling
12. `MidiParserEngine` binary parser & tick math
13. `MusicXmlEngine` score extraction & notation parsing
14. `LLMDirectorEngine` tool executions, guardrails & 10 real-world prompt scenarios

---

## 📦 Building the Standalone Application

To package the standalone Windows binary:

```powershell
# Stop running instances & build binary package
Get-Process -Name DesktopPet -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 1; node ./node_modules/electron-packager/bin/electron-packager.js . DesktopPet --platform=win32 --arch=x64 --overwrite; Copy-Item steam_appid.txt -Destination DesktopPet-win32-x64\
```

The output executable is generated at:
```
DesktopPet-win32-x64/
  ├── DesktopPet.exe         <-- Standalone Executable
  ├── steam_appid.txt        <-- Steam Overlay Support
  └── resources/app/         <-- Bundled Engine Assets
```

---

## 📁 Repository Structure

```
├── .agents/
│   └── rules/
│       └── PROJECT_KNOWLEDGE.md  <-- Persistent Antigravity session knowledge
├── assets/                       <-- Settings JSON & model assets
├── locales/                      <-- 12 Language translation dictionaries
├── src/
│   ├── core/                     <-- 3D WebGL, Audio & Physics Engines
│   │   ├── director/             <-- AI Director tools & RAG telemetry
│   │   ├── piano/                <-- MIDI, MusicXML & Audio synthesis
│   │   ├── AnimationLoopManager.js
│   │   ├── FlagMeshBuilder.js
│   │   ├── GPUAssetManager.js
│   │   ├── LLMDirectorEngine.js
│   │   ├── SakuraRainManager.js
│   │   ├── SceneStageManager.js
│   │   ├── SnowFallManager.js
│   │   └── SoundManager.js
│   ├── managers/                 <-- State & EventBus Managers
│   └── ui/                       <-- Studio UI & Viewport Controllers
│       ├── AIDirectorTabUI.js
│       ├── AssetHubUI.js
│       ├── AtmosphereTabUI.js
│       ├── PianoStudioUI.js
│       ├── SettingsPanelUI.js
│       ├── SoundTabUI.js
│       ├── SpotlightCardsUI.js
│       └── TextureTabUI.js
├── index.html                    <-- Studio UI Markup
├── main.js                       <-- Electron Main & Ollama Auto-Start Daemon
├── preload.js                    <-- Sandboxed Security Bridge
├── renderer.js                   <-- Application Bootstrap & Orchestrator
└── tests/
    └── run_tests.mjs             <-- 14-Suite Automated Unit Test Runner
```

---

## 📄 License
MIT License. Created with ❤️ for advanced 3D spatial computing and desktop companionship.
