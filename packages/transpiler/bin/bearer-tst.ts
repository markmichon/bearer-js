#!/usr/bin/env node
import * as commandLineArgs from 'command-line-args'
import Transpiler from '../src'

export default args => {
  const optionsDefinitions = [
    { name: 'no-watcher', type: Boolean, defaultOption: false },
    { name: 'prefix-tag', type: String }
  ]
  const options = commandLineArgs(optionsDefinitions, { camelCase: true, argv: args, partial: true })
  const transpiler = new Transpiler({
    watchFiles: !options.noWatcher,
    tagNamePrefix: options.prefixTag
  })

  transpiler.on('STOP', () => {
    process.exit(0)
  })

  transpiler.run()
}
