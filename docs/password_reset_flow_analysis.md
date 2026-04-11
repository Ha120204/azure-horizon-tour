# Tài Liệu Phân Tích: Quy Trình Quên & Đặt Lại Mật Khẩu

## 1. Tổng quan luồng nghiệp vụ
Quy trình lấy lại mật khẩu là cách hệ thống cấp lại quyền truy cập cho người dùng khi họ quên mật khẩu cũ. Hệ thống bắt buộc phải chia làm 2 giai đoạn để xác minh bảo mật xem đúng người thực sự sở hữu tài khoản đang thao tác hay không.

### Giai đoạn 1: Xác nhận qua Email (Forgot Password)
*   **Bước 1:** Người dùng vào trang "Quên mật khẩu", nhập địa chỉ Email của họ và ấn nút Gửi.
*   **Bước 2:** Màn hình giao diện (Frontend - Next.js) sẽ lấy địa chỉ Email đó, đóng gói thành định dạng dữ liệu chữ (JSON) và tạo một yêu cầu kết nối mạng (API request) đẩy lên máy chủ (Backend - NestJS).
*   **Bước 3:** Máy chủ nhận được yêu cầu. Nó sẽ tra cứu xuống Cơ sở dữ liệu (Database) xem Email này có từng đăng ký hệ thống hay không. Nếu Email có thật, máy chủ sẽ tự động tính toán sinh ra một đoạn mã bảo vệ dài gọi là **JWT Token**. Đoạn mã này được thiết lập thời hạn sử dụng khắt khe chỉ trong 15 phút.
*   **Bước 4:** Sau khi tạo xong mã JWT Token, máy chủ sẽ dùng mã này để ghép vào đuôi của một đường dẫn website (link). Kế tiếp, máy chủ liên kết với công cụ thư vụ Nodemailer để gửi một lá thư chứa đường dẫn này về đúng địa chỉ hộp thư mà người dùng vừa nhập ở Bước 1.
*   **Bước 5:** Ở trên trang web, sau khi gửi tín hiệu đi thành công, máy chủ phản hồi lại và giao diện hiển thị thông báo yêu cầu người dùng mở hộp thư Email lên kiểm tra.

### Giai đoạn 2: Tạo mật khẩu mới trên website (Reset Password)
*   **Bước 6:** Người dùng mở hộp thư, tìm thấy email từ hệ thống và nhấn vào đường dẫn bên trong. Đường dẫn này sẽ mở ra trang web Đặt lại mật khẩu. Lúc này, mã JWT Token ban nãy sẽ lập tức xuất hiện nối trên thanh địa chỉ của trình duyệt web (Ví dụ: `https://ten-website.com/reset-password?token=doan_ma_jwt`).
*   **Bước 7:** Trang web chạy ngầm một công cụ để copy đoạn mã JWT Token trên thanh địa chỉ xuống lưu tạm, đồng thời hiện ra 2 ô trống yêu cầu người dùng đánh "Mật khẩu mới" và "Xác nhận lại mật khẩu mới".
*   **Bước 8:** Giao diện web tự kiểm tra xem 2 ô mật khẩu người dùng gõ có khớp hệt nhau không. Nếu chuẩn xác, giao diện sẽ tóm gọn thông tin Mật khẩu mới cùng với mã JWT Token lưu tạm ở Bước 7 để gửi lệnh lên lại cho máy chủ kết thúc quy trình.
*   **Bước 9:** Máy chủ tiếp nhận yêu cầu. Tại đây, máy chủ trực tiếp đọc mã JWT Token để giải cấu trúc ra, xác định chính xác người dùng nào đang đổi mật khẩu và thời gian 15 phút đã hết chưa. Khi mã đạt yêu cầu cấp phép, máy chủ sẽ dùng mật thuật biến Mật khẩu chữ viết mới thành các cụm ký tự bảo mật khó đọc, sau đó đem ghi đè thay thế mật khẩu cũ xuống Cơ sở dữ liệu.
*   **Bước 10:** Quy trình đổi mật khẩu hoàn thành hệ thống ngầm. Trang web hiển thị bảng thông báo làm xong và tự chuyển hướng người dùng dùng mật khẩu mới về lại trang đăng nhập bình thường.

---

## 2. Phần Giao diện (Frontend - Next.js)

### 2.1. Quá trình gửi yêu cầu Email (`app/forgot-password/page.tsx`)
**Khóa nút bấm để tránh lỗi (UX Handling):** Khi người dùng tiến hành nhấn phím "Gửi đi", hệ thống giao diện gọi kích hoạt biến `isLoading = true`. 
*   **Giải thích rõ:** Biến này đóng vai trò làm vô hiệu hóa và khóa cứng nút bấm ngay lập tức. Tính năng này nhằm cản trở lỗi mạng chậm làm người dùng thiếu kiên nhẫn ấn hai đến ba lần liên tiếp, dẫn đến việc ứng dụng làm phiền gửi đi quá nhiều yêu cầu đẩy lên máy chủ và kích hoạt hàng loạt Email bị trùng đè lên hộp thư của khách hàng.

