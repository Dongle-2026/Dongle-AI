const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { pool } = require('../db/pgvector');
const { embeddings } = require('../config/langchain');

const newsSearchTool = new DynamicStructuredTool({
  name: 'news_search',
  description: '금융/경제 뉴스를 검색합니다. 뉴스, 기사, 경제 이슈, 시사 관련 질문일 때 사용하세요.',
  schema: z.object({
    query: z.string().describe('검색할 금융/경제 키워드 또는 질문'),
  }),
  func: async ({ query }) => {
    try {
      // 1. 질의 벡터화 (text-embedding-3-small, 1536차원)
      const queryVector = await embeddings.embedQuery(query);
      const vectorLiteral = `[${queryVector.join(',')}]`;

      // 2. pgvector 코사인 유사도 Top-5 + news_articles JOIN
      //    <=> 는 cosine distance, similarity = 1 - distance
      const sql = `
        SELECT n.id, n.title, n.content, n.category, n.source_name, n.published_at,
               1 - (e.embedding <=> $1::vector) AS similarity
        FROM embeddings e
        JOIN news_articles n ON n.id::text = e.source_id
        WHERE e.source_type = 'news'
        ORDER BY e.embedding <=> $1::vector
        LIMIT 5
      `;
      const result = await pool.query(sql, [vectorLiteral]);

      if (result.rows.length === 0) {
        return JSON.stringify({ results: [], message: '관련 뉴스를 찾지 못했습니다.' });
      }

      const results = result.rows.map((row, i) => ({
        index: i + 1,
        source_id: row.id,
        title: row.title,
        content: row.content.substring(0, 300),
        category: row.category,
        source_name: row.source_name,
        published_at: row.published_at,
        similarity: Number(Number(row.similarity).toFixed(3)),
      }));

      const sourceIds = results.map((r) => r.source_id);

      return JSON.stringify({ results, source_ids: sourceIds });
    } catch (err) {
      console.warn('[news_search] 검색 실패:', err.message);
      return JSON.stringify({ results: [], message: '뉴스 검색 중 오류가 발생했습니다.' });
    }
  },
});

module.exports = { newsSearchTool };
