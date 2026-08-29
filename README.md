# Desktop 3D Display (T02 V4) 🖥️🐰

A high-performance, transparent, interactive **Desktop 3D Display** for Windows powered by **Electron**, **Three.js**, **Web Audio API**, and the **AI Function Director & Neural LLM Engine**.

> 📖 **Full User Manual:** For complete guides on Blender viewport navigation, custom 3D model loading, FPS camera flight, physics tossing, stage spotlights, dynamic battery saver mode, sakura rain particle simulation, and 12-language localization, please see **[USER_MANUAL.md](USER_MANUAL.md)**.

---

## ⚡ Core Systems & Studio Capabilities

1. **🤖 AI Function Director & Neural LLM Engine (Tab 1)**:
   * **Dual-Layer Intelligence**: Works with **Local Offline Neural LLMs (Ollama `llama3.2`)**, **Cloud Providers (Groq, OpenRouter, DeepSeek, OpenAI)**, and a **100% Free Offline Heuristic Engine**.
   * **Zero-Latency RAG Telemetry**: Dynamically fuses exact live screen reality (slider values, audio volume, active physics) into every prompt.
   * **Multi-Turn Proactive Inspection & Autonomous Execution**: Audits running features $\rightarrow$ prompts for confirmation $\rightarrow$ executes 1:1 physical DOM updates.

2. **📦 Universal Asset Hub & Ingestion (Tab 2)**:
   * **Central Importer**: Universal dropzone supporting 3D Models (`.glb`, `.gltf`, `.fbx`, `.obj`), Textures (`.png`, `.jpg`, `.webp`, `.svg`), and Audio Scores (`.mid`, `.midi`, `.musicxml`, `.xml`).
   * **Offscreen 3D Snapshot Renderer**: Automatically captures beauty-angle thumbnail snapshots for 3D models with zero VRAM leaks.
   * **Cross-Tab Ingestion**: Automatically propagates imported assets into the Mascot, Texture, and Piano selection grids.

3. **🐰 3D Mascot & Model Studio (Tab 3)**:
   * Supports procedural desktop mascot models (🐰 Bunny, 🎌 Country Flag) and custom GLTF/GLB assets.
   * Standardized selection grid with real-time snapshot thumbnails and dedicated skeletal animation clip selector.

4. **🔦 Stage Lighting & 3D Viewport (Tab 4)**:
   * Multi-source stage spotlight controls (up to 10 lights) with custom RGB hues, beam angles, and Dark Stage Mode.
   * Interactive 3D Stage & Lighting Viewport with Blender-style orbit, pan, and zoom controls.

5. **🎨 Texture & Flag Cloth Dynamics (Tab 5)**:
   * Interactive cloth fluttering physics with real-time harmonic wind billowing equations.
   * Preset flag styles (🦁 Royal Tricolor, 🌐 World Globe, ⚡ Cyber Neon, ⭐ Royal Star, 🌈 Pride Rainbow) and custom texture image mapping.

6. **🎵 Grand Piano Studio & Ambient Atmosphere (Tab 6)**:
   * Full acoustic grand piano oscillator synthesis across 88 keys with interactive virtual keyboard.
   * Binary `.mid` (MIDI) waterfall visualizer and `.musicxml` sheet music engine with synchronized playback.
   * Ambient atmospheric synthesizer tracks (Snow Atmosphere, Sakura Spring Melody, Lo-Fi Drum Beat).

7. **⚙️ System & Preferences Configuration Hub (Tab 7)**:
   * Centralized Viewport Dimensions: Window Width ($30\text{px}$ to $3840\text{px}$), Window Height ($30\text{px}$ to $2160\text{px}$), and Model Scale ($0.1\times$ to $5.0\times$).
   * 12-Language dynamic localization, UI text scaling, GPU performance management, Dynamic Battery Saver, and atomic persistence.

---

## 🤖 AI Director & Architecture Overview

Unlike traditional passive chatbots, the **AI Director** is an **Embodied Function Director** connected directly to the running Three.js 3D WebGL renderer, Web Audio synthesizer, Verlet cloth dynamics, Newtonian physics engine, Electron window manager, and HTML DOM controls.

