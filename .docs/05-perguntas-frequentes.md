# Perguntas Frequentes

## Sobre o boilerplate

### Isso funciona com qualquer IDE?

Sim! O boilerplate foi feito para funcionar com:
- **Cursor** (lê `.cursor/rules/`)
- **VS Code + Copilot** (lê `.github/`)
- **Kiro** (lê `.kiro/steering/`)
- **Claude, ChatGPT, Gemini** (lê `AGENTS.md`)

Cada IDE tem sua pasta específica, mas todos compartilham o contexto base em `AGENTS.md` e `.ai/project/`.

### Preciso usar todos os IDEs?

Não! Use apenas o que você preferir. O boilerplate está preparado para todos, mas você pode usar só um.

### Funciona com qualquer linguagem/framework?

O boilerplate foi otimizado para os projetos da Devfy:
- **Next.js + TypeScript** (web)
- **Flutter** (mobile)

Mas você pode adaptar para outras stacks editando os arquivos em `.ai/project/stack/`.

### Quanto espaço isso ocupa?

Muito pouco! São apenas arquivos de texto (markdown e YAML). Geralmente menos de 1MB.

## Sobre configuração

### Preciso configurar tudo manualmente?

Não! O script `bootstrap_ai_context.py` detecta automaticamente:
- Qual stack você está usando
- Quais dependências estão instaladas
- Como o projeto está estruturado

Você só precisa preencher as informações de negócio que o script não consegue detectar.

### E se eu não souber Python?

Não precisa saber! Basta ter Python instalado e rodar o comando:

```bash
python scripts/bootstrap_ai_context.py --write
```

O script faz tudo sozinho.

### Posso usar em projetos já existentes?

Sim! O boilerplate funciona tanto para projetos novos quanto antigos. 

Para projetos antigos:
1. Copie o boilerplate
2. Rode o bootstrap
3. Revise e complete as informações geradas

### E se meu projeto já tem `.github/` ou `.cursor/`?

Faça merge com cuidado:
- Não sobrescreva configurações importantes (como workflows do GitHub Actions)
- Adicione apenas os arquivos novos
- Revise conflitos manualmente

## Sobre uso diário

### Preciso rodar o bootstrap toda vez?

Não! Rode apenas:
- Na primeira configuração
- Quando mudar a estrutura do projeto significativamente
- Quando adicionar/remover dependências importantes

### Como sei se a documentação está desatualizada?

Rode o "doctor":

```bash
python scripts/doctor_ai_context.py
```

Ele vai avisar se algo está inconsistente.

### Como atualizo o doctor e o bootstrap em projetos existentes?

Use o clone local autenticado deste repositório privado como fonte:

```bash
python scripts/update_ai_context.py --target C:\caminho\do\projeto --write --refresh
```

O atualizador não depende de download público e não sobrescreve a documentação viva já existente em `.ai/project/`.

### Preciso commitar esses arquivos?

**Sim!** Os arquivos em `.ai/project/`, `AGENTS.md`, `.cursor/`, `.github/`, `.kiro/` devem ser versionados.

**Não commite:** Nada com senhas, tokens ou dados sensíveis.

### A IA ainda erra às vezes?

Sim, IAs não são perfeitas. Mas com contexto adequado, os erros diminuem muito. Sempre revise o código gerado.

## Sobre segurança

### Posso colocar informações sensíveis na documentação?

**NÃO!** Nunca coloque:
- Senhas
- Tokens de API
- Chaves privadas
- Dados de clientes
- Informações confidenciais

Use variáveis de ambiente para isso.

### A IA tem acesso aos meus dados?

Depende do IDE:
- **Cursor, Copilot:** Enviam código para servidores externos
- **Kiro:** Pode ser configurado para rodar localmente
- **Claude/ChatGPT:** Você controla o que compartilha

Sempre revise as políticas de privacidade do IDE que você usa.

### Como proteger informações do projeto?

1. Use `.gitignore` para arquivos sensíveis
2. Documente apenas o necessário
3. Não coloque dados reais de clientes na documentação
4. Use exemplos genéricos

## Sobre manutenção

### Quanto tempo leva para manter isso?

Pouco! Depois da configuração inicial:
- **Manutenção regular:** 5-10 minutos por sprint
- **Atualizações grandes:** 30 minutos quando mudar arquitetura

### Quem deve manter a documentação?

Toda a equipe! Quando alguém:
- Adiciona uma feature importante → Documenta
- Muda a arquitetura → Atualiza `.ai/project/architecture/`
- Cria uma nova regra → Adiciona em `.ai/project/rules/`

### E se a equipe não mantiver?

A documentação fica desatualizada e a IA começa a dar respostas erradas. Por isso é importante:
- Incluir revisão da documentação no Definition of Done
- Fazer parte do processo de code review
- Rodar o doctor periodicamente

## Sobre problemas comuns

### A IA não está seguindo os padrões

Verifique:
1. O arquivo `AGENTS.md` está na raiz do projeto?
2. Os arquivos em `.ai/project/` estão preenchidos?
3. Você está pedindo explicitamente: "seguindo os padrões do projeto"?

### O bootstrap não está funcionando

Verifique:
1. Python está instalado? (`python --version`)
2. Você está na raiz do projeto?
3. Tem permissão de escrita nas pastas?

### A IA está sugerindo tecnologias erradas

Verifique:
1. `.ai/project/stack/current-stack.md` está correto?
2. O bootstrap detectou a stack certa?
3. Você especificou as dependências preferidas?

### Os arquivos gerados estão estranhos

Rode novamente o bootstrap:

```bash
python scripts/bootstrap_ai_context.py --write
```

Se o problema persistir, revise manualmente os arquivos em `.ai/project/generated/`.

## Sobre a Devfy

### Isso é obrigatório em todos os projetos?

Consulte seu líder técnico. O boilerplate foi criado para padronizar, mas cada projeto pode ter necessidades específicas.

### Posso adaptar para meu projeto pessoal?

Sim! O boilerplate é da Devfy, mas você pode usar e adaptar para seus projetos pessoais.

### Como contribuir com melhorias?

Fale com a equipe de P&D da Devfy. Sugestões e melhorias são sempre bem-vindas!

## Ainda tem dúvidas?

Entre em contato com a equipe de P&D ou abra uma issue no repositório do boilerplate.
