'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { disputes as disputesApi } from '@/lib/api';
import { tryCatch } from '@/lib/errors';
import { Dispute, Task } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/lib/store';
import { formatDate, formatPrice, DISPUTE_REASONS, getAvatarUrl, cn } from '@/lib/utils';
import { Shield, ChevronLeft, CheckCircle, RefreshCw, Scissors, AlertTriangle } from 'lucide-react';
import { EmptyState, ErrorState, ConfirmDialog } from '@/components/ui';
import Link from 'next/link';
import toast from 'react-hot-toast';

const ADMIN_PHONES = ['+97699999999'];

interface DisputeWithTask extends Dispute { task?: Task; }

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [disputes, setDisputes] = useState<DisputeWithTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; resolution: 'refund_user' | 'pay_worker' | 'split' } | null>(null);

  const fetchDisputes = useCallback(async () => {
    setError(null);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const db = createClient();
      const all = await disputesApi.listAll();
      const withTasks: DisputeWithTask[] = await Promise.all(
        all.map(async d => {
          const { data: task } = await db.from('tasks').select('*').eq('id', d.task_id).single();
          return { ...d, task: task || undefined };
        })
      );
      setDisputes(withTasks);
    } catch { setError('Маргаануудыг татаж авахад алдаа гарлаа'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) { router.push('/auth'); return; }
    if (!ADMIN_PHONES.includes(user.phone || '')) { router.push('/'); return; }
    fetchDisputes();
  }, [user, router, fetchDisputes]);

  const resolve = async () => {
    if (!confirm) return;
    setResolving(confirm.id);
    const ok = await tryCatch(() => disputesApi.resolve(confirm.id, confirm.resolution));
    if (ok !== null) { toast.success('Маргаан шийдвэрлэгдлээ'); fetchDisputes(); }
    setResolving(null);
    setConfirm(null);
  };

  const resolutionLabel = (r: string) =>
    r === 'refund_user' ? 'Буцаан олгох' : r === 'pay_worker' ? 'Ажилчинд олгох' : 'Хуваах';

  return (
    <div className="page-content pb-28">
      <div className="page-header">
        <Link href="/" className="p-2 -ml-2"><ChevronLeft className="w-5 h-5 text-gray-700" /></Link>
        <div className="flex items-center gap-2 flex-1">
          <Shield className="w-5 h-5 text-primary-500" />
          <h1 className="font-bold text-gray-900">Админ панел</h1>
        </div>
        <button onClick={fetchDisputes} className="p-2 hover:bg-gray-100 rounded-xl"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
      </div>

      <div className="px-4 py-4">
        <div className="bg-orange-50 rounded-2xl p-3.5 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-xs text-orange-700">{disputes.filter(d => d.status === 'open').length} нээлттэй маргаан байна</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 space-y-3">
                <div className="skeleton h-4 w-2/3 rounded" /><div className="skeleton h-3 w-full rounded" />
                <div className="flex gap-2"><div className="skeleton h-9 flex-1 rounded-xl" /><div className="skeleton h-9 flex-1 rounded-xl" /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchDisputes} />
        ) : disputes.length === 0 ? (
          <EmptyState emoji="✅" title="Маргаан байхгүй" description="Одоогоор шийдвэрлэх маргаан байхгүй байна" />
        ) : (
          <div className="space-y-4">
            {disputes.map(d => (
              <div key={d.id} className={cn('bg-white rounded-2xl p-4 shadow-card border-l-4',
                d.status === 'resolved' ? 'border-green-400' : d.status === 'investigating' ? 'border-blue-400' : 'border-orange-400')}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{d.task?.title || 'Ажил олдсонгүй'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(d.created_at)}</p>
                  </div>
                  <span className={cn('text-xs font-semibold px-2 py-1 rounded-full',
                    d.status === 'resolved' ? 'bg-green-100 text-green-700' : d.status === 'investigating' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700')}>
                    {d.status === 'resolved' ? 'Шийдвэрлэгдсэн' : d.status === 'investigating' ? 'Шалгаж байна' : 'Нээлттэй'}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Шалтгаан: {DISPUTE_REASONS[d.reason]}</p>
                  <p className="text-sm text-gray-700">{d.description}</p>
                </div>

                {d.task && (
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3 px-1">
                    <span>Дүн: <span className="font-semibold text-gray-700">{formatPrice(d.task.price)}</span></span>
                    <span>Статус: {d.task.status}</span>
                  </div>
                )}

                {d.status !== 'resolved' && (
                  <div className="flex gap-2">
                    {(['refund_user', 'pay_worker', 'split'] as const).map(res => {
                      const icons = { refund_user: RefreshCw, pay_worker: CheckCircle, split: Scissors };
                      const colors = { refund_user: 'bg-blue-50 text-blue-700 hover:bg-blue-100', pay_worker: 'bg-green-50 text-green-700 hover:bg-green-100', split: 'bg-purple-50 text-purple-700 hover:bg-purple-100' };
                      const Icon = icons[res];
                      return (
                        <button key={res} onClick={() => setConfirm({ id: d.id, resolution: res })}
                          disabled={resolving === d.id}
                          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50', colors[res])}>
                          <Icon className="w-3.5 h-3.5" />{resolutionLabel(res)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {d.status === 'resolved' && d.resolution && (
                  <div className="flex items-center gap-2 bg-green-50 rounded-xl p-2.5">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-xs text-green-700 font-medium">{resolutionLabel(d.resolution)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirm}
        title="Маргаан шийдвэрлэх"
        description={confirm ? `"${resolutionLabel(confirm.resolution)}" гэж шийдвэрлэх үү? Энэ үйлдлийг буцааx боломжгүй.` : ''}
        confirmLabel="Шийдвэрлэх"
        isLoading={!!resolving}
        variant="danger"
        onConfirm={resolve}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
