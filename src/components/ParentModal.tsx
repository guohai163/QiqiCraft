import React, { useState } from 'react';
import { Lock, Key, Plus, RotateCcw, Gift, Trash2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { AppSettings, HomeworkTask, PlayerState, SubjectType } from '../types/game';
import { SUBJECT_META } from '../data/catalog';
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
      setPinError('密码不对哦（默认家长密码：1234）');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      openaiApiKey: apiKey.trim() || undefined,
      openaiBaseUrl: baseUrl.trim(),
      openaiModel: modelName.trim(),
      childName: childName.trim(),
    });
    setApiKey('');
    setSaveSuccess('✅ 配置已保存并生效！');
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

            {/* Tab 1: OpenAI Settings */}
            {activeTab === 'ai' && (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    👦 小朋友昵称（显示在主界面和村长表扬中）：
                  </label>
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-zinc-700 text-white text-sm"
                  />
                </div>

                <div className="p-4 rounded-xl bg-zinc-800/70 border border-zinc-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                      <Key className="w-4 h-4" />
                      <span>OpenAI Vision 视觉模型配置</span>
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-black text-emerald-400 font-bold">
                      {settings.hasApiKey
                        ? `当前已配置 (${settings.openaiApiKeyMasked})`
                        : '未配置 Key（当前运行智能村长体验模式）'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      OpenAI API Key（留空则保持原 Key 不变）：
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3.5 py-2 rounded-xl bg-black border border-zinc-700 text-white text-sm font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        API Base URL（支持官方或国内中转接口）：
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
                        视觉模型名称（推荐 gpt-4o 或 gpt-4o-mini）：
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
                  className="px-6 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-black text-sm"
                >
                  💾 保存配置
                </button>
              </form>
            )}

            {/* Tab 2: Homework Tasks & Bonus Management */}
            {activeTab === 'tasks' && (
              <div className="space-y-5">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleResetDailyTasks}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>开启新一天（重置今日作业完成格数）</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGrantParentBonus}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5"
                  >
                    <Gift className="w-4 h-4" />
                    <span>🎁 手动发【家长表扬大礼包】(+25绿宝石 & +5钻石块)</span>
                  </button>
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
