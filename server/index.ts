import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import {
  AIReviewResult,
  BlockId,
  FoodId,
  HomeworkTask,
  PlayerState,
  SubmissionRecord,
} from '../src/types/game';
import { DEFAULT_HOMEWORK_TASKS } from '../src/data/catalog';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: '25mb' }));

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use('/uploads', express.static(UPLOADS_DIR));

const ENV_FILE = path.resolve(process.cwd(), '.env');

interface ServerSettings {
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  childName: string;
  childGender: 'boy' | 'girl';
  parentPin: string;
  voiceEnabled: boolean;
  soundEnabled: boolean;
}

function writeEnvConfig(updates: Record<string, string>) {
  try {
    let content = '';
    if (fs.existsSync(ENV_FILE)) {
      content = fs.readFileSync(ENV_FILE, 'utf-8');
    } else if (fs.existsSync(path.resolve(process.cwd(), '.env.example'))) {
      content = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf-8');
    }

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      process.env[key] = value;
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(ENV_FILE, content.trim() + '\n');
  } catch (err) {
    console.error('Failed to write .env file:', err);
  }
}

function loadSettings(): ServerSettings {
  if (fs.existsSync(ENV_FILE)) {
    dotenv.config({ path: ENV_FILE, override: true });
  } else {
    dotenv.config();
  }

  let localOverrides: Partial<ServerSettings> = {};
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      localOverrides = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load settings file:', e);
  }

  return {
    openaiApiKey: process.env.OPENAI_API_KEY || localOverrides.openaiApiKey || '',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || localOverrides.openaiBaseUrl || 'https://api.openai.com/v1',
    openaiModel: process.env.OPENAI_MODEL || localOverrides.openaiModel || 'gpt-4o',
    parentPin: process.env.PARENT_PIN || localOverrides.parentPin || '1234',
    childName: process.env.CHILD_NAME || localOverrides.childName || '小矿工淇淇',
    childGender: (process.env.CHILD_GENDER || localOverrides.childGender || 'boy') as 'boy' | 'girl',
    voiceEnabled: localOverrides.voiceEnabled !== undefined ? localOverrides.voiceEnabled : true,
    soundEnabled: localOverrides.soundEnabled !== undefined ? localOverrides.soundEnabled : true,
  };
}

function saveSettings(settings: ServerSettings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function getInitialPlayerState(): PlayerState {
  const today = new Date().toISOString().slice(0, 10);
  const settings = loadSettings();
  return {
    childName: settings.childName,
    childGender: settings.childGender,
    level: 1,
    xp: 20,
    emeralds: 25,
    sportsEnergy: 40,
    streakDays: 1,
    lastActiveDate: today,
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
      // Starter mini arch / base on the terrain
      { x: -1, y: 1, z: -1, type: 'oak_wood' },
      { x: 1, y: 1, z: -1, type: 'oak_wood' },
      { x: -1, y: 2, z: -1, type: 'oak_wood' },
      { x: 0, y: 2, z: -1, type: 'glowstone' },
      { x: 1, y: 2, z: -1, type: 'oak_wood' },
      { x: 2, y: 1, z: 1, type: 'cherry_leaves' },
    ],
    worldTheme: 'plains',
    worldSizeLevel: 1,
    submissions: [],
    wishes: [
      { id: 'wish_mc_time', title: '周末玩30分钟《我的世界》', priceEmeralds: 60, emoji: '🎮', redeemedCount: 0 },
      { id: 'wish_park', title: '周末去公园骑车/放风筝', priceEmeralds: 50, emoji: '🪁', redeemedCount: 0 },
      { id: 'wish_snack', title: '兑换一份最爱的小零食/冰淇淋', priceEmeralds: 40, emoji: '🍦', redeemedCount: 0 },
      { id: 'wish_lego', title: '攒够绿宝石兑换一套新积木/课外书', priceEmeralds: 180, emoji: '🎁', redeemedCount: 0 },
    ],
  };
}

