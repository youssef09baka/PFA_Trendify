import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Clock,
  DirectionalLight,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  TorusKnotGeometry,
  WebGLRenderer
} from 'three';

export default function Ambient3DBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let renderer = null;
    let animationFrame = 0;
    let resize = null;
    let visibilityChange = null;
    let forms = [];

    const initialize = async () => {
      if (disposed) return;

      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const scene = new Scene();
      const camera = new PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 9);

      renderer = new WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const group = new Group();
      scene.add(group);

      const createSoftMaterial = (color, opacity, roughness = 0.82) => new MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.02,
        transparent: true,
        opacity,
        depthWrite: false
      });

      const blue = createSoftMaterial(0x2f7dff, 0.42);
      const cyan = createSoftMaterial(0x24c8df, 0.34);
      const amber = createSoftMaterial(0xffa35c, 0.28);
      const pearl = createSoftMaterial(0xffffff, 0.30, 0.9);

      forms = [
        {
          mesh: new Mesh(new IcosahedronGeometry(2.2, 3), blue),
          position: [-5.1, 1.35, -1.4],
          scale: [1.35, 0.82, 1.05],
          rotationSpeed: [0.00045, 0.00075, 0.00015]
        },
        {
          mesh: new Mesh(new SphereGeometry(2.4, 32, 32), cyan),
          position: [4.9, 1.45, -1.7],
          scale: [1.45, 0.72, 1.05],
          rotationSpeed: [0.00025, -0.00055, 0.00018]
        },
        {
          mesh: new Mesh(new TorusKnotGeometry(1.2, 0.28, 80, 12), amber),
          position: [3.2, -2.55, -1.6],
          scale: [1.35, 1.35, 1.35],
          rotationSpeed: [-0.00055, 0.00042, 0.00062]
        },
        {
          mesh: new Mesh(new SphereGeometry(1.7, 28, 28), pearl),
          position: [-2.1, -2.7, -2.6],
          scale: [1.8, 0.54, 1.1],
          rotationSpeed: [0.0002, 0.00038, -0.00025]
        }
      ];

      forms.forEach((item) => {
        item.mesh.position.set(...item.position);
        item.mesh.scale.set(...item.scale);
        group.add(item.mesh);
      });

      scene.add(new AmbientLight(0xffffff, 1.8));

      const keyLight = new DirectionalLight(0xffffff, 2.6);
      keyLight.position.set(-3, 5, 6);
      scene.add(keyLight);

      const cyanLight = new PointLight(0x22d3ee, 34, 18);
      cyanLight.position.set(3.5, 2, 4);
      scene.add(cyanLight);

      const amberLight = new PointLight(0xff9f5c, 22, 16);
      amberLight.position.set(1.5, -3.2, 4);
      scene.add(amberLight);

      const clock = new Clock();
      let lastFrameTime = 0;

      resize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
      };

      const animate = (now) => {
        if (disposed || document.hidden) {
          animationFrame = 0;
          return;
        }
        if (!reduceMotion && now - lastFrameTime >= 1000 / 30) {
          lastFrameTime = now;
          const elapsed = clock.getElapsedTime();

          group.position.x = Math.sin(elapsed * 0.08) * 0.18;
          group.position.y = Math.cos(elapsed * 0.07) * 0.12;
          group.rotation.z = Math.sin(elapsed * 0.05) * 0.035;

          forms.forEach((item) => {
            item.mesh.rotation.x += item.rotationSpeed[0];
            item.mesh.rotation.y += item.rotationSpeed[1];
            item.mesh.rotation.z += item.rotationSpeed[2];
          });

          renderer.render(scene, camera);
        }

        if (!reduceMotion) animationFrame = window.requestAnimationFrame(animate);
      };

      resize();
      window.addEventListener('resize', resize);
      visibilityChange = () => {
        if (document.hidden) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        } else if (!reduceMotion && !animationFrame) {
          animationFrame = window.requestAnimationFrame(animate);
        }
      };
      document.addEventListener('visibilitychange', visibilityChange);
      if (!reduceMotion) animationFrame = window.requestAnimationFrame(animate);
    };

    initialize();

    return () => {
      disposed = true;
      if (resize) window.removeEventListener('resize', resize);
      if (visibilityChange) document.removeEventListener('visibilitychange', visibilityChange);
      window.cancelAnimationFrame(animationFrame);
      forms.forEach((item) => {
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
      });
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);

  return <div className="ambient-3d-background" ref={mountRef} aria-hidden="true" />;
}
