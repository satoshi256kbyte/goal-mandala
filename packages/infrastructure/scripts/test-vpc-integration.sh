#!/bin/bash

# VPCスタック統合テストスクリプト
# このスクリプトはVPCスタック全体のデプロイテストと接続性確認を実行します

set -e

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

log_section() {
    echo -e "\033[36m\n=== $1 ===\033[0m"
}

# 設定
STACK_NAME="VpcStack-integration-test"
ENVIRONMENT="test"
REGION="ap-northeast-1"
TIMEOUT=600  # 10分

# 前提条件チェック
check_prerequisites() {
    log_section "前提条件チェック"

    # AWS CLIの確認
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLIがインストールされていません"
        exit 1
    fi

    # CDKの確認
    if ! command -v cdk &> /dev/null; then
        log_error "AWS CDKがインストールされていません"
        exit 1
    fi

    # AWS認証情報の確認
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS認証情報が設定されていません"
        exit 1
    fi

    log_info "前提条件チェック完了"
}

# CDKスタックのデプロイ
deploy_stack() {
    log_section "VPCスタックのデプロイ"

    log_info "CDKスタックをデプロイ中..."

    # CDKデプロイの実行
    if cdk deploy $STACK_NAME --require-approval never --outputs-file vpc-outputs.json; then
        log_info "VPCスタックのデプロイが完了しました"
    else
        log_error "VPCスタックのデプロイに失敗しました"
        exit 1
    fi
}

# VPCリソースの存在確認
verify_vpc_resources() {
    log_section "VPCリソースの存在確認"

    # CloudFormationスタックの出力値を取得
    local stack_outputs=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output json)

    # VPC IDの取得と確認
    local vpc_id=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="VpcId") | .OutputValue')
    if [[ -z "$vpc_id" || "$vpc_id" == "null" ]]; then
        log_error "VPC IDが取得できません"
        return 1
    fi
    log_info "VPC ID: $vpc_id"

    # VPCの存在確認
    if aws ec2 describe-vpcs --vpc-ids $vpc_id --region $REGION &> /dev/null; then
        log_info "VPCが正常に作成されています"
    else
        log_error "VPCが見つかりません"
        return 1
    fi

    # サブネットの確認
    local public_subnets=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="PublicSubnetIds") | .OutputValue')
    local private_subnets=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="PrivateSubnetIds") | .OutputValue')
    local isolated_subnets=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="IsolatedSubnetIds") | .OutputValue')

    log_info "パブリックサブネット: $public_subnets"
    log_info "プライベートサブネット: $private_subnets"
    log_info "分離サブネット: $isolated_subnets"

    # セキュリティグループの確認
    local db_sg=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="DatabaseSecurityGroupId") | .OutputValue')
    local lambda_sg=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="LambdaSecurityGroupId") | .OutputValue')
    local alb_sg=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="AlbSecurityGroupId") | .OutputValue')

    log_info "データベースSG: $db_sg"
    log_info "Lambda SG: $lambda_sg"
    log_info "ALB SG: $alb_sg"

    # 各リソースの存在確認
    verify_subnets "$public_subnets" "パブリック"
    verify_subnets "$private_subnets" "プライベート"
    verify_subnets "$isolated_subnets" "分離"

    verify_security_groups "$db_sg" "$lambda_sg" "$alb_sg"

    return 0
}

# サブネットの存在確認
verify_subnets() {
    local subnet_ids="$1"
    local subnet_type="$2"

    IFS=',' read -ra SUBNET_ARRAY <<< "$subnet_ids"
    for subnet_id in "${SUBNET_ARRAY[@]}"; do
        if aws ec2 describe-subnets --subnet-ids $subnet_id --region $REGION &> /dev/null; then
            log_info "${subnet_type}サブネット $subnet_id が存在します"
        else
            log_error "${subnet_type}サブネット $subnet_id が見つかりません"
            return 1
        fi
    done
}

# セキュリティグループの存在確認
verify_security_groups() {
    local db_sg="$1"
    local lambda_sg="$2"
    local alb_sg="$3"

    for sg_id in "$db_sg" "$lambda_sg" "$alb_sg"; do
        if aws ec2 describe-security-groups --group-ids $sg_id --region $REGION &> /dev/null; then
            log_info "セキュリティグループ $sg_id が存在します"
        else
            log_error "セキュリティグループ $sg_id が見つかりません"
            return 1
        fi
    done
}

