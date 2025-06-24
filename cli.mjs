#!/usr/bin/env node

import prompts from 'prompts'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const { projectName, useBun, useShadcn, useEmail } = await prompts([
  {
    type: 'text',
    name: 'projectName',
    message: 'What is your project called?',
    initial: 'my-ekko-app'
  },
  {
    type: 'confirm',
    name: 'useBun',
    message: 'Use Bun instead of npm for installs?',
    initial: false
  },
  {
    type: 'confirm',
    name: 'useShadcn',
    message: 'Install and configure shadcn/ui?',
    initial: true
  },
  {
    type: 'confirm',
    name: 'useEmail',
    message: 'Include Email Services (React Email + Resend)?',
    initial: true
  }
])

fs.mkdirSync(projectName)
process.chdir(projectName)

console.log(`\n🚀 Running create-next-app...`)
execSync(`npx create-next-app@latest web`, { stdio: 'inherit' })

process.chdir('web')

console.log('\n🔤 Installing react-icons and heroicons...')
const iconsCmd = useBun
  ? 'bun add react-icons @heroicons/react'
  : 'npm install react-icons @heroicons/react'
execSync(iconsCmd, { stdio: 'inherit' })

if (useShadcn) {
  console.log(`\n✨ Installing shadcn/ui...`)
  const installCmd = useBun
    ? 'bun add shadcn-ui clsx tailwind-variants'
    : 'npm install shadcn-ui clsx tailwind-variants'
  execSync(installCmd, { stdio: 'inherit' })
  console.log('\n⚙️ Initializing shadcn/ui...')
  execSync('npx shadcn-ui@latest init', { stdio: 'inherit' })
}

if (useEmail) {
  console.log(`\n📧 Installing React Email + Resend...`)
  const emailCmd = useBun
    ? 'bun add @react-email/components @react-email/render resend'
    : 'npm install @react-email/components @react-email/render resend'
  execSync(emailCmd, { stdio: 'inherit' })

  const emailDir = path.join('emails')
  if (!fs.existsSync(emailDir)) fs.mkdirSync(emailDir)

  fs.writeFileSync(
    path.join(emailDir, 'WelcomeEmail.tsx'),
    `import { Html, Head, Preview, Body, Text, Container } from '@react-email/components'

export function WelcomeEmail() {
  return (
    <Html>
      <Head />
      <Preview>Welcome to your new app!</Preview>
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container>
          <Text>Hey there 👋</Text>
          <Text>Thanks for trying out your new Next.js app with email support!</Text>
        </Container>
      </Body>
    </Html>
  )
}`
  )
}

console.log('\n✅ Done! Your Ekko app is ready.')
console.log(`\n👉 To get started:`)
console.log(`  cd ${projectName}/web`)
console.log(`  ${useBun ? 'bun dev' : 'npm run dev'}`)

if (useEmail) {
  console.log('\n📬 You can edit your first email at:')
  console.log(`  ${projectName}/web/emails/WelcomeEmail.tsx`)
}

console.log('\n🧠 Don’t forget to set your Resend API key in your .env file if you plan to send emails.\n')
