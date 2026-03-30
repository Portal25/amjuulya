'use client';

import toast from 'react-hot-toast';
import { ApiError } from './api';

export function handleError(err: unknown, fallback = 'Алдаа гарлаа, дахин оролдоно уу'): string {
  if (err instanceof ApiError) {
    toast.error(err.message);
    return err.message;
  }
  if (err instanceof Error) {
    toast.error(err.message || fallback);
    return err.message;
  }
  toast.error(fallback);
  return fallback;
}

export async function tryCatch<T>(
  fn: () => Promise<T>,
  onError?: (msg: string) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const msg = handleError(err);
    onError?.(msg);
    return null;
  }
}
