import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Check, CheckCheck, Trash2, X,
  AlertTriangle, Zap, ChevronLeft, ChevronRight
} from 'lucide-react';
import { notificationsApi, type Notification } from '../services/api';
import { cn } from '../lib/utils';
import { relativeTime, formatDateTime } from '../utils/relativeTime';

interface NotificationsProps {
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

type FilterTab = 'all' | 'unread';

export default function Notifications({ unreadCount, onUnreadCountChange }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filter === 'unread') params.unreadOnly = true;

      const res = await notificationsApi.getAll(params);
      setNotifications(res.data);
      setTotalPages(res.pagination.totalPages);
      onUnreadCountChange(res.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filter, onUnreadCountChange]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      onUnreadCountChange(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const target = notifications.find(n => n.id === id);
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (target && !target.isRead) {
        onUnreadCountChange(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      onUnreadCountChange(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationsApi.clear();
      setNotifications([]);
      onUnreadCountChange(0);
      setConfirmClear(false);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hotspot': return <Zap className="w-4 h-4 text-orange-400" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">通知管理</h2>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-medium">
              {unreadCount} 条未读
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleMarkAllRead}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              全部已读
            </motion.button>
          )}
          {notifications.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">确认清空？</span>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                >
                  确认
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-white transition-all"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-white/5 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
            )
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'all' as FilterTab, label: '全部' },
          { key: 'unread' as FilterTab, label: '未读' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all",
              filter === key
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            )}
          >
            {key === 'unread' && unreadCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">
              {filter === 'unread' ? '没有未读通知' : '暂无通知'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "group flex items-start gap-4 p-4 transition-colors",
                  n.isRead ? 'opacity-60' : 'bg-white/[0.02]'
                )}
              >
                {/* Type Icon */}
                <div className="shrink-0 mt-0.5">
                  {getTypeIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        n.isRead ? 'text-slate-400' : 'text-white'
                      )}>
                        {!n.isRead && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 mb-0.5" />
                        )}
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {n.content}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          title="标记已读"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        title="删除"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600">
                    <span title={formatDateTime(n.createdAt)}>
                      {relativeTime(n.createdAt)}
                    </span>
                    <span className="capitalize">
                      {n.type === 'hotspot' ? '热点' : n.type === 'alert' ? '告警' : n.type}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-500 px-3">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
