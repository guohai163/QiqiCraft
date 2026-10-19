import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles, Compass, Lock, Utensils } from 'lucide-react';
import { BlockId, FoodId, PetId, PlayerState } from '../types/game';
import { BLOCK_CATALOG, FOOD_CATALOG, PET_META } from '../data/catalog';
import { PixelPetAvatar } from './PixelVisuals';
import { sound } from '../utils/sound';

interface PetSanctuaryProps {
  state: PlayerState;
  onUpdateState: (next: Partial<PlayerState>) => void;
}

export const PetSanctuary: React.FC<PetSanctuaryProps> = ({ state, onUpdateState }) => {
  const activePetId = state.activePetId || 'wolf';
  const activePet = state.pets[activePetId];
  const petMeta = PET_META[activePetId];

  const [speechBubble, setSpeechBubble] = useState<string>(petMeta.soundText);
  const [floatingHearts, setFloatingHearts] = useState<number>(0);
  const [adventureResult, setAdventureResult] = useState<string>('');

  const triggerHearts = (msg: string) => {
    setSpeechBubble(msg);
    setFloatingHearts((c) => c + 1);
    sound.playPetHappy();
  };

  // Switch or Unlock Pet
  const handleSelectOrUnlockPet = (petId: PetId) => {
    const petState = state.pets[petId];
    const meta = PET_META[petId];
    if (petState.unlocked) {
      sound.playClick();
      setSpeechBubble(meta.soundText);
      onUpdateState({ activePetId: petId });
      return;
    }

    // Unlock with Emeralds
    if (state.emeralds < meta.unlockEmeralds) {
      sound.playClick();
      setSpeechBubble(`💎 绿宝石还差 ${meta.unlockEmeralds - state.emeralds} 颗才能领养【${meta.name}】哦！快去写作业领宝石吧！`);
      return;
    }

    sound.playChestFanfare();
    confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 } });
    const nextPets = {
      ...state.pets,
      [petId]: {
        ...petState,
        unlocked: true,
      },
    };
    setSpeechBubble(`🎉 太开心啦！【${meta.name}】正式成为你的方块伙伴！`);
    sound.speak(`恭喜你领养了新伙伴，${meta.name}！`);
    onUpdateState({
      emeralds: state.emeralds - meta.unlockEmeralds,
      pets: nextPets,
      activePetId: petId,
    });
  };

  // Feed Pet with Food
  const handleFeedPet = (foodId: FoodId) => {
    const qty = state.foodsInventory[foodId] || 0;
    const foodMeta = FOOD_CATALOG[foodId];
    if (qty <= 0) {
      sound.playClick();
      setSpeechBubble(`🍽️ 背包里的【${foodMeta.name}】吃完啦！写一点作业拍照就会掉落哦！`);
      return;
    }

    const isFavorite = petMeta.favoriteFood === foodId || foodId === 'golden_apple';
    const expGain = isFavorite ? Math.round(foodMeta.expGain * 1.5) : foodMeta.expGain;

    let newExp = activePet.exp + expGain;
    let newLevel = activePet.level;
    let leveledUp = false;
    while (newExp >= 100) {
      newExp -= 100;
      newLevel += 1;
      leveledUp = true;
    }

    const nextPets = {
      ...state.pets,
      [activePetId]: {
        ...activePet,
        level: newLevel,
        exp: newExp,
        hunger: Math.min(100, activePet.hunger + 25),
        mood: Math.min(100, activePet.mood + 15),
      },
    };

    const nextFoods = {
      ...state.foodsInventory,
      [foodId]: qty - 1,
    };

    if (leveledUp) {
      sound.playChestFanfare();
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      const msg = `🌟 哇！${petMeta.name}升到了 Lv.${newLevel}！头顶长出了学霸皇冠！`;
      triggerHearts(msg);
      sound.speak(msg);
    } else {
      const msg = isFavorite
        ? `😋 咔嚓咔嚓！这是我最爱的【${foodMeta.name}】，经验暴击 +${expGain}！`
        : `😋 谢谢小主人喂我吃【${foodMeta.name}】，经验 +${expGain}！`;
      triggerHearts(msg);
    }

    onUpdateState({
      pets: nextPets,
      foodsInventory: nextFoods,
    });
  };

  // Send Pet on Sports Energy Treasure Hunt
  const handleTreasureHunt = () => {
    if (state.sportsEnergy < 30) {
      sound.playClick();
      setSpeechBubble('🏃 运动活力不足 30 点啦！快去完成【体育跳绳打卡】给我充满探险能量吧！');
      return;
    }

    sound.playChestFanfare();
    confetti({ particleCount: 55, spread: 60, origin: { y: 0.6 } });

    const rewardPool: BlockId[] = ['diamond_block', 'gold_block', 'glowstone', 'cherry_leaves', 'tnt'];
    const pickedBlock = rewardPool[Math.floor(Math.random() * rewardPool.length)];
    const blockQty = 4 + Math.floor(Math.random() * 4) + activePet.level;
    const bonusEmeralds = 5 + activePet.level * 2;

    const nextBlocks = {
      ...state.blocksInventory,
      [pickedBlock]: (state.blocksInventory[pickedBlock] || 0) + blockQty,
    };

    const resultText = `🎁 【${petMeta.name}】去神秘矿洞探险归来！帮你挖到了 ${blockQty} 个【${BLOCK_CATALOG[pickedBlock].name}】和 ${bonusEmeralds} 颗绿宝石！`;
    setAdventureResult(resultText);
    triggerHearts(resultText);
    sound.speak(resultText);

    onUpdateState({
      sportsEnergy: state.sportsEnergy - 30,
      emeralds: state.emeralds + bonusEmeralds,
      blocksInventory: nextBlocks,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column (7 cols): Pet Stage, Interaction, and Sports Adventure */}
      <div className="lg:col-span-7 flex flex-col justify-between bg-gradient-to-b from-[#2f4b26] via-[#263d1e] to-[#1d2e17] border-4 border-black rounded-2xl p-5 shadow-mc-card relative overflow-hidden">
        {/* Top Pet Info Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-400 text-black font-black text-xs">
                Lv.{activePet.level} {activePet.level >= 2 ? '👑 皇冠萌宠' : '🌱 成长期'}
              </span>
              <span className="text-xs font-bold text-lime-200">{petMeta.species}</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">{petMeta.name}</h2>
            <p className="text-xs text-lime-100/80 mt-0.5">{petMeta.desc}</p>
          </div>

          {/* Pet Stats Bars */}
          <div className="bg-black/45 border-2 border-white/15 rounded-xl p-3 space-y-1.5 min-w-[200px]">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-amber-300">✨ 升级经验</span>
              <span className="text-white">{activePet.exp}/100</span>
            </div>
            <div className="w-full h-2.5 bg-black rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${activePet.exp}%` }}
              />
            </div>

            <div className="flex justify-between text-xs font-bold pt-1">
              <span className="text-pink-300">❤️ 饱食与心情</span>
              <span className="text-white">{activePet.hunger}%</span>
            </div>
            <div className="w-full h-2.5 bg-black rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 transition-all duration-300"
                style={{ width: `${activePet.hunger}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center Pet Visual Stage & Speech Bubble */}
        <div className="my-6 flex flex-col items-center justify-center relative py-4">
          {/* Speech Bubble */}
          <div className="mb-5 max-w-md bg-white text-zinc-900 px-4 py-2.5 rounded-2xl border-3 border-black shadow-mc font-extrabold text-sm text-center relative">
            “{speechBubble}”
            <div className="w-3 h-3 bg-white border-r-2 border-b-2 border-black rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
          </div>

          {/* Floating Hearts Animation */}
          {floatingHearts > 0 && (
            <div
              key={floatingHearts}
              className="absolute top-12 flex gap-4 animate-bounce text-2xl pointer-events-none"
            >
              <span>❤️</span>
              <span>✨</span>
              <span>💖</span>
            </div>
          )}

          {/* Clickable Pet Avatar */}
          <div
            onClick={() => {
              triggerHearts(`${petMeta.soundText} （最喜欢吃${FOOD_CATALOG[petMeta.favoriteFood].name}啦！）`);
            }}
            className="cursor-pointer transform active:scale-95 transition"
            title="点击摸摸头"
          >
            <PixelPetAvatar petId={activePetId} level={activePet.level} size={155} />
          </div>

          <button
            onClick={() =>
              triggerHearts(`🥰 好舒服呀！小主人今天写作业超棒，我一直在旁边陪着你哦！`)
            }
            className="mt-3 px-4 py-1.5 rounded-full bg-pink-600/90 hover:bg-pink-500 border-2 border-black text-white font-black text-xs flex items-center gap-1.5 shadow-mc"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>摸摸 {petMeta.name} 的头</span>
          </button>
        </div>

        {/* Bottom Sports Energy Treasure Hunt Box */}
        <div className="bg-black/45 border-2 border-emerald-400/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-emerald-300 flex items-center gap-1">
                <Compass className="w-4 h-4" />
                <span>🏃 宠物森林寻宝（消耗体育打卡活力）</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-900 border border-emerald-400/40 text-xs font-black text-yellow-300">
                当前活力：{state.sportsEnergy} / 100
              </span>
            </div>
            <p className="text-xs text-zinc-300">
              完成跳绳或体育打卡可充满活力！每次消耗 30 点活力，让宠物为你挖回钻石块与绿宝石！
            </p>
            {adventureResult && (
              <p className="text-xs font-bold text-amber-300 pt-1">{adventureResult}</p>
            )}
          </div>

          <button
            onClick={handleTreasureHunt}
            className={`px-5 py-3 rounded-xl border-2 border-black shadow-mc font-black text-sm shrink-0 flex items-center gap-1.5 ${
              state.sportsEnergy >= 30
                ? 'bg-gradient-to-r from-amber-400 to-lime-400 text-zinc-950 hover:brightness-110'
                : 'bg-zinc-700 text-zinc-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>出发寻宝 (-30活力)</span>
          </button>
        </div>
      </div>

      {/* Right Column (5 cols): Feed Food Bag & All Pets Roster */}
      <div className="lg:col-span-5 flex flex-col justify-between gap-5">
        {/* Feeding Panel */}
        <div className="bg-[#2a3621] border-4 border-black rounded-2xl p-4 shadow-mc-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              <span>🍖 喂养口粮包（写作业掉落）</span>
            </h3>
            <span className="text-xs font-bold text-pink-300">
              偏爱：{FOOD_CATALOG[petMeta.favoriteFood].emoji} {FOOD_CATALOG[petMeta.favoriteFood].name}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(FOOD_CATALOG) as FoodId[]).map((fId) => {
              const fMeta = FOOD_CATALOG[fId];
              const count = state.foodsInventory[fId] || 0;
              const isFav = petMeta.favoriteFood === fId || fId === 'golden_apple';

              return (
                <button
                  key={fId}
                  onClick={() => handleFeedPet(fId)}
                  className={`p-3 rounded-xl border-2 text-left flex items-center justify-between transition ${
                    count > 0
                      ? 'bg-black/45 border-white/20 hover:border-amber-400 active:translate-y-0.5'
                      : 'bg-black/20 border-white/5 opacity-55'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{fMeta.emoji}</span>
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1">
                        <span>{fMeta.name}</span>
                        {isFav && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600 text-white">
                            最爱1.5x
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-lime-300 font-bold">
                        +{isFav ? Math.round(fMeta.expGain * 1.5) : fMeta.expGain} EXP
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-lg font-black text-xs ${
                      count > 0 ? 'bg-amber-400 text-black' : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    x{count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pet Collection Roster */}
        <div className="bg-[#2a3621] border-4 border-black rounded-2xl p-4 shadow-mc-card space-y-3 flex-1">
          <h3 className="text-base font-black text-lime-300 flex items-center justify-between">
            <span>🐾 方块萌宠图鉴（切换或领养新伙伴）</span>
            <span className="text-xs text-emerald-300">💎 绿宝石：{state.emeralds}</span>
          </h3>

          <div className="space-y-2.5">
            {(Object.keys(PET_META) as PetId[]).map((pId) => {
              const pState = state.pets[pId];
              const pMeta = PET_META[pId];
              const isSelected = activePetId === pId;

              return (
                <div
                  key={pId}
                  onClick={() => handleSelectOrUnlockPet(pId)}
                  className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-emerald-900/70 border-lime-400 shadow-md'
                      : pState.unlocked
                      ? 'bg-black/40 border-white/15 hover:border-white/40'
                      : 'bg-black/30 border-white/10 hover:border-amber-400/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center overflow-hidden">
                      <PixelPetAvatar petId={pId} level={pState.level} size={46} animate={false} />
                    </div>
                    <div>
                      <div className="font-black text-sm text-white flex items-center gap-2">
                        <span>{pMeta.name}</span>
                        {pState.unlocked && (
                          <span className="text-[11px] px-1.5 py-0.2 rounded bg-lime-400/20 text-lime-300">
                            Lv.{pState.level}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-300">{pMeta.desc}</div>
                    </div>
                  </div>

                  {pState.unlocked ? (
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-black ${
                        isSelected
                          ? 'bg-lime-400 text-zinc-950'
                          : 'bg-zinc-700 text-white hover:bg-zinc-600'
                      }`}
                    >
                      {isSelected ? '出战中' : '切换伙伴'}
                    </span>
                  ) : (
                    <button className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs flex items-center gap-1 border border-black shadow-sm shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      <span>💎 {pMeta.unlockEmeralds} 领养</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
