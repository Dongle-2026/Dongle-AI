/**
 * Express 공통 에러 핸들러
 *
 * NOTE: 반드시 app.use() 마지막에 등록해야 동작함
 * NOTE: err.status가 없으면 500으로 처리 (예상치 못한 예외 포함)
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.path}`, err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.status || 500,
  });
};

module.exports = errorHandler;
