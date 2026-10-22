#!/usr/bin/env npx tsx
// Uso: BLOB_READ_WRITE_TOKEN=xxx npx tsx scripts/upload-fotos-verve.ts /caminho/para/fotos/*.webp
//
// Cole as URLs retornadas como VERVE_PHOTO_1..6 no Vercel Dashboard → Settings → Environment Variables

import { put } from '@vercel/blob'
import fs from 'fs'
import path from 'path'

const files = process.argv.slice(2)
if (!files.length) {
  console.error('Uso: npx tsx scripts/upload-fotos-verve.ts foto1.webp foto2.webp ...')
  process.exit(1)
}

async function main() {
  console.log(`Fazendo upload de ${files.length} foto(s)...\n`)
  const vars: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const name = `verve/photos/${path.basename(file)}`
    const data = fs.readFileSync(file)
    const blob = await put(name, data, { access: 'public', contentType: 'image/webp' })
    const envKey = `VERVE_PHOTO_${i + 1}`
    console.log(`${envKey}=${blob.url}`)
    vars.push(`${envKey}=${blob.url}`)
  }

  console.log('\n— Cole no Vercel Dashboard → Settings → Environment Variables —')
  console.log(vars.join('\n'))
}

main().catch(err => { console.error(err); process.exit(1) })
