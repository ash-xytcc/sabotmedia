import { register } from 'node:module'

// Pages bundles JSON imports. Let Node's test runner load the same source files.
register('./json-imports-loader.mjs', import.meta.url)
