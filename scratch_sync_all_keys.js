const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'scratch_create_locales.js');
let code = fs.readFileSync(targetFile, 'utf8');

// Ensure all 12 translation files have exact parity
const localesDir = path.join(__dirname, 'locales');
const zh = JSON.parse(fs.readFileSync(path.join(localesDir, 'zh-CN', 'translation.json'), 'utf8'));

const allLangs = fs.readdirSync(localesDir);
for (const lang of allLangs) {
  const filePath = path.join(localesDir, lang, 'translation.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.btn_save && data.save_btn) data.btn_save = data.save_btn;
    if (!data.save_btn && data.btn_save) data.save_btn = data.btn_save;
    if (!data.preview_zoom_in) data.preview_zoom_in = "Zoom In (+)";
    if (!data.preview_zoom_out) data.preview_zoom_out = "Zoom Out (-)";
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}
console.log('Fixed 12-locale key parity.');
