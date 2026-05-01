"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PDFOptions = {
  filename: string;
  orientation?: "landscape" | "portrait";
  format?: "a4" | "a3";
  scale?: number;
  quality?: number;
};

function showLoadingIndicator() {
  if (document.getElementById("pdf-loading-indicator")) return;
  const div = document.createElement("div");
  div.id = "pdf-loading-indicator";
  div.innerHTML =
    '<div style="position:fixed;inset:0;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;z-index:99999;color:white;font-family:Arial,sans-serif;font-size:18px;font-weight:700;">Processing PDF...</div>';
  document.body.appendChild(div);
}

function hideLoadingIndicator() {
  document.getElementById("pdf-loading-indicator")?.remove();
}

function isUnsupportedColor(value: string) {
  return /\b(lab|lch|oklab|oklch|color)\(/i.test(value);
}

function sanitizeCloneColors(root: HTMLElement) {
  const elements = [root, ...Array.from(root.querySelectorAll("*"))] as HTMLElement[];

  elements.forEach((element) => {
    // Strip dark mode tailwind classes so PDF forces light mode
    if (element.className && typeof element.className === 'string') {
      element.className = element.className.replace(/\bdark:[^\s]+\b/g, '');
    }
    const computed = window.getComputedStyle(element);

    element.style.color = isUnsupportedColor(computed.color) ? "#111827" : computed.color || "#111827";
    element.style.backgroundColor =
      isUnsupportedColor(computed.backgroundColor) || computed.backgroundColor === "rgba(0, 0, 0, 0)"
        ? "transparent"
        : computed.backgroundColor;
    element.style.borderColor = isUnsupportedColor(computed.borderColor) ? "#e2e8f0" : computed.borderColor || "#e2e8f0";
    element.style.outlineColor = "#e2e8f0";
    element.style.boxShadow = "none";
    element.style.textShadow = "none";

    if (element.tagName === "TH") {
      element.style.backgroundColor = "#f1f5f9";
    }

    if (element.tagName === "SECTION" || element.id.includes("bill")) {
      element.style.backgroundColor = "#ffffff";
    }
  });
}

function sanitizeDocumentColors(doc: Document) {
  const html = doc.documentElement as HTMLElement | null;
  const body = doc.body as HTMLElement | null;

  if (html) {
    html.classList.remove("dark");
    html.style.backgroundColor = "#ffffff";
    html.style.color = "#111827";
  }

  if (body) {
    body.style.backgroundColor = "#ffffff";
    body.style.color = "#111827";
  }

  if (body) {
    sanitizeCloneColors(body);
  }
}

async function stageCloneForPDF(element: HTMLElement) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-20000px";
  wrapper.style.top = "0";
  wrapper.style.width = "1400px";
  wrapper.style.padding = "0";
  wrapper.style.margin = "0";
  wrapper.style.background = "#ffffff";
  wrapper.style.zIndex = "-1";

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.width = "1400px";
  clone.style.minWidth = "1400px";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.background = "#ffffff";
  clone.style.color = "#111827";
  clone.style.transform = "none";
  clone.style.display = "block";

  clone.querySelectorAll(".no-pdf, .print\\:hidden, button").forEach((node) => {
    (node as HTMLElement).style.display = "none";
  });

  clone.querySelectorAll("[class*='absolute']").forEach((node) => {
    const elementNode = node as HTMLElement;
    if (elementNode === clone) return;
    if (elementNode.id.includes("bill-measurement") || elementNode.className.includes("ra-page-break")) {
      elementNode.style.position = "relative";
      elementNode.style.left = "0";
      elementNode.style.top = "0";
      elementNode.style.width = "100%";
    }
  });

  clone.querySelectorAll("table").forEach((table) => {
    const elementNode = table as HTMLElement;
    elementNode.style.width = "100%";
    elementNode.style.tableLayout = "auto";
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  sanitizeCloneColors(clone);
  await new Promise((resolve) => setTimeout(resolve, 300));

  return { wrapper, clone };
}

function addCanvasPages(pdf: jsPDF, canvas: HTMLCanvasElement, quality: number, addFirstPage: boolean) {
  const marginY = 10;
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const innerHeight = pdfHeight - (marginY * 2);

  const imgData = canvas.toDataURL("image/jpeg", quality);
  const imgProps = pdf.getImageProperties(imgData);
  const renderedHeight = (imgProps.height * pdfWidth) / imgProps.width;

  if (addFirstPage) pdf.addPage();

  let heightLeft = renderedHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position + marginY, pdfWidth, renderedHeight);
  heightLeft -= innerHeight;

  while (heightLeft > 0) {
    position -= innerHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position + marginY, pdfWidth, renderedHeight);
    heightLeft -= innerHeight;
  }
}

export async function generateSegmentedBillPDF(elementIds: string[], options: PDFOptions) {
  const finalOptions = {
    orientation: options.orientation || "landscape",
    format: options.format || "a4",
    scale: options.scale || 2,
    quality: options.quality || 0.98,
    filename: options.filename,
  };

  showLoadingIndicator();

  try {
    const pdf = new jsPDF({
      orientation: finalOptions.orientation,
      unit: "mm",
      format: finalOptions.format,
    });

    let renderedAny = false;

    for (const elementId of elementIds) {
      const element = document.getElementById(elementId);
      if (!element) continue;

      const { wrapper, clone } = await stageCloneForPDF(element);

      try {
        const width = Math.max(clone.scrollWidth, clone.offsetWidth, 1400);
        const height = Math.max(clone.scrollHeight, clone.offsetHeight, 400);

        const canvas = await html2canvas(clone, {
          scale: finalOptions.scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width,
          height,
          windowWidth: width,
          windowHeight: height,
          scrollX: 0,
          scrollY: 0,
          foreignObjectRendering: false,
          onclone: (clonedDocument) => {
            sanitizeDocumentColors(clonedDocument);
          },
        });

        addCanvasPages(pdf, canvas, finalOptions.quality, renderedAny);
        renderedAny = true;
      } finally {
        wrapper.remove();
      }
    }

    if (!renderedAny) {
      throw new Error("No bill content found to export.");
    }

    pdf.save(finalOptions.filename);
  } finally {
    hideLoadingIndicator();
  }
}
