"use client"

import { SidebarDesktop, SidebarProps } from './SidebarDesktop'
import { SidebarMobile } from './SidebarMobile'
import { useIsMobile } from '@/lib/hooks'

interface SidebarWrapperProps extends SidebarProps {
  isMobileSidebarOpen: boolean
  onMobileSidebarClose: () => void
}

export function Sidebar({
  isMobileSidebarOpen,
  onMobileSidebarClose,
  ...props
}: SidebarWrapperProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <SidebarMobile
        {...props}
        isOpen={isMobileSidebarOpen}
        onClose={onMobileSidebarClose}
      />
    )
  }

  return <SidebarDesktop {...props} />
}

export type { SidebarProps }
