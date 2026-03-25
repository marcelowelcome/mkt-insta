# ARCHITECTURE.md — DashIG
> Instagram Analytics Dashboard · Welcome Weddings
> Stack: Next.js 14 · Supabase · Vercel · Meta Graph API

---

## 1. Visao Geral do Projeto

DashIG e um dashboard interno de analytics para acompanhar a performance do perfil do Instagram da **Welcome Weddings** (@welcomeweddings). O sistema coleta dados via Meta Graph API, armazena historico no Supabase (ja que a API do Meta nao mantem historico longo), e exibe os dados em uma interface React com graficos interativos.

O projeto segue os mesmos padroes arquiteturais do DashWT (dashboard de vendas da Welcome Trips): modular, documentado para agentes de IA, e deployado no Vercel.

**Conta monitorada**: `@welcomeweddings` (Welcome Weddings | Destination Weddings)
**IG User ID**: `17841402369678583`

---

## 2. Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (v3, Radix primitives) |
| Graficos | Recharts |
| Backend | Next.js API Routes (Route Handlers) |
| Banco de dados | Supabase (PostgreSQL) |
| Auth | CRON_SECRET via lib/auth.ts (centralizado) |
| Fonte de dados | Meta Graph API v21.0 (Instagram Graph API) |
| Deploy | Vercel |
| Cron Jobs | Vercel Cron |
| Email Reports | Resend |

---

## 3. Fluxo de Dados

```
Meta Graph API v21.0
      |
/api/instagram/sync (Vercel Cron — diario as 8h BRT)
      |
Normalizacao + upsert no Supabase (ON CONFLICT DO UPDATE)
      |
/api/instagram/[endpoint] (Route Handlers internos)
      |
Componentes React (Client Components com hooks)
      |
Dashboard renderizado no browser
```

---

## 4. Estrutura de Diretorios (Estado Atual)

```
/app
  page.tsx                              <- Redirect para /dashboard/instagram
  /dashboard
    /instagram
      layout.tsx                        <- Layout com sidebar responsiva + mobile nav
      page.tsx                          <- Visao Geral (KPIs, graficos, top posts, heatmap, scorecard)
      error.tsx                         <- Error boundary global do modulo
      /posts/page.tsx                   <- Grid de posts com filtros, ordenacao, paginacao
      /reels/page.tsx                   <- Reels analytics (views, completion, engagement)
      /stories/page.tsx                 <- Stories tracker
      /growth/page.tsx                  <- Historico de seguidores + metricas
      /audience/page.tsx                <- Dados demograficos (idade, genero, cidade)
      /hashtags/page.tsx                <- Hashtag Intelligence com trend
      /competitors/page.tsx             <- Benchmarking de concorrentes (CRUD)
      /calendar/page.tsx                <- Calendario editorial (CRUD mensal)
      /report/page.tsx                  <- Relatorio PDF mensal

/app/api/instagram
  /sync/route.ts                        <- Cron principal (posts + reels + snapshots + content scores)
  /sync-stories/route.ts                <- Cron stories (6h)
  /sync-audience/route.ts               <- Cron audiencia semanal (demograficos)
  /posts/route.ts                       <- GET posts (paginacao, filtros, ordenacao)
  /reels/route.ts                       <- GET reels (paginacao, filtros, ordenacao)
  /stories/route.ts                     <- GET stories (filtro active)
  /insights/route.ts                    <- GET account snapshots (filtro por days)
  /audience/route.ts                    <- GET ultimo snapshot demografico
  /hashtags/route.ts                    <- GET hashtag aggregation
  /competitors/route.ts                 <- GET/POST/DELETE concorrentes
  /calendar/route.ts                    <- GET/POST/PUT/DELETE calendario editorial
  /report/route.ts                      <- POST gera + envia relatorio mensal
  /refresh-token/route.ts               <- POST refresh do long-lived token

/lib
  meta-client.ts                        <- Wrapper Meta Graph API v21.0 (com retry/backoff)
  supabase.ts                           <- Clientes Supabase (server + browser)
  analytics.ts                          <- Funcoes puras de calculo (engagement, QEI, scores)
  auth.ts                               <- Auth centralizada (validateCronSecret, escapeHtml)
  report-generator.ts                   <- Geracao de relatorio HTML mensal
  constants.ts                          <- Constantes (API URL, pesos, cores, formatadores)
  utils.ts                              <- Utilitario cn() para classes Tailwind

/components/instagram
  OverviewKPIs.tsx                      <- Cards de KPIs com icones e delta
  PostCard.tsx                          <- Card visual de post com hover overlay
  PostGrid.tsx                          <- Grid filtravel/ordenavel com paginacao
  ReelCard.tsx                          <- Card de Reel (views, completion, engagement)
  GrowthChart.tsx                       <- AreaChart de seguidores (Recharts)
  EngagementChart.tsx                   <- BarChart de engagement semanal
  HeatmapPostingTime.tsx                <- Heatmap 7x24 (dia x hora) melhor horario
  ContentScorecard.tsx                  <- Tabela de distribuicao de scores por tier
  HashtagTable.tsx                      <- Tabela de hashtags com impacto e trend
  AudienceDemographics.tsx              <- Graficos demograficos (idade, genero, cidade)
  CompetitorTable.tsx                   <- Tabela CRUD de concorrentes
  EditorialCalendar.tsx                 <- Calendario mensal com CRUD de conteudo
  ExportButton.tsx                      <- Botao de exportacao CSV

/components/ui                          <- shadcn/ui v3 (Radix primitives)
  badge.tsx, button.tsx, card.tsx, select.tsx, separator.tsx, skeleton.tsx, table.tsx, tabs.tsx

/hooks
  useInstagramMetrics.ts                <- Hook para account snapshots
  usePostPerformance.ts                 <- Hook para posts com filtros
  useReelPerformance.ts                 <- Hook para reels com filtros

/types
  instagram.ts                          <- Tipos TypeScript para todas as entidades

/supabase/migrations
  001_initial_schema.sql                <- Schema completo (9 tabelas + indices)
```

