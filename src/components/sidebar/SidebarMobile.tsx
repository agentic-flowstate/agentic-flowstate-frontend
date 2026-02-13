"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SidebarContent } from './SidebarContent'
import { SidebarProps } from './SidebarDesktop'

interface SidebarMobileProps extends SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function SidebarMobile({
  isOpen,
  onClose,
  ...contentProps
}: SidebarMobileProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-[300px] p-0 pt-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-sm font-medium">Navigation</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100%-57px)]">
          <SidebarContent {...contentProps} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
