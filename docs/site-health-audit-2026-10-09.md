# Kiểm tra tổng thể website — 09/10/2026

Website tải được các trang chính và toàn bộ sản phẩm đã công bố, nhưng **chưa đủ
để kết luận ổn định toàn bộ luồng bán hàng**. Checkout hiện bị chặn bởi cấu hình
giao hàng trống. Code cũng còn lỗi xử lý lưu trữ và lỗi mạng cần khắc phục.

## Phạm vi và bằng chứng

Kiểm tra trực tiếp `https://anna-s-dog-more.vercel.app`, hai trang Webcake
`https://www.annasdogandmore.com` và `/Admin`, cùng domain không có `www`.
Đọc database bằng cấu hình Supabase hiện có; chỉ thực hiện các truy vấn đọc.

| Kiểm tra | Kết quả |
| --- | --- |
| 451 đường dẫn | 449 phản hồi cuối HTTP 200; 2 HTTP 404 dự kiến cho đường dẫn đơn hàng giả khi chưa đăng nhập; không có HTTP 5xx/lỗi kết nối |
| 414 URL trong sitemap | Tất cả HTTP 200, gồm 382 trang sản phẩm: 191 sản phẩm × DE/EN |
| Nội dung trang sản phẩm | Cả 382 trang có tiêu đề H1 sản phẩm và canonical |
| JS/CSS | 17 tài nguyên được kiểm tra, đều HTTP 200 |
| Link nội bộ ngoài tập URL đã quét | 1 đường dẫn được kiểm tra thêm, HTTP 200 |
| Ảnh | 24 request ảnh mẫu đều HTTP 200; có ảnh quá nặng, xem bên dưới |
| Tìm kiếm | Tìm theo `emma` và mã `10700` trả đúng sản phẩm; query trống trả `[]`; query quá dài bị từ chối 400 |
| Dữ liệu không hợp lệ | Checkout/contact trả 400; webhook thiếu chữ ký trả 400; không tạo đơn hoặc gửi tin nhắn hợp lệ |
| Admin | Người chưa đăng nhập được đưa về login; upload không có phiên trả 401; Origin không hợp lệ trả 403 |
| Giới hạn iframe Admin | CSP cho phép đúng hai origin của domain; phản hồi có noindex và private/no-store |
| Database công khai | 191 sản phẩm sẵn sàng hiển thị, 547 biến thể, 13 danh mục |
| Dữ liệu riêng tư | Key công khai không đọc được dữ liệu orders/payments/profiles/addresses/user_roles/contact_inquiries trong các probe đã chạy |
| Hàm dashboard | Key server gọi thành công; key công khai bị từ chối |
| Kiểm thử code | 38 tests đạt; lint và production build/TypeScript đạt |

Các URL Admin đã theo redirect về login, không phải kiểm tra nội dung của trang
Admin sau đăng nhập. Phiên này không có Browser kết nối, nên chưa chạy được
tương tác, kiểm tra giao diện mobile, console JavaScript hoặc Core Web Vitals.

## Các điểm cần xử lý theo ưu tiên

### P0 — Checkout chưa có phương thức giao hàng

**Bằng chứng live:** `/api/shipping?country=CH&currency=CHF&subtotal=49&locale=de`
và các mức CHF 50/100 đều trả `[]`. Truy vấn server xác nhận cả ba bảng
`shipping_zones`, `shipping_methods`, `shipping_rates` đều không có bản ghi.
DE/AT cũng chưa có phương thức giao hàng.

**Ảnh hưởng:** khách không chọn được phương thức giao hàng; nút tiếp tục thanh
toán bị vô hiệu hóa. Trang Shipping đang công bố giao trong Thụy Sĩ, phí CHF 7
và miễn phí từ CHF 50, nhưng cấu hình thực thi chưa có.

**Xử lý:** nhập phương thức đã được chủ shop xác nhận ở `/admin/shipping`, kiểm
tra lại CHF 49 và CHF 50. Không tự suy ra hoặc ghi các quy tắc kinh doanh vào
database trong lần kiểm tra này.

### P1 — Hai ảnh vẫn tải file gốc nhiều MB

**Bằng chứng live:**

- `100200-102.jpg`: request `/_next/image` với `w=640` và `w=1080`, `q=75`,
  Accept WebP vẫn trả JPEG **8.663.380 bytes**.
- `100200_6-Kopie.jpg`: `w=1080` trả JPEG **5.805.948 bytes**; cùng ảnh ở
  `w=640` trả WebP **16.974 bytes**.

Các ảnh xuất hiện trong hai sản phẩm
`bezug-set-2-tlg-luna-lounge-deko-kissen-chic` và
`bezug-set-2-tlg-luna-lounge-deko-kissen-oxford`, ở cả hai ngôn ngữ.

**Ảnh hưởng:** dữ liệu HTML Shop đã nhẹ hơn nhưng trang sản phẩm vẫn có thể tải
chậm do ảnh. **Chưa xác định nguyên nhân** optimizer trả ảnh gốc ở các request
này; không có bằng chứng để kết luận hết quota Vercel.

