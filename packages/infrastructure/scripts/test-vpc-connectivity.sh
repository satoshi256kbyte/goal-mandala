#!/bin/bash

# VPC接続性テストスクリプト
# このスクリプトはVPCネットワークの接続性を詳細にテストします

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
STACK_NAME="${STACK_NAME:-VpcStack-connectivity-test}"
REGION="${AWS_REGION:-ap-northeast-1}"

# VPCの基本情報を取得
get_vpc_info() {
    log_section "VPC基本情報の取得"

    # CloudFormationスタックの出力値を取得
    STACK_OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output json 2>/dev/null)

    if [[ $? -ne 0 ]]; then
        log_error "CloudFormationスタック $STACK_NAME が見つかりません"
        exit 1
    fi

    # 各リソースIDを取得
    VPC_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="VpcId") | .OutputValue')
    PUBLIC_SUBNETS=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="PublicSubnetIds") | .OutputValue')
    PRIVATE_SUBNETS=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="PrivateSubnetIds") | .OutputValue')
    ISOLATED_SUBNETS=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="IsolatedSubnetIds") | .OutputValue')

    log_info "VPC ID: $VPC_ID"
    log_info "パブリックサブネット: $PUBLIC_SUBNETS"
    log_info "プライベートサブネット: $PRIVATE_SUBNETS"
    log_info "分離サブネット: $ISOLATED_SUBNETS"
}

# インターネットゲートウェイの接続性テスト
test_internet_gateway_connectivity() {
    log_section "インターネットゲートウェイ接続性テスト"

    # インターネットゲートウェイの取得
    IGW_ID=$(aws ec2 describe-internet-gateways \
        --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
        --region $REGION \
        --query 'InternetGateways[0].InternetGatewayId' \
        --output text)

    if [[ "$IGW_ID" == "None" || -z "$IGW_ID" ]]; then
        log_error "インターネットゲートウェイが見つかりません"
        return 1
    fi

    log_info "インターネットゲートウェイ ID: $IGW_ID"

    # IGWの状態確認
    IGW_STATE=$(aws ec2 describe-internet-gateways \
        --internet-gateway-ids $IGW_ID \
        --region $REGION \
        --query 'InternetGateways[0].Attachments[0].State' \
        --output text)

    if [[ "$IGW_STATE" == "available" ]]; then
        log_info "インターネットゲートウェイが正常にアタッチされています"
    else
        log_error "インターネットゲートウェイの状態が異常です: $IGW_STATE"
        return 1
    fi

    # パブリックサブネットからIGWへのルート確認
    test_public_subnet_routes

    return 0
}

# パブリックサブネットのルート確認
test_public_subnet_routes() {
    log_info "パブリックサブネットのルート確認中..."

    IFS=',' read -ra PUBLIC_SUBNET_ARRAY <<< "$PUBLIC_SUBNETS"

    for subnet_id in "${PUBLIC_SUBNET_ARRAY[@]}"; do
        # サブネットのルートテーブルを取得
        ROUTE_TABLE_ID=$(aws ec2 describe-route-tables \
            --filters "Name=association.subnet-id,Values=$subnet_id" \
            --region $REGION \
            --query 'RouteTables[0].RouteTableId' \
            --output text)

        if [[ "$ROUTE_TABLE_ID" == "None" || -z "$ROUTE_TABLE_ID" ]]; then
            log_warn "サブネット $subnet_id のルートテーブルが見つかりません"
            continue
        fi

        # IGWへのデフォルトルートを確認
        IGW_ROUTE=$(aws ec2 describe-route-tables \
            --route-table-ids $ROUTE_TABLE_ID \
            --region $REGION \
            --query 'RouteTables[0].Routes[?DestinationCidrBlock==`0.0.0.0/0` && GatewayId!=null]' \
            --output json)

        if [[ $(echo $IGW_ROUTE | jq 'length') -gt 0 ]]; then
            local gateway_id=$(echo $IGW_ROUTE | jq -r '.[0].GatewayId')
            log_info "サブネット $subnet_id: IGW経由のデフォルトルートが設定されています ($gateway_id)"
        else
            log_error "サブネット $subnet_id: IGW経由のデフォルトルートが見つかりません"
            return 1
        fi
    done
}

