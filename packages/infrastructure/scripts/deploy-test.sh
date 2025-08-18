#!/bin/bash

# CDK基本デプロイテストスクリプト
# このスクリプトは開発環境での基本的なデプロイテストを実行します

set -e  # エラー時に停止

# 色付きログ出力用の関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 前提条件チェック
check_prerequisites() {
    log_info "前提条件をチェックしています..."

    # Node.jsバージョンチェック
    if ! command -v node &> /dev/null; then
        log_error "Node.jsがインストールされていません"
        exit 1
    fi

    local node_version=$(node --version | sed 's/v//')
    local required_version="23.10.0"
    if [[ "$node_version" != "$required_version" ]]; then
        log_warn "Node.jsバージョンが推奨版と異なります: $node_version (推奨: $required_version)"
    fi

    # AWS CLIチェック
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLIがインストールされていません"
        exit 1
    fi

    # AWS認証情報チェック
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS認証情報が設定されていません"
        exit 1
    fi

    # CDK CLIチェック
    if ! command -v cdk &> /dev/null; then
        log_error "CDK CLIがインストールされていません"
        exit 1
    fi

    log_info "前提条件チェック完了"
}

# 環境設定確認
check_environment() {
    log_info "環境設定を確認しています..."

    local environment=${ENVIRONMENT:-dev}
    local config_file="config/${environment}.json"

    if [[ ! -f "$config_file" ]]; then
        log_error "設定ファイルが見つかりません: $config_file"
        exit 1
    fi

    # 設定ファイルの妥当性チェック
    if ! jq empty "$config_file" 2>/dev/null; then
        log_error "設定ファイルのJSONが無効です: $config_file"
        exit 1
    fi

    log_info "環境設定確認完了 (環境: $environment)"
}

# CDK Bootstrapチェック
check_bootstrap() {
    log_info "CDK Bootstrapの状態を確認しています..."

    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local region=$(aws configure get region || echo "ap-northeast-1")

    if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region "$region" &> /dev/null; then
        log_warn "CDK Bootstrapが実行されていません"
        log_info "CDK Bootstrapを実行しています..."

        if ! pnpm run cdk:bootstrap; then
            log_error "CDK Bootstrap実行に失敗しました"
            exit 1
        fi
    fi

    log_info "CDK Bootstrap確認完了"
}

# CDK Synthテスト
test_synth() {
    log_info "CDK Synthテストを実行しています..."

    if ! pnpm run cdk:synth > /dev/null; then
        log_error "CDK Synthに失敗しました"
        exit 1
    fi

    # 生成されたテンプレートファイルの確認
    local template_files=(
        "cdk.out/goal-mandala-dev-database.template.json"
        "cdk.out/goal-mandala-dev-api.template.json"
        "cdk.out/goal-mandala-dev-frontend.template.json"
    )

    for template in "${template_files[@]}"; do
        if [[ ! -f "$template" ]]; then
            log_error "テンプレートファイルが生成されていません: $template"
            exit 1
        fi

        # JSONの妥当性チェック
        if ! jq empty "$template" 2>/dev/null; then
            log_error "生成されたテンプレートのJSONが無効です: $template"
            exit 1
        fi
    done

    log_info "CDK Synthテスト完了"
}

# デプロイテスト（ドライラン）
test_deploy_dry_run() {
    log_info "デプロイテスト（ドライラン）を実行しています..."

    # 各スタックの差分確認
    local stacks=(
        "goal-mandala-dev-database"
        "goal-mandala-dev-api"
        "goal-mandala-dev-frontend"
    )

    for stack in "${stacks[@]}"; do
        log_info "スタック差分確認: $stack"

        if ! pnpm run cdk diff "$stack" > /dev/null 2>&1; then
            log_warn "スタック差分確認でエラーが発生しました: $stack"
        fi
    done

    log_info "デプロイテスト（ドライラン）完了"
}

