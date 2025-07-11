"use client"

import React, { createContext, useState, useContext, ComponentProps } from 'react';
import { cn } from "@/lib/utils"; // Ditambahkan

type SidebarContextType = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// Props untuk Sidebar diubah untuk menyertakan className dan props HTML lainnya
interface SidebarProps extends ComponentProps<'aside'> {
  children: React.ReactNode;
}

export function Sidebar({ children, className, ...props }: SidebarProps) { // Diubah
  const { isOpen } = useSidebar();

  return (
    <aside
      className={cn( // Diubah untuk menggunakan cn dan menghapus bg-white
        "z-30 border-r border-gray-200 transition-all duration-300",
        isOpen ? 'w-64' : 'w-0 overflow-hidden',
        className // className dari props diterapkan di sini
      )}
      {...props} // sebarkan props lainnya ke elemen aside
    >
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
      className={cn( // Menggunakan cn di sini juga untuk konsistensi jika diperlukan
        `flex items-center space-x-2 w-full px-4 py-2 text-sm font-medium rounded-md`,
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
        className
      )}
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
    <div className={cn( // Menggunakan cn di sini juga
        "flex-1 transition-all duration-300",
        className
      )}
    >
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
      <span className="sr-only">Toggle sidebar</span>
    </button>
  );
}
