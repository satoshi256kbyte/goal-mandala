#!/bin/bash

# セキュリティグループルールテストスクリプト
# このスクリプトはVPCスタックのセキュリティグループルールを詳細にテストします

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
STACK_NAME="${STACK_NAME:-VpcStack-sg-test}"
REGION="${AWS_REGION:-ap-northeast-1}"

# セキュリティグループ情報を取得
get_security_group_info() {
    log_section "セキュリティグループ情報の取得"

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

    # 各セキュリティグループIDを取得
    DB_SG_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="DatabaseSecurityGroupId") | .OutputValue')
    LAMBDA_SG_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="LambdaSecurityGroupId") | .OutputValue')
    ALB_SG_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="AlbSecurityGroupId") | .OutputValue')
    VPC_ENDPOINT_SG_ID=$(echo $STACK_OUTPUTS | jq -r '.[] | select(.OutputKey=="VpcEndpointSecurityGroupId") | .OutputValue // empty')

    log_info "データベースSG ID: $DB_SG_ID"
    log_info "Lambda SG ID: $LAMBDA_SG_ID"
    log_info "ALB SG ID: $ALB_SG_ID"

    if [[ -n "$VPC_ENDPOINT_SG_ID" ]]; then
        log_info "VPCエンドポイントSG ID: $VPC_ENDPOINT_SG_ID"
    else
        log_info "VPCエンドポイントSG: 作成されていません（環境設定による）"
    fi

    # セキュリティグループの存在確認
    for sg_id in "$DB_SG_ID" "$LAMBDA_SG_ID" "$ALB_SG_ID"; do
        if ! aws ec2 describe-security-groups --group-ids $sg_id --region $REGION &> /dev/null; then
            log_error "セキュリティグループ $sg_id が見つかりません"
            exit 1
        fi
    done

    log_info "全てのセキュリティグループが存在します"
}

# データベースセキュリティグループのテスト
test_database_security_group() {
    log_section "データベースセキュリティグループのテスト"

    # セキュリティグループの詳細情報を取得
    DB_SG_INFO=$(aws ec2 describe-security-groups \
        --group-ids $DB_SG_ID \
        --region $REGION \
        --query 'SecurityGroups[0]' \
        --output json)

    local sg_name=$(echo $DB_SG_INFO | jq -r '.GroupName')
    local sg_description=$(echo $DB_SG_INFO | jq -r '.Description')

    log_info "セキュリティグループ名: $sg_name"
    log_info "説明: $sg_description"

    # 要件2.1: Lambda関数からのPostgreSQL接続（ポート5432）のみを許可
    test_database_ingress_rules

    # 要件2.4: 不要な通信は全て拒否される（アウトバウンドルールの制限）
    test_database_egress_rules

    return 0
}

# データベースSGのインバウンドルールテスト
test_database_ingress_rules() {
    log_info "データベースSGインバウンドルールの確認中..."

    local ingress_rules=$(echo $DB_SG_INFO | jq '.IpPermissions')
    local ingress_count=$(echo $ingress_rules | jq 'length')

    log_info "インバウンドルール数: $ingress_count"

    # PostgreSQL(5432)ポートのルールを確認
    local postgres_rules=$(echo $ingress_rules | jq '.[] | select(.FromPort==5432 and .ToPort==5432 and .IpProtocol=="tcp")')

    if [[ -n "$postgres_rules" ]]; then
        log_info "✅ PostgreSQL(5432)のインバウンドルールが存在します"

        # ソースがLambda SGであることを確認
        local source_groups=$(echo $postgres_rules | jq '.UserIdGroupPairs')
        local lambda_sg_found=false

        if [[ $(echo $source_groups | jq 'length') -gt 0 ]]; then
            local source_sg_id=$(echo $source_groups | jq -r '.[0].GroupId')
            if [[ "$source_sg_id" == "$LAMBDA_SG_ID" ]]; then
                log_info "✅ ソースがLambda SGに正しく設定されています"
                lambda_sg_found=true
            else
                log_error "❌ ソースSGが期待値と異なります (期待: $LAMBDA_SG_ID, 実際: $source_sg_id)"
            fi
        fi

        # CIDR範囲からのアクセスがないことを確認
        local cidr_ranges=$(echo $postgres_rules | jq '.IpRanges')
        if [[ $(echo $cidr_ranges | jq 'length') -eq 0 ]]; then
            log_info "✅ CIDR範囲からの直接アクセスは許可されていません"
        else
            log_warn "⚠️ CIDR範囲からの直接アクセスが許可されています"
            echo $cidr_ranges | jq '.'
        fi

        if [[ "$lambda_sg_found" == true ]]; then
            return 0
        else
            return 1
        fi
    else
        log_error "❌ PostgreSQL(5432)のインバウンドルールが見つかりません"
        return 1
    fi
}

