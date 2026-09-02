# 11 Quyết định cần chốt — SOP v1.2

**Trạng thái**: Chờ anh Nam duyệt + chốt từng quyết định  
**Sau khi chốt xong**: Sẽ bắt đầu Phase 1 build

---

## Quyết định 1: Stack công nghệ

**Nội dung**: Xác nhận tech stack tổng thể

**Đề xuất**:
- Frontend: **Next.js 15** (React) + **Vercel** deploy
- Backend/API: **Next.js API routes**
- Database + Auth + Storage: **Supabase (Postgres + pgvector)**
- AI Chatbot (generate text): **Claude API (Anthropic)**
- AI Embedding (vector search): **Voyage AI**
- Geospatial: **PostGIS** (extension Supabase)

**Quyết định của anh Nam**: ✅ Đồng ý toàn bộ

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 2: Cổng thanh toán trong nước — Phase 1

**Nội dung**: Cổng thanh toán Việt Nam cho MVP

**Lựa chọn đề xuất**:
- **VNPay** (dùng rộng nhưng tài liệu phức tạp hơn)
- **MoMo** ⭐ (khuyến nghị — tài liệu integration rõ ràng, hỗ trợ QR/Wallet)

**Quyết định của anh Nam**: ✅ **Cả MoMo + VNPay + hỗ trợ QR code**

**Ghi chú**: Mở rộng so với MVP ban đầu (chỉ 1 cổng), nhưng sẽ mang lại tính linh hoạt cao cho user. ZaloPay thêm ở Phase 3. Thanh toán quốc tế dùng **Stripe** (đã chốt).

**Ảnh hưởng**: Sẽ cần tích hợp thêm 1 package payment gateway tổng hợp (ví dụ Payos, OnePay, hoặc tự orchestrate) để quản lý 3 cổng trong 1 checkout flow. Không tăng độ phức tạp quá nhiều nếu dùng gateway tổng hợp.

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 3: Hướng lấy dữ liệu user

**Nội dung**: ~~Chọn giữa 2 cách~~ → **[ĐÃ CHỐT v1.1]**

**Đã chốt**: **Đồng bộ tự động** (mục 4.5 trong SOP)
- App tự động gửi cellfile + kết quả đo lên Supabase khi có mạng
- Có hàng đợi gửi bù khi mất mạng
- Bootstrap thủ công cho dữ liệu cũ (kéo-thả file)

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 4: Gộp hệ thống đăng nhập app + web

**Nội dung**: ~~Giữ riêng hay gộp?~~ → **[ĐÃ CHỐT v1.1]**

**Đã chốt**: **Có, gộp 1 hệ thống Supabase Auth**
- App RadioTest sẽ đổi từ Google Apps Script sang Supabase Auth
- Điều kiện bắt buộc để đồng bộ dữ liệu tự động
- Sửa luôn lỗi 404 backend hiện tại
- Cần 1 SOP riêng cho phần app khi tới Phase 1b

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 5: Tên miền web

**Nội dung**: Tên miền chính thức cho platform

**Lựa chọn**:
- **Tạm dùng domain Vercel** `.vercel.app` (tự động, không phí)
- **Custom domain** (cần mua + cấu hình DNS)

**Quyết định của anh Nam**: ✅ **Dùng tạm `.vercel.app` trong Phase 1**

**Ghi chú**: Sẽ upgrade sang custom domain khi ổn định + có nhu cầu branding chính thức.

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 6: Xác nhận cơ chế 3 lớp bảo vệ admin-only

**Nội dung**: Kiểm tra lại chiến lược ẩn dữ liệu gộp khỏi user

**Hiện tại (mục 3.2 SOP)**:
1. **RLS tầng database**: Postgres khoá cứng, user KHÔNG thể SELECT `benchmark_aggregates`
2. **Tách route/code**: `/admin/benchmark` riêng biệt khỏi `/user` portal, không import chung
3. **Audit log**: Ghi lại mỗi lần admin export, để kiểm soát nội bộ

**Quyết định của anh Nam**: ✅ Đồng ý 3 lớp này

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 7: Cách xin đồng ý người dùng cho đồng bộ tự động

**Nội dung**: Giao diện + nội dung yêu cầu đồng ý dữ liệu (mục 8, điểm 2 SOP)

**Đề xuất**:
- **1 màn hình xác nhận** khi user đăng nhập tài khoản mới (không phải mỗi lần đo)
- Nội dung: "Dữ liệu cellfile + kết quả đo của bạn sẽ được đồng bộ lên máy chủ để (a) bạn xem lại trên web, (b) admin tổng hợp ẩn danh phục vụ benchmark"
- Nút: Đồng ý / Không (nếu không đồng ý → không đồng bộ, chỉ lưu cục bộ như hiện tại)

**Quyết định của anh Nam**: ✅ OK

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 8: Danh sách nhà mạng mặc định khi đăng ký

**Nội dung**: `profiles.nha_mang_mac_dinh` — user chọn nhà mạng nào khi đăng ký?

**Danh sách VN (9 nhà mạng — theo `Mno.java` app)**:
1. MobiFone (452-01)
2. Viettel (452-04)
3. VNPT (452-02)
4. Vietnamobile (452-03)
5. GvijaFone / Gmobile (452-07)
6. Reddi (452-06)
7. Elise (452-08)
8. Itelecom (452-09)
9. Wintel (452-09)

**Quyết định của anh Nam**: ✅ 9 nhà mạng VN trước, có điều kiện sẽ thêm nhà mạng quốc tế sau

