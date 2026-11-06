# Detalhe do aluno — o board da aula

Guia de implementação da tela **`/alunos/[id]`** (dentro do menu 2, Alunos). A
régua é a mesma de [`docs/materiais.md`](materiais.md): uma superfície bonita,
intuitiva e feita para o fluxo real do professor.

Esta não é uma "ficha cadastral". É o **board que o professor abre durante a
aula**: ele vê onde parou, registra o que fez hoje, bate o metrônomo e alcança
os materiais do aluno — tudo na mesma tela, sem trocar de contexto.

Referência de estilo: a seção de Materiais (cards brancos, raios 2xl, azul
`#3B82F6` para ação, roxo `#8B5CF6` em detalhe, fundo `#F8FAFC`). Reaproveitar
os componentes já existentes (`TeacherShell`, `StudentAvatar`, `QuickMetronome`,
`EditEnrollmentButton`, `EndEnrollmentButton`).

---

## 1. O que a tela resolve

As três dores do produto (ver `PROJECT.md`) encontram aqui a mesma tela:

- **Lembrar onde parou** → bloco **"Onde paramos"** em destaque no topo, lendo a
  última observação (ex.: _"página 34 do método Bona, 80 BPM, compasso 12"_).
- **Metrônomo sem fricção** → metrônomo embutido no board, já com o BPM da
  última aula.
- **Acompanhar a evolução** → **prontuário / linha do tempo** com cada aula e o
  que foi trabalhado, do mais recente ao mais antigo.

E, de quebra, o **acesso rápido aos materiais** compartilhados com aquele aluno,
mais a matrícula, as mensalidades e o acesso (telefone + PIN) resumidos à
direita.

---

## 2. A tela (layout)

Tudo dentro do `TeacherShell`. Volta "← Alunos" no topo. Abaixo, cabeçalho do
aluno, o bloco "Onde paramos" e um board de duas colunas.

```
← Alunos
┌─────────────────────────────────────────────────────────────────────┐
│ (avatar) Nome do aluno            [ Registrar aula ] [WhatsApp] [Editar]│
│          instrumento · nível · telefone                                │
└─────────────────────────────────────────────────────────────────────┘
┌─ Onde paramos ────────────────────────────────────────────────────────┐
│ Peça/método · onde parou · BPM · tarefa de casa · há 3 dias            │
└─────────────────────────────────────────────────────────────────────┘
┌─ PRONTUÁRIO (coluna principal) ─────────┐  ┌─ RAIL (direita) ─────────┐
│ ● Qua, 04 nov · Feita                    │  │ Metrônomo                │
│   Bona, pág. 34 · 80 BPM                 │  │ Matrícula                │
│                                          │  │ Mensalidades             │
│ [ Materiais do aluno ] [ Acesso / PIN ]  │  │                          │
└──────────────────────────────────────────┘  └──────────────────────────┘
```

Materiais e acesso ficam **abaixo do prontuário**, lado a lado. Em telas
estreitas o rail desce depois desses cards. O "Onde paramos" nunca sai do topo.

---

## 3. Cabeçalho e ações

Avatar (`StudentAvatar`, tamanho `lg`, com foto assinada ou iniciais na cor do
cadastro), nome (apelido/`stage_name` quando houver), chips de **instrumento** e
**nível**, telefone e e-mail.

| Ação | Papel | O que faz |
| --- | --- | --- |
| **Registrar aula** | primário (`#3B82F6`) | Abre o compositor de aula/observação (seção 5) |
| **WhatsApp** | secundário | `wa.me/<telefone>` com mensagem pronta |
| **Editar** | secundário/ícone | Reabre o modal de cadastro do aluno (já existe) |

Em telas estreitas os três botões empilham, com **Registrar aula** em cima.

---

## 4. "Onde paramos" (hero)

Card de destaque logo abaixo do cabeçalho, com leve gradiente/realce (fundo
`#EFF6FF` ou faixa azul), lendo a **última `lesson_note`** do aluno:

