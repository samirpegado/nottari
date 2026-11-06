# Nottari

**SaaS para professores e escolas de música** controlarem alunos, agenda, mensalidades e progresso — com metrônomo embutido e área do aluno sem senha tradicional.

Quem paga é o professor ou a escola. O aluno acessa de graça, pelo telefone + PIN, e só visualiza.

## O problema

O produto nasce de dores reais sentidas em aulas de bateria, não de pesquisa teórica. O foco é **ajudar o professor**; o aluno ganha pela praticidade.

- **Metrônomo sem fricção:** hoje o professor abre o YouTube para ter um metrônomo, e o vídeo vem com propaganda que atrapalha a aula. O Nottari traz um metrônomo embutido, sem anúncios e sem depender de rede.
- **Lembrar de onde parou:** é difícil recordar o que foi trabalhado na última aula (peça, BPM, compasso, exercício). O registro de aula resolve isso e já deixa a próxima aula pronta para começar.
- **Acompanhar a evolução do aluno:** fica difícil enxergar o progresso ao longo do tempo. A linha do tempo e o histórico por aluno tornam a evolução visível.

## Como funciona

- **Professor/escola:** cadastra alunos, matrículas, agenda semanal, registra o que foi feito em cada aula (peça, BPM, tarefa), organiza materiais e controla mensalidades.
- **Aluno:** entra na área dele por **telefone + PIN de 4 dígitos** (sem conta nem senha) e visualiza agenda, tarefa atual, materiais, linha do tempo e metrônomo.
- **Metrônomo:** roda no navegador via Web Audio API, sem custo de servidor e sem anúncios.
- **Cobrança (MVP):** só controle (vencimento, status, baixa manual) com botão de WhatsApp e chave Pix prontos — sem processar pagamento.

### Acesso do aluno (telefone + PIN)

- O PIN de 4 dígitos é **gerado automaticamente** no cadastro; o professor pode digitar um específico e editá-lo depois.
- O PIN é guardado **cifrado** (chave no Supabase Vault) para o professor poder visualizar/editar, nunca em texto puro.
- O login tem **limite de tentativas por telefone** (bloqueio temporário após falhas) e cria uma **sessão longa no dispositivo**, para o aluno não digitar o PIN toda vez.

## Stack

| Camada | Escolha | Motivo |
| --- | --- | --- |
| App | PWA com Next.js | Um código para web e mobile |
| Banco / Auth / Storage | Supabase (Postgres) | RLS por organização, autenticação e storage prontos |
| Arquivos pesados | Cloudflare R2 | Não cobra tráfego de saída |
| E-mail | Resend ou SES | Custo quase nulo no volume inicial |

Tudo pertence a uma `Organization`, o que permite escola e professor solo no mesmo esquema (o solo é uma organização com um único membro).

## Modelo de dados

O schema já está aplicado no Supabase. Principais tabelas (todas com RLS por organização):

| Tabela | Para que serve |
| --- | --- |
| `organizations` | Escola ou professor solo (raiz de tudo) |
| `members` | Professor/dono, vinculado ao usuário de login |
| `students` | Cadastro do aluno, telefone e PIN de acesso (cifrado) |
| `student_sessions` | Sessões por dispositivo após o login do aluno |
| `enrollments` | Plano, valores e dia de vencimento |
| `schedule_rules` | Recorrência semanal das aulas |
| `lessons` | Cada aula, com status (feita, falta, remarcada, reposição) |
| `lesson_notes` | Registro da aula: peça, BPM, compasso, tarefa |
| `materials` | PDF, mp3 ou link de vídeo (biblioteca do professor) |
| `material_assignments` | Material atribuído a um aluno |
| `charges` | Mensalidade com competência, vencimento e status |

### RPCs principais

- `create_organization(nome, tipo)` — cria a organização e o membro dono.
- `create_student(...)` — cadastra aluno; PIN opcional (digitado) ou gerado automaticamente.
- `get_student_pin(aluno)` / `set_student_pin(aluno, pin)` — professor vê e edita o PIN.
- `student_login(telefone, pin)` — login do aluno com rate limiting; retorna token de sessão.
- `student_logout(token)` e `student_home(token)` — logout e leitura da área do aluno (perfil, onde parou, próximas aulas).

## Roadmap

- **Fase 1 (MVP):** cadastro, matrícula, agenda com remarcação, registro de aula, materiais, mensalidade manual e área do aluno por telefone + PIN.
- **Fase 2:** escolas com vários professores, e-mail automático de vencimento e relatórios simples.
- **Fase 3:** cobrança automática via Pix, aluno registrando o próprio estudo e notificações push.

Visão completa, decisões e riscos em [`PROJECT.md`](PROJECT.md). O esboço das
telas, o conteúdo de cada uma e a ordem dos menus estão em
[`docs/telas-e-menus.md`](docs/telas-e-menus.md).

## Preço

O aluno é sempre gratuito. O professor tem plano gratuito até uns 5 a 8 alunos e plano pago acima disso, com cota maior de armazenamento — o limite de storage é o que protege o custo.

## Desenvolvimento

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e preencha `SUPABASE_PUBLISHABLE_KEY`. O cadastro chama a edge function `signup`.

A tela de entrada fica em `/`.

---

## Contexto de IA do repositório

Este repositório usa o blueprint de contexto de IA da **Devfy** (pastas `.ai/`, `.cursor/`, `.github/`, `.kiro/`, `.agents/` e `scripts/`) para padronizar como agentes entendem o projeto. Para regenerar a documentação viva:

```bash
python scripts/bootstrap_ai_context.py --write   # gera/atualiza o contexto
python scripts/bootstrap_ai_context.py --check    # verificação sem escrever
```

Leia `AGENTS.md` e `.ai/manifest.yaml` antes de mudanças grandes.