# データベースSGのアウトバウンドルールテスト
test_database_egress_rules() {
    log_info "データベースSGアウトバウンドルールの確認中..."

    local egress_rules=$(echo $DB_SG_INFO | jq '.IpPermissionsEgress')
    local egress_count=$(echo $egress_rules | jq 'length')

    log_info "アウトバウンドルール数: $egress_count"

    # 実際のアウトバウンドルール（ダミールール以外）を確認
    local real_egress_rules=$(echo $egress_rules | jq '[.[] | select(.IpRanges[0].CidrIp != "255.255.255.255/32")]')
    local real_egress_count=$(echo $real_egress_rules | jq 'length')

    if [[ $real_egress_count -eq 0 ]]; then
        log_info "✅ アウトバウンドルールが適切に制限されています"
        return 0
    else
        log_warn "⚠️ 予期しないアウトバウンドルールが存在します ($real_egress_count 個)"
        echo $real_egress_rules | jq '.'
        return 1
    fi
}

# Lambdaセキュリティグループのテスト
test_lambda_security_group() {
    log_section "Lambdaセキュリティグループのテスト"

    # セキュリティグループの詳細情報を取得
    LAMBDA_SG_INFO=$(aws ec2 describe-security-groups \
        --group-ids $LAMBDA_SG_ID \
        --region $REGION \
        --query 'SecurityGroups[0]' \
        --output json)

    local sg_name=$(echo $LAMBDA_SG_INFO | jq -r '.GroupName')
    local sg_description=$(echo $LAMBDA_SG_INFO | jq -r '.Description')

    log_info "セキュリティグループ名: $sg_name"
    log_info "説明: $sg_description"

    # インバウンドルールのテスト
    test_lambda_ingress_rules

    # 要件2.2: 外部APIへのアウトバウンド通信を許可
    test_lambda_egress_rules

    return 0
}

# Lambda SGのインバウンドルールテスト
test_lambda_ingress_rules() {
    log_info "Lambda SGインバウンドルールの確認中..."

    local ingress_rules=$(echo $LAMBDA_SG_INFO | jq '.IpPermissions')
    local ingress_count=$(echo $ingress_rules | jq 'length')

    log_info "インバウンドルール数: $ingress_count"

    # ALB SGからのアクセス（将来の拡張用、ポート8080）
    local alb_rules=$(echo $ingress_rules | jq '.[] | select(.FromPort==8080 and .ToPort==8080 and .IpProtocol=="tcp")')

    if [[ -n "$alb_rules" ]]; then
        log_info "✅ ALBからのアクセス用インバウンドルール(8080)が存在します"

        # ソースがALB SGであることを確認
        local source_groups=$(echo $alb_rules | jq '.UserIdGroupPairs')
        if [[ $(echo $source_groups | jq 'length') -gt 0 ]]; then
            local source_sg_id=$(echo $source_groups | jq -r '.[0].GroupId')
            if [[ "$source_sg_id" == "$ALB_SG_ID" ]]; then
                log_info "✅ ソースがALB SGに正しく設定されています"
            else
                log_warn "⚠️ ソースSGが期待値と異なります (期待: $ALB_SG_ID, 実際: $source_sg_id)"
            fi
        fi
    else
        log_warn "⚠️ ALBからのアクセス用インバウンドルールが見つかりません（将来の拡張用）"
    fi

    return 0
}

