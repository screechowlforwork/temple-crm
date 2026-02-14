# Role Account Matrix

## テスト用アカウント

| ロール | 用途 | 期待権限 | NG操作（検知対象） |
|---|---|---|---|
| Viewer | 閲覧確認 | 一覧/詳細閲覧のみ | 変更系API実行、編集ボタン表示 |
| Staff | 日常運用 | 檀家/故人/行事/タスク編集 | 取引編集、設定変更 |
| OfficeManager | 会計運用 | 取引CRUD、領収運用 | 管理者専用設定変更 |
| Admin | 管理 | 全権限 + 監査確認 | なし |

## 最低確認シナリオ
1. Viewerで `PATCH /api/transactions/:id` -> 403
2. Staffで取引編集UIが表示されない
3. OfficeManagerで取引編集できる
4. Adminで設定更新できる

## 監査確認
- households/deceased/events/transactions の INSERT/UPDATE/DELETE で監査ログ記録を確認
- before/after の差分が妥当であること
