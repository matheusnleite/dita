import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { config } from "./config.js";

type WebPush = {
  generateVAPIDKeys: () => { publicKey: string; privateKey: string };
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (sub: PushSubscription, payload: string, options?: { TTL?: number }) => Promise<unknown>;
};

const require = createRequire(import.meta.url);
const webpush = require("web-push") as WebPush;

export type PushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type VapidKeys = { publicKey: string; privateKey: string; subject: string };

function vapidFile() {
  return path.join(config.dataDir, "vapid.json");
}

function loadOrCreateVapid(): VapidKeys {
  const file = vapidFile();
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<VapidKeys>;
    if (raw.publicKey && raw.privateKey && raw.subject) {
      return raw as VapidKeys;
    }
  } catch {
    /* gera abaixo */
  }
  const generated = webpush.generateVAPIDKeys();
  const keys: VapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: "mailto:dita@localhost",
  };
  fs.writeFileSync(file, JSON.stringify(keys, null, 2), { mode: 0o600 });
  return keys;
}

const vapid = loadOrCreateVapid();
webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

export function getPublicVapidKey(): string {
  return vapid.publicKey;
}

export async function sendPush(
  subscriptions: PushSubscription[],
  payload: { title: string; body: string; url?: string },
): Promise<PushSubscription[]> {
  const alive: PushSubscription[] = [];
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 });
      alive.push(sub);
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) continue;
      alive.push(sub);
    }
  }
  return alive;
}