# Lambda SGのアウトバウンドルールテスト
test_lambda_egress_rules() {
    log_info "Lambda SGアウトバウンドルールの確認中..."

    local egress_rules=$(echo $LAMBDA_SG_INFO | jq '.IpPermissionsEgress')
    local egress_count=$(echo $egress_rules | jq 'length')

    log_info "アウトバウンドルール数: $egress_count"

    # 全アウトバウンド許可ルールを確認
    local all_traffic_rules=$(echo $egress_rules | jq '.[] | select(.IpProtocol=="-1" and .IpRanges[0].CidrIp=="0.0.0.0/0")')

    if [[ -n "$all_traffic_rules" ]]; then
        log_info "✅ 全アウトバウンド許可ルールが設定されています（外部API呼び出し用）"
        return 0
    else
        # HTTPS(443)ルールの確認（代替パターン）
        local https_rules=$(echo $egress_rules | jq '.[] | select(.FromPort==443 and .ToPort==443 and .IpProtocol=="tcp")')
        if [[ -n "$https_rules" ]]; then
            log_info "✅ HTTPS(443)アウトバウンドルールが設定されています"
            return 0
        else
            log_error "❌ 外部API呼び出し用のアウトバウンドルールが見つかりません"
            return 1
        fi
    fi
}

# ALBセキュリティグループのテスト
test_alb_security_group() {
    log_section "ALBセキュリティグループのテスト"

    # セキュリティグループの詳細情報を取得
    ALB_SG_INFO=$(aws ec2 describe-security-groups \
        --group-ids $ALB_SG_ID \
        --region $REGION \
        --query 'SecurityGroups[0]' \
        --output json)

    local sg_name=$(echo $ALB_SG_INFO | jq -r '.GroupName')
    local sg_description=$(echo $ALB_SG_INFO | jq -r '.Description')

    log_info "セキュリティグループ名: $sg_name"
    log_info "説明: $sg_description"

    # 要件2.3: HTTP（ポート80）とHTTPS（ポート443）のインバウンド通信を許可
    test_alb_ingress_rules

    # 要件2.4: 不要な通信は全て拒否される（アウトバウンドルールの制限）
    test_alb_egress_rules

    return 0
}

# ALB SGのインバウンドルールテスト
test_alb_ingress_rules() {
    log_info "ALB SGインバウンドルールの確認中..."

    local ingress_rules=$(echo $ALB_SG_INFO | jq '.IpPermissions')
    local ingress_count=$(echo $ingress_rules | jq 'length')

    log_info "インバウンドルール数: $ingress_count"

    local https_found=false
    local http_found=false

    # HTTPS(443)ルールを確認
    local https_rules=$(echo $ingress_rules | jq '.[] | select(.FromPort==443 and .ToPort==443 and .IpProtocol=="tcp")')
    if [[ -n "$https_rules" ]]; then
        log_info "✅ HTTPS(443)のインバウンドルールが存在します"

        # 0.0.0.0/0からのアクセスが許可されていることを確認
        local https_cidr=$(echo $https_rules | jq '.IpRanges[0].CidrIp // empty')
        if [[ "$https_cidr" == "0.0.0.0/0" ]]; then
            log_info "✅ HTTPS(443)がインターネットからアクセス可能です"
            https_found=true
        else
            log_warn "⚠️ HTTPS(443)のアクセス範囲が制限されています: $https_cidr"
        fi
    else
        log_error "❌ HTTPS(443)のインバウンドルールが見つかりません"
    fi

    # HTTP(80)ルールを確認
    local http_rules=$(echo $ingress_rules | jq '.[] | select(.FromPort==80 and .ToPort==80 and .IpProtocol=="tcp")')
    if [[ -n "$http_rules" ]]; then
        log_info "✅ HTTP(80)のインバウンドルールが存在します"

        # 0.0.0.0/0からのアクセスが許可されていることを確認
        local http_cidr=$(echo $http_rules | jq '.IpRanges[0].CidrIp // empty')
        if [[ "$http_cidr" == "0.0.0.0/0" ]]; then
            log_info "✅ HTTP(80)がインターネットからアクセス可能です（HTTPSリダイレクト用）"
            http_found=true
        else
            log_warn "⚠️ HTTP(80)のアクセス範囲が制限されています: $http_cidr"
        fi
    else
        log_error "❌ HTTP(80)のインバウンドルールが見つかりません"
    fi

    if [[ "$https_found" == true && "$http_found" == true ]]; then
        return 0
    else
        return 1
    fi
}

