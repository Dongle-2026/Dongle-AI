const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.7,
  streaming: true,
});

const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small',
  dimensions: 1536,
});

module.exports = { llm, embeddings };
