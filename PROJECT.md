# SaaS para professores de música: plano de criação

Oct 16, 2026 · @Samir

## Visão geral

O produto é um app web e mobile (PWA) para professores de música controlarem alunos, agenda, mensalidades e progresso. Quem paga a plataforma é o professor; o aluno acessa de graça e só visualiza.

- **Usuário principal do MVP:** professor solo, ou escola com **um** professor. Uma conta, uma agenda, os próprios alunos.
- **Aluno:** área de acesso por telefone + PIN de 4 dígitos, sem conta/senha tradicional, com agenda, tarefa atual, materiais, linha do tempo e metrônomo.
- **Fora do MVP:** escola com vários professores, papéis e vínculo professor–aluno. Isso entra só depois, se o núcleo solo se provar.

## Dores que motivam o produto

O produto nasce de dores reais sentidas em aulas de bateria, não de pesquisa teórica. O foco é **ajudar o professor**; o aluno ganha pela praticidade.

- **Metrônomo sem fricção:** hoje o professor abre o YouTube para ter um metrônomo, e o vídeo vem com propaganda que atrapalha a aula. O app traz um metrônomo embutido, sem anúncios e sem depender de rede.
- **Lembrar de onde parou:** é difícil recordar o que foi trabalhado na última aula (peça, BPM, compasso, exercício). O registro de aula resolve isso e já deixa a próxima aula pronta para começar.
- **Acompanhar a evolução do aluno:** fica difícil enxergar o progresso ao longo do tempo. A linha do tempo e o histórico por aluno tornam a evolução visível.

## Ajustes na ideia original

Cinco pontos mudam o plano em relação ao rascunho inicial.

### 1. Acesso do aluno por telefone + PIN de 4 dígitos

O aluno entra na área dele com o **número de telefone** e um **PIN de 4 dígitos**. O PIN é gerado automaticamente no cadastro do aluno, mas o professor pode digitá-lo na hora do cadastro e alterá-lo facilmente na edição quando precisar (aluno esqueceu, quer um número mais fácil, etc.).

Isso troca o modelo "identificador secreto" (CPF ou link único) por "identificador público (telefone) + segredo curto (PIN)", que é o mesmo princípio de um login comum. O CPF sai do cadastro: não é segredo, aparece em notas e vazamentos, e guardá-lo traz obrigações extras de LGPD, ainda mais com alunos menores.

Ponto de atenção: um PIN de 4 dígitos tem só 10.000 combinações e o telefone não é segredo. Sem proteção, dá para tentar todos os PINs. Então o acesso precisa de **limite de tentativas por telefone/IP e bloqueio temporário** após poucas falhas. Depois do primeiro acesso, guarde uma **sessão no dispositivo** (cookie/token longo) para o aluno não digitar o PIN toda vez — isso devolve a praticidade do link antigo sem abrir mão do segredo. Como o professor precisa visualizar e editar o PIN, ele não pode ser um hash de mão única: trate-o como dado sensível e guarde cifrado.

### 2. Aluno só visualiza no MVP, e o professor registra o progresso

Guardar "parei no compasso 12, 80 bpm" custa quase nada, é texto no banco. O que custa de verdade é armazenamento e tráfego de arquivos (PDF e mp3) e o envio de mensagens. O motivo para o aluno só visualizar é escopo: escrita do aluno traz tela, validação, histórico e suporte.

A solução é o professor registrar na aula a peça, o BPM, onde parou e a tarefa de casa. O aluno vê isso na linha do tempo. Os dados já nascem prontos para, no futuro, o aluno criar registros próprios, como recurso de plano pago ou com limite.

### 3. Metrônomo roda no navegador, sem custo de servidor

Usa a Web Audio API. Para a precisão, agende os cliques com antecedência sobre o `AudioContext` em vez de usar `setInterval`. No iOS o áudio só é liberado após um toque do usuário. Teste com a tela bloqueando e com o app em segundo plano, que é onde a maioria dos metrônomos web falha.

### 4. Cobrança no MVP é só controle, sem processar pagamento

O app registra vencimento, status (pendente, pago, atrasado) e baixa manual pelo professor. Para lembrar o aluno:

- **WhatsApp:** botão que abre `wa.me/<telefone>?text=<mensagem pronta>`. O professor só toca em enviar. É grátis e dispensa a API oficial, que cobra por mensagem e exige aprovação.
- **E-mail:** provedor transacional (Resend ou SES), com custo quase nulo no volume inicial.
- **Pix:** a mensagem já leva a chave Pix do professor. Isso cobre o item "dados bancários" sem guardar conta e agência.

Cobrança automática via Pix (Asaas, Mercado Pago e similares) fica para a fase 3.

### 5. Organização com um único professor

Modele desde o início uma `Organização`, mesmo no solo: o professor (ou a escola de um professor) é uma organização com um único membro. O tipo `solo` ou `school` só muda o nome, a logo e o contato nos recibos — não abre equipe. Escola com vários professores fica de fora do MVP de propósito: papéis, convites e vínculo professor–aluno aumentam o produto sem ajudar a validar a aula.

## Plano por fases

O caminho tem quatro etapas: validar antes de programar, lançar um MVP enxuto para professor/escola solo, cobrar a plataforma via Asaas e só então, se fizer sentido, abrir para escolas com vários professores.

### Fase 0: validação (enxuta, pela própria experiência)

A validação parte da vivência do fundador, que faz e dá aulas de bateria e sente as dores na prática. Não haverá rodada formal de entrevistas agora.

