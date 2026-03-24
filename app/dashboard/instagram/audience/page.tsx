import AudienceDemographics from '@/components/instagram/AudienceDemographics'

export default function AudiencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audiencia</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dados demograficos — genero, idade, localizacao
        </p>
      </div>

      <AudienceDemographics />
    </div>
  )
}
