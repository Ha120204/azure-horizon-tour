"use client";

import type {
  TourFormData,
  TourPackage,
  TourDeparture,
  TourHighlightForm,
  TourFaqForm,
  TourItineraryDayForm,
} from "../types";
import { isBookableDepartureDate } from "../constants";

type ReviewReadinessParams = {
  form: TourFormData;
  durationMode: "preset" | "custom";
  customDuration: string;
  departures: TourDeparture[];
  existingImages: { id: number; url: string }[];
  galleryFiles: File[];
  imagePreview: string;
  imageFile: File | null;
  highlights: TourHighlightForm[];
  faqs: TourFaqForm[];
  itinerary: TourItineraryDayForm[];
  packages: TourPackage[];
};

export const getReviewReadiness = ({
  form,
  durationMode,
  customDuration,
  departures,
  existingImages,
  galleryFiles,
  imagePreview,
  imageFile,
  highlights,
  faqs,
  itinerary,
  packages,
}: ReviewReadinessParams) => {
  const finalDuration = durationMode === "custom" ? customDuration : form.duration;
  const validDepartures = departures.filter(
    (d) =>
      d.departureDate &&
      isBookableDepartureDate(d.departureDate) &&
      Number(d.availableSeats || 0) > 0,
  );
  const galleryImageCount = existingImages.length + galleryFiles.length;
  const hasCoverImage = Boolean(imagePreview || imageFile || form.imageUrl);
  const highlightCount = highlights.filter((item) => item.content.trim()).length;
  const faqCount = faqs.filter((item) => item.question.trim() && item.answer.trim()).length;
  const itineraryCount = itinerary.filter(
    (day) => day.title.trim() && day.description.trim(),
  ).length;

  const required = [
    {
      label: "Tên tour",
      done: Boolean(form.name.trim()),
      target: "tour-section-basic",
      fieldId: "field-name",
      field: "name" as keyof TourFormData,
      error: "Tên tour không được để trống",
      hint: "Tên cần đủ rõ để Admin và khách hiểu tour bán gì.",
    },
    {
      label: "Mô tả",
      done: Boolean(form.description.trim()),
      target: "tour-section-basic",
      fieldId: "field-description",
      field: "description" as keyof TourFormData,
      error: "Mô tả không được để trống",
      hint: "Mô tả nên nêu điểm đến, trải nghiệm chính và đối tượng phù hợp.",
    },
    {
      label: "Điểm đến",
      done: Boolean(form.destinationId),
      target: "tour-section-location",
      fieldId: "field-destinationId",
      field: "destinationId" as keyof TourFormData,
      error: "Vui lòng chọn điểm đến",
      hint: "Điểm đến dùng cho bộ lọc và trang chi tiết tour.",
    },
    {
      label: "Thời lượng",
      done: Boolean(finalDuration.trim()),
      target: "tour-section-location",
      fieldId: "field-duration",
      field: "duration" as keyof TourFormData,
      error: "Thời lượng không được để trống",
      hint: "Ví dụ: 3 ngày 2 đêm, 1 ngày, hoặc 5 ngày 4 đêm.",
    },
    {
      label: "Giá niêm yết",
      done: Boolean(form.price) && Number(form.price) > 0,
      target: "tour-section-pricing",
      fieldId: "field-price",
      field: "price" as keyof TourFormData,
      error: "Giá phải là số dương",
      hint: "Giá cơ bản mỗi khách phải lớn hơn 0.",
    },
    {
      label: "Số ghế",
      done: Boolean(form.availableSeats) && Number(form.availableSeats) >= 1,
      target: "tour-section-pricing",
      fieldId: "field-availableSeats",
      field: "availableSeats" as keyof TourFormData,
      error: "Số ghế phải ít nhất là 1",
      hint: "Số ghế mặc định phải từ 1 trở lên.",
    },
    {
      label: "Ít nhất 1 chuyến khởi hành",
      done: validDepartures.length > 0,
      target: "tour-section-departures",
      fieldId: "tour-section-departures",
      field: "startDate" as keyof TourFormData,
      error: "Vui lòng thêm ít nhất 1 chuyến khởi hành có ngày hợp lệ và số ghế lớn hơn 0",
      hint: "Chuyến hợp lệ cần ngày không ở quá khứ và số ghế còn lớn hơn 0.",
    },
    {
      label: "Ít nhất 1 gói dịch vụ",
      done: packages.some((pkg) => Boolean(pkg.name.trim()) && pkg.price !== ""),
      target: "tour-section-packages",
      fieldId: "tour-section-packages",
      field: undefined as keyof TourFormData | undefined,
      error: "Vui lòng thêm ít nhất 1 gói dịch vụ có tên và giá",
      hint: "Mỗi tour cần tối thiểu 1 gói để khách có thể đặt.",
    },
  ];

  const recommended = [
    {
      label: "Ảnh bìa",
      done: hasCoverImage,
      target: "tour-section-cover",
      hint: "Ảnh bìa giúp tour rõ chủ thể trên card và trang chi tiết.",
    },
    {
      label: "Gallery từ 6 ảnh",
      done: galleryImageCount >= 6,
      target: "tour-section-gallery",
      hint: `Hiện có ${galleryImageCount}/6 ảnh khuyến nghị.`,
    },
    {
      label: "Điểm nổi bật",
      done: highlightCount >= 3,
      target: "tour-section-highlights",
      hint: `Hiện có ${highlightCount}/3 điểm nổi bật khuyến nghị.`,
    },
    {
      label: "FAQ",
      done: faqCount >= 2,
      target: "tour-section-faqs",
      hint: `Hiện có ${faqCount}/2 câu hỏi khuyến nghị.`,
    },
    {
      label: "Lịch trình",
      done: itineraryCount > 0,
      target: "tour-section-itinerary",
      hint: `Hiện có ${itineraryCount} ngày lịch trình đã đủ tiêu đề và mô tả.`,
    },
  ];

  return {
    required,
    recommended,
    validDepartureCount: validDepartures.length,
    missingRequired: required.filter((item) => !item.done),
    completedRequired: required.filter((item) => item.done).length,
    completedRecommended: recommended.filter((item) => item.done).length,
  };
};

export const focusReviewIssue = (issue: { target: string; fieldId?: string }) => {
  window.setTimeout(() => {
    const target = document.getElementById(issue.fieldId || issue.target);
    const section = document.getElementById(issue.target);
    (target || section)?.scrollIntoView({ block: "center", behavior: "smooth" });
    window.setTimeout(() => {
      const focusTarget =
        target instanceof HTMLElement
          ? target
          : (section?.querySelector<HTMLElement>(
              "input, select, textarea, button:not([disabled])",
            ) ?? null);
      focusTarget?.focus({ preventScroll: true });
    }, 250);
  }, 0);
};
