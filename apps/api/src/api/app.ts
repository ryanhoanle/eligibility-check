import {
  eligibilityRequestSchema,
  type ApiError,
  type EligibilityCheck,
  type Patient,
} from '@eligibility/shared';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { z } from 'zod';
import type { CheckRepository, PatientRepository } from '../services/CheckRepository.js';
import { EligibilityService, PatientNotFoundError } from '../services/EligibilityService.js';

export interface AppDeps {
  patients: PatientRepository;
  checks: CheckRepository;
  eligibility: EligibilityService;
  logger: Logger;
  corsOrigins: string[];
}

const listQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  patientId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Builds the Express app from explicit dependencies. No module-level singletons,
 * so tests construct an app with an in-memory DB and a zero-latency payer.
 */
export function createApp(deps: AppDeps) {
  const app = express();

  app.disable('x-powered-by');
  app.use(pinoHttp({ logger: deps.logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
  app.use(cors({ origin: deps.corsOrigins }));
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, uptimeSec: Math.round(process.uptime()) });
  });

  app.get(
    '/patients',
    asyncHandler(async (req, res) => {
      const { q, limit } = listQuerySchema.parse(req.query);
      const patients: Patient[] = await deps.patients.search(q ?? '', limit);
      res.json({ patients });
    }),
  );

  app.get(
    '/patients/:id',
    asyncHandler<{ id: string }>(async (req, res) => {
      const patient = await deps.patients.findById(req.params.id);
      if (!patient) throw new PatientNotFoundError(req.params.id);
      res.json({ patient });
    }),
  );

  app.post(
    '/eligibility',
    asyncHandler(async (req, res) => {
      const body = eligibilityRequestSchema.parse(req.body);
      const check: EligibilityCheck = await deps.eligibility.check(body.patientId, body.serviceDate);
      res.status(201).json({ check });
    }),
  );

  app.get(
    '/checks',
    asyncHandler(async (req, res) => {
      const { patientId, limit } = listQuerySchema.parse(req.query);
      const checks = patientId
        ? await deps.checks.listByPatient(patientId, limit)
        : await deps.checks.listRecent(limit);
      res.json({ checks });
    }),
  );

  app.get(
    '/checks/:id',
    asyncHandler<{ id: string }>(async (req, res) => {
      const check = await deps.checks.findById(req.params.id);
      if (!check) {
        sendError(res, 404, { code: 'not_found', message: `Check "${req.params.id}" not found` });
        return;
      }
      res.json({ check });
    }),
  );

  app.use((_req, res) => {
    sendError(res, 404, { code: 'not_found', message: 'Route not found' });
  });

  // Error middleware must keep the 4-arg signature for Express to recognise it.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) {
      sendError(res, 400, {
        code: 'validation',
        message: 'Request failed validation',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    if (err instanceof PatientNotFoundError) {
      sendError(res, 404, { code: 'not_found', message: err.message });
      return;
    }
    if (isBodyParseError(err)) {
      sendError(res, 400, { code: 'validation', message: 'Malformed JSON body' });
      return;
    }
    req.log.error({ err }, 'unhandled error');
    sendError(res, 500, { code: 'internal', message: 'Internal server error' });
  });

  return app;
}

type AsyncRoute<P> = (req: Request<P>, res: Response) => Promise<void>;

/**
 * Express 4 doesn't catch rejected promises; this forwards them to the error
 * middleware. Generic over the route params so `req.params.id` is `string`,
 * not `string | undefined`, when the path declares `:id`.
 */
function asyncHandler<P = Record<string, never>>(fn: AsyncRoute<P>) {
  return (req: Request<P>, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function sendError(res: Response, status: number, error: ApiError['error']): void {
  res.status(status).json({ error } satisfies ApiError);
}

function isBodyParseError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.parse.failed';
}
