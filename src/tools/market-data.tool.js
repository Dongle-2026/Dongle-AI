const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getCache, setCache } = require('../cache/redis');

// TODO: 외부 시세 API 연동 시 실제 데이터로 교체
const getStubData = () => {
  const today = new Date().toISOString().split('T')[0];
  return {
    kospi: { name: 'KOSPI', value: 2650.32, change: '+1.2%', updated: today },
    kosdaq: { name: 'KOSDAQ', value: 870.15, change: '-0.3%', updated: today },
    usd_krw: { name: 'USD/KRW', value: 1320.50, change: '-0.5%', updated: today },
    eur_krw: { name: 'EUR/KRW', value: 1450.80, change: '+0.2%', updated: today },
    btc_krw: { name: 'BTC/KRW', value: 145000000, change: '+2.1%', updated: today },
  };
};

const marketDataTool = new DynamicStructuredTool({
  name: 'market_data',
  description: '주가지수, 환율 등 시장 데이터를 조회합니다. 코스피, 코스닥, 환율, 비트코인 시세 관련 질문일 때 사용하세요.',
  schema: z.object({
    type: z.enum(['kospi', 'kosdaq', 'usd_krw', 'eur_krw', 'btc_krw']).describe('조회할 시장 데이터 유형'),
  }),
  func: async ({ type }) => {
    const cacheKey = `market:${type}`;
    const cached = await getCache(cacheKey);
    if (cached) return JSON.stringify(cached);

    const data = getStubData()[type];
    if (!data) {
      return JSON.stringify({ message: `"${type}" 데이터를 찾을 수 없습니다.` });
    }

    const result = { ...data, note: '샘플 데이터입니다. 실제 시세와 다를 수 있습니다.' };
    await setCache(cacheKey, result, 300);

    return JSON.stringify(result);
  },
});

module.exports = { marketDataTool };
