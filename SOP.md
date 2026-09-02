# SOP — Web "Web Radio Test" (Cổng quản trị App Đo Sóng)
**Bản Draft v1.2 — 02/09/2026 — CHỜ ANH NAM DUYỆT, CHƯA BUILD**

> Cách dùng file này: dán nguyên văn vào project claude.ai mới "Web Radio test" (tạo project → New document → paste), **thay thế bản v1/v1.1 đã dán trước đó**. Đây là bản thảo nội dung + kiến trúc để thống nhất trước; phần hình ảnh/wireframe gửi kèm riêng (link Artifact).

**Nhật ký cập nhật**
- v1.1 (02/09): bổ sung — (1) tự động đồng bộ cellfile (bản đồ + CSV/Excel) và kết quả đo, tách theo từng nhà mạng, chỉ admin xem được; (2) hợp nhất tài khoản đăng nhập app RadioTest với web.
- v1.2 (02/09, cùng ngày): bổ sung — (3) thuật toán khử trùng lặp cellfile khi gộp từ nhiều nguồn user (mục 4.4.1); (4) thống kê số user đã cài/đăng nhập/đang hoạt động — làm được ngay, không cần chờ app lên Google Play/App Store (mục 4.1.1). Xem đánh dấu **[MỚI v1.2]**.

---

## 0. Phạm vi & nguyên tắc

- Mục tiêu: 1 web platform quản trị cho app "App Đo Sóng" (RadioTest, Android, độc lập thương hiệu MobiFone) — gồm Backend + Admin Dashboard + AI Chatbot (RAG) + tích hợp thanh toán/social + kho dữ liệu tổng hợp (admin-only) + cổng tự phục vụ cho user.
- Người triển khai: anh Nam tự code cùng Claude (Cowork/Claude Code) — không có đội dev riêng. → mọi lựa chọn kiến trúc trong SOP này ưu tiên **ít cấu phần, quản lý được bởi 1 người, deploy bằng git push, không cần tự vận hành server**.
- Hạ tầng: managed/low-code (đã chốt) — chi tiết lựa chọn cụ thể ở mục 2.
- Thanh toán & đăng nhập mạng xã hội: cả trong nước lẫn quốc tế (đã chốt) — chi tiết ở mục 4.3.
- Nguyên tắc bảo mật dữ liệu xuyên suốt: **dữ liệu đo/trạm gộp từ nhiều user chỉ admin truy vấn/xem/export được — user không có UI, không có API, không biết tính năng này tồn tại.** Đây là ràng buộc cứng, áp dụng ở tầng database (không chỉ tầng giao diện) — chi tiết cơ chế ở mục 3.2.
- Trạng thái: **DRAFT — chưa code dòng nào.** Sau khi anh Nam duyệt/sửa mục 9 (danh sách quyết định), mới bắt đầu dựng.

---

## 1. Bối cảnh — kiến trúc app RadioTest hiện tại (để web không phá vỡ những gì đã có)

| Thành phần | Hiện trạng |
|---|---|
| Lưu trữ dữ liệu đo | **Hoàn toàn cục bộ trên máy** — `Store.java` (SharedPreferences + file CSV trong bộ nhớ máy). Không có cloud sync. |
| Model dữ liệu | `CellFile.Site` (trạm/cell: lat/lon, tên site, tên cell, RAT, band...), `Rec.java` (1 bản ghi đo: RSRP/RSRQ/SINR/Cell ID/PCI...), `LogFile.java` (1 phiên đo) |
| Xuất dữ liệu (đã có sẵn trong app) | Word (`DocxWriter`), Excel thống kê (`XlsxWriter`), ảnh bản đồ (`PngWriter`), KML tuyến đo (`Kml.java`) |
| Kết nối mạng của app hiện tại | Chỉ 2 việc: (a) kiểm tra bản mới qua `version.txt` trên Google Drive, (b) đăng nhập/đăng ký qua Google Apps Script + Google Sheet (`Backend.java`) |
| Tình trạng backend đăng nhập hiện tại | **Đang lỗi 404** (theo tài liệu `v25`), mật khẩu băm SHA-256 không salt, không rate-limit — mức tạm cho giai đoạn đầu, chưa đủ chuẩn cho hệ thống có thanh toán |
| **Điểm quan trọng nhất cho SOP này** | App **CHƯA CÓ** bất kỳ API upload dữ liệu đo lên cloud nào. Toàn bộ logfile/cellfile/report hiện chỉ nằm trên máy user, xuất ra file cục bộ. → Module "user xem kết quả của mình trên web" (yêu cầu A.5) **không có sẵn đường dữ liệu** — phải chọn 1 trong 2 hướng ở mục 4.5. |
| **[MỚI v1.1] Đã có sẵn logic tra nhà mạng** | `core/Mno.java` (từ bản v34) tra tên nhà mạng từ MCC+MNC — bảng đủ 9 mã Việt Nam (452-01 MobiFone … 452-09 Wintel), nước khác trả thẳng `mcc-mnc`, không bịa tên. `core/Benchmark.java` đã có sẵn logic "so sánh nhà mạng: gom theo MNC" (hiện chạy cục bộ trên app, so với dữ liệu nguồn mở). → Web nên **dùng lại đúng bảng tra này** (đối chiếu, không tạo bảng MCC-MNC thứ 2 dễ lệch nhau), và `measurements` trên web tự suy ra nhà mạng từ MCC-MNC của cell phục vụ tại thời điểm đo — không cần user tự khai. |
| **[MỚI v1.1] Cảnh báo mâu thuẫn với quyết định cũ** | Tại bản v34 (27/08/2026) anh Nam đã chốt rõ: **"KHÔNG tự tải dữ liệu người dùng lên"** (khi đó là không tự đóng góp lên OpenCelliD). Yêu cầu "tự động đồng bộ" lần này (mục 4.4/4.5 cập nhật) là **đảo ngược quyết định đó theo hướng khác** — không phải chia sẻ cho bên thứ ba (OpenCelliD) mà đồng bộ về chính hệ thống của mình (Supabase) để phục vụ user portal + admin benchmark. Về bản chất khác nhau (dữ liệu vẫn trong tay anh Nam, không ra ngoài), nhưng **vẫn cần cập nhật Privacy Policy + xin đồng ý người dùng rõ ràng** vì app phục vụ đại chúng, không chỉ nội bộ — chi tiết mục 8. |

