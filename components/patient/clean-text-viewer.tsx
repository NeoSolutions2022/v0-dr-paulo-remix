"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Clipboard, Search } from "lucide-react"
import { normalizeCleanText, parseCleanTextToStructured } from "@/lib/parsers/clean-text"

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
  const normalizedText = useMemo(() => normalizeCleanText(cleanText), [cleanText])
  const structured = useMemo(() => parseCleanTextToStructured(normalizedText), [normalizedText])
  const query = search.trim()
  const evolutions = structured.evolutions
  const patientName = structured.patient.nome && structured.patient.nome !== "-" ? structured.patient.nome : "Paciente"

  const filteredEvolutions = useMemo(() => {
    if (!query) return evolutions
    return evolutions.filter((evolution) =>
      evolution.texto_completo.toLowerCase().includes(query.toLowerCase()),
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

  const calculateAge = (dateString: string) => {
    const parsed = new Date(dateString)
    if (Number.isNaN(parsed.getTime())) return null
    const diff = Date.now() - parsed.getTime()
    const age = new Date(diff).getUTCFullYear() - 1970
    return age >= 0 ? age : null
  }

  const age =
    structured.patient.data_nascimento && structured.patient.data_nascimento !== "-"
      ? calculateAge(structured.patient.data_nascimento)
      : null

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Relatório do paciente</p>
          <h3 className="text-xl font-semibold text-slate-900">{patientName}</h3>
        </div>
        <Badge variant="secondary">Código: {structured.patient.codigo || "-"}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ficha do Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Código", value: structured.patient.codigo || "-" },
                { label: "Data Nasc.", value: structured.patient.data_nascimento || "-" },
                { label: "Telefone", value: structured.patient.telefone || "-" },
                { label: "Idade", value: age !== null ? `${age} anos` : "-" },
              ].map((field) => (
                <div key={field.label} className="rounded-md border bg-white px-3 py-2 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">{field.label}</p>
                  <p className="text-sm font-semibold text-slate-900">{field.value}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Evoluções ({evolutions.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{evolutions.length}</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(normalizedText, "clean-text")}
              >
                <Clipboard className="h-4 w-4" />
                {copiedId === "clean-text" ? "Texto copiado" : "Copiar texto limpo"}
              </Button>
            </div>
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
              {displayEvolutions.map((evolution) => {
                const upperText = evolution.texto_completo.toUpperCase()
                const badges = [
                  upperText.includes("DIABETES") ? "DIABETES" : null,
                  upperText.includes("CIRURGIAS") ? "CIRURGIAS" : null,
                  upperText.includes("INTERNAMENTOS") ? "INTERNAMENTOS" : null,
                  upperText.includes("ALERGIAS") ? "ALERGIAS" : null,
                  upperText.includes("PSA") ? "PSA" : null,
                ].filter(Boolean) as string[]

                return (
                  <details
                    key={`${evolution.timestamp}-${evolution.texto_completo.slice(0, 20)}`}
                    className="group rounded-lg border bg-white shadow-sm open:border-blue-200 open:shadow-md"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-900">{evolution.timestamp}</span>
                        {badges.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {badges.map((badge) => (
                              <Badge key={`${evolution.timestamp}-${badge}`} variant="outline" className="text-xs">
                                {badge}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.preventDefault()
                          handleCopy(evolution.texto_completo, evolution.timestamp)
                        }}
                      >
                        <Clipboard className="h-4 w-4" />
                        {copiedId === evolution.timestamp ? "Copiado!" : "Copiar evolução"}
                      </Button>
                    </summary>
                    <div className="space-y-4 border-t px-4 py-3">
                      {evolution.ipss.items.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">IPSS</p>
                          <div className="overflow-hidden rounded-md border">
                            <div className="grid grid-cols-[1fr,80px] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                              <span>Pergunta</span>
                              <span>Score</span>
                            </div>
                            <div className="divide-y">
                              {evolution.ipss.items.map((item) => (
                                <div
                                  key={`${evolution.timestamp}-${item.n}-${item.pergunta}`}
                                  className="grid grid-cols-[1fr,80px] px-3 py-2 text-sm text-slate-700"
                                >
                                  <span>
                                    {item.n}- {item.pergunta}
                                  </span>
                                  <span>{item.score}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {evolution.ipss.qualidade_vida_texto && (
                            <p className="text-xs text-muted-foreground">{evolution.ipss.qualidade_vida_texto}</p>
                          )}
                        </div>
                      )}

                      <details className="rounded-md border bg-slate-50 p-3">
                        <summary className="cursor-pointer text-xs font-semibold uppercase text-slate-500">
                          Ver texto completo
                        </summary>
                        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-sm text-slate-700">
                          {highlightText(evolution.texto_completo, query).map((part, index) =>
                            query && part.toLowerCase() === query.toLowerCase() ? (
                              <mark key={`${evolution.timestamp}-match-${index}`} className="rounded bg-yellow-200 px-1">
                                {part}
                              </mark>
                            ) : (
                              <span key={`${evolution.timestamp}-text-${index}`}>{part}</span>
                            ),
                          )}
                        </pre>
                      </details>
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
