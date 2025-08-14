#!/bin/bash

# SAMビルドスクリプト
# TypeScriptのビルドとSAM buildコマンドを実行し、ビルド成果物を検証します

set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"

# 色付きログ出力用の関数
log_info() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[0;33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

log_success() {
    echo -e "\033[0;36m[SUCCESS]\033[0m $1"
}

# 使用方法を表示
show_usage() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  -e, --env ENV       環境設定 (default|dev|staging|production, デフォルト: default)"
    echo "  --clean             ビルド前にクリーンアップを実行"
    echo "  --no-deps           依存関係のインストールをスキップ"
    echo "  --debug             デバッグモードで実行"
    echo "  --parallel          並列ビルドを有効化"
    echo "  --help              このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0                  # デフォルト設定でビルド"
    echo "  $0 -e production    # production環境設定でビルド"
    echo "  $0 --clean          # クリーンアップしてからビルド"
    echo "  $0 --debug          # デバッグモードでビルド"
}

# デフォルト値
ENV="default"
CLEAN_BUILD=false
SKIP_DEPS=false
DEBUG_MODE=false
PARALLEL_BUILD=false

# コマンドライン引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --no-deps)
            SKIP_DEPS=true
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        --parallel)
            PARALLEL_BUILD=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            log_error "不明なオプション: $1"
            show_usage
            exit 1
            ;;
    esac
done

# 必要なコマンドの存在確認
check_dependencies() {
    log_info "依存関係をチェック中..."

    if ! command -v sam &> /dev/null; then
        log_error "AWS SAM CLIがインストールされていません"
        log_error "インストール方法: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        log_error "Node.jsがインストールされていません"
        exit 1
    fi

    if ! command -v pnpm &> /dev/null; then
        log_error "pnpmがインストールされていません"
        log_error "インストール方法: npm install -g pnpm"
        exit 1
    fi

    # esbuildの存在確認（SAMビルドに必要）
    if ! command -v esbuild &> /dev/null; then
        log_warn "esbuildがPATHに見つかりません。グローバルインストールを試行します..."
        if command -v npm &> /dev/null; then
            npm install -g esbuild > /dev/null 2>&1 || {
                log_error "esbuildのグローバルインストールに失敗しました"
                log_error "手動でインストールしてください: npm install -g esbuild"
                exit 1
            }
            log_info "✓ esbuildをグローバルインストールしました"
        else
            log_error "npmが見つかりません。esbuildを手動でインストールしてください"
            exit 1
        fi
    else
        ESBUILD_VERSION=$(esbuild --version)
        log_info "✓ esbuild バージョン: $ESBUILD_VERSION"
    fi

    # SAMのバージョン確認
    SAM_VERSION=$(sam --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    log_info "✓ AWS SAM CLI バージョン: $SAM_VERSION"

    # Node.jsのバージョン確認
    NODE_VERSION=$(node --version)
    log_info "✓ Node.js バージョン: $NODE_VERSION"

    log_info "✓ 依存関係チェック完了"
}

# クリーンアップ処理
cleanup_build() {
    if [ "$CLEAN_BUILD" = true ]; then
        log_info "ビルド成果物をクリーンアップ中..."

        cd "$BACKEND_DIR"

        # SAMビルド成果物の削除
        if [ -d ".aws-sam" ]; then
            rm -rf .aws-sam
            log_info "✓ .aws-samディレクトリを削除しました"
        fi

        # TypeScriptビルド成果物の削除
        if [ -d "dist" ]; then
            rm -rf dist
            log_info "✓ distディレクトリを削除しました"
        fi

        # node_modulesの削除（完全クリーンビルドの場合）
        if [ -d "node_modules" ]; then
            rm -rf node_modules
            log_info "✓ node_modulesディレクトリを削除しました"
        fi

        log_info "✓ クリーンアップ完了"
    fi
}

# 依存関係のインストール
install_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        log_warn "依存関係のインストールをスキップしています"
        return
    fi

    log_info "依存関係をインストール中..."

    # プロジェクトルートに移動
    cd "$PROJECT_ROOT"

    # pnpm install実行
    if [ "$DEBUG_MODE" = true ]; then
        pnpm install --frozen-lockfile
    else
        pnpm install --frozen-lockfile --silent
    fi

    log_info "✓ 依存関係インストール完了"
}

