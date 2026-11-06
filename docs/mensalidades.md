# Mensalidades — especificação da seção

Guia de implementação da tela **Mensalidades** (menu 4) e de como as cobranças
(`charges`) nascem, mudam de status e são quitadas. A régua é a mesma do resto
do produto: simples, que o professor resolva em um toque.

Escopo do MVP: **só controle** (quem deve, quanto, quando vence, baixa manual e
recibo). Nada de processar pagamento.

---

## 1. Como a cobrança nasce

### Pergunta de design

> No dia do vencimento um trigger cria a mensalidade, ou 15 dias antes com
> status "a vencer"?

**Nenhuma das duas.** Criar só no vencimento esconde o que está por vir; "15
dias antes" é um recorte arbitrário que atravessa dois meses de competência. A
regra escolhida é mais previsível:

> A cobrança de um mês (competência) é criada **no começo da própria
> competência**, já com status `pending` (que a UI mostra como **A vencer**).
> Assim, ao abrir Mensalidades no mês corrente, todas as mensalidades do mês já
> existem — vençam no dia 5 ou no dia 28.

O status `pending` cobre tanto "a vencer" quanto "vence hoje"; vira **Atrasado**
quando passa do vencimento sem baixa (ver seção 3).

### Mecanismo: geração idempotente, dois gatilhos para a mesma função

O coração é uma função **idempotente** que garante as cobranças de uma
competência. A `UNIQUE (enrollment_id, competence)` já existente faz o
`insert ... on conflict do nothing` ser seguro para rodar quantas vezes
quiser.

```
ensure_month_charges(p_organization_id uuid, p_competence date)
-- competência = 1º dia do mês; só gera para a organização do professor
```

Ela é chamada de dois lugares:

1. **Lazy, ao abrir a tela (padrão do MVP, sem depender de cron):** quando a
   página carrega o mês corrente ou um mês passado, o servidor chama
   `ensure_month_charges` para aquele mês antes de listar. Meses futuros não
   são gerados só porque o professor navegou até eles — o valor ficaria
   congelado cedo demais. Garante que a lista do mês atual nunca esteja vazia
   por falta de geração, mesmo sem agendador.
2. **Agendado (recomendado, quando habilitarmos `pg_cron`):** um job diário
   chama `ensure_month_charges(date_trunc('month', now()))` e marca atrasados
   (seção 3). Mantém o resumo do **Início** correto mesmo que o professor não
   abra Mensalidades. Enquanto o cron não existir, o passo 1 cobre o uso real.

> Decisão: começar **só com o passo 1** (lazy). Habilitar `pg_cron` é um
> incremento isolado que não muda a UI nem a função.

### Quais matrículas geram cobrança

`ensure_month_charges` percorre `enrollments` e cria uma `charge` por matrícula
que satisfaça **todas**:

- `billing_type = 'monthly'` (hora/aula e **aula avulsa** não geram
  mensalidade);
- `active = true`;
- `due_day` preenchido (1–31);
- a competência é **>=** ao mês de `start_date`;
- a matrícula ainda valia na competência: `end_date` nulo **ou**
  `date_trunc('month', end_date) >= p_competence`.

Campos gravados na criação:

| Campo         | Valor                                                                 |
| ------------- | --------------------------------------------------------------------- |
| `competence`  | 1º dia do mês (`date_trunc('month', ...)`)                            |
| `due_date`    | competência com dia = `min(due_day, último dia do mês)` (ex.: 31→fev) |
| `amount`      | **snapshot** do `enrollments.amount` no momento da geração            |
| `status`      | `pending`                                                             |

`amount` é cópia, não referência: mudar o valor da matrícula depois não reescreve
mensalidades já geradas (histórico financeiro estável). Para refletir num mês já
gerado, o professor edita a cobrança (fase 2) ou dá baixa com `paid_amount`
diferente.

---

## 2. O que NÃO dispara geração

- **Hora/aula (`per_lesson`)**: o pagamento é acompanhado aula a aula; não há
  competência mensal fixa. No MVP essas matrículas não aparecem em
  Mensalidades (ou aparecem só como informação; ver "Fora do MVP").
- **Aula avulsa**: entra como aula/pagamento pontual, nunca como mensalidade
  recorrente.

---

## 3. Ciclo de status

```
pending ──(baixa manual)──► paid
   │
   └──(due_date < hoje e sem baixa)──► overdue
```

- **pending** → exibido como **A vencer** (ou "Vence hoje" quando
  `due_date = hoje`).
- **overdue** → **Atrasado**.
- **paid** → **Pago**.

**Como o "atrasado" acontece, sem depender de cron:** a lista deriva o rótulo na
leitura — se `status = 'pending'` e `due_date < hoje`, mostra **Atrasado**. O
valor `overdue` no banco continua existindo para quando o cron passar a gravá-lo
de fato; a UI trata `pending`-vencido e `overdue` do mesmo jeito. Assim o
comportamento é correto já no MVP e o cron vira só otimização.

Baixa é reversível: **estornar** volta para `pending` e limpa `paid_at`,
`paid_amount`, `method`.

---

## 4. A tela

Datatable simples, **filtro padrão no mês atual**.

### 4.1 Cabeçalho + resumo

Três números da competência filtrada:

1. **Em aberto** — soma de `amount` de `pending` + `overdue`.
2. **Vencendo** — `pending` com `due_date` nos próximos 7 dias.
3. **Recebido no mês** — soma de `paid_amount` (ou `amount`) de `paid`.

