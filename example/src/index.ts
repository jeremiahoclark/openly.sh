import { handleRequest } from './router.ts';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
  first<T = unknown>(): Promise<T | null>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface PendingKv {
  get(key: string, options?: { type: 'json' }): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
interface Env {
  OPENLY: D1Database;
  PENDING: PendingKv;
}
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
};
