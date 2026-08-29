const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class Logger {
  static getAssetsPath() {
    if (app && app.isPackaged) {
      return path.join(path.dirname(process.execPath), 'assets');
    }
    return app ? path.join(app.getAppPath(), 'assets') : path.join(process.cwd(), 'assets');
  }

  static logDiagnostic(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    console.log(`[Diagnostic] ${message}`);
    try {
      const assetsDir = Logger.getAssetsPath();
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const diagnosticsLogPath = path.join(assetsDir, 'diagnostics.log');
      
      if (fs.existsSync(diagnosticsLogPath)) {
        const stats = fs.statSync(diagnosticsLogPath);
        if (stats.size > 100 * 1024) {
          const data = fs.readFileSync(diagnosticsLogPath, 'utf8');
          const lines = data.split('\n');
          const truncatedData = lines.slice(-100).join('\n') + '\n';
          fs.writeFileSync(diagnosticsLogPath, truncatedData, 'utf8');
        }
      }
      
      fs.appendFileSync(diagnosticsLogPath, logLine);
    } catch (e) {
      console.error("Failed to write to diagnostics.log:", e);
    }
  }
}

module.exports = Logger;
