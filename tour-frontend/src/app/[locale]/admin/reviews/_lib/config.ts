import type { AdminStats } from './types';

export const EMPTY_ADMIN_STATS: AdminStats = {
    total: 0,
    hidden: 0,
    replied: 0,
    unreplied: 0,
    averageRating: 0,
    fiveStarRate: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

export const AVATAR_COLORS = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-teal-400 to-cyan-600',
    'from-rose-400 to-pink-600',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-green-600',
];