# NATゲートウェイの接続性テスト
test_nat_gateway_connectivity() {
    log_section "NATゲートウェイ接続性テスト"

    # NATゲートウェイの取得
    NAT_GATEWAYS=$(aws ec2 describe-nat-gateways \
        --filter "Name=vpc-id,Values=$VPC_ID" "Name=state,Values=available" \
        --region $REGION \
        --query 'NatGateways[].NatGatewayId' \
        --output text)

    if [[ -z "$NAT_GATEWAYS" ]]; then
        log_error "利用可能なNATゲートウェイが見つかりません"
        return 1
    fi

    NAT_COUNT=$(echo $NAT_GATEWAYS | wc -w)
    log_info "利用可能なNATゲートウェイ数: $NAT_COUNT"
    log_info "NATゲートウェイ ID: $NAT_GATEWAYS"

    # 各NATゲートウェイの詳細確認
    for nat_id in $NAT_GATEWAYS; do
        test_nat_gateway_details "$nat_id"
    done

    # プライベートサブネットからNATゲートウェイへのルート確認
    test_private_subnet_routes

    return 0
}

# 個別NATゲートウェイの詳細確認
test_nat_gateway_details() {
    local nat_id="$1"

    log_info "NATゲートウェイ $nat_id の詳細確認中..."

    # NATゲートウェイの詳細情報を取得
    NAT_INFO=$(aws ec2 describe-nat-gateways \
        --nat-gateway-ids $nat_id \
        --region $REGION \
        --query 'NatGateways[0]' \
        --output json)

    local nat_state=$(echo $NAT_INFO | jq -r '.State')
    local nat_subnet=$(echo $NAT_INFO | jq -r '.SubnetId')
    local nat_eip=$(echo $NAT_INFO | jq -r '.NatGatewayAddresses[0].PublicIp')

    log_info "  状態: $nat_state"
    log_info "  配置サブネット: $nat_subnet"
    log_info "  Elastic IP: $nat_eip"

    # NATゲートウェイがパブリックサブネットに配置されていることを確認
    if [[ "$PUBLIC_SUBNETS" == *"$nat_subnet"* ]]; then
        log_info "  NATゲートウェイが正しくパブリックサブネットに配置されています"
    else
        log_warn "  NATゲートウェイがパブリックサブネット以外に配置されています"
    fi
}

# プライベートサブネットのルート確認
test_private_subnet_routes() {
    log_info "プライベートサブネットのルート確認中..."

    IFS=',' read -ra PRIVATE_SUBNET_ARRAY <<< "$PRIVATE_SUBNETS"

    for subnet_id in "${PRIVATE_SUBNET_ARRAY[@]}"; do
        # サブネットのルートテーブルを取得
        ROUTE_TABLE_ID=$(aws ec2 describe-route-tables \
            --filters "Name=association.subnet-id,Values=$subnet_id" \
            --region $REGION \
            --query 'RouteTables[0].RouteTableId' \
            --output text)

        if [[ "$ROUTE_TABLE_ID" == "None" || -z "$ROUTE_TABLE_ID" ]]; then
            log_warn "サブネット $subnet_id のルートテーブルが見つかりません"
            continue
        fi

        # NATゲートウェイへのデフォルトルートを確認
        NAT_ROUTE=$(aws ec2 describe-route-tables \
            --route-table-ids $ROUTE_TABLE_ID \
            --region $REGION \
            --query 'RouteTables[0].Routes[?DestinationCidrBlock==`0.0.0.0/0` && NatGatewayId!=null]' \
            --output json)

        if [[ $(echo $NAT_ROUTE | jq 'length') -gt 0 ]]; then
            local nat_gateway_id=$(echo $NAT_ROUTE | jq -r '.[0].NatGatewayId')
            log_info "サブネット $subnet_id: NAT経由のデフォルトルートが設定されています ($nat_gateway_id)"
        else
            log_error "サブネット $subnet_id: NAT経由のデフォルトルートが見つかりません"
            return 1
        fi
    done
}

