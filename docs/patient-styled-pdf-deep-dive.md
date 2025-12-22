# Guia definitivo: clean_text → HTML estilizado → PDF para o painel do paciente

Este guia consolida as investigações anteriores (`patient-pdf-pipeline.md`, `patient-styled-pdf-plan.md`) e descreve um pipeline sustentável para transformar `clean_text` em HTML estilizado e entregar um PDF visualizável/baixável pelo paciente (incluindo suporte a impressão automática via navegador).

## Problema a resolver
- O PDF textual já funciona, mas a geração **estilizada** ainda falha intermitentemente (erros 500/502, cores não suportadas, HTML indisponível).
- Queremos usar o mesmo estilo da Home, renderizar o HTML resultante para PDF e permitir: visualização no modal, botão de download e acionar `window.print()` com o PDF carregado.

## Pipeline recomendado (camadas e fallbacks)
1. **Entrada e sanitização**
   - Obter `clean_text` pelo endpoint `/api/patient/documents` já autenticado.
   - Aplicar `sanitizeText` (remoção de `\u0000`, normalização de `\r\n` → `\n` e trim) antes de qualquer parsing.
2. **HTML premium (mesmo da Home)**
   - Reutilizar `generatePremiumPDFHTML` e auxiliares (`extractAllVariables`, `extractEvolutions`, `extractPSA`) em `app/api/generate-pdf/route.ts` para produzir o HTML temático diretamente a partir de `clean_text` (sem round-trip HTTP).【F:app/api/generate-pdf/route.ts†L25-L330】
   - Incluir webfonts via Google Fonts (Noto Sans/Roboto) e css básico já previsto no template.
3. **Servidor: PDF estilizado**
   - Rota `GET /api/patient/documents/[id]/pdf-styled` (runtime Node) valida `patient_id`, chama o passo 2 e renderiza o HTML em PDF com Chromium/Puppeteer. Cache em memória por `documentId` + hash de texto grande para evitar recomputações.
   - Tratamento de erros: se falhar renderização/headless, retornar 502/500 **com fallback** para HTML simples (plain) e log estruturado; nunca usar Edge runtime para buffers grandes.
4. **Cliente: modal “Visualizar”**
   - Fluxo em ordem: 
     1) tentar baixar o PDF direto de `/api/patient/documents/[id]/pdf-styled` e exibir no `PdfViewer` (iframe + download + `window.print()` quando o usuário clicar em “Imprimir”).
     2) se 502/500, requisitar `/api/patient/documents/[id]/styled-html`, sanitizar CSS (substituir `lab()/lch()/color-mix()` por `rgb/hex`) e converter com `html2pdf`/`html2canvas` em background, então exibir o blob PDF e habilitar download/print.
     3) se também falhar, cair no PDF textual com `generatePdfFromText` já existente.
   - Sempre liberar `URL.revokeObjectURL` ao fechar o modal para evitar vazamentos.
5. **Impressão/Download automáticos**
   - Depois que o blob PDF estilizado é carregado no iframe, disponibilizar botões “Download” (link com `download=<fileName>.pdf`) e “Imprimir” que chama `iframe.contentWindow?.print()` ou abre o blob em nova aba e aciona `print()` para navegadores que bloqueiam print direto do iframe.
6. **Escalabilidade (150k+ caracteres)**
   - Gerar HTML e PDF no servidor (Node + Chromium) para textos muito longos; evitar client-only para esses casos.
   - Habilitar timeouts elevados (≥30s) e, se necessário, paginar a tabela PSA e evoluções com CSS `page-break-inside: avoid`. Reduzir imagens/QRs para aliviar memória.
7. **Depuração**
   - Cores não suportadas: sanitize CSS antes de html2pdf (já visto com `lab()` → use regex para substituir por `rgb`).
   - Fonts ausentes: manter fallback para Noto Sans/Roboto via CDN; se offline, cair para Helvetica no PDF textual.
   - Erros 5xx: registrar o hash do `clean_text` e o passo em que falhou (HTML build, Chromium launch, print) para reproduzir.

## Checklist de entrega para o agente
- [ ] Garantir sanitização do `clean_text` antes de `generatePremiumPDFHTML`.
- [ ] Implementar/ajustar `/api/patient/documents/[id]/pdf-styled` no runtime Node usando Chromium/Puppeteer e cache.
- [ ] Implementar `/api/patient/documents/[id]/styled-html` que devolve o HTML premium (ou fallback simplificado) para uso no cliente.
- [ ] Atualizar o modal do paciente para tentar PDF estilizado → HTML+html2pdf → PDF textual, expondo download e botão de impressão.
- [ ] Testar com exemplo fornecido e com entradas >150k caracteres; validar acentuação e caracteres combinados.
- [ ] Documentar logs/erros e sanitização de cores/fonts para html2pdf.

Com este roteiro, o painel passa a oferecer um PDF estilizado robusto: primeiro via renderização server-side, depois via conversão client-side, e por último via PDF textual, sempre garantindo visualização, download e impressão a partir do `clean_text`.
