import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Anonymous Chat - Meet Random Strangers Online',
  description: 'Connect instantly with strangers worldwide. Anonymous video chat, voice calls, and text messaging with interest-based matching.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
