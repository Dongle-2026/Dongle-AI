const quizService = require('../services/quiz.service');

/**
 * POST /ai/quiz
 * 뉴스 본문 → 4지선다 퀴즈 2~3개 생성
 *
 * @body {string} news_id - 뉴스 PK (캐시 키)
 * @body {string} content - 크롤링된 뉴스 원문
 */
exports.handle = async (req, res, next) => {
  try {
    const { news_id, content } = req.body;
    const result = await quizService.generateQuiz(news_id, content);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
