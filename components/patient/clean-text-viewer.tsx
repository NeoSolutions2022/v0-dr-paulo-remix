"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clipboard, Search } from "lucide-react"
import { buildCleanTextPipeline } from "@/lib/parsers/clean-text"

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
  const { cleaned_text, structured_json, markdown } = useMemo(() => buildCleanTextPipeline(cleanText), [cleanText])
  const query = search.trim()
  const evolutions = structured_json.evolutions

  const filteredEvolutions = useMemo(() => {
    if (!query) return evolutions
    return evolutions.filter((evolution) =>
      evolution.plain_text.toLowerCase().includes(query.toLowerCase()),
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
      <Tabs defaultValue="visual" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="cleaned">Texto limpo</TabsTrigger>
          <TabsTrigger value="markdown">Markdown</TabsTrigger>
          <TabsTrigger value="visual">Visual (HTML)</TabsTrigger>
        </TabsList>

        <TabsContent value="cleaned">
          <Card>
            <CardHeader>
              <CardTitle>Texto limpo</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{cleaned_text}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markdown">
          <Card>
            <CardHeader>
              <CardTitle>Markdown</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{markdown}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ficha do Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              {structured_json.patient.codigo ||
              structured_json.patient.nome ||
              structured_json.patient.data_nascimento ||
              structured_json.patient.telefone ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: "Código", value: structured_json.patient.codigo },
                    { label: "Nome", value: structured_json.patient.nome },
                    { label: "Data de Nascimento", value: structured_json.patient.data_nascimento },
                    { label: "Telefone", value: structured_json.patient.telefone },
                  ].map((field) => (
                    <div key={field.label} className="rounded-md border bg-white p-3 shadow-sm">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{field.label}</p>
                      <p className="text-sm font-medium text-slate-900">{field.value || "-"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma ficha encontrada no texto.</p>
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
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.preventDefault()
                            handleCopy(evolution.plain_text, evolution.id)
                          }}
                        >
                          <Clipboard className="h-4 w-4" />
                          {copiedId === evolution.id ? "Copiado!" : "Copiar texto limpo"}
                        </Button>
                      </summary>
                      <div className="space-y-4 border-t px-4 py-3">
                        {evolution.sections.map((section) => (
                          <div key={`${evolution.id}-${section.title}`} className="space-y-1">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">{section.title}</p>
                            {Array.isArray(section.content) ? (
                              <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">
                                {section.content.map((item) => (
                                  <li key={`${evolution.id}-${section.title}-${item}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-700">{section.content}</p>
                            )}
                          </div>
                        ))}
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Texto completo</p>
                          <p className="whitespace-pre-wrap text-sm text-slate-700">
                            {highlightText(evolution.free_text, query).map((part, index) =>
                              query && part.toLowerCase() === query.toLowerCase() ? (
                                <mark key={`${evolution.id}-match-${index}`} className="rounded bg-yellow-200 px-1">
                                  {part}
                                </mark>
                              ) : (
                                <span key={`${evolution.id}-text-${index}`}>{part}</span>
                              ),
                            )}
                          </p>
                        </div>
                        {evolution.rtf_original && (
                          <details className="rounded-md border bg-slate-50 p-3">
                            <summary className="cursor-pointer text-xs font-semibold uppercase text-slate-500">
                              Ver RTF original
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                              {evolution.rtf_original}
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
