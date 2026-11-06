# A Solução

## O que é esse boilerplate?

É um conjunto de arquivos e pastas que você copia para o seu projeto. Esses arquivos ensinam os agentes de IA sobre:

- **O que é o seu projeto** (produto, objetivos, regras de negócio)
- **Como ele está estruturado** (arquitetura, pastas, padrões)
- **Qual tecnologia você usa** (Next.js, Flutter, Supabase, etc)
- **Como você trabalha** (regras de código, testes, segurança, git)

## Como funciona?

### 1. Você copia o boilerplate para o projeto

```
seu-projeto/
├── .ai/              ← Documentação viva do projeto
├── .cursor/          ← Regras para Cursor
├── .github/          ← Regras para Copilot
├── .kiro/            ← Regras para Kiro
├── AGENTS.md         ← Regras compartilhadas
└── scripts/          ← Automação
```

### 2. Você roda um script de bootstrap

O script analisa seu projeto e preenche automaticamente:
- Qual stack você está usando
- Quais arquivos e pastas existem
- Quais dependências estão instaladas

### 3. Você completa as informações de negócio

O script te avisa o que está faltando:
- Qual é o objetivo do produto?
- Quem são os usuários?
- Quais são as regras específicas do projeto?

### 4. Pronto! Qualquer agente de IA agora entende seu projeto

Não importa se você usa:
- **Cursor** (lê `.cursor/rules/`)
- **VS Code + Copilot** (lê `.github/`)
- **Kiro** (lê `.kiro/steering/`)
- **Claude, ChatGPT, Gemini** (lê `AGENTS.md`)

Todos vão ter o mesmo contexto padronizado.

## O que você ganha?

### ✅ Respostas mais precisas
A IA sabe exatamente como seu projeto funciona.

### ✅ Menos repetição
Você não precisa explicar o contexto toda vez.

### ✅ Consistência na equipe
Todo mundo usa o mesmo padrão de contexto.

### ✅ Documentação viva
O projeto se documenta automaticamente conforme evolui.

### ✅ Onboarding mais rápido
Novos desenvolvedores (e IAs) entendem o projeto rapidamente.

## Exemplo prático

**Antes:**
```
Você: "Adiciona autenticação"
IA: "Vou criar um sistema de login com JWT..."
Você: "Não, a gente usa Supabase"
IA: "Ok, onde fica a configuração?"
Você: "Em lib/supabase.ts"
IA: "E as rotas protegidas?"
Você: "Usa middleware..."
```

**Depois:**
```
Você: "Adiciona autenticação"
IA: "Vou usar o Supabase já configurado em lib/supabase.ts,
     criar o middleware de proteção seguindo o padrão do projeto
     e adicionar as rotas em app/(auth)/. Posso prosseguir?"
```
