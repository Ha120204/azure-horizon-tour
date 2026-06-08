"use client";

import type { DepartureTransport, TransportType } from "./types";
import {
  TRANSPORT_TYPE_OPTIONS,
  AIRLINE_PRESETS,
  AIRPORT_PRESETS,
  FLIGHT_CLASS_OPTIONS,
  VEHICLE_TYPE_PRESETS,
  BUS_OPERATOR_PRESETS,
} from "./constants";
import SearchableCombobox, { type ComboboxOption } from "./SearchableCombobox";
import FlightDateTimeField from "./FlightDateTimeField";

const COUNTRY_REGION: Record<string, string> = {
  VN: "Việt Nam",
  TH: "Đông Nam Á", SG: "Đông Nam Á", MY: "Đông Nam Á",
  PH: "Đông Nam Á", ID: "Đông Nam Á", MM: "Đông Nam Á",
  KH: "Đông Nam Á", LA: "Đông Nam Á",
  KR: "Đông Bắc Á", JP: "Đông Bắc Á", HK: "Đông Bắc Á",
  TW: "Đông Bắc Á", CN: "Đông Bắc Á",
  AE: "Quốc tế", QA: "Quốc tế", FR: "Quốc tế",
  DE: "Quốc tế", GB: "Quốc tế", AU: "Quốc tế",
};

const AIRLINE_OPTIONS: ComboboxOption[] = AIRLINE_PRESETS.map((a) => ({
  value: a.name,
  label: a.name,
  sublabel: a.iata,
  tag: a.country,
  group: COUNTRY_REGION[a.country] ?? "Quốc tế",
}));

const AIRPORT_OPTIONS: ComboboxOption[] = AIRPORT_PRESETS.map((a) => ({
  value: a.code,
  label: `[${a.code}] ${a.name}`,
  sublabel: a.city,
  tag: a.country,
  group: COUNTRY_REGION[a.country] ?? "Quốc tế",
}));

export const EMPTY_TRANSPORT: DepartureTransport = {
  type: "SELF_ARRANGED",
  airline: "",
  flightCode: "",
  departureAirport: "",
  arrivalAirport: "",
  departureTime: "",
  arrivalTime: "",
  flightClass: "Economy",
  returnFlightCode: "",
  returnAirline: "",
  returnDepartureAirport: "",
  returnArrivalAirport: "",
  returnDepartureTime: "",
  returnArrivalTime: "",
  returnFlightClass: "Economy",
  vehicleType: "",
  operator: "",
  boardingPoint: "",
  boardingTime: "",
  notes: "",
};

interface Props {
  transport: DepartureTransport;
  minDate?: string;
  onChange: (patch: Partial<DepartureTransport>) => void;
}

const fieldLabel = "block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1";
const inputClass = "w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

function AirportInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      <SearchableCombobox
        options={AIRPORT_OPTIONS}
        value={value}
        onChange={onChange}
        placeholder="HAN, SGN, DAD..."
      />
    </div>
  );
}

function AirlineInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      <SearchableCombobox
        options={AIRLINE_OPTIONS}
        value={value}
        onChange={onChange}
        placeholder="Vietnam Airlines..."
      />
    </div>
  );
}

