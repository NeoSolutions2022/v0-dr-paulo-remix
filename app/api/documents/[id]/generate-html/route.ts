import { NextRequest, NextResponse } from "next/server"

import { ADMIN_SESSION_COOKIE, hasValidAdminSession } from "@/lib/admin-auth"
import { sanitizeHtml } from "@/lib/html-sanitizer"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

const geminiPrompt = `
Você receberá um texto clínico bruto (clean_text). Ele pode ter muitas seções e formatos.

RETORNE SOMENTE HTML COMPLETO E VÁLIDO. Não use markdown e não inclua explicações.
O HTML deve seguir o formato abaixo e estar pronto para ser exibido diretamente.
Não use scripts, iframes, object, embed, links externos, imagens externas ou fontes externas.

REQUISITOS VISUAIS:
- Visual de relatório médico moderno e limpo.
- Layout em cards com sombra suave, tipografia legível e espaçamento confortável.
- Ícones SVG inline (sem libs externas).
- Badges para datas/tags (ex: “IPSS”, “Evolução”).
- Timeline vertical para evoluções.
- Accordion para seções extras (usar <details>/<summary>).
- IPSS: tabela + barras de score feitas em CSS (sem libs).
- Sempre incluir seção final "Texto completo" com <details> e <pre>.

HTML mínimo esperado:
<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>...</style></head>
<body>
  <div class="container">
    ... header card paciente ...
    ... resumo/sections globais ...
    ... timeline evolucoes ...
    ... fallback raw_text_clean ...
  </div>
</body>
</html>
type GeminiResponse = {
  rawText: string
  finishReason?: string | null
  safetyRatings?: unknown
}

async function callGemini(cleanText: string, apiKey: string): Promise<GeminiResponse> {
  const candidate = payload?.candidates?.[0]
  const parts = candidate?.content?.parts
    : candidate?.content?.text || ""
  return {
    rawText,
    finishReason: candidate?.finishReason ?? null,
    safetyRatings: candidate?.safetyRatings ?? null,
  }
        raw: rawGeminiText,
        rawLength: rawGeminiText.length,
      },
    })
  }

  return NextResponse.json({ html: sanitizedHtml })
}
    console.error("Erro ao interpretar HTML do Gemini", {
  const sanitizedHtml = sanitizeHtml(rawGeminiText)
  let finishReason: string | null | undefined
  let safetyRatings: unknown
    const geminiResponse = await callGemini(document.clean_text, apiKey)
    rawGeminiText = geminiResponse.rawText
    finishReason = geminiResponse.finishReason
    safetyRatings = geminiResponse.safetyRatings
        finishReason,
      finishReason,
      safetyRatings,
        finishReason,
        safetyRatings,
