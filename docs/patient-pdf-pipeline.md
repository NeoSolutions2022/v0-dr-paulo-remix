# Pipeline de geração/visualização de PDF para pacientes

Este documento consolida como transformar o `clean_text` vindo de `documents` em um PDF renderizável no painel do paciente, sem criar usuário novo (diferente da Home). Inclui orientações para textos grandes (150k+ caracteres) e um exemplo real de `clean_text` para validar sanitização.

## Estrutura atual

- **Fonte de dados**: tabela `documents` (`id`, `patient_id`, `file_name`, `clean_text`, `pdf_url?`). O endpoint `/api/patient/documents` retorna esses campos para o paciente autenticado.
- **Geração server-side (Node)**: `lib/pdf-generator.ts` expõe `generatePdfFromText(text, documentId, fileName)` usando `pdf-lib` com paginação, cabeçalho e fallback resiliente. Sanitiza nulos e normaliza quebras de linha antes de gerar e incorpora fonte Noto Sans baixada diretamente do repositório Google Fonts (sem depender de TTFs versionados) para suportar acentuação/combining chars.【F:lib/pdf-generator.ts†L1-L131】【F:lib/pdf-generator.ts†L133-L180】
- **Endpoints prontos**:
  - `GET /api/patient/documents/:id/pdf`: valida propriedade do documento e devolve `application/pdf` gerado a partir de `clean_text` (não depende de `pdf_url`).【F:app/api/patient/documents/[id]/pdf/route.ts†L1-L64】
  - `POST /api/patient/documents/preview`: recebe `cleanText`, `fileName` e `documentId` e retorna o PDF gerado (útil para pré-visualização).【F:app/api/patient/documents/preview/route.ts†L1-L54】
- **Geração client-side**: `ProcessedDocumentViewer` (modal “Visualizar”) cria um PDF local com `pdf-lib` e fontes Noto Sans a partir de `clean_text`, baixando as TTF diretamente do repositório Google Fonts (sem exigir `/fonts` no projeto). Permite reprocessar, baixar e imprimir sem depender de `pdf_url` ou da rota de pré-visualização.【F:components/patient/processed-document-viewer.tsx†L1-L207】

## Exemplo de `clean_text` (para testes)

```
==================================================
INFORMAÇÕES ADICIONAIS
==================================================
================================================== FICHA DO PACIENTE ================================================== Código: 7770 Nome: Francisco de Paula fortaleza Data de Nascimento: 1938-05-02 Telefone: 41417430 ================================================== --- Evolução em 2017-09-27 15:48:38 --- 27/09/2017 CORACÃO- clonazepam 2 mg/ muvinlax / verapamil / exodus 5 mg PULMÃO -dpoc ex > 20 anos. DIABETES-ok CIRURGIAS- hemorroidas 4 x, osteomielite perna direita/ trauma face / ombro bilateral / catrata bilateral INTERNAMENTOS- hepatite a ALERGIAS- não ( cutanea) OUTRAS- sem cap / irmão com ca colon . ginastica/ muvinllax/ ereção pa 125x70 ac arritmia ; ap ok balanite ( decidiro apos exames po anti fungico toque retal 40 g amcia . ESCALA INTERNACIONAL DE SINTOMAS PROSTATICOS 1-SENSACAO DE ESVAZIAMENTO INCOMPLETO; >0 2-INTERVALO MENOR QUE DUAS HORAS. >1 3-JATO INTERCORTADO >0 4- URGENCIA MICCIONAL >3 5- JATO FRACO >0 6-HESITACÃO INICIAL ( FORCA P/INICIAR) >0 0 NENHUMA 1 -1/5 2- 1/3 3- 1/2 4- 2/3 5-QUASE SEMPRE 7 - NICTURIA >2 TOTAL- 'a8 'a8 'a8 'a8 'a8 QUALIDADE DE VIDA- 0-OTIMO 1-BEM 2-SATISFEITO 3-+OU - 4-INSATISFEITO 'a8 5- INFELIZ 'a8 6-PESSIMO. --- Evolução em 2017-09-27 15:48:38 --- 27/09/2017 CORACÃO- clonazepam 2 mg/ muvinlax / verapamil / exodus 5 mg PULMÃO -dpoc ex > 20 anos. DIABETES-ok CIRURGIAS- hemorroidas 4 x, osteomielite perna direita/ trauma face / ombro bilateral / catrata bilateral INTERNAMENTOS- hepatite a ALERGIAS- não ( cutanea) OUTRAS- sem cap / irmão com ca colon . ginastica/ muvinllax/ ereção pa 125x70 ac arritmia ; ap ok balanite ( decidiro apos exames po anti fungico toque retal 40 g amcia . ESCALA INTERNACIONAL DE SINTOMAS PROSTATICOS 1-SENSACAO DE ESVAZIAMENTO INCOMPLETO; >0 2-INTERVALO MENOR QUE DUAS HORAS. >1 3-JATO INTERCORTADO >0 4- URGENCIA MICCIONAL >3 5- JATO FRACO >0 6-HESITACÃO INICIAL ( FORCA P/INICIAR) >0 0 NENHUMA 1 -1/5 2- 1/3 3- 1/2 4- 2/3 5-QUASE SEMPRE 7 - NICTURIA >2 TOTAL- 'a8 'a8 'a8 'a8 'a8 QUALIDADE DE VIDA- 0-OTIMO 1-BEM 2-SATISFEITO 3-+OU - 4-INSATISFEITO 'a8 5- INFELIZ 'a8 6-PESSIMO.
```

