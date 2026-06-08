"use client";

import { useState } from "react";
import type React from "react";

type ImagesConfig = {
  setIsDirty: (v: boolean) => void;
};

export function useTourFormImages({ setIsDirty }: ImagesConfig) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: number; url: string }[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setIsDirty(true);
    setImagePreview(URL.createObjectURL(file));
  };

  return {
    imageFile, setImageFile,
    imagePreview, setImagePreview,
    galleryFiles, setGalleryFiles,
    galleryPreviews, setGalleryPreviews,
    existingImages, setExistingImages,
    deletingImageId, setDeletingImageId,
    handleImageChange,
  };
}
