import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode } from "lucide-react";
import { api } from "../../lib/api";

interface ReportHistory {
  id: number;
  dispatch_no: string;
  customer_name: string;
  status: "open" | "progress" | "done";
  updated_at: string;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [histories, setHistories] = useState<ReportHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/reports", { params: { status: "done" } })
      .then((res) => setHistories(res.data.data || []))
      .catch(() => setHistories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">History</p>
        <h1 className="text-2xl font-semibold text-slate-900">Service Report History</h1>
        <p className="text-sm text-slate-500">Completed dispatches with their final status.</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="w-[26%] px-4 py-3 text-left">Dispatch No</th>
                <th className="w-[18%] px-4 py-3 text-left">Date</th>
                <th className="w-[24%] px-4 py-3 text-left">Customer</th>
                <th className="w-[16%] px-4 py-3 text-left">Status</th>
                <th className="w-[16%] px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Loading history...
                  </td>
                </tr>
              )}
              {!loading && histories.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No completed reports yet.
                  </td>
                </tr>
              )}
              {histories.map((report) => (
                <tr key={report.id} className="border-t border-slate-100 bg-white odd:bg-white even:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{report.dispatch_no}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(report.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-3 text-slate-700">{report.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                      DONE
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/teknisi/reports/${report.id}`)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
                    >
                      <QrCode className="h-4 w-4" />
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