# 分離サブネットの接続性確認
test_isolated_subnet_connectivity() {
    log_section "分離サブネット接続性テスト"

    IFS=',' read -ra ISOLATED_SUBNET_ARRAY <<< "$ISOLATED_SUBNETS"

    for subnet_id in "${ISOLATED_SUBNET_ARRAY[@]}"; do
        log_info "分離サブネット $subnet_id の確認中..."

        # サブネットのルートテーブルを取得
        ROUTE_TABLE_ID=$(aws ec2 describe-route-tables \
            --filters "Name=association.subnet-id,Values=$subnet_id" \
            --region $REGION \
            --query 'RouteTables[0].RouteTableId' \
            --output text)

        if [[ "$ROUTE_TABLE_ID" == "None" || -z "$ROUTE_TABLE_ID" ]]; then
            log_warn "サブネット $subnet_id のルートテーブルが見つかりません"
            continue
        fi

        # インターネット向けルートが存在しないことを確認
        INTERNET_ROUTES=$(aws ec2 describe-route-tables \
            --route-table-ids $ROUTE_TABLE_ID \
            --region $REGION \
            --query 'RouteTables[0].Routes[?DestinationCidrBlock==`0.0.0.0/0`]' \
            --output json)

        if [[ $(echo $INTERNET_ROUTES | jq 'length') -eq 0 ]]; then
            log_info "サブネット $subnet_id: インターネット向けルートが存在しません（正常）"
        else
            log_warn "サブネット $subnet_id: 予期しないインターネット向けルートが存在します"
            echo $INTERNET_ROUTES | jq '.'
        fi

        # ローカルルートのみ存在することを確認
        LOCAL_ROUTES=$(aws ec2 describe-route-tables \
            --route-table-ids $ROUTE_TABLE_ID \
            --region $REGION \
            --query 'RouteTables[0].Routes[?GatewayId==`local`]' \
            --output json)

        if [[ $(echo $LOCAL_ROUTES | jq 'length') -gt 0 ]]; then
            log_info "サブネット $subnet_id: ローカルルートが正常に設定されています"
        else
            log_error "サブネット $subnet_id: ローカルルートが見つかりません"
            return 1
        fi
    done

    log_info "分離サブネットが正しく分離されています"
    return 0
}

# DNS解決テスト
test_dns_resolution() {
    log_section "DNS解決テスト"

    # VPCのDNS設定確認
    VPC_DNS_INFO=$(aws ec2 describe-vpcs \
        --vpc-ids $VPC_ID \
        --region $REGION \
        --query 'Vpcs[0]' \
        --output json)

    local dns_support=$(echo $VPC_DNS_INFO | jq -r '.DnsSupport.Value')
    local dns_hostnames=$(echo $VPC_DNS_INFO | jq -r '.DnsHostnames.Value')

    log_info "DNS Support: $dns_support"
    log_info "DNS Hostnames: $dns_hostnames"

    if [[ "$dns_support" == "true" ]]; then
        log_info "DNS解決が有効になっています"
    else
        log_error "DNS解決が無効になっています"
        return 1
    fi

    if [[ "$dns_hostnames" == "true" ]]; then
        log_info "DNSホスト名が有効になっています"
    else
        log_error "DNSホスト名が無効になっています"
        return 1
    fi

    # VPCのDHCPオプションセット確認
    DHCP_OPTIONS_ID=$(echo $VPC_DNS_INFO | jq -r '.DhcpOptionsId')
    log_info "DHCP Options Set ID: $DHCP_OPTIONS_ID"

    # DHCPオプションの詳細確認
    DHCP_OPTIONS=$(aws ec2 describe-dhcp-options \
        --dhcp-options-ids $DHCP_OPTIONS_ID \
        --region $REGION \
        --query 'DhcpOptions[0].DhcpConfigurations' \
        --output json)

    log_info "DHCP設定:"
    echo $DHCP_OPTIONS | jq -r '.[] | "  \(.Key): \(.Values[].Value // .Values[])"'

    return 0
}

