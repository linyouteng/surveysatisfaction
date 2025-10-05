// netlify/functions/submit.js
const { google } = require('googleapis');
const sheets = google.sheets('v4');
const serviceAccount = require('./cleaningscheduler-5d3a005d3efe.json'); // 請放你的 Google 金鑰 json 檔案

// === 需要修改 ===
const SPREADSHEET_ID = '18FfswK_Y5qw3Fr72WwjpMEQSUyfoT2JjknHuEHswefU'; // 例：'1abc234xyz56789...'
const SHEET_NAME = '工作表1'; // 例：'工作表1'，請改成你的分頁名稱

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // 解析表單資料（支援 multipart/form-data, urlencoded, json）
  let data = {};
  const ct = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();

  if (ct.includes('application/json')) {
    data = JSON.parse(event.body);
  } else {
    // 處理 x-www-form-urlencoded 或其他格式
    data = Object.fromEntries(new URLSearchParams(event.body));
  }

  // === 對應你表單所有欄位 ===
  const values = [
    new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }), // 填寫時間
    data.customer_name || '',   // 姓名/LINE
    data.q1 || '',              // 1. 整體體驗
    data.q2 || '',              // 2. 專業程度
    data.q2_extra || '',        // 2. 專業程度備註
    data.q3 || '',              // 3. 表現分數
    data.q4 || '',              // 4. 推薦度
    data.q5 || '',              // 5. 是否再次委託
    data.q6 || '',              // 6. 其他建議
    event.headers['x-nf-client-connection-ip'] || '', // IP
    event.headers['user-agent'] || '' // User-Agent
  ];

  // === Google Sheets 授權 ===
  const auth = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  // === 寫入 Google Sheets ===
  await sheets.spreadsheets.values.append({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
