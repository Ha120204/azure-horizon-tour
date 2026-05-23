import type { Notif } from './types';
import { NOTIF_STYLE, relativeTime } from './constants';

interface NotifItemProps {
    notif: Notif;
    isRead: boolean;
    onClick: () => void;
}

export default function NotifItem({ notif, isRead, onClick }: NotifItemProps) {
    const s = NOTIF_STYLE[notif.type];
    return (
        <button
            onClick={onClick}
            className={`w-full text-left flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!isRead ? (notif.urgent ? 'bg-orange-50/40' : 'bg-blue-50/30') : ''}`}
        >
            <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5 ring-1 ${notif.urgent && !isRead ? 'ring-orange-200' : 'ring-transparent'}`}>
                <span className={`material-symbols-outlined text-[18px] ${s.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {s.icon}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isRead ? 'text-slate-500' : notif.urgent ? 'text-orange-700' : 'text-slate-800'}`}>
                    {notif.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
                <p className="text-[10px] text-slate-300 mt-1.5 font-medium">{relativeTime(notif.time)}</p>
            </div>
            {!isRead && (
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${s.dot}`} />
            )}
        </button>
    );
}
