"use client";

import { Button } from "./ui/Button";

export function ExportButtons({
  filename,
  columns,
  rows,
  title,
}: {
  filename: string;
  columns: string[];
  rows: (string | number)[][];
  title: string;
}) {
  async function exportExcel() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([columns, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(12);
    doc.text(title, 14, 12);
    autoTable(doc, {
      head: [columns],
      body: rows as any,
      startY: 18,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [32, 36, 46] },
    });
    doc.save(`${filename}.pdf`);
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={exportExcel}>
        ⬇ Excel
      </Button>
      <Button variant="secondary" onClick={exportPdf}>
        ⬇ PDF
      </Button>
    </div>
  );
}
