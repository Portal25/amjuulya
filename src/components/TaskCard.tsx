'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Clock, Star } from 'lucide-react';
import { Task } from '@/lib/supabase/database.types';
import { CATEGORIES, STATUS_CONFIG, formatPrice, formatDate, getAvatarUrl, cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  showStatus?: boolean;
}

export default function TaskCard({ task, showStatus = false }: TaskCardProps) {
  const category = CATEGORIES[task.category];
  const status = STATUS_CONFIG[task.status];
  const user = (task as any).users;

  return (
    <Link href={`/task/${task.id}`}>
      <div className="task-card group">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
            category?.color || 'bg-gray-100'
          )}>
            {category?.emoji || '✨'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{task.title}</h3>
                  {task.is_urgent && (
                    <span className="badge-urgent text-[10px] px-1.5 py-0.5">🔥 Яаралтай</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{task.description}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-base font-bold text-primary-600">{formatPrice(task.price)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {task.location && (
                <div className="flex items-center gap-1 text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs truncate max-w-[100px]">{task.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-gray-400">
                <Clock className="w-3 h-3" />
                <span className="text-xs">{formatDate(task.created_at)}</span>
              </div>
              {showStatus && status && (
                <span className={cn('badge-status text-[10px]', status.color, status.bg)}>
                  {status.label}
                </span>
              )}
            </div>

            {user && (
              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-50">
                <Image
                  src={getAvatarUrl(user.name, user.avatar_url)}
                  alt={user.name || ''}
                  width={20} height={20}
                  className="rounded-full"
                />
                <span className="text-xs text-gray-500 font-medium">{user.name}</span>
                {user.verified && (
                  <span className="badge-verified text-[9px] px-1.5 py-0.5">✓ Баталгаажсан</span>
                )}
                {user.rating > 0 && (
                  <div className="flex items-center gap-0.5 ml-auto">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-semibold text-gray-600">{user.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {task.images && task.images.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
            {task.images.slice(0, 3).map((img, i) => (
              <div key={i} className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden">
                <Image src={img} alt={`Зураг ${i + 1}`} fill className="object-cover" />
                {i === 2 && task.images.length > 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+{task.images.length - 3}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-50">
      <div className="flex items-start gap-3">
        <div className="skeleton w-11 h-11 rounded-2xl flex-shrink-0" />
        <div className="flex-1">
          <div className="flex justify-between gap-2">
            <div className="flex-1">
              <div className="skeleton h-4 w-3/4 mb-2 rounded-lg" />
              <div className="skeleton h-3 w-full mb-1 rounded-lg" />
              <div className="skeleton h-3 w-2/3 rounded-lg" />
            </div>
            <div className="skeleton h-6 w-16 rounded-lg flex-shrink-0" />
          </div>
          <div className="flex gap-3 mt-3">
            <div className="skeleton h-3 w-20 rounded-lg" />
            <div className="skeleton h-3 w-16 rounded-lg" />
          </div>
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-50">
            <div className="skeleton w-5 h-5 rounded-full" />
            <div className="skeleton h-3 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
