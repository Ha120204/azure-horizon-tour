# Phân tích Luồng Đăng nhập (User Login Flow)

Tài liệu này trình bày chi tiết về luồng nghiệp vụ, cách thức hoạt động của frontend, backend và database liên quan đến tính năng phân quyền và đăng nhập của hệ thống.

## 1. Luồng nghiệp vụ tổng quan (Business Flow)

Quá trình đăng nhập của người dùng vào hệ thống bao gồm các bước sau:

*   **Nhập thông tin (Credentials):** Người dùng nhập `email` và `password` vào form Đăng nhập trên giao diện tại trang `/login`. 
*   **Gửi Request (API Fetch):** Khi nhấn "Sign In", trình duyệt gửi một HTTP Request dạng `POST` (Payload định dạng JSON) lên máy chủ Backend ở địa chỉ endpoint `/auth/login`.
*   **Truy vấn Hệ cơ sở dữ liệu (Database Query):** NestJS nhận yêu cầu. `AuthService` sẽ dùng Prisma ORM truy vấn vào bảng `User` để tìm kiếm tài khoản khớp với `email`.
*   **Kiểm tra mật khẩu (Password Comparison):** Mật khẩu thuần (plain-text) được gửi lên sẽ được so khớp với mã băm (hashing password) đã lưu trong Database bằng hàm `bcrypt.compare`.
*   **Khởi tạo Token (JWT Generation):** Khi mật khẩu chính xác, Backend tiến hành tách trường password ra khỏi dữ liệu trả về, sau đó ký tạo **hai** JSON Web Token (JWT) thông qua `jwtService`:
    * **Access Token** (sống **1 giờ**): Payload chứa các thông tin công khai: ID người dùng (chuẩn `sub`), `email` và Quyền hạn (`role`). Dùng để xác thực mọi API request.
    * **Refresh Token** (sống **7 ngày**): Payload tối giản chỉ chứa `{ sub: user.id }`. Dùng duy nhất để xin cấp `access_token` mới khi token cũ hết hạn.
*   **Lưu trữ cấp phiên (Client-side Storage):** Frontend nhận gói HTTP Response hoàn chỉnh. Nó sẽ lấy chuỗi `access_token` và `refresh_token` để lưu vào vị trí `localStorage` (hành động như là thẻ bài cho các lần gọi API bị khóa tiếp theo).
*   **Điều hướng (Redirection) & Cập nhật UI:** Frontend phát ra một sự kiện (Custom Event `auth-change`) để báo hiệu cho Component Header tự đổi UI ngay tức thì. Sau đó, nó sử dụng Next Router (`router.push('/')`) để tải trang chủ mượt mà (0ms delay), thay vì phải ép trình duyệt tải lại toàn bộ như web cũ.

---

## 2. Phân tích Frontend (Next.js)

### Quản lý trạng thái Form Đăng nhập
Trong file `app/login/page.tsx`, trạng thái được quản lý nội bộ bằng React Hook (`useState`) qua các biến state như `email`, `password`, biến ẩn/hiện view `showPassword`, đồng thời bắt lỗi hiển thị cho form bằng biến `error`.

```tsx
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [error, setError] = useState('');
const [successMsg, setSuccessMsg] = useState('');
```

### Kết nối API (POST tới Backend)
Sự kiện `handleLogin` gọi API qua thư viện Fetch chuẩn:
```tsx
const res = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
});
```

### Xử lý Response & Điều hướng (Crucial)
Thành công, React lưu JWT vào Local Storage để duy trì trạng thái đăng nhập cho những trang sau đó.

> [!NOTE]
> Cách xử lý khi Response `200 OK` (Chuẩn Single Page Application - SPA): 
> 1. Lưu `access_token`, `refresh_token` và tên người dùng xuống `localStorage`. 
> 2. Phát một sự kiện `window.dispatchEvent(new Event('auth-change'))` để báo cho toàn bộ app (đặc biệt là `Header.tsx`) cập nhật state ngay lập tức mà không cần F5.
> 3. Hướng mượt mà bằng Next.js Router gốc (`router.push('/')`), quá trình này diễn ra ngay lặp tức (0ms). Khắc phục hoàn toàn tình trạng phải F5 hard reload, giúp triệt tiêu hiện tượng nháy trắng màn hình.

