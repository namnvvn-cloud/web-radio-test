import Link from "next/link";

export const metadata = {
  title: "Signal Tracker: 4G 5G Monitor",
  description:
    "Ứng dụng Android đo sóng 4G/5G: Cell ID, RSRP, SINR, tốc độ mạng và bản đồ vùng phủ. Android app to measure 4G/5G signal.",
};

const features = [
  {
    title: "Thông số vô tuyến thời gian thực",
    body: "Cell ID, PCI, TAC, EARFCN/NR-ARFCN, băng tần, RSRP, RSRQ, SINR cho 2G/3G/4G/5G (kể cả 5G NSA khi thiết bị cung cấp).",
  },
  {
    title: "Bản đồ vùng phủ",
    body: "Bản đồ đường phố và vệ tinh, điểm đo tô màu theo ngưỡng, đường tuyến di chuyển, trạm và hướng sóng từ cell file của bạn.",
  },
  {
    title: "Đo tốc độ mạng",
    body: "Đo tốc độ tải xuống/tải lên và độ trễ ngay trên điện thoại.",
  },
  {
    title: "Logfile, thống kê và báo cáo",
    body: "Ghi logfile mỗi phiên đo, thống kê theo ngưỡng, xuất CSV, KML/KMZ, Excel và báo cáo Word.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16 text-slate-800">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
          Android · 4G / 5G
        </p>
        <h1 className="text-4xl font-bold text-slate-900">
          Signal Tracker: 4G 5G Monitor
        </h1>
        <p className="text-lg text-slate-600">
          Đọc trực tiếp thông số mạng di động từ modem điện thoại và hiển thị
          trên bản đồ, giúp kỹ thuật viên viễn thông và người quan tâm chất lượng
          sóng kiểm tra vùng phủ nhanh chóng.
        </p>
        <p className="text-sm text-slate-500">
          Signal Tracker reads cellular network parameters straight from your
          phone&apos;s modem and plots them on a map. Coming soon on Google Play.
        </p>
        <p className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          Sắp ra mắt trên Google Play
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 p-5">
            <h2 className="mb-2 text-base font-semibold text-slate-900">
              {f.title}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
        <p>
          Ứng dụng độc lập, không thuộc và không đại diện cho bất kỳ nhà mạng
          nào. Cần quyền Vị trí chính xác và bật Định vị của máy để Android cho
          phép đọc thông tin ô sóng. Một số dòng máy chỉ trả về ô đang phục vụ.
        </p>
      </section>

      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-6 text-sm text-slate-600">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link className="text-sky-700 hover:underline" href="/privacy">
            Chính sách quyền riêng tư
          </Link>
          <Link className="text-sky-700 hover:underline" href="/delete-account">
            Xóa tài khoản và dữ liệu
          </Link>
          <a
            className="text-sky-700 hover:underline"
            href="mailto:namnv.vn@gmail.com"
          >
            Liên hệ: namnv.vn@gmail.com
          </a>
        </div>
        <p className="text-xs text-slate-400">
          Dữ liệu bản đồ: © OpenStreetMap contributors · Ảnh vệ tinh: Esri.
        </p>
      </footer>
    </main>
  );
}
