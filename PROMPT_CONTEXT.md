# PROMPT_CONTEXT.md — DashIG
> Contexto de negocio e produto para sessoes de desenvolvimento com agentes de IA

---

## 1. Quem e o cliente deste projeto

**Welcome Weddings** faz parte do Welcome Group, com sede em Curitiba (PR). O grupo inclui a Welcome Trips (viagens) e a Welcome Weddings (casamentos no exterior/destination weddings).

O Instagram da Welcome Weddings (@welcomeweddings) e um canal estrategico de geracao de leads e construcao de marca. A equipe de marketing precisa de visibilidade real sobre o que funciona — quais formatos, horarios, hashtags e tipos de conteudo geram mais alcance e engajamento.

**Conta monitorada**: `@welcomeweddings` (Welcome Weddings | Destination Weddings)
**IG User ID**: `17841402369678583`
**Seguidores**: ~34.700 (marco/2026)

---

## 2. O que e o DashIG

DashIG e um dashboard interno de analytics de Instagram, construido em Next.js 14 + Supabase. Resolve tres problemas concretos:

1. **Historico limitado**: o Instagram nativo guarda apenas 90 dias. O DashIG guarda indefinidamente via Supabase.
2. **Falta de inteligencia**: o Insights nativo nao calcula scores, nao sugere horarios ideais, nao classifica conteudo por performance.
3. **Sem visao comparativa**: nao ha benchmarking de concorrentes nem comparativo entre formatos (Reel vs Carrossel vs Foto).

**URL producao**: https://mkt-insta.vercel.app
**Repositorio**: https://github.com/marcelowelcome/mkt-insta

---

## 3. Usuarios do sistema

| Perfil | Necessidade |
|---|---|
| Gestor de Marketing (Marcelo) | Visao executiva de performance mensal, tendencias e benchmarks |
| Social Media / Analista | Operacional: quais posts performaram, melhores horarios, hashtags |
| Diretoria | Relatorio mensal consolidado (PDF automatico por email) |

---

## 4. Conceitos de dominio importantes

### 4.1 Metricas principais

| Termo | Definicao |
|---|---|
| **Reach** | Numero unico de contas que viram o conteudo |
| **Engagement Rate** | (likes + comments + saves + shares) / reach x 100 |
| **QEI** | Qualitative Engagement Index — ponderacao: saves (x4) e shares (x5) valem mais que likes (x1) |
| **Completion Rate** | % do Reel assistido ate o fim (avg_watch_time / duration) |
| **Views** | Metrica base de Reels desde abril/2025 — substitui Plays |
| **Navigation** | Acoes de navegacao em Stories (substitui taps_forward/taps_back na API v22+) |
| **Content Score** | Tier calculado (VIRAL / GOOD / AVERAGE / WEAK) baseado em desvio padrao do engagement |

### 4.2 Metricas descontinuadas (NAO usar)

| Metrica antiga | Substituicao |
|---|---|
| `plays` | `views` (Reels) |
| `impressions` | Removido para conta e midias (v22+) |
| `following_count` | Removido (v21+) |
| `audience_gender_age` | `follower_demographics` com `breakdown=age,gender` |
| `audience_city` | `follower_demographics` com `breakdown=city` |
| `exits`, `taps_forward`, `taps_back` | `navigation` (Stories v22+) |

### 4.3 Tipos de conteudo

| Tipo | Media Type na API | Particularidades |
|---|---|---|
| Foto | `IMAGE` | Metricas padrao |
| Carrossel | `CAROUSEL_ALBUM` | Reach tende a ser alto por swipes |
| Video feed | `VIDEO` | Pouco usado, substituido por Reels |
| Reel | `VIDEO` (media_product_type=REELS) | Views e completion rate sao as metricas chave |
| Story | Endpoint separado | Expira em 24h. Thumbnails e videos persistidos no Supabase Storage |

### 4.4 Token de acesso (Meta Graph API)

- Long-Lived Token valido por 60 dias
- Salvo na tabela `app_config` no Supabase
- Sync diario verifica expiracao (alerta se < 15 dias)
- Refresh via `POST /api/instagram/refresh-token`
- Fallback para `process.env.META_ACCESS_TOKEN` apenas no setup inicial