---

## 2. Kiến trúc tổng thể đề xuất

| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Frontend (Admin + User portal) | **Next.js** (React), deploy trên **Vercel** | Deploy bằng git push, không cần server riêng, free tier đủ cho giai đoạn đầu, sinh thái lớn nên Claude Code viết/sửa code nhanh |
| Backend/API | **Next.js API routes / Edge Functions** — không dựng server riêng | 1 codebase duy nhất frontend+backend, đúng tinh thần "ít cấu phần" |
| Database + Auth + Storage | **Supabase** (Postgres) — chọn thay Firebase | Xem so sánh bên dưới |
| Vector store cho RAG | **Supabase (pgvector, extension có sẵn)** | Không cần thêm 1 dịch vụ vector-DB riêng (Pinecone...) — gộp chung 1 nơi |
| AI sinh câu trả lời (chatbot) | **Claude API (Anthropic)** | Đồng bộ với hệ sinh thái đang dùng, chất lượng tiếng Việt tốt |
| AI tạo embedding (để tìm kiếm ngữ nghĩa) | **Voyage AI** (đối tác embedding được Anthropic khuyến nghị) | Anthropic không có API embedding riêng; Voyage tối ưu sẵn để dùng cùng Claude |
| Thanh toán trong nước | **VNPay hoặc MoMo** (cổng thanh toán, hỗ trợ thẻ nội địa/QR) | Chi tiết mục 4.3 |
| Thanh toán quốc tế | **Stripe** | Chuẩn thị trường quốc tế, hỗ trợ thẻ Visa/Mastercard, subscription sẵn |
| Đăng nhập mạng xã hội | Google, Facebook (Supabase Auth hỗ trợ sẵn) + Zalo (tự tích hợp thêm) | Chi tiết mục 4.3 |
| **[MỚI v1.2] Tính khoảng cách địa lý** | **PostGIS** (extension có sẵn trong Supabase, bật bằng 1 dòng lệnh) | Dùng cho khử trùng lặp cellfile (mục 4.4.1) và heatmap benchmark (mục 4.4) — nhanh và ít lỗi hơn tự viết Haversine trong code |

### 2.1. Vì sao Supabase thay vì Firebase (dù Firebase đã được nhắc tới trong nghiên cứu Phase 2 cũ, tài liệu 14/08)

| Tiêu chí | Firebase (Firestore) | Supabase (Postgres) |
|---|---|---|
| Truy vấn benchmarking phức tạp (so sánh theo khu vực/nhà mạng/công nghệ, group by, join) | NoSQL — khó, phải denormalize thủ công | SQL chuẩn — mạnh, đúng sở trường cho loại dữ liệu này |
| Phân quyền admin-only ở tầng database | Firestore Security Rules — viết được nhưng logic phức tạp dễ sai | **Row Level Security (RLS)** của Postgres — khoá ngay tại tầng DB, kể cả khi lộ API key cũng không đọc được bảng dữ liệu gộp |
| Vector search cho RAG | Không có sẵn — phải thêm dịch vụ ngoài | **pgvector** có sẵn, cùng 1 database |
| Chi phí/độ phức tạp cho 1 người vận hành | Tương đương | Tương đương, nhưng gộp được Auth+DB+Storage+Vector+Realtime trong 1 dashboard |

**Lưu ý không xung đột với phần đã làm cho app Android**: Firebase Analytics/Crashlytics đã đề xuất cho app Android (theo skill dự án) là việc RIÊNG, không liên quan lựa chọn database cho web này — giữ nguyên, không đổi.

**[MỚI v1.1 — ĐÃ CHỐT, không còn là khuyến nghị chờ quyết]**: anh Nam đã xác nhận — hệ đăng nhập app RadioTest và web dùng **chung 1 hệ thống tài khoản (Supabase Auth)**. Lý do kỹ thuật: đây là điều kiện bắt buộc để đồng bộ tự động dữ liệu cellfile/kết quả đo (mục 4.4/4.5) — không có tài khoản chung thì hệ thống không biết dữ liệu đồng bộ lên thuộc về ai. Việc này đồng thời sửa luôn lỗi backend đăng nhập hiện tại đang lỗi 404.

Hệ quả: đây KHÔNG còn là việc "chỉ web", mà bắt buộc phải sửa app Android (đổi màn hình đăng nhập/đăng ký hiện tại từ gọi Google Apps Script sang gọi Supabase Auth) — xem kế hoạch ở mục 4.5 và mục 7 (roadmap). Cần 1 bản app RadioTest mới (không chỉ web) mới đồng bộ được.

---

## 3. Mô hình dữ liệu & cơ chế phân quyền admin-only

### 3.1. Các bảng chính (Postgres, sơ bộ)

