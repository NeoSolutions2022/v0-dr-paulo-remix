"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Clipboard, Search } from "lucide-react"
import { parseCleanText } from "@/lib/parsers/clean-text"

interface CleanTextViewerProps {
  cleanText: string
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return [text]
  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi")
  return text.split(regex).filter(Boolean)
}

export default function CleanTextViewer({ cleanText }: CleanTextViewerProps) {
  const [search, setSearch] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { patientFields, evolutions } = useMemo(() => parseCleanText(cleanText), [cleanText])
  const query = search.trim()

  const filteredEvolutions = useMemo(() => {
    if (!query) return evolutions
    return evolutions.filter((evolution) =>
      evolution.text.toLowerCase().includes(query.toLowerCase()),
    )
  }, [evolutions, query])

  const displayEvolutions = useMemo(
    () => [...filteredEvolutions].reverse(),
    [filteredEvolutions],
  )

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(null), 2000)
  }

  if (!cleanText.trim()) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Relatório vazio</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Não há texto limpo disponível para este relatório.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ficha do Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          {patientFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ficha encontrada no texto.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {patientFields.map((field) => (
                <div key={`${field.key}-${field.value}`} className="rounded-md border bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{field.key}</p>
                  <p className="text-sm font-medium text-slate-900">{field.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Evoluções</CardTitle>
            <Badge variant="secondary">{evolutions.length} evoluções</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nas evoluções"
            />
          </div>
          {query && (
            <p className="text-xs text-muted-foreground">
              Exibindo {filteredEvolutions.length} de {evolutions.length} evoluções.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {displayEvolutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma evolução encontrada com esse filtro.</p>
          ) : (
            <div className="space-y-4 border-l border-dashed border-slate-200 pl-4">
              {displayEvolutions.map((evolution) => (
                <details
                  key={evolution.id}
                  className="group rounded-lg border bg-white shadow-sm open:border-blue-200 open:shadow-md"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-slate-900">{evolution.timestamp}</span>
                      {evolution.duplicateCount > 0 && (
                        <Badge variant="outline" className="w-fit text-xs">
                          duplicatas: {evolution.duplicateCount}
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.preventDefault()
                        handleCopy(evolution.text, evolution.id)
                      }}
                    >
                      <Clipboard className="h-4 w-4" />
                      {copiedId === evolution.id ? "Copiado!" : "Copiar texto limpo"}
                    </Button>
                  </summary>
                  <div className="space-y-4 border-t px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-slate-700">
                      {highlightText(evolution.text, query).map((part, index) =>
                        query && part.toLowerCase() === query.toLowerCase() ? (
                          <mark key={`${evolution.id}-match-${index}`} className="rounded bg-yellow-200 px-1">
                            {part}
                          </mark>
                        ) : (
                          <span key={`${evolution.id}-text-${index}`}>{part}</span>
                        ),
                      )}
                    </p>
                    {evolution.rtfOriginal && (
                      <details className="rounded-md border bg-slate-50 p-3">
                        <summary className="cursor-pointer text-xs font-semibold uppercase text-slate-500">
                          Ver RTF original
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                          {evolution.rtfOriginal}
                        </pre>
                      </details>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