1. Registre as dores reais observadas (ver "Dores que motivam o produto") e use-as como critério do que entra no MVP.
2. Olhe de leve os concorrentes (Music Teacher's Helper, Teachworks) só para não repetir erro conhecido. O diferencial para o Brasil segue sendo Pix, WhatsApp e preço em reais.
3. **Meta de saída:** usar o MVP nas próprias aulas e depois colocá-lo na mão de 2–3 professores conhecidos para confirmar valor antes de investir na fase 2.

### Fase 1: MVP (6 a 8 semanas)

1. Conta do professor, cadastro básico e login.
2. Cadastro do aluno: nome, nome artístico opcional, e-mail, telefone (obrigatório, usado no acesso), PIN de 4 dígitos (gerado automaticamente e editável pelo professor), endereço opcional e responsável quando for menor.
3. Matrícula: início, dias e horários, valor por aula ou mensal, dia de vencimento.
4. Agenda semanal gerada a partir da recorrência, com exceções: falta, remarcação e reposição. Isso pesa no dia a dia do professor.
5. Registro da aula: o que foi feito, BPM, tarefa e observações. Alimenta a linha do tempo.
6. Materiais: upload de PDF e mp3 com limite de tamanho e cota por plano, mais links de vídeo. Biblioteca do professor, atribuída por aluno.
7. Controle de mensalidades com baixa manual e botão de WhatsApp pronto.
8. Área do aluno por telefone + PIN de 4 dígitos: agenda, tarefa atual, materiais, linha do tempo e metrônomo.

### Fase 2: crescimento (ainda no solo)

- E-mail automático de vencimento.
- Relatórios simples: frequência, inadimplência e evolução do aluno.
- Avaliação do aluno por competência e metas.
- Escola com vários professores **não entra aqui**. Só depois do MVP solo estar validado.

### Fase 3: monetização avançada

- Cobrança automática via Pix.
- Aluno registrando o próprio estudo, como recurso de plano pago.
- Notificações push e app nativo, se o PWA não bastar.

## Stack sugerida

Para web e mobile com um desenvolvedor só, o caminho mais curto é um PWA: um código só, instalável no celular.

| Camada | Escolha | Motivo |
| --- | --- | --- |
| App | PWA com Next.js | Um código para web e mobile |
| Banco | Postgres | Dados relacionais e isolamento por organização |
| Auth, banco e arquivos | Supabase | Autenticação, RLS por organização e storage prontos |
| Arquivos pesados | Cloudflare R2 | Não cobra tráfego de saída |
| E-mail | Resend ou SES | Custo quase nulo no volume inicial |

App nativo só entra quando houver tração. Se você já tem uma stack de preferência, o desenho se adapta.

## Modelo de dados

Tudo pertence a uma `Organization`. No MVP ela tem um único membro: o professor dono.

| Entidade | Para que serve | Liga com |
| --- | --- | --- |
| `Organization` | Conta do professor ou da escola solo | Raiz de tudo |
| `Member` | O professor dono (um por organização no MVP) | `Organization` |
| `Student` | Cadastro do aluno, inclui telefone e PIN de acesso | `Organization`, `StudentAccess` |
| `StudentAccess` | PIN de 4 dígitos (cifrado), sessões e controle de tentativas do aluno | `Student` |
| `Enrollment` | Plano, valores e dia de vencimento | `Student` |
| `ScheduleRule` | Recorrência semanal das aulas | `Enrollment` |
| `Lesson` | Cada aula, com status (feita, falta, remarcada) | `ScheduleRule` |
| `LessonNote` | Registro da aula: peça, BPM, tarefa | `Lesson` |
| `Material` | PDF, mp3 ou link de vídeo | `Organization` |
| `MaterialAssignment` | Material atribuído a um aluno | `Material`, `Student` |
| `Charge` | Mensalidade com competência, vencimento e status | `Enrollment` |

## Preço

O aluno é sempre gratuito. Quem paga é o professor (ou a escola solo), via Asaas.

| Plano | Alunos ativos | Armazenamento | Por arquivo | Preço |
| --- | --- | --- | --- | --- |
| Gratuito | 5 | 50 MB | 10 MB | R$ 0 |
| Professor | 50 | 1 GB | 20 MB | R$ 29,90/mês ou R$ 299/ano |

Dois planos no lançamento. Um segundo plano pago só entra se alguém bater no teto
do Professor. Os limites de aluno e cota ainda não bloqueiam o uso; o tamanho
por arquivo já segue o plano atual.

## Riscos e próximos passos

- **LGPD e menores:** guarde só o necessário e registre o consentimento do responsável.
- **Segurança do PIN:** PIN de 4 dígitos + telefone público pede limite de tentativas, bloqueio temporário e sessão após o 1º acesso. Guarde o PIN cifrado (o professor precisa visualizar/editar), nunca em texto puro.
- **Telefone compartilhado:** pais podem usar o mesmo número para vários filhos. Trate o par telefone+PIN como chave e, se um telefone tiver mais de um aluno, use o PIN para desambiguar no login.
- **Retenção:** professor solo tem pouco volume e troca de ferramenta fácil. O que prende é ter o histórico dos alunos dentro do app.
- **Escopo:** agenda com remarcação já é um produto por si. Não some funcionalidades antes de terminar a fase 0.

Próximos passos possíveis: desenhar o schema do banco (incluindo telefone + PIN e controle de tentativas) ou detalhar os fluxos de cadastro/acesso do MVP.
