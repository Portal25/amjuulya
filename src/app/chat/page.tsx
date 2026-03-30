'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, Send, ImageIcon, X, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { messages as msgsApi, tasks as tasksApi } from '@/lib/api';
import { tryCatch } from '@/lib/errors';
import { Message, Task, User } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/lib/store';
import { getAvatarUrl, formatDate, cn } from '@/lib/utils';
import { EmptyState, ErrorState, Spinner } from '@/components/ui';
import Link from 'next/link';
import toast from 'react-hot-toast';

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('task');
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [conversations, setConversations] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const db = createClient();
      const { data } = await db.from('tasks').select('*, users(*)')
        .or(`user_id.eq.${user.id},worker_id.eq.${user.id}`)
        .not('status', 'eq', 'pending').order('updated_at', { ascending: false });
      if (data) setConversations(data as Task[]);
    } catch { setError('Харилцаануудыг татаж авахад алдаа гарлаа'); }
    finally { setIsLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user) { router.push('/auth'); return; }
    fetchConversations();
    if (taskId) {
      createClient().from('tasks').select('*, users(*)').eq('id', taskId).single().then(({ data }) => {
        if (data) setSelectedTask(data as Task);
      });
    }
  }, [user, taskId, router, fetchConversations]);

  // Realtime messages
  useEffect(() => {
    if (!selectedTask) return;
    const db = createClient();
    msgsApi.list(selectedTask.id).then(setMsgs);

    const channel = db.channel(`msgs:${selectedTask.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `task_id=eq.${selectedTask.id}` },
        async (payload) => {
          const { data } = await db.from('messages').select('*, sender:users(*)').eq('id', payload.new.id).single();
          if (data) setMsgs(prev => [...prev, data as Message]);
        })
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [selectedTask]);

  // Fetch other user
  useEffect(() => {
    if (!selectedTask || !user) return;
    const otherId = user.id === selectedTask.user_id ? selectedTask.worker_id : selectedTask.user_id;
    if (!otherId) return;
    createClient().from('users').select('*').eq('id', otherId).single().then(({ data }) => { if (data) setOtherUser(data as User); });
  }, [selectedTask, user]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const sendMessage = async () => {
    if (!user || !selectedTask || (!text.trim() && !imageFile)) return;
    setIsSending(true);
    let imageUrl: string | undefined;
    if (imageFile) {
      const url = await tryCatch(() => msgsApi.uploadImage(user.id, imageFile));
      if (url) imageUrl = url;
      else { setIsSending(false); return; }
    }
    const ok = await tryCatch(() => msgsApi.send(selectedTask.id, user.id, text.trim() || undefined, imageUrl));
    if (ok !== null) { setText(''); setImageFile(null); setImagePreview(null); }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!user) return null;

  if (selectedTask) {
    return (
      <div className="flex flex-col" style={{ height: '100dvh' }}>
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-40">
          <button onClick={() => { setSelectedTask(null); setOtherUser(null); setMsgs([]); }} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          {otherUser && (
            <>
              <Image src={getAvatarUrl(otherUser.name, otherUser.avatar_url)} alt={otherUser.name} width={36} height={36} className="rounded-full" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{otherUser.name}</p>
                <p className="text-xs text-gray-400 truncate">{selectedTask.title}</p>
              </div>
            </>
          )}
          <Link href={`/task/${selectedTask.id}`} className="text-xs text-primary-500 font-medium bg-primary-50 px-3 py-1.5 rounded-full">Ажил</Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50" style={{ paddingBottom: '80px' }}>
          {msgs.length === 0 && <div className="pt-8"><EmptyState emoji="💬" title="Анхны мессежийг илгээгээрэй" /></div>}
          {msgs.map(msg => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                {!isMe && msg.sender && (
                  <Image src={getAvatarUrl(msg.sender.name, msg.sender.avatar_url)} alt="" width={28} height={28} className="rounded-full flex-shrink-0 mb-1" />
                )}
                <div className={cn('max-w-[75%] space-y-1 flex flex-col', isMe ? 'items-end' : 'items-start')}>
                  {msg.image_url && (
                    <div className="relative w-48 h-36 rounded-2xl overflow-hidden">
                      <Image src={msg.image_url} alt="" fill className="object-cover" />
                    </div>
                  )}
                  {msg.text && (
                    <div className={cn('px-4 py-2.5 rounded-2xl text-sm leading-relaxed', isMe ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-white text-gray-900 shadow-card rounded-bl-sm')}>
                      {msg.text}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 px-1">{formatDate(msg.created_at)}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white border-t border-gray-100 px-3 py-3">
          {imagePreview && (
            <div className="relative w-16 h-16 mb-2">
              <Image src={imagePreview} alt="" fill className="object-cover rounded-xl" />
              <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute -top-1 -right-1 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => fileRef.current?.click()} className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex-shrink-0">
              <ImageIcon className="w-5 h-5 text-gray-500" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
              }} />
            <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Мессеж бичнэ үү..." rows={1}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent max-h-24" />
            <button onClick={sendMessage} disabled={isSending || (!text.trim() && !imageFile)}
              className="p-2.5 bg-primary-500 rounded-xl hover:bg-primary-600 transition-colors flex-shrink-0 disabled:opacity-50">
              {isSending ? <Spinner size="sm" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content pb-28">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Чат</h1>
        <p className="text-gray-500 text-sm mt-1">Ажлын харилцаанууд</p>
      </div>
      {isLoading ? (
        <div className="px-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl">
              <div className="skeleton w-12 h-12 rounded-full" />
              <div className="flex-1"><div className="skeleton h-4 w-32 rounded mb-2" /><div className="skeleton h-3 w-48 rounded" /></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-4"><ErrorState message={error} onRetry={fetchConversations} /></div>
      ) : conversations.length === 0 ? (
        <EmptyState emoji="💬" title="Харилцаа байхгүй" description="Ажил хүлээн авсны дараа чатлах боломжтой" action={{ label: 'Ажил хайх', href: '/' }} />
      ) : (
        <div className="px-4 space-y-2">
          {conversations.map(task => {
            const other = task.users;
            return (
              <button key={task.id} onClick={() => setSelectedTask(task)}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all text-left">
                {other && <Image src={getAvatarUrl(other.name, other.avatar_url)} alt={other.name} width={48} height={48} className="rounded-full flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm">{other?.name}</p>
                    <span className="text-[10px] text-gray-400">{formatDate(task.updated_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{task.title}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Spinner />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
