const openai = require('../config/openai');
const { getCache, setCache } = require('../cache/redis');
const SYSTEM_PROMPT = require('../prompts/summarize.prompt');

const summarize = async (news_id, { title, content, category, published_at, source }) => {
  // 1. 캐시 확인 (같은 뉴스 중복 요약 방지)
  const cached = await getCache(`summary:${news_id}`);
  if (cached) return cached;

  // 2. 사용자 메시지 구성
  const userMessage = [
    `제목: ${title}`,
    `본문: ${content}`,
    category ? `카테고리: ${category}` : null,
    published_at ? `발행일: ${published_at}` : null,
    source ? `출처: ${source}` : null,
  ].filter(Boolean).join('\n');

  // 3. GPT-4o-mini 호출
  const model = 'gpt-4o-mini';
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
  });

  // 4. 응답 파싱
  const raw = response.choices[0].message.content;
  const cards = JSON.parse(raw);
  const result = {
    news_id,
    cards,
    card_count: cards.length,
    model_version: model,
  };

  // 5. 캐시 저장 (24시간 = 86400초)
  await setCache(`summary:${news_id}`, result, 86400);

  return result;
};

module.exports = { summarize };
