'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/analytics'
import { CHART_COLORS } from '@/lib/constants'
import type { InstagramStory } from '@/types/instagram'

export default function StoryMetrics() {
  const [stories, setStories] = useState<InstagramStory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/instagram/stories?limit=100')
      .then((r) => r.json())
      .then((json) => setStories(json.data ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent><Skeleton className="h-48 w-full rounded-lg" /></CardContent>
        </Card>
      </div>
    )
  }

  if (stories.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border/60 p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">Nenhum story rastreado</p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          O sync de stories roda a cada 6h e captura stories ativos antes de expirarem.
        </p>
      </div>
    )
  }

  // Stats
  const totalStories = stories.length
  const avgReach = Math.round(stories.reduce((s, st) => s + st.reach, 0) / totalStories)
  const avgExitRate = totalStories > 0
    ? stories.reduce((s, st) => s + (st.impressions > 0 ? (st.exits / st.impressions) * 100 : 0), 0) / totalStories
    : 0
  const totalReplies = stories.reduce((s, st) => s + st.replies, 0)

  const stats = [
    { label: 'Stories Rastreados', value: formatNumber(totalStories), icon: '⏳' },
    { label: 'Alcance Medio', value: formatNumber(avgReach), icon: '👁' },
    { label: 'Taxa de Saida', value: `${avgExitRate.toFixed(1)}%`, icon: '🚪', color: avgExitRate > 50 ? 'text-red-500' : '' },
    { label: 'Total de Respostas', value: formatNumber(totalReplies), icon: '💬' },
  ]

  // Chart — reach por story (ultimos 20)
  const chartData = stories.slice(0, 20).reverse().map((st, i) => ({
    story: `#${i + 1}`,
    reach: st.reach,
    exits: st.exits,
  }))

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-base">
                {stat.icon}
              </span>
              <div>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color ?? ''}`}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Alcance por Story</CardTitle>
          <p className="text-xs text-muted-foreground">Ultimos 20 stories rastreados</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="story" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(value, name) => [formatNumber(Number(value)), name === 'reach' ? 'Alcance' : 'Saidas']}
                />
                <Bar dataKey="reach" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="exits" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={30} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Historico de Stories</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Impressoes</TableHead>
                  <TableHead>Saidas</TableHead>
                  <TableHead>Respostas</TableHead>
                  <TableHead>Taps ▶</TableHead>
                  <TableHead>Taps ◀</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stories.slice(0, 30).map((story) => {
                  const isExpired = story.expires_at ? new Date(story.expires_at) < new Date() : true
                  return (
                    <TableRow key={story.id}>
                      <TableCell className="text-xs">
                        {story.timestamp
                          ? new Date(story.timestamp).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${isExpired ? 'bg-muted text-muted-foreground' : 'bg-emerald-50 text-emerald-700'}`}
                        >
                          {isExpired ? 'Expirado' : 'Ativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatNumber(story.reach)}</TableCell>
                      <TableCell>{formatNumber(story.impressions)}</TableCell>
                      <TableCell className="text-red-500">{formatNumber(story.exits)}</TableCell>
                      <TableCell className="text-indigo-600 font-medium">{formatNumber(story.replies)}</TableCell>
                      <TableCell>{formatNumber(story.taps_forward)}</TableCell>
                      <TableCell>{formatNumber(story.taps_back)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
