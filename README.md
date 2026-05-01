# AI 热点监控系统

一个用于聚合热点信息、分析内容可信度和相关性的全栈 Web 应用。项目基于 Express、React、Prisma 和 Socket.io 构建，支持关键词监控、定时抓取、实时通知和 AI 分析。

## 项目目标

这个项目用于自动跟踪你关心的领域动态，例如 AI、大模型、开发工具、行业新闻等。系统会从多个来源收集内容，交给 AI 做真假识别、摘要和重要性判断，然后把结果推送到前端页面和通知渠道。

## 核心功能

- 关键词管理：新增、编辑、删除、启停监控关键词
- 多源抓取：从搜索引擎、社交平台和内容站点收集信息
- AI 分析：判断内容真实性、相关性和重要程度
- 实时通知：通过 WebSocket 实时推送最新热点
- 邮件提醒：支持 SMTP 邮件通知
- 历史记录：保存热点、通知和设置数据

## 技术栈

- 前端：React 19 + Vite + TypeScript
- 后端：Express 5 + Node.js + TypeScript
- 数据库：Prisma + SQLite
- 实时通信：Socket.io
- AI 接入：deepseek

## 项目结构

```text
.
├── client        # 前端应用
├── server        # 后端服务
├── docs          # 本地运行与需求文档
└── README.md
```

## 本地运行

### 1. 安装依赖

```bash
cd server
npm install
npx prisma generate
npx prisma db push

cd ../client
npm install
```

### 2. 配置环境变量

先复制模板：

```bash
cp server/.env.example server/.env
```

至少确认这些变量可用：

```env
DATABASE_URL="file:./dev.db"
PORT=3001
CLIENT_URL=http://localhost:5173
OPENROUTER_API_KEY=你的 OpenRouter Key
```

如果你需要 Twitter、邮件通知，再继续补充对应配置。

### 3. 启动后端和前端

```bash
# 终端 1
cd server
npm run dev

# 终端 2
cd client
npm run dev
```

前端默认访问地址是 http://localhost:5173，后端默认地址是 http://localhost:3001。

## 生产部署建议

推荐使用“前后端同域部署”的方式：

1. 前端执行 `npm run build`，部署 `client/dist` 静态文件
2. 后端执行 `npm run build` 后用 Node 常驻运行 `dist/index.js`
3. 用 Nginx 把 `/` 指向前端静态站点，把 `/api` 和 `/socket.io` 反向代理到后端
4. 生产环境中把 `CLIENT_URL` 改成你的正式域名

后端在启动时会监听 `PORT`，并且会自动执行定时热点检查任务，所以部署后要确保进程常驻。

## 常用命令

```bash
# 后端
cd server
npm run dev
npm run build
npm run db:generate
npm run db:push
npx prisma studio

# 前端
cd client
npm run dev
npm run build
```

## 注意事项

- `.env` 文件不要提交到仓库
- SQLite 适合单机部署，如果以后要扩展到多实例，建议切换到 PostgreSQL
- 如果你要对外开放服务，记得配置 Nginx、HTTPS 和进程守护工具，例如 PM2 或 systemd

## 许可证

如果你要公开这个项目，可以在这里补充自己的许可证说明。
