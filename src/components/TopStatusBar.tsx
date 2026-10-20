import React from 'react';
import { Volume2, VolumeX, Settings, Sparkles, Flame } from 'lucide-react';
import { AppSettings, PlayerState } from '../types/game';
import { PET_META } from '../data/catalog';
import { sound } from '../utils/sound';

interface TopStatusBarProps {
  state: PlayerState;
  settings: AppSettings;
  onOpenParentModal: () => void;
  onToggleSound: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  state,
  settings,
  onOpenParentModal,
  onToggleSound,
}) => {
  const totalBlocks = Object.values(state.blocksInventory).reduce((acc, v) => acc + v, 0);
  const activePet = state.pets[state.activePetId] || state.pets.wolf;
  const petMeta = PET_META[activePet.id];

  return (
    <header className="w-full bg-[#2c3823] border-b-4 border-[#151c10] px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg z-20">
      {/* Left: Player Info & XP Level Bar */}
      <div className="flex items-center gap-3">
        <img
          src="/icon-192.png"
          alt="淇淇方块学院 QiqiCraft Academy"
          title="淇淇方块学院 QiqiCraft Academy"
          className="w-12 h-12 rounded-xl border-2 border-black shadow-mc hidden sm:block"
        />
        <div className="w-12 h-12 rounded-lg bg-[#5b8731] border-2 border-black shadow-mc flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-lime-200 leading-none">LV</span>
          <span className="text-xl font-black text-yellow-300 leading-tight drop-shadow">
            {state.level}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-base md:text-lg text-white tracking-wide">
              {state.childName}
            </span>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              连续打卡 {state.streakDays} 天
            </span>
          </div>

          {/* Minecraft Green XP Bar */}
          <div className="mt-1 flex items-center gap-2">
            <div className="w-36 md:w-48 h-3.5 bg-black/70 border-2 border-zinc-700 rounded-sm overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-lime-500 via-emerald-400 to-lime-300 transition-all duration-500"
                style={{ width: `${Math.min(100, state.xp)}%` }}
              />
              {/* XP Bar segment ticks */}
              <div className="absolute inset-0 flex justify-between px-2 pointer-events-none opacity-35">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-0.5 h-full bg-black" />
                ))}
              </div>
            </div>
            <span className="text-xs font-bold text-lime-300">{state.xp}/100 XP</span>
          </div>
        </div>
      </div>

      {/* Center: Resource Counters (Emeralds, Total Blocks, Active Pet, Sports Energy) */}
      <div className="flex items-center gap-2.5 md:gap-4 flex-wrap">
        {/* Emeralds */}
        <div className="bg-black/45 border-2 border-emerald-500/50 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-inner">
          <span className="text-xl">💎</span>
          <div>
            <div className="text-[10px] text-emerald-300 font-bold leading-none">绿宝石</div>
            <div className="text-base md:text-lg font-black text-emerald-400 leading-tight">
              {state.emeralds}
            </div>
          </div>
        </div>

        {/* Blocks Inventory Count */}
        <div className="bg-black/45 border-2 border-amber-500/50 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-inner">
          <span className="text-xl">🧱</span>
          <div>
            <div className="text-[10px] text-amber-200 font-bold leading-none">背包方块</div>
            <div className="text-base md:text-lg font-black text-amber-300 leading-tight">
              {totalBlocks}
            </div>
          </div>
        </div>

        {/* Active Pet Quick Badge */}
        <div className="hidden sm:flex bg-black/45 border-2 border-pink-500/40 rounded-lg px-3 py-1.5 items-center gap-2 shadow-inner">
          <span className="text-xl">🐾</span>
          <div>
            <div className="text-[10px] text-pink-200 font-bold leading-none">
              伙伴：{petMeta.name}
            </div>
            <div className="text-xs font-extrabold text-pink-300 leading-tight mt-0.5">
              Lv.{activePet.level} · 心情 {activePet.mood}%
            </div>
          </div>
        </div>
      </div>

      {/* Right: AI Status Badge, Sound & Parent Settings */}
      <div className="flex items-center gap-2">
        <div
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${
            settings.hasApiKey
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
          }`}
          title={settings.hasApiKey ? `已连接 ${settings.openaiModel}` : '当前使用智能村长体验模式，可在家长设置配置 OpenAI Key'}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{settings.hasApiKey ? 'AI村长在线' : '智能村长模式'}</span>
        </div>

        <button
          onClick={() => {
            onToggleSound();
            sound.playClick();
          }}
          className="p-2.5 rounded-lg bg-[#4a5d3b] hover:bg-[#5c7349] active:translate-y-0.5 border-2 border-black shadow-mc text-white transition"
          title={settings.soundEnabled ? '音效与语音已开启' : '已静音'}
        >
          {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-zinc-400" />}
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onOpenParentModal();
          }}
          className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 active:translate-y-0.5 border-2 border-black shadow-mc text-xs md:text-sm font-bold flex items-center gap-1.5 text-zinc-100"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">家长设置</span>
        </button>
      </div>
    </header>
  );
};
