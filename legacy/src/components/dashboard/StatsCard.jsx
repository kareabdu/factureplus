import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon, color = "#45A069", bg = "#E6F4EE" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
        {Icon && <Icon className="w-5 h-5" style={{ color }} />}
      </div>
      <p className="text-xs text-gray-500 mb-0.5">{title}</p>
      <p className="text-lg font-bold text-foreground truncate">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
    </div>
  );
}