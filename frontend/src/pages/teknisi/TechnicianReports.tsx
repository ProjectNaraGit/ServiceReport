import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Calendar, Mail, Plus, Printer, QrCode } from "lucide-react";
import qrSurvey from "../../assets/qrSurvey.svg";

type DeviceRow = {
  partNo: string;
  description: string;
  serialNo: string;
  swVersion: string;
  location: string;
  workStart: string;
  workFinish: string;
};

type ReportDetail = {
  id: number;
  dispatch_no: string;
  customer_name: string;
  device_name: string;
  status: "open" | "progress" | "done";
  form_payload?: ReportFormValues & { problemPhotos?: string[]; status?: string };
  teknisi_payload?: ReportFormValues & { problemPhotos?: string[]; status?: string };
};

type SparepartRow = {
  qty: string;
  partNo: string;
  description: string;
  status: string;
};

type ToolRow = {
  code: string;
  description: string;
  usableLimit: string;
};

type ReportFormValues = {
  dispatchNo: string;
  dispatchDate: string;
  fseName: string;
  teknisiId: number | null;
  customerName: string;
  customerPerson: string;
  department: string;
  address: string;
  customerRef: string;
  phone: string;
  email: string;
  notifOpen: string;
  finalizedDate: string;
  jobInfo: string[];
  problemDescription: string;
  deviceRows: DeviceRow[];
  tools: ToolRow[];
  spareparts: SparepartRow[];
  serviceDescription: string;
  travelStart: string;
  travelFinish: string;
  returnStart: string;
  returnFinish: string;
  travelStartTime: string;
  travelFinishTime: string;
  waitingStart: string;
  waitingFinish: string;
  conclusion: string;
  recommendation: string;
  changedNote: string;
  carriedBy: string;
  carriedDate: string;
  approvedBy: string;
  approvedDate: string;
  carriedSignature: string;
  approvedSignature: string;
};

const jobOptions = ["Inspection", "PPM/Maintenance", "Repair", "Sales Support", "Test & Comm.", "Training", "TSB"];

const defaultValues: ReportFormValues = {
  dispatchNo: "",
  dispatchDate: "",
  fseName: "",
  teknisiId: null,
  customerName: "",
  customerPerson: "",
  department: "",
  address: "",
  customerRef: "",
  phone: "",
  email: "",
  notifOpen: "",
  finalizedDate: "",
  jobInfo: [],
  problemDescription: "",
  serviceDescription: "",
  travelStart: "",
  travelFinish: "",
  returnStart: "",
  returnFinish: "",
  travelStartTime: "",
  travelFinishTime: "",
  waitingStart: "",
  waitingFinish: "",
  conclusion: "",
  recommendation: "",
  changedNote: "",
  carriedBy: "",
  carriedDate: "",
  approvedBy: "",
  approvedDate: "",
  carriedSignature: "",
  approvedSignature: "",
  deviceRows: [
    {
      partNo: "",
      description: "",
      serialNo: "",
      swVersion: "",
      location: "",
      workStart: "",
      workFinish: "",
    },
  ],
  tools: [
    { code: "", description: "", usableLimit: "" },
  ],
  spareparts: [
    { qty: "", partNo: "", description: "", status: "" },
  ],
};

const sectionClass = "rounded-[32px] border border-slate-200 bg-white p-6 text-slate-900 shadow-sm";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-600/30";
const surveyLink = "https://docs.google.com/forms/d/e/1FAIpQLSdyNgH3_wVZnAnh-g5AF6g9QYWH-p6TYvAE_nz55DGlqqp8lw/viewform";

