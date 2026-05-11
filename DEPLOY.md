# 部署指南

## 前提条件

- 一台 Linux 服务器（Ubuntu 22.04+ 推荐）
- Node.js 20+（推荐用 nvm 安装）
- npm

## 部署步骤

### 1. 服务器安装 Node.js

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
source ~/.bashrc
nvm install 22
```

### 2. 本地构建前端

```bash
cd client
npm run build    # 生成 client/dist/
```

### 3. 上传项目到服务器

```bash
rsync -avz --exclude node_modules --exclude .git \
  . user@your-server:/opt/hot-monitor
```

### 4. 服务器安装依赖并构建

```bash
cd /opt/hot-monitor/server
cp .env.example .env
# 编辑 .env 填入 DEEPSEEK_API_KEY、TWITTER_API_KEY 等
nano .env

npm install
npx prisma generate
npm run build
```

### 5. 启动

```bash
# 安装 PM2 守护进程
npm install -g pm2

# 首次启动
pm2 start dist/index.js --name hot-monitor

# 保存进程列表，配置开机自启
pm2 save
pm2 startup
```

### 6. 访问

浏览器打开 `http://your-server:3001`

## 日常维护

### 更新代码

```bash
cd /opt/hot-monitor
git pull
cd client && npm run build
cd ../server && npm run build
pm2 restart hot-monitor
```

### 查看日志

```bash
pm2 logs hot-monitor
```

### 备份数据

SQLite 数据库文件在 `server/prisma/dev.db`，直接拷走即可：

```bash
cp /opt/hot-monitor/server/prisma/dev.db /path/to/backup/
```

## 架构说明

生产模式下 Express 直接托管前端静态文件（`client/dist/`）和 API，单服务单端口（3001），无需 Nginx。
