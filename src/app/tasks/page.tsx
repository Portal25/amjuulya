'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tasks as tasksApi } from '@/lib/api';
import { Task } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import TaskCard, { TaskCardSkeleton } from '@/components/TaskCard';
import { EmptyState, ErrorState } from '@/components/ui';
import { ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';

type TabType = 'posted' | 'accepted';

const STATUS_TABS = [
  { key: 'all', label: 'Бүгд' },
  { key: 'pending', label: 'Хүлээгдэж буй' },
  { key: 'in_progress', label: 'Явагдаж байна' },
  { key: 'completed', label: 'Дууссан' },
  { key: 'disputed', label: 'Маргаантай' },
  { key: 'cancelled', label: 'Цуцлагдсан' },
];

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<TabType>('posted');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = tab === 'posted'
        ? await tasksApi.myPosted(user.id, statusFilter !== 'all' ? statusFilter : undefined)
        : await tasksApi.myAccepted(user.id, statusFilter !== 'all' ? statusFilter : undefined);
      setTasks(data);
    } catch {
      setError('Ажлуудыг татаж авахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  }, [user, tab, statusFilter]);

  useEffect(() => {
    if (!user) { router.push('/auth'); return; }
    fetchTasks();
  }, [user, fetchTasks, router]);

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const switchTab = (newTab: TabType) => {
    setTab(newTab);
    setStatusFilter('all');
  };

  return (
    <div className="page-content pb-28">
      <div className="px-4 pt-12 pb-4 bg-gradient-to-b from-primary-50 to-white">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Миний ажлууд</h1>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Хүлээгдэж буй', count: stats.pending, color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'Явагдаж байна', count: stats.in_progress, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Дууссан', count: stats.completed, color: 'text-green-500', bg: 'bg-green-50' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={cn('rounded-2xl p-3 text-center', bg)}>
              <div className={cn('text-2xl font-bold', color)}>{count}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex bg-gray-100 rounded-2xl p-1">
          {(['posted', 'accepted'] as TabType[]).map(t => (
            <button key={t} onClick={() => switchTab(t)}
              className={cn('flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200',
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
              {t === 'posted' ? '📋 Нийтэлсэн' : '🛠️ Хүлээн авсан'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {STATUS_TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              statusFilter === key ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200')}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <TaskCardSkeleton key={i} />)
        ) : error ? (
          <ErrorState message={error} onRetry={fetchTasks} />
        ) : tasks.length === 0 ? (
          <EmptyState
            emoji={tab === 'posted' ? '📋' : '🛠️'}
            title={tab === 'posted' ? 'Нийтэлсэн ажил байхгүй' : 'Хүлээн авсан ажил байхгүй'}
            description={tab === 'posted' ? 'Анхны захиалгаа нийтлээрэй!' : 'Боломжит ажлуудыг үзнэ үү'}
            action={{ label: tab === 'posted' ? 'Ажил нийтлэх' : 'Ажил хайх', href: tab === 'posted' ? '/post' : '/' }}
          />
        ) : (
          tasks.map(task => <TaskCard key={task.id} task={task} showStatus />)
        )}
      </div>
    </div>
  );
}
