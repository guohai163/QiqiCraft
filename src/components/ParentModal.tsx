import React, { useState, useEffect } from 'react';
import {
  Lock,
  Key,
  Plus,
  RotateCcw,
  Gift,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
  Clock,
  RefreshCw,
  X,
  AlertTriangle,
} from 'lucide-react';
import { AppSettings, BlockId, HomeworkTask, ParentNotice, PlayerState, SubjectType } from '../types/game';
import { BLOCK_CATALOG, SUBJECT_META } from '../data/catalog';
import { BlockCubeIcon } from './PixelVisuals';
import { sound } from '../utils/sound';

const HABIT_REASON_PRESETS = [
  '上课不认真听讲，走神做小动作',
  '晚上不按时洗漱睡觉，拖延磨蹭',
  '写作业拖拉分心，不专心完成',
  '遇到小事乱发脾气，说话没礼貌',
  '玩完玩具或学习用品不自己收拾',
  '看屏幕时间到了不肯主动放下休息',
];

interface ParentModalProps {
  isOpen?: boolean;
  isStandalonePage?: boolean;
  onClose?: () => void;
  onRefresh?: () => Promise<void>;
  state: PlayerState;
  settings: AppSettings;
  onSaveSettings: (payload: Partial<AppSettings> & { openaiApiKey?: string }) => Promise<void>;
  onUpdateState: (next: Partial<PlayerState>) => void;
}

