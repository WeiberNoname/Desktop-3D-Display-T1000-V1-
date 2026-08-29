const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const regex = /data-i18n=["']([^"']+)["']/g;
let match;
const foundKeys = new Set();
while ((match = regex.exec(html)) !== null) {
  foundKeys.add(match[1]);
}

const localesDir = path.join(__dirname, 'locales');
const langs = fs.readdirSync(localesDir);

let allValid = true;
for (const lang of langs) {
  const file = path.join(localesDir, lang, 'translation.json');
  if (fs.existsSync(file)) {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const key of foundKeys) {
      if (!json[key]) {
        console.warn(`[MISSING] Language ${lang} is missing key: ${key}`);
        allValid = false;
      }
    }
  }
}

if (allValid) {
  console.log('All data-i18n tags in index.html exist across all locales!');
}