- **Peça / método** (ex.: _"Método Bona"_)
- **Onde parou** (campo `measure`, usado como texto livre — ex.: _"pág. 34,
  compasso 12"_)
- **BPM** (chip tabular; alimenta o metrônomo do rail)
- **Tarefa de casa** (`homework`)
- Carimbo relativo: _"há 3 dias"_ / _"Qua, 29 out"_

Sem nenhum registro ainda: estado vazio convidando a **Registrar a primeira
aula**. Esse bloco é a resposta direta à dor "lembrar de onde parou".

---

## 5. Prontuário / linha do tempo

A coluna principal. É o **prontuário**: o histórico clínico da evolução do
aluno, cada aula virando uma entrada datada.

### 5.1 Compositor "Registrar aula / observação"

Botão **+ Registrar aula** (topo da coluna, ou o do cabeçalho) abre um painel
(modal via `createPortal`, no padrão dos modais de Materiais). Campos — poucos,
para digitar o mínimo:

| Campo | Fonte | Observação |
| --- | --- | --- |
| Data da aula | default hoje (America/Sao_Paulo) | permite registrar aula passada |
| Status | `lesson_status` | Feita (default), Falta, Reposição, Remarcada |
| Peça / método | `lesson_notes.piece` | **pré-preenchido** com a última peça |
| Onde parou | `lesson_notes.measure` | texto livre ("pág. 34 / compasso 12") |
| BPM | `lesson_notes.bpm` | **pré-preenchido** com o último BPM |
| Tarefa de casa | `lesson_notes.homework` | — |
| Observações | `lesson_notes.notes` | livre |

Pré-preencher peça/BPM com a última nota realiza a visão do `telas-e-menus.md`
§4: "o que começa já preenchido pela última aula, para só ajustar".

**Como grava:** uma observação está sempre atada a uma `lesson` (o schema exige
`lesson_notes.lesson_id`). A action resolve isto:

1. Se há uma `lesson` **daquele aluno no dia escolhido** (vinda da agenda),
   reutiliza: atualiza `status` e faz `upsert` do `lesson_note`.
2. Senão, cria uma `lesson` avulsa (`status` escolhido, `scheduled_at` = data,
   `enrollment_id` da matrícula ativa) e grava o `lesson_note`.

Assim "registrar aula" na agenda e "registrar observação" aqui alimentam a
mesma linha do tempo, sem duplicar.

### 5.2 A timeline

Lista vertical compacta com um trilho (bolinha de status + linha), do mais
recente ao mais antigo. Só entram aulas **até hoje** (America/Sao_Paulo); as
aulas futuras geradas pela agenda não aparecem. Cada item:

- **Data** relativa (Hoje / Ontem / `04 nov`) + **chip de status**
- **Peça · onde parou · BPM** (quando houver nota)
- **Tarefa de casa** em uma linha
- **Observações** (se houver)
- Materiais citados na aula (📎), quando o vínculo existir (ver §9, opcional)
- Menu `⋯`: **Editar** / **Excluir** a observação

Aulas sem nota (ex.: uma falta, ou uma aula ainda `scheduled` no passado)
aparecem como entrada só com data + status, para o histórico ficar honesto.

Cores dos status (consistentes com o resto do app):

| Status (`lesson_status`) | Rótulo | Cor |
| --- | --- | --- |
| `done` | Feita | verde `#10B981` / `#047857` |
| `missed` | Falta | vermelho `#EF4444` / `#B91C1C` |
| `scheduled` | Agendada | azul `#3B82F6` |
| `rescheduled` | Remarcada | âmbar `#F59E0B` / `#B45309` |
| `makeup` | Reposição | roxo `#8B5CF6` |

Paginação: 5 registros por página, começando pelos mais recentes. Query
`?pagina=2`. O bloco **Onde paramos** lê a última observação de verdade, não
a página atual.

---

## 6. Metrônomo

Topo do rail direito. Reutiliza **`QuickMetronome`** (já existe: Web Audio API,
tap tempo, acento no tempo 1, volume, offline) — o mesmo card escuro do Início.

Melhoria desejável: aceitar um **`initialBpm`** para abrir já no BPM da última
observação do aluno (o "Onde paramos"). É uma prop opcional; sem ela, mantém o
default atual (90). Assim o professor abre o aluno e já bate no andamento certo.

---

## 7. Materiais do aluno (acesso rápido)

Card abaixo do prontuário, reaproveitando dados de `material_assignments` +
`materials`:

- Lista os materiais **compartilhados com este aluno** (ícone do tipo + título;
  mesma paleta de Materiais: PDF vermelho, Word azul, Áudio roxo, Vídeo laranja).
- Cada item tem **Abrir** → reusa a action `openMaterial` (URL assinada de 10min
  para arquivo, ou `external_url` para vídeo).
- Botão **Compartilhar material**: abre o mesmo seletor de materiais/aluno. No
  MVP pode levar para `/materiais` com o aluno pré-selecionado, ou abrir um
  modal que chama `assignMaterial(materialId, [studentId])`.
- Vazio: "Nenhum material compartilhado ainda" + atalho para a biblioteca.

Isso evita que o professor saia do board para achar a escala ou o backing track
do aluno no meio da aula.

---

## 8. Matrícula, mensalidades e acesso

No rail direito, junto do metrônomo:

- **Matrícula**: tipo de cobrança (Mensalidade/Hora-aula), valor, dia de
  vencimento e horários fixos; botões **Editar matrícula** e **Encerrar
  matrícula**. Sem matrícula ativa: texto + atalho para matricular pela Agenda.
- **Mensalidades**: resumo da competência corrente (status + valor) e link para
  `/mensalidades` filtrado por este aluno.

Ao lado dos materiais, abaixo do prontuário:

- **Acesso do aluno**: telefone + PIN mascarado e botão **Enviar link/PIN por
  WhatsApp**. O PIN só é revelado via RPC `get_student_pin`.

---

## 9. Modelo de dados

Tudo já existe no schema — esta tela é, em sua maior parte, **leitura e escrita
sobre tabelas atuais**:

- `students` — cabeçalho, cor, foto (`photo_path` → URL assinada)
- `enrollments` + `schedule_rules` — matrícula e horários
- `lessons` (`status`: `scheduled|done|missed|rescheduled|makeup`,
  `scheduled_at`, `duration_minutes`, `enrollment_id`) — entradas da timeline
- `lesson_notes` (`piece`, `bpm`, `measure`, `homework`, `notes`,
  `lesson_id` **NOT NULL**) — o conteúdo de cada observação
- `material_assignments` + `materials` — materiais do aluno
- `charges` — mensalidades do aluno

**Nada obrigatório a criar para o MVP.** O campo `measure` já serve de "onde
parou" em texto livre (cabe "pág. 34 do método X").

Opcionais, se quisermos ir além (fora do MVP mínimo):

- `lesson_notes.method`/`book` + `page` estruturados, se "página do método"
  virar busca/relatório (hoje cabe em `measure`/`piece`).
- Tabela `lesson_note_materials` (nota ↔ material) para o 📎 na timeline amarrar
  um arquivo específico à aula. Sem ela, o 📎 fica fora do MVP e os materiais
  vivem só no card do rail (§7).

---

## 10. Server actions e rotas

Rota: `src/app/alunos/[id]/page.tsx` (já existe; hoje só cabeçalho + matrícula).
Carregar em paralelo: aluno, matrícula+regras, últimas ~20 `lessons` com
`lesson_notes`, materiais atribuídos e a cobrança corrente.

Actions em `src/app/alunos/[id]/actions.ts`:

- `getStudentBoard(studentId)` — monta tudo: cabeçalho, "onde paramos" (última
  nota), timeline, materiais atribuídos (com `signedPhotoUrls`/`openMaterial`),
  resumo de mensalidade.
- `saveLessonNote({ studentId, date, status, piece, measure, bpm, homework, notes, lessonId? })`
  — resolve/cria a `lesson` do dia (seção 5.1) e faz `upsert` do `lesson_note`.
- `deleteLessonNote(lessonNoteId)` / `updateLessonNote(...)` — editar/excluir no
  menu `⋯` da timeline.

Reaproveitar: `openMaterial`, `assignMaterial` (de `materiais/actions.ts`),
`signedPhotoUrl(s)` (de `alunos/actions.ts`), `saoPauloNow`/`WEEKDAY_LONG` (de
`lib/schedule.ts`), `QuickMetronome` (`components/teacher`).

Tudo com RLS por organização via `getTeacherContext()`, no padrão das demais
telas. `revalidatePath("/alunos/[id]", "page")` após escrever.

---

## 11. Ordem de construção sugerida

1. `getStudentBoard` + layout do board (cabeçalho, "onde paramos", rail estático
   com matrícula que já existe).
2. Metrônomo no rail (prop `initialBpm`).
3. Timeline de leitura (lessons + lesson_notes) com chips de status.
4. Compositor **Registrar aula/observação** + `saveLessonNote` (resolve/cria
   lesson). Isto também passa a alimentar o "Onde paramos" do Início.
5. Card de materiais do aluno (abrir + compartilhar).
6. Mensalidade e acesso (PIN) no rail.

Entrega primeiro o núcleo das dores (onde parou, registrar, metrônomo) antes dos
cartões de apoio.

---

## 12. Fora do MVP

- Edição pelo aluno (continua só leitura na área dele).
- Gráfico de evolução de BPM/presença ao longo do tempo.
- Anexar material específico a uma observação (depende de `lesson_note_materials`).
- Gravar áudio da aula / anotações por voz.
- Exportar o prontuário do aluno em PDF.
