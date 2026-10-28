import type { IncomingMessage, ServerResponse } from 'node:http';
import type express from 'express';
import { createApp } from './app';

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    res.once('error', reject);

    app(
      req as unknown as express.Request,
      res as unknown as express.Response,
      (err: unknown) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
