-- ============================================================
-- Амжуулъя (Amjuulya) - Task Marketplace Platform
-- Supabase Database Schema
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT UNIQUE,
  avatar_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS TABLE  
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('хог_асгах', 'хүргэлт', 'худалдаа', 'нохой_гаргах', 'цэвэрлэгээ', 'засвар', 'бусад')),
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'disputed', 'cancelled')),
  is_urgent BOOLEAN DEFAULT FALSE,
  location TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  images TEXT[] DEFAULT '{}',
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  proof_images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'escrow', 'release', 'refund', 'withdrawal')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DISPUTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('not_completed', 'poor_quality', 'no_show', 'fraud', 'other')),
  description TEXT NOT NULL,
  proof_images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
  resolution TEXT CHECK (resolution IN ('refund_user', 'pay_worker', 'split', NULL)),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================
-- RATINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, rater_id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_worker_id_idx ON public.tasks(worker_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_category_idx ON public.tasks(category);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_task_id_idx ON public.messages(task_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS disputes_task_id_idx ON public.disputes(task_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Anyone can view pending tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Task owners and workers can update" ON public.tasks FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = worker_id);

-- Messages policies
CREATE POLICY "Task participants can view messages" ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND (user_id = auth.uid() OR worker_id = auth.uid())
    )
  );
CREATE POLICY "Task participants can send messages" ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND (user_id = auth.uid() OR worker_id = auth.uid())
    )
  );

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Disputes policies
CREATE POLICY "Dispute participants can view" ON public.disputes FOR SELECT 
  USING (
    auth.uid() = reporter_id OR 
    EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND (user_id = auth.uid() OR worker_id = auth.uid()))
  );
CREATE POLICY "Authenticated users can create disputes" ON public.disputes FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Ratings policies
CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Task participants can rate" ON public.ratings FOR INSERT 
  WITH CHECK (
    auth.uid() = rater_id AND
    EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND status = 'completed' AND (user_id = auth.uid() OR worker_id = auth.uid()))
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update user rating when new rating is added
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET 
    rating = (SELECT AVG(stars)::DECIMAL(3,2) FROM public.ratings WHERE rated_id = NEW.rated_id),
    rating_count = (SELECT COUNT(*) FROM public.ratings WHERE rated_id = NEW.rated_id)
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_rating_created AFTER INSERT ON public.ratings FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in Supabase Dashboard > Storage:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('task-images', 'task-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('proof-images', 'proof-images', true);

-- Storage policies (run after creating buckets):
-- CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id IN ('task-images', 'avatars', 'chat-images', 'proof-images'));
-- CREATE POLICY "Auth upload" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "Owner delete" ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- SEED DATA (Optional - for development)
-- ============================================================
-- Uncomment to add sample categories reference data if needed

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_accepted','task_completed','payment_released','new_message','dispute_opened','dispute_resolved','task_expired')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  amount DECIMAL(10,2),
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System inserts audit" ON public.audit_log FOR INSERT WITH CHECK (true);

