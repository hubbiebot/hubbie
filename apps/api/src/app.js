import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/error-handler.js';
import { requestIdMiddleware } from './middlewares/request-id.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { mountSwagger } from './openapi/swagger.js';

export function createApp({ config, logger, readiness }) {
  const app = express();

  app.disable('x-powered-by');
  app.locals.config = config;
  app.locals.logger = logger;
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    }
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use('/health', createHealthRouter({ readiness }));
  mountSwagger(app, config);
  app.use((_request, _response, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
  });
  app.use(errorHandler);

  return app;
}
