const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'scratch_create_locales.js');
let code = fs.readFileSync(targetFile, 'utf8');

const perfKeysES419 = `
    "perf_monitor_title": "📊 Monitor de Rendimiento y Movimiento",
    "perf_live_fps": "FPS de Renderizado en Vivo",
    "perf_frame_latency": "Latencia de Renderizado de Fotogramas",
    "perf_motion_magnitude": "Magnitud del Movimiento Angular",
    "perf_memory_usage": "Memoria Heap Asignada",`;

if (!code.includes('"es-419": {\n    "title": "⚙️ Configuración",\n    "settings_title": "⚙️ Configuración",\n    "language": "Idioma",\n    "active_mascot": "Mascota Activa",\n    "perf_monitor_title"')) {
  code = code.replace(
    '"es-419": {\n    "title": "⚙️ Configuración",\n    "settings_title": "⚙️ Configuración",\n    "language": "Idioma",\n    "active_mascot": "Mascota Activa",',
    `"es-419": {\n    "title": "⚙️ Configuración",\n    "settings_title": "⚙️ Configuración",\n    "language": "Idioma",\n    "active_mascot": "Mascota Activa",${perfKeysES419}`
  );
  fs.writeFileSync(targetFile, code, 'utf8');
}
