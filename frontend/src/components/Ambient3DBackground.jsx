import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function createSoftMaterial(color, opacity, roughness = 0.82) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.02,
    transmission: 0.12,
    transparent: true,
    opacity,
    depthWrite: false,
    clearcoat: 0.45,
    clearcoatRoughness: 0.7
  });
}

export default function Ambient3DBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const blue = createSoftMaterial(0x2f7dff, 0.42);
    const cyan = createSoftMaterial(0x24c8df, 0.34);
    const amber = createSoftMaterial(0xffa35c, 0.28);
    const pearl = createSoftMaterial(0xffffff, 0.30, 0.9);

    const forms = [
      {
        mesh: new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 4), blue),
        position: [-5.1, 1.35, -1.4],
        scale: [1.35, 0.82, 1.05],
        rotationSpeed: [0.00045, 0.00075, 0.00015]
      },
      {
        mesh: new THREE.Mesh(new THREE.SphereGeometry(2.4, 48, 48), cyan),
        position: [4.9, 1.45, -1.7],
        scale: [1.45, 0.72, 1.05],
        rotationSpeed: [0.00025, -0.00055, 0.00018]
      },
      {
        mesh: new THREE.Mesh(new THREE.TorusKnotGeometry(1.2, 0.28, 120, 18), amber),
        position: [3.2, -2.55, -1.6],
        scale: [1.35, 1.35, 1.35],
        rotationSpeed: [-0.00055, 0.00042, 0.00062]
      },
      {
        mesh: new THREE.Mesh(new THREE.SphereGeometry(1.7, 40, 40), pearl),
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

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(-3, 5, 6);
    scene.add(keyLight);

    const cyanLight = new THREE.PointLight(0x22d3ee, 34, 18);
    cyanLight.position.set(3.5, 2, 4);
    scene.add(cyanLight);

    const amberLight = new THREE.PointLight(0xff9f5c, 22, 16);
    amberLight.position.set(1.5, -3.2, 4);
    scene.add(amberLight);

    const clock = new THREE.Clock();
    let animationFrame = 0;

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      if (!reduceMotion) {
        group.position.x = Math.sin(elapsed * 0.08) * 0.18;
        group.position.y = Math.cos(elapsed * 0.07) * 0.12;
        group.rotation.z = Math.sin(elapsed * 0.05) * 0.035;

        forms.forEach((item) => {
          item.mesh.rotation.x += item.rotationSpeed[0];
          item.mesh.rotation.y += item.rotationSpeed[1];
          item.mesh.rotation.z += item.rotationSpeed[2];
        });
      }

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrame);
      forms.forEach((item) => {
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="ambient-3d-background" ref={mountRef} aria-hidden="true" />;
}
