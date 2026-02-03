import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import logoKms from "../../assets/logo kms.png";
import watermarkLogo from "../../assets/kms_logo_transparan.png";
import qrSurvey from "../../assets/qrSurvey.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import { resolveMediaUrl } from "../../lib/media";

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
  beforeImage?: string;
  afterImage?: string;
  beforeEvidence?: string[];
  afterEvidence?: string[];
  attachmentPdfUrl?: string;
  attachmentPdfName?: string;
  attachmentPdfs?: { url: string; name?: string }[];
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
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [printReady, setPrintReady] = useState(false);
  const [isMergingPdf, setIsMergingPdf] = useState(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [mergedPdfError, setMergedPdfError] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const preparedPortalRef = useRef<HTMLElement | null>(null);
  const mergedFrameRef = useRef<HTMLIFrameElement | null>(null);
  const originalTitleRef = useRef<string>(typeof document !== "undefined" ? document.title : "Service Report");

  const ready = !!snapshot && !loading && !errorMessage;

  const attachmentPdfs = useMemo(() => {
    if (snapshot?.attachmentPdfs?.length) return snapshot.attachmentPdfs;
    if (snapshot?.attachmentPdfUrl) {
      return [
        {
          url: snapshot.attachmentPdfUrl,
          name: snapshot.attachmentPdfName,
        },
      ];
    }
    return [];
  }, [snapshot?.attachmentPdfs, snapshot?.attachmentPdfName, snapshot?.attachmentPdfUrl]);

  const hasAttachments = attachmentPdfs.length > 0;

  const resolvePrintImageSrc = (input: string) => {
    if (!input) return input;
    const trimmed = input.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("data:")) return trimmed;
    if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("/src/") || trimmed.startsWith("/assets/")) {
      return `${window.location.origin}${trimmed}`;
    }
    return resolveMediaUrl(trimmed) || trimmed;
  };


  const setCleanPrintMode = (root: HTMLElement | null, enable: boolean) => {
    if (!root) return;
    const wrappers: HTMLElement[] = root.classList.contains("print-pages")
      ? [root]
      : Array.from(root.querySelectorAll<HTMLElement>(".print-pages"));
    wrappers.forEach((wrapper) => wrapper.classList.toggle("print-pages--clean", enable));
  };

  const handleDownloadPdf = async () => {
    if (!ready || !printAreaRef.current) return;
    const pages = Array.from(printAreaRef.current.querySelectorAll(".print-preview-page")) as HTMLElement[];
    if (pages.length === 0) return;
    setIsGeneratingPdf(true);
    setCleanPrintMode(printAreaRef.current, true);
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
      const baseName = snapshot?.dispatchNo ? `Service Report ${snapshot.dispatchNo}` : "Service Report";
      const filename = `${baseName}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setCleanPrintMode(printAreaRef.current, false);
      setIsGeneratingPdf(false);
    }
  };

  const generateReportPdfBytes = async (root: HTMLElement): Promise<ArrayBuffer | null> => {
    const pages = Array.from(root.querySelectorAll(".print-preview-page")) as HTMLElement[];
    if (pages.length === 0) return null;

    const pdf = new jsPDF("portrait", "pt", "a4");
    setCleanPrintMode(root, true);
    try {
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
      return pdf.output("arraybuffer");
    } finally {
      setCleanPrintMode(root, false);
    }
  };

  const buildMergedPdfUrl = async (attachments: { url: string; name?: string }[]): Promise<string | null> => {
    if (!ready || !printAreaRef.current) return null;
    setIsMergingPdf(true);
    try {
      const reportRoot = preparedPortalRef.current ?? printAreaRef.current;
      if (!reportRoot) {
        setMergedPdfError("Failed to prepare report layout for PDF.");
        return null;
      }

      await inlinePortalImages(reportRoot);
      await waitForImages(reportRoot);

      const reportBytes = await generateReportPdfBytes(reportRoot);
      if (!reportBytes) {
        setMergedPdfError("Failed to generate report PDF.");
        return null;
      }

      const merged = await PDFDocument.create();

      const reportDoc = await PDFDocument.load(reportBytes);
      const reportPages = await merged.copyPages(reportDoc, reportDoc.getPageIndices());
      reportPages.forEach((p: any) => merged.addPage(p));

      for (const attachment of attachments) {
        const attRes = await fetch(attachment.url, { credentials: "include", cache: "no-store" });
        if (!attRes.ok) {
          console.warn("[print] failed to fetch attachment pdf", { url: attachment.url, status: attRes.status });
          setMergedPdfError(`Failed to fetch attachment PDF${attachment.name ? ` (${attachment.name})` : ""} (HTTP ${attRes.status}).`);
          return null;
        }
        const contentType = attRes.headers.get("content-type") || "";
        const attBytes = await attRes.arrayBuffer();

        if (!contentType.toLowerCase().includes("pdf") && attBytes.byteLength < 10_000) {
          console.warn("[print] attachment response does not look like a PDF", {
            url: attachment.url,
            contentType,
            size: attBytes.byteLength,
          });
        }

        const attDoc = await PDFDocument.load(attBytes);
        const attPages = await merged.copyPages(attDoc, attDoc.getPageIndices());
        attPages.forEach((p: any) => merged.addPage(p));
      }

      const mergedBytes = await merged.save();
      const mergedArray = mergedBytes instanceof Uint8Array ? mergedBytes : new Uint8Array(mergedBytes);
      const mergedBuffer = new ArrayBuffer(mergedArray.byteLength);
      new Uint8Array(mergedBuffer).set(mergedArray);
      const blob = new Blob([mergedBuffer], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);

      return blobUrl;
    } catch (err) {
      console.error("[print] merge failed", err);
      setMergedPdfError("Merge failed. Check console for details.");
      return null;
    } finally {
      setIsMergingPdf(false);
    }
  };

  const handleMergedPrint = async () => {
    if (!hasAttachments) return;
    setMergedPdfError(null);

    const focusAndPrint = () => {
      try {
        mergedFrameRef.current?.contentWindow?.focus();
        mergedFrameRef.current?.contentWindow?.print();
      } catch {
        // ignore
      }
    };

    if (mergedPdfUrl) {
      focusAndPrint();
      return;
    }

    const url = await buildMergedPdfUrl(attachmentPdfs);
    if (!url) return;
    setMergedPdfUrl(url);
    // printing is a user gesture already; wait a moment for iframe to render.
    setTimeout(focusAndPrint, 400);
  };

  useEffect(() => {
    if (!autoPrint || hasAttachments) return;
    if (!ready || !printAreaRef.current) return;
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
  }, [autoPrint, ready, snapshot, hasAttachments]);

  const ensurePrintStyles = () => {
    const existing = document.getElementById("report-print-style") as HTMLStyleElement | null;
    const style = existing ?? document.createElement("style");
    style.id = "report-print-style";
    style.innerHTML = `
      .print-pages--clean .print-preview-page {
        background-color: #ffffff !important;
      }

      .print-pages--clean .print-preview-page * {
        background-color: transparent !important;
        box-shadow: none !important;
      }

      @page { size: A4 portrait; margin: 0; }
      @media print {
        body { background: #ffffff !important; }
        #report-print-root {
          display: block !important;
          position: static !important;
          left: 0 !important;
          top: 0 !important;
          width: auto !important;
          height: auto !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          overflow: visible !important;
        }
        body > *:not(#report-print-root) { display: none !important; }

        .print-pages {
          display: block !important;
          gap: 0 !important;
        }

        .print-preview-page {
          box-sizing: border-box !important;
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          break-inside: avoid;
          page-break-inside: avoid;
          background-color: #ffffff !important;
        }

        .print-preview-page * {
          background-color: transparent !important;
          box-shadow: none !important;
        }
      }
      @media screen {
        #report-print-root {
          position: fixed;
          left: -10000px;
          top: 0;
          width: 820px;
          height: auto;
          opacity: 0;
          pointer-events: none;
          overflow: visible;
        }
      }
    `;
    if (!existing) document.head.appendChild(style);
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

    const images = Array.from(clone.querySelectorAll("img")) as HTMLImageElement[];
    for (const img of images) {
      const raw = img.getAttribute("src") || "";
      const resolved = resolvePrintImageSrc(raw);
      img.setAttribute("loading", "eager");
      img.setAttribute("decoding", "sync");
      if (resolved && resolved !== raw) {
        img.setAttribute("src", resolved);
      }
    }

    portal.appendChild(clone);
    document.body.appendChild(portal);
    return portal;
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read blob"));
      reader.readAsDataURL(blob);
    });

  const inlinePortalImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
    if (images.length === 0) return;

    await Promise.all(
      images.map(async (img) => {
        const raw = img.getAttribute("src") || "";
        const resolved = resolvePrintImageSrc(raw);
        if (!resolved || resolved.startsWith("data:")) return;

        try {
          const res = await fetch(resolved, { credentials: "include", cache: "no-store" });
          if (!res.ok) {
            console.warn("[print] failed to fetch image", { url: resolved, status: res.status });
            return;
          }
          const blob = await res.blob();
          const dataUrl = await blobToDataUrl(blob);
          if (dataUrl) {
            img.setAttribute("src", dataUrl);
          }
        } catch {
          console.warn("[print] failed to inline image", { url: resolved });
        }
      })
    );
  };

  const waitForImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
    if (images.length === 0) return;

    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          })
      )
    );
  };

  const handleChromePrint = (afterPrint?: () => void) => {
    if (!ready || !printAreaRef.current) return;

    if (hasAttachments) {
      // merged printing is handled inside the modal (no new tab).
      void afterPrint;
      return;
    }

    const portal = preparedPortalRef.current;
    if (!portal) return;

    const cleanup = () => {
      try {
        portal.remove();
      } catch {
        // ignore
      }
      preparedPortalRef.current = null;
      setPrintReady(false);
      afterPrint?.();
    };

    const onAfterPrint = () => {
      window.removeEventListener("afterprint", onAfterPrint);
      cleanup();
    };

    window.addEventListener("afterprint", onAfterPrint);
    window.print();

    // Fallback: some browsers don't fire afterprint reliably.
    setTimeout(() => {
      window.removeEventListener("afterprint", onAfterPrint);
      if (preparedPortalRef.current) cleanup();
    }, 5000);
  };

  useEffect(() => {
    if (!open) {
      if (preparedPortalRef.current) {
        preparedPortalRef.current.remove();
        preparedPortalRef.current = null;
      }
      if (mergedPdfUrl) {
        URL.revokeObjectURL(mergedPdfUrl);
      }
      setMergedPdfUrl(null);
      setMergedPdfError(null);
      setPrintReady(false);
      setIsPreparingPrint(false);
      setIsGeneratingPdf(false);
      return;
    }
    if (!ready || !printAreaRef.current) return;

    let cancelled = false;
    setIsPreparingPrint(true);
    setPrintReady(false);

    const portal = mountPrintPortal();
    if (!portal) {
      setIsPreparingPrint(false);
      return;
    }
    preparedPortalRef.current = portal;

    (async () => {
      await inlinePortalImages(portal);
      await waitForImages(portal);
      if (cancelled) return;
      setPrintReady(true);
      setIsPreparingPrint(false);
      if (autoPrint && !hasAttachments) {
        handleChromePrint(() => onAutoPrintDone?.());
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ready, snapshot, autoPrint, hasAttachments, onAutoPrintDone]);

  useEffect(() => {
    if (!open) {
      document.title = originalTitleRef.current;
      return;
    }
    const dispatchTitle = snapshot?.dispatchNo ? `Service Report ${snapshot.dispatchNo}` : "Service Report";
    document.title = dispatchTitle;
    return () => {
      document.title = originalTitleRef.current;
    };
  }, [open, snapshot?.dispatchNo]);

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
            <h3 className="text-2xl font-semibold text-slate-900">
              Service Report
              {snapshot?.dispatchNo ? (
                <span className="ml-2 text-base font-medium text-slate-600">#{snapshot.dispatchNo}</span>
              ) : (
                <span className="ml-2 text-base font-medium text-slate-400">(dispatch belum tersedia)</span>
              )}
            </h3>
            <p className="text-sm text-slate-500">Layout dua halaman sesuai template.</p>
            {snapshot?.attachmentPdfUrl && (
              <p className="mt-2 text-xs font-semibold text-slate-600">
                Lampiran untuk merge:
                <span className="ml-2 rounded-full bg-slate-100 px-3 py-1 text-slate-800">
                  {snapshot.attachmentPdfName || "PDF"}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (snapshot?.attachmentPdfUrl) {
                  void handleMergedPrint();
                } else {
                  handleChromePrint();
                }
              }}
              disabled={!ready || isGeneratingPdf || isMergingPdf || isPreparingPrint || !printReady}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {snapshot?.attachmentPdfUrl ? "Print + Lampiran" : "Print"}
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
          <div className="mt-6 overflow-hidden rounded-[24px] bg-slate-50 p-4">
            {snapshot?.attachmentPdfUrl ? (
              <div className="min-h-[72vh] rounded-2xl bg-white">
                {mergedPdfError ? (
                  <div className="p-6 text-sm font-semibold text-rose-600">{mergedPdfError}</div>
                ) : mergedPdfUrl ? (
                  <iframe ref={mergedFrameRef} title="Merged PDF" src={mergedPdfUrl} className="h-[72vh] w-full" />
                ) : (
                  <div className="p-6 text-sm font-semibold text-slate-600">
                    Klik <span className="font-bold">Print + Lampiran</span> untuk membuat PDF gabungan (page 3+).
                  </div>
                )}

                {/* Off-screen report DOM used to generate PDF bytes for merging (must not be display:none) */}
                <div
                  style={{
                    position: "fixed",
                    left: "-10000px",
                    top: 0,
                    width: "820px",
                    opacity: 0,
                    pointerEvents: "none",
                  }}
                >
                  <div ref={printAreaRef} className="print-pages grid gap-6">
                    {ready && snapshot && (
                      <>
                        <PrintPageOne snapshot={snapshot} formatDate={formatDate} />
                        <PrintPageTwo snapshot={snapshot} formatDate={formatDate} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div ref={printAreaRef} className="print-pages grid gap-6">
                {ready && snapshot && (
                  <>
                    <PrintPageOne snapshot={snapshot} formatDate={formatDate} />
                    <PrintPageTwo snapshot={snapshot} formatDate={formatDate} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-[#d4d9e7] bg-white">
      <div className="border-b border-[#e4e7f2] bg-[#f8f9fc] px-4 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#6f748a]">{title}</p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function DefinitionGrid({ rows, columns = 1 }: { rows: { label: string; value: string }[]; columns?: 1 | 2 }) {
  const chunkSize = Math.ceil(rows.length / columns);
  const groups = Array.from({ length: columns }, (_, idx) => rows.slice(idx * chunkSize, (idx + 1) * chunkSize)).filter((group) => group.length);
  return (
    <div className={`grid gap-2 ${columns > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
      {groups.map((group, idx) => (
        <table key={`group-${idx}`} className="w-full border-collapse text-[12px] text-[#141b2d]">
          <tbody>
            {group.map((row) => (
              <tr key={row.label} className="align-top">
                <th className="w-[120px] py-0.5 pr-2 text-left text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7b819a]">
                  {row.label}
                </th>
                <td className="py-0.5 text-left font-semibold">
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
      className="print-preview-page relative mx-auto rounded-[18px] border border-[#c9cfe0] bg-white px-9 py-6"
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
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-15 mix-blend-multiply">
        <img src={watermarkLogo} alt="Watermark" className="max-h-[65%] max-w-[65%] object-contain" />
      </div>
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
          className="relative z-10 space-y-4"
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
  const tools = snapshot.tools?.length ? snapshot.tools : [{ code: "", description: "", usableLimit: "" }];
  

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
        <div className="overflow-hidden rounded-2xl bg-white">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[160px]" />
              <col className="w-[*]" />
              <col className="w-[160px]" />
            </colgroup>
            <thead className="bg-[#f4f6fb] text-left text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b8097]">
              <tr>
                <th className="px-3 py-1.5">Code/SN</th>
                <th className="px-3 py-1.5">Description</th>
                <th className="px-3 py-1.5">Usable limits</th>
              </tr>
            </thead>
            <tbody>
              {tools.slice(0, 6).map((item, index) => (
                <tr key={`tool-${index}`}>
                  <td className="px-3 py-1.5 text-sm text-[#151b2f]">{item.code || "-"}</td>
                  <td className="px-3 py-1.5 text-sm text-[#151b2f]">{item.description || "-"}</td>
                  <td className="px-3 py-1.5 text-sm text-[#151b2f]">{item.usableLimit || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function PrintPageTwo({ snapshot, formatDate }: { snapshot: PrintableReport; formatDate: (value?: string) => string }) {
  const materials = snapshot.spareparts?.length ? snapshot.spareparts : [{ qty: "", partNo: "", description: "", status: "" }];
  const beforeEvidence = (snapshot.beforeEvidence && snapshot.beforeEvidence.length > 0
    ? snapshot.beforeEvidence
    : snapshot.beforeImage
    ? [snapshot.beforeImage]
    : []) as string[];
  const afterEvidence = (snapshot.afterEvidence && snapshot.afterEvidence.length > 0
    ? snapshot.afterEvidence
    : snapshot.afterImage
    ? [snapshot.afterImage]
    : []) as string[];
  const evidenceCount = beforeEvidence.length + afterEvidence.length;
  const surveyUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdyNgH3_wVZnAnh-g5AF6g9QYWH-p6TYvAE_nz55DGlqqp8lw/viewform";

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
      <SectionCard title="Materials">
        <div className="overflow-hidden rounded-2xl bg-white">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[70px]" />
              <col className="w-[130px]" />
              <col className="w-[*]" />
              <col className="w-[140px]" />
            </colgroup>
            <thead className="bg-[#f4f6fb] text-left text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7b8097]">
              <tr>
                <th className="px-3 py-1.5">Qty</th>
                <th className="px-3 py-1.5">Part No</th>
                <th className="px-3 py-1.5">Description</th>
                <th className="px-3 py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((item, index) => (
                <tr key={`material-${index}`}>
                  <td className="px-3 py-1.5 text-sm text-[#151b2f]">{item.qty || "-"}</td>
                  <td className="px-3 py-1.5 text-sm text-[#151b2f]">{item.partNo || "-"}</td>
                  <td className="px-3 py-1.5 text-sm text-[#151b2f]">{item.description || "-"}</td>
                  <td className="px-3 py-1.5 text-sm text-[#151b2f]">{item.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  <div key={`before-${idx}`} className="overflow-hidden rounded-lg bg-white">
                    <img src={resolveMediaUrl(src) || src} alt={`Before ${idx + 1}`} className="h-14 w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9096ab]">After</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {afterEvidence.slice(0, 6).map((src, idx) => (
                  <div key={`after-${idx}`} className="overflow-hidden rounded-lg bg-white">
                    <img src={resolveMediaUrl(src) || src} alt={`After ${idx + 1}`} className="h-14 w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recommendation & Signature">
        <div className="space-y-5">
          <div className="rounded-2xl border border-dashed border-[#cfd4e4] bg-white px-3 py-2 text-sm text-[#151b2f] min-h-[100px] whitespace-pre-wrap">
            {snapshot.recommendation || "Tidak ada catatan."}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SignatureBlock title="Engineer Signature" name={snapshot.carriedBy} signature={snapshot.carriedSignature} date={snapshot.carriedDate} formatDate={formatDate} />
            <SignatureBlock title="Customer Signature" name={snapshot.approvedBy} signature={snapshot.approvedSignature} date={snapshot.approvedDate} formatDate={formatDate} />
          </div>
        </div>
      </SectionCard>
      
      <SectionCard title="Customer Satisfaction">
        <div className="grid items-center gap-4 md:grid-cols-[1fr,140px]">
          <div>
            <p className="text-sm font-semibold text-[#151b2f]">Customer Satisfaction</p>
            <p className="mt-1 text-xs text-[#7b8097]">Scan QR code untuk mengisi feedback layanan.</p>
            <p className="mt-2 break-all text-[10px] text-[#7b8097]">{surveyUrl}</p>
          </div>
          <div className="flex justify-center">
            <div className="rounded-2xl border border-[#e3e6f0] bg-white p-2">
              <img src={qrSurvey} alt="Customer Satisfaction QR" className="h-24 w-24" />
            </div>
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
    <div className="flex flex-col gap-1.5 rounded-2xl border border-[#e1e4f0] bg-[#f8f9fe] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#9096ab]">{title}</p>
      <div className="min-h-[80px] rounded-xl border border-dashed border-[#cfd4e4] bg-white p-2 flex items-center justify-center">
        {signature ? <img src={signature} alt={`${title} signature`} className="max-h-16 object-contain" /> : <span className="text-xs text-[#adb2c4]">No signature</span>}
      </div>
      <p className="text-sm font-semibold text-[#151b2f]">{name || "-"}</p>
      <p className="text-xs text-[#7b8097]">{date ? formatDate(date) : "-"}</p>
    </div>
  );
}
