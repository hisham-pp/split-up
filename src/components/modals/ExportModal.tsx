'use client';

import React from 'react';
import { LocalGroup, LocalGroupMember, LocalExpense, LocalSettlement } from '@/lib/db/db';
import { formatCurrency } from '@/utils/formatters';
import { toMajorUnits } from '@/lib/financial/financialEngine';
import { X, Download, FileSpreadsheet, FileText } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: LocalGroup;
  members: LocalGroupMember[];
  expenses: LocalExpense[];
  settlements: LocalSettlement[];
  balances: Record<string, { totalPaid: number; totalOwed: number; netBalance: number }>;
  currency: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  group,
  members,
  expenses,
  settlements,
  balances,
  currency,
}) => {
  if (!isOpen) return null;

  const getMemberName = (id: string) => {
    const m = members.find((mem) => mem.id === id);
    return m ? m.memberName : 'Unknown';
  };

  const handleExportCSV = () => {
    const rows = [
      ['SPLIT UP - GROUP EXPENSE SUMMARY REPORT'],
      ['Group Name', group.name],
      ['Category', group.category],
      ['Generated Date', new Date().toLocaleString()],
      [],
      ['--- MEMBERS & NET BALANCES ---'],
      ['Member Name', 'Total Paid', 'Total Owed', 'Net Balance'],
      ...members.map((m) => {
        const bal = balances[m.id] || { totalPaid: 0, totalOwed: 0, netBalance: 0 };
        return [
          m.memberName,
          toMajorUnits(bal.totalPaid).toFixed(2),
          toMajorUnits(bal.totalOwed).toFixed(2),
          toMajorUnits(bal.netBalance).toFixed(2),
        ];
      }),
      [],
      ['--- EXPENSES LOG ---'],
      ['Date', 'Title', 'Category', 'Amount', 'Split Mode', 'Notes'],
      ...expenses.map((e) => [
        new Date(e.date).toLocaleDateString(),
        `"${e.title.replace(/"/g, '""')}"`,
        e.category,
        toMajorUnits(e.amountCents).toFixed(2),
        e.splitMode,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ]),
      [],
      ['--- SETTLEMENTS LOG ---'],
      ['Date', 'Payer', 'Payee', 'Amount', 'Notes'],
      ...settlements.map((s) => [
        new Date(s.date).toLocaleDateString(),
        getMemberName(s.payerMemberId),
        getMemberName(s.payeeMemberId),
        toMajorUnits(s.amountCents).toFixed(2),
        `"${(s.notes || '').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${group.name.replace(/\s+/g, '_')}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    // Generate styled printable HTML report window
    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${group.name} - Expense Summary Report</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #0f172a; line-height: 1.5; }
            h1 { color: #4338ca; margin-bottom: 4px; }
            .meta { font-size: 14px; color: #64748b; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 32px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; font-size: 13px; }
            th { background-color: #f1f5f9; font-weight: 600; }
            .positive { color: #16a34a; font-weight: 600; }
            .negative { color: #dc2626; font-weight: 600; }
            .section-title { font-size: 16px; font-weight: 700; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
          </style>
        </head>
        <body>
          <h1>${group.name} Expense Report</h1>
          <div class="meta">Category: ${group.category} | Generated on ${new Date().toLocaleDateString()}</div>

          <div class="section-title">Member Balances</div>
          <table>
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Total Paid</th>
                <th>Total Owed</th>
                <th>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              ${members
                .map((m) => {
                  const b = balances[m.id] || { totalPaid: 0, totalOwed: 0, netBalance: 0 };
                  const net = toMajorUnits(b.netBalance);
                  return `
                    <tr>
                      <td>${m.memberName}</td>
                      <td>${formatCurrency(toMajorUnits(b.totalPaid), currency)}</td>
                      <td>${formatCurrency(toMajorUnits(b.totalOwed), currency)}</td>
                      <td class="${net >= 0 ? 'positive' : 'negative'}">
                        ${net >= 0 ? '+' : ''}${formatCurrency(net, currency)}
                      </td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>

          <div class="section-title">Expenses (${expenses.length})</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Split Mode</th>
              </tr>
            </thead>
            <tbody>
              ${expenses
                .map(
                  (e) => `
                <tr>
                  <td>${new Date(e.date).toLocaleDateString()}</td>
                  <td>${e.title}</td>
                  <td>${e.category}</td>
                  <td><strong>${formatCurrency(toMajorUnits(e.amountCents), currency)}</strong></td>
                  <td>${e.splitMode}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(reportHtml);
      printWin.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Download className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Export Group Data</h2>
          <p className="text-xs text-slate-400 mt-1">
            Export expenses and net balance summary for <span className="text-indigo-300 font-semibold">{group.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExportCSV}
            className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-100 text-sm">Export CSV</span>
            <span className="text-[11px] text-slate-400">Raw spreadsheet format</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all flex flex-col items-center text-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-100 text-sm">Printable PDF</span>
            <span className="text-[11px] text-slate-400">Formatted summary sheet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
