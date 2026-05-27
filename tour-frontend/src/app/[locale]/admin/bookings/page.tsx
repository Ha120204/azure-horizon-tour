'use client';

import { AssistedBookingWorkspace } from './_components/AssistedBookingWorkspace';
import { BookingDetailModal } from './_components/BookingDetailModal';
import { BookingFilters, BookingKpiGrid, BookingPageHeader, BookingToast, PaymentStatsSection } from './_components/BookingPageSections';
import { BookingTable } from './_components/BookingTable';
import { CancelRequestPanel } from './_components/CancelRequestPanel';
import { useBookingManagement } from './_hooks/useBookingManagement';

export default function BookingManagementPage() {
  const booking = useBookingManagement();

  return (
    <main
      className="flex-1 pt-8 px-8 pb-12 overflow-y-auto w-full max-w-[1600px] mx-auto"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <a href="#bookings-table" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-on-primary px-4 py-2 rounded-lg z-50 font-semibold text-sm">
        Nhảy đến bảng dữ liệu
      </a>

      <BookingPageHeader
        hasFreshData={booking.hasFreshData}
        lastSyncedAt={booking.lastSyncedAt}
        isExporting={booking.isExporting}
        onRefresh={booking.refreshBookingsAndPaymentStats}
        onExport={booking.handleExport}
      />

      <CancelRequestPanel onActionDone={booking.refreshBookingsAndPaymentStats} />
      <AssistedBookingWorkspace onChanged={booking.refreshBookingsAndPaymentStats} showToast={booking.showToast} />

      <BookingKpiGrid
        stats={booking.stats}
        statusFilter={booking.statusFilter}
        paymentFilter={booking.paymentFilter}
        onFilterStatus={booking.filterByStatus}
        onFilterPayment={booking.filterByPayment}
      />

      <PaymentStatsSection
        paymentStats={booking.paymentStats}
        statsDateFrom={booking.statsDateFrom}
        statsDateTo={booking.statsDateTo}
        defaultStatsDateTo={booking.defaultStatsDateTo}
        onStatsDateFromChange={booking.setStatsDateFrom}
        onStatsDateToChange={booking.setStatsDateTo}
        onClearDates={booking.clearStatsDates}
      />

      <BookingFilters
        search={booking.search}
        statusFilter={booking.statusFilter}
        paymentFilter={booking.paymentFilter}
        paymentMethodFilter={booking.paymentMethodFilter}
        needsReconciliation={booking.needsReconciliation}
        dateFrom={booking.dateFrom}
        dateTo={booking.dateTo}
        hasFilter={booking.hasFilter}
        isLoading={booking.isLoading}
        totalItems={booking.meta.totalItems}
        onSearchChange={booking.setSearch}
        onStatusChange={booking.changeStatusFilter}
        onPaymentChange={booking.changePaymentFilter}
        onPaymentMethodChange={booking.changePaymentMethodFilter}
        onNeedsReconciliationChange={booking.changeNeedsReconciliation}
        onDateFromChange={booking.changeDateFrom}
        onDateToChange={booking.changeDateTo}
        onResetFilters={booking.resetFilters}
      />

      <BookingTable
        bookings={booking.bookings}
        isLoading={booking.isLoading}
        hasFilter={booking.hasFilter}
        statusFilter={booking.statusFilter}
        meta={booking.meta}
        pageSize={booking.pageSize}
        onOpenBooking={booking.setSelectedBooking}
        onResetFilters={booking.resetFilters}
        onCopyPaymentRequest={booking.copyPaymentRequest}
        onResendPaymentRequest={booking.resendPaymentRequest}
        onPageChange={booking.setPage}
        onPageSizeChange={booking.changePageSize}
      />

      {booking.selectedBooking && (
        <BookingDetailModal
          booking={booking.selectedBooking}
          onClose={() => booking.setSelectedBooking(null)}
          onConfirmSuccess={booking.handleConfirmSuccess}
        />
      )}

      <BookingToast toast={booking.toast} />
    </main>
  );
}
