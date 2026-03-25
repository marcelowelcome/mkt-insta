import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/knowledge/documents
 * Lista todos os documentos da Knowledge Base com contagem de chunks.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: documents, error } = await supabase
      .from('knowledge_documents')
      .select('*, document_chunks(count)')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`)
    }

    // Formata contagem de chunks
    const formatted = (documents ?? []).map((doc) => ({
      id: doc.id,
      title: doc.title,
      source_type: doc.source_type,
      source_url: doc.source_url,
      file_name: doc.file_name,
      description: doc.description,
      is_active: doc.is_active,
      chunk_count: doc.document_chunks?.[0]?.count ?? 0,
      indexed_at: doc.indexed_at,
      created_at: doc.created_at,
    }))

    return NextResponse.json(formatted)
  } catch (err) {
    console.error('[Knowledge Documents GET]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/knowledge/documents
 * Toggle is_active de um documento (ativa/desativa sem deletar).
 * Body: { id: string, is_active: boolean }
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, is_active } = body

    if (!id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'id and is_active (boolean) are required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('knowledge_documents')
      .update({ is_active })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`)
    }

    return NextResponse.json({ success: true, id, is_active })
  } catch (err) {
    console.error('[Knowledge Documents PATCH]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge/documents
 * Remove um documento e todos os seus chunks (CASCADE).
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`)
    }

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('[Knowledge Documents DELETE]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
