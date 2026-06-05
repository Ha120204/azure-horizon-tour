# Tour Management System — Convention & Structure

Monorepo gồm 2 sub-project:

```
tour/
├── tour-backend/      # NestJS REST API
└── tour-frontend/     # Next.js 16 App Router
```

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | NestJS | 11.0 |
| ORM | Prisma | 7.5 |
| Database | PostgreSQL | — |
| Auth | JWT + Passport (Google OAuth) | — |
| Frontend framework | Next.js (App Router) | 16.2 |
| UI runtime | React | 19.2 |
| Styling | Tailwind CSS | v4 |
| i18n | next-intl | 4.x |
| Animation | Framer Motion | 12.x |
| Language | TypeScript | 5.7 |

---

## Backend — tour-backend

### Cấu trúc module

```
src/
├── activity-log/        # Audit logging
├── admin-notification/  # Thông báo real-time
├── ai/                  # AI-powered features
├── article/             # Bài viết / journal
├── auth/                # Login, register, OAuth, JWT
├── booking/             # Đặt tour, huỷ, assisted draft
├── common/              # CloudinaryService, interceptors, filters
├── contact/             # Form liên hệ
├── mail/                # Email service
├── payment/             # PayOS integration
├── prisma/              # PrismaService (global)
├── review/              # Đánh giá tour
├── search/              # Full-text search
├── settings/            # Cấu hình hệ thống
├── statistics/          # Analytics & KPIs
├── subscriber/          # Email subscribers
├── support/             # Hỗ trợ & chat
├── super-admin/         # Super admin operations
├── tour/                # Core tour business logic
├── tour-departure/      # Lịch khởi hành
├── tour-package/        # Gói hành trình
├── user/                # Quản lý user
└── voucher/             # Voucher giảm giá
```

### Cấu trúc một feature module

**Module đơn giản:**

```
feature/
├── feature.module.ts      # Import/export, providers
├── feature.controller.ts  # HTTP routes, guards, throttle
├── feature.service.ts     # Business logic
└── dto/
    ├── create-feature.dto.ts
    └── update-feature.dto.ts
```

**Module phức tạp — tách service theo responsibility:**

```
tour/
├── tour.module.ts
├── tour.controller.ts
├── tour.service.ts           # Điều phối các sub-service
├── tour-workflow.service.ts  # Trạng thái, publish, approve
├── tour-query.service.ts     # Truy vấn phức tạp
├── tour-content.service.ts   # Nội dung, ảnh
└── tour-helpers.ts           # Pure functions, không inject
```

### Controller pattern

- Controller: nhận request, gọi service, trả về kết quả thô.
- **Không** chứa business logic trong controller.
- `TransformInterceptor` tự wrap response thành `{ data, message, statusCode }`.
- Rate limit mặc định: 100 req/60s (global). Endpoint nhạy cảm dùng `@Throttle` thấp hơn.

```typescript
@Controller('tour')
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @Get()
  findAll(@Query() query: TourQueryDto) {
    return this.tourService.findAll(query);
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  create(@Body() dto: CreateTourDto, @CurrentUser() user: User) {
    return this.tourService.create(dto, user);
  }
}
```

### DTOs & Validation

- Luôn dùng `class-validator` decorators, **không** validate thủ công.
- `whitelist: true` đã bật globally → field ngoài DTO bị strip tự động.
- `transform: true` đã bật globally → string → number/boolean tự động từ query params.

```typescript
export class CreateTourDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(TravelScope)
  scope: TravelScope;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### Prisma patterns

- **Soft delete** là default: dùng `deletedAt` field, **không** gọi `.delete()` trừ khi là hard-delete có chủ đích.
- **Pagination**: dùng `skip` + `take`, không load toàn bộ rồi slice.
- **Select**: chỉ định field cụ thể khi query lớn, tránh lấy toàn bộ object.

```typescript
// Soft delete
await this.prisma.tour.update({ where: { id }, data: { deletedAt: new Date() } });

// Query luôn lọc deleted
await this.prisma.tour.findMany({ where: { deletedAt: null }, skip, take });

