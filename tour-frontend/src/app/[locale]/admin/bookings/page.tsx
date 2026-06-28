'use client';

import { AssistedBookingWorkspace } from './_components/AssistedBookingWorkspace';
import { BookingDetailModal } from './_components/BookingDetailModal';
import { BookingFilters, BookingKpiGrid, BookingPageHeader, BookingSavedViews, BookingToast, PaymentStatsSection } from './_components/BookingPageSections';
import { BookingTable } from './_components/BookingTable';
import { CancelRequestPanel } from './_components/CancelRequestPanel';
import { useBookingManagement } from './_hooks/useBookingManagement';

export default function BookingManagementPage() {
  const booking = useBookingManagement();
  // SUPER_ADMIN xem read-only: ẩn các công cụ thao tác (đặt hộ, duyệt hủy)
  const isReadOnly = booking.isAdmin && !booking.canWrite;

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

      {!isReadOnly && (
        <AssistedBookingWorkspace onChanged={booking.refreshBookingsAndPaymentStats} showToast={booking.showToast} />
      )}

      <BookingKpiGrid
        stats={booking.stats}
        statusFilter={booking.statusFilter}
        paymentFilter={booking.paymentFilter}
        isAdmin={booking.isAdmin}
        onFilterStatus={booking.filterByStatus}
        onFilterPayment={booking.filterByPayment}
      />

      <PaymentStatsSection
        paymentStats={booking.paymentStats}
        isLoading={booking.isPaymentStatsLoading}
        error={booking.paymentStatsError}
        statsDateFrom={booking.statsDateFrom}
        statsDateTo={booking.statsDateTo}
        defaultStatsDateTo={booking.defaultStatsDateTo}
        onStatsDateFromChange={booking.setStatsDateFrom}
        onStatsDateToChange={booking.setStatsDateTo}
        onClearDates={booking.clearStatsDates}
      />

      {booking.canWrite && (
        <CancelRequestPanel
          onActionDone={booking.refreshBookingsAndPaymentStats}
          onViewInTable={(status) => {
            booking.filterByStatus(status);
            document.getElementById('bookings-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      )}

      <section className="mb-8" aria-label="Danh sách đơn đặt tour">
        <BookingSavedViews
          activeView={booking.activeSavedView}
          stats={booking.stats}
          onViewChange={booking.applySavedView}
        />

        <BookingFilters
          search={booking.search}
          statusFilter={booking.statusFilter}
          paymentFilter={booking.paymentFilter}
          paymentMethodFilter={booking.paymentMethodFilter}
          needsReconciliation={booking.needsReconciliation}
          needsCustomerCall={booking.needsCustomerCall}
          dateFrom={booking.dateFrom}
          dateTo={booking.dateTo}
          departureFrom={booking.departureFrom}
          departureTo={booking.departureTo}
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
          loadError={booking.loadError}
          onRetry={booking.fetchBookings}
          hasFilter={booking.hasFilter}
          statusFilter={booking.statusFilter}
          canWrite={booking.canWrite}
          canRecordPayment={booking.canRecordPayment}
          meta={booking.meta}
          pageSize={booking.pageSize}
          onOpenBooking={booking.setSelectedBooking}
          onResetFilters={booking.resetFilters}
          onCopyPaymentRequest={booking.copyPaymentRequest}
          onResendPaymentRequest={booking.resendPaymentRequest}
          onBulkResendPaymentRequests={booking.bulkResendPaymentRequests}
          onCancelBooking={booking.cancelBooking}
          onSaveBookingNote={booking.saveBookingNote}
          onPageChange={booking.setPage}
          onPageSizeChange={booking.changePageSize}
        />
      </section>

      {booking.selectedBooking && (
        <BookingDetailModal
          booking={booking.selectedBooking}
          isAdmin={booking.isAdmin}
          canWrite={booking.canWrite}
          canRecordPayment={booking.canRecordPayment}
          onClose={() => booking.setSelectedBooking(null)}
          onConfirmSuccess={booking.handleConfirmSuccess}
          onCopyPaymentRequest={booking.copyPaymentRequest}
          onResendPaymentRequest={booking.resendPaymentRequest}
          onPassengersUpdated={booking.refreshDetail}
          showToast={booking.showToast}
        />
      )}

      <BookingToast toast={booking.toast} />
    </main>
  );
}