| Bảng | Nội dung | Ai đọc được |
|---|---|---|
| `profiles` | user_id, họ tên, sđt, role (`user`/`admin`), gói (`free`/`pro`), **[MỚI v1.1] `nha_mang_mac_dinh`** (nhà mạng user khai khi đăng ký — dùng để gắn thẻ cellfile họ import, xem mục 4.4) | Chính user đó + admin |
| `cellfiles` | Trạm/cell user import (lat/lon, tên site/cell, RAT, band...), gắn `user_id`, **[MỚI v1.1] `nha_mang`** (mặc định lấy theo `profiles.nha_mang_mac_dinh`, cho sửa lại lúc import nếu user đo hộ nhà mạng khác) | Chính user đó + admin |
| `logfiles` | 1 phiên đo (tên, thời gian, thiết bị, ghi chú), gắn `user_id` | Chính user đó + admin |
| `measurements` | Từng bản ghi đo (RSRP/RSRQ/SINR/Cell ID/PCI/tốc độ...), gắn `logfile_id` → `user_id`, **[MỚI v1.1] `nha_mang`** (tự suy từ MCC-MNC của cell phục vụ qua bảng `Mno.java`, KHÔNG cần user khai — khách quan theo SIM đang đo, có thể khác nhà mạng của cellfile vì mục đích là so sánh chéo) | Chính user đó + admin |
| `reports` | File Word/Excel/KML đã tạo (đường dẫn Storage) | Chính user đó + admin |
| `benchmark_aggregates` | Dữ liệu **đã tổng hợp/ẩn danh** theo lưới toạ độ (geohash) + nhà mạng + công nghệ, dùng để so sánh vùng phủ | **CHỈ admin** |
| `kb_documents` / `kb_chunks` (pgvector) | Tài liệu kiến thức cho chatbot (hướng dẫn dùng app, thuật ngữ 3GPP...) + embedding | Hệ thống dùng nội bộ (không hiển thị trực tiếp cho ai) |
| `chat_sessions` / `chat_messages` | Lịch sử hỏi-đáp chatbot | Chính user đó (+ admin nếu cần hỗ trợ, có audit log) |
| `subscriptions` | Gói đăng ký, trạng thái, mã giao dịch | Chính user đó + admin |
| `audit_log` | Ghi lại mỗi lần admin xem/export dữ liệu gộp | **Chỉ admin (đọc), hệ thống tự ghi** |
| **[MỚI v1.2]** `app_pings` | `device_id` (UUID ẩn danh), `event` (open/login_success/heartbeat), `app_version`, `created_at` — nguồn cho thống kê cài đặt/đăng nhập/đang hoạt động (mục 4.1.1) | **Chỉ admin đọc** (user chỉ INSERT được, không SELECT) |
| **[MỚI v1.2]** `cellfiles_canonical` / `cellfile_dedup_candidates` | Bảng phái sinh sau khử trùng lặp cellfile (mục 4.4.1) — canonical dùng cho bản đồ/export admin, dedup_candidates chờ admin duyệt gộp | **Chỉ admin** |

### 3.2. Cơ chế đảm bảo "user không xem/biết" dữ liệu gộp — 3 lớp

1. **Row Level Security (RLS) ở tầng database**: bảng `measurements`/`cellfiles`/`logfiles` chỉ cho user đọc dòng có `user_id = chính mình`; bảng `benchmark_aggregates` **không cấp quyền SELECT cho role `user` dưới bất kỳ điều kiện nào** — kể cả nếu có bug ở tầng giao diện, gọi thẳng API cũng bị Postgres chặn.
2. **Không có route/API nào cho `benchmark_aggregates` xuất hiện trong bundle code phía user** — route riêng `/admin/benchmark`, code tách biệt hoàn toàn khỏi phần user portal, không import chung.
3. **`audit_log`** ghi lại mọi lần admin export — không phải để user thấy, mà để chính anh Nam kiểm soát được ai/khi nào đã export gì (đúng tinh thần minh bạch nội bộ trong nguyên tắc làm việc chung).

Dữ liệu vào `benchmark_aggregates` được **tổng hợp theo lô** (job chạy định kỳ, ví dụ mỗi đêm) từ `measurements` thô — không lộ định danh user ở bảng tổng hợp (chỉ còn toạ độ lưới + nhà mạng + công nghệ + số liệu thống kê).

---

## 4. Chi tiết 5 module theo yêu cầu

### 4.1. Backend & Admin Dashboard (yêu cầu A.1)

- **Thống kê & báo cáo real-time**: tổng số user, số phiên đo/ngày, số điểm đo, phân bố theo tỉnh/nhà mạng/công nghệ, biểu đồ xu hướng. Dùng Supabase Realtime để số liệu tự cập nhật không cần bấm refresh.
- **Quản lý user**: danh sách, tìm kiếm, khoá/mở tài khoản, xem gói đang dùng, lịch sử thanh toán, đặt lại mật khẩu hộ (không xem được mật khẩu — chỉ Supabase Auth mới giữ).
- **Quản lý input/output từ user**: xem danh sách file cellfile/logfile/report đã upload theo từng user (phục vụ hỗ trợ kỹ thuật), export hàng loạt khi cần.

#### 4.1.1. [MỚI v1.2] Thống kê số user (cài đặt / đăng nhập / đang hoạt động) — làm được ngay, không cần chờ lên Google Play/App Store

App hiện phân phối qua link Drive, chưa lên store, nhưng vẫn kết nối mạng bình thường — store chỉ là 1 NGUỒN số liệu bổ sung sau này (Play Console/App Store Connect), không phải điều kiện bắt buộc. Số liệu "tự đo" từ chính app làm được ngay, tách riêng khỏi phần đồng bộ cellfile/kết quả đo (mục 4.5, việc lớn hơn nhiều) — có thể đóng gói thành 1 bản vá app rất nhỏ, đi sớm nhất trong lộ trình:

