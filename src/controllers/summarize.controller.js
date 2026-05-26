const summarizerService = require('../services/summarizer.service');

/**
 * POST /ai/summarize
 * 뉴스 본문 → 카드뉴스용 구조화된 JSON
 *
 * @body {string} news_id - 뉴스 PK (캐시 키 및 DB 저장용)
 * @body {string} title - 기사 제목
 * @body {string} content - 크롤링된 뉴스 원문
 * @body {string} [category] - 기사 카테고리
 * @body {string} [published_at] - 기사 발행일
 * @body {string} [source] - 출처 정보
 */
exports.handle = async (req, res, next) => {
  try {
    const { news_id, title, content, category, published_at, source } = req.body;
    const result = await summarizerService.summarize(news_id, { title, content, category, published_at, source });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