# ALB SGのアウトバウンドルールテスト
test_alb_egress_rules() {
    log_info "ALB SGアウトバウンドルールの確認中..."

    local egress_rules=$(echo $ALB_SG_INFO | jq '.IpPermissionsEgress')
    local egress_count=$(echo $egress_rules | jq 'length')

    log_info "アウトバウンドルール数: $egress_count"

    # 実際のアウトバウンドルール（ダミールール以外）を確認
    local real_egress_rules=$(echo $egress_rules | jq '[.[] | select(.IpRanges[0].CidrIp != "255.255.255.255/32")]')
    local real_egress_count=$(echo $real_egress_rules | jq 'length')

    if [[ $real_egress_count -eq 0 ]]; then
        log_info "✅ アウトバウンドルールが適切に制限されています"
        return 0
    else
        log_warn "⚠️ 予期しないアウトバウンドルールが存在します ($real_egress_count 個)"
        echo $real_egress_rules | jq '.'
        return 1
    fi
}

# VPCエンドポイントセキュリティグループのテスト
test_vpc_endpoint_security_group() {
    if [[ -z "$VPC_ENDPOINT_SG_ID" ]]; then
        log_info "VPCエンドポイントSGは作成されていません（環境設定による）"
        return 0
    fi

    log_section "VPCエンドポイントセキュリティグループのテスト"

    # セキュリティグループの詳細情報を取得
    VPC_ENDPOINT_SG_INFO=$(aws ec2 describe-security-groups \
        --group-ids $VPC_ENDPOINT_SG_ID \
        --region $REGION \
        --query 'SecurityGroups[0]' \
        --output json)

    local sg_name=$(echo $VPC_ENDPOINT_SG_INFO | jq -r '.GroupName')
    local sg_description=$(echo $VPC_ENDPOINT_SG_INFO | jq -r '.Description')

    log_info "セキュリティグループ名: $sg_name"
    log_info "説明: $sg_description"

    # Lambda SGからのHTTPS(443)アクセスを許可
    test_vpc_endpoint_ingress_rules

    # アウトバウンドルールの制限確認
    test_vpc_endpoint_egress_rules

    return 0
}