# 実際のデプロイテスト（オプション）
test_deploy_actual() {
    if [[ "$DEPLOY_ACTUAL" != "true" ]]; then
        log_info "実際のデプロイテストはスキップされました（DEPLOY_ACTUAL=trueで有効化）"
        return
    fi

    log_warn "実際のデプロイテストを実行します（AWSリソースが作成されます）"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "デプロイテストをキャンセルしました"
        return
    fi

    log_info "DatabaseStackをデプロイしています..."
    if ! pnpm run cdk deploy goal-mandala-dev-database --require-approval never; then
        log_error "DatabaseStackのデプロイに失敗しました"
        exit 1
    fi

    log_info "ApiStackをデプロイしています..."
    if ! pnpm run cdk deploy goal-mandala-dev-api --require-approval never; then
        log_error "ApiStackのデプロイに失敗しました"
        exit 1
    fi

    log_info "FrontendStackをデプロイしています..."
    if ! pnpm run cdk deploy goal-mandala-dev-frontend --require-approval never; then
        log_error "FrontendStackのデプロイに失敗しました"
        exit 1
    fi

    log_info "全スタックのデプロイが完了しました"

    # デプロイ後の検証
    verify_deployment

    # クリーンアップの確認
    log_warn "テスト用リソースをクリーンアップしますか？"
    read -p "削除しますか？ (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup_test_resources
    fi
}

# デプロイ後の検証
verify_deployment() {
    log_info "デプロイ後の検証を実行しています..."

    # CloudFormationスタックの状態確認
    local stacks=(
        "goal-mandala-dev-database"
        "goal-mandala-dev-api"
        "goal-mandala-dev-frontend"
    )

    for stack in "${stacks[@]}"; do
        local status=$(aws cloudformation describe-stacks --stack-name "$stack" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "NOT_FOUND")

        if [[ "$status" == "CREATE_COMPLETE" || "$status" == "UPDATE_COMPLETE" ]]; then
            log_info "スタック状態正常: $stack ($status)"
        else
            log_error "スタック状態異常: $stack ($status)"
        fi
    done

    # 主要リソースの存在確認
    verify_resources

    log_info "デプロイ後の検証完了"
}

# リソースの存在確認
verify_resources() {
    log_info "主要リソースの存在確認を実行しています..."

    # VPCの確認
    local vpc_id=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=goal-mandala-dev-vpc" --query 'Vpcs[0].VpcId' --output text 2>/dev/null || echo "None")
    if [[ "$vpc_id" != "None" ]]; then
        log_info "VPC確認完了: $vpc_id"
    else
        log_warn "VPCが見つかりません"
    fi

    # Aurora クラスターの確認
    local cluster_status=$(aws rds describe-db-clusters --db-cluster-identifier goal-mandala-dev-cluster --query 'DBClusters[0].Status' --output text 2>/dev/null || echo "not-found")
    if [[ "$cluster_status" == "available" ]]; then
        log_info "Aurora クラスター確認完了: $cluster_status"
    else
        log_warn "Aurora クラスターの状態: $cluster_status"
    fi

    # S3バケットの確認
    if aws s3 ls s3://goal-mandala-dev-frontend-bucket &> /dev/null; then
        log_info "S3バケット確認完了"
    else
        log_warn "S3バケットが見つかりません"
    fi
}

# テスト用リソースのクリーンアップ
cleanup_test_resources() {
    log_info "テスト用リソースをクリーンアップしています..."

    # スタックを逆順で削除
    local stacks=(
        "goal-mandala-dev-frontend"
        "goal-mandala-dev-api"
        "goal-mandala-dev-database"
    )

    for stack in "${stacks[@]}"; do
        log_info "スタックを削除しています: $stack"

        if ! pnpm run cdk destroy "$stack" --force; then
            log_warn "スタック削除に失敗しました: $stack"
        fi
    done

    log_info "クリーンアップ完了"
}

# ユニットテスト実行
run_unit_tests() {
    log_info "ユニットテストを実行しています..."

    if ! pnpm run test:ci; then
        log_warn "ユニットテストで失敗がありました（継続します）"
    else
        log_info "ユニットテスト完了"
    fi
}

# メイン実行関数
main() {
    log_info "CDK基本デプロイテストを開始します"

    # 前提条件チェック
    check_prerequisites

    # 環境設定確認
    check_environment

    # CDK Bootstrapチェック
    check_bootstrap

    # ユニットテスト実行
    run_unit_tests

    # CDK Synthテスト
    test_synth

    # デプロイテスト（ドライラン）
    test_deploy_dry_run

    # 実際のデプロイテスト（オプション）
    test_deploy_actual

    log_info "CDK基本デプロイテストが完了しました"
}

# スクリプト実行
main "$@"
