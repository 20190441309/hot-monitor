# 关联讨论聚合 (Related Discussion Aggregation)

## 目标

同一话题来自不同来源（Twitter + HN + Blog）的内容自动合并展示，卡片底部显示"关联讨论 N 条"可展开。

## 匹配策略

- **范围**：同一 keyword 内的热点互相比较
- **规则**：两条热点的 AI tags 重叠 ≥2 个即视为关联
- **计算时机**：API 请求时实时计算，不持久化关联关系
- **理由**：tags 会动态变化，SQLite 单机场景下同 keyword 热点数量有限（几十到几百），实时计算开销可控

## API 变更

### `GET /api/hotspots` 响应扩展

现有 hotspot 对象新增字段：

```typescript
{
  ...existing fields,
  relatedCount: number,   // 同 keyword 下 tags 重叠 ≥2 的其他热点数量
  relatedIds: string[]    // 这些关联热点的 id 列表
}
```

计算逻辑：
1. 按 keywordId 分组所有返回的 hotspots
2. 对每条 hotspot，在同组内比较 tags 重叠度
3. 重叠 ≥2 个 tag 的计入 relatedCount/relatedIds

### `GET /api/hotspots/:id/related` (新增)

返回指定 hotspot 的关联热点详情列表。

- 从该 hotspot 的 keywordId 查同组所有热点
- 过滤 tags 重叠 ≥2 的
- 返回关联热点的摘要信息（id, title, summary, source, authorName, publishedAt, tags）

## 前端变更

### 卡片内展开

- Hotspot 卡片底部：当 `relatedCount > 0` 时，显示"关联讨论 N 条"按钮（带展开/折叠图标）
- 点击展开：调用 `/api/hotspots/:id/related` 获取详情，显示紧凑列表
- 每条关联项：来源图标 + 标题 + 摘要，单行展示
- 折叠/展开状态组件内 useState 管理

### 无额外 UI 变化

- 不改变卡片整体布局
- 不改变时间线分组逻辑
- 关联信息作为卡片的附加区块

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `server/src/routes/hotspots.ts` | 修改 `GET /` 计算 relatedCount/relatedIds；新增 `GET /:id/related` |
| `client/src/services/api.ts` | Hotspot 接口新增 relatedCount/relatedIds 字段 |
| `client/src/App.tsx` | 卡片底部新增关联讨论展开区块 |
