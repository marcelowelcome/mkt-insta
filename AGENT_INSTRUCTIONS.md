# AGENT_INSTRUCTIONS.md — DashIG
> Instrucoes operacionais para agentes de IA que trabalham neste projeto

---

## 1. Contexto rapido

Voce esta desenvolvendo o **DashIG**, um dashboard de analytics de Instagram para a **Welcome Weddings** (@welcomeweddings). Antes de comecar qualquer tarefa, leia o `ARCHITECTURE.md` (estrutura tecnica) e o `PROMPT_CONTEXT.md` (dominio de negocio).

**Stack**: Next.js 14 · TypeScript · Supabase · Tailwind CSS · shadcn/ui (v3/Radix) · Recharts · Meta Graph API v21.0 · Vercel

**Estado atual**: Todas as 5 fases do roadmap estao implementadas. O sistema esta funcional com dados reais da @welcomeweddings.

---

## 2. Como iniciar uma sessao de desenvolvimento

### 2.1 Checklist de onboarding
- [ ] Leu o `ARCHITECTURE.md`?
- [ ] Leu o `PROMPT_CONTEXT.md`?
- [ ] Qual feature ou bug sera trabalhado?
- [ ] O dev server esta rodando? (`npm run dev -- -p 3001`)
- [ ] Se houver erro de cache: `rm -rf .next && npm run dev`

### 2.2 Perguntas antes de codar
1. "Este e um Server Component ou Client Component?"
2. "Os dados ja existem no Supabase ou preciso rodar sync?"
3. "Este endpoint e chamado pelo dashboard ou pelo cron job?"
4. "Qual e o comportamento esperado quando os dados estao vazios?"

---

## 3. Regras de desenvolvimento (OBRIGATORIAS)

### 3.1 TypeScript
- **Sempre** usar TypeScript. Sem `any` — use `unknown` e type guards.
- Todos os tipos estao em `/types/instagram.ts`. Verificar antes de criar novos.

### 3.2 Supabase
- **Nunca** usar `SUPABASE_SERVICE_ROLE_KEY` em componentes client-side.
- Server: `createServerSupabaseClient()` de `@/lib/supabase`
- Browser: `createBrowserSupabaseClient()` de `@/lib/supabase`
- **Sempre** upsert com `ON CONFLICT DO UPDATE` — nunca delete + insert.
- **Sempre** verificar `error` antes de usar `data`.

### 3.3 Meta Graph API v21+
- Toda chamada via `meta-client.ts` — nunca fetch direto.
- Rate limits com retry/backoff exponencial (ja implementado).
- Token de `app_config` no Supabase (fallback env apenas setup inicial).
- **Views > Plays**: nos Reels, sempre `views`.
- **follower_demographics com breakdown**: demograficos usam `breakdown=age,gender` etc.
- **metric_type=total_value**: insights de conta usam este formato.
- **impressions removido**: nao usar impressions para conta ou midias individuais.

### 3.4 Componentes React
- Graficos (Recharts) sempre em Client Components com `'use client'`.
- Sempre implementar: loading (skeleton), erro (mensagem), vazio (empty state).
- Todos os calculos em `lib/analytics.ts`, nunca inline.

### 3.5 Autenticacao de cron jobs
- Usar `validateCronSecret()` de `lib/auth.ts` em TODAS as rotas de sync.
- Nunca duplicar a logica de validacao — sempre usar o helper centralizado.

### 3.6 HTML/XSS
- Ao inserir dados do usuario em HTML, usar `escapeHtml()` de `lib/auth.ts`.

---

## 4. Padroes de UI

### 4.1 Design system
- **shadcn/ui v3** (Radix primitives) — NAO usar v4 (base-ui, incompativel com Tailwind v3).
- **Tailwind CSS v3** — sem CSS modules, sem styled-components.
- Cards: `border-0 shadow-sm hover:shadow-md transition-all`
- Paleta Content Score:
  - VIRAL: `text-orange-500` / `bg-orange-50`
  - GOOD: `text-green-600` / `bg-green-50`
  - AVERAGE: `text-yellow-600` / `bg-yellow-50`
  - WEAK: `text-red-500` / `bg-red-50`

### 4.2 Graficos (Recharts)
- Sempre `ResponsiveContainer width="100%" height="100%"`
- Cores: `#4F46E5` (indigo), `#06B6D4` (cyan)
- Tooltips em portugues com `contentStyle` customizado
- Gradientes via `<defs><linearGradient>`

### 4.3 Tabelas
- Usar `Table` do shadcn/ui com `rounded-lg border overflow-hidden`
- Headers com `bg-muted/30`
- Ordenacao por coluna clicavel

---

## 5. Modulos e responsabilidades

### 5.1 `/api/instagram/sync` — Cron Principal
1. Valida CRON_SECRET via `validateCronSecret()`
2. Busca token de `app_config`, verifica expiracao
3. Busca account info + account insights
4. Busca media list (paginacao cursor, limite configuravel via `?limit=`)
5. Para cada midia: busca insights, classifica Reel vs Post
6. Upsert em `instagram_posts` ou `instagram_reels`
7. Recalcula content scores em **batch por tier** (4 queries)

