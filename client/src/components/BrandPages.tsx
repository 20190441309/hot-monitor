import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

type Page = 'about' | 'changelog' | 'feedback';

interface BrandPagesProps {
  page: Page | null;
  onClose: () => void;
}

const FEATURES = [
  { icon: '🔍', title: '多源聚合', desc: '自动抓取 Twitter、HackerNews、B站、微博等平台热点' },
  { icon: '🤖', title: 'AI 分析', desc: 'DeepSeek 驱动的可信度评估与相关性打分' },
  { icon: '⚡', title: '实时推送', desc: 'WebSocket 实时通知 + 邮件告警' },
  { icon: '🏷️', title: '智能标签', desc: 'AI 自动生成内容标签，支持筛选与批量生成' },
  { icon: '📊', title: '数据看板', desc: '趋势图表、来源分布、重要程度统计' },
  { icon: '📡', title: 'RSS 订阅', desc: '自定义订阅源，定时检查更新' },
];

const TECH_STACK = [
  { name: 'React 19', role: '前端框架' },
  { name: 'Vite', role: '构建工具' },
  { name: 'Tailwind CSS', role: '样式' },
  { name: 'Express 5', role: '后端框架' },
  { name: 'Prisma + SQLite', role: '数据库' },
  { name: 'DeepSeek', role: 'AI 引擎' },
  { name: 'Socket.io', role: '实时通信' },
  { name: 'node-cron', role: '定时任务' },
];

const CHANGELOG = [
  {
    version: 'v1.0.0',
    date: '2026-05',
    changes: [
      { type: 'added', text: '内容标签自动分类与批量生成' },
      { type: 'added', text: '精选评分角标绶带' },
      { type: 'added', text: '内容预览图渲染（OG 图片提取）' },
      { type: 'added', text: '每日时间线视图' },
      { type: 'added', text: 'RSS 订阅源管理' },
      { type: 'added', text: '图片代理服务' },
      { type: 'added', text: '数据统计看板' },
      { type: 'added', text: '通知管理页' },
      { type: 'added', text: '手动搜索与保存' },
    ]
  },
  {
    version: 'v0.9.0',
    date: '2026-04',
    changes: [
      { type: 'added', text: '关键词监控与自动扫描' },
      { type: 'added', text: 'AI 可信度分析' },
      { type: 'added', text: '多源数据聚合（Twitter、Bing、HackerNews）' },
      { type: 'added', text: 'WebSocket 实时推送' },
      { type: 'added', text: '邮件告警通知' },
      { type: 'added', text: '系统设置页面' },
    ]
  }
];

const TYPE_COLORS: Record<string, string> = {
  added: 'bg-emerald-500/15 text-emerald-400',
  changed: 'bg-blue-500/15 text-blue-400',
  fixed: 'bg-amber-500/15 text-amber-400',
};

function AboutPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-3">关于 HotPulse</h2>
        <p className="text-slate-400 leading-relaxed">
          HotPulse 是一款 AI 驱动的实时热点监控与可信度分析平台。
          自动聚合多个社交媒体和新闻平台的热点内容，通过 AI 评估信息可信度与相关性，
          帮助你快速掌握值得关注的动态。
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">功能特性</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-xl mt-0.5">{f.icon}</span>
              <div>
                <div className="text-sm font-medium text-white">{f.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">技术栈</h3>
        <div className="flex flex-wrap gap-2">
          {TECH_STACK.map((t) => (
            <span key={t.name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
              <span className="text-white font-medium">{t.name}</span>
              <span className="text-slate-500">{t.role}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-white/5">
        <p className="text-xs text-slate-600">
          开源协议：MIT License · Built with AI assistance
        </p>
      </div>
    </div>
  );
}

function ChangelogPage() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white">更新日志</h2>
      {CHANGELOG.map((release) => (
        <div key={release.version} className="relative pl-6 border-l border-white/10">
          <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[#0a0a1a]" />
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-lg font-bold text-white">{release.version}</span>
            <span className="text-xs text-slate-500">{release.date}</span>
          </div>
          <div className="space-y-2">
            {release.changes.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium uppercase", TYPE_COLORS[c.type])}>
                  {c.type}
                </span>
                <span className="text-sm text-slate-400">{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedbackPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      if (res.ok) {
        setSubmitted(true);
        setTitle('');
        setContent('');
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <CheckCircle className="w-12 h-12 text-emerald-400" />
        <h2 className="text-xl font-bold text-white">感谢你的反馈！</h2>
        <p className="text-sm text-slate-500">我们会认真阅读每一条反馈</p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors mt-2"
        >
          再提交一条
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">意见反馈</h2>
      <p className="text-sm text-slate-500">你的反馈将帮助我们改进产品</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="简要描述你的反馈"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">详细内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请详细描述你的建议或遇到的问题..."
            rows={5}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !title.trim() || !content.trim()}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
            "bg-blue-500 hover:bg-blue-600 text-white",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
          {submitting ? '提交中...' : '提交反馈'}
        </button>
      </form>
    </div>
  );
}

const PAGES: Record<Page, { title: string; component: React.FC }> = {
  about: { title: '关于', component: AboutPage },
  changelog: { title: '更新日志', component: ChangelogPage },
  feedback: { title: '反馈', component: FeedbackPage },
};

export default function BrandPages({ page, onClose }: BrandPagesProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (page) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [page, handleKeyDown]);

  return (
    <AnimatePresence>
      {page && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* 内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-[#0f1019] border border-white/10 p-8 shadow-2xl"
          >
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 页面内容 */}
            {(() => {
              const PageComponent = PAGES[page].component;
              return <PageComponent />;
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