**Cách đóng dữ liệu đến máy chủ:**
```tsx
const res = await fetch("http://localhost:3000/auth/forgot-password", {
    method: "POST", // POST: Phương thức cấu trúc để gửi một gói dữ liệu mới vào hệ thống máy chủ
    headers: { "Content-Type": "application/json" }, // Báo cho máy chủ chuẩn bị tiếp nhận dữ liệu văn bản JSON
    body: JSON.stringify({ email }), // Đóng gói nội dung ô Email lại để vận chuyển đi
});
```
*   **Giải thích rõ:** Sau khi câu lệnh `fetch` chạy trả về kết quả đạt, tính năng của Front-end sẽ không làm Website tải lại trang gây khó chịu. Thay vào đó, nó tận dụng việc xử lý tại chỗ ẩn khung nhập Form Email cũ và chuyển đổi cấu trúc khung sang hiện dòng chữ nhắc nhở "Hãy kiểm tra hộp thư của bạn".

### 2.2. Quá trình đặt lại form Mật khẩu mới (`app/reset-password/page.tsx`)

**Đọc mã Token từ thanh địa chỉ bằng Hook:**
Đường link đính từ Email gửi qua bao giờ cũng đính theo phân đoạn `?token=...` đuôi.
*   **Giải thích rõ:** Frontend phải chạy hàm công cụ `useSearchParams()` để có thể định vị và copy ngay lập tức chuỗi mã sau chữ "token". Chuỗi mã copy được này coi như là một thẻ chứng minh cho phép người dùng đổi mật khẩu. Nếu người dùng đến trang này bằng cách gõ URL bằng tay từ Google chẳng hạn, họ không có thư mục "?token=", code Web sẽ không tìm thấy biến này và báo lỗi cấm chạy trang web, đảm bảo mức độ an toàn nghiêm ngặt từ vòng gửi xe.
```tsx
const searchParams = useSearchParams();
const token = searchParams.get('token'); 
```

**Bộ lọc kiểm tra tại vị trí Browser (Validation):**
Không phải dữ liệu nào cũng gọi thẳng cho máy chủ, phần giao diện sẽ tự kiểm duyệt trước một đợt các quy định để máy chủ bớt việc nặng nhọc:
1. Chiều dài bảo mật: Các ký tự mật khẩu người dùng sửa đổi phải lớn hơn 6 đơn vị.
2. Kiểm tra đồng mẫu: Web tự duyệt liên tục xem ô Nhập Mật Khẩu và ô Xác Nhận có gõ sai lệch kỹ tự nào không, cứ hễ sai không giống hoàn toàn là hệ thống phun chữ báo lỗi chặn yêu cầu tiếp diễn.

---

## 3. Phần Máy chủ xử lý (Backend - NestJS)

### 3.1. Phân Tích Kỹ Thuật Tạo Token và Cấu hình Gửi Email

**Thiết lập mã Token qua công nghệ JWT (JSON Web Token):**
```typescript
const resetToken = this.jwtService.sign(
    { sub: user.id, email: user.email }, // Dữ liệu bên trong gửi cho định danh tài khoản 
    { expiresIn: '15m' }, // Máy chủ chỉ định vòng đời mã này là 15 phút
);
```
*   **Giải thích rõ:** Tại sao không viết một chuỗi số chữ cái rồi lưu vào máy để kiểm định sau? JWT là một nền tảng tiên tiến. Bởi vì bản thân trong một JWT Token sinh ra nó đã bọc cứng và nhồi chứa sẵn thông tin ID của tài khoản khách hàng cùng với ngày tháng đồng hồ đếm lùi quá 15 phút bên trong đó. Và do nó được mã hóa ký đóng dập bảo mật điện tử ngầm (Private Key riêng) nên không một ai có thể xem hay chỉnh sửa thông tin bên trong. Khi nó đi lên một vòng lại đến máy chủ, máy chủ chạy trình lấy chìa khóa bí mật để xác minh mà không hao tốn dung lượng bộ nhớ từ Database rà lại nữa (Cơ chế Không theo dõi lưu Database - Stateless).

**Liên thông bộ phận gửi thư Nodemailer:** 
*   **Giải thích rõ:** Chức năng tên `mail.service.ts` được đánh thức để nhận phần chuỗi JWT. Ở đây, thư viện liên kết thông số Username, Password có sẵn với luồng hộp thư của hệ thống (Ví dụ Outlook, Gmail). Code HTML dựng bộ áo thẩm mỹ của email được nhồi xen theo chuỗi JWT URL tạo ở trên để cấu thành nút liên kết hoàn chỉnh trước giao thức Gửi nhận Thư SMTP đi.

### 3.2. Cập nhật dữ liệu đè lên cơ sở Database

