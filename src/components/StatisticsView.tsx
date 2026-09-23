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
  const approved = submissions.filter(s => s.status === 'APPROVED' || s.status === 'COMPLETED').length;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Statistik & Indikator Kinerja Layanan</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Transparansi Pelayanan Publik
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
          Data real-time volume permohonan masuk, tingkat penyelesaian dokumen, dan sebaran pemohon di 18 KUA Kecamatan Kabupaten Gowa.
        </p>
      </div>

      {/* 4 High-Level Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Berkas Masuk</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{total}</span>
            <span className="text-xs text-slate-500 font-semibold ml-2">Permohonan</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Terdaftar di sistem digital MALA'BIRI
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-semibold">Tingkat Penyelesaian</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-700 tracking-tight">{approvalRate}%</span>
            <span className="text-xs text-slate-500 ml-2">({approved} Terbit)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            SKT / Rekomendasi sah diterbitkan
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 font-semibold">Dalam Proses Aktif</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-600 tracking-tight">{inProcess}</span>
            <span className="text-xs text-slate-500 ml-2">Berkas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tahap verifikasi & telaah falakiyah
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-teal-800 font-semibold">Indeks Kepuasan (IKM)</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-teal-700 tracking-tight">{avgRating}</span>
            <span className="text-xs text-slate-500 ml-1">/ 5.0</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Kategori: <strong>Sangat Memuaskan</strong> ({surveys.length} ulasan)
          </p>
        </div>
      </div>

      {/* Grid: Service Breakdown & District Spread */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Breakdown (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Sebaran Permohonan Berdasarkan 9 Layanan
              </h3>
              <p className="text-xs text-slate-500">
                Aktivitas penggunaan masing-masing layanan Seksi Bimas Islam
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              9 Layanan
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {serviceStats.map(stat => (
              <div key={stat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate pr-2">
                    Layanan #{stat.id}: {stat.shortTitle}
                  </span>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-bold text-slate-900 font-mono">{stat.count} Berkas</span>
                    <span className="text-[11px] text-slate-500">({stat.percent}%)</span>
                  </div>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>Sebaran Kecamatan Pemohon</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">18 KUA</span>
            </div>

            <div className="space-y-2 text-xs">
              {sortedDistricts.length > 0 ? (
                sortedDistricts.map(([district, count], idx) => (
                  <div
                    key={district}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-800">Kec. {district}</span>
                    </div>
                    <span className="font-bold font-mono text-emerald-700">{count} Berkas</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Belum ada data kecamatan masuk.</p>
              )}
            </div>
          </div>

          {/* Ministry Quality Standard Commitment */}
          <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-800">
              <Award className="w-5 h-5 text-emerald-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Maklumat Pelayanan MALA'BIRI
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              "Kami berkomitmen memberikan pelayanan Bimbingan Masyarakat Islam yang <strong>Responsif, Akuntabel, Transparan, dan Tanpa Biaya (Gratis)</strong> demi mewujudkan zona integritas WBK/WBBM di lingkungan Kantor Kemenag Kab. Gowa."
            </p>

            <div className="pt-1 text-[11px] font-semibold text-emerald-700">
              Seksi Bimas Islam Kemenag Kab. Gowa
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
