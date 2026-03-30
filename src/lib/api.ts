import { createClient } from './supabase/client';
import { Task, TaskCategory, User, Transaction, Dispute, Rating, Message } from './supabase/database.types';

// ─── Helper ──────────────────────────────────────────────────
function supabase() { return createClient(); }

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function throwIf(error: unknown, fallback: string): never {
  const msg = (error as { message?: string })?.message || fallback;
  throw new ApiError('SUPABASE_ERROR', msg);
}

// ─── AUTH ─────────────────────────────────────────────────────
export const auth = {
  async sendOtp(phone: string) {
    const { error } = await supabase().auth.signInWithOtp({ phone });
    if (error) throwIf(error, 'OTP илгээхэд алдаа гарлаа');
  },
  async verifyOtp(phone: string, token: string) {
    const { error } = await supabase().auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throwIf(error, 'Код буруу байна');
  },
  async signOut() {
    await supabase().auth.signOut();
  },
  async getSession() {
    const { data } = await supabase().auth.getSession();
    return data.session;
  },
};

// ─── USERS ────────────────────────────────────────────────────
export const users = {
  async getById(id: string): Promise<User> {
    const { data, error } = await supabase().from('users').select('*').eq('id', id).single();
    if (error) throwIf(error, 'Хэрэглэгч олдсонгүй');
    return data as User;
  },
  async update(id: string, updates: Partial<Pick<User, 'name' | 'avatar_url'>>) {
    const { error } = await supabase().from('users').update(updates).eq('id', id);
    if (error) throwIf(error, 'Профайл шинэчлэхэд алдаа гарлаа');
  },
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const db = supabase();
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await db.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throwIf(error, 'Зураг байршуулахад алдаа гарлаа');
    const { data } = db.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl + '?t=' + Date.now();
  },
};