**Máy chủ xác định tuổi thọ Token:**
```typescript
let payload: any;
try {
  // Máy chủ kiểm tra con dấu bảo mật nguyên bản gốc và đối chiều thời gian 15p
  payload = this.jwtService.verify(token); 
} catch (error) {
  throw new UnauthorizedException('Token yêu cầu từ email của bạn đã hết hạn hoặc không hợp lệ');
}
```
*   **Giải thích rõ:** Lệnh `try...catch` ở đây dùng để trị lỗi của hệ thống lập trình. Công cụ `verify` kiểm tra Token. Nếu người dùng thao tác bấm đổi chậm trễ qua phút thứ 16 trở đi, hoặc Token mang nội dung lạ do bên thứ 3 can thiệp, `verify` của JWT sẽ phun báo hỏng nghiêm trọng khiến ứng dụng dừng hoạt động (văng ra màn hình). Cụm `catch` là phần đi gom sự cố lỗi này, bao bọc nó biến mất, giữ an toàn và báo sang Front-End từ chối là "Yêu cầu hết hạn".

**Bảo An Trưởng Mật Khẩu (Hashing với Bcrypt):**
```typescript
// Bộ công cụ hàm băm lấy mật khẩu văn bản chuẩn thành một luồng mã dạng ký tự băm vụn
const hashedPassword = await bcrypt.hash(newPassword, 10);
```
*   **Giải thích rõ:** Nếu nhập mật khẩu là `"Pass123456"`, hệ thống máy chủ chắt tuyệt đối nguyên tắc kinh doanh Không Ghi `"Pass123456"` bằng lưu định dạng văn bản đó vào các mục dữ liệu SQL Database. (Điều này ngăn chặn cả nhân sự lập trình nội bộ nhìn lén). Thư viện `bcrypt` vận hành thuật toán mã hóa dạng băm 10 vòng kết hợp muối mắm. Dòng chữ `"Pass123456"` bị đánh nhuyễn 1 chiều thành 1 đoạn dài trên 60 ký tự không đọc được (vd: `$2g$0h....`). Ký tự này không cho phép và không bao giờ dịch ngược về lại trạng thái `"Pass123456"`. Cuối cùng, Backend đem phần ký tự này đưa vào cột sửa Database thành công an toàn.

---

## 4. Phân tích Các Biện Pháp Cảnh Giác Bảo Mật (Security Details)

### 4.1. Không tiết lộ việc Email tra cứu có đúng hay sai
Giả thiết một người cố ý lạm dụng chức năng lấy lại mật khẩu, người đó gõ thử 1 triệu hộp tên email vào màn hình Forgot Password bằng phần mềm tự động bắn tự động lên Backend.
*   **Giải thích rõ ràng về lỗ hổng:** Nếu có Email tên "abc@gmail.com", Back-end trả lời lên màn hình: "Email đã tồn tại, kiểm tra thư đi". Khi gặp email chưa từng đăng ký, Backend chê bằng nút đỏ ở màn hình web báo: "Email này sai, không hề dùng chức năng này". Kẻ gian sẽ lợi dụng điểm khác biệt hiển thị lỗi này để liệt kê thu gom chính xác email nào thuộc về công dân có thật trên web, sau đó tiếp cận các kiểu lấy cắp dữ dội.
*   **Giải pháp xử lý:** Từ phía Code của Máy chủ API trả báo lỗi về Web. Bất kể email là đúng đăng ký hay không hề có mặt trong hệ thống sổ quản lý, kết quả duy nhất cho ra luôn dùng dòng thông báo chung chung trung lập: *"Nếu địa chỉ email này nằm đúng trên thư mục lưu, chúng tôi đã đưa gửi một phần liên kết."*. Thủ thuật nhỏ nhưng đã tiêu diệt rủi ro hacker trinh thám.

### 4.2. Thời gian giới hạn 15 phút (Expiration Limit)
*   **Giải thích rõ ràng:** Thời hạn tự hủy đóng vai trò khống chế rủi ro cho việc "liên kết cấp phép" lòi lỡ lưu truyền ra bên ngoài email gốc. Mọi người hay có thói quên xoay link đưa ai khác, hoặc nhiều ngày tháng sau do sử dụng lộ mất cả tài khoản truy cập email vào tay người khác dòm ngó. Cái Link trên hộp thư lúc này đang được đặt chế độ hết hạn 15 Phút, người thứ hai nếu ấn vào không có bất kì công hiệu do JWT Token trên thanh chỉ ra không còn hoạt lực nữa.

### 4.3. Từ chối sửa đổi chữ ký lạ lẫm
*   **Giải thích rõ ràng:** Một số nhóm phá mã sẽ có hành vi cắt ráp, thêm các câu mã hack chèn nhét vào trong JWT gửi lùi lên Backend nhắm cướp tài khoản. Tuy nhiên, JWT thiết lập tính toàn vẹn (Signature Check) bằng phần tử chữ ký điện tử. Một chữ ở thanh Token sai khác, tức vòng bảo mật kiểm duyệt `JsonWebTokenError` lập tức xác minh từ chối lọt tiếp diễn quá trình vào Cơ Sơ Dữ Liệu SQL Database.
