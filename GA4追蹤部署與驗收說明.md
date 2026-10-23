# 自然大叔｜顧客滿意度調查 GA4 追蹤部署與驗收說明

版本日期：2026-10-23  
GA4 Measurement ID：`G-Y1M01156XR`  
正式網域：`https://survey.naturaluncle.com/`

## 本版修改

- 在 `index.html` 問卷頁及 `thankyou.html` 感謝頁加入 GA4；不追蹤 `notification-settings.html` 內部通知設定頁。
- 以不含查詢參數與網址片段的 URL 作為 GA4 的頁面網址與來源網址，並關閉 Google Signals／廣告個人化訊號。
- 新增問卷開始、送出嘗試、送出錯誤、成功送出，以及 LINE／官方網站／Facebook／Google 評價連結點擊事件。
- 成功送出事件只會在 `/api/submit` 回傳 `ok: true` 後設定一次性 `sessionStorage` 旗標，再由感謝頁消耗；直接打開或重新整理感謝頁不會重複記錄成功送出。
- 不把姓名、聯絡資料、任何問卷答案、自由填寫文字、服務項目或估價數字作為 GA4 事件參數傳送。
- 問卷頁新增 GA4 使用分析告知文字。
- 沒有修改 `netlify/functions/submit.js`、`netlify/functions/settings.js`、`netlify.toml`、通知設定頁、通知流程、舊 Netlify 網址 301 轉址或原有表單欄位。

## GA4 事件對照

| 事件名稱 | 中文用途 | 觸發條件 |
|---|---|---|
| `page_view` | 頁面瀏覽 | 問卷頁或感謝頁載入 |
| `survey_form_start` | 開始填寫問卷 | 第一次操作任一問卷欄位，只記一次 |
| `survey_submit_attempt` | 嘗試送出問卷 | 通過 honeypot 檢查後送出 |
| `survey_submit_error` | 問卷送出失敗 | API 請求失敗或回應未確認成功 |
| `survey_submit_success` | 問卷成功送出 | API 明確回傳 `ok: true`，再進入感謝頁 |
| `survey_google_review_click` | 點擊 Google 評價 | 感謝頁點擊 Google 評價連結 |
| `survey_line_click` | 點擊 LINE | 問卷頁或感謝頁點擊 LINE 連結 |
| `survey_home_click` | 點擊官方網站 | 問卷頁或感謝頁點擊官方網站連結 |
| `survey_facebook_click` | 點擊 Facebook | 問卷頁或感謝頁點擊 Facebook 連結 |

## 部署方式

1. 先保留 Netlify 現行正式部署版本，方便需要時回復。
2. 解壓縮本 ZIP，進入最外層專案資料夾，確認可看到 `index.html`、`thankyou.html`、`netlify.toml`、`netlify/functions/` 等內容。
3. 將完整專案部署至現有的 `survey.naturaluncle.com` 對應 Netlify Site；不要建立新 Site，也不要只上傳單一 HTML 檔。
4. 保留 Netlify 現有環境變數，尤其是 Brevo、LINE 與 `NOTIFICATION_SETTINGS_TOKEN` 相關設定。
5. 部署完成後，以顧客問卷網址測試；不要在 `notification-settings.html` 輸入或傳送管理 Token 來測試追蹤，該頁刻意不安裝 GA4。

## 驗收步驟

1. 開啟 `https://survey.naturaluncle.com/`，在 GA4「即時」報表確認 `page_view`。
2. 操作一個問卷欄位，確認 `survey_form_start`。
3. 使用測試回覆送出問卷，確認跳轉到感謝頁後出現 `survey_submit_attempt` 與 `survey_submit_success`。
4. 在感謝頁點擊 Google 評價或 LINE 連結，確認對應點擊事件。
5. 直接在新分頁開啟 `thankyou.html` 或重新整理感謝頁，不應再次新增 `survey_submit_success`。
6. 在 GA4 即時報表檢查事件；部分報表更新可能有延遲。此程式包尚未部署至正式網站，正式驗收需在部署後完成。

## 重要提醒

- GA4 事件名稱維持英文，後續可在中文儀表板中顯示中文名稱。
- 本版本只做前端 GA4 追蹤，不會把問卷答案複製到 GA4；問卷答案仍依原有流程送往 Netlify Function，並用於原本的內部通知。
- GA4 追蹤是否實際收到資料，需部署後透過 GA4 即時報表驗證；本地語法檢查不能取代正式環境驗收。
