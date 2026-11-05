# Pokédex — Plano de reestruturação

> Proposta técnica da reestruturação do projeto, no mesmo padrão do **polyglot-lab**: este arquivo é
> a **fonte da verdade do que construir** (visão, princípios, stack, arquitetura, roadmap). Fica em
> português de propósito. O resto do repositório (código, commits, `AGENTS.md`, `PHASES.md`,
> `docs/`) é escrito em inglês. A **interface do app é em português** (ver §3.7).
>
> **Deploy na Vercel:** feito como Fase 10, antes do MCP (Fase 11), por escolha. A Fase 9 (Modo
> Ginásio 2.0) nasceu do uso em produção (§8.9).

---

# 1. Visão do projeto

A Pokédex é um projeto de estudo que consome a [PokeAPI](https://pokeapi.co/) para listar,
buscar e detalhar Pokémon. A versão atual (2022) é um protótipo: lista os 150 primeiros, busca por
nome e para por aí.

A reestruturação tem dois objetivos ao mesmo tempo:

1. **Produto:** uma Pokédex completa (todas as gerações), rápida, mobile-first, com busca e filtros
   compartilháveis pela URL, página de detalhes rica (stats, evoluções, fraquezas), favoritos,
   montador de time e um **modo de jogo**: draftar um time e batalhar pela insígnia do Ginásio de
   Pewter (§8.8).
2. **Aprendizado:** praticar a stack e as práticas do polyglot-lab num domínio menor — Next.js App
   Router, Server Components, cache de dados, validação com Zod, Tailwind com design tokens, testes
   (Vitest + Playwright), CI e documentação por fase.

A **PokeAPI continua sendo a única fonte de dados**. Não haverá banco de dados nem backend próprio
nesta etapa: o servidor do Next.js é a camada que consome, valida, transforma e faz cache da API.

---

# 2. Diagnóstico do projeto atual

## 2.1 Stack desatualizada

| Item                | Atual                                    | Problema                                                                       |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| Next.js             | 12.2.3, Pages Router                     | 4 majors atrás; sem Server Components, sem `next/image` moderno, sem App Router |
| React               | 18.2                                     | polyglot-lab usa 19                                                            |
| TypeScript          | 4.7, `strict: false`, `target: ES6`      | `any` espalhado, erros passam despercebidos                                    |
| Estilo              | styled-components 5 + `.babelrc`         | o `.babelrc` desliga o SWC (build mais lento); styled-components não combina bem com Server Components |
| Lint                | `.eslintrc.json` (ESLint 8)              | sem Prettier, sem Husky/lint-staged                                            |
| Testes / CI         | nenhum                                   | —                                                                              |
| Dependências mortas | `js-cookie`, `react-switch`, `polished`  | instaladas e importadas, mas sem uso real                                      |

## 2.2 Bugs e problemas de código

| Onde                                                     | Problema                                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [Pokedex.tsx](src/components/Pokedex.tsx)                | `for` de 1 a 150 dispara 150 `fetch` em paralelo no `useEffect`; cada resposta faz `setState` + `sort` → ~150 re-renders |
| [Pokedex.tsx](src/components/Pokedex.tsx)                | `setLoading(false)` roda de forma síncrona no fim do loop, antes de qualquer resposta: o "Carregando..." nunca aparece |
| [PokedexContext.tsx](src/contexts/PokedexContext.tsx)    | sem deduplicação: com React StrictMode (ou remount) a lista fica duplicada                                        |
| [PokedexContext.tsx](src/contexts/PokedexContext.tsx)    | erro de rede só vai para `console.log`; o usuário não vê nada                                                     |
| [PokedexContext.tsx](src/contexts/PokedexContext.tsx)    | busca é `includes` sensível a maiúsculas; não busca por número                                                    |
| [Header.tsx](src/components/Header.tsx)                  | filtro por tipo comentado (e com o tipo `eletric` escrito errado)                                                 |
| [Pokemon.tsx](src/components/Pokemon.tsx)                | props `any`, `key={index}`, `console.log` dentro do `map` de render                                               |
| [Pokemon.tsx](src/components/Pokemon.tsx)                | `<img>` externo sem lazy loading nem tamanho otimizado (artwork oficial tem ~475×475 px)                          |
| [handleColorPokemonType.ts](src/utils/handleColorPokemonType.ts) | `switch` de 100+ linhas que poderia ser um lookup; falta o tipo `dark`                                     |
| [styles/components/Pokemon.ts](src/styles/components/Pokemon.ts) | importa de `../../utils`, cujo `index.ts` reexporta o mock de **559 KB** → risco de ir para o bundle do cliente |
| [themes/light.ts](src/styles/themes/light.ts) / [styled.d.ts](src/styles/styled.d.ts) | cores de "calculadora" herdadas de outro projeto; tema dark incompleto e nunca usado |
| [globals.ts](src/styles/globals.ts)                      | o gradiente sobrescreve `theme.colors.background`; `color: white` global                                          |
| [Footer.tsx](src/components/Footer.tsx)                  | imports e interface sem uso; "Todos os direitos reservados a [logo Pokémon]" (o direito não é nosso)               |
| `img/pokemon.png` (sem `/`)                              | caminho relativo quebra em qualquer rota aninhada (`/pokemon/pikachu`)                                            |
| [index.tsx](src/pages/index.tsx)                         | título "Pokedéx"; providers dentro da página em vez do layout                                                     |
| Acessibilidade                                           | input de busca sem `label`; contraste de alguns tipos (ex.: `electric` amarelo com texto preto ok, `fire` com branco duvidoso) sem verificação |
| README                                                   | texto padrão do `create-next-app`                                                                                 |

## 2.3 O que vale manter

- A ideia visual do card colorido pelo tipo principal e os badges de tipo.
- O uso de artwork oficial (`sprites/other/official-artwork`).
- As cores de tipo como ponto de partida (serão revisadas para contraste).
- `public/img/pokebola.png` e `pokedex-logo.png` (favicon/marca).

## 2.4 Estratégia

Subir de Next 12 para 16 trocando de router e de solução de estilo é, na prática, reescrever. Então:
**reescrever no mesmo repositório**, numa branch `refactor/restructure`, reaproveitando ideias e
assets, e não migrar arquivo por arquivo. O código antigo fica no histórico do Git (tag
`v0-legacy` antes de começar).

---

# 3. Princípios (adaptados do polyglot-lab)

## 3.1 Learning-first

É um projeto de estudo. Toda implementação nova vem com **explicação** (o que é, por que aqui, qual
o trade-off) e toda fase termina com uma **nota de aprendizado** em `docs/phases/`.

## 3.2 A PokeAPI é a fonte, o domínio é nosso

Os componentes **nunca** recebem o JSON cru da PokeAPI. O fluxo é sempre:

```text
PokeAPI → fetch (com cache) → Zod (valida só os campos usados) → mapper → tipos de domínio → UI
```

Assim, se a API mudar um campo, quebra em um lugar só (o schema), com erro claro.

## 3.3 Respeitar o fair use da PokeAPI

A PokeAPI é gratuita e pede que os clientes **façam cache** dos recursos. Regra do projeto: nenhum
dado da PokeAPI é buscado no navegador; tudo passa pelo servidor do Next.js com cache longo
(os dados da Pokédex praticamente não mudam).

## 3.4 Sem tecnologia prematura

Nada de banco de dados, autenticação, Redis, React Query, Redux ou backend separado. Favoritos e
times ficam no `localStorage`. Se um problema real exigir algo a mais, ele vira uma fase nova.

## 3.5 Mobile-first e acessível

Projetar para ~375 px primeiro. Alvos de toque ≥ 44×44 px, contraste verificado nos dois temas,
`prefers-reduced-motion` respeitado, ícones sempre com rótulo acessível.

## 3.6 Estado na URL

Busca, filtros, ordenação e página vivem nos `searchParams`. Resultado: links compartilháveis, o
botão "voltar" funciona e a página pode ser renderizada no servidor.

## 3.7 Interface em português, código em inglês

- Todo texto da UI é em português (rótulos, botões, mensagens, estados vazios, `metadata`).
- Os textos ficam centralizados em `src/config/messages.ts` (não espalhados nos componentes), o que
  também facilita um i18n futuro.
- Tipos, stats e gerações são traduzidos por nós (`fire` → "Fogo", `special-attack` → "Ataque
  Especial", `generation-i` → "1ª geração").
- Nomes de Pokémon ficam como na API (no Brasil os nomes oficiais já são os mesmos), só formatados
  (`mr-mime` → "Mr. Mime").
- Textos que vêm da API (descrição, categoria, habilidades): usar `pt-BR` quando existir e cair
  para `en` quando não. Verificar na Fase 1 a cobertura real de `pt-BR` em cada endpoint e registrar
  na nota da fase.

---

# 4. Stack

| Área              | Tecnologia                                              | Observação                                              |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| Framework         | Next.js 16 (App Router) + React 19 + TypeScript 5 strict | mesma versão do polyglot-lab                            |
| Gerenciador       | Yarn 4 (`packageManager` no `package.json`)             | igual ao polyglot-lab                                   |
| Estilo            | Tailwind CSS 4 com design tokens em CSS variables       | substitui styled-components, `polished` e o `.babelrc`  |
| Ícones            | `lucide-react`                                          |                                                         |
| Fontes            | `next/font`                                             | substitui o `<link>` do Google Fonts no `_document`     |
| Validação         | Zod 4                                                   | respostas da PokeAPI e dados lidos do `localStorage`    |
| Imagens           | `next/image` com `remotePatterns` para `raw.githubusercontent.com/PokeAPI/sprites/**` | lazy loading e tamanhos responsivos |
| Testes unitários  | Vitest                                                  | lógica pura, schemas, mappers, cliente da API com `fetch` mockado |
| Testes E2E        | Playwright (viewport de celular primeiro)               |                                                         |
| Qualidade         | ESLint 9 (flat config) + Prettier + Husky + lint-staged | mesma config do polyglot-lab                            |
| CI                | GitHub Actions: lint, format, typecheck, test, build    | **sem** etapa de deploy                                 |
| MCP               | `@modelcontextprotocol/sdk` (TypeScript) + transporte stdio, executado com `tsx` | Fase 11; reaproveita o núcleo de dados (§5) |

> Antes de escrever código de cache, rotas ou `next/image`, ler a documentação da versão instalada
> em `node_modules/next/dist/docs/` (regra herdada do `AGENTS.md` do polyglot-lab: o Next 16 tem
> mudanças que não batem com exemplos antigos — por exemplo, `fetch` não é mais cacheado por padrão
> e existe a diretiva `"use cache"`).

---

# 5. Arquitetura

```text
Navegador                                Claude Code (cliente MCP)
  │  (HTML/RSC payload + sprites)          │  JSON-RPC via stdio
  ▼                                        ▼
Next.js (Server Components)              Servidor MCP (Node puro, src/mcp)
  ├── app/       rotas, layouts            ├── tools / resources / prompts
  └── features/  componentes               │
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
        Núcleo (independente do framework)
          ├── server/pokedex  serviços: índice, listagem, detalhes, time
          ├── server/pokeapi  cliente HTTP + schemas Zod + mappers + cache plugável
          └── lib/            funções puras: busca, filtros, efetividade, formatação
                       │
                       ▼
        PokeAPI (REST, https://pokeapi.co/api/v2) — com cache
```

### Núcleo independente do framework

O mesmo núcleo atende **dois consumidores**: o app Next.js e o servidor MCP (Fase 11), que roda em
Node puro, fora do Next. Por isso, desde a Fase 1:

- `server/pokeapi`, `server/pokedex` e `lib/` **não importam nada de `next/*`** — nem
  `notFound()`, nem `next/cache`, nem as opções `next` do `fetch`. Os serviços devolvem `null`
  quando algo não existe; quem chama decide (o app chama `notFound()`, o MCP responde um erro
  amigável).
- O cache é uma **interface injetável** (`PokeApiCache` com `get`/`set` e TTL). O app fornece uma
  implementação baseada no cache do Next; o MCP, um cache em memória (`Map` com expiração).
- O pacote `server-only` (usado no polyglot-lab) só entra nos arquivos de integração com o Next, nunca
  no núcleo: fora do runtime do Next ele lança erro ao ser importado.
- Uma regra de ESLint (`no-restricted-imports`) bloqueia `next/*` dentro do núcleo, para a
  separação não se perder com o tempo.

### Índice da Pokédex (peça central)

O endpoint `/pokemon?limit=…` só devolve `name` e `url`; os tipos exigiriam uma requisição por
Pokémon (é o que o projeto atual faz, 150 vezes). Em vez disso, o servidor monta um **índice
leve** com ~30 requisições, todas cacheadas:

| Fonte                         | Requisições | Fornece                                       |
| ----------------------------- | ----------- | --------------------------------------------- |
| `/pokemon-species?limit=2000` | 1           | id e nome de todas as espécies (1025)          |
| `/pokemon?limit=2000`         | 1           | todas as variedades, inclusive formas (ids ≥ 10001) |
| `/type/{name}`                | 18          | quais Pokémon/formas têm cada tipo (+ slot 1 ou 2) |
| `/generation/{id}`            | 9           | a geração de cada espécie                      |

Resultado: `PokemonSummary[]` (espécies + formas, ~1300 itens), com o qual **busca, filtro,
ordenação e paginação viram funções puras** no servidor. Os detalhes completos (`/pokemon/{name}`,
`/pokemon-species/{id}`, `/evolution-chain/{id}`) só são buscados na página de detalhes.

### Formas alternativas

A PokeAPI separa **espécie** (Raichu) de **variedade** (`raichu`, `raichu-alola`): cada espécie
lista suas variedades em `pokemon-species.varieties`, e cada variedade é um `/pokemon/{name}` com
tipos, stats, habilidades e artwork próprios. O projeto inclui:

| Categoria  | Exemplos                                   | Como identificar (sufixo do nome) |
| ---------- | ------------------------------------------ | --------------------------------- |
| Regionais  | `raichu-alola`, `ponyta-galar`, `growlithe-hisui`, `tauros-paldea-combat-breed` | `-alola`, `-galar`, `-hisui`, `-paldea` |
| Mega       | `charizard-mega-x`, `gengar-mega`           | `-mega`                           |
| Gigantamax | `pikachu-gmax`                              | `-gmax`                           |
| Outras     | `deoxys-attack`, `rotom-wash`               | demais variedades não padrão      |

- Na lista, por padrão aparecem só as espécies; o filtro "Mostrar formas" inclui as variedades
  (e o filtro por tipo passa a achar, por exemplo, Raichu de Alola como Elétrico/Psíquico).
- Na página de detalhes, um seletor alterna entre as variedades da espécie.
- A geração de uma forma é a da espécie; o número exibido também (`#0026`), com o rótulo da forma.
- Algumas formas não têm artwork oficial no repositório de sprites: usar o sprite padrão como
  fallback e, se nada existir, um placeholder.
- Formas puramente cosméticas (ex.: cores de Vivillon, `pokemon-form` sem `/pokemon` próprio) ficam
  fora: não mudam tipo nem stats.

Cuidados:

- Ignorar os tipos `stellar`, `unknown` e `shadow`.
- O sprite é derivado do id (não precisa de requisição).
- Cache longo (ex.: 24 h ou mais) — os dados só mudam com jogos novos.

---

# 6. Estrutura de diretórios

```text
src/
  app/
    layout.tsx                 # html, fontes, tema, header/footer
    globals.css                # Tailwind + design tokens
    page.tsx                   # Pokédex (grid) — lê searchParams
    loading.tsx · error.tsx · not-found.tsx
    pokemon/[name]/
      page.tsx                 # detalhes + generateMetadata
      loading.tsx · not-found.tsx
    favorites/page.tsx
    team/page.tsx
    compare/page.tsx
    gym/
      page.tsx                 # Ginásio de Pewter: início, draft, batalhas, insígnia (§8.8)
  components/
    ui/                        # button, input, select, badge, card, skeleton, empty-state, page-header
    layout/                    # site-header, site-footer, theme-toggle
  features/
    pokedex/                   # pokemon-card, pokemon-grid, search-bar, filters, pagination
    pokemon-detail/            # artwork-viewer, stats, evolution-chain, type-effectiveness, cry-player
    favorites/                 # favorite-button, use-favorites
    team/                      # team-slots, team-coverage
    compare/
    gym/                       # draft-board, dice, battle-view (barras de HP, log), badge, use-gym-run
  server/
    pokeapi/
      client.ts                # fetch tipado: base URL, timeout, erros, cache injetado
      cache.ts                 # interface PokeApiCache + implementação em memória
      schemas.ts               # Zod: só os campos que usamos
      mappers.ts               # JSON da API → tipos de domínio
      fixtures/                # respostas gravadas para os testes (substitui o mock de 559 KB)
    pokedex/
      index.ts                 # monta o índice (§5)
      service.ts               # listPokemon, getPokemonDetail, getEvolutionChain...
      battle-pool.ts           # stats + tipos + flags de lendário do pool do draft (§8.8)
      next-cache.ts            # adaptador de cache do Next (único arquivo do servidor que importa next/*)
  mcp/
    server.ts                  # ponto de entrada: conecta o transporte stdio, encerramento limpo
    create-server.ts           # cria o McpServer (dependências injetadas) e registra tudo
    context.ts                 # resolve nomes → detalhes, com sugestões ("did you mean …?")
    tools/                     # search-pokemon, get-pokemon, get-type-matchups, get-evolution-chain, analyze-team
    resources.ts               # pokemon://{name}, pokedex://types
    prompts.ts                 # build-team, explain-matchup
    format.ts                  # resultados compactos em texto para o modelo
  lib/
    search.ts                  # normalização e busca por nome/número
    filters.ts                 # filtro por tipo/geração, ordenação, paginação
    type-effectiveness.ts      # multiplicadores de dano, fraquezas/resistências/imunidades
    format.ts                  # #0025, dm → m, hg → kg, nomes com hífen
    storage.ts                 # localStorage versionado + Zod
    battle/                    # rng (seed), stats no nível 50, dano, simulação, draft, oponentes
  config/
    gym.ts                     # Ginásio de Pewter: líder, treinadores, tema de tipos, regras
    pokemon-types.ts           # 18 tipos: cor, cor de texto, rótulo
    messages.ts                # textos da UI em português + traduções de tipos/stats/gerações
    pokedex.ts                 # PAGE_SIZE, gerações, TTL de cache, base URL
  types/
    pokemon.ts                 # tipos de domínio
e2e/                           # Playwright
docs/phases/                   # notas de aprendizado (template do polyglot-lab)
docs/guides/mcp.md             # como rodar, inspecionar e usar o servidor MCP no Claude Code
.mcp.json                      # registro do servidor MCP no escopo do projeto (Claude Code)
AGENTS.md · PHASES.md · project-goal.md · README.md
```

### De → para

| Atual                                     | Novo                                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| `pages/index.tsx` + `_app` + `_document`  | `app/layout.tsx` + `app/page.tsx`                           |
| `contexts/PokedexContext.tsx`             | `server/pokedex/*` + estado na URL (sem Context)            |
| `components/Pokedex.tsx`                  | `features/pokedex/pokemon-grid.tsx` (Server Component)      |
| `components/Pokemon.tsx`                  | `features/pokedex/pokemon-card.tsx`                         |
| `components/Header.tsx` / `Footer.tsx`    | `components/layout/site-header.tsx` / `site-footer.tsx`     |
| `styles/**` + `styled.d.ts` + temas       | `app/globals.css` (tokens) + classes Tailwind               |
| `utils/handleColorPokemonType.ts`         | `config/pokemon-types.ts` (lookup)                          |
| `utils/mocks/initialPokemon.ts` (559 KB)  | `server/pokeapi/fixtures/*` (poucos KB, só nos testes)      |
| `.babelrc`, `.eslintrc.json`              | removidos → SWC padrão, `eslint.config.mjs`                 |

---

# 7. Modelo de domínio

```ts
type PokemonTypeName =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

type FormCategory = "regional" | "mega" | "gmax" | "other";

interface PokemonSummary {
  id: number;                // id da variedade (≥ 10001 para formas)
  speciesId: number;         // número da Pokédex nacional, o que aparece na tela
  name: string;              // slug da API: "mr-mime", "raichu-alola"
  isDefault: boolean;        // false para formas alternativas
  form?: { category: FormCategory; label: string }; // label: "Alola", "Mega X"
  types: [PokemonTypeName] | [PokemonTypeName, PokemonTypeName];
  generation: number;        // 1–9 (da espécie)
}

interface PokemonDetail extends PokemonSummary {
  varieties: { name: string; label: string; isDefault: boolean }[]; // seletor de formas
  heightM: number;           // API devolve decímetros
  weightKg: number;          // API devolve hectogramas
  stats: { name: StatName; base: number }[];
  abilities: { name: string; hidden: boolean }[];
  artwork: { default: string; shiny: string };
  cry?: string;              // URL .ogg (campo `cries` da API)
  genus: string;             // "Mouse Pokémon"
  flavorText: string;        // limpo de \f e \n
  evolutionChainId: number;
}

interface EvolutionNode {
  id: number;
  name: string;
  trigger?: string;          // "level 16", "use thunder-stone", "trade"...
  evolvesTo: EvolutionNode[]; // árvore: cobre Eevee, Tyrogue etc.
}
```

---

# 8. Funcionalidades

## 8.1 Pokédex (lista)

- Todas as 1025 espécies (e, com "Mostrar formas", as variedades), com **paginação numerada**
  (24 por página) via `searchParams` (`?page=2`): anterior/próxima, números com reticências
  (`1 … 4 5 6 … 43`), contagem de resultados ("Mostrando 73–96 de 1025") e página fora do
  intervalo tratada (redireciona para a última válida). Filtros novos voltam para a página 1.
- Card: artwork, número (`#0025`), nome formatado, rótulo da forma quando houver, badges de tipo,
  cor do tipo principal.
- Skeletons no `loading.tsx`, `error.tsx` com "tentar de novo", estado vazio com ação "limpar filtros".

## 8.2 Busca, filtros e ordenação

- Busca por nome (sem diferenciar maiúsculas, acentos e hífens: `mr mime` acha `mr-mime`) e por
  número (`25`, `#025`).
- Filtro por tipo (até dois: "fogo **e** voador") e por geração.
- "Mostrar formas" (todas ou por categoria: regionais, Mega, Gigantamax).
- Ordenação por número ou nome, crescente/decrescente.
- Tudo na URL: `/?q=char&type=fire&gen=1&sort=name`. Campo de busca com debounce que atualiza a URL
  com `router.replace`.

## 8.3 Página de detalhes (`/pokemon/[name]`)

- Seletor de formas da espécie (ex.: Charizard / Mega X / Mega Y / Gigantamax): cada forma tem a
  própria URL (`/pokemon/charizard-mega-x`), e tipos, stats, habilidades e fraquezas mudam junto.
- Artwork com alternância normal/shiny; botão para tocar o grito (`cries.latest`).
- Altura e peso convertidos (dm → m, hg → kg).
- Base stats em barras + total.
- Habilidades (marcando a oculta).
- Descrição (flavor text) e categoria (genus).
- Cadeia de evolução em árvore, com o gatilho de cada evolução, cada etapa clicável.
- **Efetividade de tipos:** fraquezas (4×, 2×), resistências (½×, ¼×) e imunidades (0×), calculadas
  a partir de `damage_relations` dos tipos — função pura e testada.
- Navegação anterior/próximo (`#0024 ←  → #0026`).
- `generateMetadata` (título e descrição por Pokémon) e `notFound()` para nomes inválidos.

## 8.4 Favoritos

- Botão de favoritar no card e na página de detalhes; página `/favorites`.
- `localStorage` com chave versionada (`pokedex:favorites:v1`), validado com Zod na leitura, lido
  com `useSyncExternalStore` para não quebrar a hidratação.

## 8.5 Montador de time

- Até 6 Pokémon em `/team`.
- **Cobertura do time:** para cada tipo atacante, quantos membros são fracos/resistentes — reaproveita
  `type-effectiveness.ts`. Destaque para fraquezas compartilhadas por 3+ membros.

## 8.6 Comparação e extras

- `/compare?a=charizard&b=blastoise`: stats lado a lado.
- "Pokémon aleatório".
- Atalho `/` para focar a busca.
- Tema claro/escuro: segue o sistema, com toggle opcional salvo no `localStorage`.

## 8.7 Servidor MCP

**MCP (Model Context Protocol)** é um protocolo aberto para um cliente de IA (Claude Code, Claude
Desktop, IDEs) usar funcionalidades de um programa externo. O servidor MCP da Pokédex expõe o
núcleo (§5) para o Claude Code: é a mesma lógica da interface, só que acessada por um modelo em vez
de uma pessoa.

### As três primitivas

| Primitiva     | Quem decide usar          | Na Pokédex                                                         | Como aparece no Claude Code |
| ------------- | ------------------------- | ------------------------------------------------------------------ | --------------------------- |
| **Tools**     | o modelo                  | ações com parâmetros (buscar, detalhar, calcular fraquezas)        | chamadas de ferramenta (`mcp__pokedex__search_pokemon`), com pedido de permissão |
| **Resources** | o usuário/cliente         | dados endereçáveis por URI: `pokemon://pikachu`, `pokedex://types` | menções com `@` no prompt   |
| **Prompts**   | o usuário                 | modelos de conversa: "montar time", "explicar confronto"           | slash commands (`/mcp__pokedex__build_team`) |

### Tools

Todas são somente leitura (`readOnlyHint: true`) e validam a entrada com Zod.

| Tool                  | Entrada                                                        | Saída (resumida)                                       |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| `search_pokemon`      | `query?`, `types?` (até 2), `generation?`, `includeForms?`, `limit` (máx. 25) | lista `#id nome — tipos` + total encontrado |
| `get_pokemon`         | `name` (aceita forma: `charizard-mega-x`)                       | tipos, stats, habilidades, altura/peso, formas, descrição |
| `get_type_matchups`   | `types` (1 ou 2)                                                | fraquezas 4×/2×, resistências, imunidades              |
| `get_evolution_chain` | `name`                                                          | árvore de evolução com gatilhos                        |
| `analyze_team`        | `names` (1 a 6)                                                 | cobertura do time e fraquezas compartilhadas           |
| `simulate_battle`     | `team`, `opponent` (1 a 6 nomes cada), `seed?`                  | vencedor + resumo turno a turno (motor da §8.8)        |

### Regras de design das tools

- **Descrições em inglês** (são código e o modelo as lê para decidir quando usar cada tool); os dados
  devolvidos trazem o slug e o rótulo em português (`fire` / "Fogo").
- **Respostas compactas:** limite de itens, sem JSON cru da PokeAPI — cada token conta no contexto do
  modelo. Quando suportado pela versão do SDK, devolver também `structuredContent` com `outputSchema`.
- **Erros como resultado, não como exceção:** Pokémon inexistente → `isError: true` com mensagem útil
  ("not found; did you mean …?"), para o modelo poder corrigir a chamada.
- **`stdout` é do protocolo:** no transporte stdio, qualquer `console.log` corrompe as mensagens
  JSON-RPC. Logs vão para `stderr` (`console.error`) — reforçado por regra de ESLint em `src/mcp/`.

### Uso no Claude Code

```bash
yarn mcp                       # roda o servidor (tsx src/mcp/server.ts)
yarn mcp:inspect               # abre o MCP Inspector para testar as tools à mão
claude mcp add pokedex --scope project -- node --import tsx src/mcp/server.ts   # gera/atualiza o .mcp.json
```

Depois, no Claude Code: `/mcp` mostra o status do servidor e suas tools, e é possível pedir, por
exemplo, "quais as fraquezas de um time com Charizard, Gyarados e Pikachu?".

> **Implementado (Fase 11):** o `.mcp.json` chama `node --import tsx src/mcp/server.ts` em vez de
> `yarn mcp`. No Windows o `yarn` é um shim `.cmd` que exigiria `cmd /c`, e isso quebra no
> macOS/Linux; o `node` funciona em todo sistema. Detalhes em `docs/guides/mcp.md`.

## 8.8 Modo Ginásio: draft e batalhas (gamificação)

**Ideia:** num estilo parecido com o [7a0](https://7a0.com.br/) (rola um dado, escolhe um jogador
daquela seleção/Copa, repete até fechar 11 e simula a partida), o jogador **drafta** um time de 6
Pokémon e enfrenta **5 batalhas simuladas** no Ginásio de Pewter. Vencer as 5 dá a **Insígnia da
Rocha** (Boulder Badge). O objetivo é diversão e aprendizado, não um simulador fiel dos jogos.

### Viabilidade: o que a PokeAPI oferece

Analisado em 02/11/2026 contra a API real (REST `/api/v2` e GraphQL `graphql.pokeapi.co/v1beta2`):

| Precisamos de                         | Na PokeAPI?  | Onde / observação                                                                 |
| ------------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| Fraquezas e pontos fortes por tipo    | Sim          | `/type/{name}` → `damage_relations` (já usado em `type-effectiveness.ts`)          |
| Base stats (PS, Ataque, Defesa…)      | Sim          | `/pokemon/{name}` → `stats`                                                        |
| Lendários / míticos (para balancear)  | Sim          | `/pokemon-species/{id}` → `is_legendary`, `is_mythical`                            |
| Golpes (poder, tipo, físico/especial) | Sim          | `/move/{name}` (ex.: Thunderbolt: 90, 100%, elétrico, especial). Cada Pokémon lista ~80 golpes: caro de usar |
| Naturezas                             | Sim          | `/nature/{name}` (+10% / −10% em um stat). Opcional                                |
| Cidade de Pewter                      | Sim, parcial | `/location/pewter-city` existe, mas só traz áreas e encontros                       |
| **Treinadores, líderes, times de NPC**| **Não**      | Não existe endpoint de treinador (`/trainer` → 400). Brock e os treinadores são **curadoria nossa** em `config/gym.ts` |
| **Insígnias**                         | **Não**      | Também é curadoria nossa (nome, imagem/ícone, tipo do ginásio)                       |
| **Fórmula de batalha**                | **Não**      | A API só tem dados. O motor de batalha é **nosso** (`lib/battle/`)                   |

**Ponto de atenção (performance e fair use):** o índice atual (§5) não tem stats nem família
evolutiva. Buscar `/pokemon/{id}` para cada candidato custa ~280 KB por Pokémon (o JSON traz a
lista de golpes inteira), e a família exige ainda `/pokemon-species/{id}`. Para as gerações 1 e 2
seriam ~500 requisições e ~70 MB num servidor frio. Alternativas:

1. **GraphQL da PokeAPI (recomendado):** uma única consulta devolve, para todo o pool, id, nome,
   tipos, stats, `evolution_chain_id` (família), `is_baby` e permite filtrar lendários/míticos.
   **Testado em 02/11/2026** no endpoint `https://beta.pokeapi.co/graphql/v1beta`: gerações 1+2 sem
   lendários = **240 Pokémon em 118 famílias, ~74 KB numa única resposta**. (O endpoint
   `graphql.pokeapi.co/v1beta2` existe, mas tem outro schema; fixar a versão usada.) Validada com
   Zod e cacheada por 24 h pelo mesmo `PokeApiCache`. Risco: endpoint *beta* com limite de
   requisições, o que o cache resolve.
2. **Base local (snapshot) gerada por script**, no mesmo padrão de `yarn fixtures`: um
   `yarn battle-pool:record` grava o resultado da consulta num JSON versionado e validado. Serve de
   **fallback** se o GraphQL estiver fora e de fixture para os testes. Não é um banco de dados: é um
   arquivo de ~74 KB, regenerado quando quisermos (os dados só mudam com jogos novos).
3. **REST:** só como último recurso (volume alto, ver acima).

### Complexidade de incluir a 2ª geração

**Baixa.** Com o GraphQL, Kanto (151) ou Kanto + Johto (251) é a mesma consulta mudando o filtro de
id; o tamanho da resposta continua pequeno. O que muda de verdade é o jogo, e tudo é tratável:

| Impacto da 2ª geração                                   | Tratamento                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| Evoluções entre gerações (Pichu→Pikachu, Onix→Steelix, Scyther→Scizor, Zubat→Crobat) | A regra de família usa `evolution_chain_id`, então já sai certo |
| Tipos Aço e Sombrio passam a existir no pool            | Mais variedade no dado; nada a fazer no motor                   |
| Tipos com poucas famílias (ex.: Dragão = só Dratini; Fantasma = Gastly e Misdreavus) | Se a face sorteada não tiver 3 ofertas válidas, completar com outro tipo sorteado |
| Novos Pokémon fortes (Tyranitar 600, junto com Dragonite 600) e bebês fracos (Pichu, Igglybuff) | O teto de orçamento e as faixas de BST equilibram; bebês ficam na faixa "fraca" |

Por isso o pool padrão passa a ser **gerações 1 e 2, sem lendários e míticos** (240 Pokémon). O
filtro de gerações fica em `config/gym.ts` para crescer depois sem mudar código.

**Conclusão:** **viável**, com esforço médio (uma fase). A API cobre o que importa para o equilíbrio
(tipos, efetividade, stats, lendários). O que falta (treinadores, líder, insígnia e as regras da
batalha) é pequeno, temático e fica bem como configuração e funções puras nossas. O maior risco não é
técnico: é **calibrar o equilíbrio** para ser divertido. Por isso a simulação deve ser determinística
(com seed) e testável, para ajustar os números com testes e não no olho.

### Fluxo do jogo

```text
/gym  →  Começar desafio  →  Draft (6 rodadas)  →  Batalha 1 … Batalha 5  →  Insígnia da Rocha
                                                     └─ derrota → fim da corrida (tentar de novo)
```

**Regras de composição de time** (valem para o jogador **e** para todos os oponentes):

- **Sem Pokémon repetidos** no mesmo time.
- **No máximo um Pokémon por família evolutiva** (`evolution_chain_id`): Squirtle e Blastoise não
  podem estar juntos, nem Pichu e Raichu, nem Onix e Steelix.
- No draft, as ofertas já **excluem** as famílias escolhidas; a regra é validada de novo ao montar o
  time (função pura `validateTeam`, testada).

1. **Draft (6 rodadas), no espírito do dado do 7a0:**
   - A cada rodada o jogador **rola o dado**, que sorteia um **tipo** (das 18 faces possíveis) e
     oferece **3 Pokémon** daquele tipo, um de cada faixa de poder (fraco / médio / forte, pelo total
     de base stats, o BST). O jogador escolhe 1.
   - **Limite de força do time** (_revisado na Fase 9: agora vale nos dois modos, 2.800 no Fácil;
     ver §8.9_) **(só no Difícil):** a soma de BST tem um teto de 2.500. No Fácil não
     há limite: o jogador escolhe por gosto e tipo. No Difícil as 3 ofertas ignoram o limite de propósito: as que estourariam aparecem **bloqueadas** ("Não
     cabe: passa X do limite"), e pelo menos uma sempre cabe. Assim o custo de escolher fortes cedo
     fica visível: as próximas vagas ficam com menos força (como um teto salarial).
     _Revisado em 02/11/2026:_ a primeira versão só oferecia o que cabia e escalava os oponentes pelo
     time do jogador, então escolher sempre o mais forte não tinha custo nem vantagem.
   - **Dado amigável:** só cai em tipos com pelo menos 3 famílias disponíveis e uma opção média ou
     forte, e prefere tipos que o time ainda não tem. Isso leva a times variados (em média ~9 tipos
     cobertos) e evita rodadas sem boa escolha.
   - **1 nova rolagem** por corrida, para fugir de um dado ruim.
   - Durante o draft, a tabela de **cobertura do time** (já existe em `/team`) mostra as fraquezas
     compartilhadas: é a dica do que falta.
   - Pool padrão: gerações 1 a 4, **sem lendários e míticos** (458 Pokémon em 212 famílias; Mewtwo
     ou Lugia desequilibrariam tudo). Formas alternativas ficam fora na primeira versão.
2. **Oponentes balizados:**
   - Batalhas 1–4: treinadores do ginásio (nomes curados: "Campista", "Montanhista"…), com times
     **totalmente aleatórios** (sem preferência de tipo), gerados pelo **mesmo algoritmo, orçamento e
     regras de composição** do jogador.
   - Força **fixa** por modo (Fácil 2.500, Difícil 2.600; _na Fase 9 passou a 2.600 / 2.500 com
     contra-escolha do titular, ver §8.9_), crescente de 85% na 1ª batalha até 105% na
     5ª. Não depende do time do jogador: montar um time mais forte é uma vantagem real.
   - Batalha 5: **Brock**, também com time aleatório no orçamento da batalha final. O único toque
     temático é o nome, a apresentação e a insígnia (sem viés de Pedra/Terra).
3. **Batalha:** simulada automaticamente e exibida turno a turno (barras de PS, "É super efetivo!",
   troca de Pokémon), com botão "pular animação". Antes de cada batalha o jogador vê o time adversário
   e pode **reordenar** o seu (escolher quem abre é a principal decisão tática).
4. **Entre batalhas** o time é curado por completo.
5. **Recompensa:** ao vencer a 5ª, ganha a Insígnia da Rocha (fica salva) e pode compartilhar o time
   campeão pela URL (seed + escolhas).

### Regras da batalha (simples, explicáveis e testáveis)

Tudo em `lib/battle/` como **funções puras** (sem Next, sem React): o app usa, os testes usam, e a
tool `simulate_battle` do MCP (§8.7) reaproveita.

- **Nível 50 para todos.** Stats calculados pela fórmula dos jogos com IV fixo 31 e sem EV:
  `PS = ⌊(2·base + 31)·50/100⌋ + 60` e `outro = ⌊(2·base + 31)·50/100⌋ + 5`.
- **1 contra 1 em sequência** (como nos jogos): os titulares lutam; quem desmaia é substituído pelo
  próximo. Vence quem ainda tiver Pokémon de pé.
- **Ordem do turno:** maior Velocidade ataca primeiro (empate: decidido pela seed).
- **Ataque sem lista de golpes:** cada Pokémon ataca com o **seu tipo mais efetivo** contra o
  defensor (STAB), poder fixo 60, usando o **maior** entre Ataque e Ataque Especial contra a defesa
  correspondente. Isso evita buscar golpes e ainda faz as fraquezas importarem de verdade.
- **Dano** (fórmula dos jogos, simplificada):
  `dano = ⌊(⌊22·60·A/D⌋/50 + 2) × 1,5 (STAB) × efetividade (0 a 4) × aleatório(0,85–1,00)⌋`,
  com **crítico** de 1/24 de chance (×1,5) para dar emoção.
- **Imunidade:** se nenhum tipo do atacante causa dano (efetividade 0), ele "luta" com dano mínimo
  de 1 (Struggle), para a batalha nunca travar.
- **Troca automática** quando um Pokémon desmaia: entra o reserva com o melhor confronto contra o
  adversário atual (mesma heurística para jogador e oponente).
- **Aleatoriedade com seed** (`mulberry32`): a mesma seed reproduz a mesma batalha, o que permite
  testes determinísticos, replays e times compartilháveis.
- **Fora da v1** (ideias futuras): golpes reais do learnset, habilidades, naturezas, itens, status
  (paralisia, sono) e outros ginásios (Cerulean, Vermilion…). O motor deve deixar espaço para elas,
  sem implementá-las.

### Balanceamento e testes

- Vitest com seeds fixas: Pokémon com vantagem de tipo e stats parecidos vence a maioria das
  batalhas; contra oponentes aleatórios, um time sem fraquezas compartilhadas vence com mais
  frequência que um time "mono-tipo" com o mesmo orçamento.
- `validateTeam`: rejeita repetidos e famílias duplicadas (Squirtle + Blastoise, Pichu + Raichu,
  Onix + Steelix); os geradores de draft e de oponentes nunca produzem um time inválido (testado com
  muitas seeds).
- **Teste de equilíbrio estatístico:** simular ~1.000 corridas com drafts aleatórios e conferir que a
  taxa de vitória da batalha 1 é alta (~80%) e a de conquistar a insígnia fica numa faixa divertida
  (ex.: 20–40%). Se sair disso, ajustar orçamentos, não o código da batalha.
- E2E: draftar 6 (com seed fixa), vencer/perder uma batalha, ver a insígnia salva.

### Modos, controles e histórico (refino pós-Fase 8)

- **Modos**, escolhidos ao começar o desafio (mesmo balanceamento, muda a informação visível):
  - **Fácil:** mostra o time adversário na ordem (quem abre a batalha), a força total dele e os
    atributos base dos seus Pokémon (no draft e na pré-batalha).
  - **Difícil:** o time adversário fica escondido até a batalha começar; sem atributos detalhados.
- **Velocidade da batalha:** lenta, média ou rápida (salva no `localStorage`), além de "pular".
- **Ordem do time:** setas, arrastar e soltar (mouse) ou tocar em dois Pokémon para trocá-los
  (toque e teclado).
- **Percurso e histórico da corrida:** as 5 batalhas como trilha (vencidas, próxima, a enfrentar),
  com os dois times de cada batalha já disputada. Fica ao lado da pré-batalha e aparece no fim
  (vitória ou derrota). Um novo desafio começa com o histórico vazio.
- **Orçamento mais claro:** barra em três partes (usado, reservado para as próximas vagas, livre),
  o máximo que cabe na rodada e "sobra depois" em cada oferta. As ofertas **sempre** cabem: o jogador
  nunca precisa desfazer uma escolha.
- **Arte:** Brock, Insígnia da Rocha, troféu de campeão (vitória) e tela de game over (derrota).

### Estado e persistência

- Corrida em andamento: `localStorage` (`pokedex:gym-run:v1`, validado com Zod): seed, escolhas,
  ordem do time, batalha atual. Recarregar a página continua de onde parou.
- Insígnias conquistadas: `pokedex:badges:v1`, exibidas no cabeçalho/`/gym`.
- Nenhum dado da PokeAPI é buscado no navegador: o pool vem do servidor (Server Component passa
  para o componente cliente do jogo), e o motor roda no cliente porque é só matemática.

## 8.9 Modo Ginásio 2.0: desafio, fim de jogo, sons e gamificação

**Contexto (05/11/2026, após o deploy):** jogando em produção, o modo ginásio ficou fácil demais, o
fim do desafio pouco claro (um botão "Derrota…" leva a uma segunda tela, e só lá aparece o
histórico), e "Novo desafio" pula a escolha do modo. Esta seção define a fase 9 (§11).

### Diagnóstico do equilíbrio (medido)

Simulação com o motor atual, 300 corridas por linha. "Mais forte" pega sempre a oferta mais forte
que cabe; "Esperto" faz o mesmo e, antes de cada batalha, põe para abrir o Pokémon com melhor
confronto contra o titular adversário (é o que o Fácil permite, porque mostra a ordem do oponente).

| Modo                         | Força média do time | Aleatório: insígnia | Mais forte | Esperto |
| ---------------------------- | ------------------- | ------------------- | ---------- | ------- |
| Fácil (sem teto / opon. 2.500) | 2.400 / **3.020**   | 24%                 | **85–89%** | **95%** |
| Difícil (teto 2.500 / 2.600)   | 2.320 / 2.480       | 6%                  | 19%        | 31%     |

A causa é clara: no Fácil não há teto, então quem pega sempre o forte monta ~3.000 de força contra
oponentes de 2.125 a 2.625. O teste de equilíbrio atual só mede a estratégia **aleatória**, que
ninguém usa de verdade; por isso ele passava. O Difícil está numa faixa boa.

### 1. Equilíbrio mais desafiador (pesando as escolhas de força do jogador)

- **Oponentes acompanham parte da força do time:** orçamento do oponente =
  `base + k × (força do time − base)`, com `k ≈ 0,4–0,5`. Escolher fortes continua valendo a pena
  (só parte da vantagem é compensada), mas deixa de garantir a insígnia. É o meio-termo entre a
  primeira versão (k = 1, que anulava o draft) e a atual (k = 0, que torna o Fácil trivial).
- **Teto também no Fácil, mais alto** (ex.: 2.800–2.900), para que o draft sempre tenha custo.
- **Curva mais íngreme** entre a 1ª e a 5ª batalha (ex.: 90% → 110%), para Brock ser um chefe.
- **Brock e o Difícil reagem ao seu time:** no Difícil (time adversário escondido) o oponente
  escolhe quem abre **depois** de ver o seu titular, com a mesma heurística de vantagem de tipo da
  troca. Brock faz isso nos dois modos. Contra-escolher o titular deixa de ser exclusivo do jogador.
- **Metas por modo**, em teste estatístico com as **três estratégias** (aleatória, mais forte,
  esperta), para nunca mais regredir sem ninguém ver:

  | Modo    | Aleatório | Mais forte | Esperto  |
  | ------- | --------- | ---------- | -------- |
  | Fácil   | 10–25%    | 40–60%     | 55–75%   |
  | Difícil | ≤ 10%     | 12–30%     | 20–40%   |

  **Resultado (Fase 9, `docs/phases/09-gym-mode-2.md`):** Fácil com teto 2.800, oponentes 2.600,
  `k = 0` e o Brock contra-escolhendo: **10% / 51% / 53%**. Difícil com teto 2.500, oponentes 2.500,
  `k = 0` e todos contra-escolhendo: **11% / 21% / 26%**. O `k` ficou no motor, mas em 0 nos dois
  modos: no Fácil ele aproximava quem drafta bem de quem drafta mal (aleatório 16% / mais forte
  33%), e no Difícil (k = 0,3) salvava times fracos (aleatório 16%, acima do Fácil). O teto já
  pesa as escolhas de força do jogador.

  Medições preliminares: teto 2.800 + oponentes 2.600 dá 15% / 51% / 70% no Fácil; sem teto com
  k = 0,5 dá 28% / 59% / 80%; teto 2.900 + k = 0,4 dá 18% / 48% / 66%. A curva 90% → 110% com
  oponentes de 2.650 passa do ponto nos dois modos (Fácil 4% / 24% / 42%; Difícil 1% / 5% / 11%):
  o Difícil atual (9% / 15% / 31%) já está na meta e só deve ganhar a contra-escolha do titular. A
  combinação final sai do teste, ajustando só `config/gym.ts`, nunca o motor.
- **Corridas salvas** com as regras antigas: incluir `rulesVersion` na corrida (ou subir a chave
  para `gym-run:v2`). Uma corrida de outra versão é descartada com aviso, porque os oponentes
  derivados da seed mudariam no meio do desafio.

### 2. Fim do desafio no estilo do 7a0 (modal de resultado → histórico)

- Quando a batalha que encerra o desafio termina (derrota em qualquer batalha ou vitória sobre o
  Brock), a própria tela de batalha abre um **modal de resultado**, sem o passo intermediário do
  botão "Derrota…"/"Vitória!":
  - **Derrota:** arte de game over, "Você venceu X de 5", quem te derrotou e o Pokémon que mais
    causou dano no seu time (MVP).
  - **Vitória:** troféu + Insígnia da Rocha (com o brilho), MVP da corrida e a sequência de vitórias.
  - Ações: **Ver histórico** (fecha o modal e mostra o percurso completo, batalha a batalha, com os
    dois times e o placar de cada uma) e **Novo desafio**. Compartilhar entra no item 5.
- Entre batalhas vencidas, um aviso curto de vitória ("Vitória! Próximo: Montanhista Rui") com o
  botão de seguir, sem modal.
- O modal é um `<dialog>` nativo (foco preso, `Esc` fecha e leva ao histórico, `aria-labelledby`),
  com animação que respeita `prefers-reduced-motion`.
- O histórico ganha o que hoje falta: resultado por batalha (ex.: 4 × 0), MVP de cada batalha e o
  time do jogador na ordem usada. O MVP sai de uma função pura sobre os eventos da batalha
  (`lib/battle/stats.ts`: dano causado e nocautes por Pokémon).

### 3. Fluxo: escolher a dificuldade antes de todo desafio

- **Novo desafio** (no modal, no histórico ou em "Abandonar") volta sempre para a **tela inicial
  com a escolha de modo**, com o último modo usado pré-selecionado. Nunca começa uma corrida direto.
- **Abandonar** no meio da corrida pede confirmação (perde o progresso).
- Com `?seed=` na URL a seed fica fixa, mas o modo ainda é escolhido na tela inicial.
- E2E cobre: perder → modal → Ver histórico → Novo desafio → escolha de modo.

### 4. Sons 8-bit

- **Sintetizados com a Web Audio API** (osciladores de onda quadrada/triangular e ruído), sem
  arquivos de áudio: zero download, sem licença de terceiros e fácil de ajustar. **Melodias
  originais e curtas**, nada copiado das trilhas dos jogos.
- Eventos: rolar o dado, escolher Pokémon, mandar a campo, golpe (normal, super efetivo, pouco
  efetivo, crítico), desmaio, vitória na batalha, derrota (jingle de game over), insígnia
  (fanfarra) e cliques do modal.
- As "partituras" (notas, durações, onda) são **dados puros** em `lib/sound/` (testáveis); o
  tocador que usa `AudioContext` fica em `features/gym/` (só no navegador).
- **Botão de som** (ligado/desligado) no jogo, salvo no `localStorage` (`pokedex:sound:v1`);
  volume baixo por padrão. O `AudioContext` só é criado no primeiro clique (regra de autoplay dos
  navegadores). Em "pular animação" os sons dos eventos pulados não tocam, só o do resultado.
- Testes: unitário das partituras (durações, limites de frequência); E2E com `AudioContext` falso
  para conferir que nada quebra sem som e que o botão persiste.

### Segunda passada (05/11/2026): três ginásios, treinadores que estudam o time, Pokébolas

Mesmo com o item 1, o jogo continuou fácil para uma pessoa: quem drafta pensando em cobertura de
tipos e reordena a cada batalha vence mais que qualquer robô. Com uma 4ª estratégia de teste,
**experiente** (cobertura + melhor titular), as taxas eram 49% (Fácil) e 21% (Difícil). Mudanças:

- **Treinadores estudam o seu time:** ao montar o time, cada vaga vai, numa fração `scout` das
  vezes, para o candidato com melhor confronto contra os seus Pokémon. Líderes e chefes trazem o
  **Pokémon de assinatura** (Brock: Onix; Misty: Starmie; James: Weezing; Jessie: Arbok) e sempre
  escolhem quem abre depois de ver o seu titular.
- **Um ginásio por modo:** Fácil = **Pewter** (Brock, Insígnia da Rocha); Difícil = **Cerulean**
  (Misty, Insígnia da Cascata); **desafio do dia = Equipe Rocket** (recrutas, James e Jessie).
- **Nomes sorteados por corrida:** classe do ginásio (Campista, Nadadora, Recruta Rocket…) + nome.
- **Pokébolas como recompensa:** 3 vitórias = Poké Bola, 4 = Grande Bola, Fácil completo = Ultra
  Bola, Difícil ou desafio do dia completo = Master Ball. Coleção na tela inicial e novas conquistas.
- **Taxas finais (aleatório / mais forte / experiente):** Fácil 3% / 15% / 30%; Difícil
  3% / 5% / 13%; desafio do dia 8% / 27% / 23%. Detalhes em `docs/phases/09-gym-mode-2.md`.
- **Arte:** as imagens novas tiveram o fundo (branco ou xadrez de "transparência falsa") removido
  por script e foram salvas como PNG transparente.

### Terceira passada (05/11/2026): tela inicial em seções, recompensas, treino e lendários

- **Tela inicial no estilo do 7a0:** chamada, passos "01 Role · 02 Monte · 03 Batalhe", e um
  cartão por desafio com quem você enfrenta, **o que ganha** e o seu status. Depois, uma seção de
  **Recompensas** (insígnias, Pokébolas, Mochila, lendários capturados, conquistas e estatísticas)
  e as regras.
- **Desafio do dia claro:** resultado de hoje, "Novo desafio em HH:MM:SS", **treino** (não vale) e
  **desafios anteriores** (últimos 7 dias, só treino).
- **Mochila com itens da PokeAPI:** o desafio do dia dá o item do dia (pedras de evolução, Doce Raro,
  Pepita…), com sprite oficial. A API tem itens e sprites, mas não tem nomes em pt-BR (curados) nem
  preços úteis, e continua sem insígnias e treinadores.
- **Lendários:** 26 das gerações 1 a 4 (sem míticos), em um pool à parte. Nunca saem do dado nem
  dos treinadores; entram pelo **Encontro lendário**, que gasta uma Master Ball antes de um ginásio:
  a primeira rodada oferece 3 lendários que cabem no limite. O capturado fica na coleção. Ideia
  futura: um modo "Liga Lendária" com chefes lendários.
- O endpoint GraphQL antigo saiu do ar; o pool passou para `graphql.pokeapi.co/v1beta2`.

### Quarta passada (05/11/2026): Desespero, treinador, abas do ginásio e um desafio do dia diferente

- **Bug do Normal × Fantasma:** era a única imunidade mútua do pool; os dois lados davam 1 de dano
  e a batalha durava centenas de golpes. O **Desespero** agora é como nos jogos: sem tipo, poder 50 e
  recuo de 1/4 do PS do atacante (a batalha acaba em ~5 golpes).
- **Navegação:** botão "Ginásio" destacado no cabeçalho, faixa na página inicial e abas no ginásio
  (Jogar · Recompensas · Histórico · Treinador).
- **Treinador sem login:** nome digitado uma vez, ID e data; aparece nas batalhas e no **Cartão de
  Treinador**, com **nível, XP e patente** (derivados das estatísticas).
- **Histórico:** os últimos 10 desafios; o último também aparece na tela de jogar.
- **Batalha:** cabeçalho "Você × Treinador" e uma abertura "VS".
- **Desafio do dia = Esconderijo da Equipe Rocket:** a mesma mão de 12 para todos, escolha 6 numa
  tela; até 10 batalhas seguidas sem cura completa (40% para quem sobrevive); recrutas com 2–3
  Pokémon. Pontuação de 0 a 10, com recompensas em 3, 5 (+ item do dia), 7 e 10.

### Quinta passada (05/11/2026): treinadores variados e um desafio do dia curto

- **Bug:** todo treinador escolhia o mesmo "melhor contra-ataque" ao seu time. Agora sorteiam entre
  os 3 melhores e evitam as famílias já usadas por treinadores anteriores da corrida.
- **Desafio do dia:** 5 batalhas rápidas (era 10), 50% de recuperação, recompensa garantida (1, 3 e
  5 derrotados) e **Master Ball a cada 3 dias seguidos** jogando, para dar motivo de voltar.

### 5. Mais gamificação (avaliadas e priorizadas)

| Ideia                                   | Valor | Esforço | Decisão         |
| --------------------------------------- | ----- | ------- | --------------- |
| **Desafio do dia** (seed por data, igual para todos, uma tentativa válida por dia) | Alto | Baixo | Entra |
| **Compartilhar resultado** em texto com emojis (ex.: `Ginásio de Pewter · 05/11 · 🟩🟩🟩🟥⬜`) via Web Share API ou área de transferência | Alto | Baixo | Entra |
| **Estatísticas locais:** corridas, insígnias, sequência de vitórias, melhor resultado, Pokémon mais usado | Médio | Baixo | Entra |
| **Conquistas** (ex.: vencer no Difícil, vencer com time abaixo de 2.300, vencer o Brock sem perder ninguém, campeão com bebê no time), exibidas no `/gym` | Alto | Médio | Entra |
| **Recompensa entre batalhas** (roguelike): ao vencer, escolher 1 de 3: trocar um Pokémon por uma nova rolagem, +1 rolagem, ou "treino" (+10% em um atributo na corrida) | Alto | Médio | Adiada: mexe no equilíbrio recém-calibrado; entra numa passada própria com o mesmo teste de 3 estratégias |
| Dicas de confronto na pré-batalha (Fácil): ícone de vantagem/desvantagem por par | Médio | Baixo | Entra |
| Vibração no celular em crítico/desmaio (`navigator.vibrate`) | Baixo | Baixo | Entra (junto com o botão de som) |
| Ranking online                          | Médio | Alto (backend) | Fica fora (§3.4, §12) |

Tudo continua sem backend: estatísticas e conquistas em `localStorage` (versionado + Zod), o
desafio do dia é só uma seed derivada da data, e as regras de conquista são funções puras sobre o
histórico da corrida.

## 8.10 Próximos passos pós-produção: usabilidade, Diário, profundidade e Pokédex conectada

**Contexto (05/11/2026):** jogando no celular, os botões principais ("Batalhar!", "Novo desafio")
ficavam escondidos entre textos e alinhados à esquerda, e o header fixo ocupava boa parte da tela.
O desafio do dia parecia impossível, os lendários não tinham um caminho claro e Favoritos, Meu time e
Aleatório pareciam soltos do resto. Medições e capturas de tela num Pixel 7 (412 px) guiaram as
decisões abaixo. Ficam fora por enquanto: novas Ligas/ginásios e vibração.

### Diagnóstico (medido)

- **Primeira tela do celular:** header em duas linhas (~14% da altura) + abas do ginásio 2×2 + chip
  de nível (~30%). No draft as 3 ofertas não apareciam sem rolar; na pré-batalha o "Batalhar!"
  ficava no topo e o seu time ocupava ~3 telas abaixo.
- **Desafio do dia:** simulando todos os times possíveis (6 dos 12 da mão, com o melhor titular a
  cada batalha), a parcela que vence as 5 batalhas variou de **3% a 48%** entre 23/10 e 05/11
  (05/11: 10%). O limite de força quase não pesava (≈ 909 de 924 combinações cabiam) e o mesmo
  time na mesma ordem sempre dá o mesmo resultado.
- **Lendários:** o texto dizia que completar o desafio do dia dá Master Ball, mas ele dá Ultra Bola.
  Os caminhos reais (vencer a Misty, ou 3 dias seguidos de desafio do dia) não apareciam.

### Fases

1. **Fase 12 — Usabilidade e clareza:** barra de ação fixa embaixo (um botão principal, largura
   total no celular), header de uma linha com menu e que se esconde ao rolar, abas do ginásio
   compactas e fora da tela durante a corrida, draft com as ofertas primeiro, pré-batalha em linhas
   compactas, cartão "Próximo passo" na tela inicial, dicas da primeira corrida, "Zona de perigo"
   para apagar o progresso, caminho claro até a Master Ball e o texto corrigido. "Aleatório" sai do
   header e vira "Surpreenda-me" na Pokédex.
2. **Fase 13 — Diário: "Quem é esse Pokémon?":** silhueta da arte oficial, palpite com
   autocompletar, dicas em sequência (tipo → geração → primeira letra), revelação com jingle 8-bit;
   modo do dia (igual para todos, compartilhável) e sequência infinita com recorde. A imagem do dia
   vem por uma rota nossa sem o número do Pokémon na URL. Jogar conta para a sequência de dias.
3. **Fase 14 — Emboscada Rocket (o novo desafio do dia):** um quebra-cabeça com informação aberta.
   Jessie e James com 4 Pokémon revelados na ordem, uma mão de 8, escolher 3 e a ordem, 3
   tentativas. O dia é **calibrado**: só vale uma seed em que uma faixa dos times possíveis vence.
   Recompensa por tentativa, compartilhamento estilo Wordle. Substitui a maratona de 5 batalhas.
4. **Fase 15 — Profundidade do jogo:** Mochila útil (pedras e Doce Raro evoluem um Pokémon da
   corrida; Pepita e Pedaço de Estrela dão uma rolagem), recompensa entre batalhas (escolher 1 de 3),
   escolher quem entra depois de um desmaio, e uma regra de campo por ginásio (ex.: chuva em
   Cerulean). Metas de equilíbrio revalidadas com as estratégias de teste.
5. **Fase 16 — Pokédex conectada:** Pokémon **vistos** (enfrentados, revelados no quiz) e **usados**
   (no seu time) marcados na Pokédex com progresso por geração; **Meu time** ganha a batalha amistosa
   contra o Brock ou a Misty; **Favoritos** marcados no draft e escolhendo o Parceiro do Cartão de
   Treinador; "Comparar com…" na página do Pokémon; missões semanais; conquistas com progresso e
   secretas; imagens de prévia (`next/og`) para links compartilhados.

Tudo continua sem backend: `localStorage` versionado + Zod, funções puras no núcleo e testes que nunca
chamam a PokeAPI real.

**Resultado da Fase 14:** limite de 1.250 para os 3 da mão; em 60 dias simulados, todos os dias
ficaram na faixa de 10–25% de times vencedores, testando em média ~3 seeds por dia (~30 ms). Detalhes
em `docs/phases/14-rocket-ambush.md`.

---

# 9. Design

Seguindo o modelo do polyglot-lab (tokens em CSS variables expostos ao Tailwind, nunca cor
hard-coded em componente), com identidade própria de Pokédex:

| Token        | Claro     | Escuro    | Uso                          |
| ------------ | --------- | --------- | ---------------------------- |
| background   | `#FFFFFF` | `#0F0F12` | fundo da página              |
| surface      | `#F6F6F8` | `#1A1A1F` | cards, painéis               |
| border       | `#E4E4E9` | `#2A2A31` | bordas sutis                 |
| foreground   | `#18181B` | `#F4F4F5` | texto                        |
| muted        | `#71717A` | `#A1A1AA` | texto secundário             |
| primary-600  | `#DC2626` | `#EF4444` | vermelho Pokédex (herdado do `#D6060B` atual) |
| primary-700  | `#B91C1C` | `#DC2626` | hover/ativo                  |

- Cores dos 18 tipos em `config/pokemon-types.ts`, cada uma com a cor de texto escolhida por
  **contraste** (WCAG AA), não no olho.
- Uma fonte só para a UI (ex.: manter Poppins via `next/font`), números em `tabular-nums`.
- Cantos arredondados, sombras leves, animação de hover que respeita `prefers-reduced-motion`.
- Rodapé com crédito correto: dados da PokeAPI; Pokémon e nomes relacionados são marcas da
  Nintendo / Game Freak / The Pokémon Company; projeto sem fins lucrativos.

---

# 10. Qualidade

## 10.1 Testes

| Tipo        | O que cobre                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| Vitest      | `search`, `filters`, `type-effectiveness`, `format`, `storage`, schemas Zod, mappers (com fixtures), cliente da API (timeout, 404, 5xx com `fetch` mockado), montagem do índice |
| Playwright  | buscar e abrir um Pokémon; filtrar por tipo e geração e voltar com o botão do navegador; navegar na cadeia de evolução; favoritar e ver em `/favorites`; montar um time |
| Vitest (MCP) | cada tool chamada por um cliente MCP de teste ligado ao servidor por transporte em memória do SDK: listagem de tools, entrada inválida rejeitada, Pokémon inexistente → `isError`, saída dentro do limite |

**Testes nunca chamam a PokeAPI real** (nem no CI). E2E roda contra o app com uma variável
`POKEAPI_BASE_URL` apontando para um servidor de fixtures local, ou com interceptação de rede.

## 10.2 Definition of Done (igual ao polyglot-lab)

Implementado, tipado (sem `any`), lint e format ok, testado (unitário/E2E quando aplicável),
tratamento de erro, estados de loading e vazio, responsivo (conferido em largura de celular),
acessibilidade básica, documentado, commit em inglês.

## 10.3 Convenções

- Branches: `main`, `feat/*`, `fix/*`, `refactor/*`, `chore/*`.
- Conventional Commits em inglês: `feat: add type filter`, `refactor: move pokeapi client to server`.

---

# 11. Roadmap

```text
00 Setup → 01 Camada PokeAPI → 02 Shell & Design → 03 Pokédex (lista) →
04 Busca & Filtros → 05 Detalhes → 06 Favoritos & Time → 07 Comparação & Polimento →
08 Modo Ginásio → 09 Modo Ginásio 2.0 → 10 Deploy → 11 Servidor MCP →
12 Usabilidade → 13 Diário: Quem é esse Pokémon? → 14 Emboscada Rocket →
15 Profundidade do jogo → 16 Pokédex conectada
```

Cada fase termina com a nota de aprendizado `docs/phases/NN-nome.md` (template do polyglot-lab).

## Fase 0 — Setup do projeto

**Objetivo:** base nova no mesmo padrão do polyglot-lab.

- Tag `v0-legacy` no estado atual; branch `refactor/restructure`
- Remover `src/pages`, `src/styles`, `src/contexts`, `src/utils`, `.babelrc`, `.eslintrc.json` e as dependências mortas
- Next.js 16 + React 19 + TypeScript strict (alias `@/*`) + Yarn 4
- Tailwind 4, ESLint 9 flat config, Prettier (mesma `.prettierrc.json`), Husky + lint-staged
- Vitest + Playwright configurados (um teste de fumaça cada)
- GitHub Actions: lint, format:check, typecheck, test, build (sem deploy)
- `.env.example` com `POKEAPI_BASE_URL=https://pokeapi.co/api/v2`
- `AGENTS.md`, `PHASES.md`, `docs/phases/README.md` + `_template.md`, README real
- Nota: `docs/phases/00-project-setup.md`

**Resultado:** app vazio rodando, CI verde.

## Fase 1 — Camada de dados da PokeAPI

**Objetivo:** aprender a consumir uma API externa de forma tipada, validada e com cache.

- `server/pokeapi/client.ts`: base URL por env, `AbortSignal.timeout`, erro tipado (`PokeApiError` com status), 404 → `null`
- **Núcleo independente do framework** (§5): nada de `next/*` nem `server-only` em
  `server/pokeapi`, `server/pokedex` e `lib/`; regra `no-restricted-imports` no ESLint
- Interface `PokeApiCache` + implementação em memória (testada) + adaptador `next-cache.ts` com a
  estratégia de cache do Next 16 (ler a doc local; `fetch` com revalidate ou `"use cache"`)
- Teste que importa os serviços num processo Node puro (sem Next), garantindo que o MCP da Fase 11
  vai conseguir usá-los
- Schemas Zod de `pokemon`, `pokemon-species`, `type`, `generation`, `evolution-chain`
- Mappers para os tipos de domínio (§7), incluindo a classificação das formas (§5)
- Índice da Pokédex (§5), com espécies e formas + `listPokemon` / `getPokemonDetail` / `getEvolutionChain` / `getTypeRelations`
- Levantar a cobertura de `pt-BR` nos textos da API (§3.7)
- Fixtures gravadas + testes Vitest
- Nota: `docs/phases/01-pokeapi-layer.md`

**Resultado:** o servidor entrega dados de domínio confiáveis; nenhuma UI ainda.

## Fase 2 — Shell e design system

- Tokens (§9) claro/escuro, fonte com `next/font`
- `config/messages.ts` com os textos da UI em português e as traduções de tipos, stats e gerações (§3.7)
- `config/pokemon-types.ts` com os 18 tipos e contraste verificado
- Primitivos `components/ui` (button, input, select, badge, card, skeleton, empty-state, page-header)
- Header (logo + busca) e footer (créditos corretos), layout responsivo
- `next.config.ts` com `remotePatterns` para os sprites
- Nota: `docs/phases/02-shell-and-design.md`

## Fase 3 — Pokédex (lista)

- `app/page.tsx` como Server Component lendo `searchParams`
- `PokemonCard` com `next/image` (tamanhos responsivos, `priority` só na primeira linha)
- Componente de paginação numerada (§8.1) + função pura `paginate` testada (reticências, limites,
  página inválida)
- `loading.tsx`, `error.tsx`, `not-found.tsx`
- E2E: abrir a home, ir para a página 3, voltar com o navegador
- Nota: `docs/phases/03-pokedex-list.md`

**Resultado:** as 1025 espécies navegáveis, sem as 150 requisições no navegador.

## Fase 4 — Busca, filtros e ordenação

- `lib/search.ts` e `lib/filters.ts` (funções puras + testes)
- `SearchBar` (client, debounce, `router.replace`), filtros de tipo (até 2), geração e formas, ordenação
- Estado vazio com "limpar filtros"
- E2E: buscar, filtrar, voltar no navegador
- Nota: `docs/phases/04-search-and-filters.md`

## Fase 5 — Página de detalhes

- `/pokemon/[name]` com tudo de §8.3, incluindo o seletor de formas (testar com Charizard, Raichu
  de Alola e um Pokémon sem formas) e o fallback de artwork
- `lib/type-effectiveness.ts` com testes (casos: Charizard 4× pedra, Gengar imune a normal e lutador, Skarmory ¼× grama, imunidade que anula uma fraqueza)
- Árvore de evolução (testar com Eevee e com Pokémon sem evolução)
- `generateMetadata`, `notFound()`, anterior/próximo
- E2E: abrir detalhe a partir da busca e navegar pela evolução
- Nota: `docs/phases/05-pokemon-detail.md`

## Fase 6 — Favoritos e time

- `lib/storage.ts` (versionado + Zod) e hook com `useSyncExternalStore`
- Favoritar no card/detalhe, página `/favorites`
- `/team` com 6 slots e análise de cobertura
- E2E: favoritar, recarregar a página, continuar favoritado; montar time
- Nota: `docs/phases/06-favorites-and-team.md`

## Fase 7 — Comparação e polimento

- `/compare`, Pokémon aleatório, atalho `/`, toggle de tema
- Passe de acessibilidade (foco, rótulos, contraste nos dois temas, teclado)
- Passe de performance (Lighthouse local, tamanho do bundle, imagens)
- Web app manifest + ícones (instalável; útil antes mesmo do deploy)
- README final com screenshots
- Nota: `docs/phases/07-compare-and-polish.md`

**Resultado:** Pokédex completa rodando localmente.

## Fase 8 — Modo Ginásio (draft e batalhas)

**Objetivo:** gamificar a Pokédex (§8.8) e praticar lógica de domínio pura, aleatoriedade
determinística (seed), máquina de estados no cliente e testes de balanceamento.

1. **Dados do pool:** `server/pokedex/battle-pool.ts` com id, nome, tipos, stats, BST, família
   (`evolution_chain_id`) e `is_baby`, para as gerações 1 e 2 sem lendários/míticos. Consulta
   GraphQL (schema Zod, cache 24 h) + script `yarn battle-pool:record` que grava o snapshot JSON
   usado como fallback e como fixture dos testes.
2. **Motor (`lib/battle/`, puro e testado):** `rng.ts` (mulberry32), `stats.ts` (nível 50),
   `damage.ts` (fórmula, STAB, efetividade via `type-effectiveness.ts`, crítico), `simulate.ts`
   (batalha 6×6 → vencedor + log de eventos), `team.ts` (`validateTeam`: sem repetidos e uma
   família por time), `draft.ts` (rolagem de tipo, 3 ofertas por faixa excluindo famílias já
   escolhidas, orçamento, 1 nova rolagem), `opponents.ts` (times aleatórios no orçamento, mesmas
   regras de composição, sem viés de tipo).
3. **Conteúdo curado:** `config/gym.ts` com Brock, nomes dos treinadores, gerações do pool,
   orçamentos por batalha e a insígnia; textos da UI em `config/messages.ts`.
4. **Interface `/gym`:** tela inicial (regras + insígnias conquistadas), draft com dado animado e
   cobertura do time ao vivo, pré-batalha (time adversário + reordenar o seu), batalha animada (barras
   de PS, mensagens de efetividade, "pular"), vitória/derrota e tela da insígnia. Animações respeitam
   `prefers-reduced-motion`.
5. **Estado:** corrida e insígnias no `localStorage` (versionado + Zod) com `useSyncExternalStore`;
   link compartilhável do time campeão (seed + escolhas na URL).
6. **Testes:** Vitest para cada módulo do motor com seeds fixas + teste estatístico de equilíbrio
   (§8.8); Playwright: draft completo com seed fixa, uma batalha, insígnia salva após recarregar;
   axe na tela do jogo nos dois temas.
7. Nota: `docs/phases/08-gym-mode.md` (incluindo as taxas de vitória medidas e os ajustes feitos).

**Resultado:** dá para draftar um time, batalhar 5 vezes e conquistar a Insígnia da Rocha, com
batalhas reproduzíveis e balanceamento verificado por testes.

> Fora de escopo nesta fase: golpes reais, habilidades, naturezas, itens, status, multiplayer e
> outros ginásios (ver §12).

## Fase 9 — Modo Ginásio 2.0 (desafio, fim de jogo, sons e gamificação)

**Objetivo:** deixar o ginásio desafiador e mais recompensador (§8.9), praticando balanceamento
guiado por dados, diálogos acessíveis, Web Audio e persistência local de progresso.

1. **Equilíbrio:** oponentes que acompanham parte da força do time (`k`), teto no Fácil, curva
   90% → 110%, contra-escolha do titular no Difícil e pelo Brock; `rulesVersion` na corrida.
   Teste estatístico com as três estratégias (aleatória, mais forte, esperta) e as metas por modo.
2. **Fim do desafio:** modal de resultado ao fim da batalha decisiva (derrota ou insígnia) com MVP,
   "Ver histórico" e "Novo desafio"; aviso curto entre vitórias; histórico com placar e MVP por
   batalha (`lib/battle/stats.ts`).
3. **Fluxo:** "Novo desafio" sempre volta para a escolha de modo (último modo pré-selecionado);
   confirmação ao abandonar.
4. **Sons 8-bit:** partituras originais em `lib/sound/` + tocador Web Audio em `features/gym/`,
   botão de som persistido, criação do `AudioContext` no primeiro clique.
5. **Gamificação:** desafio do dia, compartilhar resultado com emojis, estatísticas locais,
   conquistas e dicas de confronto no Fácil. Recompensa entre batalhas e vibração são opcionais.
6. **Testes:** Vitest (metas de equilíbrio, MVP, conquistas, partituras, seed do dia); Playwright
   (derrota → modal → histórico → novo desafio → escolha de modo; som desligado persiste; desafio
   do dia); axe no modal nos dois temas; conferir no celular.
7. Nota: `docs/phases/09-gym-mode-2.md` (com as taxas medidas antes e depois).

**Resultado:** vencer o Fácil exige um bom draft e uma boa ordem, o Difícil é um desafio de
verdade, o fim de jogo é claro e o modo tem motivos para voltar todo dia.

> Fora de escopo nesta fase: golpes reais, habilidades, status, outros ginásios e ranking online
> (ver §12).

## Fase 11 — Servidor MCP

**Objetivo:** aprender MCP de ponta a ponta — da fundação do servidor até o uso no Claude Code —
reaproveitando o núcleo, sem duplicar regra de negócio (§8.7).

1. **Fundamentos** (registrar na nota da fase): cliente × servidor, JSON-RPC 2.0, ciclo de vida
   (`initialize` → troca de capabilities → chamadas), transportes stdio × Streamable HTTP, e as três
   primitivas.
2. **Fundação do servidor**
   - Dependência `@modelcontextprotocol/sdk` (ler a doc/README da versão instalada: a API do SDK
     muda entre versões)
   - `src/mcp/server.ts`: `McpServer` com nome/versão, `StdioServerTransport`, encerramento limpo
   - Scripts `mcp` (`tsx src/mcp/server.ts`) e `mcp:inspect` (MCP Inspector)
   - Logs só em `stderr` + regra de ESLint em `src/mcp/`
   - Primeira tool (`get_type_matchups`, que é função pura) testada no Inspector
3. **Tools:** `search_pokemon`, `get_pokemon`, `get_evolution_chain`, `analyze_team`,
   `simulate_battle` (reaproveita o motor das Fases 8 e 9), com schemas
   Zod, `readOnlyHint`, respostas compactas e erros com `isError`
4. **Resources:** `pokemon://{name}` (template de URI) e `pokedex://types` (tabela de tipos)
5. **Prompts:** `build-team` (argumentos: estilo, geração) e `explain-matchup` (dois Pokémon)
6. **Testes:** cliente MCP de teste via transporte em memória do SDK (§10.1); fixtures, nunca a
   PokeAPI real
7. **Uso no Claude Code**
   - `.mcp.json` no escopo do projeto (via `claude mcp add … --scope project`), versionado
   - Verificar com `/mcp`; testar perguntas reais que exijam encadear tools (ex.: buscar → detalhar
     → analisar time)
   - Observar como o modelo escolhe as tools e ajustar nomes/descrições quando ele errar
8. **Documentação:** `docs/guides/mcp.md` (rodar, inspecionar, registrar, exemplos de perguntas) +
   seção no README
9. Nota: `docs/phases/11-mcp-server.md`

**Resultado:** o Claude Code consulta a Pokédex por MCP usando exatamente a mesma lógica da
interface web.

> Fora de escopo nesta fase: transporte HTTP, autenticação do servidor MCP e publicação em
> registry — dependem do deploy (§12).

## Fase 12 — Usabilidade e clareza

**Objetivo:** o próximo passo sempre visível e ao alcance do polegar (§8.10).

1. `ActionBar` (barra fixa embaixo) na mão do dia, pré-batalha, batalha e resultado.
2. Header de uma linha no celular (menu `<details>`), escondido ao rolar para baixo; abas do ginásio
   numa linha e fora da tela durante a corrida (estado de foco em memória).
3. Draft com as ofertas primeiro (cartões em linha no celular) e o orçamento compacto; pré-batalha
   em linhas compactas e adversário em 3 colunas.
4. Tela inicial: cartão "Próximo passo" (função pura `nextStep`), hero completo só na primeira
   visita, botões em largura total, regras recolhidas.
5. Dicas da primeira corrida (uma vez cada, salvas), "Zona de perigo" para apagar o progresso,
   caminhos até a Master Ball com progresso e textos corrigidos.
6. Testes: unitário de `nextStep`; E2E de próximo passo, barra de ação, dicas, reset e menu; axe.
7. Nota: `docs/phases/12-usability.md`.

## Fase 13 — Diário: "Quem é esse Pokémon?"

**Objetivo:** um jogo diário de 30 segundos que usa só a Pokédex (§8.10).

1. `lib/quiz.ts` (puro): Pokémon do dia pela data, normalização de palpites, dicas, pontuação,
   texto para compartilhar. Config em `config/quiz.ts`.
2. Rota `/quiz` (do dia + sequência infinita), imagem do dia por rota própria, revelação com jingle.
3. Progresso em `localStorage` (Zod), XP e Pokébolas, sequência de dias junto com o desafio do dia.
4. Testes unitários e E2E; nota `docs/phases/13-daily-quiz.md`.

## Fase 14 — Emboscada Rocket

**Objetivo:** trocar a maratona do desafio do dia por um quebra-cabeça justo e calibrado (§8.10).

1. `lib/battle/puzzle.ts` (puro): mão de 8, adversário fixo de 4, times de 3 em ordem, calibração
   da seed do dia por taxa de vitória, tentativas e recompensas.
2. Tela do quebra-cabeça com a barra de ação, tentativas anteriores e explicação da derrota.
3. Teste de calibração (faixa de vitória em muitos dias) e E2E; nota
   `docs/phases/14-rocket-ambush.md`.

## Fase 15 — Profundidade do jogo

**Objetivo:** mais decisões durante a corrida sem perder o equilíbrio (§8.10).

1. Itens da Mochila usáveis na corrida; recompensa entre batalhas; escolha manual após desmaio
   (simulação pura com a lista de escolhas); regra de campo por ginásio.
2. Metas de equilíbrio revalidadas; E2E; nota `docs/phases/15-game-depth.md`.

## Fase 16 — Pokédex conectada

**Objetivo:** ligar Pokédex, Favoritos, Meu time e o jogo (§8.10).

1. Vistos/usados com progresso; batalha amistosa com Meu time; favoritos no draft e Parceiro;
   "Comparar com…"; missões semanais; conquistas com progresso; imagens de prévia.
2. Testes e nota `docs/phases/16-connected-pokedex.md`.

---

# 12. Depois deste plano (não implementar agora)

- **Fase 10 — Deploy na Vercel** (CI → Vercel, previews, verificação no celular): feita antes do
  MCP (ver `docs/phases/10-deploy.md`). Depois da Fase 11, opcionalmente: expor o servidor MCP também
  por **Streamable HTTP** numa rota `/api/mcp` do Next, para ser usado sem clonar o repositório.
- Ideias futuras, só se houver motivo real: conta de usuário + banco para sincronizar favoritos/times
  entre dispositivos; filtros por stats; i18n (inglês além do português).
- Evoluções do Modo Ginásio (§8.8): os outros 7 ginásios de Kanto e a Liga; golpes reais, habilidades
  e status na batalha; ranking de corridas (exigiria backend, então só com motivo real). O desafio
  do dia saiu desta lista e entrou na Fase 9 (§8.9).

---

# 13. Decisões

| Decisão                 | Escolha                                                    | Status                          |
| ----------------------- | ---------------------------------------------------------- | ------------------------------- |
| Idioma da interface     | Português na UI; código, commits e docs técnicos em inglês (§3.7) | Decidido                 |
| Paginação               | Páginas numeradas na URL (§8.1)                             | Decidido                        |
| Escopo de Pokémon       | 1025 espécies + formas alternativas (regionais, Mega, Gigantamax, outras), cosméticas fora (§5) | Decidido |
| Gerenciador de pacotes  | Yarn 4 (igual ao polyglot-lab)                              | Recomendado                     |
| Servidor MCP            | Fase 11, transporte stdio, núcleo compartilhado com o app (§5, §8.7) | Decidido                |
| Modo Ginásio            | Fase 8: draft + batalhas simuladas pelo Ginásio de Pewter (§8.8)   | Proposto                        |
| Fonte dos stats do jogo | GraphQL `graphql.pokeapi.co/v1beta2` (antes `beta.pokeapi.co/graphql/v1beta`, fora do ar desde 11/2026), cache 24 h + snapshots JSON como fallback/fixture (§8.8, §8.9) | Decidido |
| Pool do draft           | Gerações 1 a 4 (458), sem lendários/míticos; configurável em `config/gym.ts` | Decidido; lendários (26) só por Encontro lendário (Master Ball), §8.9 |
| Derrota no desafio      | Encerra a corrida (estilo roguelike, como o "7 a 0")                | Decidido                        |
| Oponentes               | Times aleatórios, sem viés de tipo (inclusive o Brock), mesmo orçamento e regras | Revisado na Fase 9: treinadores estudam o seu time (`scout`) e líderes trazem Pokémon de assinatura (§8.9) |
| Composição de time      | Sem repetidos e no máximo um Pokémon por família evolutiva (jogador e oponentes) | Decidido           |
| Equilíbrio do ginásio   | Teto nos dois modos (2.800 / 2.500), contra-escolha do titular (Brock sempre; todos no Difícil), metas testadas com 3 estratégias; `k` disponível mas em 0 (§8.9) | Decidido (Fase 9) |
| Fim do desafio          | Modal de resultado → histórico; "Novo desafio" sempre passa pela escolha de modo (§8.9) | Decidido (Fase 9) |
| Sons do ginásio         | Web Audio sintetizado (sem arquivos), melodias originais, desligável (§8.9) | Decidido (Fase 9)     |
