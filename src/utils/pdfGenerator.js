import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatRupee = (n) => 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function generateInvoice(saleData, items, shopInfo, returnType = 'save') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors based on the provided design
  const darkColors = [40, 40, 45];
  const redColor = [255, 51, 51];
  const lightGrey = [245, 245, 245];

  // ── Header Section ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(darkColors[0], darkColors[1], darkColors[2]);
  doc.text(shopInfo.shop_name || 'VOLTSTORE', 16, 25);

  // ── Customer & Invoice Details ──
  let currentY = 45;
  
  // Left: Customer Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Customer Detail', 16, currentY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Name: ${saleData.customer_name || 'Walk-in Customer'}`, 16, currentY + 6);
  doc.text(`Phone: ${saleData.customer_phone || 'N/A'}`, 16, currentY + 11);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 16, currentY + 16);

  // Right: Invoice #
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('INVOICE#', pageWidth - 16, currentY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(String(saleData.sale_number || Date.now()).padStart(7, '0'), pageWidth - 16, currentY + 6, { align: 'right' });

  // ── Separator Line ──
  currentY += 18;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(16, currentY, pageWidth - 16, currentY);

  // ── Items Table ──
  currentY += 8;
  
  const tableData = items.map((item) => {
    const unitPrice = item.actualPrice ?? item.price;
    const mrp = item.price;
    const discountAmt = mrp - unitPrice;
    
    let desc = item.name;
    if (discountAmt > 0) {
      desc += `\n(MRP: ${mrp}, Disc: -${discountAmt})`;
    }

    return [
      desc,
      formatRupee(unitPrice),
      item.qty.toString(),
      formatRupee(unitPrice * item.qty)
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['PRODUCTS', 'PRICE', 'QTY', 'TOTAL']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: darkColors,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: {
      cellPadding: 4,
      textColor: [60, 60, 60],
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: lightGrey
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' }
    },
    margin: { left: 16, right: 16 }
  });

  // ── Summary Section ──
  const finalY = doc.lastAutoTable.finalY + 15;
  
  // Left: Payment Data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('PAYMENT DATA:', 16, finalY);
  doc.text(`PAYMENT METHOD: ${(saleData.payment_method || 'CASH').toUpperCase()}`, 16, finalY + 5);
  doc.text(`SHOP GST: ${shopInfo.gst_number || 'N/A'}`, 16, finalY + 10);
  doc.text(`Date of Supply: ${new Date().toLocaleDateString('en-IN')}`, 16, finalY + 15);

  // Right: Subtotals
  const valColX = pageWidth - 16;
  const labelX = valColX - 35; // This prevents text overlap by keeping labels firmly to the left of the values
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('SUBTOTAL (MRP)', labelX, finalY, { align: 'right' });
  doc.text(formatRupee(saleData.total_mrp || 0), valColX, finalY, { align: 'right' });

  if (saleData.total_discount > 0) {
    doc.text('DISCOUNT', labelX, finalY + 6, { align: 'right' });
    doc.text(`-${formatRupee(saleData.total_discount)}`, valColX, finalY + 6, { align: 'right' });
  }

  // Final Total
  doc.setFontSize(11);
  doc.text('TOTAL', labelX, finalY + 14, { align: 'right' });
  doc.text(formatRupee(saleData.total || 0), valColX, finalY + 14, { align: 'right' });

  // ── Separator Line ──
  doc.setDrawColor(220, 220, 220);
  doc.line(16, finalY + 22, pageWidth - 16, finalY + 22);

  // ── Terms & Conditions ──
  const termsY = finalY + 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('TERMS AND CONDITIONS', 16, termsY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const termsText = "Goods once sold will not be taken back or exchanged. Subject to local jurisdiction. Warranty is subject to manufacturer's terms and conditions.";
  const splitTerms = doc.splitTextToSize(termsText, pageWidth - 32);
  doc.text(splitTerms, 16, termsY + 6);

  // ── Footer Graphics (Moved up to reduce whitespace) ──
  const footerY = termsY + 20;
  
  // The dark block
  doc.setFillColor(...darkColors);
  doc.rect(16, footerY, pageWidth - 32, 20, 'F');
  
  // The red bottom bar
  doc.setFillColor(...redColor);
  doc.rect(16, footerY + 20, pageWidth - 32, 4, 'F'); 

  // Footer text inside dark rectangle
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  
  const formattedPhone = shopInfo.phone || 'N/A';
  const email = shopInfo.email || 'hello@voltstore.com';
  const location = `${shopInfo.city || 'City'}, ${shopInfo.state || 'State'}`;

  // Footer col 1 - Phone
  doc.text(`Tel: ${formattedPhone}`, 24, footerY + 10);
  // Footer col 2 - Website/Email
  doc.text(email, pageWidth / 2, footerY + 10, { align: 'center' });
  // Footer col 3 - Location
  doc.text(location, pageWidth - 24, footerY + 10, { align: 'right' });

  // ── Branding at the absolute bottom of page ──
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text('Powered by VoltStore', pageWidth / 2, pageHeight - 8, { align: 'center' });

  if (returnType === 'bloburl') {
    return doc.output('bloburl');
  } else if (returnType === 'blob') {
    return doc.output('blob');
  } else {
    doc.save(`Invoice_${saleData.sale_number || Date.now()}.pdf`);
  }
}
