// Heuristic check for UI text that bypasses the dictionaries: JSX text,
// user-facing attributes and `label:`-style literals in .tsx files.
// Add `i18n-ignore` to a line for intentional English (brand, OS names).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const patterns = [
  />\s*([^<>{}]*[A-Za-z][^<>{}]*?)\s*</g,
  /\b(?:placeholder|aria-label|alt|title)="([^"]*[A-Za-z][^"]*)"/g,
  /\b(?:label|title|text|description|placeholder|q|a):\s*'([^']*[A-Za-z][^']*)'/g,
]
// Code that merely looks like text between > and <.
const codeLike = /[=();&|]|^\s*$/

export function scanSource(code) {
  const findings = []
  code.split('\n').forEach((line, i) => {
    if (line.includes('i18n-ignore')) return
    for (const pattern of patterns) {
      for (const match of line.matchAll(pattern)) {
        const text = match[1].trim()
        if (text && !codeLike.test(text)) findings.push({ line: i + 1, text })
      }
    }
  })
  return findings
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return walk(path)
    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : []
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = process.argv.length > 2 ? process.argv.slice(2) : walk('src')
  let total = 0
  for (const file of files) {
    for (const { line, text } of scanSource(readFileSync(file, 'utf8'))) {
      console.log(`${file}:${line}  ${text}`)
      total++
    }
  }
  console.log(total ? `\n${total} untranslated string(s)` : 'No untranslated strings found')
  process.exit(total ? 1 : 0)
}
