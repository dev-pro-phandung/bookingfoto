# Hướng dẫn phát triển Potonow Photo Booking với AI Agent

Tài liệu này giới thiệu cách lần theo cấu trúc project, phối hợp với AI Agent khi phát triển, các chức năng hiện có và cách đánh giá đóng góp của thành viên dựa trên bằng chứng kỹ thuật. Hướng dẫn cài đặt database, biến môi trường và chạy ứng dụng vẫn nằm trong [README.md](README.md).

## 1. Tổng quan kiến trúc

Ứng dụng dùng Node.js, Express và MySQL. Frontend là HTML, CSS và JavaScript tĩnh; Express phục vụ thư mục `public/` và cung cấp API JSON.

Luồng phổ biến của một yêu cầu:

1. Trang HTML trong `public/` hiển thị giao diện.
2. JavaScript trong `public/js/` gọi API bằng `fetch` và cập nhật giao diện.
3. `server.js` gắn URL API vào router trong `routes/`.
4. Router có thể kiểm tra đăng nhập/quyền bằng middleware trong `middleware/`, rồi gọi hàm xử lý trong `controllers/`.
5. Controller đọc hoặc ghi MySQL thông qua `config/db.js`.

Khi sửa một chức năng, hãy lần theo cả luồng này thay vì chỉ sửa nơi đang hiển thị lỗi. Thay đổi cấu trúc dữ liệu cần đối chiếu thêm `database/` và script thiết lập database.

## 2. Bảng chức năng và vị trí mã nguồn

| Chức năng | Giao diện | API / xử lý phía server | Ghi chú |
|---|---|---|---|
| Trang chủ, giới thiệu và hiển thị gói dịch vụ | `public/index.html`, `public/js/home.js`, `public/css/home.css` | `routes/catalogRoutes.js`, `controllers/catalogController.js` | API lấy gói chụp và dịch vụ là `/api/packages`, `/api/services`. |
| Đăng ký, đăng nhập, thông tin tài khoản | `public/pages/auth.html` (script đăng ký/đăng nhập nhúng trong trang), `public/css/auth.css`, `public/js/account-header.js`, `public/css/account-header.css` | `routes/authRoutes.js`, `controllers/authController.js`, `middleware/requireAuth.js` | JWT dùng để xác thực các API cần đăng nhập. |
| Quên và đặt lại mật khẩu | `public/pages/forgot-password.html`, `public/js/forgot-password.js`, `public/css/forgot-password.css` | `routes/authRoutes.js`, `controllers/authController.js` | Gửi mã qua email cần cấu hình SMTP trong `.env`. |
| Danh sách nhiếp ảnh gia | `public/pages/photographers.html`, `public/js/photographers.js`, `public/css/photographers.css` | `routes/photographerRoutes.js`, `controllers/photographerController.js` | Có các API danh sách, hồ sơ của tôi và hồ sơ theo ID. |
| Hồ sơ nhiếp ảnh gia và portfolio | `public/pages/photographer-profile.html`, `public/js/photographer-profile.js`, `public/css/photographer-profile.css` | `routes/photographerRoutes.js`, `controllers/photographerController.js` | Cập nhật hồ sơ cá nhân yêu cầu đăng nhập. |
| Đặt lịch và xem lịch của khách hàng | `public/pages/booking.html`, `public/js/booking.js`, `public/css/booking.css`; `public/pages/my-bookings.html`, `public/js/my-bookings.js`, `public/css/my-bookings.css` | `routes/bookingRoutes.js`, `controllers/bookingController.js`, `routes/uploadRoutes.js` | Khách tạo lịch cần đăng nhập; ảnh tham khảo được upload qua `/api/upload`. |
| Nhận và xác nhận lịch của nhiếp ảnh gia | `public/pages/photographer-bookings.html`, `public/js/photographer-bookings.js`, `public/css/photographer-bookings.css` | `routes/bookingRoutes.js`, `controllers/bookingController.js` | Gồm danh sách, thông báo và xác nhận lịch. |
| Blog công khai | `public/pages/blogs.html`, `public/pages/blog-detail.html`, `public/js/blog.js`, `public/css/blog.css` | `routes/blogRoutes.js`, `controllers/blogController.js` | Có danh sách, danh mục và bài viết theo slug. |
| Quản trị: tổng quan, lịch đặt, duyệt nhiếp ảnh gia | `public/pages/admin.html`, `public/js/admin.js`, `public/css/admin.css` | `routes/adminRoutes.js`, `controllers/adminController.js`, `middleware/requireAdmin.js` | Router quản trị yêu cầu vai trò admin. |
| Quản trị bài viết blog | `public/pages/admin.html`, `public/js/admin-blogs.js`, `public/css/admin.css` | `routes/adminRoutes.js`, `controllers/adminBlogController.js` | Tạo, sửa, xóa, xem trước metadata và quản lý danh mục. |
| Kiểm tra tình trạng dịch vụ | Không có trang riêng | `routes/healthRoutes.js` | Dùng để kiểm tra API/server khi triển khai hoặc gỡ lỗi. |
| Database và dữ liệu mẫu | Không áp dụng | `config/db.js`, `scripts/setup-database.js`, `database/*.sql` | Lệnh chuẩn bị database là `npm run setup:db`. |