export default function ReportForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [problemPhotos, setProblemPhotos] = useState<string[]>([]);
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [pendingFinalize, setPendingFinalize] = useState(false);
  const [finalizeReady, setFinalizeReady] = useState(false);
  const [showSurveyQrModal, setShowSurveyQrModal] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<ReportFormValues>({
    defaultValues,
  });

  const { fields: deviceFields, append: appendDevice } = useFieldArray({
    control,
    name: "deviceRows",
  });
  const { fields: spareFields, append: appendSpare } = useFieldArray({
    control,
    name: "spareparts",
  });
  const { fields: toolFields, append: appendTool } = useFieldArray({
    control,
    name: "tools",
  });

  const selectedJobs = watch("jobInfo");
  const carriedSignature = watch("carriedSignature");
  const approvedSignature = watch("approvedSignature");
  const finalizedDateValue = watch("finalizedDate");
  const deviceRowsWatch = watch("deviceRows");
  const spareRowsWatch = watch("spareparts");
  const toolRowsWatch = watch("tools");
  const travelStartWatch = watch("travelStart");
  const travelFinishWatch = watch("travelFinish");
  const travelStartTimeWatch = watch("travelStartTime");
  const travelFinishTimeWatch = watch("travelFinishTime");
  const waitingStartWatch = watch("waitingStart");
  const waitingFinishWatch = watch("waitingFinish");
  const serviceDescriptionWatch = watch("serviceDescription");
  const conclusionWatch = watch("conclusion");
  const notifOpenValue = watch("notifOpen");
  const customerNameValue = watch("customerName");
  const phoneValue = watch("phone");
  const emailValue = watch("email");
  const isFinalized = !!finalizedDateValue;

  const formatDisplayDate = (value: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
  };

  const withError = (_path: string, base: string) => base;
  const errorMessage = (path: string) => {
    const err = path.split(".").reduce((obj: any, key) => obj?.[key], errors as any);
    if (typeof err?.message === "string") return err.message;
    return undefined;
  };

  const surveyMessage = () => {
    const greeting = customerNameValue ? `Halo ${customerNameValue},` : "Halo pelanggan,";
    return `${greeting}\n\nMohon bantuannya untuk mengisi survei layanan berikut:\n${surveyLink}`;
  };

  const handleShareWhatsApp = () => {
    const phoneDigits = (phoneValue || "").replace(/\D/g, "");
    if (!phoneDigits) {
      setMessage("Nomor telepon customer belum diisi.");
      return;
    }
    const encoded = encodeURIComponent(surveyMessage());
    window.open(`https://wa.me/${phoneDigits}?text=${encoded}`, "_blank", "noopener");
  };

  const handleShareEmail = () => {
    if (!emailValue) {
      setMessage("Email customer belum diisi.");
      return;
    }
    const subject = encodeURIComponent("Customer Satisfaction Survey");
    const body = encodeURIComponent(surveyMessage());
    window.open(`mailto:${emailValue}?subject=${subject}&body=${body}`);
  };

  const handleShowQr = () => {
    setShowSurveyQrModal(true);
  };

  useEffect(() => {
    if (id) return;
    let active = true;
    setLoadingList(true);
    api
      .get("/teknisi/reports")
      .then((res) => {
        if (!active) return;
        setReports(res.data?.data ?? []);
      })
      .catch(() => {
        if (!active) return;
        setReports([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingList(false);
      });
    return () => {
        active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    api
      .get(`/teknisi/reports/${id}`)
      .then((res) => {
        if (!active) return;
        const detail: ReportDetail = res.data?.data;
        const payload = detail.teknisi_payload || detail.form_payload;
        if (payload) {
          reset({
            ...defaultValues,
            ...payload,
            teknisiId: payload.teknisiId ?? null,
            jobInfo: payload.jobInfo ?? [],
            deviceRows: payload.deviceRows?.length ? payload.deviceRows : defaultValues.deviceRows,
            tools: payload.tools?.length ? payload.tools : defaultValues.tools,
            spareparts: payload.spareparts?.length ? payload.spareparts : defaultValues.spareparts,
          });
          setProblemPhotos(payload.problemPhotos ?? []);
        }
      })
      .catch(() => {
        if (!active) return;
      })
      .finally(() => {
        if (!active) return;
      });
    return () => {
      active = false;
    };
  }, [id, reset]);

  const onSubmit = handleSubmit(
    async (values) => {
      setMessage(null);
      try {
        const payloadForStorage = {
          ...values,
          problemPhotos,
          storedAt: new Date().toISOString(),
        };

        if (id) {
          await api.patch(`/teknisi/reports/${id}/form`, { payload: payloadForStorage });
          setMessage("Update teknisi berhasil disimpan.");
        } else {
          const primaryDevice = values.deviceRows[0];
          const safeDeviceName = primaryDevice?.description?.trim() || "Device";
          const safeSerial = primaryDevice?.serialNo?.trim() || "N/A";
          const safeLocation = primaryDevice?.location?.trim() || "N/A";
          const createResponse = await api.post("/reports", {
            customer: {
              name: values.customerName,
              address: values.address,
              contact: values.phone || values.email,
            },
            device: {
              name: safeDeviceName,
              serial: safeSerial,
              location: safeLocation,
            },
            complaint: values.problemDescription,
            form_payload: payloadForStorage,
          });
          const createdReport = createResponse.data?.data ?? {};
          const reportId = createdReport.id ?? createdReport.ID;
          if (values.teknisiId && reportId) {
            await api.patch(`/reports/${reportId}/assign`, {
              teknisi_id: values.teknisiId,
            });
          }
          setMessage("Service report sent to FSE.");
          reset(defaultValues);
          setProblemPhotos([]);
        }
      } catch (err: any) {
        setMessage(err?.response?.data?.error ?? "Failed to save report.");
      }
    },
    () => setMessage("Please complete all required fields before sending to FSE.")
  );

  const handleFinalizeCheck = () => {
    const missing: string[] = [];

    if (isFinalized) {
      setMessage("Report already finalized.");
      return;
    }

    clearErrors([
      "deviceRows.0.description",
      "serviceDescription",
      "travelStart",
      "travelFinish",
      "travelStartTime",
      "travelFinishTime",
      "waitingStart",
      "waitingFinish",
      "conclusion",
      "spareparts.0.description",
      "tools.0.description",
    ]);

    const requireField = (condition: boolean, name: keyof ReportFormValues, label: string) => {
      if (!condition) {
        missing.push(label);
        setError(name as any, { type: "required", message: `${label} wajib diisi` });
      }
    };

    const firstDevice = deviceRowsWatch?.[0] || {};
    requireField(!!firstDevice.description?.trim(), "deviceRows.0.description" as any, "Device description");

    requireField(!!serviceDescriptionWatch?.trim(), "serviceDescription", "Service Description / Analysis");
    requireField(!!travelStartWatch, "travelStart", "Travel start date");
    requireField(!!travelFinishWatch, "travelFinish", "Travel finish date");
    requireField(!!travelStartTimeWatch, "travelStartTime", "Travel start time");
    requireField(!!travelFinishTimeWatch, "travelFinishTime", "Travel finish time");
    requireField(!!waitingStartWatch, "waitingStart", "Waiting start time");
    requireField(!!waitingFinishWatch, "waitingFinish", "Waiting finish time");
    requireField(!!conclusionWatch?.trim(), "conclusion", "Conclusion");

    const firstSpare = spareRowsWatch?.[0] || {};
    requireField(!!firstSpare.description?.trim(), "spareparts.0.description" as any, "Spare part description");

    const firstTool = toolRowsWatch?.[0] || {};
    requireField(!!firstTool.description?.trim(), "tools.0.description" as any, "Tool description");

    if (!carriedSignature) missing.push("Service engineer signature");
    if (!approvedSignature) missing.push("Customer signature");

    if (missing.length > 0) {
      return;
    }

    setFinalizeReady(true);
    setShowFinalizeConfirm(true);
  };

  const doFinalize = async () => {
    if (isFinalized || pendingFinalize) return;

    setPendingFinalize(true);
    const nowIso = new Date().toISOString();
    const dateOnly = nowIso.split("T")[0];

    const currentValues = getValues();
    const payloadForStorage = {
      ...currentValues,
      finalizedDate: dateOnly,
      problemPhotos,
      storedAt: nowIso,
    };

    if (id) {
      try {
        await api.patch(`/teknisi/reports/${id}/form`, { payload: payloadForStorage });
        await api.patch(`/teknisi/reports/${id}/progress`, { status: "done", job_summary: "done", action_taken: "done" });
        setValue("finalizedDate", dateOnly, { shouldDirty: true });
        setMessage("Finalized and saved successfully.");
      } catch (err: any) {
        setMessage(err?.response?.data?.error ?? "Failed to finalize.");
      } finally {
        setPendingFinalize(false);
        setShowFinalizeConfirm(false);
        setFinalizeReady(false);
      }
    } else {
      setPendingFinalize(false);
      setShowFinalizeConfirm(false);
      setFinalizeReady(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 text-slate-900">
      {!id ? (
        <section className={sectionClass}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Service Report</p>
              <h1 className="text-2xl font-semibold text-slate-900">Assigned Reports</h1>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full table-fixed border-collapse text-sm text-slate-800">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="w-1/4 px-4 py-3 text-left">Dispatch No</th>
                  <th className="w-1/5 px-4 py-3 text-left">Date</th>
                  <th className="w-1/4 px-4 py-3 text-left">Customer</th>
                  <th className="w-1/6 px-4 py-3 text-left">Status</th>
                  <th className="w-1/6 px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No reports assigned yet.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const date = report.form_payload?.dispatchDate || report.form_payload?.notifOpen;
                    const dispatch = report.form_payload?.dispatchNo || report.dispatch_no || "No Dispatch";
                    const customer = report.form_payload?.customerName || report.customer_name || "Name";
                    const statusRaw = (report.status || report.form_payload?.status || "").toString().toLowerCase();
                    const statusLabel =
                      statusRaw === "done"
                        ? "Complete"
                        : statusRaw === "progress"
                        ? "Task in progress"
                        : "Open";
                    const statusClass =
                      statusRaw === "done"
                        ? "bg-emerald-100 text-emerald-700"
                        : statusRaw === "progress"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-200 text-slate-700";
                    return (
                      <tr key={report.id} className="border-t border-slate-100 bg-white odd:bg-white even:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{dispatch}</td>
                        <td className="px-4 py-3 text-slate-700">{date ? new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Tanggal"}</td>
                        <td className="px-4 py-3 text-slate-700">{customer}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${statusClass}`}
                          >
                            {statusLabel}
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
          <header>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Service Report</p>
            <h1 className="text-3xl font-semibold text-slate-900">Service Report Form</h1>
            <p className="text-sm text-slate-600">Content aligned with the client-provided wireframe.</p>
          </header>

          <form onSubmit={onSubmit} className="space-y-8">
            <fieldset disabled={isFinalized} className="space-y-8">
            <section className={sectionClass}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Dispatch No">
              <div className="flex gap-2">
                <input
                  {...register("dispatchNo")}
                  className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                  readOnly
                  placeholder="Click Create"
                />
                <button
                  type="button"
                  className="rounded-xl bg-slate-200 px-4 text-sm font-semibold text-slate-400 cursor-not-allowed"
                  disabled
                  onClick={() => {
                    const now = new Date();
                    const pad = (num: number) => num.toString().padStart(2, "0");
                    const dispatch = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
                      now.getHours()
                    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                    setValue("dispatchNo", dispatch, { shouldDirty: true });
                  }}
                >
                  Create
                </button>
              </div>
            </Field>
            <Field label="FSE Name">
              <div className="relative">
                <input
                  {...register("fseName")}
                  className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                  readOnly
                  placeholder="Start typing technician name"
                />
              </div>
            </Field>
            <Field label="Dispatch Date">
              <div className="relative">
                <input
                  type="date"
                  {...register("dispatchDate")}
                  className={`${inputClass} pr-10 bg-slate-100 cursor-not-allowed`}
                  readOnly
                />
                <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              </div>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Customer Name">
              <input {...register("customerName")}
                className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                readOnly />
            </Field>
            <Field label="Customer Person">
              <input {...register("customerPerson")}
                className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                readOnly />
            </Field>
            <Field label="Department">
              <input {...register("department")}
                className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                readOnly />
            </Field>
          </div>

          <Field label="Address" className="mt-4">
            <textarea {...register("address")}
              className={`${inputClass} min-h-[64px] bg-slate-100 cursor-not-allowed`}
              readOnly />
          </Field>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <Field label="Customer Ref">
              <input {...register("customerRef")}
                className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                readOnly />
            </Field>
            <Field label="Phone No">
              <input {...register("phone")}
                className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                readOnly />
            </Field>
            <Field label="Email">
              <input type="email" {...register("email")}
                className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                readOnly />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Notif Open">
                <div className={`${inputClass} bg-slate-100 text-slate-700`}>{notifOpenValue ? formatDisplayDate(notifOpenValue) : "-"}</div>
              </Field>
              <Field label="Date Finalized">
                <input type="hidden" {...register("finalizedDate")} />
                <div className={`${inputClass} bg-slate-100 text-slate-700`}>
                  {finalizedDateValue ? formatDisplayDate(finalizedDateValue) : "-"}
                </div>
                {!finalizedDateValue && (
                  <p className="mt-1 text-xs text-slate-500">Currently locked; will be set after completion.</p>
                )}
              </Field>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Job Information</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {jobOptions.map((option) => {
                const active = selectedJobs.includes(option);
                return (
                  <div
                    key={option}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
                      active ? "bg-slate-700 text-white" : "bg-white/70 text-slate-400"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        active ? "border-white bg-white" : "border-slate-300 bg-transparent"
                      }`}
                    >
                      {active && <span className="h-2 w-2 rounded-sm bg-slate-700" />}
                    </span>
                    {option}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Report Problem</h3>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-4">
              {problemPhotos.length > 0 ? (
                problemPhotos.map((photo, index) => (
                  <div key={index} className="relative h-40 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <img src={photo} alt={`Problem ${index + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))
              ) : (
                <p className="col-span-4 text-sm text-slate-500">No problem photos attached.</p>
              )}
            </div>
          </div>

          <Field label="Description" className="mt-6">
            <textarea
              {...register("problemDescription")}
              className={`${inputClass} min-h-[80px] bg-slate-100 cursor-not-allowed`}
              readOnly
            />
          </Field>

        </section>

        <section className={sectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">Device Information</h3>
              <span className="text-red-500">*</span>
            </div>
            <button
              type="button"
              onClick={() =>
                appendDevice({ partNo: "", description: "", serialNo: "", swVersion: "", location: "", workStart: "", workFinish: "" })
              }
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Table
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-[24px] border border-slate-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left font-semibold text-slate-900">
                <tr>
                  {["No", "Part No.", "Device Description", "Serial No.", "S.W Version", "Location (if known)", "Working Hours Start", "Finish"].map((head) => (
                    <th key={head} className="border border-slate-200 px-3 py-2">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deviceFields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="border border-slate-200 px-3 py-2 text-center text-sm">{index + 1}</td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`deviceRows.${index}.partNo` as const)} className={inputClass} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`deviceRows.${index}.description` as const)} className={withError(`deviceRows.${index}.description`, inputClass)} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`deviceRows.${index}.serialNo` as const)} className={inputClass} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`deviceRows.${index}.swVersion` as const)} className={inputClass} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`deviceRows.${index}.location` as const)} className={inputClass} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`deviceRows.${index}.workStart` as const)} className={inputClass} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`deviceRows.${index}.workFinish` as const)} className={inputClass} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errorMessage("deviceRows.0.description") && (
            <p className="mt-2 text-xs font-semibold text-red-500">Device description wajib diisi</p>
          )}
        </section>

        <section className={sectionClass}>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold">Summary</h3>
            <span className="text-red-500">*</span>
          </div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.8fr,1fr]">
            <Field label="Service Description / Analysis" required error={errorMessage("serviceDescription")}>
              <textarea {...register("serviceDescription", { required: "Service description is required" })} className={`${withError("serviceDescription", inputClass)} min-h-[180px]`} />
            </Field>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide">
                  <p>Travel Hour</p>
                  <span className="text-red-500">*</span>
                </div>
                <table className="mt-3 w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-slate-700/40 px-2 py-1 text-left"> </th>
                      <th className="border border-slate-700/40 px-2 py-1 text-center">Start</th>
                      <th className="border border-slate-700/40 px-2 py-1 text-center">Finish</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-700/40 px-2 py-1 font-semibold">Departure</td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="date" {...register("travelStart")} className={withError("travelStart", inputClass)} />
                      </td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="date" {...register("travelFinish")} className={withError("travelFinish", inputClass)} />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-700/40 px-2 py-1 font-semibold">Return</td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="date" {...register("returnStart")} className={inputClass} />
                      </td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="date" {...register("returnFinish")} className={inputClass} />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-700/40 px-2 py-1 font-semibold">Time</td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="time" {...register("travelStartTime")} className={withError("travelStartTime", inputClass)} />
                      </td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="time" {...register("travelFinishTime")} className={withError("travelFinishTime", inputClass)} />
                      </td>
                    </tr>
                  </tbody>
                </table>
                {(errorMessage("travelStart") || errorMessage("travelFinish") || errorMessage("travelStartTime") || errorMessage("travelFinishTime")) && (
                  <p className="mt-2 text-xs font-semibold text-red-500">
                    {errorMessage("travelStart") || errorMessage("travelFinish") || errorMessage("travelStartTime") || errorMessage("travelFinishTime")}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-700/40 bg-white/80 p-4">
                <div className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide">
                  <p>Waiting Hour</p>
                  <span className="text-red-500">*</span>
                </div>
                <table className="mt-3 w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-slate-700/40 px-2 py-1 text-center">Start</th>
                      <th className="border border-slate-700/40 px-2 py-1 text-center">Finish</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="time" {...register("waitingStart")} className={withError("waitingStart", inputClass)} />
                      </td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="time" {...register("waitingFinish")} className={withError("waitingFinish", inputClass)} />
                      </td>
                    </tr>
                  </tbody>
                </table>
                {(errorMessage("waitingStart") || errorMessage("waitingFinish")) && (
                  <p className="mt-2 text-xs font-semibold text-red-500">{errorMessage("waitingStart") || errorMessage("waitingFinish")}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide">
                <p>Description</p>
                <span className="text-red-500">*</span>
              </div>
              <button
                type="button"
                onClick={() => appendTool({ code: "", description: "", usableLimit: "" })}
                className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Add Table
              </button>
            </div>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Code/SN", "Description", "Usable limits"].map((head) => (
                      <th key={head} className="border border-slate-200 px-3 py-2 text-left font-semibold">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {toolFields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="border border-slate-700/40 px-3 py-2">
                        <input {...register(`tools.${index}.code` as const)} className={inputClass} />
                      </td>
                      <td className="border border-slate-700/40 px-3 py-2">
                        <input {...register(`tools.${index}.description` as const)} className={withError(`tools.${index}.description`, inputClass)} />
                      </td>
                      <td className="border border-slate-700/40 px-3 py-2">
                        <input {...register(`tools.${index}.usableLimit` as const)} className={inputClass} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errorMessage("tools.0.description") && (
              <p className="mt-2 text-xs font-semibold text-red-500">Tool description wajib diisi</p>
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Field label="Conclusion" required error={errorMessage("conclusion")}>
              <textarea {...register("conclusion", { required: "Conclusion is required" })} className={`${withError("conclusion", inputClass)} min-h-[100px]`} />
            </Field>
            <Field label="Recommendation and Note">
              <textarea {...register("recommendation")} className={`${inputClass} min-h-[100px]`} />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">Spare Parts</h3>
              <span className="text-red-500">*</span>
            </div>
            <button
              type="button"
              onClick={() => appendSpare({ qty: "", partNo: "", description: "", status: "" })}
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Table
            </button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-[24px] border border-slate-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left font-semibold text-slate-900">
                <tr>
                  {["Qty", "Part No.", "Description", "Status"].map((head) => (
                    <th key={head} className="border border-slate-200 px-3 py-2">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spareFields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`spareparts.${index}.qty` as const)} className={inputClass} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`spareparts.${index}.partNo` as const)} className={inputClass} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`spareparts.${index}.description` as const)} className={withError(`spareparts.${index}.description`, inputClass)} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`spareparts.${index}.status` as const)} className={inputClass} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
          </div>
          {errors.spareparts?.[0]?.description && (
            <p className="mt-2 text-xs font-semibold text-red-500">Spare part description wajib diisi</p>
          )}
        </section>

        <section className={sectionClass}>
          <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-700/40 bg-white/80 p-4">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-slate-700/40 px-3 py-2 text-left font-semibold">Carried out by:</th>
                      <th className="border border-slate-700/40 px-3 py-2 text-left font-semibold">Sign / Approved by:</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-700/40 px-3 py-2">
                        <input {...register("carriedBy")} className={inputClass} />
                      </td>
                      <td className="border border-slate-700/40 px-3 py-2">
                        <input {...register("approvedBy")} className={inputClass} />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-700/40 px-3 py-4">
                        <SignaturePad label="Service Engineer Signature" value={carriedSignature} onChange={(data) => setValue("carriedSignature", data)} />
                        {!carriedSignature && <p className="mt-2 text-xs font-semibold text-red-500">Service engineer signature is required</p>}
                      </td>
                      <td className="border border-slate-700/40 px-3 py-4">
                        <SignaturePad label="Customer Signature" value={approvedSignature} onChange={(data) => setValue("approvedSignature", data)} />
                        {!approvedSignature && <p className="mt-2 text-xs font-semibold text-red-500">Customer signature is required</p>}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-700/40 px-3 py-2">
                        <input type="date" {...register("carriedDate")} className={inputClass} />
                      </td>
                      <td className="border border-slate-700/40 px-3 py-2">
                        <input type="date" {...register("approvedDate")} className={inputClass} />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-700/40 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">Service Engineer</td>
                      <td className="border border-slate-700/40 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">Customer Acknowledgment</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="rounded-xl bg-slate-700 px-5 py-2 text-sm font-semibold text-white" onClick={handleFinalizeCheck}>
                  Finalized
                </button>
                <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Print
                  </div>
                </button>
                <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3 text-center md:text-left md:flex-1">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Survey</p>
                    <h4 className="text-xl font-semibold text-slate-900">Customer Satisfaction</h4>
                    <p className="text-sm text-slate-600">Scan the QR code below to submit service feedback in real time.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-600 md:justify-start">
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 transition hover:border-slate-300"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={handleShareEmail}
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 transition hover:border-slate-300"
                    >
                      Email Link
                    </button>
                    <button
                      type="button"
                      onClick={handleShowQr}
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 transition hover:border-slate-300"
                    >
                      Direct QR
                    </button>
                  </div>
                </div>
                <div className="flex justify-center md:justify-end">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner shadow-slate-900/5">
                    <img src={qrSurvey} alt="Survey QR" className="h-32 w-32 md:h-40 md:w-40" />
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-slate-700">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase text-slate-500">Survey URL</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-slate-900 break-all">{surveyLink}</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(surveyLink);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {copied ? "Copied" : "Copy Link"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

              <Field label="Change Note" className="mt-6">
                <textarea {...register("changedNote")} className={`${inputClass} min-h-[100px]`} />
              </Field>
            </section>

                </fieldset>
            {message && <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</p>}
          </form>

          {showFinalizeConfirm && (
            <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/10">
                <h3 className="text-lg font-semibold text-slate-900">Finalize report?</h3>
                <p className="mt-2 text-sm text-slate-600">Data will be locked and status set to done. Are you sure?</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                    onClick={() => {
                      if (pendingFinalize) return;
                      setShowFinalizeConfirm(false);
                      setFinalizeReady(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                    disabled={pendingFinalize || !finalizeReady}
                    onClick={() => {
                      if (pendingFinalize || !finalizeReady) return;
                      doFinalize();
                    }}
                  >
                    {pendingFinalize ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showSurveyQrModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/20">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-slate-300"
              onClick={() => setShowSurveyQrModal(false)}
            >
              Close
            </button>
            <div className="flex flex-col items-center gap-4">
              <img src={qrSurvey} alt="Survey QR" className="h-56 w-56" />
              <p className="text-center text-sm text-slate-600">
                Bagikan kode ini kepada customer atau kirim link berikut:
                <br />
                {surveyLink}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
  required = false,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 text-sm font-medium text-slate-800 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
    </label>
  );
}

function SignaturePad({ label, value, onChange }: { label: string; value: string; onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      if (value) {
        const img = new Image();
        img.src = value;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
        };
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [value]);

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";

    if (!lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastPoint.current = { x, y };
  };

  const handlePointerUp = () => {
    if (!isDrawing.current || !canvasRef.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-700">
        <span>{label}</span>
        <button type="button" className="text-slate-500 underline" onClick={clearCanvas}>
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-32 w-full cursor-crosshair rounded-xl border border-dashed border-slate-300 bg-white"
        onPointerDown={(event) => {
          isDrawing.current = true;
          const canvas = canvasRef.current;
          if (canvas) canvas.setPointerCapture(event.pointerId);
          draw(event);
        }}
        onPointerMove={draw}
        onPointerUp={(event) => {
          const canvas = canvasRef.current;
          if (canvas) canvas.releasePointerCapture(event.pointerId);
          handlePointerUp();
        }}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
