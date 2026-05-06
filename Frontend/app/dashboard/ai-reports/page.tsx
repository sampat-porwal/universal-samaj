"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { generateAIReportPDF } from "../../../lib/pdfGenerator";
import { FileText, Table as TableIcon, Download, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";

export default function AIReportsPage() {
  const [data, setData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Ek page par 10 rows dikhayenge

  // Page load hote hi Chatbox ka data uthayenge
  useEffect(() => {
    const savedReport = localStorage.getItem("current_ai_report");
    if (savedReport) {
      try {
        const parsedData = JSON.parse(savedReport);
        
        // 🌟 VALIDATION (Data Integrity Shield): 
        // Check karna zaroori hai ki AI ne sach mein Array (Table Data) bheja hai.
        // Agar AI ne galti se koi plain string ya single object bhej diya toh app crash hone se bach jayegi.
        if (Array.isArray(parsedData) && parsedData.length > 0) {
            setData(parsedData);
        } else {
            console.error("Warning: AI Data is not in a valid table/array format.");
        }
      } catch (e) {
        console.error("Error parsing report data");
      }
    }
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-gray-500">
        <TableIcon size={64} className="mb-4 text-gray-300" />
        <h2 className="text-2xl font-bold text-gray-700">No Report Found</h2>
        <p>Ask the AI Assistant to generate a report, then click "View Full Report" to see it here.</p>
      </div>
    );
  }

  // 🌟 Pagination Logic
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);
  const headers = Object.keys(data[0]);

  // 🌟 Excel Export Logic
  const exportToExcel = (exportData: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  return (
    <div className="p-6 text-black bg-white rounded-xl shadow-sm border border-gray-200 min-h-[85vh]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> AI Generated Report
        </h1>
        <div className="text-sm text-gray-500 font-medium">Total Records: {data.length}</div>
      </div>

      {/* 🌟 ACTION BUTTONS (Print & Excel) */}
      <div className="flex flex-wrap gap-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
        <button onClick={() => generateAIReportPDF("AI Report (Current Page)", currentData)} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-md hover:bg-indigo-100 transition font-medium text-sm border border-indigo-200">
          <FileText size={16} /> PDF (Current Page)
        </button>
        <button onClick={() => generateAIReportPDF("Full AI Report", data)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition font-medium text-sm">
          <FileText size={16} /> PDF (All Pages)
        </button>
        <div className="w-px h-8 bg-gray-300 mx-2 hidden sm:block"></div> {/* Divider */}
        <button onClick={() => exportToExcel(currentData, "AI_Report_CurrentPage")} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-md hover:bg-green-100 transition font-medium text-sm border border-green-200">
          <FileSpreadsheet size={16} /> Excel (Current Page)
        </button>
        <button onClick={() => exportToExcel(data, "AI_Report_Full")} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition font-medium text-sm">
          <FileSpreadsheet size={16} /> Excel (All Pages)
        </button>
      </div>

      {/* 🌟 DATA TABLE */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-bold">
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="p-3 border-b border-gray-200 whitespace-nowrap">{header.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 border-b last:border-0 border-gray-100 text-sm">
                {headers.map((col, colIndex) => (
                  <td key={colIndex} className="p-3 whitespace-nowrap text-gray-700">
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🌟 PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <span className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, data.length)} of {data.length} entries
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="px-4 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-md border border-blue-100">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}