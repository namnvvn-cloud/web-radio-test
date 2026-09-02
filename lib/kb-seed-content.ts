/**
 * Seed content for the Chatbot RAG knowledge base (kb_documents/kb_chunks).
 *
 * Loaded by POST /api/admin/kb/seed (lib/chunk-text.ts + lib/voyage.ts do
 * the chunking and embedding). Two categories are covered here:
 *   - 'glossary': standard 3GPP radio-measurement terminology (RSRP, RSRQ,
 *     SINR, PCI) -- definitions and reporting ranges are from the public
 *     3GPP specs (TS 36.214 for LTE, TS 38.215 for NR measurement
 *     definitions; TS 36.133/38.133 for reporting ranges). Quality bands
 *     ("tốt/trung bình/yếu") are common industry reference conventions,
 *     not a 3GPP-mandated threshold -- worded that way in the content
 *     itself so the chatbot doesn't overstate it as a hard spec value.
 *   - 'app_guide': how the actual pages in this app work, grounded in the
 *     real routes/columns in this repo (app/user/cellfiles, app/user/
 *     measurements, app/user/reports, the CSV columns accepted by
 *     app/api/cellfiles and app/api/measurements) -- not guessed.
 *
 * Deliberately NOT included: a changelog/release-notes document -- there
 * is no real version-history record to source one from, and inventing
 * dates/features would fail the "no fabricated content" requirement.
 * Add one here (category: 'changelog') once real release notes exist.
 */

export type KbSeedDocument = {
  title: string
  category: 'glossary' | 'app_guide' | 'faq'
  source: string
  content: string
}

