# Hoàn thiện thanh toán: Stripe + CHF + TWINT

Dự án dùng Stripe Hosted Checkout. Khách nhập thông tin thẻ trong trang Stripe;
website tính giá/tồn kho/phí vận chuyển ở PostgreSQL và chỉ xác nhận đã trả tiền
sau webhook được kiểm tra chữ ký.

## 1. Các phần đã có trong mã nguồn

- Checkout khách vãng lai hoặc người đăng nhập, địa chỉ giao hàng và hóa đơn riêng.
- Giá, tiền tệ, tồn kho và vận chuyển được kiểm tra lại ở server.
- Thẻ và TWINT cho đơn CHF; tài khoản Stripe phải được phép dùng TWINT.
- Phiên Stripe hết hạn khoảng 32 phút sau khi tạo đơn. Tồn kho được giữ đến hết phiên cộng
  5 phút dự phòng cho webhook; lỗi tạo phiên không rõ kết quả không giải phóng
  hàng sớm. Nếu chưa đăng ký được phiên, giữ hàng tối đa 36 phút.
- Webhook thành công/thất bại/hết hạn; sự kiện lặp không trừ tồn kho lại.
- Gửi lại checkout với cùng khóa và thông tin sẽ dùng lại đơn/phiên thanh toán,
  không giữ hàng hai lần. Khóa Stripe dùng cùng thời hạn phiên trên mọi lần thử.
- Trang xác nhận tự kiểm tra trạng thái, có nút kiểm tra lại; chỉ bỏ số lượng đã
  mua khỏi giỏ hàng của phiên trình duyệt sau khi server xác nhận thanh toán.
- Hoàn tiền từ Stripe Dashboard được đồng bộ qua `charge.refunded`, gồm hoàn
  một phần/toàn bộ. Hoàn tiền không tự tăng tồn kho vì chưa chứng minh hàng đã trả.
- Doanh thu trong Admin trừ số tiền đã hoàn cho các đơn trong khoảng báo cáo.
- Admin không thể tự chuyển đơn chưa thanh toán sang đã trả tiền/đã giao hoặc
  tự đánh dấu hoàn tiền khi chưa có giao dịch hoàn tiền.
- Email khách và cửa hàng qua Resend nếu được cấu hình; lỗi gửi email khiến
  webhook trả lỗi để Stripe gửi lại. Việc trừ tồn kho vẫn chỉ diễn ra một lần.

## 2. Áp dụng database

Nếu đã chạy 001–005, chạy thêm:

[`006_payment_lifecycle.sql`](../database/migrations/006_payment_lifecycle.sql)

Trong Supabase SQL Editor chọn role **postgres**, chạy toàn bộ file một lần.
File nằm trong transaction và có thể chạy lại. Chờ `reload schema` hoàn thành.
Migration này cũng sửa tham chiếu cột `currency` nhập nhằng trong hàm tạo đơn cũ.
Không cần chạy lại 001; file 001 dành cho database mới.

## 3. Cấu hình `.env.local` và môi trường hosting

```dotenv
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Supabase vẫn cần URL, publishable/anon key và secret/service-role key đang có.
Khóa Stripe và service role chỉ được đặt ở server, không dùng tiền tố
`NEXT_PUBLIC_`. Khi production, `NEXT_PUBLIC_SITE_URL` phải là HTTPS và chỉ gồm
origin, ví dụ `https://shop.example.ch`, không có đường dẫn `/de`.

Khóa webhook do `stripe listen` tạo cho local khác với khóa endpoint production.
Thiếu secret Stripe hoặc webhook sẽ chặn checkout trước khi tạo đơn/giữ hàng.

Email xác nhận (tùy chọn khi thử, cần chuẩn bị trước khi vận hành):

```dotenv
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_...
ORDER_FROM_EMAIL=Shop <orders@YOUR_VERIFIED_DOMAIN>
SHOP_ORDER_EMAIL=YOUR_SHOP_EMAIL
```

## 4. Chuẩn bị hàng và vận chuyển

1. Trong `/admin/products`, đặt giá CHF được chủ shop xác nhận, tồn kho thực tế
   và kích hoạt variant/sản phẩm cần bán.
