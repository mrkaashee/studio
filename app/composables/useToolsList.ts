import type { NavigationMenuItem } from '@nuxt/ui'

export const useToolsList = () => {
  const tools: NavigationMenuItem[] = [
    {
      icon: 'i-lucide-newspaper',
      label: 'Docs',
      to: '/docs',
    },
    {
      icon: 'i-lucide-image',
      label: 'Image',
      to: '',
      children: [
        { label: '', description: '' },
      ]
    },
    {
      icon: 'i-lucide-file-text',
      label: 'PDF',
      to: '',
      children: []
    },
    {
      icon: 'i-lucide-calculator',
      label: 'Calculator',
      to: '',
      children: []
    },
    {
      icon: 'i-lucide-code',
      label: 'Developer',
      to: '',
      children: [
        {
          label: 'JSON Formatter & Validator',
          description: 'Clean, prettify, and validate your JSON strings with ease.'
        },
        {
          label: 'Base64 Encoder & Decoder',
          description: 'Encode or decode text and images to Base64 format instantly.'
        },
        {
          label: 'QR Code Generator',
          description: 'Generate free QR codes for URLs, text, and more. Customize colors and size.'
        },
        {
          label: 'Unix Epoch Converter',
          description: 'Convert Unix timestamps to human-readable dates and vice versa.'
        },
        {
          label: 'Byte Converter',
          description: 'Convert between data units: Bytes, KB, MB, GB, TB, PB and more.'
        },
        {
          label: 'UUID Generator',
          description: 'Generate random (v4) or time-ordered (v7) UUIDs instantly.'
        },
      ]
    },
  ]

  return { tools }
}
