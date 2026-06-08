import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hormone Ecosystem — O maior ecossistema digital de implantes hormonais do Brasil',
  description: 'Plataforma premium de implantes hormonais para pacientes, médicos e consultores. Educação, acompanhamento e excelência clínica em um único ecossistema.',
  keywords: 'implantes hormonais, reposição hormonal, medicina funcional, endocrinologia, pellets hormonais',
  openGraph: {
    title: 'Hormone Ecosystem',
    description: 'O maior ecossistema digital de implantes hormonais do Brasil',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans bg-[#0A0A0B] text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
