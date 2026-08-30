/**
 * PianoFileManager
 * Handles music file discovery, local directory hosting in assets/music/,
 * preset song loading, and drag-and-drop import parsing.
 */

import { MidiParserEngine } from '../../core/MidiParserEngine.js';
import { MusicXmlEngine } from '../../core/MusicXmlEngine.js';
import { eventBus } from '../../managers/EventBus.js';

export class PianoFileManager {
  constructor(deps = {}) {
    this.fs = deps.fs;
    this.path = deps.path;
    this.getAssetsPath = deps.getAssetsPath;
    this.showSpeechBubble = deps.showSpeechBubble;
    this.t = deps.t;
    this.hostedMusicFiles = [];
  }

  getMusicDirs() {
    const dirs = [];
    if (this.fs && this.path && typeof this.getAssetsPath === 'function') {
      try {
        const baseAssets = this.getAssetsPath();
        dirs.push(this.path.join(baseAssets, 'music'));
        dirs.push(this.path.join(baseAssets));
      } catch (e) {}
    }
    if (this.path) {
      try {
        dirs.push(this.path.join(process.cwd(), 'assets', 'music'));
        dirs.push(this.path.join(process.cwd(), 'assets'));
      } catch (e) {}
    }
    return dirs;
  }

  getPrimaryMusicDir() {
    if (!this.fs || !this.path) return null;
    let primary = null;
    if (typeof this.getAssetsPath === 'function') {
      try {
        primary = this.path.join(this.getAssetsPath(), 'music');
      } catch (e) {}
    }
    if (!primary) {
      try {
        primary = this.path.join(process.cwd(), 'assets', 'music');
      } catch (e) {}
    }
    if (primary && !this.fs.existsSync(primary)) {
      try {
        this.fs.mkdirSync(primary, { recursive: true });
      } catch (e) {}
    }
    return primary;
  }

  findMusicFile(fileName) {
    if (!this.fs || !this.path || !fileName) return null;
    const dirs = this.getMusicDirs();
    for (const d of dirs) {
      if (this.fs.existsSync(d)) {
        const candidate = this.path.join(d, fileName);
        if (this.fs.existsSync(candidate)) return candidate;
      }
    }
    return null;
  }

  scanHostedFiles() {
    if (!this.fs || !this.path) return [];
    const discovered = new Set();
    const dirs = this.getMusicDirs();
    dirs.forEach(d => {
      if (this.fs.existsSync(d)) {
        try {
          const files = this.fs.readdirSync(d);
          files.forEach(f => {
            const lower = f.toLowerCase();
            if (lower.endsWith('.mid') || lower.endsWith('.midi') || lower.endsWith('.musicxml') || lower.endsWith('.xml')) {
              discovered.add(f);
            }
          });
        } catch (e) {}
      }
    });
    this.hostedMusicFiles = Array.from(discovered);
    return this.hostedMusicFiles;
  }

  saveAndHostFile(file, fileBufferOrText) {
    const primaryDir = this.getPrimaryMusicDir();
    const fileName = file.name;

    if (primaryDir && this.fs && this.path) {
      try {
        const destPath = this.path.join(primaryDir, fileName);
        if (file.path && this.fs.existsSync(file.path)) {
          this.fs.copyFileSync(file.path, destPath);
        } else if (fileBufferOrText instanceof ArrayBuffer) {
          this.fs.writeFileSync(destPath, Buffer.from(fileBufferOrText));
        } else if (typeof fileBufferOrText === 'string') {
          this.fs.writeFileSync(destPath, fileBufferOrText, 'utf8');
        }
      } catch (err) {
        console.warn('[PianoFileManager] Could not write file to primary music directory:', err);
      }
    }

    if (this.showSpeechBubble) {
      this.showSpeechBubble(`Imported Music Track:\n${fileName} 🎵`, 3500);
    }

    eventBus.emit('audio:trackLoaded', { fileName });
    return fileName;
  }
}
