import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Sparkles, Timer, Play, RotateCcw, CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { AIReviewResult, HomeworkTask, PlayerState } from '../types/game';
import { BLOCK_CATALOG, FOOD_CATALOG, SUBJECT_META } from '../data/catalog';
import { BlockCubeIcon } from './PixelVisuals';
import { sound } from '../utils/sound';
import { generateSampleHomeworkImage } from '../utils/demoPhoto';

interface QuestBoardProps {
  state: PlayerState;
  onSubmitHomework: (payload: {
    taskId: string;
    imageBase64?: string;
    studentNote?: string;
    sportsScore?: number;
    isDemoSample?: boolean;
  }) => Promise<AIReviewResult | null>;
  onSelectReview?: (review: AIReviewResult) => void;
}

export const QuestBoard: React.FC<QuestBoardProps> = ({
  state,
  onSubmitHomework,
  onSelectReview,
}) => {
  const [activeTask, setActiveTask] = useState<HomeworkTask | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isDemoSample, setIsDemoSample] = useState<boolean>(false);
  const [studentNote, setStudentNote] = useState<string>('');
  const [sportsScore, setSportsScore] = useState<number>(120);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Built-in 1-minute Jump Rope / Sports Timer state
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          setTimerFinished(true);
          sound.playChestFanfare();
          sound.speak('时间到！太棒啦！快输入你跳了多少个，领取运动大奖吧！');
          return 0;
        }
        if (prev === 31) {
          sound.speak('已经过半啦，继续加油！');
        }
        if (prev <= 6) {
          sound.playClick();
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleOpenTaskModal = (task: HomeworkTask) => {
    sound.playClick();
    setActiveTask(task);
    setPreviewImage('');
    setIsDemoSample(false);
    setStudentNote('');
    setTimerSeconds(60);
    setTimerRunning(false);
    setTimerFinished(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewImage(reader.result);
        setIsDemoSample(false);
        sound.playPlaceBlock();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSamplePhoto = () => {
    if (!activeTask) return;
    sound.playPlaceBlock();
    const dataUrl = generateSampleHomeworkImage(activeTask.subject);
    setPreviewImage(dataUrl);
    setIsDemoSample(true);
    if (!studentNote) {
      setStudentNote(`我刚刚认真完成了这小节${SUBJECT_META[activeTask.subject].name}作业！`);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!activeTask || isSubmitting) return;
    setIsSubmitting(true);
    sound.playClick();
    try {
      await onSubmitHomework({
        taskId: activeTask.id,
        imageBase64: previewImage || undefined,
        studentNote: studentNote || undefined,
        sportsScore: activeTask.subject === 'sports' ? sportsScore : undefined,
        isDemoSample,
      });
      setActiveTask(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCompletedToday = state.tasks.reduce((acc, t) => acc + t.completedSteps, 0);
  const totalTargetToday = state.tasks.reduce((acc, t) => acc + t.targetSteps, 0);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Top Welcome Banner from Village Chief */}
      <div className="bg-gradient-to-r from-[#3a5226] via-[#2f451e] to-[#263818] border-4 border-[#141f0c] rounded-2xl p-4 md:p-5 shadow-mc-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-600 border-2 border-black shadow-mc flex items-center justify-center text-4xl shrink-0">
            🧙‍♂️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-lime-400 text-zinc-950 font-black text-xs">
                二年级专属闯关岛
              </span>
              <span className="text-xs font-bold text-lime-200">
                今日进度：{totalCompletedToday} / {totalTargetToday} 小节
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white mt-1">
              嗨，{state.childName}！每写完一点作业就能拍照开宝箱哦！
            </h1>
            <p className="text-xs md:text-sm text-lime-100/90 font-medium mt-0.5">
              不用等全部写完！写完几行生字、半页口算或者跳完绳，马上拍一拍，方块村长给你发砖头和绿宝石！
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full md:w-56 bg-black/40 border-2 border-lime-500/40 rounded-xl p-3 shrink-0">
          <div className="flex justify-between text-xs font-extrabold text-lime-200 mb-1.5">
            <span>🏆 今日闯关能量</span>
            <span>{Math.min(100, Math.round((totalCompletedToday / Math.max(1, totalTargetToday)) * 100))}%</span>
          </div>
          <div className="w-full h-4 bg-black/70 rounded-full overflow-hidden border border-white/20">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-lime-400 transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((totalCompletedToday / Math.max(1, totalTargetToday)) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 4 Subject Task Cards Grid (2x2 on iPad landscape) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {state.tasks.map((task) => {
          const sMeta = SUBJECT_META[task.subject];
          const isDone = task.completedSteps >= task.targetSteps;
          const foodMeta = FOOD_CATALOG[task.dropFood];

          return (
            <div
              key={task.id}
              className={`relative rounded-2xl border-4 border-black bg-gradient-to-br ${sMeta.bgGradient} p-5 shadow-mc-card flex flex-col justify-between transition transform hover:-translate-y-0.5`}
            >
              {/* Top Row: Subject Tag & Step Progress */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/45 border border-white/20 text-sm font-black text-white">
                    <span>{sMeta.icon}</span>
                    <span>{sMeta.name}</span>
                    <span className="text-xs text-amber-300 font-bold">· {sMeta.npcTitle}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {[...Array(task.targetSteps)].map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded border-2 border-black flex items-center justify-center text-xs font-black ${
                          idx < task.completedSteps
                            ? 'bg-lime-400 text-zinc-950 shadow-sm'
                            : 'bg-black/40 text-white/40'
                        }`}
                      >
                        {idx < task.completedSteps ? '✓' : idx + 1}
                      </div>
                    ))}
                    {task.completedSteps > task.targetSteps && (
                      <span className="px-2 py-0.5 rounded bg-yellow-400 text-black font-black text-xs">
                        +{task.completedSteps - task.targetSteps} 超额!
                      </span>
                    )}
                  </div>
                </div>

                {/* Task Title & Description */}
                <h2 className="text-xl md:text-2xl font-black text-white mt-3 flex items-center gap-2">
                  <span>{task.title}</span>
                  {isDone && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-lime-400 text-zinc-950 text-xs font-black">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 今日达标
                    </span>
                  )}
                </h2>
                <p className="text-sm text-white/85 font-medium mt-1 leading-relaxed">
                  {task.subtitle}
                </p>
              </div>

              {/* Middle Row: Loot Preview */}
              <div className="my-4 bg-black/35 border-2 border-black/40 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-200">掉落方块：</span>
                  <div className="flex items-center gap-1.5">
                    {task.dropBlockPool.slice(0, 4).map((bId) => (
                      <div key={bId} title={BLOCK_CATALOG[bId]?.name} className="hover:scale-110 transition">
                        <BlockCubeIcon blockId={bId} size={30} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-black">
                  <span className="px-2 py-1 rounded bg-emerald-950/90 border border-emerald-400/40 text-emerald-300">
                    💎 +{task.baseEmeralds}
                  </span>
                  <span className="px-2 py-1 rounded bg-pink-950/90 border border-pink-400/40 text-pink-200">
                    {foodMeta.emoji} {foodMeta.name}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleOpenTaskModal(task)}
                className="w-full py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 border-2 border-black shadow-mc text-zinc-950 font-black text-lg flex items-center justify-center gap-2.5 transition"
              >
                {task.isSportsTimer ? (
                  <>
                    <Timer className="w-6 h-6" />
                    <span>⏱️ 开始跳绳计时 / 拍照打卡领方块</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6" />
                    <span>
                      📸 {task.completedSteps === 0 ? '写完一点啦，拍照领宝箱！' : '再交一小节，继续领宝箱！'}
                    </span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent Submissions Strip */}
      {state.submissions.length > 0 && (
        <div className="bg-[#25301d] border-4 border-[#131a0e] rounded-2xl p-4 shadow-mc-card">
          <h3 className="text-base font-black text-lime-300 mb-3 flex items-center gap-2">
            <span>📜 今日闯关战报（点击任意记录可查看详情并听村长朗读）：</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.submissions.slice(0, 3).map((sub) => (
              <div
                key={sub.id}
                onClick={() => {
                  sound.playClick();
                  onSelectReview?.(sub.aiReview);
                }}
                className="bg-black/40 hover:bg-black/60 border-2 border-white/15 hover:border-amber-400/60 cursor-pointer rounded-xl p-3 flex items-center gap-3 transition"
              >
                {sub.imageUrl ? (
                  <img
                    src={sub.imageUrl}
                    alt={sub.taskTitle}
                    className="w-14 h-14 rounded-lg object-cover border border-white/30 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-emerald-800 flex items-center justify-center text-2xl shrink-0">
                    🏃
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-black text-[10px]">
                      {sub.aiReview.grade}级
                    </span>
                    <span className="text-xs font-extrabold text-white truncate">
                      {sub.aiReview.praiseTitle}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-1 mt-0.5">
                    {sub.aiReview.villageChiefComment}
                  </p>
                  <span className="text-[10px] text-emerald-300 font-bold">
                    💎 +{sub.aiReview.rewards.emeralds} · {sub.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera / Photo Upload & Sports Timer Modal */}
      {activeTask && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-[#2c3624] border-4 border-black rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#435933] px-6 py-4 border-b-4 border-black flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{SUBJECT_META[activeTask.subject].icon}</span>
                <div>
                  <h3 className="text-xl font-black text-white">{activeTask.title}</h3>
                  <p className="text-xs text-lime-200 font-bold">
                    拍下刚写完的作业，让{SUBJECT_META[activeTask.subject].npcTitle}为你开宝箱！
                  </p>
                </div>
              </div>
              <button
                disabled={isSubmitting}
                onClick={() => setActiveTask(null)}
                className="px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white font-bold text-sm"
              >
                ✕ 关闭
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* If Sports Task: Built-in 1-Minute Jump Rope Timer */}
              {activeTask.isSportsTimer && (
                <div className="bg-emerald-950/80 border-2 border-emerald-400/50 rounded-2xl p-4 text-center space-y-3">
                  <div className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                    🏃 内置 1 分钟跳绳 / 运动挑战计时器
                  </div>
                  <div className="text-5xl font-black text-yellow-300 font-mono tracking-wider">
                    00:{String(timerSeconds).padStart(2, '0')}
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    {!timerRunning ? (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          if (timerSeconds === 0) setTimerSeconds(60);
                          setTimerRunning(true);
                          sound.speak('预备，开始跳绳！加油加油！');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-black text-sm border-2 border-black shadow-mc flex items-center gap-1.5"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{timerSeconds === 60 ? '开始 1 分钟计时' : '继续计时'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTimerRunning(false)}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-sm border-2 border-black shadow-mc"
                      >
                        ⏸ 暂停
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setTimerRunning(false);
                        setTimerSeconds(60);
                        setTimerFinished(false);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-zinc-700 text-white font-bold text-sm border-2 border-black flex items-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" /> 重置
                    </button>
                  </div>

                  {/* Jump count selector */}
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <span className="text-sm font-bold text-emerald-200">本次完成个数：</span>
                    <button
                      type="button"
                      onClick={() => setSportsScore((s) => Math.max(10, s - 10))}
                      className="w-9 h-9 rounded-lg bg-black/50 border border-white/30 font-black text-lg"
                    >
                      -10
                    </button>
                    <input
                      type="number"
                      value={sportsScore}
                      onChange={(e) => setSportsScore(Number(e.target.value) || 0)}
                      className="w-24 text-center py-1.5 rounded-lg bg-black/60 border-2 border-emerald-400 text-xl font-black text-yellow-300"
                    />
                    <button
                      type="button"
                      onClick={() => setSportsScore((s) => s + 10)}
                      className="w-9 h-9 rounded-lg bg-black/50 border border-white/30 font-black text-lg"
                    >
                      +10
                    </button>
                    <span className="text-sm font-bold text-emerald-200">个</span>
                  </div>
                  {timerFinished && (
                    <div className="text-xs font-black text-yellow-300 animate-bounce">
                      🎉 1分钟挑战完成！可以直接点击下方按钮领取运动宝箱，或附带拍一张运动照！
                    </div>
                  )}
                </div>
              )}

              {/* Hidden file inputs for iPad Camera & Photo Library */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Photo Upload / Preview Area */}
              {!previewImage ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-6 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 border-4 border-black shadow-mc flex flex-col items-center justify-center gap-2 text-zinc-950"
                    >
                      <Camera className="w-10 h-10" />
                      <span className="font-black text-lg">📸 iPad 拍照提交</span>
                      <span className="text-xs font-bold opacity-80">对准刚写完的作业拍一张</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="py-6 px-4 rounded-2xl bg-[#4d6b37] hover:bg-[#5c7e42] active:translate-y-0.5 border-4 border-black shadow-mc flex flex-col items-center justify-center gap-2 text-white"
                    >
                      <Upload className="w-10 h-10" />
                      <span className="font-black text-lg">🖼️ 从相册选照片</span>
                      <span className="text-xs font-bold text-lime-200">选择已经拍好的作业照片</span>
                    </button>
                  </div>

                  {/* Quick Demo Sample Button */}
                  <button
                    type="button"
                    onClick={handleLoadSamplePhoto}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 border-2 border-indigo-400/50 text-indigo-100 font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>✨ 没带作业本？点我生成一张【二年级示例作业图】立即体验 AI 批改！</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-xl overflow-hidden border-4 border-black bg-black max-h-60 flex items-center justify-center">
                    <img
                      src={previewImage}
                      alt="Homework Preview"
                      className="max-h-56 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewImage('')}
                      className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-black/80 text-white text-xs font-bold border border-white/30"
                    >
                      🔄 重拍/换一张
                    </button>
                  </div>
                </div>
              )}

              {/* Optional Student Note */}
              <div>
                <label className="block text-xs font-bold text-lime-200 mb-1">
                  💬 给方块村长捎句话（选填）：
                </label>
                <input
                  type="text"
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  placeholder="例如：我今天生字写得超工整！ / 完成了20道口算题！"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/45 border-2 border-white/20 text-white text-sm font-medium focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={isSubmitting || (!previewImage && !activeTask.isSportsTimer)}
                onClick={handleConfirmSubmit}
                className={`w-full py-4 px-6 rounded-xl border-2 border-black shadow-mc font-black text-xl flex items-center justify-center gap-3 transition ${
                  isSubmitting || (!previewImage && !activeTask.isSportsTimer)
                    ? 'bg-zinc-600 text-zinc-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-lime-500 via-emerald-400 to-lime-400 hover:brightness-110 text-zinc-950'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>🔮 方块村长正在用附魔台检查作业...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    <span>🎁 提交给方块村长，开启奖励宝箱！</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