---

## 5. Banco de Dados (Supabase)

### 5.1 Tabelas

| Tabela | Descricao | Chave unica |
|--------|-----------|-------------|
| `instagram_account_snapshots` | Snapshots diarios da conta | `date` |
| `instagram_posts` | Posts do feed (IMAGE, VIDEO, CAROUSEL_ALBUM) | `media_id` |
| `instagram_reels` | Reels com metricas de video | `media_id` |
| `instagram_stories` | Stories (expiracao 24h) | `media_id` |
| `instagram_audience_snapshots` | Demograficos semanais (JSONB) | `week_start` |
| `instagram_competitors` | Concorrentes monitorados | `username` |
| `instagram_competitor_snapshots` | Snapshots de concorrentes | `(competitor_id, date)` |
| `instagram_editorial_calendar` | Planejamento editorial | `id` |
| `app_config` | Configuracao (tokens, etc.) | `key` |

Schema completo em: `supabase/migrations/001_initial_schema.sql`

### 5.2 Indices

```sql
idx_posts_timestamp ON instagram_posts(timestamp DESC)
idx_reels_timestamp ON instagram_reels(timestamp DESC)
idx_stories_timestamp ON instagram_stories(timestamp DESC)
idx_account_snapshots_date ON instagram_account_snapshots(date DESC)
idx_competitor_snapshots_date ON instagram_competitor_snapshots(date DESC)
```

---

## 6. Meta Graph API v21.0 — Endpoints Utilizados

**IMPORTANTE**: A API mudou significativamente na v21+. Os endpoints abaixo refletem o estado atual.

