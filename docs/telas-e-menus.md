# Telas e menus — app do professor (MVP)

Esboço do que cada tela precisa ter, a ordem dos elementos dentro dela e a
ordem dos menus. Serve de guia para implementar as telas em cima do schema já
existente (`organizations`, `members`, `students`, `enrollments`,
`schedule_rules`, `lessons`, `lesson_notes`, `materials`,
`material_assignments`, `charges`).

A régua para decidir ordem é sempre a mesma: **ajudar o professor no fluxo real
da aula**. As três dores que guiam o produto (ver `PROJECT.md`) aparecem como
prioridade: metrônomo sem fricção, lembrar onde parou e acompanhar a evolução.

---

## Ordem dos menus

O fluxo diário do professor é: abrir o dia → abrir o aluno/aula → registrar o
que foi feito → cobrar quando vence. Os menos usados ficam embaixo.

| # | Menu | Por quê nessa posição | Status |
| --- | --- | --- | --- |
| 1 | **Início** | Tela de pouso após login; resumo do dia | feito |
| 2 | **Alunos** | O horário só existe se o aluno já estiver cadastrado | feito (cadastro e lista) |
| 3 | **Agenda** | Semana com horários livres e ocupados | feito |
| 4 | **Mensalidades** | Controle financeiro, uso semanal/mensal | a fazer |
| 5 | **Materiais** | Biblioteca; consultado com menos frequência | a fazer |
| 6 | **Configurações** | Conta, plano, dados da organização | a fazer |

A ordem atual do menu já segue isso. Dois ajustes recomendados:

- **Metrônomo** não entra como item de menu de navegação. Ele é usado no meio da
  aula, então fica como **ação rápida sempre visível** (botão fixo no topo/rodapé)
  e embutido dentro da tela da aula. Uma rota própria `/metronomo` é opcional.
- No celular, os 4 primeiros (Início, Alunos, Agenda, Mensalidades) viram uma
  **tab bar inferior**; Materiais e Configurações entram num menu "Mais".

---

## Convenções de layout

Valem para todas as telas, para manter consistência com a identidade:

1. **Cabeçalho**: título da seção à esquerda, ação primária à direita
   (ex.: "Novo aluno", "Registrar aula").
2. **Resumo/filtros**: quando houver, logo abaixo do título (cards de número ou
   filtros curtos).
3. **Conteúdo principal**: lista ou detalhe.
4. **Estado vazio** sempre explica o que fazer, nunca só "nada aqui".
5. Fundo claro (`#F8FAFC`), cartões brancos, azul `#3B82F6` para ação e destaque,
   roxo `#8B5CF6` só em detalhe/gradiente.

---

## 1. Início (dashboard)

**Objetivo:** em 3 segundos o professor sabe como está o dia.

Ordem dos elementos:

1. Saudação "Olá, {primeiro nome}!" + nome da organização.
2. Três números do dia: **Aulas hoje**, **Alunos hoje**, **Mensalidades em aberto**.
3. **Próximas aulas** (lista): aluno, horário, peça/assunto da última aula, status.
4. (fase 2) Atalhos: "Registrar aula de agora", "Cobrar em atraso".

Dados: `lessons` do dia e futuras, `lesson_notes` (última peça), `charges` em
aberto. Estado vazio: convidar a cadastrar o primeiro aluno.

---

## 2. Agenda

**Objetivo:** ver a semana inteira e saber, de relance, o que está ocupado e o
que ainda dá para oferecer.

A grade vai de **06:00 às 00:00**, em blocos de 30 minutos, com os horários na
coluna da esquerda e os dias de segunda a domingo. Um bloco azul é um horário
fixo (`schedule_rules`). O restante é horário disponível.

Para ocupar um horário, o aluno **já precisa existir** em Alunos. O botão
**Matricular** (ou um clique na célula livre) define o dia, a duração, o
horário, o valor (hora/aula ou mensalidade), o dia do pagamento e detalhes. Um dia que já passou
nesta semana marca a primeira aula na próxima e o horário já aparece na coluna desse dia. Isso cria a matrícula, a regra
semanal e as próximas 8 aulas. Um clique no horário ocupado abre a matrícula
para edição. O encerramento fica na ficha do aluno.

Estado vazio: sem alunos, a agenda pede o cadastro antes de reservar.

---

## 3. Alunos

### 3a. Lista de alunos

Tabela paginada, 20 por página, com busca por nome, CPF, telefone ou e-mail.
Colunas: nome, telefone, CPF, e-mail e ações. **Editar** reabre o modal com os
dados e o PIN atuais. **Excluir** remove o aluno, os horários e as aulas.

### 3b. Cadastro do aluno

Modal. Obrigatórios: nome e telefone. Opcionais: e-mail, CPF e endereço.
O PIN de 4 dígitos já vem preenchido e pode ser alterado antes de salvar.
No endereço, o CEP consulta o ViaCEP e preenche logradouro, bairro, cidade e UF.