function loadState(): PlayerState {
  const settings = loadSettings();
  const effectiveName = settings.childName || process.env.CHILD_NAME || '小矿工淇淇';
  const effectiveGender = settings.childGender || process.env.CHILD_GENDER || 'boy';
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      const state: PlayerState = { ...getInitialPlayerState(), ...raw };
      // Always sync childName and childGender from .env / settings, and migrate any old '奇奇' to '淇淇'
      if (effectiveName) {
        state.childName = effectiveName;
      } else if (state.childName && state.childName.includes('奇奇')) {
        state.childName = state.childName.replace(/奇奇/g, '淇淇');
      }
      if (effectiveGender) {
        state.childGender = effectiveGender as 'boy' | 'girl';
      }
      return state;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  const initial = getInitialPlayerState();
  if (effectiveName) {
    initial.childName = effectiveName;
  }
  if (effectiveGender) {
    initial.childGender = effectiveGender as 'boy' | 'girl';
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2));
  return initial;
}

function saveState(state: PlayerState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return '';
  return `${key.slice(0, 5)}...${key.slice(-4)}`;
}

// GET /api/state
app.get('/api/state', (_req, res) => {
  const settings = loadSettings();
  const state = loadState();
  let stateUpdated = false;
  if (settings.childName && state.childName !== settings.childName) {
    state.childName = settings.childName;
    stateUpdated = true;
  }
  if (settings.childGender && state.childGender !== settings.childGender) {
    state.childGender = settings.childGender;
    stateUpdated = true;
  }
  if (stateUpdated) {
    saveState(state);
  }
  res.json({
    state,
    settings: {
      openaiApiKeyMasked: maskKey(settings.openaiApiKey),
      hasApiKey: Boolean(settings.openaiApiKey && settings.openaiApiKey.trim().length > 5),
      openaiBaseUrl: settings.openaiBaseUrl,
      openaiModel: settings.openaiModel,
      childName: settings.childName,
      childGender: settings.childGender,
      parentPin: settings.parentPin,
      voiceEnabled: settings.voiceEnabled,
      soundEnabled: settings.soundEnabled,
    },
  });
});

// POST /api/state
app.post('/api/state', (req, res) => {
  const current = loadState();
  const updated: PlayerState = {
    ...current,
    ...req.body,
  };
  saveState(updated);
  res.json({ state: updated });
});

// POST /api/settings
app.post('/api/settings', (req, res) => {
  const current = loadSettings();
  const { openaiApiKey, openaiBaseUrl, openaiModel, childName, childGender, parentPin, voiceEnabled, soundEnabled } = req.body;

  const envUpdates: Record<string, string> = {};
  if (typeof openaiApiKey === 'string' && openaiApiKey.trim() !== '') {
    envUpdates.OPENAI_API_KEY = openaiApiKey.trim();
  }
  if (openaiBaseUrl !== undefined && openaiBaseUrl.trim() !== '') {
    envUpdates.OPENAI_BASE_URL = openaiBaseUrl.trim();
  }
  if (openaiModel !== undefined && openaiModel.trim() !== '') {
    envUpdates.OPENAI_MODEL = openaiModel.trim();
  }
  if (parentPin !== undefined && parentPin.trim() !== '') {
    envUpdates.PARENT_PIN = parentPin.trim();
  }
  if (childName !== undefined && childName.trim() !== '') {
    envUpdates.CHILD_NAME = childName.trim();
  }
  if (childGender !== undefined && (childGender === 'boy' || childGender === 'girl')) {
    envUpdates.CHILD_GENDER = childGender;
  }

  if (Object.keys(envUpdates).length > 0) {
    writeEnvConfig(envUpdates);
  }

  const updated = loadSettings();
  if (voiceEnabled !== undefined) updated.voiceEnabled = Boolean(voiceEnabled);
  if (soundEnabled !== undefined) updated.soundEnabled = Boolean(soundEnabled);
  saveSettings(updated);

  let stateUpdated = false;
  const state = loadState();
  if (childName && state.childName !== childName.trim()) {
    state.childName = childName.trim();
    stateUpdated = true;
  }
  if (childGender && state.childGender !== childGender) {
    state.childGender = childGender;
    stateUpdated = true;
  }
  if (stateUpdated) {
    saveState(state);
  }

  res.json({
    settings: {
      openaiApiKeyMasked: maskKey(updated.openaiApiKey),
      hasApiKey: Boolean(updated.openaiApiKey && updated.openaiApiKey.trim().length > 5),
      openaiBaseUrl: updated.openaiBaseUrl,
      openaiModel: updated.openaiModel,
      childName: updated.childName,
      childGender: updated.childGender,
      parentPin: updated.parentPin,
      voiceEnabled: updated.voiceEnabled,
      soundEnabled: updated.soundEnabled,
    },
  });
});

