# Related Discussions Aggregation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group hotspots from different sources about the same topic using tag overlap, displaying "关联讨论 N 条" expandable section on hotspot cards.

**Architecture:** Compute related hotspot relationships on-the-fly in the API layer by comparing tags within the same keyword group. No schema changes needed. Frontend adds an expandable "related discussions" section at the bottom of each hotspot card.

**Tech Stack:** Express.js, Prisma (SQLite), React, Tailwind CSS, Framer Motion, Lucide icons

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/routes/hotspots.ts` | Modify | Add `computeRelated()` helper; enrich `GET /` response with `relatedCount`/`relatedIds`; add `GET /:id/related` endpoint |
| `client/src/services/api.ts` | Modify | Add `relatedCount`/`relatedIds` to `Hotspot` interface; add `getRelated()` API method |
| `client/src/App.tsx` | Modify | Add expandable "关联讨论 N 条" section to hotspot card; add state for expanded related items + fetching |

---

### Task 1: Backend — computeRelated helper + enrich GET /

**Files:**
- Modify: `server/src/routes/hotspots.ts`

- [ ] **Step 1: Add computeRelated helper function**

Add this function at the top of `hotspots.ts`, after the imports and before the router definition (around line 5):

```typescript
function computeRelated(hotspots: any[]): Map<string, { relatedCount: number; relatedIds: string[] }> {
  const result = new Map<string, { relatedCount: number; relatedIds: string[] }>();

  // Group by keywordId
  const byKeyword = new Map<string, any[]>();
  for (const h of hotspots) {
    const kid = h.keywordId || '__none__';
    if (!byKeyword.has(kid)) byKeyword.set(kid, []);
    byKeyword.get(kid)!.push(h);
  }

  // For each keyword group, compute tag overlap
  for (const group of byKeyword.values()) {
    // Parse tags for each hotspot in the group
    const parsed = group.map(h => {
      let tags: string[] = [];
      if (h.tags) {
        try { tags = JSON.parse(h.tags); } catch { tags = []; }
      }
      return { id: h.id, tagSet: new Set(tags) };
    });

    // Compare each pair
    for (let i = 0; i < parsed.length; i++) {
      const relatedIds: string[] = [];
      for (let j = 0; j < parsed.length; j++) {
        if (i === j) continue;
        // Count tag overlap
        let overlap = 0;
        for (const tag of parsed[i].tagSet) {
          if (parsed[j].tagSet.has(tag)) overlap++;
        }
        if (overlap >= 2) {
          relatedIds.push(parsed[j].id);
        }
      }
      result.set(parsed[i].id, {
        relatedCount: relatedIds.length,
        relatedIds
      });
    }
  }

  return result;
}
```

- [ ] **Step 2: Enrich GET / response with relatedCount and relatedIds**

In the `GET /` handler, after the hotspots are fetched and sorted (around line 108, after the `hotspots` variable is assigned), add the related computation and merge it into the response:

Find this block (around lines 102-118):

```typescript
    let hotspots;
    if (needsMemorySort) {
      const sorted = sortHotspots(rawHotspots, sort, order as 'asc' | 'desc');
      hotspots = sorted.slice(skip, skip + limitNum);
    } else {
      hotspots = rawHotspots;
    }

    res.json({
      data: hotspots,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
```

Replace with:

```typescript
    let hotspots;
    if (needsMemorySort) {
      const sorted = sortHotspots(rawHotspots, sort, order as 'asc' | 'desc');
      hotspots = sorted.slice(skip, skip + limitNum);
    } else {
      hotspots = rawHotspots;
    }

    // Compute related discussions (tag overlap within same keyword)
    const relatedMap = computeRelated(rawHotspots);
    const enriched = hotspots.map(h => {
      const related = relatedMap.get(h.id) || { relatedCount: 0, relatedIds: [] };
      return { ...h, ...related };
    });

    res.json({
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
```

Note: We pass `rawHotspots` (the full unpaginated set for memory-sorted queries, or the paginated set otherwise) to `computeRelated` so that related items can be found even if they're on a different page.

- [ ] **Step 3: Add GET /:id/related endpoint**

Add this route AFTER the existing `GET /:id` handler (around line 348, before the `POST /search` route):

```typescript
// 获取热点的关联讨论
router.get('/:id/related', async (req, res) => {
  try {
    const hotspot = await prisma.hotspot.findUnique({
      where: { id: req.params.id },
      select: { id: true, keywordId: true, tags: true }
    });

    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }

    // Parse this hotspot's tags
    let myTags: string[] = [];
    if (hotspot.tags) {
      try { myTags = JSON.parse(hotspot.tags); } catch { myTags = []; }
    }

    if (myTags.length === 0 || !hotspot.keywordId) {
      return res.json([]);
    }

    const myTagSet = new Set(myTags);

    // Find other hotspots in the same keyword group
    const candidates = await prisma.hotspot.findMany({
      where: {
        keywordId: hotspot.keywordId,
        id: { not: hotspot.id },
        tags: { not: null }
      },
      select: {
        id: true,
        title: true,
        summary: true,
        source: true,
        url: true,
        authorName: true,
        publishedAt: true,
        tags: true
      }
    });

    // Filter by tag overlap >= 2
    const related = candidates.filter(c => {
      let cTags: string[] = [];
      if (c.tags) {
        try { cTags = JSON.parse(c.tags); } catch { cTags = []; }
      }
      let overlap = 0;
      for (const tag of cTags) {
        if (myTagSet.has(tag)) overlap++;
      }
      return overlap >= 2;
    });

    res.json(related);
  } catch (error) {
    console.error('Error fetching related hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch related hotspots' });
  }
});
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/hotspots.ts
git commit -m "feat: add related discussions computation to hotspots API

- Add computeRelated() helper for tag-overlap matching within keyword groups
- Enrich GET /api/hotspots response with relatedCount and relatedIds
- Add GET /api/hotspots/:id/related endpoint for expanded view"
```

---

### Task 2: Frontend — API types + getRelated method

**Files:**
- Modify: `client/src/services/api.ts`

- [ ] **Step 1: Add relatedCount and relatedIds to Hotspot interface**

In `client/src/services/api.ts`, find the `Hotspot` interface (lines 13-43). Add two fields after the `keyword` field:

```typescript
export interface Hotspot {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  sourceId: string | null;
  isReal: boolean;
  relevance: number;
  relevanceReason: string | null;
  keywordMentioned: boolean | null;
  importance: 'low' | 'medium' | 'high' | 'urgent';
  summary: string | null;
  tags: string | null;
  thumbnail: string | null;
  viewCount: number | null;
  likeCount: number | null;
  retweetCount: number | null;
  replyCount: number | null;
  commentCount: number | null;
  quoteCount: number | null;
  danmakuCount: number | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
  authorFollowers: number | null;
  authorVerified: boolean | null;
  publishedAt: string | null;
  createdAt: string;
  keyword: { id: string; text: string; category: string | null } | null;
  relatedCount: number;
  relatedIds: string[];
}
```

- [ ] **Step 2: Add RelatedHotspot type and getRelated API method**

Add a new type and API method after the `hotspotsApi` object (around line 164):

```typescript
export interface RelatedHotspot {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  authorName: string | null;
  publishedAt: string | null;
}
```

And add `getRelated` to the `hotspotsApi` object (inside the object, before the closing `}`):

```typescript
  getRelated: (id: string) =>
    request<RelatedHotspot[]>(`/hotspots/${id}/related`),
```

- [ ] **Step 3: Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat: add related discussion types and API method to frontend"
```

---

### Task 3: Frontend — Related discussions expand/collapse UI on hotspot card

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add state for expanded related items**

Find the existing state declarations in App.tsx (search for `expandedReasons`). Add new state variables nearby. Find:

```typescript
const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());
const [expandedContents, setExpandedContents] = useState<Set<string>>(new Set());
```

Add after them:

```typescript
const [expandedRelated, setExpandedRelated] = useState<Set<string>>(new Set());
const [relatedData, setRelatedData] = useState<Record<string, any[]>>({});
```

- [ ] **Step 2: Add toggle function for related section**

Find the existing `toggleReason` and `toggleContent` functions. Add a new toggle function after them:

```typescript
const toggleRelated = useCallback(async (hotspotId: string) => {
  setExpandedRelated(prev => {
    const next = new Set(prev);
    if (next.has(hotspotId)) {
      next.delete(hotspotId);
    } else {
      next.add(hotspotId);
      // Fetch related data if not already loaded
      if (!relatedData[hotspotId]) {
        hotspotsApi.getRelated(hotspotId).then(data => {
          setRelatedData(prev => ({ ...prev, [hotspotId]: data }));
        }).catch(console.error);
      }
    }
    return next;
  });
}, [relatedData]);
```

- [ ] **Step 3: Import RelatedHotspot type**

Find the import from `./services/api` (line 12). Add `RelatedHotspot` to the type imports:

```typescript
import { 
  keywordsApi, hotspotsApi, notificationsApi, triggerHotspotCheck, tagsApi,
  type Keyword, type Hotspot, type Stats, type Notification, type RelatedHotspot
} from './services/api';
```

- [ ] **Step 4: Add related discussions section to card**

In the card rendering, find the "原始内容 - 可折叠" section (around line 1136-1162). Add the related discussions section AFTER it, BEFORE the closing `</div>` of `flex-1 min-w-0` (around line 1163):

```tsx
                          {/* 关联讨论 - 可折叠 */}
                          {(hotspot.relatedCount ?? 0) > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleRelated(hotspot.id)}
                                className="flex items-center gap-1 text-[11px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
                              >
                                {expandedRelated.has(hotspot.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                <MessageCircle className="w-3 h-3" />
                                关联讨论 {hotspot.relatedCount} 条
                              </button>
                              <AnimatePresence>
                                {expandedRelated.has(hotspot.id) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-cyan-500/20">
                                      {(relatedData[hotspot.id] || []).map((rel: RelatedHotspot) => (
                                        <a
                                          key={rel.id}
                                          href={rel.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-start gap-2 p-1.5 rounded-md hover:bg-white/5 transition-colors group/rel"
                                        >
                                          <span className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0 mt-0.5">
                                            {getSourceIcon(rel.source)}
                                            {getSourceLabel(rel.source)}
                                          </span>
                                          <span className="text-xs text-slate-400 group-hover/rel:text-white transition-colors line-clamp-1">
                                            {rel.title}
                                          </span>
                                          {rel.authorName && (
                                            <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">
                                              {rel.authorName}
                                            </span>
                                          )}
                                        </a>
                                      ))}
                                      {(!relatedData[hotspot.id] || relatedData[hotspot.id].length === 0) && expandedRelated.has(hotspot.id) && (
                                        <span className="text-[11px] text-slate-600">加载中...</span>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
```

- [ ] **Step 5: Verify frontend compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: add related discussions expand/collapse UI to hotspot cards"
```

---

### Task 4: Manual test

- [ ] **Step 1: Start dev server**

Run: `cd /Users/hj/Desktop/hj/hot-monitor && npm run dev`

- [ ] **Step 2: Open browser and verify**

- Navigate to the dashboard
- Find a hotspot card that has tags
- If `relatedCount > 0`, verify the "关联讨论 N 条" button appears
- Click to expand and verify related items load and display correctly
- Click again to collapse

- [ ] **Step 3: Stop dev server and commit final**

```bash
git add -A
git commit -m "feat: complete related discussions aggregation feature

Closes phase 2 feature list. Groups hotspots by tag overlap within
the same keyword, showing expandable related discussions on cards."
```
