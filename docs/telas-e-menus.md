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
| 2 | **Alunos** | O horário só existe se o aluno já estiver cadastrado | feito (lista, cadastro e board) |
| 3 | **Agenda** | Semana com horários livres e ocupados | feito |
| 4 | **Faturamento** | Controle financeiro, uso semanal/mensal | feito |
| 5 | **Materiais** | Biblioteca; consultado com menos frequência | feito |
| 6 | **Configurações** | Conta, plano, dados da organização | feito |

A ordem atual do menu já segue isso. Dois ajustes recomendados:

- **Metrônomo** não entra como item de menu de navegação. Ele é usado no meio da
  aula, então fica como **ação rápida sempre visível** (botão fixo no topo/rodapé)
  e embutido dentro da tela da aula. Uma rota própria `/metronomo` é opcional.
- No celular, o menu vira um botão no canto esquerdo. Ele abre o mesmo painel
  lateral como gaveta, com um botão para fechar.

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

**Objetivo:** em 3 segundos o professor sabe como está o mês.

Ordem dos elementos:

1. Saudação "Olá, {primeiro nome}!" + nome da organização.
2. Números do **mês corrente**: aulas, concluídas, faltas e mensalidades em
   aberto (só a competência atual, não o histórico de meses anteriores).
3. **Próximas aulas** (lista): aluno, horário, peça/assunto da última aula, status.
4. (fase 2) Atalhos: "Registrar aula de agora", "Cobrar em atraso".

Dados: `lessons` do mês, `lesson_notes` (última peça), `charges` da competência
corrente em aberto. Estado vazio: convidar a cadastrar o primeiro aluno.

---

## 2. Agenda

**Objetivo:** ver a semana inteira e saber, de relance, o que está ocupado e o
que ainda dá para oferecer.

A grade vai de **06:00 às 00:00**, em blocos de 30 minutos, com os horários na
coluna da esquerda e os dias de segunda a domingo. Um bloco azul é um horário
fixo (`schedule_rules`). O restante é horário disponível.

Para ocupar um horário, o aluno **já precisa existir** em Alunos. O botão
**Matricular** (ou um clique na célula livre) busca o aluno por nome, telefone
ou CPF (sem carregar a lista inteira) e define o dia, a duração, o
horário, o valor (hora/aula ou mensalidade), o dia do pagamento e detalhes.
Marcar **aula avulsa** agenda só aquela data, some a mensalidade e fica o
valor da hora/aula. Um dia que já passou
nesta semana marca a primeira aula na próxima e o horário já aparece na coluna desse dia. Isso cria a matrícula, a regra
semanal e as próximas 8 aulas. Um clique no horário ocupado abre a ficha do
aluno. Editar e encerrar a matrícula ficam nessa ficha.

Estado vazio: sem alunos, a agenda pede o cadastro antes de reservar.

---

## 3. Alunos

### 3a. Lista de alunos

Cards paginados, 20 por página, com busca por nome, CPF, telefone ou e-mail.
Cada card mostra foto (ou iniciais), nome, CPF, instrumento, nível, próxima aula,
mensalidade, telefone, e-mail, WhatsApp e ações. **Editar** abre o modal de
cadastro sobre a página. **Excluir** pede confirmação num modal antes de
remover o aluno, os horários e as aulas.

### 3b. Cadastro do aluno

Modal. Obrigatórios: nome e telefone. Opcionais: foto, cor do card, e-mail, CPF,
instrumento, nível (iniciante, intermediário ou avançado) e endereço. A cor
padrão é o azul da marca; o professor pode escolher outra. A foto é comprimida
para no máximo 256×256 e 60% de qualidade (JPEG) antes de ir ao Storage. O
instrumento sai de
uma lista e também pode ser digitado.
O mesmo CPF pode aparecer em mais de um cadastro, para o aluno estudar outro
instrumento. O PIN de 4 dígitos já vem preenchido e pode ser alterado antes de
salvar; se o telefone for o mesmo de outro cadastro, o PIN precisa ser outro.
No endereço, o CEP consulta o ViaCEP e preenche logradouro, bairro, cidade e UF.

Dados: `students` (CPF e endereço estruturado) e PIN via `create_student`.

### 3c. Detalhe do aluno — o board da aula

A tela mais importante do produto. Não é uma ficha cadastral: é o **board que o
professor abre durante a aula**. Ordem:

1. Cabeçalho: nome + ações (**Registrar aula**, **WhatsApp**, editar).
2. **Onde paramos** em destaque no topo: última `lesson_note` (peça/método, onde
   parou, BPM, tarefa) — resolve a dor de lembrar a aula anterior.
3. **Prontuário / linha do tempo**: cada aula vira uma entrada datada, com
   compositor de observação que pré-preenche peça/BPM da última aula.
