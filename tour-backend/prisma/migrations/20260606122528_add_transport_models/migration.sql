-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('FLIGHT', 'BUS', 'PRIVATE_CAR', 'COMBO', 'SELF_ARRANGED');

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "primaryTransport" "TransportType" NOT NULL DEFAULT 'SELF_ARRANGED';

-- CreateTable
CREATE TABLE "TourDepartureTransport" (
    "id" SERIAL NOT NULL,
    "departureId" INTEGER NOT NULL,
    "type" "TransportType" NOT NULL,
    "airline" TEXT,
    "airlineEn" TEXT,
    "flightCode" TEXT,
    "departureAirport" TEXT,
    "arrivalAirport" TEXT,
    "departureTime" TIMESTAMP(3),
    "arrivalTime" TIMESTAMP(3),
    "flightClass" TEXT,
    "returnFlightCode" TEXT,
    "returnAirline" TEXT,
    "returnAirlineEn" TEXT,
    "returnDepartureAirport" TEXT,
    "returnArrivalAirport" TEXT,
    "returnDepartureTime" TIMESTAMP(3),
    "returnArrivalTime" TIMESTAMP(3),
    "returnFlightClass" TEXT,
    "vehicleType" TEXT,
    "vehicleTypeEn" TEXT,
    "operator" TEXT,
    "operatorEn" TEXT,
    "boardingPoint" TEXT,
    "boardingPointEn" TEXT,
    "boardingTime" TIMESTAMP(3),
    "notes" TEXT,
    "notesEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourDepartureTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingTransportAssignment" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "outboundTicketCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outboundSeatNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outboundPnrCode" TEXT,
    "returnTicketCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "returnSeatNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "returnPnrCode" TEXT,
    "vehiclePlate" TEXT,
    "seatNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingTransportAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TourDepartureTransport_departureId_key" ON "TourDepartureTransport"("departureId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingTransportAssignment_bookingId_key" ON "BookingTransportAssignment"("bookingId");

-- CreateIndex
CREATE INDEX "BookingTransportAssignment_bookingId_idx" ON "BookingTransportAssignment"("bookingId");

-- AddForeignKey
ALTER TABLE "TourDepartureTransport" ADD CONSTRAINT "TourDepartureTransport_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "TourDeparture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTransportAssignment" ADD CONSTRAINT "BookingTransportAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