2. Trong `/admin/shipping`, tạo phương thức đang hoạt động cho **CH**, tiền tệ
   **CHF**, phí vận chuyển và ngưỡng miễn phí do shop quyết định.
3. Xác nhận giá bán, cách xử lý thuế, quốc gia giao hàng và điều khoản của shop.
   Mã nguồn không tự bật Stripe Tax hoặc tự tạo thuế suất.

## 5. Thử ở chế độ sandbox

Sau khi cài [Stripe CLI](https://docs.stripe.com/stripe-cli):

```powershell
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,charge.refunded --forward-to localhost:3000/api/webhooks/stripe
```

Chép `whsec_...` CLI vừa in ra vào `.env.local`, rồi khởi động lại:

```powershell
npm.cmd run dev
```

Mở `/en/shop` hoặc `/de/shop`, thêm một variant thực sự có tồn kho, hoàn tất địa
chỉ và vận chuyển, chuyển sang Stripe Checkout. Dùng thông tin thử trong
[tài liệu Stripe](https://docs.stripe.com/testing), ví dụ thẻ `4242 4242 4242 4242`,
ngày hết hạn tương lai và CVC thử.

Kiểm tra đủ các tình huống:

| Tình huống | Kết quả cần thấy |
| --- | --- |
| Thanh toán thành công | Đơn `paid`, tồn kho giảm một lần, trang xác nhận cập nhật, giỏ bỏ hàng đã mua |
| Webhook bị chậm | Trang chờ xác nhận; không báo trả tiền chỉ vì redirect thành công |
| Gửi lại cùng webhook | Tồn kho và giao dịch bán không bị nhân đôi |
| Bấm quay về từ Stripe | Giỏ được giữ; phiên cũ còn hiệu lực đến khi hết hạn |
| Phiên hết hạn | Webhook hủy đơn chưa trả tiền và giải phóng giữ hàng |
| Thanh toán bất đồng bộ thất bại | Đơn thất bại, giữ hàng được giải phóng |
| Hoàn một phần/toàn bộ trên Stripe Dashboard | Đơn `partially_refunded`/`refunded`, tồn kho không tự tăng |
| Database/email tạm lỗi | Webhook trả 5xx và có thể gửi lại; không trừ kho thêm |
| Thiếu khóa Stripe/webhook | Checkout trả lỗi cấu hình, không tạo thêm đơn |

Để thử hết hạn, dùng ID phiên `cs_test_...` thật của đơn trong database:

```powershell
stripe checkout sessions expire cs_test_YOUR_SESSION
```

`stripe trigger` tạo đối tượng mẫu thiếu `order_id` của shop; không thay thế cho
một đơn được tạo qua checkout thật. Nếu nhận lỗi, xem Stripe event delivery và
server log theo `eventId`/`orderId`, sửa cấu hình rồi resend sự kiện đó.

## 6. Production

1. Hoàn tất tài khoản merchant Stripe, bật thẻ/TWINT và các yêu cầu tài khoản.
2. Thay `sk_test_...` bằng secret production ở hosting.
3. Đặt public origin HTTPS chính xác và deploy lại.
4. Tạo webhook endpoint `https://YOUR_DOMAIN/api/webhooks/stripe`, đăng ký đủ 5
   sự kiện trong lệnh CLI ở trên; dùng signing secret của endpoint này.
5. Chạy migration 006 trên đúng database production.
6. Thiết lập rate limiting dùng Redis: `RATE_LIMIT_REDIS_URL` và
   `RATE_LIMIT_REDIS_TOKEN`. Khi thiếu Redis, bộ giới hạn in-memory không chia sẻ
   giữa các instance.
7. Thử một đơn thật giá trị nhỏ và hoàn tiền bằng tài khoản shop.

Tài liệu chính thức:
[Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment),
[thời hạn phiên](https://docs.stripe.com/api/checkout/sessions/create#checkout_session_create-expires_at),
[TWINT](https://docs.stripe.com/payments/twint),
[refunds](https://docs.stripe.com/refunds).

## 7. Giới hạn vận hành cần biết

- Nút back/cancel của Stripe chỉ điều hướng về shop; không tự hủy một phiên còn
  thanh toán được. Hold được giải phóng khi nhận sự kiện hết hạn/thất bại.
- Nếu phiên không đăng ký được và Stripe cũng không xác nhận đã expire, không
  giải phóng tồn kho sớm; chờ hết hạn hoặc webhook xử lý.
- Nếu webhook thành công đến quá muộn và hàng đã được giữ/bán cho đơn khác,
  database từ chối capture nội bộ để tránh vượt tồn kho. Cần xử lý cảnh báo
  webhook và quyết định giao hàng/hoàn tiền trên Stripe; không thu tiền lại.
- Khóa gửi lại checkout được giữ trong biểu mẫu đang mở. Tải lại trang, quay lại
  checkout sau khi rời trang hoặc đổi thông tin sẽ tạo một lần checkout mới.
  Nếu đã thanh toán nhưng chưa thấy xác nhận, kiểm tra đơn/Stripe trước khi trả lại.
- Hoàn tiền được thực hiện trong Stripe Dashboard; chưa có nút hoàn tiền trong
  Admin. Không xử lý tranh chấp/chargeback tự động trong bản này.
- Kiểm thử tự động dùng PostgreSQL local qua PGlite, kiểm tra chữ ký Stripe thật
  và mock API; vẫn cần thử end-to-end với tài khoản Stripe và Supabase thực.

## 8. Checklist bàn giao sang Stripe Live của khách

Ứng dụng hiện dùng Hosted Checkout trên server. Cần hai giá trị từ **cùng tài
khoản Stripe Live của khách**:

| Biến trên Vercel | Giá trị khách cần chuẩn bị | Nơi lấy |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | API key Live dùng ở server, ví dụ `sk_live_...` | Stripe Dashboard → chuyển sang Live → API keys |
| `STRIPE_WEBHOOK_SECRET` | Signing secret `whsec_...` của webhook Live | Stripe Dashboard → Workbench → Webhooks → endpoint Live → Signing secret |

Stripe khuyến nghị restricted API key `rk_live_...` với quyền phù hợp. Có thể đặt
key này trong `STRIPE_SECRET_KEY`; cần cấp và kiểm tra quyền cho các thao tác
Checkout/refund mà ứng dụng sử dụng trước khi vận hành. Không dùng key Sandbox
hoặc signing secret từ `stripe listen` cho Live.

`pk_live_...` (publishable key) **chưa cần trong phiên bản hiện tại**, vì frontend
chuyển sang trang Stripe bằng URL Checkout do server tạo, không dùng Stripe.js
hay Elements. Không cần khách gửi mật khẩu Stripe hoặc mã OTP.

Khách nên tự nhập các secret vào Vercel Environment Variables hoặc chia sẻ qua
công cụ quản lý secret; không gửi secret qua chat/email và không commit vào Git.
Các hướng dẫn chính thức: [API keys](https://docs.stripe.com/keys),
[webhook signing secret](https://docs.stripe.com/webhooks#retrieving-your-endpoints-secret).

Các bước chuyển:

1. Khách hoàn tất kích hoạt tài khoản Live, thông tin doanh nghiệp, tài khoản
   ngân hàng nhận tiền và bật phương thức thẻ/TWINT cần dùng.
2. Trong **Live của khách**, tạo webhook với URL
   `https://TEN_MIEN_CHINH_THUC/api/webhooks/stripe`, chọn payload **Snapshot**,
   và đăng ký đủ 5 sự kiện:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`
3. Trong Vercel → Settings → Environment Variables → **Production**, cập nhật
   hai secret và xác nhận:

   ```dotenv
   PAYMENT_PROVIDER=stripe
   STRIPE_SECRET_KEY=YOUR_LIVE_SERVER_API_KEY
   STRIPE_WEBHOOK_SECRET=YOUR_LIVE_ENDPOINT_SIGNING_SECRET
   NEXT_PUBLIC_SITE_URL=https://TEN_MIEN_CHINH_THUC
   ```

4. Redeploy **commit mới nhất** để áp dụng cấu hình. Giữ Sandbox cho Development/
   Preview; không thay `.env.local` sang Live chỉ để thử trên máy.
5. Kiểm tra cấu hình Live, endpoint và các quyền API; dùng Sandbox để chạy các
   tình huống thử. Khi có giao dịch mua thật, kiểm tra webhook trả 2xx, đơn `paid`,
   tồn kho giảm đúng và tiền xuất hiện trong tài khoản Stripe của khách.
