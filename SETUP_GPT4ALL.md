# Configuração de GPT4All Local

## Opção 1: Docker (Recomendado)

```bash
# Inicia o servidor GPT4All
docker-compose -f docker-compose.gpt4all.yml up -d

# Verifica se está rodando
curl http://localhost:5000/health
```

## Opção 2: Python Local

```bash
# Instala GPT4All
pip install gpt4all

# Inicia o servidor
python -m gpt4all.http_server --port 5000
```

## Opção 3: Node.js Local

```bash
# Instala dependência
npm install gpt4all

# O servidor será iniciado automaticamente
```

## Variáveis de Ambiente

Adicione no seu `.env.local`:

```env
GPT4ALL_URL=http://localhost:5000
```

## Como Funciona

1. **Upload de arquivo** → Extração com GPT4All local
2. **Sem custos** → Modelo roda no seu servidor
3. **Privacidade** → Dados nunca saem da sua máquina
4. **Fallback automático** → Se GPT4All cair, usa OpenAI automaticamente

## Modelos Disponíveis

- `mistral-7b-instruct-v0.1.Q4_0.gguf` (Rápido, bom para português)
- `llama-2-7b-chat.Q4_0.gguf` (Clássico, bom custo-benefício)
- `neural-chat-7b-v3-1.Q4_0.gguf` (Melhor qualidade, mais lento)

## Parar o Servidor

```bash
docker-compose -f docker-compose.gpt4all.yml down
