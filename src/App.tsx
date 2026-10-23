import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BookOpen, Castle, Cat, Shield } from 'lucide-react';
import {
  AIReviewResult,
  AppSettings,
  BlockId,
  PlacedBlock,
  PlayerState,
} from './types/game';
import { DEFAULT_HOMEWORK_TASKS } from './data/catalog';
import { TopStatusBar } from './components/TopStatusBar';
import { QuestBoard } from './components/QuestBoard';
import { VoxelWorld } from './components/VoxelWorld';
import { PetSanctuary } from './components/PetSanctuary';
import { HeroShop } from './components/HeroShop';
import { RewardChestModal } from './components/RewardChestModal';
import { ParentModal } from './components/ParentModal';
import { ParentNoticeModal } from './components/ParentNoticeModal';
import { sound } from './utils/sound';
import { getBrowserLocalDateString, getBrowserTimeZone } from './utils/time';

type NavTab = 'quests' | 'world' | 'pets' | 'shop';

const FALLBACK_INITIAL_STATE: PlayerState = {
  childName: '小矿工淇淇',
  childGender: 'boy',
  level: 1,
  xp: 20,
  emeralds: 25,
  sportsEnergy: 40,
  streakDays: 1,
  lastActiveDate: getBrowserLocalDateString(),
  blocksInventory: {
    grass: 8,
    dirt: 6,
    oak_wood: 4,
    oak_planks: 8,
    cobblestone: 6,
    brick: 0,
    glass: 2,
    cherry_leaves: 3,
    bookshelf: 0,
    water: 0,
    gold_block: 0,
    diamond_block: 0,
    glowstone: 1,
    tnt: 0,
    pony_twilight: 0,
    pony_rainbow: 0,
    pony_pinkie: 0,
  },
  foodsInventory: {
    bone: 3,
    fish: 2,
    sweet_berries: 2,
    bamboo: 2,
    golden_apple: 1,
  },
  pets: {
    wolf: { id: 'wolf', name: '闪电小狼', unlocked: true, level: 1, exp: 20, hunger: 80, mood: 90 },
    cat: { id: 'cat', name: '橘子喵喵', unlocked: false, level: 1, exp: 0, hunger: 75, mood: 85 },
    fox: { id: 'fox', name: '赤焰小狐', unlocked: false, level: 1, exp: 0, hunger: 75, mood: 85 },
    axolotl: { id: 'axolotl', name: '泡泡美西螈', unlocked: false, level: 1, exp: 0, hunger: 80, mood: 90 },
    panda: { id: 'panda', name: '竹林滚滚', unlocked: false, level: 1, exp: 0, hunger: 75, mood: 85 },
  },
  activePetId: 'wolf',
  unlockedGear: ['helm_none', 'armor_steve', 'weapon_pickaxe', 'cape_none'],
  equippedGear: {
    helmet: 'helm_none',
    armor: 'armor_steve',
    weapon: 'weapon_pickaxe',
    cape: 'cape_none',
  },
  tasks: DEFAULT_HOMEWORK_TASKS,
  placedBlocks: [
    { x: -1, y: 1, z: -1, type: 'oak_wood' },
    { x: 1, y: 1, z: -1, type: 'oak_wood' },
    { x: -1, y: 2, z: -1, type: 'oak_wood' },
    { x: 0, y: 2, z: -1, type: 'glowstone' },
    { x: 1, y: 2, z: -1, type: 'oak_wood' },
    { x: 2, y: 1, z: 1, type: 'cherry_leaves' },
  ],
  worldTheme: 'plains',
  worldSizeLevel: 1,
  worldPlaySecondsToday: 0,
  worldPlayDate: getBrowserLocalDateString(),
  submissions: [],
  wishes: [
    { id: 'wish_mc_time', title: '周末玩30分钟《我的世界》', priceEmeralds: 60, emoji: '🎮', redeemedCount: 0 },
    { id: 'wish_park', title: '周末去公园骑车/放风筝', priceEmeralds: 50, emoji: '🪁', redeemedCount: 0 },
    { id: 'wish_snack', title: '兑换一份最爱的小零食/冰淇淋', priceEmeralds: 40, emoji: '🍦', redeemedCount: 0 },
  ],
};

const FALLBACK_SETTINGS: AppSettings = {
  openaiApiKeyMasked: '',
  hasApiKey: false,
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-4o',
  childName: '小矿工淇淇',
  childGender: 'boy',
  parentPin: '1234',
  dailyWorldMinutes: 60,
  voiceEnabled: true,
  soundEnabled: true,
};

