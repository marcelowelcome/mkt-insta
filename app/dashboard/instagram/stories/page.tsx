import StoryMetrics from '@/components/instagram/StoryMetrics'

export default function StoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historico de stories — alcance, saidas, respostas e padroes de navegacao
        </p>
      </div>

      <StoryMetrics />
    </div>
  )
}
