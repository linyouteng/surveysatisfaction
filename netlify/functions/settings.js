// netlify/functions/settings.js
// 通知設定 API：GET 讀取、POST 儲存
// 建議環境變數：NOTIFICATION_SETTINGS_TOKEN
// 儲存位置：Netlify Blobs（需要 package.json 安裝 @netlify/blobs）

import { getStore } from "@netlify/blobs";

const SETTINGS_KEY = "notification-settings";

const DEFAULT_SETTINGS = {
  brevoEmailEnabled: true,
  linePushEnabled: true,
  newSurveyEmailEnabled: true,
  newSurveyLineEnabled: true,
  lineQuietHoursEnabled: true,
  lineQuietStart: "22:00",
  lineQuietEnd: "07:00",
};

export default async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return json({ ok: true });
    }

    if (!["GET", "POST"].includes(req.method)) {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const tokenError = checkToken(req);
    if (tokenError) return tokenError;

    if (req.method === "GET") {
      const settings = await loadSettings();
      return json({ ok: true, settings });
    }

    const body = await req.json().catch(() => ({}));
    const settings = normalizeSettings(body);
    await saveSettings(settings);
    return json({ ok: true, settings });
  } catch (err) {
    console.error("Settings function error:", err);
    return json({ error: String(err?.message || err) }, 500);
  }
};

function checkToken(req) {
  const requiredToken = String(process.env.NOTIFICATION_SETTINGS_TOKEN || "").trim();
  if (!requiredToken) return null;

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (token !== requiredToken) {
    return json({ error: "Unauthorized：管理 Token 不正確或尚未輸入。" }, 401);
  }
  return null;
}

async function loadSettings() {
  try {
    const store = getStore("survey-notification-settings");
    const saved = await store.get(SETTINGS_KEY, { type: "json" });
    return normalizeSettings(saved || {});
  } catch (err) {
    console.error("Load settings failed, using defaults:", err);
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveSettings(settings) {
  const store = getStore("survey-notification-settings");
  await store.setJSON(SETTINGS_KEY, normalizeSettings(settings));
}

function normalizeSettings(input = {}) {
  const settings = {
    brevoEmailEnabled: toBoolean(input.brevoEmailEnabled, DEFAULT_SETTINGS.brevoEmailEnabled),
    linePushEnabled: toBoolean(input.linePushEnabled, DEFAULT_SETTINGS.linePushEnabled),
    newSurveyEmailEnabled: toBoolean(input.newSurveyEmailEnabled, DEFAULT_SETTINGS.newSurveyEmailEnabled),
    newSurveyLineEnabled: toBoolean(input.newSurveyLineEnabled, DEFAULT_SETTINGS.newSurveyLineEnabled),
    lineQuietHoursEnabled: toBoolean(input.lineQuietHoursEnabled, DEFAULT_SETTINGS.lineQuietHoursEnabled),
    lineQuietStart: normalizeTime(input.lineQuietStart, DEFAULT_SETTINGS.lineQuietStart),
    lineQuietEnd: normalizeTime(input.lineQuietEnd, DEFAULT_SETTINGS.lineQuietEnd),
  };
  return settings;
}

function toBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function normalizeTime(value, fallback) {
  const text = String(value || "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}
