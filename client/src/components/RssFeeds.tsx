import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rss, Plus, Trash2, X, RefreshCw,
  Globe, Clock, Power, PowerOff, ExternalLink, Loader2
} from 'lucide-react';
import { rssApi, type RssFeed } from '../services/api';
import { cn } from '../lib/utils';
import { relativeTime } from '../utils/relativeTime';

export default function RssFeeds() {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingFeed, setEditingFeed] = useState<RssFeed | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadFeeds = useCallback(async () => {
    try {
      const data = await rssApi.getAll();
      setFeeds(data);
    } catch (error) {
      showToast('加载失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadFeeds(); }, [loadFeeds]);

  const openAdd = () => {
    setEditingFeed(null);
    setFormName('');
    setFormUrl('');
    setShowAdd(true);
  };

  const openEdit = (feed: RssFeed) => {
    setEditingFeed(feed);
    setFormName(feed.name);
    setFormUrl(feed.url);
    setShowAdd(true);
  };

  const closeForm = () => {
    setShowAdd(false);
    setEditingFeed(null);
    setFormName('');
    setFormUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) return;

    try {
      if (editingFeed) {
        const updated = await rssApi.update(editingFeed.id, { name: formName.trim(), url: formUrl.trim() });
        setFeeds(prev => prev.map(f => f.id === editingFeed.id ? updated : f));
        showToast('订阅源已更新', 'success');
      } else {
        const { feed } = await rssApi.create({ name: formName.trim(), url: formUrl.trim() });
        setFeeds(prev => [feed, ...prev]);
        showToast('订阅源已添加', 'success');
      }
      closeForm();
    } catch (error: any) {
      showToast(error.message || '操作失败', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await rssApi.delete(id);
      setFeeds(prev => prev.filter(f => f.id !== id));
      showToast('已删除', 'success');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await rssApi.toggle(id);
      setFeeds(prev => prev.map(f => f.id === id ? updated : f));
    } catch (error) {
      showToast('切换失败', 'error');
    }
  };

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      await rssApi.check();
      showToast('RSS 检查完成', 'success');
      loadFeeds();
    } catch (error) {
      showToast('检查失败', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium backdrop-blur-xl border shadow-xl",
              toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">RSS 订阅源</h2>
          <span className="text-xs text-slate-500">{feeds.length} 个源</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheck}
            disabled={isChecking || feeds.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isChecking && "animate-spin")} />
            {isChecking ? '检查中...' : '立即检查'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAdd}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加源
          </motion.button>
        </div>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">
                  {editingFeed ? '编辑订阅源' : '添加订阅源'}
                </h3>
                <button type="button" onClick={closeForm} className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">名称</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    placeholder="如：OpenAI Blog"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">RSS URL</label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    placeholder="https://example.com/feed.xml"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                >
                  {editingFeed ? '保存' : '添加'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed List */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : feeds.length === 0 ? (
          <div className="text-center py-16">
            <Rss className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">暂无订阅源</p>
            <p className="text-xs text-slate-600 mt-1">添加 RSS 源以获取最新内容</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {feeds.map((feed, i) => (
              <motion.div
                key={feed.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    feed.isActive ? 'bg-orange-500/10' : 'bg-white/5'
                  )}>
                    <Rss className={cn("w-5 h-5", feed.isActive ? 'text-orange-400' : 'text-slate-600')} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-medium truncate", feed.isActive ? 'text-white' : 'text-slate-500')}>
                      {feed.name}
                    </p>
                    {!feed.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-500">已禁用</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{feed.url}</p>
                  {feed.lastChecked && (
                    <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      上次检查 {relativeTime(feed.lastChecked)}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={feed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                    title="打开 RSS"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleToggle(feed.id)}
                    className={cn("p-1.5 rounded-lg transition-all", feed.isActive ? 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10')}
                    title={feed.isActive ? '禁用' : '启用'}
                  >
                    {feed.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => openEdit(feed)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                    title="编辑"
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
