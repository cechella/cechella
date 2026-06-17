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
  other: {
    'facebook-domain-verification': '3h09pulh4me0v2vhar4enkboy0azle',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1871933026800875');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1871933026800875&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
      </head>
      <body className={`${inter.variable} font-sans bg-[#0A0A0B] text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
