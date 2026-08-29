# 3D Transparent Desktop Mascot Pet - User Manual 📖

Welcome to the **3D Transparent Desktop Mascot Pet (V7.1)** User Manual. This document contains comprehensive information regarding application features, 3D model customization, controls, settings panel options, and technical architecture.

---

## 🌟 Application Features Overview

Desktop Pet is a floating, borderless, fully transparent (RGBA 0,0,0,0) 3D interactive companion pet application for Windows powered by **Electron**, **Three.js (WebGL)**, and **i18next**.

- **Always-on-Top Floating Mascot**: Floats above all open desktop windows while bobbing gently.
- **Transparent Click-Through**: Captures clicks and drags directly on the character while passing clicks straight through to underlying applications in transparent areas.
- **3D Model Drag-and-Drop**: Load custom `.glb` and `.gltf` 3D assets instantly by dragging them onto the window canvas.
- **First-Person Perspective (FPS) Mode**: 360-degree pointer lock camera aiming with WASD flight controls.
- **Multi-Source Stage Spotlights**: Control up to 10 dynamic 3D spotlights with custom colors, angles, and dark stage presets.
- **Physics Engine**: Throw the mascot across the screen with gravity, momentum, and ground landing colliders.
- **12 Core International Languages**: Instant live dynamic language switching across all studio tabs and settings controls (with automatic English fallback for unlisted system locales).

---

## 🕹️ Controls & Interaction Guide

| Mouse / Key Action | Target | Description |
| :--- | :--- | :--- |
| **Hover** | Over character | Cursor changes to pointer, revealing top quick controls (`⚙️` Settings, `✖` Exit). |
| **Hover ➔ Click ⚙️** | Top Edge | Toggles (Opens or Closes) the 3D Studio Settings Control Suite. |
| **Hover ➔ Click ✖** | Top Edge | **Close Application:** Exits and quits the application. |
| **Left Click** | On character | Procedural bunny: triggers jump & spin animation. Custom models: accelerates animation playback. |
| **Left Click + Drag** | On character / Panel | Repositions the mascot window anywhere across your monitors. |
| **Hold D + Left Drag** | On character | **Physics Throw:** Throws mascot with momentum, gravity, and bounce collisions. |
| **Ctrl + Shift + F** | Globally | Toggles **First-Person Camera Mode** (WASD flight + 360° mouse look). |
| **W / A / S / D** | In FPS Mode | Move camera forward (`W`), backward (`S`), strafe left (`A`), strafe right (`D`). |
| **Space / Shift** | In FPS Mode | Fly UP (`Space`) or DOWN (`Shift`) vertically in 3D space. |
| **ESC Key** | In FPS Mode | Exit FPS mode and restore cursor. |
| **Ctrl + Shift + C** | Globally | Toggle live **Spatial XYZ Coordinates HUD** overlay badge. |
| **Ctrl + V** | Globally | Toggle **View Only Mode** (fades mascot to fully transparent on hover). |
| **Alt + Drag** (or MMB) | Viewport | **Orbit View (3D Rotate):** Rotates camera angle around 3D mascot. |
| **Ctrl + Drag** | Viewport | **Z-Axis Spin (Roll Tilt):** Rotates mascot on Z-axis via circular mouse arc. |
| **Shift + Drag** | Viewport | **Pan View (3D Translate):** Moves camera position up/down and left/right. |
| **Scroll Wheel** | Viewport | **Zoom View (3D Depth):** Scales camera distance closer or further away. |

---

## 🎥 First-Person Perspective (FPS) & Spatial XYZ Coordinates

Desktop Pet includes a full 3D camera flight engine:

* **Pointer Lock 360° Mouse Look**: Entering FPS mode (`Ctrl + Shift + F` or via Settings) locks the pointer to the canvas center, hides the OS cursor, and activates a centered **`+` crosshair target overlay**.
* **3D Flight Controls**: Navigate using `WASD` for planar movement and `Space` / `Shift` for vertical elevation.
* **Spatial XYZ Coordinates HUD**: Live readout displaying real-time **Camera/Mascot Position `(X, Y, Z)`** and **Rotation `(RX, RY, RZ)`**.
* **Reset Camera & Position Button**: One-click reset button in Settings Panel (`Reset Camera & Position 🔄`) restores camera `(0, 0, 5.5)` and mascot origin.

---