Các route được đăng ký tại `server.js`. Tên endpoint cụ thể được khai báo trong file route tương ứng; hãy kiểm tra file đó trước khi sửa URL hoặc quyền truy cập.

## 3. Quy trình xây dựng cùng AI Agent

### Trước khi giao việc

1. Mô tả mục tiêu người dùng và hành vi mong đợi, ví dụ: “nhiếp ảnh gia đã đăng nhập có thể xác nhận một lịch đang chờ; lịch không thuộc họ phải bị từ chối”.
2. Nêu rõ phạm vi, file hoặc luồng liên quan nếu đã biết, điều kiện chấp nhận, trường hợp lỗi và những gì không được thay đổi.
3. Yêu cầu Agent đọc code hiện có, nêu giả thuyết ngắn và cách kiểm chứng trước khi sửa. Với lỗi, cung cấp thao tác tái hiện, kết quả thực tế và kết quả mong muốn.

### Trong khi làm

1. Chia việc thành lát nhỏ: định vị đường đi của request, sửa logic, kiểm thử, rồi cập nhật tài liệu nếu cần.
2. Để Agent lần theo giao diện → API → router/middleware → controller → database; kiểm tra phân quyền và validation ở server, không chỉ ẩn nút trên giao diện.
3. Đọc diff sau mỗi thay đổi. Xác nhận thay đổi có đúng phạm vi, không để lộ bí mật, không làm mất chỉnh sửa đang có của thành viên khác.
4. Chạy kiểm tra hẹp ngay sau sửa: test liên quan nếu có, lệnh kiểm tra cú pháp/build, hoặc thao tác API/UI tái hiện được lỗi. Sau đó mới chạy kiểm tra rộng hơn.

### Khi hoàn tất

Yêu cầu Agent tóm tắt hành vi đã đổi, file chính, kiểm tra đã chạy và kết quả, vấn đề còn lại, giả định hoặc rủi ro. Người giao việc tự xem diff và xác nhận tiêu chí chấp nhận; không coi câu “đã xong” của Agent là bằng chứng thay cho kiểm thử.

Prompt mẫu:

> Hãy điều tra lỗi [mô tả và các bước tái hiện]. Đọc luồng liên quan từ UI đến API/server, nêu giả thuyết có thể bác bỏ và phép kiểm tra nhỏ nhất. Sửa trong phạm vi [phạm vi], giữ nguyên thay đổi khác. Chạy kiểm tra phù hợp và báo cáo file đã đổi, kết quả thực tế, rủi ro còn lại.

## 4. Dùng skills hỗ trợ viết code

Skill là bộ hướng dẫn chuyên biệt để Agent áp dụng một quy trình hoặc lĩnh vực nhất quán. Danh sách skill và cách gọi phụ thuộc môi trường Agent đang dùng; hãy kiểm tra skill thực sự được cài/đăng ký trong phiên làm việc, đọc hướng dẫn của skill, rồi cung cấp mục tiêu và phạm vi cụ thể.

- **Graphify** (nếu môi trường có skill này): dùng khi cần tạo hoặc truy vấn đồ thị quan hệ giữa module, route, controller, giao diện và phụ thuộc để định hướng trong codebase. Xem đồ thị như bản đồ hỗ trợ tìm đường, không phải bằng chứng rằng luồng chạy đúng; xác minh lại bằng code và kiểm thử.
- **Skill kiểm thử / debugging** (nếu có): dùng để xây dựng bước tái hiện, khoanh vùng nguyên nhân và lựa chọn test phân biệt các giả thuyết.
- **Skill ngôn ngữ hoặc framework**: dùng cho câu hỏi cụ thể về Express, JavaScript, SQL, bảo mật hay công cụ của project; ưu tiên hướng dẫn phù hợp phiên bản và pattern sẵn có trong repo.
- **Skill review** (nếu có): yêu cầu tập trung vào lỗi chức năng, phân quyền, bảo mật, hồi quy và thiếu kiểm thử; cung cấp diff và tiêu chí mong đợi.

Không giả định tên skill đồng nghĩa với một lệnh dùng được ở mọi IDE. Nếu không có Graphify hoặc skill phù hợp, yêu cầu Agent dùng tìm kiếm trong workspace, đọc code lân cận và xác minh bằng lệnh/test hiện có. Skill bổ trợ phán đoán, không thay cho việc review của người chịu trách nhiệm.

## 5. Hiểu log, diff và lịch sử thay đổi

