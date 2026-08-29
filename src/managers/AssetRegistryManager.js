/**
 * AssetRegistryManager (<120 lines)
 * Central registry for managing user-imported 3D models, textures, and audio/sheet music assets.
 */

export class AssetRegistryManager {
  constructor() {
    this.assets = [];
    this.listeners = new Set();
  }

  static getInstance() {
    if (!window.__assetRegistryManager) {
      window.__assetRegistryManager = new AssetRegistryManager();
    }
    return window.__assetRegistryManager;
  }

  detectFileType(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['glb', 'gltf', 'fbx', 'obj'].includes(ext)) {
      return { type: 'model', category: '3D Model', icon: '🧊', ext };
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp'].includes(ext)) {
      return { type: 'texture', category: 'Texture', icon: '🖼️', ext };
    }
    if (['mid', 'midi'].includes(ext)) {
      return { type: 'audio', category: 'MIDI Track', icon: '🎹', format: 'midi', ext };
    }
    if (['musicxml', 'xml'].includes(ext)) {
      return { type: 'audio', category: 'Sheet Score', icon: '🎼', format: 'musicxml', ext };
    }
    if (['mp3', 'wav', 'ogg'].includes(ext)) {
      return { type: 'audio', category: 'Audio Clip', icon: '🎵', format: 'audio', ext };
    }
    return { type: 'unknown', category: 'General Asset', icon: '📁', ext };
  }

  async registerFile(file) {
    if (!file) return null;
    const meta = this.detectFileType(file);
    const id = 'asset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const objectUrl = URL.createObjectURL(file);

    let buffer = null;
    if (meta.type === 'audio') {
      try {
        buffer = await file.arrayBuffer();
      } catch (e) {}
    }

    const assetItem = {
      id,
      name: file.name,
      sizeFormatted: this.formatBytes(file.size),
      sizeBytes: file.size,
      type: meta.type,
      category: meta.category,
      icon: meta.icon,
      format: meta.format || null,
      ext: meta.ext,
      objectUrl,
      file,
      buffer,
      timestamp: Date.now()
    };

    this.assets.unshift(assetItem);
    this.notify();
    return assetItem;
  }

  getAssets(filterType = 'all') {
    if (!filterType || filterType === 'all') {
      return [...this.assets];
    }
    return this.assets.filter(a => a.type === filterType);
  }

  getAssetById(id) {
    return this.assets.find(a => a.id === id) || null;
  }

  removeAsset(id) {
    const idx = this.assets.findIndex(a => a.id === id);
    if (idx !== -1) {
      const removed = this.assets.splice(idx, 1)[0];
      if (removed.objectUrl) {
        URL.revokeObjectURL(removed.objectUrl);
      }
      this.notify();
      return true;
    }
    return false;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.assets); } catch (e) {}
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
