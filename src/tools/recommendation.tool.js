const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { pool } = require('../db/pgvector');

const recommendationTool = new DynamicStructuredTool({
  name: 'recommendation',
  description: '사용자에게 관련 뉴스나 정책을 추천합니다. 콘텐츠 추천, 다음 학습 추천 관련 질문일 때 사용하세요.',
  schema: z.object({
    user_id: z.string().describe('사용자 ID'),
    category: z.enum(['news', 'policy', 'term']).optional().describe('추천 카테고리'),
  }),
  func: async ({ user_id, category }) => {
    try {
      if (category === 'policy') {
        const sql = `SELECT id, title, description, organization FROM policies ORDER BY created_at DESC LIMIT 5`;
        const result = await pool.query(sql);
        if (result.rows.length === 0) return JSON.stringify({ results: [], message: '추천할 정책이 없습니다.' });
        return JSON.stringify({ results: result.rows });
      }

      if (category === 'term') {
        const sql = `SELECT id, name, simple_definition FROM financial_terms ORDER BY difficulty_level ASC LIMIT 5`;
        const result = await pool.query(sql);
        if (result.rows.length === 0) return JSON.stringify({ results: [], message: '추천할 용어가 없습니다.' });
        return JSON.stringify({ results: result.rows });
      }

      const sql = `SELECT id, title, category, published_at FROM news_articles ORDER BY published_at DESC NULLS LAST LIMIT 5`;
      const result = await pool.query(sql);
      if (result.rows.length === 0) return JSON.stringify({ results: [], message: '추천할 뉴스가 없습니다.' });
      return JSON.stringify({ results: result.rows });
    } catch (err) {
      return JSON.stringify({ results: [], message: '추천 데이터를 조회하는 중 오류가 발생했습니다.' });
    }
  },
});

module.exports = { recommendationTool };