| Bước | Việc | Ghi chú |
|---|---|---|
| 1 | Bảng `app_pings` trên Supabase: `device_id` (UUID sinh 1 lần, lưu cục bộ trên máy — KHÔNG dùng Android ID/IMEI vì đụng quyền riêng tư và bị Google Play hạn chế), `event` (`open` / `login_success` / `heartbeat`), `app_version`, `created_at` | Ẩn danh theo thiết bị — không cần biết là ai nếu user chưa đăng nhập |
| 2 | 1 API insert-only: RLS cho phép **INSERT** bằng anon key, **KHÔNG cho SELECT** — user không đọc được bảng này, chỉ admin đọc qua service role | Đúng nguyên tắc admin-only mục 3.2 |
| 3 | App gọi API này: 1 lần khi mở app (event `open`, gọi **TRƯỚC màn đăng nhập** nên đếm được cả người mở app rồi thoát chưa kịp đăng nhập) · khi đăng nhập thành công (event `login_success`, kèm user_id nếu đã có tài khoản) · định kỳ mỗi 5 phút khi app đang mở (event `heartbeat`) | Kiểu "bắn rồi quên" (fire-and-forget) — lỗi mạng thì bỏ qua im lặng, không chặn/làm chậm UI |
| 4 | Admin Dashboard (mục 4.1) hiện thêm: **Tổng thiết bị từng mở app** (COUNT DISTINCT `device_id`) · **Đã từng đăng nhập** (DISTINCT `device_id` có `login_success`) · **Đang hoạt động** (`device_id` có `heartbeat` trong 15 phút gần nhất) · **DAU/MAU** (DISTINCT `device_id` theo ngày/tháng) | Realtime — dùng lại Supabase Realtime đã có sẵn trong stack |

**Giới hạn cần ghi rõ trên dashboard (không bịa số)**: đây là số liệu tự đo, phản ánh "thiết bị có mạng và đã mở app" — không đếm được người cài nhưng chưa từng mở, hoặc mở khi hoàn toàn không có mạng lúc đó và không mở lại sau. Không phải số liệu "lượt tải" chính thức của store.

**Khi lên Google Play/App Store sau này**: nối thêm Android Publisher API (Play Console) / App Store Connect API làm NGUỒN BỔ SUNG cho đúng số lượt cài/gỡ chính thức, cộng vào cùng dashboard — không thay thế số tự đo (tự đo vẫn là nguồn duy nhất cho "đang hoạt động ngay lúc này", store API không có).

**Vì sao xếp việc này rất sớm**: thay đổi trên app cực nhỏ (1 lệnh gọi mạng, không đụng logic đo/cellfile hiện có, không cần màn hình mới) — gộp chung vào đợt sửa đăng nhập ở mục 2.1/4.5, hoặc tách làm riêng trước nếu anh Nam muốn có số liệu sớm hơn cả phần đồng bộ lớn (xem mục 7).

### 4.2. AI Chatbot trợ lý (RAG) (yêu cầu A.2)

- Nguồn tri thức nạp vào (embedding hoá, lưu ở `kb_chunks`): hướng dẫn sử dụng app, giải thích thông số kỹ thuật (RSRP/RSRQ/SINR/PCI...), FAQ, changelog các bản, và (tuỳ chọn Phase 2) trích dẫn 3GPP/GSMA/O-RAN liên quan.
- Luồng: câu hỏi user → tạo embedding (Voyage) → tìm đoạn tri thức gần nhất trong `kb_chunks` (pgvector) → đưa vào Claude API kèm câu hỏi → trả lời có trích nguồn.
- Đặt trong cả web (widget góc màn hình) lẫn có thể expose API riêng để sau này gắn vào app Android nếu cần.
- **Không** cho chatbot truy vấn trực tiếp `benchmark_aggregates` hay dữ liệu đo của user khác — chỉ trả lời dựa trên `kb_chunks` + (nếu là user đã đăng nhập) dữ liệu của chính họ.

### 4.3. Tích hợp đa nền tảng Social & Thanh toán (yêu cầu A.3)

| Loại | Trong nước | Quốc tế |
|---|---|---|
| Đăng nhập | Google, Facebook (Supabase Auth có sẵn provider) + **Zalo** (Supabase không có sẵn provider chuẩn — cần tự viết 1 OAuth adapter, ước ~1-2 ngày công) | Google, Apple (Apple login cân nhắc hoãn — app hiện chưa có bản iOS, có thể thêm khi cần) |
| Thanh toán | **VNPay** hoặc **MoMo** (khuyến nghị chọn 1 trong giai đoạn đầu để đỡ phức tạp, thêm cổng thứ 2 sau) — hỗ trợ thẻ ATM nội địa, QR, ví | **Stripe** — subscription tự động, hỗ trợ thẻ quốc tế |
| Chia sẻ kết quả đo lên MXH | Nút chia sẻ Facebook/Zalo (như i-Speed đang làm — xem mục 5) | — |

**Khuyến nghị**: MVP chỉ cần **1 cổng trong nước (MoMo — tài liệu tích hợp rõ ràng nhất) + Stripe** + đăng nhập Google (nhanh nhất, built-in). ZaloPay/Zalo login, Facebook login thêm ở Phase 2 — tránh dàn trải ngay từ đầu (đúng nguyên tắc không tự mở rộng phạm vi ngoài yêu cầu, nhưng đây là **đề xuất phân kỳ**, do anh Nam chốt ở mục 9).

