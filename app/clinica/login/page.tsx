'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ClinicLoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/login")
  }, [router])

  return null
}

// const router = useRouter()
// const [email, setEmail] = useState('')
// const [password, setPassword] = useState('')
// const [loading, setLoading] = useState(false)
// const [error, setError] = useState('')

// const handleLogin = async (e: React.FormEvent) => {
//   e.preventDefault()
//   setLoading(true)
//   setError('')

//   try {
//     const supabase = createBrowserClient()

//     const { data, error: signInError } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     })

//     if (signInError) throw signInError

//     // Verificar se é um usuário da clínica
//     const { data: clinicUser, error: clinicError } = await supabase
//       .from('clinic_users')
//       .select('*')
//       .eq('id', data.user.id)
//       .single()

//     if (clinicError || !clinicUser) {
//       await supabase.auth.signOut()
//       throw new Error('Este usuário não tem acesso ao painel da clínica')
//     }

//     router.push('/clinica/dashboard')
//   } catch (err: any) {
//     console.error('[v0] Login error:', err)
//     setError(err.message || 'Erro ao fazer login')
//   } finally {
//     setLoading(false)
//   }
// }

// return (
//   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
//     <Card className="w-full max-w-md">
//       <CardHeader className="space-y-1">
//         <CardTitle className="text-2xl font-bold text-center">Portal da Clínica</CardTitle>
//         <CardDescription className="text-center">
//           Acesse o sistema de gestão médica
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <form onSubmit={handleLogin} className="space-y-4">
//           <div className="space-y-2">
//             <Label htmlFor="email">Email</Label>
//             <Input
//               id="email"
//               type="email"
//               placeholder="seu@email.com"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//               disabled={loading}
//             />
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="password">Senha</Label>
//             <Input
//               id="password"
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               disabled={loading}
//             />
//           </div>

//           {error && (
//             <Alert variant="destructive">
//               <AlertCircle className="h-4 w-4" />
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}

//           <Button type="submit" className="w-full" disabled={loading}>
//             {loading ? (
//               <>
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 Entrando...
//               </>
//             ) : (
//               'Entrar'
//             )}
//           </Button>
//         </form>
//       </CardContent>
//     </Card>
//   </div>
// )