-- ATOMIC RPC: accept_task
CREATE OR REPLACE FUNCTION accept_task(p_task_id UUID, p_worker_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_task public.tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id=p_task_id AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Ажил олдсонгүй эсвэл аль хэдийн хүлээж авсан'); END IF;
  IF v_task.user_id=p_worker_id THEN RETURN jsonb_build_object('success',false,'error','Өөрийн ажлаа хүлээж авах боломжгүй'); END IF;
  UPDATE public.tasks SET status='in_progress',worker_id=p_worker_id,accepted_at=NOW() WHERE id=p_task_id;
  INSERT INTO public.notifications(user_id,type,title,body,link) VALUES(v_task.user_id,'task_accepted','Ажил хүлээж авагдлаа','Таны "'||v_task.title||'" ажлыг хэн нэгэн хүлээж авлаа.','/task/'||p_task_id);
  INSERT INTO public.audit_log(actor_id,action,entity,entity_id) VALUES(p_worker_id,'accept_task','tasks',p_task_id);
  RETURN jsonb_build_object('success',true);
END;$$;

-- ATOMIC RPC: confirm_task_completion
CREATE OR REPLACE FUNCTION confirm_task_completion(p_task_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_task public.tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id=p_task_id AND user_id=p_user_id AND status='in_progress' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Ажил олдсонгүй эсвэл баталгаажуулах боломжгүй'); END IF;
  IF v_task.worker_id IS NULL THEN RETURN jsonb_build_object('success',false,'error','Ажилчин тохиолдоогүй байна'); END IF;
  IF array_length(v_task.proof_images,1) IS NULL OR array_length(v_task.proof_images,1)=0 THEN RETURN jsonb_build_object('success',false,'error','Ажилчин нотлох зураг илгээгээгүй байна'); END IF;
  UPDATE public.tasks SET status='completed',completed_at=NOW() WHERE id=p_task_id;
  UPDATE public.users SET balance=balance+v_task.price WHERE id=v_task.worker_id;
  INSERT INTO public.transactions(user_id,task_id,amount,type,status,description) VALUES(v_task.worker_id,p_task_id,v_task.price,'release','success','"'||v_task.title||'" ажлын төлбөр шилжлээ');
  INSERT INTO public.notifications(user_id,type,title,body,link) VALUES(v_task.worker_id,'payment_released','Төлбөр шилжлээ','₮'||v_task.price||' таны хэтэвчинд нэмэгдлээ.','/wallet');
  INSERT INTO public.audit_log(actor_id,action,entity,entity_id,amount) VALUES(p_user_id,'confirm_completion','tasks',p_task_id,v_task.price);
  RETURN jsonb_build_object('success',true);
END;$$;

-- ATOMIC RPC: post_task_with_escrow
CREATE OR REPLACE FUNCTION post_task_with_escrow(
  p_user_id UUID, p_title TEXT, p_description TEXT, p_category TEXT, p_price DECIMAL,
  p_location TEXT DEFAULT NULL, p_is_urgent BOOLEAN DEFAULT FALSE, p_images TEXT[] DEFAULT '{}'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user public.users%ROWTYPE; v_task_id UUID;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id=p_user_id FOR UPDATE;
  IF v_user.balance < p_price THEN RETURN jsonb_build_object('success',false,'error','Хэтэвчний үлдэгдэл хүрэлцэхгүй байна'); END IF;
  INSERT INTO public.tasks(title,description,category,price,location,is_urgent,images,user_id,status)
  VALUES(p_title,p_description,p_category,p_price,p_location,p_is_urgent,p_images,p_user_id,'pending') RETURNING id INTO v_task_id;
  UPDATE public.users SET balance=balance-p_price WHERE id=p_user_id;
  INSERT INTO public.transactions(user_id,task_id,amount,type,status,description) VALUES(p_user_id,v_task_id,p_price,'escrow','success','"'||p_title||'" ажлын төлбөр хаагдлаа');
  INSERT INTO public.audit_log(actor_id,action,entity,entity_id,amount) VALUES(p_user_id,'post_task','tasks',v_task_id,p_price);
  RETURN jsonb_build_object('success',true,'task_id',v_task_id);
END;$$;

-- ATOMIC RPC: resolve_dispute
CREATE OR REPLACE FUNCTION resolve_dispute(p_dispute_id UUID, p_resolution TEXT, p_admin_notes TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_dispute public.disputes%ROWTYPE; v_task public.tasks%ROWTYPE; v_half DECIMAL;
BEGIN
  SELECT * INTO v_dispute FROM public.disputes WHERE id=p_dispute_id AND status!='resolved' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Маргаан олдсонгүй'); END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id=v_dispute.task_id FOR UPDATE;
  UPDATE public.disputes SET status='resolved',resolution=p_resolution,admin_notes=p_admin_notes,resolved_at=NOW() WHERE id=p_dispute_id;
  UPDATE public.tasks SET status='completed',completed_at=NOW() WHERE id=v_task.id;
  IF p_resolution='refund_user' THEN
    UPDATE public.users SET balance=balance+v_task.price WHERE id=v_task.user_id;
    INSERT INTO public.transactions(user_id,task_id,amount,type,status,description) VALUES(v_task.user_id,v_task.id,v_task.price,'refund','success','Маргааны шийдвэр: Буцаан олгогдлоо');
    INSERT INTO public.notifications(user_id,type,title,body,link) VALUES(v_task.user_id,'dispute_resolved','Маргаан шийдвэрлэгдлээ','Төлбөр буцаан олгогдлоо.','/wallet');
  ELSIF p_resolution='pay_worker' AND v_task.worker_id IS NOT NULL THEN
    UPDATE public.users SET balance=balance+v_task.price WHERE id=v_task.worker_id;
    INSERT INTO public.transactions(user_id,task_id,amount,type,status,description) VALUES(v_task.worker_id,v_task.id,v_task.price,'release','success','Маргааны шийдвэр: Ажилчинд олгогдлоо');
    INSERT INTO public.notifications(user_id,type,title,body,link) VALUES(v_task.worker_id,'dispute_resolved','Маргаан шийдвэрлэгдлээ','Төлбөр таны хэтэвчинд орлоо.','/wallet');
  ELSIF p_resolution='split' AND v_task.worker_id IS NOT NULL THEN
    v_half:=ROUND(v_task.price/2,2);
    UPDATE public.users SET balance=balance+v_half WHERE id=v_task.user_id;
    UPDATE public.users SET balance=balance+v_half WHERE id=v_task.worker_id;
    INSERT INTO public.transactions(user_id,task_id,amount,type,status,description) VALUES(v_task.user_id,v_task.id,v_half,'refund','success','Маргааны шийдвэр: Хагас буцаасан');
    INSERT INTO public.transactions(user_id,task_id,amount,type,status,description) VALUES(v_task.worker_id,v_task.id,v_half,'release','success','Маргааны шийдвэр: Хагас олгогдлоо');
  END IF;
  INSERT INTO public.audit_log(action,entity,entity_id,meta) VALUES('resolve_dispute','disputes',p_dispute_id,jsonb_build_object('resolution',p_resolution));
  RETURN jsonb_build_object('success',true);
END;$$;

-- TASK EXPIRY (cron дуудах)
CREATE OR REPLACE FUNCTION expire_old_tasks() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER:=0; v_task public.tasks%ROWTYPE;
BEGIN
  FOR v_task IN SELECT * FROM public.tasks WHERE status='pending' AND created_at<NOW()-INTERVAL '72 hours' FOR UPDATE SKIP LOCKED LOOP
    UPDATE public.tasks SET status='cancelled' WHERE id=v_task.id;
    UPDATE public.users SET balance=balance+v_task.price WHERE id=v_task.user_id;
    INSERT INTO public.transactions(user_id,task_id,amount,type,status,description) VALUES(v_task.user_id,v_task.id,v_task.price,'refund','success','Ажил хугацаандаа биелэгдээгүй — буцаан олгогдлоо');
    INSERT INTO public.notifications(user_id,type,title,body,link) VALUES(v_task.user_id,'task_expired','Ажил хугацаа дууслаа','"'||v_task.title||'" ажил 72 цаг хэтэрсэн тул цуцлагдлаа.','/tasks');
    v_count:=v_count+1;
  END LOOP;
  RETURN v_count;
END;$$;