export const App: React.FC = () => {
  const isParentRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/parent' || window.location.pathname.startsWith('/parent/'));

  const [activeTab, setActiveTab] = useState<NavTab>('quests');
  const [state, setState] = useState<PlayerState>(FALLBACK_INITIAL_STATE);
  const [settings, setSettings] = useState<AppSettings>(FALLBACK_SETTINGS);
  const [latestReview, setLatestReview] = useState<AIReviewResult | null>(null);
  const lastLocalMutationRef = useRef<number>(0);

  const fetchStateFromServer = useCallback(async (isBackgroundPoll = false) => {
    try {
      const tz = encodeURIComponent(getBrowserTimeZone());
      const r = await fetch(`/api/state?tz=${tz}`);
      if (!r.ok) return;
      const data = await r.json();
      if (isBackgroundPoll && Date.now() - lastLocalMutationRef.current < 3500) {
        return;
      }
      const nextSettings = data?.settings;
      const nextState = data?.state;
      if (nextState) {
        if (nextSettings?.childName) {
          nextState.childName = nextSettings.childName;
        } else if (nextState.childName && nextState.childName.includes('奇奇')) {
          nextState.childName = nextState.childName.replace(/奇奇/g, '淇淇');
        }
        setState(nextState);
      }
      if (nextSettings) {
        setSettings(nextSettings);
        sound.soundEnabled = nextSettings.soundEnabled;
        sound.voiceEnabled = nextSettings.voiceEnabled;
      }
    } catch (err) {
      if (!isBackgroundPoll) {
        console.warn('Using local fallback state:', err);
      }
    }
  }, []);

  // Load initial state from backend & periodically sync changes between Parent Phone (/parent) and Child iPad
  useEffect(() => {
    fetchStateFromServer(false);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchStateFromServer(true);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchStateFromServer]);

  // Persist state changes to backend
  const handleUpdateState = (partial: Partial<PlayerState>) => {
    lastLocalMutationRef.current = Date.now();
    setState((prev) => ({ ...prev, ...partial }));
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    }).catch((err) => console.warn('Failed to sync state:', err));
  };

  const handleUpdateWorld = (
    placedBlocks: PlacedBlock[],
    blocksInventory: Record<BlockId, number>
  ) => {
    handleUpdateState({ placedBlocks, blocksInventory });
  };

  const handleSaveSettings = async (
    payload: Partial<AppSettings> & { openaiApiKey?: string }
  ) => {
    lastLocalMutationRef.current = Date.now();
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.settings) {
      setSettings(data.settings);
      setState((prev) => {
        const next = { ...prev };
        if (payload.childName) next.childName = payload.childName;
        if (payload.childGender) next.childGender = payload.childGender as 'boy' | 'girl';
        return next;
      });
    }
  };

  const handleToggleSound = () => {
    const nextEnabled = !settings.soundEnabled;
    sound.soundEnabled = nextEnabled;
    sound.voiceEnabled = nextEnabled;
    setSettings((prev) => ({ ...prev, soundEnabled: nextEnabled, voiceEnabled: nextEnabled }));
    handleSaveSettings({ soundEnabled: nextEnabled, voiceEnabled: nextEnabled });
  };

  const handleSubmitHomework = async (payload: {
    taskId: string;
    imageBase64?: string;
    studentNote?: string;
    sportsScore?: number;
    isDemoSample?: boolean;
  }): Promise<AIReviewResult | null> => {
    lastLocalMutationRef.current = Date.now();
    const res = await fetch('/api/homework/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        clientTimeZone: getBrowserTimeZone(),
        clientTimestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      }),
    });
    const data = await res.json();
    if (data?.state) {
      setState(data.state);
    }
    if (data?.review) {
      setLatestReview(data.review);
      return data.review;
    }
    return null;
  };

  const handleAcknowledgeNotice = (noticeId: string) => {
    const updatedNotices = (state.parentNotices || []).map((n) =>
      n.id === noticeId ? { ...n, acknowledged: true } : n
    );
    handleUpdateState({ parentNotices: updatedNotices });
  };

  const unacknowledgedNotice =
    (state.parentNotices || []).find((n) => !n.acknowledged) || null;

  // Dedicated standalone Parent Console route (/parent) for parent's phone in portrait mode
  if (isParentRoute) {
    return (
      <ParentModal
        isStandalonePage
        state={state}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onUpdateState={handleUpdateState}
        onRefresh={() => fetchStateFromServer(false)}
      />
    );
  }

  const totalBlocks = Object.values(state.blocksInventory).reduce((a, b) => a + b, 0);

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-[#1e2618] text-white select-none overflow-hidden">
      {/* Top Minecraft Status Bar (Parent button removed for child UI) */}
      <TopStatusBar
        state={state}
        settings={settings}
        onToggleSound={handleToggleSound}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'quests' && (
          <QuestBoard
            state={state}
            onSubmitHomework={handleSubmitHomework}
            onSelectReview={(rev) => setLatestReview(rev)}
          />
        )}
        {activeTab === 'world' && (
          <VoxelWorld
            state={state}
            dailyWorldMinutes={settings.dailyWorldMinutes ?? 60}
            onUpdateWorld={handleUpdateWorld}
            onUpdateState={handleUpdateState}
            onNavigateToQuests={() => setActiveTab('quests')}
          />
        )}
        {activeTab === 'pets' && (
          <PetSanctuary state={state} onUpdateState={handleUpdateState} />
        )}
        {activeTab === 'shop' && (
          <HeroShop state={state} onUpdateState={handleUpdateState} />
        )}
      </main>

      {/* Bottom iPad Hotbar Navigation Dock - Padded at bottom to clear iPadOS Home Indicator white bar */}
      <nav className="bg-[#232d1b] border-t-4 border-[#11170c] px-4 pt-2 pb-[max(1.35rem,calc(env(safe-area-inset-bottom,0px)+0.65rem))] flex items-center justify-around sm:justify-center sm:gap-5 z-20 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('quests');
          }}
          className={`flex-1 sm:flex-initial sm:min-w-[180px] py-2.5 px-4 rounded-xl border-2 border-black font-black text-sm md:text-base flex items-center justify-center gap-2 transition ${
            activeTab === 'quests'
              ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-zinc-950 shadow-mc -translate-y-1'
              : 'bg-[#38472b] hover:bg-[#465936] text-white shadow-mc'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>📅 作业闯关岛</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('world');
          }}
          className={`flex-1 sm:flex-initial sm:min-w-[180px] py-2.5 px-4 rounded-xl border-2 border-black font-black text-sm md:text-base flex items-center justify-center gap-2 transition ${
            activeTab === 'world'
              ? 'bg-gradient-to-b from-lime-400 to-emerald-500 text-zinc-950 shadow-mc -translate-y-1'
              : 'bg-[#38472b] hover:bg-[#465936] text-white shadow-mc'
          }`}
        >
          <Castle className="w-5 h-5" />
          <span>🏰 我的世界 ({totalBlocks})</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('pets');
          }}
          className={`flex-1 sm:flex-initial sm:min-w-[180px] py-2.5 px-4 rounded-xl border-2 border-black font-black text-sm md:text-base flex items-center justify-center gap-2 transition ${
            activeTab === 'pets'
              ? 'bg-gradient-to-b from-pink-400 to-rose-500 text-zinc-950 shadow-mc -translate-y-1'
              : 'bg-[#38472b] hover:bg-[#465936] text-white shadow-mc'
          }`}
        >
          <Cat className="w-5 h-5" />
          <span>🐾 萌宠乐园</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('shop');
          }}
          className={`flex-1 sm:flex-initial sm:min-w-[180px] py-2.5 px-4 rounded-xl border-2 border-black font-black text-sm md:text-base flex items-center justify-center gap-2 transition ${
            activeTab === 'shop'
              ? 'bg-gradient-to-b from-cyan-400 to-teal-500 text-zinc-950 shadow-mc -translate-y-1'
              : 'bg-[#38472b] hover:bg-[#465936] text-white shadow-mc'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>🛡️ 换装与商店</span>
        </button>
      </nav>

      {/* Reward Chest Loot Modal */}
      <RewardChestModal
        review={latestReview}
        onClose={() => setLatestReview(null)}
        onGoToBuild={() => {
          setLatestReview(null);
          setActiveTab('world');
        }}
      />

      {/* Parent Habit Reminder & Deduction Notice Modal */}
      <ParentNoticeModal
        childName={state.childName}
        notice={unacknowledgedNotice}
        onAcknowledge={handleAcknowledgeNotice}
      />
    </div>
  );
};

export default App;
