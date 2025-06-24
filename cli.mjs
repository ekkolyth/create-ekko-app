#!/usr/bin/env node

import prompts from 'prompts'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const answers = {}
const onSubmit = (prompt, answer) => {
  answers[prompt.name] = answer
  return true
}

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
    message: 'Use Bun instead of npm for installs (y/n)',
    initial: false
  },
  {
    type: 'confirm',
    name: 'useShadcn',
    message: 'Install and configure shadcn/ui (y/n)',
    initial: true
  },
  {
    type: 'confirm',
    name: 'useEmail',
    message: 'Include Email Services (React Email + Resend) (y/n)',
    initial: true
  }
]

const response = await prompts(questions, {
  onSubmit,
  stdout: process.stdout
})

const { projectName, useBun, useShadcn, useEmail } = response

// Create project root and cd into it
fs.mkdirSync(projectName)
process.chdir(projectName)

// Run create-next-app inside /web
execSync(`npx create-next-app@latest web`, { stdio: 'inherit' })

// Change into the frontend directory
process.chdir('web')

// Always install icon libraries
console.log('\n✔ Installing react-icons and heroicons...')
const iconsCmd = useBun
  ? 'bun add react-icons @heroicons/react'
  : 'npm install react-icons @heroicons/react'
execSync(iconsCmd, { stdio: 'inherit' })

// Optional: Shadcn setup
if (useShadcn) {
  console.log('\n✔ Installing shadcn/ui...')
  const shadcnCmd = useBun
    ? 'bun add shadcn-ui clsx tailwind-variants'
    : 'npm install shadcn-ui clsx tailwind-variants'
  execSync(shadcnCmd, { stdio: 'inherit' })

  console.log('✔ Initializing shadcn/ui...')
  execSync('npx shadcn-ui@latest init', { stdio: 'inherit' })
}

// Optional: Email setup
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

// Final message
console.log('\n✅ Done! Your Ekko app is ready.')
console.log(`\n👉 To get started:`)
console.log(`  cd ${projectName}/web`)
console.log(`  ${useBun ? 'bun dev' : 'npm run dev'}`)

if (useEmail) {
  console.log('\n📬 Your first email is located at:')
  console.log(`  ${projectName}/web/emails/WelcomeEmail.tsx`)
}

console.log('\n🧠 Don’t forget to set your Resend API key in your .env file to send email.\n')
