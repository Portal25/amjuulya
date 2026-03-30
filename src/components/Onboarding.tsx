'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SLIDES = [
  {
    emoji: '⚡',
    title: 'Амжуулъяд тавтай морил',
    desc: 'Монголын анхны даалгаврын зах зээл. Өдөр тутмын ажлаа хялбархан хийлгэж эсвэл ажил хийж орлого ол.',
  },
  {
    emoji: '📋',
    title: 'Ажил нийтлэх эсвэл хүлээж авах',
    desc: 'Ажил нийтлэгч: хог асгах, хүргэлт, цэвэрлэгээ гэх мэт ажлаа нийтэл. Ажилчин: танд тохирсон ажлыг сонгоод орлого ол.',
  },
  {
    emoji: '🔒',
    title: 'Аюулгүй эскроу систем',
    desc: 'Таны мөнгө ажил дуусах хүртэл хаагдсан байна. Ажил дуусаагүй бол буцаан авах баталгааг систем өгнө.',
  },
];

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('amjuulya_onboarding_done');
    if (!seen) setShow(true);
  }, []);

  const finish = () => {
    localStorage.setItem('amjuulya_onboarding_done', '1');
    setShow(false);
  };

  if (!show) return null;

  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex justify-end p-4">
        <button onClick={finish} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center animate-fade-in" key={slide}>
        <div className="w-24 h-24 bg-primary-50 rounded-3xl flex items-center justify-center text-5xl mb-8 shadow-green">
          {current.emoji}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{current.title}</h2>
        <p className="text-gray-500 text-base leading-relaxed max-w-sm">{current.desc}</p>
      </div>

      <div className="px-8 pb-12">
        <div className="flex justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <div key={i} className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === slide ? 'w-8 bg-primary-500' : 'w-2 bg-gray-200'
            )} />
          ))}
        </div>

        <button
          onClick={() => isLast ? finish() : setSlide(s => s + 1)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLast ? 'Эхлэх' : 'Дараах'}
          {!isLast && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
