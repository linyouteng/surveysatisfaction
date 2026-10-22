# 自然大叔｜顧客滿意度調查｜舊 Netlify 網址 301 永久轉址

日期：2026-10-13

## 本次修改

- 將舊網址 `https://surveysatisfaction.netlify.app/*` 以 **301 永久轉址**導向正式網址 `https://survey.naturaluncle.com/*`。
- 保留原本路徑，例如：
  - `/` → `https://survey.naturaluncle.com/`
  - `/thankyou.html` → `https://survey.naturaluncle.com/thankyou.html`
  - `/notification-settings.html` → `https://survey.naturaluncle.com/notification-settings.html`
- 轉址規則只針對舊 `surveysatisfaction.netlify.app` 網域，不影響正式網域本身。
- 原有問卷送出、通知設定、Netlify Functions、搜尋引擎 noindex / robots 隱私設定均保留不動。

## 部署後測試

打開 `https://surveysatisfaction.netlify.app/`，網址應自動跳轉為 `https://survey.naturaluncle.com/`。
