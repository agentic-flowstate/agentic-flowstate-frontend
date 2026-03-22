"use client"

import React from 'react'
import { Download, FileText, Image, File } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DocumentSummary } from '@/lib/types'
import { getDocumentViewUrl, getDocumentDownloadUrl } from '@/lib/api/library'
import dynamic from 'next/dynamic'

const PDFViewer = dynamic(
  () => import('@embedpdf/react-pdf-viewer').then(mod => ({ default: mod.PDFViewer })),
  { ssr: false }
)

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  document: DocumentSummary | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType === 'application/pdf') return FileText
  return File
}

function canPreview(mimeType: string): boolean {
  return (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('image/')
  )
}

export function DocumentViewerModal({ isOpen, onClose, document }: DocumentViewerModalProps) {
  if (!document) return null

  const Icon = getFileIcon(document.mime_type)
  const previewable = canPreview(document.mime_type)
  const viewUrl = getDocumentViewUrl(document.document_id)
  const downloadUrl = getDocumentDownloadUrl(document.document_id)
  const isPdf = document.mime_type === 'application/pdf'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 text-base min-w-0">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{document.filename}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                {document.document_type}
              </Badge>
              <span className="text-xs text-muted-foreground shrink-0">{formatBytes(document.size_bytes)}</span>
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-7 text-xs gap-1.5"
              onClick={() => window.open(downloadUrl, '_blank')}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
          {document.description && (
            <p className="text-xs text-muted-foreground mt-1">{document.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden rounded-md border border-border bg-muted/30">
          {previewable ? (
            document.mime_type.startsWith('image/') && !isPdf ? (
              <div className="h-full flex items-center justify-center p-4 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewUrl}
                  alt={document.filename}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full h-[75vh]">
                <PDFViewer
                  config={{
                    src: viewUrl,
                    theme: { preference: 'dark' },
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <File className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Preview not available for {document.mime_type}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(downloadUrl, '_blank')}
              >
                <Download className="h-3.5 w-3.5" />
                Download file
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
