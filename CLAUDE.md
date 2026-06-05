# CLAUDE.md

Hướng dẫn hành vi dành riêng cho dự án **Tour Management System**.
Monorepo: `tour-backend` (NestJS + Prisma) và `tour-frontend` (Next.js 16 App Router).

**Lưu ý:** Các nguyên tắc này ưu tiên sự cẩn thận hơn tốc độ.
Với các tác vụ đơn giản, hãy linh hoạt sử dụng hợp lý.

---

## 1. Suy nghĩ trước khi code

**Không tự suy diễn. Không che giấu sự mơ hồ. Luôn nêu rõ các đánh đổi (tradeoff).**

Trước khi triển khai:
- Nêu rõ các giả định của bạn.
- Nếu chưa chắc chắn, hỏi lại.
- Nếu có nhiều cách hiểu khác nhau, liệt kê chúng — đừng tự âm thầm chọn một cách.
- Nếu có cách đơn giản hơn, nói ra.
- Nếu yêu cầu chưa rõ ràng, dừng lại và hỏi thêm.

---

## 2. Ưu tiên sự đơn giản

**Viết ít code nhất có thể để giải quyết vấn đề. Không thêm thứ không cần thiết.**

- Không thêm tính năng ngoài yêu cầu.
- Không tạo abstraction cho code chỉ dùng một lần.
- Không thêm khả năng "mở rộng", "config", "linh hoạt" nếu chưa được yêu cầu.
- Không xử lý lỗi cho những trường hợp không thể xảy ra.
- Nếu viết 200 dòng mà có thể làm trong 50 dòng — viết lại.

Luôn tự hỏi:
> "Một senior developer có thấy đoạn này bị over-engineer không?"

---

## 3. Chỉnh sửa có mục tiêu

**Chỉ sửa đúng phần cần sửa. Chỉ dọn dẹp những gì do bạn gây ra.**

Khi sửa code có sẵn:
- Không tự ý "cải thiện" code xung quanh.
- Không refactor những thứ đang hoạt động bình thường.
- Giữ nguyên style hiện có của project, kể cả khi bạn thích cách khác hơn.
- Nếu phát hiện dead code không liên quan — chỉ mention, không tự xóa.

Nếu thay đổi của bạn tạo ra code thừa:
- Xóa import / biến / function mà CHÍNH thay đổi của bạn làm dư thừa.
- Không xóa dead code cũ nếu chưa được yêu cầu.

> Mỗi dòng thay đổi phải liên quan trực tiếp đến yêu cầu của người dùng.

---

## 4. Quy tắc Backend (NestJS + Prisma)

### 4.1 Module structure

**Mỗi feature là một module độc lập. Không viết business logic trong controller.**

- **Controller**: nhận request, gọi service, trả về kết quả thô.
- **Service**: toàn bộ business logic.
- Module phức tạp: tách service theo responsibility (xem `tour/` làm mẫu).

```typescript
// ✅ Đúng — controller chỉ delegate
@Post()
create(@Body() dto: CreateTourDto, @CurrentUser() user: User) {
  return this.tourService.create(dto, user);
}

// ❌ Sai — business logic trong controller
@Post()
async create(@Body() dto: CreateTourDto) {
  const exists = await this.prisma.tour.findFirst({ where: { title: dto.title } });
  if (exists) throw new ConflictException();
  return this.prisma.tour.create({ data: dto });
}
```

### 4.2 DTOs & Validation

**Luôn dùng `class-validator`. Không validate thủ công.**

- `whitelist: true` đã bật globally → field ngoài DTO bị strip tự động.
- `transform: true` đã bật globally → string → number/boolean tự động từ query params.

```typescript
// ✅ Đúng
export class CreateTourDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// ❌ Sai — validate thủ công
if (!dto.title) throw new BadRequestException('Title required');
```

### 4.3 Prisma patterns

**Soft delete là default. Không dùng `.delete()` trừ khi là hard-delete có chủ đích rõ ràng.**

