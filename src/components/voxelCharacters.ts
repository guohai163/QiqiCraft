import * as THREE from 'three';
import { GearSlot, PetId } from '../types/game';
import { GEAR_CATALOG, PET_META } from '../data/catalog';

/**
 * Voxel (Minecraft-style) character builders for the 3D world.
 * All characters are built from simple boxes so they render fast on iPad
 * and match the blocky art style of the world.
 *
 * Conventions:
 * - Feet are at local y = 0, character faces +Z.
 * - Animated parts (legs / arms / tail / head) are pivot groups whose
 *   rotation is driven by the wander controller in VoxelWorld.
 */

export interface VoxelCharacterParts {
  group: THREE.Group;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
  tail?: THREE.Object3D;
  head?: THREE.Object3D;
  height: number;
}

const matCache: Record<string, THREE.MeshLambertMaterial> = {};
function mat(color: string): THREE.MeshLambertMaterial {
  if (!matCache[color]) {
    matCache[color] = new THREE.MeshLambertMaterial({ color });
  }
  return matCache[color];
}

const geoCache: Record<string, THREE.BoxGeometry> = {};
function geo(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w}|${h}|${d}`;
  if (!geoCache[key]) geoCache[key] = new THREE.BoxGeometry(w, h, d);
  return geoCache[key];
}

/** Add a box whose center is at (x, y, z) relative to parent. */
function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  color: string,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const m = new THREE.Mesh(geo(w, h, d), mat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** Create a pivot group at (x, y, z) – children hang from it. */
function pivot(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** Floating name tag sprite (canvas text). */
export function makeNameTag(text: string, color = '#ffffff'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif';
  const tw = Math.min(244, ctx.measureText(text).width + 24);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect((256 - tw) / 2, 8, tw, 48);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  sprite.scale.set(1.4, 0.35, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function gearOf(equipped: Record<GearSlot, string>, slot: GearSlot) {
  const id = equipped?.[slot];
  return GEAR_CATALOG.find((g) => g.id === id && g.slot === slot);
}

/* ------------------------------------------------------------------ */
/* Hero (小矿工)                                                        */
/* ------------------------------------------------------------------ */
export function buildHero(equipped: Record<GearSlot, string>, gender: 'boy' | 'girl' = 'boy'): VoxelCharacterParts {
  const root = new THREE.Group();
  const SKIN = gender === 'girl' ? '#fcdbc2' : '#f0b98a';
  const helmet = gearOf(equipped, 'helmet');
  const armor = gearOf(equipped, 'armor');
  const weapon = gearOf(equipped, 'weapon');
  const cape = gearOf(equipped, 'cape');

  const shirt = armor?.color || (gender === 'girl' ? '#ec4899' : '#06b6d4');
  const pants = armor?.accent || (gender === 'girl' ? '#8b5cf6' : '#1d4ed8');
  const hairColor = helmet?.color || (gender === 'girl' ? '#78350f' : '#4a3219');
  const isHelmet = helmet && helmet.id !== 'helm_none';

  const armW = gender === 'girl' ? 0.15 : 0.2;
  const armSx = gender === 'girl' ? 0.275 : 0.3;

  // Legs (pivot at hip)
  const legs: THREE.Object3D[] = [];
  for (const sx of [-0.1, 0.1]) {
    const hip = pivot(root, sx, 0.6, 0);
    box(hip, 0.2, 0.6, 0.2, pants, 0, -0.3, 0);
    box(hip, 0.2, 0.08, 0.2, '#3f3f46', 0, -0.56, 0); // shoes
    legs.push(hip);
  }

  // Body
  box(root, 0.4, 0.6, 0.2, shirt, 0, 0.9, 0);
  if (armor && armor.id !== 'armor_steve') {
    box(root, 0.42, 0.08, 0.22, armor.accent, 0, 0.66, 0); // belt trim
  }

  // Arms (pivot at shoulder)
  const arms: THREE.Object3D[] = [];
  for (const sx of [-armSx, armSx]) {
    const sh = pivot(root, sx, 1.18, 0);
    box(sh, armW, 0.24, 0.2, shirt, 0, -0.12, 0); // sleeve
    box(sh, armW, 0.36, 0.2, SKIN, 0, -0.42, 0); // forearm
    arms.push(sh);
  }

  // Weapon in right hand (arms[1] is +x side)
  const hand = pivot(arms[1], 0, -0.56, 0.08);
  hand.rotation.x = Math.PI / 2.6;
  if (weapon) {
    if (weapon.id === 'weapon_pickaxe') {
      box(hand, 0.05, 0.55, 0.05, weapon.accent, 0, 0.2, 0);
      box(hand, 0.38, 0.07, 0.07, '#22d3ee', 0, 0.46, 0);
    } else if (weapon.id === 'weapon_trident') {
      box(hand, 0.05, 0.8, 0.05, weapon.color, 0, 0.3, 0);
      box(hand, 0.22, 0.04, 0.04, weapon.accent, 0, 0.68, 0);
      for (const px of [-0.09, 0, 0.09]) box(hand, 0.04, 0.16, 0.04, weapon.accent, px, 0.78, 0);
    } else {
      // swords
      box(hand, 0.05, 0.14, 0.05, weapon.accent, 0, 0.02, 0);
      box(hand, 0.2, 0.04, 0.06, weapon.accent, 0, 0.1, 0);
      box(hand, 0.07, 0.5, 0.03, weapon.color, 0, 0.37, 0);
    }
  }

  // Head
  const head = pivot(root, 0, 1.2, 0);
  box(head, 0.4, 0.4, 0.4, SKIN, 0, 0.2, 0);
  // eyes + mouth on the front (+z)
  box(head, 0.08, 0.05, 0.01, '#ffffff', -0.1, 0.2, 0.201);
  box(head, 0.08, 0.05, 0.01, '#ffffff', 0.1, 0.2, 0.201);
  box(head, 0.04, 0.05, 0.012, gender === 'girl' ? '#059669' : '#3b2a8a', -0.08, 0.2, 0.202);
  box(head, 0.04, 0.05, 0.012, gender === 'girl' ? '#059669' : '#3b2a8a', 0.08, 0.2, 0.202);
  box(head, 0.14, 0.04, 0.01, '#9a5b3c', 0, 0.08, 0.201);
  if (isHelmet) {
    box(head, 0.44, 0.14, 0.44, hairColor, 0, 0.38, 0);
    box(head, 0.44, 0.3, 0.06, hairColor, 0, 0.25, -0.2);
    box(head, 0.06, 0.24, 0.44, hairColor, -0.21, 0.27, 0);
    box(head, 0.06, 0.24, 0.44, hairColor, 0.21, 0.27, 0);
    if (helmet?.accent) box(head, 0.06, 0.1, 0.46, helmet.accent, 0, 0.46, 0);
  } else {
    // Hair
    box(head, 0.42, 0.1, 0.42, hairColor, 0, 0.37, 0); // top hair
    box(head, 0.42, 0.24, 0.05, hairColor, 0, 0.26, -0.19); // back hair
    box(head, 0.42, 0.06, 0.03, hairColor, 0, 0.31, 0.2); // bangs
    if (gender === 'girl') {
      // Long hair for girls
      box(head, 0.42, 0.3, 0.05, hairColor, 0, 0, -0.19); // longer back hair
      box(head, 0.06, 0.2, 0.1, hairColor, -0.21, 0.2, 0.1); // side bangs
      box(head, 0.06, 0.2, 0.1, hairColor, 0.21, 0.2, 0.1); // side bangs
    }
  }

  // Cape
  if (cape && cape.id !== 'cape_none' && cape.color !== 'transparent') {
    const capePivot = pivot(root, 0, 1.18, -0.12);
    capePivot.rotation.x = 0.12;
    box(capePivot, 0.38, 0.72, 0.03, cape.color, 0, -0.36, 0);
    box(capePivot, 0.38, 0.06, 0.035, cape.accent, 0, -0.69, 0);
  }

  return { group: root, legs, arms, head, height: 1.6 };
}

/* ------------------------------------------------------------------ */
/* Pets                                                                */
/* ------------------------------------------------------------------ */
interface QuadSpec {
  bodyW: number;
  bodyH: number;
  bodyL: number;
  legW: number;
  legH: number;
  head: [number, number, number];
  body: string;
  legs: string;
  headColor: string;
}

function buildQuadruped(spec: QuadSpec) {
  const root = new THREE.Group();
  const legs: THREE.Object3D[] = [];
  const { bodyW, bodyH, bodyL, legW, legH } = spec;
  const bodyY = legH + bodyH / 2;

  box(root, bodyW, bodyH, bodyL, spec.body, 0, bodyY, 0);

  const lx = bodyW / 2 - legW / 2;
  const lz = bodyL / 2 - legW / 2;
  // order: FL, FR, BL, BR  → diagonal pairs swing together
  for (const [x, z] of [
    [-lx, lz],
    [lx, lz],
    [-lx, -lz],
    [lx, -lz],
  ]) {
    const hip = pivot(root, x, legH, z);
    box(hip, legW, legH, legW, spec.legs, 0, -legH / 2, 0);
    legs.push(hip);
  }

  const [hw, hh, hd] = spec.head;
  const head = pivot(root, 0, bodyY + bodyH * 0.25, bodyL / 2);
  box(head, hw, hh, hd, spec.headColor, 0, 0, hd / 2 - 0.02);

  const tail = pivot(root, 0, bodyY + bodyH * 0.25, -bodyL / 2);
  return { root, legs, head, tail, hw, hh, hd, bodyY };
}

function eyes(head: THREE.Object3D, hw: number, hd: number, y: number, color = '#111827') {
  const fz = hd - 0.02 + 0.006;
  box(head, 0.05, 0.05, 0.012, color, -hw * 0.25, y, fz);
  box(head, 0.05, 0.05, 0.012, color, hw * 0.25, y, fz);
}

export function buildPet(petId: PetId): VoxelCharacterParts {
  const meta = PET_META[petId];
  const P = meta.primaryColor;
  const S = meta.secondaryColor;

  if (petId === 'panda') {
    const q = buildQuadruped({
      bodyW: 0.5,
      bodyH: 0.42,
      bodyL: 0.72,
      legW: 0.16,
      legH: 0.22,
      head: [0.38, 0.34, 0.3],
      body: P,
      legs: S,
      headColor: P,
    });
    box(q.root, 0.52, 0.2, 0.18, S, 0, q.bodyY + 0.06, 0.18); // shoulder band
    // black eye patches + white pupils
    const fz = q.hd - 0.02 + 0.006;
    box(q.head, 0.1, 0.1, 0.01, S, -0.09, 0.02, fz);
    box(q.head, 0.1, 0.1, 0.01, S, 0.09, 0.02, fz);
    box(q.head, 0.04, 0.04, 0.014, '#ffffff', -0.09, 0.03, fz + 0.002);
    box(q.head, 0.04, 0.04, 0.014, '#ffffff', 0.09, 0.03, fz + 0.002);
    box(q.head, 0.12, 0.08, 0.06, '#e5e7eb', 0, -0.09, q.hd);
    box(q.head, 0.05, 0.03, 0.01, S, 0, -0.07, q.hd + 0.03);
    box(q.head, 0.09, 0.09, 0.06, S, -0.15, 0.19, q.hd / 2);
    box(q.head, 0.09, 0.09, 0.06, S, 0.15, 0.19, q.hd / 2);
    box(q.tail, 0.1, 0.1, 0.08, P, 0, 0, -0.03);
    return { group: q.root, legs: q.legs, arms: [], head: q.head, tail: q.tail, height: 0.9 };
  }

  if (petId === 'axolotl') {
    const q = buildQuadruped({
      bodyW: 0.26,
      bodyH: 0.16,
      bodyL: 0.52,
      legW: 0.07,
      legH: 0.08,
      head: [0.34, 0.2, 0.22],
      body: P,
      legs: P,
      headColor: P,
    });
    eyes(q.head, q.hw, q.hd, 0.02);
    box(q.head, 0.1, 0.02, 0.01, S, 0, -0.05, q.hd - 0.014);
    // gills
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        box(q.head, 0.1, 0.04, 0.03, S, sx * (q.hw / 2 + 0.04), 0.08 - i * 0.06, 0.06);
      }
    }
    // flat fin tail
    box(q.tail, 0.04, 0.16, 0.36, S, 0, 0, -0.18);
    return { group: q.root, legs: q.legs, arms: [], head: q.head, tail: q.tail, height: 0.5 };
  }

  if (petId === 'fox') {
    const q = buildQuadruped({
      bodyW: 0.26,
      bodyH: 0.24,
      bodyL: 0.5,
      legW: 0.08,
      legH: 0.2,
      head: [0.3, 0.24, 0.22],
      body: P,
      legs: '#1f2937',
      headColor: P,
    });
    eyes(q.head, q.hw, q.hd, 0.04);
    box(q.head, 0.16, 0.1, 0.1, S, 0, -0.06, q.hd + 0.02); // snout
    box(q.head, 0.04, 0.04, 0.01, '#111827', 0, -0.03, q.hd + 0.075);
    for (const sx of [-0.09, 0.09]) {
      box(q.head, 0.08, 0.1, 0.04, P, sx, 0.16, 0.08);
      box(q.head, 0.08, 0.03, 0.042, '#111827', sx, 0.205, 0.08);
    }
    box(q.tail, 0.14, 0.14, 0.34, P, 0, -0.02, -0.17);
    box(q.tail, 0.145, 0.145, 0.09, S, 0, -0.02, -0.32);
    return { group: q.root, legs: q.legs, arms: [], head: q.head, tail: q.tail, height: 0.65 };
  }

  if (petId === 'cat') {
    const q = buildQuadruped({
      bodyW: 0.22,
      bodyH: 0.22,
      bodyL: 0.5,
      legW: 0.07,
      legH: 0.2,
      head: [0.26, 0.24, 0.22],
      body: P,
      legs: P,
      headColor: P,
    });
    // stripes
    for (const z of [-0.12, 0, 0.12]) box(q.root, 0.225, 0.04, 0.05, S, 0, q.bodyY + 0.1, z);
    eyes(q.head, q.hw, q.hd, 0.03, '#16a34a');
    box(q.head, 0.04, 0.03, 0.012, '#f472b6', 0, -0.04, q.hd - 0.012);
    for (const sx of [-0.08, 0.08]) box(q.head, 0.07, 0.07, 0.04, P, sx, 0.15, 0.06);
    const tailUp = pivot(q.tail, 0, 0, 0);
    tailUp.rotation.x = 0.7;
    box(tailUp, 0.05, 0.05, 0.38, P, 0, 0, -0.19);
    box(tailUp, 0.055, 0.055, 0.08, S, 0, 0, -0.34);
    return { group: q.root, legs: q.legs, arms: [], head: q.head, tail: q.tail, height: 0.6 };
  }

  // wolf (default)
  const q = buildQuadruped({
    bodyW: 0.28,
    bodyH: 0.28,
    bodyL: 0.58,
    legW: 0.09,
    legH: 0.24,
    head: [0.3, 0.28, 0.24],
    body: P,
    legs: P,
    headColor: P,
  });
  box(q.root, 0.3, 0.3, 0.06, S, 0, q.bodyY + 0.01, 0.27); // red collar
  eyes(q.head, q.hw, q.hd, 0.05);
  box(q.head, 0.14, 0.1, 0.1, '#a1a1aa', 0, -0.06, q.hd + 0.02);
  box(q.head, 0.05, 0.04, 0.01, '#111827', 0, -0.02, q.hd + 0.075);
  for (const sx of [-0.09, 0.09]) box(q.head, 0.07, 0.09, 0.04, P, sx, 0.18, 0.06);
  const tailUp = pivot(q.tail, 0, 0, 0);
  tailUp.rotation.x = 0.5;
  box(tailUp, 0.08, 0.08, 0.32, P, 0, 0, -0.16);
  return { group: q.root, legs: q.legs, arms: [], head: q.head, tail: q.tail, height: 0.75 };
}
