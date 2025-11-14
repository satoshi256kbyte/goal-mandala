#!/usr/bin/env python3
"""
パフォーマンスレポート完成スクリプト
使用方法: ./finalize-performance-report.py <report-file> <results-file> <analysis-file>
"""

import sys
import os
import re

def main():
    # 引数チェック
    if len(sys.argv) < 4:
        print("エラー: 引数が不足しています")
        print(f"使用方法: {sys.argv[0]} <report-file> <results-file> <analysis-file>")
        sys.exit(1)

    report_file = sys.argv[1]
    results_file = sys.argv[2]
    analysis_file = sys.argv[3]

    # ファイル存在チェック
    if not os.path.exists(report_file):
        print(f"エラー: レポートファイルが見つかりません: {report_file}")
        sys.exit(1)

    if not os.path.exists(results_file):
        print(f"エラー: 結果ファイルが見つかりません: {results_file}")
        sys.exit(1)

    if not os.path.exists(analysis_file):
        print(f"エラー: 分析ファイルが見つかりません: {analysis_file}")
        sys.exit(1)

    # ファイル読み込み
    with open(report_file, 'r', encoding='utf-8') as f:
        report_content = f.read()

    with open(results_file, 'r', encoding='utf-8') as f:
        results_content = f.read()

    with open(analysis_file, 'r', encoding='utf-8') as f:
        analysis_content = f.read()

    # 目標達成数をカウント
    achieved_count = results_content.count('✅')
    total_tests = len(results_content.strip().split('\n'))

    # 達成率計算
    if total_tests > 0:
        achievement_rate = round(achieved_count * 100 / total_tests, 1)
    else:
        achievement_rate = 0

    # 目標達成状況分析
    if achieved_count == total_tests:
        achievement_analysis = """✅ **すべてのテストコマンドが目標時間を達成しました！**

パフォーマンス改善の効果が確認できました。すべてのテストが目標時間内に完了しています。"""
    elif achieved_count > 0:
        achievement_analysis = f"""⚠️ **一部のテストコマンドが目標時間を達成しました**

達成率: {achievement_rate}% ({achieved_count}/{total_tests})

未達成のテストコマンドについては、さらなる最適化が必要です。"""
    else:
        achievement_analysis = """❌ **すべてのテストコマンドが目標時間を未達成です**

パフォーマンス改善が必要です。以下の推奨事項を確認してください。"""

    # パフォーマンス評価
    performance_evaluation = """測定結果から以下の評価を行いました：

- **測定回数**: 各コマンド3回実行
- **測定環境**: ローカル開発環境
- **測定精度**: 平均値を使用して評価

実行時間のばらつきが大きい場合は、測定環境の影響を受けている可能性があります。"""

    # 推奨事項
    if achieved_count == total_tests:
        recommendations = """現在のパフォーマンスは良好です。以下の点に注意して維持してください：

1. **定期的な測定**: パフォーマンスの劣化を早期に検出
2. **テストの追加**: 新しいテストを追加する際は実行時間に注意
3. **CI/CD環境での確認**: ローカル環境だけでなくCI/CD環境でも測定"""
    else:
        recommendations = """以下の改善を検討してください：

1. **並列実行の最適化**: maxConcurrencyの調整
2. **テスト分離の見直し**: 不要な分離を削減
3. **タイムアウト設定の調整**: 適切なタイムアウト値の設定
4. **カバレッジ計算の最適化**: 必要な場合のみ実行
5. **テストデータの最適化**: テストデータのサイズを削減"""

    # 結論
    if achieved_count == total_tests:
        conclusion = """テストパフォーマンス改善は成功しました。すべてのテストコマンドが目標時間を達成しています。

今後も定期的な測定を行い、パフォーマンスの維持に努めてください。"""
    else:
        conclusion = f"""テストパフォーマンス改善は部分的に成功しました。

達成率: **{achievement_rate}%** ({achieved_count}/{total_tests})

未達成のテストコマンドについては、推奨事項を参考にさらなる改善を行ってください。"""

    # プレースホルダーを置換
    report_content = report_content.replace('RESULTS_PLACEHOLDER', results_content)
    report_content = report_content.replace('ACHIEVEMENT_ANALYSIS_PLACEHOLDER', achievement_analysis)
    report_content = report_content.replace('PERFORMANCE_EVALUATION_PLACEHOLDER', performance_evaluation)
    report_content = report_content.replace('RECOMMENDATIONS_PLACEHOLDER', recommendations)
    report_content = report_content.replace('CONCLUSION_PLACEHOLDER', conclusion)

    # 分析内容を追加
    report_content = re.sub(
        r'(### 目標達成状況)',
        r'\1\n' + analysis_content,
        report_content
    )

    # レポートファイルを更新
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report_content)

    print(f"✓ レポートを完成させました: {report_file}")
    print(f"達成率: {achievement_rate}% ({achieved_count}/{total_tests})")

if __name__ == '__main__':
    main()
