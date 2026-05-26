const { createClient } = require('redis');

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

client.on('error', (err) => {
  // WARN: Redis 연결 끊김 시 NER/요약 캐시 미스로 OpenAI 비용 급증 가능
  console.error('[Redis] 연결 오류:', err.message);
});

client.connect();

/**
 * 캐시 조회
 *
 * @param {string} key - 캐시 키 (예: `ner:{news_id}`, `summary:{hash}`)
 * @returns {Promise<any|null>} 파싱된 캐시 값, 없으면 null
 */
const getCache = async (key) => {
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
};

/**
 * 캐시 저장
 *
 * @param {string} key - 캐시 키
 * @param {any} value - 저장할 값 (JSON 직렬화됨)
 * @param {number} ttlSeconds - 만료 시간(초). NER=86400, 주식시세=300
 */
const setCache = async (key, value, ttlSeconds) => {
  await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

module.exports = { getCache, setCache };
