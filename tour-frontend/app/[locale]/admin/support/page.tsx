'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '@/app/lib/fetchWithAuth';
import { API_BASE_URL } from '@/app/lib/constants';

type TicketStatus   = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
type TicketCategory = 'booking' | 'payment' | 'reschedule' | 'complaint' | 'general';

interface Reply { id: number; senderType: string; senderName: string; content: string; createdAt: string; }
interface Ticket {
    id: number; customerName: string; customerEmail: string; customerPhone: string;
    bookingRef?: string; category: TicketCategory; subject: string; message: string;
    status: TicketStatus; assignedStaffId?: number; createdAt: string; replies: Reply[];
}
interface Kpi { new: number; inProgress: number; resolved: number; }

const AVATAR_COLORS = [
    'from-blue-500 to-indigo-600','from-violet-500 to-purple-600',
    'from-orange-400 to-rose-500','from-teal-400 to-cyan-600','from-emerald-400 to-green-600',
];
const CAT: Record<TicketCategory,{label:string;color:string;dot:string}> = {
    booking:    {label:'Đặt tour',      color:'bg-purple-100 text-purple-700',dot:'bg-purple-500'},
    payment:    {label:'Thanh toán',    color:'bg-green-100 text-green-700',  dot:'bg-green-500'},
    reschedule: {label:'Đổi lịch',      color:'bg-orange-100 text-orange-700',dot:'bg-orange-500'},
    complaint:  {label:'Khiếu nại',     color:'bg-red-100 text-red-700',      dot:'bg-red-500'},
    general:    {label:'Câu hỏi chung', color:'bg-slate-100 text-slate-600',  dot:'bg-slate-400'},
};
const STS: Record<TicketStatus,{label:string;dot:string;text:string}> = {
    NEW:         {label:'Mới',          dot:'bg-blue-500',  text:'text-blue-600'},
    IN_PROGRESS: {label:'Đang xử lý',  dot:'bg-amber-500', text:'text-amber-600'},
    RESOLVED:    {label:'Đã giải quyết',dot:'bg-slate-400', text:'text-slate-500'},
};

function getInitials(name: string) {
    const p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}
