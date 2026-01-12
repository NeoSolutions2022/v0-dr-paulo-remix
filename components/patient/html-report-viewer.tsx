"use client"

import { Card, CardContent } from "@/components/ui/card"

interface HtmlReportViewerProps {
  html?: string | null
}

export default function HtmlReportViewer({ html }: HtmlReportViewerProps) {
  if (!html) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Nenhum HTML disponível para este relatório.
        </CardContent>
      </Card>
    )
  }

  return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
}
