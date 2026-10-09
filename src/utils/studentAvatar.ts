// Utility for generating avatar initials and deterministic background gradients

export const getStudentInitials = (name?: string | null): string => {
  if (!name || typeof name !== 'string') return 'HS';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'HS';
  if (parts.length === 1) {
    const single = parts[0].slice(0, 2).toUpperCase();
    return single.length === 1 ? single + single : single;
  }
  // Take first letter of second-to-last word and last word (e.g., Nguyễn Minh Anh -> M + A = MA)
  const secondLast = parts[parts.length - 2];
  const last = parts[parts.length - 1];
  return (secondLast[0] + last[0]).toUpperCase();
};

export const getStudentAvatarGradient = (idOrName: string): string => {
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = idOrName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    'from-indigo-600 via-indigo-500 to-indigo-700 border-indigo-400/50 shadow-indigo-500/25',
    'from-sky-600 via-blue-600 to-cyan-700 border-sky-400/50 shadow-sky-500/25',
    'from-emerald-600 via-teal-600 to-emerald-700 border-emerald-400/50 shadow-emerald-500/25',
    'from-violet-600 via-purple-600 to-fuchsia-700 border-purple-400/50 shadow-purple-500/25',
    'from-amber-600 via-orange-600 to-rose-600 border-amber-400/50 shadow-amber-500/25',
    'from-rose-600 via-pink-600 to-rose-700 border-rose-400/50 shadow-rose-500/25',
    'from-cyan-600 via-teal-500 to-blue-700 border-cyan-400/50 shadow-cyan-500/25',
    'from-blue-600 via-indigo-600 to-slate-800 border-blue-400/50 shadow-blue-500/25',
  ];
  return gradients[Math.abs(hash) % gradients.length];
};
