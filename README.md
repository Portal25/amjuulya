# ⚡ Амжуулъя — Production-Ready Setup

## Хурдан эхлэх

```bash
git clone <repo>
cd amjuulya
npm install
cp .env.example .env.local
# .env.local файлд Supabase мэдээллийг оруулна
npm run dev
```

---

## Supabase тохиргоо (заавал хийх)

### 1. Мэдээллийн сан үүсгэх
Supabase Dashboard → SQL Editor → `supabase/schema.sql` файлын бүх агуулгыг буулгаж ажиллуулна.

### 2. Storage bucket үүсгэх
Supabase Dashboard → Storage → New bucket:
| Bucket нэр | Public |
|---|---|
| `task-images` | ✅ |
| `avatars` | ✅ |
| `chat-images` | ✅ |
| `proof-images` | ✅ |

Дараа нь SQL Editor-т:
```sql
CREATE POLICY "Public read" ON storage.objects FOR SELECT
  USING (bucket_id IN ('task-images','avatars','chat-images','proof-images'));
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Owner delete" ON storage.objects FOR DELETE
  USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Phone Auth идэвхжүүлэх
Authentication → Providers → Phone → Enable

### 4. Realtime идэвхжүүлэх
Database → Replication → `messages` хүснэгтийг нэмэх

---

## Vercel-д deploy хийх

```bash
npm run build        # Эхлээд локалд build шалгана
npm run type-check   # TypeScript алдаа шалгана
vercel               # Deploy хийнэ
```

Vercel → Project → Settings → Environment Variables-т нэмэх:
```
NEXT_PUBLIC_SUPABASE_URL     = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
NEXT_PUBLIC_APP_URL           = https://amjuulya.mn
```

Supabase → Authentication → URL Configuration:
- Site URL: `https://amjuulya.vercel.app`
- Redirect URLs: `https://amjuulya.vercel.app/**`

---

## Файлын бүтэц

```
src/
├── app/
│   ├── page.tsx              # Нүүр хуудас (хайлт, ангилал, жагсаалт)
│   ├── auth/page.tsx         # OTP нэвтрэлт
│   ├── post/page.tsx         # Ажил нийтлэх + escrow
│   ├── task/[id]/page.tsx    # Ажлын дэлгэрэнгүй
│   ├── tasks/page.tsx        # Миний ажлууд
│   ├── chat/page.tsx         # Realtime чат
│   ├── wallet/page.tsx       # Хэтэвч + гүйлгээ
│   ├── profile/page.tsx      # Профайл
│   └── admin/page.tsx        # Маргаан шийдвэрлэх
├── components/
│   ├── ui/index.tsx          # EmptyState, ErrorState, ConfirmDialog, NotificationBell
│   ├── Onboarding.tsx        # Анхны ашиглалтын танилцуулга
│   ├── TaskCard.tsx          # Ажлын карт + skeleton
│   ├── layout/BottomNav.tsx  # Доод навигаци
│   └── providers/AuthProvider.tsx
├── lib/
│   ├── api.ts                # Бүх API дуудлага (нэг дор)
│   ├── errors.ts             # Алдаа боловсруулах
│   ├── store.ts              # Zustand state
│   ├── utils.ts              # Хэрэгслүүд
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── database.types.ts
└── middleware.ts             # Route хамгаалалт
```

---

## Шинэ нэмэгдсэн зүйлс (Production шинэчлэл)

### Аюулгүй байдал
- ✅ Бүх санхүүгийн үйлдэл Postgres RPC-д атом гүйлгээнд
- ✅ Файлын хэмжээ болон төрлийн баталгаажуулалт (5MB, зөвхөн зураг)
- ✅ Middleware route хамгаалалт + нэвтрэлтийн дараа redirect
- ✅ RLS бодлого бүх хүснэгтэд

### UI/UX
- ✅ Анхны ашиглалтын танилцуулга (Onboarding, 3 дэлгэц)
- ✅ Бүх хуудсанд хоосон төлөв (EmptyState)
- ✅ Бүх хуудсанд алдааны төлөв + дахин оролдох (ErrorState)
- ✅ Устгах/гүйлгээ баталгаажуулах dialog (ConfirmDialog)
- ✅ Мэдэгдлийн хонх + унших
- ✅ Form inline алдааны мессеж
- ✅ Давхар submit сэргийлэлт

### Backend
- ✅ `post_task_with_escrow` — ажил нийтлэх + escrow нэгэн зэрэг
- ✅ `accept_task` — хүлээж авах + мэдэгдэл нэгэн зэрэг
- ✅ `confirm_task_completion` — баталгаажуулах + төлбөр нэгэн зэрэг
- ✅ `resolve_dispute` — маргаан шийдвэрлэх + төлбөр нэгэн зэрэг
- ✅ `expire_old_tasks` — 72 цагийн дараа автомат цуцлах
- ✅ Notifications хүснэгт
- ✅ Audit log хүснэгт

### Код чанар
- ✅ Бүх API дуудлага `src/lib/api.ts`-д нэгтгэгдсэн
- ✅ `tryCatch` хэрэгслээр алдаа боловсруулах
- ✅ TypeScript type-safe API client
- ✅ `npm run type-check` скрипт
