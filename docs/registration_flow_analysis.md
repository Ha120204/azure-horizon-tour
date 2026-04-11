# Phân Tích Luồng Đăng Ký Người Dùng (User Registration Flow)

Tài liệu này phân tích chi tiết quy trình đăng ký người dùng (User Registration) trong hệ thống, bao gồm hành vi từ giao diện Front-end, xử lý Logic ở Back-end và các thay đổi ở cấp độ Cơ sở Dữ liệu.

---

## 1. Luồng nghiệp vụ tổng quan (Business Flow)

Luồng hoạt động chuẩn từ lúc người dùng bắt đầu đến khi dữ liệu được ghi nhận:

1. **Truy cập**: Người dùng truy cập vào trang Đăng ký (`/register`) trên giao diện Frontend (Next.js).
2. **Nhập liệu**: Điền thông tin vào form bao gồm: Họ và tên (Full Name), Email, Mật khẩu (Password) và Xác nhận mật khẩu (Confirm Password).
3. **Kiểm tra sơ bộ (Validation)**: Frontend kiểm tra dữ liệu, đảm bảo không bỏ trống và đặc biệt kiểm tra mật khẩu đã nhập trùng khớp với xác nhận mật khẩu hay chưa.
4. **Gọi API**: Nếu dữ liệu hợp lệ, Frontend gọi API lên Backend qua phương thức `POST /auth/register` cùng dữ liệu chuẩn JSON định dạng.
5. **Tiếp nhận Request**: Controller ở phía Backend (NestJS) tiếp nhận yêu cầu và trích xuất dữ liệu.
6. **Kiểm tra nghiệp vụ**: Backend Service kiểm tra trong Cơ sở dữ liệu xem lượng Email gửi lên có bị trùng lặp với bất kì tài khoản nào đã tồn tại hay không.
7. **Bảo mật (Hashing)**: Vì lý do bảo mật, mật khẩu sẽ được băm (hash) bằng thuật toán `bcrypt` để không ai thấy được chuỗi thô.
8. **Lưu dữ liệu**: Backend tạo bản ghi người dùng mới và lưu vào hệ thống cơ sở dữ liệu PostgreSQL thông qua công cụ Prisma ORM.
9. **Phản hồi**: Backend trả dữ liệu xác nhận đăng ký thành công cho Frontend (cam kết không tiết lộ mật khẩu băm ra bên ngoài).
10. **Chuyển hướng (Redirect)**: Nhận kết quả thành công, Frontend hiển thị hiệu ứng thành công và tự động chuyển hướng người dùng sang trang Đăng nhập (`/login`) để bắt đầu dùng ứng dụng.

---

## 2. Phân tích Frontend (Next.js)

> [!NOTE]
> **Tệp tin**: `app/register/page.tsx`

### Quản lý Trạng thái (State Management)
Component React tận dụng React Hooks (`useState`) để điều phối dữ liệu người dùng lẫn UI:
- **Lưu trữ dữ liệu form**: `fullName`, `email`, `password`, `confirmPassword`.
- **UI UX Trạng thái**: `showPassword`, `showConfirmPassword` được dùng làm cờ logic (boolean) để hiển thị nội dung mật khẩu (con mắt ẩn/hiện) dạng text thô thay vì biến thành dấu chấm bằng cách Toggle type của Input giữa `password` và `text`.
- **Trạng thái kết quả**: `error` và `success` để quản lý các nội dung cảnh báo / báo hỷ sau khi gọi API.

### Quy tắc kiểm tra (Validation Rules) trước khi Submit
Hàm `handleRegister` cản quá trình submit mặc định bằng `e.preventDefault()`, sau đó áp dụng logic:
- **Kiểm tra bắt buộc**: Các thẻ `<input>` đã được gắn thuộc tính `required` sẽ ngăn browser submit nếu trống rỗng.
- **Xác thực Mật khẩu**: 
  ```javascript
  if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!');
      return; 
  }
  // Việc dùng return sẽ ngắt lệnh, ngăn không cho hệ thống gửi API rác lên Backend.
  ```

### Gọi API và xử lý trạng thái
- **Gửi HTTP Request**: Dùng Javascript `fetch()` chuẩn gốc để post data vào API URI `http://localhost:3000/auth/register`.
- **Khối Success**: Nếu `res.ok` (HTTP Status thành công 2xx), sử dụng `setTimeout` để trì hoãn nhẹ `0.5 giây` cho người dùng kịp thấy thông báo giao diện rất nhanh rồi mới gọi `router.push('/login')`.
- **Khối Error**: Nếu `!res.ok`, Parse dữ liệu trả về và đẩy nội dung lỗi lấy từ server (`errData.message`) ra cho người dùng xem.

---

## 3. Phân tích Backend (NestJS)

### Controller
> [!NOTE]
> **Tệp tin**: `src/auth/auth.controller.ts`

