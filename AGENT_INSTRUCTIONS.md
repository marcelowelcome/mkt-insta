# AGENT_INSTRUCTIONS.md — DashIG
> Instrucoes operacionais para agentes de IA que trabalham neste projeto

---

## 1. Contexto rapido

Voce esta desenvolvendo o **DashIG**, um dashboard de analytics e geracao de campanhas de Instagram para a **Welcome Weddings** (@welcomeweddings). Antes de comecar qualquer tarefa, leia o `ARCHITECTURE.md` (estrutura tecnica) e o `PROMPT_CONTEXT.md` (dominio de negocio).

**Stack**: Next.js 14 · TypeScript · Supabase (PostgreSQL + pgvector) · Tailwind CSS · shadcn/ui (v3/Radix) · Recharts · Meta Graph API v21.0 · Vercel · OpenAI Embeddings · Anthropic Claude API

**Estado atual**:
- Fases 1–5 (Analytics) completamente implementadas com dados reais da @welcomeweddings
- Campaign Studio em desenvolvimento (Fases A–D)

---

## 2. Como iniciar uma sessao de desenvolvimento

### 2.1 Checklist de onboarding
- [ ] Leu o `ARCHITECTURE.md`?
- [ ] Leu o `PROMPT_CONTEXT.md`?
- [ ] Qual feature ou bug sera trabalhado?
- [ ] E Analytics (existente) ou Campaign Studio (novo)?
- [ ] O dev server esta rodando? (`npm run dev -- -p 3001`)
- [ ] Se erro de cache: `rm -rf .next && npm run dev`

### 2.2 Perguntas antes de codar
1. "Este e um Server Component ou Client Component?"
2. "Os dados ja existem no Supabase ou preciso rodar sync?"
3. "Este endpoint e chamado pelo dashboard, pelo cron job ou pelo Campaign Studio?"
4. "Se Campaign Studio: o pgvector esta habilitado e a migration 006 foi executada?"
5. "Qual e o comportamento esperado quando os dados estao vazios?"

---

## 3. Regras de desenvolvimento — Analytics (OBRIGATORIAS)

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
- **following_count removido**: nao existe na v21+.
- **navigation**: substitui exits/taps_forward/taps_back nos Stories (v22+).

### 3.4 Componentes React
- Graficos (Recharts) sempre em Client Components com `'use client'`.
- Sempre implementar: loading (skeleton), erro (mensagem amigavel), vazio (empty state).
- Todos os calculos em `lib/analytics.ts`, nunca inline.

### 3.5 Auth de cron jobs
- Usar `validateCronSecret()` de `lib/auth.ts` em TODAS as rotas de sync e knowledge.
- Nunca duplicar a logica — sempre usar o helper centralizado.

### 3.6 HTML/XSS
- Ao inserir dados do usuario em HTML, usar `escapeHtml()` de `lib/auth.ts`.

---

## 4. Regras de desenvolvimento — Campaign Studio (OBRIGATORIAS)

### 4.1 RAG e Embeddings

**Model**: sempre `text-embedding-3-small` da OpenAI (1536 dimensoes).

```typescript
// /lib/rag/embeddings.ts
import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' '),
  })
  return response.data[0].embedding
}

// Para lotes (max 100 por request)
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const batches = chunkArray(texts, 100)
  const results: number[][] = []
  for (const batch of batches) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch.map(t => t.replace(/\n/g, ' '))
    })
    results.push(...response.data.map(d => d.embedding))
    await new Promise(r => setTimeout(r, 200)) // rate limit
  }
  return results
}
```

**Chunking**: sempre com overlap para nao perder contexto entre chunks.
- maxTokens: 512, overlap: 64
- Nunca cortar no meio de uma frase — preferir paragrafos ou pontos finais

**Vector search**: sempre via funcao SQL `search_knowledge()` — nunca calculo de distancia no TypeScript.

```typescript
// /lib/rag/vector-search.ts
export async function vectorSearch(
  queryEmbedding: number[],
  options: { threshold?: number; limit?: number } = {}
): Promise<SearchResult[]> {
  const { threshold = 0.70, limit = 8 } = options
  const { data, error } = await supabase.rpc('search_knowledge', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit
  })
  if (error) throw new Error(`Vector search failed: ${error.message}`)
  return data
}
```

**Re-indexacao**: deletar o documento pai (CASCADE limpa chunks automaticamente) antes de re-indexar.

**Embeddings sao server-only**: `OPENAI_API_KEY` nunca no client. Embeddings apenas em API Routes.

### 4.2 Geracao com Claude

