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
            <td style="padding:8px 10px;font-weight:600;color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              ${escapeHtml(keyLabel)}
            </td>
            <td style="padding:8px 10px;color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;line-height:1.5;vertical-align:top;">
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
      <div style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center" style="padding:16px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
                <!-- Header -->
                <tr>
                  <td style="padding:16px 18px 14px;background:linear-gradient(135deg,#eff6ff,#fef3c7);border-bottom:1px solid #e5e7eb;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:4px;">自然大叔清洗服務｜顧客滿意度新回覆</div>
                    <div style="font-size:17px;color:#0f172a;font-weight:600;line-height:1.4;margin-bottom:2px;">
                      ${escapeHtml(customerName || "未填姓名")} 的問卷結果
                    </div>
                    <div style="margin-top:4px;font-size:12px;color:#6b7280;">
                      送出時間：<span>${escapeHtml(submittedAtDisplay)}</span>
                    </div>
                  </td>
                </tr>

                <!-- Summary -->
                <tr>
                  <td style="padding:12px 18px 10px;background-color:#f9fafb;">
                    <div style="font-size:12px;font-weight:600;color:#6b7280;margin-bottom:6px;">重點摘要</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:8px 10px;border-radius:10px;border:1px solid #e5e7eb;background-color:#ffffff;">
                          <div style="font-size:12px;color:#6b7280;margin-bottom:2px;">整體滿意度</div>
                          <div style="font-size:14px;color:#111827;font-weight:600;">${q1}</div>
                        </td>
                      </tr>
                      <tr><td style="height:4px;font-size:0;line-height:0;"></td></tr>
                      <tr>
                        <td style="padding:8px 10px;border-radius:10px;border:1px solid #e5e7eb;background-color:#ffffff;">
                          <div style="font-size:12px;color:#6b7280;margin-bottom:2px;">服務人員表現</div>
                          <div style="font-size:14px;color:#111827;font-weight:600;">${q3}</div>
                        </td>
                      </tr>
                      <tr><td style="height:4px;font-size:0;line-height:0;"></td></tr>
                      <tr>
                        <td style="padding:8px 10px;border-radius:10px;border:1px solid #e5e7eb;background-color:#ffffff;">
                          <div style="font-size:12px;color:#6b7280;margin-bottom:2px;">推薦意願分數</div>
                          <div style="font-size:14px;color:#111827;font-weight:600;">${q4}</div>
                        </td>
                      </tr>
                      <tr><td style="height:4px;font-size:0;line-height:0;"></td></tr>
                      <tr>
                        <td style="padding:8px 10px;border-radius:10px;border:1px solid #e5e7eb;background-color:#ffffff;">
                          <div style="font-size:12px;color:#6b7280;margin-bottom:2px;">再次委託意願</div>
                          <div style="font-size:14px;color:#111827;font-weight:600;">${q5}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Full details -->
                <tr>
                  <td style="padding:14px 18px 10px;">
                    <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:8px;">完整問卷內容</div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-size:13px;">
                      <thead>
                        <tr style="background-color:#f3f4f6;">
                          <th align="left" style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:36%;">題目</th>
                          <th align="left" style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;">填答內容</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rows}
                      </tbody>
                    </table>
                  </td>
                </tr>

                <!-- Note -->
                <tr>
                  <td style="padding:10px 18px 8px;background-color:#f9fafb;">
                    <div style="font-size:11px;color:#6b7280;line-height:1.6;">
                      本信件內容僅供服務品質追蹤與內部參考，請妥善保存顧客資訊。如需再次聯繫顧客，建議先透過 LINE 或電話確認意願與聯絡時段。
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:8px 18px 14px;font-size:11px;color:#9ca3af;text-align:right;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
                    此信件由「${escapeHtml(siteName)}」系統自動發送。
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