# TypeScriptビルド
build_typescript() {
    log_info "TypeScriptをビルド中..."

    cd "$BACKEND_DIR"

    # TypeScript設定ファイルの存在確認
    if [ ! -f "tsconfig.json" ]; then
        log_error "tsconfig.jsonが見つかりません"
        exit 1
    fi

    # TypeScriptビルド実行
    if [ "$DEBUG_MODE" = true ]; then
        pnpm run build
    else
        pnpm run build > /dev/null 2>&1
    fi

    # ビルド成果物の確認
    if [ ! -d "dist" ]; then
        log_error "TypeScriptビルドが失敗しました: distディレクトリが作成されていません"
        exit 1
    fi

    if [ ! -f "dist/index.js" ]; then
        log_error "TypeScriptビルドが失敗しました: dist/index.jsが作成されていません"
        exit 1
    fi

    log_info "✓ TypeScriptビルド完了"
}

# workspace依存関係の解決
resolve_workspace_dependencies() {
    log_info "workspace依存関係を解決中..."

    cd "$BACKEND_DIR"

    # package.jsonのバックアップ作成
    if [ -f "package.json" ]; then
        cp package.json package.json.backup
        log_info "✓ package.jsonをバックアップしました"
    fi

    # workspace:*参照を実際のバージョンに置換
    # 一時的にworkspace参照を削除（SAMビルド用）
    if command -v node &> /dev/null; then
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

        // workspace依存関係を削除（SAMビルド時は不要）
        if (pkg.dependencies && pkg.dependencies['@goal-mandala/shared']) {
            delete pkg.dependencies['@goal-mandala/shared'];
        }

        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        " 2>/dev/null || {
            log_warn "Node.jsでのpackage.json処理に失敗しました。sedで処理します。"
            # sedを使用してworkspace依存関係を削除
            sed -i.bak 's/.*"@goal-mandala\/shared".*,*//g' package.json
            # 空行や余分なカンマを削除
            sed -i.bak '/^[[:space:]]*$/d' package.json
            sed -i.bak 's/,$//' package.json
        }
    fi

    log_info "✓ workspace依存関係を解決しました"
}

# workspace依存関係の復元
restore_workspace_dependencies() {
    log_info "workspace依存関係を復元中..."

    cd "$BACKEND_DIR"

    # バックアップからpackage.jsonを復元
    if [ -f "package.json.backup" ]; then
        mv package.json.backup package.json
        log_info "✓ package.jsonを復元しました"
    fi

    # sedのバックアップファイルがあれば削除
    if [ -f "package.json.bak" ]; then
        rm -f package.json.bak
    fi
}

# SAMビルド実行
build_sam() {
    log_info "SAM buildを実行中..."

    cd "$BACKEND_DIR"

    # template.yamlの存在確認
    if [ ! -f "template.yaml" ]; then
        log_error "template.yamlが見つかりません"
        exit 1
    fi

    # workspace依存関係の解決
    resolve_workspace_dependencies

    # SAM buildコマンドの構築
    SAM_BUILD_CMD="sam build"
    SAM_BUILD_CMD="$SAM_BUILD_CMD --config-env $ENV"

    # 並列ビルドオプション
    if [ "$PARALLEL_BUILD" = true ]; then
        SAM_BUILD_CMD="$SAM_BUILD_CMD --parallel"
    fi

    # キャッシュ有効化
    SAM_BUILD_CMD="$SAM_BUILD_CMD --cached"

    # デバッグモードの場合は詳細ログを有効化
    if [ "$DEBUG_MODE" = true ]; then
        SAM_BUILD_CMD="$SAM_BUILD_CMD --debug"
        log_info "実行コマンド: $SAM_BUILD_CMD"
    fi

    # SAM buildを実行
    local build_result=0
    if [ "$DEBUG_MODE" = true ]; then
        eval $SAM_BUILD_CMD || build_result=$?
    else
        eval $SAM_BUILD_CMD > /dev/null 2>&1 || build_result=$?
    fi

    # workspace依存関係の復元
    restore_workspace_dependencies

    # ビルド結果の確認
    if [ $build_result -ne 0 ]; then
        log_error "SAM buildが失敗しました (終了コード: $build_result)"
        exit $build_result
    fi

    log_info "✓ SAM build完了"
}

