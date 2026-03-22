import { ArtifactSummary, Artifact, DocumentSummary } from "@/lib/types"
import type { OrganizationId } from "@/contexts/organization-context"

function getCurrentOrg(): OrganizationId | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('selected-organization')
  return stored as OrganizationId | null
}

async function callAPI<T>(path: string): Promise<T> {
  const currentOrg = getCurrentOrg()
  const response = await fetch(path, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Organization': currentOrg || 'telemetryops',
    },
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.detail || errorData.error || errorMessage
    } catch {
      errorMessage = response.statusText || errorMessage
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as unknown as T
  }

  return await response.json()
}

export async function listArtifacts(): Promise<ArtifactSummary[]> {
  return callAPI<ArtifactSummary[]>('/api/library/artifacts')
}

export async function searchArtifacts(query: string): Promise<ArtifactSummary[]> {
  return callAPI<ArtifactSummary[]>(`/api/library/artifacts/search?q=${encodeURIComponent(query)}`)
}

export async function getArtifact(artifactId: string): Promise<Artifact> {
  return callAPI<Artifact>(`/api/library/artifacts/${encodeURIComponent(artifactId)}`)
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  return callAPI<DocumentSummary[]>('/api/library/documents')
}

export async function searchDocuments(query: string): Promise<DocumentSummary[]> {
  return callAPI<DocumentSummary[]>(`/api/library/documents/search?q=${encodeURIComponent(query)}`)
}

export function getDocumentDownloadUrl(documentId: string): string {
  return `/api/library/documents/${encodeURIComponent(documentId)}/download`
}

export function getDocumentViewUrl(documentId: string): string {
  return `/api/library/documents/${encodeURIComponent(documentId)}/download?inline=true`
}
