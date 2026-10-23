import React, { useEffect } from 'react';
import { AlertTriangle, Volume2, CheckCircle2, Sparkles } from 'lucide-react';
import { BlockId, ParentNotice } from '../types/game';
import { BLOCK_CATALOG } from '../data/catalog';
import { BlockCubeIcon } from './PixelVisuals';
import { sound } from '../utils/sound';
import { formatLocalTimestamp } from '../utils/time';

interface ParentNoticeModalProps {
  childName: string;
  notice: ParentNotice | null;
  onAcknowledge: (noticeId: string) => void;
}

export const ParentNoticeModal: React.FC<ParentNoticeModalProps> = ({
  childName,
  notice,
  onAcknowledge,
}) => {
  const buildSpeechText = (n: ParentNotice) => {
    const parts: string[] = [];
    if (n.deductEmeralds > 0) {
      parts.push(`${n.deductEmeralds}颗绿宝石`);
    }
    if (n.totalBlocksDeducted > 0) {
      parts.push(`${n.totalBlocksDeducted}个方块`);
    }
    const deductDesc = parts.length > 0 ? `本次扣除了${parts.join('和')}。` : '';
    return `${childName}请注意，爸爸妈妈和方块村长发来一条习惯提醒：因为${n.reason}，${deductDesc}知错能改就是最棒的小矿工，只要改正这个小毛病，养成好习惯，很快就能把奖励重新赢回来哦！加油！`;
  };

  useEffect(() => {
    if (!notice) return;
    sound.playWarning();
    const timer = setTimeout(() => {
      sound.speak(buildSpeechText(notice));
    }, 350);
    return () => {
      clearTimeout(timer);
      sound.stopSpeak();
    };
  }, [notice?.id]);

  if (!notice) return null;

  const blockEntries = Object.entries(notice.deductBlocks || {}).filter(
    ([, count]) => (count || 0) > 0
  ) as [BlockId, number][];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-lg w-full bg-gradient-to-b from-zinc-900 via-zinc-900 to-rose-950/90 border-4 border-amber-400 rounded-3xl shadow-2xl overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-orange-600 px-6 py-4 border-b-4 border-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black/30 border-2 border-white/40 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-200" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-amber-100 uppercase tracking-wider">
                爸爸妈妈 & 方块村长来信
              </div>
              <h2 className="text-lg md:text-xl font-black text-white drop-shadow">
                📢 好习惯养成提醒单
              </h2>
            </div>
          </div>
          <span className="text-xs font-bold bg-black/35 px-2.5 py-1 rounded-lg text-amber-100">
            {formatLocalTimestamp(notice.id, notice.timestamp)}
          </span>
        </div>

        <div className="p-6 space-y-5">
          {/* Reason Box */}
          <div className="p-4 rounded-2xl bg-rose-950/70 border-2 border-rose-400/60 space-y-2 shadow-inner">
            <div className="text-xs font-black text-rose-300 flex items-center gap-1.5">
              <span>🎯 为什么会收到这条提醒：</span>
            </div>
            <p className="text-lg md:text-xl font-black text-amber-200 leading-relaxed">
              “{notice.reason}”
            </p>
          </div>

          {/* Deducted Items Box */}
          {(notice.deductEmeralds > 0 || blockEntries.length > 0) && (
            <div className="p-4 rounded-2xl bg-black/55 border-2 border-zinc-700 space-y-3">
              <div className="text-xs font-black text-zinc-300">📉 本次扣除的宝石与砖块：</div>
              <div className="flex flex-wrap gap-2.5">
                {notice.deductEmeralds > 0 && (
                  <div className="px-3.5 py-2 rounded-xl bg-rose-950/90 border-2 border-rose-500/60 flex items-center gap-2">
                    <span className="text-2xl">💎</span>
                    <div>
                      <div className="text-xs font-bold text-rose-200">绿宝石（钻石货币）</div>
                      <div className="text-base font-black text-rose-400">
                        -{notice.deductEmeralds} 颗
                      </div>
                    </div>
                  </div>
                )}

                {blockEntries.map(([bId, count]) => {
                  const meta = BLOCK_CATALOG[bId];
                  return (
                    <div
                      key={bId}
                      className="px-3.5 py-2 rounded-xl bg-rose-950/90 border-2 border-rose-500/60 flex items-center gap-2.5"
                    >
                      <BlockCubeIcon blockId={bId} size={32} />
                      <div>
                        <div className="text-xs font-bold text-rose-200">
                          {meta?.name || bId}
                        </div>
                        <div className="text-base font-black text-rose-400">-{count} 块</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Village Chief Encouragement */}
          <div className="p-4 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500/40 flex items-start gap-3">
            <div className="text-3xl shrink-0">🧙‍♂️</div>
            <div className="text-xs md:text-sm text-emerald-100 leading-relaxed font-medium">
              <span className="font-black text-emerald-300 flex items-center gap-1 mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                方块村长的悄悄话：
              </span>
              {childName}，每个人都会有犯小迷糊的时候，知错能改就是最勇敢的小矿工！只要从今天开始改正这个习惯，不仅能重新攒满绿宝石和砖块，表现棒的时候爸爸妈妈还会给你发惊喜奖励哦！
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                sound.speak(buildSpeechText(notice), true);
              }}
              className="sm:w-44 py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 border-2 border-black shadow-mc font-black text-sm flex items-center justify-center gap-2 text-amber-300"
            >
              <Volume2 className="w-5 h-5" />
              <span>🔊 再听一遍</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                sound.stopSpeak();
                onAcknowledge(notice.id);
              }}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-b from-lime-400 to-emerald-500 hover:brightness-105 active:scale-[0.99] border-2 border-black shadow-mc font-black text-base text-zinc-950 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>💪 我知道啦，我一定会改正！</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
