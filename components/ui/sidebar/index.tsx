"use client"

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { SidebarProvider, useSidebar } from './SidebarContext';

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();
  
  return (
    <aside className={`z-30 bg-white border-r border-gray-200 transition-all duration-300 ${
      isOpen ? 'w-64' : 'w-0 overflow-hidden'
    }`}>
      {children}
    </aside>
  );
}

export function SidebarHeader({ children }: { children: React.ReactNode }) {
  return <div className="border-b">{children}</div>;
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <div className="py-4 flex flex-col h-full overflow-y-auto">{children}</div>;
}

export function SidebarGroup({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="px-4 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</h3>;
}

export function SidebarGroupContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>;
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return <nav>{children}</nav>;
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function SidebarMenuButton({
  isActive,
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }) {
  return (
    <button
      className={`flex items-center space-x-2 w-full px-4 py-2 text-sm font-medium rounded-md ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto border-t">{children}</div>;
}

export function SidebarInset({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const { isOpen } = useSidebar();
  
  return (
    <div className={`flex-1 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}

export function SidebarTrigger() {
  const { toggleSidebar } = useSidebar();
  
  return (
    <button
      onClick={toggleSidebar}
      className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <ChevronLeft className="h-5 w-5" />
      <span className="sr-only">Toggle sidebar</span>
    </button>
  );
}

export { SidebarProvider } from './SidebarContext';
