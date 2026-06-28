import React from 'react';
import { TourDepartureTransport } from '@/types';

const TRANSPORT_ICON: Record<string, string> = {
  FLIGHT: 'flight',
  BUS: 'directions_bus',
  PRIVATE_CAR: 'directions_car',
  COMBO: 'swap_calls',
};
const TRANSPORT_LABEL: Record<string, Record<string, string>> = {
  vi: { FLIGHT: 'Máy bay', BUS: 'Xe khách', PRIVATE_CAR: 'Xe riêng', COMBO: 'Hỗn hợp' },
  en: { FLIGHT: 'Flight', BUS: 'Coach', PRIVATE_CAR: 'Private car', COMBO: 'Combo' },
};

const AIRPORT_NAME: Record<string, { vi: string; en: string }> = {
  HAN: { vi: 'Hà Nội', en: 'Hanoi' },
  SGN: { vi: 'TP.HCM', en: 'Ho Chi Minh City' },
  DAD: { vi: 'Đà Nẵng', en: 'Da Nang' },
  BKK: { vi: 'Bangkok', en: 'Bangkok' },
  SIN: { vi: 'Singapore', en: 'Singapore' },
  TPE: { vi: 'Đài Bắc', en: 'Taipei' },
  HKG: { vi: 'Hồng Kông', en: 'Hong Kong' },
  ICN: { vi: 'Seoul', en: 'Seoul' },
  NRT: { vi: 'Tokyo', en: 'Tokyo' },
  KIX: { vi: 'Osaka', en: 'Osaka' },
  DXB: { vi: 'Dubai', en: 'Dubai' },
  CDG: { vi: 'Paris', en: 'Paris' },
  DOH: { vi: 'Doha', en: 'Doha' },
};

function airportLabel(code: string | null | undefined, lang: 'en' | 'vi'): string {
  if (!code) return '';
  const name = AIRPORT_NAME[code];
  return name ? `${name[lang]} (${code})` : code;
}

function formatShortTime(iso: string | null | undefined, lang: 'en' | 'vi'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const locale = lang === 'en' ? 'en-GB' : 'vi-VN';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function TransportSummaryCard({
  transport,
  language,
}: {
  transport: TourDepartureTransport;
  language: string;
}) {
  const lang = language === 'en' ? 'en' : 'vi';
  const isFlightLike = transport.type === 'FLIGHT' || transport.type === 'COMBO';
  const isVehicle = transport.type === 'BUS' || transport.type === 'PRIVATE_CAR' || transport.type === 'COMBO';

  const pickTransit = (vi?: string | null, en?: string | null) =>
    (lang === 'en' ? en || vi : vi) || '';
  const outboundTransit = pickTransit(transport.transitPoint, transport.transitPointEn);
  const returnTransit = pickTransit(transport.returnTransitPoint, transport.returnTransitPointEn);
  const transitLabel = lang === 'vi' ? 'Quá cảnh:' : 'Transit:';

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 space-y-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {TRANSPORT_ICON[transport.type] ?? 'directions_bus'}
        </span>
        {TRANSPORT_LABEL[lang][transport.type] ?? transport.type}
      </p>

      {isFlightLike && transport.flightCode && (
        <div className="space-y-1.5 text-sm">
          {/* Outbound */}
          <div className="flex items-center gap-2 font-semibold text-on-surface">
            <span className="material-symbols-outlined text-[14px] text-blue-600">flight_takeoff</span>
            <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">{transport.flightCode}</span>
            <span className="text-xs text-on-surface-variant">{transport.airline}</span>
          </div>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-on-surface-variant pl-5">
            <span className="font-bold text-on-surface">{airportLabel(transport.departureAirport, lang)}</span>
            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            <span className="font-bold text-on-surface">{airportLabel(transport.arrivalAirport, lang)}</span>
            {transport.departureTime && (
              <span className="ml-auto text-primary font-semibold">
                {formatShortTime(transport.departureTime, lang)} → {formatShortTime(transport.arrivalTime, lang)}
              </span>
            )}
          </div>
          {outboundTransit && (
            <p className="flex items-center gap-1 text-[10px] text-on-surface-variant pl-5">
              <span className="material-symbols-outlined text-[12px]">connecting_airports</span>
              {transitLabel} <span className="font-semibold text-on-surface">{outboundTransit}</span>
            </p>
          )}
          {/* Return */}
          {transport.returnFlightCode && (
            <>
              <div className="flex items-center gap-2 font-semibold text-on-surface mt-1">
                <span className="material-symbols-outlined text-[14px] text-blue-600">flight_land</span>
                <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">{transport.returnFlightCode}</span>
                <span className="text-xs text-on-surface-variant">{transport.returnAirline ?? transport.airline}</span>
              </div>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-on-surface-variant pl-5">
                <span className="font-bold text-on-surface">{airportLabel(transport.returnDepartureAirport, lang)}</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                <span className="font-bold text-on-surface">{airportLabel(transport.returnArrivalAirport, lang)}</span>
                {transport.returnDepartureTime && (
                  <span className="ml-auto text-primary font-semibold">
                    {formatShortTime(transport.returnDepartureTime, lang)} → {formatShortTime(transport.returnArrivalTime, lang)}
                  </span>
                )}
              </div>
              {returnTransit && (
                <p className="flex items-center gap-1 text-[10px] text-on-surface-variant pl-5">
                  <span className="material-symbols-outlined text-[12px]">connecting_airports</span>
                  {transitLabel} <span className="font-semibold text-on-surface">{returnTransit}</span>
                </p>
              )}
            </>
          )}
          {transport.flightClass && (
            <p className="text-[10px] text-on-surface-variant pl-5">{lang === 'vi' ? 'Hạng vé:' : 'Class:'} <span className="font-semibold text-on-surface">{transport.flightClass}</span></p>
          )}
          {transport.gatheringTime && (
            <p className="flex items-center gap-1 text-[10px] text-on-surface-variant pl-5">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {lang === 'vi' ? 'Có mặt sân bay:' : 'Airport check-in:'} <span className="font-semibold text-on-surface">{formatShortTime(transport.gatheringTime, lang)}</span>
            </p>
          )}
        </div>
      )}

      {isVehicle && (transport.vehicleType || transport.operator) && (
        <div className="text-xs space-y-1 text-on-surface-variant">
          {transport.vehicleType && (
            <p><span className="font-semibold text-on-surface">{transport.vehicleType}</span>{transport.operator ? ` · ${transport.operator}` : ''}</p>
          )}
          {transport.boardingPoint && (
            <p className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">location_on</span>
              {transport.boardingPoint}
              {transport.boardingTime && <span className="ml-1 text-primary font-semibold">{formatShortTime(transport.boardingTime, lang)}</span>}
            </p>
          )}
        </div>
      )}

      {transport.notes && (
        <p className="text-[10px] text-on-surface-variant border-t border-blue-100 pt-2 mt-1 leading-relaxed">{transport.notes}</p>
      )}
    </div>
  );
}