```tsx
const data = await res.json();
localStorage.setItem('accessToken', data.access_token);
localStorage.setItem('refreshToken', data.refresh_token);
localStorage.setItem('userName', data.user?.fullName || '');

// Phát sự kiện để Header tự cập nhật chữ Đăng nhập thành Avatar
window.dispatchEvent(new Event('auth-change'));

// Chuyển trang mượt mà qua Next Router (0ms delay)
router.push('/');
```

Component Header (`app/components/Header.tsx`) sử dụng sự kiện tĩnh để tự động kiểm tra xem JWT có hay không. Khác với cách reload, tính năng lắng nghe `auth-change` phản hồi vô cùng chuẩn xác.
```tsx
useEffect(() => {
    const checkAuth = () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            setIsLoggedIn(true);
            setUserName(localStorage.getItem('userName') || '');
        } else {
            setIsLoggedIn(false);
            setUserName('');
        }
    };

    // Chạy lần đầu
    checkAuth();

    // Lắng nghe sự kiện để cập nhật không cần reload
    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
}, []);
```

---

## 3. Phân tích Backend (NestJS & JWT)

### Cấu trúc Controller
Trong Controller `src/auth/auth.controller.ts`, endpoint được móc bằng thư viện Decorator trực quan trên đầu phương thức:
```typescript
@Post('login')
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto.email, loginDto.password);
}
```

### Phân tích Service từng dòng ở Khối Logic
Tại `src/auth/auth.service.ts`:

**a. Tìm kiếm User qua Email (Prisma ORM):**
```typescript
const user = await this.prisma.user.findUnique({
  where: { email },
});
```
*Vì sao dùng `findUnique`?* Bởi trong Prisma (`schema.prisma`), field `email` đã mang chỉ định `@unique`.

**b. So sánh Mật khẩu (`bcrypt`):**
Mật khẩu trong DB đã bị băm từ lúc User được đăng ký. Code phải dùng hàm nội hàm của `bcrypt` xử lí chứ không giải ngược chuỗi băm được:
```typescript
const isMatch = await bcrypt.compare(pass, user.password);
```

**c. Bóc tách Password (Crucial Code):**
Trước khi gộp trả qua FrontEnd (tầng Controller), ta phải thu hẹp Object lại. 
```typescript
const { password, ...result } = user;
```
Toán tử Destructuring tạo ra một const `password` để lược bỏ và bỏ trọn vẹn thông tin Object an toàn vào biến mới tên là `result`.

**d. Sinh JWT (JSON Web Token) — Hệ thống Dual-Token:**
Sử dụng hàm `.sign()` của Provider `@nestjs/jwt` để sinh ra **hai** token:
```typescript
// Access Token — kế thừa TTL 1h từ JwtModule.register()
const payload = { sub: user.id, email: user.email, role: user.role };
const access_token = this.jwtService.sign(payload);

// Refresh Token — payload tối giản, sống 7 ngày
const refresh_token = this.jwtService.sign(
  { sub: user.id },
  { expiresIn: '7d' },
);

return { user: result, access_token, refresh_token };
```
* **Access Token** (`1h`): Payload chứa `sub` (Subject — ID của User), `email` và `role` (phân quyền cho Guard Route). TTL kế thừa mặc định `1h` từ `AuthModule` (`JwtModule.register({ signOptions: { expiresIn: '1h' } })`).
* **Refresh Token** (`7d`): Payload chỉ chứa `{ sub: user.id }` — tối giản vì mục đích duy nhất là dùng để xin access token mới. TTL `7d` được truyền trực tiếp vào `.sign()` để ghi đè giá trị mặc định.

**e. Endpoint Refresh Token (`POST /auth/refresh`):**
Khi access token hết hạn, Frontend gọi endpoint này kèm refresh token để nhận access token mới mà **không cần đăng nhập lại**:
```typescript
// auth.controller.ts
@Post('refresh')
async refresh(@Body() body: { refresh_token: string }) {
  return this.authService.refreshToken(body.refresh_token);
}
```
Logic xử lý trong `AuthService.refreshToken()`:
1. Verify refresh token bằng `jwtService.verify()` — nếu hết hạn hoặc sai → throw `UnauthorizedException`
2. Truy vấn DB lấy thông tin user **mới nhất** (đề phòng `role` đã thay đổi từ khi token được cấp)
3. Sinh `access_token` mới (TTL 1h) với payload cập nhật
4. Trả về `{ access_token }` cho Frontend

---

## 4. Cơ chế Auto-Refresh Token (Frontend)

