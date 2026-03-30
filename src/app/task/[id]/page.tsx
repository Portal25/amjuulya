'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, MapPin, Clock, Star, MessageCircle, CheckCircle, AlertTriangle, Upload, X, Zap } from 'lucide-react';
import { tasks as tasksApi, disputes as disputesApi, ratings as ratingsApi } from '@/lib/api';
import { Task, User } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, STATUS_CONFIG, formatPrice, formatDate, getAvatarUrl, cn } from '@/lib/utils';
import { tryCatch } from '@/lib/errors';
import { EmptyState, ErrorState, ConfirmDialog, Spinner } from '@/components/ui';
import { TaskCardSkeleton } from '@/components/TaskCard';
import toast from 'react-hot-toast';

type TabType = 'details' | 'proof' | 'dispute';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [task, setTask] = useState<Task | null>(null);
  const [poster, setPoster] = useState<User | null>(null);
  const [worker, setWorker] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [proofPreviews, setProofPreviews] = useState<string[]>([]);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isRating, setIsRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    setError(null);
    try {
      const t = await tasksApi.getById(id);
      setTask(t);
      const supabase = createClient();
      const [{ data: p }, ratedCheck] = await Promise.all([
        supabase.from('users').select('*').eq('id', t.user_id).single(),
        user ? ratingsApi.hasRated(id, user.id) : Promise.resolve(false),
      ]);
      if (p) setPoster(p as User);
      setHasRated(ratedCheck);
      if (t.worker_id) {
        const { data: w } = await supabase.from('users').select('*').eq('id', t.worker_id).single();
        if (w) setWorker(w as User);
      }
    } catch {
      setError('Ажил татаж авахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  const handleAccept = async () => {
    if (!user) { router.push('/auth'); return; }
    if (!task) return;
    setIsAccepting(true);
    const ok = await tryCatch(() => tasksApi.accept(task.id, user.id));
    if (ok !== null) { toast.success('Ажлыг хүлээн авлаа! 🎉'); fetchTask(); }
    setIsAccepting(false);
  };

  const handleProofUpload = async () => {
    if (!user || !task || proofFiles.length === 0) return;
    setIsUploadingProof(true);
    const ok = await tryCatch(() => tasksApi.uploadProofImages(task.id, user.id, proofFiles));
    if (ok) { toast.success('Нотлох зураг илгээгдлээ!'); setProofFiles([]); setProofPreviews([]); fetchTask(); }
    setIsUploadingProof(false);
  };

  const handleConfirm = async () => {
    if (!user || !task) return;
    setIsConfirming(true);
    const ok = await tryCatch(() => tasksApi.confirmCompletion(task.id, user.id));
    if (ok !== null) { toast.success('Ажил баталгаажлаа! Төлбөр шилжлээ 💚'); fetchTask(); }
    setIsConfirming(false);
    setShowConfirmDialog(false);
  };

  const handleDispute = async () => {
    if (!user || !task) return;
    if (!disputeReason) { toast.error('Шалтгаан сонгоно уу'); return; }
    if (!disputeDescription.trim()) { toast.error('Тайлбар бичнэ үү'); return; }
    setIsDisputing(true);
    const ok = await tryCatch(() => disputesApi.create({ taskId: task.id, reporterId: user.id, reason: disputeReason, description: disputeDescription }));
    if (ok !== null) { toast.success('Маргаан мэдүүлэгдлээ'); fetchTask(); }
    setIsDisputing(false);
  };

  const handleRate = async () => {
    if (!user || !task || rating === 0) return;
    const ratedId = user.id === task.user_id ? task.worker_id! : task.user_id;
    setIsRating(true);
    const ok = await tryCatch(() => ratingsApi.create({ taskId: task.id, raterId: user.id, ratedId, stars: rating, comment: ratingComment }));
    if (ok !== null) { toast.success('Үнэлгээ өглөө! ⭐'); setHasRated(true); }
    setIsRating(false);
  };

  if (isLoading) {
    return (
      <div className="pb-28">
        <div className="page-header">
          <div className="skeleton w-8 h-8 rounded-xl" />
          <div className="skeleton h-5 w-32 rounded-lg flex-1" />
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="skeleton h-48 w-full rounded-2xl" />
          <div className="skeleton h-6 w-3/4 rounded-lg" />
          <div className="skeleton h-4 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="page-header">
          <button onClick={() => router.back()} className="p-2 -ml-2"><ChevronLeft className="w-5 h-5" /></button>
        </div>
        <ErrorState message={error || 'Ажил олдсонгүй'} onRetry={error ? fetchTask : undefined} />
        {!error && <div className="flex justify-center mt-4"><Link href="/" className="btn-primary text-sm">Нүүр хуудас</Link></div>}
      </div>
    );
  }

  const category = CATEGORIES[task.category];
  const status = STATUS_CONFIG[task.status];
  const isOwner = user?.id === task.user_id;
  const isWorker = user?.id === task.worker_id;
  const canAccept = user && !isOwner && !task.worker_id && task.status === 'pending';

  return (
    <div className="pb-36 page-content">
      <div className="page-header">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900 flex-1 truncate">Ажлын дэлгэрэнгүй</h1>
        <span className={cn('badge-status', status.color, status.bg)}>{status.label}</span>
      </div>

      {task.images && task.images.length > 0 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {task.images.map((img, i) => (
            <button key={i} onClick={() => setSelectedImage(img)} className="relative w-32 h-24 flex-shrink-0 rounded-2xl overflow-hidden">
              <Image src={img} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-4 right-4 text-white p-2"><X className="w-6 h-6" /></button>
          <div className="relative w-full max-w-sm h-64"><Image src={selectedImage} alt="" fill className="object-contain" /></div>
        </div>
      )}

      <div className="px-4 py-2 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', category.color)}>{category.emoji} {category.label}</span>
              {task.is_urgent && <span className="badge-urgent">🔥 Яаралтай</span>}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
          </div>
          <div className="text-2xl font-bold text-primary-600 flex-shrink-0">{formatPrice(task.price)}</div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed">{task.description}</p>

        <div className="flex flex-wrap gap-3">
          {task.location && <div className="flex items-center gap-1.5 text-gray-500 text-sm"><MapPin className="w-4 h-4 text-primary-400" />{task.location}</div>}
          <div className="flex items-center gap-1.5 text-gray-500 text-sm"><Clock className="w-4 h-4 text-gray-400" />{formatDate(task.created_at)}</div>
        </div>

        {poster && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs text-gray-400 mb-2.5 font-medium">Захиалагч</p>
            <div className="flex items-center gap-3">
              <Image src={getAvatarUrl(poster.name, poster.avatar_url)} alt={poster.name} width={48} height={48} className="rounded-2xl" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-900">{poster.name}</span>
                  {poster.verified && <span className="badge-verified">✓</span>}
                </div>
                {poster.rating > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn('w-3 h-3', i < Math.round(poster.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200')} />)}
                    <span className="text-xs text-gray-500 ml-1">{poster.rating.toFixed(1)} ({poster.rating_count})</span>
                  </div>
                )}
              </div>
              {user && user.id !== poster.id && (
                <Link href={`/chat?task=${task.id}`} className="p-2.5 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors">
                  <MessageCircle className="w-5 h-5 text-primary-500" />
                </Link>
              )}
            </div>
          </div>
        )}

        {worker && (
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-xs text-blue-400 mb-2.5 font-medium">Ажилчин</p>
            <div className="flex items-center gap-3">
              <Image src={getAvatarUrl(worker.name, worker.avatar_url)} alt={worker.name} width={48} height={48} className="rounded-2xl" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5"><span className="font-semibold text-gray-900">{worker.name}</span>{worker.verified && <span className="badge-verified">✓</span>}</div>
                {worker.rating > 0 && <div className="flex items-center gap-1 mt-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn('w-3 h-3', i < Math.round(worker.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200')} />)}</div>}
              </div>
            </div>
          </div>
        )}

        {task.status !== 'pending' && (isOwner || isWorker) && (
          <div>
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
              {(['details', 'proof', 'dispute'] as TabType[]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn('flex-1 py-2 text-xs font-semibold rounded-xl transition-all', activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
                  {tab === 'details' ? '📋 Дэлгэрэнгүй' : tab === 'proof' ? '📸 Нотлох' : '⚖️ Маргаан'}
                </button>
              ))}
            </div>

            {activeTab === 'proof' && (
              <div className="space-y-3">
                {task.proof_images && task.proof_images.length > 0 ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Нотлох зурагнууд</p>
                    <div className="flex gap-2 flex-wrap">
                      {task.proof_images.map((img, i) => (
                        <button key={i} onClick={() => setSelectedImage(img)} className="relative w-20 h-20 rounded-2xl overflow-hidden">
                          <Image src={img} alt="" fill className="object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10"><CheckCircle className="w-6 h-6 text-white" /></div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-50 rounded-2xl p-4 text-center">
                    <p className="text-orange-600 text-sm font-medium">Нотлох зураг илгээгдээгүй байна</p>
                    <p className="text-orange-400 text-xs mt-1">Ажилчин нотлох зураг илгээхийг хүлээнэ үү</p>
                  </div>
                )}

                {isWorker && task.status === 'in_progress' && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Нотлох зураг илгээх</p>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {proofPreviews.map((src, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden">
                          <Image src={src} alt="" fill className="object-cover" />
                          <button onClick={() => { setProofFiles(f => f.filter((_, j) => j !== i)); setProofPreviews(p => p.filter((_, j) => j !== i)); }}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                      <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary-300 transition-colors">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={e => {
                            const files = Array.from(e.target.files || []);
                            setProofFiles(prev => [...prev, ...files].slice(0, 5));
                            setProofPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))].slice(0, 5));
                          }} />
                      </label>
                    </div>
                    <button onClick={handleProofUpload} disabled={isUploadingProof || proofFiles.length === 0}
                      className="btn-primary w-full text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                      {isUploadingProof ? <Spinner size="sm" /> : 'Нотлох зураг илгээх'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dispute' && task.status !== 'disputed' && task.status !== 'completed' && (
              <div className="space-y-3">
                <div className="bg-red-50 rounded-2xl p-3.5 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-danger-700 leading-relaxed">Маргаан мэдүүлэхэд ажил түр зогсоно. Удирдагч шийдвэрлэнэ.</p>
                </div>
                <select value={disputeReason} onChange={e => setDisputeReason(e.target.value)} className="input-field text-sm">
                  <option value="">Шалтгаан сонгох</option>
                  <option value="not_completed">Ажил дутуу хийгдсэн</option>
                  <option value="poor_quality">Чанар муу</option>
                  <option value="no_show">Ирээгүй</option>
                  <option value="fraud">Залилан</option>
                  <option value="other">Бусад</option>
                </select>
                <textarea value={disputeDescription} onChange={e => setDisputeDescription(e.target.value)}
                  placeholder="Нөхцөл байдлыг дэлгэрэнгүй тайлбарлана уу..." className="input-field resize-none text-sm" rows={3} />
                <button onClick={handleDispute} disabled={isDisputing || !disputeReason || !disputeDescription.trim()}
                  className="btn-danger w-full text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {isDisputing ? <Spinner size="sm" /> : '⚖️ Маргаан мэдүүлэх'}
                </button>
              </div>
            )}

            {task.status === 'disputed' && (
              <div className="bg-orange-50 rounded-2xl p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <p className="text-orange-700 font-semibold text-sm">Маргаан шийдвэрлэгдэж байна</p>
                <p className="text-orange-500 text-xs mt-1">Удирдагч тантай холбогдоно</p>
              </div>
            )}
          </div>
        )}

        {task.status === 'completed' && user && (isOwner || isWorker) && !hasRated && (
          <div className="bg-yellow-50 rounded-2xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">⭐ Үнэлгээ өгөх</p>
            <div className="flex gap-2 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setRating(i + 1)}>
                  <Star className={cn('w-8 h-8 transition-colors', i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 hover:text-yellow-300')} />
                </button>
              ))}
            </div>
            <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)}
              placeholder="Сэтгэгдэл бичих (заавал биш)..." className="input-field resize-none text-sm mb-3" rows={2} />
            <button onClick={handleRate} disabled={isRating || rating === 0}
              className="btn-primary w-full text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {isRating ? <Spinner size="sm" /> : 'Үнэлгээ өгөх'}
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 bg-white/95 backdrop-blur-sm pt-3 pb-3 border-t border-gray-100">
        {canAccept && (
          <button onClick={handleAccept} disabled={isAccepting}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
            {isAccepting ? <Spinner size="sm" /> : <><Zap className="w-4 h-4" />Ажил хүлээж авах — {formatPrice(task.price)}</>}
          </button>
        )}
        {isOwner && task.status === 'in_progress' && (
          <div className="flex gap-2">
            <button onClick={() => setShowConfirmDialog(true)} className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm">
              <CheckCircle className="w-4 h-4" /> Баталгаажуулах
            </button>
            <button onClick={() => setActiveTab('dispute')} className="btn-danger flex-1 text-sm">⚖️ Маргаан</button>
          </div>
        )}
        {!user && <Link href="/auth" className="btn-primary w-full flex items-center justify-center">Нэвтрэх</Link>}
        {task.status === 'completed' && (
          <div className="flex items-center justify-center gap-2 py-2">
            <CheckCircle className="w-5 h-5 text-primary-500" />
            <span className="text-primary-600 font-semibold text-sm">Ажил амжилттай дууссан</span>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Ажлыг баталгаажуулах уу?"
        description={`"${task.title}" ажлыг дуусгасан гэж баталгаажуулахад ${formatPrice(task.price)} ажилчинд шилжих болно. Энэ үйлдлийг буцааx боломжгүй.`}
        confirmLabel="Тийм, баталгаажуулах"
        isLoading={isConfirming}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}
