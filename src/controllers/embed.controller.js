const embedderService = require('../services/embedder.service');

/**
 * POST /ai/embed
 * 텍스트를 벡터화하여 pgvector에 저장 (RAG 검색 대상 구축)
 *
 * @body {string} source_type - 'news' | 'policy' | 'term'
 * @body {string} source_id - 원본 테이블 PK
 * @body {string} text - 임베딩할 텍스트
 * @body {object} [metadata] - 출처 표시용 부가정보 (title, url 등)
 */
exports.handle = async (req, res, next) => {
  try {
    const { source_type, source_id, text, metadata } = req.body;
    const result = await embedderService.embed(source_type, source_id, text, metadata);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
