# 鳩世話LINE通知システム 🕊️ (v3.0 - Flex Calendar対応版)

九大マジックサークルでの鳩世話当番を自動化し、LINEグループに月間カレンダーを共有するシステムです。
Google Apps Script (GAS) を基盤とし、LINE Messaging APIと連携しています。

---

## 🛠 開発者向けガイド（保守・管理）

このシステムは Google Apps Script (GAS) のコンテナバインドスクリプトとして動作しています。

### 1. 技術構成
- **Runtime**: Google Apps Script (V8)
- **External API**: LINE Messaging API
- **Database/UI**: Google Sheets (名簿・当番管理)
- **UI Component**: LINE Flex Message (Grid Calendar)

### 2. 環境変数（スクリプトプロパティ）
GASの「プロジェクトの設定 > スクリプトプロパティ」に以下の値を必ず設定してください。
- `LINE_ACCESS_TOKEN`: LINE Developers発行のチャネルアクセストークン
- `LINE_GROUP_ID`: 鳩世話用LINEグループのID（Gから始まる文字列）

### 3. デプロイとWebhook
コードを修正した際は、必ず **「デプロイの管理」 > 「編集」 > 「新バージョン」** でデプロイを更新してください。
発行された「ウェブアプリURL」が、LINE Developersの「Webhook URL」に設定されている必要があります。

### 4. Git管理 (clasp)
```bash
# クローン
clasp clone "あなたのスクリプトID"
# 変更の反映
clasp push
