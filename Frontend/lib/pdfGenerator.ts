import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateInvoicePDF = (order: any) => {
  const doc = new jsPDF();

  // 1. Header (Company Branding)
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text("INVOICE / BILL", 105, 15, { align: "center" });
  
  doc.setFontSize(12);
  doc.text("Your Company Name", 14, 25);
  doc.setFontSize(10);
  doc.text("Bhilwara, Rajasthan, India", 14, 30);
  doc.text("GSTIN: 08XXXXXXXXXXXXX", 14, 35);

  // 2. Client & Order Details
  doc.line(14, 40, 196, 40); // Horizontal Line
  doc.text(`Bill To: ${order.client_name}`, 14, 50);
  doc.text(`Order ID: SO#${order.id}`, 140, 50);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 55);

  // 3. Items Table
  autoTable(doc, {
    startY: 65,
    head: [['Product', 'Total Qty', 'Delivered Qty', 'Rate', 'Total Amount']],
    body: [
      [
        order.product_name, 
        `${order.ordered_qty} m`, 
        `${order.delivered_qty} m`, 
        `Rs. ${(Number(order.total_bill) / Number(order.ordered_qty)).toFixed(2)}`, 
        `Rs. ${order.total_bill}`
      ]
    ],
    theme: 'striped',
    headStyles: { fillColor: [63, 81, 181] } // Indigo Blue
  });

  // 4. Summary & Payments
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Total Received: Rs. ${order.amount_received}`, 140, finalY);
  doc.setFont("helvetica", "bold");
  doc.text(`Balance Due: Rs. ${order.balance_amount}`, 140, finalY + 7);

  // 5. Footer
  doc.setFontSize(8);
  doc.text("This is a computer generated invoice.", 105, 285, { align: "center" });

  // Download
  doc.save(`Invoice_SO${order.id}.pdf`);
};


// 🌟 NAYA: Production Job Card / Receipt ke liye function
export const generateProductionPDF = (job: any) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(234, 88, 12); // Orange color for Production
  doc.text("PRODUCTION JOB CARD", 105, 15, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(`Job ID: JOB#${job.id}`, 14, 25);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 25);

  doc.line(14, 30, 196, 30);

  // Job Details
  doc.setFontSize(12);
  doc.text(`Factory / Karigar: ${job.production_company_name}`, 14, 40);
  doc.text(`For Order: ${job.sales_order_display}`, 14, 47);

  // Table: Summary of Job
  autoTable(doc, {
    startY: 55,
    head: [['Description', 'Quantity', 'Rate', 'Total Bill']],
    body: [
      [
        'Fabric Production / Weaving', 
        `${job.given_qty} m`, 
        `Rs. ${job.job_rate_per_meter}`, 
        `Rs. ${job.total_cost}`
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [234, 88, 12] } // Orange
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Status Summary
  doc.setFontSize(10);
  doc.text(`Material Received so far: ${job.received_qty} meters`, 14, finalY);
  doc.text(`Balance to be received: ${Number(job.given_qty) - Number(job.received_qty)} meters`, 14, finalY + 7);
  
  doc.setFont("helvetica", "bold");
  doc.text(`Total Amount Paid: Rs. ${job.amount_paid}`, 120, finalY);
  doc.setTextColor(220, 38, 38); // Red for Balance
  doc.text(`Balance Due: Rs. ${job.balance_due}`, 120, finalY + 7);

  doc.save(`Production_Job_${job.id}.pdf`);
};



// 🌟 UNIVERSAL AI REPORT GENERATOR
export const generateAIReportPDF = (title: string, data: any[]) => {
  if (!data || data.length === 0) {
    alert("No data available to generate report.");
    return;
  }

  const doc = new jsPDF();
  
  // 1. Header
  doc.setFontSize(18);
  doc.text(title.toUpperCase(), 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
  doc.line(14, 25, 196, 25);

  // 2. Extract Headers (JSON ki keys nikalna)
  const headers = Object.keys(data[0]).map(key => key.replace(/_/g, ' ').toUpperCase());
  
  // 3. Extract Rows
  const rows = data.map(item => Object.values(item));

  // 4. Auto-Generate Table
  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80] }, // Dark Professional Grey/Blue
    styles: { fontSize: 8 },
  });

  doc.save(`AI_Report_${new Date().getTime()}.pdf`);
};