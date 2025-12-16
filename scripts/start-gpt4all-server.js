// Este servidor roda na porta 5000 e fornece IA offline
import { spawn } from "child_process"
import axios from "axios"

const PORT = 5000
const MODEL = "mistral-7b-instruct-v0.1.Q4_0.gguf" // Modelo padrão (rápido)

console.log("🧠 Iniciando servidor GPT4All...")
console.log(`📁 Modelo: ${MODEL}`)
console.log(`🔌 Porta: ${PORT}`)

// Inicia o servidor gpt4all (requer instalação do Python package)
const gpt4allProcess = spawn("python", ["-m", "gpt4all.http_server", "--model", MODEL, "--port", PORT.toString()])

gpt4allProcess.stdout.on("data", (data) => {
  console.log(`[GPT4All] ${data}`)
})

gpt4allProcess.stderr.on("data", (data) => {
  console.error(`[GPT4All Error] ${data}`)
})

// Testa conexão após 5 segundos
setTimeout(async () => {
  try {
    const response = await axios.get(`http://localhost:${PORT}/health`)
    console.log("✅ GPT4All server está online!")
  } catch (error) {
    console.error("❌ Erro ao conectar ao GPT4All:", error.message)
  }
}, 5000)
