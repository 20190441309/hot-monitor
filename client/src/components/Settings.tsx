import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, Save, Key, Mail, Server, 
  Eye, EyeOff, Check, AlertCircle, Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { settingsApi } from '../services/api';

interface SettingField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  sensitive?: boolean;
}

const SETTING_SECTIONS = [
  {
    title: 'AI 配置',
    icon: Key,
    description: 'DeepSeek AI 模型接入配置',
    fields: [
      { key: 'DEEPSEEK_API_KEY', label: 'DeepSeek API Key', type: 'password', placeholder: 'sk-...', sensitive: true }
    ] as SettingField[]
  },
  {
    title: '数据源',
    icon: Server,
    description: '第三方平台 API 配置',
    fields: [
      { key: 'TWITTER_API_KEY', label: 'Twitter API Key', type: 'password', placeholder: 'your_twitter_api_key', sensitive: true }
    ] as SettingField[]
  },
  {
    title: '邮件通知',
    icon: Mail,
    description: 'SMTP 邮件服务器配置（可选）',
    fields: [
      { key: 'SMTP_HOST', label: 'SMTP 服务器地址', type: 'text', placeholder: 'smtp.example.com' },
      { key: 'SMTP_PORT', label: 'SMTP 端口', type: 'number', placeholder: '587' },
      { key: 'SMTP_SECURE', label: '启用 SSL/TLS', type: 'select', options: [
        { value: 'false', label: '关闭（STARTTLS）' },
        { value: 'true', label: '启用（SSL/TLS）' }
      ]},
      { key: 'SMTP_USER', label: '发件邮箱', type: 'text', placeholder: 'your@email.com' },
      { key: 'SMTP_PASS', label: '邮箱密码 / 授权码', type: 'password', placeholder: '••••••••', sensitive: true },
      { key: 'NOTIFY_EMAIL', label: '通知接收邮箱', type: 'text', placeholder: 'notify@email.com' }
    ] as SettingField[]
  }
];

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getAll();
      setSettings(data);
      setOriginalSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ text: '加载设置失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      // 只提交有变更的字段
      const changed: Record<string, string> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (value !== originalSettings[key]) {
          changed[key] = value;
        }
      }

      if (Object.keys(changed).length === 0) {
        setMessage({ text: '没有变更', type: 'success' });
        setIsSaving(false);
        return;
      }

      await settingsApi.update(changed);
      setOriginalSettings({ ...originalSettings, ...changed });
      setMessage({ text: '设置已保存', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message || '保存失败', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const toggleSecret = (key: string) => {
    setVisibleSecrets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-400" />
            系统设置
          </h2>
          <p className="text-sm text-slate-500 mt-1">配置 API 密钥、邮件通知等参数</p>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={isSaving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all",
            isSaving
              ? "bg-blue-500/20 text-blue-400 cursor-wait"
              : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          )}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? '保存中...' : '保存设置'}
        </motion.button>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm",
            message.type === 'success' 
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </motion.div>
      )}

      {/* Sections */}
      {SETTING_SECTIONS.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.1 }}
          className="p-6 rounded-2xl bg-white/[0.02] border border-white/5"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <section.icon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">{section.title}</h3>
              <p className="text-xs text-slate-500">{section.description}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {section.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm text-slate-400 mb-1.5">
                  {field.label}
                </label>
                <div className="relative">
                  {field.type === 'select' ? (
                    <select
                      value={settings[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none"
                    >
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-[#0a0a1a]">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.sensitive && !visibleSecrets.has(field.key) ? 'password' : field.type}
                      value={settings[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  )}
                  {field.sensitive && field.type !== 'select' && (
                    <button
                      onClick={() => toggleSecret(field.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {visibleSecrets.has(field.key) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
