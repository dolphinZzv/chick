.PHONY: all build build-prod test test-all test-integration generate coverage coverage-html clean \
        check ui-build start stop prod dev prod-service dev-service deploy

# ─── 门禁检查（启动前）────────────────────────────────────

# 启动前门禁：vet + 编译 + 测试 + 验证 + 前端类型检查
check:
	@echo "=== 门禁检查: go vet ==="
	go vet ./...
	@echo "=== 门禁检查: go build ==="
	go build -o /dev/null ./cmd/server/
	@echo "=== 门禁检查: Go 测试 ==="
	go test -race -count=1 ./internal/...
	@echo "=== 门禁检查: 验证 ==="
	go test -v -count=1 ./verif/
	@echo "=== 门禁检查: 前端类型检查 ==="
	cd ui && npx tsc --noEmit
	@echo "=== 门禁检查: 全部通过 ==="

# ─── 前端构建 ──────────────────────────────────────────────

ui-build:
	@echo "=== 构建前端 ==="
	cd ui && npm run build

# ─── 后端构建 ──────────────────────────────────────────────

build:
	go build -o bin/chick ./cmd/server/

# ─── 启动 / 停止 ────────────────────────────────────────────

# 启动前门禁 + 构建前端 + 构建后端 + 启动 + 启动后健康检查
start: check ui-build build
	@echo "=== 释放端口 8082 ==="
	@pid=$$(lsof -ti:8082 2>/dev/null || true); \
	if [ -n "$$pid" ]; then \
		echo "  Port 8082 occupied by PID $$pid, killing..."; \
		kill $$pid 2>/dev/null || true; \
		sleep 1; \
	fi
	@echo "=== 启动应用 ==="
	CHICK_PORT=8082 \
	CHICK_ALLOW_HUMAN_REGISTRATION=true \
		CHICK_ALLOWED_ORIGINS="*" \
	CHICK_JWT_SECRET=$${CHICK_JWT_SECRET:-chick-dev-secret-key-2024} \
	nohup ./bin/chick &>/tmp/chick-server.log &
	@sleep 1
	@echo "  PID: $$!"
	@sleep 3
	@echo "=== 启动后检查: 健康端点 ==="
	@status=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/health 2>/dev/null); \
	if [ "$$status" = "200" ]; then \
		echo "  ✅ 健康检查通过 (HTTP $$status)"; \
	else \
		echo "  ❌ 健康检查失败 (HTTP $$status)"; \
		exit 1; \
	fi
	@echo "=== 启动后检查: 页面 ==="
	@status=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/ 2>/dev/null); \
	if [ "$$status" = "200" ]; then \
		echo "  ✅ 页面返回 200"; \
	else \
		echo "  ❌ 页面返回 $$status"; \
		exit 1; \
	fi
	@echo "=== 启动完成: http://0.0.0.0:8082 ==="

stop:
	@echo "=== 停止开发进程 ==="
	@pkill -f "bin/chick" 2>/dev/null || true
	@echo "=== 停止生产服务 ==="
	-sudo systemctl stop chick-prod 2>/dev/null || true
	@echo "  ✅ 已停止"

# ─── 测试 ──────────────────────────────────────────────────

test:
	go test -race -count=1 ./internal/...

test-all:
	go test -race -count=1 ./internal/...

test-integration:
	go test -tags=integration -race -count=1 ./internal/...

# ─── 代码生成 ──────────────────────────────────────────────

generate:
	cd ui && npx graphql-codegen
	go run github.com/99designs/gqlgen generate

# ─── 覆盖率 ────────────────────────────────────────────────

coverage:
	go test -count=1 -coverprofile=coverage.out ./internal/...
	go tool cover -func=coverage.out | grep total

coverage-html:
	go test -count=1 -coverprofile=coverage.out ./internal/...
	go tool cover -html=coverage.out

# ─── systemd 服务 ─────────────────────────────────────

# 生产服务 (端口 18082)
.PHONY: prod-service

