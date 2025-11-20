# Docker 设置指南

## 步骤 1: 安装 Docker Desktop

1. 下载 Docker Desktop for Mac: https://www.docker.com/products/docker-desktop/
2. 安装并启动 Docker Desktop
3. 等待 Docker 完全启动（右上角图标变为绿色）

## 步骤 2: 验证 Docker 安装

在终端运行：
```bash
docker --version
docker compose version
```

## 步骤 3: 运行 Docker Compose

在项目根目录（`/Users/yunbai/Documents/GitHub/www-services`）运行：

```bash
docker compose up --build
```

这将：
- 构建并启动前端（端口 5173）
- 构建并启动后端（端口 8000）
- 启动 PostgreSQL 数据库容器
- 运行数据库迁移（Flyway）

## 步骤 4: 数据库配置

当前配置使用**本地数据库**（Docker 容器中的 PostgreSQL），这是正确的。

如果需要切换到云数据库（Supabase），请查看 `DATABASE_SWITCH.md`。

## 访问应用

- 前端: http://localhost:5173
- 后端 API: http://localhost:8000

