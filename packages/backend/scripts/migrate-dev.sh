#!/bin/bash

# 開発環境マイグレーション実行スクリプト
# Docker Compose環境でのマイグレーション実行を自動化

set -euo pipefail

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 環境変数チェック
check_environment() {
    log_info "環境変数をチェック中..."
    
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL環境変数が設定されていません"
        exit 1
    fi
    
    log_success "環境変数チェック完了"
}

# データベース接続確認
check_database_connection() {
    log_info "データベース接続を確認中..."
    
    # 最大30秒間、5秒間隔でリトライ
    local max_attempts=6
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if pnpm prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
            log_success "データベース接続確認完了"
            return 0
        fi
        
        log_warning "データベース接続試行 $attempt/$max_attempts 失敗。5秒後にリトライ..."
        sleep 5
        ((attempt++))
    done
    
    log_error "データベースに接続できません"
    exit 1
}

# マイグレーション実行
run_migration() {
    local migration_name="${1:-init}"
    
    log_info "マイグレーション '$migration_name' を実行中..."
    
    if [ ! -d "prisma/migrations" ]; then
        log_info "初回マイグレーションを生成中..."
        pnpm prisma migrate dev --name "$migration_name"
    else
        log_info "マイグレーションを適用中..."
        pnpm prisma migrate dev
    fi
    
    log_success "マイグレーション完了"
}

# Prismaクライアント生成
generate_client() {
    log_info "Prismaクライアントを生成中..."
    pnpm prisma generate
    log_success "Prismaクライアント生成完了"
}

# マイグレーション状態確認
check_migration_status() {
    log_info "マイグレーション状態を確認中..."
    pnpm prisma migrate status
}

# メイン処理
main() {
    log_info "開発環境マイグレーション開始"
    
    check_environment
    check_database_connection
    run_migration "${1:-init}"
    generate_client
    check_migration_status
    
    log_success "開発環境マイグレーション完了"
}

# スクリプト実行
main "$@"
