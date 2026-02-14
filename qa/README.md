# QA Execution Pack (Temple CRM)

このディレクトリは、`/Users/yusuke_abe/.windsurf/plans/qa-test-plan-temple-crm-67eae1.md` を実行に移すための運用資材です。

## 1) 実行順序（2週間運用）
1. `qa/role-account-matrix.md` で試験アカウント準備
2. `qa/test-cases-core.md` の P0 を先に実施
3. `qa/nonfunctional-runbook.md` で性能/セキュリティ/復旧を実施
4. `qa/uat-script.md` で現場UATを実施
5. `qa/evidence-template.md` に証跡を集約

## 2) 判定ルール（Exit）
- P0未解決: 0
- P1未解決: 3以下
- 重大脆弱性: 0
- 主要SLO達成率: 95%以上

## 3) 役割分担（5名運用）
- QAリード: 判定/日次トリアージ
- QA担当A: API・整合性・監査
- QA担当B: UI/UX・E2E手動
- 開発担当: 不具合修正
- 現場代表: UAT承認

## 4) 日次運用
- 09:30 バグトリアージ（15分）
- 15:00 進捗レビュー（15分）
- 17:30 KPI更新（P0残件/SLO/カバレッジ）
