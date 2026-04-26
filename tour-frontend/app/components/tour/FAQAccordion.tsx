'use client';
import { useState } from 'react';

export function FAQAccordion({ faqs }: { faqs: { id: number; question: string; answer: string }[] }) {
    const [open, setOpen] = useState<number | null>(null);
    return (
        <div className="space-y-3">
            {faqs.map((faq) => (
                <div key={faq.id} className="rounded-2xl border border-outline-variant/20 overflow-hidden bg-white">
                    <button
                        onClick={() => setOpen(open === faq.id ? null : faq.id)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-container-low/50 transition-colors"
                    >
                        <span className="font-semibold text-sm text-on-surface">{faq.question}</span>
                        <span className={`material-symbols-outlined text-primary flex-shrink-0 transition-transform duration-300 ${open === faq.id ? 'rotate-180' : ''}`}>
                            expand_more
                        </span>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${open === faq.id ? 'max-h-96' : 'max-h-0'}`}>
                        <div className="px-5 pb-4 text-sm text-on-surface-variant leading-relaxed border-t border-outline-variant/10 pt-3">
                            {faq.answer}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
