"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, ZoomIn, ZoomOut, Maximize2, Share2, QrCode } from 'lucide-react';
import Link from 'next/link';

interface PdfViewerProps {
  pdfUrl: string;
  documentId: string;
  fileName: string;
  txtUrl?: string;
  zipUrl?: string;
}

export function PdfViewer({ pdfUrl, documentId, fileName, txtUrl, zipUrl }: PdfViewerProps) {
  const [zoom, setZoom] = useState(100);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: fileName,
        text: 'Confira este documento médico',
        url: `/validar/${documentId}`,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(50, zoom - 10))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[4rem] text-center">
            {zoom}%
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(100)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={pdfUrl} target="_blank" download>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Link>
          </Button>
          
          {txtUrl && (
            <Button size="sm" variant="outline" asChild>
              <Link href={txtUrl} target="_blank" download>
                <Download className="h-4 w-4 mr-1" />
                TXT
              </Link>
            </Button>
          )}
          
          {zipUrl && (
            <Button size="sm" variant="outline" asChild>
              <Link href={zipUrl} target="_blank" download>
                <Download className="h-4 w-4 mr-1" />
                ZIP
              </Link>
            </Button>
          )}

          <Button size="sm" variant="outline" asChild>
            <Link href={`/paciente/documentos/${documentId}/qrcode`}>
              <QrCode className="h-4 w-4 mr-1" />
              QR Code
            </Link>
          </Button>

          <Button size="sm" variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" />
            Compartilhar
          </Button>
        </div>
      </div>

      {/* PDF Preview */}
      <div 
        className="w-full border rounded-lg overflow-hidden bg-white dark:bg-slate-900"
        style={{ height: '720px' }}
      >
        <iframe
          src={`${pdfUrl}#zoom=${zoom}`}
          className="w-full h-full"
          title="PDF Preview"
        />
      </div>
    </div>
  );
}
