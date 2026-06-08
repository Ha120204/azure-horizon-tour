'use client';

import { useMemo, useRef, useState } from 'react';
import Modal, { ModalBody } from '@/components/ui/Modal';
import { fmtDate } from '../_lib/helpers';
import type { Review } from '../_lib/types';
import { StarRating } from './StarRating';

const MIN_LOW_RATING_REPLY_LENGTH = 120;

const REPLY_TEMPLATES = [
    {
        key: 'thank-you',
        label: 'Cảm ơn review tốt',
        icon: 'favorite',
        build: (review: Review) =>
            `Cảm ơn ${review.user.fullName} đã tin tưởng Azure Horizon và dành thời gian chia sẻ trải nghiệm về tour ${review.tour.name}. Rất vui khi biết chuyến đi đã mang lại cho bạn những kỷ niệm đẹp. Hy vọng được đồng hành cùng bạn trong những hành trình tiếp theo.`,
    },
    {
        key: 'apology',
        label: 'Xin lỗi trải nghiệm chưa tốt',
        icon: 'support_agent',
        build: (review: Review) =>
            `Azure Horizon rất tiếc vì trải nghiệm của ${review.user.fullName} trong tour ${review.tour.name} chưa đạt kỳ vọng. Chúng tôi đã ghi nhận phản hồi này và sẽ rà soát lại với đội ngũ phụ trách để cải thiện chất lượng dịch vụ. Cảm ơn bạn đã góp ý thẳng thắn để chúng tôi phục vụ tốt hơn.`,
    },
    {
        key: 'more-info',
        label: 'Yêu cầu thêm thông tin',
        icon: 'contact_support',
        build: (review: Review) =>
            `Cảm ơn ${review.user.fullName} đã phản hồi về tour ${review.tour.name}. Để kiểm tra chính xác hơn, Azure Horizon mong bạn cung cấp thêm thông tin về thời điểm phát sinh vấn đề hoặc liên hệ với bộ phận hỗ trợ. Chúng tôi sẽ tiếp nhận và phản hồi sớm nhất có thể.`,
    },
    {
        key: 'handled',
        label: 'Đã chuyển xử lý',
        icon: 'task_alt',
        build: (review: Review) =>
            `Azure Horizon đã chuyển phản hồi của ${review.user.fullName} về tour ${review.tour.name} đến bộ phận vận hành liên quan. Chúng tôi sẽ rà soát nguyên nhân và cải thiện quy trình để hạn chế tình huống tương tự trong các chuyến đi sau. Cảm ơn bạn đã giúp chúng tôi hoàn thiện dịch vụ.`,
    },
] as const;