# VPC接続性の確認
test_vpc_connectivity() {
    log_section "VPC接続性の確認"

    # CloudFormationスタックの出力値を取得
    local stack_outputs=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output json)

    local vpc_id=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="VpcId") | .OutputValue')

    # インターネットゲートウェイの確認
    log_info "インターネットゲートウェイの確認中..."
    local igw_id=$(aws ec2 describe-internet-gateways \
        --filters "Name=attachment.vpc-id,Values=$vpc_id" \
        --region $REGION \
        --query 'InternetGateways[0].InternetGatewayId' \
        --output text)

    if [[ "$igw_id" != "None" && -n "$igw_id" ]]; then
        log_info "インターネットゲートウェイ $igw_id が正常にアタッチされています"
    else
        log_error "インターネットゲートウェイが見つかりません"
        return 1
    fi

    # NATゲートウェイの確認
    log_info "NATゲートウェイの確認中..."
    local nat_gateways=$(aws ec2 describe-nat-gateways \
        --filter "Name=vpc-id,Values=$vpc_id" \
        --region $REGION \
        --query 'NatGateways[?State==`available`].NatGatewayId' \
        --output text)

    if [[ -n "$nat_gateways" ]]; then
        local nat_count=$(echo $nat_gateways | wc -w)
        log_info "NATゲートウェイが $nat_count 個作成されています: $nat_gateways"
    else
        log_error "利用可能なNATゲートウェイが見つかりません"
        return 1
    fi

    # ルートテーブルの確認
    verify_route_tables "$vpc_id"

    return 0
}

# ルートテーブルの確認
verify_route_tables() {
    local vpc_id="$1"

    log_info "ルートテーブルの確認中..."

    # パブリックサブネット用ルートテーブル（IGW経由のルート）
    local public_routes=$(aws ec2 describe-route-tables \
        --filters "Name=vpc-id,Values=$vpc_id" "Name=route.gateway-id,Values=igw-*" \
        --region $REGION \
        --query 'RouteTables[].RouteTableId' \
        --output text)

    if [[ -n "$public_routes" ]]; then
        log_info "パブリックルートテーブル（IGW経由）: $public_routes"
    else
        log_warn "パブリックルートテーブルが見つかりません"
    fi

    # プライベートサブネット用ルートテーブル（NAT経由のルート）
    local private_routes=$(aws ec2 describe-route-tables \
        --filters "Name=vpc-id,Values=$vpc_id" "Name=route.nat-gateway-id,Values=nat-*" \
        --region $REGION \
        --query 'RouteTables[].RouteTableId' \
        --output text)

    if [[ -n "$private_routes" ]]; then
        log_info "プライベートルートテーブル（NAT経由）: $private_routes"
    else
        log_warn "プライベートルートテーブルが見つかりません"
    fi
}

# セキュリティグループルールの動作確認
test_security_group_rules() {
    log_section "セキュリティグループルールの動作確認"

    # CloudFormationスタックの出力値を取得
    local stack_outputs=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output json)

    local db_sg=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="DatabaseSecurityGroupId") | .OutputValue')
    local lambda_sg=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="LambdaSecurityGroupId") | .OutputValue')
    local alb_sg=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="AlbSecurityGroupId") | .OutputValue')

    # データベースセキュリティグループのルール確認
    log_info "データベースセキュリティグループのルール確認中..."
    verify_database_sg_rules "$db_sg" "$lambda_sg"

    # Lambdaセキュリティグループのルール確認
    log_info "Lambdaセキュリティグループのルール確認中..."
    verify_lambda_sg_rules "$lambda_sg" "$alb_sg"

    # ALBセキュリティグループのルール確認
    log_info "ALBセキュリティグループのルール確認中..."
    verify_alb_sg_rules "$alb_sg"

    return 0
}

