import type { Request, Response } from 'express';
import { createApp } from '../src/server/app.js';
import { getDatabase } from '../src/server/db/index.js';

const db = getDatabase();
const app = createApp(db);

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