### 4.4. Hệ thống lưu trữ dữ liệu tổng hợp — Admin-only benchmarking (yêu cầu A.4)

Đã mô tả cơ chế ở mục 3. Bổ sung về nội dung so sánh benchmark admin xem được:
- So sánh vùng phủ (RSRP/RSRQ trung bình) theo khu vực giữa các nhà mạng (dựa trên dữ liệu user tự nguyện đóng góp, ẩn danh).
- Bản đồ nhiệt (heatmap) chất lượng sóng theo lưới toạ độ — tương tự cách OpenSignal/nPerf làm (mục 5).
- Xu hướng chất lượng theo thời gian, theo công nghệ (2G/3G/4G/5G).
- Export CSV/Excel cho báo cáo lãnh đạo.

**[MỚI v1.1] Bổ sung theo yêu cầu — dữ liệu trạm (cellfile) và kết quả đo tách theo từng nhà mạng, chỉ admin:**

| Nội dung | Nguồn dữ liệu | Cách gắn nhà mạng |
|---|---|---|
| **Cellfile trên bản đồ admin** — lớp trạm/cell hiện theo từng nhà mạng, bật/tắt từng lớp | Gộp từ `cellfiles` của mọi user (đồng bộ tự động, xem 4.5) | Theo `cellfiles.nha_mang` (từ profile user, sửa được lúc import) |
| **Cellfile dạng CSV/Excel** — export theo nhà mạng | Cùng bảng `cellfiles` | Lọc theo `nha_mang` trước khi export |
| **Kết quả đo theo từng nhà mạng** — bảng/biểu đồ so sánh RSRP/RSRQ/SINR/tốc độ giữa các nhà mạng | `measurements` | Theo `measurements.nha_mang` (tự suy từ MCC-MNC, khách quan) |

Toàn bộ 3 mục trên **chỉ hiện trong `/admin/benchmark`**, áp dụng đúng cơ chế 3 lớp chặn ở mục 3.2 (RLS + tách route + audit log) — user tuyệt đối không có màn hình/route nào nhìn thấy dữ liệu đã gộp của người khác, kể cả theo nhà mạng.

**Lưu ý kỹ thuật quan trọng**: `cellfiles.nha_mang` (do user/profile khai) và `measurements.nha_mang` (tự suy khách quan từ SIM) là **2 khái niệm khác nhau, không gộp làm một** — cellfile trả lời "trạm này của hãng nào", measurement trả lời "lúc đo, máy đang bắt sóng hãng nào". Tách riêng để so sánh chéo được (ví dụ: đo bằng SIM MobiFone tại khu vực có cả trạm MobiFone lẫn Viettel).

#### 4.4.1. [MỚI v1.2] Thuật toán khử trùng lặp cellfile khi gộp từ nhiều nguồn user

Nhiều user (cùng nhà mạng hoặc khác) có thể import cùng 1 trạm thật — ví dụ nhiều kỹ sư cùng công ty đo tại 1 khu vực, mỗi người tự import file cellfile công ty mình. Nếu gộp thẳng mọi bản ghi `cellfiles` (theo user) vào bản đồ tổng hợp cho admin, cùng 1 trạm sẽ hiện trùng hàng chục lần. Xử lý bằng 1 bảng phái sinh `cellfiles_canonical` (không đụng dữ liệu gốc từng user — mỗi user vẫn thấy đúng cellfile mình import ở "Không gian của tôi"), dựng bằng job định kỳ (giống job `benchmark_aggregates`), theo 2 lớp:

**Lớp 1 — Khớp chính xác, tự động gộp.** Khoá gộp: (nhà mạng, RAT, băng tần, tên trạm cha đã chuẩn hoá, tên cell đã chuẩn hoá) — chuẩn hoá = viết hoa, bỏ khoảng trắng thừa, bỏ ký tự đặc biệt. **Không dùng cột "Cell ID" trong form cellfile làm khoá** — đã ghi nhận từ bản v15: ở sheet 4G/5G, cột này là chuỗi ghép eNodeB-sector, không phải ECI thật máy Android trả về, các nguồn có thể ghi khác nhau dù cùng 1 cell vật lý. Khớp khoá này ở ≥ 2 user → coi là 1 cell vật lý, giữ 1 bản ghi canonical, các bản ghi trùng chỉ tăng biến đếm `so_nguon_xac_nhan` (không tạo dòng mới) — số này còn dùng để đánh giá độ tin cậy (trạm nhiều người xác nhận đáng tin hơn 1 người).

**Lớp 2 — Khớp mờ theo khoảng cách, KHÔNG tự gộp, đưa admin duyệt.** Khi tên trạm/cell không khớp tuyệt đối (gõ khác nhau, viết tắt khác nhau) nhưng: cùng nhà mạng + cùng RAT + khoảng cách địa lý giữa 2 toạ độ < 50 m (tính bằng PostGIS `ST_DWithin`) + (nếu có azimuth) chênh lệch hướng < 15° → đưa vào bảng `cellfile_dedup_candidates`, hiện trong Admin Dashboard để admin tự xác nhận gộp hay giữ riêng — **không tự động gộp**. Lý do: khu đô thị nhiều trạm thật sự đặt gần nhau (< 50 m) nhưng vẫn là 2 trạm khác nhau; gộp sai sẽ làm sai lệch cả benchmark. Đúng nguyên tắc "không bịa số/không kết luận cứng khi không chắc" mà dự án đã áp dụng xuyên suốt (`core/Benchmark.java`, `core/L3.java` đều để dạng gợi ý, không tự kết luận).

