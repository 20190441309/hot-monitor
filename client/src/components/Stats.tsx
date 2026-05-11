import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid
} from 'recharts';
import {
  Activity, Clock, AlertTriangle, Target,
  TrendingUp, Globe, Zap, BarChart3
} from 'lucide-react';
import type { Stats as StatsType, Keyword } from '../services/api';
import { cn } from '../lib/utils';

interface StatsProps {
  stats: StatsType;
  keywords: Keyword[];
}

const SOURCE_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  bing: '#00897B',
  google: '#4285F4',
  baidu: '#3388FF',
  weibo: '#E6162D',
  zhihu: '#0066FF',
  bilibili: '#00A1D6',
};

const IMPORTANCE_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: '#EF4444' },
  high: { label: '高', color: '#F97316' },
  medium: { label: '中', color: '#EAB308' },
  low: { label: '低', color: '#64748B' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function StatsDashboard({ stats, keywords }: StatsProps) {
  // Trend data
  const trendData = stats.trends.map(t => ({
    date: formatDate(t.date),
    热点数: t.count,
  }));

  // Source data
  const sourceData = Object.entries(stats.bySource)
    .map(([name, count]) => ({
      name,
      value: count,
      color: SOURCE_COLORS[name] || '#64748B',
    }))
    .sort((a, b) => b.value - a.value);

  // Importance data
  const importanceData = Object.entries(stats.byImportance)
    .map(([key, count]) => ({
      name: IMPORTANCE_CONFIG[key]?.label || key,
      value: count,
      color: IMPORTANCE_CONFIG[key]?.color || '#64748B',
      key,
    }))
    .sort((a, b) => {
      const order = ['urgent', 'high', 'medium', 'low'];
      return order.indexOf(a.key) - order.indexOf(b.key);
    });

  // Top keywords
  const maxKeywordCount = stats.topKeywords[0]?.count || 1;

  const activeKeywords = keywords.filter(k => k.isActive).length;

  const statCards = [
    { label: '总热点', value: stats.total, icon: Activity, color: 'blue', gradient: 'from-blue-500/10 to-transparent' },
    { label: '今日新增', value: stats.today, icon: Clock, color: 'cyan', gradient: 'from-cyan-500/10 to-transparent' },
    { label: '紧急热点', value: stats.urgent, icon: AlertTriangle, color: 'red', gradient: 'from-red-500/10 to-transparent' },
    { label: '活跃监控词', value: activeKeywords, icon: Target, color: 'emerald', gradient: 'from-emerald-500/10 to-transparent' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "relative group p-5 rounded-2xl bg-gradient-to-br border overflow-hidden",
              card.gradient,
              `border-${card.color}-500/10`
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className={cn("text-2xl font-bold mt-1", `text-${card.color}-400`)}>
                  {card.value.toLocaleString()}
                </p>
              </div>
              <card.icon className={cn("w-8 h-8 opacity-20", `text-${card.color}-400`)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl bg-white/[0.02] border border-white/5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-white">7 日趋势</h3>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="热点数" stroke="#3B82F6" strokeWidth={2} fill="url(#trendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-600 text-sm">暂无数据</div>
          )}
        </motion.div>

        {/* Source Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-5 rounded-2xl bg-white/[0.02] border border-white/5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-medium text-white">来源分布</h3>
          </div>
          {sourceData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {sourceData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {sourceData.map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-sm text-slate-300 capitalize">{s.name}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-600 text-sm">暂无数据</div>
          )}
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Importance Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl bg-white/[0.02] border border-white/5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-medium text-white">重要程度分布</h3>
          </div>
          {importanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={importanceData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="数量" radius={[6, 6, 0, 0]}>
                  {importanceData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-600 text-sm">暂无数据</div>
          )}
        </motion.div>

        {/* Top Keywords */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-5 rounded-2xl bg-white/[0.02] border border-white/5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-medium text-white">关键词产出 Top 10</h3>
          </div>
          {stats.topKeywords.length > 0 ? (
            <div className="space-y-3">
              {stats.topKeywords.map((kw, i) => (
                <div key={kw.keywordId} className="flex items-center gap-3">
                  <span className="w-5 text-right text-xs text-slate-600 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300 truncate">{kw.keyword}</span>
                      <span className="text-sm font-medium text-white shrink-0 ml-2">{kw.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(kw.count / maxKeywordCount) * 100}%` }}
                        transition={{ delay: 0.4 + i * 0.05, duration: 0.6 }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-600 text-sm">暂无数据</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
