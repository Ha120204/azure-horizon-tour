"use client";

import { API_BASE_URL } from "@/lib/http/constants";
import { fetchWithAuth } from "@/lib/http/fetchWithAuth";
import type {
  InitialTourData,
  TourFormData,
  TourPackage,
  TourDeparture,
  TourHighlightForm,
  TourFaqForm,
  TourItineraryDayForm,
} from "./types";
import {
  MIN_START_DATE,
  UI_TO_API_DEPARTURE_CATEGORY,
  isBookableDepartureDate,
  cleanTimelineEntries,
} from "./constants";
import { splitLines, normalizeTourMessage } from "./tourFormUtils";

type TourFormSubmitConfig = {
  form: TourFormData;
  packages: TourPackage[];
  departures: TourDeparture[];
  highlights: TourHighlightForm[];
  faqs: TourFaqForm[];
  itinerary: TourItineraryDayForm[];
  imageFile: File | null;
  galleryFiles: File[];
  durationMode: "preset" | "custom";
  customDuration: string;
  mode: "create" | "edit";
  initialData?: InitialTourData;
  isStaff: boolean;
  isAdminLike: boolean;
  setSaveAction: (action: "draft" | "submit" | null) => void;
  setGlobalError: (msg: string) => void;
  validateForReview: () => boolean;
  onSuccess: (message: string, data?: InitialTourData, action?: "draft" | "submit") => void;
  onClose: () => void;
};

