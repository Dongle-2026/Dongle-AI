const { embeddings } = require('../config/langchain');
const { getCache, setCache } = require('../cache/redis');
const { saveEmbedding } = require('../db/pgvector');

const EMBEDDING_DIM = 1536;

/**
 * 텍스트를 벡터화하여 pgvector에 저장
 *
 * @param {string} sourceType - 'news' | 'policy' | 'term'
 * @param {string} sourceId - 원본 테이블 PK
 * @param {string} text - 임베딩할 텍스트
 * @param {object} [metadata] - 출처 표시용 부가정보 (title, url 등)
 * @returns {{ source_type, source_id, embedding_dim, stored }}
 */
const embed = async (sourceType, sourceId, text, metadata = {}) => {
  const cacheKey = `embed:${sourceType}:${sourceId}`;

  // 1. 캐시 확인 (동일 문서 재임베딩 방지)
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  // 2. LangChain OpenAIEmbeddings로 벡터 생성
  const embedding = await embeddings.embedQuery(text);

  // 3. pgvector에 저장 (upsert)
  await saveEmbedding(sourceType, sourceId, embedding, metadata);

  const result = {
    source_type: sourceType,
    source_id: sourceId,
    embedding_dim: EMBEDDING_DIM,
    stored: true,
  };

  // 4. 캐시 저장 (7일 — 뉴스 재크롤링 주기 고려)
  await setCache(cacheKey, result, 604800);

  return result;
};

module.exports = { embed };
