// Example: expose a minimal subset of backend routes via adapter for Workers
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Export a simple handler that can be adapted using express-to-worker adapter
export default app;
