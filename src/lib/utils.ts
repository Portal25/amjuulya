import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TaskCategory, TaskStatus, TransactionStatus } from './supabase/database.types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('mn-MN', {
    style: 'currency', currency: 'MNT',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Дөнгөж сая';
  if (minutes < 60) return `${minutes} минутын өмнө`;
  if (hours < 24) return `${hours} цагийн өмнө`;
  if (days < 7) return `${days} өдрийн өмнө`;
  return date.toLocaleDateString('mn-MN');
}

export const CATEGORIES: Record<TaskCategory, { label: string; emoji: string; color: string }> = {
  хог_асгах:    { label: 'Хог асгах',    emoji: '🗑️', color: 'bg-gray-100 text-gray-700' },
  хүргэлт:     { label: 'Хүргэлт',      emoji: '📦', color: 'bg-blue-100 text-blue-700' },
  худалдаа:    { label: 'Худалдаа',     emoji: '🛒', color: 'bg-green-100 text-green-700' },
  нохой_гаргах: { label: 'Нохой гаргах', emoji: '🐕', color: 'bg-yellow-100 text-yellow-700' },
  цэвэрлэгээ:  { label: 'Цэвэрлэгээ',  emoji: '🧹', color: 'bg-purple-100 text-purple-700' },
  засвар:      { label: 'Засвар',       emoji: '🔧', color: 'bg-orange-100 text-orange-700' },
  бусад:       { label: 'Бусад',        emoji: '✨', color: 'bg-pink-100 text-pink-700' },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Хүлээгдэж буй', color: 'text-orange-600', bg: 'bg-orange-100' },
  in_progress: { label: 'Хийгдэж байна', color: 'text-blue-600',   bg: 'bg-blue-100' },
  completed:   { label: 'Дууссан',        color: 'text-green-600',  bg: 'bg-green-100' },
  disputed:    { label: 'Маргаантай',     color: 'text-red-600',    bg: 'bg-red-100' },
  cancelled:   { label: 'Цуцлагдсан',    color: 'text-gray-600',   bg: 'bg-gray-100' },
};

export const TRANSACTION_STATUS: Record<TransactionStatus, { label: string; color: string }> = {
  pending:   { label: 'Хүлээгдэж буй', color: 'text-orange-500' },
  success:   { label: 'Амжилттай',     color: 'text-green-500' },
  failed:    { label: 'Амжилтгүй',     color: 'text-red-500' },
  cancelled: { label: 'Цуцлагдсан',   color: 'text-gray-500' },
};

export const DISPUTE_REASONS: Record<string, string> = {
  not_completed: 'Ажил дутуу хийгдсэн',
  poor_quality:  'Чанар муу',
  no_show:       'Ирээгүй',
  fraud:         'Залилан',
  other:         'Бусад',
};

// AI Search — түлхүүр үгэнд суурилсан тохирол
export function aiSearch(query: string, tasks: { title: string; description: string; category: string }[]) {
  const q = query.toLowerCase();
  const keywords: Record<string, string[]> = {
    хог:       ['хог_асгах'],
    trash:     ['хог_асгах'],
    хүргэлт:  ['хүргэлт'],
    delivery:  ['хүргэлт'],
    худалдаа: ['худалдаа'],
    дэлгүүр:  ['худалдаа'],
    grocery:   ['худалдаа'],
    нохой:    ['нохой_гаргах'],
    dog:       ['нохой_гаргах'],
    цэвэрлэ: ['цэвэрлэгээ'],
    clean:     ['цэвэрлэгээ'],
    засвар:   ['засвар'],
    repair:    ['засвар'],
  };

  const matchedCategories = new Set<string>();
  for (const [key, cats] of Object.entries(keywords)) {
    if (q.includes(key)) cats.forEach(c => matchedCategories.add(c));
  }

  return tasks.filter(task => {
    const textMatch = task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q);
    const categoryMatch = matchedCategories.has(task.category);
    return textMatch || categoryMatch;
  });
}

export function getAvatarUrl(name: string, avatarUrl?: string | null): string {
  if (avatarUrl) return avatarUrl;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=4CAF50&color=fff&bold=true`;
}
