# Database Switch Guide

## 如何切换本地数据库和云数据库

### 当前配置
- **本地数据库**：使用 Docker 容器中的 PostgreSQL（用于本地开发）
- **云数据库**：使用 Supabase（`DATABASE_URL` 在 `project.env` 中）

### 切换方法

#### 使用本地数据库（Docker）
在 `server/task-service.js` 和 `server/user-service.js` 中：

```javascript
// 注释掉云数据库配置
/*
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
*/

// 使用本地数据库（从环境变量读取 PGUSER, PGHOST 等）
const sql = postgres();
```

#### 使用云数据库（Supabase）
在 `server/task-service.js` 和 `server/user-service.js` 中：

```javascript
// 取消注释云数据库配置
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

// 注释掉本地数据库配置
/*
const sql = postgres();
*/
```

### 何时使用哪个？

- **本地数据库**：使用 `docker compose up` 时（有本地 Postgres 容器）
- **云数据库**：部署到生产环境或需要共享数据时

### 当前状态
当前配置为**本地数据库**（适合 Docker 开发环境）

