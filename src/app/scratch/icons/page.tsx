'use client';

import React from 'react';
import Link from 'next/link';
import { VEHICLE_TYPES } from '@/config/vehicles';
import { MATERIALS } from '@/config/materials';
import { VehicleIcon } from '@/components/icons/VehicleIcon';
import { MaterialIcon } from '@/components/icons/MaterialIcon';
import { ArrowLeft } from 'lucide-react';

export default function ScratchIconsPage() {
  return (
    <div className="flex flex-col min-h-screen p-5 pb-20 bg-[#F6F7F8] gap-6">
      <div className="flex items-center gap-3 bg-white p-4 rounded-[14px] border border-[#E5E7EB]">
        <Link href="/" className="w-8 h-8 rounded-full bg-[#F6F7F8] flex items-center justify-center">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display font-bold text-[20px] text-[#16181D]">
          Design System Icon Sprint Test
        </h1>
      </div>

      {/* 8 Vehicles Test Grid */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display font-bold text-[18px] text-[#16181D]">
          8 Vehicle Silhouettes (32px & 48px test)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {VEHICLE_TYPES.map((v) => (
            <div key={v.id} className="flex flex-col items-center p-3 bg-white rounded-[12px] border border-[#E5E7EB] text-center gap-2">
              <div className="flex items-center gap-2 text-[#F25C05]">
                {/* 32px test */}
                <VehicleIcon name={v.iconKey} size={32} />
                {/* 48px test */}
                <VehicleIcon name={v.iconKey} size={48} />
              </div>
              <span className="font-semibold text-[14px] text-[#16181D]">{v.displayName}</span>
              <span className="text-[11px] text-[#6B7280]">{v.localNames[0]} · {v.capacityKg} kg</span>
            </div>
          ))}
        </div>
      </div>

      {/* 16 Materials Test Grid */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display font-bold text-[18px] text-[#16181D]">
          16 Material Glyphs (32px test)
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {MATERIALS.map((m) => (
            <div key={m.id} className="flex flex-col items-center p-2.5 bg-white rounded-[10px] border border-[#E5E7EB] text-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-[#FFF1E9] text-[#F25C05] flex items-center justify-center">
                <MaterialIcon name={m.iconKey} size={24} />
              </div>
              <span className="font-medium text-[12px] text-[#16181D] leading-tight">{m.displayName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
