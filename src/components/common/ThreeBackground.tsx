import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, Orbit, Waves, Box, Eye, EyeOff, Settings2, Sliders, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ThreeBackgroundMode = 'constellation' | 'polyhedrons' | 'waves' | 'vortex';

interface ThreeBackgroundProps {
  isDarkMode?: boolean;
  className?: string;
}

export const ThreeBackground: React.FC<ThreeBackgroundProps> = ({
  isDarkMode = true,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Settings State persisted in localStorage
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sdaa_3d_bg_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [mode, setMode] = useState<ThreeBackgroundMode>(() => {
    try {
      const saved = localStorage.getItem('sdaa_3d_bg_mode') as ThreeBackgroundMode;
      return ['constellation', 'polyhedrons', 'waves', 'vortex'].includes(saved) ? saved : 'constellation';
    } catch {
      return 'constellation';
    }
  });

  const [speed, setSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sdaa_3d_bg_speed');
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [density, setDensity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sdaa_3d_bg_density');
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [showControls, setShowControls] = useState<boolean>(false);

  // Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sdaa_3d_bg_enabled', String(isEnabled));
      localStorage.setItem('sdaa_3d_bg_mode', mode);
      localStorage.setItem('sdaa_3d_bg_speed', String(speed));
      localStorage.setItem('sdaa_3d_bg_density', String(density));
    } catch (e) {
      console.error(e);
    }
  }, [isEnabled, mode, speed, density]);

  // Three.js animation canvas
  useEffect(() => {
    if (!isEnabled || !containerRef.current) return;

    const container = containerRef.current;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = mode === 'waves' ? 35 : 45;
    if (mode === 'waves') {
      camera.position.y = 15;
      camera.lookAt(0, 0, 0);
    }

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent canvas

    // Clear previous children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Mouse tracking for parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (event.clientX - windowHalfX) * 0.0008;
      mouseY = (event.clientY - windowHalfY) * 0.0008;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Mode-specific 3D objects
    const cleanupCallbacks: (() => void)[] = [];

    // Colors based on theme
    const primaryColorHex = isDarkMode ? 0x06b6d4 : 0x0284c7; // Cyan / Sky
    const secondaryColorHex = isDarkMode ? 0x3b82f6 : 0x6366f1; // Blue / Indigo
    const accentColorHex = isDarkMode ? 0x10b981 : 0x0d9488; // Emerald / Teal

    // -------------------------------------------------------------
    // MODE 1: DATA CONSTELLATION
    // -------------------------------------------------------------
    if (mode === 'constellation') {
      const particleCount = Math.floor(90 * density);
      const positions = new Float32Array(particleCount * 3);
      const velocities: THREE.Vector3[] = [];
      const particleGroup = new THREE.Group();
      scene.add(particleGroup);

      const bounds = 45;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * bounds * 2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * bounds * 1.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * bounds;

        velocities.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.04 * speed,
            (Math.random() - 0.5) * 0.04 * speed,
            (Math.random() - 0.5) * 0.03 * speed
          )
        );
      }

      // Point cloud
      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Custom circular particle texture
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, isDarkMode ? 'rgba(6, 182, 212, 0.8)' : 'rgba(2, 132, 199, 0.8)');
      gradient.addColorStop(0.7, isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(99, 102, 241, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      const particleTexture = new THREE.CanvasTexture(canvas);

      const particleMat = new THREE.PointsMaterial({
        size: isDarkMode ? 2.4 : 2.0,
        map: particleTexture,
        transparent: true,
        opacity: isDarkMode ? 0.75 : 0.55,
        blending: isDarkMode ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      });

      const particlePoints = new THREE.Points(particleGeo, particleMat);
      particleGroup.add(particlePoints);

      // Line mesh for dynamic connections
      const maxConnections = particleCount * 6;
      const linePositions = new Float32Array(maxConnections * 6);
      const lineColors = new Float32Array(maxConnections * 6);

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: isDarkMode ? 0.45 : 0.3,
        blending: isDarkMode ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      });

      const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
      particleGroup.add(linesMesh);

      // Animate Constellation
      const updateConstellation = () => {
        const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
        const currentPos = posAttr.array as Float32Array;

        let vertexPos = 0;
        let colorPos = 0;
        const connectionDist = 18;

        for (let i = 0; i < particleCount; i++) {
          // Update particle positions with bounce
          currentPos[i * 3] += velocities[i].x * speed;
          currentPos[i * 3 + 1] += velocities[i].y * speed;
          currentPos[i * 3 + 2] += velocities[i].z * speed;

          if (Math.abs(currentPos[i * 3]) > bounds) velocities[i].x *= -1;
          if (Math.abs(currentPos[i * 3 + 1]) > bounds * 0.75) velocities[i].y *= -1;
          if (Math.abs(currentPos[i * 3 + 2]) > bounds * 0.5) velocities[i].z *= -1;

          // Connect nearby particles
          for (let j = i + 1; j < particleCount; j++) {
            const dx = currentPos[i * 3] - currentPos[j * 3];
            const dy = currentPos[i * 3 + 1] - currentPos[j * 3 + 1];
            const dz = currentPos[i * 3 + 2] - currentPos[j * 3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < connectionDist && vertexPos < maxConnections * 6) {
              const alpha = 1.0 - dist / connectionDist;

              // Line start
              linePositions[vertexPos++] = currentPos[i * 3];
              linePositions[vertexPos++] = currentPos[i * 3 + 1];
              linePositions[vertexPos++] = currentPos[i * 3 + 2];

              // Line end
              linePositions[vertexPos++] = currentPos[j * 3];
              linePositions[vertexPos++] = currentPos[j * 3 + 1];
              linePositions[vertexPos++] = currentPos[j * 3 + 2];

              // Line color gradient
              const r = isDarkMode ? 0.05 * alpha : 0.2 * alpha;
              const g = isDarkMode ? 0.75 * alpha : 0.5 * alpha;
              const b = isDarkMode ? 0.95 * alpha : 0.8 * alpha;

              lineColors[colorPos++] = r;
              lineColors[colorPos++] = g;
              lineColors[colorPos++] = b;

              lineColors[colorPos++] = r;
              lineColors[colorPos++] = g;
              lineColors[colorPos++] = b;
            }
          }
        }

        posAttr.needsUpdate = true;
        lineGeo.setDrawRange(0, vertexPos / 3);
        (lineGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (lineGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

        particleGroup.rotation.y += 0.0006 * speed;
        particleGroup.rotation.x += 0.0003 * speed;
      };

      cleanupCallbacks.push(() => {
        particleGeo.dispose();
        particleMat.dispose();
        particleTexture.dispose();
        lineGeo.dispose();
        lineMat.dispose();
      });

      // Register animation hook
      (scene as any)._animateHook = updateConstellation;
    }

    // -------------------------------------------------------------
    // MODE 2: FLOATING GEOMETRIC CRYSTALS & POLYHEDRONS
    // -------------------------------------------------------------
    else if (mode === 'polyhedrons') {
      const group = new THREE.Group();
      scene.add(group);

      const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.6 : 0.8);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(primaryColorHex, isDarkMode ? 1.5 : 1.0);
      dirLight.position.set(20, 30, 20);
      scene.add(dirLight);

      const dirLight2 = new THREE.DirectionalLight(secondaryColorHex, isDarkMode ? 1.2 : 0.8);
      dirLight2.position.set(-20, -20, 10);
      scene.add(dirLight2);

      const polyObjects: {
        mesh: THREE.Mesh;
        wireMesh: THREE.LineSegments;
        rotSpeed: { x: number; y: number; z: number };
        floatOffset: number;
        initialY: number;
      }[] = [];

      const geometries = [
        new THREE.IcosahedronGeometry(3.5, 0),
        new THREE.OctahedronGeometry(3.0, 0),
        new THREE.DodecahedronGeometry(3.2, 0),
        new THREE.TetrahedronGeometry(3.0, 0),
        new THREE.TorusGeometry(3.0, 1.0, 12, 24),
        new THREE.IcosahedronGeometry(2.5, 1),
      ];

      const count = Math.floor(14 * density);
      for (let i = 0; i < count; i++) {
        const geo = geometries[i % geometries.length];

        const mat = new THREE.MeshPhongMaterial({
          color: i % 2 === 0 ? primaryColorHex : secondaryColorHex,
          transparent: true,
          opacity: isDarkMode ? 0.22 : 0.14,
          shininess: 90,
          flatShading: true,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geo, mat);

        // Wireframe overlay for crisp high-tech look
        const wireGeo = new THREE.WireframeGeometry(geo);
        const wireMat = new THREE.LineBasicMaterial({
          color: i % 2 === 0 ? (isDarkMode ? 0x67e8f9 : 0x0284c7) : (isDarkMode ? 0x93c5fd : 0x6366f1),
          transparent: true,
          opacity: isDarkMode ? 0.55 : 0.35,
        });
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        mesh.add(wireMesh);

        const x = (Math.random() - 0.5) * 70;
        const y = (Math.random() - 0.5) * 45;
        const z = (Math.random() - 0.5) * 40 - 10;

        mesh.position.set(x, y, z);
        mesh.scale.setScalar(0.8 + Math.random() * 0.7);

        group.add(mesh);

        polyObjects.push({
          mesh,
          wireMesh,
          rotSpeed: {
            x: (Math.random() - 0.5) * 0.015 * speed,
            y: (Math.random() - 0.5) * 0.018 * speed,
            z: (Math.random() - 0.5) * 0.012 * speed,
          },
          floatOffset: Math.random() * Math.PI * 2,
          initialY: y,
        });
      }

      let time = 0;
      const updatePolyhedrons = () => {
        time += 0.015 * speed;
        polyObjects.forEach((p, idx) => {
          p.mesh.rotation.x += p.rotSpeed.x;
          p.mesh.rotation.y += p.rotSpeed.y;
          p.mesh.rotation.z += p.rotSpeed.z;
          p.mesh.position.y = p.initialY + Math.sin(time + p.floatOffset + idx) * 2.5;
        });
        group.rotation.y += 0.0004 * speed;
      };

      cleanupCallbacks.push(() => {
        geometries.forEach(g => g.dispose());
      });

      (scene as any)._animateHook = updatePolyhedrons;
    }

    // -------------------------------------------------------------
    // MODE 3: 3D DIGITAL DATA WAVE MESH
    // -------------------------------------------------------------
    else if (mode === 'waves') {
      const group = new THREE.Group();
      scene.add(group);

      const gridX = Math.floor(48 * density);
      const gridY = Math.floor(48 * density);
      const sizeX = 80;
      const sizeY = 80;

      const waveGeo = new THREE.PlaneGeometry(sizeX, sizeY, gridX, gridY);
      waveGeo.rotateX(-Math.PI / 2.3);

      const waveMat = new THREE.MeshBasicMaterial({
        color: isDarkMode ? 0x06b6d4 : 0x0284c7,
        wireframe: true,
        transparent: true,
        opacity: isDarkMode ? 0.35 : 0.22,
      });

      const waveMesh = new THREE.Mesh(waveGeo, waveMat);
      waveMesh.position.y = -8;
      group.add(waveMesh);

      // Add floating data nodes along the wave grid
      const dotCount = Math.floor(120 * density);
      const dotPositions = new Float32Array(dotCount * 3);
      for (let i = 0; i < dotCount; i++) {
        dotPositions[i * 3] = (Math.random() - 0.5) * sizeX;
        dotPositions[i * 3 + 1] = -7;
        dotPositions[i * 3 + 2] = (Math.random() - 0.5) * sizeY;
      }
      const dotGeo = new THREE.BufferGeometry();
      dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
      const dotMat = new THREE.PointsMaterial({
        color: isDarkMode ? 0x38bdf8 : 0x2563eb,
        size: 1.8,
        transparent: true,
        opacity: isDarkMode ? 0.7 : 0.5,
      });
      const dotPoints = new THREE.Points(dotGeo, dotMat);
      group.add(dotPoints);

      let waveTime = 0;
      const posArray = (waveGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const originalY = new Float32Array(posArray.length);
      for (let i = 0; i < posArray.length; i++) {
        originalY[i] = posArray[i];
      }

      const updateWaves = () => {
        waveTime += 0.025 * speed;
        const positions = (waveGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;

        for (let i = 0; i < positions.length; i += 3) {
          const x = positions[i];
          const z = positions[i + 2];
          // Harmonic wave equation
          positions[i + 1] =
            Math.sin(x * 0.15 + waveTime) * 2.8 +
            Math.cos(z * 0.18 + waveTime * 0.8) * 2.2 +
            Math.sin((x + z) * 0.08 + waveTime * 1.2) * 1.5;
        }
        (waveGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        group.rotation.y = Math.sin(waveTime * 0.1) * 0.08;
      };

      cleanupCallbacks.push(() => {
        waveGeo.dispose();
        waveMat.dispose();
        dotGeo.dispose();
        dotMat.dispose();
      });

      (scene as any)._animateHook = updateWaves;
    }

    // -------------------------------------------------------------
    // MODE 4: CYBERNETIC DATA VORTEX
    // -------------------------------------------------------------
    else if (mode === 'vortex') {
      const group = new THREE.Group();
      scene.add(group);

      const rings = 12;
      const particlesPerRing = Math.floor(35 * density);
      const totalParticles = rings * particlesPerRing;
      const vortexPositions = new Float32Array(totalParticles * 3);
      const vortexColors = new Float32Array(totalParticles * 3);

      let idx = 0;
      for (let r = 0; r < rings; r++) {
        const radius = 6 + r * 3.2;
        const zPos = (r - rings / 2) * 6;
        for (let p = 0; p < particlesPerRing; p++) {
          const angle = (p / particlesPerRing) * Math.PI * 2;
          vortexPositions[idx * 3] = Math.cos(angle) * radius;
          vortexPositions[idx * 3 + 1] = Math.sin(angle) * radius;
          vortexPositions[idx * 3 + 2] = zPos;

          const ratio = r / rings;
          vortexColors[idx * 3] = isDarkMode ? 0.1 + ratio * 0.1 : 0.1;
          vortexColors[idx * 3 + 1] = isDarkMode ? 0.7 - ratio * 0.2 : 0.5;
          vortexColors[idx * 3 + 2] = isDarkMode ? 0.9 : 0.8;
          idx++;
        }
      }

      const vortexGeo = new THREE.BufferGeometry();
      vortexGeo.setAttribute('position', new THREE.BufferAttribute(vortexPositions, 3));
      vortexGeo.setAttribute('color', new THREE.BufferAttribute(vortexColors, 3));

      const vortexMat = new THREE.PointsMaterial({
        size: isDarkMode ? 2.5 : 2.0,
        vertexColors: true,
        transparent: true,
        opacity: isDarkMode ? 0.75 : 0.55,
        blending: isDarkMode ? THREE.AdditiveBlending : THREE.NormalBlending,
      });

      const vortexPoints = new THREE.Points(vortexGeo, vortexMat);
      group.add(vortexPoints);

      let vortexTime = 0;
      const updateVortex = () => {
        vortexTime += 0.015 * speed;
        group.rotation.z += 0.003 * speed;
        group.rotation.x = Math.sin(vortexTime * 0.5) * 0.25;
        group.rotation.y = Math.cos(vortexTime * 0.4) * 0.25;
      };

      cleanupCallbacks.push(() => {
        vortexGeo.dispose();
        vortexMat.dispose();
      });

      (scene as any)._animateHook = updateVortex;
    }

    // -------------------------------------------------------------
    // Animation Render Loop
    // -------------------------------------------------------------
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera parallax
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      camera.position.x += (targetX * 25 - camera.position.x) * 0.03;
      camera.position.y += (-targetY * 25 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      if ((scene as any)._animateHook) {
        (scene as any)._animateHook();
      }

      renderer.render(scene, camera);
    };

    animate();

    // -------------------------------------------------------------
    // Resize Listener
    // -------------------------------------------------------------
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cleanupCallbacks.forEach(cb => cb());
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isEnabled, mode, speed, density, isDarkMode]);

  return (
    <>
      {/* 3D WebGL Canvas Viewport */}
      {isEnabled && (
        <div
          ref={containerRef}
          className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
          aria-hidden="true"
        />
      )}

      {/* Floating 3D Control Center Button (Bottom Right) */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="w-72 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl text-slate-800 dark:text-slate-100 text-xs space-y-3.5 mb-1"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">3D Dynamic Canvas</h3>
                    <p className="text-[10px] text-slate-400">Interactive WebGL Background</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {isEnabled && (
                <>
                  {/* Mode Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      3D Preset Mode
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'constellation', name: 'Constellation', icon: Orbit },
                          { id: 'polyhedrons', name: '3D Crystals', icon: Box },
                          { id: 'waves', name: 'Data Waves', icon: Waves },
                          { id: 'vortex', name: 'Cyber Vortex', icon: Sparkles },
                        ] as const
                      ).map(item => {
                        const Icon = item.icon;
                        const active = mode === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setMode(item.id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all ${
                              active
                                ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span>{item.name}</span>
                            {active && <Check className="h-3 w-3 ml-auto text-cyan-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Speed & Density Sliders */}
                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">Animation Speed:</span>
                      <span className="text-cyan-500 font-bold">{speed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />

                    <div className="flex items-center justify-between text-[11px] font-semibold pt-1">
                      <span className="text-slate-500 dark:text-slate-400">Particle Density:</span>
                      <span className="text-cyan-500 font-bold">{density.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.1"
                      value={density}
                      onChange={(e) => setDensity(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </>
              )}

              <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 text-center font-medium">
                Tip: Move your mouse to explore 3D parallax depth
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Pill Button */}
        <button
          type="button"
          onClick={() => setShowControls(!showControls)}
          className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-bold shadow-xl border backdrop-blur-md transition-all active:scale-95 ${
            showControls
              ? 'bg-cyan-600 text-white border-cyan-400 shadow-cyan-600/30'
              : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-cyan-500'
          }`}
          title="3D Background Animation Settings"
        >
          <Orbit className={`h-4 w-4 ${isEnabled ? 'text-cyan-400 animate-spin-slow' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">3D Universe</span>
          <span className="flex h-2 w-2 rounded-full bg-cyan-500" />
        </button>
      </div>
    </>
  );
};