---

## 5. Regras de negocio criticas

1. **Nunca deletar dados historicos** — apenas upsert (ON CONFLICT DO UPDATE).
2. **Stories persistidos** — thumbnails (jpg) e videos (mp4) salvos no Supabase Storage (bucket `story-media`), organizados em `thumbs/` e `videos/`. Sobrevivem a expiracao de 24h.
3. **Concorrentes = dados publicos apenas** — CRUD manual, sem scraping automatico por enquanto.
4. **Views > Plays nos Reels** — desde abril/2025.
5. **QEI calculado no frontend** — permite ajuste de pesos futuramente sem reprocessar dados.
6. **Content Score recalculado no sync** — batch update por tier (4 queries em vez de N por tabela).
7. **Auth centralizada** — todas as rotas de sync usam `validateCronSecret()` de `lib/auth.ts`.
8. **Audiencia em percentual** — API retorna numeros absolutos, convertemos para % antes de salvar.

---

## 6. Infraestrutura

### 6.1 Deploy e cron jobs

| Componente | Servico |
|---|---|
| Frontend + API | Vercel (https://mkt-insta.vercel.app) |
| Banco de dados | Supabase PostgreSQL |
| Cron jobs | Supabase pg_cron + pg_net (chama endpoints do Vercel) |
| Storage | Supabase Storage (bucket `story-media`) |
| Email | Resend |

### 6.2 Cron jobs (pg_cron no Supabase)

| Job | Schedule | Endpoint |
|-----|----------|----------|
| `dashig-sync-daily` | `0 11 * * *` (8h BRT) | POST /api/instagram/sync |
| `dashig-sync-stories` | `0 14 * * *` (11h BRT) | POST /api/instagram/sync-stories |
| `dashig-sync-audience` | `0 11 * * 1` (seg 8h BRT) | POST /api/instagram/sync-audience |
| `dashig-report-monthly` | `0 8 1 * *` (dia 1, 5h BRT) | POST /api/instagram/report |

Gerenciamento: `SELECT * FROM cron.job WHERE jobname LIKE 'dashig-%';`

### 6.3 Supabase Storage

| Bucket | Conteudo | Acesso |
|--------|----------|--------|
| `story-media` | Thumbnails (thumbs/*.jpg) e videos (videos/*.mp4) | Publico (leitura) |

---

## 7. Padroes de desenvolvimento

### 7.1 Nomenclatura
- Arquivos: `kebab-case.tsx`
- Componentes: `PascalCase`
- Funcoes e variaveis: `camelCase`
- Tabelas Supabase: `snake_case`
- Constantes: `UPPER_SNAKE_CASE`

### 7.2 Padroes de codigo
- **Auth**: `validateCronSecret()` de `lib/auth.ts` em toda rota de sync
- **Supabase**: `createServerSupabaseClient()` server-side, `createBrowserSupabaseClient()` client-side
- **Meta API**: toda chamada via `lib/meta-client.ts`, nunca fetch direto
- **Calculos**: funcoes puras em `lib/analytics.ts`, nunca inline
- **HTML**: sanitizar com `escapeHtml()` de `lib/auth.ts`
- **Componentes**: sempre 3 estados (loading/skeleton, erro, vazio)
- **Graficos**: Recharts com `ResponsiveContainer`, cores indigo/cyan, tooltips pt-BR
- **shadcn/ui**: v3 com Radix primitives (NAO v4/base-ui)

### 7.3 Variaveis de ambiente
- Nunca hardcodar tokens ou URLs
- `NEXT_PUBLIC_` apenas para variaveis expostas ao browser
- `SUPABASE_SERVICE_ROLE_KEY` apenas em API Routes (nunca no client)
- `CRON_SECRET` minimo 32 caracteres em producao

---

## 8. O que NAO esta no escopo

- Publicacao de conteudo via API (requer permissoes extras e aprovacao Meta)
- Analytics de Instagram Ads (Meta Ads API — escopo futuro)
- Multi-conta (apenas @welcomeweddings por ora)
- App mobile
- Integracao com outras redes sociais (TikTok, LinkedIn — escopo futuro)
- Scraping automatico de concorrentes (apenas CRUD manual)
