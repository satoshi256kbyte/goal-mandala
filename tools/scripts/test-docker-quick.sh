#!/bin/bash

# Docker環境クイックテストスクリプト
# 基本的な動作確認のみを行う軽量版テスト

set -e

# 色付きログ出力用の関数
log_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# クイックテスト実行
main() {
    echo "========================================="
    echo "      Docker環境クイックテスト"
    echo "========================================="
    echo ""

    # Docker Compose設定確認
    log_info "Docker Compose設定確認..."
    if docker-compose config > /dev/null 2>&1; then
        log_success "✓ Docker Compose設定OK"
    else
        log_error "✗ Docker Compose設定エラー"
        exit 1
    fi

    # コンテナ起動
    log_info "コンテナ起動..."
    docker-compose up -d

    # 起動待機
    log_info "サービス起動待機中..."
    sleep 20

    # PostgreSQL接続確認
    log_info "PostgreSQL接続確認..."
    if docker-compose exec -T postgres pg_isready -U goal_mandala_user -d goal_mandala_dev > /dev/null 2>&1; then
        log_success "✓ PostgreSQL接続OK"
    else
        log_error "✗ PostgreSQL接続エラー"
    fi

    # cognito-local接続確認
    log_info "cognito-local接続確認..."
    if curl -f -s http://localhost:9229/health > /dev/null 2>&1; then
        log_success "✓ cognito-local接続OK"
    else
        log_error "✗ cognito-local接続エラー"
    fi

    log_success "クイックテスト完了"
}

# クリーンアップ
cleanup() {
    log_info "テスト環境停止..."
    docker-compose down > /dev/null 2>&1 || true
}

# トラップ設定
trap cleanup EXIT

# メイン処理実行
main "$@"
