import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import logoKms from "../../assets/logo kms.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type PrintableReport = {
  dispatchNo?: string;
  dispatchDate?: string;
  customerName?: string;
  customerPerson?: string;
  department?: string;
  address?: string;
  phone?: string;
  email?: string;
  notifOpen?: string;
  finalizedDate?: string;
  jobInfo?: string[];
  problemDescription?: string;
  serviceDescription?: string;
  conclusion?: string;
  recommendation?: string;
  changedNote?: string;
  carriedBy?: string;
  carriedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  carriedSignature?: string;
  approvedSignature?: string;
  travelStartTime?: string;
  travelFinishTime?: string;
  beforeEvidence?: string[];
  afterEvidence?: string[];
  spareparts?: { qty?: string; partNo?: string; description?: string; status?: string }[];
  tools?: { code?: string; description?: string; usableLimit?: string }[];
  deviceRows?: {
    partNo?: string;
    description?: string;
    serialNo?: string;
    swVersion?: string;
    location?: string;
    workStart?: string;
    workFinish?: string;
  }[];
};

interface Props {
  open: boolean;
  snapshot: PrintableReport | null;
  onClose: () => void;
  formatDate: (value?: string) => string;
  loading?: boolean;
  errorMessage?: string | null;
  autoPrint?: boolean;
  onAutoPrintDone?: () => void;
}