// Select field cụ thể
await this.prisma.tour.findMany({
  where: { deletedAt: null },
  select: { id: true, title: true, slug: true, thumbnail: true },
});
```

### Roles & Auth

| Role | Mô tả |
|---|---|
| `SUPER_ADMIN` | Toàn quyền hệ thống |
| `ADMIN` | Quản lý tour, bài viết, user |
| `STAFF` | Tạo/sửa nội dung |
| `CUSTOMER` | Đặt tour, đánh giá |

---

## Frontend — tour-frontend

### Cấu trúc thư mục

```
src/
├── app/
│   └── [locale]/
│       ├── (auth)/           # Login, register, reset-password
│       ├── (customer)/       # Trang công khai — cần SEO
│       │   ├── layout.tsx
│       │   ├── tour/[id]/
│       │   │   ├── page.tsx          # Server Component
│       │   │   └── _components/
│       │   ├── journal/
│       │   ├── destinations/
│       │   └── ...
│       └── admin/            # Dashboard quản trị — không cần SEO
│           ├── layout.tsx
│           ├── page.tsx
│           ├── tours/
│           │   ├── page.tsx          # 'use client'
│           │   ├── _components/      # Table, Filters, Overlays
│           │   ├── _hooks/           # useTourManagement.ts
│           │   └── _lib/             # types, kpis, exportCsv
│           └── ...
├── components/               # Component dùng chung nhiều nơi
│   ├── admin/
│   ├── layout/               # Header, Footer, SideNavBar
│   ├── tour/                 # TourCard, TourGallery, PackageCard
│   ├── checkout/
│   ├── review/
│   ├── search/
│   └── ui/
├── context/
│   └── LocaleContext.tsx     # i18n, currency, formatPrice/Date/Number
├── hooks/                    # Custom hooks dùng chung
│   ├── useAuth.ts
│   ├── useAdminRealtime.ts
│   └── useDebounce.ts
├── i18n/
│   ├── routing.ts            # Locales: ['en', 'vi'], default: 'en'
│   └── request.ts
├── lib/
│   ├── fetchWithAuth.ts      # apiClient — gọi API duy nhất qua đây
│   ├── constants.ts          # API_BASE_URL
│   └── ...
├── messages/
│   ├── en/                   # common, tour, auth, checkout, ...
│   └── vi/
└── types/
    └── index.ts              # Tất cả TypeScript interfaces
```

### Nguyên tắc đặt component

**Component chỉ dùng cho 1 page → đặt trong `_components/` cạnh page đó:**

```
admin/tours/
├── page.tsx
├── _components/
│   ├── TourTable.tsx
│   ├── TourFilters.tsx
│   └── TourFormOverlay.tsx
├── _hooks/
│   └── useTourManagement.ts   # Toàn bộ state & API calls của page
└── _lib/
    ├── types.ts
    └── kpis.ts
```

**Component dùng ở nhiều page → đặt trong `/components`:**

```
components/
├── tour/TourCard.tsx
├── ui/Toast.tsx
└── layout/Header.tsx
```

### API Client — `api.get / api.post / api.patch / api.delete`

**Không fetch trực tiếp. Mọi call API đi qua `lib/fetchWithAuth.ts`.**

```typescript
import { api } from '@/lib/fetchWithAuth';

// Shorthand methods
const result = await api.get<Tour>('/tour/123');
const result = await api.post<Booking>('/booking', bookingDto);
const result = await api.patch<Tour>('/tour/123', updateDto);
const result = await api.delete<void>('/tour/123');
```

**Kết quả trả về: `ApiResult<T>` — discriminated union bởi `ok`:**

```typescript
const result = await api.get<Tour[]>('/tour');

if (!result.ok) {
  // result.error: string, result.status: number
  // Toast lỗi 403/5xx/422 đã hiển thị tự động
  return;
}

// result.data: Tour[] (đã unwrap khỏi { data, message, statusCode })
setTours(result.data);
```

**Không dùng Redux / RTK Query trong project này.** State management = React hooks + `apiClient`.

### i18n — next-intl

2 locale: `en` (default) và `vi`. Message files tổ chức theo domain.

```typescript
// Trong component
const t = useTranslations('tour');
return <h1>{t('detail.title')}</h1>;
```

**Formatting — luôn dùng `LocaleContext`, không tự format:**

```typescript
const { formatPrice, formatDate, formatNumber } = useLocale();