- Khai báo `@Post('register')` hứng toàn bộ request đến `/auth/register`.
- Nhận biến qua Payload Body sử dụng Data Transfer Object (DTO). Biến số `registerDto` thuộc class `RegisterDto` sẽ xác thực tính đúng (định dạng email, chuỗi ký tự) trước khi gọi service (`authService.register`).

### Service (Luồng xử lý cốt lõi)
> [!NOTE]
> **Tệp tin**: `src/auth/auth.service.ts`

1. **Kiểm tra trùng Email**:  
   ```typescript
   const existingUser = await this.prisma.user.findUnique({ where: { email } });
   if (existingUser) { 
       throw new ConflictException('Email already exists'); 
   }
   ```
   Hệ thống lục tìm email trong DB. Nếu có bản ghi tương ứng, nó ném ngay lỗi `ConflictException` (HTTP 409).

2. **Băm mật khẩu (Hashing)**:  
   Không lưu Plain Text. NestJS sử dụng `bcrypt` cùng salt level 10 để bảo mật mạnh mẽ.
   ```typescript
   const saltOrRounds = 10;
   const hashedPassword = await bcrypt.hash(password, saltOrRounds);
   ```

3. **Lưu dữ liệu qua Prisma**:  
   Chèn một user mới vào database bằng logic `this.prisma.user.create()` kết hợp với các dữ liệu (Email, Full Name, và Password dạng Hash). 

4. **Loại bỏ mật khẩu khỏi Object trả về**:  
   Kỹ thuật cực tốt ở dòng: `const { password: _, ...result } = user;`. Toán tử Destructuring này bọc lấy password vứt đi, và đưa tệp thuộc tính tĩnh an toàn (id, email, fullName...) trả lại Frontend.

---

## 4. Cấu trúc Database (Prisma)

> [!NOTE]
> **Tệp tin**: `prisma/schema.prisma` (Model: `User`)

Bảng `User` lưu trữ dữ liệu với một số yếu tố bị ảnh hưởng trong luồng Create:
- **`id`**: Là Khóa chính, kiểu `Int` và sở hữu `@default(autoincrement())` tự nhảy số ID.
- **`email`**: Kiểu `String` giới hạn `@unique`, đóng vai trò cốt lõi ngăn ngừa trùng tài khoản khi User bị Double-Click hay gửi lặp API. DB sẽ chặn chèn ở cấp độ tầng đáy.
- **`password`**: Chuỗi `String`. Nhận giá trị Hash được sinh ra bởi Backend.
- **`fullName`**: Chuỗi `String` trực tiếp của người đăng ký cung cấp.
- **`role`**: Kiểu Enum (`Role`), hệ thống tự động chèn giá trị gốc là `CUSTOMER`.
- **`createdAt`, `updatedAt`**: Cơ sở dữ liệu tự gán Timestamp ngay trong thời điểm hoàn tất lưu tiến trình Đăng ký.

---

## 5. Các trường hợp ngoại lệ (Edge Cases & Error Handling)

- **Trường hợp 1: Người dùng nhập một Email đã từng được sử dụng để Đăng ký**
  - **Diễn biến**: Backend (Service) dò tìm Email với `findUnique`. Nó sẽ chặn lại và ném mã `ConflictException`. 
  - **Kết quả**: Server quăng HTTP 409 Bad Request/Conflict qua Client mang chuỗi `"Email already exists"`. UI ở phía Frontend bắt gọn lỗi ở lệnh Response không tồn tại `.ok`, đem lỗi đó gán vào `setError()`. Màn hình xuất hiện khung đỏ cảnh báo trực quan cho User thay đổi email khác.

- **Trường hợp 2: Bấm Đăng ký khi Database bị mất kết nối (Database Connection Fails)**
  - **Diễn biến**: Hoặc là hàm `fetch` bên FE bị rớt mạng hoàn toàn (Chạy vào block `catch (err)`), hoặc Prisma ORM bên BE chết do mất kết nối Postgres Server.
  - **Kết quả**: Nếu Backend mất kết nối Prisma, nó quăng một `500 Internal Server Error`, giao diện bắt `!res.ok` và đọc cái message chung chung. Nhưng nếu Frontend sập mạnh không kết nối được tới server Back-end, khối `catch (err)` sẽ chạy trực tiếp lệnh: `setError('Lỗi kết nối server.')`. Ứng dụng dĩ nhiên không crash màn hình (white screen) mà lại tiếp thị lỗi rất thân thiện.

- **Trường hợp 3: Người dùng nhập sai lệch ô Xác nhận Mật khẩu**
  - **Diễn biến & Xử lý**: Lỗi này ngăn chặn từ vòng "gửi xe" bên Frontend. Block `handleRegister` trả về lệnh Return khi phát sinh `password !== confirmPassword`. Hiệu năng ứng dụng được giữ nguyên vẹn do chẳng bao giờ gọi đi dòng API vô ích nào đến Backend.
