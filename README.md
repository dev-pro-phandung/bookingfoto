# DỰ ÁN HỆ THỐNG ĐẶT LỊCH CHỤP ẢNH - PDUN.FOTO (POTONOW)

Tài liệu kỹ thuật tổng hợp quy trình xây dựng, cấu trúc hệ thống, phương pháp viết mã nguồn, kiểm soát chất lượng và các công cụ hỗ trợ phát triển dự án.

---

## MỤC LỤC
1. [Hướng dẫn cài đặt & Khởi chạy nhanh](#1-hướng-dẫn-cài-đặt--khởi-chạy-nhanh)
2. [Đã dùng gì để phân tích hệ thống?](#2-đã-dùng-gì-để-phân-tích-hệ-thống)
3. [Cấu trúc thư mục & Định nghĩa các file trong dự án](#3-cấu-trúc-thư-mục--định-nghĩa-các-file-trong-dự-án)
4. [Cách em viết code như thế nào? (Quy trình & Tư duy triển khai)](#4-cách-em-viết-code-như-thế-nào-quy-trình--tư-duy-triển-khai)
5. [Làm sao để em kiểm soát code tốt hơn? (Quản lý, Debug & Bảo mật)](#5-làm-sao-để-em-kiểm-soát-code-tốt-hơn-quản-lý-debug--bảo-mật)
6. [Các công cụ & kỹ thuật đã áp dụng để hỗ trợ code ngày càng ổn hơn](#6-các-công-cụ--kỹ-thuật-đã-áp-dụng-để-hỗ-trợ-code-ngày-càng-ổn-hơn)

---

## 1. Hướng dẫn cài đặt & Khởi chạy nhanh

### Yêu cầu môi trường:
- **Node.js**: Phiên bản 18+ trở lên.
- **MySQL**: Phiên bản 8.0+ hoặc MariaDB tương thích.

### Các bước cài đặt:
1. **Cài đặt thư viện:**
   ```bash
   npm install
   ```
2. **Cấu hình môi trường (`.env`):**
   Sao chép file `.env.example` thành `.env` và điền cấu hình kết nối CSDL MySQL:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=photo_booking
   JWT_SECRET=your_jwt_secret_key_2026
   ```
3. **Khởi tạo cơ sở dữ liệu tự động (Idempotent Setup):**
   ```bash
   npm run setup:db
   ```
   *Lệnh này tự động tạo các bảng, quan hệ khóa ngoại, nạp gói dịch vụ mặc định và bài viết mẫu nếu chưa tồn tại.*
4. **Khởi chạy ứng dụng:**
   ```bash
   npm run dev
   # Hoặc: npm start
   ```
   Truy cập hệ thống tại: `http://localhost:5000`

---

## 2. Đã dùng gì để phân tích hệ thống?

Để chuyển từ một ý tưởng nền tảng đặt lịch chụp ảnh thành một hệ thống phần mềm hoàn chỉnh, em đã áp dụng các phương pháp và công cụ phân tích sau:

### 2.1. Phân tích bài toán thực tế & Nhu cầu người dùng (Problem & User Needs)
- **Vấn đề thực tế:** Khách hàng thường gặp khó khăn khi tìm kiếm nhiếp ảnh gia tự do (freelancer): giá cả không minh bạch, khó đối chiếu phong cách ảnh chụp (portfolio), quản lý lịch hẹn qua tin nhắn dễ bị trùng lịch hoặc quên lịch. Ngược lại, thợ ảnh gặp khó khăn trong việc quản lý danh sách yêu cầu chụp và theo dõi lịch trình làm việc.
- **Xác định các vai trò (User Personas):**
  1. **Khách hàng (Client):** Xem danh sách thợ, lọc theo khu vực/giá/kinh nghiệm, xem ảnh mẫu & đánh giá, chọn gói chụp và ngày giờ để đặt lịch, theo dõi trạng thái buổi chụp.
  2. **Nhiếp ảnh gia (Photographer):** Đăng ký tài khoản và gửi portfolio xét duyệt, quản lý hồ sơ cá nhân, nhận thông báo lịch mới, theo dõi lịch trình nhận chụp thông qua bảng lịch tháng trực quan.
  3. **Quản trị viên (Admin):** Kiểm soát toàn bộ hệ thống, duyệt hồ sơ thợ ảnh mới, quản lý tất cả các đơn đặt lịch, xem biểu đồ thống kê lưu lượng khách truy cập (Traffic Analytics), quản trị bài viết Blog.

### 2.2. Phân tích luồng dữ liệu & Nghiệp vụ (Data Flow & Business Logic)
- **Luồng xác thực & phân quyền (Authentication & Authorization):**
  - Đăng ký -> Mã hóa mật khẩu (Bcrypt) -> Đăng nhập -> Cấp phát JSON Web Token (JWT) mang thông tin `userId` và `role`.
  - Phân quyền theo vai trò (RBAC): Admin truy cập `/pages/admin.html`; Photographer quản lý lịch chụp tại `/pages/my-bookings.html` hoặc `/pages/photographer-bookings.html`; Client đặt lịch tại `/pages/booking.html`.
- **Luồng đặt lịch (Booking Workflow):**
  - Khách chọn thợ ảnh mục tiêu -> Chuyển sang form đặt lịch (bảo đảm chỉ vào form khi đã chọn thợ) -> Chọn gói dịch vụ, ngày, giờ, địa điểm, ghi chú và ảnh tham khảo -> Tạo bản ghi với trạng thái `pending`.
  - Thợ ảnh nhận thông báo -> Xem chi tiết lịch chụp -> Xác nhận (`confirmed`) hoặc hoàn tất (`completed`).
- **Luồng bảng lịch thông minh (Big Calendar Flow):**
  - Truy vấn các buổi chụp theo ID thợ ảnh -> Nhóm theo từng ngày trong tháng -> Hiển thị số lượng lịch chụp trên từng ô ngày -> Khi di chuột (hover) vào ngày có lịch sẽ mở thẻ chi tiết (Popover Card) hiển thị: Khách hàng, Số điện thoại (bấm gọi ngay), Gói chụp, Giá tiền, Giờ chụp, Địa điểm, Trạng thái.

### 2.3. Thiết kế mô hình dữ liệu quan hệ (ERD - Entity Relationship Diagram)
Em đã phân tích và chuẩn hóa CSDL thành các bảng có ràng buộc chặt chẽ:
- `users`: Lưu trữ thông tin tài khoản (khách, thợ, admin), mật khẩu băm, email, số điện thoại, vai trò.
- `photographer_profiles`: Thông tin chuyên môn của thợ (địa điểm, kinh nghiệm, thiết bị, giá tiền, trạng thái kích hoạt `active`/`pending`), liên kết 1-1 với `users`.
- `photographer_photos`: Bộ sưu tập ảnh (Portfolio) của từng thợ ảnh, liên kết 1-n với `photographer_profiles`.
- `packages`: Danh mục các gói chụp ảnh tiêu chuẩn (cá nhân, cặp đôi, gia đình, sự kiện, studio).
- `bookings`: Lưu thông tin buổi chụp (khách nào, thợ nào, gói nào, ngày giờ, địa điểm, ghi chú JSON, trạng thái).
- `reviews`: Đánh giá số sao và nhận xét từ khách hàng sau khi hoàn tất buổi chụp.
- `blog_posts` & `blog_categories`: Quản lý các bài viết cẩm nang chụp ảnh và tin tức.
- `traffic_logs`: Nhật ký truy cập lưu IP, đường dẫn URL, User-Agent, thời gian để vẽ biểu đồ thống kê.
- `password_resets`: Lưu mã xác thực OTP 6 số để phục vụ chức năng quên mật khẩu.

### 2.4. Công cụ dùng trong giai đoạn phân tích:
- **Markdown & Sơ đồ Mermaid:** Phác thảo luồng dữ liệu, sơ đồ trạng thái booking.
- **MySQL Workbench / phpMyAdmin:** Thiết kế và thử nghiệm cấu trúc bảng, khóa chính, khóa ngoại.
- **Kỹ thuật Prompting & Phân tích yêu cầu với AI Agent:** Dùng prompt để bẻ nhỏ bài toán lớn thành các use-case độc lập có thể kiểm chứng được trước khi code.

---

## 3. Cấu trúc thư mục & Định nghĩa các file trong dự án

Dự án được tổ chức theo kiến trúc phân tầng chuẩn (**MVC - Model, View, Controller**) kết hợp API RESTful:

```
photo-booking-project/
├── .agents/                      # Cấu hình AI Agent & Custom Skills của dự án
│   └── skills/
│       └── code-advisor-consultant/ # Custom Skill định hướng tư duy lập trình
├── config/                       # Cấu hình hệ thống
│   └── db.js                     # Kết nối MySQL Connection Pool
├── controllers/                  # Tầng xử lý logic nghiệp vụ (Controllers)
│   ├── adminBlogController.js    # Quản trị bài viết blog, lấy metadata tự động
│   ├── adminController.js        # Thống kê lượt truy cập, biểu đồ, quản trị thợ & lịch
│   ├── authController.js         # Đăng ký, đăng nhập, quên mật khẩu, API /me
│   ├── blogController.js         # Lấy danh sách blog công khai & chi tiết bài viết
│   ├── bookingController.js      # Tạo lịch, lấy lịch theo khách/thợ, bảng lịch cá nhân
│   ├── catalogController.js       # Danh mục gói chụp và dịch vụ
│   └── photographerController.js # Lọc danh sách thợ, chi tiết hồ sơ & portfolio
├── middleware/                   # Tầng kiểm soát luồng trung gian (Middleware)
│   ├── requireAdmin.js           # Kiểm tra quyền quản trị viên (Admin Role)
│   ├── requireAuth.js            # Kiểm tra & giải mã JSON Web Token (JWT)
│   ├── trackTraffic.js           # Ghi nhận lượt truy cập phục vụ biểu đồ thống kê
│   └── upload.js                 # Xử lý upload file ảnh an toàn bằng Multer
├── routes/                       # Tầng định tuyến API (Routes)
│   ├── adminRoutes.js            # Định tuyến API quản trị (/api/admin)
│   ├── authRoutes.js             # Định tuyến API xác thực (/api/auth)
│   ├── blogRoutes.js             # Định tuyến API blog (/api/blogs)
│   ├── bookingRoutes.js          # Định tuyến API đặt lịch (/api/bookings)
│   ├── catalogRoutes.js          # Định tuyến API danh mục (/api/packages, /api/services)
│   ├── healthRoutes.js           # Kiểm tra tình trạng server (/api/health)
│   ├── photographerRoutes.js     # Định tuyến API nhiếp ảnh gia (/api/photographers)
│   └── uploadRoutes.js           # Định tuyến API upload ảnh (/api/upload)
├── public/                       # Tầng giao diện người dùng (Views & Client Assets)
│   ├── index.html                # Trang chủ (Hero banner, thể loại chụp, gói dịch vụ)
│   ├── pages/                    # Các trang chức năng của ứng dụng
│   │   ├── admin.html            # Trang quản trị: Biểu đồ traffic, quản lý thợ & lịch
│   │   ├── auth.html             # Trang Đăng nhập & Đăng ký tài khoản
│   │   ├── blog-detail.html      # Chi tiết bài viết bài blog
│   │   ├── blogs.html            # Danh sách bài viết blog
│   │   ├── booking.html          # Trang đặt lịch chụp hình trực quan
│   │   ├── forgot-password.html  # Trang quên mật khẩu và đặt lại mật khẩu OTP
│   │   ├── my-bookings.html      # Lịch của tôi: Bảng lịch tháng (Big Calendar) & Danh sách
│   │   ├── photographer-bookings.html # Không gian quản lý lịch làm việc của thợ
│   │   ├── photographer-profile.html  # Hồ sơ chi tiết thợ ảnh, portfolio, đánh giá
│   │   └── photographers.html    # Danh sách tìm kiếm & lọc thợ ảnh
│   ├── css/                      # Định kiểu giao diện Vanilla CSS
│   │   ├── account-header.css    # Header menu, dropdown tài khoản & ẩn/hiện nút theo role
│   │   ├── admin.css             # Giao diện dashboard, chart, lịch admin
│   │   ├── auth.css              # Giao diện form đăng ký, đăng nhập
│   │   ├── booking.css           # Giao diện form đặt lịch
│   │   ├── home.css              # Giao diện trang chủ
│   │   ├── my-bookings.css       # Giao diện lịch cá nhân, bảng lịch tháng & hover card
│   │   ├── photographer-profile.css # Giao diện trang hồ sơ thợ & album ảnh
│   │   └── photographers.css     # Giao diện danh sách card thợ ảnh
│   └── js/                       # Mã logic xử lý phía Frontend (Vanilla JS)
│       ├── account-header.js     # Xử lý menu tài khoản, phân quyền ẩn/hiện nút đặt lịch
│       ├── admin.js              # Vẽ biểu đồ Chart.js, bảng lịch to admin, quản lý thợ
│       ├── admin-blogs.js        # Logic quản trị bài viết blog
│       ├── blog.js               # Hiển thị danh sách blog & chi tiết
│       ├── booking.js            # Validate form đặt lịch, chọn gói, ngày giờ
│       ├── forgot-password.js    # Gửi mã OTP & đặt lại mật khẩu mới
│       ├── home.js               # Logic trang chủ & điều hướng
│       ├── my-bookings.js        # Logic vẽ lịch tháng to, hover chi tiết, đổi góc nhìn
│       ├── photographer-bookings.js # Quản lý lịch chụp của thợ
│       ├── photographer-profile.js  # Tải hồ sơ thợ, chỉnh sửa album ảnh
│       └── photographers.js      # Tìm kiếm, lọc theo tiêu chí, phân trang thợ
├── scripts/                      # Script bảo trì và cài đặt CSDL
│   ├── setup-database.js         # Script idempotent khởi tạo toàn bộ CSDL và dữ liệu mẫu
│   └── migrate-filters.js        # Script migration nâng cấp bộ lọc
├── server.js                     # File khởi động máy chủ Express
├── package.json                  # Khai báo dependency và script thực thi
└── README.md                     # Tài liệu hướng dẫn và báo cáo kỹ thuật dự án
```

---

## 4. Cách em viết code như thế nào? (Quy trình & Tư duy triển khai)

Khi phát triển bất kỳ một tính năng mới nào trong dự án, em áp dụng quy trình viết code từ dưới lên (**Bottom-Up Approach**) với 4 bước bài bản:

### Bước 1: Chuẩn bị CSDL (Database Layer)
- Mở file [scripts/setup-database.js](file:///c:/photo-booking-project%20%282%29/scripts/setup-database.js) để kiểm tra cấu trúc bảng.
- Viết câu lệnh SQL đúng chuẩn: dùng `CREATE TABLE IF NOT EXISTS`, đặt đúng kiểu dữ liệu (`INT`, `VARCHAR`, `TEXT`, `DATETIME`, `DECIMAL`), tạo chỉ mục (INDEX) trên các cột thường xuyên tìm kiếm, thiết lập khóa ngoại với ràng buộc toàn vẹn.

### Bước 2: Xây dựng Backend API (Controller & Router)
- **Tạo hàm xử lý trong `controllers/`:**
  - Nhận tham số từ `req.body`, `req.query`, hoặc `req.params`.
  - Validate dữ liệu đầu vào nghiêm ngặt (không để trống, đúng định dạng email, đúng kiểu số).
  - Sử dụng `try...catch` để bắt lỗi, tương tác với CSDL qua `db.execute()` với câu truy vấn tham số hóa (`?`) nhằm chống triệt để **SQL Injection**.
  - Trả về JSON theo format thống nhất: `{ success: true, data: [...] }` hoặc `{ success: false, message: "..." }`.
- **Định tuyến trong `routes/`:**
  - Gắn URL tương ứng (GET, POST, PUT, DELETE).
  - Bọc các middleware cần thiết: ví dụ `requireAuth` cho các route cá nhân, `requireAdmin` cho các route quản trị.
- **Khai báo route trong [server.js](file:///c:/photo-booking-project%20%282%29/server.js).**

### Bước 3: Thiết kế Giao diện HTML & CSS (View Layer)
- Viết HTML ngữ nghĩa: sử dụng các thẻ `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<button type="button">`.
- Viết CSS hoàn toàn bằng **Vanilla CSS** có cấu trúc biến CSS (`:root` tokens: màu sắc, font chữ, độ bo góc, khoảng cách đệm).
- Đảm bảo **Responsive Design** với Media Queries (Desktop >= 1024px, Tablet 768px, Mobile <= 600px).
- Xây dựng trải nghiệm tương tác mượt mà: hiệu ứng hover nhẹ nhàng, tooltip/popover hiển thị nổi bật với `box-shadow` và z-index chuẩn.

### Bước 4: Tích hợp Logic Frontend (JavaScript Layer)
- Viết mã JavaScript dạng module tự thực thi (IIFE) hoặc lắng nghe `DOMContentLoaded` để tránh ô nhiễm biến toàn cục (Global Namespace Pollution).
- Giao tiếp với API qua `fetch()` kết hợp `async/await`. Đính kèm Token xác thực trong Request Header:
  ```javascript
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
  ```
- **Xử lý trạng thái đầy đủ (State Management):**
  - Trạng thái đang tải (Loading state).
  - Trạng thái rỗng không có dữ liệu (Empty state).
  - Trạng thái lỗi mạng / thông báo lỗi (Error state).
  - Trạng thái render dữ liệu thành công.
- **Tư duy đồng bộ giao diện theo vai trò (Role-based UI):**
  - Ví dụ: với tài khoản thợ ảnh (`photographer`), tự động ẩn nút "Đặt lịch" trên cả thanh Header, trang hồ sơ và trang Lịch cá nhân; ngược lại với tài khoản người dùng (`client`) thì hiển thị đầy đủ nút đặt lịch.

---

## 5. Làm sao để em kiểm soát code tốt hơn? (Quản lý, Debug & Bảo mật)

Để đảm bảo mã nguồn ổn định, dễ bảo trì và hạn chế tối đa lỗi phát sinh, em áp dụng các nguyên tắc kiểm soát kỹ thuật sau:

### 5.1. Quản lý mã nguồn với Git & GitHub
- **Chia nhỏ commit:** Mỗi commit chỉ giải quyết một vấn đề cụ thể (Single Responsibility Principle).
- **Quy ước thông điệp commit (Commit Conventions):** Đặt tên rõ nghĩa, mô tả đúng nội dung thay đổi (ví dụ: `feat: Thêm bảng lịch to cho thợ`, `fix: Ẩn nút đặt lịch với tài khoản thợ`).
- **Soát code trước khi commit:** Luôn dùng lệnh `git status` và `git diff` để rà soát từng dòng code được thêm vào hoặc xóa đi, đảm bảo không commit nhầm file rác, file `.env` hoặc file thư viện.

### 5.2. Kỹ thuật Debugging & Điều tra lỗi theo 4 tầng (4-Layer Diagnosis)
Khi phát sinh lỗi, em không đoán mò mà lần theo luồng dữ liệu 4 tầng:
1. **Tầng Giao diện (Client UI / DOM):** Mở Console kiểm tra lỗi cú pháp JS hoặc phần tử DOM bị `null`.
2. **Tầng Mạng (Network Tab F12):** Kiểm tra HTTP Request gửi đi: Đúng URL chưa? Header có Token không? Payload gửi lên có đúng format không? Mã phản hồi HTTP là gì (200, 400, 401, 403, 404, 500)?
3. **Tầng Máy chủ (Server Logs):** Xem terminal đang chạy `nodemon`, kiểm tra thông báo `console.error` và stack trace để biết chính xác lỗi phát sinh ở file nào, dòng số bao nhiêu.
4. **Tầng CSDL (Database):** Kiểm tra câu lệnh SQL thực thi, đối chiếu giá trị trả về thực tế trong database.

### 5.3. Bảo mật hai đầu (End-to-End Security)
- **Không tin tưởng dữ liệu từ Client:** Mọi kiểm tra quyền và tính hợp lệ bắt buộc phải thực hiện ở Backend (Server-side verification). Dù người dùng có cố tình sửa code giao diện để hiển thị nút, API backend vẫn từ chối nếu sai vai trò.
- **Bảo vệ mật khẩu:** Mật khẩu người dùng được băm một chiều bằng thư viện `bcryptjs` với salt rounds an toàn trước khi lưu vào CSDL.
- **Xác thực phiên qua JWT:** Token có thời gian sống giới hạn (`expiresIn: '24h'`), khóa bí mật được lưu trong biến môi trường `.env`.

### 5.4. Tối ưu hóa & Refactoring (Clean Code)
- **Áp dụng nguyên tắc DRY (Don't Repeat Yourself):** Gom các đoạn code lặp lại thành hàm dùng chung (như hàm định dạng tiền tệ `formatCurrency`, hàm định dạng ngày `formatDate`, hàm phân tích ghi chú `parseNotes`, hàm kiểm tra phân quyền `account-header.js`).
- **Thoát sớm (Early Return Pattern):** Kiểm tra điều kiện lỗi trước và `return` ngay lập tức để giảm độ lồng ghép (nesting depth) của các khối lệnh `if...else`.

---

## 6. Các công cụ & kỹ thuật đã áp dụng để hỗ trợ code ngày càng ổn hơn

Trong quá trình học tập và làm dự án, em đã tìm hiểu và ứng dụng kết hợp nhiều công cụ hỗ trợ hiện đại:

### 6.1. Trợ lý AI lập trình (AI Coding Agent - Google Antigravity IDE)
- Sử dụng môi trường lập trình tương tác agentic của Google DeepMind để phân tích toàn diện mã nguồn theo thời gian thực.
- Khả năng đọc hiểu đa file, theo dõi quan hệ giữa routes, controllers và frontend views để đưa ra giải pháp kiến trúc đồng bộ.

### 6.2. Tự xây dựng Custom Skill cho riêng mình: `code-advisor-consultant`
Theo định hướng của Thầy về việc làm chủ kỹ năng prompt và cá nhân hóa công cụ AI:
- Em đã tự thiết kế và cấu hình một skill riêng tại thư mục [`.agents/skills/code-advisor-consultant/SKILL.md`](file:///c:/photo-booking-project%20%282%29/.agents/skills/code-advisor-consultant/SKILL.md).
- **Mục đích của skill:** Thay vì để AI tự động sinh ra toàn bộ code ("copy-paste ăn ngay"), skill này đóng vai trò là một **Người cố vấn (Advisor / Consultant)**:
  - Áp dụng phương pháp Socratic: Đặt câu hỏi gợi mở, phân tích luồng logic từng bước (1, 2, 3).
  - Sử dụng mã giả (pseudocode) và phân tích nguyên nhân gốc rễ (Root Cause Analysis).
  - Hướng dẫn em tự tay viết code, tự kiểm tra lỗi (Validate, SQL Query, Auth Header) và review lại đoạn code do chính em viết, giúp em hiểu sâu bản chất kiến trúc hệ thống và không bị phụ thuộc vào AI.

### 6.3. Trình duyệt Chrome DevTools
- **Network Panel:** Phân tích chi tiết chu kỳ Request-Response, kiểm tra payload JSON và headers xác thực.
- **Console Panel:** Thử nghiệm nhanh các biểu thức JavaScript, theo dõi log và bắt ngoại lệ runtime.
- **Elements & Device Emulation:** Kiểm thử trực tiếp giao diện trên các kích thước màn hình điện thoại (iPhone, iPad, Desktop).

### 6.4. Công cụ hỗ trợ phát triển máy chủ & Môi trường
- **Nodemon:** Tự động theo dõi các thay đổi trong file mã nguồn và khởi động lại server ngay lập tức, giúp tiết kiệm thời gian phát triển và phát hiện crash kịp thời.
- **dotenv / dotenvx:** Bảo vệ an toàn các thông tin nhạy cảm (thông tin CSDL, mật khẩu mail, JWT secret), tách biệt hoàn toàn cấu hình môi trường khỏi mã nguồn.
- **Kiểm tra cú pháp tự động (`node --check`):** Kiểm tra tính hợp lệ của toàn bộ file JavaScript trước khi chạy thử hoặc đẩy mã nguồn lên GitHub.

---

> **Lời kết:** Dự án **Pdun.Foto** không chỉ là một ứng dụng đặt lịch chụp hình đầy đủ tính năng thực tế, mà còn là minh chứng cho quá trình học tập bài bản: từ tư duy phân tích hệ thống, thiết kế kiến trúc chuẩn mực, quy trình viết code an toàn, đến việc biết cách làm chủ các công cụ hiện đại và kỹ năng prompt/skill để nâng cao năng lực lập trình của bản thân.