### 5.2 `/api/instagram/sync-stories` — Cron de Stories
1. Valida CRON_SECRET
2. Busca stories ativos com `media_type, media_url, thumbnail_url, permalink`
3. Para cada story: busca insights (reach, replies, navigation, follows, shares, etc.)
4. Persiste thumbnail no Supabase Storage (`thumbs/{media_id}.jpg`) — para videos usa `thumbnail_url`
5. Persiste video no Storage (`videos/{media_id}.mp4`) se `media_type === 'VIDEO'`
6. Upsert com `stored_media_url` e `stored_video_url` (URLs permanentes)

### 5.3 `meta-client.ts` — Wrapper da Graph API v21+
```typescript
getAccountInfo(token, userId?)           -> AccountInfo
getMediaList(token, userId, maxItems?)   -> MediaItem[]
getMediaInsights(token, mediaId, type)   -> MediaInsights
getAccountInsights(token, userId)        -> AccountInsights
getActiveStories(token, userId)          -> StoryItem[]  // inclui media_url, thumbnail_url
getStoryInsights(token, mediaId)         -> StoryInsights // reach, replies, navigation, follows, shares
getAudienceInsights(token, userId)       -> AudienceInsights  // follower_demographics com breakdowns
refreshLongLivedToken(token)             -> { token, expiresAt }
getAccessToken()                         -> string
checkTokenExpiration()                   -> { isExpiring, daysLeft }
saveToken(token, expiresAt)              -> void
```

### 5.4 `storage.ts` — Persistencia de Media
```typescript
persistStoryMedia(imageUrl, mediaId)     -> string | null  // URL publica do thumb
persistStoryVideo(videoUrl, mediaId)     -> string | null  // URL publica do video
```

### 5.5 `analytics.ts` — Funcoes Puras
```typescript
calcEngagementRate(likes, comments, saves, shares, reach) -> number
calcQEI(likes, comments, saves, shares, reach)            -> number
calcContentScore(engagementRate, mean, stdDev)             -> ContentScore
calcMeanAndStdDev(values)                                  -> { mean, stdDev }
calcCompletionRate(avgWatchTime, duration)                 -> number | null
extractHashtags(caption)                                   -> string[]
formatNumber(n)                                            -> string  // pt-BR
formatPercent(n)                                           -> string  // pt-BR
```

---

## 6. Sequencia para retomar desenvolvimento

Se voce esta retomando o projeto:

```
1. npm install (se necessario)
2. Verificar .env.local (credenciais Meta + Supabase + CRON_SECRET)
3. npm run dev -- -p 3001
4. Se erro de cache: rm -rf .next && npm run dev
5. Verificar dados no Supabase (instagram_posts, instagram_reels devem ter registros)
6. Se banco vazio: curl -X POST http://localhost:3001/api/instagram/sync -H "Authorization: Bearer {CRON_SECRET}"
7. Acessar http://localhost:3001/dashboard/instagram
```

---

## 7. Erros comuns — evite

| Erro | Como evitar |
|---|---|
| `Cannot find module './682.js'` | Limpar cache: `rm -rf .next && npm run dev` |
| shadcn/ui v4 incompativel | Usar apenas componentes v3 (Radix). Nunca `@base-ui/react` |
| `following_count` nao existe | Removido na API v21+. Usar apenas `followers_count, media_count` |
| `impressions` erro na API | Removido para conta e midias. Nao usar |
| `audience_gender_age` erro | Usar `follower_demographics` com `breakdown=age,gender` |
| Token expirado | Verificar `app_config` no Supabase. Refresh via `/api/instagram/refresh-token` |
| N+1 queries | Usar batch queries (ver competitors, content scores como exemplo) |
| XSS no report | Usar `escapeHtml()` de `lib/auth.ts` |

---

## 8. Checklist antes de finalizar uma tarefa

- [ ] `npx tsc --noEmit` sem erros?
- [ ] `npm run build` sem erros?
- [ ] Todos os estados (loading, erro, vazio) implementados?
- [ ] Dados sensiveis apenas server-side?
- [ ] Calculos em `analytics.ts`, nao inline?
- [ ] Upsert com `ON CONFLICT DO UPDATE`?
- [ ] Graficos com `ResponsiveContainer`?
- [ ] Numeros formatados em pt-BR?
- [ ] Auth via `validateCronSecret()` (se cron route)?
- [ ] HTML sanitizado com `escapeHtml()` (se aplicavel)?

---

## 9. Referencias rapidas

- Meta Graph API v21+: https://developers.facebook.com/docs/instagram-api
- Permissoes: `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`
- Supabase JS v2: https://supabase.com/docs/reference/javascript
- shadcn/ui (v3): https://v0.dev/docs (referencia para componentes Radix-based)
- Recharts: https://recharts.org/en-US/api
- Resend: https://resend.com/docs/api-reference
- Vercel Cron: https://vercel.com/docs/cron-jobs
