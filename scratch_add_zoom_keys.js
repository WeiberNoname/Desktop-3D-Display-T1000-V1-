const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'scratch_create_locales.js');
let code = fs.readFileSync(targetFile, 'utf8');

const zoomKeys = {
  "en": {
    "preview_zoom_in": "Zoom In (+)",
    "preview_zoom_out": "Zoom Out (-)"
  },
  "zh-CN": {
    "preview_zoom_in": "放大 (+)",
    "preview_zoom_out": "缩小 (-)"
  },
  "zh-TW": {
    "preview_zoom_in": "放大 (+)",
    "preview_zoom_out": "縮小 (-)"
  },
  "ja": {
    "preview_zoom_in": "ズームイン (+)",
    "preview_zoom_out": "ズームアウト (-)"
  },
  "ko": {
    "preview_zoom_in": "확대 (+)",
    "preview_zoom_out": "축소 (-)"
  },
  "fr": {
    "preview_zoom_in": "Zoom avant (+)",
    "preview_zoom_out": "Zoom arrière (-)"
  },
  "de": {
    "preview_zoom_in": "Vergrößern (+)",
    "preview_zoom_out": "Verkleinern (-)"
  },
  "es": {
    "preview_zoom_in": "Acercar (+)",
    "preview_zoom_out": "Alejar (-)"
  },
  "es-419": {
    "preview_zoom_in": "Acercar (+)",
    "preview_zoom_out": "Alejar (-)"
  },
  "it": {
    "preview_zoom_in": "Ingrandisci (+)",
    "preview_zoom_out": "Rimpicciolisci (-)"
  },
  "pt-BR": {
    "preview_zoom_in": "Aproximar (+)",
    "preview_zoom_out": "Afastar (-)"
  },
  "ru": {
    "preview_zoom_in": "Приблизить (+)",
    "preview_zoom_out": "Отдалить (-)"
  }
};

for (const [lang, dict] of Object.entries(zoomKeys)) {
  const langKey = `"${lang}": {`;
  const idx = code.indexOf(langKey);
  if (idx !== -1) {
    const previewTitleStr = '"preview_reset_cam":';
    const pIdx = code.indexOf(previewTitleStr, idx);
    if (pIdx !== -1) {
      const lineEnd = code.indexOf('\n', pIdx);
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
console.log('Successfully added preview zoom keys to scratch_create_locales.js');
