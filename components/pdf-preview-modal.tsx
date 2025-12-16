'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Edit2, Printer, Download, FileDown } from 'lucide-react';

interface PdfData {
  cleanText: string;
  patientName?: string;
  html?: string;
}

interface PdfPreviewModalProps {
  pdfData: PdfData;
  onClose: () => void;
  onEdit: () => void;
}

export function PdfPreviewModal({ pdfData, onClose, onEdit }: PdfPreviewModalProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfData.html || '');
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfData.html || '');
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([pdfData.cleanText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${pdfData.patientName || 'documento'}_limpo.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative bg-white dark:bg-slate-900 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${isFullScreen ? 'w-screen h-screen rounded-none' : 'w-full max-w-4xl max-h-[90vh]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Preview do PDF - {pdfData.patientName}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsFullScreen(!isFullScreen)}
              size="sm"
              variant="outline"
              className="text-slate-600 dark:text-slate-400"
            >
              {isFullScreen ? 'Minimizar' : 'Expandir'}
            </Button>
            <Button
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Preview */}
        <div className={`overflow-auto ${isFullScreen ? 'h-[calc(100vh-140px)]' : 'max-h-[calc(90vh-140px)]'} bg-slate-100 dark:bg-slate-800`}>
          <div className="flex justify-center p-4">
            <iframe
              srcDoc={pdfData.html}
              title="PDF Preview"
              className="w-full bg-white shadow-lg"
              style={{ minHeight: '1000px' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <Button
            onClick={handleDownloadTxt}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold transition-all"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar TXT
          </Button>
          <Button
            onClick={handleDownloadPdf}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
          <Button
            onClick={onEdit}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all"
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
          >
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
