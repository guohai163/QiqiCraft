import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Shield, ShoppingBag, Gift, Check, Lock } from 'lucide-react';
import { BlockId, FoodId, GearItem, PlayerState } from '../types/game';
import { BLOCK_CATALOG, FOOD_CATALOG, GEAR_CATALOG, PET_META } from '../data/catalog';
import { BlockCubeIcon, PixelHeroAvatar, PixelPetAvatar } from './PixelVisuals';
import { sound } from '../utils/sound';

interface HeroShopProps {
  state: PlayerState;
  onUpdateState: (next: Partial<PlayerState>) => void;
}

export const HeroShop: React.FC<HeroShopProps> = ({ state, onUpdateState }) => {
  const [shopTab, setShopTab] = useState<'gear' | 'blocks' | 'wishes'>('gear');
  const [villagerSpeech, setVillagerSpeech] = useState<string>(
    '哼哼（村民友好问候）！欢迎来到绿宝石交易所！认真写作业攒下的绿宝石，可以在我这里换钻石剑和炫酷战甲哦！'
  );

  const handleBuyOrEquipGear = (item: GearItem) => {
    const isUnlocked = state.unlockedGear.includes(item.id);
    if (isUnlocked) {
      sound.playClick();
      onUpdateState({
        equippedGear: {
          ...state.equippedGear,
          [item.slot]: item.id,
        },
      });
      setVillagerSpeech(`✨ 已为你穿戴好【${item.name}】，简直太帅气啦！`);
      return;
    }

    if (state.emeralds < item.priceEmeralds) {
      sound.playClick();
      setVillagerSpeech(
        `💎 哎呀，兑换【${item.name}】还需要 ${item.priceEmeralds - state.emeralds} 颗绿宝石！再去完成一小节作业吧！`
      );
      return;
    }

    sound.playChestFanfare();
    confetti({ particleCount: 55, spread: 60, origin: { y: 0.6 } });
    setVillagerSpeech(`🎉 交易成功！恭喜获得【${item.name}】，已为你自动穿戴上身！`);
    sound.speak(`恭喜你兑换了新装备，${item.name}！`);

    onUpdateState({
      emeralds: state.emeralds - item.priceEmeralds,
      unlockedGear: [...state.unlockedGear, item.id],
      equippedGear: {
        ...state.equippedGear,
        [item.slot]: item.id,
      },
    });
  };

  const handleBuyBlockPack = (blockId: BlockId) => {
    const meta = BLOCK_CATALOG[blockId];
    if (meta.parentOnly) {
      sound.playClick();
      setVillagerSpeech(`👑【${meta.name}】是爸爸妈妈专属发放的魔法发光砖块哦！表现超棒时请爸爸妈妈在右上角【家长】面板里奖励给你吧！`);
      return;
    }
    if (state.emeralds < meta.priceEmeralds) {
      sound.playClick();
      setVillagerSpeech(`💎 绿宝石不够兑换【${meta.name} x8】哦！`);
      return;
    }

    sound.playPlaceBlock();
    const nextBlocks = {
      ...state.blocksInventory,
      [blockId]: (state.blocksInventory[blockId] || 0) + 8,
    };
    setVillagerSpeech(`🧱 交易成功！【${meta.name} x8】已放入你的建造背包！`);
    onUpdateState({
      emeralds: state.emeralds - meta.priceEmeralds,
      blocksInventory: nextBlocks,
    });
  };

  const handleBuyFood = (foodId: FoodId) => {
    const fMeta = FOOD_CATALOG[foodId];
    if (state.emeralds < fMeta.priceEmeralds) {
      sound.playClick();
      setVillagerSpeech(`💎 绿宝石不够兑换【${fMeta.name}】哦！`);
      return;
    }

    sound.playPetHappy();
    const nextFoods = {
      ...state.foodsInventory,
      [foodId]: (state.foodsInventory[foodId] || 0) + 2,
    };
    setVillagerSpeech(`🍖 交易成功！【${fMeta.name} x2】已放入宠物口粮包！`);
    onUpdateState({
      emeralds: state.emeralds - fMeta.priceEmeralds,
      foodsInventory: nextFoods,
    });
  };

  const handleRedeemWish = (wishId: string) => {
    const wish = state.wishes.find((w) => w.id === wishId);
    if (!wish) return;

    if (state.emeralds < wish.priceEmeralds) {
      sound.playClick();
      setVillagerSpeech(
        `💎 兑换心愿【${wish.title}】还需要 ${wish.priceEmeralds - state.emeralds} 颗绿宝石，继续加油写作业吧！`
      );
      return;
    }

    sound.playChestFanfare();
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    const nextWishes = state.wishes.map((w) =>
      w.id === wishId ? { ...w, redeemedCount: w.redeemedCount + 1 } : w
    );
    const msg = `🎉 恭喜你用努力换来了心愿券：【${wish.title}】！快拿给爸爸妈妈看并兑现吧！`;
    setVillagerSpeech(msg);
    sound.speak(msg);

    onUpdateState({
      emeralds: state.emeralds - wish.priceEmeralds,
      wishes: nextWishes,
    });
  };

  const activePet = state.pets[state.activePetId] || state.pets.wolf;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column (5 cols): Hero Wardrobe Showcase */}
      <div className="lg:col-span-5 bg-gradient-to-b from-[#2c3c22] via-[#22301b] to-[#192313] border-4 border-black rounded-2xl p-5 shadow-mc-card flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded bg-amber-400 text-black font-black text-xs">
              Lv.{state.level} 方块大冒险家
            </span>
            <span className="text-sm font-black text-emerald-400">💎 绿宝石：{state.emeralds}</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">{state.childName} 的英雄形象</h2>
        </div>

        {/* Hero & Pet Stage */}
        <div className="my-6 py-6 bg-black/35 border-2 border-white/10 rounded-2xl flex items-end justify-center gap-4 relative">
          <PixelHeroAvatar equippedGear={state.equippedGear} gender={state.childGender} size={165} />
          <div className="mb-2">
            <PixelPetAvatar petId={activePet.id} level={activePet.level} size={90} />
          </div>
        </div>

        {/* Equipped Gear Slots Summary */}
        <div className="grid grid-cols-2 gap-2.5">
          {(['helmet', 'armor', 'weapon', 'cape'] as const).map((slot) => {
            const item = GEAR_CATALOG.find((g) => g.id === state.equippedGear[slot]);
            const slotNames = {
              helmet: '头饰/头盔',
              armor: '战甲/服装',
              weapon: '手持武器',
              cape: '背部披风',
            };
            return (
              <div
                key={slot}
                className="bg-black/45 border-2 border-white/15 rounded-xl p-2.5 flex items-center gap-2.5"
              >
                <span className="text-2xl">{item?.emoji || '✨'}</span>
                <div className="min-w-0">
                  <div className="text-[10px] text-lime-300 font-bold">{slotNames[slot]}</div>
                  <div className="text-xs font-black text-white truncate">{item?.name}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Villager NPC Speech Box */}
        <div className="mt-4 bg-[#4b382a] border-2 border-black rounded-xl p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 border-2 border-black flex items-center justify-center text-2xl shrink-0">
            🧑‍🌾
          </div>
          <p className="text-xs font-bold text-amber-100 leading-relaxed">{villagerSpeech}</p>
        </div>
      </div>

      {/* Right Column (7 cols): Villager Shop Tabs */}
      <div className="lg:col-span-7 bg-[#26301e] border-4 border-black rounded-2xl p-5 shadow-mc-card flex flex-col">
        {/* Tabs Header */}
        <div className="flex flex-wrap gap-2 border-b-2 border-white/15 pb-3 mb-4">
          <button
            onClick={() => {
              sound.playClick();
              setShopTab('gear');
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 border-2 border-black transition ${
              shopTab === 'gear'
                ? 'bg-amber-400 text-zinc-950 shadow-mc'
                : 'bg-black/40 text-white hover:bg-white/10'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>🛡️ 英雄武器与皮肤装扮</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setShopTab('blocks');
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 border-2 border-black transition ${
              shopTab === 'blocks'
                ? 'bg-lime-400 text-zinc-950 shadow-mc'
                : 'bg-black/40 text-white hover:bg-white/10'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>🧱 稀有方块与口粮补给</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setShopTab('wishes');
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 border-2 border-black transition ${
              shopTab === 'wishes'
                ? 'bg-pink-400 text-zinc-950 shadow-mc'
                : 'bg-black/40 text-white hover:bg-white/10'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>🎟️ 现实心愿兑换券</span>
          </button>
        </div>

        {/* Tab 1: Gear & Outfits */}
        {shopTab === 'gear' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
            {GEAR_CATALOG.map((item) => {
              const unlocked = state.unlockedGear.includes(item.id);
              const equipped = state.equippedGear[item.slot] === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleBuyOrEquipGear(item)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-center justify-between gap-3 transition ${
                    equipped
                      ? 'bg-emerald-900/70 border-lime-400 shadow-md'
                      : unlocked
                      ? 'bg-black/45 border-white/20 hover:border-white/50'
                      : 'bg-black/30 border-white/10 hover:border-amber-400/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center text-2xl shrink-0"
                      style={{
                        backgroundColor: item.color === 'transparent' ? '#27272a' : item.color,
                      }}
                    >
                      {item.emoji}
                    </div>
                    <div>
                      <div className="font-black text-sm text-white">{item.name}</div>
                      <div className="text-xs text-zinc-300">{item.description}</div>
                    </div>
                  </div>

                  {equipped ? (
                    <span className="px-3 py-1.5 rounded-lg bg-lime-400 text-zinc-950 font-black text-xs flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" /> 已穿戴
                    </span>
                  ) : unlocked ? (
                    <span className="px-3 py-1.5 rounded-lg bg-zinc-700 text-white font-bold text-xs shrink-0">
                      穿戴
                    </span>
                  ) : (
                    <button className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs flex items-center gap-1 border border-black shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      <span>💎 {item.priceEmeralds}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Blocks & Pet Food Supply */}
        {shopTab === 'blocks' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div>
              <h4 className="text-xs font-black text-amber-300 uppercase mb-2">
                🧱 建筑方块补给包（每次购买获得 8 块）：
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(Object.keys(BLOCK_CATALOG) as BlockId[]).map((bId) => {
                  const meta = BLOCK_CATALOG[bId];
                  return (
                    <button
                      key={bId}
                      onClick={() => handleBuyBlockPack(bId)}
                      className="p-3 rounded-xl bg-black/45 border-2 border-white/15 hover:border-amber-400 flex items-center justify-between text-left transition"
                    >
                      <div className="flex items-center gap-2">
                        <BlockCubeIcon blockId={bId} size={34} />
                        <div>
                          <div className="text-xs font-black text-white">
                            {meta.name} {meta.parentOnly ? '✨' : 'x8'}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            拥有: {state.blocksInventory[bId] || 0}
                          </div>
                        </div>
                      </div>
                      {meta.parentOnly ? (
                        <span className="px-2 py-1 rounded bg-fuchsia-950 border border-fuchsia-400/50 text-fuchsia-300 font-black text-[10px] shrink-0">
                          👑 家长发放
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-emerald-950 border border-emerald-400/40 text-emerald-300 font-black text-xs shrink-0">
                          💎{meta.priceEmeralds}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-pink-300 uppercase mb-2">
                🍖 宠物美食补给（每次购买获得 2 份）：
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(FOOD_CATALOG) as FoodId[]).map((fId) => {
                  const fMeta = FOOD_CATALOG[fId];
                  return (
                    <button
                      key={fId}
                      onClick={() => handleBuyFood(fId)}
                      className="p-3 rounded-xl bg-black/45 border-2 border-white/15 hover:border-pink-400 flex items-center justify-between text-left transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{fMeta.emoji}</span>
                        <div>
                          <div className="text-xs font-black text-white">{fMeta.name} x2</div>
                          <div className="text-[10px] text-zinc-400">{fMeta.description}</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-400/40 text-emerald-300 font-black text-xs">
                        💎{fMeta.priceEmeralds}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Real-Life Wishes Redemption */}
        {shopTab === 'wishes' && (
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="bg-pink-950/60 border border-pink-400/40 rounded-xl p-3 text-xs text-pink-200 font-semibold">
              💡 努力写作业攒下的绿宝石，不仅能建设虚拟方块世界，还能跟爸爸妈妈兑换现实中的心愿奖励哦！（家长可在右上角「家长设置」中自定义心愿单）
            </div>

            <div className="grid grid-cols-1 gap-3">
              {state.wishes.map((wish) => (
                <div
                  key={wish.id}
                  className="bg-black/45 border-2 border-white/20 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl">{wish.emoji}</span>
                    <div>
                      <div className="text-base font-black text-white">{wish.title}</div>
                      <div className="text-xs text-amber-300 font-bold mt-0.5">
                        已成功兑换：{wish.redeemedCount} 次
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRedeemWish(wish.id)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:brightness-110 text-zinc-950 font-black text-sm border-2 border-black shadow-mc shrink-0"
                  >
                    💎 {wish.priceEmeralds} 立即兑换
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
