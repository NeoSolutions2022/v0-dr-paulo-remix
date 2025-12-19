"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle } from "lucide-react"

interface Props {
  patientId: string
}

export function PatientCpfGate({ patientId }: Props) {
  const [cpf, setCpf] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const normalizeCpf = (value: string) => value.replace(/\D/g, "")

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const cpfDigits = normalizeCpf(cpf)
    if (cpfDigits.length !== 11) {
      setError("CPF deve conter 11 dígitos")
      return
    }
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.from("patients").update({ cpf: cpfDigits }).eq("id", patientId)
      if (updateError) throw updateError
      setSuccess(true)
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (err: any) {
      setError(err.message || "Não foi possível salvar o CPF")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid gap-2 max-w-sm">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="cpf-field">
          Informe seu CPF para liberar download
        </label>
        <Input
          id="cpf-field"
          inputMode="numeric"
          maxLength={14}
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="00000000000"
          disabled={loading}
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>CPF salvo com sucesso. Recarregando...</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar CPF e liberar download"}
      </Button>
    </form>
  )
}