export const KB_SEED_DOCUMENTS: KbSeedDocument[] = [
  {
    title: 'RSRP là gì',
    category: 'glossary',
    source: '3GPP TS 36.214 / TS 38.215 (định nghĩa đo lường)',
    content: `RSRP (Reference Signal Received Power) là công suất thu trung bình của các tín hiệu tham chiếu (reference signal) trên băng thông đo, tính bằng dBm. Đây là chỉ số cơ bản đánh giá độ mạnh tín hiệu từ 1 cell cụ thể, dùng để so sánh và chọn cell phục vụ (cell selection/reselection, handover).

Dải giá trị theo 3GPP: LTE khoảng -140 đến -44 dBm (TS 36.133), NR khoảng -156 đến -31 dBm (TS 38.133). Ngưỡng đánh giá "tốt/trung bình/yếu" không phải quy định cứng của 3GPP mà là quy ước phổ biến trong ngành, ví dụ tham khảo:
- Tốt: RSRP > -85 dBm
- Trung bình: -95 đến -85 dBm
- Yếu: -105 đến -95 dBm
- Rất yếu: < -105 dBm

RSRP chỉ phản ánh độ mạnh tín hiệu, không phản ánh nhiễu/chất lượng -- 2 điểm đo có RSRP giống nhau vẫn có thể trải nghiệm khác nhau nếu mức nhiễu khác nhau. Xem thêm RSRQ và SINR để đánh giá đầy đủ hơn.`,
  },
  {
    title: 'RSRQ là gì',
    category: 'glossary',
    source: '3GPP TS 36.214 / TS 38.215 (định nghĩa đo lường)',
    content: `RSRQ (Reference Signal Received Quality) đo chất lượng tín hiệu, kết hợp cả độ mạnh tín hiệu và mức nhiễu/tải của cell. Về công thức, RSRQ liên hệ với tỷ số N × RSRP / RSSI (N là số resource block đo được, RSSI là tổng công suất thu được trên băng thông đó bao gồm cả nhiễu). Đơn vị: dB.

Dải giá trị theo 3GPP (TS 36.133): khoảng -19.5 đến -3 dB (một số phiên bản mở rộng đến 2.5 dB). Quy ước tham khảo phổ biến trong ngành:
- Tốt: RSRQ > -10 dB
- Trung bình: -15 đến -10 dB
- Yếu: < -15 dB

RSRQ hữu ích để phát hiện các trường hợp RSRP cao nhưng chất lượng kém do nhiễu (ví dụ vùng chồng lấn nhiều cell, tải cao) -- điều mà chỉ nhìn RSRP sẽ bỏ sót.`,
  },
  {
    title: 'SINR là gì',
    category: 'glossary',
    source: 'Quy ước đo lường phổ biến trong ngành viễn thông (không phải 1 chỉ số được 3GPP định nghĩa duy nhất như RSRP/RSRQ)',
    content: `SINR (Signal to Interference plus Noise Ratio) là tỷ số giữa công suất tín hiệu mong muốn với tổng công suất nhiễu (interference) và tạp âm (noise), tính bằng dB. SINR càng cao, kênh truyền càng "sạch", tốc độ dữ liệu tiềm năng càng cao (SINR là 1 trong các yếu tố đầu vào để thiết bị chọn MCS/CQI khi báo cáo lên mạng).

Khác với RSRP/RSRQ, SINR không có 1 định nghĩa đo lường chuẩn hoá duy nhất trong 3GPP -- giá trị thiết bị hiển thị (bao gồm cả app đo trong hệ thống này) thường lấy từ chip modem, có thể khác nhau tuỳ hãng chip. Quy ước tham khảo phổ biến:
- Rất tốt: SINR > 20 dB
- Tốt: 13-20 dB
- Trung bình: 0-13 dB
- Yếu: < 0 dB (nhiễu/tạp âm lấn át tín hiệu)`,
  },
  {
    title: 'PCI là gì',
    category: 'glossary',
    source: '3GPP TS 36.211 (LTE) / TS 38.211 (NR)',
    content: `PCI (Physical Cell Identity) là mã nhận dạng vật lý của 1 cell, dùng để thiết bị phân biệt các cell phát cùng tần số trong vùng phủ chồng lấn. LTE có 504 giá trị PCI (0-503, chia thành 168 nhóm x 3 sector ID), NR có 1008 giá trị (0-1007).

Trong quy hoạch mạng, PCI cần được gán sao cho 2 cell lân cận (hoặc cell có thể gây nhiễu lẫn nhau) không trùng hoặc không mod-3/mod-30 trùng nhau (tuỳ RAT) -- PCI trùng/xung đột (PCI confusion/collision) là nguyên nhân phổ biến gây lỗi handover và đo sai chất lượng vùng phủ.`,
  },
  {
    title: 'Hướng dẫn: tải lên dữ liệu trạm (Cell Files)',
    category: 'app_guide',
    source: 'app/user/cellfiles, app/api/cellfiles',
    content: `Trang "Cell Files" (Menu User Portal) dùng để tải lên danh sách vị trí và thông số trạm/cell -- dữ liệu này dùng làm nền tham chiếu khi phân tích kết quả đo (so khớp điểm đo với cell gần nhất).

Định dạng file: CSV, với các cột: site_name, cell_name, latitude, longitude, rat (giá trị hợp lệ: 2G, 3G, 4G, 5G), band, nha_mang, azimuth, radius. Mỗi dòng là 1 cell/sector.

Ví dụ 1 dòng hợp lệ:
site_name=HNI001, cell_name=HNI001_L1, latitude=21.028511, longitude=105.804817, rat=4G, band=B3, nha_mang=MobiFone, azimuth=60, radius=500

Sau khi tải lên, danh sách cell hiển thị trên trang Cell Files, gắn với tài khoản đã upload (mỗi user chỉ thấy cell file của chính mình, trừ admin có thể xem toàn bộ để hỗ trợ).`,
  },
  {
    title: 'Hướng dẫn: tạo phiên đo và tải lên log đo (Measurements)',
    category: 'app_guide',
    source: 'app/user/measurements, app/api/measurements',
    content: `Trang "Measurements" dùng để tạo 1 phiên đo (logfile session, có thể đặt tên phiên) và tải lên các điểm đo thu thập được.

Mỗi điểm đo (measurement) gồm: timestamp, latitude, longitude, cell_id, cell_name, rsrp, rsrq, sinr, rat (2G/3G/4G/5G), band, nha_mang, download_speed_mbps, upload_speed_mbps.

Ví dụ 1 dòng hợp lệ:
timestamp=2026-09-02T08:00:00Z, latitude=21.028511, longitude=105.804817, cell_id=12345, cell_name=HNI001_L1, rsrp=-85, rsrq=-10, sinr=18, rat=4G, band=B3, nha_mang=MobiFone, download_speed_mbps=45.2, upload_speed_mbps=12.1

Sau khi có 1 phiên đo, người dùng có thể sang trang "Reports" để tạo báo cáo từ phiên đo đó.`,
  },
  {
    title: 'Hướng dẫn: tạo và tải báo cáo (Reports)',
    category: 'app_guide',
    source: 'app/user/reports, app/api/reports',
    content: `Trang "Reports" cho phép tạo báo cáo từ 1 phiên đo (session) đã tải lên ở trang Measurements. Chọn session, chọn định dạng báo cáo -- hệ thống hỗ trợ 4 định dạng: word, excel, kml, png.

Sau khi bấm tạo, hệ thống xử lý và lưu file vào kho lưu trữ (Storage); báo cáo xuất hiện trong danh sách "Your Reports" để tải về. Mỗi báo cáo gắn với đúng user đã tạo (admin có thể xem để hỗ trợ, không chỉnh sửa nội dung báo cáo của user).`,
  },
  {
    title: 'Tài khoản: gói dịch vụ, khoá tài khoản, quên mật khẩu',
    category: 'faq',
    source: 'lib/types.ts (UserProfile), app/api/auth/signin, app/api/admin/users',
    content: `Gói dịch vụ: mỗi tài khoản có subscription_tier là "free" hoặc "pro". Nâng cấp/hạ cấp gói hiện do admin thao tác qua Admin Dashboard (trang User Management); quy trình thanh toán tự động (MoMo/VNPay/Stripe) chưa triển khai ở giai đoạn hiện tại.

Tài khoản bị khoá (is_locked = true): admin có thể khoá 1 tài khoản khi cần (ví dụ nghi ngờ vi phạm) -- tài khoản bị khoá vẫn đăng nhập đúng mật khẩu nhưng hệ thống sẽ từ chối cấp phiên đăng nhập với thông báo "This account has been locked. Contact support." Người dùng cần liên hệ admin để được mở khoá.

Quên mật khẩu: admin có thể gửi email đặt lại mật khẩu hộ người dùng qua chức năng "Reset password" trong User Management -- admin không xem và không tự đặt mật khẩu thay người dùng, chỉ kích hoạt email đặt lại mật khẩu chuẩn của Supabase Auth gửi đến đúng email của tài khoản đó.

Nhà mạng mặc định (nha_mang_mac_dinh): mỗi tài khoản chọn 1 nhà mạng mặc định khi đăng ký, dùng làm giá trị gợi ý khi tải lên dữ liệu cell/đo (có thể thay đổi theo từng file/phiên đo nếu cần).`,
  },
]