export const ParentModal: React.FC<ParentModalProps> = ({
  isOpen = true,
  isStandalonePage = false,
  onClose,
  onRefresh,
  state,
  settings,
  onSaveSettings,
  onUpdateState,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'gallery' | 'ai'>('tasks');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // AI & Child config form
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(settings.openaiBaseUrl || 'https://api.openai.com/v1');
  const [modelName, setModelName] = useState(settings.openaiModel || 'gpt-4o');
  const [childName, setChildName] = useState(settings.childName || state.childName);
  const [childGender, setChildGender] = useState<'boy' | 'girl'>(
    settings.childGender || state.childGender || 'boy'
  );
  const [parentPin, setParentPin] = useState(settings.parentPin || '1234');
  const [dailyWorldMinutes, setDailyWorldMinutes] = useState<number>(
    settings.dailyWorldMinutes ?? 60
  );
  const [saveSuccess, setSaveSuccess] = useState('');

  // Sync form state when backend settings finish loading
  useEffect(() => {
    setBaseUrl(settings.openaiBaseUrl || 'https://api.openai.com/v1');
    setModelName(settings.openaiModel || 'gpt-4o');
    setChildName(settings.childName || state.childName);
    setChildGender(settings.childGender || state.childGender || 'boy');
    setParentPin(settings.parentPin || '1234');
    setDailyWorldMinutes(settings.dailyWorldMinutes ?? 60);
  }, [settings, state.childName, state.childGender]);

  // New Task Form
  const [newTaskSubject, setNewTaskSubject] = useState<SubjectType>('chinese');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSteps, setNewTaskSteps] = useState(2);

  // New Wish Form
  const [newWishTitle, setNewWishTitle] = useState('');
  const [newWishPrice, setNewWishPrice] = useState(50);

  // Habit Penalty / Deduction Form
  const [penaltyReason, setPenaltyReason] = useState('上课不认真听讲，走神做小动作');
  const [deductEmeralds, setDeductEmeralds] = useState<number>(10);
  const [deductBlockTarget, setDeductBlockTarget] = useState<'random' | BlockId>('random');
  const [deductBlockCount, setDeductBlockCount] = useState<number>(5);

  if (!isOpen && !isStandalonePage) return null;

  const showToast = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleManualRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    sound.playClick();
    try {
      await onRefresh();
      showToast('🔄 已同步孩子端最新数据！');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === (settings.parentPin || '1234')) {
      setUnlocked(true);
      setPinError('');
      sound.playClick();
      onRefresh?.();
    } else {
      setPinError('密码不对哦（可检查根目录 .env 文件中的 PARENT_PIN，默认：1234）');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      openaiApiKey: apiKey.trim() || undefined,
      openaiBaseUrl: baseUrl.trim(),
      openaiModel: modelName.trim(),
      childName: childName.trim(),
      childGender,
      parentPin: parentPin.trim(),
      dailyWorldMinutes: Math.max(0, Number(dailyWorldMinutes) || 0),
    });
    setApiKey('');
    showToast('✅ 配置已保存并自动同步写入 .env 配置文件！');
  };

  const handleResetDailyTasks = () => {
    const resetTasks = state.tasks.map((t) => ({ ...t, completedSteps: 0 }));
    onUpdateState({
      tasks: resetTasks,
      streakDays: state.streakDays + 1,
    });
    showToast('✅ 已开启新一天的作业打卡，连续打卡天数 +1！');
  };

  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: HomeworkTask = {
      id: `task_custom_${Date.now()}`,
      subject: newTaskSubject,
      title: newTaskTitle.trim(),
      subtitle: '完成后拍照提交，即可开启方块宝箱！',
      targetSteps: Math.max(1, newTaskSteps),
      completedSteps: 0,
      baseEmeralds: 12,
      baseXp: 40,
      dropBlockPool: ['oak_planks', 'brick', 'gold_block', 'diamond_block'],
      dropFood: 'golden_apple',
      isSportsTimer: newTaskSubject === 'sports',
    };
    onUpdateState({
      tasks: [...state.tasks, newTask],
    });
    setNewTaskTitle('');
    showToast('➕ 已新增作业任务！');
  };

  const handleDeleteTask = (id: string) => {
    onUpdateState({
      tasks: state.tasks.filter((t) => t.id !== id),
    });
  };

  const handleGrantParentBonus = () => {
    sound.playChestFanfare();
    onUpdateState({
      emeralds: state.emeralds + 25,
      blocksInventory: {
        ...state.blocksInventory,
        diamond_block: (state.blocksInventory.diamond_block || 0) + 5,
        gold_block: (state.blocksInventory.gold_block || 0) + 5,
      },
      foodsInventory: {
        ...state.foodsInventory,
        golden_apple: (state.foodsInventory.golden_apple || 0) + 2,
      },
    });
    showToast('🎁 已发放【家长表扬大礼包】（+25绿宝石、+5钻石块、+5金块、+2金苹果）！');
  };

  const handleGrantSpecialBlock = (blockId: BlockId, count: number) => {
    sound.playChestFanfare();
    const meta = BLOCK_CATALOG[blockId];
    onUpdateState({
      blocksInventory: {
        ...state.blocksInventory,
        [blockId]: (state.blocksInventory[blockId] || 0) + count,
      },
    });
    showToast(`🦄 已发放特殊发光砖块：【${meta.name} +${count}】！`);
  };

  const handleGrantAllPonyBlocks = () => {
    sound.playChestFanfare();
    onUpdateState({
      blocksInventory: {
        ...state.blocksInventory,
        pony_twilight: (state.blocksInventory.pony_twilight || 0) + 1,
        pony_rainbow: (state.blocksInventory.pony_rainbow || 0) + 1,
        pony_pinkie: (state.blocksInventory.pony_pinkie || 0) + 1,
      },
    });
    showToast('🦄✨ 已发放【小马宝莉发光砖全套礼包】（紫悦+1、云宝+1、碧琪+1）！');
  };

  const handleResetWorldPlayTime = () => {
    sound.playClick();
    onUpdateState({
      worldPlaySecondsToday: 0,
      worldPlayDate: new Date().toISOString().slice(0, 10),
    });
    showToast('⏳ 已将今日《我的世界》已玩时长清零！');
  };

  const handleAddWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWishTitle.trim()) return;
    onUpdateState({
      wishes: [
        ...state.wishes,
        {
          id: `wish_${Date.now()}`,
          title: newWishTitle.trim(),
          priceEmeralds: Math.max(10, newWishPrice),
          emoji: '🌟',
          redeemedCount: 0,
        },
      ],
    });
    setNewWishTitle('');
    showToast('🎟️ 已新增现实心愿奖励项！');
  };

  const handleSendPenaltyNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = penaltyReason.trim();
    if (!cleanReason) {
      showToast('⚠️ 请先选择或输入需要提醒小朋友改正的原因！');
      return;
    }

    const actualEmeraldsDeducted = Math.min(
      state.emeralds,
      Math.max(0, Math.floor(Number(deductEmeralds) || 0))
    );
    const reqBlockCount = Math.max(0, Math.floor(Number(deductBlockCount) || 0));

    const nextBlocksInventory: Record<BlockId, number> = { ...state.blocksInventory };
    const deductedBlocksMap: Partial<Record<BlockId, number>> = {};
    let actualBlocksDeducted = 0;

    if (reqBlockCount > 0) {
      if (deductBlockTarget === 'random') {
        let remaining = reqBlockCount;
        // Deduct from available blocks in inventory
        const availableIds = (Object.keys(nextBlocksInventory) as BlockId[]).filter(
          (k) => (nextBlocksInventory[k] || 0) > 0
        );
        while (remaining > 0 && availableIds.length > 0) {
          const randIdx = Math.floor(Math.random() * availableIds.length);
          const bId = availableIds[randIdx];
          if ((nextBlocksInventory[bId] || 0) > 0) {
            nextBlocksInventory[bId] -= 1;
            deductedBlocksMap[bId] = (deductedBlocksMap[bId] || 0) + 1;
            actualBlocksDeducted += 1;
            remaining -= 1;
            if (nextBlocksInventory[bId] <= 0) {
              availableIds.splice(randIdx, 1);
            }
          } else {
            availableIds.splice(randIdx, 1);
          }
        }
      } else {
        const currentHas = nextBlocksInventory[deductBlockTarget] || 0;
        const take = Math.min(currentHas, reqBlockCount);
        if (take > 0) {
          nextBlocksInventory[deductBlockTarget] = currentHas - take;
          deductedBlocksMap[deductBlockTarget] = take;
          actualBlocksDeducted = take;
        }
      }
    }

    const newNotice: ParentNotice = {
      id: `notice_${Date.now()}`,
      type: 'penalty',
      reason: cleanReason,
      deductEmeralds: actualEmeraldsDeducted,
      deductBlocks: deductedBlocksMap,
      totalBlocksDeducted: actualBlocksDeducted,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      acknowledged: false,
    };

    const existingNotices = state.parentNotices || [];
    sound.playWarning();
    onUpdateState({
      emeralds: Math.max(0, state.emeralds - actualEmeraldsDeducted),
      blocksInventory: nextBlocksInventory,
      parentNotices: [newNotice, ...existingNotices.slice(0, 19)],
    });

    showToast(
      `📢 已扣除（💎-${actualEmeraldsDeducted}，🧱-${actualBlocksDeducted}）并向孩子的 iPad 发送习惯提醒弹窗！`
    );
  };

  const totalBlocks = Object.values(state.blocksInventory).reduce((a, b) => a + b, 0);
  const playedMinutes = Math.floor((state.worldPlaySecondsToday || 0) / 60);

  return (
    <div
      className={
        isStandalonePage
          ? 'h-[100dvh] w-screen bg-zinc-950 text-white flex flex-col overflow-hidden select-none'
          : 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto'
      }
    >
      <div
        className={
          isStandalonePage
            ? 'w-full h-full flex flex-col overflow-hidden max-w-2xl mx-auto bg-zinc-900 sm:border-x-2 sm:border-zinc-800'
            : 'max-w-3xl w-full bg-zinc-900 border-4 border-black rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92dvh]'
        }
      >
        {/* Top Sticky Header (Mobile Portrait Friendly) */}
        <div className="bg-zinc-800 px-4 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.4rem))] pb-3 border-b-2 border-zinc-700 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="truncate">
              <h2 className="text-base sm:text-lg font-black truncate">
                {state.childName} · 家长控制台
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                💎 绿宝石 {state.emeralds} · 🧱 方块 {totalBlocks} · ⏳ 今日已玩 {playedMinutes}/
                {settings.dailyWorldMinutes ?? 60}分
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {unlocked && onRefresh && (
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 active:scale-95 text-xs font-bold flex items-center gap-1 text-zinc-100"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>刷新</span>
              </button>
            )}
            {!isStandalonePage && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-xs font-bold"
              >
                ✕ 关闭
              </button>
            )}
          </div>
        </div>

        {!unlocked ? (
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
            <form
              onSubmit={handleVerifyPin}
              className="w-full max-w-sm bg-zinc-800/60 border-2 border-zinc-700 rounded-2xl p-6 text-center space-y-4 shadow-xl"
            >
              <div className="text-5xl">🔐</div>
              <h3 className="text-xl font-black">请输入家长密码</h3>
              <p className="text-xs text-zinc-400">
                验证密码后即可在手机上管理作业、发放小马宝莉发光砖块与查看作业照片
              </p>
              <input
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="输入家长密码"
                autoFocus
                className="w-full text-center text-2xl font-black tracking-widest py-3 rounded-xl bg-black border-2 border-zinc-600 focus:border-amber-400 focus:outline-none text-white"
              />
              {pinError && <p className="text-xs text-rose-400 font-bold">{pinError}</p>}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 font-black text-base shadow-lg"
              >
                进入家长后台
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] space-y-4">
            {/* 3-Column Equal Width Mobile Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 sticky top-0 z-10">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('tasks');
                }}
                className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-black transition text-center truncate ${
                  activeTab === 'tasks'
                    ? 'bg-amber-400 text-zinc-950 shadow'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                📋 作业与发奖
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('gallery');
                  onRefresh?.();
                }}
                className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-black transition text-center truncate ${
                  activeTab === 'gallery'
                    ? 'bg-amber-400 text-zinc-950 shadow'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                📸 照片墙 ({state.submissions.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('ai');
                }}
                className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-black transition text-center truncate ${
                  activeTab === 'ai'
                    ? 'bg-amber-400 text-zinc-950 shadow'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                ⚙️ 基础与AI
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-900/90 border border-emerald-400 text-emerald-100 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {/* Tab 1: Homework Tasks & Bonus Management (Default on Mobile) */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {/* Mobile Portrait Quick Actions: Full-width stacked on phone, row on tablet */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleGrantParentBonus}
                    className="w-full p-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow"
                  >
                    <Gift className="w-4 h-4 shrink-0" />
                    <span>🎁 发放家长表扬大礼包 (+25💎/+5钻石块)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDailyTasks}
                    className="w-full p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow"
                  >
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>🌅 开启新一天（重置今日作业进度）</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetWorldPlayTime}
                    className="w-full p-3 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow"
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      ⏳ 清零今日游玩时长 ({playedMinutes}/{settings.dailyWorldMinutes ?? 60}分)
                    </span>
                  </button>
                </div>

                {/* Special Glowing My Little Pony Blocks Section */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-950/85 via-fuchsia-950/80 to-pink-950/85 border-2 border-fuchsia-400/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="text-sm font-black text-fuchsia-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>🦄 发放小马宝莉限定发光砖块</span>
                      </div>
                      <p className="text-xs text-fuchsia-300/80 mt-0.5">
                        仅限家长发放，印有小马宝莉像素图案，在《我的世界》里自带彩光！
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGrantAllPonyBlocks}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-400 to-amber-300 active:scale-[0.99] text-zinc-950 font-black text-xs border border-black shadow-mc shrink-0"
                    >
                      🎁 全套3款各发 +1 块
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['pony_twilight', 'pony_rainbow', 'pony_pinkie'] as BlockId[]).map((bId) => {
                      const meta = BLOCK_CATALOG[bId];
                      return (
                        <div
                          key={bId}
                          className="p-3 rounded-xl bg-black/50 border border-fuchsia-400/30 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <BlockCubeIcon blockId={bId} size={38} />
                            <div className="min-w-0">
                              <div className="text-xs font-black text-white truncate">
                                {meta.name}
                              </div>
                              <div className="text-[11px] text-fuchsia-300">
                                背包现有: {state.blocksInventory[bId] || 0} 块
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleGrantSpecialBlock(bId, 1)}
                              className="px-3 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 active:scale-95 text-white font-black text-xs"
                            >
                              +1块
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGrantSpecialBlock(bId, 3)}
                              className="px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-black text-xs"
                            >
                              +3块
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Habit Reminder & Deduction (Emeralds / Blocks) Section */}
                <form
                  onSubmit={handleSendPenaltyNotice}
                  className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-rose-950/85 via-zinc-900 to-orange-950/80 border-2 border-rose-500/50 space-y-3.5"
                >
                  <div>
                    <div className="text-sm font-black text-rose-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>⚠️ 习惯提醒与扣除（扣除绿宝石/砖块并弹窗语音告知原因）</span>
                    </div>
                    <p className="text-xs text-rose-300/80 mt-0.5">
                      点击发送后，孩子的 iPad 会立即弹出习惯提醒信并朗读原因，需点击“我知道啦，我一定会改正”才能关闭。
                    </p>
                  </div>

                  {/* Quick Preset Reason Chips */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-rose-200">
                      1. 点选常见原因（或直接在下方输入框修改）：
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {HABIT_REASON_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setPenaltyReason(preset);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                            penaltyReason === preset
                              ? 'bg-rose-500 text-white border-white shadow'
                              : 'bg-black/50 text-rose-200 border-rose-500/30 hover:bg-rose-950'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={penaltyReason}
                      onChange={(e) => setPenaltyReason(e.target.value)}
                      placeholder="输入要告诉小朋友的具体原因，如：今天上课不认真听讲..."
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-rose-500/40 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Deduct Emeralds & Blocks Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Deduct Emeralds */}
                    <div className="p-3 rounded-xl bg-black/50 border border-rose-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-300">
                          💎 扣除绿宝石（当前 {state.emeralds} 颗）
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={state.emeralds}
                          value={deductEmeralds}
                          onChange={(e) =>
                            setDeductEmeralds(Math.max(0, Number(e.target.value) || 0))
                          }
                          className="w-16 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-center text-sm font-black text-rose-300"
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0, 5, 10, 20].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDeductEmeralds(val)}
                            className={`py-1.5 rounded-lg text-xs font-black border ${
                              deductEmeralds === val
                                ? 'bg-rose-500 text-white border-white'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {val === 0 ? '不扣(0)' : `-${val}💎`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Deduct Blocks */}
                    <div className="p-3 rounded-xl bg-black/50 border border-rose-500/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-amber-300">
                          🧱 扣除砖块（当前共 {totalBlocks} 块）
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={totalBlocks}
                          value={deductBlockCount}
                          onChange={(e) =>
                            setDeductBlockCount(Math.max(0, Number(e.target.value) || 0))
                          }
                          className="w-16 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-center text-sm font-black text-rose-300"
                        />
                      </div>

                      <select
                        value={deductBlockTarget}
                        onChange={(e) =>
                          setDeductBlockTarget(e.target.value as 'random' | BlockId)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                      >
                        <option value="random">🎲 从背包现有砖块中随机扣除</option>
                        {(Object.keys(BLOCK_CATALOG) as BlockId[]).map((bId) => {
                          const count = state.blocksInventory[bId] || 0;
                          if (count <= 0) return null;
                          return (
                            <option key={bId} value={bId}>
                              指定扣除：{BLOCK_CATALOG[bId].name} (现有 {count} 块)
                            </option>
                          );
                        })}
                      </select>

                      <div className="grid grid-cols-4 gap-1.5">
                        {[0, 5, 10, 20].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDeductBlockCount(val)}
                            className={`py-1.5 rounded-lg text-xs font-black border ${
                              deductBlockCount === val
                                ? 'bg-rose-500 text-white border-white'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {val === 0 ? '不扣(0)' : `-${val}块`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:brightness-110 active:scale-[0.99] text-white font-black text-xs sm:text-sm border border-black shadow-mc flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>📢 立即扣除并向孩子 iPad 发送语音提醒弹窗</span>
                  </button>

                  {/* Recent Habit Notices Status */}
                  {state.parentNotices && state.parentNotices.length > 0 && (
                    <div className="pt-2 border-t border-rose-500/30 space-y-1.5">
                      <div className="text-[11px] font-bold text-rose-300">
                        最近发送的提醒记录：
                      </div>
                      {state.parentNotices.slice(0, 3).map((n) => (
                        <div
                          key={n.id}
                          className="p-2 rounded-lg bg-black/40 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-bold text-amber-200">“{n.reason}”</span>
                            <span className="text-zinc-400 ml-1.5">
                              (💎-{n.deductEmeralds} · 🧱-{n.totalBlocksDeducted})
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                              n.acknowledged
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {n.acknowledged ? '✅ 孩子已读确认' : '⏳ 待孩子查看'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </form>

                {/* Current Tasks List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-zinc-400">📚 当前每日作业列表：</h4>
                  {state.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-zinc-800/90 border border-zinc-700 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{SUBJECT_META[t.subject].icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{t.title}</div>
                          <div className="text-xs text-zinc-400">
                            今日已交：{t.completedSteps} / {t.targetSteps} 小节 · 奖励 💎
                            {t.baseEmeralds}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 shrink-0"
                        title="删除任务"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Task Form */}
                <form
                  onSubmit={handleAddNewTask}
                  className="p-3.5 sm:p-4 rounded-2xl bg-zinc-800/60 border border-zinc-700 space-y-3"
                >
                  <div className="text-xs font-black text-lime-300">➕ 新增一项作业任务：</div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={newTaskSubject}
                      onChange={(e) => setNewTaskSubject(e.target.value as SubjectType)}
                      className="col-span-2 px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-sm text-white"
                    >
                      <option value="chinese">📖 语文</option>
                      <option value="math">🔢 数学</option>
                      <option value="english">🔤 英语</option>
                      <option value="sports">🏃 体育</option>
                    </select>
                    <div className="flex items-center gap-1.5 bg-black border border-zinc-700 rounded-xl px-2.5">
                      <span className="text-xs text-zinc-400 shrink-0">小节:</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={newTaskSteps}
                        onChange={(e) => setNewTaskSteps(Number(e.target.value) || 1)}
                        className="w-full py-2 bg-transparent text-sm text-center font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="例如：背诵《古诗二首》 / 口算练习"
                      className="flex-1 px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-sm text-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-black text-xs sm:text-sm flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> 添加
                    </button>
                  </div>
                </form>

                {/* Add New Real-Life Wish */}
                <form
                  onSubmit={handleAddWish}
                  className="p-3.5 sm:p-4 rounded-2xl bg-zinc-800/60 border border-zinc-700 space-y-3"
                >
                  <div className="text-xs font-black text-pink-300">🎟️ 新增现实心愿奖励项：</div>
                  <input
                    type="text"
                    value={newWishTitle}
                    onChange={(e) => setNewWishTitle(e.target.value)}
                    placeholder="例如：周末去游乐场 / 买一套我的世界乐高"
                    className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-sm text-white"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 bg-black border border-zinc-700 rounded-xl px-3 py-2 flex-1">
                      <span className="text-xs text-zinc-400">兑换所需💎绿宝石:</span>
                      <input
                        type="number"
                        value={newWishPrice}
                        onChange={(e) => setNewWishPrice(Number(e.target.value) || 30)}
                        className="w-20 bg-transparent text-sm font-bold text-amber-300 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="py-2.5 px-5 rounded-xl bg-pink-500 hover:bg-pink-400 text-black font-black text-xs sm:text-sm shrink-0"
                    >
                      ➕ 添加心愿
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 2: Homework Photo Gallery */}
            {activeTab === 'gallery' && (
              <div className="space-y-3">
                {state.submissions.length === 0 ? (
                  <div className="text-center py-14 text-zinc-400 text-sm">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    还没有提交过作业照片哦，小朋友拍照提交后这里会实时显示！
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {state.submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-zinc-800 border border-zinc-700 rounded-2xl p-3 flex flex-col gap-2.5"
                      >
                        {sub.imageUrl && (
                          <div
                            onClick={() => setPreviewPhotoUrl(sub.imageUrl || null)}
                            className="relative group cursor-pointer overflow-hidden rounded-xl border border-zinc-600 bg-black"
                          >
                            <img
                              src={sub.imageUrl}
                              alt={sub.taskTitle}
                              loading="lazy"
                              className="w-full h-48 object-cover"
                            />
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[11px] text-zinc-200 font-bold">
                              🔍 点击放大查看
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-black text-amber-300 truncate">
                            {sub.taskTitle}
                          </span>
                          <span className="text-[11px] text-zinc-400 shrink-0">
                            {sub.timestamp}
                          </span>
                        </div>
                        {sub.studentNote && (
                          <p className="text-xs text-lime-300 bg-black/40 px-2.5 py-1.5 rounded-lg">
                            👦 留言：{sub.studentNote}
                          </p>
                        )}
                        <p className="text-xs text-zinc-200 leading-relaxed">
                          🧙‍♂️ 村长评语：“{sub.aiReview.villageChiefComment}”
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: OpenAI & Environment Settings */}
            {activeTab === 'ai' && (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-blue-950/60 border border-blue-400/40 text-xs text-blue-200 leading-relaxed">
                  <div className="font-bold text-blue-300 mb-1">
                    📁 集中环境变量配置模式（.env / Docker）
                  </div>
                  在下方修改并保存后会自动同步写入服务器 <code className="font-mono text-amber-300">.env</code> 配置文件。
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      👦 小朋友昵称：
                    </label>
                    <input
                      type="text"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      👕 角色性别：
                    </label>
                    <select
                      value={childGender}
                      onChange={(e) => setChildGender(e.target.value as 'boy' | 'girl')}
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-white text-sm"
                    >
                      <option value="boy">男孩</option>
                      <option value="girl">女孩</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1">
                      🔐 家长密码：
                    </label>
                    <input
                      type="text"
                      value={parentPin}
                      onChange={(e) => setParentPin(e.target.value)}
                      placeholder="默认 1234"
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-amber-300 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-lime-300 mb-1">
                      ⏳ 每日限时(分钟)：
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={dailyWorldMinutes}
                      onChange={(e) =>
                        setDailyWorldMinutes(Math.max(0, Number(e.target.value) || 0))
                      }
                      placeholder="默认 60"
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-lime-300 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-800/70 border border-zinc-700 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                      <Key className="w-4 h-4" />
                      <span>OpenAI 视觉模型配置</span>
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-black text-emerald-400 font-bold">
                      {settings.hasApiKey
                        ? `已配置 (${settings.openaiApiKeyMasked})`
                        : '未配置 Key'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      API Key (OPENAI_API_KEY，留空则保持原配置)：
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        settings.hasApiKey
                          ? `已设置 (${settings.openaiApiKeyMasked})，输入可覆盖`
                          : 'sk-...'
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-white text-sm font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        API Base URL (OPENAI_BASE_URL)：
                      </label>
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-white text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        视觉模型名称 (OPENAI_MODEL)：
                      </label>
                      <input
                        type="text"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="gpt-4o"
                        className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-700 text-white text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-lime-500 hover:bg-lime-400 active:scale-[0.99] text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>💾 保存并同步写入 .env</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Photo Lightbox for Parent Phone Inspection */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-3"
        >
          <button
            type="button"
            onClick={() => setPreviewPhotoUrl(null)}
            className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] right-4 px-3.5 py-2 rounded-xl bg-zinc-800 text-white font-bold text-xs flex items-center gap-1 border border-zinc-600"
          >
            <X className="w-4 h-4" /> 关闭预览
          </button>
          <img
            src={previewPhotoUrl}
            alt="作业大图预览"
            className="max-w-full max-h-[85dvh] object-contain rounded-xl"
          />
        </div>
      )}
    </div>
  );
};
