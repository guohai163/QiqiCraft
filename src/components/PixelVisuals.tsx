import React from 'react';
import { BlockId, GearSlot, PetId } from '../types/game';
import { BLOCK_CATALOG, GEAR_CATALOG, PET_META } from '../data/catalog';

// 3D Isometric Minecraft Block Icon
export const BlockCubeIcon: React.FC<{ blockId: BlockId; size?: number; className?: string }> = ({
  blockId,
  size = 42,
  className = '',
}) => {
  const meta = BLOCK_CATALOG[blockId] || BLOCK_CATALOG.grass;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`drop-shadow-[0_3px_2px_rgba(0,0,0,0.45)] ${className}`}
    >
      {/* Top face */}
      <polygon points="32,6 58,19 32,32 6,19" fill={meta.topColor} stroke="#18181b" strokeWidth="2" />
      {/* Left face */}
      <polygon points="6,19 32,32 32,58 6,45" fill={meta.sideColor} stroke="#18181b" strokeWidth="2" />
      {/* Right face (slightly darker for 3D lighting) */}
      <polygon
        points="32,32 58,19 58,45 32,58"
        fill={meta.sideColor}
        stroke="#18181b"
        strokeWidth="2"
        style={{ filter: 'brightness(0.82)' }}
      />

      {/* Special details per block type */}
      {blockId === 'grass' && (
        <>
          <polygon points="6,19 32,32 32,39 6,26" fill={meta.topColor} />
          <polygon points="32,32 58,19 58,26 32,39" fill={meta.accentColor} />
        </>
      )}
      {blockId === 'tnt' && (
        <>
          <polygon points="6,28 32,41 32,49 6,36" fill="#f8fafc" />
          <polygon points="32,41 58,28 58,36 32,49" fill="#e2e8f0" />
          <text x="11" y="42" fontSize="9" fontWeight="bold" fill="#111827" transform="skewY(26)">
            TNT
          </text>
        </>
      )}
      {blockId === 'bookshelf' && (
        <>
          <line x1="10" y1="30" x2="28" y2="39" stroke="#ef4444" strokeWidth="4" />
          <line x1="10" y1="38" x2="28" y2="47" stroke="#3b82f6" strokeWidth="4" />
          <line x1="36" y1="39" x2="54" y2="30" stroke="#22c55e" strokeWidth="4" />
          <line x1="36" y1="47" x2="54" y2="38" stroke="#eab308" strokeWidth="4" />
        </>
      )}
      {(blockId === 'diamond_block' || blockId === 'gold_block' || blockId === 'glowstone') && (
        <polygon points="32,11 46,18 32,25 18,18" fill={meta.accentColor} opacity="0.65" />
      )}
      {blockId === 'glass' && (
        <>
          <line x1="14" y1="28" x2="24" y2="46" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="40" y1="32" x2="48" y2="24" stroke="#ffffff" strokeWidth="2.5" />
        </>
      )}
      {blockId === 'pony_twilight' && (
        <>
          {/* Glowing star cutie mark on top */}
          <polygon points="32,10 35,16 42,17 36,21 38,27 32,23 26,27 28,21 22,17 29,16" fill="#f472b6" stroke="#ffffff" strokeWidth="1" />
          {/* Left face: Twilight Sparkle face + mane stripe + horn */}
          <polygon points="12,24 27,31 27,36 12,29" fill="#312e81" />
          <polygon points="15,25 24,29 24,33 15,29" fill="#ec4899" />
          <polygon points="18,22 21,15 23,24" fill="#fde047" />
          <circle cx="15" cy="38" r="2.6" fill="#ffffff" />
          <circle cx="15.5" cy="38" r="1.4" fill="#581c87" />
          <circle cx="24" cy="42" r="2.6" fill="#ffffff" />
          <circle cx="24.5" cy="42" r="1.4" fill="#581c87" />
          {/* Right face: Star cutie mark */}
          <polygon points="45,30 48,37 53,38 48,42 50,48 45,44 40,48 42,42 37,38 42,37" fill="#f472b6" stroke="#fef08a" strokeWidth="1" />
        </>
      )}
      {blockId === 'pony_rainbow' && (
        <>
          {/* Top face rainbow stripes */}
          <line x1="18" y1="16" x2="44" y2="16" stroke="#ef4444" strokeWidth="2.5" />
          <line x1="16" y1="19" x2="48" y2="19" stroke="#facc15" strokeWidth="2.5" />
          <line x1="20" y1="22" x2="44" y2="22" stroke="#22c55e" strokeWidth="2.5" />
          {/* Left face: Rainbow Dash mane & eyes */}
          <polygon points="10,23 28,32 28,36 10,27" fill="#ef4444" />
          <polygon points="10,27 28,36 28,39 10,30" fill="#facc15" />
          <polygon points="10,30 28,39 28,42 10,33" fill="#22c55e" />
          <circle cx="15" cy="40" r="2.6" fill="#ffffff" />
          <circle cx="15.5" cy="40" r="1.4" fill="#be185d" />
          <circle cx="24" cy="44" r="2.6" fill="#ffffff" />
          <circle cx="24.5" cy="44" r="1.4" fill="#be185d" />
          {/* Right face: Cloud & Rainbow Lightning Cutie Mark */}
          <ellipse cx="45" cy="35" rx="6" ry="3.5" fill="#ffffff" />
          <polygon points="46,37 41,44 45,44 42,51 50,42 46,42" fill="#facc15" stroke="#ef4444" strokeWidth="0.8" />
        </>
      )}
      {blockId === 'pony_pinkie' && (
        <>
          {/* Top face sparkle heart */}
          <polygon points="32,12 42,18 32,26 22,18" fill="#fef08a" opacity="0.85" />
          {/* Left face: Fluffy hot-pink mane & cheerful eyes */}
          <circle cx="14" cy="26" r="4" fill="#db2777" />
          <circle cx="20" cy="29" r="4.5" fill="#db2777" />
          <circle cx="26" cy="32" r="4" fill="#db2777" />
          <circle cx="15" cy="39" r="2.6" fill="#ffffff" />
          <circle cx="15.5" cy="39" r="1.4" fill="#0284c7" />
          <circle cx="24" cy="43" r="2.6" fill="#ffffff" />
          <circle cx="24.5" cy="43" r="1.4" fill="#0284c7" />
          {/* Right face: 3 Party Balloons Cutie Mark */}
          <circle cx="41" cy="36" r="3.5" fill="#38bdf8" />
          <circle cx="48" cy="34" r="3.5" fill="#facc15" />
          <circle cx="45" cy="41" r="3.5" fill="#38bdf8" />
          <line x1="41" y1="39.5" x2="45" y2="50" stroke="#fef08a" strokeWidth="1.2" />
          <line x1="48" y1="37.5" x2="45" y2="50" stroke="#fef08a" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
};

// Pixel Art Minecraft Pet Illustration
export const PixelPetAvatar: React.FC<{
  petId: PetId;
  level?: number;
  size?: number;
  animate?: boolean;
}> = ({ petId, level = 1, size = 120, animate = true }) => {
  const meta = PET_META[petId];

  return (
    <div className={`relative inline-flex items-center justify-center ${animate ? 'animate-bounce' : ''}`} style={{ animationDuration: '2.4s' }}>
      {level >= 3 && (
        <div className="absolute -inset-2 rounded-full bg-yellow-400/20 blur-md animate-pulse pointer-events-none" />
      )}
      <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow-[0_6px_0_rgba(0,0,0,0.4)]">
        {/* Shadow */}
        <ellipse cx="32" cy="58" rx="18" ry="4" fill="rgba(0,0,0,0.35)" />

        {petId === 'wolf' && (
          <g>
            {/* Body */}
            <rect x="18" y="30" width="28" height="16" fill="#d4d4d8" stroke="#18181b" strokeWidth="2" />
            {/* Red Collar */}
            <rect x="18" y="30" width="6" height="16" fill="#ef4444" stroke="#18181b" strokeWidth="1.5" />
            {/* Legs */}
            <rect x="20" y="46" width="5" height="10" fill="#a1a1aa" stroke="#18181b" strokeWidth="1.5" />
            <rect x="39" y="46" width="5" height="10" fill="#a1a1aa" stroke="#18181b" strokeWidth="1.5" />
            {/* Tail */}
            <rect x="46" y="28" width="8" height="5" fill="#d4d4d8" stroke="#18181b" strokeWidth="1.5" />
            {/* Head */}
            <rect x="10" y="16" width="18" height="18" fill="#e4e4e7" stroke="#18181b" strokeWidth="2" />
            {/* Ears */}
            <rect x="11" y="10" width="5" height="6" fill="#a1a1aa" stroke="#18181b" strokeWidth="1.5" />
            <rect x="22" y="10" width="5" height="6" fill="#a1a1aa" stroke="#18181b" strokeWidth="1.5" />
            {/* Snout */}
            <rect x="6" y="24" width="8" height="8" fill="#f4f4f5" stroke="#18181b" strokeWidth="1.5" />
            <rect x="6" y="24" width="4" height="4" fill="#18181b" />
            {/* Eyes */}
            <rect x="14" y="21" width="3" height="3" fill="#18181b" />
            <rect x="21" y="21" width="3" height="3" fill="#18181b" />
          </g>
        )}

        {petId === 'cat' && (
          <g>
            <rect x="18" y="32" width="26" height="14" fill="#fb923c" stroke="#18181b" strokeWidth="2" />
            <rect x="26" y="32" width="4" height="10" fill="#ea580c" />
            <rect x="34" y="32" width="4" height="10" fill="#ea580c" />
            <rect x="20" y="46" width="5" height="10" fill="#fdba74" stroke="#18181b" strokeWidth="1.5" />
            <rect x="37" y="46" width="5" height="10" fill="#fdba74" stroke="#18181b" strokeWidth="1.5" />
            <rect x="44" y="24" width="5" height="14" fill="#fb923c" stroke="#18181b" strokeWidth="1.5" />
            <rect x="10" y="18" width="18" height="16" fill="#fb923c" stroke="#18181b" strokeWidth="2" />
            <rect x="11" y="12" width="5" height="6" fill="#ea580c" stroke="#18181b" strokeWidth="1.5" />
            <rect x="22" y="12" width="5" height="6" fill="#ea580c" stroke="#18181b" strokeWidth="1.5" />
            <rect x="13" y="23" width="3" height="3" fill="#22c55e" />
            <rect x="21" y="23" width="3" height="3" fill="#22c55e" />
            <rect x="16" y="27" width="4" height="3" fill="#f472b6" />
          </g>
        )}

        {petId === 'fox' && (
          <g>
            <rect x="18" y="31" width="26" height="15" fill="#ea580c" stroke="#18181b" strokeWidth="2" />
            <rect x="18" y="39" width="12" height="7" fill="#ffffff" />
            <rect x="20" y="46" width="5" height="10" fill="#18181b" />
            <rect x="37" y="46" width="5" height="10" fill="#18181b" />
            <rect x="44" y="29" width="12" height="9" fill="#ea580c" stroke="#18181b" strokeWidth="1.5" />
            <rect x="51" y="29" width="5" height="9" fill="#ffffff" />
            <rect x="9" y="17" width="19" height="16" fill="#f97316" stroke="#18181b" strokeWidth="2" />
            <rect x="10" y="10" width="6" height="7" fill="#ea580c" stroke="#18181b" strokeWidth="1.5" />
            <rect x="21" y="10" width="6" height="7" fill="#ea580c" stroke="#18181b" strokeWidth="1.5" />
            <rect x="5" y="26" width="8" height="6" fill="#ffffff" stroke="#18181b" strokeWidth="1.5" />
            <rect x="13" y="22" width="3" height="3" fill="#18181b" />
            <rect x="21" y="22" width="3" height="3" fill="#18181b" />
          </g>
        )}

        {petId === 'axolotl' && (
          <g>
            {/* Gill fronds */}
            <rect x="8" y="14" width="5" height="4" fill="#db2777" />
            <rect x="6" y="22" width="5" height="4" fill="#db2777" />
            <rect x="31" y="14" width="5" height="4" fill="#db2777" />
            <rect x="33" y="22" width="5" height="4" fill="#db2777" />
            {/* Body & Head */}
            <rect x="18" y="30" width="26" height="15" fill="#f9a8d4" stroke="#18181b" strokeWidth="2" />
            <rect x="44" y="32" width="12" height="10" fill="#f472b6" stroke="#18181b" strokeWidth="1.5" />
            <rect x="11" y="16" width="20" height="18" fill="#fbcfe8" stroke="#18181b" strokeWidth="2" />
            <rect x="15" y="22" width="3" height="4" fill="#18181b" />
            <rect x="24" y="22" width="3" height="4" fill="#18181b" />
            <rect x="18" y="28" width="6" height="2" fill="#db2777" />
            <rect x="20" y="45" width="5" height="8" fill="#f472b6" stroke="#18181b" strokeWidth="1.5" />
            <rect x="36" y="45" width="5" height="8" fill="#f472b6" stroke="#18181b" strokeWidth="1.5" />
          </g>
        )}

        {petId === 'panda' && (
          <g>
            {/* Chubby Panda */}
            <rect x="16" y="26" width="32" height="22" fill="#f8fafc" stroke="#18181b" strokeWidth="2" />
            <rect x="16" y="26" width="10" height="22" fill="#18181b" />
            <rect x="18" y="48" width="7" height="8" fill="#18181b" />
            <rect x="38" y="48" width="7" height="8" fill="#18181b" />
            <rect x="10" y="14" width="20" height="18" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
            <rect x="9" y="9" width="6" height="6" fill="#18181b" />
            <rect x="25" y="9" width="6" height="6" fill="#18181b" />
            <rect x="13" y="20" width="5" height="5" fill="#18181b" />
            <rect x="22" y="20" width="5" height="5" fill="#18181b" />
            <rect x="15" y="21" width="2" height="2" fill="#ffffff" />
            <rect x="24" y="21" width="2" height="2" fill="#ffffff" />
            <rect x="18" y="26" width="4" height="3" fill="#18181b" />
          </g>
        )}

        {/* Crown badge if level >= 2 */}
        {level >= 2 && (
          <polygon
            points="16,10 19,4 22,8 25,4 28,10"
            fill="#facc15"
            stroke="#18181b"
            strokeWidth="1.2"
          />
        )}
      </svg>
      <span className="sr-only">{meta.name}</span>
    </div>
  );
};

// Pixel Hero Avatar (Steve/Alex with equipped Helmet, Armor, Weapon, and Cape)
export const PixelHeroAvatar: React.FC<{
  equippedGear: Record<GearSlot, string>;
  gender?: 'boy' | 'girl';
  size?: number;
}> = ({ equippedGear, gender = 'boy', size = 150 }) => {
  const helmet = GEAR_CATALOG.find((g) => g.id === equippedGear.helmet) || GEAR_CATALOG[0];
  const armor = GEAR_CATALOG.find((g) => g.id === equippedGear.armor) || GEAR_CATALOG[4];
  const weapon = GEAR_CATALOG.find((g) => g.id === equippedGear.weapon) || GEAR_CATALOG[8];
  const cape = GEAR_CATALOG.find((g) => g.id === equippedGear.cape) || GEAR_CATALOG[12];

  const skinColor = gender === 'girl' ? '#fcdbc2' : '#f1c27d';
  const armWidth = gender === 'girl' ? 7 : 9;
  const leftArmX = gender === 'girl' ? 20 : 18;
  const rightArmX = 53;
  const legColor = armor.id === 'armor_steve' ? (gender === 'girl' ? '#8b5cf6' : '#1e3a8a') : '#1e3a8a';
  const defaultHairColor = gender === 'girl' ? '#78350f' : '#3f2b1c';
  const hairColor = helmet.id === 'helm_none' ? defaultHairColor : helmet.color;

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className="drop-shadow-[0_6px_0_rgba(0,0,0,0.45)]">
      {/* Ground shadow */}
      <ellipse cx="40" cy="73" rx="22" ry="5" fill="rgba(0,0,0,0.35)" />

      {/* Cape / Wings behind character */}
      {cape.id !== 'cape_none' && (
        <g>
          <rect
            x="22"
            y="28"
            width="36"
            height="34"
            rx="2"
            fill={cape.color}
            stroke="#18181b"
            strokeWidth="2"
          />
          <rect x="26" y="32" width="28" height="26" fill={cape.accent} opacity="0.45" />
        </g>
      )}

      {/* Long hair in background for girls */}
      {gender === 'girl' && helmet.id === 'helm_none' && (
        <rect x="26" y="16" width="28" height="18" fill={hairColor} stroke="#18181b" strokeWidth="2" />
      )}

      {/* Legs */}
      <rect x="29" y="50" width="10" height="20" fill={legColor} stroke="#18181b" strokeWidth="2" />
      <rect x="41" y="50" width="10" height="20" fill={legColor} stroke="#18181b" strokeWidth="2" />

      {/* Torso / Armor */}
      <rect x="27" y="28" width="26" height="22" fill={armor.id === 'armor_steve' ? (gender === 'girl' ? '#ec4899' : armor.color) : armor.color} stroke="#18181b" strokeWidth="2" />
      <rect x="33" y="32" width="14" height="12" fill={armor.accent} opacity="0.55" />

      {/* Left & Right Arms */}
      <rect x={leftArmX} y="28" width={armWidth} height="20" fill={armor.id === 'armor_steve' ? (gender === 'girl' ? '#ec4899' : armor.color) : armor.color} stroke="#18181b" strokeWidth="2" />
      <rect x={rightArmX} y="28" width={armWidth} height="20" fill={armor.id === 'armor_steve' ? (gender === 'girl' ? '#ec4899' : armor.color) : armor.color} stroke="#18181b" strokeWidth="2" />
      {/* Hands */}
      <rect x={leftArmX} y="43" width={armWidth} height="6" fill={skinColor} stroke="#18181b" strokeWidth="1.5" />
      <rect x={rightArmX} y="43" width={armWidth} height="6" fill={skinColor} stroke="#18181b" strokeWidth="1.5" />

      {/* Head */}
      <rect x="28" y="8" width="24" height="20" fill={skinColor} stroke="#18181b" strokeWidth="2" />
      {/* Hair / Helmet */}
      <rect x="27" y="6" width="26" height="9" fill={hairColor} stroke="#18181b" strokeWidth="2" />
      {helmet.id !== 'helm_none' ? (
        <rect x="36" y="9" width="8" height="5" fill={helmet.accent} />
      ) : (
        gender === 'girl' && <rect x="27" y="15" width="6" height="6" fill={hairColor} stroke="#18181b" strokeWidth="1.5" /> // side bangs
      )}

      {/* Eyes & Smile */}
      <rect x="32" y="17" width="4" height="4" fill={gender === 'girl' ? '#059669' : '#1e3a8a'} />
      <rect x="44" y="17" width="4" height="4" fill={gender === 'girl' ? '#059669' : '#1e3a8a'} />
      <rect x="36" y="23" width="8" height="2.5" fill={gender === 'girl' ? '#be123c' : '#9a3412'} />

      {/* Held Weapon in Right Hand */}
      <g transform="translate(56, 20) rotate(18)">
        {/* Handle */}
        <rect x="6" y="16" width="4" height="14" fill="#78350f" stroke="#18181b" strokeWidth="1.5" />
        {/* Blade / Pickaxe head */}
        <rect x="2" y="2" width="12" height="15" fill={weapon.color} stroke="#18181b" strokeWidth="1.5" />
        <rect x="5" y="5" width="6" height="9" fill={weapon.accent} />
      </g>
    </svg>
  );
};
