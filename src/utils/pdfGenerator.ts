import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import type { Member } from '../types';

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH = 210 * MM_TO_PT;
const A4_HEIGHT = 297 * MM_TO_PT;
const FRAME_MARGIN = 6 * MM_TO_PT;

const HEADER_X = 9.3 * MM_TO_PT;
const HEADER_Y = A4_HEIGHT - 55.7 * MM_TO_PT;
const HEADER_WIDTH = A4_WIDTH - HEADER_X * 2;
const HEADER_HEIGHT = 47.4 * MM_TO_PT;

const FOOTER_X = HEADER_X;
const FOOTER_Y = 8.4 * MM_TO_PT;
const FOOTER_WIDTH = HEADER_WIDTH;
const FOOTER_HEIGHT = 30.5 * MM_TO_PT;

const PAGE_TAB_X = 168.8 * MM_TO_PT;
const PAGE_TAB_Y = 44.7 * MM_TO_PT;
const PAGE_TAB_WIDTH = 31.9 * MM_TO_PT;

const CONTENT_LEFT = 13 * MM_TO_PT;
const CONTENT_RIGHT = 13 * MM_TO_PT;
const CONTENT_BOTTOM = 60 * MM_TO_PT;
const FIRST_PAGE_CONTENT_TOP = HEADER_Y - 6 * MM_TO_PT;
const STANDARD_CONTENT_TOP = A4_HEIGHT - 13 * MM_TO_PT;

const COLORS = {
    gray: rgb(0.866, 0.867, 0.866),
    blue: rgb(0.172, 0.265, 0.586),
    black: rgb(0.08, 0.10, 0.14),
    muted: rgb(0.39, 0.45, 0.55),
    contactBlue: rgb(0.24, 0.532, 0.784),
};

type WorkerAttachment = {
    url: string;
    displayName: string;
};

type AttachmentRange = {
    name: string;
    startPage: number;
    endPage: number;
};

const fileNameFromUrl = (url: string) => {
    const rawName = url.split('/').pop()?.split('?')[0] || 'Documento adjunto';
    try { return decodeURIComponent(rawName); } catch { return rawName; }
};

const normalizeAttachment = (item: any): WorkerAttachment => {
    const url = typeof item === 'string' ? item : item?.url || '';
    return {
        url,
        displayName: typeof item === 'string'
            ? fileNameFromUrl(item)
            : item?.originalName || item?.document || item?.name || fileNameFromUrl(url),
    };
};

const truncateText = (text: string, font: PDFFont, size: number, maxWidth: number) => {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    let result = text;
    while (result.length > 1 && font.widthOfTextAtSize(`${result}...`, size) > maxWidth) {
        result = result.slice(0, -1);
    }
    return `${result}...`;
};

const loadPng = async (pdf: PDFDocument, url: string): Promise<PDFImage | null> => {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await pdf.embedPng(await response.arrayBuffer());
    } catch (error) {
        console.error(`Error loading PDF asset ${url}:`, error);
        return null;
    }
};

const drawFirstPageHeader = (
    page: PDFPage,
    worker: Member,
    ranges: AttachmentRange[],
    regularFont: PDFFont,
    boldFont: PDFFont,
) => {
    page.drawRectangle({
        x: HEADER_X,
        y: HEADER_Y,
        width: HEADER_WIDTH,
        height: HEADER_HEIGHT,
        color: COLORS.gray,
    });

    const top = HEADER_Y + HEADER_HEIGHT;
    const documentsX = HEADER_X + 9 * MM_TO_PT;
    const documentsWidth = 119 * MM_TO_PT;
    const workerRight = HEADER_X + HEADER_WIDTH - 9 * MM_TO_PT;
    const workerWidth = HEADER_WIDTH - 143 * MM_TO_PT;

    page.drawText('DOCUMENTOS:', {
        x: documentsX,
        y: top - 10 * MM_TO_PT,
        size: 13.8,
        font: boldFont,
        color: COLORS.black,
    });

    const items = ranges.length > 0
        ? ranges.map((range) => {
            const pageLabel = range.startPage === range.endPage
                ? `Pág. ${range.startPage}`
                : `Págs. ${range.startPage}-${range.endPage}`;
            return `${pageLabel}  |  ${range.name}`;
        })
        : ['Sin archivos adjuntos'];
    const availableListHeight = 28 * MM_TO_PT;
    const lineHeight = Math.min(12.6, availableListHeight / Math.max(items.length, 1));
    const listSize = Math.max(6.6, Math.min(10.2, lineHeight * 0.936));

    items.forEach((item, index) => {
        page.drawText(truncateText(item, regularFont, listSize, documentsWidth), {
            x: documentsX,
            y: top - 17 * MM_TO_PT - index * lineHeight,
            size: listSize,
            font: regularFont,
            color: COLORS.black,
        });
    });

    const workerTitle = 'FICHA DE OPERARIO';
    page.drawText(workerTitle, {
        x: workerRight - boldFont.widthOfTextAtSize(workerTitle, 11.5),
        y: top - 10 * MM_TO_PT,
        size: 11.5,
        font: boldFont,
        color: COLORS.black,
    });
    const workerName = truncateText(worker.name.toUpperCase(), boldFont, 11.4, workerWidth);
    page.drawText(workerName, {
        x: workerRight - boldFont.widthOfTextAtSize(workerName, 11.4),
        y: top - 21 * MM_TO_PT,
        size: 11.4,
        font: boldFont,
        color: COLORS.black,
    });
    const workerCi = truncateText(`C.I.: ${worker.ci || 'No especificada'}`, regularFont, 10.2, workerWidth);
    page.drawText(workerCi, {
        x: workerRight - regularFont.widthOfTextAtSize(workerCi, 10.2),
        y: top - 29 * MM_TO_PT,
        size: 10.2,
        font: regularFont,
        color: COLORS.black,
    });
};

