'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function DigitalTwinCanvas({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, ref.current.clientWidth / ref.current.clientHeight, 0.1, 100);
    camera.position.set(0, compact ? 6 : 8, compact ? 8 : 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(ref.current.clientWidth, ref.current.clientHeight);
    ref.current.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 7),
      new THREE.MeshStandardMaterial({ color: 0x071116, roughness: 0.88, metalness: 0.08 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.04;
    group.add(floor);

    const grid = new THREE.GridHelper(12, 12, 0x2ee8d6, 0x14323a);
    grid.position.y = 0;
    group.add(grid);

    const bedGeometry = new THREE.BoxGeometry(1.6, 0.28, 2.2);
    const monitorGeometry = new THREE.BoxGeometry(0.55, 0.4, 0.08);
    const statuses = [0x62ff9b, 0x62ff9b, 0xff5470, 0xffc857, 0x2ee8d6, 0x62ff9b];

    statuses.forEach((color, index) => {
      const x = -3.7 + (index % 3) * 3.7;
      const z = index < 3 ? -1.55 : 1.55;

      const bed = new THREE.Mesh(
        bedGeometry,
        new THREE.MeshStandardMaterial({ color: 0x101d23, roughness: 0.6, metalness: 0.2 })
      );
      bed.position.set(x, 0.16, z);
      group.add(bed);

      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.08, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x2a424b, roughness: 0.5 })
      );
      rail.position.set(x, 0.42, z - 0.88);
      group.add(rail);

      const monitor = new THREE.Mesh(
        monitorGeometry,
        new THREE.MeshBasicMaterial({ color })
      );
      monitor.position.set(x + 1.1, 0.92, z - 0.55);
      group.add(monitor);

      const glow = new THREE.PointLight(color, color === 0xff5470 ? 1.7 : 0.85, 3.3);
      glow.position.set(x + 1.1, 1.05, z - 0.55);
      group.add(glow);
    });

    scene.add(new THREE.AmbientLight(0x9bdff0, 0.32));
    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(3, 5, 4);
    scene.add(light);

    let frame = 0;
    let animationId = 0;
    const animate = () => {
      frame += 0.01;
      group.rotation.y = compact ? Math.sin(frame) * 0.04 : Math.sin(frame) * 0.08;
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    const resize = () => {
      if (!ref.current) return;
      camera.aspect = ref.current.clientWidth / ref.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(ref.current.clientWidth, ref.current.clientHeight);
    };

    window.addEventListener('resize', resize);
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      ref.current?.replaceChildren();
    };
  }, [compact]);

  return <div ref={ref} className="h-full min-h-[280px] w-full" />;
}
