export interface TourHighlight {
  id: number;
  content: string;
  contentEn?: string | null;
  icon: string;
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
  imageUrl?: string | null;
  timeline?: TourTimelineEntry[];
  timelineEn?: TourTimelineEntry[];
}

export interface TourFAQ {
  id: number;
  question: string;
  questionEn?: string | null;
  answer: string;
  answerEn?: string | null;
}

export interface Destination {
  id: number;
  name: string;
  nameEn?: string | null;
  region?: string;
  regionEn?: string | null;
  imageUrl?: string;
  travelScope?: 'DOMESTIC' | 'INTERNATIONAL';
  countryCode?: string | null;
}

export interface TourPackage {
  id: number;
  name: string;
  nameEn?: string | null;
  description?: string;
  descriptionEn?: string | null;
  price: number;
  badge?: string;
  includes: string[];
  includesEn?: string[];
  excludes: string[];
  excludesEn?: string[];
}

export type TransportType =
  | 'FLIGHT'
  | 'BUS'
  | 'PRIVATE_CAR'
  | 'COMBO'
  | 'SELF_ARRANGED';

export interface TourDepartureTransport {
  type: TransportType;
  airline?: string | null;
  airlineEn?: string | null;
  flightCode?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  flightClass?: string | null;
  returnFlightCode?: string | null;
  returnAirline?: string | null;
  returnAirlineEn?: string | null;
  returnDepartureAirport?: string | null;
  returnArrivalAirport?: string | null;
  returnDepartureTime?: string | null;
  returnArrivalTime?: string | null;
  returnFlightClass?: string | null;
  transitPoint?: string | null;
  transitPointEn?: string | null;
  returnTransitPoint?: string | null;
  returnTransitPointEn?: string | null;
  vehicleType?: string | null;
  vehicleTypeEn?: string | null;
  operator?: string | null;
  operatorEn?: string | null;
  boardingPoint?: string | null;
  boardingPointEn?: string | null;
  boardingTime?: string | null;
  gatheringTime?: string | null;
  notes?: string | null;
  notesEn?: string | null;
}

export interface TourDeparture {
  id: number;
  departureDate: string;
  price: number;
  availableSeats: number;
  note?: string;
  noteEn?: string | null;
  category?: string | null;
  flashSaleEndsAt?: string | null;
  transport?: TourDepartureTransport | null;
}

export interface Tour {
  id: number;
  name: string;
  nameEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  price: number;
  duration: string;
  durationEn?: string | null;
  imageUrl: string;
  tourCode: string;
  startDate: string;
  endDate: string;
  availableSeats: number;
  destination?: Destination;
  packages?: TourPackage[];
  departures?: TourDeparture[];
  highlights?: TourHighlight[];
  itinerary?: TourItineraryDay[];
  faqs?: TourFAQ[];
  departurePoint?: string;
  departurePointEn?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  _count?: {
    reviews?: number;
  };
}
