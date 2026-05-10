# Checkpoint

## 已完成

- [x] **清理旧作者引用** — 从代码文件（README、SKILL.md、package.json 等）移除所有 `程序员鱼皮`/`liyupi` 引用；重写 git 历史，所有提交作者改为 `hj`
- [x] **系统设置页面** — 新增前端设置 UI（`client/src/components/Settings.tsx`），后端设置同步到 `process.env` 即时生效，支持 AI/数据源/邮件三类配置，敏感字段可切换显示/隐藏

## 待办（按优先级排序）

- [x] **关键词编辑** — 后端 `PUT /api/keywords/:id` 已有，前端缺编辑按钮/弹窗
- [ ] **通知管理页** — 现有通知只有下拉预览，缺少专门的管理页面（批量标记已读、删除、筛选）
- [ ] **数据统计看板** — `GET /api/hotspots/stats` 已有接口，前端可以做趋势图、来源分布等可视化
- [ ] **每日摘要邮件** — `sendDigestEmail()` 已实现但未调度，接入 cron 每日推送
- [ ] **手动搜索保存** — `POST /api/hotspots/search` 返回结果但不入库，可存为临时热点
- [ ] **Docker 化** — Nginx + 前后端容器编排，简化部署
