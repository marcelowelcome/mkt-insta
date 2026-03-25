# PROMPT_CONTEXT.md — DashIG
> Contexto de negocio e produto para sessoes de desenvolvimento com agentes de IA

---

## 1. Quem e o cliente deste projeto

**Welcome Weddings** faz parte do Welcome Group, com sede em Curitiba (PR). O grupo inclui a Welcome Trips (viagens B2C) e a Welcome Weddings (casamentos no exterior / destination weddings).

O Instagram da Welcome Weddings (@welcomeweddings) e um canal estrategico de geracao de leads e construcao de marca. A equipe de marketing precisa de visibilidade real sobre o que funciona e de uma ferramenta que acelere a producao de campanhas com qualidade e embasamento nos dados reais do perfil.

**Conta monitorada**: `@welcomeweddings` (Welcome Weddings | Destination Weddings)
**IG User ID**: `17841402369678583`
**Seguidores**: ~34.700 (marco/2026)
**URL producao**: https://mkt-insta.vercel.app
**Repositorio**: https://github.com/marcelowelcome/mkt-insta

---

## 2. O que e o DashIG

DashIG e um dashboard interno com dois modulos principais:

### 2.1 Analytics (implementado — fases 1 a 5 concluidas)
Resolve tres problemas concretos:
1. **Historico limitado**: Instagram nativo guarda 90 dias. DashIG guarda indefinidamente via Supabase.
2. **Falta de inteligencia**: Insights nativo nao calcula scores, nao sugere horarios, nao classifica conteudo.
3. **Sem visao comparativa**: Sem benchmarking de concorrentes nem comparativo entre formatos.

### 2.2 Campaign Studio (implementado — fases A a D concluidas)
Resolve o problema de producao de campanhas:
- Time gasta horas planejando campanhas manualmente, sem acesso facil ao historico de performance
- Output e generico — nao reflete o que realmente funciona no perfil da Welcome Weddings
- Campaign Studio entrega uma campanha estruturada e embasada em dados em minutos
- O analista foca em revisar e refinar, nao em criar do zero

---

## 3. Usuarios do sistema

| Perfil | Necessidade |
|---|---|
| Gestor de Marketing (Marcelo) | Visao executiva de performance mensal, tendencias, benchmarks e aprovacao de campanhas |
| Social Media / Analista | Operacional: posts que performaram, melhores horarios, hashtags, revisao e edicao de campanhas |
| Designer | Recebe briefs de imagem dos posts aprovados para producao de assets |
| Diretoria | Relatorio mensal consolidado (PDF automatico por email) |

---

## 4. Conceitos de dominio — Analytics

### 4.1 Metricas principais

| Termo | Definicao |
|---|---|
| **Reach** | Numero unico de contas que viram o conteudo |
| **Engagement Rate** | (likes + comments + saves + shares) / reach x 100 |
| **QEI** | Qualitative Engagement Index: saves (x4) e shares (x5) valem mais que likes (x1) |
| **Completion Rate** | % do Reel assistido ate o fim (avg_watch_time / duration) |
| **Views** | Metrica base de Reels desde abril/2025 — substitui Plays |
| **Navigation** | Acoes em Stories (substitui taps_forward/taps_back/exits na v22+) |
| **Content Score** | Tier calculado (VIRAL / GOOD / AVERAGE / WEAK) baseado em desvio padrao do engagement |
| **Sends per Reach** | Compartilhamentos via DM / reach — sinal mais forte do algoritmo em 2025/2026 |

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
| Carrossel | `CAROUSEL_ALBUM` | Reach alto por swipes, otimo para saves |
| Video feed | `VIDEO` | Pouco usado, substituido por Reels |
| Reel | `VIDEO` (media_product_type=REELS) | Views e completion rate sao as metricas chave |
| Story | Endpoint separado | Expira em 24h. Thumbnails e videos persistidos no Supabase Storage |

---

## 5. Conceitos de dominio — Campaign Studio

### 5.1 O que e uma campanha

Uma campanha no DashIG e um conjunto estruturado de posts para o Instagram, gerado pela IA com base em tres camadas de contexto e revisado pelo time de marketing antes de ser agendado.

Cada campanha contem:
- Sumario estrategico e racional de por que aquela estrutura faz sentido
- Posts individuais com caption, hashtags, CTA, brief de imagem e nota estrategica
- Datas e horarios sugeridos com base no historico de performance do perfil
- Formato escolhido com base nos dados (Reel, Carrossel, Imagem, Story)

### 5.2 Fontes de contexto da IA

| Camada | Fonte | Conteudo |
|---|---|---|
| **Marca e negocio** | PDFs indexados + site scraping | Playbook comercial, tom de voz, destinos, pacotes, depoimentos, diferenciais |
| **Performance do perfil** | Supabase (dados reais) | Top posts por score, melhores horarios, hashtags mais eficazes, demograficos da audiencia |
| **Boas praticas** | System prompt (atualizado periodicamente) | Algoritmo do Instagram 2025/2026, estrutura de copy, timing, frequencia |

### 5.3 Documentos indexados na Knowledge Base

