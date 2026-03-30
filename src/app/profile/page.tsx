'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Settings,
  Star,
  ClipboardList,
  Wallet,
  Shield,
  ChevronRight,
  LogOut,
  Edit2,
  Check,
  X,
  Camera,
  Bell,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { users as usersApi } from '@/lib/api';
import { tryCatch } from '@/lib/errors';
import { useAuthStore } from '@/lib/store';
import { getAvatarUrl, formatPrice, cn } from '@/lib/utils';
import { ConfirmDialog, EmptyState, Spinner } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [taskStats, setTaskStats] = useState({
    posted: 0,
    completed: 0,
    earned: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setName(user.name || '');
    const db = createClient();
    Promise.all([
      db.from('tasks').select('status').eq('user_id', user.id),
      db
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'release')
        .eq('status', 'success'),
    ]).then(([{ data: t }, { data: tx }]) => {
      if (t)
        setTaskStats((prev) => ({
          ...prev,
          posted: t.length,
          completed: t.filter((x) => x.status === 'completed').length,
        }));
      if (tx)
        setTaskStats((prev) => ({
          ...prev,
          earned: tx.reduce((s, x) => s + x.amount, 0),
        }));
    });
  }, [user, router]);

  const validateName = () => {
    if (!name.trim()) {
      setNameError('Нэр оруулна уу');
      return false;
    }
    if (name.trim().length < 2) {
      setNameError('Нэр хамгийн багадаа 2 тэмдэгт байна');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSaveName = async () => {
    if (!user || !validateName()) return;
    setIsSaving(true);
    const ok = await tryCatch(() =>
      usersApi.update(user.id, { name: name.trim() }),
    );
    if (ok !== null) {
      setUser({ ...user, name: name.trim() });
      toast.success('Нэр хадгалагдлаа');
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Зураг 5MB-аас хэтрэхгүй байх ёстой');
      return;
    }
    setIsUploadingAvatar(true);
    const url = await tryCatch(() => usersApi.uploadAvatar(user.id, file));
    if (url) {
      await usersApi.update(user.id, { avatar_url: url });
      setUser({ ...user, avatar_url: url });
      toast.success('Зураг шинэчлэгдлээ!');
    }
    setIsUploadingAvatar(false);
  };

  const handleLogout = async () => {
    const db = createClient();
    await db.auth.signOut();
    setUser(null);
    router.push('/auth');
    toast.success('Гарлаа');
  };

  if (!user) return null;

  const menuItems = [
    {
      label: 'Миний ажлууд',
      href: '/tasks',
      icon: ClipboardList,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Хэтэвч',
      href: '/wallet',
      icon: Wallet,
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      label: 'Мэдэгдэл',
      href: '#',
      icon: Bell,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
    {
      label: 'Нууцлалын бодлого',
      href: '#',
      icon: FileText,
      color: 'text-gray-500',
      bg: 'bg-gray-50',
    },
    {
      label: 'Тусламж',
      href: '#',
      icon: HelpCircle,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="page-content pb-28">
      <div className="bg-gradient-to-b from-primary-50 to-white px-4 pt-12 pb-6">
        <div className="flex items-start justify-between mb-5">
          <div className="relative">
            <div className="relative w-20 h-20">
              <Image
                src={getAvatarUrl(user.name, user.avatar_url)}
                alt={user.name}
                fill
                className="rounded-3xl object-cover border-4 border-white shadow-card"
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-500 rounded-xl flex items-center justify-center shadow-green"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={handleSaveName}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-primary-500 text-white disabled:opacity-60"
              >
                {isSaving ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Хадгалах
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setName(user.name);
                  setNameError('');
                }}
                className="p-2 bg-gray-100 rounded-xl"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Засах
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="mb-1">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              className={cn(
                'input-field text-xl font-bold py-2',
                nameError ? 'border-red-400 focus:ring-red-400' : '',
              )}
              autoFocus
            />
            {nameError && (
              <p className="text-xs text-red-500 mt-1">{nameError}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {user.name || 'Нэр тохируулаагүй'}
            </h2>
            {user.verified && (
              <span className="badge-verified text-xs">
                <Shield className="w-3 h-3" />
                Баталгаажсан
              </span>
            )}
          </div>
        )}
        <p className="text-gray-500 text-sm">{user.phone}</p>
        {user.rating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-4 h-4',
                  i < Math.round(user.rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-200',
                )}
              />
            ))}
            <span className="text-sm font-semibold text-gray-700 ml-1">
              {user.rating.toFixed(1)}
            </span>
            <span className="text-gray-400 text-sm">
              ({user.rating_count} үнэлгээ)
            </span>
          </div>
        )}
      </div>

      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Нийтэлсэн', value: taskStats.posted, emoji: '📋' },
            { label: 'Дууссан', value: taskStats.completed, emoji: '✅' },
            {
              label: 'Орлого',
              value: formatPrice(taskStats.earned),
              emoji: '💰',
            },
          ].map(({ label, value, emoji }) => (
            <div
              key={label}
              className="bg-white rounded-2xl p-3 text-center shadow-card"
            >
              <div className="text-xl mb-1">{emoji}</div>
              <div className="text-base font-bold text-gray-900 truncate text-sm">
                {value}
              </div>
              <div className="text-[10px] text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 mb-4">
        <Link
          href="/wallet"
          className="block bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-4 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-xs mb-1">Хэтэвч үлдэгдэл</p>
              <p className="text-2xl font-bold">
                {formatPrice(user.balance || 0)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-white/80" />
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </div>
        </Link>
      </div>

      <div className="px-4 space-y-2">
        {menuItems.map(({ label, href, icon: Icon, color, bg }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all"
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                bg,
              )}
            >
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <span className="flex-1 font-medium text-gray-900 text-sm">
              {label}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </Link>
        ))}

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 p-4 bg-red-50 rounded-2xl hover:bg-red-100 transition-all mt-2"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100">
            <LogOut className="w-5 h-5 text-danger-500" />
          </div>
          <span className="flex-1 font-medium text-danger-500 text-sm text-left">
            Гарах
          </span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 mt-6 pb-4">
        Амжуулъя v1.0.0
      </p>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Гарах уу?"
        description="Та апп-аас гарахдаа итгэлтэй байна уу?"
        confirmLabel="Гарах"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
