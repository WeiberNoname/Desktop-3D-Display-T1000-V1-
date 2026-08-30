# Desktop 3D Display & AI Companion - Project Knowledge & Rules (AGENTS.md)

## 1. System Architecture & UI Philosophy
* **$O(1)$ Complexity Law**: All selectable assets (Mascots, Textures, Atmosphere Weather, Instruments, Songs, and future SynapseFlow graphs) use the **Standard File Holder Grid** (`.studio-select-card`). Adding features adds 0 new UI paradigms.
* **"Tab UI as Complete History"**: The classical tabs (Display, Atmosphere, Lighting, Texture, Sound, System) are a complete, stable historical archive. Do not add new cluttered buttons or toolbars.
* **AI Function Director (Tab 1)**: Pure, minimal conversational chat interface with real-time AI Mode indicator (`🟢 Local LLM` vs `⚡ Fallback Mode`).
* **System Tab (Tab 8)**: Centralized configuration hub containing Neural LLM endpoint settings, language selector, motion parameters, physics, and GPU toggles.

## 2. Local LLM & Ollama Background Bridge
* **Auto-Start Daemon**: `main.js` automatically detects and starts `ollama.exe serve` (`OLLAMA_HOST=127.0.0.1:11434`, `OLLAMA_ORIGINS=*`) on boot.
* **Default Local Model**: `llama3.2` (located at `C:\Users\space\.ollama\models\manifests\registry.ollama.ai\library\llama3.2\latest`).
* **Fallback Mode**: If the endpoint is unreachable or offline, the app automatically switches to the built-in multi-lingual rule-based semantic parser.

## 3. Build, Verification & Testing Commands (PowerShell)
* **Unit Tests (14 Suites)**:
  ```powershell
  node tests/run_tests.mjs
  ```
* **Packaging Binary**:
  ```powershell
  Get-Process -Name DesktopPet -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 1; node ./node_modules/electron-packager/bin/electron-packager.js . DesktopPet --platform=win32 --arch=x64 --overwrite; Copy-Item steam_appid.txt -Destination DesktopPet-win32-x64\
  ```
* **Launch Executable**:
  ```powershell
  Start-Process "DesktopPet-win32-x64\DesktopPet.exe"
  ```