# ビルド成果物の検証
verify_build_artifacts() {
    log_info "ビルド成果物を検証中..."

    cd "$BACKEND_DIR"

    # .aws-samディレクトリの存在確認
    if [ ! -d ".aws-sam" ]; then
        log_error "SAMビルドが失敗しました: .aws-samディレクトリが作成されていません"
        exit 1
    fi

    # buildディレクトリの存在確認
    if [ ! -d ".aws-sam/build" ]; then
        log_error "SAMビルドが失敗しました: .aws-sam/buildディレクトリが作成されていません"
        exit 1
    fi

    # Lambda関数のビルド成果物確認
    FUNCTION_BUILD_DIR=".aws-sam/build/ApiFunction"
    if [ ! -d "$FUNCTION_BUILD_DIR" ]; then
        log_error "SAMビルドが失敗しました: Lambda関数のビルドディレクトリが作成されていません"
        exit 1
    fi

    # Lambda関数のエントリーポイント確認
    if [ ! -f "$FUNCTION_BUILD_DIR/index.js" ]; then
        log_error "SAMビルドが失敗しました: Lambda関数のエントリーポイントが作成されていません"
        exit 1
    fi

    # package.jsonの存在確認（SAMビルドではpackage.jsonは必ずしも必要ではない）
    if [ -f "$FUNCTION_BUILD_DIR/package.json" ]; then
        log_info "✓ package.json が見つかりました"
    else
        log_info "✓ package.json は不要（esbuildバンドル）"
    fi

    # ビルド成果物のサイズ確認
    BUILD_SIZE=$(du -sh "$FUNCTION_BUILD_DIR" | cut -f1)
    log_info "✓ Lambda関数ビルドサイズ: $BUILD_SIZE"

    # template.yamlの存在確認
    if [ ! -f ".aws-sam/build/template.yaml" ]; then
        log_error "SAMビルドが失敗しました: ビルド済みtemplate.yamlが作成されていません"
        exit 1
    fi

    # 依存関係の確認
    DEPENDENCIES_COUNT=$(find "$FUNCTION_BUILD_DIR/node_modules" -name "package.json" 2>/dev/null | wc -l || echo "0")
    log_info "✓ インストール済み依存関係: $DEPENDENCIES_COUNT パッケージ"

    log_info "✓ ビルド成果物検証完了"
}

# ビルド情報の表示
show_build_info() {
    log_info "ビルド情報:"
    log_info "  環境: $ENV"
    log_info "  プロジェクトルート: $PROJECT_ROOT"
    log_info "  バックエンドディレクトリ: $BACKEND_DIR"
    log_info "  クリーンビルド: $CLEAN_BUILD"
    log_info "  依存関係スキップ: $SKIP_DEPS"
    log_info "  デバッグモード: $DEBUG_MODE"
    log_info "  並列ビルド: $PARALLEL_BUILD"

    if [ "$DEBUG_MODE" = true ]; then
        log_info "  Node.js: $(node --version)"
        log_info "  pnpm: $(pnpm --version)"
        log_info "  SAM CLI: $(sam --version)"
    fi
}

# メイン処理
main() {
    local start_time=$(date +%s)

    log_info "SAMビルドスクリプトを開始します"

    # ビルド情報表示
    show_build_info

    # 依存関係チェック
    check_dependencies

    # クリーンアップ
    cleanup_build

    # 依存関係インストール
    install_dependencies

    # TypeScriptビルド
    build_typescript

    # SAMビルド
    build_sam

    # ビルド成果物検証
    verify_build_artifacts

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_success "🎉 SAMビルドが正常に完了しました！"
    log_success "⏱️  実行時間: ${duration}秒"
    log_success "📁 ビルド成果物: $BACKEND_DIR/.aws-sam/build/"
    log_success ""
    log_success "次のステップ:"
    log_success "  • ローカルテスト: $SCRIPT_DIR/sam-local-start.sh"
    log_success "  • デプロイ: sam deploy --config-env $ENV"
}

# エラーハンドリング
trap 'log_error "ビルドが失敗しました"; exit 1' ERR
trap 'log_info "ビルドを中断しています..."; exit 1' INT TERM

# メイン処理実行
main "$@"
