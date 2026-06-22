import { PDFDocument } from 'pdf-lib';
import jsPDF from 'jspdf';
import type { Member } from '../types';

export const generateWorkerPDF = async (worker: Member) => {
    try {
        // 1. Generate the cover page with jsPDF
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Colors
        const primaryColor = '#2e61b3ff'; // Lighter blue for top section

        // Add header background (height 22mm)
        doc.setFillColor(primaryColor);
        doc.rect(0, 0, pageWidth, 22, 'F');

        // Add Worker Info inside the blue box
        doc.setTextColor('#ffffff');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(worker.name.toUpperCase(), 15, 10);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`C.I.: ${worker.ci || 'No especificada'}`, 15, 17);

        // Get the jsPDF output as array buffer
        const coverPdfBytes = doc.output('arraybuffer');

        // 2. Use pdf-lib to merge the cover and the attached files
        const mergedPdf = await PDFDocument.create();

        // Load the cover page
        const coverDoc = await PDFDocument.load(coverPdfBytes);
        const [coverPage] = await mergedPdf.copyPages(coverDoc, [0]);
        mergedPdf.addPage(coverPage);

        // Load Logo
        try {
            const logoRes = await fetch('/logo-publicartel.png');
            if (logoRes.ok) {
                const logoBuf = await logoRes.arrayBuffer();
                const logoImg = await mergedPdf.embedPng(logoBuf);
                const logoDims = logoImg.scaleToFit(40 * 2.83465, 18 * 2.83465); // scale max 40x18 mm

                coverPage.drawImage(logoImg, {
                    x: coverPage.getWidth() - logoDims.width - (15 * 2.83465), // 15mm from right edge
                    y: coverPage.getHeight() - logoDims.height - ((22 * 2.83465 - logoDims.height) / 2), // vertically centered in 22mm header
                    width: logoDims.width,
                    height: logoDims.height
                });
            }
        } catch (err) {
            console.error('Error loading logo:', err);
        }

        // Load Signature
        let sigImg: any = null;
        try {
            const sigRes = await fetch('/firma-tecnico-prevencionista.png');
            if (sigRes.ok) {
                const sigBuf = await sigRes.arrayBuffer();
                sigImg = await mergedPdf.embedPng(sigBuf);
            }
        } catch (err) {
            console.error('Error loading signature:', err);
        }

        let yOffsetMM = 30;
        let yOffsetPt = coverPage.getHeight() - (yOffsetMM * 2.83465); // Top of the image area

        // Process attached files
        if (worker.files && worker.files.length > 0) {
            for (let i = 0; i < worker.files.length; i++) {
                const fileUrl = worker.files[i];
                try {
                    const response = await fetch(fileUrl);
                    if (!response.ok) continue;

                    const buffer = await response.arrayBuffer();
                    const contentType = response.headers.get('content-type') || '';
                    const lowerUrl = fileUrl.toLowerCase();

                    const isPdf = contentType.includes('pdf') || lowerUrl.endsWith('.pdf');
                    const isImage = contentType.includes('image') || lowerUrl.match(/\.(jpg|jpeg|png|webp|gif)$/);

                    if (i === 0) {
                        // Place on first page
                        let embeddedObj: any = null;
                        let dims = { width: 0, height: 0 };
                        const maxHeight = coverPage.getHeight() - (yOffsetMM * 2.83465) - (20 * 2.83465); // Leave 20mm bottom margin

                        if (isPdf) {
                            const attachmentDoc = await PDFDocument.load(buffer);
                            const pages = attachmentDoc.getPages();
                            if (pages.length > 0) {
                                embeddedObj = await mergedPdf.embedPage(pages[0]);
                                dims = embeddedObj.scaleToFit(coverPage.getWidth() - 40 * 2.83465, maxHeight);
                            }
                        } else if (isImage) {
                            if (contentType.includes('png') || lowerUrl.endsWith('.png')) {
                                embeddedObj = await mergedPdf.embedPng(buffer);
                            } else if (contentType.includes('jpeg') || contentType.includes('jpg') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) {
                                embeddedObj = await mergedPdf.embedJpg(buffer);
                            }
                            if (embeddedObj) {
                                dims = embeddedObj.scaleToFit(coverPage.getWidth() - 40 * 2.83465, maxHeight);
                            }
                        }

                        if (embeddedObj) {
                            const drawX = coverPage.getWidth() / 2 - dims.width / 2;
                            const drawY = yOffsetPt - dims.height; // subtract height because pdf-lib Y goes up from bottom
                            if (isPdf) {
                                coverPage.drawPage(embeddedObj, { x: drawX, y: drawY, width: dims.width, height: dims.height });
                            } else {
                                coverPage.drawImage(embeddedObj, { x: drawX, y: drawY, width: dims.width, height: dims.height });
                            }
                        }

                        // If it's a PDF and has more than 1 page, we should append the rest
                        if (isPdf) {
                            const attachmentDoc = await PDFDocument.load(buffer);
                            const pages = attachmentDoc.getPages();
                            for (let j = 1; j < pages.length; j++) {
                                const [copiedPage] = await mergedPdf.copyPages(attachmentDoc, [j]);
                                mergedPdf.addPage(copiedPage);
                            }
                        }

                    } else {
                        // Append as new pages
                        if (isPdf) {
                            const attachmentDoc = await PDFDocument.load(buffer);
                            const pages = await mergedPdf.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
                            pages.forEach((page) => mergedPdf.addPage(page));
                        } else if (isImage) {
                            let image;
                            if (contentType.includes('png') || lowerUrl.endsWith('.png')) {
                                image = await mergedPdf.embedPng(buffer);
                            } else if (contentType.includes('jpeg') || contentType.includes('jpg') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) {
                                image = await mergedPdf.embedJpg(buffer);
                            }

                            if (image) {
                                const page = mergedPdf.addPage([pageWidth * 2.83465, pageHeight * 2.83465]);
                                const dims = image.scaleToFit(page.getWidth() - 100, page.getHeight() - 100);
                                page.drawImage(image, {
                                    x: page.getWidth() / 2 - dims.width / 2,
                                    y: page.getHeight() / 2 - dims.height / 2,
                                    width: dims.width,
                                    height: dims.height,
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error adding file to PDF:', fileUrl, err);
                }
            }
        }

        // Draw Signature on all pages
        if (sigImg) {
            const allPages = mergedPdf.getPages();
            for (const page of allPages) {
                const sigDims = sigImg.scaleToFit(80 * 2.83465, 40 * 2.83465); // max 80x40 mm (doble de tamaño)
                page.drawImage(sigImg, {
                    x: page.getWidth() - sigDims.width - (10 * 2.83465), // 10mm margin from right
                    y: 10 * 2.83465, // 10mm margin from bottom
                    width: sigDims.width,
                    height: sigDims.height
                });
            }
        }

        // Save the merged PDF
        const pdfBytes = await mergedPdf.save();

        // Download it
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
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