function buildSmartFallbackReview(
  task: HomeworkTask,
  studentNote?: string,
  sportsScore?: number
): Omit<AIReviewResult, 'rewards'> {
  if (task.subject === 'chinese') {
    return {
      isValidHomework: true,
      grade: 'S',
      critMultiplier: 1.5,
      praiseTitle: '✨ 附魔级工整字迹！',
      villageChiefComment:
        '哇！方块书院院长看到你的语文作业眼睛都亮了！每一笔每一划都像搭建城堡一样稳稳当当，结构很匀称，继续保持这样的专注力，你就是方块大陆的大书法家！',
      gentleHint: '小提示：写完生字后可以自己大声朗读两遍，加深记忆附魔效果哦！',
      detectedItemsSummary: studentNote || '二年级语文生字词与造句练习（已完成本小节）',
    };
  }
  if (task.subject === 'math') {
    return {
      isValidHomework: true,
      grade: 'S',
      critMultiplier: 1.5,
      praiseTitle: '💎 红石计算机级准确度！',
      villageChiefComment:
        '太厉害了！红石工程师仔细检查了你的数学题，数字写得清清楚楚，计算步骤就像红石电路一样严丝合缝！小苦力怕完全找不到偷袭的机会！',
      gentleHint: '小提示：遇到进位加法和退位减法时，记得看看进位小标号有没有写漏哟！',
      detectedItemsSummary: studentNote || '二年级数学口算与竖式应用练习（已完成本小节）',
    };
  }
  if (task.subject === 'english') {
    return {
      isValidHomework: true,
      grade: 'S',
      critMultiplier: 1.5,
      praiseTitle: '🌟 远征探险语言大师！',
      villageChiefComment:
        'Awesome！末地探险家为你鼓掌！你的英文字母间距很舒服，单词拼写认真，已经成功解锁了神秘远征密码！',
      gentleHint: '小提示：指着刚才完成的单词大声读三遍，宠物会听得更开心哦！',
      detectedItemsSummary: studentNote || '二年级英语单词抄写与绘本阅读打卡',
    };
  }
  return {
    isValidHomework: true,
    grade: 'S',
    critMultiplier: 2.0,
    praiseTitle: '🔥 铁傀儡认证运动健将！',
    villageChiefComment: sportsScore
      ? `哇塞！刚刚跳绳/运动一口气完成了 ${sportsScore} 次！村庄铁傀儡队长都佩服你的耐力！你的宠物已经充满活力准备出发寻宝啦！`
      : '太棒啦！坚持运动的小矿工体格最健壮，挖矿造房子的力气直接翻倍！',
    gentleHint: '运动完记得喝几口温水，擦擦汗休息一下哦！',
    detectedItemsSummary: sportsScore ? `体育跳绳/运动挑战：${sportsScore} 次` : studentNote || '今日体育运动打卡完成',
  };
}

