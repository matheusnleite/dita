import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";

export const SESSION_COOKIE = "dita_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type Payload = { exp: number };

export function signSession(exp: number, secret = config.sessionSecret): string {
  const payload: Payload = { exp };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifySession(token: string | undefined, secret = config.sessionSecret): boolean {
  if (!token) return false;
  const [body, mac] = token.split(".");
  if (!body || !mac) return false;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function passwordsMatch(input: string, expected = config.password): boolean {
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

type Bucket = { failures: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 10;

export function loginAllowed(ip: string): boolean {
  const bucket = buckets.get(ip);
  if (!bucket) return true;
  if (Date.now() > bucket.resetAt) {
    buckets.delete(ip);
    return true;
  }
  return bucket.failures < MAX_FAILURES;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { failures: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.failures += 1;
}

export function recordLoginSuccess(ip: string): void {
  buckets.delete(ip);
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies[SESSION_COOKIE];
  if (!verifySession(token)) {
    reply.code(401).send({ error: "unauthorized" });
  }
}

export function setSessionCookie(reply: FastifyReply, secure: boolean): void {
  reply.setCookie(SESSION_COOKIE, signSession(Date.now() + MAX_AGE_SECONDS * 1000), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply, secure: boolean): void {
  reply.clearCookie(SESSION_COOKIE, { path: "/", httpOnly: true, sameSite: "lax", secure });
}
