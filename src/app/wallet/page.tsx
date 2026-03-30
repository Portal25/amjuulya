'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { transactions as txnApi } from '@/lib/api';
import { tryCatch } from '@/lib/errors';
import { Transaction } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/lib/store';
import { formatPrice, formatDate, TRANSACTION_STATUS, cn } from '@/lib/utils';
import { Wallet, ArrowUpRight, ArrowDownLeft, Lock, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState, ConfirmDialog, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  deposit: { label: 'Цэнэглэлт', icon: ArrowDownLeft, color: 'text-green-500' },
  escrow: { label: 'Хаагдсан', icon: Lock, color: 'text-orange-500' },
  release: { label: 'Шилжсэн', icon: ArrowUpRight, color: 'text-blue-500' },
  refund: { label: 'Буцаасан', icon: RefreshCw, color: 'text-purple-500' },
  withdrawal: { label: 'Татсан', icon: TrendingUp, color: 'text-red-500' },
};

export default function WalletPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositError, setDepositError] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const db = createClient();
      const [txnData, { data: userData }] = await Promise.all([
        txnApi.list(user.id),
        db.from('users').select('*').eq('id', user.id).single(),
      ]);
      setTxns(txnData);
      if (userData) setUser(userData);
    } catch {
      setError('Мэдээлэл татаж авахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  }, [user, setUser]);

  useEffect(() => {
    if (!user) { router.push('/auth'); return; }
    fetchData();
  }, [user, fetchData, router]);

  const validateDeposit = () => {
    if (!depositAmount || Number(depositAmount) <= 0) { setDepositError('Дүн оруулна уу'); return false; }
    if (Number(depositAmount) < 1000) { setDepositError('Хамгийн багадаа ₮1,000 байна'); return false; }
    if (Number(depositAmount) > 10000000) { setDepositError('Нэг удаагийн хязгаар ₮10,000,000'); return false; }
    setDepositError('');
    return true;
  };

  const handleDeposit = async () => {
    if (!user || !validateDeposit()) return;
    setIsDepositing(true);
    const ok = await tryCatch(() => txnApi.deposit(user.id, Number(depositAmount)));
    if (ok !== null) {
      toast.success(`₮${Number(depositAmount).toLocaleString()} цэнэглэлт амжилттай!`);
      setDepositAmount(''); setShowDeposit(false); setShowConfirm(false);
      fetchData();
    }
    setIsDepositing(false);
  };

  const lockedAmount = txns.filter(t => t.type === 'escrow' && t.status === 'success').reduce((s, t) => s + t.amount, 0);
  const totalEarned = txns.filter(t => t.type === 'release' && t.status === 'success').reduce((s, t) => s + t.amount, 0);

  if (!user) return null;

  return (
    <div className="page-content pb-28">
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-4 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-bold">Хэтэвч</h1>
          <button onClick={fetchData} className="p-2 bg-white/20 rounded-xl active:bg-white/30">
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/70 text-sm mb-1">Нийт үлдэгдэл</p>
              <div className="text-3xl font-bold text-white">{formatPrice(user.balance || 0)}</div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1"><Lock className="w-3.5 h-3.5 text-orange-300" /><span className="text-white/70 text-xs">Хаагдсан</span></div>
              <p className="text-white font-bold text-sm">{formatPrice(lockedAmount)}</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-3.5 h-3.5 text-green-300" /><span className="text-white/70 text-xs">Нийт орлого</span></div>
              <p className="text-white font-bold text-sm">{formatPrice(totalEarned)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowDeposit(!showDeposit)}
            className="flex-1 bg-white text-primary-600 font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary-50 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Цэнэглэх
          </button>
          <button className="flex-1 bg-white/20 text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm active:bg-white/30">
            <ArrowUpRight className="w-4 h-4" /> Татах
          </button>
        </div>
      </div>

      {showDeposit && (
        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-card p-4 animate-scale-in border border-primary-100">
          <h3 className="font-semibold text-gray-900 mb-3">Данс цэнэглэх</h3>
          <div className="flex gap-2 mb-3 flex-wrap">
            {[10000, 20000, 50000, 100000].map(amt => (
              <button key={amt} onClick={() => { setDepositAmount(String(amt)); setDepositError(''); }}
                className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  Number(depositAmount) === amt ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200')}>
                ₮{amt.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="relative mb-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₮</span>
            <input type="number" value={depositAmount}
              onChange={e => { setDepositAmount(e.target.value); setDepositError(''); }}
              placeholder="Дүн оруулах"
              className={cn('input-field pl-8', depositError ? 'border-red-400 focus:ring-red-400' : '')} />
          </div>
          {depositError && <p className="text-xs text-red-500 mb-3">{depositError}</p>}
          <button onClick={() => { if (validateDeposit()) setShowConfirm(true); }}
            className="btn-primary w-full text-sm mb-2">Цэнэглэх</button>
          <p className="text-xs text-gray-400 text-center">* Demo горимд бодит төлбөр хийгдэхгүй</p>
        </div>
      )}

      <div className="px-4 mt-5">
        <h2 className="section-title mb-3">Гүйлгээний түүх</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1"><div className="skeleton h-4 w-32 rounded mb-2" /><div className="skeleton h-3 w-20 rounded" /></div>
                <div className="skeleton h-5 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : txns.length === 0 ? (
          <EmptyState emoji="💳" title="Гүйлгээ байхгүй" description="Эхний цэнэглэлтээ хийгээрэй" action={{ label: 'Цэнэглэх', onClick: () => setShowDeposit(true) }} />
        ) : (
          <div className="space-y-2">
            {txns.map(txn => {
              const tc = TYPE_CONFIG[txn.type];
              const sc = TRANSACTION_STATUS[txn.status];
              const Icon = tc?.icon || Wallet;
              const isIncoming = ['deposit', 'release', 'refund'].includes(txn.type);
              return (
                <div key={txn.id} className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-card">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50', tc?.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{tc?.label || txn.type}</p>
                    <p className="text-xs text-gray-400 truncate">{txn.description || formatDate(txn.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('font-bold text-sm', isIncoming ? 'text-green-600' : 'text-red-500')}>
                      {isIncoming ? '+' : '-'}{formatPrice(txn.amount)}
                    </p>
                    <p className={cn('text-[10px] font-medium', sc?.color)}>{sc?.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Цэнэглэлт баталгаажуулах"
        description={`₮${Number(depositAmount).toLocaleString()} цэнэглэх үү?`}
        confirmLabel="Цэнэглэх"
        isLoading={isDepositing}
        onConfirm={handleDeposit}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
