'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Badge, RoleBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Search, UserPlus, Filter, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'

type Role = 'patient' | 'doctor' | 'sales' | 'admin' | 'lead'

interface User {
  id: number
  name: string
  email: string
  role: Role
  status: 'Ativo' | 'Inativo' | 'Pendente'
  joined: string
  lastAccess: string
}

const users: User[] = [
  { id: 1, name: 'Dr. Ricardo Lima', email: 'ricardo.lima@email.com', role: 'doctor', status: 'Ativo', joined: '15 Jan 2024', lastAccess: 'Hoje, 10:34' },
  { id: 2, name: 'Maria Silva', email: 'maria.s@email.com', role: 'patient', status: 'Ativo', joined: '20 Jan 2024', lastAccess: 'Hoje, 09:12' },
  { id: 3, name: 'Juliana Martins', email: 'juliana.m@email.com', role: 'sales', status: 'Ativo', joined: '25 Jan 2024', lastAccess: 'Ontem, 16:45' },
  { id: 4, name: 'Dra. Ana Costa', email: 'ana.costa@email.com', role: 'doctor', status: 'Ativo', joined: '1 Fev 2024', lastAccess: 'Hoje, 11:20' },
  { id: 5, name: 'Carlos Mendes', email: 'carlos.m@email.com', role: 'lead', status: 'Pendente', joined: 'Ontem', lastAccess: 'Nunca' },
  { id: 6, name: 'Roberto Faria', email: 'roberto.f@email.com', role: 'patient', status: 'Ativo', joined: '10 Fev 2024', lastAccess: '2 dias atrás' },
  { id: 7, name: 'Admin Master', email: 'admin@hormoneeco.com', role: 'admin', status: 'Ativo', joined: '1 Jan 2024', lastAccess: 'Hoje, 08:00' },
  { id: 8, name: 'Patricia Gomes', email: 'patricia.g@email.com', role: 'patient', status: 'Inativo', joined: '5 Mar 2024', lastAccess: '30 dias atrás' },
  { id: 9, name: 'Dr. Paulo Silva', email: 'paulo.s@email.com', role: 'doctor', status: 'Ativo', joined: 'Hoje', lastAccess: 'Hoje, 14:10' },
  { id: 10, name: 'Sandra Klein', email: 'sandra.k@email.com', role: 'sales', status: 'Ativo', joined: '8 Mar 2024', lastAccess: 'Hoje, 13:22' },
]

const roleFilters: { label: string; value: string }[] = [
  { label: 'Todos', value: '' },
  { label: 'Pacientes', value: 'patient' },
  { label: 'Médicos', value: 'doctor' },
  { label: 'Consultores', value: 'sales' },
  { label: 'Leads', value: 'lead' },
  { label: 'Administradores', value: 'admin' },
]

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const filtered = users.filter(u => {
    const matchRole = !roleFilter || u.role === roleFilter
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin Master', role: 'admin' }} title="Gerenciamento de Usuários" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">{users.length.toLocaleString('pt-BR')} usuários cadastrados</h2>
              <p className="text-sm text-[#71717A]">Gerencie todos os usuários da plataforma</p>
            </div>
            <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />}>
              Adicionar Usuário
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {roleFilters.map(f => (
                <button
                  key={f.value}
                  onClick={() => setRoleFilter(f.value)}
                  className={`flex-shrink-0 text-xs font-medium px-3 py-2 rounded-xl border transition-all ${
                    roleFilter === f.value
                      ? 'bg-[#7B3FE4]/15 border-[#7B3FE4]/30 text-white'
                      : 'bg-[#111113] border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#27272A]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1C1C1E] bg-[#18181A]">
                    {['Usuário', 'Tipo', 'Status', 'Cadastrado em', 'Último Acesso', 'Ações'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-medium text-[#52525B] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, i) => (
                    <tr key={user.id} className="border-b border-[#1C1C1E]/50 last:border-0 hover:bg-[#18181A]/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 flex items-center justify-center text-sm font-bold text-[#7B3FE4] flex-shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-[#71717A]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          user.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' :
                          user.status === 'Pendente' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {user.status === 'Ativo' && '● '}{user.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#71717A]">{user.joined}</td>
                      <td className="px-5 py-4 text-sm text-[#71717A]">{user.lastAccess}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button className="w-7 h-7 rounded-lg hover:bg-[#18181A] flex items-center justify-center text-[#71717A] hover:text-[#7B3FE4] transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button className="w-7 h-7 rounded-lg hover:bg-[#18181A] flex items-center justify-center text-[#71717A] hover:text-white transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-[#71717A] hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 border-t border-[#1C1C1E] flex items-center justify-between text-xs text-[#71717A]">
              <span>Mostrando {filtered.length} de {users.length} usuários</span>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-[#18181A] border border-[#1C1C1E] hover:border-[#27272A] transition-colors">Anterior</button>
                <button className="px-3 py-1.5 rounded-lg bg-[#18181A] border border-[#1C1C1E] hover:border-[#27272A] transition-colors">Próxima</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
