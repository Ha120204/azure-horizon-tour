'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchWithAuth } from '@/lib/http/fetchWithAuth';
import { QUILL_MODULES, QUILL_FORMATS, type ArticleForm } from './types';

import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
        </div>
    ),
});

type Props = {
    form: ArticleForm;
    errors: Record<string, string>;
    titleRef: React.RefObject<HTMLInputElement | null>;
    isStaff: boolean;
    handleTitleChange: (value: string) => void;
    setField: <K extends keyof ArticleForm>(key: K, value: ArticleForm[K]) => void;
};

export function ArticleEditorPanel({ form, errors, titleRef, isStaff, handleTitleChange, setField }: Props) {
    const [contentLang, setContentLang] = useState<'vi' | 'en'>('vi');
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateError, setTranslateError] = useState('');

    const handleAiTranslate = async () => {
        const hasContent = form.content && form.content !== '<p><br></p>';
        if (!form.title.trim() && !form.excerpt.trim() && !hasContent) {
            setTranslateError('Hãy nhập nội dung tiếng Việt trước khi dịch');
            return;
        }
        setIsTranslating(true);
        setTranslateError('');
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/ai/translate/article`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: form.title, excerpt: form.excerpt, content: form.content }),
            });
            const json = await res.json();
            if (!res.ok) {
                const msg = json?.message;
                throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Dịch tự động thất bại'));
            }
            const data = json?.data ?? json;
            if (data.titleEn) setField('titleEn', data.titleEn);
            if (data.excerptEn) setField('excerptEn', data.excerptEn);
            if (data.contentEn) setField('contentEn', data.contentEn);
            setContentLang('en');
        } catch (err) {
            setTranslateError(err instanceof Error ? err.message : 'Dịch tự động thất bại');
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {errors._server && (
                <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-error/10 text-error rounded-xl border border-error/20 text-sm font-medium shrink-0">
                    <span className="material-symbols-outlined text-lg shrink-0">error</span>
                    {errors._server}
                </div>
            )}

            <div className="px-7 pt-6 pb-4 space-y-3 shrink-0">
                <div>
                    <label htmlFor="am-title" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                        Tiêu đề bài viết <span className="text-on-surface-variant/40 normal-case">({isStaff ? 'khi gửi duyệt' : 'khi xuất bản'})</span>
                    </label>
                    <input
                        id="am-title"
                        ref={titleRef}
                        type="text"
                        value={form.title}
                        onChange={e => handleTitleChange(e.target.value)}
                        placeholder="Nhập tiêu đề hấp dẫn cho bài viết…"
                        className={`w-full bg-transparent border-0 border-b-2 text-xl font-bold text-on-surface placeholder:text-on-surface-variant/55 outline-none focus:border-primary transition-colors pb-2 ${errors.title ? 'border-error' : 'border-outline-variant/30'}`}
                    />
                    {errors.title && <p className="text-xs text-error mt-1">{errors.title}</p>}
                </div>

                <div>
                    <label htmlFor="am-title-en" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                        Tiêu đề (English) <span className="text-on-surface-variant/40 normal-case">(tùy chọn — trống sẽ dùng bản tiếng Việt)</span>
                    </label>
                    <input
                        id="am-title-en"
                        type="text"
                        value={form.titleEn}
                        onChange={e => setField('titleEn', e.target.value)}
                        placeholder="English title…"
                        className="w-full bg-transparent border-0 border-b-2 border-outline-variant/30 text-lg font-semibold text-on-surface placeholder:text-on-surface-variant/55 outline-none focus:border-primary transition-colors pb-2"
                    />
                </div>

                <div>
                    <label htmlFor="am-excerpt" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                        Tóm tắt <span className="text-on-surface-variant/40 normal-case">({isStaff ? 'khi gửi duyệt' : 'khi xuất bản'})</span>
                        <span className="normal-case font-normal ml-1 text-on-surface-variant/50">(hiển thị dưới card bài)</span>
                    </label>
                    <div className="relative">
                        <textarea
                            id="am-excerpt"
                            value={form.excerpt}
                            onChange={e => setField('excerpt', e.target.value)}
                            rows={2}
                            maxLength={300}
                            placeholder="1–2 câu mô tả ngắn thu hút người đọc…"
                            className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none placeholder:text-on-surface-variant/55 transition-colors ${errors.excerpt ? 'border-error/50' : 'border-outline-variant/25'}`}
                        />
                        <span className={`absolute bottom-2 right-3 text-[10px] ${form.excerpt.length > 250 ? 'text-amber-500' : 'text-on-surface-variant/40'}`}>
                            {form.excerpt.length}/300
                        </span>
                    </div>
                    {errors.excerpt && <p className="text-xs text-error mt-1">{errors.excerpt}</p>}
                </div>

                <div>
                    <label htmlFor="am-excerpt-en" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-1.5">
                        Tóm tắt (English) <span className="text-on-surface-variant/40 normal-case">(tùy chọn)</span>
                    </label>
                    <textarea
                        id="am-excerpt-en"
                        value={form.excerptEn}
                        onChange={e => setField('excerptEn', e.target.value)}
                        rows={2}
                        maxLength={300}
                        placeholder="English summary…"
                        className="w-full bg-surface border border-outline-variant/25 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none placeholder:text-on-surface-variant/55 transition-colors"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleAiTranslate}
                        disabled={isTranslating}
                        className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <span className={`material-symbols-outlined text-[18px] ${isTranslating ? 'animate-spin' : ''}`}>
                            {isTranslating ? 'progress_activity' : 'translate'}
                        </span>
                        {isTranslating ? 'Đang dịch…' : 'AI dịch sang tiếng Anh'}
                    </button>
                    <span className="text-[11px] text-on-surface-variant/60">Tự điền 3 ô tiếng Anh từ nội dung tiếng Việt</span>
                    {translateError && <p className="w-full text-xs text-error">{translateError}</p>}
                </div>
            </div>

            <div className="flex items-center gap-3 px-7 mb-0 shrink-0">
                <div className="flex-1 h-px bg-outline-variant/10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
                    Nội dung bài viết {contentLang === 'en' && <span className="text-on-surface-variant/40 normal-case">(English — tùy chọn)</span>}
                </span>
                <div className="inline-flex rounded-full bg-surface-container p-0.5">
                    <button
                        type="button"
                        onClick={() => setContentLang('vi')}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${contentLang === 'vi' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
                    >
                        VI
                    </button>
                    <button
                        type="button"
                        onClick={() => setContentLang('en')}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${contentLang === 'en' ? 'bg-primary text-white' : 'text-on-surface-variant'}`}
                    >
                        EN
                    </button>
                </div>
                <div className="flex-1 h-px bg-outline-variant/10" />
            </div>
            {errors.content && (
                <p className="text-xs text-error px-7 mt-1 shrink-0">{errors.content}</p>
            )}

            <div className="flex-1 overflow-hidden mx-7 mb-0 mt-3">
                <style>{`
                  .am-quill-wrap .ql-toolbar {
                    background: var(--color-surface, #ffffff);
                    border: 1px solid rgba(0,0,0,0.12) !important;
                    border-bottom: none !important;
                    border-radius: 12px 12px 0 0;
                    padding: 8px 12px;
                  }
                  .am-quill-wrap .ql-container {
                    background: var(--color-surface, #ffffff);
                    border: 1px solid rgba(0,0,0,0.12) !important;
                    border-top: none !important;
                    border-radius: 0 0 12px 12px;
                    font-size: 15px;
                    height: calc(100% - 42px);
                  }
                  .am-quill-wrap .ql-editor {
                    height: 100%;
                    line-height: 1.85;
                    padding: 16px 20px;
                    color: var(--color-on-surface, #191c21);
                  }
                  .am-quill-wrap .ql-editor.ql-blank::before {
                    color: rgba(25,28,33,0.48);
                    font-style: italic;
                  }
                  .am-quill-wrap .ql-editor h1, .am-quill-wrap .ql-editor h2, .am-quill-wrap .ql-editor h3 {
                    font-weight: 700;
                    margin-bottom: 0.5em;
                  }
                  .am-quill-wrap .ql-toolbar .ql-stroke { stroke: var(--color-on-surface-variant, #424752); }
                  .am-quill-wrap .ql-toolbar .ql-fill   { fill:   var(--color-on-surface-variant, #424752); }
                  .am-quill-wrap .ql-toolbar button:hover .ql-stroke { stroke: var(--color-primary, #003f87); }
                  .am-quill-wrap .ql-toolbar button:hover .ql-fill   { fill:   var(--color-primary, #003f87); }
                `}</style>
                <div className="am-quill-wrap h-full">
                    <ReactQuill
                        key={contentLang}
                        theme="snow"
                        value={contentLang === 'en' ? form.contentEn : form.content}
                        onChange={val => setField(contentLang === 'en' ? 'contentEn' : 'content', val)}
                        modules={QUILL_MODULES}
                        formats={QUILL_FORMATS}
                        placeholder={contentLang === 'en' ? 'Write the English content here…' : 'Bắt đầu viết nội dung bài viết ở đây…'}
                        style={{ height: '100%' }}
                    />
                </div>
            </div>

            <div className="h-4 shrink-0" />
        </div>
    );
}
