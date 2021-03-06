const path = require('path')
const fmt = require('util').format
const pathToRegexp = require('path-to-regexp')

const lineRE = /^[ \t]{2,}(\S+)\s+(\S+)\s+(\S+)\s*(?:\((.*?)\))?/

function die (msg, ...args) {
  console.error(fmt(msg, ...args))
  process.exit(1)
}

module.exports = function parse (s, resolver) {
  let gates = false
  return s
    .split('\n')
    .map((line, index) => {
      if (line.includes('```')) gates = !gates
      if (gates) return

      const match = line.match(lineRE)
      if (!match) return null

      let method = match[1]
      const route = match[2]
      const pathToModule = match[3]
      const args = match[4]

      if (!method) die('Expected method (line #%d)', index)
      if (!route) die('Expected tokenized url (line #%d)', index)
      if (!pathToModule) die('Expected path to file (line #%d)', index)

      const routeKeys = []
      route.replace(/:(\w+)/g, (_, k) => routeKeys.push(k))

      let location = resolver
        ? resolver(pathToModule)
        : path.join(process.cwd(), pathToModule)

      let module = require(location)

      if (!module.test && !module.handler && typeof module !== 'function') {
        die('Expected module to export at least one method (line #%d)', index)
      }

      if (args && args.includes('cors')) method += '|OPTIONS'

      return {
        method,
        methodExp: new RegExp(method),
        route,
        routeExp: pathToRegexp(route),
        routeKeys,
        pathToModule,
        module,
        args
      }
    })
    .filter(r => !!r)
}
