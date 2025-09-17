import { EnvironmentManager } from './seed/environment-manager';

async function main() {
  const environmentManager = new EnvironmentManager();

  // コマンドライン引数から環境を取得
  const environment = process.argv[2] || 'dev';

  try {
    console.log('='.repeat(50));
    console.log('Goal Mandala シードデータ投入');
    console.log('='.repeat(50));

    // 利用可能な環境を表示
    const availableEnvironments = await environmentManager.listEnvironments();
    console.log(`利用可能な環境: ${availableEnvironments.join(', ')}`);

    // 指定された環境の情報を表示
    const dataSetInfo = await environmentManager.getDataSetInfo(environment);
    if (!dataSetInfo) {
      console.error(`❌ 環境 "${environment}" が見つかりません`);
      console.log(`利用可能な環境: ${availableEnvironments.join(', ')}`);
      process.exit(1);
    }

    console.log(`\n📊 データセット情報:`);
    console.log(`  名前: ${dataSetInfo.name}`);
    console.log(`  説明: ${dataSetInfo.description}`);
    console.log(`  環境: ${dataSetInfo.environment}`);
    console.log(`  バージョン: ${dataSetInfo.metadata.version}`);
    console.log(`  推定レコード数: ${dataSetInfo.metadata.estimatedRecords}`);
    console.log(`  ユーザー数: ${dataSetInfo.users.length}`);
    console.log(`  目標数: ${dataSetInfo.goals.length}`);

    // デプロイ実行
    console.log(`\n🚀 環境 "${environment}" にデプロイ開始...`);
    await environmentManager.deployToEnvironment(environment);

    console.log('\n✅ シードデータ投入が正常に完了しました');
  } catch (error) {
    console.error('\n❌ シードデータ投入中にエラーが発生しました:');
    console.error(error);
    process.exit(1);
  } finally {
    await environmentManager.cleanup();
  }
}

// スクリプト実行時のヘルプ表示
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Goal Mandala シードデータ投入スクリプト

使用方法:
  pnpm run seed [環境名]

環境名:
  dev         開発環境（デフォルト）
  test        テスト環境
  demo        デモ環境
  performance パフォーマンステスト環境

例:
  pnpm run seed           # 開発環境にデプロイ
  pnpm run seed dev       # 開発環境にデプロイ
  pnpm run seed test      # テスト環境にデプロイ

オプション:
  --help, -h  このヘルプを表示
`);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
