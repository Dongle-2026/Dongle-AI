const nerService = require('../services/ner.service');

/**
 * POST /ai/ner
 * 뉴스 본문에서 금융 용어 추출 및 설명 생성
 *
 * @body {string} news_id - 캐시 키용 (Redis TTL 24h)
 * @body {string} content - 분석할 텍스트
 */
exports.handle = async (req, res, next) => {
  try {
    const { news_id, content } = req.body;
    const result = await nerService.extract(news_id, content);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
