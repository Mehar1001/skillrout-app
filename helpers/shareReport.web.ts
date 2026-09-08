import { generateReportHtml, ReportSummary } from './reportTemplate';

const shareOrDownload = async (dataUrl: string, mimeType: string, filename: string) => {
  // Convert data URL to blob
  let blob: Blob;
  if (dataUrl.startsWith('data:')) {
    const [header, base64] = dataUrl.split(',');
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    blob = new Blob([byteArray], { type: mimeType });
  } else {
    const response = await fetch(dataUrl);
    blob = await response.blob();
  }
  
  const file = new File([blob], filename, { type: mimeType });
  const browser = navigator as Navigator & { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean };
  if (browser.share && browser.canShare?.({ files: [file] })) {
    await browser.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

const renderCapture = async (html: string) => {
  const container = document.createElement('div');
  container.style.cssText = 'position: fixed; left: -10000px; top: 0; width: 794px; background: #fff; z-index: -1;';
  container.innerHTML = html;
  document.body.appendChild(container);
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  return container;
};

export const shareReportPdf = async (summary: ReportSummary, startDate: string, endDate: string, businessName?: string) => {
  const html = generateReportHtml(summary, startDate, endDate, businessName);
  if (!html || html.length === 0) {
    throw new Error('Failed to generate report HTML');
  }
  const container = await renderCapture(html);
  try {
    const { toJpeg } = await import('html-to-image');
    const dataUrl = await toJpeg(container, { quality: 0.92, backgroundColor: '#FFFFFF', pixelRatio: 2 });
    if (!dataUrl || dataUrl.length === 0) {
      throw new Error('Failed to generate JPEG from HTML');
    }
    const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
    const image = new Image();
    image.src = dataUrl;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; });
    const margin = 10;
    const contentWidth = 210 - margin * 2;
    const pageHeight = 297;
    const imageHeight = (image.height / image.width) * contentWidth;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    let offset = 0;
    while (offset < imageHeight) {
      if (offset > 0) pdf.addPage();
      pdf.addImage(dataUrl, 'JPEG', margin, margin - offset, contentWidth, imageHeight);
      offset += pageHeight - margin * 2;
    }
    await shareOrDownload(pdf.output('datauristring'), 'application/pdf', `skillrout-report-${startDate}-to-${endDate}.pdf`);
  } finally {
    container.remove();
  }
};

export const shareReportJpeg = async (summary: ReportSummary, startDate: string, endDate: string, businessName?: string) => {
  const html = generateReportHtml(summary, startDate, endDate, businessName);
  if (!html || html.length === 0) {
    throw new Error('Failed to generate report HTML');
  }
  const container = await renderCapture(html);
  try {
    const { toJpeg } = await import('html-to-image');
    const dataUrl = await toJpeg(container, { quality: 0.92, backgroundColor: '#FFFFFF', pixelRatio: 2 });
    if (!dataUrl || dataUrl.length === 0) {
      throw new Error('Failed to generate JPEG from HTML');
    }
    await shareOrDownload(dataUrl, 'image/jpeg', `skillrout-report-${startDate}-to-${endDate}.jpg`);
  } finally {
    container.remove();
  }
};
