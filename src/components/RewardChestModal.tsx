import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, Sparkles, ArrowRight, Lock, AlertTriangle } from 'lucide-react';
import { AIReviewResult, BlockId, FoodId } from '../types/game';
import { BLOCK_CATALOG, FOOD_CATALOG } from '../data/catalog';
import { BlockCubeIcon } from './PixelVisuals';
import { sound } from '../utils/sound';

interface RewardChestModalProps {
  review: AIReviewResult | null;
  onClose: () => void;
  onGoToBuild: () => void;
}

export const RewardChestModal: React.FC<RewardChestModalProps> = ({
  review,
  onClose,
  onGoToBuild,
}) => {
  const [chestOpened, setChestOpened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(sound.isSpeaking);

  useEffect(() => {
    return sound.onSpeakingChange((speaking) => {
      setIsSpeaking(speaking);
    });
  }, []);

  useEffect(() => {
    if (review) {
      setChestOpened(false);
      const timer = setTimeout(() => {
        if (review.isValidHomework && review.grade !== 'C') {
          setChestOpened(true);
          sound.playChestFanfare();
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 },
          });
        } else {
          sound.playBreakBlock();
        }
        sound.speak(
          `${review.praiseTitle}！${review.villageChiefComment}。${review.gentleHint || ''}`
        );
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [review]);

  if (!review) return null;

  const isRejected = !review.isValidHomework || review.grade === 'C';

  const handleToggleVoice = () => {
    sound.playClick();
    if (isSpeaking) {
      sound.stopSpeak();
    } else {
      sound.speak(
        `${review.praiseTitle}！${review.villageChiefComment}。${review.gentleHint || ''}`,
        true
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full bg-[#36271c] border-4 border-[#1a110b] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div
          className={`px-6 py-4 border-b-4 border-[#1a110b] flex items-center justify-between ${
            isRejected
              ? 'bg-gradient-to-r from-rose-700 via-amber-700 to-rose-700 text-white'
              : 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-zinc-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl animate-bounce">
              {isRejected ? '🔒' : chestOpened ? '🎁' : '📦'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-black/80 text-yellow-300 font-black text-sm">
                  {isRejected ? '未完成 / 待补充' : `评级 ${review.grade}`}
                </span>
                {!isRejected && review.critMultiplier > 1 && (
                  <span className="px-2.5 py-0.5 rounded bg-rose-600 text-white font-black text-sm animate-pulse">
                    ⚡ 附魔暴击 {review.critMultiplier}x 掉落！
                  </span>
                )}
              </div>
              <h2
                className={`text-xl md:text-2xl font-black mt-0.5 drop-shadow-sm ${
                  isRejected ? 'text-white' : 'text-zinc-950'
                }`}
              >
                {review.praiseTitle}
              </h2>
            </div>
          </div>

          <button
            onClick={handleToggleVoice}
            className={`px-3.5 py-2 rounded-xl border-2 border-black shadow-mc flex items-center gap-1.5 font-bold text-sm shrink-0 transition ${
              isSpeaking
                ? 'bg-lime-400 text-zinc-950 animate-pulse'
                : 'bg-amber-900 hover:bg-amber-800 text-yellow-200'
            }`}
          >
            <Volume2 className="w-5 h-5" />
            <span>{isSpeaking ? '🔊 村长朗读中(点击停止)' : '听村长朗读'}</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Village Chief AI Comment Box */}
          <div className="bg-[#4b382a] border-2 border-[#23170f] rounded-xl p-4 flex gap-4 items-start shadow-inner">
            <div className="w-16 h-16 rounded-xl bg-emerald-700 border-2 border-black flex flex-col items-center justify-center shrink-0 shadow-mc">
              <span className="text-3xl">🧙‍♂️</span>
              <span className="text-[10px] font-black text-emerald-100 mt-0.5">方块村长</span>
            </div>
            <div className="space-y-2 flex-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>识别结果：{review.detectedItemsSummary}</span>
              </div>
              <p className="text-base md:text-lg font-bold text-white leading-relaxed">
                “{review.villageChiefComment}”
              </p>
              {review.gentleHint && (
                <div className="bg-amber-950/70 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-amber-200 font-semibold">
                  💡 寻宝小锦囊：{review.gentleHint}
                </div>
              )}
            </div>
          </div>

          {/* Loot Drops Grid OR Locked Chest Notice */}
          {isRejected ? (
            <div className="bg-rose-950/60 border-2 border-rose-500/50 rounded-xl p-4 flex items-center gap-3 text-rose-200">
              <Lock className="w-8 h-8 text-rose-400 shrink-0" />
              <div className="text-sm font-bold leading-relaxed">
                <div>🛑 本次未发放方块与绿宝石奖励（0 绿宝石 · 0 方块）</div>
                <div className="text-xs text-rose-300/90 mt-0.5">
                  请先拿起笔在练习册/作业纸上认真写出答案，或者检查右上角「家长设置」中的 OpenAI API Key 是否已保存，再重新拍照开启宝箱吧！
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-black text-amber-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>✨ 本次作业掉落战利品（已自动放入背包）：</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Emeralds */}
                <div className="bg-[#291d15] border-2 border-emerald-500/60 rounded-xl p-3 flex items-center gap-3 shadow-mc-slot">
                  <span className="text-3xl">💎</span>
                  <div>
                    <div className="text-xs text-emerald-300 font-bold">绿宝石</div>
                    <div className="text-xl font-black text-emerald-400">
                      +{review.rewards.emeralds}
                    </div>
                  </div>
                </div>

                {/* XP */}
                <div className="bg-[#291d15] border-2 border-lime-500/60 rounded-xl p-3 flex items-center gap-3 shadow-mc-slot">
                  <span className="text-3xl">🟢</span>
                  <div>
                    <div className="text-xs text-lime-300 font-bold">经验球</div>
                    <div className="text-xl font-black text-lime-400">+{review.rewards.xp} XP</div>
                  </div>
                </div>

                {/* Dropped Blocks */}
                {Object.entries(review.rewards.blocks).map(([blockId, qty]) => {
                  const meta = BLOCK_CATALOG[blockId as BlockId];
                  if (!meta) return null;
                  return (
                    <div
                      key={blockId}
                      className="bg-[#291d15] border-2 border-amber-500/60 rounded-xl p-2.5 flex items-center gap-2.5 shadow-mc-slot"
                    >
                      <BlockCubeIcon blockId={blockId as BlockId} size={38} />
                      <div>
                        <div className="text-xs text-amber-200 font-bold">{meta.name}</div>
                        <div className="text-lg font-black text-yellow-300">+{qty} 块</div>
                      </div>
                    </div>
                  );
                })}

                {/* Dropped Pet Foods */}
                {Object.entries(review.rewards.foods).map(([foodId, qty]) => {
                  const fMeta = FOOD_CATALOG[foodId as FoodId];
                  if (!fMeta) return null;
                  return (
                    <div
                      key={foodId}
                      className="bg-[#291d15] border-2 border-pink-500/60 rounded-xl p-3 flex items-center gap-2.5 shadow-mc-slot"
                    >
                      <span className="text-3xl">{fMeta.emoji}</span>
                      <div>
                        <div className="text-xs text-pink-200 font-bold">{fMeta.name}</div>
                        <div className="text-lg font-black text-pink-300">+{qty} 份</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                sound.playClick();
                sound.stopSpeak();
                onClose();
              }}
              className="flex-1 py-3.5 px-5 rounded-xl bg-[#5b8731] hover:bg-[#6ca03b] active:translate-y-0.5 border-2 border-black shadow-mc font-black text-lg text-white"
            >
              {isRejected ? '✍️ 好的，我先去把作业写完再拍！' : '👍 收下奖励，继续写下一小节'}
            </button>
            {!isRejected && (
              <button
                onClick={() => {
                  sound.playClick();
                  sound.stopSpeak();
                  onGoToBuild();
                }}
                className="py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 border-2 border-black shadow-mc font-black text-lg text-zinc-950 flex items-center justify-center gap-2"
              >
                <span>🏰 去我的世界搭方块</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
