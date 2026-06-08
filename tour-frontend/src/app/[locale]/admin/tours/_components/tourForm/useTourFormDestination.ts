"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/http/constants";
import { fetchWithAuth } from "@/lib/http/fetchWithAuth";
import type { TravelScope, Destination } from "./types";

interface UseTourFormDestinationParams {
  initialDestinations: Destination[];
  onSetDestinationId: (id: string) => void;
  onDestinationCreated?: (dest: Destination) => void;
}

export function useTourFormDestination({
  initialDestinations,
  onSetDestinationId,
  onDestinationCreated,
}: UseTourFormDestinationParams) {
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [isDestinationListOpen, setIsDestinationListOpen] = useState(false);
  const [showNewDest, setShowNewDest] = useState(false);
  const [newDestName, setNewDestName] = useState("");
  const [newDestTravelScope, setNewDestTravelScope] = useState<TravelScope>("DOMESTIC");
  const [newDestCountryCode, setNewDestCountryCode] = useState("VN");
  const [isCreatingDest, setIsCreatingDest] = useState(false);
  const [newDestError, setNewDestError] = useState("");

  useEffect(() => {
    setDestinations(initialDestinations);
  }, [initialDestinations]);

  const getDestinationLabel = (destination: Destination) =>
    `${destination.name} · ${(destination.travelScope ?? "DOMESTIC") === "DOMESTIC" ? "Trong nước" : "Nước ngoài"}`;

  const selectDestination = (destination: Destination) => {
    onSetDestinationId(String(destination.id));
    setDestinationQuery(getDestinationLabel(destination));
    setIsDestinationListOpen(false);
  };

  const clearDestination = () => {
    onSetDestinationId("");
    setDestinationQuery("");
    setIsDestinationListOpen(true);
  };

  const handleCreateDestination = async () => {
    const name = newDestName.trim();
    if (!name) {
      setNewDestError("Vui lòng nhập tên điểm đến");
      return;
    }
    if (destinations.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      setNewDestError("Điểm đến này đã tồn tại");
      return;
    }
    setIsCreatingDest(true);
    setNewDestError("");
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/search/destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          travelScope: newDestTravelScope,
          countryCode: newDestCountryCode.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể tạo điểm đến");
      }
      const raw = await res.json();
      const newDest: Destination = raw?.data ?? raw;
      if (!newDest?.id || !newDest?.name)
        throw new Error("Phản hồi server không hợp lệ");
      const updated = [...destinations, newDest].sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      );
      setDestinations(updated);
      onSetDestinationId(String(newDest.id));
      onDestinationCreated?.(newDest);
      setNewDestName("");
      setNewDestTravelScope("DOMESTIC");
      setNewDestCountryCode("VN");
      setShowNewDest(false);
    } catch (e: unknown) {
      setNewDestError(e instanceof Error ? e.message : "Tạo điểm đến thất bại");
    } finally {
      setIsCreatingDest(false);
    }
  };

  return {
    destinations,
    setDestinations,
    destinationQuery,
    setDestinationQuery,
    isDestinationListOpen,
    setIsDestinationListOpen,
    showNewDest,
    setShowNewDest,
    newDestName,
    setNewDestName,
    newDestTravelScope,
    setNewDestTravelScope,
    newDestCountryCode,
    setNewDestCountryCode,
    isCreatingDest,
    newDestError,
    setNewDestError,
    getDestinationLabel,
    selectDestination,
    clearDestination,
    handleCreateDestination,
  };
}