Observações:
- Pode conter caracteres estranhos (`'a8`), acentuação e linhas extensas; normalize quebras e remova nulos antes de desenhar.
- Alguns blocos repetem conteúdo; a paginação deve suportar >150k caracteres.

## Recomendações de implementação

1. **Sanitização**
   - Remova `\u0000` e normalize `\r\n`/`\r` para `\n` antes de calcular quebra de linha (já feito em `sanitizeText`).【F:lib/pdf-generator.ts†L4-L12】
   - Trime espaços em branco para evitar páginas vazias.

2. **Paginação e layout (pdf-lib)**
- Use fontes incorporadas com suporte a acentuação (Noto Sans) e calcule quebra de linha com `font.widthOfTextAtSize(...)` para respeitar a largura útil (`pageWidth - margin*2`).【F:lib/pdf-generator.ts†L24-L99】
   - Reserve cabeçalho/título + numeração de página e só avance para nova página quando `y < margin + 2*lineHeight`.
   - Para textos gigantes, evite concatenar em memória adicional; itere linha a linha e escreva à medida que calcula.

3. **Fallbacks**
   - Sempre devolver um PDF: se a geração principal falhar, monte um PDF mínimo com mensagem de indisponibilidade ou um resumo truncado do texto (já implementado).【F:lib/pdf-generator.ts†L108-L138】
   - No client, revogue URLs de blob ao desmontar para evitar vazamento de memória (feito em `ProcessedDocumentViewer`).【F:components/patient/processed-document-viewer.tsx†L140-L148】

4. **Como expor no painel do paciente**
   - **Modal “Visualizar”**: acione `ProcessedDocumentViewer` com `clean_text` vindo do endpoint de listagem; ele gera o PDF localmente e habilita download/print. Ideal para latência zero e para cenários onde `pdf_url` não está salvo.【F:app/paciente/documentos/page.tsx†L98-L173】
   - **Rota de PDF dedicada**: para download direto/compartilhamento, use `GET /api/patient/documents/:id/pdf`, que valida o `patient_id` e gera on-demand a partir do `clean_text` armazenado.
   - **Pré-visualização programática**: `POST /api/patient/documents/preview` aceita texto bruto e retorna PDF (útil se quiser delegar a geração ao servidor em vez do browser).

5. **Performance para 150k+ caracteres**
   - Prefira o runtime Node (já configurado nos endpoints) para evitar limitações do Edge ao lidar com buffers grandes.
   - Evite carregar o texto duas vezes; passe `clean_text` diretamente ao viewer ou endpoint, e só busque `txtUrl` se necessário.
   - Considere chunking se adicionar novos geradores: calcular largura e desenhar por linha já evita estourar memória, mas mantenha o `lineHeight` fixo e margens constantes para previsibilidade.

6. **Checklist rápido para o botão de visualização**
   - [ ] Garantir que `clean_text` chegue ao componente (via `/api/patient/documents`).
   - [ ] Acionar `ProcessedDocumentViewer` com `shouldGenerate=true` ou um `triggerKey` ao abrir o modal.
   - [ ] Exibir erros amigáveis se o texto estiver vazio e oferecer download do `.txt` mesmo sem PDF.
   - [ ] Para download/compartilhamento fora do modal, usar o endpoint `/api/patient/documents/:id/pdf`.

Com esses passos, o painel do paciente consegue transformar qualquer `clean_text` retornado pelo backend em um PDF visualizável e baixável, mesmo para relatórios extensos.