### 4.2 Barra e botão de filtros

A tela abre no mês corrente, todos os alunos, todos os status. O botão
**Filtros** abre um popover/modal com:

| Filtro      | Default         | Opções                                            |
| ----------- | --------------- | ------------------------------------------------- |
| Período     | **Mês corrente**| Grade de meses; no máximo 2 meses à frente        |
| Aluno       | **Todos**       | Busca ajax de aluno (igual à da matrícula)        |
| Status      | **Todos**       | A vencer, Atrasado, Pago                           |

O filtro de aluno reusa a busca por nome/telefone/CPF já feita na matrícula
(nada de dropdown com a lista inteira). O período usa uma grade de meses no
visual da Nottari, com no máximo **2 meses à frente** do mês corrente (e até
24 meses para trás). A seta da listagem e a URL também respeitam esse teto.
Meses futuros nessa janela **não geram** cobrança no banco — só o mês atual
e os passados.

### 4.3 Colunas

| Coluna      | Conteúdo                                              |
| ----------- | ---------------------------------------------------- |
| Aluno       | foto/inicial + nome (link para a ficha)              |
| Competência | mês/ano (ex.: "nov/2026")                            |
| Vencimento  | `due_date` formatado                                 |
| Valor       | `amount` em BRL                                      |
| Status      | badge: A vencer / Atrasado / Pago                    |
| Ações       | menu por linha (abaixo)                              |

Em telas pequenas a tabela colapsa em **cards** (mesmo padrão de Alunos), com os
mesmos dados e ações.

### 4.4 Ações por linha

1. **Marcar como pago** — abre modal com: data do pagamento (default hoje),
   valor recebido (default `amount`), método (Pix, dinheiro, cartão, outro) e
   observação. Grava `status='paid'`, `paid_at`, `paid_amount`, `method`,
   `notes`.
2. **Emitir recibo (PDF)** — habilitado só para `paid` (ver seção 6).
3. **Cobrar no WhatsApp** — mensagem pronta com nome, competência, valor,
   vencimento e a chave Pix do professor (vem de Configurações; enquanto não
   existir, usar o telefone e um texto sem Pix).
4. **Estornar** — só para `paid`, volta a `pending`.

### 4.5 Relatório do mês (PDF)

Botão **Imprimir PDF** ao lado de Filtros. Abre
`/mensalidades/relatorio` com o mesmo período (e os filtros atuais) em layout
A4 para **Imprimir → Salvar como PDF**.

O relatório é o controle do professor, não um recibo:

1. Cabeçalho: organização, professor, competência e data de emissão.
2. Resumo: em aberto, vencendo e recebido.
3. Lista **Em aberto**: aluno, telefone, vencimento, valor e status.
4. Lista **Pagos**: aluno, valor, data/forma e status.

---

## 5. Camada de dados e ações

### RPC (SQL, `SECURITY DEFINER`, escopo por `private.is_org_member`)

- `ensure_month_charges(p_organization_id uuid, p_competence date)` — insere as
  cobranças que faltam da competência (ver seção 1), só se o caller for membro da
  organização. Idempotente via `on conflict (enrollment_id, competence) do nothing`.
- (Opcional, com cron) `mark_overdue_charges()` — `update charges set
  status='overdue' where status='pending' and due_date < current_date`.

### Server actions (Next, em `src/app/mensalidades/actions.ts`)

- `listCharges({ competfrom, competo, studentId, status })` — SELECT com join em
  `enrollments → students`, ordenado por `due_date`. Chama
  `ensure_month_charges` para a competência corrente antes de ler.
- `markChargePaid(chargeId, { paidAt, paidAmount, method, notes })`.
- `undoChargePayment(chargeId)`.

Validar tudo no servidor; nunca confiar no cliente. RLS `charges_all` já isola
por organização, mas as actions também filtram por `organization_id`.

### Página

- `src/app/mensalidades/page.tsx` — server component, lê filtros de
  `searchParams` (`?competencia=YYYY-MM&aluno=&status=`), monta resumo + tabela.
- `src/components/teacher/charges-table.tsx` — client, tabela/cards, popover de
  filtros, modais de baixa e estorno.

---

## 6. Recibo em PDF

MVP sem dependência nova de PDF:

- Rota de impressão `src/app/mensalidades/[chargeId]/recibo/page.tsx` com layout
  A4 limpo e `@media print`. O professor usa **Imprimir → Salvar como PDF** do
  navegador. Só abre para cobranças `paid`.
- Conteúdo: organização/professor, aluno, nº do recibo (ex.: `competence` +
  curto do id), competência, valor pago, data e método de pagamento, e uma
  linha de "referente a mensalidade de <mês>".
- Fase 2 (se virar requisito forte): gerar o PDF no servidor para anexar no
  WhatsApp/e-mail.

---

## 7. Migrações necessárias

O schema de `charges` já tem o essencial (colunas, enum `charge_status`,
`UNIQUE (enrollment_id, competence)`, RLS por organização). Falta só:

1. `create function public.ensure_month_charges(uuid, date)` (e, opcional,
   `mark_overdue_charges`).
2. (Opcional) habilitar `pg_cron` e agendar o job diário.

Nenhuma alteração de coluna é necessária para o MVP.

---

## 8. Fora do MVP (anotado para não esquecer)

- Cobrança de **hora/aula** por aulas realizadas no mês.
- Edição de valor/vencimento de uma cobrança já gerada.
- Juros/multa por atraso.
- Pix automático (cobrança e conciliação) e notificação.
