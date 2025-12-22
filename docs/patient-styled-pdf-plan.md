# Relatório de paciente em PDF estilizado a partir de `clean_text`

## 1) Fluxo real usado na Home (referência obrigatória)
A Home já produz um PDF estilizado a partir do texto limpo via rota `/api/generate-pdf`, que retorna **HTML temático** com tabela de PSA, lista de evoluções, cabeçalhos e rodapé. Os pontos-chave desse pipeline são:

- **Variáveis derivadas**: `extractAllVariables` extrai nome, médico, custom fields, evoluções e uma tabela de PSA pronta para HTML. Também normaliza datas e remove artefatos RTF. 【F:app/api/generate-pdf/route.ts†L25-L156】
- **Evoluções**: `extractEvolutions` percorre blocos `--- Evolução em <data> --- ...` e devolve lista HTML já sanitizada, truncando trechos longos. 【F:app/api/generate-pdf/route.ts†L65-L117】
- **PSA**: `extractPSA` detecta datas/valores, ordena e gera tabela HTML completa com valores formatados. 【F:app/api/generate-pdf/route.ts†L119-L172】
- **Template**: `generatePremiumPDFHTML` monta o HTML final com cabeçalho, seção de dados do paciente, tabela PSA, histórico e rodapé com hash do documento. 【F:app/api/generate-pdf/route.ts†L174-L330】

Esse HTML é o estilo “premium” que precisamos reaproveitar ao exibir documentos do paciente.

## 2) Diferença para o pipeline atual do paciente
O pipeline atual do paciente (rotas `/api/patient/documents/preview` e `/api/patient/documents/[id]/pdf` + `lib/pdf-generator.ts`) gera um PDF **puramente textual** com pdf-lib e fontes remotas, sem aplicar o HTML estilizado. O PDF sai como texto corrido. 【F:lib/pdf-generator.ts†L1-L180】

## 3) Estratégia proposta (aplicar estilo da Home ao paciente)
1. **Entrada**: usar o `clean_text` retornado por `/api/patient/documents`.
2. **Gerar HTML premium**: chamar internamente `generatePremiumPDFHTML` (mesmo módulo) com as variáveis de `extractAllVariables` para obter o HTML temático. Isso garante a mesma tabela PSA, histórico e cabeçalho que a Home usa.
3. **Converter HTML em PDF**:
   - **Servidor**: usar uma ferramenta de renderização HTML→PDF (p. ex. `playwright` com chromium headless ou `puppeteer-core`) ou um serviço existente. Como fallback, o pdf-lib atual pode embutir o HTML convertido para texto, mas o alvo principal é renderização HTML real para preservar estilos.
   - **Cliente** (se servidor indisponível): abrir o HTML em um iframe `srcdoc` e usar `html2pdf.js`/`window.print` ou converter via `dom-to-pdf`. Preferir servidor para evitar limite de 150k+ caracteres no browser.
4. **Entrega ao modal “Visualizar”**: 
   - Quando o paciente abrir o modal, requisitar `/api/patient/documents/[id]/pdf-styled` (nova rota) que retorne `application/pdf` gerado do HTML premium. 
   - Exibir no `PdfViewer` apontando para a Blob URL e liberar download.
5. **Fallback**: se a geração estilizada falhar, voltar ao PDF textual atual (`generatePdfFromText`) para não bloquear o usuário.

## 4) Considerações para textos enormes (150k+ caracteres)
- **Streaming**: ao gerar PDF no servidor, use streaming/chunking (ex.: `ReadableStream`) para não estourar memória no edge. 
- **Normalização**: remova caracteres de controle e normalize `\n` antes de extrair variáveis, igual à Home. 
- **Timeouts**: configure timeouts generosos para o renderizador HTML (>=30s) ou pagine o HTML em múltiplas páginas.
- **Paginação**: `generatePremiumPDFHTML` já define CSS de quebra de página; ao renderizar, use `@page` e `page-break-inside: avoid` para tabelas grandes.

## 5) Exemplo de `clean_text` real (para testes)
Use o trecho abaixo (150k+ precisa de arquivo maior, mas este cobre o formato) para validar a extração de evoluções e PSA:
```
==================================================
INFORMAÇÕES ADICIONAIS
==================================================
================================================== FICHA DO PACIENTE ================================================== Código: 7770 Nome: Francisco de Paula fortaleza Data de Nascimento: 1938-05-02 Telefone: 41417430 ================================================== --- Evolução em 2017-09-27 15:48:38 --- 27/09/2017 CORACÃO- clonazepam 2 mg/ muvinlax / verapamil / exodus 5 mg PULMÃO -dpoc ex > 20 anos. DIABETES-ok CIRURGIAS- hemorroidas 4 x, osteomielite perna direita/ trauma face / ombro bilateral / catrata bilateral INTERNAMENTOS- hepatite a ALERGIAS- não ( cutanea) OUTRAS- sem cap / irmão com ca colon . ginastica/ muvinllax/ ereção pa 125x70 ac arritmia ; ap ok balanite ( decidiro apos exames po anti fungico toque retal 40 g amcia . ESCALA INTERNACIONAL DE SINTOMAS PROSTATICOS 1-SENSACAO DE ESVAZIAMENTO INCOMPLETO; >0 2-INTERVALO MENOR QUE DUAS HORAS. >1 3-JATO INTERCORTADO >0 4- URGENCIA MICCIONAL >3 5- JATO FRACO >0 6-HESITACÃO INICIAL ( FORCA P/INICIAR) >0 0 NENHUMA 1 -1/5 2- 1/3 3- 1/2 4- 2/3 5-QUASE SEMPRE 7 - NICTURIA >2 TOTAL- 'a8 'a8 'a8 'a8 'a8 QUALIDADE DE VIDA- 0-OTIMO 1-BEM 2-SATISFEITO 3-+OU - 4-INSATISFEITO 'a8 5- INFELIZ 'a8 6-PESSIMO.
```

## 6) Checklist para implementação pelo agente
- [ ] Criar rota `app/api/patient/documents/[id]/pdf-styled` que: valida ownership, carrega `clean_text`, monta HTML via `generatePremiumPDFHTML`, renderiza em PDF (chromium/headless), retorna `application/pdf` stream.
- [ ] Atualizar modal do paciente para usar essa rota e mostrar loader/erros; manter fallback textual.
- [ ] Garantir fontes remotas (Noto Sans/Roboto) ou usar CSS web fonts no HTML template.
- [ ] Testar com texto >150k caracteres e com acentuação/combining (erro WinAnsi).
- [ ] Documentar limites de tamanho e timeouts no README do paciente.

## Notas de implementação (atualizadas)
- A rota `pdf-styled` deve usar `generatePremiumPDFHTML` diretamente (sem round-trip HTTP) e pode tentar `puppeteer`/Chromium com `runtime="nodejs"`. Quando indisponível, o cliente deve recair para a conversão via `html2pdf` com o HTML fornecido por `/styled-html` e, se ainda falhar, para o PDF textual.
- O modal do paciente precisa sempre tentar na ordem: PDF estilizado do servidor → HTML estilizado com `html2pdf` → PDF textual. Isso evita falhas 500/502 de runtime e mantém o download disponível.