# ネットワークACLの確認
test_network_acls() {
    log_section "ネットワークACL確認"

    # VPCのデフォルトネットワークACLを取得
    DEFAULT_NACL=$(aws ec2 describe-network-acls \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=default,Values=true" \
        --region $REGION \
        --query 'NetworkAcls[0]' \
        --output json)

    if [[ "$DEFAULT_NACL" != "null" ]]; then
        local nacl_id=$(echo $DEFAULT_NACL | jq -r '.NetworkAclId')
        log_info "デフォルトネットワークACL ID: $nacl_id"

        # インバウンドルールの確認
        local inbound_rules=$(echo $DEFAULT_NACL | jq '.Entries[] | select(.Egress==false)')
        local inbound_count=$(echo $DEFAULT_NACL | jq '[.Entries[] | select(.Egress==false)] | length')
        log_info "インバウンドルール数: $inbound_count"

        # アウトバウンドルールの確認
        local outbound_rules=$(echo $DEFAULT_NACL | jq '.Entries[] | select(.Egress==true)')
        local outbound_count=$(echo $DEFAULT_NACL | jq '[.Entries[] | select(.Egress==true)] | length')
        log_info "アウトバウンドルール数: $outbound_count"

        # デフォルトで全許可ルールが存在することを確認
        local allow_all_inbound=$(echo $DEFAULT_NACL | jq '[.Entries[] | select(.Egress==false and .RuleAction=="allow" and .CidrBlock=="0.0.0.0/0")] | length')
        local allow_all_outbound=$(echo $DEFAULT_NACL | jq '[.Entries[] | select(.Egress==true and .RuleAction=="allow" and .CidrBlock=="0.0.0.0/0")] | length')

        if [[ $allow_all_inbound -gt 0 && $allow_all_outbound -gt 0 ]]; then
            log_info "デフォルトネットワークACLで全通信が許可されています（正常）"
        else
            log_warn "デフォルトネットワークACLで制限されている通信があります"
        fi
    else
        log_error "デフォルトネットワークACLが見つかりません"
        return 1
    fi

    # カスタムネットワークACLの確認
    CUSTOM_NACLS=$(aws ec2 describe-network-acls \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=default,Values=false" \
        --region $REGION \
        --query 'NetworkAcls[].NetworkAclId' \
        --output text)

    if [[ -n "$CUSTOM_NACLS" ]]; then
        log_info "カスタムネットワークACL: $CUSTOM_NACLS"
    else
        log_info "カスタムネットワークACLは作成されていません"
    fi

    return 0
}

# 可用性ゾーン分散の確認
test_availability_zone_distribution() {
    log_section "アベイラビリティゾーン分散確認"

    # 各サブネットのAZ確認
    log_info "サブネットのAZ分散確認中..."

    # パブリックサブネットのAZ
    IFS=',' read -ra PUBLIC_SUBNET_ARRAY <<< "$PUBLIC_SUBNETS"
    PUBLIC_AZS=()
    for subnet_id in "${PUBLIC_SUBNET_ARRAY[@]}"; do
        local az=$(aws ec2 describe-subnets \
            --subnet-ids $subnet_id \
            --region $REGION \
            --query 'Subnets[0].AvailabilityZone' \
            --output text)
        PUBLIC_AZS+=("$az")
        log_info "パブリックサブネット $subnet_id: $az"
    done

    # プライベートサブネットのAZ
    IFS=',' read -ra PRIVATE_SUBNET_ARRAY <<< "$PRIVATE_SUBNETS"
    PRIVATE_AZS=()
    for subnet_id in "${PRIVATE_SUBNET_ARRAY[@]}"; do
        local az=$(aws ec2 describe-subnets \
            --subnet-ids $subnet_id \
            --region $REGION \
            --query 'Subnets[0].AvailabilityZone' \
            --output text)
        PRIVATE_AZS+=("$az")
        log_info "プライベートサブネット $subnet_id: $az"
    done

    # 分離サブネットのAZ
    IFS=',' read -ra ISOLATED_SUBNET_ARRAY <<< "$ISOLATED_SUBNETS"
    ISOLATED_AZS=()
    for subnet_id in "${ISOLATED_SUBNET_ARRAY[@]}"; do
        local az=$(aws ec2 describe-subnets \
            --subnet-ids $subnet_id \
            --region $REGION \
            --query 'Subnets[0].AvailabilityZone' \
            --output text)
        ISOLATED_AZS+=("$az")
        log_info "分離サブネット $subnet_id: $az"
    done

    # AZ分散の確認
    local unique_public_azs=$(printf '%s\n' "${PUBLIC_AZS[@]}" | sort -u | wc -l)
    local unique_private_azs=$(printf '%s\n' "${PRIVATE_AZS[@]}" | sort -u | wc -l)
    local unique_isolated_azs=$(printf '%s\n' "${ISOLATED_AZS[@]}" | sort -u | wc -l)

    log_info "パブリックサブネットのAZ数: $unique_public_azs"
    log_info "プライベートサブネットのAZ数: $unique_private_azs"
    log_info "分離サブネットのAZ数: $unique_isolated_azs"

    # 最低2つのAZに分散していることを確認
    if [[ $unique_public_azs -ge 2 && $unique_private_azs -ge 2 && $unique_isolated_azs -ge 2 ]]; then
        log_info "全てのサブネットタイプが複数のAZに分散されています"
    else
        log_warn "一部のサブネットタイプが単一AZに集中しています"
    fi

    return 0
}

# 接続性テストの実行
run_connectivity_tests() {
    log_section "接続性テスト実行"

    local test_results=()

    # 各テストの実行
    if get_vpc_info; then
        test_results+=("VPC情報取得: ✅")
    else
        test_results+=("VPC情報取得: ❌")
        return 1
    fi

    if test_internet_gateway_connectivity; then
        test_results+=("IGW接続性: ✅")
    else
        test_results+=("IGW接続性: ❌")
    fi

    if test_nat_gateway_connectivity; then
        test_results+=("NAT接続性: ✅")
    else
        test_results+=("NAT接続性: ❌")
    fi

    if test_isolated_subnet_connectivity; then
        test_results+=("分離サブネット: ✅")
    else
        test_results+=("分離サブネット: ❌")
    fi

    if test_dns_resolution; then
        test_results+=("DNS解決: ✅")
    else
        test_results+=("DNS解決: ❌")
    fi

    if test_network_acls; then
        test_results+=("ネットワークACL: ✅")
    else
        test_results+=("ネットワークACL: ❌")
    fi

    if test_availability_zone_distribution; then
        test_results+=("AZ分散: ✅")
    else
        test_results+=("AZ分散: ❌")
    fi

    # テスト結果の表示
    log_section "接続性テスト結果"
    for result in "${test_results[@]}"; do
        log_info "$result"
    done

    # 失敗したテストがあるかチェック
    local failed_tests=$(printf '%s\n' "${test_results[@]}" | grep -c "❌" || true)

    if [[ $failed_tests -eq 0 ]]; then
        log_info "✅ 全ての接続性テストが成功しました"
        return 0
    else
        log_error "❌ $failed_tests 個のテストが失敗しました"
        return 1
    fi
}

# メイン実行関数
main() {
    log_section "VPC接続性テスト開始"

    # 前提条件チェック
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLIがインストールされていません"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jqがインストールされていません"
        exit 1
    fi

    # AWS認証情報の確認
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS認証情報が設定されていません"
        exit 1
    fi

    # 接続性テストの実行
    if run_connectivity_tests; then
        echo -e "\033[32m"
        echo "=========================="
        echo "  VPC接続性テスト成功"
        echo "=========================="
        echo -e "\033[0m"
        exit 0
    else
        echo -e "\033[31m"
        echo "=========================="
        echo "  VPC接続性テスト失敗"
        echo "=========================="
        echo -e "\033[0m"
        exit 1
    fi
}

# スクリプトの実行
main "$@"