### Utility `fetchWithAuth()` — Trung tâm xử lý xác thực
File `app/utils/fetchWithAuth.ts` là hàm utility tập trung, thay thế toàn bộ pattern gọi API thủ công trước đây. Mọi trang cần gọi API có xác thực (`profile`, `checkout`, `my-bookings`, `success`) đều import và sử dụng hàm này.

**Luồng hoạt động:**
```
┌─ fetchWithAuth(url, options) ──────────────────────────────────┐
│                                                                │
│  1. Lấy accessToken từ localStorage                           │
│  2. Gắn header Authorization: Bearer <token>                  │
│  3. Gọi fetch(url) ─────── Response OK? ──→ ✅ Trả về         │
│                                │                               │
│                           Response 401?                        │
│                                │                               │
│  4. Lấy refreshToken từ localStorage                          │
│  5. Gọi POST /auth/refresh { refresh_token }                  │
│         │                                                      │
│     Thành công? ──→ Lưu accessToken mới → Retry request → ✅  │
│         │                                                      │
│     Thất bại? ──→ Xóa tất cả token → Redirect /login         │
└────────────────────────────────────────────────────────────────┘
```

**Trước khi có `fetchWithAuth` (pattern cũ lặp lại ở 9 chỗ):**
```tsx
const token = localStorage.getItem('accessToken');
const res = await fetch('http://localhost:3000/auth/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
});
// ❌ Không xử lý khi token hết hạn (401)
```

**Sau khi có `fetchWithAuth` (1 dòng, tự xử lý mọi thứ):**
```tsx
import { fetchWithAuth } from '@/app/utils/fetchWithAuth';

const res = await fetchWithAuth('http://localhost:3000/auth/profile');
// ✅ Tự gắn token, tự refresh khi 401, tự redirect khi hết hạn hoàn toàn
```

### Xử lý Logout
Khi người dùng đăng xuất, hệ thống xóa **cả hai** token khỏi `localStorage`:
```tsx
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('userName');
```

---

## 5. Các trường hợp ngoại lệ & Bảo mật (Edge Cases & Security)

### Hoạt động phòng ngừa khi tài khoản/mật khẩu sai

Trong service có xử lý ngoại lệ đồng nhất:
```typescript
if (!user) {
  throw new UnauthorizedException('Sai email hoặc mật khẩu');
}
// ... kiểm tra bcrypt ...
if (!isMatch) {
  throw new UnauthorizedException('Sai email hoặc mật khẩu');
}
```

> [!CAUTION]
> **Tại sao phải gom chung lỗi Generic Message thay vì tách lỗi?**  
> Việc phản hồi chung là lời khuyên Tiêu chuẩn của các hiệp hội bảo mật thế giới dành do phòng trừ **User Enumeration (Kỹ thuật Quét Dò Tìm / Liệt kê Tài khoản)**.  
> Giả sử thông báo rõ là `Email chưa tồn tại`, Hacker/Attacker tạo ra đoạn script tự động dùng thử hàng triệu email với dịch vụ của bạn; họ sẽ xác thực được đâu là các chủ thẻ đã tham gia dịch vụ thông qua cách Message hệ thống phản hồi khác biệt. Bằng việc "kín tiếng" "1 trong 2 sai thì bắt đầu lại", hacker không thể đoán được.

### Bảng tham chiếu thời hạn Token

| Token | TTL | Payload | Mục đích |
|---|---|---|---|
| **Access Token** | `1h` (1 giờ) | `{ sub, email, role }` | Xác thực mọi API request |
| **Refresh Token** | `7d` (7 ngày) | `{ sub }` | Xin cấp access token mới |
| **Reset Password Token** | `15m` (15 phút) | `{ sub, email }` | Link đặt lại mật khẩu qua email |

> [!IMPORTANT]
> **Tại sao cần tách thành 2 token?**  
> Access Token sống ngắn (1h) để giảm thiểu rủi ro nếu bị đánh cắp (qua XSS chẳng hạn) — hacker chỉ có tối đa 1 giờ sử dụng. Refresh Token sống dài (7 ngày) để user không phải đăng nhập lại liên tục — khi access token hết hạn, hàm `fetchWithAuth()` tự động gọi `/auth/refresh` để xin token mới mà user không hề biết. Mô hình này được các nền tảng du lịch lớn như Booking.com, Klook, Traveloka áp dụng.