prod-service:
	cp deploy/chick-prod.service /etc/systemd/system/chick-prod.service
	@test -f /etc/default/chick-prod || echo "CHICK_JWT_SECRET=chick-dev-secret-key-2024" > /etc/default/chick-prod
	systemctl daemon-reload
	systemctl enable chick-prod

# 开发服务 (端口 8082)
.PHONY: dev-service

dev-service:
	cp deploy/chick-dev.service /etc/systemd/system/chick-dev.service
	systemctl daemon-reload
	systemctl enable chick-dev
	systemctl restart chick-dev 2>/dev/null || true

# 生产部署：构建 → 复制 → 重启 → 健康检查
.PHONY: prod

# 默认 PostgreSQL DSN，可通过 CHICK_DB_DSN 覆盖
prod: build-prod ui-build prod-service
	@echo "=== 更新前端资源 ==="
	sudo install -d /opt/chick/ui/dist
	sudo install -m 755 bin/chick-prod /opt/chick/chick-server
	sudo cp -r ui/dist/* /opt/chick/ui/dist/
	@echo "=== 重启服务 ==="
	sudo systemctl restart chick-prod
	@sleep 2
	@echo "=== 健康检查 ==="
	@status=$$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18082/health 2>/dev/null); \
	if [ "$$status" = "200" ]; then \
		echo "  ✅ 生产服务运行正常 (HTTP $$status)"; \
	else \
		echo "  ❌ 健康检查失败 (HTTP $$status)，查看日志: journalctl -u chick-prod -n 50"; \
	fi
	@echo "=== 部署完成: http://0.0.0.0:18082 ==="

build-prod:
	go build -ldflags="-s -w" -o bin/chick-prod ./cmd/server/

# ─── 远程部署（101 生产机）─────────────────────────────────

DEPLOY_HOST ?= 47.95.200.101
DEPLOY_SSH_PORT ?= 10022
DEPLOY_USER ?= root
DEPLOY_PATH ?= /opt/chick
DEPLOY_SERVICE ?= chick-prod
DEPLOY_HEALTH_PORT ?= 18080

.PHONY: deploy

deploy: build-prod ui-build
	@echo "=== 部署到 $(DEPLOY_HOST):$(DEPLOY_SSH_PORT) ==="
	ssh -p $(DEPLOY_SSH_PORT) $(DEPLOY_USER)@$(DEPLOY_HOST) "install -d $(DEPLOY_PATH)/ui/dist"
	ssh -p $(DEPLOY_SSH_PORT) $(DEPLOY_USER)@$(DEPLOY_HOST) "systemctl stop $(DEPLOY_SERVICE)"
	cat bin/chick-prod | ssh -p $(DEPLOY_SSH_PORT) $(DEPLOY_USER)@$(DEPLOY_HOST) "cat > $(DEPLOY_PATH)/chick-server && chmod +x $(DEPLOY_PATH)/chick-server"
	tar c -C ui/dist . | ssh -p $(DEPLOY_SSH_PORT) $(DEPLOY_USER)@$(DEPLOY_HOST) "tar x -C $(DEPLOY_PATH)/ui/dist"
	@echo "=== 启动服务 ==="
	ssh -p $(DEPLOY_SSH_PORT) $(DEPLOY_USER)@$(DEPLOY_HOST) "systemctl start $(DEPLOY_SERVICE)"
	@sleep 2
	@echo "=== 健康检查 ==="
	@status=$$(curl -s -o /dev/null -w "%{http_code}" http://$(DEPLOY_HOST):$(DEPLOY_HEALTH_PORT)/health 2>/dev/null); \
	if [ "$$status" = "200" ]; then \
		echo "  ✅ 生产服务运行正常 (HTTP $$status)"; \
	else \
		echo "  ❌ 健康检查失败 (HTTP $$status)"; \
	fi
	@echo "=== 部署完成: http://$(DEPLOY_HOST):$(DEPLOY_HEALTH_PORT) ==="

# ─── 本地开发 ──────────────────────────────────────────────

# 本地开发：委托给 ./dev 脚本
.PHONY: dev

dev:
	./dev start

# ─── 清理 ──────────────────────────────────────────────────

clean:
	rm -rf bin/ coverage.out