# データベースセキュリティグループのルール確認
verify_database_sg_rules() {
    local db_sg="$1"
    local lambda_sg="$2"

    # インバウンドルール: Lambda SGからのPostgreSQL(5432)接続のみ
    local ingress_rules=$(aws ec2 describe-security-groups \
        --group-ids $db_sg \
        --region $REGION \
        --query 'SecurityGroups[0].IpPermissions' \
        --output json)

    # PostgreSQL(5432)ポートのルールを確認
    local postgres_rule=$(echo $ingress_rules | jq '.[] | select(.FromPort==5432 and .ToPort==5432)')
    if [[ -n "$postgres_rule" ]]; then
        log_info "データベースSG: PostgreSQL(5432)のインバウンドルールが設定されています"

        # ソースがLambda SGであることを確認
        local source_sg=$(echo $postgres_rule | jq -r '.UserIdGroupPairs[0].GroupId // empty')
        if [[ "$source_sg" == "$lambda_sg" ]]; then
            log_info "データベースSG: ソースがLambda SGに正しく設定されています"
        else
            log_warn "データベースSG: ソースSGが期待値と異なります (期待: $lambda_sg, 実際: $source_sg)"
        fi
    else
        log_error "データベースSG: PostgreSQL(5432)のインバウンドルールが見つかりません"
        return 1
    fi

    # アウトバウンドルール: 制限されていることを確認
    local egress_rules=$(aws ec2 describe-security-groups \
        --group-ids $db_sg \
        --region $REGION \
        --query 'SecurityGroups[0].IpPermissionsEgress' \
        --output json)

    # 実際のアウトバウンドルール（ダミールール以外）の数を確認
    local real_egress_count=$(echo $egress_rules | jq '[.[] | select(.IpRanges[0].CidrIp != "255.255.255.255/32")] | length')
    if [[ "$real_egress_count" -eq 0 ]]; then
        log_info "データベースSG: アウトバウンドルールが適切に制限されています"
    else
        log_warn "データベースSG: 予期しないアウトバウンドルールが存在します ($real_egress_count 個)"
    fi
}

# Lambdaセキュリティグループのルール確認
verify_lambda_sg_rules() {
    local lambda_sg="$1"
    local alb_sg="$2"

    # インバウンドルール: ALB SGからのアクセス（将来の拡張用）
    local ingress_rules=$(aws ec2 describe-security-groups \
        --group-ids $lambda_sg \
        --region $REGION \
        --query 'SecurityGroups[0].IpPermissions' \
        --output json)

    # ポート8080のルールを確認（将来の拡張用）
    local alb_rule=$(echo $ingress_rules | jq '.[] | select(.FromPort==8080 and .ToPort==8080)')
    if [[ -n "$alb_rule" ]]; then
        log_info "Lambda SG: ALBからのアクセス用インバウンドルール(8080)が設定されています"
    else
        log_warn "Lambda SG: ALBからのアクセス用インバウンドルールが見つかりません"
    fi

    # アウトバウンドルール: 全許可（外部API呼び出し用）
    local egress_rules=$(aws ec2 describe-security-groups \
        --group-ids $lambda_sg \
        --region $REGION \
        --query 'SecurityGroups[0].IpPermissionsEgress' \
        --output json)

    # 全アウトバウンド許可ルールを確認
    local all_traffic_rule=$(echo $egress_rules | jq '.[] | select(.IpProtocol=="-1" and .IpRanges[0].CidrIp=="0.0.0.0/0")')
    if [[ -n "$all_traffic_rule" ]]; then
        log_info "Lambda SG: 全アウトバウンド許可ルールが設定されています"
    else
        log_warn "Lambda SG: 全アウトバウンド許可ルールが見つかりません"
    fi
}

# ALBセキュリティグループのルール確認
verify_alb_sg_rules() {
    local alb_sg="$1"

    # インバウンドルール: HTTP(80)とHTTPS(443)
    local ingress_rules=$(aws ec2 describe-security-groups \
        --group-ids $alb_sg \
        --region $REGION \
        --query 'SecurityGroups[0].IpPermissions' \
        --output json)

    # HTTPS(443)ルールを確認
    local https_rule=$(echo $ingress_rules | jq '.[] | select(.FromPort==443 and .ToPort==443)')
    if [[ -n "$https_rule" ]]; then
        log_info "ALB SG: HTTPS(443)のインバウンドルールが設定されています"
    else
        log_error "ALB SG: HTTPS(443)のインバウンドルールが見つかりません"
        return 1
    fi

    # HTTP(80)ルールを確認
    local http_rule=$(echo $ingress_rules | jq '.[] | select(.FromPort==80 and .ToPort==80)')
    if [[ -n "$http_rule" ]]; then
        log_info "ALB SG: HTTP(80)のインバウンドルールが設定されています"
    else
        log_error "ALB SG: HTTP(80)のインバウンドルールが見つかりません"
        return 1
    fi

    # アウトバウンドルール: 制限されていることを確認
    local egress_rules=$(aws ec2 describe-security-groups \
        --group-ids $alb_sg \
        --region $REGION \
        --query 'SecurityGroups[0].IpPermissionsEgress' \
        --output json)

    local real_egress_count=$(echo $egress_rules | jq '[.[] | select(.IpRanges[0].CidrIp != "255.255.255.255/32")] | length')
    if [[ "$real_egress_count" -eq 0 ]]; then
        log_info "ALB SG: アウトバウンドルールが適切に制限されています"
    else
        log_warn "ALB SG: 予期しないアウトバウンドルールが存在します ($real_egress_count 個)"
    fi
}