```typescript
// ✅ Soft delete
await this.prisma.tour.update({ where: { id }, data: { deletedAt: new Date() } });

// ✅ Query luôn lọc deleted
await this.prisma.tour.findMany({ where: { deletedAt: null } });

// ✅ Select field cụ thể khi query lớn
await this.prisma.tour.findMany({ select: { id: true, title: true, slug: true } });

// ❌ Sai — hard delete không có chủ đích
await this.prisma.tour.delete({ where: { id } });
```

### 4.4 Response format

**Không tự wrap response. `TransformInterceptor` đã wrap tự động thành `{ data, message, statusCode }`.**

```typescript
// ✅ Đúng — trả về data thô
async findAll() {
  return this.tourQueryService.findAll(query);
}

// ❌ Sai — tự wrap
async findAll() {
  const data = await this.tourQueryService.findAll(query);
  return { data, message: 'Success', statusCode: 200 };
}
```

### 4.5 Xử lý bất đồng bộ

**Mọi hàm async có thể throw phải bọc try/catch. Không để lỗi âm thầm.**

```typescript
// ✅ Đúng
async createBooking(dto: CreateBookingDto, user: User) {
  try {
    const tour = await this.prisma.tour.findUnique({ where: { id: dto.tourId } });
    if (!tour) throw new NotFoundException('Tour không tồn tại');
    return await this.prisma.booking.create({ data: { ...dto, userId: user.id } });
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new InternalServerErrorException('Không thể tạo booking');
  }
}
```

---

## 5. Quy tắc Frontend (Next.js + Tailwind)

### 5.1 Styling — Tailwind CSS v4

**Luôn dùng Tailwind. Chỉ dùng CSS thuần khi Tailwind không đáp ứng được.**

- Dùng design token của dự án: `text-primary`, `bg-surface-container`, `text-on-surface`, v.v.
- Không viết CSS inline hay tạo file `.css` riêng nếu Tailwind đủ dùng.
- Không dùng `!important` để ghi đè Tailwind.

```tsx
// ✅ Đúng
<button className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
  Submit
</button>

// ❌ Sai
<button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
  Submit
</button>
```

### 5.2 API Calls — luôn dùng `api` từ `fetchWithAuth`

**Không fetch trực tiếp trong component. Mọi call API đi qua `lib/fetchWithAuth.ts`.**

Dùng shorthand methods: `api.get<T>()`, `api.post<T>()`, `api.patch<T>()`, `api.delete<T>()`.
Luôn check `result.ok` trước khi truy cập `result.data`.

```typescript
import { api } from '@/lib/fetchWithAuth';

// ✅ Đúng
const result = await api.get<Tour>(`/tour/${id}`);
if (!result.ok) return; // Toast lỗi 403/5xx/422 đã tự hiện
setTour(result.data);

// ✅ POST với body
const result = await api.post<Booking>('/booking', bookingDto);
if (!result.ok) { toast.error(result.error); return; }
router.push(`/payment/${result.data.id}`);

// ❌ Sai — fetch trực tiếp
const res = await fetch(`${API_BASE_URL}/tour/${id}`);
const data = await res.json();
```

**KHÔNG dùng Redux / RTK Query trong project này.** State management = React hooks + `apiClient`.

### 5.3 i18n — next-intl

**Mọi text hiển thị ra user phải qua translation. Không hardcode string.**

```tsx
// ✅ Đúng
const t = useTranslations('tour');
return <h1>{t('detail.title')}</h1>;

// ❌ Sai
return <h1>Tour Details</h1>;
```

**Formatting — luôn dùng `LocaleContext`, không tự format số/ngày/tiền:**

```typescript
const { formatPrice, formatDate, formatNumber } = useLocale();

// ✅ Đúng
<span>{formatPrice(tour.price)}</span>

// ❌ Sai
<span>{tour.price.toLocaleString()} VND</span>
```

### 5.4 SEO — bắt buộc với trang public

**Mỗi public page phải là Server Component và có metadata đầy đủ.**

