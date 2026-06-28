// ── Types ──────────────────────────────────────────────────────────────
export type TravelScope = "DOMESTIC" | "INTERNATIONAL";

export type TransportType =
  | "FLIGHT"
  | "BUS"
  | "PRIVATE_CAR"
  | "COMBO"
  | "SELF_ARRANGED";

export interface DepartureTransport {
  type: TransportType;
  // Flight outbound
  airline: string;
  flightCode: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  flightClass: string;
  // Return flight
  returnFlightCode: string;
  returnAirline: string;
  returnDepartureAirport: string;
  returnArrivalAirport: string;
  returnDepartureTime: string;
  returnArrivalTime: string;
  returnFlightClass: string;
  // Transit (bay nối chuyến)
  transitPoint: string;
  returnTransitPoint: string;
  // Bus / car
  vehicleType: string;
  operator: string;
  boardingPoint: string;
  boardingTime: string;
  gatheringTime: string;
  // Notes
  notes: string;
}

export interface Destination {
  id: number;
  name: string;
  travelScope?: TravelScope;
  countryCode?: string | null;
}

export interface TourPackage {
  id?: number;
  name: string;
  nameEn: string;
  nameMode: "select" | "custom";
  description: string;
  descriptionEn: string;
  price: string;
  badge: string;
  includes: string[];
  includesEn: string[];
  excludes: string[];
  excludesEn: string[];
}

export interface TourDeparture {
  id?: number;
  departureDate: string;
  price: string;
  availableSeats: string;
  maxSeats: string;
  note: string;
  noteEn: string;
  category: SaleCategory;
  flashSaleEndsAt: string;
  transport: DepartureTransport | null;
}

export interface TourHighlightForm {
  id?: number;
  content: string;
  contentEn: string;
  icon: string;
}

export interface TourFaqForm {
  id?: number;
  question: string;
  questionEn: string;
  answer: string;
  answerEn: string;
}

export interface TourTimelineEntry {
  time: string;
  activity: string;
}

export interface TourItineraryDayForm {
  id?: number;
  dayNumber: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  mealsBreakfast: boolean;
  mealsLunch: boolean;
  mealsDinner: boolean;
  accommodation: string;
  accommodationEn: string;
  transport: string;
  transportEn: string;
  activitiesText: string;
  activitiesEnText: string;
  timelineItems: TourTimelineEntry[];
  timelineEnItems: TourTimelineEntry[];
  timelineText: string;
  timelineEnText: string;
}

export interface TourFormData {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: string;
  destinationId: string;
  startDate: string;
  duration: string;
  durationEn: string;
  availableSeats: string;
  tourType: string;
  imageUrl: string;
  departurePoint: string;
  departurePointEn: string;
}

export type TourFormErrors = Partial<Record<keyof TourFormData, string>>;

export type SaleCategory = "all" | "flash" | "early" | "lastminute";

export interface ExistingTourImage {
  id: number;
  url: string;
}

export interface ExistingTourPackage {
  id?: number;
  name?: string;
  nameEn?: string | null;
  description?: string;
  descriptionEn?: string | null;
  price?: number | string;
  badge?: string;
  includes?: string[] | string | null;
  includesEn?: string[] | string | null;
  excludes?: string[] | string | null;
  excludesEn?: string[] | string | null;
}

export interface ExistingTourDeparture {
  id?: number;
  departureDate?: string | Date | null;
  price?: number | string | null;
  availableSeats?: number | string | null;
  maxSeats?: number | string | null;
  note?: string | null;
  noteEn?: string | null;
  category?: string | null;
  flashSaleEndsAt?: string | Date | null;
  transport?: {
    type?: TransportType | null;
    airline?: string | null;
    airlineEn?: string | null;
    flightCode?: string | null;
    departureAirport?: string | null;
    arrivalAirport?: string | null;
    departureTime?: string | Date | null;
    arrivalTime?: string | Date | null;
    flightClass?: string | null;
    returnFlightCode?: string | null;
    returnAirline?: string | null;
    returnAirlineEn?: string | null;
    returnDepartureAirport?: string | null;
    returnArrivalAirport?: string | null;
    returnDepartureTime?: string | Date | null;
    returnArrivalTime?: string | Date | null;
    returnFlightClass?: string | null;
    transitPoint?: string | null;
    returnTransitPoint?: string | null;
    vehicleType?: string | null;
    vehicleTypeEn?: string | null;
    operator?: string | null;
    operatorEn?: string | null;
    boardingPoint?: string | null;
    boardingPointEn?: string | null;
    boardingTime?: string | Date | null;
    gatheringTime?: string | Date | null;
    notes?: string | null;
    notesEn?: string | null;
  } | null;
}

export interface ExistingTourHighlight {
  id?: number;
  content?: string | null;
  contentEn?: string | null;
  icon?: string | null;
  sortOrder?: number | null;
}

export interface ExistingTourFaq {
  id?: number;
  question?: string | null;
  questionEn?: string | null;
  answer?: string | null;
  answerEn?: string | null;
  sortOrder?: number | null;
}

export interface ExistingTourItineraryDay {
  id?: number;
  dayNumber?: number | null;
  title?: string | null;
  titleEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  mealsBreakfast?: boolean | null;
  mealsLunch?: boolean | null;
  mealsDinner?: boolean | null;
  accommodation?: string | null;
  accommodationEn?: string | null;
  transport?: string | null;
  transportEn?: string | null;
  activities?: string[] | null;
  activitiesEn?: string[] | null;
  timeline?: TourTimelineEntry[] | null;
  timelineEn?: TourTimelineEntry[] | null;
}

export interface InitialTourData {
  id: number;
  name?: string;
  nameEn?: string | null;
  description?: string;
  descriptionEn?: string | null;
  price?: number | string;
  destination?: Destination | null;
  destinationId?: number | string | null;
  startDate?: string | Date | null;
  duration?: string;
  durationEn?: string | null;
  availableSeats?: number | string;
  tourType?: string;
  imageUrl?: string;
  departurePoint?: string | null;
  departurePointEn?: string | null;
  status?: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "COMPLETED";
  images?: ExistingTourImage[];
  packages?: ExistingTourPackage[];
  departures?: ExistingTourDeparture[];
  highlights?: ExistingTourHighlight[];
  faqs?: ExistingTourFaq[];
  itinerary?: ExistingTourItineraryDay[];
}

export interface TourFormModalProps {
  mode: "create" | "edit";
  initialData?: InitialTourData;
  destinations: Destination[];
  userRole?: string;
  onSuccess: (
    message: string,
    savedTour?: InitialTourData,
    action?: "draft" | "submit",
  ) => void;
  onClose: () => void;
  onDestinationCreated?: (dest: Destination) => void;
}
