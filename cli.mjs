#!/usr/bin/env node

import prompts from 'prompts'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const questions = [
  {
    type: 'text',
    name: 'projectName',
    message: 'What is your project called?',
    initial: 'my-ekko-app'
  },
  {
    type: 'confirm',
    name: 'useBun',
    message: 'Use Bun instead of npm for installs',
    initial: false
  },
  {
    type: 'confirm',
    name: 'useShadcn',
    message: 'Install and configure shadcn/ui',
    initial: true
  },
  {
    type: 'confirm',
    name: 'useEmail',
    message: 'Include Email Services (React Email + Resend)',
    initial: true
  }
]

const response = await prompts(questions, {
  stdout: process.stdout
})

if (!response.projectName) {
  console.log('\n❌ Setup was cancelled or ran in a non-interactive shell. Exiting.\n')
  process.exit(0)
}

const { projectName, useBun, useShadcn, useEmail } = response

fs.mkdirSync(projectName)
process.chdir(projectName)

execSync(`npx create-next-app@latest web`, { stdio: 'inherit' })

process.chdir('web')

console.log('\n✔ Installing react-icons and heroicons...')
const iconsCmd = useBun
  ? 'bun add react-icons @heroicons/react'
  : 'npm install react-icons @heroicons/react'
execSync(iconsCmd, { stdio: 'inherit' })

if (useShadcn) {
  console.log('\n✔ Installing shadcn/ui...')
  const shadcnCmd = useBun
    ? 'bun add shadcn-ui clsx tailwind-variants'
    : 'npm install shadcn-ui clsx tailwind-variants'
  execSync(shadcnCmd, { stdio: 'inherit' })

  console.log('✔ Initializing shadcn/ui...')
  execSync('npx shadcn-ui@latest init', { stdio: 'inherit' })
}

if (useEmail) {
  console.log('\n✔ Installing React Email + Resend...')
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
  console.log('\n📬 Your first email is located at:')
  console.log(`  ${projectName}/web/emails/WelcomeEmail.tsx`)
}

console.log('\n🧠 Don't forget to set your Resend API key in your .env file to send email.\n')