**Ghi chú**: Phase 1 MVP sẽ dùng 9 nhà mạng VN. Khi có nhu cầu hỗ trợ user quốc tế → Phase 2 sẽ mở rộng danh sách theo MCC/MNC các nước khác. Hiện tại không thêm "Cá nhân" option để tránh dàn trải scope.

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 9: Thời điểm bắt đầu Phase 1b (sửa app Android)

**Nội dung**: Khi nào bắt đầu thay đổi app RadioTest?

**Lựa chọn**:
- **Làm song song ngay**: Phase 1 web + Phase 1b app cùng lúc (nhanh hơn, nhưng phức tạp)
- **Tuần tự**: Chờ Phase 1 web ổn định → mở phiên riêng cho app (an toàn hơn, nhưng chậm)

**Quyết định của anh Nam**: ✅ **Làm luôn P1b song parallel**

**Ghi chú**: Khi Phase 1 web API sẵn sàng, sẽ mở phiên riêng cho sửa app Android. Sẽ có SOP riêng lúc đó. Anh Nam cài + test trên máy thật như mọi lần trước.

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 10: Ngưỡng khớp mờ khử trùng cellfile

**Nội dung**: Khoảng cách + góc độ để coi 2 trạm có khả năng là 1 trạm (mục 4.4.1)

**Đề xuất ban đầu**:
- Khoảng cách: **50 mét** (tính PostGIS `ST_DWithin`)
- Chênh lệch azimuth (hướng): **< 15 độ**
- Điều kiện khác: cùng nhà mạng, RAT, band

**Quyết định của anh Nam**: ✅ **30m + 10°** (chặt hơn đề xuất)

→ Nếu khớp: đưa vào bảng `cellfile_dedup_candidates` chờ admin duyệt (không tự động gộp)

**Ghi chú**: Ngưỡng tighter này sẽ giảm false positives (gộp nhầm các trạm khác nhau ở đô thị đông đúc), cần admin duyệt nhiều hơn nhưng chính xác hơn — phù hợp với nguyên tắc "không bịa số khi không chắc".

**Status**: ✅ ĐÃ CHỐT

---

## Quyết định 11: Thời điểm triển khai Phase 0.5 (thống kê sử dụng sớm)

**Nội dung**: Khi nào bắt đầu nhận dữ liệu `app_pings` từ app? (mục 4.1.1)

**Đề xuất hiện tại — Làm ngay**:
- **Tách riêng** khỏi Phase 1b (không phụ thuộc đồng bộ cellfile)
- **Bản vá app nhỏ**: chỉ thêm 1 lệnh gọi API (fire-and-forget), không sửa logic đo
- **Có Supabase → có thể deploy** Phase 0.5 ngay, không cần chờ Phase 1 web hay app lên store
- Admin Dashboard Phase 1 sẽ có sẵn phần hiển thị thống kê này

**Lựa chọn thay thế — Gộp với Phase 1b**:
- Chờ đợt sửa app lớn (Supabase Auth + đồng bộ cellfile)
- Một lần cài app, gọn hơn

**Quyết định của anh Nam**: ✅ **Làm ngay Phase 0.5** (tách riêng)

**Ghi chú**: Bản vá app nhỏ (chỉ thêm 1 lệnh gọi mạng), không đụng logic đo hiện có. Có thể deploy sớm để bắt đầu thu thập thống kê sử dụng ngay, không cần chờ Phase 1 web hay Phase 1b app lớn. Admin Dashboard Phase 1 sẽ có sẵn panel hiển thị dữ liệu này.

**Status**: ✅ ĐÃ CHỐT

---

## Tóm tắt trạng thái

| # | Quyết định | Status |
|---|---|---|
| 1 | Stack công nghệ | ✅ ĐÃ CHỐT |
| 2 | Cổng thanh toán (MoMo + VNPay + QR) | ✅ ĐÃ CHỐT |
| 3 | Hướng lấy dữ liệu | ✅ ĐÃ CHỐT |
| 4 | Gộp đăng nhập | ✅ ĐÃ CHỐT |
| 5 | Tên miền web | ✅ ĐÃ CHỐT |
| 6 | Cơ chế 3 lớp admin-only | ✅ ĐÃ CHỐT |
| 7 | Cách xin đồng ý đồng bộ | ✅ ĐÃ CHỐT |
| 8 | Danh sách nhà mạng | ✅ ĐÃ CHỐT |
| 9 | Thời điểm Phase 1b | ✅ ĐÃ CHỐT |
| 10 | Ngưỡng khử trùng cellfile | ✅ ĐÃ CHỐT |
| 11 | Thời điểm Phase 0.5 | ✅ ĐÃ CHỐT |

**🎉 TẤT CẢ 11 QUYẾT ĐỊNH ĐÃ CHỐT — SẴN SÀNG PHASE 1 BUILD**

---

## Tiếp theo

Sau khi anh Nam trả lời + chốt xong **11 quyết định này**, sẽ:
1. Cập nhật SOP.md (ghi rõ các quyết định đã chốt)
2. Bắt đầu **Phase 1 build** theo roadmap mục 7 trong SOP
3. Khởi tạo database schema (11 bảng + RLS policies)
4. Code auth flow (Supabase + Google OAuth)
5. Xây dựng user portal + admin dashboard skeleton

---

**Cách trả lời**: Anh Nam có thể reply trực tiếp cho mỗi quyết định (hoặc ghi vào file này), ví dụ:

> **Quyết định 2**: MoMo  
> **Quyết định 5**: Dùng tạm `.vercel.app`, sau này sẽ dùng domain `web-radio-test.com`  
> **Quyết định 10**: 50m + 15° hợp lý rồi
