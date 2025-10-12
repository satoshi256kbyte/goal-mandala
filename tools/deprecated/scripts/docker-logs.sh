#!/bin/bash

# Docker開発環境ログ確認スクリプト
# Usage: ./tools/scripts/docker-logs.sh [service-name] [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 色付きログ出力
log_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

# Docker Composeファイルの存在確認
check_docker_compose() {
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log_error "docker-compose.ymlが見つかりません: $PROJECT_ROOT/docker-compose.yml"
        exit 1
    fi
}

# 利用可能なサービス一覧を取得
get_services() {
    cd "$PROJECT_ROOT"
    docker-compose config --services 2>/dev/null || echo ""
}

# 全サービスのログを表示
show_all_logs() {
    local follow_flag=""
    local tail_lines="100"

    # オプション解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow)
                follow_flag="-f"
                shift
                ;;
            -n|--tail)
                tail_lines="$2"
                shift 2
                ;;
            --tail=*)
                tail_lines="${1#*=}"
                shift
                ;;
            *)
                log_warning "不明なオプション: $1"
                shift
                ;;
        esac
    done

    log_info "全サービスのログを表示中... (最新${tail_lines}行)"
    if [ -n "$follow_flag" ]; then
        log_info "リアルタイム表示モード (Ctrl+Cで終了)"
    fi

    cd "$PROJECT_ROOT"
    docker-compose logs $follow_flag --tail="$tail_lines" --timestamps
}

# 特定サービスのログを表示
show_service_logs() {
    local service_name="$1"
    shift

    local follow_flag=""
    local tail_lines="100"

    # オプション解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow)
                follow_flag="-f"
                shift
                ;;
            -n|--tail)
                tail_lines="$2"
                shift 2
                ;;
            --tail=*)
                tail_lines="${1#*=}"
                shift
                ;;
            *)
                log_warning "不明なオプション: $1"
                shift
                ;;
        esac
    done

    # サービス存在確認
    local services
    services=$(get_services)
    if ! echo "$services" | grep -q "^${service_name}$"; then
        log_error "サービス '$service_name' が見つかりません"
        log_info "利用可能なサービス:"
        echo "$services" | sed 's/^/  - /'
        exit 1
    fi

    log_info "サービス '$service_name' のログを表示中... (最新${tail_lines}行)"
    if [ -n "$follow_flag" ]; then
        log_info "リアルタイム表示モード (Ctrl+Cで終了)"
    fi

    cd "$PROJECT_ROOT"
    docker-compose logs $follow_flag --tail="$tail_lines" --timestamps "$service_name"
}

# エラーログのみを表示
show_error_logs() {
    log_info "エラーログを検索中..."

    cd "$PROJECT_ROOT"
    docker-compose logs --tail=1000 --timestamps | grep -i -E "(error|exception|failed|fatal)" || {
        log_success "エラーログは見つかりませんでした"
    }
}

# ログファイルをエクスポート
export_logs() {
    local output_dir="$PROJECT_ROOT/logs/export"
    local timestamp=$(date +"%Y%m%d_%H%M%S")

    mkdir -p "$output_dir"

    log_info "ログをエクスポート中..."

    cd "$PROJECT_ROOT"

    # 全サービスのログをエクスポート
    docker-compose logs --timestamps > "$output_dir/all_services_${timestamp}.log"

    # サービス別にログをエクスポート
    local services
    services=$(get_services)

    while IFS= read -r service; do
        if [ -n "$service" ]; then
            docker-compose logs --timestamps "$service" > "$output_dir/${service}_${timestamp}.log"
        fi
    done <<< "$services"

    log_success "ログをエクスポートしました: $output_dir"
    log_info "エクスポートされたファイル:"
    ls -la "$output_dir"/*_${timestamp}.log | sed 's/^/  /'
}

# ヘルプ表示
show_help() {
    echo "Docker開発環境ログ確認スクリプト"
    echo ""
    echo "Usage: $0 [SERVICE] [OPTIONS]"
    echo ""
    echo "Arguments:"
    echo "  SERVICE       表示するサービス名 (省略時は全サービス)"
    echo ""
    echo "Options:"
    echo "  -f, --follow  リアルタイムでログを表示"
    echo "  -n, --tail N  最新N行を表示 (デフォルト: 100)"
    echo "  --errors      エラーログのみを表示"
    echo "  --export      ログをファイルにエクスポート"
    echo "  --services    利用可能なサービス一覧を表示"
    echo "  -h, --help    このヘルプを表示"
    echo ""
    echo "Examples:"
    echo "  $0                    # 全サービスのログを表示"
    echo "  $0 postgres           # PostgreSQLのログを表示"
    echo "  $0 postgres -f        # PostgreSQLのログをリアルタイム表示"
    echo "  $0 -n 50              # 全サービスの最新50行を表示"
    echo "  $0 --errors           # エラーログのみを表示"
    echo "  $0 --export           # ログをファイルにエクスポート"
    echo "  $0 --services         # 利用可能なサービス一覧を表示"
}

# サービス一覧表示
show_services() {
    log_info "利用可能なサービス:"
    local services
    services=$(get_services)

    if [ -z "$services" ]; then
        log_warning "サービスが見つかりません。Docker Composeが起動していない可能性があります。"
        return 1
    fi

    echo "$services" | sed 's/^/  - /'
}

# メイン処理
main() {
    check_docker_compose

    # 引数がない場合は全ログを表示
    if [ $# -eq 0 ]; then
        show_all_logs
        return
    fi

    # 特殊オプションの処理
    case "$1" in
        --errors)
            show_error_logs
            return
            ;;
        --export)
            export_logs
            return
            ;;
        --services)
            show_services
            return
            ;;
        -h|--help|help)
            show_help
            return
            ;;
    esac

    # 最初の引数がサービス名かオプションかを判定
    local services
    services=$(get_services)

    if echo "$services" | grep -q "^${1}$"; then
        # サービス名が指定された場合
        show_service_logs "$@"
    else
        # オプションのみの場合
        show_all_logs "$@"
    fi
}

main "$@"