## 💡 Custom 3D Model Import Guide

The application automatically detects, centers, and renders custom 3D assets:

1. **Frictionless Drag-and-Drop**: Drag any `.glb` or `.gltf` file directly from Windows Explorer and drop it onto the pet's window. The app automatically copies the file into the `assets/` folder and loads it instantly.
2. **Manual File Placement**:
   - Development directory: `assets/`
   - Executable directory: `DesktopPet-win32-x64/resources/app/assets/`
3. **Auto-Grounding**: Bounding boxes are calculated automatically to scale the model and anchor its feet flush with the taskbar.
4. **Auto-Animation Mapping**: Automatically inspects embedded animation tracks and maps idle (`"idle"`, `"stay"`) and reaction (`"jump"`, `"spin"`) clips.
5. **Fallback**: If the `assets/` folder contains no model files, the application automatically renders the default procedural bunny mascot.

---

## ⚙️ 3D Studio Settings Control Suite

The Settings Panel is organized into 8 categorized studio tabs:

1. **🎯 Display**: Active mascot selector, preview thumbnail generator grid, animation selector, window width/height, and model scale sliders.
2. **🌀 Motion**: Idle bobbing, position locking, view-only mode, Dynamic Battery Saver (auto-throttles FPS when idle/unfocused), GPU & mouse optimizations, X/Y/Z axis spinning controls, and live Performance Monitor.
3. **🔦 Lighting**: Multi-source stage spotlight controls (up to 10 lights), master ambient light dimmer, Dark Stage Mode, and Dual Concert presets.
4. **🌸 Atmosphere**: Sakura Blossom Rain particle engine, Winter Snowfall simulation, particle counts, and fall speeds.
5. **🎵 Sound**: Ambient weather synthesizer (Sakura breeze & winter wind), 16-step rhythmic drum loops, atmosphere sync toggles, master/track volume sliders, and mascot interaction SFX.
6. **🎨 Texture**: Custom image texture uploader (drag & drop or file browse for PNG, JPG, WebP, SVG), native 3D Waving Country Flag mesh with real-time harmonic wind billowing physics, preset flag styles, wind speed/amplitude tuning, and texture repeat/roughness/metalness shader controls.
7. **⚡ Physics**: Enable momentum physics engine, gravity slider, bounciness elasticity, ground landing collider, and momentum throw info.
8. **🎥 Camera**: First-person camera mode toggle, spatial XYZ coordinate HUD overlay, 3D ground reference grid, viewport controls.
9. **⚙️ System**: Language selector (12 core locales), UI font scale slider, settings icon placement toggle, and configuration management.

---

## 🌍 12-Language (i18n) Developer Instructions

### Supported Core Languages (12 Locales)
`en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `fr`, `de`, `es`, `es-419`, `it`, `pt-BR`, `ru`.

### How to Add or Modify Translation Keys
1. Add new key-value pairs in **`scratch_create_locales.js`** under `newTranslations["en"]` and **`locales/en/translation.json`**.
2. Run generator script to propagate keys across all 31 locale files:
   ```bash
   node scratch_create_locales.js
   ```
3. Reference in UI:
   - **HTML**: Add `data-i18n="your_key"` attribute (e.g., `<span data-i18n="your_key">Text</span>`).
   - **JavaScript**: Call `t('your_key')` in `renderer.js`.

### How to Register a New Language Locale
1. Append language definition `{ code: 'code', label: 'Language Name' }` to `SUPPORTED_LANGUAGES` in **`i18nManager.js`**.
2. Add `<option value="code">Language Name</option>` to `<select id="lang-select">` in **`index.html`**.
3. Add dictionary entry in **`scratch_create_locales.js`** and run `node scratch_create_locales.js`.

---

## ⚡ Performance & Clean Architecture Notes

* **Blender Dark Charcoal & Orange Design**: High contrast dark slate glassmorphism palette (`rgba(30, 30, 30, 0.95)` with `#e67e22` Blender Orange active highlights).
* **Zero Overhead Tab Navigation**: CSS visibility toggling ensures tab switching has 0ms re-render delay.
* **Steam Overlay Input Focus Resolution**: Clears background polling timers and releases `alwaysOnTop` window layer locks when Steam Overlay activates.
* **Atomic Settings Staging**: Atomic writes via temporary file staging prevent settings file corruption during unexpected shutdowns.

