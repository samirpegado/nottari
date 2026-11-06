# Como Usar

## Passo 1: Copie o boilerplate para seu projeto

Copie todo o conteúdo deste repositório para a raiz do seu projeto:

```bash
# Se você clonou o boilerplate em uma pasta separada
cp -r caminho/para/boilerplate/* seu-projeto/

# Ou copie manualmente as pastas:
# .ai/, .cursor/, .github/, .kiro/, .agents/, scripts/, AGENTS.md, etc.
```

**Importante:** Se seu projeto já tem alguma dessas pastas (como `.github/`), faça merge com cuidado para não sobrescrever configurações existentes.

## Passo 2: Rode o bootstrap inicial

Abra o terminal na raiz do seu projeto e execute:

```bash
python scripts/bootstrap_ai_context.py --write
```

### O que esse script faz?

1. **Detecta sua stack automaticamente**
   - Procura por `package.json`, `pubspec.yaml`, etc
   - Identifica se é Next.js, Flutter, ou outro

2. **Mapeia a estrutura do projeto**
   - Lista pastas principais
   - Identifica arquivos de configuração
   - Detecta dependências instaladas

3. **Gera documentação inicial**
   - Cria arquivos em `.ai/project/generated/`
   - Preenche informações técnicas automaticamente
   - Lista o que ainda precisa ser preenchido manualmente

4. **Mostra o que está faltando**
   - Cria `.ai/project/generated/missing-context.md`
   - Lista perguntas que você precisa responder

## Passo 3: Complete as informações de negócio

Abra os arquivos em `.ai/project/` e preencha o que o script não conseguiu detectar:

### Arquivos principais para revisar:

**`.ai/project/overview.md`**
- O que é o produto?
- Qual problema ele resolve?
- Quem são os usuários?

**`.ai/project/requirements/business.md`**
- Quais são as regras de negócio?
- Quais funcionalidades principais?
- Quais restrições existem?

**`.ai/project/architecture/structure.md`**
- Como o código está organizado?
- Quais são as camadas da aplicação?
- Onde fica cada tipo de código?

**`.ai/project/rules/coding.md`**
- Quais padrões de código seguir?
- Quais convenções de nomenclatura?
- Quais bibliotecas preferir?

**`.ai/project/rules/security.md`**
- Quais regras de segurança seguir?
- Como lidar com dados sensíveis?
- Quais validações são obrigatórias?

## Passo 4: Teste com um agente de IA

Agora você pode testar! Abra seu IDE favorito e pergunte algo ao agente:

### No Cursor, VS Code, ou Kiro:

```
Leia AGENTS.md e me explique como esse projeto está estruturado.
```

### Ou peça algo mais específico:

```
Adiciona uma nova página de perfil do usuário seguindo os padrões do projeto.
```

A IA deve:
- Entender a stack do projeto
- Seguir os padrões de código
- Criar arquivos nos lugares certos
- Aplicar as regras de segurança

## Passo 5: Mantenha atualizado

### Quando adicionar novas funcionalidades importantes:

Atualize a documentação em `.ai/project/`:
- Adicione novas regras de negócio
- Documente novas integrações
- Atualize a arquitetura se mudou

### Quando mudar a estrutura do projeto:

Rode novamente o bootstrap:

```bash
python scripts/bootstrap_ai_context.py --write
```

Ele vai atualizar os arquivos gerados automaticamente.

### Quando o boilerplate privado receber uma atualização:

No clone local de `ai-project-setup`, faça primeiro uma prévia:

```bash
python scripts/update_ai_context.py --target C:\caminho\do\projeto
```

Depois aplique e valide:

```bash
python scripts/update_ai_context.py --target C:\caminho\do\projeto --write --refresh
```

Arquivos existentes em `.ai/project/` são preservados. Use `--include-guidance` somente depois de revisar a prévia, pois essa opção também atualiza regras compartilhadas e integrações de IDE.

### Antes de grandes mudanças:

Rode o "doctor" para verificar se está tudo ok:

```bash
python scripts/doctor_ai_context.py
```

Ele vai avisar se:
- Algum arquivo importante está faltando
- A documentação está desatualizada
- Há inconsistências no contexto
- Arquivos gerados ou blocos gerenciados estão obsoletos

## Dicas práticas

### ✅ Faça commits da documentação
Os arquivos em `.ai/project/` devem ser versionados no git. Eles fazem parte do projeto.

### ✅ Revise periodicamente
A cada sprint ou release, revise se a documentação ainda está correta.

### ✅ Compartilhe com a equipe
Todos os desenvolvedores devem ter o mesmo contexto. Isso garante consistência.

### ✅ Use em projetos novos e antigos
- **Projeto novo:** Configure desde o início
- **Projeto antigo:** Rode o bootstrap e complete as lacunas

### ⚠️ Não coloque segredos
Nunca coloque senhas, tokens ou chaves de API na documentação. Use variáveis de ambiente.

## Próximos passos

Agora que você sabe usar, veja exemplos práticos de prompts e fluxos de trabalho.