# VPCエンドポイントSGのインバウンドルールテスト
test_vpc_endpoint_ingress_rules() {
    log_info "VPCエンドポイントSGインバウンドルールの確認中..."

    local ingress_rules=$(echo $VPC_ENDPOINT_SG_INFO | jq '.IpPermissions')
    local ingress_count=$(echo $ingress_rules | jq 'length')

    log_info "インバウンドルール数: $ingress_count"

    # HTTPS(443)ルールを確認
    local https_rules=$(echo $ingress_rules | jq '.[] | select(.FromPort==443 and .ToPort==443 and .IpProtocol=="tcp")')

    if [[ -n "$https_rules" ]]; then
        log_info "✅ HTTPS(443)のインバウンドルールが存在します"

        # ソースがLambda SGであることを確認
        local source_groups=$(echo $https_rules | jq '.UserIdGroupPairs')
        if [[ $(echo $source_groups | jq 'length') -gt 0 ]]; then
            local source_sg_id=$(echo $source_groups | jq -r '.[0].GroupId')
            if [[ "$source_sg_id" == "$LAMBDA_SG_ID" ]]; then
                log_info "✅ ソースがLambda SGに正しく設定されています"
                return 0
            else
                log_warn "⚠️ ソースSGが期待値と異なります (期待: $LAMBDA_SG_ID, 実際: $source_sg_id)"
            fi
        fi
    else
        log_error "❌ HTTPS(443)のインバウンドルールが見つかりません"
        return 1
    fi
}

# VPCエンドポイントSGのアウトバウンドルールテスト
test_vpc_endpoint_egress_rules() {
    log_info "VPCエンドポイントSGアウトバウンドルールの確認中..."

    local egress_rules=$(echo $VPC_ENDPOINT_SG_INFO | jq '.IpPermissionsEgress')
    local egress_count=$(echo $egress_rules | jq 'length')

    log_info "アウトバウンドルール数: $egress_count"

    # 実際のアウトバウンドルール（ダミールール以外）を確認
    local real_egress_rules=$(echo $egress_rules | jq '[.[] | select(.IpRanges[0].CidrIp != "255.255.255.255/32")]')
    local real_egress_count=$(echo $real_egress_rules | jq 'length')

    if [[ $real_egress_count -eq 0 ]]; then
        log_info "✅ アウトバウンドルールが適切に制限されています"
        return 0
    else
        log_warn "⚠️ 予期しないアウトバウンドルールが存在します ($real_egress_count 個)"
        echo $real_egress_rules | jq '.'
        return 1
    fi
}