**Khi các nguồn trùng có số liệu lệch nhau** (toạ độ/azimuth/radius khác nhau chút do sai số GPS hoặc cellfile cũ-mới): lấy **trung vị (median)** cho các trường số (bền với sai lệch bất thường hơn trung bình cộng); lấy **giá trị xuất hiện nhiều lần nhất** cho các trường chữ (RAT/band/tên) — hoà thì lấy theo lần đồng bộ **gần nhất**.

### 4.5. Phân hệ tự phục vụ cho user (yêu cầu A.5) — **[MỚI v1.1] hướng lấy dữ liệu đã chốt: Đồng bộ tự động**

Vì app hiện KHÔNG có API upload (mục 1), việc này **bắt buộc phải sửa app Android** — anh Nam đã xác nhận đây là hướng chính thức (không còn là 1 trong 2 lựa chọn), gắn liền với việc hợp nhất đăng nhập ở mục 2.1. Cụ thể:

| Bước | Nội dung | Chạm vào |
|---|---|---|
| 1 | User đăng nhập app bằng tài khoản Supabase Auth chung (thay cho Google Apps Script cũ) | App Android — `Backend.java`, màn đăng nhập |
| 2 | Sau khi import cellfile mới trên app → tự động gọi API đẩy lên `cellfiles` (kèm `nha_mang` lấy theo profile) | App Android (mới) + Supabase Edge Function |
| 3 | Sau khi kết thúc 1 phiên đo (logfile) → tự động gọi API đẩy `logfiles` + `measurements` lên (mỗi bản ghi tự kèm `nha_mang` suy từ MCC-MNC) | App Android (mới) + Supabase Edge Function |
| 4 | Mất mạng lúc đo → xếp hàng cục bộ (giữ nguyên cơ chế lưu máy `Store.java` hiện tại), gửi bù khi có mạng lại | App Android (mới) |

**Vì sao cần hàng đợi gửi bù (bước 4)**: đo sóng thường ở vùng sóng yếu/mất mạng — nếu bắt buộc có mạng mới lưu được thì mất đúng lúc cần nhất. Dữ liệu vẫn lưu máy trước (như hiện tại), đồng bộ lên là bước CỘNG THÊM, không thay thế.

**Vì sao đây là việc ngoài phạm vi "chỉ web"**: bước 1-4 đều là code Android, cần 1 bản app RadioTest mới + để anh Nam cài/test trên máy thật giống mọi lần trước — **sẽ lên kế hoạch/SOP riêng cho phần app khi tới lúc triển khai**, SOP này chỉ đặc tả YÊU CẦU và API phía web cần có sẵn để app gọi vào.

**Bootstrap cho dữ liệu cũ**: cellfile/logfile đã có sẵn trên máy TRƯỚC khi có bản app mới không tự động lên cloud được (app cũ không có API này) — vẫn cần 1 lần "nhập bù" thủ công (kéo-thả file xuất từ app như đã mô tả ở bản v1) cho riêng dữ liệu cũ, sau đó về sau mọi phiên đo mới đều tự động.

Sau khi có dữ liệu, user portal cho phép: xem lại danh sách phiên đo, xem bản đồ điểm đo, xem thống kê (min/TB/max RSRP/RSRQ/SINR...), tải lại report Word/Excel/KML, và **chỉ** export/import dữ liệu của chính mình.

---

## 5. Đối chiếu các nền tảng đo sóng/network testing tương tự — bài học áp dụng

