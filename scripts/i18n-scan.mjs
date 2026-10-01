// Check (via the TypeScript AST) for UI text that bypasses the dictionaries: JSX text,
// user-facing attributes and `label:`-style literals in .tsx files.
// Add `i18n-ignore` to a line for intentional English (brand, OS names).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ATTRS = new Set(['placeholder', 'aria-label', 'alt', 'title'])
const PROPS = new Set(['label', 'title', 'text', 'description', 'placeholder', 'q', 'a'])

const isStringLike = (n) => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))

// Walk up from a literal through conditional branches, ||/&&/?? operands and
// parentheses to a JsxExpression that is a JSX child or a user-facing attribute.
const LOGICAL = new Set([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.QuestionQuestionToken])
function isUiExpression(node) {
  let cur = node
  for (;;) {
    const p = cur.parent
    if (!p) return false
    if (ts.isParenthesizedExpression(p)) cur = p
    else if (ts.isConditionalExpression(p) && p.condition !== cur) cur = p
    else if (ts.isBinaryExpression(p) && LOGICAL.has(p.operatorToken.kind)) cur = p
    else if (ts.isJsxExpression(p)) {
      const g = p.parent
      return (
        ts.isJsxElement(g) ||
        ts.isJsxFragment(g) ||
        (ts.isJsxAttribute(g) && ATTRS.has(g.name.getText()))
      )
    } else return false
  }
}

export function scanSource(code) {
  const sf = ts.createSourceFile('x.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const lines = code.split('\n')
  const findings = []

  const report = (node, raw) => {
    if (!/[A-Za-z]/.test(raw)) return
    const start = ts.isJsxText(node) ? node.pos + (raw.length - raw.trimStart().length) : node.getStart(sf)
    const line = sf.getLineAndCharacterOfPosition(start).line + 1
    if ((lines[line - 1] ?? '').includes('i18n-ignore')) return
    findings.push({ line, pos: start, text: raw.replace(/\s+/g, ' ').trim() })
  }

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      report(node, node.text)
    } else if (isStringLike(node) || ts.isTemplateExpression(node)) {
      const parent = node.parent
      if (ts.isJsxAttribute(parent)) {
        if (ATTRS.has(parent.name.getText(sf)) && isStringLike(node)) report(node, node.text)
      } else if (isUiExpression(node)) {
        if (ts.isTemplateExpression(node)) {
          report(node.head, node.head.text)
          for (const span of node.templateSpans) report(span.literal, span.literal.text)
        } else {
          report(node, node.text)
        }
      } else if (
        isStringLike(node) &&
        ts.isPropertyAssignment(parent) &&
        parent.initializer === node &&
        (ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name)) &&
        PROPS.has(parent.name.text)
      ) {
        report(node, node.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  return findings
    .sort((x, y) => x.line - y.line || x.pos - y.pos)
    .map(({ line, text }) => ({ line, text }))
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