export function ReplyModal({
    review,
    onSave,
    onClose,
}: {
    review: Review;
    onSave: (content: string) => Promise<void>;
    onClose: () => void;
}) {
    const [value, setValue] = useState(review.adminReply || '');
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const trimmedValue = value.trim();
    const hasExistingReply = Boolean(review.adminReply?.trim());
    const isLowRating = review.rating <= 2;
    const shouldShowLowRatingWarning =
        isLowRating && trimmedValue.length > 0 && trimmedValue.length < MIN_LOW_RATING_REPLY_LENGTH;

    const recommendedTemplateKey = useMemo(() => {
        if (review.rating >= 4) return 'thank-you';
        if (review.rating <= 2) return 'apology';
        return 'more-info';
    }, [review.rating]);


    const handleTemplateClick = (template: (typeof REPLY_TEMPLATES)[number]) => {
        setValue(template.build(review));
        textareaRef.current?.focus();
    };

    const handleSave = async () => {
        if (!trimmedValue) return;
        setIsSaving(true);
        await onSave(trimmedValue);
        setIsSaving(false);
    };

    return (
        <Modal open onClose={onClose} size="lg" zIndex={65} className="rounded-3xl">
                <div className="relative border-b border-outline-variant/15 bg-primary p-5 pr-14 text-on-primary">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                        aria-label="Đóng hộp phản hồi"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/70">
                        {hasExistingReply ? 'Sửa phản hồi công khai' : 'Phản hồi đánh giá'}
                    </p>
                    <p className="truncate text-lg font-bold text-white">{review.user.fullName}</p>
                    <p className="mt-0.5 truncate text-xs text-white/70">{review.tour.name}</p>
                </div>

                <ModalBody className="grid md:grid-cols-[0.9fr_1.1fr]">
                    <section className="border-b border-outline-variant/10 p-5 md:border-b-0 md:border-r">
                        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <StarRating rating={review.rating} size={15} />
                                <span className="text-xs font-semibold text-on-surface">{review.rating}/5</span>
                                <span className="text-xs text-on-surface-variant">{fmtDate(review.createdAt)}</span>
                                {isLowRating && (
                                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                                        Cần xử lý kỹ
                                    </span>
                                )}
                            </div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                Nội dung khách viết
                            </p>
                            <p className="max-h-48 overflow-y-auto text-sm leading-relaxed text-on-surface-variant">
                                {review.content}
                            </p>
                        </div>

                        <div className="mt-4 rounded-2xl border border-outline-variant/10 p-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                Gợi ý xử lý
                            </p>
                            <ul className="space-y-2 text-sm text-on-surface-variant">
                                <li className="flex gap-2">
                                    <span className="material-symbols-outlined mt-0.5 text-[16px] text-primary">check_circle</span>
                                    Nhắc đúng tour và cảm ơn khách đã phản hồi.
                                </li>
                                <li className="flex gap-2">
                                    <span className="material-symbols-outlined mt-0.5 text-[16px] text-primary">check_circle</span>
                                    Với review thấp sao, ghi nhận vấn đề và nêu bước xử lý tiếp theo.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section className="p-5">
                        <div className="mb-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                Mẫu phản hồi nhanh
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {REPLY_TEMPLATES.map((template) => {
                                    const isRecommended = template.key === recommendedTemplateKey;
                                    return (
                                        <button
                                            key={template.key}
                                            type="button"
                                            onClick={() => handleTemplateClick(template)}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-2 text-left text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px] text-primary">{template.icon}</span>
                                                <span className="truncate">{template.label}</span>
                                            </span>
                                            {isRecommended && (
                                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                                    Gợi ý
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                            Phản hồi của Admin
                        </label>
                        <textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(event) => setValue(event.target.value)}
                            rows={7}
                            placeholder="Viết phản hồi thân thiện, chuyên nghiệp và có hướng xử lý rõ ràng."
                            className="w-full resize-none rounded-xl border border-outline-variant/20 bg-surface-container-low p-3.5 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 focus:ring-primary"
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <span className={`text-xs font-semibold ${shouldShowLowRatingWarning ? 'text-orange-600' : 'text-on-surface-variant'}`}>
                                {trimmedValue.length.toLocaleString('vi-VN')} ký tự
                            </span>
                            {shouldShowLowRatingWarning && (
                                <span className="text-xs font-semibold text-orange-600">
                                    Review thấp sao nên phản hồi chi tiết hơn trước khi gửi.
                                </span>
                            )}
                        </div>

                        {trimmedValue && (
                            <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                                <div className="mb-1.5 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
                                    <span className="text-xs font-bold uppercase tracking-wide text-primary">
                                        Bản xem trước công khai
                                    </span>
                                </div>
                                <p className="text-sm leading-relaxed text-on-surface">{trimmedValue}</p>
                            </div>
                        )}

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-outline-variant/20 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving || !trimmedValue}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-on-primary transition-all hover:opacity-90 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                                        {hasExistingReply ? 'Lưu phản hồi' : 'Gửi phản hồi'}
                                    </>
                                )}
                            </button>
                        </div>
                    </section>
                </ModalBody>
        </Modal>
    );
}
