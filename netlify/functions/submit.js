// netlify/functions/submit.js
// 信件內容美化版本（移除技術資訊與 JSON，時間顯示為台灣時間）
// 需要的環境變數：BREVO_API_KEY, TO_EMAIL, FROM_EMAIL
// 可選：SITE_NAME

export default async (req, context) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    // ---- 安全解析 body（支援 JSON / urlencoded / multipart） ----
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    let data = {};

    try {
      if (ct.includes("application/json")) {
        data = await req.json();
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        data = accumulateEntries(params.entries());
      } else if (ct.includes("multipart/form-data")) {
        const form = await req.formData();
        data = accumulateEntries(form.entries());
      } else {
        const text = await req.text();
        try {
          data = JSON.parse(text || "{}");
        } catch {
          data = Object.fromEntries(new URLSearchParams(text));
        }
      }
    } catch {
      const text = await req.text().catch(() => "");
      try {
        data = JSON.parse(text || "{}");
      } catch {
        data = Object.fromEntries(new URLSearchParams(text));
      }
    }

    // ---- 環境變數與主旨 ----
    const siteName = process.env.SITE_NAME || "顧客滿意度調查";
    const toEmail = process.env.TO_EMAIL;
    const fromEmail = process.env.FROM_EMAIL;
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey || !toEmail || !fromEmail) {
      return new Response(
        JSON.stringify({
          error:
            "Missing environment variables. Please configure BREVO_API_KEY, TO_EMAIL, FROM_EMAIL.",
        }),
        { status: 500, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    const customerName =
      data.customer_name || data.name || data.line || data["姓名"] || "";

    const subject = `【服務滿意度】新問卷回覆：${customerName || "未填姓名"}`;

    // ---- 題目中文標籤與輸出順序 ----
    const labelMap = {
      customer_name: "姓名 / 稱呼 / LINE",
      service_type: "清洗項目",
      source: "認識自然大叔的管道",
      q1: "Q1 服務整體滿意度",
      q2: "Q2 服務人員專業程度",
      q2_extra: "Q2 補充說明",
      q3: "Q3 服務人員表現 (1-5 分)",
      q4: "Q4 推薦意願 (1-10 分)",
      q5: "Q5 再次委託意願",
      q6: "Q6 其他建議 / 鼓勵",
    };

    const skipKeys = new Set([
      "bot-field",
      "form-name",
      "g-recaptcha-response",
      "submit",
      "userAgent",
      "submittedAt",
    ]);

    // 先依 labelMap 的順序輸出，再補上其他欄位
    const orderedPairs = [];

    for (const key of Object.keys(labelMap)) {
      if (key in data) {
        orderedPairs.push([key, data[key]]);
      }
    }

    for (const [k, v] of Object.entries(data)) {
      if (!labelMap.hasOwnProperty(k)) {
        orderedPairs.push([k, v]);
      }
    }

    // 產生每一列（條紋背景 + 中文標籤）
    const rows = orderedPairs
      .filter(([k]) => !skipKeys.has(k))
      .map(([k, v], index) => {
        const keyLabel = labelMap[k] || k;
        const val = Array.isArray(v) ? v.join(", ") : String(v ?? "");
        const bgColor = index % 2 === 0 ? "#f9fafb" : "#ffffff";
        return `
          <tr style="background:${bgColor};">
            <td style="padding:8px 10px;font-weight:600;color:#111827;width:170px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">
              ${escapeHtml(keyLabel)}
            </td>
            <td style="padding:8px 10px;color:#111827;border-bottom:1px solid #e5e7eb;">
              ${
                escapeHtml(val).replace(/\n/g, "<br/>") ||
                '<span style="color:#9ca3af">(未填)</span>'
              }
            </td>
          </tr>
        `;
      })
      .join("");

    // 送出時間（顯示為台灣時間）
    const submittedAtRaw = data.submittedAt || new Date().toISOString();
    const submittedAtDisplay = formatTaiwanTime(submittedAtRaw);

    // 摘要用的幾個關鍵題目
    const q1 = data.q1 ? escapeHtml(String(data.q1)) : "未填";
    const q3 = data.q3 ? `${escapeHtml(String(data.q3))} / 5` : "未填";
    const q4 = data.q4 ? `${escapeHtml(String(data.q4))} / 10` : "未填";
    const q5 = data.q5 ? escapeHtml(String(data.q5)) : "未填";

    const htmlContent = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px 12px;">
        <div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;box-shadow:0 10px 30px rgba(15,23,42,0.12);overflow:hidden;">
          <div style="padding:18px 20px 14px;border-bottom:1px solid #e5e7eb;background:linear-gradient(135deg,#eff6ff,#fef3c7);">
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">自然大叔清洗服務｜顧客滿意度新回覆</div>
            <h2 style="margin:0;font-size:18px;color:#0f172a;">${escapeHtml(
              customerName || "未填姓名",
            )} 的問卷結果</h2>
            <div style="margin-top:4px;font-size:12px;color:#6b7280;">
              送出時間：<span>${escapeHtml(submittedAtDisplay)}</span>
            </div>
          </div>

          <!-- 摘要重點區 -->
          <div style="padding:12px 20px 4px;background:#f9fafb;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr>
                <td style="padding:6px 8px;">
                  <div style="color:#6b7280;">整體滿意度</div>
                  <div style="font-weight:600;color:#111827;margin-top:2px;">${q1}</div>
                </td>
                <td style="padding:6px 8px;">
                  <div style="color:#6b7280;">服務人員表現</div>
                  <div style="font-weight:600;color:#111827;margin-top:2px;">${q3}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 8px;">
                  <div style="color:#6b7280;">推薦意願</div>
                  <div style="font-weight:600;color:#111827;margin-top:2px;">${q4}</div>
                </td>
                <td style="padding:6px 8px;">
                  <div style="color:#6b7280;">是否願意再次委託</div>
                  <div style="font-weight:600;color:#111827;margin-top:2px;">${q5}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- 詳細填答內容 -->
          <div style="padding:14px 20px 18px;">
            <h3 style="margin:0 0 8px;font-size:14px;color:#111827;">問卷詳細內容</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <tbody>
                ${
                  rows ||
                  '<tr><td style="padding:10px;font-size:13px;color:#6b7280;">(沒有欄位資料)</td></tr>'
                }
              </tbody>
            </table>

            <div style="margin-top:12px;padding:10px 12px;background:#eff6ff;border-radius:8px;font-size:12px;color:#1f2937;">
              <strong style="display:block;margin-bottom:2px;">小提醒：</strong>
              可優先查看「姓名 / 稱呼 / LINE」、「清洗項目」、「推薦意願」與「再次委託意願」欄位，
              協助判斷是否適合後續關懷或回訪。
            </div>
          </div>

          <div style="padding:10px 20px 14px;border-top:1px solid #e5e7eb;background:#f9fafb;font-size:11px;color:#6b7280;text-align:right;">
            此信件由「${escapeHtml(
              siteName,
            )}」系統自動發送。若需要調整信件格式，可修改 netlify/functions/submit.js。
          </div>
        </div>
      </div>
    `;

    // ---- 呼叫 Brevo API 寄信 ----
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: siteName },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "Brevo API error", details: errText }),
        {
          status: 502,
          headers: { "content-type": "application/json; charset=utf-8" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    console.error("Submit function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
};


function accumulateEntries(entries) {
  const result = {};
  for (const [key, value] of entries) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTaiwanTime(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(value);
  }
}
