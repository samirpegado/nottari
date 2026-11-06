# Exemplos Práticos

## Cenário 1: Novo desenvolvedor entrando no projeto

### Sem o boilerplate:
```
Dev: "Como eu rodo esse projeto?"
Senior: "Instala as dependências, configura o .env, roda o docker..."
Dev: "Onde fica a documentação?"
Senior: "Não tem muito documentado, vou te explicar..."
```

### Com o boilerplate:
```
Dev: [Abre o Cursor]
Dev: "Leia AGENTS.md e me explique como configurar e rodar esse projeto"
IA: "Este é um projeto Next.js + Supabase. Para configurar:
     1. Copie .env.example para .env.local
     2. Configure as variáveis do Supabase
     3. Rode npm install
     4. Rode npm run dev
     
     A estrutura do projeto está em app/, com..."
```

## Cenário 2: Adicionando uma nova feature

### Prompt inicial:
```
Preciso adicionar uma página de configurações do usuário onde ele pode:
- Alterar nome e email
- Fazer upload de foto de perfil
- Mudar preferências de notificação

Siga os padrões do projeto.
```

### O que a IA vai fazer (com contexto):
1. Ler `.ai/project/architecture/structure.md` para saber onde criar arquivos
2. Ler `.ai/project/stack/nextjs-web.md` para usar os padrões corretos
3. Ler `.ai/project/rules/security.md` para aplicar validações
4. Criar os arquivos nos lugares certos:
   - `app/(dashboard)/settings/page.tsx`
   - `lib/services/user-settings.ts`
   - `components/settings/SettingsForm.tsx`
5. Usar os componentes e padrões já existentes no projeto

### Sem contexto:
A IA criaria arquivos em lugares aleatórios, usaria bibliotecas diferentes, não seguiria os padrões de segurança.

## Cenário 3: Corrigindo um bug

### Prompt:
```
O upload de imagens está falhando. Investiga e corrige.
```

### O que a IA faz (com contexto):
1. Lê `.ai/project/architecture/integrations.md` e vê que usa Supabase Storage
2. Procura por arquivos relacionados a upload
3. Verifica as regras de segurança em `.ai/project/rules/security.md`
4. Identifica que falta validação de tipo de arquivo
5. Corrige aplicando as regras de segurança do projeto

## Cenário 4: Refatorando código

### Prompt:
```
O arquivo app/api/users/route.ts está muito grande. 
Refatora seguindo os padrões do projeto.
```

### O que a IA faz (com contexto):
1. Lê `.ai/project/architecture/structure.md` para entender a organização
2. Vê que lógica de negócio deve ficar em `lib/services/`
3. Vê que validações devem ficar em `lib/validations/`
4. Refatora criando:
   - `lib/services/user-service.ts` (lógica de negócio)
   - `lib/validations/user-schema.ts` (validações)
   - Mantém apenas o handler na rota

## Cenário 5: Revisando código antes de commit

### Prompt:
```
Revisa as mudanças que fiz e verifica se estão seguindo os padrões do projeto.
```

### O que a IA faz (com contexto):
1. Lê `.ai/project/rules/coding.md` para conhecer os padrões
2. Lê `.ai/project/rules/security.md` para verificar segurança
3. Lê `.ai/project/rules/testing.md` para ver se precisa de testes
4. Analisa o diff do git
5. Aponta:
   - ✅ O que está correto
   - ⚠️ O que pode melhorar
   - ❌ O que está violando alguma regra

## Cenário 6: Documentando uma decisão arquitetural

### Prompt:
```
Decidimos usar React Query para cache de dados da API. 
Documenta essa decisão.
```

### O que a IA faz (com contexto):
1. Lê `.ai/project/architecture/decisions.md`
2. Adiciona uma nova entrada seguindo o formato ADR (Architecture Decision Record)
3. Documenta:
   - Contexto da decisão
   - Alternativas consideradas
   - Decisão tomada
   - Consequências

## Cenário 7: Integrando com uma API externa

### Prompt:
```
Preciso integrar com a API do Stripe para pagamentos.
```

### O que a IA faz (com contexto):
1. Lê `.ai/project/architecture/integrations.md` para ver o padrão de integrações
2. Lê `.ai/project/rules/security.md` para saber como lidar com chaves de API
3. Cria:
   - `lib/integrations/stripe/client.ts` (cliente da API)
   - `lib/integrations/stripe/types.ts` (tipos TypeScript)
   - `lib/services/payment-service.ts` (lógica de negócio)
4. Documenta a integração em `.ai/project/architecture/integrations.md`
5. Adiciona variáveis de ambiente necessárias em `.env.example`

## Cenário 8: Configurando CI/CD

### Prompt:
```
Configura GitHub Actions para rodar testes e fazer deploy automático.
```

### O que a IA faz (com contexto):
1. Lê `.ai/project/rules/git-workflow.md` para entender o fluxo de trabalho
2. Lê `.ai/project/rules/testing.md` para saber quais testes rodar
3. Lê `.ai/project/stack/current-stack.md` para saber onde fazer deploy
4. Cria `.github/workflows/ci.yml` seguindo os padrões do projeto

## Dicas para prompts eficazes

### ✅ Bons prompts:
- "Adiciona validação de email seguindo os padrões do projeto"
- "Refatora esse componente para melhorar performance"
- "Cria testes para o user-service"
- "Documenta essa nova integração"

### ❌ Prompts que podem ser melhorados:
- "Faz alguma coisa" (muito vago)
- "Adiciona tudo que está faltando" (muito amplo)
- "Cria um sistema completo de..." (muito grande, quebre em partes)

### 💡 Dica de ouro:
Sempre que pedir algo, adicione: **"seguindo os padrões do projeto"**

Isso faz a IA consultar a documentação em `.ai/project/` antes de agir.

## Próximos passos

Agora você está pronto para usar o boilerplate! Comece com um projeto pequeno e vá expandindo conforme ganha confiança.
