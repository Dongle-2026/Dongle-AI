const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { pool } = require('../db/pgvector');

const newsSearchTool = new DynamicStructuredTool({
  name: 'news_search',
  description: '금융/경제 뉴스를 검색합니다. 뉴스, 기사, 경제 이슈, 시사 관련 질문일 때 사용하세요.',
  schema: z.object({
    query: z.string().describe('검색할 금융/경제 키워드 또는 질문'),
  }),
  func: async ({ query }) => {
    try {
      const sql = `
        SELECT id, title, content, category, source_name, published_at
        FROM news_articles
        WHERE title ILIKE '%' || $1 || '%' OR content ILIKE '%' || $1 || '%'
        ORDER BY published_at DESC NULLS LAST
        LIMIT 5
      `;
      const result = await pool.query(sql, [query]);

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
      }));

      const sourceIds = results.map((r) => r.source_id);

      return JSON.stringify({ results, source_ids: sourceIds });
    } catch (err) {
      return JSON.stringify({ results: [], message: '뉴스 검색 중 오류가 발생했습니다.' });
    }
  },
});

module.exports = { newsSearchTool };
