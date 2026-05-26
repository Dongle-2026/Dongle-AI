/**
 * SSE(Server-Sent Events) 유틸리티 (3회차 RAG Agent와 함께 사용 예정)
 *
 * 설계:
 * - setHeaders: SSE 응답 헤더 설정 (text/event-stream)
 * - sendToken: Agent 응답 토큰 단위 청크 전송
 * - sendDone: 스트리밍 종료 + 출처 정보 전송
 *
 * 클라이언트(Next.js)는 EventSource 또는 Vercel AI SDK useChat 훅으로 수신
 */

const setHeaders = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
};

const sendToken = (res, content) => {
  res.write(`data: ${JSON.stringify({ type: 'token', content })}\n\n`);
};

const sendDone = (res, citedSourceIds = []) => {
  res.write(`data: ${JSON.stringify({ type: 'done', cited_source_ids: citedSourceIds })}\n\n`);
  res.end();
};

const sendToolEvent = (res, toolName, status) => {
  res.write(`data: ${JSON.stringify({ type: 'tool', name: toolName, status })}\n\n`);
};

module.exports = { setHeaders, sendToken, sendDone, sendToolEvent };
