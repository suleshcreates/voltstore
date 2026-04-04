import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Convert array of objects to CSV format
export function downloadCSV(data, filename) {
  if (!data || data.length === 0) return;

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Format rows
  const csvRows = [];
  csvRows.push(headers.join(',')); // Add header row
  
  for (const row of data) {
    const values = headers.map(header => {
      const escaped = ('' + row[header]).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate PDF Report using jsPDF
export function downloadReportPDF(marginData, shopInfo, period) {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(shopInfo?.shop_name || 'VoltStore', 14, 22);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Performance & Margin Report (${period})`, 14, 30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 36);

  // Table Data
  const tableData = marginData.map(row => {
    return [
      row.product_name,
      row.brand || 'N/A',
      `Rs. ${Number(row.avg_selling_price || 0).toFixed(0)}`,
      `Rs. ${Number(row.list_price || 0).toFixed(0)}`,
      `${Number(row.avg_discount_pct || 0).toFixed(1)}%`,
      `Rs. ${Number(row.avg_margin_amount || 0).toFixed(0)} (${Number(row.avg_margin_pct || 0).toFixed(1)}%)`,
      (row.times_sold || 0).toString()
    ];
  });

  autoTable(doc, {
    startY: 45,
    head: [['Product', 'Brand', 'Avg Sell', 'List Price', 'Avg Disc', 'Margin', 'Sold']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [40, 40, 45], textColor: 255 },
    styles: { fontSize: 8 },
  });

  doc.save(`VoltStore_Report_${period}_${Date.now()}.pdf`);
}

// Generate raw transactional CSV
export function downloadRawSalesCSV(salesData) {
  if (!salesData || salesData.length === 0) return;

  const csvRows = ['Invoice #,Date,Customer Name,Customer Phone,Product,Brand,Quantity,Unit Price,Discount %,Total'];
  
  salesData.forEach(sale => {
    const saleDate = new Date(sale.sold_at).toLocaleString('en-IN').replace(/,/g, '');
    const invoiceNum = sale.sale_number;
    const name = sale.customer_name || 'Walk-in';
    const phone = sale.customer_phone || 'N/A';
    
    sale.sale_items.forEach(item => {
      const productName = item.products?.name || 'Unknown';
      const brand = item.products?.brand || 'N/A';
      csvRows.push(`${invoiceNum},${saleDate},"${name}",${phone},"${productName}","${brand}",${item.quantity},${item.unit_price},${item.discount_pct},${item.total}`);
    });
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `VoltStore_Raw_Sales_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate raw transactional PDF
export function downloadRawSalesPDF(salesData, shopInfo) {
  const doc = new jsPDF();
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(shopInfo?.shop_name || 'VoltStore', 14, 22);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Sales Transaction History', 14, 30);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 36);

  const tableData = [];
  salesData.forEach(sale => {
    const saleDate = new Date(sale.sold_at).toLocaleDateString('en-IN');
    sale.sale_items.forEach(item => {
      tableData.push([
        sale.sale_number.toString(),
        saleDate,
        `${sale.customer_name || 'Walk-in'}\n${sale.customer_phone || 'N/A'}`,
        item.products?.name || 'Unknown',
        item.quantity.toString(),
        `Rs. ${Number(item.unit_price).toFixed(2)}`,
        `Rs. ${Number(item.total).toFixed(2)}`
      ]);
    });
  });

  autoTable(doc, {
    startY: 45,
    head: [['Inv #', 'Date', 'Customer', 'Product', 'Qty', 'Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [40, 40, 45], textColor: 255 },
    styles: { fontSize: 8 },
  });

  doc.save(`VoltStore_Sales_History_${Date.now()}.pdf`);
}