```mermaid
flowchart TD
    User([👤 User Natural Language]):::userInput --> InputGate[⚡ processUserMessage in LLMDirectorEngine]

    subgraph RAG_Layer ["1. Zero-Latency RAG & Live Telemetry Fusing"]
        InputGate --> UIInspector[UIStateInspector.getLiveUIState]
        UIInspector -->|Live DOM Sliders, Checks, Dropdowns| LiveState[(📊 Live UI Reality Snapshot)]
        LiveState --> Retriever[AppContextRetriever.retrieveContext]
        KnowledgeBase[(📚 Subsystem Feature Specs)] --> Retriever
        Retriever -->|Dynamic Real-Time Fused Context| FusedPrompt[Fused Prompt: Knowledge + Live Screen Reality]
    end

    subgraph Decision_Layer ["2. Dual-Layer Hybrid Intelligence Pipeline"]
        FusedPrompt --> Router{Local / Cloud LLM Connected?}
        Router -->|Yes: Ollama llama3.2 / Groq / OpenRouter| LLMCall[POST /chat/completions]
        LLMCall --> IntentType{App Action vs Knowledge Chat?}
        IntentType -->|Action Query| ToolSchemaCall[Pass Tool Definitions]
        IntentType -->|General Knowledge / Chat| DirectNeuralCall[Clean Conversational Generation]
        ToolSchemaCall --> GuardrailPipe
        DirectNeuralCall --> ChatBubble
        
        Router -->|No / Offline| HeuristicEngine[Semantic Intent & NLP Matcher]
        HeuristicEngine --> IntentCheck{Action Command vs Chat?}
        IntentCheck -->|Action / Slang / Multi-Turn| HeuristicTools[Parse Domain Intent & Multipliers]
        IntentCheck -->|Chit-Chat / Empathy / Open-Domain| OpenDomain[🎭 OpenDomainCompanionChat Synthesizer]
        OpenDomain --> ChatBubble[💬 Natural Human-Like Companion Reply]
        HeuristicTools --> GuardrailPipe
    end

    subgraph Guardrail_Layer ["3. Tool Registry & Safety Guardrail Pipeline"]
        GuardrailPipe[🛡️ ToolRegistry.execute]
        GuardrailPipe --> Sanitize[Auto-Clamp Safe Boundaries: Scale 0.2x-3.0x, Window 200-1200px]
        Sanitize --> DomainDispatch{7 Subsystem Domains}
        DomainDispatch -->|Display| D1[DisplayTools: Window Size, Scale, Spin, Model]
        DomainDispatch -->|Weather| D2[AtmosphereTools: Sakura Rain, Snowfall]
        DomainDispatch -->|Physics| D3[PhysicsTools: Gravity, Floor Collider]
        DomainDispatch -->|Sound| D4[SoundTools: Grand Piano, Drum, Audio Ambience]
        DomainDispatch -->|Lighting| D5[LightingTools: Stage Spotlights, Studio Ambient]
        DomainDispatch -->|Texture| D6[TextureTools: Cloth Wind, Wave, Shader Presets]
        DomainDispatch -->|System| D7[SystemTools: Battery Saver, Save & Refresh]
    end

    subgraph Physical_Execution ["4. Physical 1:1 Execution & DOM Sync"]
        D1 & D2 & D3 & D4 & D5 & D6 & D7 --> EngineExec[⚡ Three.js / Web Audio / Electron Bridge]
        EngineExec -->|1| DOMControls[Physical HTML Sliders & Checkboxes Move]
        EngineExec -->|2| NativeEvents[Dispatch 'input' & 'change' to sync labels]
        EngineExec -->|3| WebGLAudio[Update Shaders, Oscillators, Window Frame]
        EngineExec -->|4| DiskPersistence[Atomic assets/settings.json Persistence]
    end

    subgraph Audit_Layer ["5. Real-Time Verification Audit"]
        DOMControls --> DOMAudit[🔍 _verifyPhysicalDOMSync]
        DOMAudit --> Scorecard[(📋 Diagnostic Scorecard & Executive Turn Log)]
        Scorecard --> ChatBubble
    end

    ChatBubble --> FinalOutput([🖥️ Rendered 3D Display + Companion Bubble]):::outputNode

    classDef userInput fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef outputNode fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
```

---

## 🛠️ How to Rebuild & Run Desktop 3D Display

Follow these step-by-step instructions to set up dependencies, run tests, and compile the standalone Windows executable binary (`DesktopPet.exe`).

