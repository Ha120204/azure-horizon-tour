import type { Notif } from './types';
import { API_BASE_URL } from '@/lib/constants';
import { ADMIN_AND_SUPER_ROLES, ALL_ADMIN_ROLES, canAccessRole } from '@/lib/adminAccess';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

const NOTIF_TYPES = new Set<Notif['type']>([
    'booking_pending',
    'booking_confirmed',
    'booking_cancelled',
    'booking_cancel_requested',
    'support_new',
    'support_in_progress',
    'review_good',
    'review_bad',
    'customer_new',
]);

// ── API utilities ─────────────────────────────────────────────────────────────
type ApiObject = Record<string, unknown>;

function asObject(value: unknown): ApiObject {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as ApiObject : {};
}

function unwrapPayload(value: unknown): unknown {
    const obj = asObject(value);
    return obj.data !== undefined ? obj.data : value;
}

function pickArray(value: unknown, keys: string[] = []): ApiObject[] {
    const payload = unwrapPayload(value);
    if (Array.isArray(payload)) return payload.map(asObject);

    const payloadObj = asObject(payload);
    for (const key of keys) {
        const direct = payloadObj[key];
        if (Array.isArray(direct)) return direct.map(asObject);
    }

    const nested = unwrapPayload(payloadObj.data);
    if (Array.isArray(nested)) return nested.map(asObject);

    const nestedObj = asObject(nested);
    for (const key of keys) {
        const candidate = nestedObj[key];
        if (Array.isArray(candidate)) return candidate.map(asObject);
    }

    return [];
}

function getText(value: unknown, fallback = '') {
    return typeof value === 'string' && value.trim() ? value : fallback;
}

