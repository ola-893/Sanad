const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

// Exercise the actual page with two loans for the same borrower.
const source = fs.readFileSync('app/pawnshop/(private)/borrowers/[id]/page.tsx', 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText
const loan = { id: 'loan-two', borrowerId: 'same-borrower', sagTokenId: '2', createdAt: '2026-09-01', paymentAmountUsd: '84' }
const calls = []
const states = []
let cursor = 0
let effect
const pageExports = {}
vm.runInNewContext(compiled, {
  exports: pageExports,
  require(name) {
    if (name === 'react') return {
      useState(initial) {
        const index = cursor++
        if (!(index in states)) states[index] = initial
        return [states[index], value => { states[index] = value }]
      },
      useEffect(fn) { effect = fn },
    }
    if (name === 'next/navigation') return { useParams: () => ({ id: loan.id }), useRouter: () => ({ back() {} }) }
    if (name === '@/lib/axios-v1') return { default: { async get(url) {
      calls.push(url)
      if (url === '/pledge-requests/loan-two') return { data: { success: true, data: loan } }
      if (url === '/pledge-requests/loan-two/repayments') return { data: { data: [{ id: 1, amountUsd: '10', createdAt: '2026-09-02' }] } }
      if (url === '/pledge-requests/borrowers/same-borrower') return { data: { data: {
        requests: [{ ...loan, id: 'loan-one', paymentAmountUsd: '35' }, loan],
        investments: [{ id: 1, sagTokenId: '1' }, { id: 2, sagTokenId: '2' }],
      } } }
      throw Error(`Unexpected endpoint: ${url}`)
    } } }
    if (name === 'react/jsx-runtime') return require(name)
    return new Proxy({}, { get: () => 'div' })
  },
})
;(async () => {
  pageExports.default()
  effect()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(states[0].id, 'loan-two')
  assert.equal(states[0].paymentAmountUsd, '84')
  assert.equal(states[1].length, 1)
  assert.equal(states[1][0].id, 2)
  assert.equal(states[2][0].amountUsd, '10')
  assert.equal(states[4], '')
  cursor = 0
  assert.doesNotThrow(() => pageExports.default(), 'Loaded detail must render without undefined variables')
  assert.equal(calls.length, 3)
  console.log('PASS: selected loan, scoped investments, repayments, and loaded render')
})().catch(error => { console.error(error); process.exitCode = 1 })
