import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import IndonesiaMapReal from "../../components/IndonesiaMapReal";

type Report = {
  id: number;
  dispatch_no: string;
  customer_name: string;
  customer_address: string;
  status: "open" | "progress" | "done";
  teknisi_id?: number;
};

type ProvinceGroup = {
  id: number;
  hospital: string;
  address: string;
  maintenance: number;
};

const mockProvinces: ProvinceGroup[] = [
  { id: 1, hospital: "RS Citra", address: "Jl. Diponegoro 71, Jakarta", maintenance: 4 },
  { id: 2, hospital: "RS Mandiri", address: "Jl. S Parman, Bandung", maintenance: 2 },
  { id: 3, hospital: "RS Pelita", address: "Jl. Kusuma, Surabaya", maintenance: 3 },
];

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/reports")
      .then((res) => setReports(res.data.data || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    return {
      total: reports.length,
      progress: reports.filter((r) => r.status === "progress").length,
      done: reports.filter((r) => r.status === "done").length,
      open: reports.filter((r) => r.status === "open").length,
    };
  }, [reports]);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-3xl bg-slate-100/80 p-6 shadow-sm md:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Overview</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Peta Mitra</h2>
            </div>
            <button className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600">
              Lihat Maps
            </button>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <IndonesiaMapReal />
          </div>
        </div>

        <div className="col-span-12 flex flex-col gap-4 md:col-span-4">
          <DashboardCard title="Task Remaining" value={summary.open} description="Status open" />
          <DashboardCard title="Task In Progress" value={summary.progress} description="Sedang ditangani" />
          <DashboardCard title="Task Done" value={summary.done} description="Selesai minggu ini" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Provinsi</h3>
          <div className="flex gap-3">
            <button className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-600">Add</button>
            <button className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-600">Delete</button>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-4">
                  <input type="checkbox" className="h-4 w-4 accent-slate-900" />
                </th>
                <th className="p-4">ID</th>
                <th className="p-4">Rumah Sakit</th>
                <th className="p-4">Alamat</th>
                <th className="p-4">Total Maintenance</th>
              </tr>
            </thead>
            <tbody>
              {mockProvinces.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="p-4">
                    <input type="checkbox" className="h-4 w-4 accent-slate-900" />
                  </td>
                  <td className="p-4 font-semibold text-slate-600">{row.id}</td>
                  <td className="p-4 font-medium text-slate-900">{row.hospital}</td>
                  <td className="p-4 text-slate-500">{row.address}</td>
                  <td className="p-4 text-slate-500">{row.maintenance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Dispatch Terbaru</h3>
            <p className="text-sm text-slate-500">Monitor status harian</p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-4">No Dispatch</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Alamat</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="p-4 text-center text-slate-500" colSpan={4}>
                    Loading reports...
                  </td>
                </tr>
              )}
              {!loading && reports.length === 0 && (
                <tr>
                  <td className="p-4 text-center text-slate-500" colSpan={4}>
                    Belum ada data laporan.
                  </td>
                </tr>
              )}
              {reports.slice(0, 5).map((report) => (
                <tr key={report.id} className="border-t border-slate-100">
                  <td className="p-4 font-semibold text-slate-900">{report.dispatch_no}</td>
                  <td className="p-4 text-slate-700">{report.customer_name}</td>
                  <td className="p-4 text-slate-500">{report.customer_address}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DashboardCard({ title, value, description }: { title: string; value: number; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );
}

function badgeClass(status: Report["status"]) {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-700";
    case "progress":
      return "bg-sky-100 text-sky-700";
    case "done":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}