| Documento | O que a IA extrai |
|---|---|
| Playbook comercial | Argumentos de venda, objecoes, diferenciais, perfil de cliente ideal |
| Roteiro de vendas / SDR | Tom de abordagem, linguagem com o cliente |
| Materiais de marca | Tom de voz, valores, o que a marca e e nao e, exemplos de copy aprovado |
| Identidade visual | Referencias de estilo para os briefs de imagem |
| Site welcomeweddings.com.br | Destinos, pacotes, historia, depoimentos, diferenciais (re-indexado semanalmente) |

### 5.4 Fluxo de revisao e agendamento

```
1. Gestor preenche briefing (tema, objetivo, publico, duracao)
      |
2. IA gera campanha com streaming (30-60s)
      |
3. Analista revisa no Campaign Editor
   - Edita captions, hashtags, CTAs
   - Valida e ajusta briefs de imagem
   - Aprova ou solicita revisao post a post
      |
4. Posts aprovados -> Designer recebe briefs de imagem
      |
5. Com assets em maos, analista agenda a campanha
      |
6. Posts fluem para o Calendario Editorial existente
      |
7. Time publica manualmente seguindo o calendario
```

**Importante**: a IA gera um ponto de partida qualificado — o analista tem controle total. Nenhum post e publicado automaticamente.

### 5.5 Terminologia do Campaign Studio

| Termo | Definicao |
|---|---|
| **Knowledge Base** | Conjunto de documentos indexados que alimentam o RAG |
| **Chunk** | Fragmento de texto de ~512 tokens extraido de um documento |
| **Embedding** | Representacao vetorial de um chunk para busca por similaridade |
| **RAG** | Retrieval-Augmented Generation — enriquece o prompt com contexto recuperado |
| **Vector Search** | Busca os chunks mais relevantes para o tema da campanha |
| **Brief de imagem** | Descricao textual detalhada do conceito visual para orientar o designer |
| **Edicao nao-destrutiva** | Editar `caption_edited` sem sobrescrever `caption` (output original preservado) |
| **Campaign Editor** | Interface de revisao e edicao da campanha gerada |
| **Agendamento** | Envio dos posts aprovados para o Calendario Editorial do DashIG |

---

## 6. Infraestrutura

### 6.1 Servicos

| Componente | Servico |
|---|---|
| Frontend + API | Vercel (https://mkt-insta.vercel.app) |
| Banco de dados | Supabase PostgreSQL + pgvector |
| Cron jobs | Supabase pg_cron + pg_net (chama endpoints do Vercel) |
| Storage | Supabase Storage (bucket `story-media`) |
| Email | Resend |
| Embeddings | OpenAI text-embedding-3-small (server-only) |
| Geracao de campanhas | Anthropic Claude claude-opus-4-5 (server-only) |

### 6.2 Cron jobs (pg_cron)

| Job | Schedule | Endpoint |
|---|---|---|
| `dashig-sync-daily` | `0 11 * * *` (8h BRT) | POST /api/instagram/sync |
| `dashig-sync-stories` | `0 14 * * *` (11h BRT) | POST /api/instagram/sync-stories |
| `dashig-sync-audience` | `0 11 * * 1` (seg 8h BRT) | POST /api/instagram/sync-audience |
| `dashig-report-monthly` | `0 8 1 * *` (dia 1, 5h BRT) | POST /api/instagram/report |
| `dashig-knowledge-scrape` | `0 6 * * 1` (seg 6h BRT) | POST /api/knowledge/scrape |

---

## 7. Regras de negocio criticas

1. **Nunca deletar dados historicos** — apenas upsert (ON CONFLICT DO UPDATE).
2. **Stories persistidos** — thumbnails e videos salvos no Supabase Storage (bucket `story-media`). Sobrevivem a expiracao de 24h.
3. **Concorrentes = dados publicos apenas** — CRUD manual, sem scraping automatico.
4. **Views > Plays nos Reels** — desde abril/2025.
5. **QEI calculado no frontend** — runtime para ajuste de pesos.
6. **Content Score em batch** — 4 queries por tier no sync, nunca N queries individuais.
7. **Auth centralizada** — `validateCronSecret()` de `lib/auth.ts` em toda rota de sync e knowledge.
8. **Audiencia em %** — API retorna absolutos, convertemos para % antes de salvar.
9. **IA nunca publica** — o sistema gera e agenda no calendario. Publicacao e sempre manual.
10. **Edicao nao-destrutiva** — `caption_edited`/`hashtags_edited` preservam o output original da IA.
11. **Documentos inativos nao alimentam a IA** — `is_active = FALSE` desativa sem deletar.
12. **API Keys de IA sao server-only** — `OPENAI_API_KEY` e `ANTHROPIC_API_KEY` nunca expostos no client.

---

## 8. O que NAO esta no escopo

- Publicacao automatica via API (requer `instagram_content_publish` + App Review da Meta — planejado, ver ARCHITECTURE.md secao 14)
- Analytics de Instagram Ads (Meta Ads API — escopo futuro)
- Multi-conta (apenas @welcomeweddings)
- App mobile
- Integracao com outras redes sociais (TikTok, LinkedIn — escopo futuro)
- Scraping automatico de concorrentes (apenas CRUD manual)
- Geracao automatica de imagens/videos (apenas briefs textuais para o designer)
- Integracao com Canva API (previsto para versao futura)
- Aprovacao em multiplos niveis hierarquicos (workflow complexo — escopo futuro)