// ✅ Đúng
<span>{formatPrice(tour.price)}</span>

// ❌ Sai
<span>{tour.price.toLocaleString()} VND</span>
```

### Quy tắc `'use client'`

| Loại trang | Server/Client | Lý do |
|---|---|---|
| `(customer)/**/page.tsx` | **Server Component** | SEO, metadata, LCP nhanh |
| `admin/**/page.tsx` | `'use client'` trực tiếp | CRUD, state, không cần SEO |
| Component có state/event | `'use client'` | useState, useEffect |
| Component chỉ render | Server Component | Không cần hydrate |

### Data Fetching Strategy

| Loại trang | Chiến lược | Lý do |
|---|---|---|
| Public (customer) | `fetch()` trong Server Component | SEO, crawlable, LCP nhanh |
| Admin/Dashboard | `apiClient` trong `useEffect` hoặc custom hook | Real-time, không cần SEO |
| Public + interactive | Server render + client component con | Hybrid |

```tsx
// ✅ Public page — server fetch
// app/[locale]/(customer)/tour/[id]/page.tsx
export default async function TourPage({ params }) {
  const res = await fetch(`${process.env.API_URL}/tour/${params.id}`, {
    next: { revalidate: 3600 },
  });
  const { data: tour } = await res.json();
  return <TourDetail tour={tour} />;
}

// ✅ Admin page — apiClient trong hook
// app/[locale]/admin/tours/_hooks/useTourManagement.ts
const result = await api.get<PaginatedResponse<Tour>>('/tour/admin');
if (result.ok) setTours(result.data.data);
```

### Admin page pattern

Mỗi admin page phức tạp theo cấu trúc 4 lớp:

```tsx
// 1. page.tsx — 'use client', chỉ orchestrate
'use client';
import { useTourManagement } from './_hooks/useTourManagement';
import { TourTable } from './_components/TourTable';
import { TourFilters } from './_components/TourFilters';

export default function AdminToursPage() {
  const state = useTourManagement();
  return (
    <div>
      <TourFilters {...state} />
      <TourTable {...state} />
    </div>
  );
}
```

```typescript
// 2. _hooks/useTourManagement.ts — toàn bộ state & API
'use client';
export function useTourManagement() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTours = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.get<PaginatedResponse<Tour>>(`/tour/admin?page=${page}`);
      if (result.ok) setTours(result.data.data);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchTours(); }, [fetchTours]);

  return { tours, page, setPage, isLoading, fetchTours };
}
```

---

## Checklist tạo page mới

### Public page (cần SEO)

- [ ] `page.tsx` → Server Component, **không** có `'use client'`
- [ ] `generateMetadata()` → title, description, openGraph, canonical
- [ ] `generateStaticParams()` → nếu là dynamic route `[id]`
- [ ] `notFound()` → khi data không tồn tại
- [ ] Fetch bằng `fetch()` trực tiếp, **không** dùng `apiClient`
- [ ] `loading.tsx` → skeleton UI
- [ ] Alt text đầy đủ cho ảnh
- [ ] Text hiển thị đi qua `useTranslations()`

### Admin page (không cần SEO)

- [ ] `page.tsx` → `'use client'`, chỉ render các component con
- [ ] `_hooks/useXManagement.ts` → state, API calls, pagination, filters
- [ ] `_components/` → Table, Filters, Overlays (khi đủ lớn)
- [ ] `_lib/` → types, kpis, exportCsv (khi cần)
- [ ] Dùng `api.get/post/patch/delete`, luôn check `result.ok`
- [ ] Pagination dùng `useState` (không cần URL)

### Backend module mới

- [ ] `.module.ts` → khai báo controllers, providers, imports
- [ ] `.controller.ts` → routes, guards, không có business logic
- [ ] `.service.ts` → business logic
- [ ] `dto/` → class-validator DTOs
- [ ] Đăng ký trong `app.module.ts`
- [ ] Soft delete dùng `deletedAt`, không dùng `.delete()`
