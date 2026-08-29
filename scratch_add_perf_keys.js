const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'scratch_create_locales.js');
let code = fs.readFileSync(targetFile, 'utf8');

const newKeys = {
  "en": {
    "perf_monitor_title": "📊 Performance & Motion Monitor",
    "perf_live_fps": "Live Rendering FPS",
    "perf_frame_latency": "Frame Render Latency",
    "perf_motion_magnitude": "Angular Motion Magnitude",
    "perf_memory_usage": "Heap Memory Allocated"
  },
  "zh-CN": {
    "perf_monitor_title": "📊 性能与动态负载监视器",
    "perf_live_fps": "实时渲染帧率 (FPS)",
    "perf_frame_latency": "单帧渲染延迟 (Frame Latency)",
    "perf_motion_magnitude": "旋转运动幅度/角速度 (Magnitude)",
    "perf_memory_usage": "V8 堆内存占用 (Heap Memory)"
  },
  "zh-TW": {
    "perf_monitor_title": "📊 效能與動態負載監視器",
    "perf_live_fps": "即時渲染幀率 (FPS)",
    "perf_frame_latency": "單幀渲染延遲 (Frame Latency)",
    "perf_motion_magnitude": "旋轉運動幅度/角速度 (Magnitude)",
    "perf_memory_usage": "V8 堆記憶體佔用 (Heap Memory)"
  },
  "ja": {
    "perf_monitor_title": "📊 パフォーマンス＆モーションモニター",
    "perf_live_fps": "リアルタイムレンダリング FPS",
    "perf_frame_latency": "フレームレンダリング遅延",
    "perf_motion_magnitude": "回転運動強度/角速度 (Magnitude)",
    "perf_memory_usage": "ヒープメモリ使用量"
  },
  "ko": {
    "perf_monitor_title": "📊 성능 및 모션 모니터",
    "perf_live_fps": "실시간 렌더링 FPS",
    "perf_frame_latency": "프레임 렌더링 지연 시간",
    "perf_motion_magnitude": "회전 모션 크기/각속도 (Magnitude)",
    "perf_memory_usage": "V8 힙 메모리 사용량"
  },
  "fr": {
    "perf_monitor_title": "📊 Moniteur de Performance et Mouvement",
    "perf_live_fps": "FPS de Rendu en Direct",
    "perf_frame_latency": "Latence de Rendu par Image",
    "perf_motion_magnitude": "Magnitude du Mouvement Angulaire",
    "perf_memory_usage": "Mémoire Heap Allouée"
  },
  "de": {
    "perf_monitor_title": "📊 Leistungs- & Bewegungsmonitor",
    "perf_live_fps": "Live-Rendering FPS",
    "perf_frame_latency": "Frame-Rendering-Latenz",
    "perf_motion_magnitude": "Winkelbewegungsstärke (Magnitude)",
    "perf_memory_usage": "Zugewiesener Heap-Speicher"
  },
  "es": {
    "perf_monitor_title": "📊 Monitor de Rendimiento y Movimiento",
    "perf_live_fps": "FPS de Renderizado en Vivo",
    "perf_frame_latency": "Latencia de Renderizado de Fotogramas",
    "perf_motion_magnitude": "Magnitud del Movimiento Angular",
    "perf_memory_usage": "Memoria Heap Asignada"
  },
  "es-419": {
    "perf_monitor_title": "📊 Monitor de Rendimiento y Movimiento",
    "perf_live_fps": "FPS de Renderizado en Vivo",
    "perf_frame_latency": "Latencia de Renderizado de Fotogramas",
    "perf_motion_magnitude": "Magnitud del Movimiento Angular",
    "perf_memory_usage": "Memoria Heap Asignada"
  },
  "it": {
    "perf_monitor_title": "📊 Monitor Prestazioni e Movimento",
    "perf_live_fps": "FPS di Rendering in Tempo Reale",
    "perf_frame_latency": "Latenza di Rendering Fotogramma",
    "perf_motion_magnitude": "Magnitudine del Movimento Angolare",
    "perf_memory_usage": "Memoria Heap Allocata"
  },
  "pt-BR": {
    "perf_monitor_title": "📊 Monitor de Desempenho e Movimento",
    "perf_live_fps": "FPS de Renderização em Tempo Real",
    "perf_frame_latency": "Latência de Renderização de Quadros",
    "perf_motion_magnitude": "Magnitude do Movimento Angular",
    "perf_memory_usage": "Memória Heap Alocada"
  },
  "ru": {
    "perf_monitor_title": "📊 Монитор производительности и движения",
    "perf_live_fps": "FPS рендеринга в реальном времени",
    "perf_frame_latency": "Задержка рендеринга кадра",
    "perf_motion_magnitude": "Величина углового движения (Magnitude)",
    "perf_memory_usage": "Выделенная память кучи (Heap)"
  }
};

for (const [lang, dict] of Object.entries(newKeys)) {
  const langKey = `"${lang}": {`;
  const idx = code.indexOf(langKey);
  if (idx !== -1) {
    const activeMascotStr = '"active_mascot":';
    const activeMascotIdx = code.indexOf(activeMascotStr, idx);
    if (activeMascotIdx !== -1) {
      const lineEnd = code.indexOf('\n', activeMascotIdx);
      if (lineEnd !== -1) {
        let insertion = '';
        for (const [k, v] of Object.entries(dict)) {
          insertion += `\n    "${k}": "${v}",`;
        }
        code = code.slice(0, lineEnd) + insertion + code.slice(lineEnd);
      }
    }
  }
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully updated scratch_create_locales.js with performance monitor keys.');
