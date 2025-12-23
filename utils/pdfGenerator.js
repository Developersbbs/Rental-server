const PDFDocument = require('pdfkit');

/**
 * Generate a rental invoice PDF
 * @param {Object} bill - Bill document with populated fields
 * @param {Object} rental - Rental document with populated fields
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateInvoicePDF(bill, rental) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];

            // Collect PDF data
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Colors
            const primaryColor = '#2563eb'; // Blue
            const secondaryColor = '#64748b'; // Gray
            const successColor = '#16a34a'; // Green

            // Header - Company Details
            doc.fontSize(24)
                .fillColor(primaryColor)
                .text('RENTAL INVOICE', { align: 'center' });

            doc.fontSize(10)
                .fillColor(secondaryColor)
                .text('Inventory Management System', { align: 'center' })
                .text('Phone: +91 1234567890 | Email: info@company.com', { align: 'center' })
                .moveDown(2);

            // Invoice Details Box
            const invoiceBoxY = doc.y;
            doc.rect(50, invoiceBoxY, 495, 80)
                .strokeColor('#e5e7eb')
                .stroke();

            doc.fontSize(10)
                .fillColor('#000')
                .text(`Invoice Number: ${bill.billNumber}`, 60, invoiceBoxY + 10)
                .text(`Invoice Date: ${new Date(bill.billDate).toLocaleDateString('en-IN')}`, 60, invoiceBoxY + 25)
                .text(`Rental ID: ${rental.rentalId}`, 60, invoiceBoxY + 40)
                .text(`Payment Status: ${bill.paymentStatus.toUpperCase()}`, 60, invoiceBoxY + 55);

            // Customer Details
            doc.fontSize(12)
                .fillColor(primaryColor)
                .text('CUSTOMER DETAILS', 60, invoiceBoxY + 100)
                .fontSize(10)
                .fillColor('#000')
                .text(`Name: ${bill.customerName}`, 60, invoiceBoxY + 120)
                .text(`Phone: ${bill.customerPhone}`, 60, invoiceBoxY + 135)
                .text(`Email: ${bill.customerEmail}`, 60, invoiceBoxY + 150);

            // Rental Duration Details
            const rentalDetailsY = invoiceBoxY + 180;
            doc.fontSize(12)
                .fillColor(primaryColor)
                .text('RENTAL DETAILS', 60, rentalDetailsY)
                .fontSize(10)
                .fillColor('#000')
                .text(`Start Time: ${new Date(rental.outTime).toLocaleString('en-IN')}`, 60, rentalDetailsY + 20)
                .text(`Return Time: ${rental.returnTime ? new Date(rental.returnTime).toLocaleString('en-IN') : 'N/A'}`, 60, rentalDetailsY + 35)
                .text(`Duration: ${bill.rentalDetails?.rentalDuration || 0} hours`, 60, rentalDetailsY + 50);

            // Items Table
            const tableTop = rentalDetailsY + 85;
            doc.fontSize(12)
                .fillColor(primaryColor)
                .text('ITEMS', 60, tableTop);

            // Table Header
            const tableHeaderY = tableTop + 25;
            doc.rect(50, tableHeaderY, 495, 25)
                .fillAndStroke('#f3f4f6', '#e5e7eb');

            doc.fontSize(10)
                .fillColor('#000')
                .text('Item', 60, tableHeaderY + 8)
                .text('Qty', 300, tableHeaderY + 8)
                .text('Rate', 370, tableHeaderY + 8)
                .text('Amount', 470, tableHeaderY + 8, { width: 65, align: 'right' });

            // Table Rows
            let currentY = tableHeaderY + 25;
            bill.items.forEach((item, index) => {
                const rowColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
                doc.rect(50, currentY, 495, 25)
                    .fillAndStroke(rowColor, '#e5e7eb');

                doc.fontSize(9)
                    .fillColor('#000')
                    .text(item.name, 60, currentY + 8, { width: 230 })
                    .text(item.quantity.toString(), 300, currentY + 8)
                    .text(`Rs.${item.price.toFixed(2)}`, 370, currentY + 8)
                    .text(`Rs.${item.total.toFixed(2)}`, 470, currentY + 8, { width: 65, align: 'right' });

                currentY += 25;
            });

            // Billing Summary
            currentY += 20;
            const summaryX = 350;
            const summaryWidth = 195;

            doc.fontSize(10)
                .fillColor('#000');

            // Subtotal
            doc.text('Subtotal:', summaryX, currentY)
                .text(`Rs.${bill.subtotal.toFixed(2)}`, summaryX, currentY, { width: summaryWidth, align: 'right' });
            currentY += 20;

            // Discount
            if (bill.discountPercent > 0) {
                doc.fillColor('#dc2626')
                    .text(`Discount (${bill.discountPercent}%):`, summaryX, currentY)
                    .text(`-Rs.${bill.discount.toFixed(2)}`, summaryX, currentY, { width: summaryWidth, align: 'right' });
                currentY += 20;

                doc.fillColor('#000')
                    .text('After Discount:', summaryX, currentY)
                    .text(`Rs.${(bill.subtotal - bill.discount).toFixed(2)}`, summaryX, currentY, { width: summaryWidth, align: 'right' });
                currentY += 20;
            }

            // Tax
            doc.fillColor('#000')
                .text(`Tax (${bill.taxPercent}%):`, summaryX, currentY)
                .text(`+Rs.${bill.taxAmount.toFixed(2)}`, summaryX, currentY, { width: summaryWidth, align: 'right' });
            currentY += 20;

            // Divider
            doc.moveTo(summaryX, currentY)
                .lineTo(summaryX + summaryWidth, currentY)
                .strokeColor('#e5e7eb')
                .stroke();
            currentY += 10;

            // Total Amount
            doc.fontSize(11)
                .fillColor('#000')
                .text('Total Amount:', summaryX, currentY)
                .text(`Rs.${bill.totalAmount.toFixed(2)}`, summaryX, currentY, { width: summaryWidth, align: 'right' });
            currentY += 20;

            // Advance Paid
            doc.fontSize(10)
                .text('Advance Paid:', summaryX, currentY)
                .text(`-Rs.${bill.paidAmount.toFixed(2)}`, summaryX, currentY, { width: summaryWidth, align: 'right' });
            currentY += 20;

            // Divider
            doc.moveTo(summaryX, currentY)
                .lineTo(summaryX + summaryWidth, currentY)
                .strokeColor('#e5e7eb')
                .stroke();
            currentY += 10;

            // Amount Due
            doc.fontSize(14)
                .fillColor(successColor)
                .text('AMOUNT DUE:', summaryX, currentY)
                .text(`Rs.${bill.dueAmount.toFixed(2)}`, summaryX, currentY, { width: summaryWidth, align: 'right' });

            // Footer - Terms & Conditions
            const footerY = 700;
            doc.fontSize(10)
                .fillColor(primaryColor)
                .text('Terms & Conditions', 50, footerY);

            doc.fontSize(8)
                .fillColor(secondaryColor)
                .text('1. Payment is due within 7 days of invoice date.', 50, footerY + 15)
                .text('2. Late payments may incur additional charges.', 50, footerY + 27)
                .text('3. Items must be returned in good condition.', 50, footerY + 39)
                .text('4. Damage charges are non-refundable.', 50, footerY + 51);

            // Footer - Thank You
            doc.fontSize(10)
                .fillColor(primaryColor)
                .text('Thank you for your business!', 50, footerY + 75, { align: 'center' });

            // Finalize PDF
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateInvoicePDF };
