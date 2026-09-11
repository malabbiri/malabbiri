import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Building, 
  Star, 
  FileCheck, 
  Award,
  Layers,
  MapPin
} from 'lucide-react';
import { SubmissionRecord, SurveyRecord } from '../types';
import { SERVICES_LIST } from '../data/services';

interface StatisticsViewProps {
  submissions: SubmissionRecord[];
  surveys: SurveyRecord[];
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  submissions,
  surveys
}) => {
  const total = submissions.length;
  const approved = submissions.filter(s => s.status === 'APPROVED').length;
  const inProcess = submissions.filter(s => ['SUBMITTED', 'VERIFYING', 'REVIEW'].includes(s.status)).length;
  const revision = submissions.filter(s => s.status === 'REVISION_NEEDED').length;

  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 100;

  const avgRating = surveys.length > 0
    ? (surveys.reduce((acc, curr) => acc + curr.overallRating, 0) / surveys.length).toFixed(1)
    : '5.0';

  // Submissions per service count
  const serviceStats = SERVICES_LIST.map(svc => {
    const count = submissions.filter(s => s.serviceId === svc.id).length;
    return {
      id: svc.id,
      shortTitle: svc.shortTitle,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0
    };
  });

  // District stats
  const districtCounts: Record<string, number> = {};
  submissions.forEach(s => {
    if (s.district) {
      districtCounts[s.district] = (districtCounts[s.district] || 0) + 1;
    }
  });

  const sortedDistricts = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Statistik & Analisis Kinerja Layanan</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Transparansi & Indikator Kinerja Pelayanan
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
          Data real-time volume permohonan masuk, tingkat penyelesaian dokumen, dan sebaran pemohon di 18 KUA Kecamatan Kabupaten Gowa.
        </p>
      </div>

      {/* 4 High-Level Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-white/15 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Total Berkas Masuk</span>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">{total}</span>
            <span className="text-xs text-emerald-400 font-semibold ml-2">Permohonan</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Terdaftar di sistem digital MALA'BIRI
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-emerald-500/30 bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-300 font-semibold">Tingkat Penyelesaian</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-300 tracking-tight">{approvalRate}%</span>
            <span className="text-xs text-slate-300 ml-2">({approved} Terbit)</span>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">
            SKT / Rekomendasi sah diterbitkan
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-amber-500/30 bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-semibold">Dalam Proses Aktif</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-300 tracking-tight">{inProcess}</span>
            <span className="text-xs text-slate-300 ml-2">Berkas</span>
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1">
            Tahap verifikasi & telaah falakiyah
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-teal-500/30 bg-teal-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-teal-300 font-semibold">Indeks Kepuasan (IKM)</span>
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-teal-300 tracking-tight">{avgRating}</span>
            <span className="text-xs text-slate-300 ml-1">/ 5.0</span>
          </div>
          <p className="text-[11px] text-teal-300/80 mt-1">
            Kategori: <strong>Sangat Memuaskan</strong> ({surveys.length} ulasan)
          </p>
        </div>
      </div>

      {/* Grid: Service Breakdown & District Spread */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Breakdown (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border-white/15 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white">
                Sebaran Permohonan Berdasarkan 9 Layanan
              </h3>
              <p className="text-xs text-slate-400">
                Aktivitas penggunaan masing-masing layanan Seksi Bimas Islam
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              9 Layanan
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {serviceStats.map(stat => (
              <div key={stat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 truncate pr-2">
                    Layanan #{stat.id}: {stat.shortTitle}
                  </span>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-bold text-white font-mono">{stat.count} Berkas</span>
                    <span className="text-[11px] text-slate-400">({stat.percent}%)</span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(stat.percent, stat.count > 0 ? 8 : 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* District Distribution & Service Standard info */}
        <div className="space-y-6">
          {/* Top Districts */}
          <div className="glass-panel p-6 rounded-3xl border-white/15 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Sebaran Kecamatan Teraktif</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">18 KUA</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {sortedDistricts.length > 0 ? (
                sortedDistricts.map(([district, count], idx) => (
                  <div
                    key={district}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-200">Kec. {district}</span>
                    </div>
                    <span className="font-bold font-mono text-emerald-300">{count} Berkas</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Belum ada data kecamatan masuk.</p>
              )}
            </div>
          </div>

          {/* Ministry Quality Standard Commitment */}
          <div className="glass-panel p-5 rounded-3xl border-emerald-500/30 bg-emerald-950/25 space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-300">
              <Award className="w-5 h-5" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Maklumat Pelayanan MALA'BIRI
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              "Kami berkomitmen memberikan pelayanan Bimbingan Masyarakat Islam yang <strong>Responsif, Akuntabel, Transparan, dan Tanpa Biaya (Gratis)</strong> demi mewujudkan zona integritas WBK/WBBM di lingkungan Kemenag Kab. Gowa."
            </p>

            <div className="pt-1 text-[11px] font-semibold text-emerald-400">
              Seksi Bimas Islam Kemenag Kab. Gowa
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
