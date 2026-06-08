"use client";

import { type ReactNode, type RefObject, type Dispatch, type SetStateAction, type ChangeEvent } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/lib/http/constants";
import { fetchWithAuth } from "@/lib/http/fetchWithAuth";

interface TourImagesSectionProps {
  imagePreview: string | null;
  imageFile: File | null;
  imageUrl: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  recommendedBadge: ReactNode;
  existingImages: { id: number; url: string }[];
  setExistingImages: Dispatch<SetStateAction<{ id: number; url: string }[]>>;
  deletingImageId: number | null;
  setDeletingImageId: Dispatch<SetStateAction<number | null>>;
  tourId: number | undefined;
  galleryInputRef: RefObject<HTMLInputElement | null>;
  galleryFiles: File[];
  setGalleryFiles: Dispatch<SetStateAction<File[]>>;
  galleryPreviews: string[];
  setGalleryPreviews: Dispatch<SetStateAction<string[]>>;
  setIsDirty: (v: boolean) => void;
}

export function TourImagesSection({
  imagePreview,
  imageFile,
  imageUrl,
  fileInputRef,
  handleImageChange,
  recommendedBadge,
  existingImages,
  setExistingImages,
  deletingImageId,
  setDeletingImageId,
  tourId,
  galleryInputRef,
  galleryFiles,
  setGalleryFiles,
  galleryPreviews,
  setGalleryPreviews,
  setIsDirty,
}: TourImagesSectionProps) {
  return (
    <>
      {/* ─── Ảnh bìa ─── */}
      <div id="tour-section-cover" className="scroll-mt-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-teal-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-teal-600 text-[14px]">
              image
            </span>
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Ảnh bìa
          </h3>
          {recommendedBadge}
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 cursor-pointer hover:border-primary/40 hover:bg-surface-container-lowest/50 transition-all group"
        >
          {imagePreview ? (
            <div className="relative shrink-0">
              <Image
                src={imagePreview}
                alt="Tour preview"
                width={96}
                height={96}
                sizes="96px"
                className="h-24 w-24 object-cover rounded-xl shadow-md"
              />
              <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-xl">
                  edit
                </span>
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 bg-surface-container rounded-xl flex items-center justify-center shrink-0 group-hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/50">
                add_photo_alternate
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
              {imageFile
                ? imageFile.name
                : imagePreview
                  ? "Nhấn để thay đổi ảnh"
                  : "Nhấn để chọn ảnh…"}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              JPG, JPEG hoặc PNG · Tối đa 5&nbsp;MB · Nên dùng ảnh ngang, rõ
              chủ thể tour
            </p>
            {imageUrl && !imageFile && (
              <p className="text-xs text-primary mt-1.5 truncate flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">
                  link
                </span>
                {imageUrl.split("/").pop()}
              </p>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={handleImageChange}
          aria-label="Chọn ảnh tour"
        />
      </div>

      {/* ─── Gallery ảnh ─── */}
      <div id="tour-section-gallery" className="scroll-mt-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-600 text-[14px]">
              photo_library
            </span>
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Gallery ảnh
          </h3>
          <span className="text-[10px] font-bold text-on-surface-variant/60">
            Tối đa 10 ảnh
          </span>
        </div>

        {existingImages.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] text-outline mb-2">Ảnh hiện tại</p>
            <div className="flex flex-wrap gap-2">
              {existingImages.map((img) => (
                <div key={img.id} className="relative group">
                  <Image
                    src={img.url}
                    alt="gallery"
                    width={80}
                    height={80}
                    sizes="80px"
                    className="h-20 w-20 object-cover rounded-xl border border-outline-variant/20"
                  />
                  <button
                    type="button"
                    disabled={deletingImageId === img.id}
                    onClick={async () => {
                      setDeletingImageId(img.id);
                      await fetchWithAuth(
                        `${API_BASE_URL}/tour/${tourId}/images/${img.id}`,
                        { method: "DELETE" },
                      );
                      setExistingImages((prev) =>
                        prev.filter((i) => i.id !== img.id),
                      );
                      setDeletingImageId(null);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <span className="material-symbols-outlined text-[11px]">
                      close
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          onClick={() => galleryInputRef.current?.click()}
          className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-50/30 transition-all group"
        >
          <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
            <span className="material-symbols-outlined text-2xl text-on-surface-variant/50 group-hover:text-indigo-500">
              add_photo_alternate
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface group-hover:text-indigo-600 transition-colors">
              {galleryFiles.length > 0
                ? `Đã chọn ${galleryFiles.length} ảnh mới`
                : "Thêm ảnh vào gallery…"}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              JPG, PNG · Tối đa 5 MB / ảnh · Khuyến nghị 6-9 ảnh
            </p>
          </div>
        </div>

        {galleryPreviews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {galleryPreviews.map((src, i) => (
              <div key={i} className="relative group">
                <Image
                  src={src}
                  alt={`new-${i}`}
                  width={80}
                  height={80}
                  sizes="80px"
                  className="h-20 w-20 object-cover rounded-xl border-2 border-indigo-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setGalleryFiles((prev) => prev.filter((_, idx) => idx !== i));
                    setGalleryPreviews((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                >
                  <span className="material-symbols-outlined text-[11px]">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={galleryInputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          multiple
          className="hidden"
          aria-label="Chọn ảnh gallery"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setGalleryFiles((prev) => [...prev, ...files].slice(0, 10));
            const newPreviews = files.map((f) => URL.createObjectURL(f));
            setGalleryPreviews((prev) => [...prev, ...newPreviews].slice(0, 10));
            setIsDirty(true);
            e.target.value = "";
          }}
        />
      </div>
    </>
  );
}
