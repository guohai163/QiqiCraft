import { SubjectType } from '../types/game';

/**
 * Generates a realistic 2nd-grade sample homework notebook photo on an HTML5 canvas
 * so parents/kids can immediately test the OpenAI Vision grading pipeline with 1 tap.
 */
export function generateSampleHomeworkImage(subject: SubjectType): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Warm notebook paper background
  ctx.fillStyle = '#fefce8';
  ctx.fillRect(0, 0, 640, 480);

  // Notebook horizontal lines
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  for (let y = 70; y < 450; y += 45) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(600, y);
    ctx.stroke();
  }

  // Red margin line
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(75, 20);
  ctx.lineTo(75, 460);
  ctx.stroke();

  // Header
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 24px sans-serif';

  if (subject === 'chinese') {
    ctx.fillText('二年级语文：生字词与造句练习', 95, 52);
    ctx.font = '22px serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('1. 温暖：温 温 温   暖 暖 暖', 95, 105);
    ctx.fillText('2. 建造：建 建 建   造 造 造', 95, 150);
    ctx.fillText('3. 勇敢：勇 勇 勇   敢 敢 敢', 95, 195);
    ctx.fillText('【看图造句】：', 95, 255);
    ctx.fillText('我和好朋友在草地上一起搭建漂亮的木屋。', 95, 300);
    ctx.fillText('小狗在门前开心地摇着尾巴。', 95, 345);
  } else if (subject === 'math') {
    ctx.fillText('二年级数学：加减法与表内乘法口算', 95, 52);
    ctx.font = '22px monospace';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('① 36 + 28 = 64       ② 72 - 19 = 53', 95, 105);
    ctx.fillText('③ 6 × 7 = 42         ④ 8 × 4 = 32', 95, 150);
    ctx.fillText('⑤ 9 × 6 = 54         ⑥ 45 + 37 = 82', 95, 195);
    ctx.fillText('【解决问题】：', 95, 255);
    ctx.fillText('史蒂夫挖了 4 组钻石，每组有 6 颗，一共多少颗？', 95, 300);
    ctx.fillText('列式：4 × 6 = 24（颗）  答：一共 24 颗。', 95, 345);
  } else if (subject === 'english') {
    ctx.fillText('Grade 2 English: Words & Sentences', 95, 52);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('1. apple  apple  apple  (苹果)', 95, 105);
    ctx.fillText('2. dog    dog    dog    (小狗)', 95, 150);
    ctx.fillText('3. house  house  house  (房子)', 95, 195);
    ctx.fillText('4. happy  happy  happy  (开心的)', 95, 240);
    ctx.fillText('Sentence: I have a cute little dog.', 95, 300);
  } else {
    ctx.fillText('二年级体育：每日1分钟跳绳运动记录卡', 95, 52);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('打卡项目：1分钟跳绳 + 户外伸展运动', 95, 115);
    ctx.fillText('今日成绩：136 个 / 分钟（超额完成！）', 95, 175);
    ctx.fillText('运动状态：精神饱满，动作连贯！', 95, 235);
  }

  // Cute stamp
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.strokeRect(460, 360, 120, 60);
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('认真完成 ★', 472, 397);

  return canvas.toDataURL('image/jpeg', 0.85);
}