# VPCフローログの確認
verify_vpc_flow_logs() {
    log_section "VPCフローログの確認"

    # CloudFormationスタックの出力値を取得
    local stack_outputs=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output json)

    local vpc_id=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="VpcId") | .OutputValue')
    local log_group_name=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="VpcFlowLogGroupName") | .OutputValue')

    # VPCフローログの存在確認
    log_info "VPCフローログの確認中..."
    local flow_logs=$(aws ec2 describe-flow-logs \
        --filter "Name=resource-id,Values=$vpc_id" \
        --region $REGION \
        --query 'FlowLogs[?FlowLogStatus==`ACTIVE`]' \
        --output json)

    if [[ $(echo $flow_logs | jq 'length') -gt 0 ]]; then
        log_info "VPCフローログが正常に設定されています"

        # フローログの詳細確認
        local traffic_type=$(echo $flow_logs | jq -r '.[0].TrafficType')
        local log_destination=$(echo $flow_logs | jq -r '.[0].LogDestination')

        log_info "トラフィックタイプ: $traffic_type"
        log_info "ログ出力先: $log_destination"

        if [[ "$traffic_type" == "ALL" ]]; then
            log_info "全トラフィック（承認・拒否両方）が記録されています"
        else
            log_warn "トラフィックタイプが期待値と異なります (期待: ALL, 実際: $traffic_type)"
        fi
    else
        log_error "アクティブなVPCフローログが見つかりません"
        return 1
    fi

    # CloudWatch Logsグループの確認
    log_info "CloudWatch Logsグループの確認中..."
    if aws logs describe-log-groups \
        --log-group-name-prefix "$log_group_name" \
        --region $REGION &> /dev/null; then
        log_info "CloudWatch Logsグループが存在します: $log_group_name"

        # ログ保持期間の確認
        local retention_days=$(aws logs describe-log-groups \
            --log-group-name-prefix "$log_group_name" \
            --region $REGION \
            --query 'logGroups[0].retentionInDays' \
            --output text)

        if [[ "$retention_days" == "30" ]]; then
            log_info "ログ保持期間が正しく設定されています: 30日"
        else
            log_warn "ログ保持期間が期待値と異なります (期待: 30, 実際: $retention_days)"
        fi
    else
        log_error "CloudWatch Logsグループが見つかりません: $log_group_name"
        return 1
    fi
}

# 環境別設定の確認
verify_environment_specific_config() {
    log_section "環境別設定の確認"

    # CloudFormationスタックの出力値を取得
    local stack_outputs=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output json)

    # NATゲートウェイ数の確認
    local nat_gateway_count=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="NatGatewayCount") | .OutputValue')
    log_info "NATゲートウェイ数: $nat_gateway_count"

    # VPCエンドポイント有効状態の確認
    local vpc_endpoints_enabled=$(echo $stack_outputs | jq -r '.[] | select(.OutputKey=="VpcEndpointsEnabled") | .OutputValue')
    log_info "VPCエンドポイント有効: $vpc_endpoints_enabled"

    # テスト環境の期待値確認
    if [[ "$nat_gateway_count" == "1" ]]; then
        log_info "テスト環境のNATゲートウェイ数が正しく設定されています"
    else
        log_warn "テスト環境のNATゲートウェイ数が期待値と異なります (期待: 1, 実際: $nat_gateway_count)"
    fi

    if [[ "$vpc_endpoints_enabled" == "false" ]]; then
        log_info "テスト環境のVPCエンドポイント設定が正しく設定されています"
    else
        log_warn "テスト環境のVPCエンドポイント設定が期待値と異なります (期待: false, 実際: $vpc_endpoints_enabled)"
    fi
}

