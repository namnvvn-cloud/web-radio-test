import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chính sách quyền riêng tư — Signal Tracker',
  description: 'Chính sách quyền riêng tư của ứng dụng Signal Tracker (Privacy Policy).',
}

const UPDATED = '09/10/2026'
const CONTACT = 'namnv.vn@gmail.com'

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 text-slate-800 leading-relaxed">
      <h1 className="text-3xl font-bold mb-2">Chính sách quyền riêng tư — Signal Tracker</h1>
      <p className="text-sm text-slate-500 mb-8">Cập nhật lần cuối: {UPDATED} · Privacy Policy (English summary at the end)</p>

      <p className="mb-4">
        Signal Tracker (“ứng dụng”) là ứng dụng Android đọc thông số mạng di động từ chính điện
        thoại của bạn (Cell ID, PCI, TAC, băng tần, RSRP, RSRQ, SINR…), đo tốc độ mạng và hiển thị
        trên bản đồ. Ứng dụng là sản phẩm độc lập, không thuộc và không đại diện cho bất kỳ nhà
        mạng nào. Trang này mô tả dữ liệu ứng dụng thu thập, cách sử dụng và quyền của bạn.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Dữ liệu chúng tôi thu thập</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <b>Vị trí chính xác (GPS)</b> — chỉ khi ứng dụng đang mở (foreground), để gắn vị trí vào
          mỗi mẫu đo và vẽ bản đồ. Ứng dụng không thu thập vị trí khi chạy nền.
        </li>
        <li>
          <b>Thông số mạng di động</b> — mã nhà mạng (MCC/MNC), công nghệ (2G/3G/4G/5G), băng tần,
          EARFCN/ARFCN, Cell ID, TAC/LAC, PCI, RSRP/RSRQ/SINR/RSSI và các chỉ số tương tự, đọc từ
          modem của máy. Ứng dụng không đọc nội dung cuộc gọi, tin nhắn hay danh bạ.
        </li>
        <li>
          <b>Kết quả đo hiệu năng</b> — độ trễ, tốc độ tải xuống/tải lên khi bạn chủ động chạy phép
          đo.
        </li>
        <li>
          <b>Thông tin tài khoản</b> — email, họ tên và mật khẩu khi bạn đăng ký. Mật khẩu được
          dịch vụ xác thực băm trước khi lưu; chúng tôi không đọc được mật khẩu của bạn.
        </li>
        <li>
          <b>Mã thiết bị ngẫu nhiên và thống kê sử dụng</b> — một mã ngẫu nhiên do ứng dụng tạo
          (không phải IMEI, số điện thoại hay mã quảng cáo), loại sự kiện (mở app, đăng nhập),
          phiên bản ứng dụng — để đếm số lượng người dùng và theo dõi lỗi phiên bản.
        </li>
        <li>
          <b>Bản ghi đồng ý điều khoản</b> — phiên bản điều khoản và thời điểm bạn đồng ý.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. Dữ liệu lưu trên máy của bạn</h2>
      <p>
        Logfile đo, cell file bạn nhập từ Excel, ảnh báo cáo và cài đặt được lưu trong bộ nhớ riêng
        của ứng dụng trên điện thoại. Cell file bạn nhập hiện không được tải lên máy chủ. Bạn có thể
        xuất/chia sẻ các file này theo ý mình. Gỡ cài đặt ứng dụng sẽ xóa dữ liệu cục bộ.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Dữ liệu gửi lên máy chủ</h2>
      <p>
        Khi bạn đăng nhập và thực hiện phiên đo, các dòng kết quả đo (thời gian, vị trí, thông số
        mạng, hiệu năng) được gửi qua kết nối HTTPS tới máy chủ của chúng tôi để lưu và hiển thị
        trong tài khoản của bạn trên trang web quản lý. Thông tin tài khoản, bản ghi đồng ý điều
        khoản và thống kê sử dụng cũng được gửi lên máy chủ như mô tả ở mục 1.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Mục đích sử dụng</h2>
      <p>
        Cung cấp chức năng đo và hiển thị; lưu kết quả đo của bạn; xác thực tài khoản; thống kê
        tổng hợp để cải thiện ứng dụng; đáp ứng yêu cầu pháp lý. Chúng tôi không bán dữ liệu cá
        nhân, không hiển thị quảng cáo và không chia sẻ dữ liệu cho mục đích quảng cáo.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. Bên thứ ba xử lý dữ liệu</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li><b>Supabase</b> — dịch vụ xác thực và cơ sở dữ liệu lưu tài khoản, kết quả đo.</li>
        <li><b>Vercel</b> — dịch vụ lưu trữ máy chủ web/API của chúng tôi.</li>
        <li>
          <b>Nhà cung cấp bản đồ</b> (OpenFreeMap/OpenStreetMap, Esri cho ảnh vệ tinh) — khi bạn xem
          bản đồ, thiết bị của bạn tải ô bản đồ trực tiếp từ các nhà cung cấp này, họ có thể thấy
          địa chỉ IP và vùng bản đồ bạn xem theo chính sách của họ.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Lưu trữ và xóa dữ liệu</h2>
      <p>
        Dữ liệu tài khoản và kết quả đo được lưu cho đến khi bạn yêu cầu xóa. Bạn có thể yêu cầu xóa
        tài khoản và toàn bộ dữ liệu liên quan tại{' '}
        <a className="text-blue-700 underline" href="/delete-account">trang Xóa tài khoản</a> hoặc
        trong ứng dụng (Cài đặt → Xóa tài khoản). Chúng tôi xử lý yêu cầu trong vòng 30 ngày; một số
        dữ liệu thống kê đã ẩn danh, không còn gắn với bạn, có thể được giữ lại.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">7. Quyền của bạn</h2>
      <p>
        Bạn có quyền truy cập, chỉnh sửa, xuất và xóa dữ liệu cá nhân của mình, và có thể thu hồi
        quyền vị trí bất cứ lúc nào trong Cài đặt hệ thống Android (ứng dụng vẫn hiển thị thông số
        nhưng không thể đo theo vị trí). Gửi yêu cầu tới {CONTACT}.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">8. Bảo mật</h2>
      <p>
        Dữ liệu truyền qua HTTPS; truy cập dữ liệu tài khoản yêu cầu xác thực. Không có hệ thống nào
        an toàn tuyệt đối; nếu phát hiện sự cố ảnh hưởng đến dữ liệu của bạn chúng tôi sẽ thông báo
        theo quy định pháp luật.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">9. Trẻ em</h2>
      <p>Ứng dụng không dành cho trẻ em dưới 13 tuổi và chúng tôi không cố ý thu thập dữ liệu của các em.</p>

      <h2 className="text-xl font-semibold mt-8 mb-2">10. Thay đổi chính sách và liên hệ</h2>
      <p>
        Khi chính sách thay đổi, chúng tôi cập nhật ngày ở đầu trang này. Liên hệ:{' '}
        <a className="text-blue-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <hr className="my-10" />
      <h2 className="text-xl font-semibold mb-2">English summary</h2>
      <p className="mb-2">
        Signal Tracker reads cellular network parameters from your own phone and shows them on a map.
        It collects precise location (only while the app is open), cellular radio parameters,
        speed/latency test results you start, your account details (email, name), a random device ID
        and basic usage events. Measurement data is sent over HTTPS to our servers (Supabase, Vercel)
        when you are signed in. We do not sell personal data and show no ads. Map tiles are loaded
        from third-party providers (OpenFreeMap/OpenStreetMap, Esri). You can request deletion of
        your account and data at /delete-account or in the app (Settings → Delete account); we
        process requests within 30 days. Contact: {CONTACT}.
      </p>
    </main>
  )
}
