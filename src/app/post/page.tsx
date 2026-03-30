'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Upload, X, Zap } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { tasks as tasksApi } from '@/lib/api';
import { tryCatch } from '@/lib/errors';
import { CATEGORIES } from '@/lib/utils';
import { TaskCategory } from '@/lib/supabase/database.types';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

type FormErrors = Partial<
  Record<
    'title' | 'description' | 'category' | 'price' | 'balance' | 'location',
    string
  >
>;

export default function PostTaskPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '' as TaskCategory | '',
    price: '',
    location: '',
    is_urgent: false,
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = 'Гарчиг оруулна уу';
    else if (form.title.trim().length < 5)
      errs.title = 'Гарчиг хамгийн багадаа 5 тэмдэгт байна';
    if (!form.description.trim()) errs.description = 'Тайлбар оруулна уу';
    else if (form.description.trim().length < 10)
      errs.description = 'Тайлбар хамгийн багадаа 10 тэмдэгт байна';
    if (!form.category) errs.category = 'Ангилал сонгоно уу';
    if (!form.price || Number(form.price) <= 0) errs.price = 'Үнэ оруулна уу';
    else if (Number(form.price) > (user?.balance || 0))
      errs.balance = `Хэтэвчний үлдэгдэл хүрэлцэхгүй (₮${(user?.balance || 0).toLocaleString()} байна)`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const oversized = files.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) {
      toast.error('Зураг 5MB-аас хэтрэхгүй байх ёстой');
      return;
    }
    if (files.length + images.length > 5) {
      toast.error('Хамгийн ихдээ 5 зураг оруулна уу');
      return;
    }
    const newFiles = [...images, ...files].slice(0, 5);
    setImages(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!validate()) return;

    setIsLoading(true);
    const toastId = toast.loading('Ажил нийтэлж байна...');

    const result = await tryCatch(async () => {
      let imageUrls: string[] = [];
      if (images.length > 0)
        imageUrls = await tasksApi.uploadTaskImages(user.id, images);

      const taskId = await tasksApi.postWithEscrow({
        userId: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category as TaskCategory,
        price: Number(form.price),
        location: form.location.trim() || undefined,
        isUrgent: form.is_urgent,
        images: imageUrls,
      });
      return taskId;
    });

    if (result) {
      toast.success('Ажил амжилттай нийтлэгдлээ! 🎉', { id: toastId });
      router.push(`/task/${result}`);
    } else {
      toast.dismiss(toastId);
    }
    setIsLoading(false);
  };

  const PRICE_SUGGESTIONS = [5000, 10000, 20000, 50000, 100000];
  const Field = ({
    name,
    label,
    required,
  }: {
    name: keyof FormErrors;
    label: string;
    required?: boolean;
  }) => (
    <p className="block text-sm font-semibold text-gray-700 mb-2">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </p>
  );

  return (
    <div className="pb-32">
      <div className="page-header">
        <Link
          href="/"
          className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="font-bold text-gray-900 text-lg flex-1">Ажил нийтлэх</h1>
        <button
          onClick={() => setForm((f) => ({ ...f, is_urgent: !f.is_urgent }))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${form.is_urgent ? 'bg-danger-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          <Zap className="w-3 h-3" /> Яаралтай
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Category */}
        <div>
          <Field name="category" label="Ангилал" required />
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => {
                  setForm((f) => ({ ...f, category: key as TaskCategory }));
                  setErrors((e) => ({ ...e, category: undefined }));
                }}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all duration-200 ${form.category === key ? 'border-primary-500 bg-primary-50 shadow-green scale-105' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-[9px] font-medium text-gray-600 text-center leading-tight">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
          {errors.category && (
            <p className="text-xs text-red-500 mt-1.5">{errors.category}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <Field name="title" label="Гарчиг" required />
          <input
            type="text"
            value={form.title}
            onChange={(e) => {
              setForm((f) => ({ ...f, title: e.target.value }));
              setErrors((e) => ({ ...e, title: undefined }));
            }}
            placeholder="Жишээ: Хог асгах хэрэгтэй байна"
            className={`input-field ${errors.title ? 'border-red-400 focus:ring-red-400' : ''}`}
            maxLength={100}
          />
          {errors.title ? (
            <p className="text-xs text-red-500 mt-1">{errors.title}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.title.length}/100
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <Field name="description" label="Дэлгэрэнгүй" required />
          <textarea
            value={form.description}
            onChange={(e) => {
              setForm((f) => ({ ...f, description: e.target.value }));
              setErrors((e) => ({ ...e, description: undefined }));
            }}
            placeholder="Ажлын дэлгэрэнгүй мэдээллийг бичнэ үү..."
            className={`input-field resize-none ${errors.description ? 'border-red-400 focus:ring-red-400' : ''}`}
            rows={4}
            maxLength={500}
          />
          {errors.description ? (
            <p className="text-xs text-red-500 mt-1">{errors.description}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.description.length}/500
            </p>
          )}
        </div>

        {/* Price */}
        <div>
          <Field name="price" label="Үнэ (₮)" required />
          {user && (
            <p className="text-xs text-gray-400 mb-2">
              Хэтэвчний үлдэгдэл: ₮{(user.balance || 0).toLocaleString()}
            </p>
          )}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
              ₮
            </span>
            <input
              type="number"
              value={form.price}
              onChange={(e) => {
                setForm((f) => ({ ...f, price: e.target.value }));
                setErrors((e) => ({
                  ...e,
                  price: undefined,
                  balance: undefined,
                }));
              }}
              placeholder="0"
              className={`input-field pl-8 text-lg font-bold ${errors.price || errors.balance ? 'border-red-400 focus:ring-red-400' : ''}`}
              min="0"
            />
          </div>
          {(errors.price || errors.balance) && (
            <p className="text-xs text-red-500 mt-1">
              {errors.price || errors.balance}
            </p>
          )}
          <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide pb-1">
            {PRICE_SUGGESTIONS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setForm((f) => ({ ...f, price: String(p) }));
                  setErrors((e) => ({
                    ...e,
                    price: undefined,
                    balance: undefined,
                  }));
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${Number(form.price) === p ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
              >
                ₮{p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <Field name="location" label="Байршил" />
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
              placeholder="Дүүрэг, хороо..."
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Images */}
        <div>
          <Field name="title" label="Зурагнууд" />
          <div className="flex gap-2 flex-wrap">
            {previews.map((src, i) => (
              <div
                key={i}
                className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0"
              >
                <Image src={src} alt="" fill className="object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {previews.length < 5 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-primary-300 hover:bg-primary-50 transition-all"
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-[10px] text-gray-400">Зураг</span>
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <p className="text-xs text-gray-400 mt-1">
            Хамгийн ихдээ 5 зураг, тус бүр 5MB хүртэл
          </p>
        </div>
      </div>

      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 bg-white/95 backdrop-blur-sm pt-3 pb-3 border-t border-gray-100">
        {!user ? (
          <Link
            href="/auth"
            className="btn-primary w-full flex items-center justify-center"
          >
            Нэвтэрч нийтлэх
          </Link>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? <Spinner /> : 'Захиалга нийтлэх'}
          </button>
        )}
        <p className="text-xs text-gray-400 text-center mt-2">
          Нийтлэхэд таны ₮{Number(form.price || 0).toLocaleString()} хэтэвчнээс
          хаагдана
        </p>
      </div>
    </div>
  );
}