// POST /api/homework/submit
app.post('/api/homework/submit', async (req, res) => {
  try {
    const { taskId, imageBase64, studentNote, sportsScore, isDemoSample } = req.body as {
      taskId: string;
      imageBase64?: string;
      studentNote?: string;
      sportsScore?: number;
      isDemoSample?: boolean;
    };

    const state = loadState();
    const settings = loadSettings();
    const task = state.tasks.find((t) => t.id === taskId) || state.tasks[0];

    let savedImageUrl: string | undefined;
    if (imageBase64 && imageBase64.startsWith('data:image/')) {
      const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `hw_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
        savedImageUrl = `/uploads/${filename}`;
      }
    }

    let aiCore: Omit<AIReviewResult, 'rewards'> | null = null;
    const hasConfiguredKey = Boolean(settings.openaiApiKey && settings.openaiApiKey.trim().length > 5);

    // 1. If OpenAI API Key is configured and an image was uploaded, call OpenAI Vision
    if (hasConfiguredKey && imageBase64) {
      try {
        const openai = new OpenAI({
          apiKey: settings.openaiApiKey.trim(),
          baseURL: settings.openaiBaseUrl || 'https://api.openai.com/v1',
        });

        const systemPrompt = `你现在是《我的世界》(Minecraft)里的“方块村长”，正在帮一名中国小学二年级（7-8岁）的小朋友检查家庭作业照片。
当前作业科目与名称：【${task.title}】（科目类型：${task.subject}）。
小朋友附言：${studentNote || '无'}。

【极其重要的防作弊与完成度核查规则】：
请你仔细观察照片中的题目区域（如填空圆圈、等号后面、田字格、横线、方框等），严格区分【印刷的原题】和【学生用笔手写的作答字迹】！
1. **空白/未写作业（严禁给奖励）**：
   - 如果照片只是一页**空白练习册/空白试卷/课本原题**（例如：等号后面是空的、圆圈/方框里没有填答案、没有学生手写做题痕迹），或者照片与作业无关：
   - 必须返回："isValidHomework": false, "grade": "C", "critMultiplier": 0
   - "praiseTitle": "🔒 宝箱还锁着呢！还没动笔写哦"
   - "villageChiefComment": 具体指出照片里看到了什么题目（例如“村长看到了《练习二》的乘法口诀题，但圆圈和等号后面还是空白的哦”），温柔鼓励小朋友先拿起铅笔写完答案再来拍照开宝箱。
2. **只写了一小部分（部分完成）**：
   - 如果整页有很多题，学生只手写完成了其中一部分（还有明显空白未做的题）：
   - 返回："isValidHomework": true, "grade": "B", "critMultiplier": 0.6
   - 在评语中肯定他已经写完的几道题，同时明确提醒还有哪几道题空着没写完。
3. **认真手写完成（核对答案对错）**：
   - 如果学生已经手写完成了照片中的主要题目，请逐题检查他的手写答案是否正确！
   - 全部正确且字迹认真：返回 "isValidHomework": true, "grade": "S", "critMultiplier": 1.5
   - 已完成但有个别算错/写错：返回 "isValidHomework": true, "grade": "A", "critMultiplier": 1.0，并在 "gentleHint" 中温和指出具体哪道题算错了（不要直接给答案，给提示让他检查）。

请返回严格的 JSON 对象（不要使用 Markdown 代码块包裹），字段如下：
{
  "isValidHomework": boolean,
  "grade": "S" | "A" | "B" | "C",
  "critMultiplier": number, // C必须为0，B为0.6，A为1.0，S为1.5
  "praiseTitle": "标题文本",
  "villageChiefComment": "60~120字的具体点评，必须结合照片里的真实题目和手写情况说话！",
  "gentleHint": "错题提示或下一步建议",
  "detectedItemsSummary": "一句话总结识别到的题目名称及实际手写完成情况（如：识别到《练习二》乘法题，手写完成0题，处于空白状态）"
}`;

        const completion = await openai.chat.completions.create({
          model: settings.openaiModel || 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `请严格检查这张二年级【${task.title}】照片是否有学生手写作答痕迹，并检查答案对错，返回JSON！`,
                },
                {
                  type: 'image_url',
                  image_url: { url: imageBase64 },
                },
              ],
            },
          ],
          max_tokens: 700,
        });

        const rawText = completion.choices[0]?.message?.content || '';
        const parsed = JSON.parse(rawText);
        const valid = Boolean(parsed.isValidHomework) && parsed.grade !== 'C';
        aiCore = {
          isValidHomework: valid,
          grade: ['S', 'A', 'B', 'C'].includes(parsed.grade) ? parsed.grade : valid ? 'A' : 'C',
          critMultiplier: valid ? Number(parsed.critMultiplier) || 1.0 : 0,
          praiseTitle:
            parsed.praiseTitle || (valid ? '✨ 作业检查完成！' : '🔒 宝箱还锁着呢！作业还没写完哦'),
          villageChiefComment:
            parsed.villageChiefComment ||
            (valid
              ? '方块村长仔细检查了你的作业，完成得很棒！'
              : '哎呀，村长看了一下照片，上面的题目还是空白的，还没有看到你手写的答案哦！快拿起笔写完再来拍照吧！'),
          gentleHint: parsed.gentleHint || '',
          detectedItemsSummary: parsed.detectedItemsSummary || `${task.title}`,
        };
      } catch (apiErr: any) {
        console.error('OpenAI Vision call failed:', apiErr?.message || apiErr);
        aiCore = {
          isValidHomework: false,
          grade: 'C',
          critMultiplier: 0,
          praiseTitle: '⚠️ AI 村长连接异常，未发放奖励',
          villageChiefComment: `调用 OpenAI 模型（${settings.openaiModel}）检查作业时出错了：${
            apiErr?.message || '网络或接口异常'
          }。请家长检查右上角「家长设置」中的 API Key、Base URL 和模型名称是否正确！`,
          gentleHint: '提示：确认 API Key 有效且支持视觉识图（如 gpt-4o / gpt-4o-mini）后再试一次吧！',
          detectedItemsSummary: 'OpenAI 接口调用失败',
        };
      }
    } else if (task.subject === 'sports' && sportsScore && !imageBase64) {
      // Sports timer completion without photo
      aiCore = buildSmartFallbackReview(task, studentNote, sportsScore);
    } else if (isDemoSample) {
      // Explicit built-in demo sample button clicked
      aiCore = buildSmartFallbackReview(task, studentNote, sportsScore);
    } else {
      // Real photo uploaded, but NO OpenAI API Key configured in settings.json!
      aiCore = {
        isValidHomework: false,
        grade: 'C',
        critMultiplier: 0,
        praiseTitle: '🔑 尚未配置 OpenAI API Key',
        villageChiefComment:
          '村长收到了你上传的作业照片，但爸爸妈妈还没有在右上角「家长设置」里保存 OpenAI API Key，村长暂时看不清照片里的题目有没有写完哦！',
        gentleHint:
          '请家长点击右上角「家长设置」（默认密码 1234），填入 OpenAI API Key 并点击「保存配置」，村长就能真正检查你的作业啦！',
        detectedItemsSummary: '未配置 OpenAI API Key，无法识别真实照片',
      };
    }

    // If homework is NOT valid (blank page / unfinished / no API key), grant ZERO rewards!
    if (!aiCore.isValidHomework || aiCore.grade === 'C' || aiCore.critMultiplier <= 0) {
      const rejectedReview: AIReviewResult = {
        ...aiCore,
        isValidHomework: false,
        grade: 'C',
        critMultiplier: 0,
        rewards: {
          emeralds: 0,
          xp: 0,
          blocks: {},
          foods: {},
          sportsEnergy: 0,
        },
      };

      const submission: SubmissionRecord = {
        id: `sub_${Date.now()}`,
        taskId: task.id,
        taskTitle: task.title,
        subject: task.subject,
        timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
        imageUrl: savedImageUrl,
        sportsScore,
        studentNote,
        aiReview: rejectedReview,
      };

      state.submissions = [submission, ...state.submissions.slice(0, 49)];
      saveState(state);

      return res.json({
        review: rejectedReview,
        submission,
        state,
      });
    }

    // Valid homework completed: Calculate loot drops based on task & critMultiplier
    const mult = aiCore.critMultiplier;
    const emeraldsEarned = Math.max(2, Math.round(task.baseEmeralds * mult));
    const xpEarned = Math.max(10, Math.round(task.baseXp * mult));
    const sportsEnergyEarned = task.subject === 'sports' ? 35 : 10;

    const droppedBlocks: Record<string, number> = {};
    const pool: BlockId[] = [...task.dropBlockPool, 'oak_planks', 'cobblestone', 'brick'];
    const pickCount = aiCore.grade === 'S' ? 3 : 2;
    for (let i = 0; i < pickCount; i++) {
      const b = pool[i % pool.length];
      const qty = Math.max(2, Math.round((6 + (i === 0 ? 4 : 2)) * mult));
      droppedBlocks[b] = (droppedBlocks[b] || 0) + qty;
    }
    if (aiCore.grade === 'S') {
      droppedBlocks['diamond_block'] = (droppedBlocks['diamond_block'] || 0) + 2;
    }

    const droppedFoods: Record<string, number> = {
      [task.dropFood]: aiCore.grade === 'S' ? 2 : 1,
    };
    if (aiCore.critMultiplier >= 1.5) {
      droppedFoods['golden_apple'] = 1;
    }

    const fullReview: AIReviewResult = {
      ...aiCore,
      rewards: {
        emeralds: emeraldsEarned,
        xp: xpEarned,
        blocks: droppedBlocks,
        foods: droppedFoods,
        sportsEnergy: sportsEnergyEarned,
      },
    };

    // Update player state
    state.emeralds += emeraldsEarned;
    state.xp += xpEarned;
    state.sportsEnergy = Math.min(100, state.sportsEnergy + sportsEnergyEarned);

    // Level up every 100 XP
    while (state.xp >= 100) {
      state.xp -= 100;
      state.level += 1;
    }

    // Add blocks to inventory
    for (const [bId, count] of Object.entries(droppedBlocks)) {
      const key = bId as BlockId;
      state.blocksInventory[key] = (state.blocksInventory[key] || 0) + count;
    }

    // Add foods to inventory
    for (const [fId, count] of Object.entries(droppedFoods)) {
      const key = fId as FoodId;
      state.foodsInventory[key] = (state.foodsInventory[key] || 0) + count;
    }

    // Increment task progress
    const targetTask = state.tasks.find((t) => t.id === task.id);
    if (targetTask) {
      targetTask.completedSteps += 1;
    }

    const submission: SubmissionRecord = {
      id: `sub_${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      subject: task.subject,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      imageUrl: savedImageUrl,
      sportsScore,
      studentNote,
      aiReview: fullReview,
    };

    state.submissions = [submission, ...state.submissions.slice(0, 49)];
    saveState(state);

    res.json({
      review: fullReview,
      submission,
      state,
    });
  } catch (err: any) {
    console.error('Submit homework error:', err);
    res.status(500).json({ error: err?.message || '提交作业失败' });
  }
});

// GET /api/tts - Synthesize Chinese speech so Chrome, Safari, and iPad play reliably
app.get('/api/tts', async (req, res) => {
  const rawText = String(req.query.text || '').trim();
  if (!rawText) {
    return res.status(400).send('Missing text');
  }

  // Strip emojis and special symbols so TTS reads smoothly
  const cleanText = rawText
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  if (!cleanText) {
    return res.status(400).send('Empty clean text');
  }

  // 1. If running on macOS with /usr/bin/say available
  if (process.platform === 'darwin' && fs.existsSync('/usr/bin/say')) {
    const tmpWav = path.join(
      os.tmpdir(),
      `qiqi_tts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.wav`
    );

    execFile(
      '/usr/bin/say',
      ['-v', 'Tingting', '-r', '190', '-o', tmpWav, '--data-format=LEI16@22050', cleanText],
      { timeout: 10000 },
      (err) => {
        if (err || !fs.existsSync(tmpWav)) {
          return res.status(404).json({ error: 'TTS say failed, fallback to client' });
        }
        try {
          const wavBuffer = fs.readFileSync(tmpWav);
          fs.unlink(tmpWav, () => {});
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Cache-Control', 'no-store');
          return res.send(wavBuffer);
        } catch {
          return res.status(404).json({ error: 'Failed to read TTS wav' });
        }
      }
    );
    return;
  }

  // 2. If OpenAI API Key is configured, try OpenAI TTS
  const settings = loadSettings();
  if (settings.openaiApiKey && settings.openaiApiKey.trim().length > 5) {
    try {
      const openai = new OpenAI({
        apiKey: settings.openaiApiKey.trim(),
        baseURL: settings.openaiBaseUrl || 'https://api.openai.com/v1',
      });
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: cleanText,
        speed: 1.0,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buffer);
    } catch {
      // Fall through to client fallback
    }
  }

  // 3. Fallback to client browser Web Speech API
  return res.status(404).json({ message: 'Server TTS not available, fallback to client' });
});

// Serve production frontend if built
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`⛏️ Qiqi Craft Server running at http://0.0.0.0:${PORT}`);
});