# CloudFormation出力の確認
verify_cloudformation_outputs() {
    log_section "CloudFormation出力の確認"

    # 必要な出力項目のリスト
    local required_outputs=(
        "VpcId"
        "VpcCidr"
        "PublicSubnetIds"
        "PrivateSubnetIds"
        "IsolatedSubnetIds"
        "DatabaseSecurityGroupId"
        "LambdaSecurityGroupId"
        "AlbSecurityGroupId"
        "AvailabilityZones"
        "InternetGatewayStatus"
        "RoutingConfiguration"
        "NatGatewayCount"
        "VpcEndpointsEnabled"
        "VpcFlowLogGroupName"
    )

    # CloudFormationスタックの出力値を取得
    local stack_outputs=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output json)

    # 各出力項目の存在確認
    local missing_outputs=()
    for output in "${required_outputs[@]}"; do
        local output_value=$(echo $stack_outputs | jq -r ".[] | select(.OutputKey==\"$output\") | .OutputValue")
        if [[ -n "$output_value" && "$output_value" != "null" ]]; then
            log_info "出力項目 $output: $output_value"
        else
            log_error "出力項目 $output が見つかりません"
            missing_outputs+=("$output")
        fi
    done

    # Export名の確認
    log_info "Export名の確認中..."
    local exports=$(echo $stack_outputs | jq -r '.[].ExportName // empty')
    if [[ -n "$exports" ]]; then
        log_info "Export名が設定されています"
        echo "$exports" | while read -r export_name; do
            log_info "  - $export_name"
        done
    else
        log_warn "Export名が設定されていません"
    fi

    # 不足している出力項目がある場合はエラー
    if [[ ${#missing_outputs[@]} -gt 0 ]]; then
        log_error "不足している出力項目: ${missing_outputs[*]}"
        return 1
    fi

    log_info "全ての必要な出力項目が存在します"
    return 0
}

# スタックのクリーンアップ
cleanup_stack() {
    log_section "スタックのクリーンアップ"

    log_info "VPCスタックを削除中..."

    if cdk destroy $STACK_NAME --force; then
        log_info "VPCスタックの削除が完了しました"
    else
        log_warn "VPCスタックの削除に失敗しました（手動で削除してください）"
    fi

    # 一時ファイルの削除
    if [[ -f "vpc-outputs.json" ]]; then
        rm -f vpc-outputs.json
        log_info "一時ファイルを削除しました"
    fi
}

# テスト結果のサマリー
print_test_summary() {
    log_section "テスト結果サマリー"

    if [[ $TEST_FAILED -eq 0 ]]; then
        log_info "✅ 全てのテストが成功しました"
        echo -e "\033[32m"
        echo "===================="
        echo "  統合テスト成功"
        echo "===================="
        echo -e "\033[0m"
    else
        log_error "❌ 一部のテストが失敗しました"
        echo -e "\033[31m"
        echo "===================="
        echo "  統合テスト失敗"
        echo "===================="
        echo -e "\033[0m"
    fi
}

# メイン実行関数
main() {
    log_section "VPCスタック統合テスト開始"

    # グローバル変数
    TEST_FAILED=0

    # 各テストの実行
    check_prerequisites || { TEST_FAILED=1; }

    deploy_stack || { TEST_FAILED=1; }

    verify_vpc_resources || { TEST_FAILED=1; }

    test_vpc_connectivity || { TEST_FAILED=1; }

    test_security_group_rules || { TEST_FAILED=1; }

    verify_vpc_flow_logs || { TEST_FAILED=1; }

    verify_environment_specific_config || { TEST_FAILED=1; }

    verify_cloudformation_outputs || { TEST_FAILED=1; }

    # クリーンアップ（オプション）
    if [[ "${CLEANUP:-true}" == "true" ]]; then
        cleanup_stack
    else
        log_info "クリーンアップをスキップしました（CLEANUP=false）"
    fi

    # テスト結果の表示
    print_test_summary

    # 終了コード
    exit $TEST_FAILED
}

# スクリプトの実行
main "$@"