- **Log** ghi lại sự kiện khi chương trình chạy. Với project này, thông báo trong `console.error` của controller và dòng khởi động server xuất hiện ở terminal chạy Node. Dùng log để biết bước nào xảy ra, endpoint/lỗi nào xuất hiện và lỗi có tái hiện được không. Log không tự giải thích nguyên nhân; ghép timestamp, thao tác tái hiện, request và stack trace với code liên quan.
- Khi thêm log, ưu tiên thông tin đủ chẩn đoán như tên thao tác, mã đối tượng không nhạy cảm và lỗi đã chuẩn hóa. Không ghi mật khẩu, token, mã đặt lại mật khẩu, thông tin định danh hoặc dữ liệu cá nhân không cần thiết. Không đưa nội dung bí mật vào prompt gửi Agent.
- **Diff** là phần khác biệt giữa các phiên bản hoặc giữa working tree và Git index. `git diff` cho biết file đã sửa chưa stage; `git diff --staged` cho biết phần đã stage; `git diff --check` tìm whitespace lỗi. Đọc diff theo câu hỏi: thay đổi nào tạo hành vi mới, có nhánh lỗi nào bị bỏ sót, quyền và dữ liệu đầu vào có được kiểm tra, có thay đổi ngoài phạm vi không?
- **Git log** cho biết lịch sử commit, tác giả, thời điểm và thông điệp: `git log --oneline --decorate -n 10`. Nó hữu ích để hiểu bối cảnh và tiến độ, nhưng commit nhiều hoặc lớn không tự chứng minh chất lượng hay hiệu quả.
- Với mỗi thay đổi, gắn log/diff với yêu cầu và tiêu chí chấp nhận. Diff nhỏ cũng có thể rủi ro cao nếu chạm xác thực hoặc dữ liệu; diff lớn không nhất thiết là năng suất nếu chứa phần ngoài yêu cầu.

## 6. Leader đánh giá hiệu quả làm việc

Leader nên đánh giá theo đầu ra, chất lượng và khả năng phối hợp trong một khoảng thời gian phù hợp, dựa trên nhiều nguồn bằng chứng. Không xếp hạng chỉ bằng số dòng code, số commit, thời gian online hay số lỗi đã đóng; các chỉ số đó dễ bị tối ưu sai và không phản ánh độ khó hoặc tác động.

| Tiêu chí | Bằng chứng có thể quan sát |
|---|---|
| Hoàn thành mục tiêu | Tiêu chí chấp nhận được đáp ứng; tính năng hoặc lỗi xử lý đúng trường hợp chính và các trường hợp biên đã thống nhất. |
| Chất lượng và an toàn | Diff tập trung, phù hợp kiến trúc; validation và phân quyền đúng; không thêm bí mật; ít hồi quy; kiểm thử/kiểm tra phù hợp đã chạy. |
| Tính dự đoán | Báo sớm khi có blocker hoặc đổi phạm vi; ước lượng được cập nhật khi xuất hiện thông tin mới; bàn giao đúng trạng thái thực tế. |
| Giao tiếp và hợp tác | Câu hỏi làm rõ đúng lúc; giải thích quyết định bằng bằng chứng; review có ích; chia sẻ bối cảnh để người khác tiếp tục được. |
| Khả năng tự chủ và học hỏi | Biết phân rã việc, tìm nguyên nhân thay vì vá triệu chứng, tiếp nhận review và tránh lặp lại lỗi đã thống nhất cách xử lý. |
| Tác động dài hạn | Tài liệu, test hoặc khả năng bảo trì được cải thiện khi cần; không tạo nợ kỹ thuật không được trao đổi. |

### Cách áp dụng công bằng

1. Trước khi giao việc, thống nhất mục tiêu, phạm vi, tiêu chí chấp nhận, mức rủi ro và mốc cập nhật.
2. Trong quá trình làm, xem tiến độ qua các mốc có thể kiểm chứng: giả thuyết, diff, kiểm tra và blocker; hỗ trợ gỡ vướng thay vì đợi đến cuối mới phát hiện lệch hướng.
3. Khi review, đối chiếu kết quả với yêu cầu, diff, log và kiểm tra chạy được. Phân biệt thiếu kỹ năng, yêu cầu mơ hồ, phụ thuộc ngoài tầm kiểm soát và ước lượng sai; phản hồi bằng ví dụ cụ thể.
4. Ghi nhận cả chất lượng và mức độ khó/tác động. Dùng xu hướng qua nhiều nhiệm vụ, trao đổi riêng về trở ngại, và cho thành viên cơ hội phản hồi; không kết luận từ một commit hoặc một ngày làm việc.

Một người làm việc hiệu quả không nhất thiết viết nhiều nhất. Họ thường xuyên biến yêu cầu rõ ràng thành kết quả đúng, có thể kiểm chứng, có rủi ro được quản lý và giúp nhóm tiếp tục công việc mà không phải đoán phần còn lại.

## 7. Kiểm tra project hiện tại

Các lệnh khởi động, thiết lập database, biến môi trường và thông tin tài khoản phát triển (nếu có) được mô tả trong [README.md](README.md). `package.json` hiện có các script `start`, `dev` và `setup:db`, chưa khai báo script test tự động. Khi chưa có test, cần xác nhận thay đổi bằng kiểm tra cú pháp phù hợp, log server và các thao tác UI/API liên quan; không xem việc server khởi động thành công là đã kiểm chứng toàn bộ chức năng.