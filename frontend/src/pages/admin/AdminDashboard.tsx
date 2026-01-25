import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, QrCode, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import IndonesiaMapReal from "../../components/IndonesiaMapReal";
import type { ProvinceWithPartners, PartnerLocation } from "../../types/partners";
import { provinceOptions, getProvinceOption } from "../../data/provinces";

type Report = {
  id: number;
  dispatch_no: string;
  customer_name: string;
  customer_address: string;
  status: "open" | "progress" | "done";
  dispatch_date?: string;
  teknisi_id?: number;
  form_payload?: {
    dispatchDate?: string;
    notifOpen?: string;
  };
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapFocused, setIsMapFocused] = useState(false);
  const [partners, setPartners] = useState<PartnerLocation[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<number[]>([]);
  const [partnerForm, setPartnerForm] = useState({
    province_code: provinceOptions[0]?.code ?? "",
    hospital_name: "",
    address: "",
    maintenance_count: 0,
  });
  const [partnerSubmitting, setPartnerSubmitting] = useState(false);
  const [partnerDeleting, setPartnerDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get("/reports")
      .then((res) => setReports(res.data.data || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const fetchPartners = () => {
    setPartnersLoading(true);
    api
      .get("/partners")
      .then((res) => setPartners(res.data.data || []))
      .catch(() => setPartners([]))
      .finally(() => setPartnersLoading(false));
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (!isMapFocused) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMapFocused]);

  const summary = useMemo(() => {
    return {
      total: reports.length,
      progress: reports.filter((r) => r.status === "progress").length,
      done: reports.filter((r) => r.status === "done").length,
      open: reports.filter((r) => r.status === "open").length,
    };
  }, [reports]);

  const provincesForMap = useMemo<ProvinceWithPartners[]>(() => {
    const grouped: Record<string, ProvinceWithPartners> = {};
    partners.forEach((partner) => {
      if (!grouped[partner.province_code]) {
        grouped[partner.province_code] = {
          id: partner.province_code,
          name: partner.province_name,
          partners: [],
        };
      }
      grouped[partner.province_code].partners.push({
        id: partner.id,
        name: partner.hospital_name,
        address: partner.address,
        maintenance: partner.maintenance_count,
      });
    });
    return Object.values(grouped);
  }, [partners]);

  const handlePartnerFieldChange = (field: keyof typeof partnerForm, value: string) => {
    setPartnerForm((prev) => ({
      ...prev,
      [field]: field === "maintenance_count" ? Number(value) : value,
    }));
  };

  const handleCreatePartner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partnerForm.province_code || !partnerForm.hospital_name || !partnerForm.address) {
      alert("Please fill all fields before submitting.");
      return;
    }
    const province = getProvinceOption(partnerForm.province_code);
    setPartnerSubmitting(true);
    try {
      await api.post("/partners", {
        province_code: partnerForm.province_code,
        province_name: province?.name ?? partnerForm.province_code,
        hospital_name: partnerForm.hospital_name,
        address: partnerForm.address,
        maintenance_count: partnerForm.maintenance_count,
      });
      setPartnerForm({
        province_code: partnerForm.province_code,
        hospital_name: "",
        address: "",
        maintenance_count: 0,
      });
      fetchPartners();
    } catch (error) {
      console.error(error);
      alert("Failed to add partner. Please try again.");
    } finally {
      setPartnerSubmitting(false);
    }
  };

  const togglePartnerSelection = (id: number) => {
    setSelectedPartnerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allSelected = partners.length > 0 && selectedPartnerIds.length === partners.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedPartnerIds([]);
    } else {
      setSelectedPartnerIds(partners.map((partner) => partner.id));
    }
  };

  const handleDeletePartners = async () => {
    if (selectedPartnerIds.length === 0) return;
    if (!confirm("Delete selected partner hospitals?")) return;
    setPartnerDeleting(true);
    try {
      await Promise.all(selectedPartnerIds.map((id) => api.delete(`/partners/${id}`)));
      setSelectedPartnerIds([]);
      fetchPartners();
    } catch (error) {
      console.error(error);
      alert("Failed to delete one or more partners.");
    } finally {
      setPartnerDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-3xl bg-slate-100/80 p-6 shadow-sm md:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Overview</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Partner Map</h2>
            </div>
            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-white"
              onClick={() => setIsMapFocused(true)}
            >
              View Map
            </button>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <IndonesiaMapReal provinces={provincesForMap} />
          </div>
        </div>

        <div className="col-span-12 flex flex-col gap-4 md:col-span-4">
          <DashboardCard title="Task Remaining" value={summary.open} description="Open status" />
          <DashboardCard title="Task In Progress" value={summary.progress} description="Currently being handled" />
          <DashboardCard title="Task Done" value={summary.done} description="Completed this week" />
        </div>
      </section>

      {isMapFocused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-6xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Focused View</p>
                <h3 className="text-xl font-semibold text-slate-900">Partner Coverage Map</h3>
              </div>
              <button
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                onClick={() => setIsMapFocused(false)}
                aria-label="Close map"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-6 pt-2">
              <p className="text-sm text-slate-500">
                Explore partner distribution across Indonesia with a larger canvas. Click any province to view partner details.
              </p>
              <div className="mt-4 h-[70vh] rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                <IndonesiaMapReal maxHeight="100%" provinces={provincesForMap} />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                  onClick={() => setIsMapFocused(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Partner Provinces</h3>
            <p className="text-sm text-slate-500">
              Add partner hospitals to power the coverage map. Use the table to remove outdated entries.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <form
              onSubmit={handleCreatePartner}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
            >
              <h4 className="text-base font-semibold text-slate-900">Add Partner</h4>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Province</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={partnerForm.province_code}
                    onChange={(e) => handlePartnerFieldChange("province_code", e.target.value)}
                  >
                    {provinceOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Hospital Name</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="e.g., RS Citra Medika"
                    value={partnerForm.hospital_name}
                    onChange={(e) => handlePartnerFieldChange("hospital_name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Address</label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    rows={3}
                    placeholder="Street, City"
                    value={partnerForm.address}
                    onChange={(e) => handlePartnerFieldChange("address", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Maintenance Visits</label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={partnerForm.maintenance_count}
                    onChange={(e) => handlePartnerFieldChange("maintenance_count", e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={partnerSubmitting}
                  className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {partnerSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Add Partner"
                  )}
                </button>
              </div>
            </form>

            <div className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-900">Partner List</h4>
                <button
                  onClick={handleDeletePartners}
                  disabled={selectedPartnerIds.length === 0 || partnerDeleting}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {partnerDeleting ? "Deleting..." : `Delete (${selectedPartnerIds.length})`}
                </button>
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-slate-900"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all partners"
                        />
                      </th>
                      <th className="p-4">Province</th>
                      <th className="p-4">Hospital</th>
                      <th className="p-4">Address</th>
                      <th className="p-4 text-right">Maintenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnersLoading && (
                      <tr>
                        <td className="p-4 text-center text-slate-500" colSpan={5}>
                          Loading partners...
                        </td>
                      </tr>
                    )}
                    {!partnersLoading && partners.length === 0 && (
                      <tr>
                        <td className="p-4 text-center text-slate-500" colSpan={5}>
                          No partner hospitals yet.
                        </td>
                      </tr>
                    )}
                    {!partnersLoading &&
                      partners.map((partner) => (
                        <tr key={partner.id} className="border-t border-slate-100">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-slate-900"
                              checked={selectedPartnerIds.includes(partner.id)}
                              onChange={() => togglePartnerSelection(partner.id)}
                              aria-label={`Select ${partner.hospital_name}`}
                            />
                          </td>
                          <td className="p-4 font-semibold text-slate-600">{partner.province_name}</td>
                          <td className="p-4 font-medium text-slate-900">{partner.hospital_name}</td>
                          <td className="p-4 text-slate-500">{partner.address}</td>
                          <td className="p-4 text-right text-slate-600">{partner.maintenance_count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Service Report</p>
            <h3 className="text-lg font-semibold text-slate-900">Assigned Reports</h3>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-white/95 shadow-sm">
          <table className="w-full table-fixed border-collapse text-sm text-slate-800">
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
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Loading reports...
                  </td>
                </tr>
              )}
              {!loading && reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No reports available.
                  </td>
                </tr>
              )}
              {!loading &&
                reports.map((report) => {
                  const fallbackDate = report.form_payload?.dispatchDate || report.form_payload?.notifOpen;
                  const dateRaw = report.dispatch_date || fallbackDate;
                  const dateObj = dateRaw ? new Date(dateRaw) : null;
                  const dateLabel = dateObj && !Number.isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "—";
                  const statusClass =
                    report.status === "done"
                      ? "bg-emerald-100 text-emerald-700"
                      : report.status === "progress"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-200 text-slate-700";

                  return (
                    <tr key={report.id} className="border-t border-slate-100 bg-white odd:bg-white even:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{report.dispatch_no}</td>
                      <td className="px-4 py-3 text-slate-700">{dateLabel}</td>
                      <td className="px-4 py-3 text-slate-700">{report.customer_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${statusClass}`}>
                          {report.status === "progress" ? "Task in progress" : report.status === "done" ? "Complete" : "Open"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/teknisi/reports/${report.id}`)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:border-slate-300"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

