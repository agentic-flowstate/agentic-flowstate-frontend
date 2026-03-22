"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Search, FileText, File, Download, Loader2, X, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { OrganizationSelector } from '@/components/organization-selector'
import { useOrganization } from '@/contexts/organization-context'
import { ArtifactSummary, DocumentSummary } from '@/lib/types'
import {
  listArtifacts,
  searchArtifacts,
  listDocuments,
  searchDocuments,
  getDocumentDownloadUrl,
} from '@/lib/api/library'
import { ArtifactViewerModal } from '@/components/library/ArtifactViewerModal'
import { DocumentViewerModal } from '@/components/library/DocumentViewerModal'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

function epicIdToLabel(epicId: string): string {
  return epicId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function LibraryPage() {
  const { organizations, selectedOrg, selectOrg } = useOrganization()
  const [activeTab, setActiveTab] = useState<string>('artifacts')
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([])
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)
  const [selectedArtifactTitle, setSelectedArtifactTitle] = useState<string>('')
  const [selectedDocument, setSelectedDocument] = useState<DocumentSummary | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (query: string, tab: string) => {
    setIsLoading(true)
    setError(null)
    try {
      if (tab === 'artifacts') {
        const data = query.trim()
          ? await searchArtifacts(query.trim())
          : await listArtifacts()
        setArtifacts(data)
      } else {
        const data = query.trim()
          ? await searchDocuments(query.trim())
          : await listDocuments()
        setDocuments(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchBoth = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [arts, docs] = await Promise.all([
        searchQuery.trim() ? searchArtifacts(searchQuery.trim()) : listArtifacts(),
        searchQuery.trim() ? searchDocuments(searchQuery.trim()) : listDocuments(),
      ])
      setArtifacts(arts)
      setDocuments(docs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  // Refetch both tabs when org changes
  useEffect(() => {
    fetchBoth()
  }, [selectedOrg?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch active tab on tab change (data may already be there from fetchBoth)
  useEffect(() => {
    fetchData(searchQuery, activeTab)
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search — only fetch active tab (counts reset on search clear)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchBoth()
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive unique artifact types for filter chips
  const artifactTypes = useMemo(() => {
    const types = new Set(artifacts.map(a => a.artifact_type))
    return Array.from(types).sort()
  }, [artifacts])

  // Filter artifacts by type
  const filteredArtifacts = useMemo(() => {
    if (!typeFilter) return artifacts
    return artifacts.filter(a => a.artifact_type === typeFilter)
  }, [artifacts, typeFilter])

  // Group artifacts by epic
  const groupedArtifacts = useMemo(() => {
    const groups: Record<string, ArtifactSummary[]> = {}
    for (const artifact of filteredArtifacts) {
      const key = artifact.epic_id || '_ungrouped'
      if (!groups[key]) groups[key] = []
      groups[key].push(artifact)
    }
    // Sort groups: named epics alphabetically, ungrouped last
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === '_ungrouped') return 1
      if (b === '_ungrouped') return -1
      return a.localeCompare(b)
    })
  }, [filteredArtifacts])

  // Derive unique document types for filter chips
  const documentTypes = useMemo(() => {
    const types = new Set(documents.map(d => d.document_type))
    return Array.from(types).sort()
  }, [documents])

  // Filter documents by type
  const filteredDocuments = useMemo(() => {
    if (!typeFilter) return documents
    return documents.filter(d => d.document_type === typeFilter)
  }, [documents, typeFilter])

  // Group documents by epic
  const groupedDocuments = useMemo(() => {
    const groups: Record<string, DocumentSummary[]> = {}
    for (const doc of filteredDocuments) {
      const key = doc.epic_id || '_ungrouped'
      if (!groups[key]) groups[key] = []
      groups[key].push(doc)
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === '_ungrouped') return 1
      if (b === '_ungrouped') return -1
      return a.localeCompare(b)
    })
  }, [filteredDocuments])

  const toggleEpicCollapse = (epicId: string) => {
    setCollapsedEpics(prev => {
      const next = new Set(prev)
      if (next.has(epicId)) next.delete(epicId)
      else next.add(epicId)
      return next
    })
  }

  const handleArtifactClick = (artifact: ArtifactSummary) => {
    setSelectedArtifactId(artifact.artifact_id)
    setSelectedArtifactTitle(artifact.title)
  }

  const handleDocumentDownload = (doc: DocumentSummary) => {
    window.open(getDocumentDownloadUrl(doc.document_id), '_blank')
  }

  const handleTabChange = (v: string) => {
    setActiveTab(v)
    setSearchQuery('')
    setTypeFilter(null)
  }

  const currentTypes = activeTab === 'artifacts' ? artifactTypes : documentTypes
  const totalFiltered = activeTab === 'artifacts' ? filteredArtifacts.length : filteredDocuments.length
  const totalRaw = activeTab === 'artifacts' ? artifacts.length : documents.length

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-6 pt-4 pb-2 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">Library</h1>
          <OrganizationSelector
            organizations={organizations}
            selectedOrg={selectedOrg}
            onSelectOrg={selectOrg}
          />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="flex items-center gap-3 mb-2">
            <TabsList>
              <TabsTrigger value="artifacts" className="text-xs">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Artifacts
                {artifacts.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground">{artifacts.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">
                <File className="h-3.5 w-3.5 mr-1.5" />
                Documents
                {documents.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground">{documents.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'artifacts' ? 'Search artifacts...' : 'Search documents...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Type filter chips */}
          {currentTypes.length > 1 && (
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <button
                onClick={() => setTypeFilter(null)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  typeFilter === null
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/50'
                }`}
              >
                All ({totalRaw})
              </button>
              {currentTypes.map(type => {
                const count = activeTab === 'artifacts'
                  ? artifacts.filter(a => a.artifact_type === type).length
                  : documents.filter(d => d.document_type === type).length
                return (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      typeFilter === type
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/50'
                    }`}
                  >
                    {type} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </Tabs>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-6 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive text-center py-8">{error}</div>
        ) : activeTab === 'artifacts' ? (
          filteredArtifacts.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? 'No artifacts found' : typeFilter ? `No ${typeFilter} artifacts` : 'No artifacts yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {groupedArtifacts.map(([epicId, items]) => (
                <Collapsible
                  key={epicId}
                  open={!collapsedEpics.has(epicId)}
                  onOpenChange={() => toggleEpicCollapse(epicId)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors">
                    {collapsedEpics.has(epicId) ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold">
                      {epicId === '_ungrouped' ? 'Ungrouped' : epicIdToLabel(epicId)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{items.length}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-5 border-l border-border pl-3 space-y-0.5">
                      {items.map((artifact) => (
                        <button
                          key={artifact.artifact_id}
                          onClick={() => handleArtifactClick(artifact)}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-medium truncate">{artifact.title}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                  {artifact.artifact_type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>{formatBytes(artifact.content_length)}</span>
                                {artifact.ticket_id && (
                                  <>
                                    <span className="text-border">|</span>
                                    <span className="font-mono">{artifact.ticket_id}</span>
                                  </>
                                )}
                                <span className="text-border">|</span>
                                <span>{formatRelativeTime(artifact.created_at_iso)}</span>
                              </div>
                            </div>
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )
        ) : (
          filteredDocuments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? 'No documents found' : typeFilter ? `No ${typeFilter} documents` : 'No documents yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {groupedDocuments.map(([epicId, items]) => (
                <Collapsible
                  key={epicId}
                  open={!collapsedEpics.has(epicId)}
                  onOpenChange={() => toggleEpicCollapse(epicId)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors">
                    {collapsedEpics.has(epicId) ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold">
                      {epicId === '_ungrouped' ? 'Ungrouped' : epicIdToLabel(epicId)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{items.length}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-5 border-l border-border pl-3 space-y-0.5">
                      {items.map((doc) => (
                        <div
                          key={doc.document_id}
                          className="flex items-center px-3 py-2 rounded-md hover:bg-accent/50 transition-colors group cursor-pointer"
                          onClick={() => setSelectedDocument(doc)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium truncate">{doc.filename}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                {doc.document_type}
                              </Badge>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent shrink-0"
                                title="Download"
                                onClick={(e) => { e.stopPropagation(); handleDocumentDownload(doc) }}
                              >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{formatBytes(doc.size_bytes)}</span>
                              {doc.description && (
                                <>
                                  <span className="text-border">|</span>
                                  <span className="truncate max-w-[200px]">{doc.description}</span>
                                </>
                              )}
                              {doc.ticket_id && (
                                <>
                                  <span className="text-border">|</span>
                                  <span className="font-mono">{doc.ticket_id}</span>
                                </>
                              )}
                              <span className="text-border">|</span>
                              <span>{formatRelativeTime(doc.created_at_iso)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )
        )}
      </div>

      <ArtifactViewerModal
        isOpen={selectedArtifactId !== null}
        onClose={() => setSelectedArtifactId(null)}
        artifactId={selectedArtifactId}
        artifactTitle={selectedArtifactTitle}
      />

      <DocumentViewerModal
        isOpen={selectedDocument !== null}
        onClose={() => setSelectedDocument(null)}
        document={selectedDocument}
      />
    </div>
  )
}
