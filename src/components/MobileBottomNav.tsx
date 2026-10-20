import React from 'react';
import { 
  LayoutGrid, 
  FileSearch, 
  ShieldCheck, 
  BarChart3, 
  Star,
  Lock
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'services' | 'tracking' | 'verification' | 'stats' | 'survey';
  setActiveTab: (tab: 'services' | 'tracking' | 'verification' | 'stats' | 'survey') => void;
  pendingCount: number;
  isOfficerLoggedIn: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  isOfficerLoggedIn
}) => {
  const items: Array<{
    id: 'services' | 'tracking' | 'verification' | 'stats' | 'survey';
    label: string;
    icon: any;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: 'services', label: 'Layanan', icon: LayoutGrid },
    { id: 'tracking', label: 'Lacak', icon: FileSearch },
    { 
      id: 'verification', 
      label: 'Petugas', 
      icon: isOfficerLoggedIn ? ShieldCheck : Lock,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-500'
    },
    { id: 'stats', label: 'Statistik', icon: BarChart3 },
    { id: 'survey', label: 'Survey', icon: Star },
  ];

  return (
    <nav 
      aria-label="Navigasi Bawah Layar HP"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-1 py-1"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
    >
      <div className="grid grid-cols-5 gap-0.5 max-w-lg mx-auto items-center">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-emerald-800 font-bold'
                  : 'text-slate-500 hover:text-slate-700 active:scale-95'
              }`}
            >
              <div className="relative">
                <div className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-emerald-100/80 text-emerald-800' : 'text-slate-500'
                }`}>
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>

                {item.badge !== undefined && (
                  <span className={`absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-black text-white ${item.badgeColor || 'bg-amber-500'} ring-1.5 ring-white animate-pulse`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-0.5 tracking-tight truncate max-w-full ${
                isActive ? 'font-bold text-emerald-900' : 'font-medium text-slate-500'
              }`}>
                {item.label}
              </span>

              {isActive && (
                <span className="w-4 h-0.5 rounded-full bg-emerald-700 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
