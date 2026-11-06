# Materiais — especificação da seção

Guia de implementação da tela **Materiais** (menu 5), alinhado ao mock
`Materiais-html/Materiais.dc.html`. A régua é a mesma do resto do produto:
biblioteca do professor, reusável, atribuída por aluno em um toque.

Escopo do MVP: pastas (com subpastas), upload de **PDF / Word / MP3**, **link
de vídeo** (sem hospedar o arquivo), busca, grade/lista, arrastar arquivos e
compartilhar com alunos reais da organização.

Referência visual: [`Materiais-html/`](../Materiais-html/). Não copiar o HTML;
replicar cores, raios, ícones e hierarquia nos componentes já usados no app.

---

## 1. O que a tela resolve

O professor guarda o material uma vez (escala em PDF, exercício em Word,
backing track em MP3, aula no YouTube) e escolhe **quem vê**. O aluno só
enxerga o que foi compartilhado com ele, na área do aluno.

Vídeo **nunca** entra como arquivo: só URL. Assim o app não serve anúncio
embutido nem paga tráfego de vídeo.

---

## 2. A tela (layout)

Duas colunas abaixo do cabeçalho, dentro do `TeacherShell`.

```
[ Sua biblioteca ]     [ Nova pasta ] [ Adicionar link ] [ Enviar arquivo ]
┌──────────────┐  ┌─────────────────────────────────────────────────────┐
│ PASTAS       │  │ Todos os materiais          [buscar]  [grade|lista] │
│ árvore       │  │ Pastas · N   (cards)                                │
│ TIPOS        │  │ Arquivos · N (lista)                                │
│ PDF Word …   │  │ Arraste arquivos para cá                            │
└──────────────┘  └─────────────────────────────────────────────────────┘
```

Em telas estreitas a árvore vira um seletor/accordion acima da área principal.
Os três botões do topo empilham: **Enviar arquivo** (primário azul) em cima,
depois **Nova pasta** e **Adicionar link**.

---

## 3. Cabeçalho e ações globais

Título: **Sua biblioteca**. Subtítulo: “Organize o que você disponibiliza para
os alunos.”

| Botão            | Papel                         | O que faz                                      |
| ---------------- | ----------------------------- | ---------------------------------------------- |
| Nova pasta       | secundário                    | Modal: nome + cor. Cria na pasta atual         |
| Adicionar link   | secundário                    | Modal: URL + título. Tipo `video_link`         |
| Enviar arquivo   | primário (`#3B82F6`)          | File picker; PDF, Word ou MP3 na pasta atual   |

A pasta atual é a selecionada na árvore (ou a raiz, se “Todos os materiais”).

---

## 4. Árvore à esquerda

### 4.1 Pastas

Item fixo no topo: **Todos os materiais**, com a contagem total de arquivos da
organização. Selecionado: fundo `#EFF6FF`, texto `#1D4ED8`.

Abaixo, a árvore real. Exemplo do mock: **Violão** (5) com subpastas
**Iniciante** (3) e **Acordes** (2); **Piano** (3); **Teoria musical** (3).

- Ícone de pasta colorido (a cor é da pasta, gravada no banco).
- Pastas com filhos mostram chevron para abrir/fechar.
- Subpastas indentadas (~32px).
- A contagem de cada pasta é **arquivos nela + nas descendentes**.
- Clique seleciona a pasta e filtra a área principal.

### 4.2 Filtro por tipo

Bloco **TIPOS**, independente da pasta (combinam: pasta atual ∩ tipo).

| Tipo na UI        | Enum no banco   | Cor do chip / ícone      |
| ----------------- | --------------- | ------------------------ |
| PDF               | `pdf`           | fundo `#FEE2E2`, `#B91C1C` |
| Word              | `document`      | fundo `#DBEAFE`, `#1D4ED8` |
| Áudio (MP3)       | `audio`         | fundo `#F3E8FF`, `#7E22CE` |
| Vídeos (links)    | `video_link`    | fundo `#FFEDD5`, `#C2410C` |

Cada linha mostra a contagem daquele tipo **na organização** (não só na pasta
atual), para o professor achar rápido “onde estão os PDFs”.

Clicar de novo no tipo ativo limpa o filtro (volta a todos os tipos).

---

## 5. Área principal

Barra superior:

1. Caminho (breadcrumb): `Todos os materiais` ou `Violão / Iniciante`.
2. Busca por título (debounce, como em Alunos).
3. Alternância **grade / lista** (persistir no `localStorage` da sessão). O mock
   abre em **lista**.

### 5.1 Pastas como cards

Quando a pasta atual tem filhos, uma seção **Pastas · N** com grid
(`minmax(220px, 1fr)`):

- Ícone 46px na cor da pasta
- Nome
- Subtítulo: `5 arquivos · 2 subpastas` (omitir a parte zerada)
- Menu `⋯`: renomear, mudar cor, mover, excluir (só se estiver vazia, ou pede
  confirmação e apaga o conteúdo)

Hover: sobe 2px, borda `#C7D2FE` — o mesmo espírito dos cards de aluno.

### 5.2 Arquivos em lista

Seção **Arquivos · N**. Colunas:

| Coluna         | Conteúdo                                                      |
| -------------- | ------------------------------------------------------------- |
| Nome           | ícone do tipo + título + subtítulo                            |
| Tipo           | chip colorido (PDF, Word, Áudio, Vídeo)                       |
| Tamanho        | `1,2 MB` / `86 KB`. Vídeo: texto **Link** (não o tamanho)     |
| Compartilhado  | avatares sobrepostos dos alunos com acesso                    |
| Atualizado     | relativo: Hoje, Ontem, `03 nov`                               |
|                | menu `⋯`                                                      |

