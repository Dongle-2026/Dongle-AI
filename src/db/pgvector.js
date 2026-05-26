const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.connect((err, client, release) => {
  if (err) {
    // WARN: DB 연결 실패 시 RAG, 임베딩 전 기능 불가 - 환경변수 확인 필요
    console.error('[pgvector] 연결 실패:', err.message);
    return;
  }
  console.log('[pgvector] 연결 성공');
  release();
});

/**
 * 질문 벡터 기준 유사도 Top-K 문서 검색
 *
 * @param {number[]} queryVector - OpenAI text-embedding-3-small 기준 1536차원 벡터
 * @param {number} topK - 반환할 문서 수 (기본값 5)
 * @returns {Promise<Array>} source_type, source_id, metadata, similarity 포함 행 목록
 *
 * NOTE: pgvector <=> 연산자는 cosine distance. similarity = 1 - distance
 */
const searchSimilar = async (queryVector, topK = 5) => {
  const query = `
    SELECT id, source_type, source_id, metadata,
           1 - (embedding <=> $1::vector) AS similarity
    FROM embeddings
    ORDER BY embedding <=> $1::vector
    LIMIT $2
  `;
  const result = await pool.query(query, [`[${queryVector.join(',')}]`, topK]);
  return result.rows;
};

/**
 * 텍스트 임베딩 벡터 저장
 *
 * @param {string} sourceType - 'news' | 'policy' | 'term'
 * @param {string} sourceId - 원본 테이블 PK
 * @param {number[]} embedding - 1536차원 벡터
 * @param {object} metadata - RAG 응답 출처 표시용 부가정보 (title, url 등)
 * @returns {Promise<string>} 생성된 embeddings 행 id
 */
const saveEmbedding = async (sourceType, sourceId, embedding, metadata) => {
  const query = `
    INSERT INTO embeddings (source_type, source_id, embedding, metadata)
    VALUES ($1, $2, $3::vector, $4)
    ON CONFLICT (source_type, source_id) DO UPDATE SET
      embedding = EXCLUDED.embedding,
      metadata = EXCLUDED.metadata
    RETURNING id
  `;
  // NOTE: ON CONFLICT → 재크롤링 시 임베딩 중복 방지 (upsert)
  const result = await pool.query(query, [
    sourceType,
    sourceId,
    `[${embedding.join(',')}]`,
    JSON.stringify(metadata),
  ]);
  return result.rows[0].id;
};

const queryPolicies = async ({ region, age, query }) => {
  try {
    const sql = `
      SELECT id, title, description, organization, region_code,
             age_min, age_max, end_date, application_url
      FROM policies
      WHERE ($1::text IS NULL OR region_code = $1)
        AND ($2::int IS NULL OR (age_min <= $2 AND age_max >= $2))
        AND ($3::text IS NULL OR title ILIKE '%' || $3 || '%' OR description ILIKE '%' || $3 || '%')
      ORDER BY end_date ASC NULLS LAST
      LIMIT 5
    `;
    const result = await pool.query(sql, [region || null, age || null, query || null]);
    return result.rows;
  } catch (err) {
    if (err.message.includes('does not exist')) {
      return [];
    }
    throw err;
  }
};

const queryTermDefinition = async (term) => {
  try {
    let sql = `SELECT name, simple_definition, difficulty_level FROM financial_terms WHERE name = $1`;
    let result = await pool.query(sql, [term]);

    if (result.rows.length === 0) {
      sql = `SELECT name, simple_definition, difficulty_level FROM financial_terms WHERE name ILIKE '%' || $1 || '%' LIMIT 3`;
      result = await pool.query(sql, [term]);
    }
    return result.rows;
  } catch (err) {
    if (err.message.includes('does not exist')) {
      return [];
    }
    throw err;
  }
};

module.exports = { pool, searchSimilar, saveEmbedding, queryPolicies, queryTermDefinition };
