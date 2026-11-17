import { useState } from 'react';
import { Shield } from 'lucide-react';
import { adminLogin } from '../utils/api';

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export function AdminLoginModal({ open, onClose, onSuccess }: AdminLoginModalProps) {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const { token } = await adminLogin(password);
      setPassword('');
      onSuccess(token);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-charcoal border border-white/20 rounded-2xl max-w-sm w-full p-7 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-white text-black mx-auto flex items-center justify-center mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 id="admin-login-title" className="font-display font-bold text-xl text-white">
            دخول الأدمن فقط
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            أدخل كلمة المرور للتحكم الكامل في المنتجات والمدفوعات والطلبات
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-pass-input" className="sr-only">
              كلمة مرور الأدمن
            </label>
            <input
              id="admin-pass-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور..."
              className="w-full bg-obsidian border border-white/20 rounded-xl px-4 py-3 text-center text-white tracking-widest focus:border-white focus:outline-none"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs text-red-400 text-center">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-neutral-200 transition disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'دخول'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-obsidian border border-white/15 text-neutral-300 text-sm hover:text-white"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
