# Checkpoint

## 已完成

- [x] **清理旧作者引用** — 从代码文件（README、SKILL.md、package.json 等）移除所有 `程序员鱼皮`/`liyupi` 引用；重写 git 历史，所有提交作者改为 `hj`
- [x] **系统设置页面** — 新增前端设置 UI（`client/src/components/Settings.tsx`），后端设置同步到 `process.env` 即时生效，支持 AI/数据源/邮件三类配置，敏感字段可切换显示/隐藏

## 待办（按优先级排序）

- [x] **关键词编辑** — 后端 `PUT /api/keywords/:id` 已有，前端缺编辑按钮/弹窗
- [x] **通知管理页** — 新增独立通知管理页面（`client/src/components/Notifications.tsx`），支持全部/未读筛选、单条标记已读、单条删除、批量全部已读、清空确认、分页；下拉预览新增"查看全部"入口和未读圆点指示
- [x] **数据统计看板** — 新增统计标签页（`client/src/components/Stats.tsx`），后端扩展 stats 接口增加 7 日趋势、重要程度分布、关键词产出 Top 10；前端使用 recharts 绘制面积图、饼图、柱状图、进度条
- [x] ~~每日摘要邮件 — `sendDigestEmail()` 已实现但未调度，接入 cron 每日推送~~ (不需要)
- [x] **手动搜索保存** — 新增 `POST /api/hotspots/save` 接口（按 url+source 去重），搜索结果卡片增加"保存"按钮，已保存/保存中状态反馈
## 待办（二期功能）

- [x] **RSS 订阅源接入** — 新增 RssFeed 模型 + RSS 解析服务（rss-parser），独立 RSS checker 每 2 小时调度；前端新增"订阅"标签页，支持 CRUD、启用禁用、手动检查
- [x] **图片代理** — 新增 `GET /api/img-proxy?url=xxx` 接口，axios 流式转发外站图片（5MB 限制、10s 超时、SSRF 防护、1 天缓存）
- [x] **每日时间线视图** — 热点列表按日期分组（"今天"/"昨天"/"M月D日"），带蓝色圆点时间线标题、日期分隔线和条数统计
- [x] **内容标签自动分类** — 修改 `analyzeContent()` prompt 让 DeepSeek 返回 2-5 个语义化标签；所有热点创建流程持久化 tags；新增 `GET /api/tags`（聚合）、`PUT /:id/tags`（编辑）、`POST /batch-tag`（批量生成）三个端点；前端卡片 AI 摘要下方展示紫色标签药丸（支持增删）；标签云多选筛选 + 批量生成按钮
- [x] **关联讨论聚合** — 同一话题来自不同来源（Twitter + HN + Blog）的内容自动合并展示，显示"关联讨论 N 条"
- [x] **品牌页面** — 页脚链接 + 全屏遮罩层（ESC/点击外部关闭）；关于页（项目简介+功能特性+技术栈）、更新日志（时间线版本列表）、反馈页（文本表单+POST /api/feedback 存储）；Feedback 模型新增到 Prisma
- [x] **精选评分突出展示** — 将热度/相关性分数以角标绶带形式（"精选 XX"）展示在卡片左上角，综合分=热度×0.5+AI相关性×0.5，颜色随分数变化（金→橙→蓝→灰）
- [x] **内容预览图渲染** — Hotspot 模型新增 `thumbnail` 字段；新增 `fetchOgImage()` 服务提取 og:image/twitter:image；热点创建流程自动获取 OG 图片；前端卡片顶部 16:9 圆角预览图，通过 img-proxy 代理加载，无图时不占位