Subtítulo do nome:

- PDF/Word: `2 páginas` quando soubermos; senão o nome do arquivo
- Áudio: duração (`01:30 min`) quando soubermos
- Vídeo: **só o domínio** (`youtube.com`, `vimeo.com`) — o mock coloca o
  domínio no subtítulo e “Link” na coluna tamanho

Na **grade**, cada arquivo vira um card com o mesmo ícone colorido, título,
chip de tipo e avatares; tamanho/domínio embaixo.

### 5.3 Faixa para arrastar

Rodapé da área principal, sempre visível:

> Arraste arquivos para cá
> PDF, Word e MP3. Para vídeo, use Adicionar link.

Botão **Escolher arquivos** dispara o mesmo fluxo de **Enviar arquivo**.
Soltar (ou escolher) envia para a **pasta atual**. Recusar vídeo/arquivo
desconhecido com mensagem clara.

---

## 6. Compartilhamento

`material_assignments` já existe (`UNIQUE (material_id, student_id)`). Cada
linha da lista lê os alunos atribuídos e mostra o mesmo `StudentAvatar` do
resto do app (foto ou iniciais + cor do cadastro).

- 0 alunos: traço “—”
- 1–3: avatares empilhados (`-ml-2`, borda branca)
- 4+: três avatares + `+N`
- `title` nativo com os nomes (como no mock: “Micneias Gomes e Samir Gomes”)

**Compartilhar** (menu `⋯` ou clique nos avatares) abre um modal com a busca
ajax de aluno já usada na matrícula. Marcar/desmarcar grava
`material_assignments`. Não existe “compartilhar com todos” no MVP — o
professor escolhe aluno a aluno.

Na área do aluno, só aparece o que está atribuído a ele.

---

## 7. Tipos, arquivos e storage

| Tipo        | Origem                         | MIME / regra                                      |
| ----------- | ------------------------------ | ------------------------------------------------- |
| `pdf`       | upload                         | `application/pdf`                                 |
| `document`  | upload                         | `.doc` / `.docx` (UI: **Word**)                   |
| `audio`     | upload                         | `audio/mpeg` (`.mp3`)                             |
| `video_link`| URL                            | http(s); gravar `external_url`; sem `storage_path`|

Uploads vão para um bucket privado **`materials`**, caminho
`{organization_id}/{material_id}/{filename}`. Mesmo padrão das fotos: RLS por
`private.is_org_member`, URL assinada na leitura.

Teto por arquivo no MVP: **20 MB**. Vídeo não conta na cota (é link). A cota
da organização (plano) aparece depois, em Configurações; na tela, se estourar,
a action devolve erro claro.

O `CHECK` atual de `materials` só admite `pdf`/`audio` com `storage_path` e
`video_link` com `external_url`. Precisa passar a aceitar `document` no mesmo
lado do PDF.

Cloudflare R2 continua no radar do `PROJECT.md` (tráfego de saída). No MVP
fica Supabase Storage, igual às fotos; migrar o bucket é incremento isolado.

---

## 8. Modelo de dados

O que já existe:

- `materials` — `type` (`pdf` \| `audio` \| `video_link`), `title`,
  `description`, `storage_path`, `external_url`, `size_bytes`, `created_by`
- `material_assignments` — aluno ↔ material, RLS por organização

O que falta para esta UI:

```
material_folders
  id, organization_id, parent_id null,
  name, color, created_at, updated_at
  -- parent_id referencia a própria tabela; raiz = parent_id null
  -- UNIQUE (organization_id, parent_id, name) para não repetir na mesma pasta
```

Em `materials`:

- `folder_id uuid null` → `material_folders` (`ON DELETE CASCADE`: excluir a
  pasta apaga subpastas e arquivos, inclusive no storage)
- enum `material_type` += `document`
- nomes de pasta únicos por nível (índices parciais, porque `UNIQUE` trata
  `parent_id` nulo como distinto)

---

## 9. Server actions e rotas

Página: `src/app/materiais/page.tsx` (searchParams `pasta`, `tipo`, `q`,
`view`).

Actions em `src/app/materiais/actions.ts`:

- `listLibrary({ folderId, type, query })` — pastas filhas + arquivos da pasta
  (ou todos, na raiz virtual) + assignments com aluno (id, nome, cor, foto)
- `createFolder({ parentId, name, color })`
- `updateFolder` / `deleteFolder`
- `uploadMaterial(folderId, file)` — comprime nada (não é foto); valida MIME e
  tamanho; grava storage + linha
- `createVideoLink({ folderId, url, title })`
- `assignMaterial(materialId, studentIds)` — diff add/remove
- `deleteMaterial` — apaga storage se houver path
- `searchStudents` — reusar o da agenda

Menu: **Materiais** aponta para `/materiais`. O prefixo entra na área do
professor em `proxy.ts`.

Overflow do arquivo: abrir (signed URL ou o link), compartilhar, mover de
pasta, renomear, excluir.

---

## 10. Fora do MVP

- Preview embutido de PDF/Word/áudio na própria tela (abrir em nova aba basta)
- Transcodificar áudio / extrair waveform
- Compartilhar pasta inteira de uma vez (só arquivo a arquivo)
- Cota visual de armazenamento (vai em Configurações)
- Migrar o bucket para R2
- Pasta automática por instrumento do aluno
