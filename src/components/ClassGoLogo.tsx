import React from 'react';

interface ClassGoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const ClassGoLogo: React.FC<ClassGoLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-base', tag: 'text-[9px]' },
    md: { icon: 'w-9 h-9', text: 'text-lg', tag: 'text-[11px]' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', tag: 'text-xs' },
    xl: { icon: 'w-16 h-16', text: 'text-3xl', tag: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 3D App Icon Container */}
      <div className={`relative ${currentSize.icon} rounded-xl overflow-hidden shadow-lg shadow-blue-500/25 flex-shrink-0 border border-blue-400/30 group-hover:scale-105 transition-transform`}>
        <img
          src="/classgo-icon.svg"
          alt="ClassGo Icon"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Typography */}
      <div className="flex flex-col justify-center">
        <div className={`font-black tracking-tight leading-none flex items-center gap-1.5 ${currentSize.text}`}>
          <span className="text-white drop-shadow-sm">Class</span>
          <span className="text-amber-400 drop-shadow-sm">Go</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 ml-0.5">
            EDU
          </span>
        </div>
        {showTagline && (
          <p className={`text-slate-400 font-medium tracking-normal mt-0.5 ${currentSize.tag}`}>
            Interactive tools for teachers
          </p>
        )}
      </div>
    </div>
  );
};