// ─── TASKS ────────────────────────────────────────────────────
export const tasks = {
  async list(opts?: { category?: TaskCategory; status?: string; limit?: number }) {
    let q = supabase()
      .from('tasks')
      .select('*, users(*)')
      .order('created_at', { ascending: false })
      .limit(opts?.limit ?? 50);
    if (opts?.status) q = q.eq('status', opts.status);
    else q = q.eq('status', 'pending');
    if (opts?.category) q = q.eq('category', opts.category);
    const { data, error } = await q;
    if (error) throwIf(error, 'Ажлуудыг татаж авахад алдаа гарлаа');
    return data as Task[];
  },

  async getById(id: string): Promise<Task> {
    const { data, error } = await supabase()
      .from('tasks').select('*').eq('id', id).single();
    if (error) throwIf(error, 'Ажил олдсонгүй');
    return data as Task;
  },

  async myPosted(userId: string, status?: string): Promise<Task[]> {
    let q = supabase().from('tasks').select('*, users(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throwIf(error, 'Ажлуудыг татаж авахад алдаа гарлаа');
    return data as Task[];
  },

  async myAccepted(userId: string, status?: string): Promise<Task[]> {
    let q = supabase().from('tasks').select('*, users(*)').eq('worker_id', userId).order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throwIf(error, 'Ажлуудыг татаж авахад алдаа гарлаа');
    return data as Task[];
  },

  async postWithEscrow(params: {
    userId: string; title: string; description: string;
    category: TaskCategory; price: number; location?: string;
    isUrgent?: boolean; images?: string[];
  }) {
    const { data, error } = await supabase().rpc('post_task_with_escrow', {
      p_user_id: params.userId,
      p_title: params.title,
      p_description: params.description,
      p_category: params.category,
      p_price: params.price,
      p_location: params.location ?? null,
      p_is_urgent: params.isUrgent ?? false,
      p_images: params.images ?? [],
    });
    if (error) throwIf(error, 'Ажил нийтлэхэд алдаа гарлаа');
    if (!data.success) throw new ApiError('RPC_ERROR', data.error);
    return data.task_id as string;
  },

  async accept(taskId: string, workerId: string) {
    const { data, error } = await supabase().rpc('accept_task', {
      p_task_id: taskId,
      p_worker_id: workerId,
    });
    if (error) throwIf(error, 'Ажил хүлээж авахад алдаа гарлаа');
    if (!data.success) throw new ApiError('RPC_ERROR', data.error);
  },

  async confirmCompletion(taskId: string, userId: string) {
    const { data, error } = await supabase().rpc('confirm_task_completion', {
      p_task_id: taskId,
      p_user_id: userId,
    });
    if (error) throwIf(error, 'Баталгаажуулахад алдаа гарлаа');
    if (!data.success) throw new ApiError('RPC_ERROR', data.error);
  },

  async uploadProofImages(taskId: string, userId: string, files: File[]): Promise<string[]> {
    const db = supabase();
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${taskId}-${Date.now()}.${ext}`;
      const { error } = await db.storage.from('proof-images').upload(path, file);
      if (error) continue;
      const { data } = db.storage.from('proof-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    if (urls.length === 0) throw new ApiError('UPLOAD_ERROR', 'Зураг байршуулахад алдаа гарлаа');
    const current = await tasks.getById(taskId);
    const merged = [...(current.proof_images || []), ...urls];
    const { error } = await db.from('tasks').update({ proof_images: merged }).eq('id', taskId);
    if (error) throwIf(error, 'Нотлох зураг хадгалахад алдаа гарлаа');
    return urls;
  },

  async uploadTaskImages(userId: string, files: File[]): Promise<string[]> {
    const db = supabase();
    const urls: string[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) throw new ApiError('FILE_TOO_LARGE', 'Зураг 5MB-аас хэтрэхгүй байх ёстой');
      const ext = file.name.split('.').pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await db.storage.from('task-images').upload(path, file);
      if (error) throwIf(error, 'Зураг байршуулахад алдаа гарлаа');
      const { data } = db.storage.from('task-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  },
};

// ─── NOTIFICATIONS ────────────────────────────────────────────
export const notifications = {
  async list(userId: string) {
    const { data, error } = await supabase()
      .from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(30);
    if (error) throwIf(error, 'Мэдэгдэл татаж авахад алдаа гарлаа');
    return data || [];
  },

  async unreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase()
      .from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('read', false);
    if (error) return 0;
    return count ?? 0;
  },

  async markAllRead(userId: string) {
    await supabase().from('notifications').update({ read: true })
      .eq('user_id', userId).eq('read', false);
  },
};

// ─── MESSAGES ─────────────────────────────────────────────────
export const messages = {
  async list(taskId: string): Promise<Message[]> {
    const { data, error } = await supabase()
      .from('messages').select('*, sender:users(*)').eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) throwIf(error, 'Мессеж татаж авахад алдаа гарлаа');
    return data as Message[];
  },

  async send(taskId: string, senderId: string, text?: string, imageUrl?: string) {
    if (!text && !imageUrl) throw new ApiError('EMPTY_MESSAGE', 'Мессеж хоосон байна');
    const { error } = await supabase().from('messages').insert({
      task_id: taskId, sender_id: senderId,
      text: text?.trim() || null, image_url: imageUrl || null,
    });
    if (error) throwIf(error, 'Мессеж илгээхэд алдаа гарлаа');
  },

  async uploadImage(userId: string, file: File): Promise<string> {
    const db = supabase();
    if (file.size > 5 * 1024 * 1024) throw new ApiError('FILE_TOO_LARGE', 'Зураг 5MB-аас хэтрэхгүй байх ёстой');
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await db.storage.from('chat-images').upload(path, file);
    if (error) throwIf(error, 'Зураг байршуулахад алдаа гарлаа');
    const { data } = db.storage.from('chat-images').getPublicUrl(path);
    return data.publicUrl;
  },
};

// ─── TRANSACTIONS ─────────────────────────────────────────────
export const transactions = {
  async list(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase()
      .from('transactions').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(50);
    if (error) throwIf(error, 'Гүйлгээ татаж авахад алдаа гарлаа');
    return data as Transaction[];
  },

  async deposit(userId: string, amount: number) {
    if (amount <= 0) throw new ApiError('INVALID_AMOUNT', 'Дүн 0-ээс их байх ёстой');
    const db = supabase();
    const { data: user } = await db.from('users').select('balance').eq('id', userId).single();
    await db.from('users').update({ balance: (user?.balance || 0) + amount }).eq('id', userId);
    const { error } = await db.from('transactions').insert({
      user_id: userId, amount, type: 'deposit', status: 'success', description: 'Данс цэнэглэлт',
    });
    if (error) throwIf(error, 'Цэнэглэлтэд алдаа гарлаа');
  },
};

// ─── DISPUTES ─────────────────────────────────────────────────
export const disputes = {
  async create(params: { taskId: string; reporterId: string; reason: string; description: string }) {
    const db = supabase();
    const { error: dErr } = await db.from('disputes').insert({
      task_id: params.taskId, reporter_id: params.reporterId,
      reason: params.reason as any, description: params.description, status: 'open',
    });
    if (dErr) throwIf(dErr, 'Маргаан мэдүүлэхэд алдаа гарлаа');
    const { error: tErr } = await db.from('tasks').update({ status: 'disputed' }).eq('id', params.taskId);
    if (tErr) throwIf(tErr, 'Ажлын статус өөрчлөхөд алдаа гарлаа');
  },

  async listAll(): Promise<Dispute[]> {
    const { data, error } = await supabase().from('disputes').select('*').order('created_at', { ascending: false });
    if (error) throwIf(error, 'Маргаануудыг татаж авахад алдаа гарлаа');
    return data as Dispute[];
  },

  async resolve(disputeId: string, resolution: 'refund_user' | 'pay_worker' | 'split', notes?: string) {
    const { data, error } = await supabase().rpc('resolve_dispute', {
      p_dispute_id: disputeId, p_resolution: resolution, p_admin_notes: notes ?? null,
    });
    if (error) throwIf(error, 'Маргаан шийдвэрлэхэд алдаа гарлаа');
    if (!data.success) throw new ApiError('RPC_ERROR', data.error);
  },
};

// ─── RATINGS ──────────────────────────────────────────────────
export const ratings = {
  async create(params: { taskId: string; raterId: string; ratedId: string; stars: number; comment?: string }) {
    const { error } = await supabase().from('ratings').insert({
      task_id: params.taskId, rater_id: params.raterId, rated_id: params.ratedId,
      stars: params.stars, comment: params.comment || null,
    });
    if (error) throwIf(error, 'Үнэлгээ өгөхөд алдаа гарлаа');
  },

  async hasRated(taskId: string, raterId: string): Promise<boolean> {
    const { data } = await supabase().from('ratings').select('id').eq('task_id', taskId).eq('rater_id', raterId).maybeSingle();
    return !!data;
  },
};
