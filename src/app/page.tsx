'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, ChevronRight } from 'lucide-react';
import { Task, TaskCategory } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/lib/store';
import { tasks as tasksApi } from '@/lib/api';
import { CATEGORIES, aiSearch } from '@/lib/utils';
import TaskCard, { TaskCardSkeleton } from '@/components/TaskCard';
import { EmptyState, ErrorState, NotificationBell } from '@/components/ui';
import Onboarding from '@/components/Onboarding';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/utils';

const AI_SUGGESTIONS = [
  'хог асгах хүн байна уу',
  'нохой гаргах хэрэгтэй',
  'дэлгүүрт явж өгнэ үү',
  'гэрийн цэвэрлэгээ хийх',
];

export default function HomePage() {
  const { user } = useAuthStore();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSuggestionIndex(i => (i + 1) % AI_SUGGESTIONS.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tasksApi.list({ status: 'pending', limit: 50 });
      setAllTasks(data);
      setFilteredTasks(data);
    } catch (err) {
      setError('Ажлуудыг татаж авахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    let result = allTasks;
    if (selectedCategory !== 'all') result = result.filter(t => t.category === selectedCategory);
    if (searchQuery.trim()) result = aiSearch(searchQuery, result) as Task[];
    setFilteredTasks(result);
  }, [searchQuery, selectedCategory, allTasks]);

  const categoryList = [
    { key: 'all', label: 'Бүгд', emoji: '🌟' },
    ...Object.entries(CATEGORIES).map(([key, val]) => ({ key, label: val.label, emoji: val.emoji })),
  ];

  return (
    <>
      <Onboarding />
      <div className="page-content pb-28">
        {/* Header */}
        <div className="px-4 pt-12 pb-4 bg-gradient-to-b from-primary-50 to-white">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-gray-500">Сайн байна уу,</p>
              <h1 className="text-xl font-bold text-gray-900">
                {user ? (user.name || 'Хэрэглэгч') : 'Зочин'} 👋
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              {user && (
                <Image
                  src={getAvatarUrl(user.name, user.avatar_url)}
                  alt={user.name}
                  width={40} height={40}
                  className="rounded-2xl border-2 border-white shadow-card"
                />
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Sparkles className="w-4 h-4 text-primary-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={AI_SUGGESTIONS[suggestionIndex]}
              className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-12 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-card transition-all"
            />
            <button className="absolute inset-y-0 right-3 flex items-center">
              <div className="bg-primary-500 text-white p-2 rounded-xl hover:bg-primary-600 transition-colors">
                <Search className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        {/* Banner */}
        <div className="mx-4 mb-4">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Өнөөдөр нийтлэгдсэн</p>
                <p className="text-3xl font-bold mt-0.5">{allTasks.length}</p>
                <p className="text-sm opacity-75">ажил байна</p>
              </div>
              <div className="bg-white/20 rounded-2xl p-3"><span className="text-3xl">⚡</span></div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Ангилал</h2>
            <button className="flex items-center gap-1 text-sm text-primary-500 font-medium">
              Бүгд <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {categoryList.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as TaskCategory | 'all')}
                className={`flex flex-col items-center gap-1.5 flex-shrink-0 transition-all duration-200 ${selectedCategory === key ? 'opacity-100' : 'opacity-70 hover:opacity-90'}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 ${selectedCategory === key ? 'bg-primary-500 shadow-green scale-105' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  {emoji}
                </div>
                <span className={`text-[10px] font-medium w-14 text-center leading-tight ${selectedCategory === key ? 'text-primary-600' : 'text-gray-500'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Task Feed */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">
              {searchQuery ? `"${searchQuery}" үр дүн` : 'Шинэ ажлууд'}
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{filteredTasks.length} ажил</span>
          </div>

          <div className="flex flex-col gap-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <TaskCardSkeleton key={i} />)
            ) : error ? (
              <ErrorState message={error} onRetry={fetchTasks} />
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                emoji="🔍"
                title="Ажил олдсонгүй"
                description={searchQuery ? 'Өөр утгаар хайж үзнэ үү' : 'Одоогоор нийтлэгдсэн ажил байхгүй байна'}
                action={searchQuery ? { label: 'Хайлтыг цэвэрлэх', onClick: () => setSearchQuery('') } : { label: 'Ажил нийтлэх', href: '/post' }}
              />
            ) : (
              filteredTasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </div>
      </div>
    </>
  );
}