| Nền tảng | Mô hình | Điểm hay để học | Nguồn |
|---|---|---|---|
| **OpenSignal** | Crowdsourced coverage map, bán dữ liệu/insight cho nhà mạng (B2B) | Tách rõ 2 lớp: app đại chúng thu thập dữ liệu (miễn phí) vs. dashboard phân tích B2B trả phí — đúng mô hình admin-only đang muốn làm | [Opensignal – Wikipedia](https://en.wikipedia.org/wiki/Opensignal), [How Opensignal Works](https://businessmodelcanvastemplate.com/blogs/how-it-works/opensignal-how-it-works) |
| **CellMapper** | Crowdsourced bản đồ trạm phát sóng, cộng đồng đóng góp | Cơ chế "TopUsers"/xếp hạng người đóng góp nhiều — có thể học để tạo động lực cho user đóng góp dữ liệu đo (gamification nhẹ, không bắt buộc) | [CellMapper](https://www.cellmapper.net/Index) |
| **nPerf Fleet / nPerf Analytics** | Sản phẩm B2B drive-test cho doanh nghiệp viễn thông — rất gần với mục tiêu của anh Nam | Dashboard quản lý đội đo thực địa theo thời gian thực, thu >150 KPI, lên lịch đo tự động, lọc dữ liệu theo nhà mạng/công nghệ/thời gian/khu vực — đây gần như là hình mẫu trực tiếp cho module A.1+A.4 | [nPerf Fleet](https://www.nperf.com/en/product/nperf-fleet), [nPerf Analytics](https://www.nperf.com/en/product/nperf-analytics) |
| **RootMetrics (nay thuộc Ookla)** | Drive-test chuyên nghiệp, dữ liệu bán cho nhà mạng để xếp hạng vùng phủ | Ookla mua lại để gộp vào hệ sinh thái Speedtest — minh chứng giá trị thương mại của dữ liệu benchmark có kiểm soát truy cập | [Ookla Acquires RootMetrics](https://www.businesswire.com/news/home/20211214005289/en) |
| **i-Speed (VNNIC/NEAC — Việt Nam)** | Ứng dụng đo tốc độ Internet quốc gia, web công khai | Trang web CHỈ hiển thị thống kê công khai, KHÔNG có đăng nhập, KHÔNG so sánh trực tiếp nhà mạng, KHÔNG cho tải dữ liệu thô — đúng mô hình "ẩn dữ liệu nhạy cảm khỏi công chúng" mà anh Nam đang muốn, có nút chia sẻ MXH kết quả cá nhân | [speedtest.vn](https://speedtest.vn/) |

**Bài học rút ra áp dụng vào SOP này:**
1. Giữ 2 lớp tách biệt rõ ràng như OpenSignal/RootMetrics: lớp thu thập (user portal, thân thiện, đơn giản) và lớp phân tích B2B (admin dashboard, không lộ ra ngoài) — đã thiết kế đúng hướng này ở mục 3-4.
2. Học i-Speed: KHÔNG để lộ dữ liệu thô hay so sánh nhà mạng trực tiếp ra công khai — chỉ số liệu tổng hợp/thống kê nếu có phần public sau này.
3. Học nPerf Fleet: bộ lọc đa chiều (nhà mạng × công nghệ × khu vực × thời gian) là tính năng lõi của dashboard benchmark — đưa vào mục 4.4 làm chuẩn tối thiểu, không phải "nice to have".
4. Cân nhắc thêm (Phase 2, không bắt buộc MVP): lịch đo tự động/nhắc đo định kỳ (như nPerf Fleet) để dữ liệu tổng hợp đều đặn hơn theo thời gian, tăng giá trị benchmark.

---

## 6. Đề xuất bổ sung để web "đơn giản nhưng thông minh, nhanh gọn, chính xác"

- **Đơn giản**: MVP chỉ 4 màn hình chính (Đăng nhập, User Portal, Admin Dashboard, Chatbot) — không làm CMS/blog/trang giới thiệu phức tạp ở Phase 1; nội dung giới thiệu có thể là 1 trang tĩnh đơn giản.
- **Thông minh**: chatbot RAG không chỉ trả lời tri thức tĩnh mà còn có thể (Phase 2) trả lời câu hỏi về **chính dữ liệu của user đang đăng nhập** (ví dụ: "điểm đo yếu nhất tuần này của tôi ở đâu?") — biến chatbot thành trợ lý phân tích cá nhân, không chỉ FAQ bot.
- **Nhanh gọn**: dùng vật liệu có sẵn tối đa — Supabase Auth thay vì tự viết đăng nhập, Vercel thay vì tự dựng server, shadcn/ui hoặc Tailwind UI có sẵn component thay vì tự vẽ giao diện từ đầu.
- **Chính xác**: mọi số liệu benchmark hiển thị kèm cỡ mẫu (n = bao nhiêu điểm đo) và thời gian cập nhật gần nhất — tránh kết luận sai khi mẫu quá nhỏ (bài học từ cách OpenSignal/RootMetrics luôn công bố phương pháp luận kèm số liệu).
- **Cảnh báo dữ liệu bất thường tự động**: job đêm khi tổng hợp `benchmark_aggregates` tự gắn cờ các điểm dữ liệu outlier (ví dụ RSRP > 0 dBm — không hợp lý vật lý) để admin không bị nhiễu số liệu.

---

## 7. Lộ trình triển khai theo phase

| Phase | Nội dung | Điều kiện tiên quyết |
|---|---|---|
| **Phase 0** | Anh Nam duyệt SOP này + tạo project "Web Radio test" + tạo tài khoản Supabase/Vercel/Anthropic API/Voyage | — |
| **[MỚI v1.2] Phase 0.5 — Thống kê sử dụng sớm** | Bảng `app_pings` + API insert-only + 1 lệnh gọi mạng nhỏ trong app (mục 4.1.1) — làm được ngay khi có Supabase, không phụ thuộc web MVP hay app lên store | Chỉ cần Phase 0 xong (có Supabase) — **không chờ Phase 1** |
| **Phase 1 — MVP web** | Auth Supabase (email + Google) · User portal (bootstrap: kéo-thả file cũ, mục 4.5) · Admin dashboard cơ bản (thống kê + quản lý user, gồm số liệu Phase 0.5) · Database + RLS đầy đủ, có sẵn cột `nha_mang` (mục 3.1/4.4) | Phase 0 xong |
| **Phase 1b — App RadioTest bản mới (song song/ngay sau Phase 1)** | Đổi đăng nhập app sang Supabase Auth (mục 2.1) · Thêm API tự động đồng bộ cellfile + logfile/measurements (mục 4.5, có hàng đợi gửi bù khi mất mạng) · Job khử trùng lặp cellfile (mục 4.4.1) — cần 1 SOP/phiên làm việc riêng cho phần Android | Phase 1 có API sẵn sàng để app gọi vào; anh Nam cài app mới trên máy thật để test như các lần trước |
| **Phase 2** | Chatbot RAG · Benchmark admin-only đầy đủ (heatmap, bộ lọc, lớp cellfile theo nhà mạng trên bản đồ admin + export CSV/Excel theo nhà mạng, hàng đợi duyệt trùng lặp — mục 4.4) · Thanh toán (MoMo + Stripe) | Phase 1b xong, có dữ liệu tự động đổ về đều để benchmark có ý nghĩa |
| **Phase 3** | Đăng nhập Zalo/Facebook · ZaloPay · Gamification nhẹ (bảng đóng góp nhiều) | Phase 2 xong, có traction đủ lớn |

---

## 8. Rủi ro & lưu ý cần quyết định sớm

- **Bảo mật thanh toán**: không tự lưu số thẻ — mọi giao dịch qua cổng (VNPay/MoMo/Stripe) redirect, web chỉ lưu trạng thái/mã giao dịch. Chuẩn PCI-DSS do cổng thanh toán chịu trách nhiệm.
- **Đồng thuận thu thập dữ liệu (bắt buộc pháp lý)**: cần cập nhật Privacy Policy hiện có (đã có file `privacy-policy-tos.md` trong project APP ĐO SÓNG) để nêu rõ việc dữ liệu đo có thể được tổng hợp ẩn danh phục vụ benchmarking nội bộ — nếu chưa nêu, phải bổ sung trước khi Phase 1 thu thập dữ liệu thật.
- **[MỚI v1.1] Đồng bộ tự động = đảo ngược 1 quyết định cũ, cần xác nhận lại rõ ràng**: bản v34 (27/08) đã chốt "KHÔNG tự tải dữ liệu người dùng lên" (bối cảnh: không tự đóng góp cho OpenCelliD — bên thứ ba). Yêu cầu lần này khác về bản chất (đồng bộ về hệ thống CỦA CHÍNH anh Nam, không ra ngoài) nhưng **vẫn là thu thập + lưu trữ dữ liệu vị trí, hành vi đo của người dùng đại chúng tự động, không hỏi từng lần** — cần:
  1. Cập nhật Privacy Policy nêu rõ: dữ liệu cellfile + kết quả đo được tự động đồng bộ lên máy chủ khi đăng nhập, phục vụ (a) chính user xem lại trên web, (b) admin tổng hợp ẩn danh để benchmark.
  2. Đề xuất: có 1 màn hình/thông báo xin đồng ý **1 lần khi đăng nhập tài khoản mới** (không phải xin mỗi lần đo) — khác với công tắc "đóng góp OpenCelliD" (vẫn giữ mặc định TẮT, vì đó là chia sẻ cho bên thứ ba, không đổi).
  3. Đây là quyết định chính sách, không phải kỹ thuật thuần — anh Nam xác nhận lại 1 lần nữa ở mục 9 trước khi code phần đồng bộ.
- **Chi phí vận hành**: Supabase + Vercel + Claude API + Voyage đều có free tier, nhưng cần ước tính chi phí khi vượt ngưỡng (tuỳ số user) — nên rà lại khi có số liệu thật ở cuối Phase 1.
- **Không tự ý mở rộng phạm vi**: SOP này (phần web) KHÔNG code app Android — phần app (mục 4.5, Phase 1b) chỉ nêu YÊU CẦU, sẽ có SOP/phiên làm việc riêng khi tới lúc triển khai, đúng quy trình mọi lần trước với app RadioTest.

---

## 9. Danh sách quyết định cần anh Nam chốt trước khi bắt đầu build

1. Xác nhận stack: Next.js + Vercel + Supabase (Postgres/pgvector) + Claude API + Voyage — **đồng ý / muốn đổi thành phần nào?**
2. Cổng thanh toán trong nước Phase 1: **VNPay hay MoMo** (khuyến nghị MoMo — tài liệu dev rõ hơn)?
3. ~~Hướng lấy dữ liệu user~~ → **[ĐÃ CHỐT v1.1]** Đồng bộ tự động (mục 4.5), có bootstrap thủ công cho dữ liệu cũ.
4. ~~Gộp đăng nhập app Android~~ → **[ĐÃ CHỐT v1.1]** Có, dùng chung Supabase Auth (mục 2.1).
5. Tên miền dự kiến cho web (chưa có thì dùng tạm domain Vercel `.vercel.app` trước)?
6. Xác nhận nội dung mục 3.2 (3 lớp chặn admin-only) đã đúng ý "user không xem/biết" hay cần thêm ràng buộc nào nữa?
7. **[MỚI v1.1]** Cách xin đồng ý người dùng cho việc tự động đồng bộ (mục 8, gạch số 2) — 1 màn hình xác nhận khi đăng nhập tài khoản mới, nội dung cụ thể ra sao — anh Nam duyệt hướng này hay muốn cách khác?
8. **[MỚI v1.1]** `profiles.nha_mang_mac_dinh` (nhà mạng user khai khi đăng ký, mục 3.1/4.4) — dùng danh sách 9 nhà mạng VN theo đúng bảng `Mno.java` đã có (MobiFone, Viettel, VNPT, Vietnamobile, Gmobile...) hay cần thêm lựa chọn khác (ví dụ "không thuộc nhà mạng nào — dùng cá nhân")?
9. **[MỚI v1.1]** Thời điểm bắt đầu Phase 1b (sửa app Android) — làm song song ngay với Phase 1 web, hay chờ Phase 1 web ổn định rồi mới mở phiên làm việc riêng cho app?
10. **[MỚI v1.2]** Ngưỡng khớp mờ khi khử trùng lặp cellfile (mục 4.4.1): 50 m + chênh hướng 15° — anh Nam thấy hợp lý với mật độ trạm thực tế hay cần chỉnh?
11. **[MỚI v1.2]** Phase 0.5 (thống kê sử dụng sớm, mục 4.1.1) — xác nhận làm ngay/tách riêng như đề xuất, hay gộp chung vào đợt sửa đăng nhập Phase 1b cho gọn 1 lần cài app?

---

*Hết bản Draft v1.2. Phần hình ảnh/wireframe các trang chính gửi kèm riêng (Artifact link) để xem trực quan bố cục trước khi thống nhất — wireframe hiện phản ánh lớp cellfile theo nhà mạng ở màn Benchmark (cập nhật theo v1.1), chưa có phần thống kê sử dụng sớm (mục 4.1.1) ở màn Admin Dashboard — báo lại nếu anh Nam muốn cập nhật thêm vào wireframe.*