**Modelo**: `claude-sonnet-4-20250514` — melhor relacao custo/velocidade para geracao de campanhas com streaming.

**Streaming obrigatorio**: geracao leva 30–60s. Sem streaming = tela em branco.

```typescript
// /app/api/campaigns/generate/route.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const stream = anthropic.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 8000,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }]
})

const readable = new ReadableStream({
  async start(controller) {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        controller.enqueue(new TextEncoder().encode(event.delta.text))
      }
    }
    const message = await stream.finalMessage()
    const campaignJSON = extractJSON(message.content[0].text)
    await persistCampaign(campaignId, campaignJSON)
    controller.close()
  }
})
```

**Parser de JSON**: o Claude pode retornar com whitespace variavel. Sempre extrair e validar.

```typescript
// /lib/campaign/campaign-parser.ts
export function extractJSON(text: string): CampaignOutput {
  const clean = text.replace(/```json\n?|\n?```/g, '').trim()
  try {
    const parsed = JSON.parse(clean)
    return validateCampaignSchema(parsed)
  } catch (err) {
    throw new Error(`Failed to parse campaign JSON: ${err}`)
  }
}

export function validateCampaignSchema(data: unknown): CampaignOutput {
  // Verificar campos obrigatorios
  // Retornar com defaults para campos opcionais ausentes
  // NUNCA deixar o sistema quebrar por campo opcional faltando
}
```

### 4.3 Edicao nao-destrutiva (CRITICO)

```typescript
// CORRETO — preserva original, salva edicao separada
await supabase.from('campaign_posts')
  .update({ caption_edited: newCaption, updated_at: new Date().toISOString() })
  .eq('id', postId)

// ERRADO — perde o output original da IA
await supabase.from('campaign_posts')
  .update({ caption: newCaption })
  .eq('id', postId)
```

No editor, sempre exibir `caption_edited ?? caption`. Se ha edicao, mostrar badge "Editado".

### 4.4 Agendamento

Ao agendar uma campanha aprovada, mapear `campaign_posts` -> `instagram_editorial_calendar`:

```typescript
// /app/api/campaigns/[id]/schedule/route.ts
const approvedPosts = campaignPosts.filter(p => p.status === 'APPROVED')

for (const post of approvedPosts) {
  const { data: calEntry } = await supabase
    .from('instagram_editorial_calendar')
    .insert({
      scheduled_for: post.scheduled_for,
      content_type: post.format,
      caption_draft: post.caption_edited ?? post.caption,
      hashtags_plan: post.hashtags_edited ?? post.hashtags,
      notes: [post.cta, post.visual_brief, post.visual_notes].filter(Boolean).join('\n\n'),
      status: 'APPROVED'
    })
    .select().single()

  // Vincula de volta ao campaign_post
  await supabase.from('campaign_posts')
    .update({ calendar_entry_id: calEntry.id })
    .eq('id', post.id)
}

// Atualiza status da campanha
await supabase.from('instagram_campaigns')
  .update({ status: 'SCHEDULED' })
  .eq('id', campaignId)
```

### 4.5 Status de campanha

A campanha so muda para `APPROVED` quando todos os posts tem status `APPROVED`.
Implementar essa verificacao automaticamente ao aprovar o ultimo post.

---

## 5. Padroes de UI

### 5.1 Design system
- **shadcn/ui v3** (Radix primitives) — NAO usar v4 (base-ui, incompativel com Tailwind v3).
- **Tailwind CSS v3** — sem CSS modules, sem styled-components.
- Cards: `border-0 shadow-sm hover:shadow-md transition-all`
- Paleta Content Score:
  - VIRAL: `text-orange-500` / `bg-orange-50`
  - GOOD: `text-green-600` / `bg-green-50`
  - AVERAGE: `text-yellow-600` / `bg-yellow-50`
  - WEAK: `text-red-500` / `bg-red-50`
- Status de campanha/post:
  - DRAFT / PENDING: `text-gray-500` / `bg-gray-50`
  - GENERATING: `text-blue-500` / `bg-blue-50` (com spinner)
  - REVIEW: `text-purple-600` / `bg-purple-50`
  - APPROVED / GOOD: `text-green-600` / `bg-green-50`
  - SCHEDULED: `text-indigo-600` / `bg-indigo-50`
  - REVISION_REQUESTED: `text-yellow-600` / `bg-yellow-50`

### 5.2 Graficos (Recharts)
- Sempre `ResponsiveContainer width="100%" height="100%"`
- Cores: `#4F46E5` (indigo), `#06B6D4` (cyan)
- Tooltips em portugues com `contentStyle` customizado
- Gradientes via `<defs><linearGradient>`