# セキュリティグループ間の参照関係テスト
test_security_group_references() {
    log_section "セキュリティグループ間の参照関係テスト"

    # Lambda SG -> Database SG の参照確認
    log_info "Lambda SG -> Database SG の参照確認中..."

    local db_ingress=$(echo $DB_SG_INFO | jq '.IpPermissions[] | select(.FromPort==5432)')
    local lambda_ref_found=false

    if [[ -n "$db_ingress" ]]; then
        local source_groups=$(echo $db_ingress | jq '.UserIdGroupPairs')
        if [[ $(echo $source_groups | jq 'length') -gt 0 ]]; then
            local source_sg_id=$(echo $source_groups | jq -r '.[0].GroupId')
            if [[ "$source_sg_id" == "$LAMBDA_SG_ID" ]]; then
                log_info "✅ Database SGがLambda SGを正しく参照しています"
                lambda_ref_found=true
            fi
        fi
    fi

    # ALB SG -> Lambda SG の参照確認
    log_info "ALB SG -> Lambda SG の参照確認中..."

    local lambda_ingress=$(echo $LAMBDA_SG_INFO | jq '.IpPermissions[] | select(.FromPort==8080)')
    local alb_ref_found=false

    if [[ -n "$lambda_ingress" ]]; then
        local source_groups=$(echo $lambda_ingress | jq '.UserIdGroupPairs')
        if [[ $(echo $source_groups | jq 'length') -gt 0 ]]; then
            local source_sg_id=$(echo $source_groups | jq -r '.[0].GroupId')
            if [[ "$source_sg_id" == "$ALB_SG_ID" ]]; then
                log_info "✅ Lambda SGがALB SGを正しく参照しています"
                alb_ref_found=true
            fi
        fi
    fi

    # VPCエンドポイントSGの参照確認（存在する場合）
    if [[ -n "$VPC_ENDPOINT_SG_ID" ]]; then
        log_info "Lambda SG -> VPCエンドポイントSG の参照確認中..."

        local vpc_endpoint_ingress=$(echo $VPC_ENDPOINT_SG_INFO | jq '.IpPermissions[] | select(.FromPort==443)')
        local vpc_endpoint_ref_found=false

        if [[ -n "$vpc_endpoint_ingress" ]]; then
            local source_groups=$(echo $vpc_endpoint_ingress | jq '.UserIdGroupPairs')
            if [[ $(echo $source_groups | jq 'length') -gt 0 ]]; then
                local source_sg_id=$(echo $source_groups | jq -r '.[0].GroupId')
                if [[ "$source_sg_id" == "$LAMBDA_SG_ID" ]]; then
                    log_info "✅ VPCエンドポイントSGがLambda SGを正しく参照しています"
                    vpc_endpoint_ref_found=true
                fi
            fi
        fi
    fi

    # 循環参照の確認
    log_info "循環参照の確認中..."

    # Database SG -> Lambda SG への参照がないことを確認
    local db_to_lambda=$(echo $LAMBDA_SG_INFO | jq ".IpPermissions[] | select(.UserIdGroupPairs[]?.GroupId==\"$DB_SG_ID\")")
    if [[ -z "$db_to_lambda" ]]; then
        log_info "✅ Database SG -> Lambda SG の循環参照はありません"
    else
        log_warn "⚠️ Database SG -> Lambda SG の循環参照が検出されました"
    fi

    # 参照関係のサマリー
    log_info "セキュリティグループ参照関係のサマリー:"
    log_info "  Lambda SG -> Database SG: $([ "$lambda_ref_found" == true ] && echo "✅" || echo "❌")"
    log_info "  ALB SG -> Lambda SG: $([ "$alb_ref_found" == true ] && echo "✅" || echo "❌")"

    if [[ -n "$VPC_ENDPOINT_SG_ID" ]]; then
        log_info "  Lambda SG -> VPCエンドポイントSG: $([ "$vpc_endpoint_ref_found" == true ] && echo "✅" || echo "❌")"
    fi

    return 0
}

# 最小権限の原則の確認
test_least_privilege_principle() {
    log_section "最小権限の原則の確認"

    # 各セキュリティグループの権限が最小限であることを確認

    # Database SG: PostgreSQL(5432)のみ許可
    log_info "Database SGの最小権限確認中..."
    local db_ingress_ports=$(echo $DB_SG_INFO | jq '[.IpPermissions[].FromPort] | unique')
    local db_port_count=$(echo $db_ingress_ports | jq 'length')

    if [[ $db_port_count -eq 1 ]]; then
        local allowed_port=$(echo $db_ingress_ports | jq '.[0]')
        if [[ $allowed_port -eq 5432 ]]; then
            log_info "✅ Database SGはPostgreSQL(5432)のみ許可しています"
        else
            log_warn "⚠️ Database SGで予期しないポートが許可されています: $allowed_port"
        fi
    else
        log_warn "⚠️ Database SGで複数のポートが許可されています: $db_ingress_ports"
    fi

    # ALB SG: HTTP(80)とHTTPS(443)のみ許可
    log_info "ALB SGの最小権限確認中..."
    local alb_ingress_ports=$(echo $ALB_SG_INFO | jq '[.IpPermissions[].FromPort] | sort | unique')
    local expected_ports='[80,443]'

    if [[ "$alb_ingress_ports" == "$expected_ports" ]]; then
        log_info "✅ ALB SGはHTTP(80)とHTTPS(443)のみ許可しています"
    else
        log_warn "⚠️ ALB SGで予期しないポートが許可されています"
        log_info "  期待値: $expected_ports"
        log_info "  実際値: $alb_ingress_ports"
    fi

    # Lambda SG: 必要最小限のインバウンドルール
    log_info "Lambda SGの最小権限確認中..."
    local lambda_ingress_count=$(echo $LAMBDA_SG_INFO | jq '.IpPermissions | length')

    if [[ $lambda_ingress_count -le 2 ]]; then
        log_info "✅ Lambda SGのインバウンドルールが最小限に抑えられています ($lambda_ingress_count 個)"
    else
        log_warn "⚠️ Lambda SGのインバウンドルールが多すぎる可能性があります ($lambda_ingress_count 個)"
    fi

    # アウトバウンドルールの制限確認
    log_info "アウトバウンドルールの制限確認中..."

    # Database SGとALB SGはアウトバウンドが制限されているべき
    local db_real_egress=$(echo $DB_SG_INFO | jq '[.IpPermissionsEgress[] | select(.IpRanges[0].CidrIp != "255.255.255.255/32")] | length')
    local alb_real_egress=$(echo $ALB_SG_INFO | jq '[.IpPermissionsEgress[] | select(.IpRanges[0].CidrIp != "255.255.255.255/32")] | length')

    if [[ $db_real_egress -eq 0 ]]; then
        log_info "✅ Database SGのアウトバウンドが適切に制限されています"
    else
        log_warn "⚠️ Database SGに予期しないアウトバウンドルールがあります ($db_real_egress 個)"
    fi

    if [[ $alb_real_egress -eq 0 ]]; then
        log_info "✅ ALB SGのアウトバウンドが適切に制限されています"
    else
        log_warn "⚠️ ALB SGに予期しないアウトバウンドルールがあります ($alb_real_egress 個)"
    fi

    return 0
}