| Dado | Endpoint | Notas |
|---|---|---|
| Info da conta | `GET /{user_id}?fields=followers_count,media_count` | `following_count` removido na v21+ |
| Lista de midias | `GET /{user_id}/media?fields=id,media_type,media_product_type,caption,permalink,thumbnail_url,timestamp` | Paginacao cursor-based |
| Insights de post | `GET /{media_id}/insights?metric=reach,saved,shares` + `GET /{media_id}?fields=like_count,comments_count` | `impressions` removido para midias na v22+ |
| Insights de Reel | `GET /{media_id}/insights?metric=reach,saved,shares,comments,likes,ig_reels_avg_watch_time,views` | `views` substitui `plays` desde abr/2025 |
| Stories ativos | `GET /{user_id}/stories?fields=id,timestamp` | Apenas enquanto story esta ativo |
| Insights de story | `GET /{media_id}/insights?metric=reach,impressions,exits,replies,taps_forward,taps_back` | |
| Insights da conta | `GET /{user_id}/insights?metric=reach,profile_views,website_clicks&metric_type=total_value&period=day&since=X&until=Y` | v21+ usa `metric_type=total_value` |
| Demograficos | `GET /{user_id}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=age,gender` | v21+ usa `follower_demographics` com `breakdown` |
| Cidades | `GET /{user_id}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=city` | |
| Paises | `GET /{user_id}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=country` | |

### Metricas descontinuadas (NAO usar)
- `plays` -> usar `views` (Reels)
- `impressions` -> removido da API de conta e de midias individuais
- `audience_gender_age` -> usar `follower_demographics` com `breakdown=age,gender`
- `audience_city` -> usar `follower_demographics` com `breakdown=city`
- `audience_country` -> usar `follower_demographics` com `breakdown=country`
- `following_count` -> removido na v21+
- `online_followers` -> retorna vazio na API atual

---

## 7. Cron Jobs (Vercel Cron)

```json
{
  "crons": [
    { "path": "/api/instagram/sync", "schedule": "0 11 * * *" },
    { "path": "/api/instagram/sync-stories", "schedule": "0 */6 * * *" },
    { "path": "/api/instagram/sync-audience", "schedule": "0 11 * * 1" },
    { "path": "/api/instagram/report", "schedule": "0 8 1 * *" }
  ]
}
```

| Job | Frequencia | O que faz |
|---|---|---|
| `sync` | Diario as 8h BRT (11h UTC) | Posts, Reels, insights da conta, snapshot de seguidores, recalcula content scores (batch por tier) |
| `sync-stories` | A cada 6h | Stories ativos (expiram em 24h) |
| `sync-audience` | Semanal (segunda 8h BRT) | Snapshot demografico via `follower_demographics` |
| `report` | Mensal (dia 1 as 5h BRT) | Gera relatorio HTML e envia por email via Resend |

Todos os cron jobs validam `CRON_SECRET` via `lib/auth.ts:validateCronSecret()`.

---

## 8. Calculos e Logica de Negocio

### 8.1 Engagement Rate
```
engagement_rate = (likes + comments + saves + shares) / reach x 100
```
Guard: `if (reach === 0) return 0`

### 8.2 Qualitative Engagement Index (QEI)
```
QEI = (likes x 1) + (comments x 2) + (saves x 4) + (shares x 5)
QEI_rate = QEI / reach x 100
```
Calculado em runtime no frontend (pesos ajustaveis).

### 8.3 Content Score (Tier)
Baseado no engagement_rate normalizado vs. media historica:
```
> media + 1 desvio padrao  -> VIRAL
> media                    -> GOOD
> media - 1 desvio padrao  -> AVERAGE
abaixo                     -> WEAK
```
Recalculado no sync via batch update (4 queries por tabela em vez de N).

### 8.4 Heatmap de Melhor Hora para Postar
Cruza `active_hours`/`active_days` da audiencia com `engagement_rate` historico dos posts por hora/dia.

### 8.5 Hashtag Intelligence
Agrega por hashtag: media de reach, media de engagement_rate, frequencia de uso, trend 4 semanas, impacto estimado = avg_reach x avg_engagement.

---

## 9. Seguranca

### Auth de cron jobs
- Todas as rotas POST de sync usam `lib/auth.ts:validateCronSecret()`
- Header: `Authorization: Bearer {CRON_SECRET}`
- CRON_SECRET deve ser cryptograficamente seguro (min 32 chars em producao)

### Token Meta
- Long-Lived Token (60 dias) salvo na tabela `app_config` do Supabase
- Fallback para `process.env.META_ACCESS_TOKEN` apenas no setup inicial
- Sync diario verifica expiracao (alerta se < 15 dias)
- Refresh via `POST /api/instagram/refresh-token`

