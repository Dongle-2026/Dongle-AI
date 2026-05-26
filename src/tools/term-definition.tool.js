const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { queryTermDefinition } = require('../db/pgvector');

const termDefinitionTool = new DynamicStructuredTool({
  name: 'term_definition',
  description: '금융 용어의 뜻을 조회합니다. 용어 정의, 개념 설명이 필요할 때 사용하세요.',
  schema: z.object({
    term: z.string().describe('정의를 찾고자 하는 금융 용어'),
  }),
  func: async ({ term }) => {
    const rows = await queryTermDefinition(term);

    if (rows.length === 0) {
      return JSON.stringify({ results: [], message: `"${term}"에 대한 정의를 찾지 못했습니다.` });
    }

    const results = rows.map((row) => ({
      term_name: row.name,
      definition: row.simple_definition,
      difficulty_level: row.difficulty_level,
    }));

    return JSON.stringify({ results });
  },
});

module.exports = { termDefinitionTool };
