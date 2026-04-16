"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/app/context/LocaleContext';

// Cấu trúc dữ liệu tin nhắn
type Message = {
    id: string;
    role: 'user' | 'ai';
    text?: string;
    textKey?: string;
    tourCard?: {
        nameKey?: string;
        name?: string;
        price: string;
        image: string;
    };
};

export default function ConciergeWidget() {
    const { t } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'ai',
            textKey: 'conciergeApp.aiGreeting'
        }
    ]);

    // Cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isTyping, isOpen]);

    // Cooldown chống spam (3 giây giữa mỗi lần gửi)
    const [cooldown, setCooldown] = useState(false);

    // Xử lý gửi tin nhắn đến AI Backend
    const handleSendMessage = async (text = inputValue) => {
        if (!text.trim() || isTyping || cooldown) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);
        setCooldown(true);

        // Hết cooldown sau 3 giây
        setTimeout(() => setCooldown(false), 3000);

        try {
            // Lấy tối đa 6 tin nhắn cuối để tiết kiệm token Gemini
            const history = messages
                .filter(m => m.text || m.textKey)
                .slice(-6)
                .map(m => ({
                    role: m.role,
                    text: m.text || (m.textKey ? t(m.textKey) : ''),
                }));

            const res = await fetch('http://localhost:3000/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history }),
            });

            const data = await res.json();

            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: data.reply || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.',
            }]);
        } catch (error) {
            console.error('AI Chat Error:', error);
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: 'Không thể kết nối đến trợ lý AI. Vui lòng thử lại sau.',
            }]);
        }
    };

    return (
        <>
            {/* CÁI NÚT BẤM (Nổi ở góc dưới bên phải) */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 z-40 px-6 py-3.5 border border-white/20 rounded-full bg-gradient-to-r from-blue-800 to-blue-600 text-white font-semibold shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-2.5"
            >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                {t('conciergeApp.btn')}
            </button>

            {/* OVERLAY TỐI MÀU (Khi mở chat thì làm mờ nền phía sau) */}
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-500 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setIsOpen(false)}
            ></div>

            {/* KHUNG CHAT SỔ RA TỪ BÊN PHẢI (SLIDE OVER DRAWER WIDE) */}
            <div
                className={`fixed top-0 right-0 h-full w-full lg:w-[1000px] xl:w-[1200px] bg-white shadow-2xl z-50 flex flex-col md:flex-row transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-6 right-6 z-[60] p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500 bg-white shadow-sm border border-slate-100"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* LEFT COLUMN: Editorial Brand Presence */}
                <section className="hidden md:flex md:w-5/12 flex-col relative h-full bg-slate-900 text-white">
                    <div className="absolute inset-0 z-0">
                        <img 
                            alt="Luxury infinity pool" 
                            className="w-full h-full object-cover opacity-60" 
                            src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30"></div>
                    </div>
                    <div className="relative z-10 flex flex-col h-full p-12 lg:p-16">
                        <div className="mb-auto">
                            <span className="text-white font-headline text-xl font-bold tracking-tight mb-12 block">Azure Horizon</span>
                            <h1 className="font-headline text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
                                {t('conciergeApp.title1')}<br/>{t('conciergeApp.title2')}
                            </h1>
                            <p className="font-body text-lg text-slate-200 max-w-md leading-relaxed opacity-90">
                                {t('conciergeApp.desc')}
                            </p>
                        </div>
                        <div className="mt-12 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 group cursor-pointer hover:text-blue-300 transition-colors">
                                    <span className="material-symbols-outlined text-blue-300">mail</span>
                                    <a className="text-sm tracking-wide font-medium" href="mailto:admin.azurehorion@gmail.com">admin.azurehorion@gmail.com</a>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <span className="material-symbols-outlined text-blue-300">call</span>
                                    <span className="text-sm tracking-wide font-medium">+84 (0) 900 888 999</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 pt-4">
                                <a className="opacity-70 hover:opacity-100 transition-opacity" href="#"><span className="material-symbols-outlined">public</span></a>
                                <a className="opacity-70 hover:opacity-100 transition-opacity" href="#"><span className="material-symbols-outlined">share</span></a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT COLUMN: AI Interface */}
                <section className="flex-1 flex flex-col h-full bg-slate-50 relative">
                    {/* Header Area */}
                    <header className="p-8 lg:px-12 pt-12 pb-6 border-b border-slate-200/60 bg-white">
                        <h2 className="font-headline text-2xl font-bold text-slate-900 mb-1">{t('conciergeApp.header')}</h2>
                        <p className="font-body text-slate-500 text-sm">{t('conciergeApp.subheader')}</p>
                    </header>

                    {/* Chat Display Area */}
                    <div className="flex-1 overflow-y-auto p-8 lg:px-12 space-y-8 hide-scrollbar pb-32">
                        {messages.map((msg, idx) => (
                            <div key={msg.id} className={`flex flex-col gap-4 max-w-2xl ${msg.role === 'user' ? 'ml-auto items-end' : ''}`}>
                                {msg.role === 'ai' ? (
                                    <>
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-800 to-blue-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                                                <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                            </div>
                                            <div className="bg-white border border-slate-100 shadow-sm p-5 rounded-2xl rounded-tl-none text-slate-700 leading-relaxed text-[15px]">
                                                {msg.textKey ? t(msg.textKey) : msg.text}
                                            </div>
                                        </div>
                                        
                                        {/* Render Prompt Chips nếu là tin nhắn đầu tiên */}
                                        {idx === 0 && (
                                            <div className="flex flex-wrap gap-2 ml-11">
                                                <button onClick={() => handleSendMessage(t('conciergeApp.prompt1'))} className="bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-semibold text-blue-800 hover:border-blue-800 transition-all shadow-sm">
                                                    {t('conciergeApp.prompt1')}
                                                </button>
                                                <button onClick={() => handleSendMessage(t('conciergeApp.prompt2'))} className="bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-semibold text-blue-800 hover:border-blue-800 transition-all shadow-sm">
                                                    {t('conciergeApp.prompt2')}
                                                </button>
                                                <button onClick={() => handleSendMessage(t('conciergeApp.prompt3'))} className="bg-white border border-slate-200 px-4 py-2 rounded-full text-xs font-semibold text-blue-800 hover:border-blue-800 transition-all shadow-sm">
                                                    {t('conciergeApp.prompt3')}
                                                </button>
                                            </div>
                                        )}

                                        {/* Render thẻ Tour nếu AI trả về */}
                                        {msg.tourCard && (
                                            <div className="ml-11 max-w-md w-full">
                                                <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-500 group">
                                                    <div className="relative h-48 overflow-hidden">
                                                        <img alt={msg.tourCard.nameKey ? t(msg.tourCard.nameKey) : msg.tourCard.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={msg.tourCard.image} />
                                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg">
                                                            <span className="text-blue-800 font-bold text-sm tracking-tight">{msg.tourCard.price}</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-6">
                                                        <h3 className="font-headline font-bold text-xl text-slate-900 mb-2">
                                                            {msg.tourCard.nameKey ? t(msg.tourCard.nameKey) : msg.tourCard.name}
                                                        </h3>
                                                        <p className="text-slate-500 text-sm mb-4 line-clamp-2">{t('conciergeApp.tourDesc')}</p>
                                                        <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 rounded-full font-label text-xs uppercase tracking-widest font-bold transition-colors">
                                                            {t('conciergeApp.viewItinerary')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="bg-gradient-to-br from-blue-800 to-blue-700 text-white p-5 rounded-2xl rounded-tr-none shadow-md">
                                        <p className="text-[15px]">{msg.text}</p>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Hiệu ứng đang gõ chữ */}
                        {isTyping && (
                            <div className="flex gap-3 max-w-2xl">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-800 to-blue-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                                    <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                </div>
                                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none w-fit flex items-center gap-1.5 h-[44px] shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area (Bottom Pinned) */}
                    <div className="absolute bottom-0 left-0 w-full p-6 lg:px-12 bg-white border-t border-slate-100">
                        <div className="relative max-w-3xl mx-auto flex flex-col">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                                className="flex items-center bg-slate-50 rounded-full shadow-sm p-1.5 border border-slate-200 focus-within:ring-2 ring-blue-800/20 transition-all focus-within:bg-white"
                            >
                                <button type="button" className="p-3 text-slate-400 hover:text-blue-800 transition-colors">
                                    <span className="material-symbols-outlined">attach_file</span>
                                </button>
                                <input
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-body px-2 text-slate-900 placeholder:text-slate-400 outline-none"
                                    placeholder={t('conciergeApp.inputPlaceholder')}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isTyping || cooldown}
                                    className="w-10 h-10 bg-blue-800 text-white rounded-full shadow-md flex items-center justify-center hover:bg-blue-900 transition-colors disabled:bg-slate-300"
                                >
                                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
                                </button>
                            </form>
                            <p className="mt-3 text-center text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                                {t('conciergeApp.disclaimer')}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}