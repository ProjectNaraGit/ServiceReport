import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { api } from "../../lib/api";
import { Calendar, Mail, Plus, Printer, QrCode, Send, UploadCloud } from "lucide-react";

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

type ReportFormValues = {
  dispatchNo: string;
  dispatchDate: string;
  fseName: string;
  srNo: string;
  srType: string;
  scpName: string;
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
  srNo: "",
  srType: "",
  scpName: "",
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
const surveyLink = "survey.webservicereport.id/satisfaction";

export default function ReportForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, control, reset, watch, setValue } = useForm<ReportFormValues>({
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

  const toggleJob = (job: string) => {
    const next = selectedJobs.includes(job) ? selectedJobs.filter((item) => item !== job) : [...selectedJobs, job];
    setValue("jobInfo", next);
  };

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    setMessage(null);
    try {
      const primaryDevice = values.deviceRows[0];
      await api.post("/reports", {
        customer: {
          name: values.customerName,
          address: values.address,
          contact: values.phone || values.email,
        },
        device: {
          name: primaryDevice?.description || "Device",
          serial: primaryDevice?.serialNo,
          location: primaryDevice?.location,
        },
        complaint: values.problemDescription,
      });
      setMessage("Service report dikirim ke FSE.");
      reset(defaultValues);
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? "Gagal menyimpan laporan.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="space-y-8 pb-16 text-slate-900">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Service Report</p>
        <h1 className="text-3xl font-semibold text-slate-900">Form Service Report</h1>
        <p className="text-sm text-slate-600">Konten disesuaikan dengan wireframe yang diberikan klien.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-8">
        <section className={sectionClass}>
          <div className="grid gap-4 lg:grid-cols-4">
            <Field label="Dispatch No">
              <div className="flex gap-2">
                <input {...register("dispatchNo")} className={inputClass} />
                <button type="button" className="rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white">
                  Create
                </button>
              </div>
            </Field>
            <Field label="FSE Name">
              <input {...register("fseName")} className={inputClass} />
            </Field>
            <Field label="SR No ; SCP">
              <div className="flex gap-2">
                <input {...register("srNo")} className={inputClass} />
                <select {...register("srType")} className={`${inputClass} w-16`}>
                  {["1", "2", "3", "4", "5", "6"].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-[10px] leading-tight text-slate-800">
                No: 1 Anasthesia; 2 RC; 3 MSIT; 4 : TNV; 5 WPI; 6 HCA
              </p>
            </Field>
            <Field label="Dispatch Date">
              <div className="relative">
                <input type="date" {...register("dispatchDate")} className={`${inputClass} pr-10`} />
                <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              </div>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <Field label="SCP Name">
              <input {...register("scpName")} className={inputClass} />
            </Field>
            <div className="lg:col-span-3 grid gap-4 lg:grid-cols-3">
              <Field label="Customer Name">
                <input {...register("customerName")} className={inputClass} />
              </Field>
              <Field label="Customer Person">
                <input {...register("customerPerson")} className={inputClass} />
              </Field>
              <Field label="Departement">
                <input {...register("department")} className={inputClass} />
              </Field>
            </div>
          </div>

          <Field label="Address" className="mt-4">
            <textarea {...register("address")} className={`${inputClass} min-h-[64px]`} />
          </Field>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <Field label="Customer Ref">
              <input {...register("customerRef")} className={inputClass} />
            </Field>
            <Field label="Phone No">
              <input {...register("phone")} className={inputClass} />
            </Field>
            <Field label="Email">
              <input type="email" {...register("email")} className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Notif Open">
                <input type="date" {...register("notifOpen")} className={`${inputClass} pr-10`} />
              </Field>
              <Field label="Date Finalized">
                <input type="date" {...register("finalizedDate")} className={`${inputClass} pr-10`} />
              </Field>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold">Job Information</h3>
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
            <h3 className="text-lg font-semibold">Report Problem</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-4">
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="flex h-28 flex-col items-center justify-center rounded-2xl border border-slate-700/40 bg-[#a7a7a7] text-sm text-slate-800">
                  <UploadCloud className="mb-2 h-6 w-6" />
                  Photo {slot + 1}
                </div>
              ))}
              <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700/50 bg-white/70 text-center text-sm font-semibold text-slate-700">
                <UploadCloud className="mb-2 h-6 w-6" />
                Click or drag to upload
                <input type="file" className="hidden" />
              </label>
            </div>
          </div>

          <Field label="Deskripsi" className="mt-6">
            <textarea {...register("problemDescription")} className={`${inputClass} min-h-[80px]`} />
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
              <p className="text-sm font-semibold uppercase tracking-wide">Deskripsi</p>
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
            <h3 className="text-xl font-semibold">Sparepart</h3>
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
                    <p className="text-sm text-slate-600">Scan QR berikut untuk mengisi feedback service secara realtime.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-600 md:justify-start">
                    <span className="rounded-full border border-slate-200 px-3 py-1">WhatsApp</span>
                    <span className="rounded-full border border-slate-200 px-3 py-1">Email Link</span>
                    <span className="rounded-full border border-slate-200 px-3 py-1">Direct QR</span>
                  </div>
                </div>
                <div className="flex justify-center md:justify-end">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-inner shadow-slate-900/5">
                    <QrCode className="h-32 w-32 text-slate-800 md:h-40 md:w-40" />
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-slate-700">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase text-slate-500">Alamat Survey</p>
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
      </form>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 text-sm font-medium text-slate-800 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">{label}</span>
      {children}
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
