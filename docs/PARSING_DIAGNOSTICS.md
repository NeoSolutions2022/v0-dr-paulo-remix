# Diagnóstico e Reprocessamento Simplificado do `cleanText`

Este documento descreve um caminho simples para reprocessar o texto limpo (`cleanText`) e garantir a extração de **Data de Nascimento** e **Nome** mesmo quando o parser atual falha.

## Objetivo

Quando o `cleanText` já contém linhas como:

```
Data de Nascimento: 1965-07-24
```

e ainda assim o parser retorna `missing: ["birthDate"]`, queremos:

1. Reprocessar o texto com uma rotina **mínima** e previsível.
2. Extrair campos com uma regra direta baseada em rótulos.
3. Usar o parser atual apenas como fallback.

## Estratégia recomendada (simples e robusta)

### 1) Criar um reprocessamento mínimo

Em vez de aplicar todas as transformações, faça um **passo único** que apenas:

- mantém as quebras de linha;
- normaliza espaços extras;
- re-separa rótulos (`Código`, `Nome`, `Data de Nascimento`, `Telefone`) se vierem na mesma linha.

Pseudocódigo:

```ts
function normalizeHeader(text: string) {
  return text
    // garante quebra antes de rótulos
    .replace(/\s+(Código|Nome|Data de Nascimento|Telefone):/gi, "\n$1:")
    // normaliza espaços e tabs, preservando "\n"
    .replace(/[ \t]+/g, " ")
    .trim()
}
```

### 2) Extrair por rótulo primeiro

Priorize rótulos explícitos antes de regex genéricas de data:

```ts
const nameMatch = header.match(/Nome:\s*([^\n]+)/i)
const birthMatch = header.match(/Data de Nascimento:\s*([0-9./\-\s]+)/i)
```

Depois normalize a data (reutilizando `normalizeBirthDate`).

### 3) Só então usar o parser atual como fallback

Se o modo simples falhar, use `extractPatientData` como fallback.

## Implementação sugerida (fluxo)

1. Recebe `cleanText` atual.
2. Executa `normalizeHeader(cleanText)`.
3. Extrai `Nome` e `Data de Nascimento` por rótulo.
4. Se ambos vierem válidos, encerra.
5. Caso falhe, cai no parser atual (`extractPatientData`).

## Exemplo de diagnóstico

Com este `cleanText`:

```
FICHA DO PACIENTE
Código: 2778
Nome: PAULO SALAS
Data de Nascimento: 1965-07-24
Telefone: 2546925
```

O parser simples deve retornar:

```json
{
  "fullName": "PAULO SALAS",
  "birthDate": "1965-07-24"
}
```

## Resultado esperado

Mesmo que a extração atual falhe, o reprocessamento mínimo garante a coleta dos campos principais com uma regra previsível e fácil de manter.
