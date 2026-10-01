// Heuristic check for UI text that bypasses the dictionaries: JSX text,
// user-facing attributes and `label:`-style literals in .tsx files.
// Add `i18n-ignore` to a line for intentional English (brand, OS names).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// JSX text pattern: matches text between > (or }) and < (or {), allowing newlines
// Capturing group includes leading whitespace so we can compute line numbers correctly
const jsxTextPattern = /[>}](\s*[^<{]*?[A-Za-z][^<{]*?)\s*[<{]/gs
// Attribute patterns (per-line)
const attributePatterns = [
  /\b(?:placeholder|aria-label|alt|title)="([^"]*[A-Za-z][^"]*)"/g,
  /\b(?:label|title|text|description|placeholder|q|a):\s*'([^']*[A-Za-z][^']*)'/g,
]
// Code patterns to skip JSX text
const codePatterns = [/=>/, /&&/, /\|\|/, /===/, /!==/, / = /, /;/]
// Operators that text shouldn't start with
const startOpChars = /^[=&|?:)(,./]/

export function scanSource(code) {
  const findings = []
  const lines = code.split('\n')

  // Scan for multi-line JSX text
  for (const match of code.matchAll(jsxTextPattern)) {
    const rawText = match[1]
    // Skip if it looks like code
    if (codePatterns.some(p => p.test(rawText)) || startOpChars.test(rawText.trim())) continue

    // Compute line number where the text starts
    // Count newlines before the match, then newlines before first letter in captured text
    const beforeMatch = code.substring(0, match.index)
    const lineOfOpenTag = beforeMatch.split('\n').length
    // Count newlines in the captured text before the first letter
    const beforeFirstLetter = rawText.substring(0, rawText.search(/[A-Za-z]/))
    const newlinesBeforeFirstLetter = (beforeFirstLetter.match(/\n/g) || []).length
    const startLine = lineOfOpenTag + newlinesBeforeFirstLetter

    // Check if i18n-ignore is on the starting line
    if (lines[startLine - 1] && lines[startLine - 1].includes('i18n-ignore')) continue

    // Normalize text: collapse internal whitespace, trim
    const text = rawText.replace(/\s+/g, ' ').trim()
    if (text) findings.push({ line: startLine, text })
  }

  // Scan for attributes and labels (per-line, as before)
  lines.forEach((line, i) => {
    if (line.includes('i18n-ignore')) return
    for (const pattern of attributePatterns) {
      for (const match of line.matchAll(pattern)) {
        const text = match[1].trim()
        // Filter: skip if only operators (&, (, ) are present, or empty
        if (text && !(/^[&()]*$/.test(text))) findings.push({ line: i + 1, text })
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
