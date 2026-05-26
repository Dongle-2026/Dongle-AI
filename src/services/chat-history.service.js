const { BaseListChatMessageHistory } = require('@langchain/core/chat_history');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');
const { getCache, setCache } = require('../cache/redis');

const MAX_TURNS = 10; // 최근 10턴 (20개 메시지)
const TTL_SECONDS = 3600; // 1시간

class RedisChatHistory extends BaseListChatMessageHistory {
  constructor(sessionId) {
    super();
    this.lc_namespace = ['langchain', 'stores', 'message', 'redis'];
    this.sessionId = sessionId;
    this.key = `chat_history:${sessionId}`;
  }

  async getMessages() {
    const data = await getCache(this.key);
    if (!data) return [];

    return data.map((msg) =>
      msg.type === 'human'
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );
  }

  async addMessage(message) {
    const messages = await this.getMessages();
    messages.push(message);

    // 최근 MAX_TURNS * 2 개만 유지 (human + ai = 1턴)
    const trimmed = messages.slice(-(MAX_TURNS * 2));

    const serialized = trimmed.map((msg) => ({
      type: msg._getType(),
      content: msg.content,
    }));

    await setCache(this.key, serialized, TTL_SECONDS);
  }

  async clear() {
    await setCache(this.key, [], TTL_SECONDS);
  }
}

/**
 * session_id 기반 대화 이력 인스턴스 반환
 * RunnableWithMessageHistory에서 사용
 */
const getSessionHistory = (sessionId) => {
  return new RedisChatHistory(sessionId);
};

module.exports = { getSessionHistory };
