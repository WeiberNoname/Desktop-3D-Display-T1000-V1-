/**
 * ModelThumbnailGenerator (<120 lines)
 * Offscreen WebGL snapshot engine that captures high-quality 3D thumbnail previews for GLB/GLTF models.
 */

export class ModelThumbnailGenerator {
  static async captureModelSnapshot(deps = {}) {
    const {
      file,
      objectUrl,
      THREE,
      GLTFLoader,
      width = 200,
      height = 200
    } = deps;

    if (!THREE || !GLTFLoader || (!file && !objectUrl)) {
      return null;
    }

    const url = objectUrl || (file ? URL.createObjectURL(file) : null);
    if (!url) return null;

    return new Promise((resolve) => {
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;

        const renderer = new THREE.WebGLRenderer({
          canvas: offCanvas,
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(1);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);

        // Studio Three-Point Lighting
        const ambLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(3, 4, 5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xfbbf24, 0.4);
        fillLight.position.set(-3, 1, -2);
        scene.add(fillLight);

        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
          try {
            const model = gltf.scene;
            const group = new THREE.Group();
            scene.add(group);
            group.add(model);

            // Center Model & Calculate Bounding Box
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            model.position.set(-center.x, -center.y, -center.z);

            const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
            const fov = camera.fov * (Math.PI / 180);
            const distance = (maxDim / 2) / Math.tan(fov / 2) * 1.35;

            // Beauty Angle (Front-Left slightly elevated)
            camera.position.set(distance * 0.45, distance * 0.35, distance * 0.95);
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
            const dataUrl = offCanvas.toDataURL('image/png');

            // Cleanup resources
            scene.traverse((obj) => {
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                if (Array.isArray(obj.material)) {
                  obj.material.forEach(m => m.dispose());
                } else {
                  obj.material.dispose();
                }
              }
            });
            renderer.dispose();
            renderer.forceContextLoss();

            resolve(dataUrl);
          } catch (e) {
            console.warn('[ModelThumbnailGenerator] Render capture failed:', e);
            resolve(null);
          }
        }, undefined, (err) => {
          console.warn('[ModelThumbnailGenerator] GLTF load failed:', err);
          resolve(null);
        });
      } catch (err) {
        console.warn('[ModelThumbnailGenerator] Unexpected error:', err);
        resolve(null);
      }
    });
  }
}
