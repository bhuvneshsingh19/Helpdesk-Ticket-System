import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

async function main() {
  await connectDB();
  console.log('MongoDB connected');
  const app = createApp();
  app.listen(env.port, () => console.log(`API listening on :${env.port} (${env.nodeEnv})`));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