### 5.3 Tabelas
- Usar `Table` do shadcn/ui com `rounded-lg border overflow-hidden`
- Headers com `bg-muted/30`
- Ordenacao por coluna clicavel

### 5.4 Streaming UX
- Exibir texto sendo gerado em tempo real (nao bloquear tela)
- Mostrar as 3 fontes de contexto carregadas (chunks encontrados, dados do perfil, boas praticas)
- Barra de progresso estimada
- Botao de cancelar disponivel durante a geracao

---

## 6. Modulos e responsabilidades

### 6.1 Analytics (existentes)

**`/api/instagram/sync` — Cron Principal**
1. Valida CRON_SECRET via `validateCronSecret()`
2. Busca token de `app_config`, verifica expiracao
3. Busca account info + account insights
4. Busca media list (paginacao cursor, limite configuravel via `?limit=`)
5. Para cada midia: busca insights, classifica Reel vs Post
6. Upsert em `instagram_posts` ou `instagram_reels`
7. Recalcula content scores em **batch por tier** (4 queries)

**`/api/instagram/sync-stories` — Cron de Stories**
1. Valida CRON_SECRET
2. Busca stories ativos com `media_type, media_url, thumbnail_url, permalink`
3. Para cada story: busca insights (reach, replies, navigation, follows, shares, etc.)
4. Persiste thumbnail no Supabase Storage (`thumbs/{media_id}.jpg`)
5. Persiste video no Storage (`videos/{media_id}.mp4`) se `media_type === 'VIDEO'`
6. Upsert com `stored_media_url` e `stored_video_url`

**`meta-client.ts`**
```typescript
getAccountInfo(token, userId?)
getMediaList(token, userId, maxItems?)
getMediaInsights(token, mediaId, type)
getAccountInsights(token, userId)
getActiveStories(token, userId)
getStoryInsights(token, mediaId)
getAudienceInsights(token, userId)
refreshLongLivedToken(token)
getAccessToken()
checkTokenExpiration()
saveToken(token, expiresAt)
```

**`analytics.ts`**
```typescript
calcEngagementRate(likes, comments, saves, shares, reach)
calcQEI(likes, comments, saves, shares, reach)
calcContentScore(engagementRate, mean, stdDev)
calcMeanAndStdDev(values)
calcCompletionRate(avgWatchTime, duration)
extractHashtags(caption)
formatNumber(n)     // pt-BR
formatPercent(n)    // pt-BR
```

### 6.2 Campaign Studio (novos)

**`/api/campaigns/generate`**
1. Valida CRON_SECRET (mesmo mecanismo — campanhas so podem ser geradas internamente)
2. Cria rascunho com status `GENERATING` em `instagram_campaigns`
3. Chama `prompt-builder.ts` (vector search + metrics query + system prompt)
4. Chama Claude API com streaming
5. Retorna ReadableStream para o cliente
6. Ao finalizar: `campaign-parser.ts` valida + `saveCampaignPosts()`

**`/api/campaigns/[id]/schedule`**
1. Verifica que todos os posts estao `APPROVED`
2. Mapeia cada post para `instagram_editorial_calendar`
3. Vincula `campaign_post.calendar_entry_id`
4. Atualiza `instagram_campaigns.status` para `SCHEDULED`

**`prompt-builder.ts`**
Monta o prompt com 3 camadas:
1. Vector search: `generateEmbedding(theme + objective + audience)` -> `vectorSearch({threshold: 0.70, limit: 8})`
2. Metrics: `getTopPostsByScore(10)` + `getLatestAudienceSnapshot()` + `getTopHashtags(20)` + `getBestSlots(5)`
3. System prompt com boas praticas

**`/api/knowledge/ingest`**
1. Valida CRON_SECRET
2. Recebe PDF via multipart/form-data
3. Extrai texto com `pdf-parser.ts`
4. Chunkea com `chunker.ts` (512 tokens, overlap 64)
5. Gera embeddings em lotes de 100
6. Upsert em `document_chunks`

**`/api/knowledge/scrape`**
1. Valida CRON_SECRET
2. Scrapa paginas configuradas do site da Welcome Weddings
3. Extrai conteudo relevante (sem nav/footer/scripts)
4. Chunkea + embeddings
5. Upsert por URL + chunk_index

---

## 7. Como retomar o desenvolvimento

### 7.1 Analytics (ja funcionando)
```bash
1. npm install
2. Verificar .env.local (Meta + Supabase + CRON_SECRET)
3. npm run dev -- -p 3001
4. Se erro de cache: rm -rf .next && npm run dev
5. Se banco vazio: curl -X POST http://localhost:3001/api/instagram/sync \
   -H "Authorization: Bearer {CRON_SECRET}"
6. Acessar http://localhost:3001/dashboard/instagram
```