const drawFooter = (
    page: PDFPage,
    currentPage: number,
    totalPages: number,
    regularFont: PDFFont,
    boldFont: PDFFont,
    logo: PDFImage | null,
) => {
    page.drawRectangle({
        x: FOOTER_X,
        y: FOOTER_Y,
        width: FOOTER_WIDTH,
        height: FOOTER_HEIGHT,
        color: COLORS.gray,
    });

    const footerTextX = FOOTER_X + 9 * MM_TO_PT;
    const footerNameY = FOOTER_Y + 22 * MM_TO_PT;
    page.drawText('MARÍA JOSÉ REGUEIRA', {
        x: footerTextX,
        y: footerNameY,
        size: 10.92,
        font: boldFont,
        color: COLORS.black,
    });
    page.drawText('Ing. Tec. Prevencionista', {
        x: footerTextX,
        y: footerNameY - 5.4 * MM_TO_PT,
        size: 8.88,
        font: regularFont,
        color: COLORS.black,
    });
    page.drawText('Responsable de seguridad y salud en el trabajo', {
        x: footerTextX,
        y: footerNameY - 10.8 * MM_TO_PT,
        size: 8.88,
        font: regularFont,
        color: COLORS.black,
    });
    page.drawText('(+598) 94 273 359   /   sst@publicartel.com', {
        x: footerTextX,
        y: footerNameY - 16.2 * MM_TO_PT,
        size: 8.88,
        font: regularFont,
        color: COLORS.contactBlue,
    });

    if (logo) {
        const dimensions = logo.scaleToFit(58 * MM_TO_PT, 17 * MM_TO_PT);
        page.drawImage(logo, {
            x: FOOTER_X + FOOTER_WIDTH - dimensions.width - 2.5 * MM_TO_PT,
            y: FOOTER_Y + (FOOTER_HEIGHT - dimensions.height) / 2,
            width: dimensions.width,
            height: dimensions.height,
        });
    }

    page.drawSvgPath('M 12 0 L 90.4 0 L 90.4 30.6 L 0 30.6 Z', {
        x: PAGE_TAB_X,
        y: PAGE_TAB_Y + 30.6,
        color: COLORS.gray,
    });

    const pageLabel = `Pág. ${currentPage}/${totalPages}`;
    const pageLabelSize = 9;
    const pageLabelWidth = boldFont.widthOfTextAtSize(pageLabel, pageLabelSize);
    page.drawText(pageLabel, {
        x: PAGE_TAB_X + (PAGE_TAB_WIDTH - pageLabelWidth) / 2,
        y: PAGE_TAB_Y + (30.6 - pageLabelSize) / 2 + 1.2,
        size: pageLabelSize,
        font: boldFont,
        color: COLORS.black,
    });
};

const drawFrame = (page: PDFPage) => {
    page.drawRectangle({
        x: FRAME_MARGIN,
        y: FRAME_MARGIN,
        width: A4_WIDTH - FRAME_MARGIN * 2,
        height: A4_HEIGHT - FRAME_MARGIN * 2,
        borderColor: COLORS.blue,
        borderWidth: 1.2,
    });
};

