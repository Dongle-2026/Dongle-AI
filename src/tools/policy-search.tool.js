const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { queryPolicies } = require('../db/pgvector');

const policySearchTool = new DynamicStructuredTool({
  name: 'policy_search',
  description: '청년 정책, 지원금, 혜택을 검색합니다. 정책 추천, 지원 자격, 신청 방법 관련 질문일 때 사용하세요.',
  schema: z.object({
    query: z.string().describe('정책 검색 키워드 (예: 월세, 취업지원, 저축)'),
    region: z.string().optional().describe('지역코드 (예: 서울, 부산)'),
    age: z.number().optional().describe('사용자 나이'),
  }),
  func: async ({ query, region, age }) => {
    const rows = await queryPolicies({ region, age, query });

    if (rows.length === 0) {
      return JSON.stringify({ results: [], message: '조건에 맞는 정책을 찾지 못했습니다.' });
    }

    const results = rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      organization: row.organization,
      region_code: row.region_code,
      end_date: row.end_date,
      application_url: row.application_url,
    }));

    return JSON.stringify({ results });
  },
});

module.exports = { policySearchTool };
