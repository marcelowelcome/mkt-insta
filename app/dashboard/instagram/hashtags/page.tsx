import HashtagTable from '@/components/instagram/HashtagTable'

export default function HashtagsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hashtags</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Intelligence de hashtags — performance, tendencia e impacto estimado
        </p>
      </div>

      <HashtagTable />
    </div>
  )
}