function FlightLeg({
  prefix,
  label,
  icon,
  transport,
  minDate,
  onChange,
}: {
  prefix: "outbound" | "return";
  label: string;
  icon: string;
  transport: DepartureTransport;
  minDate?: string;
  onChange: (patch: Partial<DepartureTransport>) => void;
}) {
  const isReturn = prefix === "return";
  const departureTime = isReturn
    ? transport.returnDepartureTime
    : transport.departureTime;
  const departureDate = departureTime.split("T")[0] || minDate;
  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest/60 p-3 space-y-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
        <span className="material-symbols-outlined text-[15px]">{icon}</span>
        {label}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AirlineInput
          label={isReturn ? "Hãng bay về" : "Hãng bay"}
          value={isReturn ? transport.returnAirline : transport.airline}
          onChange={(v) =>
            onChange(isReturn ? { returnAirline: v } : { airline: v })
          }
        />
        <div>
          <label className={fieldLabel}>Số hiệu chuyến bay</label>
          <input
            type="text"
            value={isReturn ? transport.returnFlightCode : transport.flightCode}
            onChange={(e) =>
              onChange(
                isReturn
                  ? { returnFlightCode: e.target.value }
                  : { flightCode: e.target.value },
              )
            }
            placeholder="VN-123"
            className={inputClass}
          />
        </div>
        <AirportInput
          label="Sân bay đi"
          value={
            isReturn
              ? transport.returnDepartureAirport
              : transport.departureAirport
          }
          onChange={(v) =>
            onChange(
              isReturn
                ? { returnDepartureAirport: v }
                : { departureAirport: v },
            )
          }
        />
        <AirportInput
          label="Sân bay đến"
          value={
            isReturn ? transport.returnArrivalAirport : transport.arrivalAirport
          }
          onChange={(v) =>
            onChange(
              isReturn ? { returnArrivalAirport: v } : { arrivalAirport: v },
            )
          }
        />
        <div>
          <label className={fieldLabel}>Giờ cất cánh</label>
          <FlightDateTimeField
            minDate={minDate}
            value={
              isReturn ? transport.returnDepartureTime : transport.departureTime
            }
            onChange={(value) =>
              onChange(
                isReturn
                  ? { returnDepartureTime: value }
                  : { departureTime: value },
              )
            }
          />
        </div>
        <div>
          <label className={fieldLabel}>Giờ hạ cánh</label>
          <FlightDateTimeField
            minDate={departureDate}
            value={isReturn ? transport.returnArrivalTime : transport.arrivalTime}
            onChange={(value) =>
              onChange(
                isReturn
                  ? { returnArrivalTime: value }
                  : { arrivalTime: value },
              )
            }
          />
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Hạng vé</label>
          <div className="flex gap-2">
            {FLIGHT_CLASS_OPTIONS.map((opt) => {
              const active =
                (isReturn ? transport.returnFlightClass : transport.flightClass) === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onChange(
                      isReturn
                        ? { returnFlightClass: opt.value }
                        : { flightClass: opt.value },
                    )
                  }
                  className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary text-white border-primary"
                      : "bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:border-primary/40"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {opt.icon}
                  </span>
                  <span className="flex flex-col items-start leading-tight">
                    <span>{opt.label}</span>
                    <span className={`text-[10px] font-normal ${active ? "text-white/70" : "text-on-surface-variant/50"}`}>
                      {opt.sublabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleFields({
  transport,
  minDate,
  onChange,
}: {
  transport: DepartureTransport;
  minDate?: string;
  onChange: (patch: Partial<DepartureTransport>) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={fieldLabel}>Loại xe</label>
        <input
          type="text"
          list="vehicle-type-presets"
          value={transport.vehicleType}
          onChange={(e) => onChange({ vehicleType: e.target.value })}
          placeholder="Xe 45 chỗ, Limousine 9 chỗ..."
          className={inputClass}
        />
        <datalist id="vehicle-type-presets">
          {VEHICLE_TYPE_PRESETS.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={fieldLabel}>Nhà xe / Đơn vị vận chuyển</label>
        <input
          type="text"
          list="bus-operator-presets"
          value={transport.operator}
          onChange={(e) => onChange({ operator: e.target.value })}
          placeholder="Phương Trang, Hoàng Long..."
          className={inputClass}
        />
        <datalist id="bus-operator-presets">
          {BUS_OPERATOR_PRESETS.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={fieldLabel}>Điểm đón khách</label>
        <input
          type="text"
          value={transport.boardingPoint}
          onChange={(e) => onChange({ boardingPoint: e.target.value })}
          placeholder="123 Lê Lợi, Q1, TP.HCM"
          className={inputClass}
        />
      </div>
      <div>
        <label className={fieldLabel}>Giờ khởi hành xe</label>
        <FlightDateTimeField
          value={transport.boardingTime}
          minDate={minDate}
          onChange={(value) => onChange({ boardingTime: value })}
        />
      </div>
    </div>
  );
}

export default function DepartureTransportForm({
  transport,
  minDate,
  onChange,
}: Props) {
  const showFlight =
    transport.type === "FLIGHT" || transport.type === "COMBO";
  const showVehicle =
    transport.type === "BUS" ||
    transport.type === "PRIVATE_CAR" ||
    transport.type === "COMBO";

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div>
        <label className={fieldLabel}>Loại phương tiện</label>
        <div className="flex flex-wrap gap-2">
          {TRANSPORT_TYPE_OPTIONS.map((opt) => {
            const active = transport.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ type: opt.value as TransportType })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:border-primary/40"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {opt.icon}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Flight fields */}
      {showFlight && (
        <div className="space-y-3">
          <FlightLeg
            prefix="outbound"
            label="Chiều đi"
            icon="flight_takeoff"
            transport={transport}
            minDate={minDate}
            onChange={onChange}
          />
          <FlightLeg
            prefix="return"
            label="Chiều về (khứ hồi)"
            icon="flight_land"
            transport={transport}
            minDate={minDate}
            onChange={onChange}
          />
        </div>
      )}

      {/* Vehicle fields */}
      {showVehicle && (
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest/60 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">
            <span className="material-symbols-outlined text-[15px]">
              directions_bus
            </span>
            Thông tin xe
          </p>
          <VehicleFields transport={transport} minDate={minDate} onChange={onChange} />
        </div>
      )}

      {/* Notes */}
      {transport.type !== "SELF_ARRANGED" && (
        <div>
          <label className={fieldLabel}>Ghi chú phương tiện</label>
          <textarea
            rows={2}
            value={transport.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Lưu ý hành khách về phương tiện..."
            className={`${inputClass} resize-none`}
          />
        </div>
      )}
    </div>
  );
}
