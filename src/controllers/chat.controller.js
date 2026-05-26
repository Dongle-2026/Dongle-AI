const agentService = require('../services/agent.service');
const sseService = require('../services/sse.service');

/**
 * POST /ai/chat
 * Tool Calling Agent 기반 AI 학습 튜터 응답을 SSE 스트리밍으로 반환
 *
 * @body {string} user_id
 * @body {string} session_id - 대화 컨텍스트 유지용
 * @body {string} message - 사용자 질문
 */
exports.handle = async (req, res, next) => {
  try {
    const { user_id, session_id, message } = req.body;
    sseService.setHeaders(res);
    await agentService.chat({ res, user_id, session_id, message });
  } catch (err) {
    next(err);
  }
};