export function useTourFormSubmit({
  form,
  packages,
  departures,
  highlights,
  faqs,
  itinerary,
  imageFile,
  galleryFiles,
  durationMode,
  customDuration,
  mode,
  initialData,
  isStaff,
  isAdminLike,
  setSaveAction,
  setGlobalError,
  validateForReview,
  onSuccess,
  onClose,
}: TourFormSubmitConfig) {
  const handleSave = async (action: "draft" | "submit") => {
    if (action === "submit" && !validateForReview()) return;

    const invalidMaxSeatsIndex = departures.findIndex(
      (d) =>
        Number(d.maxSeats || 0) > 0 &&
        Number(d.maxSeats) < Number(d.availableSeats || 0),
    );
    if (invalidMaxSeatsIndex !== -1) {
      setGlobalError(
        `Chuyến #${invalidMaxSeatsIndex + 1}: Tổng số ghế (Max) phải lớn hơn hoặc bằng Số ghế còn.`,
      );
      return;
    }

    const editId = initialData?.id;
    if (mode === "edit" && !editId) {
      setGlobalError("Không tìm thấy dữ liệu tour cần chỉnh sửa.");
      return;
    }

    const finalDuration = durationMode === "custom" ? customDuration : form.duration;
    const validDepartures = departures
      .filter((d) => d.departureDate && isBookableDepartureDate(d.departureDate))
      .sort(
        (a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime(),
      );
    const primaryStartDate =
      validDepartures[0]?.departureDate || form.startDate || MIN_START_DATE;
    const shouldPublishAfterSave =
      isAdminLike && action === "submit" && initialData?.status !== "PUBLISHED";
    const nextStatus =
      action === "draft"
        ? "DRAFT"
        : shouldPublishAfterSave
          ? "DRAFT"
          : initialData?.status === "PUBLISHED"
            ? "PUBLISHED"
            : undefined;
    const payload = { ...form, duration: finalDuration, startDate: primaryStartDate, status: nextStatus };

    setSaveAction(action);
    let tourId: number | undefined;
    try {
      let response: Response;
      const url = mode === "edit" ? `${API_BASE_URL}/tour/${editId}` : `${API_BASE_URL}/tour`;
      const method = mode === "edit" ? "PATCH" : "POST";

      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        Object.entries(payload).forEach(([key, val]) => {
          if (key === "imageUrl" || val === "" || val == null) return;
          if (key === "price" || key === "availableSeats") {
            formData.append(key, String(Number(val) || 0));
            return;
          }
          formData.append(key, String(val));
        });
        response = await fetchWithAuth(url, { method, body: formData });
      } else {
        const body = {
          ...payload,
          price: payload.price ? Number(payload.price) : 0,
          destinationId: payload.destinationId ? Number(payload.destinationId) : undefined,
          availableSeats: payload.availableSeats ? Number(payload.availableSeats) : 0,
        };
        response = await fetchWithAuth(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(
          normalizeTourMessage(err.message, "Có lỗi xảy ra khi lưu tour. Vui lòng thử lại."),
        );
      }
      const saved = await response.json();
      tourId = saved?.data?.id ?? saved?.id ?? initialData?.id;

      if (tourId && packages.length > 0) {
        const pkgPayload = packages
          .filter((p) => p.name.trim() && p.price)
          .map((p, i) => ({
            name: p.name.trim(),
            nameEn: p.nameEn.trim() || undefined,
            description: p.description.trim(),
            descriptionEn: p.descriptionEn.trim() || undefined,
            price: Number(p.price),
            badge: p.badge.trim() || undefined,
            includes: p.includes.filter(Boolean),
            includesEn: p.includesEn.filter(Boolean),
            excludes: p.excludes.filter(Boolean),
            excludesEn: p.excludesEn.filter(Boolean),
            sortOrder: i,
          }));
        await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/packages/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packages: pkgPayload }),
        });
      }

      if (tourId) {
        const depPayload = validDepartures.map((d, i) => ({
          departureDate: d.departureDate,
          price: d.price ? Number(d.price) : null,
          availableSeats: Number(d.availableSeats) || 0,
          maxSeats: Number(d.maxSeats) || Number(d.availableSeats) || 0,
          note: d.note.trim() || undefined,
          noteEn: d.noteEn.trim() || undefined,
          category: UI_TO_API_DEPARTURE_CATEGORY[d.category],
          flashSaleEndsAt:
            d.category === "flash" && d.flashSaleEndsAt
              ? new Date(d.flashSaleEndsAt).toISOString()
              : null,
          sortOrder: i,
        }));
        const departureResponse = await fetchWithAuth(
          `${API_BASE_URL}/tour/${tourId}/departures/bulk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ departures: depPayload }),
          },
        );
        const departureResult = await departureResponse.json().catch(() => null);
        if (!departureResponse.ok) {
          const message = Array.isArray(departureResult?.message)
            ? departureResult.message.join(", ")
            : departureResult?.message || "Không thể lưu lịch khởi hành.";
          throw new Error(normalizeTourMessage(message, "Không thể lưu lịch khởi hành."));
        }

        // Save transport for each departure that has a configured type
        const savedDepartures: { id: number }[] = Array.isArray(departureResult?.data)
          ? departureResult.data
          : [];
        const transportSaves = savedDepartures
          .map((saved, i) => {
            const t = validDepartures[i]?.transport;
            const transportUrl = `${API_BASE_URL}/tour/${tourId}/departures/${saved.id}/transport`;

            if (!t || t.type === "SELF_ARRANGED") {
              // Edit mode: remove any previous transport record for this departure.
              // deleteMany on the backend is safe even if no record exists.
              if (mode === "edit") {
                return fetchWithAuth(transportUrl, { method: "DELETE" }).catch(() => null);
              }
              return null;
            }

            const transportPayload = {
              type: t.type,
              airline: t.airline || undefined,
              flightCode: t.flightCode || undefined,
              departureAirport: t.departureAirport || undefined,
              arrivalAirport: t.arrivalAirport || undefined,
              departureTime: t.departureTime || undefined,
              arrivalTime: t.arrivalTime || undefined,
              flightClass: t.flightClass || undefined,
              returnFlightCode: t.returnFlightCode || undefined,
              returnAirline: t.returnAirline || undefined,
              returnDepartureAirport: t.returnDepartureAirport || undefined,
              returnArrivalAirport: t.returnArrivalAirport || undefined,
              returnDepartureTime: t.returnDepartureTime || undefined,
              returnArrivalTime: t.returnArrivalTime || undefined,
              returnFlightClass: t.returnFlightClass || undefined,
              transitPoint: t.transitPoint || undefined,
              returnTransitPoint: t.returnTransitPoint || undefined,
              vehicleType: t.vehicleType || undefined,
              operator: t.operator || undefined,
              boardingPoint: t.boardingPoint || undefined,
              boardingTime: t.boardingTime || undefined,
              gatheringTime: t.gatheringTime || undefined,
              notes: t.notes || undefined,
            };
            return fetchWithAuth(transportUrl, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(transportPayload),
            });
          })
          .filter(Boolean);
        await Promise.all(transportSaves);
      }

      if (tourId) {
        const highlightPayload = highlights
          .filter((h) => h.content.trim())
          .map((h, i) => ({
            content: h.content.trim(),
            contentEn: h.contentEn.trim() || undefined,
            icon: h.icon || "auto_awesome",
            sortOrder: i,
          }));
        const faqPayload = faqs
          .filter((f) => f.question.trim() && f.answer.trim())
          .map((f, i) => ({
            question: f.question.trim(),
            questionEn: f.questionEn.trim() || undefined,
            answer: f.answer.trim(),
            answerEn: f.answerEn.trim() || undefined,
            sortOrder: i,
          }));
        const itineraryPayload = itinerary
          .filter((day) => day.title.trim() && day.description.trim())
          .map((day, i) => ({
            dayNumber: i + 1,
            title: day.title.trim(),
            titleEn: day.titleEn.trim() || undefined,
            description: day.description.trim(),
            descriptionEn: day.descriptionEn.trim() || undefined,
            mealsBreakfast: day.mealsBreakfast,
            mealsLunch: day.mealsLunch,
            mealsDinner: day.mealsDinner,
            accommodation: day.accommodation.trim() || undefined,
            accommodationEn: day.accommodationEn.trim() || undefined,
            transport: day.transport.trim() || undefined,
            transportEn: day.transportEn.trim() || undefined,
            activities: splitLines(day.activitiesText),
            activitiesEn: splitLines(day.activitiesEnText),
            timeline: cleanTimelineEntries(day.timelineItems),
            timelineEn: cleanTimelineEntries(day.timelineEnItems),
          }));

        const contentSyncs: Promise<{ label: string; response: Response }>[] = [];
        if (highlights.length > 0 || initialData?.highlights !== undefined) {
          contentSyncs.push(
            fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/highlights`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ highlights: highlightPayload }),
            }).then((response) => ({ label: "điểm nổi bật", response })),
          );
        }
        if (faqs.length > 0 || initialData?.faqs !== undefined) {
          contentSyncs.push(
            fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/faqs`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ faqs: faqPayload }),
            }).then((response) => ({ label: "FAQ", response })),
          );
        }
        if (itinerary.length > 0 || initialData?.itinerary !== undefined) {
          contentSyncs.push(
            fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/itinerary`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itinerary: itineraryPayload }),
            }).then((response) => ({ label: "lịch trình", response })),
          );
        }
        const contentResponses = await Promise.all(contentSyncs);
        for (const { label, response: contentResponse } of contentResponses) {
          if (!contentResponse.ok) {
            const err = await contentResponse.json().catch(() => ({}));
            throw new Error(normalizeTourMessage(err.message, `Không thể lưu ${label}`));
          }
        }
      }

      if (isStaff && action === "submit" && tourId) {
        const submitRes = await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/submit`, {
          method: "POST",
        });
        if (!submitRes.ok) {
          const err = await submitRes.json().catch(() => ({}));
          throw new Error(normalizeTourMessage(err.message, "Gửi duyệt thất bại"));
        }
      }

      if (tourId && galleryFiles.length > 0) {
        const galleryForm = new FormData();
        galleryFiles.forEach((f) => galleryForm.append("images", f));
        await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/images`, {
          method: "POST",
          body: galleryForm,
        });
      }

      if (shouldPublishAfterSave && tourId) {
        const publishRes = await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}/publish`, {
          method: "PATCH",
        });
        if (!publishRes.ok) {
          const err = await publishRes.json().catch(() => ({}));
          throw new Error(normalizeTourMessage(err.message, "Public tour thất bại"));
        }
      }

      const successMessage = isStaff
        ? action === "submit"
          ? "Đã lưu và gửi tour để Admin duyệt!"
          : "Đã lưu bản nháp tour!"
        : action === "draft"
          ? "Đã lưu bản nháp tour!"
          : shouldPublishAfterSave
            ? "Đã public tour lên trang khách hàng!"
            : "Cập nhật tour thành công!";

      onSuccess(successMessage, saved?.data ?? saved, action);
      onClose();
    } catch (err: unknown) {
      // Khi tạo mới, nếu tour đã được lưu nhưng các bước tiếp theo (packages/departures/…)
      // thất bại, xóa tour vừa tạo để tránh để lại DRAFT rỗng không có nội dung.
      if (mode === "create" && tourId) {
        await fetchWithAuth(`${API_BASE_URL}/tour/${tourId}`, { method: "DELETE" }).catch(() => {});
      }
      setGlobalError(normalizeTourMessage(err instanceof Error ? err.message : undefined));
    } finally {
      setSaveAction(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSave("submit");
  };

  return { handleSave, handleSubmit };
}