### 1. System Prerequisites
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **Git**: ([Download Git](https://git-scm.com/))
- **Windows OS**: Windows 10 or 11 (x64)

---

### 2. Install Dependencies & Localize
```bash
npm install
node scratch_create_locales.js
```

---

### 3. Run Automated Unit Test Suite (13 Test Suites)
Run the automated test runner to validate all 53 functional, physical, and conversational test cases:
```cmd
node tests/run_tests.mjs
```

---

### 4. Build Standalone Production Binary
Package the application into a standalone Windows binary (`DesktopPet.exe` inside `DesktopPet-win32-x64/`):
```cmd
cmd /c npm run build
```

---

### 5. Verify Clean Startup
Validate that the compiled application launches with zero runtime errors:
```bash
node scratch_test_live_launch.js
```

---

## 🧠 Setting Up Neural LLM (Local Offline & Cloud)

Desktop 3D Display includes a **Dual-Layer Hybrid Intelligence Pipeline**. You can use **100% Free Local Offline LLMs** (no internet, full privacy), **Cloud LLM APIs**, or the **Built-in Offline Heuristic Companion Engine**.

---

### Option 1: Local Offline Neural LLM (Ollama) — Recommended for Privacy
1. **Install Ollama**:
   * Windows: Run `winget install Ollama.Ollama` in PowerShell, or download from [https://ollama.com/download](https://ollama.com/download).
2. **Pull & Run a Model**:
   * For ultra-fast, lightweight 3B mascot companion (Recommended):
     ```cmd
     ollama run llama3.2
     ```
   * Other recommended high-performance models:
     * `ollama run qwen2.5:7b` (Exceptional multilingual Chinese/Japanese/English & reasoning)
     * `ollama run qwen2.5:3b` (Fast low-VRAM model)
     * `ollama run deepseek-r1:8b` (Deep reasoning)
     * `ollama run mistral` (Creative conversationalist)
3. **Connect in Desktop App**:
   * Open the **🤖 AI Director** tab in the app $\rightarrow$ click **⚙️ LLM Config**.
   * Set **Provider Preset** to **Ollama Local (localhost:11434 - llama3.2)**.
   * Verify Endpoint URL is `http://localhost:11434/v1` and Model Name matches your pulled model (`llama3.2`).
   * Click **🔄 Check** $\rightarrow$ status turns **🟢 Connected! Real Neural LLM is active**.

> 💡 **Tip for LAN / Remote Ollama**: If hosting Ollama on another machine or inside WSL, ensure environment variable `OLLAMA_ORIGINS="*"` is set so the local server accepts connections.

---

### Option 2: Local Offline Neural LLM (LM Studio)
1. **Install LM Studio**: Download and install from [https://lmstudio.ai/](https://lmstudio.ai/).
2. **Download Model**: In LM Studio, search for and download your preferred GGUF model (e.g., `Qwen2.5-7B-Instruct` or `Llama-3.2-3B-Instruct`).
3. **Start Local Server**:
   * Click the **Local Server** (Developer / `<->`) tab in LM Studio.
   * Select your downloaded model from the top dropdown.
   * Click **Start Server** (default server runs at `http://localhost:1234/v1`).
   * Ensure **Enable CORS** is checked in the server settings.
4. **Connect in Desktop App**:
   * Open the **🤖 AI Director** tab $\rightarrow$ click **⚙️ LLM Config**.
   * Set **Provider Preset** to **LM Studio Local (localhost:1234)**.
   * In the **Model Name** field, enter the identifier loaded in LM Studio (e.g. `qwen2.5-7b-instruct` or any loaded model).
   * Click **🔄 Check** $\rightarrow$ status turns **🟢 Connected!**.

---

### Option 3: Custom Local Endpoints (llama.cpp / LocalAI / Jan / vLLM / Text-Gen-WebUI)
1. Start your local OpenAI-compatible server on any port (e.g., `http://localhost:8080/v1` or `http://localhost:5000/v1`).
2. In **⚙️ LLM Config**, choose **Custom OpenAI Endpoint**.
3. Enter your custom Endpoint URL and Model Name, then click **🔄 Check**.

---

### Option 4: 100% Free Ultra-Fast Cloud Neural LLM (No Local RAM/VRAM Required)
1. Open the **🤖 AI Director** tab $\rightarrow$ click **⚙️ LLM Config**.
2. Set **Provider Preset** to **Groq Cloud** or **OpenRouter Cloud**:
   * **Groq Cloud** (Blazing-fast 500+ tokens/sec, free tier): [https://console.groq.com/keys](https://console.groq.com/keys)
   * **OpenRouter Cloud** (Free access to open-weights models): [https://openrouter.ai/keys](https://openrouter.ai/keys)
   * **DeepSeek API**: [https://platform.deepseek.com](https://platform.deepseek.com)
   * **OpenAI API**: [https://platform.openai.com](https://platform.openai.com)
3. Paste your API key into the **API Key** input box.
4. Click **🔄 Check** $\rightarrow$ status turns **🟢 Connected!**.

---

### Option 5: 100% Free Built-in Offline Fallback Engine
* **Zero Configuration Needed**: If no local or cloud LLM is active, the app automatically runs on its built-in offline heuristic semantic intent engine and open-domain friend chat synthesizer (`OpenDomainCompanionChat.js`).
* **0ms Latency, 0 RAM Overhead**: Directly executes all 3D adjustments, camera movements, weather simulations, lighting, and natural conversational responses.

---

### 🔧 LLM Connection Troubleshooting Matrix

| Issue / Status Banner | Cause | Solution |
| :--- | :--- | :--- |
| `⚡ Offline Fallback Mode (Cannot reach endpoint)` | Ollama or LM Studio service is not running or blocked. | Start Ollama (`ollama serve`) or click "Start Server" in LM Studio. |
| `⚠️ Model "..." not found on server (404)` | Endpoint is reachable, but model weights are not downloaded. | Run `ollama run <model_name>` in command prompt to download the model. |
| `⚠️ Authentication Failed (401/403)` | Missing or invalid API key for cloud provider. | Check API key under **⚙️ LLM Config** and re-paste. |
| Request times out on first prompt | First-time cold start weight loading into GPU VRAM. | The engine supports a 15-second timeout window; subsequent prompts will respond in sub-seconds. |

---

## 📁 Output Build Artifacts

After running `cmd /c npm run build`, the production output will be generated at:
```
DesktopPet-win32-x64/
  ├── DesktopPet.exe         <-- Standalone Desktop 3D Display executable
  ├── resources/app/         <-- Bundled source code & assets
  ├── steam_appid.txt        <-- Steam integration configuration
  └── ...
```
Double-click `DesktopPet.exe` to launch **Desktop 3D Display**!

---

## 🏗️ Codebase Architecture & Modular Structure

```
src/
├── core/                       <-- 3D WebGL, Audio & Application Core
│   ├── director/               <-- AI Director Engine & Modular Tool System
│   │   ├── domains/            <-- Subsystem Tool Modules
│   │   │   ├── AtmosphereTools.js <-- Sakura rain, snowfall particle controls
│   │   │   ├── DisplayTools.js    <-- Window size, mascot scale, spin, model switch
│   │   │   ├── LightingTools.js   <-- Stage spotlights, ambient studio lights
│   │   │   ├── PhysicsTools.js    <-- Gravitational momentum, floor colliders
│   │   │   ├── SoundTools.js      <-- Synthesizer volume, piano, drum loops
│   │   │   ├── SystemTools.js     <-- Battery saver, click-through, Save & Refresh
│   │   │   └── TextureTools.js    <-- Flag cloth wave physics & shader presets
│   │   ├── AppContextRetriever.js <-- Zero-latency RAG & knowledge retrieval engine
│   │   ├── OpenDomainCompanionChat.js <-- 100% Free open-domain friend chat synthesizer
│   │   ├── ToolRegistry.js        <-- Modular tool registry & safety guardrails
│   │   └── UIStateInspector.js    <-- Live zero-latency DOM UI telemetry inspector
│   ├── piano/                  <-- Grand Piano Studio & Sheet Music Engines
│   │   ├── MidiParserEngine.js    <-- Binary MIDI parser
│   │   ├── MusicXmlEngine.js      <-- MusicXML score parser
│   │   └── PianoAudioEngine.js    <-- Acoustic grand piano oscillator synthesis
│   ├── AnimationLoopManager.js <-- Main RAF render loop manager
│   ├── AppInitializer.js       <-- Application bootstrap & WebGL setup
│   ├── FlagMeshBuilder.js      <-- Native 3D Flag mesh, procedural textures & wave physics
│   ├── LightingManager.js      <-- Multi-source stage spotlight controls
│   ├── LLMDirectorEngine.js    <-- Master AI Director & companion dispatcher
│   ├── MascotBuilder.js        <-- Procedural 3D mesh fallback builder
│   ├── MascotInteractionHandler.js <-- Procedural animations & interaction SFX
│   ├── ModelLoader.js          <-- GLTF/GLB & native mesh loader with race protection
│   ├── SakuraRainManager.js    <-- 3D Cherry blossom petal rain particle engine
│   ├── SnowFallManager.js      <-- 3D Winter snowflake particle engine
│   └── SoundManager.js         <-- Web Audio API synthesizer, ambient loops & SFX
├── managers/                   <-- State & Persistence Managers
│   ├── AppStore.js             <-- Reactive Proxy state store with subscriber system
│   └── SettingsManager.js      <-- Atomic settings JSON staging & config healing
└── ui/                         <-- Studio UI & Viewport Controls
    ├── AIDirectorTabUI.js      <-- AI Director chat interface, LLM config & diagnostics
    ├── PerformanceMonitorUI.js <-- Real-time FPS, latency, magnitude & memory monitor
    ├── PianoTabUI.js           <-- Grand piano keyboard, waterfall note roll & MIDI player
    ├── PreviewGenerator.js     <-- Isolated 3D thumbnail generation & mascot cards
    ├── SettingsPanelUI.js      <-- Studio control suite UI
    ├── SoundTabUI.js           <-- Ambient audio tracks, volume dials & atmosphere sync
    ├── SpotlightCardsUI.js     <-- Real-time spotlight card visualizers
    ├── StudioTabManager.js     <-- Studio tab router & scroll arrow navigation
    └── TextureTabUI.js         <-- Custom texture dropzone, flag presets & shader dials
```



---

