# Báo cáo làm việc đêm 02/09/2026 — Web Radio Test

Tự động xử lý các mục còn lại trong khi anh Nam ngủ. Tóm tắt nhanh trước, chi tiết bên dưới.

## Tóm tắt nhanh

| # | Việc | Trạng thái |
|---|------|-----------|
| 1 | Sửa lỗi đăng nhập bị bounce về trang login | ✅ Live, đã test lại thành công |
| 2 | Sửa lỗi RLS đệ quy chặn toàn bộ chức năng admin | ✅ Live, đã test lại thành công |
| 3 | Admin quản lý user: khoá/mở, reset password, đếm file | ✅ **Đã live trên Production** (Vercel tự deploy lúc anh push) |
| 4 | Hạ tầng Chatbot RAG (Phase 2) | ✅ Code xong, đã commit, **CHƯA push** |
| 5 | Payment gateway, đăng nhập Zalo, Phase 1b Android | ⛔ Chưa làm — cần anh quyết định/cấp thông tin (xem mục 4) |

**Việc cần làm ngay khi thức dậy:** xem mục "3 việc cần làm" ở cuối báo cáo.

---

## 1. Hai lỗi nghiêm trọng đã tìm ra và sửa

### Lỗi đăng nhập bị bounce về `/auth/signin`
Nguyên nhân gốc: `middleware.ts` kiểm tra cookie `sb-access-token` nhưng không có chỗ nào trong code từng set cookie này — Supabase SDK lưu session ở `localStorage`, còn middleware chạy ở edge, trước khi JS client kịp chạy, nên không thấy được session. Đã sửa bằng cách đồng bộ cookie này ngay trong `onAuthStateChange` (`lib/auth-context.tsx`). Đã test lại: đăng nhập → vào dashboard → reload vẫn giữ session — OK.

### Lỗi "Access Denied" ở Admin Dashboard dù role đã là admin
Nguyên nhân gốc: policy RLS trên bảng `profiles` (và 11 bảng khác) tự truy vấn lại chính bảng `profiles` để check role admin → Postgres đệ quy vô hạn → lỗi `42P17`. Đã sửa bằng hàm `public.is_admin()` (`SECURITY DEFINER`, bypass RLS khi check role) và thay toàn bộ 12 policy dùng hàm này thay vì subquery trực tiếp — đây là pattern chuẩn Supabase khuyến nghị cho đúng loại lỗi này. Đã test lại: dashboard admin load đúng số liệu thật, không còn lỗi 500.

## 2. Admin quản lý user — đã live trên Production

Commit `134829e`, anh đã tự push và Vercel đã tự động deploy — build "Ready" trên Production (xem tab Deployments để biết giờ chính xác, không ghi lại được thời điểm cụ thể từ phiên làm việc đêm nay). Đã kiểm tra trực tiếp trên `web-radio-test.vercel.app/admin/users` — hoạt động đúng: cột Status (Active/Locked), cột Files (đếm cellfile/logfile/report theo từng user), nút Lock/Unlock, nút Reset password.

Nội dung: DB migration `007_user_lock_flag.sql` (cột `is_locked`, đã apply trực tiếp lên Supabase), API `/api/admin/users/[id]` (PATCH thêm `is_locked`), API mới `/api/admin/users/[id]/reset-password` (gửi email reset chuẩn của Supabase Auth, admin **không** xem/đặt mật khẩu trực tiếp), API `/api/admin/users` (thêm đếm file), UI trang User Management.

## 3. Hạ tầng Chatbot RAG (Phase 2) — code xong, chưa push

Commit `d8d8585` (local, **chưa push**). Theo đúng kiến trúc SOP mục 4.2: câu hỏi user → tạo embedding (Voyage AI) → tìm đoạn tri thức gần nhất trong `kb_chunks` (pgvector cosine search) → đưa vào Claude API kèm câu hỏi → trả lời có trích nguồn.

