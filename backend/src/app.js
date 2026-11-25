import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';
import { eventBus } from './events/eventBus.js';
import { registerEventHandlers } from './events/handlers.js';

export function createApp() {
  const app = express();

  registerEventHandlers(eventBus);

  app.set('trust proxy', 1); // correct client IPs behind Render/Heroku/nginx for rate limiting
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // allow same-origin / curl / Postman (no Origin header) and configured browser origins
        if (!origin || env.clientUrls.includes(origin)) return cb(null, true);
        cb(null, false);
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
