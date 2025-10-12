# Docker環境管理用Makefile

.PHONY: help up down restart logs clean build health status dev prod

# デフォルトターゲット
help: ## このヘルプメッセージを表示
	@echo "利用可能なコマンド:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# 開発環境操作
up: ## 開発環境を起動
	docker-compose up -d
	@echo "開発環境が起動しました"
	@echo "PostgreSQL: http://localhost:5432"
	@echo "Cognito Local: http://localhost:9229"

down: ## 環境を停止
	docker-compose down
	@echo "環境を停止しました"

restart: ## 環境を再起動
	docker-compose restart
	@echo "環境を再起動しました"

logs: ## ログを表示
	docker-compose logs -f

logs-postgres: ## PostgreSQLのログを表示
	docker-compose logs -f postgres

logs-cognito: ## Cognito Localのログを表示
	docker-compose logs -f cognito-local

# 環境管理
clean: ## 全てのコンテナ、ボリューム、ネットワークを削除
	docker-compose down -v --remove-orphans
	docker system prune -f
	@echo "環境をクリーンアップしました"

clean-volumes: ## ボリュームのみを削除
	docker-compose down -v
	@echo "ボリュームを削除しました"

build: ## イメージを再ビルド
	docker-compose build --no-cache
	@echo "イメージを再ビルドしました"

# ヘルスチェック
health: ## サービスのヘルスチェック
	@echo "=== サービスヘルスチェック ==="
	@docker-compose ps
	@echo ""
	@echo "=== PostgreSQL接続テスト ==="
	@docker-compose exec postgres pg_isready -U goal_mandala_user -d goal_mandala_dev || echo "PostgreSQL接続失敗"
	@echo ""
	@echo "=== Cognito Local接続テスト ==="
	@curl -f http://localhost:9229/health 2>/dev/null && echo "Cognito Local: OK" || echo "Cognito Local: NG"

status: ## サービス状態を表示
	docker-compose ps
	@echo ""
	@echo "=== リソース使用状況 ==="
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# 環境別起動
dev: ## 開発環境を起動（オーバーライド設定付き）
	docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
	@echo "開発環境（オーバーライド設定）が起動しました"

prod: ## 本番環境設定で起動
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "本番環境設定で起動しました"

# データベース操作
db-connect: ## PostgreSQLに接続
	docker-compose exec postgres psql -U goal_mandala_user -d goal_mandala_dev

db-dump: ## データベースをダンプ
	docker-compose exec postgres pg_dump -U goal_mandala_user goal_mandala_dev > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "データベースをダンプしました"

db-restore: ## データベースを復元（BACKUP_FILE=ファイル名を指定）
	@if [ -z "$(BACKUP_FILE)" ]; then echo "使用方法: make db-restore BACKUP_FILE=backup.sql"; exit 1; fi
	docker-compose exec -T postgres psql -U goal_mandala_user -d goal_mandala_dev < $(BACKUP_FILE)
	@echo "データベースを復元しました"

# 開発支援
shell-postgres: ## PostgreSQLコンテナのシェルに接続
	docker-compose exec postgres sh

shell-cognito: ## Cognito Localコンテナのシェルに接続
	docker-compose exec cognito-local sh

# 設定確認
config: ## Docker Compose設定を表示
	docker-compose config

config-dev: ## 開発環境設定を表示
	docker-compose -f docker-compose.yml -f docker-compose.override.yml config

config-prod: ## 本番環境設定を表示
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml config
