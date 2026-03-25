'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-2xl">
        ⚠️
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Algo deu errado</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {error.message || 'Ocorreu um erro inesperado ao carregar esta pagina.'}
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
