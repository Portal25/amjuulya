'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store';
import { notifications } from '@/lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setUnreadCount } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    const fetchUser = async (userId: string) => {
      const { data } = await supabase.from('users').select('*').eq('id', userId).single();
      if (data) {
        setUser(data);
        const count = await notifications.unreadCount(userId);
        setUnreadCount(count);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchUser(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) await fetchUser(session.user.id);
      else { setUser(null); setUnreadCount(0); }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, setUnreadCount]);

  return <>{children}</>;
}
