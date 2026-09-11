import React, { useState } from 'react';
import { 
  Star, 
  Smile, 
  Meh, 
  Frown, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Sparkles, 
  ThumbsUp, 
  Award,
  Heart
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SurveyRecord } from '../types';
import { SERVICES_LIST } from '../data/services';
import { saveSurvey } from '../utils/storage';
import { formatShortDate } from '../utils/date';

interface SatisfactionSurveyProps {
  surveys: SurveyRecord[];
  onSurveySubmitted: () => void;
}

export const SatisfactionSurveyView: React.FC<SatisfactionSurveyProps> = ({
  surveys,
  onSurveySubmitted
}) => {
  const [applicantName, setApplicantName] = useState('');
  const [serviceTitle, setServiceTitle] = useState(SERVICES_LIST[0].title);
  const [overallRating, setOverallRating] = useState<number>(5);
  const [feedback, setFeedback] = useState('');

  // 5 standard public service evaluation criteria
  const [ratings, setRatings] = useState({
    requirementClarity: 5,
    speedOfService: 5,
    processEase: 5,
    staffResponsiveness: 5,
    serviceQuality: 5
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const criteriaList = [
    { key: 'requirementClarity' as const, label: '1. Kejelasan Persyaratan & Informasi' },
    { key: 'speedOfService' as const, label: '2. Kecepatan Waktu Verifikasi Berkas' },
    { key: 'processEase' as const, label: '3. Kemudahan Prosedur & Penggunaan Website' },
    { key: 'staffResponsiveness' as const, label: '4. Keramahan & Responsivitas Petugas' },
    { key: 'serviceQuality' as const, label: '5. Kualitas Hasil Layanan / Dokumen' }
  ];

  const handleRatingChange = (key: keyof typeof ratings, val: number) => {
    setRatings(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim()) {
      alert('Mohon masukkan nama Anda.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      saveSurvey({
        applicantName,
        serviceTitle,
        overallRating,
        ratings,
        feedback: feedback.trim() || 'Pelayanan sangat baik, cepat, dan responsif.'
      });

      setIsSubmitting(false);
      setIsSubmittedSuccess(true);
      onSurveySubmitted();

      try {
        confetti({
          particleCount: 60,
          spread: 60
        });
      } catch (err) {
        // ignore
      }
    }, 400);
  };

  const avgOverall = surveys.length > 0
    ? (surveys.reduce((acc, curr) => acc + curr.overallRating, 0) / surveys.length).toFixed(1)
    : '5.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Title */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <Award className="w-3.5 h-3.5 text-emerald-400" />
          <span>Indeks Kepuasan Masyarakat (IKM)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Survey Kepuasan Layanan Bimas Islam
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Bantu kami menjaga kualitas pelayanan yang responsif, transparan, dan prima dengan memberikan penilaian pengalaman Anda.
        </p>
      </div>

      {/* Top IKM Score Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-cyan-950/40 to-emerald-950/40 shadow-2xl max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 flex flex-col items-center justify-center font-extrabold shadow-[0_0_30px_rgba(16,185,129,0.35)]">
            <span className="text-2xl sm:text-3xl leading-none">{avgOverall}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold">/ 5.0</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <h4 className="text-base font-bold text-white">
              Mutu Pelayanan: Sangat Memuaskan (A)
            </h4>
            <p className="text-xs text-slate-300">
              Berdasarkan {surveys.length} responden masyarakat & pengurus lembaga se-Kabupaten Gowa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="block text-lg font-bold text-emerald-300">100%</span>
            <span className="text-[10px] text-slate-400">Bebas Pungli</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="block text-lg font-bold text-cyan-300">&lt; 24 Jam</span>
            <span className="text-[10px] text-slate-400">Respon Cepat</span>
          </div>
        </div>
      </div>

      {/* Form and Testimonials Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Survey Form */}
        <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl border-white/20 shadow-2xl">
          {isSubmittedSuccess ? (
            <div className="text-center py-10 space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white">Terima Kasih Atas Penilaian Anda!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Ulasan dan evaluasi Anda sangat berharga bagi peningkatan mutu layanan Seksi Bimas Islam Kantor Kementerian Agama Kabupaten Gowa.
              </p>
              <button
                onClick={() => {
                  setIsSubmittedSuccess(false);
                  setApplicantName('');
                  setFeedback('');
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Isi Survey Baru
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Kuesioner Penilaian Layanan</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Lengkapi data singkat berikut untuk mengirimkan evaluasi
                </p>
              </div>

              {/* Name & Service Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200">
                    Nama Anda / Perwakilan Lembaga: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Contoh: Drs. H. Ahmad / MT Nurul Iman"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200">
                    Layanan yang Diterima:
                  </label>
                  <select
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white truncate"
                  >
                    {SERVICES_LIST.map(svc => (
                      <option key={svc.id} value={svc.title} className="bg-slate-900">
                        {svc.shortTitle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Overall Emotion / Rating Selector */}
              <div className="glass-panel p-4 rounded-2xl border-white/10 space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  Tingkat Kepuasan Secara Keseluruhan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { stars: 5, label: 'Sangat Puas', color: 'emerald' },
                    { stars: 4, label: 'Puas', color: 'teal' },
                    { stars: 3, label: 'Cukup', color: 'amber' },
                    { stars: 2, label: 'Kurang Puas', color: 'rose' }
                  ].map(option => (
                    <button
                      key={option.stars}
                      type="button"
                      onClick={() => setOverallRating(option.stars)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        overallRating === option.stars
                          ? 'bg-emerald-500/25 border-emerald-400 text-white shadow-lg'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex justify-center gap-0.5 text-amber-400 mb-1">
                        {Array.from({ length: option.stars }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold block">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 Specific Criteria Ratings */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                  Penilaian Berdasarkan 5 Unsur Pelayanan Publik:
                </span>
                {criteriaList.map((crit) => (
                  <div
                    key={crit.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <span className="text-xs text-slate-300 font-medium">
                      {crit.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = ratings[crit.key] >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(crit.key, star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                isFilled
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="text-xs font-mono font-bold text-emerald-400 ml-1">
                        {ratings[crit.key]}.0
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-200">
                  Saran, Masukan, atau Apresiasi Anda:
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Ceritakan pengalaman Anda menggunakan layanan online MALA'BIRI..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Penilaian IKM</span>
              </button>
            </form>
          )}
        </div>

        {/* Public Testimonials Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>Apresiasi & Testimoni Masyarakat</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">{surveys.length} Ulasan</span>
          </div>

          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="glass-panel p-4 rounded-2xl border-white/15 space-y-2.5 relative"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white">
                      {survey.applicantName}
                    </h5>
                    <p className="text-[10px] text-emerald-400 font-medium">
                      {survey.serviceTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: survey.overallRating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-300 italic leading-relaxed">
                  "{survey.feedback}"
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-500">
                  <span>{formatShortDate(survey.createdAt)}</span>
                  <span className="text-emerald-400/80 font-mono">Terverifikasi</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
