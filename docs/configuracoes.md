# Configurações — escola, identidade e plano

Tela `/configuracoes` do app do professor. Guarda os dados públicos da conta
(professor solo ou escola com um professor) e mostra o plano atual. A cobrança
do SaaS via Asaas ainda não processa pagamento: a sessão de faturas existe, mas
fica vazia até a integração. Escola com vários professores fica fora do MVP.

## O que a tela tem

1. **Logo** — imagem comprimida, usada no cabeçalho do recibo.
2. **Dados gerais** — seu nome (`members.display_name`), nome da escola
   (opcional), e-mail, telefone, site e endereço (CEP consulta o ViaCEP). Se o
   nome da escola estiver preenchido, ele entra nos recibos no lugar do nome do
   professor (`organizations.type` vira `school`).
3. **Plano e faturamento** — uso (alunos ativos e soma de `materials.size_bytes`),
   cards dos planos e lista das últimas faturas.

Sair continua no rodapé do menu, não nesta tela.

## Dados

Colunas novas em `organizations`: `email`, `phone`, `website`, endereço
estruturado (`zip_code`, `street`, `street_number`, `address_complement`,
`neighborhood`, `city`, `state`) e `logo_path`.

Arquivos no bucket privado `org-branding`, caminho `{organization_id}/logo.jpg`.
No MVP o dono é o único membro: envia, remove e lê. A logo segue o mesmo
tratamento da foto do aluno: JPEG 256×256 a 60% de qualidade.

O recibo em `/faturamento/[id]/recibo` usa nome, contato e logo quando existirem.

## Planos (cota e alunos ainda sem bloqueio)

Definidos em `src/lib/plans.ts`. O plano atual no MVP é sempre **Gratuito**.
Os botões de assinar ficam desabilitados até o Asaas. Um segundo plano pago
só entra se alguém bater no teto do Professor.

| Plano | Alunos ativos | Armazenamento | Por arquivo | Preço |
| --- | --- | --- | --- | --- |
| Gratuito | 5 | 50 MB | 10 MB | R$ 0 |
| Professor | 50 | 1 GB | 20 MB | R$ 29,90/mês ou R$ 299/ano |

Quando o Asaas entrar, esta tela passa a listar as faturas (`pending`, `paid`,
`overdue`, `canceled`) e o status da assinatura. Até lá a lista mostra o vazio
“Nenhuma fatura ainda”.
