export type TourStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "COMPLETED";
export type TourTab = "active" | "trash";

export interface Meta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage?: number;
}

export interface Tour {
  id: number;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl: string;
  price: number;
  availableSeats: number;
  bookedSeats?: number;
  totalSeats?: number;
  duration: string;
  durationEn?: string;
  tourType: string;
  tourCode?: string;
  averageRating: number;
  reviewCount?: number;
  isFeatured?: boolean;
  hasSale?: boolean;
  startDate: string;
  endDate?: string;
  departurePoint?: string;
  departurePointEn?: string;
  destinationId?: number | null;
  destination: {
    id: number;
    name: string;
    travelScope?: "DOMESTIC" | "INTERNATIONAL";
  };
  status: TourStatus;
  reviewNote?: string;
  createdById?: number;
  createdBy?: { id: number; fullName: string };
  images?: TourImage[];
  packages?: TourPackage[];
  departures?: TourDeparture[];
  highlights?: TourHighlight[];
  itinerary?: TourItineraryDay[];
  faqs?: TourFaq[];
}

export interface TourImage {
  id: number;
  url: string;
  altText?: string;
  sortOrder?: number;
}

export interface TourPackage {
  id: number;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  badge?: string;
  includes?: string[] | string;
  includesEn?: string[] | string;
  excludes?: string[] | string;
  excludesEn?: string[] | string;
}

export type TransportType =
  | "FLIGHT"
  | "BUS"
  | "PRIVATE_CAR"
  | "COMBO"
  | "SELF_ARRANGED";

export interface TourDepartureTransport {
  id: number;
  type: TransportType;
  airline?: string | null;
  flightCode?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  flightClass?: string | null;
  returnFlightCode?: string | null;
  returnAirline?: string | null;
  returnDepartureAirport?: string | null;
  returnArrivalAirport?: string | null;
  returnDepartureTime?: string | null;
  returnArrivalTime?: string | null;
  returnFlightClass?: string | null;
  vehicleType?: string | null;
  operator?: string | null;
  boardingPoint?: string | null;
  boardingTime?: string | null;
  notes?: string | null;
}

export interface TourDeparture {
  id: number;
  departureDate: string;
  price: number;
  availableSeats: number;
  maxSeats?: number;
  note?: string;
  noteEn?: string;
  category?: string;
  flashSaleEndsAt?: string | null;
  transport?: TourDepartureTransport | null;
}

export interface TourHighlight {
  id: number;
  content: string;
  contentEn?: string;
  icon?: string;
}

export interface TourTimelineEntry {
  time: string;
  activity: string;
}

export interface TourItineraryDay {
  id: number;
  dayNumber: number;
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  mealsBreakfast?: boolean;
  mealsLunch?: boolean;
  mealsDinner?: boolean;
  accommodation?: string | null;
  accommodationEn?: string | null;
  transport?: string | null;
  transportEn?: string | null;
  activities?: string[];
  activitiesEn?: string[];
  timeline?: TourTimelineEntry[];
  timelineEn?: TourTimelineEntry[];
}

export interface TourFaq {
  id: number;
  question: string;
  questionEn?: string;
  answer: string;
  answerEn?: string;
}

export interface TrashedTour extends Tour {
  deletedAt: string | null;
  bookingCount?: number;
  canPermanentDelete?: boolean;
}

export interface Destination {
  id: number;
  name: string;
  travelScope?: "DOMESTIC" | "INTERNATIONAL";
  countryCode?: string | null;
}

export interface ToastState {
  message: string;
  type: "success" | "error";
}

export type ModalMode = "create" | "edit" | null;

export interface TourStats {
  totalVisible: number;
  total: number;
  published: number;
  draft: number;
  pending: number;
  rejected: number;
  completed: number;
  active: number;
  onSale: number;
  totalSeats: number;
  avgPrice: number;
  loaded: boolean;
}

export interface TourKpiItem {
  icon: string;
  label: string;
  value: string;
  unit: string | null;
  subtitle?: string | null;
  color: string;
  highlight: boolean;
  onClick: (() => void) | null;
}

export type TourReviewAction = "approve" | "reject";
