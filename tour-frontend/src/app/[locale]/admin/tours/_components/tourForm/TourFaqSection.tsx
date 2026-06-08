"use client";

import { type Dispatch, type SetStateAction } from "react";
import type { TourFaqForm } from "./types";
import { FAQ_TEMPLATES } from "./constants";

interface TourFaqSectionProps {
  faqs: TourFaqForm[];
  showEnglishFields: boolean;
  openFaqTemplateIndex: number | null;
  setOpenFaqTemplateIndex: Dispatch<SetStateAction<number | null>>;
  applyFaqTemplate: (idx: number, template: { question: string; questionEn: string }) => void;
  updateFaq: (idx: number, patch: Partial<TourFaqForm>) => void;
  handleRemoveFaq: (idx: number) => void;
  handleAddFaq: () => void;
}

export function TourFaqSection({
  faqs,
  showEnglishFields,
  openFaqTemplateIndex,
  setOpenFaqTemplateIndex,
  applyFaqTemplate,
  updateFaq,
  handleRemoveFaq,
  handleAddFaq,
}: TourFaqSectionProps) {
  const englishFieldClass = showEnglishFields ? "" : "hidden";
  const bilingualGridClass = showEnglishFields
    ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
    : "grid grid-cols-1 gap-3";

  return (
    <div id="tour-section-faqs" className="scroll-mt-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-sky-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-sky-600 text-[14px]">
            help_outline
          </span>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          FAQ
        </h3>
        <span className="text-[10px] font-bold text-on-surface-variant/60">
          Giải đáp trước các câu hỏi hay gặp
        </span>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <div
            key={faq.id ?? idx}
            className="bg-surface-container-low/40 rounded-2xl p-4 sm:p-5 border border-outline-variant/10 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                FAQ #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFaq(idx)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
                aria-label={`Xóa FAQ ${idx + 1}`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  delete
                </span>
              </button>
            </div>

            {/* Template picker */}
            <div>
              <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Câu hỏi mẫu
              </label>
              <div
                className="relative"
                onBlur={() =>
                  window.setTimeout(() => setOpenFaqTemplateIndex(null), 120)
                }
              >
                <button
                  type="button"
                  aria-expanded={openFaqTemplateIndex === idx}
                  aria-controls={`faq-template-options-${idx}`}
                  onClick={() =>
                    setOpenFaqTemplateIndex((open) =>
                      open === idx ? null : idx,
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="material-symbols-outlined text-[17px] text-sky-600">
                      format_list_bulleted_add
                    </span>
                    <span className="truncate font-semibold text-on-surface-variant">
                      Chọn mẫu để điền nhanh câu hỏi
                    </span>
                  </span>
                  <span
                    className={`material-symbols-outlined text-[18px] text-on-surface-variant/40 transition-transform ${openFaqTemplateIndex === idx ? "rotate-180" : ""}`}
                  >
                    expand_more
                  </span>
                </button>

                {openFaqTemplateIndex === idx && (
                  <div
                    id={`faq-template-options-${idx}`}
                    role="listbox"
                    className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-xl"
                  >
                    {FAQ_TEMPLATES.map((template) => (
                      <button
                        key={template.question}
                        type="button"
                        role="option"
                        aria-selected={faq.question === template.question}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFaqTemplate(idx, template)}
                        className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-container"
                      >
                        <span className="mt-0.5 rounded-lg bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-700">
                          {template.category}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-on-surface">
                            {template.question}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-on-surface-variant/65">
                            {template.answerHint}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Question fields */}
            <div className={bilingualGridClass}>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Câu hỏi *
                </label>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFaq(idx, { question: e.target.value })}
                  placeholder="Tour có phù hợp cho trẻ em không?"
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div className={englishFieldClass}>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Question (English)
                </label>
                <input
                  type="text"
                  value={faq.questionEn}
                  onChange={(e) =>
                    updateFaq(idx, { questionEn: e.target.value })
                  }
                  placeholder="Is this tour suitable for children?"
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Answer fields */}
            <div className={bilingualGridClass}>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Câu trả lời *
                </label>
                <textarea
                  rows={4}
                  value={faq.answer}
                  onChange={(e) => updateFaq(idx, { answer: e.target.value })}
                  placeholder="Có. Lịch trình nhẹ, phù hợp cho gia đình có trẻ em..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/65">
                  Nên trả lời ngắn 1-3 câu, nêu rõ điều kiện áp dụng nếu có.
                </p>
              </div>
              <div className={englishFieldClass}>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Answer (English)
                </label>
                <textarea
                  rows={4}
                  value={faq.answerEn}
                  onChange={(e) => updateFaq(idx, { answerEn: e.target.value })}
                  placeholder="Yes. The itinerary is light and family-friendly..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddFaq}
          className="w-full py-3 border-2 border-dashed border-sky-300 rounded-2xl text-sm font-semibold text-sky-700 hover:bg-sky-50 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            add_circle
          </span>
          Thêm FAQ
        </button>
      </div>
    </div>
  );
}
