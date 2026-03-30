'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield, ChevronLeft } from 'lucide-react';
import { auth } from '@/lib/api';
import { tryCatch } from '@/lib/errors';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

type Step = 'phone' | 'otp';

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits.startsWith('976') ? `+${digits}` : digits.length > 0 ? `+976${digits}` : '';
  };

  const validatePhone = () => {
    if (!phone || phone.replace(/\D/g,'').length < 8) {
      setPhoneError('8 оронтой утасны дугаар оруулна уу');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSendOTP = async () => {
    if (!validatePhone()) return;
    setIsLoading(true);
    const formattedPhone = formatPhone(phone);
    const ok = await tryCatch(() => auth.sendOtp(formattedPhone));
    if (ok !== null) { toast.success('OTP код илгээгдлээ!'); setStep('otp'); }
    setIsLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) { setOtpError('6 оронтой кодоо оруулна уу'); return; }
    setOtpError('');
    setIsLoading(true);
    const formattedPhone = formatPhone(phone);
    const ok = await tryCatch(() => auth.verifyOtp(formattedPhone, otp));
    if (ok !== null) { toast.success('Амжилттай нэвтэрлээ!'); router.push('/'); router.refresh(); }
    else { setOtpError('Код буруу байна. Дахин оролдоно уу.'); }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-500 to-primary-700 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-green">
          <span className="text-4xl">⚡</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Амжуулъя</h1>
        <p className="text-white/80 text-center text-sm leading-relaxed">Өдөр тутмын ажлаа хялбархан хийлгэж, орлого олоорой</p>
        <div className="flex gap-3 mt-6 flex-wrap justify-center">
          {['🔒 Найдвартай', '⚡ Хурдан', '💰 Тэнцвэртэй'].map(b => (
            <div key={b} className="bg-white/20 rounded-full px-3 py-1.5"><span className="text-white text-xs font-medium">{b}</span></div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-t-[2rem] px-6 pt-8 pb-12 shadow-2xl">
        {step === 'phone' ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Нэвтрэх</h2>
            <p className="text-gray-500 text-sm mb-6">Утасны дугаараа оруулна уу</p>
            <div className="flex gap-3 mb-1">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 flex items-center gap-2 flex-shrink-0">
                <span className="text-lg">🇲🇳</span>
                <span className="text-sm font-medium text-gray-700">+976</span>
              </div>
              <input
                type="tel" inputMode="numeric" value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g,'').slice(0,8)); setPhoneError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                placeholder="8888 8888"
                className={`input-field flex-1 text-center tracking-widest text-lg font-semibold ${phoneError ? 'border-red-400 focus:ring-red-400' : ''}`}
                autoFocus
              />
            </div>
            {phoneError && <p className="text-xs text-red-500 mb-4 ml-1">{phoneError}</p>}
            <div className="mb-5" />
            <button onClick={handleSendOTP} disabled={isLoading || phone.length < 8}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? <Spinner /> : <><span>Код авах</span><ArrowRight className="w-4 h-4" /></>}
            </button>
            <div className="flex items-center gap-2 mt-5 bg-blue-50 rounded-2xl p-3.5">
              <Shield className="w-4 h-4 text-info-500 flex-shrink-0" />
              <p className="text-xs text-gray-500 leading-relaxed">Таны дугаар зөвхөн нэвтрэхэд ашиглагдана. Бид нууцлалыг хамгаална.</p>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => { setStep('phone'); setOtp(''); setOtpError(''); }} className="flex items-center gap-1 text-gray-400 mb-5 -ml-1">
              <ChevronLeft className="w-5 h-5" /><span className="text-sm">Буцах</span>
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Кодоо оруулна уу</h2>
            <p className="text-gray-500 text-sm mb-6">
              <span className="font-medium text-gray-700">+976 {phone}</span> дугаарт код илгээгдлээ
            </p>

            <div className="flex gap-2 justify-center mb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`w-11 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  otp[i] ? 'border-primary-500 bg-primary-50 text-primary-700' :
                  i === otp.length ? 'border-primary-300 bg-primary-50/50' : 'border-gray-200 bg-gray-50'}`}>
                  {otp[i] || ''}
                </div>
              ))}
            </div>
            {otpError && <p className="text-xs text-red-500 mb-3 text-center">{otpError}</p>}

            <input type="text" inputMode="numeric" value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g,'').slice(0,6)); setOtpError(''); }}
              onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleVerifyOTP()}
              className="sr-only" autoFocus />

            <div className="mb-4" />
            <button onClick={handleVerifyOTP} disabled={isLoading || otp.length < 6}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? <Spinner /> : 'Баталгаажуулах'}
            </button>
            <button onClick={handleSendOTP} className="w-full text-sm text-gray-500 hover:text-primary-500 transition-colors py-2">
              Дахин код авах
            </button>
          </>
        )}
      </div>
    </div>
  );
}