```tsx
// app/[locale]/(customer)/tour/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const res = await fetch(`${process.env.API_URL}/tour/${params.id}`);
  const { data: tour } = await res.json();
  return {
    title: `${tour.title} | TourVN`,
    description: tour.summary?.slice(0, 160),
    openGraph: { title: tour.title, images: [tour.thumbnail] },
    alternates: { canonical: `/${params.locale}/tour/${params.id}` },
  };
}

export default async function TourPage({ params }) {
  const res = await fetch(`${process.env.API_URL}/tour/${params.id}`, {
    next: { revalidate: 3600 },
  });
  const { data: tour } = await res.json();
  if (!tour) notFound();
  return <TourDetail tour={tour} />;
}
```

Cấu trúc HTML:
- Mỗi trang chỉ có **một** `<h1>`.
- Dùng tag semantic: `<main>`, `<article>`, `<section>`, `<nav>`.
- Ảnh phải có `alt` mô tả nội dung thực sự.

### 5.5 Data Fetching Strategy

| Loại trang | Chiến lược | Lý do |
|---|---|---|
| Public (customer) | `fetch()` trong Server Component | SEO, crawlable |
| Admin/Dashboard | `apiClient` trong custom hook | Real-time, không cần SEO |
| Public + interactive | Server Component + client component con | Hybrid |

```tsx
// ✅ Public — server fetch (Server Component)
const res = await fetch(`${process.env.API_URL}/tour/${id}`, { next: { revalidate: 3600 } });

// ✅ Admin — apiClient (Client Component / hook)
const result = await api.get<PaginatedResponse<Tour>>('/tour/admin');

// ❌ Sai — dùng apiClient cho trang public cần SEO
'use client';
const result = await api.get<Tour>(`/tour/${id}`); // Crawler không thấy data
```

### 5.6 Xử lý bất đồng bộ — bắt buộc try/catch

**Mỗi hàm async liên quan đến API phải bọc try/catch. Không để lỗi âm thầm.**

```typescript
// ✅ Đúng
const handleSubmit = async (data: FormData) => {
  setIsLoading(true);
  try {
    const result = await api.post('/booking', data);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.push(`/payment/${result.data.id}`);
  } catch {
    toast.error('Có lỗi xảy ra, vui lòng thử lại');
  } finally {
    setIsLoading(false);
  }
};

// ❌ Sai — không xử lý lỗi, không có finally
const handleSubmit = async (data: FormData) => {
  const result = await api.post('/booking', data);
  router.push(`/payment/${result.data.id}`);
};
```

### 5.7 Tái sử dụng — không chồng chéo logic

**Mỗi concern chỉ xử lý ở một nơi duy nhất.**

- **Data fetching + state**: custom hook (`_hooks/useXManagement.ts`)
- **Business logic / helpers**: lib function (`_lib/`)
- **Formatting**: `useLocale()` từ LocaleContext
- **Translation**: `useTranslations()` từ next-intl

Nếu một đoạn logic xuất hiện ≥ 2 lần → tách ra hook hoặc lib function.
Nếu một đoạn JSX xuất hiện ≥ 2 lần → tách ra component.

---

## 6. Quy tắc chung

### Comment

Không giải thích WHAT — tên hàm/biến đã làm điều đó.
Chỉ viết comment khi WHY không rõ ràng từ code.

```typescript
// ❌ Sai — giải thích what
// Lấy danh sách tour theo page
const tours = await this.tourQueryService.findAll({ page });

// ✅ Đúng — giải thích constraint ẩn
// PayOS yêu cầu amount là số nguyên VND, không chấp nhận thập phân
const amount = Math.round(total);
```

### Không tạo file tài liệu

Không tạo `*.md`, `NOTES.md`, hay file phân tích trong lúc làm task trừ khi được yêu cầu rõ ràng.

### Không hardcode string ra ngoài translation files

Mọi text hiển thị cho user → `messages/{locale}/` và dùng `useTranslations()`.
