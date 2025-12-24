
import { Transaction, Client, Order, Measurement, PaymentRecord, Currency } from '../types';

declare const jspdf: any;

const loadFonts = async (doc: any) => {
  try {
    const response = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/padauk/Padauk-Regular.ttf');
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise<void>((resolve) => {
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        doc.addFileToVFS('Padauk-Regular.ttf', base64data);
        doc.addFont('Padauk-Regular.ttf', 'Padauk', 'normal');
        doc.setFont('Padauk');
        resolve();
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to load Myanmar font", e);
  }
};

export const generateInvoicePDF = async (client: Client, order: Order, measurement?: Measurement, currency?: Currency) => {
  const doc = new jspdf.jsPDF();
  await loadFonts(doc);

  const PRIMARY_PURPLE = [156, 39, 176];
  const SECONDARY_PURPLE = [248, 248, 250];
  const sym = currency?.symbol || 'MMK';

  // Design elements - Professional Header
  doc.setFillColor(...PRIMARY_PURPLE);
  doc.rect(0, 0, 210, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  // doc.setFont(undefined, 'bold'); // Padauk doesn't have bold in this file, so we stick to normal or let it fake it
  doc.text("BA BAKE", 20, 30);
  doc.setFontSize(11);
  // doc.setFont(undefined, 'normal');
  doc.text("Haute Couture & Bespoke Tailoring", 20, 40);
  doc.text("Yangon, Myanmar • htethtetmu@babake.pro", 20, 46);

  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255, 0.15);
  doc.text("BILL", 155, 45);

  // Client Info Section
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  // doc.setFont(undefined, 'bold');
  doc.text("BILL TO:", 20, 75);
  // doc.setFont(undefined, 'normal');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(client.name, 20, 83);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(client.phone, 20, 90);
  if (client.address) {
    const splitAddress = doc.splitTextToSize(client.address, 70);
    doc.text(splitAddress, 20, 97);
  }

  // Invoice Meta
  // doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice No: #INV-${order.id.slice(0, 8).toUpperCase()}`, 140, 75);
  // doc.setFont(undefined, 'normal');
  doc.text(`Order Date: ${new Date(order.created_at).toLocaleDateString()}`, 140, 82);
  doc.text(`Deadline: ${new Date(order.deadline).toLocaleDateString()}`, 140, 89);

  // Design Summary
  doc.setFillColor(...SECONDARY_PURPLE);
  doc.roundedRect(20, 110, 170, 25, 4, 4, 'F');
  // doc.setFont(undefined, 'bold');
  doc.text("DESIGN DESCRIPTION:", 25, 118);
  // doc.setFont(undefined, 'normal');
  doc.text(order.description, 25, 126);

  // Main Billing Table - Separated Fabric and Dress costs
  const tableHeaders = [["Item Description", `Amount (${sym})`]];

  const workmanshipCost = order.total_amount - order.fabric_cost;

  const tableBody = [
    ["Fabric Price", order.fabric_cost.toLocaleString()],
    ["Dress Price (Labor / Tailoring)", workmanshipCost.toLocaleString()]
  ];

  doc.autoTable({
    startY: 145,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_PURPLE, fontSize: 10, halign: 'left', font: 'Padauk' },
    bodyStyles: { font: 'Padauk' },
    columnStyles: {
      1: { halign: 'right' }
    },
    styles: { font: 'Padauk' }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;

  // Totals Summary Block
  const summaryX = 130;
  doc.setFontSize(12);
  // doc.setFont(undefined, 'bold');
  doc.setTextColor(...PRIMARY_PURPLE);
  doc.text("BILL SUMMARY", summaryX, currentY);

  doc.setFontSize(10);
  // doc.setFont(undefined, 'normal');
  doc.setTextColor(0, 0, 0);

  currentY += 10;
  doc.text("Total Amount:", summaryX, currentY);
  doc.text(`${order.total_amount.toLocaleString()} ${sym}`, 190, currentY, { align: 'right' });

  currentY += 7;
  doc.text("Paid (Deposits):", summaryX, currentY);
  doc.setTextColor(0, 150, 0);
  doc.text(`- ${order.paid_amount.toLocaleString()} ${sym}`, 190, currentY, { align: 'right' });

  currentY += 3;
  doc.line(summaryX, currentY, 190, currentY);

  currentY += 8;
  doc.setFontSize(12);
  // doc.setFont(undefined, 'bold');
  doc.setTextColor(255, 0, 0);
  doc.text("BALANCE DUE:", summaryX, currentY);
  const balance = order.total_amount - order.paid_amount;
  doc.text(`${balance.toLocaleString()} ${sym}`, 190, currentY, { align: 'right' });

  // Footer / Terms
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text("Terms & Conditions:", 20, 275);
  doc.text("1. 50% deposit required for fabrication commencement.", 20, 280);
  doc.text("2. Garments will not be released until final balance is cleared.", 20, 285);

  doc.save(`Invoice_${client.name.replace(/\s/g, '_')}_${order.id.slice(0, 4)}.pdf`);
};

export const generateFinancialReport = async (transactions: Transaction[], period: string, currency?: Currency) => {
  const doc = new jspdf.jsPDF();
  await loadFonts(doc);
  const sym = currency?.symbol || 'MMK';

  doc.setFillColor(156, 39, 176);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("BA BAKE FINANCIAL REPORT", 15, 25);
  doc.setFontSize(10);
  doc.text(`Period: ${period}`, 15, 33);

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Total Income: ${income.toLocaleString()} ${sym}`, 15, 50);
  doc.text(`Total Expense: ${expense.toLocaleString()} ${sym}`, 15, 58);
  doc.setFontSize(14);
  // doc.setFont(undefined, 'bold');
  doc.text(`Net Balance: ${(income - expense).toLocaleString()} ${sym}`, 15, 70);
  // doc.setFont(undefined, 'normal');

  const body = transactions.map(t => [
    t.date,
    t.category,
    t.description,
    t.type.toUpperCase(),
    t.amount.toLocaleString()
  ]);

  doc.autoTable({
    startY: 80,
    head: [['Date', 'Category', 'Description', 'Type', `Amount (${sym})`]],
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [156, 39, 176], font: 'Padauk' },
    bodyStyles: { font: 'Padauk' },
    styles: { font: 'Padauk' }
  });

  doc.save(`BaBake_Report_${period.replace(/\s/g, '_')}.pdf`);
};