export default function ServiceReportPrintModal({
  open,
  snapshot,
  onClose,
  formatDate,
  loading = false,
  errorMessage = null,
  autoPrint = false,
  onAutoPrintDone,
}: Props) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const ready = !!snapshot && !loading && !errorMessage;


  const handleDownloadPdf = async () => {
    if (!ready || !printAreaRef.current) return;
    const pages = Array.from(printAreaRef.current.querySelectorAll(".print-preview-page")) as HTMLElement[];
    if (pages.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF("portrait", "pt", "a4");
      for (let i = 0; i < pages.length; i += 1) {
        const canvas = await html2canvas(pages[i], {
          backgroundColor: "#ffffff",
          scale: 3,
          useCORS: true,
          windowWidth: pages[i].scrollWidth,
          windowHeight: pages[i].scrollHeight,
        });
        const imgData = canvas.toDataURL("image/png", 1.0);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
        if (i < pages.length - 1) pdf.addPage();
      }
      const filename = `${snapshot?.dispatchNo || "service-report"}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (!autoPrint) return;
    let cancelled = false;

    const waitAndPrint = () => {
      if (cancelled) return;
      if (ready && printAreaRef.current) {
        handleChromePrint(() => onAutoPrintDone?.());
      } else {
        requestAnimationFrame(waitAndPrint);
      }
    };

    waitAndPrint();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, ready, snapshot]);

  const ensurePrintStyles = () => {
    if (document.getElementById("report-print-style")) return;
    const style = document.createElement("style");
    style.id = "report-print-style";
    style.innerHTML = `
      @page { size: A4 portrait; margin: 0; }
      @media print {
        body { background: #ffffff !important; }
        #report-print-root { display: block !important; }
        body > *:not(#report-print-root) { display: none !important; }
      }
      @media screen {
        #report-print-root { display: none; }
      }
    `;
    document.head.appendChild(style);
  };

  const mountPrintPortal = () => {
    ensurePrintStyles();
    const previous = document.getElementById("report-print-root");
    if (previous) previous.remove();
    if (!printAreaRef.current) return null;
    const portal = document.createElement("div");
    portal.id = "report-print-root";
    portal.style.display = "flex";
    portal.style.flexDirection = "column";
    portal.style.alignItems = "center";
    portal.style.padding = "0";
    const clone = printAreaRef.current.cloneNode(true) as HTMLElement;
    clone.style.margin = "0 auto";
    portal.appendChild(clone);
    document.body.appendChild(portal);
    return portal;
  };

  const handleChromePrint = (afterPrint?: () => void) => {
    if (!ready || !printAreaRef.current) return;
    const portal = mountPrintPortal();
    if (!portal) return;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        portal.remove();
        afterPrint?.();
      }, 120);
    }, 200);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/80 px-4 py-6" onClick={() => !isGeneratingPdf && onClose()}>
      <div
        className="w-full max-w-6xl rounded-[32px] bg-white p-6 shadow-2xl shadow-slate-900/30"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Print Preview</p>
            <h3 className="text-2xl font-semibold text-slate-900">Service Report PDF</h3>
            <p className="text-sm text-slate-500">Layout dua halaman sesuai template.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleChromePrint()}
              disabled={!ready || isGeneratingPdf}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Print
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!ready || isGeneratingPdf}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingPdf ? "Menyiapkan..." : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isGeneratingPdf}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="mt-6 max-h-[70vh] overflow-y-auto rounded-[28px] bg-slate-100 p-6">
          {loading && <p className="text-center text-sm font-semibold text-slate-600">Memuat detail laporan...</p>}
          {!loading && errorMessage && <p className="text-center text-sm font-semibold text-red-500">{errorMessage}</p>}
          {ready && (
            <div ref={printAreaRef} className="flex flex-col gap-8">
              <PrintPageOne snapshot={snapshot} formatDate={formatDate} />
              <PrintPageTwo snapshot={snapshot} formatDate={formatDate} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-[#d4d9e7] bg-white">
      <div className="border-b border-[#e4e7f2] bg-[#f8f9fc] px-5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#6f748a]">{title}</p>
      </div>
      <div className="px-5 py-3.5">{children}</div>
    </section>
  );
}

function DefinitionGrid({ rows, columns = 1 }: { rows: { label: string; value: string }[]; columns?: 1 | 2 }) {
  const chunkSize = Math.ceil(rows.length / columns);
  const groups = Array.from({ length: columns }, (_, idx) => rows.slice(idx * chunkSize, (idx + 1) * chunkSize)).filter((group) => group.length);
  return (
    <div className={`grid gap-3 ${columns > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
      {groups.map((group, idx) => (
        <table key={`group-${idx}`} className="w-full border-collapse text-[13px] text-[#141b2d]">
          <tbody>
            {group.map((row) => (
              <tr key={row.label} className="align-top">
                <th className="w-[120px] py-1 pr-2 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7b819a]">
                  {row.label}
                </th>
                <td className="py-1 text-left font-semibold">
                  <span className="mr-2 text-[#7b819a]">:</span>
                  <span className="break-words text-[#141b2d]">{row.value || "-"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function PageContainer({
  children,
  meta,
  isLast,
}: {
  children: React.ReactNode;
  meta: React.ReactNode;
  isLast?: boolean;
}) {
  const contentOuterRef = useRef<HTMLDivElement | null>(null);
  const contentInnerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = contentOuterRef.current;
    const inner = contentInnerRef.current;
    if (!outer || !inner) return;

    const compute = () => {
      const available = outer.clientHeight;
      const needed = inner.scrollHeight;
      if (!available || !needed) return;
      const next = Math.min(1, available / needed);
      setScale((prev) => {
        const rounded = Math.round(next * 1000) / 1000;
        return Math.abs(prev - rounded) < 0.001 ? prev : rounded;
      });
    };

    compute();
    requestAnimationFrame(compute);
  }, [children]);

  return (
    <div
      className="print-preview-page mx-auto rounded-[18px] border border-[#c9cfe0] bg-white px-9 py-6"
      style={{
        width: "793.7px",
        height: "1122.5px",
        pageBreakAfter: isLast ? "auto" : "always",
        pageBreakInside: "avoid",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e3e6f0] pb-4">
        <div className="flex items-center gap-4">
          <img src={logoKms} alt="PT KMS" className="h-14 w-auto" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.6em] text-[#7b8097]">Hasil Print PDF</p>
            <p className="text-2xl font-black text-[#1b1f32]">PT. KANDA MEDICAL SOLUTIONS INDONESIA</p>
            <p className="text-xs text-[#7b8097]">medical equipment business, Service and maintenance.</p>
          </div>
        </div>
        <div className="text-right text-xs font-semibold text-[#7b8097]">{meta}</div>
      </header>

      <div ref={contentOuterRef} className="relative flex-1 overflow-hidden">
        <div
          ref={contentInnerRef}
          className="space-y-4"
          style={{
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            width: scale < 1 ? `${100 / scale}%` : "100%",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function PrintPageOne({ snapshot, formatDate }: { snapshot: PrintableReport; formatDate: (value?: string) => string }) {
  const primaryDevice = snapshot.deviceRows?.[0];
  const beforeEvidence = snapshot.beforeEvidence || [];
  const afterEvidence = snapshot.afterEvidence || [];
  const evidenceCount = beforeEvidence.length + afterEvidence.length;

  const customerInfo = useMemo(
    () => [
      { label: "Dispatch No", value: snapshot.dispatchNo || "-" },
      { label: "Dispatch Date", value: formatDate(snapshot.dispatchDate) || "-" },
      { label: "Customer Name", value: snapshot.customerName || "-" },
      { label: "Department", value: snapshot.department || "-" },
      { label: "Contact", value: snapshot.customerPerson || "-" },
      { label: "Phone", value: snapshot.phone || "-" },
      { label: "Email", value: snapshot.email || "-" },
      { label: "Address", value: snapshot.address || "-" },
    ],
    [snapshot, formatDate]
  );

  const equipmentInfo = useMemo(
    () => [
      { label: "Equipment Status", value: snapshot.jobInfo?.join(", ") || "-" },
      { label: "Product Description", value: primaryDevice?.description || "-" },
      { label: "Part Number", value: primaryDevice?.partNo || "-" },
      { label: "Serial Number", value: primaryDevice?.serialNo || "-" },
    ],
    [snapshot.jobInfo, primaryDevice]
  );

  const activityRows = useMemo(
    () => [
      { label: "Activity", value: snapshot.jobInfo?.join(", ") || "-" },
      { label: "Report Problem", value: snapshot.problemDescription || "-" },
      { label: "Identified Problem", value: snapshot.serviceDescription || "-" },
      { label: "Solution", value: snapshot.conclusion || "-" },
      { label: "Close Date", value: formatDate(snapshot.finalizedDate) },
      { label: "Field Engineer", value: snapshot.carriedBy || "-" },
    ],
    [snapshot, formatDate]
  );

  return (
    <PageContainer
      meta={
        <>
          <p>Dispatch No: {snapshot.dispatchNo || "-"}</p>
          <p>Service Engineer: {snapshot.carriedBy || snapshot.customerPerson || "-"}</p>
        </>
      }
      isLast={false}
    >
      <SectionCard title="Customer Details">
        <DefinitionGrid rows={customerInfo} columns={2} />
      </SectionCard>
      <SectionCard title="Equipment Details">
        <DefinitionGrid rows={equipmentInfo} columns={2} />
      </SectionCard>
      <SectionCard title="Activity">
        <DefinitionGrid rows={activityRows} columns={1} />
      </SectionCard>

      <SectionCard title="Evidence">
        {evidenceCount === 0 ? (
          <div className="min-h-[90px] rounded-2xl border border-dashed border-[#cfd4e4] bg-white" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9096ab]">Before</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {beforeEvidence.slice(0, 6).map((src, idx) => (
                  <div key={`before-${idx}`} className="overflow-hidden rounded-lg border border-[#e3e6f0] bg-white">
                    <img src={src} alt={`Before ${idx + 1}`} className="h-14 w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9096ab]">After</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {afterEvidence.slice(0, 6).map((src, idx) => (
                  <div key={`after-${idx}`} className="overflow-hidden rounded-lg border border-[#e3e6f0] bg-white">
                    <img src={src} alt={`After ${idx + 1}`} className="h-14 w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function PrintPageTwo({ snapshot, formatDate }: { snapshot: PrintableReport; formatDate: (value?: string) => string }) {
  const materials = snapshot.spareparts?.length ? snapshot.spareparts : [{ qty: "", partNo: "", description: "", status: "" }];
  const tools = snapshot.tools?.length ? snapshot.tools : [{ code: "", description: "", usableLimit: "" }];

  return (
    <PageContainer
      meta={
        <>
          <p>Labor Date: {formatDate(snapshot.carriedDate)}</p>
          <p>Customer: {snapshot.customerName || "-"}</p>
        </>
      }
      isLast
    >
      <SectionCard title="Labor">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9096ab]">Date</p>
            <p className="text-base font-semibold text-[#151b2f]">{formatDate(snapshot.carriedDate)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9096ab]">Type</p>
            <p className="text-base font-semibold text-[#151b2f]">{snapshot.jobInfo?.[0] || "Maintenance"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9096ab]">Hours</p>
            <p className="text-base font-semibold text-[#151b2f]">
              {snapshot.travelStartTime && snapshot.travelFinishTime ? `${snapshot.travelStartTime} - ${snapshot.travelFinishTime}` : "-"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Tools">
        <div className="overflow-hidden rounded-2xl border border-[#e3e6f0]">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[160px]" />
              <col className="w-[*]" />
              <col className="w-[160px]" />
            </colgroup>
            <thead className="bg-[#f4f6fb] text-left text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b8097]">
              <tr>
                <th className="border-b border-[#e3e6f0] px-4 py-2">Code/SN</th>
                <th className="border-b border-[#e3e6f0] px-4 py-2">Description</th>
                <th className="border-b border-[#e3e6f0] px-4 py-2">Usable limits</th>
              </tr>
            </thead>
            <tbody>
              {tools.slice(0, 6).map((item, index) => (
                <tr key={`tool-${index}`} className="border-t border-[#eef1f8]">
                  <td className="px-4 py-2 text-sm text-[#151b2f]">{item.code || "-"}</td>
                  <td className="px-4 py-2 text-sm text-[#151b2f]">{item.description || "-"}</td>
                  <td className="px-4 py-2 text-sm text-[#151b2f]">{item.usableLimit || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Materials">
        <div className="overflow-hidden rounded-2xl border border-[#e3e6f0]">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[70px]" />
              <col className="w-[130px]" />
              <col className="w-[*]" />
              <col className="w-[140px]" />
            </colgroup>
            <thead className="bg-[#f4f6fb] text-left text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b8097]">
              <tr>
                <th className="border-b border-[#e3e6f0] px-4 py-2">Qty</th>
                <th className="border-b border-[#e3e6f0] px-4 py-2">Part No</th>
                <th className="border-b border-[#e3e6f0] px-4 py-2">Description</th>
                <th className="border-b border-[#e3e6f0] px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((item, index) => (
                <tr key={`material-${index}`} className="border-t border-[#eef1f8]">
                  <td className="px-4 py-2 text-sm text-[#151b2f]">{item.qty || "-"}</td>
                  <td className="px-4 py-2 text-sm text-[#151b2f]">{item.partNo || "-"}</td>
                  <td className="px-4 py-2 text-sm text-[#151b2f]">{item.description || "-"}</td>
                  <td className="px-4 py-2 text-sm text-[#151b2f]">{item.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Recommendation & Signature">
        <div className="space-y-5">
          <div className="rounded-2xl border border-dashed border-[#cfd4e4] bg-white px-4 py-3 text-sm text-[#151b2f] min-h-[120px] whitespace-pre-wrap">
            {snapshot.recommendation || "Tidak ada catatan."}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SignatureBlock title="Engineer Signature" name={snapshot.carriedBy} signature={snapshot.carriedSignature} date={snapshot.carriedDate} formatDate={formatDate} />
            <SignatureBlock title="Customer Signature" name={snapshot.approvedBy} signature={snapshot.approvedSignature} date={snapshot.approvedDate} formatDate={formatDate} />
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function SignatureBlock({
  title,
  name,
  signature,
  date,
  formatDate,
}: {
  title: string;
  name?: string;
  signature?: string;
  date?: string;
  formatDate: (value?: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#e1e4f0] bg-[#f8f9fe] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9096ab]">{title}</p>
      <div className="min-h-[90px] rounded-xl border border-dashed border-[#cfd4e4] bg-white p-3 flex items-center justify-center">
        {signature ? <img src={signature} alt={`${title} signature`} className="max-h-16 object-contain" /> : <span className="text-xs text-[#adb2c4]">No signature</span>}
      </div>
      <p className="text-sm font-semibold text-[#151b2f]">{name || "-"}</p>
      <p className="text-xs text-[#7b8097]">{date ? formatDate(date) : "-"}</p>
    </div>
  );
}
