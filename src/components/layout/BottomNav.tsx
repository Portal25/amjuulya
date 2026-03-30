'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, ClipboardList, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store';

const navItems = [
  { href: '/', icon: Home, label: 'Нүүр' },
  { href: '/post', icon: Plus, label: 'Нийтлэх', isPrimary: true },
  { href: '/tasks', icon: ClipboardList, label: 'Ажлууд' },
  { href: '/chat', icon: MessageCircle, label: 'Чат' },
  { href: '/profile', icon: User, label: 'Профайл' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useAuthStore();

  // Нэвтрэлтийн хуудсанд nav харуулахгүй
  if (pathname === '/auth') return null;

  return (
    <nav className="bottom-nav">
      <div className="flex items-end justify-around px-2 pt-2">
        {navItems.map(({ href, icon: Icon, label, isPrimary }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          const showBadge = href === '/chat' && unreadCount > 0;

          if (isPrimary) {
            return (
              <Link key={href} href={href} className="flex flex-col items-center -mt-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-green bg-primary-500 hover:bg-primary-600 active:scale-95 transition-all duration-200">
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-medium text-primary-500 mt-1">{label}</span>
              </Link>
            );
          }

          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 py-1 px-3 group">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative',
                isActive ? 'bg-primary-50' : 'group-hover:bg-gray-50')}>
                <Icon className={cn('w-5 h-5 transition-colors duration-200',
                  isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-600')}
                  strokeWidth={isActive ? 2.5 : 2} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium transition-colors duration-200',
                isActive ? 'text-primary-500' : 'text-gray-400')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
