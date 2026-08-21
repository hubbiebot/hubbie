import { Router } from 'express';
import { createHealthController } from './health.controller.js';

export function createHealthRouter({ readiness }) {
  const router = Router();
  const controller = createHealthController({ readiness });

  router.get('/live', controller.live);
  router.get('/ready', controller.ready);

  return router;
}
