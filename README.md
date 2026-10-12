# uncle-satisfaction

自然大叔清洗服務顧客滿意度問卷。

## 主要頁面

- `index.html`：顧客滿意度問卷頁
- `thankyou.html`：送出後感謝頁
- `notification-settings.html`：Brevo Email 與 LINE 推播通知設定頁

## 通知設定功能

`notification-settings.html` 可控制：

- Brevo Email 通知總開關
- LINE 推播通知總開關
- 新問卷通知：Email
- 新問卷通知：LINE
- LINE 夜間靜音模式
- LINE 靜音時間，預設 `22:00` ～ `07:00`

設定會透過 `/api/settings` 儲存到 Netlify Blobs，問卷送出時 `submit.js` 會讀取設定後再決定是否寄送 Email 或 LINE。

## Netlify 環境變數

Email 通知：

- `BREVO_API_KEY`
- `TO_EMAIL`
- `FROM_EMAIL`

LINE 推播：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_ADMIN_USER_ID`

通知設定頁保護，建議設定：

- `NOTIFICATION_SETTINGS_TOKEN`

若有設定 `NOTIFICATION_SETTINGS_TOKEN`，進入通知設定頁後需要輸入相同 Token 才能讀取與儲存設定。


## 正式網域與搜尋隱私（2026-10-07）

- 正式網址：`https://survey.naturaluncle.com/`
- 官方網站：`https://naturaluncle.com/`
- 本系統屬於服務完成後提供給顧客填寫的滿意度問卷，為避免搜尋引擎帶入非顧客流量、假填答與個資相關風險，已設定全站 `noindex, nofollow, noarchive`。
- `robots.txt` 設定為不允許搜尋引擎爬取全站，因此本系統不需要提交 Sitemap 到 Google Search Console。
- `thankyou.html` 與 `notification-settings.html` 亦明確設定為不建立索引。
- 強烈建議在 Netlify 環境變數設定 `NOTIFICATION_SETTINGS_TOKEN`，避免通知設定 API 在未設定 Token 時可被未授權修改。
