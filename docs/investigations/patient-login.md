# Investigação: paciente não consegue fazer login

## O que o código faz hoje
- O endpoint `/api/process-and-register` cria ou atualiza o usuário no **Supabase Auth** com email gerado a partir do nome e senha igual à data de nascimento sem hífens. Ele ainda tenta um login de teste (quando `debugLogin` não é falso) e só continua se o Auth aceitar as credenciais.【F:app/api/process-and-register/route.ts†L23-L196】
- Depois disso, o mesmo endpoint cria/realinha o registro na tabela `patients` com o `id` do usuário do Auth e marca `first_access` como `true`.【F:app/api/process-and-register/route.ts†L97-L194】
- A tela `/login` aceita email ou CPF; se o usuário digita um CPF, o front converte para `<cpf>@patients.local` antes de chamar `supabase.auth.signInWithPassword`.【F:app/auth/login/page.tsx†L16-L83】

## Conclusão provável
O login retornar `invalid_credentials` enquanto o paciente aparece na tabela `patients` indica que o cadastro no **Auth** não existe ou está com senha divergente. Isso acontece se o endpoint foi chamado com `debugLogin` desativado e a criação no Auth falhou (por exemplo, chave de service role incorreta ou projeto Supabase diferente), deixando apenas o registro em `patients`. Sem o usuário no Auth, qualquer tentativa de `signInWithPassword` com as credenciais fornecidas resultará em `invalid_credentials`.

## Próximos passos sugeridos
- Verificar se o usuário consta em **Auth → Users** com o email gerado e se há algum erro nos logs do endpoint durante o processamento do relatório.
- Garantir que as variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` apontem para o mesmo projeto e estejam disponíveis no ambiente que processa os relatórios.
- Mantiver `debugLogin` habilitado (valor padrão) para que o endpoint falhe cedo caso o Auth rejeite as credenciais, evitando registros órfãos em `patients`.
