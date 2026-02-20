/**
 * Fix Express 5 types under nodenext module resolution.
 *
 * Under nodenext, @types/express@5 fails to surface inherited properties
 * from http.IncomingMessage / http.ServerResponse through the class
 * hierarchy. This creates properly typed aliases for use across the app.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';

/**
 * Express-compatible Request type with Node.js HTTP properties.
 * Use this instead of `express.Request` to avoid nodenext resolution issues.
 */
export type HttpRequest = IncomingMessage & {
  user?: Record<string, unknown>;
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
  ip?: string;
  socket: Socket;
  headers: IncomingMessage['headers'];
};

/**
 * Express-compatible Response type with Node.js HTTP properties.
 * Use this instead of `express.Response` to avoid nodenext resolution issues.
 */
export type HttpResponse = ServerResponse & {
  status(code: number): HttpResponse;
  json(body: unknown): HttpResponse;
  send(body: unknown): HttpResponse;
  redirect(url: string): void;
  redirect(status: number, url: string): void;
  setHeader(name: string, value: string | number | readonly string[]): HttpResponse;
  flushHeaders(): void;
  writable: boolean;
};