4. **Metrônomo** embutido (reusa `QuickMetronome`), já no BPM da última aula.
5. **Materiais do aluno**: acesso rápido aos compartilhados (abrir/compartilhar).
6. **Matrícula** resumida (editar/encerrar), **mensalidades** e **acesso**
   (telefone + PIN).

Dados: `lessons`, `lesson_notes`, `enrollments`/`schedule_rules`,
`material_assignments`/`materials`, `charges`. Tudo sobre o schema atual.

Especificação completa (layout, prontuário, actions) em
[`docs/aluno.md`](aluno.md).

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

## 5. Faturamento

**Objetivo:** ver quem deve e cobrar em um toque.

Datatable com o **mês corrente** por padrão. Ordem dos elementos:

1. Cabeçalho + resumo: **em aberto**, **vencendo**, **recebido no mês**.
2. Botão **Filtros**: período (default mês corrente), aluno (busca ajax,
   default todos) e status (default todos). Botão **Imprimir PDF** do mês
   (resumo + em aberto + pagos).
3. Lista: aluno, referência (mensalidade ou aula), vencimento, valor, status.
4. Ações por linha: **marcar como pago**, **emitir recibo em PDF**, **cobrar no
   WhatsApp** e **estornar**.

A cobrança do mês nasce no começo da competência (mensalidade, hora/aula e
avulsa) com status **A vencer** e vira **Atrasado** depois do vencimento sem
baixa. Dados: `charges` (`competence`, `due_date`, `amount`, `status`,
`paid_at`). Sem processar pagamento no MVP: baixa é manual.

Especificação completa (geração, status, ações, recibo, migrações) em
[`docs/mensalidades.md`](mensalidades.md).

---

## 6. Materiais

**Objetivo:** biblioteca do professor, reusável entre alunos.

Mock de referência: `Materiais-html/Materiais.dc.html`.

Ordem dos elementos:

1. Cabeçalho **Sua biblioteca** + **Nova pasta**, **Adicionar link** e
   **Enviar arquivo**.
2. Coluna esquerda: árvore de pastas (com subpastas e contagem de arquivos) e
   filtro por tipo (PDF, Word, Áudio/MP3, Vídeos/links).
3. Área principal: breadcrumb, busca, grade/lista; **pastas em cards** e
   **arquivos em lista** (tipo colorido, tamanho ou domínio do vídeo, avatares
   de quem tem acesso, data).
4. Faixa para arrastar PDF, Word e MP3. Vídeo só por link.
5. Compartilhar escolhe alunos reais (busca ajax); a área do aluno só vê o que
   foi atribuído.

Dados: `material_folders`, `materials`, `material_assignments`. Vídeo é URL;
PDF/Word/MP3 no bucket privado `materials`.

Especificação completa (árvore, tipos, compartilhamento, migrações) em
[`docs/materiais.md`](materiais.md).

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

Rota `/configuracoes`. Ordem dos elementos:

1. **Logo** (recibos).
2. **Dados gerais:** seu nome, nome da escola (opcional; se preenchido, entra nos documentos), e-mail, telefone, site e endereço (CEP via ViaCEP).
3. **Plano e faturamento:** uso atual (alunos e armazenamento), cards dos planos e últimas faturas do Asaas.

Planos do MVP (cota e alunos ainda não bloqueiam; cobrança Asaas na próxima etapa):

| Plano | Alunos ativos | Armazenamento | Por arquivo | Preço |
| --- | --- | --- | --- | --- |
| Gratuito | 5 | 50 MB | 10 MB | R$ 0 |
| Professor | 50 | 1 GB | 20 MB | R$ 29,90/mês ou R$ 299/ano |

Dados: `organizations` (incluindo `logo_path`). Bucket privado `org-branding`. Sair continua no rodapé do menu.

Especificação em [`docs/configuracoes.md`](configuracoes.md).

---

## Área do aluno (outra superfície, acesso por telefone + PIN)

Rota `/area`. Login em `/` na aba **Aluno** (`student_login`, cookie httpOnly).
Somente leitura no MVP. É o board do professor, resumido:

1. Saudação + **tarefa atual** (última `lesson_note`: peça, BPM, tarefa).
2. **Aulas do mês corrente** (exceto remarcadas), no fuso America/Sao_Paulo.
3. **Materiais** atribuídos (abrir arquivo/link).
4. **Metrônomo** no BPM da última aula.

Dados: `student_home` e `student_open_material`. Sem prontuário editável, matrícula ou cobrança.

---

## Resumo da ordem de construção sugerida

1. Início (feito) → 2. Alunos (lista + cadastro + board da aula) → 3. Registro
de aula + metrônomo (no board do aluno) → 4. Agenda → 5. Faturamento (feito) →
6. Materiais (feito) → 7. Área do aluno (feito) → 8. Configurações (feito).

Essa ordem entrega primeiro o núcleo das dores (registrar aula, onde parou,
metrônomo) antes das partes mais pesadas de agenda e cobrança.
