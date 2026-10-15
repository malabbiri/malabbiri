export function formatIndoDate(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Makassar' // WITA
    }).format(date) + ' WITA';
  } catch (e) {
    return String(dateString || '-');
  }
}

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getCurrentMonthYear(): { month: number; year: number; monthName: string; label: string } {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthName = INDONESIAN_MONTHS[month] || '';
  return {
    month,
    year,
    monthName,
    label: `${monthName} ${year}`
  };
}

export function isCurrentMonthSubmission(dateString?: string | null): boolean {
  if (!dateString) return true; // Default to active current month if date undefined
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return true;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  } catch (e) {
    return true;
  }
}

export function getSubmissionMonthYear(dateString?: string | null): { month: number; year: number; monthName: string; label: string } {
  if (!dateString) return getCurrentMonthYear();
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return getCurrentMonthYear();
    const month = d.getMonth();
    const year = d.getFullYear();
    const monthName = INDONESIAN_MONTHS[month] || '';
    return {
      month,
      year,
      monthName,
      label: `${monthName} ${year}`
    };
  } catch (e) {
    return getCurrentMonthYear();
  }
}

export function formatIndoMonthYear(dateString?: string | null): string {
  const my = getSubmissionMonthYear(dateString);
  return my.label;
}

export function formatShortDate(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return String(dateString || '-');
  }
}

export function checkOfficeOpenStatus(): { isOpen: boolean; message: string; badgeColor: string } {
  // Gowa is WITA (UTC+8)
  const now = new Date();
  // Get current hour and day in Makassar time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short'
  });
  
  const parts = formatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value; // Mon, Tue, etc.
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const timeInMinutes = hour * 60 + minute;

  // Senin - Kamis: 07.30 - 16.00 WITA (450 to 960)
  // Jumat: 07.30 - 16.30 WITA (450 to 990)
  // Sabtu - Minggu: Tutup
  if (weekday === 'Sat' || weekday === 'Sun') {
    return {
      isOpen: false,
      message: 'Pelayanan Tatap Muka Libur (Layanan Online Aktif 24/7)',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    };
  }

  if (weekday === 'Fri') {
    if (timeInMinutes >= 450 && timeInMinutes <= 990) {
      return {
        isOpen: true,
        message: 'Kantor Buka (07.30 - 16.30 WITA)',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      };
    }
  } else {
    // Mon - Thu
    if (timeInMinutes >= 450 && timeInMinutes <= 960) {
      return {
        isOpen: true,
        message: 'Kantor Buka (07.30 - 16.00 WITA)',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      };
    }
  }

  return {
    isOpen: false,
    message: 'Kantor Tutup (Layanan Online Bimas Islam Aktif 24 Jam)',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  };
}
