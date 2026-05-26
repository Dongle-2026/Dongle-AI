const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');

// TODO: 4회차 실제 소비 데이터 API 연동
const spendingAnalysisTool = new DynamicStructuredTool({
  name: 'spending_analysis',
  description: '사용자의 소비 패턴을 분석합니다. 지출 분석, 소비 습관, 가계부 관련 질문일 때 사용하세요.',
  schema: z.object({
    user_id: z.string().describe('사용자 ID'),
    period: z.string().optional().describe('분석 기간 (예: 2026-05, 최근3개월)'),
  }),
  func: async ({ user_id, period }) => {
    const stub = {
      user_id,
      period: period || '2026-05',
      categories: [
        { name: '식비', amount: 450000, ratio: '35%' },
        { name: '교통비', amount: 150000, ratio: '12%' },
        { name: '쇼핑', amount: 200000, ratio: '15%' },
        { name: '문화/여가', amount: 120000, ratio: '9%' },
        { name: '통신비', amount: 65000, ratio: '5%' },
        { name: '기타', amount: 315000, ratio: '24%' },
      ],
      total: 1300000,
      note: '소비 분석 기능은 현재 준비 중입니다. 샘플 데이터로 제공됩니다.',
    };

    return JSON.stringify(stub);
  },
});

module.exports = { spendingAnalysisTool };
