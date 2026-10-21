import React, { useState } from 'react';
import { Lock, Key, Plus, RotateCcw, Gift, Trash2, CheckCircle2, Image as ImageIcon, Sparkles, Clock } from 'lucide-react';
import { AppSettings, BlockId, HomeworkTask, PlayerState, SubjectType } from '../types/game';
import { BLOCK_CATALOG, SUBJECT_META } from '../data/catalog';
import { BlockCubeIcon } from './PixelVisuals';
import { sound } from '../utils/sound';

interface ParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: PlayerState;
  settings: AppSettings;
  onSaveSettings: (payload: Partial<AppSettings> & { openaiApiKey?: string }) => Promise<void>;
  onUpdateState: (next: Partial<PlayerState>) => void;
}

export const ParentModal: React.FC<ParentModalProps> = ({
  isOpen,
  onClose,
  state,
  settings,
  onSaveSettings,
  onUpdateState,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<'ai' | 'tasks' | 'gallery'>('ai');

  // AI & Child config form
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(settings.openaiBaseUrl || 'https://api.openai.com/v1');
  const [modelName, setModelName] = useState(settings.openaiModel || 'gpt-4o');
  const [childName, setChildName] = useState(settings.childName || state.childName);
  const [childGender, setChildGender] = useState(settings.childGender || state.childGender || 'boy');
  const [parentPin, setParentPin] = useState(settings.parentPin || '1234');
  const [dailyWorldMinutes, setDailyWorldMinutes] = useState<number>(settings.dailyWorldMinutes ?? 60);
  const [saveSuccess, setSaveSuccess] = useState('');

  // New Task Form
  const [newTaskSubject, setNewTaskSubject] = useState<SubjectType>('chinese');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSteps, setNewTaskSteps] = useState(2);

  // New Wish Form
  const [newWishTitle, setNewWishTitle] = useState('');
  const [newWishPrice, setNewWishPrice] = useState(50);

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === (settings.parentPin || '1234')) {
      setUnlocked(true);
      setPinError('');
      sound.playClick();
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
      childGender: childGender as 'boy' | 'girl',
      parentPin: parentPin.trim(),
      dailyWorldMinutes: Math.max(0, Number(dailyWorldMinutes) || 0),
    });
    setApiKey('');
    setSaveSuccess('✅ 配置已保存并自动同步写入 .env 配置文件！');
    setTimeout(() => setSaveSuccess(''), 2500);
  };

  const handleResetDailyTasks = () => {
    const resetTasks = state.tasks.map((t) => ({ ...t, completedSteps: 0 }));
    onUpdateState({
      tasks: resetTasks,
      streakDays: state.streakDays + 1,
    });
    setSaveSuccess('✅ 已开启新一天的作业打卡，连续打卡天数 +1！');
    setTimeout(() => setSaveSuccess(''), 2500);
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
    setSaveSuccess('🎁 已手动为小朋友发放【家长表扬大礼包】（+25绿宝石、+5钻石块、+5金块、+2金苹果）！');
    setTimeout(() => setSaveSuccess(''), 3000);
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
    setSaveSuccess(`🦄 已成功为小朋友发放特殊发光砖块：【${meta.name} +${count}】！`);
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleGrantAllPonyBlocks = () => {
    sound.playChestFanfare();
    onUpdateState({
      blocksInventory: {
        ...state.blocksInventory,
        pony_twilight: (state.blocksInventory.pony_twilight || 0) + 5,
        pony_rainbow: (state.blocksInventory.pony_rainbow || 0) + 5,
        pony_pinkie: (state.blocksInventory.pony_pinkie || 0) + 5,
      },
    });
    setSaveSuccess('🦄✨ 已发放【小马宝莉发光砖全套大礼包】（紫悦+5、云宝+5、碧琪+5）！');
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const handleResetWorldPlayTime = () => {
    sound.playClick();
    onUpdateState({
      worldPlaySecondsToday: 0,
      worldPlayDate: new Date().toISOString().slice(0, 10),
    });
    setSaveSuccess('⏳ 已将今日《我的世界》已玩时长清零，小朋友可重新获得完整建造时间！');
    setTimeout(() => setSaveSuccess(''), 3000);
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
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-3xl w-full bg-zinc-900 border-4 border-black rounded-2xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="bg-zinc-800 px-6 py-4 border-b-2 border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black">家长控制台（OpenAI 接口配置 · 作业管理 · 照片历史）</h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm font-bold"
          >
            ✕ 关闭
          </button>
        </div>

        {!unlocked ? (
          <form onSubmit={handleVerifyPin} className="p-8 max-w-sm mx-auto text-center space-y-4">
            <div className="text-4xl">🔐</div>
            <h3 className="text-lg font-black">请输入家长密码</h3>
            <p className="text-xs text-zinc-400">默认初始密码为：1234</p>
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="输入 1234"
              autoFocus
              className="w-full text-center text-2xl font-black tracking-widest py-2.5 rounded-xl bg-black border-2 border-zinc-600 focus:border-amber-400 focus:outline-none"
            />
            {pinError && <p className="text-xs text-rose-400 font-bold">{pinError}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black"
            >
              进入家长后台
            </button>
          </form>
        ) : (
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-zinc-700 pb-3">
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-2 rounded-xl text-sm font-black ${
                  activeTab === 'ai' ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                🤖 OpenAI 模型与基础设置
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 rounded-xl text-sm font-black ${
                  activeTab === 'tasks' ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                📋 每日作业与奖励管理
              </button>
              <button
                onClick={() => setActiveTab('gallery')}
                className={`px-4 py-2 rounded-xl text-sm font-black ${
                  activeTab === 'gallery' ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                📸 作业照片墙 ({state.submissions.length})
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-900/80 border border-emerald-400 text-emerald-200 text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {/* Tab 1: OpenAI & Environment Settings */}
            {activeTab === 'ai' && (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                {/* .env File Banner Notice */}
                <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-400/40 text-xs text-blue-200 leading-relaxed">
                  <div className="font-bold flex items-center gap-1.5 text-blue-300 mb-1">
                    <span>📁 集中环境变量配置模式（.env / Docker）</span>
                  </div>
                  家长密码与 OpenAI 密钥已改为由项目根目录的 <code className="px-1 py-0.5 rounded bg-black/60 font-mono text-amber-300">.env</code> 配置文件集中管理。你可以在下方直接修改并保存（会自动写入 <code className="font-mono text-amber-300">.env</code>），也可以直接在 Linux 终端通过 vim/nano 修改根目录的 <code className="font-mono text-amber-300">.env</code> 文件。
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        👦 小朋友昵称 (CHILD_NAME)：
                      </label>
                      <input
                        type="text"
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black border border-zinc-700 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        👕 性别 (CHILD_GENDER)：
                      </label>
                      <select
                        value={childGender}
                        onChange={(e) => setChildGender(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black border border-zinc-700 text-white text-sm"
                      >
                        <option value="boy">男孩</option>
                        <option value="girl">女孩</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-amber-300 mb-1">
                        🔐 家长密码 (PARENT_PIN)：
                      </label>
                      <input
                        type="text"
                        value={parentPin}
                        onChange={(e) => setParentPin(e.target.value)}
                        placeholder="默认 1234"
                        className="w-full px-3.5 py-2 rounded-xl bg-black border border-zinc-700 text-amber-300 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-lime-300 mb-1">
                        ⏳ 每日限时(分, DAILY_WORLD_MINUTES)：
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={600}
                        value={dailyWorldMinutes}
                        onChange={(e) => setDailyWorldMinutes(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="默认 60"
                        className="w-full px-3.5 py-2 rounded-xl bg-black border border-zinc-700 text-lime-300 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-800/70 border border-zinc-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                      <Key className="w-4 h-4" />
                      <span>OpenAI Vision 视觉模型配置 (.env)</span>
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-black text-emerald-400 font-bold">
                      {settings.hasApiKey
                        ? `当前已配置 (${settings.openaiApiKeyMasked})`
                        : '未配置 Key（当前运行智能村长体验模式）'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      OpenAI API Key (OPENAI_API_KEY，留空则保持原配置)：
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={settings.hasApiKey ? `已设置 (${settings.openaiApiKeyMasked})，输入可覆盖` : 'sk-...'}
                      className="w-full px-3.5 py-2 rounded-xl bg-black border border-zinc-700 text-white text-sm font-mono"
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
                        className="w-full px-3.5 py-2 rounded-xl bg-black border border-zinc-700 text-white text-sm font-mono"
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
                        className="w-full px-3.5 py-2 rounded-xl bg-black border border-zinc-700 text-white text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-black text-sm flex items-center gap-2"
                >
                  <span>💾 保存并同步写入 .env</span>
                </button>
              </form>
            )}

            {/* Tab 2: Homework Tasks & Bonus Management */}
            {activeTab === 'tasks' && (
              <div className="space-y-5">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleResetDailyTasks}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>开启新一天（重置今日作业格数）</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGrantParentBonus}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5"
                  >
                    <Gift className="w-4 h-4" />
                    <span>🎁 发【家长表扬大礼包】(+25绿宝石 & +5钻石块)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetWorldPlayTime}
                    className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" />
                    <span>
                      ⏳ 重置今日《我的世界》时长 (已玩 {Math.floor((state.worldPlaySecondsToday || 0) / 60)} 分钟 / 限{' '}
                      {settings.dailyWorldMinutes ?? 60} 分钟)
                    </span>
                  </button>
                </div>

                {/* Special Glowing My Little Pony Blocks Section */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-fuchsia-950/75 to-pink-950/80 border-2 border-fuchsia-400/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-fuchsia-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>🦄 发放特殊发光砖块（小马宝莉限定系列 · 夜晚自带彩光）</span>
                      </div>
                      <p className="text-xs text-fuchsia-300/80 mt-0.5">
                        该系列仅限家长控制面板表扬发放，表面印有小马宝莉像素头像与可爱标志，在《我的世界》中会自己发光！
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGrantAllPonyBlocks}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-400 to-amber-300 hover:brightness-110 text-zinc-950 font-black text-xs border border-black shadow-mc shrink-0"
                    >
                      🎁 全套3款各发 +5 块
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(['pony_twilight', 'pony_rainbow', 'pony_pinkie'] as BlockId[]).map((bId) => {
                      const meta = BLOCK_CATALOG[bId];
                      return (
                        <div
                          key={bId}
                          className="p-3 rounded-xl bg-black/50 border border-fuchsia-400/30 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <BlockCubeIcon blockId={bId} size={38} />
                            <div>
                              <div className="text-xs font-black text-white">{meta.name}</div>
                              <div className="text-[11px] text-fuchsia-300">
                                当前背包: {state.blocksInventory[bId] || 0} 块
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleGrantSpecialBlock(bId, 3)}
                              className="px-2.5 py-1 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs"
                            >
                              +3 块
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGrantSpecialBlock(bId, 10)}
                              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs"
                            >
                              +10 块
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Current Tasks List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-zinc-400 uppercase">当前每日作业列表：</h4>
                  {state.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{SUBJECT_META[t.subject].icon}</span>
                        <div>
                          <div className="text-sm font-bold">{t.title}</div>
                          <div className="text-xs text-zinc-400">
                            今日已交：{t.completedSteps} / {t.targetSteps} 小节 · 每次基础奖励 💎{t.baseEmeralds}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300"
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
                  className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700 space-y-3"
                >
                  <div className="text-xs font-black text-lime-300">➕ 新增一项作业任务：</div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <select
                      value={newTaskSubject}
                      onChange={(e) => setNewTaskSubject(e.target.value as SubjectType)}
                      className="px-3 py-2 rounded-xl bg-black border border-zinc-700 text-sm"
                    >
                      <option value="chinese">📖 语文</option>
                      <option value="math">🔢 数学</option>
                      <option value="english">🔤 英语</option>
                      <option value="sports">🏃 体育</option>
                    </select>
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="例如：背诵《古诗二首》 / 乘法口诀表"
                      className="sm:col-span-2 px-3 py-2 rounded-xl bg-black border border-zinc-700 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={newTaskSteps}
                        onChange={(e) => setNewTaskSteps(Number(e.target.value) || 1)}
                        className="w-16 px-2 py-2 rounded-xl bg-black border border-zinc-700 text-sm text-center"
                      />
                      <button
                        type="submit"
                        className="flex-1 py-2 px-3 rounded-xl bg-lime-500 text-black font-black text-xs flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> 添加
                      </button>
                    </div>
                  </div>
                </form>

                {/* Add New Real-Life Wish */}
                <form
                  onSubmit={handleAddWish}
                  className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700 space-y-3"
                >
                  <div className="text-xs font-black text-pink-300">🎟️ 新增现实心愿奖励项：</div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={newWishTitle}
                      onChange={(e) => setNewWishTitle(e.target.value)}
                      placeholder="例如：周末去游乐场 / 买一套我的世界乐高"
                      className="flex-1 px-3 py-2 rounded-xl bg-black border border-zinc-700 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">所需💎:</span>
                      <input
                        type="number"
                        value={newWishPrice}
                        onChange={(e) => setNewWishPrice(Number(e.target.value) || 30)}
                        className="w-20 px-2 py-2 rounded-xl bg-black border border-zinc-700 text-sm text-center"
                      />
                      <button
                        type="submit"
                        className="py-2 px-4 rounded-xl bg-pink-500 text-black font-black text-xs"
                      >
                        添加心愿
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 3: Homework Photo Gallery */}
            {activeTab === 'gallery' && (
              <div className="space-y-3">
                {state.submissions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-sm">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    还没有提交过作业照片哦，去主界面拍照试试吧！
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {state.submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 flex flex-col gap-2"
                      >
                        {sub.imageUrl && (
                          <img
                            src={sub.imageUrl}
                            alt={sub.taskTitle}
                            className="w-full h-40 object-cover rounded-lg border border-zinc-600"
                          />
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-300">{sub.taskTitle}</span>
                          <span className="text-[11px] text-zinc-400">{sub.timestamp}</span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed">
                          “{sub.aiReview.villageChiefComment}”
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
