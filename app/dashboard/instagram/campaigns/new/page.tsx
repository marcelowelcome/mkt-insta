import BriefingForm from '@/components/instagram/campaigns/BriefingForm'
import Link from 'next/link'

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/instagram/campaigns"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Voltar para campanhas
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-2">
          Nova Campanha
        </h1>
        <p className="text-sm text-muted-foreground">
          Preencha o briefing e a IA vai gerar uma campanha completa
        </p>
      </div>
      <BriefingForm />
    </div>
  )
}
