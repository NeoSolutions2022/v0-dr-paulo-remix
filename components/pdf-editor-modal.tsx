"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Save, Eye, Loader2, Zap, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PdfData {
  cleanText: string
  patientName?: string
}

interface PdfEditorModalProps {
  pdfData: PdfData
  onClose: () => void
}

interface EditableFields {
  nome_paciente: string
  datanascimento: string
  telefone: string
  nome_medico: string
  endereco_clinica: string
  crm_medico: string
  resumo_medico_caso: string
  diagnostico_principal: string
  psa_ultimo_registro: string
  gleason_ultimo_registro: string
  cirurgia_realizada: string
  terapia_hormonal: string
  margens_cirurgicas: string
  cirurgia_descricao: string
  complicacoes_pos_operatorias: string
  observacoes_cirurgia: string
  psa_analise_texto: string
  psa_explicacao_sucesso: string
  recorrencia_motivo: string
  recorrencia_ton_tranquilizador: string
  terapia_hormonal_descricao: string
  terapia_hormonal_enfase: string
  comorbidade_hipertensao: string
  comorbidade_diabetes: string
  comorbidade_outras_cirurgias: string
  historico_familiar: string
  ipss_pontuacao: string
  ipss_texto_acompanhamento: string
  orientacoes_educacao: string
  plano_futuro_detalhado: string
  [key: string]: string
}

