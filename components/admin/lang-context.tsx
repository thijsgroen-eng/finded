'use client'

import { createContext, useContext } from 'react'
import { ADMIN_COPY, type AdminLang, type AdminCopy } from '@/lib/admin-copy'

const AdminLangContext = createContext<AdminCopy>(ADMIN_COPY.en)

export function AdminLangProvider({ lang, children }: { lang: AdminLang; children: React.ReactNode }) {
  return <AdminLangContext.Provider value={ADMIN_COPY[lang]}>{children}</AdminLangContext.Provider>
}

export function useAdminT() {
  return useContext(AdminLangContext)
}