function fmtTime(iso: string) {
    const d = new Date(iso), now = new Date();
    const diff = (now.getTime()-d.getTime())/60000;
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${Math.floor(diff)} phút trước`;
    if (diff < 1440) return `${Math.floor(diff/60)} giờ trước`;
    return d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'});
}

export default function SupportPage() {
    const [tickets, setTickets]         = useState<Ticket[]>([]);
    const [kpi, setKpi]                 = useState<Kpi>({new:0,inProgress:0,resolved:0});
    const [subTotal, setSubTotal]       = useState(0);
    const [loading, setLoading]         = useState(true);
    const [selected, setSelected]       = useState<Ticket|null>(null);
    const [reply, setReply]             = useState('');
    const [sending, setSending]         = useState(false);
    const [search, setSearch]           = useState('');
    const [activeStatus, setActiveStatus] = useState<TicketStatus|'ALL'>('ALL');
    const [activeCategory, setActiveCategory] = useState<TicketCategory|'ALL'>('ALL');
    const threadRef = useRef<HTMLDivElement>(null);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (activeStatus !== 'ALL') qs.set('status', activeStatus);
            if (activeCategory !== 'ALL') qs.set('category', activeCategory);
            if (search) qs.set('search', search);
            const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets?${qs}`);
            const json = await res.json();
            const data = json?.data ?? json;
            setTickets(data.tickets ?? []);
            setKpi(data.kpi ?? {new:0,inProgress:0,resolved:0});
            if (!selected && (data.tickets??[]).length > 0) setSelected(data.tickets[0]);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [activeStatus, activeCategory, search]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    useEffect(() => {
        fetchWithAuth(`${API_BASE_URL}/subscriber/stats`)
            .then(r=>r.json()).then(d=>setSubTotal(d?.total??0)).catch(()=>{});
    }, []);

    useEffect(() => {
        if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }, [selected]);

    const handleSelect = async (t: Ticket) => {
        const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets/${t.id}`);
        const json = await res.json();
        setSelected(json?.data ?? json ?? t);
    };

    const handleStatusChange = async (id: number, status: TicketStatus) => {
        await fetchWithAuth(`${API_BASE_URL}/support/tickets/${id}/status`, {
            method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status}),
        });
        setSelected(prev => prev ? {...prev, status} : prev);
        setTickets(prev => prev.map(t => t.id===id ? {...t, status} : t));
    };

    const handleSendReply = async () => {
        if (!reply.trim() || !selected) return;
        setSending(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/support/tickets/${selected.id}/reply`, {
                method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({content: reply.trim()}),
            });
            const newReply: Reply = await res.json();
            setSelected(prev => prev ? {...prev, status:'IN_PROGRESS', replies:[...prev.replies, newReply]} : prev);
            setTickets(prev => prev.map(t => t.id===selected.id ? {...t, status:'IN_PROGRESS'} : t));
            setReply('');
        } catch { /* silent */ } finally { setSending(false); }
    };

    const counts = { ALL: tickets.length, NEW: kpi.new, IN_PROGRESS: kpi.inProgress, RESOLVED: kpi.resolved };

    return (
        <main className="flex-1 flex overflow-hidden h-full">

            {/* ── Left Panel ── */}
            <aside className="w-56 flex-shrink-0 border-r border-slate-200/70 bg-white flex flex-col overflow-y-auto">
                <div className="p-3 space-y-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm ticket..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400"/>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-1">Trạng thái</p>
                        {([['ALL','Tất cả','inbox'],['NEW','Mới','fiber_new'],['IN_PROGRESS','Đang xử lý','pending_actions'],['RESOLVED','Đã giải quyết','check_circle']] as [TicketStatus|'ALL',string,string][]).map(([k,l,i])=>{
                            const a = activeStatus===k;
                            return (
                                <button key={k} onClick={()=>setActiveStatus(k)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${a?'bg-blue-50 text-blue-700':'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                                    <span className={`material-symbols-outlined text-[15px] ${a?'text-blue-600':'text-slate-400'}`}>{i}</span>
                                    <span className="flex-1 text-left">{l}</span>
                                    <span className={`text-[10px] px-1.5 rounded-full font-bold ${a?'bg-blue-600 text-white':'bg-slate-100 text-slate-500'}`}>{counts[k]}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-1">Danh mục</p>
                        <button onClick={()=>setActiveCategory('ALL')}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory==='ALL'?'bg-slate-100 text-slate-800':'text-slate-500 hover:bg-slate-50'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0"/>Tất cả
                        </button>
                        {(Object.entries(CAT) as [TicketCategory,typeof CAT[TicketCategory]][]).map(([k,c])=>(
                            <button key={k} onClick={()=>setActiveCategory(k)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory===k?'bg-slate-100 text-slate-800':'text-slate-500 hover:bg-slate-50'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`}/>{c.label}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subscribers</p>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{subTotal.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-50 border border-slate-200/70">
                            <span className="material-symbols-outlined text-slate-400 text-[14px]">campaign</span>
                            <span className="text-[11px] text-slate-500 flex-1">
                                {subTotal > 0 ? `${subTotal.toLocaleString('vi-VN')} người đăng ký nhận tin` : 'Chưa có subscriber'}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Center Panel ── */}
            <div className="w-[320px] flex-shrink-0 flex flex-col border-r border-slate-200/70 bg-slate-50/50 overflow-hidden">
                <div className="grid grid-cols-3 gap-1.5 p-2.5 border-b border-slate-200/70 bg-white flex-shrink-0">
                    {[{l:'Đang mở',v:kpi.new+kpi.inProgress,c:'text-slate-800'},{l:'Phản hồi TB',v:'—',c:'text-amber-600'},{l:'Giải quyết',v:`${kpi.resolved}`,c:'text-blue-600'}].map(k=>(
                        <div key={k.l} className="bg-slate-50 rounded-lg p-2 border border-slate-200/70 text-center">
                            <p className={`text-base font-extrabold leading-tight ${k.c}`}>{k.v}</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">{k.l}</p>
                        </div>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {loading && Array(4).fill(0).map((_,i)=>(
                        <div key={i} className="bg-white rounded-xl p-3.5 border border-slate-200 animate-pulse space-y-2">
                            <div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-slate-200"/><div className="flex-1 space-y-1.5"><div className="h-3 bg-slate-200 rounded w-3/4"/><div className="h-2.5 bg-slate-100 rounded w-1/2"/></div></div>
                            <div className="h-2.5 bg-slate-100 rounded"/><div className="h-2.5 bg-slate-100 rounded w-4/5"/>
                        </div>
                    ))}
                    {!loading && tickets.length===0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                            <p className="text-sm font-medium">Không có ticket nào</p>
                        </div>
                    )}
                    {!loading && tickets.map((t,i)=>{
                        const cat=CAT[t.category]??CAT.general; const sts=STS[t.status];
                        const isSel=selected?.id===t.id; const isRes=t.status==='RESOLVED';
                        const color=AVATAR_COLORS[i%AVATAR_COLORS.length];
                        return (
                            <button key={t.id} onClick={()=>handleSelect(t)}
                                className={`w-full text-left rounded-xl p-3 border transition-all duration-150 ${isSel?'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100':'bg-white border-slate-200/60 hover:border-slate-300 hover:shadow-sm'}`}>
                                <div className="flex items-start gap-2.5 mb-1.5">
                                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${isRes?'opacity-50 grayscale':''}`}>
                                        {getInitials(t.customerName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-xs truncate ${isRes?'text-slate-400':'text-slate-800'}`}>{t.customerName}</p>
                                        <p className="text-[10px] text-slate-400">#{t.id} · {fmtTime(t.createdAt)}</p>
                                    </div>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cat.color}`}>{cat.label}</span>
                                </div>
                                <p className={`text-[11px] leading-relaxed line-clamp-2 ${isRes?'text-slate-400':'text-slate-500'}`}>{t.message}</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${sts.dot}`}/>
                                    <span className={`text-[9px] font-semibold uppercase tracking-wide ${sts.text}`}>{sts.label}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Right Panel ── */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {!selected ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-5xl mb-3">support_agent</span>
                        <p className="text-sm font-medium">Chọn một ticket để xem chi tiết</p>
                    </div>
                ) : (
                    <>
                        <div className="px-5 py-3.5 border-b border-slate-200/70 bg-white flex-shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[selected.id%AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                                        {getInitials(selected.customerName)}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 text-sm leading-tight">{selected.customerName}</h2>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(CAT[selected.category]??CAT.general).color}`}>
                                            {(CAT[selected.category]??CAT.general).label}
                                        </span>
                                    </div>
                                </div>
                                <select value={selected.status} onChange={e=>handleStatusChange(selected.id, e.target.value as TicketStatus)}
                                    className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer">
                                    <option value="NEW">Mới</option>
                                    <option value="IN_PROGRESS">Đang xử lý</option>
                                    <option value="RESOLVED">Đã giải quyết</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/70">
                                    <p className="text-slate-400 mb-0.5">Email</p>
                                    <p className="text-slate-700 font-medium truncate">{selected.customerEmail}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/70">
                                    <p className="text-slate-400 mb-0.5">Điện thoại</p>
                                    <p className="text-slate-700 font-medium">{selected.customerPhone}</p>
                                </div>
                                {selected.bookingRef ? (
                                    <div className="bg-blue-50 rounded-lg p-2 border border-blue-200/50">
                                        <p className="text-blue-400 text-[10px] mb-0.5 uppercase tracking-wide">Mã đặt chỗ</p>
                                        <p className="text-blue-700 font-mono font-bold text-xs">{selected.bookingRef}</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/70">
                                        <p className="text-slate-400 mb-0.5">Mã đặt chỗ</p>
                                        <p className="text-slate-400 italic text-[11px]">Không có</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            <div className="flex justify-center">
                                <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] text-slate-500 border border-slate-200">
                                    Ticket #{selected.id} · {new Date(selected.createdAt).toLocaleString('vi-VN')}
                                </div>
                            </div>
                            <div className="flex gap-3 max-w-[85%]">
                                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_COLORS[selected.id%AVATAR_COLORS.length]} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-auto`}>
                                    {getInitials(selected.customerName)}
                                </div>
                                <div className="flex flex-col gap-1 items-start">
                                    <p className="text-[10px] text-slate-400 ml-1">{selected.customerName} · {fmtTime(selected.createdAt)}</p>
                                    <div className="bg-slate-100 text-slate-800 text-sm p-3 rounded-2xl rounded-bl-sm border border-slate-200/60 shadow-sm leading-relaxed">
                                        {selected.message}
                                    </div>
                                </div>
                            </div>
                            {selected.replies.map((r,ri)=>{
                                const isStaff = r.senderType==='staff';
                                return (
                                    <div key={r.id ?? `reply-${ri}`} className={`flex gap-3 max-w-[85%] ${isStaff?'ml-auto justify-end':''}`}>
                                        {!isStaff && (
                                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_COLORS[selected.id%AVATAR_COLORS.length]} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-auto`}>
                                                {getInitials(selected.customerName)}
                                            </div>
                                        )}
                                        <div className={`flex flex-col gap-1 ${isStaff?'items-end':'items-start'}`}>
                                            <p className="text-[10px] text-slate-400 mx-1">{r.senderName} · {fmtTime(r.createdAt)}</p>
                                            <div className={`text-sm p-3 rounded-2xl leading-relaxed shadow-sm ${isStaff?'bg-blue-600 text-white rounded-br-sm':'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200/60'}`}>
                                                {r.content}
                                            </div>
                                        </div>
                                        {isStaff && (
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-auto">NV</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-5 py-3 border-t border-slate-200/70 bg-slate-50/50 flex-shrink-0">
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition-all shadow-sm">
                                <textarea value={reply} onChange={e=>setReply(e.target.value)}
                                    onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))handleSendReply();}}
                                    placeholder="Soạn phản hồi... (Ctrl+Enter để gửi)" rows={3}
                                    className="w-full bg-transparent border-none text-sm text-slate-800 placeholder-slate-400 focus:ring-0 resize-none p-3.5 block outline-none"/>
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-100">
                                    <div className="flex gap-1 text-slate-400">
                                        {['attach_file','mood'].map(ic=>(
                                            <button key={ic} className="p-1.5 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined text-[16px]">{ic}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={handleSendReply} disabled={!reply.trim()||sending}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-1.5 px-4 text-xs font-semibold transition-all flex items-center gap-1.5">
                                        {sending ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> : null}
                                        Gửi phản hồi
                                        <span className="material-symbols-outlined text-[14px]">send</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