export function PdfEditorModal({ pdfData, onClose }: PdfEditorModalProps) {
  const [fields, setFields] = useState<EditableFields>({
    nome_paciente: pdfData.patientName || "Paciente",
    datanascimento: "01/01/1950",
    telefone: "(XX) 9XXXX-XXXX",
    nome_medico: "Dr. Paulo Henrique de Moura Reis",
    endereco_clinica: "Rua Padre Valdevino, 2000 - Fortaleza/CE",
    crm_medico: "CRM 3497 CE - RQE 1595 - RQE 1594",
    resumo_medico_caso: "Paciente sob acompanhamento urológico regular.",
    diagnostico_principal: "Adenocarcinoma de Próstata",
    psa_ultimo_registro: "6.5",
    gleason_ultimo_registro: "6 (3+3)",
    cirurgia_realizada: "Prostatectomia Radical",
    terapia_hormonal: "Em andamento",
    margens_cirurgicas: "Livres de tumor",
    cirurgia_descricao: "Procedimento cirúrgico realizado com sucesso.",
    complicacoes_pos_operatorias: "Sem intercorrências.",
    observacoes_cirurgia: "Paciente em acompanhamento regular.",
    psa_analise_texto: "O PSA tem se mantido em níveis de vigilância ao longo dos anos.",
    psa_explicacao_sucesso: "Redução significativa do PSA indicando excelente resposta terapêutica.",
    recorrencia_motivo: "Sem evidência de recorrência bioquímica no momento.",
    recorrencia_ton_tranquilizador: "Paciente mantém boa resposta ao tratamento com seguimento regular.",
    terapia_hormonal_descricao: "Terapia hormonal iniciada com resposta adequada.",
    terapia_hormonal_enfase: "Bloqueio hormonal eficaz com tolerância adequada.",
    comorbidade_hipertensao: "Controlada com medicação.",
    comorbidade_diabetes: "Diabetes Controlado",
    comorbidade_outras_cirurgias: "Cirurgia nasal",
    historico_familiar: "Irmão com Câncer de Próstata (CAP) aos 73 anos",
    ipss_pontuacao: "5 (Leve)",
    ipss_texto_acompanhamento: "Sintomas urinários em nível leve, bem controlados.",
    orientacoes_educacao:
      "Recomenda-se manutenção do acompanhamento clínico regular, realização de exames conforme protocolo, e comunicação imediata de qualquer mudança nos sintomas.",
    plano_futuro_detalhado:
      "Plano de Acompanhamento: PSA a cada 3 meses nos primeiros 2 anos, depois semestral. Exame físico trimestral. Exames de imagem anuais ou conforme necessário.",
  })

  const [previewHtml, setPreviewHtml] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isAiFilled, setIsAiFilled] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [clinicalFileLoading, setClinicalFileLoading] = useState(false)
  const [txtLoading, setTxtLoading] = useState(false)

  useEffect(() => {
    loadAiExtractedFields()
  }, [])

  const loadAiExtractedFields = async () => {
    try {
      setAiLoading(true)
      console.log("[v0] Loading AI extracted fields...")

      const response = await fetch("/api/ai-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanText: pdfData.cleanText,
          patientName: pdfData.patientName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[v0] AI extraction error:", data.error)
        setIsAiFilled(false)
        return
      }

      console.log("[v0] AI fields loaded successfully")
      setFields((prev) => ({
        ...prev,
        ...data.data,
      }))
      setIsAiFilled(true)
    } catch (error) {
      console.error("[v0] Error loading AI fields:", error)
      setIsAiFilled(false)
    } finally {
      setAiLoading(false)
    }
  }

  const handleClinicalFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setClinicalFileLoading(true)
      const clinicalText = await file.text()

      const response = await fetch("/api/ai-process-clinical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicalText,
          patientName: file.name.replace(/\.[^/.]+$/, ""),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[v0] Clinical processing error:", data.error)
        alert("Erro ao processar arquivo clínico")
        return
      }

      console.log("[v0] Clinical data processed successfully")
      setFields((prev) => ({
        ...prev,
        ...data.data,
      }))
      setIsAiFilled(true)
      alert("Arquivo clínico processado com sucesso!")
    } catch (error) {
      console.error("[v0] Error processing clinical file:", error)
      alert("Erro ao processar arquivo clínico")
    } finally {
      setClinicalFileLoading(false)
    }
  }

  const downloadTXT = async (format: "commented" | "clean") => {
    try {
      setTxtLoading(true)
      const response = await fetch("/api/generate-txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customFields: fields,
          format,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[v0] TXT generation error:", data.error)
        alert("Erro ao gerar TXT")
        return
      }

      const element = document.createElement("a")
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(data.content))
      element.setAttribute("download", data.filename)
      element.style.display = "none"
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    } catch (error) {
      console.error("[v0] Error downloading TXT:", error)
      alert("Erro ao gerar TXT")
    } finally {
      setTxtLoading(false)
    }
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setFields((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const generatePreview = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanText: pdfData.cleanText,
          patientName: fields.nome_paciente,
          doctorName: fields.nome_medico,
          customFields: fields,
        }),
      })

      const data = await response.json()
      setPreviewHtml(data.html)
      setShowPreview(true)
    } catch (error) {
      console.error("Erro ao gerar preview:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!previewHtml) return

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(previewHtml)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  const handleSave = async () => {
    if (!previewHtml) {
      await generatePreview()
      return
    }
    handlePrint()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-2xl overflow-hidden w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Editor de PDF - {pdfData.patientName}
            </h2>
            {isAiFilled && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                <Zap className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Preenchido com IA</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAiFilled && (
              <Button
                onClick={loadAiExtractedFields}
                size="sm"
                variant="outline"
                disabled={aiLoading}
                className="text-slate-600 dark:text-slate-400 bg-transparent"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Recarregando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    Recarregar IA
                  </>
                )}
              </Button>
            )}
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

        {/* Content */}
        <div className="flex-1 overflow-auto flex gap-4 p-4">
          {/* Editor Side */}
          <div className="flex-1 space-y-4 overflow-y-auto">
            <Card className="border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="text-base text-blue-900 dark:text-blue-100">Carregar Arquivo Clínico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Carregue um arquivo clínico (TXT) para preenchimento automático com IA
                </p>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".txt"
                    onChange={handleClinicalFileUpload}
                    disabled={clinicalFileLoading}
                    className="flex-1"
                  />
                  {clinicalFileLoading && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-blue-700 dark:text-blue-300">Processando...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="paciente" className="w-full">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5 gap-2 h-auto">
                <TabsTrigger value="paciente" className="text-xs">
                  Paciente
                </TabsTrigger>
                <TabsTrigger value="cirurgia" className="text-xs">
                  Cirurgia
                </TabsTrigger>
                <TabsTrigger value="psa" className="text-xs">
                  PSA
                </TabsTrigger>
                <TabsTrigger value="comorbidades" className="text-xs">
                  Comorbidades
                </TabsTrigger>
                <TabsTrigger value="plano" className="text-xs">
                  Plano
                </TabsTrigger>
              </TabsList>

              {/* PACIENTE */}
              <TabsContent value="paciente" className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Informações do Paciente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Nome do Paciente
                      </label>
                      <Input
                        value={fields.nome_paciente}
                        onChange={(e) => handleFieldChange("nome_paciente", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Data de Nascimento
                      </label>
                      <Input
                        value={fields.datanascimento}
                        onChange={(e) => handleFieldChange("datanascimento", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Telefone</label>
                      <Input
                        value={fields.telefone}
                        onChange={(e) => handleFieldChange("telefone", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Informações do Médico</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nome do Médico</label>
                      <Input
                        value={fields.nome_medico}
                        onChange={(e) => handleFieldChange("nome_medico", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Endereço da Clínica
                      </label>
                      <Input
                        value={fields.endereco_clinica}
                        onChange={(e) => handleFieldChange("endereco_clinica", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">CRM do Médico</label>
                      <Input
                        value={fields.crm_medico}
                        onChange={(e) => handleFieldChange("crm_medico", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Resumo do Caso</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resumo Médico</label>
                      <Textarea
                        value={fields.resumo_medico_caso}
                        onChange={(e) => handleFieldChange("resumo_medico_caso", e.target.value)}
                        className="mt-1 min-h-24"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* CIRURGIA */}
              <TabsContent value="cirurgia" className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Dados Cirúrgicos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Cirurgia Realizada
                      </label>
                      <Input
                        value={fields.cirurgia_realizada}
                        onChange={(e) => handleFieldChange("cirurgia_realizada", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Descrição da Cirurgia
                      </label>
                      <Textarea
                        value={fields.cirurgia_descricao}
                        onChange={(e) => handleFieldChange("cirurgia_descricao", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Complicações Pós-operatórias
                      </label>
                      <Textarea
                        value={fields.complicacoes_pos_operatorias}
                        onChange={(e) => handleFieldChange("complicacoes_pos_operatorias", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Observações</label>
                      <Textarea
                        value={fields.observacoes_cirurgia}
                        onChange={(e) => handleFieldChange("observacoes_cirurgia", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Margens Cirúrgicas
                      </label>
                      <Input
                        value={fields.margens_cirurgicas}
                        onChange={(e) => handleFieldChange("margens_cirurgicas", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PSA E DIAGNÓSTICO */}
              <TabsContent value="psa" className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Diagnóstico Principal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Diagnóstico Principal
                      </label>
                      <Input
                        value={fields.diagnostico_principal}
                        onChange={(e) => handleFieldChange("diagnostico_principal", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Gleason (Último Registro)
                      </label>
                      <Input
                        value={fields.gleason_ultimo_registro}
                        onChange={(e) => handleFieldChange("gleason_ultimo_registro", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Evolução do PSA</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        PSA (Último Registro)
                      </label>
                      <Input
                        value={fields.psa_ultimo_registro}
                        onChange={(e) => handleFieldChange("psa_ultimo_registro", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Análise de PSA</label>
                      <Textarea
                        value={fields.psa_analise_texto}
                        onChange={(e) => handleFieldChange("psa_analise_texto", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Explicação de Sucesso
                      </label>
                      <Textarea
                        value={fields.psa_explicacao_sucesso}
                        onChange={(e) => handleFieldChange("psa_explicacao_sucesso", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Recorrência Bioquímica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Status de Recorrência
                      </label>
                      <Textarea
                        value={fields.recorrencia_motivo}
                        onChange={(e) => handleFieldChange("recorrencia_motivo", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Tom Tranquilizador
                      </label>
                      <Textarea
                        value={fields.recorrencia_ton_tranquilizador}
                        onChange={(e) => handleFieldChange("recorrencia_ton_tranquilizador", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Terapia Hormonal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Status Terapia Hormonal
                      </label>
                      <Input
                        value={fields.terapia_hormonal}
                        onChange={(e) => handleFieldChange("terapia_hormonal", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Descrição Terapia
                      </label>
                      <Textarea
                        value={fields.terapia_hormonal_descricao}
                        onChange={(e) => handleFieldChange("terapia_hormonal_descricao", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Ênfase de Eficácia
                      </label>
                      <Textarea
                        value={fields.terapia_hormonal_enfase}
                        onChange={(e) => handleFieldChange("terapia_hormonal_enfase", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* COMORBIDADES */}
              <TabsContent value="comorbidades" className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Gerenciamento de Comorbidades</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hipertensão</label>
                      <Input
                        value={fields.comorbidade_hipertensao}
                        onChange={(e) => handleFieldChange("comorbidade_hipertensao", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Diabetes</label>
                      <Input
                        value={fields.comorbidade_diabetes}
                        onChange={(e) => handleFieldChange("comorbidade_diabetes", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Outras Cirurgias
                      </label>
                      <Input
                        value={fields.comorbidade_outras_cirurgias}
                        onChange={(e) => handleFieldChange("comorbidade_outras_cirurgias", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Histórico Familiar
                      </label>
                      <Textarea
                        value={fields.historico_familiar}
                        onChange={(e) => handleFieldChange("historico_familiar", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Sintomas Urinários (IPSS)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pontuação IPSS</label>
                      <Input
                        value={fields.ipss_pontuacao}
                        onChange={(e) => handleFieldChange("ipss_pontuacao", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Texto de Acompanhamento
                      </label>
                      <Textarea
                        value={fields.ipss_texto_acompanhamento}
                        onChange={(e) => handleFieldChange("ipss_texto_acompanhamento", e.target.value)}
                        className="mt-1 min-h-20"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PLANO */}
              <TabsContent value="plano" className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Orientações e Educação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recomendações</label>
                      <Textarea
                        value={fields.orientacoes_educacao}
                        onChange={(e) => handleFieldChange("orientacoes_educacao", e.target.value)}
                        className="mt-1 min-h-24"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-base">Plano de Acompanhamento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Plano Futuro Detalhado
                      </label>
                      <Textarea
                        value={fields.plano_futuro_detalhado}
                        onChange={(e) => handleFieldChange("plano_futuro_detalhado", e.target.value)}
                        className="mt-1 min-h-24"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Side */}
          {showPreview && previewHtml && (
            <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-800">
              <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Preview</p>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-800">
                <iframe srcDoc={previewHtml} title="PDF Preview" className="w-full h-full bg-white" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Exportar TXT:</span>
            <Button
              onClick={() => downloadTXT("clean")}
              disabled={txtLoading}
              size="sm"
              variant="outline"
              className="text-slate-600 dark:text-slate-400"
              title="Baixar versão limpa sem explicações"
            >
              {txtLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Versão Limpa
                </>
              )}
            </Button>
            <Button
              onClick={() => downloadTXT("commented")}
              disabled={txtLoading}
              size="sm"
              variant="outline"
              className="text-slate-600 dark:text-slate-400"
              title="Baixar versão com explicações comentadas"
            >
              {txtLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Versão Comentada
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!showPreview ? (
              <Button
                onClick={generatePreview}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Visualizar
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
              >
                <Save className="mr-2 h-4 w-4" />
                Imprimir/Salvar
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 bg-transparent"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
