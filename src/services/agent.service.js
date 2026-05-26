const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');
const { createToolCallingAgent, AgentExecutor } = require('langchain/agents');
const { RunnableWithMessageHistory } = require('@langchain/core/runnables');
const { llm } = require('../config/langchain');
const { getTools } = require('../tools');
const { getSessionHistory } = require('./chat-history.service');
const sseService = require('./sse.service');
const AGENT_PROMPT = require('../prompts/agent.prompt');

const prompt = ChatPromptTemplate.fromMessages([
  ['system', AGENT_PROMPT],
  new MessagesPlaceholder('history'),
  ['human', '{input}'],
  new MessagesPlaceholder('agent_scratchpad'),
]);

const chat = async ({ res, user_id, session_id, message }) => {
  const tools = getTools(user_id);

  const agent = createToolCallingAgent({ llm, tools, prompt });

  const executor = new AgentExecutor({
    agent,
    tools,
    maxIterations: 5,
    returnIntermediateSteps: true,
  });

  const agentWithHistory = new RunnableWithMessageHistory({
    runnable: executor,
    getMessageHistory: getSessionHistory,
    inputMessagesKey: 'input',
    historyMessagesKey: 'history',
  });

  const eventStream = await agentWithHistory.streamEvents(
    { input: message },
    { version: 'v2', configurable: { sessionId: session_id } }
  );

  let citedSourceIds = [];

  for await (const event of eventStream) {
    if (event.event === 'on_chat_model_stream') {
      const content = event.data?.chunk?.content;
      if (content && typeof content === 'string') {
        sseService.sendToken(res, content);
      }
    }

    if (event.event === 'on_tool_start') {
      sseService.sendToolEvent(res, event.name, 'start');
    }

    if (event.event === 'on_tool_end') {
      sseService.sendToolEvent(res, event.name, 'end');
      try {
        const output = JSON.parse(event.data?.output);
        if (output?.source_ids) {
          citedSourceIds.push(...output.source_ids);
        }
      } catch (e) {
        console.warn('[Agent] Tool output parse failed:', e.message);
      }
    }
  }

  sseService.sendDone(res, [...new Set(citedSourceIds)]);
};

module.exports = { chat };
