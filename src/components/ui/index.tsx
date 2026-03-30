'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notifications } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Empty State ──────────────────────────────────────────────
interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}
export function EmptyState({ emoji = '🔍', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-5 leading-relaxed">{description}</p>}
      {action && (
        action.href ? (
          <Link href={action.href} className="btn-primary text-sm">{action.label}</Link>
        ) : (
          <button onClick={action.onClick} className="btn-primary text-sm">{action.label}</button>
        )
      )}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}
export function ErrorState({ message = 'Алдаа гарлаа', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-3">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <p className="text-sm text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-2 text-sm text-primary-500 font-medium">
          <RefreshCw className="w-4 h-4" /> Дахин оролдох
        </button>
      )}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
export function ConfirmDialog({
  isOpen, title, description, confirmLabel = 'Тийм', cancelLabel = 'Болих',
  variant = 'primary', isLoading, onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-t-3xl w-full max-w-md p-6 animate-slide-up">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn('flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-60',
              variant === 'danger' ? 'btn-danger' : 'btn-primary'
            )}
          >
            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notification Bell ────────────────────────────────────────
export function NotificationBell() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    notifications.unreadCount(user.id).then(setCount);
    const interval = setInterval(() => {
      notifications.unreadCount(user.id).then(setCount);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const openPanel = async () => {
    if (!user) return;
    setOpen(true);
    setIsLoading(true);
    const data = await notifications.list(user.id);
    setItems(data);
    setIsLoading(false);
    if (count > 0) {
      await notifications.markAllRead(user.id);
      setCount(0);
    }
  };

  if (!user) return null;

  return (
    <>
      <button onClick={openPanel} className="relative p-2 bg-white rounded-2xl shadow-card">
        <Bell className="w-5 h-5 text-gray-600" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Мэдэгдэл</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-xl">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <EmptyState emoji="🔔" title="Мэдэгдэл байхгүй" />
              ) : (
                items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); if (n.link) router.push(n.link); }}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                      !n.read && 'bg-primary-50/50'
                    )}
                  >
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Full-screen Spinner ──────────────────────────────────────
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );
}

// ─── Inline Spinner ───────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return <div className={cn(s, 'border-2 border-white/30 border-t-white rounded-full animate-spin')} />;
}
