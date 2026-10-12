import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Xóa tài khoản và dữ liệu — Signal Tracker',
  description: 'Hướng dẫn yêu cầu xóa tài khoản và dữ liệu của ứng dụng Signal Tracker.',
}

const CONTACT = 'namnv.vn@gmail.com'
const SUBJECT = encodeURIComponent('Yêu cầu xóa tài khoản Signal Tracker')
const BODY = encodeURIComponent(
  'Tôi muốn xóa tài khoản Signal Tracker và toàn bộ dữ liệu liên quan.\n\nEmail đăng ký: \n'
)

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 text-slate-800 leading-relaxed">
      <h1 className="text-3xl font-bold mb-2">Xóa tài khoản và dữ liệu — Signal Tracker</h1>
      <p className="text-sm text-slate-500 mb-8">Request account and data deletion</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Cách yêu cầu xóa</h2>
      <ol className="list-decimal pl-6 space-y-2">
        <li>
          Gửi email từ <b>địa chỉ email đã dùng để đăng ký</b> tới{' '}
          <a className="text-blue-700 underline" href={`mailto:${CONTACT}?subject=${SUBJECT}&body=${BODY}`}>
            {CONTACT}
          </a>{' '}
          với tiêu đề “Yêu cầu xóa tài khoản Signal Tracker”.
        </li>
        <li>Chúng tôi xác minh yêu cầu và xóa tài khoản trong vòng 30 ngày, sau đó xác nhận qua email.</li>
      </ol>

      <h2 className="text-xl font-semibold mt-8 mb-2">Dữ liệu bị xóa</h2>
      <p>
        Tài khoản (email, họ tên), toàn bộ phiên đo và dòng kết quả đo đã tải lên (gồm vị trí và
        thông số mạng), bản ghi đồng ý điều khoản và mã thiết bị gắn với tài khoản.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">Dữ liệu có thể được giữ lại</h2>
      <p>
        Thống kê sử dụng tổng hợp đã ẩn danh (không còn gắn với bạn) và dữ liệu mà pháp luật yêu cầu
        phải lưu giữ. Logfile và cell file lưu trên điện thoại của bạn do bạn tự quản lý và bị xóa
        khi gỡ cài đặt ứng dụng.
      </p>

      <p className="mt-8 text-sm">
        Xem thêm <a className="text-blue-700 underline" href="/privacy">Chính sách quyền riêng tư</a>.
      </p>

      <hr className="my-10" />
      <p>
        <b>English:</b> To delete your Signal Tracker account and associated data, email{' '}
        <a className="text-blue-700 underline" href={`mailto:${CONTACT}?subject=Delete%20my%20Signal%20Tracker%20account`}>
          {CONTACT}
        </a>{' '}
        from the address you registered with. We delete the account, uploaded measurements (including
        location and radio parameters), consent records and linked device IDs within 30 days.
        Anonymised aggregate usage statistics may be retained.
      </p>
    </main>
  )
}
