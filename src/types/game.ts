export type SubjectType = 'chinese' | 'math' | 'english' | 'sports';

export type BlockId =
  | 'grass'
  | 'dirt'
  | 'oak_wood'
  | 'oak_planks'
  | 'cobblestone'
  | 'brick'
  | 'glass'
  | 'gold_block'
  | 'diamond_block'
  | 'glowstone'
  | 'cherry_leaves'
  | 'tnt'
  | 'water'
  | 'bookshelf'
  | 'pony_twilight'
  | 'pony_rainbow'
  | 'pony_pinkie';

export type FoodId = 'bone' | 'fish' | 'sweet_berries' | 'bamboo' | 'golden_apple';

export type PetId = 'wolf' | 'cat' | 'fox' | 'axolotl' | 'panda';

export type GearSlot = 'helmet' | 'armor' | 'weapon' | 'cape';

export interface BlockMeta {
  id: BlockId;
  name: string;
  rarity: 'common' | 'rare' | 'epic';
  topColor: string;
  sideColor: string;
  accentColor: string;
  emissive?: boolean;
  emissiveColor?: string;
  parentOnly?: boolean;
  transparent?: boolean;
  priceEmeralds: number;
  description: string;
}

export interface FoodMeta {
  id: FoodId;
  name: string;
  emoji: string;
  expGain: number;
  favoritePet: PetId;
  priceEmeralds: number;
  description: string;
}

export interface PetState {
  id: PetId;
  name: string;
  unlocked: boolean;
  level: number;
  exp: number;
  hunger: number; // 0-100
  mood: number; // 0-100
}

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  priceEmeralds: number;
  color: string;
  accent: string;
  emoji: string;
  description: string;
}

export interface RealWishItem {
  id: string;
  title: string;
  priceEmeralds: number;
  emoji: string;
  redeemedCount: number;
}

export interface ParentNotice {
  id: string;
  type: 'penalty' | 'reward';
  reason: string;
  deductEmeralds: number;
  deductBlocks: Partial<Record<BlockId, number>>;
  totalBlocksDeducted: number;
  timestamp: string;
  acknowledged: boolean;
}

export interface HomeworkTask {
  id: string;
  subject: SubjectType;
  title: string;
  subtitle: string;
  targetSteps: number; // e.g., 2 steps ("写一点就能交")
  completedSteps: number;
  baseEmeralds: number;
  baseXp: number;
  dropBlockPool: BlockId[];
  dropFood: FoodId;
  isSportsTimer?: boolean;
}

export interface AIReviewResult {
  isValidHomework: boolean;
  grade: 'S' | 'A' | 'B' | 'C';
  critMultiplier: number; // 0, 0.6, 1.0, 1.5, 2.0
  praiseTitle: string;
  villageChiefComment: string;
  gentleHint?: string;
  detectedItemsSummary: string;
  rewards: {
    emeralds: number;
    xp: number;
    blocks: Record<string, number>;
    foods: Record<string, number>;
    sportsEnergy: number;
  };
}

export interface SubmissionRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  subject: SubjectType;
  timestamp: string;
  imageUrl?: string;
  sportsScore?: number;
  studentNote?: string;
  aiReview: AIReviewResult;
}

export interface PlacedBlock {
  x: number;
  y: number;
  z: number;
  type: BlockId;
}

export interface Blueprint {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  blocks: PlacedBlock[];
}

export interface AppSettings {
  openaiApiKeyMasked: string;
  hasApiKey: boolean;
  openaiBaseUrl: string;
  openaiModel: string;
  childName: string;
  childGender: 'boy' | 'girl';
  dailyWorldMinutes: number;
  parentPin: string;
  voiceEnabled: boolean;
  soundEnabled: boolean;
}

export interface WorldExpansionTier {
  level: number;
  name: string;
  size: number; // e.g., 11, 19, 31, 45, 65, 99
  maxHeight: number;
  requiredPlayerLevel: number;
  costEmeralds: number;
  bonusBlocks: Partial<Record<BlockId, number>>;
  description: string;
  badge: string;
}

export interface PlayerState {
  childName: string;
  childGender: 'boy' | 'girl';
  worldPlaySecondsToday?: number;
  worldPlayDate?: string;
  level: number;
  xp: number;
  emeralds: number;
  sportsEnergy: number;
  streakDays: number;
  lastActiveDate: string;
  blocksInventory: Record<BlockId, number>;
  foodsInventory: Record<FoodId, number>;
  pets: Record<PetId, PetState>;
  activePetId: PetId;
  unlockedGear: string[];
  equippedGear: Record<GearSlot, string>;
  tasks: HomeworkTask[];
  placedBlocks: PlacedBlock[];
  worldTheme: 'plains' | 'snow' | 'desert' | 'sky';
  worldSizeLevel: number;
  submissions: SubmissionRecord[];
  wishes: RealWishItem[];
  parentNotices?: ParentNotice[];
}