const drawUnsupportedFileMessage = (page: PDFPage, font: PDFFont, firstPage: boolean) => {
    const message = 'No fue posible incorporar la vista previa de este archivo.';
    const size = 11;
    const top = firstPage ? FIRST_PAGE_CONTENT_TOP : STANDARD_CONTENT_TOP;
    const y = CONTENT_BOTTOM + (top - CONTENT_BOTTOM) / 2;
    page.drawText(message, {
        x: A4_WIDTH / 2 - font.widthOfTextAtSize(message, size) / 2,
        y,
        size,
        font,
        color: COLORS.muted,
    });
};

export const generateWorkerPDF = async (worker: Member) => {
    try {
        const mergedPdf = await PDFDocument.create();
        const regularFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
        const boldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
        const logo = await loadPng(mergedPdf, '/logo-publicartel.png');
        const attachments = (worker.files || []).map(normalizeAttachment).filter((item) => item.url);
        const ranges: AttachmentRange[] = [];

        const createContentPage = () => mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
        const getContentTop = (pageNumber: number) => pageNumber === 1 ? FIRST_PAGE_CONTENT_TOP : STANDARD_CONTENT_TOP;

        if (attachments.length === 0) {
            const page = createContentPage();
            drawUnsupportedFileMessage(page, regularFont, true);
        }

        for (const attachment of attachments) {
            const startPage = mergedPdf.getPageCount() + 1;
            try {
                const response = await fetch(attachment.url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const buffer = await response.arrayBuffer();
                const contentType = (response.headers.get('content-type') || '').toLowerCase();
                const lowerUrl = attachment.url.toLowerCase().split('?')[0];
                const lowerName = attachment.displayName.toLowerCase();
                const isPdf = contentType.includes('pdf') || lowerUrl.endsWith('.pdf') || lowerName.endsWith('.pdf');
                const isPng = contentType.includes('png') || lowerUrl.endsWith('.png') || lowerName.endsWith('.png');
                const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg') || /\.jpe?g$/.test(lowerUrl) || /\.jpe?g$/.test(lowerName);

                if (isPdf) {
                    const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
                    for (const sourcePage of sourcePdf.getPages()) {
                        const page = createContentPage();
                        const pageNumber = mergedPdf.getPageCount();
                        const embeddedPage = await mergedPdf.embedPage(sourcePage);
                        const contentTop = getContentTop(pageNumber);
                        const maxWidth = A4_WIDTH - CONTENT_LEFT - CONTENT_RIGHT;
                        const maxHeight = contentTop - CONTENT_BOTTOM;
                        const scale = Math.min(maxWidth / embeddedPage.width, maxHeight / embeddedPage.height);
                        const width = embeddedPage.width * scale;
                        const height = embeddedPage.height * scale;
                        page.drawPage(embeddedPage, {
                            x: (A4_WIDTH - width) / 2,
                            y: CONTENT_BOTTOM + (maxHeight - height) / 2,
                            width,
                            height,
                        });
                    }
                    if (sourcePdf.getPageCount() === 0) {
                        const page = createContentPage();
                        drawUnsupportedFileMessage(page, regularFont, mergedPdf.getPageCount() === 1);
                    }
                } else if (isPng || isJpeg) {
                    const image = isPng ? await mergedPdf.embedPng(buffer) : await mergedPdf.embedJpg(buffer);
                    const page = createContentPage();
                    const pageNumber = mergedPdf.getPageCount();
                    const contentTop = getContentTop(pageNumber);
                    const maxHeight = contentTop - CONTENT_BOTTOM;
                    const dimensions = image.scaleToFit(A4_WIDTH - CONTENT_LEFT - CONTENT_RIGHT, maxHeight);
                    page.drawImage(image, {
                        x: (A4_WIDTH - dimensions.width) / 2,
                        y: CONTENT_BOTTOM + (maxHeight - dimensions.height) / 2,
                        width: dimensions.width,
                        height: dimensions.height,
                    });
                } else {
                    const page = createContentPage();
                    drawUnsupportedFileMessage(page, regularFont, mergedPdf.getPageCount() === 1);
                }
            } catch (error) {
                console.error('Error adding file to worker PDF:', attachment.url, error);
                const page = createContentPage();
                drawUnsupportedFileMessage(page, regularFont, mergedPdf.getPageCount() === 1);
            }

            ranges.push({
                name: attachment.displayName,
                startPage,
                endPage: mergedPdf.getPageCount(),
            });
        }

        const totalPages = mergedPdf.getPageCount();
        mergedPdf.getPages().forEach((page, index) => {
            const currentPage = index + 1;
            if (currentPage === 1) {
                drawFirstPageHeader(page, worker, ranges, regularFont, boldFont);
            }
            drawFooter(page, currentPage, totalPages, regularFont, boldFont, logo);
            drawFrame(page);
        });

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Ficha_Operario_${worker.name.replace(/\s+/g, '_')}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
