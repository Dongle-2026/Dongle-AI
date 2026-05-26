require('dotenv').config();
const express = require('express');
const errorHandler = require('./middleware/errorHandler');

const summarizeRoute = require('./routes/summarize.route');
const nerRoute = require('./routes/ner.route');
const embedRoute = require('./routes/embed.route');
const chatRoute = require('./routes/chat.route');
const quizRoute = require('./routes/quiz.route');

const app = express();
app.use(express.json());

app.use('/ai/summarize', summarizeRoute);
app.use('/ai/ner', nerRoute);
app.use('/ai/embed', embedRoute);
app.use('/ai/chat', chatRoute);
app.use('/ai/quiz', quizRoute);

// NOTE: Spring Boot에서 헬스체크 폴링 용도 (Docker Compose depends_on 조건)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[AI Service] running on port ${PORT}`);
});
