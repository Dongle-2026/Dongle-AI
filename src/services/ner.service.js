const openai = require('../config/openai');
const { getCache, setCache } = require('../cache/redis');
const SYSTEM_PROMPT = require('../prompts/ner.prompt');

/**
 * LLM이 반환한 position을 원문 기준으로 검증/보정
 * LLM이 위치를 틀리는 경우가 있으므로, 실제 본문에서 indexOf로 재탐색
 */
const verifyPositions = (terms, content) =>
  terms.map((t) => {
    const name = t.term_name;
    const idx = content.indexOf(name);
    if (idx !== -1) {
      return { ...t, position_start: idx, position_end: idx + name.length };
    }
    // 본문에서 못 찾으면 LLM이 준 값 그대로 사용
    return t;
  });

const extract = async (news_id, content) => {
  const cached = await getCache(`ner:${news_id}`);
  if (cached) return cached;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content },
    ],
    temperature: 0.2,
  });

  const raw = response.choices[0].message.content;
  const terms = verifyPositions(JSON.parse(raw), content);
  const result = { news_id, terms };

  await setCache(`ner:${news_id}`, result, 86400);

  return result;
};

module.exports = { extract };
