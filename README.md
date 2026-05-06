<div align="center">

# Hot Monitor

**AI 驱动的实时热点监控与可信度分析平台**

全栈应用，聚合多源热点内容，通过 AI 进行可信度评估与相关性分析，并借助 WebSocket 和邮件通知实现实时告警推送。

![Tech Stack](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Tech Stack](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express)
![Tech Stack](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Tech Stack](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma)
![Tech Stack](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![Tech Stack](https://img.shields.io/badge/Socket.io-4-010101?style=flat-square&logo=socket.io)

</div>

---

## 项目简介

Hot Monitor 自动追踪 AI、大模型、开发工具、行业新闻等领域的动态。系统从搜索引擎、社交平台和内容站点收集信息，交由 AI 模型进行真实性判断、摘要提取和重要性评估，最终通过实时仪表盘呈现给用户。

## 核心功能

| 功能 | 说明 |
|------|------|
| **关键词监控** | 新增、编辑、激活或暂停监控关键词，支持完整 CRUD 操作 |
| **多源聚合** | 从搜索引擎、社交媒体和内容平台采集信息 |
| **AI 分析** | 接入 DeepSeek 模型，评估内容可信度、相关性和重要程度 |
| **实时推送** | 基于 WebSocket 将最新热点即时推送至浏览器 |
| **邮件告警** | 支持 SMTP 邮件通知，确保离线状态下也能及时感知 |
| **数据持久化** | 热点记录、通知历史和配置信息完整存储于 SQLite |

## 系统架构

```
hot-monitor
├── client/          # 前端 SPA — Vite + TypeScript + Tailwind CSS
│   ├── components/  # UI 组件
│   ├── services/    # API 客户端 & WebSocket 通信层
│   └── utils/       # 通用工具函数
├── server/          # 后端 API — TypeScript + Prisma ORM
│   ├── routes/      # RESTful API 路由
│   ├── services/    # 业务逻辑 & AI 集成
│   ├── jobs/        # 定时抓取任务
│   └── utils/       # 辅助工具 & 配置
├── docs/            # 技术文档
└── README.md
```

## 技术栈

| 层级 | Technology |
|------|------------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Express 5, Node.js, TypeScript |
| Database | Prisma ORM + SQLite |
| Real-Time | Socket.io |
| AI Engine | DeepSeek (via OpenRouter API) |
| Scraping | Axios + Cheerio |

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 yarn

### 安装依赖

```bash
# 克隆仓库
git clone <repo-url>
cd hot-monitor

# 安装后端依赖
cd server
npm install
npx prisma generate
npx prisma db push

# 安装前端依赖
cd ../client
npm install
```

### 配置环境变量

```bash
cp server/.env.example server/.env
```

必要环境变量：

```env
DATABASE_URL="file:./dev.db"
PORT=3001
CLIENT_URL=http://localhost:5173
OPENROUTER_API_KEY=<your-api-key>
```

> 可选：如需邮件通知或 Twitter 接入，请补充对应的 SMTP 和 Twitter 凭据配置。

### 本地开发运行

```bash
# 终端 1 — 启动后端
cd server && npm run dev

# 终端 2 — 启动前端
cd client && npm run dev
```

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |

## 生产部署

推荐采用前后端同域部署方案。

```bash
# 构建前端
cd client && npm run build

# 构建后端
cd server && npm run build
```

配置 Nginx 反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/client/dist;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
    }

    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

> 生产环境中建议使用 PM2 或 systemd 保持后端进程常驻。

## 常用命令

```bash
# 后端
cd server
npm run dev              # 启动开发服务器
npm run build            # 编译 TypeScript
npm run db:generate      # 重新生成 Prisma Client
npm run db:push          # 同步数据库 Schema
npx prisma studio        # 打开数据库可视化工具

# 前端
cd client
npm run dev              # 启动开发服务器
npm run build            # 生产环境构建
```

## 注意事项

- **请勿提交 `.env` 文件** — 包含敏感 API 密钥
- **SQLite 为单实例模式** — 如需多实例部署请迁移至 PostgreSQL
- **生产环境需启用 HTTPS** — WebSocket 连接要求安全协议

## 许可协议

详见 [LICENSE](./LICENSE)。
