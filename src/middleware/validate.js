/**
 * 요청 바디 필수 필드 검증 미들웨어 팩토리
 *
 * @param {string[]} fields - 필수 필드 이름 목록
 * @returns Express 미들웨어
 *
 * @example
 * router.post('/', requireFields(['news_id', 'content']), controller.handle);
 */
const requireFields = (fields) => (req, res, next) => {
  const missing = fields.filter((f) => !req.body[f]);
  if (missing.length > 0) {
    return res.status(400).json({
      error: `필수 필드 누락: ${missing.join(', ')}`,
      code: 400,
    });
  }
  next();
};

module.exports = { requireFields };
