import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Camera, Check, X } from 'lucide-react';
import { PackedVehicle, PackedItem } from '../types/optimizer';

interface Props {
  vehicle: PackedVehicle;
  colorMap: Record<string, string>;
  onSnapshotTaken?: (dataUrl: string) => void;
  theme?: 'dark' | 'light';
}

function createTextSprite(text: string, color: string, bgColor: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite();

  // Background rounded box
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 96, 24);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 96, 24);
  ctx.stroke();

  // Text label
  ctx.fillStyle = color;
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(130, 32.5, 1);
  return sprite;
}

export const ThreeDViewer: React.FC<Props> = ({ 
  vehicle, 
  colorMap, 
  onSnapshotTaken,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const itemsGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const [hoveredItem, setHoveredItem] = useState<{
    item: PackedItem;
    screenPos: { x: number; y: number };
  } | null>(null);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  const { container, items, usedLength, remainingLength } = vehicle;

  useEffect(() => {
    const containerEl = mountRef.current;
    if (!containerEl) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isLight ? 0xf1f5f9 : 0x0f172a);
    sceneRef.current = scene;

    // Camera
    const aspect = containerEl.clientWidth / containerEl.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 10, 20000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 0.9 : 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, isLight ? 1.4 : 1.2);
    dirLight1.position.set(container.L * 0.8, container.H * 2.5, container.W * 1.5);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    const d = Math.max(container.L, container.W, container.H) * 1.2;
    dirLight1.shadow.camera.left = -d;
    dirLight1.shadow.camera.right = d;
    dirLight1.shadow.camera.top = d;
    dirLight1.shadow.camera.bottom = -d;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, isLight ? 0.8 : 0.6);
    dirLight2.position.set(-container.L * 0.5, container.H * 1.5, -container.W);
    scene.add(dirLight2);

    const offsetX = -container.L / 2;
    const offsetZ = -container.W / 2;

    // Floor Grid & Ground
    const gridColor1 = isLight ? 0x94a3b8 : 0x475569;
    const gridColor2 = isLight ? 0xcbd5e1 : 0x1e293b;
    const gridHelper = new THREE.GridHelper(Math.max(container.L, container.W) * 1.5, 40, gridColor1, gridColor2);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Container Group
    const containerGroup = new THREE.Group();

    // Floor Mesh
    const floorGeo = new THREE.PlaneGeometry(container.L, container.W);
    const floorMat = new THREE.MeshStandardMaterial({
      color: isLight ? 0xe2e8f0 : 0x1e293b,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    containerGroup.add(floorMesh);

    // Wireframe Box for container
    const boxGeo = new THREE.BoxGeometry(container.L, container.H, container.W);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxLines = new THREE.LineSegments(
      boxEdges,
      new THREE.LineBasicMaterial({ color: isLight ? 0x475569 : 0x94a3b8, linewidth: 2 })
    );
    boxLines.position.set(0, container.H / 2, 0);
    containerGroup.add(boxLines);

    // Front Truck Cab Indicator
    const cabGeo = new THREE.BoxGeometry(40, container.H * 0.8, container.W);
    const cabMat = new THREE.MeshBasicMaterial({ color: isLight ? 0x94a3b8 : 0x334155, wireframe: true });
    const cabMesh = new THREE.Mesh(cabGeo, cabMat);
    cabMesh.position.set(offsetX - 20, container.H * 0.4, 0);
    containerGroup.add(cabMesh);

    scene.add(containerGroup);

    // Items Group
    const itemsGroup = new THREE.Group();
    itemsGroupRef.current = itemsGroup;

    items.forEach(item => {
      const [w, h, d] = item.dimension;
      const [px, py, pz] = item.position;

      const itemGeo = new THREE.BoxGeometry(w, d, h);
      const itemColor = new THREE.Color(item.color || colorMap[item.originalRef] || '#3b82f6');

      const itemMat = new THREE.MeshStandardMaterial({
        color: itemColor,
        roughness: 0.35,
        metalness: 0.1,
      });

      const mesh = new THREE.Mesh(itemGeo, itemMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const centerX = offsetX + px + w / 2;
      const centerY = pz + d / 2;
      const centerZ = offsetZ + py + h / 2;

      mesh.position.set(centerX, centerY, centerZ);
      mesh.userData = { item };

      // Solid black edge wireframe
      const edges = new THREE.EdgesGeometry(itemGeo);
      const edgeLine = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 })
      );
      mesh.add(edgeLine);

      itemsGroup.add(mesh);
    });

    scene.add(itemsGroup);

    // Floating Measurement Lines - elevated well above ceiling and grid
    const zCeil = container.H * 1.28;
    const measurementZ = offsetZ - container.W * 0.05;

    if (usedLength > 0) {
      // Solid Blue Line: Used Length
      const usedPts = [
        new THREE.Vector3(offsetX, zCeil, measurementZ),
        new THREE.Vector3(offsetX + usedLength, zCeil, measurementZ),
      ];
      const usedGeo = new THREE.BufferGeometry().setFromPoints(usedPts);
      const usedMat = new THREE.LineBasicMaterial({ color: 0x2563eb, linewidth: 6 });
      const usedLine = new THREE.Line(usedGeo, usedMat);
      scene.add(usedLine);

      const marker1 = new THREE.Mesh(
        new THREE.SphereGeometry(6, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x2563eb })
      );
      marker1.position.copy(usedPts[0]);
      scene.add(marker1);

      const marker2 = new THREE.Mesh(
        new THREE.SphereGeometry(6, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x2563eb })
      );
      marker2.position.copy(usedPts[1]);
      scene.add(marker2);

      // Elevated 3D Sprite Label
      const usedSprite = createTextSprite(
        `Used: ${usedLength.toFixed(1)} cm`,
        isLight ? '#1d4ed8' : '#60a5fa',
        isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)'
      );
      usedSprite.position.set(offsetX + usedLength / 2, zCeil + 30, measurementZ);
      scene.add(usedSprite);
    }

    if (remainingLength > 0 && usedLength > 0) {
      // Dashed Green Line: Remaining Space
      const remPts = [
        new THREE.Vector3(offsetX + usedLength, zCeil, measurementZ),
        new THREE.Vector3(offsetX + container.L, zCeil, measurementZ),
      ];
      const remGeo = new THREE.BufferGeometry().setFromPoints(remPts);
      const remMat = new THREE.LineDashedMaterial({
        color: 0x16a34a,
        dashSize: 20,
        gapSize: 10,
        linewidth: 4,
      });
      const remLine = new THREE.Line(remGeo, remMat);
      remLine.computeLineDistances();
      scene.add(remLine);

      const marker3 = new THREE.Mesh(
        new THREE.SphereGeometry(6, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x16a34a })
      );
      marker3.position.copy(remPts[1]);
      scene.add(marker3);

      // Elevated 3D Sprite Label
      const remSprite = createTextSprite(
        `Remaining: ${remainingLength.toFixed(1)} cm`,
        isLight ? '#15803d' : '#4ade80',
        isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)'
      );
      remSprite.position.set(offsetX + usedLength + remainingLength / 2, zCeil + 30, measurementZ);
      scene.add(remSprite);
    }

    // Default Camera Angle
    camera.position.set(container.L * 0.9, container.H * 1.6, container.W * 2.2);
    controls.target.set(0, container.H * 0.4, 0);
    controls.update();

    // Resize
    const handleResize = () => {
      if (!containerEl || !renderer || !camera) return;
      const w = containerEl.clientWidth;
      const h = containerEl.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Mouse Move Raycaster
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerEl.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      if (itemsGroupRef.current) {
        const intersects = raycasterRef.current.intersectObjects(itemsGroupRef.current.children, false);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          if (hit.userData && hit.userData.item) {
            setHoveredItem({
              item: hit.userData.item,
              screenPos: { x: e.clientX - rect.left, y: e.clientY - rect.top },
            });
            return;
          }
        }
      }
      setHoveredItem(null);
    };

    containerEl.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      containerEl.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement && containerEl.contains(renderer.domElement)) {
        containerEl.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [vehicle, colorMap, isLight]);

  const resetCamera = (type: 'iso' | 'top' | 'side' | 'rear') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const d = Math.max(container.L, container.W, container.H);

    controls.target.set(0, container.H * 0.4, 0);

    if (type === 'iso') {
      camera.position.set(container.L * 0.9, container.H * 1.6, container.W * 2.2);
    } else if (type === 'top') {
      camera.position.set(0, d * 2.2, 0.1);
    } else if (type === 'side') {
      camera.position.set(0, container.H * 0.5, container.W * 2.6);
    } else if (type === 'rear') {
      camera.position.set(container.L * 1.8, container.H * 0.5, 0);
    }
    controls.update();
  };

  const handleCaptureSnapshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `3d-cargo-view-${vehicle.name.replace(/\s+/g, '_')}.png`;
    a.click();

    if (onSnapshotTaken) {
      onSnapshotTaken(dataUrl);
    }

    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 3000);
  };

  return (
    <div className={`relative w-full h-[540px] rounded-xl overflow-hidden border shadow-xl select-none transition-colors ${
      isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950 border-slate-800'
    }`}>
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Measurement Overlay Badge */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none z-10">
        <div className="px-3 py-1.5 rounded-lg bg-blue-600/90 text-white text-xs font-semibold shadow-lg flex items-center gap-2 backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
          Used Length: {usedLength.toFixed(1)} cm
        </div>
        {remainingLength > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-600/90 text-white text-xs font-semibold shadow-lg flex items-center gap-2 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
            Remaining Space: {remainingLength.toFixed(1)} cm
          </div>
        )}
        <div className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg backdrop-blur-md border ${
          isLight ? 'bg-white/85 text-slate-800 border-slate-300' : 'bg-slate-900/80 text-slate-300 border-slate-700'
        }`}>
          {items.length} units packed
        </div>
      </div>

      {/* Camera View Controls Toolbar */}
      <div className={`absolute top-3 right-3 flex items-center gap-1.5 z-10 backdrop-blur-md p-1.5 rounded-xl border shadow-xl ${
        isLight ? 'bg-white/90 border-slate-300 text-slate-800' : 'bg-slate-900/85 border-slate-700 text-slate-200'
      }`}>
        <button
          onClick={() => resetCamera('iso')}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
            isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="Perspective View"
        >
          3D Iso
        </button>
        <button
          onClick={() => resetCamera('top')}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
            isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="Roof Top View"
        >
          Top Plan
        </button>
        <button
          onClick={() => resetCamera('side')}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
            isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="Side View"
        >
          Side
        </button>
        <button
          onClick={() => resetCamera('rear')}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
            isLight ? 'hover:bg-slate-200 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="Rear Door View"
        >
          Rear Doors
        </button>
        <div className={`w-[1px] h-4 mx-1 ${isLight ? 'bg-slate-300' : 'bg-slate-700'}`} />
        <button
          onClick={handleCaptureSnapshot}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-md"
          title="Capture PNG screenshot for PDF report"
        >
          <Camera className="w-3.5 h-3.5" />
          {snapshotSuccess ? 'Saved!' : 'Capture PNG'}
        </button>
      </div>

      {/* Mouse Navigation Hint */}
      <div className={`absolute bottom-3 left-3 text-[11px] backdrop-blur-md px-3 py-1 rounded-md border pointer-events-none ${
        isLight ? 'bg-white/80 border-slate-300 text-slate-600' : 'bg-slate-900/80 border-slate-800 text-slate-400'
      }`}>
        🖱️ Left Click: Rotate | Right Click / Two-finger: Pan | Wheel: Zoom
      </div>

      {/* Hover Tooltip */}
      {hoveredItem && (
        <div
          className={`absolute z-20 pointer-events-none p-3 rounded-xl shadow-2xl text-xs backdrop-blur-md min-w-[210px] border ${
            isLight ? 'bg-white/95 border-slate-300 text-slate-900' : 'bg-slate-900/95 border-slate-700 text-white'
          }`}
          style={{
            left: Math.min(hoveredItem.screenPos.x + 15, (mountRef.current?.clientWidth || 300) - 230),
            top: Math.max(hoveredItem.screenPos.y - 10, 10),
          }}
        >
          <div className="font-bold text-sm text-blue-500 mb-1 flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full inline-block shrink-0"
              style={{ backgroundColor: hoveredItem.item.color }}
            />
            <span className="truncate">{hoveredItem.item.name}</span>
          </div>
          <div className={`space-y-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            <div>
              <span className="text-slate-400">Dimensions:</span>{' '}
              <b>{hoveredItem.item.dimension[0]} x {hoveredItem.item.dimension[1]} x {hoveredItem.item.dimension[2]} cm</b>
            </div>
            <div>
              <span className="text-slate-400">Weight:</span> <b>{hoveredItem.item.weight} kg</b>
            </div>
            <div>
              <span className="text-slate-400">Position:</span> X={hoveredItem.item.position[0]}, Y={hoveredItem.item.position[1]}, Z={hoveredItem.item.position[2]}
            </div>
            <div className="flex items-center gap-1 mt-1 pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400">Stackable:</span>{' '}
              {hoveredItem.item.stackable ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium"><Check className="w-3 h-3" /> Yes</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5 font-medium"><X className="w-3 h-3" /> No (Protected Overhead)</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