**Xử lý:** kiểm tra log tối ưu ảnh và kích thước nguồn, nén/resize hai ảnh nguồn
trước khi đưa vào kho ảnh của shop, kiểm tra lại width thường dùng. Điều tra bằng
[tài liệu Image Optimization của Vercel](https://vercel.com/docs/image-optimization).
Giảm payload trang không đồng nghĩa toàn bộ ảnh đã được tối ưu thành công.

### P1 — Giỏ hàng có thể lỗi khi lưu trữ bị chặn hoặc dữ liệu cũ hỏng

**Bằng chứng code:** `components/cart/cart-provider.tsx:28` đọc localStorage;
catch lại gọi `removeItem` mà không bảo vệ trường hợp storage cũng từ chối thao
tác này. `setItem` ở dòng 40 không có catch. Kết quả `JSON.parse` được ép kiểu
`CartLine[]` mà không kiểm tra cấu trúc trước khi gọi `.reduce`/`.map`.

**Ảnh hưởng:** iframe hoặc chế độ hạn chế storage có thể gây lỗi JavaScript;
JSON hợp lệ nhưng sai cấu trúc như `{}` có thể làm giỏ hàng lỗi render.

**Xử lý:** kiểm tra shape dữ liệu lưu, bảo vệ cả đọc/xóa/ghi, cho phép giỏ hàng
hoạt động trong bộ nhớ khi lưu trữ không khả dụng. Đây là phát hiện từ code,
chưa tái hiện trên một trình duyệt thật trong phiên này.

### P1 — Checkout có thể kẹt khi request thất bại

**Bằng chứng code:** `components/checkout/checkout-form.tsx:46` đặt
`submitting=true`, sau đó await fetch và parse JSON không có catch/finally.
`shippingLoading` được khởi tạo false và không bao giờ được đặt true. Request
shipping cũ bị abort vẫn có catch xóa danh sách phương thức, trong khi phương
thức của query cũ chưa được loại khỏi trạng thái ngay khi đổi query.

**Ảnh hưởng:** mất mạng hoặc phản hồi không phải JSON có thể khiến nút thanh
toán bị khóa cho đến reload; lỗi/race khi đổi quốc gia có thể hiển thị sai trạng
thái giao hàng. Database vẫn kiểm tra shipping thật, nhưng trải nghiệm chưa bền.

**Xử lý:** phục hồi nút trong finally, báo lỗi có thể thử lại, gắn kết quả shipping
với query hiện tại và bỏ qua request đã abort. Phát hiện từ code, chưa E2E.

### P1 — Form liên hệ lỗi sau nhánh gửi thành công

**Bằng chứng code:** `components/contact/contact-form.tsx:21` gọi
`event.currentTarget.reset()` sau await. React DOM đã đặt `currentTarget=null`
khi listener trả về; đã đối chiếu code React DOM đang cài trong repository.

**Ảnh hưởng:** request có thể đã lưu tin nhắn nhưng reset form phát sinh lỗi,
không chuyển sang trạng thái thành công và nút vẫn ở trạng thái gửi.

**Xử lý:** lưu tham chiếu form trước await, dùng tham chiếu đó để reset; kiểm
tra nhánh 201 và nhánh lỗi. Chưa gửi tin nhắn hợp lệ trong lần audit này.

### P1 — Nội dung bắt buộc của shop vẫn là bản nháp

**Bằng chứng live và code:** DE/EN của `/legal/imprint`, `/legal/privacy`,
`/legal/terms` còn nội dung placeholder/draft trong
`app/[locale]/legal/[slug]/page.tsx`.

**Ảnh hưởng:** website hiện chưa trình bày thông tin hoàn chỉnh cho các trang này.
Đây là đánh giá trạng thái nội dung, không phải kết luận về tuân thủ pháp luật.

**Xử lý:** chủ shop cung cấp nội dung đã xác nhận; cập nhật cả DE/EN trước khi mở
luồng bán hàng. Không tự thêm thông tin pháp nhân hoặc cam kết chưa được cung cấp.

### P1 — Tồn kho chỉ cho phép mua 4/191 sản phẩm

**Bằng chứng database:** 191 sản phẩm có ảnh/biến thể hợp lệ để hiển thị, nhưng
chỉ 4 sản phẩm, tổng 5 biến thể active có giá và stock > 0.

**Ảnh hưởng:** phần lớn nút mua bị khóa đúng theo tồn kho; khách nhìn thấy danh
mục nhưng không mua được nhiều sản phẩm. Đây là dữ liệu kinh doanh, không phải
chứng cứ lỗi tính tồn kho.

**Xử lý:** kiểm kê và nhập tồn kho thật qua Admin; không tăng stock giả để thử.

### P2 — Lỗi tài khoản bị biến thành lỗi cấu hình

**Bằng chứng code:** `app/[locale]/account/actions.ts:20` và dòng 38 gọi
`redirect` trong try; Next.js ném redirect như một ngoại lệ, và catch biến nó
thành `?error=config`.

**Ảnh hưởng:** sai mật khẩu hoặc lỗi đăng ký có thể bị báo là Supabase chưa cấu
hình, thay vì lỗi đúng để khách sửa đầu vào.

**Xử lý:** tách kết quả Auth khỏi redirect, gọi redirect ngoài try/catch. Đã đối
chiếu hướng dẫn `redirect` của phiên bản Next.js đang cài; chưa thử login thật.

### P2 — DE/EN và khả năng truy cập còn thiếu kiểm chứng

- Trang `/en` vẫn có `<html lang="de">`. Main có lang en nhưng header/footer
  kế thừa ngôn ngữ gốc; cần đảm bảo lang đúng cho toàn bộ trang.
- Tên DE và EN của cả 191 sản phẩm đang giống nhau; ví dụ trang EN của Emma
  còn cụm tên tiếng Đức. Giữ tên thương hiệu nhưng rà lại nội dung cần dịch.
- Header search/mobile drawer và listing filter đóng bằng Escape nhưng chưa có
  cơ chế quản lý focus đầy đủ trong code. Cần kiểm tra Tab, focus trap và trả
  focus về nút mở; chưa chứng nhận WCAG từ HTTP.

## Rủi ro cần kiểm tra trong trình duyệt trước khi bán thật

1. **Tài khoản khách trong iframe:** `createUserClient()` vẫn dùng cookie mặc
   định SameSite=Lax; Admin dùng cấu hình riêng None/Secure/Partitioned. Cookie
   tài khoản khách cần được kiểm tra trong ngữ cảnh domain Webcake nhúng Vercel.
2. **Chuyển sang Stripe:** checkout dùng `window.location.assign`, nên khi chạy
   trong iframe nó điều hướng khung hiện tại. Cần kiểm chứng luồng Stripe hosted
   bên ngoài khung, hoặc chọn Embedded Checkout đúng cách; chưa tạo payment
   session và chưa chạy giao dịch trong lần kiểm tra này.
3. **Xác nhận thanh toán:** chưa kiểm tra chữ ký webhook thật, khấu trừ tồn kho,
   email và callback sau thanh toán. Probe thiếu chữ ký trả 400 chỉ xác nhận
   request đó bị chặn, không chứng minh Stripe đã được cấu hình đầy đủ.
4. **Admin:** chưa kiểm tra phiên đăng nhập tồn tại lâu, điều hướng sau đăng nhập,
   phân trang, upload ảnh, sửa sản phẩm hoặc stock trên trình duyệt.
5. **Mobile:** chưa kiểm tra bố cục 360/390/768 px, thao tác cảm ứng, console,
   khả năng phục hồi sau offline và ảnh thực tế được browser chọn từ srcset.

## Đánh giá kỹ thuật giao diện

Đây là audit một phần dựa trên HTTP/code; không tính điểm tổng khi thiếu bằng
chứng render/browser. Detector Impeccable đã quét cart, checkout, header,
listing và stylesheet; không báo finding, nhưng các lỗi runtime ở trên nằm
ngoài phạm vi detector.

| Mảng | Đánh giá | Căn cứ và giới hạn |
| --- | --- | --- |
| Accessibility | Chưa chấm | Có label/focus styles; thiếu kiểm chứng keyboard, contrast, screen reader |
| Performance | 2/4 theo bằng chứng hiện có | Listing nhẹ hơn, HTTP ổn; hai ảnh vẫn nhiều MB; chưa đo browser CWV |
| Responsive | Chưa chấm | Có CSS breakpoint; chưa render/cảm ứng trên thiết bị |
| Theming | 3/4 theo code | Có token màu/type, bề mặt public/admin nhất quán; chưa kiểm chứng màu render |
| Implementation integrity | 2/4 theo code | Hệ thống sản phẩm rõ ràng nhưng xử lý error và trạng thái form còn lỗi |
| Tổng | Không tính | Thiếu browser để hoàn thành toàn bộ đánh giá |

## Thứ tự xử lý đề xuất

1. Sửa lỗi xử lý storage, contact và checkout; giữ giao diện hiện tại
   (`$impeccable harden`).
2. Xử lý hai ảnh nặng, kiểm tra lại responsive image (`$impeccable optimize`).
3. Nhập shipping/tồn kho thật và hoàn thiện nội dung chủ shop xác nhận; kiểm tra
   các thông báo trạng thái theo dữ liệu thực (`$impeccable clarify`).
4. Kiểm tra iframe/Auth/Stripe và giao diện mobile sau khi có phiên trình duyệt
   (`$impeccable adapt`), rồi một lượt `$impeccable polish` sau các thay đổi.

Lần này là kiểm tra và ghi nhận: các phát hiện trên chưa được sửa vào code ứng
dụng hoặc cấu hình kinh doanh. Không có email, tin nhắn, đơn hàng, giao dịch,
upload ảnh hay thay đổi stock hợp lệ nào được tạo bởi lần audit.