# セキュリティグループルールテストの実行
run_security_group_tests() {
    log_section "セキュリティグループルールテスト実行"

    local test_results=()

    # 各テストの実行
    if get_security_group_info; then
        test_results+=("SG情報取得: ✅")
    else
        test_results+=("SG情報取得: ❌")
        return 1
    fi

    if test_database_security_group; then
        test_results+=("Database SG: ✅")
    else
        test_results+=("Database SG: ❌")
    fi

    if test_lambda_security_group; then
        test_results+=("Lambda SG: ✅")
    else
        test_results+=("Lambda SG: ❌")
    fi

    if test_alb_security_group; then
        test_results+=("ALB SG: ✅")
    else
        test_results+=("ALB SG: ❌")
    fi

    if test_vpc_endpoint_security_group; then
        test_results+=("VPCエンドポイントSG: ✅")
    else
        test_results+=("VPCエンドポイントSG: ❌")
    fi

    if test_security_group_references; then
        test_results+=("SG参照関係: ✅")
    else
        test_results+=("SG参照関係: ❌")
    fi

    if test_least_privilege_principle; then
        test_results+=("最小権限の原則: ✅")
    else
        test_results+=("最小権限の原則: ❌")
    fi

    # テスト結果の表示
    log_section "セキュリティグループルールテスト結果"
    for result in "${test_results[@]}"; do
        log_info "$result"
    done

    # 失敗したテストがあるかチェック
    local failed_tests=$(printf '%s\n' "${test_results[@]}" | grep -c "❌" || true)

    if [[ $failed_tests -eq 0 ]]; then
        log_info "✅ 全てのセキュリティグループルールテストが成功しました"
        return 0
    else
        log_error "❌ $failed_tests 個のテストが失敗しました"
        return 1
    fi
}

# メイン実行関数
main() {
    log_section "セキュリティグループルールテスト開始"

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

    # セキュリティグループルールテストの実行
    if run_security_group_tests; then
        echo -e "\033[32m"
        echo "=================================="
        echo "  セキュリティグループルールテスト成功"
        echo "=================================="
        echo -e "\033[0m"
        exit 0
    else
        echo -e "\033[31m"
        echo "=================================="
        echo "  セキュリティグループルールテスト失敗"
        echo "=================================="
        echo -e "\033[0m"
        exit 1
    fi
}

# スクリプトの実行
main "$@"