Đã làm:
- Migration `008_kb_rag_support.sql` — **đã apply trực tiếp lên Supabase** (đã verify sống): bật RLS khoá `kb_documents`/`kb_chunks` (chỉ service role đọc được, đúng yêu cầu SOP "hệ thống dùng nội bộ, không hiển thị trực tiếp cho ai"), tạo hàm `match_kb_chunks()` tìm kiếm vector.
- `lib/voyage.ts` — gọi Voyage AI (model `voyage-4`, 1024 chiều, khớp `vector(1024)` trong schema).
- `lib/anthropic.ts` — gọi Claude API, ép trả lời **chỉ dựa trên đoạn tài liệu được cung cấp**, không tự suy đoán.
- `lib/kb-seed-content.ts` — nội dung tri thức khởi tạo: giải thích RSRP/RSRQ/SINR/PCI (theo 3GPP TS 36.214/38.215/36.211/38.211, có ghi rõ nguồn), hướng dẫn dùng app (Cell Files/Measurements/Reports — lấy đúng từ code thật, không bịa), FAQ tài khoản (khoá/mở, quên mật khẩu, gói dịch vụ). **Không có changelog** — không có dữ liệu lịch sử phiên bản thật để viết, tránh bịa.
- `POST /api/admin/kb/seed` — admin gọi để nạp nội dung trên vào DB (idempotent theo tiêu đề).
- `POST /api/chat` + `GET /api/chat` — API chatbot cho user (bất kỳ user đã đăng nhập, không chỉ admin). Cố tình **không** cho chatbot truy vấn `benchmark_aggregates` hay dữ liệu đo của user khác — đúng giới hạn SOP mục 4.2.

**Giới hạn quan trọng:** biến môi trường `ANTHROPIC_API_KEY` **chưa có** trên Vercel → `/api/chat` sẽ trả lỗi 503 rõ ràng cho tới khi anh thêm key này. Code không tự test end-to-end được từ môi trường làm việc đêm nay (sandbox không có đường mạng ra `api.voyageai.com`/`api.anthropic.com`) — chỉ verify được bằng `tsc --noEmit` + `eslint` sạch và đọc lại kỹ từng dòng, **chưa chạy thử thật**.

**Chưa làm (nằm ngoài phạm vi "hạ tầng"):** trang giao diện chat cho user (`app/user/chat` chẳng hạn) — hiện chỉ có API, chưa có UI. Cân nhắc làm ở phiên sau nếu anh muốn.

## 4. Việc bị chặn — cần anh quyết định hoặc cấp thông tin

Không tự làm các việc dưới đây vì thiếu quyết định/credential, và một số nằm ngoài phạm vi repo web này:

| Việc | Lý do chặn | Cần gì từ anh |
|------|-----------|---------------|
| Payment gateway (VNPay/MoMo) | SOP mục 9.2 chưa chốt chọn cổng nào; không có merchant credentials | Chốt VNPay hay MoMo (hay cả 2), cấp merchant ID/secret key |
| Đăng nhập Zalo | Không có Zalo Developer App ID/secret | Tạo Zalo Developer App, cấp App ID + Secret Key |
| Phase 1b (app Android RadioTest) | Ngoài phạm vi repo web này — SOP ghi rõ cần 1 phiên/SOP riêng | Mở phiên riêng khi sẵn sàng |

## 5 việc cần làm ngay khi thức dậy

1. **Push commit `d8d8585`** lên GitHub qua GitHub Desktop (Vercel sẽ tự deploy sau đó, ~30s).
2. **Thêm `ANTHROPIC_API_KEY`** vào Vercel → Settings → Environment Variables (rồi redeploy, hoặc chờ lần deploy kế tiếp).
3. Sau khi deploy xong, **gọi `POST /api/admin/kb/seed`** (bằng token admin) để nạp nội dung tri thức vào DB — chưa làm bước này vì cần deploy trước.
4. **Test thử `/api/chat`** với 1 câu hỏi ví dụ ("RSRP là gì", "cách upload cellfile") — xem có trả lời đúng, có trích nguồn không.
5. Xem lại mục 4 (việc bị chặn) — quyết định khi nào xử lý payment/Zalo/Phase 1b.

Toàn bộ code đêm nay đã qua `tsc --noEmit` + `eslint` sạch, đọc lại kỹ từng file trước khi commit. Phần đã test sống (đăng nhập, RLS, upload cellfile/measurement, tạo report, admin dashboard, admin user management) đều hoạt động đúng trên Production.
