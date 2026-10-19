import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  Hammer,
  Pickaxe,
  RotateCcw,
  Sun,
  Moon,
  Sunset,
  Compass,
  Sparkles,
  Trash2,
  Map,
  Check,
  Lock,
  Move,
} from 'lucide-react';
import { BlockId, PlacedBlock, PlayerState, WorldExpansionTier } from '../types/game';
import { BLOCK_CATALOG, BLUEPRINTS, WORLD_EXPANSION_TIERS } from '../data/catalog';
import { BlockCubeIcon } from './PixelVisuals';
import { sound } from '../utils/sound';

interface VoxelWorldProps {
  state: PlayerState;
  onUpdateWorld: (placedBlocks: PlacedBlock[], blocksInventory: Record<BlockId, number>) => void;
  onUpdateState: (partial: Partial<PlayerState>) => void;
}

// Procedural 16x16 Minecraft-style Pixel Texture Generator
function createPixelBlockTexture(blockId: BlockId, isTopFace = false): THREE.CanvasTexture {
  const meta = BLOCK_CATALOG[blockId] || BLOCK_CATALOG.grass;
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;

  const baseColor = isTopFace ? meta.topColor : meta.sideColor;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 16, 16);

  // Add pixel noise speckles
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if ((x * 7 + y * 13) % 5 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.09)';
        ctx.fillRect(x, y, 1, 1);
      } else if ((x * 11 + y * 3) % 7 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Block-specific pixel patterns
  if (blockId === 'grass' && !isTopFace) {
    ctx.fillStyle = meta.topColor;
    ctx.fillRect(0, 0, 16, 4);
    for (let x = 0; x < 16; x += 2) {
      ctx.fillRect(x, 4, 1, (x % 4) + 1);
    }
  } else if (blockId === 'brick') {
    ctx.fillStyle = '#d6ccc2';
    for (let y = 3; y < 16; y += 4) {
      ctx.fillRect(0, y, 16, 1);
      const offset = (y / 4) % 2 === 0 ? 0 : 4;
      for (let x = offset; x < 16; x += 8) {
        ctx.fillRect(x, y - 3, 1, 3);
      }
    }
  } else if (blockId === 'oak_planks') {
    ctx.fillStyle = meta.accentColor;
    ctx.fillRect(0, 3, 16, 1);
    ctx.fillRect(0, 7, 16, 1);
    ctx.fillRect(0, 11, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
  } else if (blockId === 'oak_wood' && !isTopFace) {
    ctx.fillStyle = meta.accentColor;
    for (let x = 2; x < 16; x += 4) {
      ctx.fillRect(x, 0, 2, 16);
    }
  } else if (blockId === 'glass') {
    ctx.clearRect(2, 2, 12, 12);
    ctx.fillStyle = 'rgba(168, 230, 240, 0.35)';
    ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 3, 3, 1);
    ctx.fillRect(3, 4, 1, 3);
    ctx.fillRect(11, 11, 2, 2);
  } else if (blockId === 'tnt' && !isTopFace) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 5, 16, 6);
    ctx.fillStyle = '#111827';
    ctx.fillRect(3, 6, 2, 4);
    ctx.fillRect(7, 6, 2, 4);
    ctx.fillRect(11, 6, 2, 4);
  } else if (blockId === 'bookshelf' && !isTopFace) {
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(1, 2, 14, 5);
    ctx.fillRect(1, 9, 14, 5);
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(2 + i * 2, 3, 2, 4);
      ctx.fillStyle = colors[(i + 2) % colors.length];
      ctx.fillRect(2 + i * 2, 10, 2, 4);
    }
  }

  // Crisp pixel border
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, 15, 15);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const VoxelWorld: React.FC<VoxelWorldProps> = ({
  state,
  onUpdateWorld,
  onUpdateState,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockId>('oak_planks');
  const [toolMode, setToolMode] = useState<'build' | 'mine'>('build');
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'sunset' | 'night'>('day');
  const [activeBlueprintId, setActiveBlueprintId] = useState<string>('');
  const [expandModalOpen, setExpandModalOpen] = useState<boolean>(false);

  // Camera orbit + pan target
  const [cameraAngle, setCameraAngle] = useState<number>(Math.PI / 4);
  const [cameraPitch, setCameraPitch] = useState<number>(0.62);
  const [cameraDist, setCameraDist] = useState<number>(16);
  const [panTarget, setPanTarget] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [toastMsg, setToastMsg] = useState<string>('');

  const worldSizeLevel = state.worldSizeLevel || 1;
  const currentTier: WorldExpansionTier =
    WORLD_EXPANSION_TIERS.find((t) => t.level === worldSizeLevel) || WORLD_EXPANSION_TIERS[0];
  const nextTier: WorldExpansionTier | undefined = WORLD_EXPANSION_TIERS.find(
    (t) => t.level === worldSizeLevel + 1
  );

  // Keep latest refs for Three.js event handlers
  const stateRef = useRef(state);
  stateRef.current = state;
  const currentTierRef = useRef(currentTier);
  currentTierRef.current = currentTier;
  const selectedBlockRef = useRef(selectedBlock);
  selectedBlockRef.current = selectedBlock;
  const toolModeRef = useRef(toolMode);
  toolModeRef.current = toolMode;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const blocksGroupRef = useRef<THREE.Group | null>(null);
  const blueprintGroupRef = useRef<THREE.Group | null>(null);
  const materialsCacheRef = useRef<Record<string, THREE.Material | THREE.Material[]>>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 2600);
  };

  // Get or create cached Three.js material for a blockId
  const getBlockMaterial = (blockId: BlockId) => {
    if (materialsCacheRef.current[blockId]) {
      return materialsCacheRef.current[blockId];
    }
    const meta = BLOCK_CATALOG[blockId] || BLOCK_CATALOG.grass;
    const topTex = createPixelBlockTexture(blockId, true);
    const sideTex = createPixelBlockTexture(blockId, false);

    const commonProps: THREE.MeshLambertMaterialParameters = {
      transparent: Boolean(meta.transparent),
      opacity: meta.transparent ? 0.78 : 1.0,
      emissive: meta.emissive ? new THREE.Color('#f59e0b') : new THREE.Color('#000000'),
      emissiveIntensity: meta.emissive ? 0.65 : 0,
    };

    const sideMat = new THREE.MeshLambertMaterial({ ...commonProps, map: sideTex });
    const topMat = new THREE.MeshLambertMaterial({ ...commonProps, map: topTex });

    const matArray = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    materialsCacheRef.current[blockId] = matArray;
    return matArray;
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#7dd3fc');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      260
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Ambient + Directional Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    ambientLight.name = 'ambientLight';
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.1);
    dirLight.name = 'dirLight';
    dirLight.position.set(20, 35, 24);
    scene.add(dirLight);

    // Groups
    const blocksGroup = new THREE.Group();
    scene.add(blocksGroup);
    blocksGroupRef.current = blocksGroup;

    const blueprintGroup = new THREE.Group();
    scene.add(blueprintGroup);
    blueprintGroupRef.current = blueprintGroup;

    // Pointer interaction (Support touch drag to rotate + tap to place/remove block)
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let movedDistance = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tempMatrix = new THREE.Matrix4();
    const hitBlockPos = new THREE.Vector3();

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      movedDistance = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      movedDistance += Math.abs(dx) + Math.abs(dy);
      startX = e.clientX;
      startY = e.clientY;

      if (movedDistance > 6) {
        setCameraAngle((prev) => prev - dx * 0.008);
        setCameraPitch((prev) => Math.max(0.22, Math.min(1.38, prev + dy * 0.006)));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;

      // If pointer barely moved, treat as a Tap / Click to place or mine block!
      if (movedDistance < 12) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(blocksGroup.children, false);

        if (intersects.length > 0) {
          const hit = intersects[0];
          const hitObj = hit.object;
          const isTerrainBase = Boolean(hitObj.userData.isBaseTerrain);
          const curState = stateRef.current;
          const tier = currentTierRef.current;
          const halfRadius = Math.floor(tier.size / 2);

          // Extract exact coordinate of the hit block (supports both InstancedMesh and regular Mesh)
          if (hitObj instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
            hitObj.getMatrixAt(hit.instanceId, tempMatrix);
            hitBlockPos.setFromMatrixPosition(tempMatrix);
          } else {
            hitBlockPos.copy(hitObj.position);
          }

          if (toolModeRef.current === 'mine') {
            if (isTerrainBase) {
              showToast('⛏️ 地基草坪不能挖穿哦！试试挖上面的建筑方块吧！');
              return;
            }
            const bx = Math.round(hitBlockPos.x);
            const by = Math.round(hitBlockPos.y);
            const bz = Math.round(hitBlockPos.z);
            const bType = hitObj.userData.blockType as BlockId;

            const nextPlaced = curState.placedBlocks.filter(
              (b) => !(b.x === bx && b.y === by && b.z === bz)
            );
            const nextInv = {
              ...curState.blocksInventory,
              [bType]: (curState.blocksInventory[bType] || 0) + 1,
            };
            sound.playBreakBlock();
            onUpdateWorld(nextPlaced, nextInv);
          } else {
            // Build mode: place block on the hit normal face
            if (!hit.face) return;
            const targetPos = hitBlockPos.clone().add(hit.face.normal);
            const tx = Math.round(targetPos.x);
            const ty = Math.round(targetPos.y);
            const tz = Math.round(targetPos.z);

            if (Math.abs(tx) > halfRadius || Math.abs(tz) > halfRadius || ty < 1 || ty > tier.maxHeight) {
              showToast(
                `🚧 超出当前【${tier.name} (${tier.size}×${tier.size}，限高${tier.maxHeight}层)】边界！点上方「🗺️ 领地扩建」可扩大世界！`
              );
              return;
            }

            const chosenBlock = selectedBlockRef.current;
            const available = curState.blocksInventory[chosenBlock] || 0;
            if (available <= 0) {
              showToast(
                `🎒 【${BLOCK_CATALOG[chosenBlock].name}】用完啦！快去写一点作业拍照领方块吧！`
              );
              sound.playClick();
              return;
            }

            // Avoid duplicate block at same coordinate
            const exists = curState.placedBlocks.some((b) => b.x === tx && b.y === ty && b.z === tz);
            if (exists) return;

            const nextPlaced = [...curState.placedBlocks, { x: tx, y: ty, z: tz, type: chosenBlock }];
            const nextInv = {
              ...curState.blocksInventory,
              [chosenBlock]: available - 1,
            };
            sound.playPlaceBlock();
            onUpdateWorld(nextPlaced, nextInv);
          }
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Camera Position when angle, pitch, distance, or panTarget changes
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const x = panTarget.x + cameraDist * Math.cos(cameraPitch) * Math.sin(cameraAngle);
    const y = cameraDist * Math.sin(cameraPitch) + 1.5;
    const z = panTarget.z + cameraDist * Math.cos(cameraPitch) * Math.cos(cameraAngle);
    camera.position.set(x, y, z);
    camera.lookAt(panTarget.x, 1.5, panTarget.z);
  }, [cameraAngle, cameraPitch, cameraDist, panTarget]);

  // Update Day / Sunset / Night Lighting
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const ambient = scene.getObjectByName('ambientLight') as THREE.AmbientLight | undefined;
    const dir = scene.getObjectByName('dirLight') as THREE.DirectionalLight | undefined;

    if (timeOfDay === 'day') {
      scene.background = new THREE.Color('#7dd3fc');
      if (ambient) ambient.intensity = 0.9;
      if (dir) {
        dir.intensity = 1.1;
        dir.color.set('#fffbeb');
      }
    } else if (timeOfDay === 'sunset') {
      scene.background = new THREE.Color('#fb923c');
      if (ambient) ambient.intensity = 0.65;
      if (dir) {
        dir.intensity = 0.95;
        dir.color.set('#fde047');
      }
    } else {
      scene.background = new THREE.Color('#0f172a');
      if (ambient) ambient.intensity = 0.35;
      if (dir) {
        dir.intensity = 0.35;
        dir.color.set('#818cf8');
      }
    }
  }, [timeOfDay]);

  // Rebuild 3D Blocks Mesh whenever placedBlocks or worldSizeLevel changes
  // Uses THREE.InstancedMesh for the base terrain so even 99x99 (9,801 blocks!) renders in 1 single draw call at 60 FPS!
  useEffect(() => {
    const blocksGroup = blocksGroupRef.current;
    if (!blocksGroup) return;

    while (blocksGroup.children.length > 0) {
      blocksGroup.remove(blocksGroup.children[0]);
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const halfRadius = Math.floor(currentTier.size / 2);
    const totalGroundBlocks = currentTier.size * currentTier.size;

    // 1. Base Grass Terrain Platform via InstancedMesh (1 draw call for up to 9,801 blocks!)
    const grassMat = getBlockMaterial('grass');
    const groundInstanced = new THREE.InstancedMesh(boxGeo, grassMat, totalGroundBlocks);
    groundInstanced.userData = { isBaseTerrain: true, blockType: 'grass' };

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let x = -halfRadius; x <= halfRadius; x++) {
      for (let z = -halfRadius; z <= halfRadius; z++) {
        dummy.position.set(x, 0, z);
        dummy.updateMatrix();
        groundInstanced.setMatrixAt(idx++, dummy.matrix);
      }
    }
    groundInstanced.instanceMatrix.needsUpdate = true;
    groundInstanced.computeBoundingSphere();
    blocksGroup.add(groundInstanced);

    // 2. Player's Placed Blocks (y >= 1)
    let pointLightCount = 0;
    state.placedBlocks.forEach((b) => {
      const mat = getBlockMaterial(b.type);
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(b.x, b.y, b.z);
      mesh.userData = { isBaseTerrain: false, blockType: b.type };
      blocksGroup.add(mesh);

      // Cap real dynamic PointLights at 8 to keep WebGL shader uniform limits safe on iPad
      if (BLOCK_CATALOG[b.type]?.emissive && pointLightCount < 8) {
        pointLightCount++;
        const light = new THREE.PointLight(0xfde047, 1.8, 7);
        light.position.set(b.x, b.y + 0.2, b.z);
        blocksGroup.add(light);
      }
    });
  }, [state.placedBlocks, currentTier.size]);

  // Render Blueprint Ghost Guide Blocks
  useEffect(() => {
    const bpGroup = blueprintGroupRef.current;
    if (!bpGroup) return;
    while (bpGroup.children.length > 0) {
      bpGroup.remove(bpGroup.children[0]);
    }

    if (!activeBlueprintId) return;
    const bp = BLUEPRINTS.find((item) => item.id === activeBlueprintId);
    if (!bp) return;

    const ghostGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);
    bp.blocks.forEach((b) => {
      const alreadyPlaced = state.placedBlocks.some(
        (p) => p.x === b.x && p.y === b.y && p.z === b.z
      );
      if (alreadyPlaced) return;

      const meta = BLOCK_CATALOG[b.type];
      const ghostMat = new THREE.MeshBasicMaterial({
        color: meta.topColor,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      });
      const ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
      ghostMesh.position.set(b.x, b.y, b.z);
      bpGroup.add(ghostMesh);
    });
  }, [activeBlueprintId, state.placedBlocks]);

  // Pan Camera Target helper for roaming across large worlds
  const handlePanCamera = (dir: 'up' | 'down' | 'left' | 'right' | 'center') => {
    sound.playClick();
    if (dir === 'center') {
      setPanTarget({ x: 0, z: 0 });
      return;
    }
    const step = Math.max(3, Math.round(currentTier.size / 8));
    const halfRadius = Math.floor(currentTier.size / 2);
    setPanTarget((prev) => {
      let nx = prev.x;
      let nz = prev.z;
      if (dir === 'up') nz -= step;
      if (dir === 'down') nz += step;
      if (dir === 'left') nx -= step;
      if (dir === 'right') nx += step;
      return {
        x: Math.max(-halfRadius, Math.min(halfRadius, nx)),
        z: Math.max(-halfRadius, Math.min(halfRadius, nz)),
      };
    });
  };

  // Unlock / Upgrade World Territory Tier!
  const handleExpandTerritory = (tier: WorldExpansionTier) => {
    if (tier.level <= worldSizeLevel) return;

    if (state.level < tier.requiredPlayerLevel) {
      sound.playClick();
      showToast(
        `🔒 需要达到 Lv.${tier.requiredPlayerLevel} 才能解锁【${tier.name}】哦！多写一点作业赚经验升级吧！`
      );
      return;
    }

    if (state.emeralds < tier.costEmeralds) {
      sound.playClick();
      showToast(
        `💎 绿宝石还差 ${tier.costEmeralds - state.emeralds} 颗才能扩建到【${tier.name}】哦！`
      );
      return;
    }

    // Grant bonus blocks included in this expansion tier
    const nextBlocksInv = { ...state.blocksInventory };
    for (const [bId, qty] of Object.entries(tier.bonusBlocks)) {
      if (qty) {
        const key = bId as BlockId;
        nextBlocksInv[key] = (nextBlocksInv[key] || 0) + qty;
      }
    }

    sound.playChestFanfare();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    const announce = `太厉害啦！你的方块领地已扩建为 ${tier.name}，面积达到 ${tier.size} 乘 ${tier.size}！还收到了扩建贺礼方块大礼包！`;
    sound.speak(announce);
    showToast(`🎉 扩建成功！欢迎来到 ${tier.size}×${tier.size} 的【${tier.name}】！`);

    // Adjust camera distance slightly so the kid sees the bigger island
    setCameraDist((d) => Math.max(d, Math.min(48, Math.round(tier.size * 0.9))));

    onUpdateState({
      worldSizeLevel: tier.level,
      emeralds: state.emeralds - tier.costEmeralds,
      blocksInventory: nextBlocksInv,
    });
    setExpandModalOpen(false);
  };

  // Helper: Auto-place next blueprint block using inventory
  const handleAutoBuildStep = () => {
    if (!activeBlueprintId) return;
    const bp = BLUEPRINTS.find((item) => item.id === activeBlueprintId);
    if (!bp) return;

    const nextMissing = bp.blocks.find(
      (b) => !state.placedBlocks.some((p) => p.x === b.x && p.y === b.y && p.z === b.z)
    );
    if (!nextMissing) {
      showToast('🎉 太棒啦！这个蓝图建筑已经全部搭建完成啦！');
      sound.playChestFanfare();
      return;
    }

    const haveCount = state.blocksInventory[nextMissing.type] || 0;
    if (haveCount <= 0) {
      showToast(
        `🎒 还需要【${BLOCK_CATALOG[nextMissing.type].name}】！快去写作业开宝箱或去村民商店兑换吧！`
      );
      sound.playClick();
      return;
    }

    const nextPlaced = [...state.placedBlocks, nextMissing];
    const nextInv = {
      ...state.blocksInventory,
      [nextMissing.type]: haveCount - 1,
    };
    sound.playPlaceBlock();
    onUpdateWorld(nextPlaced, nextInv);
  };

  // Clear all placed blocks and return them to inventory
  const handleRecallAllBlocks = () => {
    if (state.placedBlocks.length === 0) return;
    const nextInv = { ...state.blocksInventory };
    state.placedBlocks.forEach((b) => {
      nextInv[b.type] = (nextInv[b.type] || 0) + 1;
    });
    sound.playBreakBlock();
    onUpdateWorld([], nextInv);
    showToast('🎒 所有建筑方块已全部收回背包，可以重新自由搭建啦！');
  };

  const activeBlueprint = BLUEPRINTS.find((b) => b.id === activeBlueprintId);

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden relative">
      {/* Left / Main 3D Viewport */}
      <div className="flex-1 relative bg-sky-300 min-h-[340px]">
        <div ref={mountRef} className="w-full h-full cursor-pointer touch-none" />

        {/* Top Floating Controls Overlay */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Left Group: Build/Mine Mode + Territory Expansion Button */}
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md p-1.5 rounded-xl border-2 border-white/20">
              <button
                onClick={() => {
                  sound.playClick();
                  setToolMode('build');
                }}
                className={`px-3 py-2 rounded-lg font-black text-xs sm:text-sm flex items-center gap-1.5 transition ${
                  toolMode === 'build'
                    ? 'bg-lime-500 text-zinc-950 shadow-mc'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Hammer className="w-4 h-4" />
                <span>🧱 放置方块</span>
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setToolMode('mine');
                }}
                className={`px-3 py-2 rounded-lg font-black text-xs sm:text-sm flex items-center gap-1.5 transition ${
                  toolMode === 'mine'
                    ? 'bg-amber-400 text-zinc-950 shadow-mc'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Pickaxe className="w-4 h-4" />
                <span>⛏️ 敲掉回收</span>
              </button>
            </div>

            {/* Territory Size & Upgrade Button */}
            <button
              onClick={() => {
                sound.playClick();
                setExpandModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-zinc-950 font-black text-xs sm:text-sm border-2 border-black shadow-mc flex items-center gap-1.5"
            >
              <Map className="w-4 h-4" />
              <span>
                🗺️ 领地：{currentTier.name} ({currentTier.size}×{currentTier.size})
              </span>
              {nextTier && (
                <span className="px-1.5 py-0.5 rounded bg-black text-lime-300 text-[10px]">
                  可扩建 ⬆
                </span>
              )}
            </button>
          </div>

          {/* Right Group: Camera Orbit, Zoom & Time of Day */}
          <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md p-1.5 rounded-xl border-2 border-white/20 pointer-events-auto">
            <button
              onClick={() => setCameraAngle((a) => a - 0.45)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
              title="向左旋转视角"
            >
              ⟲ 左转
            </button>
            <button
              onClick={() => setCameraAngle((a) => a + 0.45)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
              title="向右旋转视角"
            >
              右转 ⟳
            </button>
            <button
              onClick={() => setCameraDist((d) => Math.max(8, d - 3))}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
            >
              ＋拉近
            </button>
            <button
              onClick={() => setCameraDist((d) => Math.min(85, d + 4))}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
            >
              －拉远
            </button>

            <div className="h-5 w-0.5 bg-white/20 mx-0.5" />

            <button
              onClick={() => {
                sound.playClick();
                setTimeOfDay((t) => (t === 'day' ? 'sunset' : t === 'sunset' ? 'night' : 'day'));
              }}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-amber-300 text-xs font-bold flex items-center gap-1"
            >
              {timeOfDay === 'day' && <Sun className="w-4 h-4" />}
              {timeOfDay === 'sunset' && <Sunset className="w-4 h-4" />}
              {timeOfDay === 'night' && <Moon className="w-4 h-4" />}
              <span>
                {timeOfDay === 'day' ? '白天' : timeOfDay === 'sunset' ? '黄昏' : '夜晚'}
              </span>
            </button>
          </div>
        </div>

        {/* Toast Alert Banner */}
        {toastMsg && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-black/90 border-2 border-amber-400 text-amber-200 px-4 py-2 rounded-xl font-black text-sm shadow-lg animate-bounce pointer-events-none text-center max-w-lg">
            {toastMsg}
          </div>
        )}

        {/* Bottom-Left Camera Pan D-Pad for Roaming Large Worlds */}
        <div className="absolute bottom-14 left-3 bg-black/70 backdrop-blur-sm p-2 rounded-2xl border-2 border-white/20 flex items-center gap-1.5 pointer-events-auto">
          <div className="text-[11px] font-black text-lime-300 px-1 flex items-center gap-1">
            <Move className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">漫游视野:</span>
          </div>
          <button
            onClick={() => handlePanCamera('left')}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-black text-xs"
            title="视野左移"
          >
            ⬅️
          </button>
          <button
            onClick={() => handlePanCamera('up')}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-black text-xs"
            title="视野前移"
          >
            ⬆️
          </button>
          <button
            onClick={() => handlePanCamera('down')}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-black text-xs"
            title="视野后移"
          >
            ⬇️
          </button>
          <button
            onClick={() => handlePanCamera('right')}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-black text-xs"
            title="视野右移"
          >
            ➡️
          </button>
          {(panTarget.x !== 0 || panTarget.z !== 0) && (
            <button
              onClick={() => handlePanCamera('center')}
              className="px-2 h-8 rounded-lg bg-amber-500 text-black font-black text-xs"
            >
              🎯回中心
            </button>
          )}
        </div>

        {/* Bottom Floating Instruction Pill */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/20 text-xs font-bold text-white">
            💡 单指滑动旋转 · 点击方块即可【{toolMode === 'build' ? '放置方块' : '挖掉回收'}】 · 当前领地 {currentTier.size}×{currentTier.size}（最高 {currentTier.maxHeight} 层）
          </div>

          <button
            onClick={handleRecallAllBlocks}
            className="pointer-events-auto px-3 py-1.5 rounded-xl bg-rose-900/90 hover:bg-rose-800 border border-rose-400/40 text-rose-100 text-xs font-bold flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>全部收回背包重搭</span>
          </button>
        </div>
      </div>

      {/* Right / Bottom Sidebar: Block Hotbar Inventory & Blueprint Selector */}
      <div className="w-full lg:w-80 bg-[#26301e] border-t-4 lg:border-t-0 lg:border-l-4 border-black p-4 flex flex-col justify-between overflow-y-auto max-h-[46vh] lg:max-h-full space-y-4">
        {/* Section 1: Block Inventory Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
              <span>🎒 我的方块背包（点选方块进行建造）</span>
            </h3>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-3 gap-2">
            {(Object.keys(BLOCK_CATALOG) as BlockId[]).map((bId) => {
              const meta = BLOCK_CATALOG[bId];
              const count = state.blocksInventory[bId] || 0;
              const isSelected = selectedBlock === bId && toolMode === 'build';

              return (
                <button
                  key={bId}
                  onClick={() => {
                    sound.playClick();
                    setSelectedBlock(bId);
                    setToolMode('build');
                  }}
                  className={`relative p-2 rounded-xl border-2 flex flex-col items-center justify-center transition ${
                    isSelected
                      ? 'bg-amber-500/30 border-yellow-300 scale-105 shadow-md'
                      : count > 0
                      ? 'bg-black/45 border-white/15 hover:border-white/40'
                      : 'bg-black/25 border-white/5 opacity-50'
                  }`}
                >
                  <BlockCubeIcon blockId={bId} size={34} />
                  <span className="text-[11px] font-bold text-white mt-1 truncate w-full text-center">
                    {meta.name}
                  </span>
                  <span
                    className={`mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-black ${
                      count > 0 ? 'bg-lime-400 text-black' : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    x{count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Blueprint Guide Helper for 2nd Graders */}
        <div className="bg-black/40 border-2 border-indigo-400/40 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>📐 建筑蓝图虚影指引</span>
            </span>
            {activeBlueprintId && (
              <button
                onClick={() => setActiveBlueprintId('')}
                className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-0.5"
              >
                <RotateCcw className="w-3 h-3" /> 关闭虚影
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {BLUEPRINTS.map((bp) => (
              <button
                key={bp.id}
                onClick={() => {
                  sound.playClick();
                  setActiveBlueprintId((prev) => (prev === bp.id ? '' : bp.id));
                }}
                className={`w-full text-left p-2 rounded-lg border text-xs transition flex items-center justify-between ${
                  activeBlueprintId === bp.id
                    ? 'bg-indigo-900/80 border-indigo-300 text-white font-black'
                    : 'bg-black/35 border-white/10 text-zinc-300 hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="font-bold">{bp.name}</div>
                  <div className="text-[10px] text-indigo-200/80">{bp.description}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-amber-300 shrink-0 ml-2">
                  {bp.difficulty}
                </span>
              </button>
            ))}
          </div>

          {activeBlueprint && (
            <button
              onClick={handleAutoBuildStep}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:brightness-110 border-2 border-black shadow-mc text-white font-black text-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>✨ 消耗背包方块，帮我自动搭一块蓝图！</span>
            </button>
          )}
        </div>
      </div>

      {/* Territory Expansion Modal */}
      {expandModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-3xl w-full bg-[#2b3722] border-4 border-black rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-6 py-4 border-b-4 border-black flex items-center justify-between text-zinc-950">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🗺️</span>
                <div>
                  <h2 className="text-xl font-black">王国领地扩建圣殿（等级 + 绿宝石解锁超大沙盒）</h2>
                  <p className="text-xs font-bold opacity-85">
                    当前等级：Lv.{state.level} · 拥有绿宝石：💎 {state.emeralds} · 越认真写作业，领地越辽阔！
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExpandModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-black/80 text-white font-bold text-sm"
              >
                ✕ 关闭
              </button>
            </div>

            {/* Tiers List */}
            <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
              {WORLD_EXPANSION_TIERS.map((tier) => {
                const isUnlocked = tier.level <= worldSizeLevel;
                const isCurrent = tier.level === worldSizeLevel;
                const isNext = tier.level === worldSizeLevel + 1;
                const levelMet = state.level >= tier.requiredPlayerLevel;
                const emeraldsMet = state.emeralds >= tier.costEmeralds;
                const canUnlockNow = !isUnlocked && levelMet && emeraldsMet;

                return (
                  <div
                    key={tier.level}
                    className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                      isCurrent
                        ? 'bg-emerald-900/75 border-lime-400 shadow-lg'
                        : isUnlocked
                        ? 'bg-black/45 border-emerald-500/40'
                        : isNext
                        ? 'bg-amber-950/50 border-amber-400'
                        : 'bg-black/30 border-white/10 opacity-80'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-black/70 text-amber-300 font-black text-xs">
                          Lv.{tier.level} 领地
                        </span>
                        <h3 className="text-lg font-black text-white">{tier.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-lime-400 text-zinc-950 font-black text-xs">
                          {tier.size} × {tier.size}（共 {tier.size * tier.size} 格地基 · 限高 {tier.maxHeight} 层）
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 font-medium">{tier.description}</p>

                      {/* Bonus Blocks Gift Pack Preview */}
                      {Object.keys(tier.bonusBlocks).length > 0 && (
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-black text-amber-300">
                            🎁 扩建免费赠送建材包：
                          </span>
                          {Object.entries(tier.bonusBlocks).map(([bId, qty]) => (
                            <span
                              key={bId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 border border-amber-400/30 text-[11px] font-bold text-amber-200"
                            >
                              <BlockCubeIcon blockId={bId as BlockId} size={16} />
                              <span>
                                {BLOCK_CATALOG[bId as BlockId]?.name} +{qty}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Action / Status Button */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5 w-full sm:w-auto">
                      {isCurrent ? (
                        <span className="px-4 py-2 rounded-xl bg-lime-400 text-zinc-950 font-black text-xs flex items-center gap-1.5">
                          <Check className="w-4 h-4" /> 当前使用中
                        </span>
                      ) : isUnlocked ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-800 text-emerald-200 font-bold text-xs">
                          ✓ 已解锁
                        </span>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <span
                              className={
                                levelMet ? 'text-lime-300' : 'text-rose-400'
                              }
                            >
                              {levelMet ? '✓' : '🔒'} 需人物 Lv.{tier.requiredPlayerLevel}
                            </span>
                            <span className="text-white/30">|</span>
                            <span
                              className={
                                emeraldsMet ? 'text-emerald-300' : 'text-rose-400'
                              }
                            >
                              💎 {tier.costEmeralds} 绿宝石
                            </span>
                          </div>
                          <button
                            onClick={() => handleExpandTerritory(tier)}
                            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-black shadow-mc font-black text-sm flex items-center justify-center gap-1.5 transition ${
                              canUnlockNow
                                ? 'bg-gradient-to-r from-amber-400 to-lime-400 text-zinc-950 hover:brightness-110 animate-pulse'
                                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                            }`}
                          >
                            {canUnlockNow ? (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span>立即扩建领地！</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                <span>条件达成后扩建</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
