# Playbook: styled PDF generation errors in the patient viewer

## Sintomas observados
- Console exibe: `Falha na geração estilizada, aplicando fallback textual Error: Não foi possível carregar o HTML estilizado do relatório.`
- Logs mostram `GET /api/patient/documents/[id]/styled-html` retornando status não OK (ex.: 400/500), seguida por fallback local.
- Ao tentar html2pdf no navegador, o html2canvas falha com `Attempting to parse an unsupported color function "lab"` (ou `lch`, `color-mix`).
- Resultado: usuário cai em fallback textual ou recebe PDF vazio.

## Causas raiz prováveis
1) **HTML estilizado inválido** vindo do servidor (template falha ou sanitização incompleta), retornando erro > 299.
2) **CSS não suportado pelo html2canvas**: funções de cor `lab()/lch()/color-mix()` ou gradientes modernos; html2canvas não reconhece e lança erro, quebrando a geração no cliente.
3) **Requisição não autenticada ou ID de documento errado**, levando o endpoint a responder 400/401/403 e forçando fallback.

## Fluxo recomendado (robusto)
1) **Primeira tentativa:** buscar PDF já estilizado do servidor (`GET /api/patient/documents/[id]/pdf-styled`). Se 200 e `content-type=application/pdf`, abrir direto.
2) **Segunda tentativa:** buscar HTML estilizado do servidor (`GET /api/patient/documents/[id]/styled-html`).
   - Se retornar 200, **sanitizar o HTML no cliente** antes do html2pdf:
     - Remover/normalizar funções `lab()`, `lch()`, `color-mix()` e gradientes avançados para cores hex/rgba simples.
     - Forçar `background-color`/`color` para valores suportados (hex/rgba/hsl).
   - Aplicar html2pdf com opções conservadoras (`scale: 1`, `useCORS: true`, margens simples) para grandes textos.
3) **Terceira tentativa:** usar `/api/generate-pdf` com `clean_text` (pipeline da Home) para gerar PDF estilizado via HTML básico.
4) **Último recurso:** PDF textual com pdf-lib (já existente).

## Checklist de correção
- [ ] Garantir que `styled-html` nunca retorne 500: se o template falhar, emitir HTML fallback minimalista (sem cores avançadas) com `clean_text` formatado.
- [ ] Antes de chamar html2pdf no cliente, passar o HTML por um sanitizador que:
  - Converte todas as ocorrências de `lab(`, `lch(`, `color-mix(` para uma cor hex padrão (`#1f2937` ou similar).
  - Remove `background: linear-gradient(..., color-mix(...))` substituindo por `background-color` sólido.
  - Normaliza `filter`/`backdrop-filter` ausentes em html2canvas.
- [ ] Para documentos muito grandes (150k+ caracteres):
  - Dividir o HTML em blocos/páginas no template do servidor ou inserir quebras (`page-break-before/after`).
  - Usar `html2pdf().set({ html2canvas: { scale: 1, windowWidth: 1280 } })` para controlar memória.
- [ ] Confirmar que o botão/modal “Visualizar” só inicia geração após `clean_text` carregado e mostra estado de carregamento/erro.
- [ ] Registrar o status de cada tentativa (pdf-styled, styled-html, generate-pdf, textual) no console para depuração.

## Ações sugeridas (para implementação)
- **Servidor**: em `/api/patient/documents/[id]/styled-html`, envolver a montagem do HTML premium em try/catch e, em erro, retornar HTML simples já sanitizado (sem CSS avançado). Adicionar cabeçalhos `Cache-Control: public, max-age=300` para reduzir chamadas.
- **Cliente**: criar utilitário `sanitizeStyledHtml(html: string)` que remove funções de cor não suportadas e normaliza estilos antes do html2pdf/html2canvas.
- **Teste rápido**: usar o exemplo de `clean_text` de ~150k caracteres nos docs, simular resposta HTML com cores `lab()` e confirmar que, após sanitização, o PDF é gerado sem exceções.

## Referências
- html2canvas limita suporte a CSS Color Level 4; use apenas hex/rgb(a)/hsl(a).
- Mantém compatibilidade com pipeline da Home reutilizando `/api/generate-pdf` como fallback.
