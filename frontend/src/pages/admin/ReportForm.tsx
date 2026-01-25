import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { api } from "../../lib/api";
import { Calendar, Mail, Plus, Printer, Send, UploadCloud } from "lucide-react";
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

type TeknisiOption = {
  id: number;
  full_name: string;
  email?: string;
  phone?: string;
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
const MAX_PROBLEM_PHOTOS = 3;

export default function ReportForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [teknisiOptions, setTeknisiOptions] = useState<TeknisiOption[]>([]);
  const [teknisiDropdownOpen, setTeknisiDropdownOpen] = useState(false);
  const [teknisiLoading, setTeknisiLoading] = useState(true);
  const [problemPhotos, setProblemPhotos] = useState<string[]>([]);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<ReportFormValues | null>(null);
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
  const fseNameValue = watch("fseName");
  const finalizedDateValue = watch("finalizedDate");
  const customerNameValue = watch("customerName");
  const phoneValue = watch("phone");
  const emailValue = watch("email");

  const toggleJob = (job: string) => {
    const next = selectedJobs.includes(job) ? selectedJobs.filter((item) => item !== job) : [...selectedJobs, job];
    setValue("jobInfo", next, { shouldDirty: true });
    if (next.length > 0) {
      clearErrors("jobInfo");
    }
  };

  useEffect(() => {
    let active = true;
    setTeknisiLoading(true);
    api
      .get("/teknisi")
      .then((res) => {
        if (!active) return;
        const raw: any[] = res.data.data || [];
        const normalized = raw.map((item) => ({
          id: item.id ?? item.ID,
          full_name: item.full_name ?? item.FullName ?? "",
          email: item.email ?? item.Email ?? "",
          phone: item.phone ?? item.Phone ?? "",
        })) as TeknisiOption[];
        setTeknisiOptions(normalized.filter((item) => item.id && item.full_name));
      })
      .catch(() => {
        if (!active) return;
        setTeknisiOptions([]);
      })
      .finally(() => {
        if (!active) return;
        setTeknisiLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredTeknisi = useMemo(() => {
    const query = fseNameValue?.toLowerCase().trim();
    if (!query) {
      return teknisiOptions.slice(0, 5);
    }
    return teknisiOptions
      .filter(
        (teknisi) =>
          teknisi.full_name?.toLowerCase().includes(query) ||
          teknisi.email?.toLowerCase().includes(query) ||
          teknisi.phone?.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [teknisiOptions, fseNameValue]);

  const handleTeknisiSelect = (teknisi: TeknisiOption) => {
    setValue("fseName", teknisi.full_name, { shouldDirty: true });
    setValue("teknisiId", teknisi.id, { shouldDirty: true });
    clearErrors("fseName");
    setTeknisiDropdownOpen(false);
  };

  const handleProblemPhotosChange = (events: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(events.target.files ?? []);
    if (files.length === 0) return;
    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      )
    ).then((images) => {
      setProblemPhotos((prev) => [...prev, ...images].slice(0, MAX_PROBLEM_PHOTOS));
      events.target.value = "";
    });
  };

  const handleRemovePhoto = (index: number) => {
    setProblemPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const surveyMessage = () => {
    const greeting = customerNameValue ? `Halo ${customerNameValue},` : "Halo pelanggan,";
    return `${greeting}\n\nMohon bantuannya untuk mengisi survei layanan berikut:\n${surveyLink}`;
  };

  const handleShareWhatsApp = () => {
    const phoneDigits = (phoneValue || "").replace(/\D/g, "");
    if (!phoneDigits) {
      setMessage("Phone number is missing.");
      return;
    }
    const encoded = encodeURIComponent(surveyMessage());
    window.open(`https://wa.me/${phoneDigits}?text=${encoded}`, "_blank", "noopener");
  };

  const handleShareEmail = () => {
    if (!emailValue) {
      setMessage("Customer email is missing.");
      return;
    }
    const subject = encodeURIComponent("Customer Satisfaction Survey");
    const body = encodeURIComponent(surveyMessage());
    window.open(`mailto:${emailValue}?subject=${subject}&body=${body}`);
  };

  const handleShowQr = () => setShowSurveyQrModal(true);

  const prepareSend = handleSubmit(
    (values) => {
      if (!values.teknisiId) {
        setError("fseName", { type: "required", message: "Select a technician from the list." });
        setMessage("Please complete all required fields before sending to FSE.");
        return;
      }
      if (!values.jobInfo || values.jobInfo.length === 0) {
        setError("jobInfo", { type: "required", message: "Select at least one job information." });
        setMessage("Please complete all required fields before sending to FSE.");
        return;
      }
      setPendingValues(values);
      setShowSendConfirm(true);
      setMessage(null);
    },
    () => {
      setMessage("Please complete all required fields before sending to FSE.");
    }
  );

  const submitToFse = async (values: ReportFormValues) => {
    setLoading(true);
    try {
      const primaryDevice = values.deviceRows[0];
      const safeDeviceName = primaryDevice?.description?.trim() || "Device";
      const safeSerial = primaryDevice?.serialNo?.trim() || "N/A";
      const safeLocation = primaryDevice?.location?.trim() || "N/A";
      const payloadForStorage = {
        ...values,
        problemPhotos,
        storedAt: new Date().toISOString(),
      };
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
      setPendingValues(null);
      setShowSendConfirm(false);
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? "Failed to save report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 text-slate-900">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Service Report</p>
        <h1 className="text-3xl font-semibold text-slate-900">Service Report Form</h1>
        <p className="text-sm text-slate-600">Content aligned with the client-provided wireframe.</p>
      </header>

      <form onSubmit={prepareSend} className="space-y-8">
        <section className={sectionClass}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Dispatch No" required error={errors.dispatchNo?.message}>
              <div className="flex gap-2">
                <input
                  {...register("dispatchNo", { required: "Dispatch number is required" })}
                  className={inputClass}
                  readOnly
                  placeholder="Click Create"
                />
                <button
                  type="button"
                  className="rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white"
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
            <Field label="FSE Name" required error={errors.fseName?.message}>
              <div className="relative">
                <input
                  {...register("fseName", {
                    required: "FSE name is required",
                    onChange: () => {
                      setValue("teknisiId", null, { shouldDirty: true });
                    },
                  })}
                  className={inputClass}
                  placeholder="Start typing technician name"
                  onFocus={() => setTeknisiDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setTeknisiDropdownOpen(false), 150)}
                />
                {teknisiDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {teknisiLoading ? (
                      <p className="px-4 py-3 text-sm text-slate-500">Loading technicians...</p>
                    ) : filteredTeknisi.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-500">No technicians found.</p>
                    ) : (
                      <ul className="max-h-64 overflow-y-auto">
                        {filteredTeknisi.map((teknisi) => (
                          <li key={teknisi.id}>
                            <button
                              type="button"
                              className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm hover:bg-slate-50"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleTeknisiSelect(teknisi)}
                            >
                              <span className="font-semibold text-slate-900">{teknisi.full_name}</span>
                              {(teknisi.email || teknisi.phone) && (
                                <span className="text-xs text-slate-500">
                                  {[teknisi.email, teknisi.phone].filter(Boolean).join(" • ")}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Dispatch Date" required error={errors.dispatchDate?.message}>
              <div className="relative">
                <input
                  type="date"
                  {...register("dispatchDate", { required: "Dispatch date is required" })}
                  className={`${inputClass} pr-10`}
                />
                <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              </div>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Customer Name" required error={errors.customerName?.message}>
              <input {...register("customerName", { required: "Customer name is required" })} className={inputClass} />
            </Field>
            <Field label="Customer Person" required error={errors.customerPerson?.message}>
              <input {...register("customerPerson", { required: "Customer person is required" })} className={inputClass} />
            </Field>
            <Field label="Department" required error={errors.department?.message}>
              <input {...register("department", { required: "Department is required" })} className={inputClass} />
            </Field>
          </div>

          <Field label="Address" required className="mt-4" error={errors.address?.message}>
            <textarea {...register("address", { required: "Address is required" })} className={`${inputClass} min-h-[64px]`} />
          </Field>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <Field label="Customer Ref" required error={errors.customerRef?.message}>
              <input {...register("customerRef", { required: "Customer reference is required" })} className={inputClass} />
            </Field>
            <Field label="Phone No" required error={errors.phone?.message}>
              <input {...register("phone", { required: "Phone number is required" })} className={inputClass} />
            </Field>
            <Field label="Email" required error={errors.email?.message}>
              <input type="email" {...register("email", { required: "Email is required" })} className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Notif Open" required error={errors.notifOpen?.message}>
                <input type="date" {...register("notifOpen", { required: "Notification open date is required" })} className={`${inputClass} pr-10`} />
              </Field>
              <Field label="Date Finalized">
                <input type="hidden" {...register("finalizedDate")} />
                <input
                  type="text"
                  value={finalizedDateValue ? finalizedDateValue : ""}
                  readOnly
                  className={`${inputClass} pr-10 bg-slate-100 text-slate-500 placeholder:text-transparent`}
                  placeholder=" "
                />
                <p className="mt-1 text-xs text-slate-500">Currently locked; will be set after completion.</p>
              </Field>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Job Information</h3>
              <span className="text-sm text-red-500">*</span>
            </div>
            {errors.jobInfo && <p className="text-sm text-red-500">{errors.jobInfo.message}</p>}
            <div className="mt-3 flex flex-wrap gap-3">
              {jobOptions.map((option) => {
                const active = selectedJobs.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleJob(option)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
                      active ? "bg-slate-700 text-white" : "bg-white/70 text-slate-700"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        active ? "border-white bg-white" : "border-slate-500 bg-transparent"
                      }`}
                    >
                      {active && <span className="h-2 w-2 rounded-sm bg-slate-700" />}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Report Problem</h3>
              <span className="text-sm text-red-500">*</span>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-4">
              {problemPhotos.map((photo, index) => (
                <div key={index} className="relative h-40 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <img src={photo} alt={`Problem ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow hover:bg-red-500 hover:text-white"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => handleRemovePhoto(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              {problemPhotos.length < MAX_PROBLEM_PHOTOS &&
                Array.from({ length: MAX_PROBLEM_PHOTOS - problemPhotos.length }).map((_, idx) => (
                  <div
                    key={`placeholder-${idx}`}
                    className="flex h-32 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-white text-sm text-slate-600 shadow-inner"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow">
                      <UploadCloud className="h-5 w-5 text-slate-500" />
                    </div>
                    <p className="mt-2 text-xs font-semibold tracking-wide text-slate-500">Photo {problemPhotos.length + idx + 1}</p>
                    <p className="text-[11px] text-slate-400">Drop an asset here</p>
                  </div>
                ))}
              <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/80 text-center text-sm font-semibold text-slate-600 transition hover:border-slate-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 shadow">
                  <UploadCloud className="h-5 w-5 text-slate-500" />
                </div>
                <span className="mt-2 text-sm font-semibold">
                  {problemPhotos.length > 0 ? "Upload more" : "Click or drag to upload"}
                </span>
                <span className="text-[11px] text-slate-400">{`PNG, JPG up to 5MB • ${MAX_PROBLEM_PHOTOS - problemPhotos.length} slots left`}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleProblemPhotosChange} />
              </label>
            </div>
          </div>

          <Field label="Description" required className="mt-6" error={errors.problemDescription?.message}>
            <textarea
              {...register("problemDescription", { required: "Problem description is required" })}
              className={`${inputClass} min-h-[80px]`}
            />
          </Field>

          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-slate-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 disabled:opacity-70">
              <Send className="h-4 w-4" />
              {loading ? "Sending..." : "Send to FSE"}
            </button>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-semibold">Device Information</h3>
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
                      <input {...register(`deviceRows.${index}.description` as const)} className={inputClass} />
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
        </section>

        <section className={sectionClass}>
          <h3 className="text-xl font-semibold">Summary</h3>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.8fr,1fr]">
            <Field label="Service Description / Analysis">
              <textarea {...register("serviceDescription")} className={`${inputClass} min-h-[180px]`} />
            </Field>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide">Travel Hour</p>
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
                        <input type="date" {...register("travelStart")} className={inputClass} />
                      </td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="date" {...register("travelFinish")} className={inputClass} />
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
                        <input type="time" {...register("travelStartTime")} className={inputClass} />
                      </td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="time" {...register("travelFinishTime")} className={inputClass} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-slate-700/40 bg-white/80 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide">Waiting Hour</p>
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
                        <input type="time" {...register("waitingStart")} className={inputClass} />
                      </td>
                      <td className="border border-slate-700/40 px-2 py-1">
                        <input type="time" {...register("waitingFinish")} className={inputClass} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm font-semibold uppercase tracking-wide">Description</p>
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
                        <input {...register(`tools.${index}.description` as const)} className={inputClass} />
                      </td>
                      <td className="border border-slate-700/40 px-3 py-2">
                        <input {...register(`tools.${index}.usableLimit` as const)} className={inputClass} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Field label="Conclusion">
              <textarea {...register("conclusion")} className={`${inputClass} min-h-[100px]`} />
            </Field>
            <Field label="Recommendation and Note">
              <textarea {...register("recommendation")} className={`${inputClass} min-h-[100px]`} />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-semibold">Spare Parts</h3>
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
                      <input {...register(`spareparts.${index}.description` as const)} className={inputClass} />
                    </td>
                    <td className="border border-slate-200 px-3 py-2">
                      <input {...register(`spareparts.${index}.status` as const)} className={inputClass} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                      </td>
                      <td className="border border-slate-700/40 px-3 py-4">
                        <SignaturePad label="Customer Signature" value={approvedSignature} onChange={(data) => setValue("approvedSignature", data)} />
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
                <button type="button" className="rounded-xl bg-slate-700 px-5 py-2 text-sm font-semibold text-white">
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

        {message && <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</p>}

      {showSendConfirm && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/10">
            <h3 className="text-lg font-semibold text-slate-900">Send to FSE?</h3>
            <p className="mt-2 text-sm text-slate-600">Ensure all data is correct before dispatching this report to the technician.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                onClick={() => {
                  if (loading) return;
                  setShowSendConfirm(false);
                  setPendingValues(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                disabled={loading || !pendingValues}
                onClick={() => pendingValues && submitToFse(pendingValues)}
              >
                {loading ? "Sending..." : "Yes, send"}
              </button>
            </div>
          </div>
        </div>
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
              <p className="text-center text-sm text-slate-600">Share this QR or send the link below:<br />{surveyLink}</p>
            </div>
          </div>
        </div>
      )}
      </form>
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
