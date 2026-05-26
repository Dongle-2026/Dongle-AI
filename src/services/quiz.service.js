const openai = require('../config/openai');
const { getCache, setCache } = require('../cache/redis');
const SYSTEM_PROMPT = require('../prompts/quiz.prompt');

const generateQuiz = async (news_id, content) => {
  // 1. 캐시 확인 (같은 뉴스 중복 퀴즈 생성 방지)
  const cached = await getCache(`quiz:${news_id}`);
  if (cached) return cached;

  // 2. GPT-4o-mini 호출
  const model = 'gpt-4o-mini';
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content },
    ],
    temperature: 0.7,
  });

  // 3. 응답 파싱
  const raw = response.choices[0].message.content;
  const quizzes = JSON.parse(raw);
  const result = {
    news_id,
    quizzes,
    quiz_count: quizzes.length,
    model_version: model,
  };

  // 4. 캐시 저장 (24시간 = 86400초)
  await setCache(`quiz:${news_id}`, result, 86400);

  return result;
};

module.exports = { generateQuiz };