Dados: `students` (CPF e endereço estruturado) e PIN via `create_student`.

### 3c. Detalhe do aluno

A tela mais importante do produto. Ordem:

1. Cabeçalho: nome + ações (**Registrar aula**, **WhatsApp**, editar).
2. **Onde parou** em destaque no topo: última `lesson_note` (peça, BPM, compasso,
   tarefa) — resolve a dor de lembrar a aula anterior.
3. **Próxima aula** e matrícula resumida. **Encerrar matrícula** fica aqui:
   último dia no calendário e motivo. As aulas depois dessa data saem da agenda.
4. **Linha do tempo**: histórico de aulas e registros, do mais recente ao antigo.
5. **Materiais do aluno**: atribuídos, com atalho para atribuir mais.
6. **Mensalidades** do aluno: status e botão de cobrança.
7. Acesso do aluno: telefone + PIN, botão "Enviar link/PIN por WhatsApp".

Dados: `lesson_notes`, `lessons`, `material_assignments`, `charges`, `student_access`.

---

## 4. Registro de aula (sub-tela, aberta pela agenda ou pelo aluno)

**Objetivo:** anotar a aula com o mínimo de digitação; alimenta "onde parou" e a
evolução.

Ordem dos elementos:

1. Topo fixo: aluno, data/hora, status da aula.
2. **O que começa já preenchido pela última aula** (peça, BPM) para só ajustar.
3. Campos: **peça**, **BPM**, **compasso/onde parou**, **tarefa de casa**,
   observações.
4. **Metrônomo embutido** (play/tap tempo) usando o BPM do campo.
5. Anexar material à tarefa.
6. Salvar (e marcar a aula como feita).

Dados: `lessons` (status) + `lesson_notes` (peça, bpm, measure, homework, notes).

---

## 5. Mensalidades

**Objetivo:** ver quem deve e cobrar em um toque.

Ordem dos elementos:

1. Cabeçalho + resumo: **em aberto**, **vencendo**, **recebido no mês**.
2. Filtro por status (pendente/pago/atrasado) e por competência (mês).
3. Lista: aluno, competência, vencimento, valor, status.
4. Ações por linha: **dar baixa** (pago) e **cobrar no WhatsApp** (mensagem
   pronta com a chave Pix do professor).

Dados: `charges` (`competence`, `due_date`, `amount`, `status`, `paid_at`).
Sem processar pagamento no MVP: baixa é manual.

---

## 6. Materiais

**Objetivo:** biblioteca do professor, reusável entre alunos.

Ordem dos elementos:

1. Cabeçalho "Materiais" + botão **Adicionar** (PDF, áudio ou link de vídeo).
2. Busca + filtro por tipo.
3. Lista/grade: título, tipo, tamanho, a quantos alunos está atribuído.
4. Detalhe do material: pré-visualização e **atribuir a aluno(s)**.
5. Indicador de cota de armazenamento do plano.

Dados: `materials` (`type`, `title`, `storage_path`/`external_url`, `size_bytes`),
`material_assignments`. Vídeo é link (sem anúncio dentro do app); PDF/áudio no storage.

---

## 7. Metrônomo (ferramenta, não item de menu)

**Objetivo:** matar a dor do YouTube com propaganda.

Ordem dos elementos:

1. BPM grande no centro + play/stop.
2. **Tap tempo**, compasso (ex.: 4/4) e acento no tempo 1.
3. Subdivisões (colcheias, tercinas, semicolcheias).
4. Funciona offline e com a tela bloqueada (Web Audio API).

Acesso: botão fixo sempre visível e embutido no registro de aula.

---

## 8. Configurações

Ordem dos elementos:

1. Conta: nome, e-mail, telefone, senha.
2. Organização: nome e, na fase 2, professores/papéis.
3. Pagamento: chave Pix usada nas cobranças.
4. Plano e uso: limite de alunos e de armazenamento.
5. Sair.

Dados: `members`, `organizations`.

---

## Área do aluno (outra superfície, acesso por telefone + PIN)

Depois do login (`student_login`), a ordem prioriza o dia do aluno:

1. Saudação + **tarefa atual** (última `lesson_note`: peça, BPM, tarefa).
2. **Próximas aulas**.
3. **Metrônomo**.
4. **Materiais** atribuídos.
5. **Linha do tempo** da evolução.

Somente leitura no MVP. Dados vêm de `student_home` e afins.

---

## Resumo da ordem de construção sugerida

1. Início (feito) → 2. Alunos (lista + cadastro com PIN) → 3. Registro de aula +
metrônomo → 4. Agenda → 5. Mensalidades → 6. Materiais → 7. Área do aluno →
8. Configurações.

Essa ordem entrega primeiro o núcleo das dores (registrar aula, onde parou,
metrônomo) antes das partes mais pesadas de agenda e cobrança.
