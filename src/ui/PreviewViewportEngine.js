/**
 * 3D Stage & Lighting Preview Viewport Engine (<180 lines)
 * Encapsulates offscreen canvas preview WebGL renderer, orbit controls, zoom controls, camera presets, and helper toggles.
 */

export class PreviewViewportEngine {
  constructor(THREE) {
    this.THREE = THREE;
    this.previewRenderer = null;
    this.previewCamera = null;
    this.previewHelpersVisible = true;
    this.isPreviewDragging = false;
    this.previewDragMode = 'orbit'; // 'orbit' or 'zoom'
    this.previewDragStartX = 0;
    this.previewDragStartY = 0;
    this.previewCamRotH = 0.5;
    this.previewCamRotV = 0.3;
    this.previewCamDist = 6.0;
  }

  initPreviewViewport() {
    const THREE = this.THREE;
    const container = document.getElementById('settings-preview-container');
    const canvas = document.getElementById('settings-preview-canvas');
    if (!canvas) return;

    try {
      this.previewRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      this.previewRenderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 180);
      this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.previewRenderer.shadowMap.enabled = true;
      this.previewRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.previewCamera = new THREE.PerspectiveCamera(45, (canvas.clientWidth || 300) / (canvas.clientHeight || 180), 0.1, 100);
      this.updatePreviewCameraPosition();

      // Prevent default context menu on right click
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      if (container) container.addEventListener('contextmenu', (e) => e.preventDefault());

      canvas.addEventListener('mousedown', (e) => {
        this.isPreviewDragging = true;
        this.previewDragMode = (e.button === 2 || e.shiftKey) ? 'zoom' : 'orbit';
        this.previewDragStartX = e.clientX;
        this.previewDragStartY = e.clientY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isPreviewDragging) return;
        const deltaX = e.clientX - this.previewDragStartX;
        const deltaY = e.clientY - this.previewDragStartY;
        this.previewDragStartX = e.clientX;
        this.previewDragStartY = e.clientY;

        if (this.previewDragMode === 'zoom') {
          this.previewCamDist = Math.max(0.8, Math.min(35.0, this.previewCamDist + deltaY * 0.05));
        } else {
          this.previewCamRotH -= deltaX * 0.01;
          this.previewCamRotV = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.previewCamRotV + deltaY * 0.01));
        }
        this.updatePreviewCameraPosition();
      });

      window.addEventListener('mouseup', () => {
        this.isPreviewDragging = false;
      });

      const handleWheelZoom = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const zoomStep = e.deltaY * 0.005;
        this.previewCamDist = Math.max(0.8, Math.min(35.0, this.previewCamDist + zoomStep));
        this.updatePreviewCameraPosition();
      };

      canvas.addEventListener('wheel', handleWheelZoom, { passive: false });
      if (container) {
        container.addEventListener('wheel', handleWheelZoom, { passive: false });
      }

      const zoomInBtn = document.getElementById('preview-btn-zoom-in');
      if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
          this.previewCamDist = Math.max(0.8, this.previewCamDist - 1.2);
          this.updatePreviewCameraPosition();
        });
      }

      const zoomOutBtn = document.getElementById('preview-btn-zoom-out');
      if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
          this.previewCamDist = Math.min(35.0, this.previewCamDist + 1.2);
          this.updatePreviewCameraPosition();
        });
      }

      const resetBtn = document.getElementById('preview-btn-reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.previewCamRotH = 0.5;
          this.previewCamRotV = 0.3;
          this.previewCamDist = 6.0;
          this.updatePreviewCameraPosition();
        });
      }

      const helpersBtn = document.getElementById('preview-btn-helpers');
      if (helpersBtn) {
        helpersBtn.addEventListener('click', () => {
          this.previewHelpersVisible = !this.previewHelpersVisible;
          helpersBtn.classList.toggle('active', this.previewHelpersVisible);
        });
      }

      const frontBtn = document.getElementById('preview-btn-front');
      if (frontBtn) {
        frontBtn.addEventListener('click', () => {
          this.previewCamRotH = 0;
          this.previewCamRotV = 0;
          this.previewCamDist = 6.0;
          this.updatePreviewCameraPosition();
        });
      }

      const topBtn = document.getElementById('preview-btn-top');
      if (topBtn) {
        topBtn.addEventListener('click', () => {
          this.previewCamRotH = 0;
          this.previewCamRotV = Math.PI / 2 - 0.05;
          this.previewCamDist = 6.0;
          this.updatePreviewCameraPosition();
        });
      }

      const isoBtn = document.getElementById('preview-btn-iso');
      if (isoBtn) {
        isoBtn.addEventListener('click', () => {
          this.previewCamRotH = Math.PI / 4;
          this.previewCamRotV = Math.PI / 6;
          this.previewCamDist = 6.0;
          this.updatePreviewCameraPosition();
        });
      }
    } catch (e) {
      console.warn("Could not initialize 3D preview viewport:", e);
    }
  }

  updatePreviewCameraPosition() {
    if (!this.previewCamera) return;
    const cx = this.previewCamDist * Math.cos(this.previewCamRotV) * Math.sin(this.previewCamRotH);
    const cy = this.previewCamDist * Math.sin(this.previewCamRotV);
    const cz = this.previewCamDist * Math.cos(this.previewCamRotV) * Math.cos(this.previewCamRotH);
    this.previewCamera.position.set(cx, cy, cz);
    this.previewCamera.lookAt(0, 0, 0);
  }

  renderPreviewViewport({ isSettingsOpen, scene, stageSpotLightHelpers, currentSettings }) {
    const container = document.getElementById('settings-preview-container');
    const canvas = document.getElementById('settings-preview-canvas');
    if (!isSettingsOpen || !container || !canvas || !this.previewRenderer || !this.previewCamera || !scene) return;

    if (container.offsetParent === null || canvas.clientWidth === 0 || canvas.clientHeight === 0) return;

    if (Array.isArray(stageSpotLightHelpers)) {
      stageSpotLightHelpers.forEach((h, idx) => {
        if (h) {
          const spotConfig = Array.isArray(currentSettings.spotlights) ? currentSettings.spotlights[idx] : null;
          const isEnabled = spotConfig ? !!spotConfig.enabled : false;
          h.visible = this.previewHelpersVisible && isSettingsOpen && isEnabled;
        }
      });
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
      this.previewRenderer.setSize(width, height, false);
      this.previewCamera.aspect = width / height;
      this.previewCamera.updateProjectionMatrix();
    }

    try {
      this.previewRenderer.render(scene, this.previewCamera);
    } catch (e) {
      console.warn("Error rendering preview viewport:", e);
    }
  }
}
