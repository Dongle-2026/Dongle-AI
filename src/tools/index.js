const { newsSearchTool } = require('./news-search.tool');
const { policySearchTool } = require('./policy-search.tool');
const { termDefinitionTool } = require('./term-definition.tool');
const { spendingAnalysisTool } = require('./spending-analysis.tool');
const { marketDataTool } = require('./market-data.tool');
const { recommendationTool } = require('./recommendation.tool');

const getTools = (userId) => {
  return [
    newsSearchTool,
    policySearchTool,
    termDefinitionTool,
    spendingAnalysisTool,
    marketDataTool,
    recommendationTool,
  ];
};

module.exports = { getTools };