### 7.2 Campaign Studio (setup inicial)
```bash
1. Habilitar pgvector no Supabase: CREATE EXTENSION IF NOT EXISTS vector;
2. Executar migration 006_campaign_studio.sql
3. Adicionar ao .env.local:
   OPENAI_API_KEY=
   ANTHROPIC_API_KEY=
   WELCOME_WEDDINGS_SITE_URL=https://www.welcomeweddings.com.br
4. Verificar se pg_cron dashig-knowledge-scrape foi criado
5. Fazer upload dos primeiros PDFs via /knowledge
6. Testar busca vetorial com uma query real
7. Testar geracao de campanha completa
```

---

## 8. Erros comuns — evite

| Erro | Como evitar |
|---|---|
| `Cannot find module './682.js'` | `rm -rf .next && npm run dev` |
| shadcn/ui v4 incompativel | Usar apenas componentes v3 (Radix). Nunca `@base-ui/react` |
| `following_count` nao existe | Removido na v21+. Usar apenas `followers_count, media_count` |
| `impressions` erro na API | Removido para conta e midias. Nao usar |
| `audience_gender_age` erro | Usar `follower_demographics` com `breakdown=age,gender` |
| `plays` em vez de `views` | Reels usam `views` desde abr/2025 |
| Token expirado | Verificar `app_config`. Refresh via `/api/instagram/refresh-token` |
| N+1 queries | Batch queries (ver content scores, competitors como exemplo) |
| XSS no report | Usar `escapeHtml()` de `lib/auth.ts` |
| Embeddings no client-side | `OPENAI_API_KEY` e server-only. Embeddings apenas em API Routes |
| `caption` sobrescrito ao editar | Usar `caption_edited` — nunca alterar `caption` original |
| Parser quebrar com campo ausente | `validateCampaignSchema()` com defaults para todos os campos opcionais |
| Chunks sem overlap | Usar overlap de 64 tokens para nao perder contexto |
| Re-indexar sem limpar chunks antigos | Deletar documento pai (CASCADE limpa chunks) |
| Campanha sem system prompt | System prompt com boas praticas e obrigatorio em toda geracao |
| Streaming sem tratamento de erro | Implementar try/catch e UI de retry na tela de geracao |
| Agendar posts nao aprovados | `/api/campaigns/[id]/schedule` deve filtrar apenas `status === 'APPROVED'` |

---

## 9. Checklist antes de finalizar uma tarefa

**Geral:**
- [ ] `npx tsc --noEmit` sem erros?
- [ ] `npm run build` sem erros?
- [ ] Todos os estados (loading, erro, vazio) implementados?
- [ ] Dados sensiveis apenas server-side?
- [ ] Calculos em `analytics.ts`, nao inline?
- [ ] Upsert com `ON CONFLICT DO UPDATE`?
- [ ] Graficos com `ResponsiveContainer`?
- [ ] Numeros formatados em pt-BR?
- [ ] Auth via `validateCronSecret()` (se rota de sync/knowledge)?
- [ ] HTML sanitizado com `escapeHtml()` (se aplicavel)?

**Campaign Studio (adicional):**
- [ ] pgvector habilitado e migration 006 executada?
- [ ] Embeddings gerados apenas server-side?
- [ ] Modelo `claude-sonnet-4-20250514` sendo usado?
- [ ] System prompt com boas praticas enviado?
- [ ] Streaming com tratamento de erro implementado?
- [ ] Parser com validacao de schema completa?
- [ ] Edicoes em `caption_edited`, nao em `caption`?
- [ ] Agendamento filtrando apenas posts `APPROVED`?
- [ ] `calendar_entry_id` vinculado apos agendamento?

---

## 10. Referencias rapidas

- Meta Graph API v21+: https://developers.facebook.com/docs/instagram-api
- Permissoes: `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`
- Supabase JS v2: https://supabase.com/docs/reference/javascript
- Supabase pgvector: https://supabase.com/docs/guides/ai/vector-columns
- shadcn/ui v3: https://v0.dev/docs (Radix-based)
- Recharts: https://recharts.org/en-US/api
- Resend: https://resend.com/docs/api-reference
- Vercel Cron: https://vercel.com/docs/cron-jobs
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- Anthropic Streaming: https://docs.anthropic.com/en/api/messages-streaming
- text-embedding-3-small: 1536 dims, melhor custo-beneficio para RAG em portugues