### Supabase
- `SUPABASE_SERVICE_ROLE_KEY` apenas em API Routes (server-side via `createServerSupabaseClient()`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Client Components (via `createBrowserSupabaseClient()`)
- Nunca expor service role key no client

### XSS
- Report generator usa `escapeHtml()` de `lib/auth.ts` para sanitizar captions no HTML

### .gitignore
- `.env*.local` esta no `.gitignore` — secrets nunca vao para o git

---

## 10. Variaveis de Ambiente

```env
# Meta Graph API
META_ACCESS_TOKEN=        # Long-lived token (60 dias) — apenas setup inicial
META_IG_USER_ID=          # ID da conta business do Instagram
META_APP_ID=              # ID do app no Meta Developers
META_APP_SECRET=          # Secret do app (para refresh de token)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=         # URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Anon key (publica, client-side)
SUPABASE_SERVICE_ROLE_KEY=        # Service role (APENAS server-side)

# Email (Resend)
RESEND_API_KEY=           # API key do Resend para envio de emails
REPORT_RECIPIENT_EMAIL=   # Email destino do relatorio mensal

# Seguranca
CRON_SECRET=              # Secret para autenticar cron jobs (min 32 chars)
```

---

## 11. Status do Roadmap

### Fase 1 — MVP (CONCLUIDA)
- [x] Setup Meta App + Long-Lived Token
- [x] Tabelas no Supabase (9 tabelas + indices)
- [x] `meta-client.ts` com endpoints v21+ corrigidos
- [x] Cron jobs de sync (posts, reels, stories, audiencia, conta)
- [x] Overview: KPIs, graficos, top posts, heatmap, scorecard
- [x] Posts: grid com filtros, ordenacao, paginacao, export CSV
- [x] Growth: historico de seguidores com seletor de periodo

### Fase 2 — Analytics Avancado (CONCLUIDA)
- [x] Reels Analytics (views, completion rate, engagement)
- [x] Content Scorecard (tier automatico VIRAL/GOOD/AVERAGE/WEAK)
- [x] Heatmap de melhor horario para postar (7x24)
- [x] QEI exibido no overview e nos cards

### Fase 3 — Inteligencia de Conteudo (CONCLUIDA)
- [x] Hashtag Intelligence (aggregacao, trend, impacto)
- [x] Audiencia Demografica (idade, genero, cidade, pais)
- [x] Stories Analytics historico

### Fase 4 — Estrategico (CONCLUIDA)
- [x] Benchmarking de Concorrentes (CRUD + tabela)
- [x] Relatorio PDF automatico mensal (Resend)
- [x] Alertas de anomalia (integrado no sync)

### Fase 5 — Operacional (CONCLUIDA)
- [x] Calendario Editorial integrado (CRUD mensal)
- [x] Exportacao de dados (CSV — posts, reels, hashtags)

### Proximos passos
- [ ] Deploy no Vercel + configuracao de cron jobs em producao
- [ ] Autenticacao de usuario (Supabase Auth) para proteger o dashboard
- [ ] Inteligencia automatica (insights, recomendacoes, AI summary)
- [ ] Dark mode toggle
- [ ] Testes unitarios para analytics.ts e meta-client.ts

---

## 12. Decisoes Tecnicas Importantes

1. **shadcn/ui v3 (Radix)**: O projeto usa shadcn/ui compativel com Tailwind CSS v3 e Radix primitives. A versao 4 (base-ui) NAO e compativel com Next.js 14.
2. **Meta API v21+**: Metricas de conta usam `metric_type=total_value`. Demograficos usam `follower_demographics` com `breakdown`. `impressions` foi removido.
3. **Batch content scores**: Recalculo de content scores usa batch update por tier (4 queries) em vez de update individual por post (N queries).
4. **Auth centralizada**: `lib/auth.ts` centraliza validacao de CRON_SECRET e sanitizacao HTML.
5. **Error boundaries**: `app/dashboard/instagram/error.tsx` captura erros de rendering em todas as sub-paginas.
6. **QEI no frontend**: QEI e calculado em runtime no frontend para permitir ajuste futuro de pesos sem reprocessar dados.