function getNumber(value: unknown, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const VI_NOTIFICATION_REPLACEMENTS: Array<[RegExp, string]> = [
    [/Thong bao moi/g, 'Thông báo mới'],
    [/Don dat tour moi can xu ly/g, 'Đơn đặt tour mới cần xử lý'],
    [/Booking da thanh toan thanh cong/g, 'Booking đã thanh toán thành công'],
    [/Khach hang da huy booking/g, 'Khách hàng đã hủy booking'],
    [/Yeu cau huy booking moi/g, 'Yêu cầu hủy booking mới'],
    [/Khach bao su co thanh toan/g, 'Khách báo sự cố thanh toán'],
    [/Danh gia thap can kiem tra/g, 'Đánh giá thấp cần kiểm tra'],
    [/Danh gia moi tu khach hang/g, 'Đánh giá mới từ khách hàng'],
    [/Khach hang moi dang ky/g, 'Khách hàng mới đăng ký'],
    [/Ticket ho tro moi/g, 'Ticket hỗ trợ mới'],
    [/Khach hang phan hoi ticket/g, 'Khách hàng phản hồi ticket'],
    [/Ticket da duoc mo lai/g, 'Ticket đã được mở lại'],
    [/Khach hang/g, 'Khách hàng'],
    [/khach hang/g, 'khách hàng'],
    [/vua tao booking/g, 'vừa tạo booking'],
    [/vua tao tai khoan khách hàng/g, 'vừa tạo tài khoản khách hàng'],
    [/da duoc PayOS xac nhan thanh toan/g, 'đã được PayOS xác nhận thanh toán'],
    [/da duoc khách huy truoc khi thanh toan/g, 'đã được khách hủy trước khi thanh toán'],
    [/da gui yeu cau huy booking/g, 'đã gửi yêu cầu hủy booking'],
    [/bao can doi soat booking/g, 'báo cần đối soát booking'],
    [/danh gia/g, 'đánh giá'],
    [/gui yeu cau/g, 'gửi yêu cầu'],
    [/vua bo sung thong tin/g, 'vừa bổ sung thông tin'],
    [/mo lai ticket/g, 'mở lại ticket'],
];

function normalizeNotificationText(value: string) {
    return VI_NOTIFICATION_REPLACEMENTS.reduce(
        (text, [pattern, replacement]) => text.replace(pattern, replacement),
        value,
    );
}

function mapAdminNotification(item: ApiObject): Notif | null {
    const type = getText(item.type) as Notif['type'];
    if (!NOTIF_TYPES.has(type)) return null;

    const id = getText(item.id, String(item.id ?? ''));
    if (!id) return null;

    const severity = getText(item.severity);
    return {
        id,
        type,
        title: normalizeNotificationText(getText(item.title, 'Thông báo mới')),
        body: normalizeNotificationText(getText(item.body)),
        time: getText(item.createdAt, new Date().toISOString()),
        href: getText(item.href, ''),
        urgent: severity === 'urgent' || type === 'booking_pending' || type === 'booking_cancel_requested' || type === 'support_new' || type === 'review_bad',
        readAt: getText(item.readAt) || null,
    };
}

async function fetchNotificationApiFeed(): Promise<Notif[] | null> {
    const res = await fetchWithAuth(`${API_BASE_URL}/admin/notifications?limit=25`);
    if (!res.ok) return null;

    const json = await res.json();
    const payload = asObject(unwrapPayload(json));
    const notifications = pickArray(payload.notifications);

    return notifications
        .map(mapAdminNotification)
        .filter((item): item is Notif => Boolean(item));
}

// ── Fetch all notification sources ───────────────────────────────────────────
export async function fetchAllNotifs(userRole: string): Promise<Notif[]> {
    try {
        const apiNotifs = await fetchNotificationApiFeed();
        if (apiNotifs) return apiNotifs;
    } catch {
        // Fall back to the legacy multi-source feed while backend notifications are unavailable.
    }

    const canSeeReviewNotifs = canAccessRole(userRole, ADMIN_AND_SUPER_ROLES);
    const canSeeCustomerNotifs = canAccessRole(userRole, ALL_ADMIN_ROLES);
    const [bookingRes, reviewRes, userRes, supportRes] = await Promise.allSettled([
        fetchWithAuth(`${API_BASE_URL}/booking/admin/all?limit=15&status=ALL`),
        canSeeReviewNotifs
            ? fetchWithAuth(`${API_BASE_URL}/review/admin/all?page=1&limit=10`)
            : Promise.resolve(null),
        canSeeCustomerNotifs
            ? fetchWithAuth(`${API_BASE_URL}/user?role=CUSTOMER&page=1&limit=8`)
            : Promise.resolve(null),
        fetchWithAuth(`${API_BASE_URL}/support/tickets?status=ALL&page=1&limit=10`),
    ]);

    const notifs: Notif[] = [];

    // ── 1. Booking notifications ──
    if (bookingRes.status === 'fulfilled' && bookingRes.value.ok) {
        const json = await bookingRes.value.json();
        const bookings = pickArray(json, ['bookings']);
        for (const b of bookings) {
            const user = asObject(b.user);
            const tour = asObject(b.tour);
            const status = getText(b.status).toUpperCase();
            const bookingId = getText(b.bookingCode, String(b.id ?? ''));
            let type: Notif['type'] = 'booking_pending';
            let title = '';
            let body = `${getText(user.fullName, 'Khách hàng')} — tour "${getText(tour.name, 'Tour')}"`;

            if (status === 'PENDING') {
                type = 'booking_pending';
                title = 'Đơn đặt mới cần xác nhận';
            } else if (status === 'CANCEL_REQUESTED') {
                type = 'booking_cancel_requested';
                title = 'Khách hàng gửi yêu cầu hủy booking';
                body = `Booking ${bookingId} — ${getText(user.fullName, 'khách hàng')} đang chờ xử lý hủy`;
            } else if (status === 'CONFIRMED') {
                type = 'booking_confirmed';
                title = 'Đơn đặt đã xác nhận thành công';
                body = `Booking ${bookingId} của ${getText(user.fullName, 'khách')} đã được xác nhận`;
            } else if (status === 'CANCELLED') {
                type = 'booking_cancelled';
                title = 'Đơn đặt vừa bị hủy';
                body = `Booking ${bookingId} — tour "${getText(tour.name)}" đã bị hủy`;
            } else {
                continue;
            }

            notifs.push({
                id: `booking_${b.id}`,
                type, title, body,
                time: getText(b.updatedAt, getText(b.createdAt, new Date().toISOString())),
                href: status === 'CANCEL_REQUESTED' ? '/admin/bookings?status=CANCEL_REQUESTED' : `/admin/bookings?status=${status}`,
                urgent: status === 'PENDING' || status === 'CANCEL_REQUESTED',
            });
        }
    }

    // ── 2. Review notifications ──
    if (reviewRes.status === 'fulfilled' && reviewRes.value?.ok) {
        const json = await reviewRes.value.json();
        const reviews = pickArray(json, ['reviews']);
        for (const r of reviews) {
            const user = asObject(r.user);
            const tour = asObject(r.tour);
            const rating = getNumber(r.rating, 5);
            const isBad = rating <= 3;
            const stars = '★'.repeat(Math.min(rating, 5));
            const content = getText(r.content);
            notifs.push({
                id: `review_${r.id}`,
                type: isBad ? 'review_bad' : 'review_good',
                title: isBad ? `Đánh giá tiêu cực ${stars} cần xử lý` : `Đánh giá mới ${stars} từ khách hàng`,
                body: `${getText(user.fullName, 'Khách')} đánh giá tour "${getText(tour.name, String(r.tourId ?? 'Tour'))}"${content ? ` — "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"` : ''}`,
                time: getText(r.createdAt, new Date().toISOString()),
                href: '/admin/reviews',
                urgent: isBad,
            });
        }
    }

    // ── 3. Support ticket notifications ──
    if (supportRes.status === 'fulfilled' && supportRes.value.ok) {
        const json = await supportRes.value.json();
        const tickets = pickArray(json, ['tickets']);
        for (const ticket of tickets) {
            const status = getText(ticket.status).toUpperCase();
            if (status !== 'NEW' && status !== 'IN_PROGRESS') continue;
            const isNew = status === 'NEW';
            notifs.push({
                id: `support_${ticket.id}_${status}`,
                type: isNew ? 'support_new' : 'support_in_progress',
                title: isNew ? 'Ticket hỗ trợ mới cần phản hồi' : 'Ticket hỗ trợ đang xử lý',
                body: `${getText(ticket.customerName, 'Khách hàng')} — ${getText(ticket.subject, 'Yêu cầu hỗ trợ')}`,
                time: getText(ticket.updatedAt, getText(ticket.createdAt, new Date().toISOString())),
                href: isNew ? '/admin/support?status=NEW' : '/admin/support?status=IN_PROGRESS',
                urgent: isNew,
            });
        }
    }

    // ── 4. New customer notifications ──
    if (userRes.status === 'fulfilled' && userRes.value?.ok) {
        const json = await userRes.value.json();
        const users = pickArray(json, ['users']);
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const u of users) {
            if (u.role !== 'CUSTOMER') continue;
            const created = new Date(getText(u.createdAt)).getTime();
            if (!Number.isFinite(created) || created < cutoff) continue;
            notifs.push({
                id: `customer_${u.id}`,
                type: 'customer_new',
                title: 'Khách hàng mới đăng ký tài khoản',
                body: `${getText(u.fullName, getText(u.email, 'Khách hàng'))} vừa tham gia Azure Horizon`,
                time: getText(u.createdAt, new Date().toISOString()),
                href: '/admin/customers',
            });
        }
    }

    notifs.sort((a, b) => {
        if (a.urgent && !b.urgent) return -1;
        if (!a.urgent && b.urgent) return 1;
        return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    return notifs.slice(0, 25);
}

// ── Search result helpers (used by command palette) ───────────────────────────
export { asObject, unwrapPayload, getText, getNumber };
