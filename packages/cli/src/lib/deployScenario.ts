import { spawn, exec } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { promisify } from 'util'

import { prepare } from './commands/startCommand'
import buildArtifact from './buildArtifact'
import * as pushScenario from './pushScenario'
import * as pushViews from './pushViews'
import * as assembly from './assemblyScenario'
import * as refreshToken from './refreshToken'
import * as invalidateCloudFront from './invalidateCloudFront'
import * as developerPortal from './developerPortal'
import LocationProvider from './locationProvider'

const execPromise = promisify(exec)

export function buildIntents(emitter, config, locator: LocationProvider) {
  return new Promise(async (resolve, reject) => {
    const { scenarioUuid } = config
    const artifactDirectory = locator.intentsArtifactDir
    const intentsDirectory = locator.srcIntentsDir

    if (!fs.existsSync(artifactDirectory)) {
      fs.mkdirSync(artifactDirectory)
    }
    try {
      emitter.emit('intents:installingDependencies')
      // TODOs: use root node modules
      await execPromise(`${config.command} install`, { cwd: intentsDirectory })

      const scenarioArtifact = locator.intentsArtifactResourcePath(`${scenarioUuid}.zip`)
      const output = fs.createWriteStream(scenarioArtifact)
      buildArtifact(output, { scenarioUuid }, emitter, locator)
        .then(() => {
          emitter.emit('intents:buildIntents:succeeded')
          resolve(scenarioArtifact)
        })
        .catch(error => {
          emitter.emit('intents:buildIntents:failed', { error })
          reject(error)
        })
    } catch (e) {
      reject(e)
    }
  })
}

export function deployIntents(emitter, config, locator: LocationProvider) {
  new Promise(async (resolve, reject) => {
    const { rootPathRc } = config

    if (!rootPathRc) {
      emitter.emit('rootPath:doesntExist')
      process.exit(1)
    }

    try {
      const scenarioArtifact = await buildIntents(emitter, config, locator)
      await pushScenario(scenarioArtifact, emitter, config)

      await assembly(emitter, config)
      resolve()
    } catch (e) {
      emitter.emit('deployIntents:error', e)
      reject(e)
    }
  })
}

export function deployViews(emitter, config, locator: LocationProvider) {
  return new Promise(async (resolve, reject) => {
    const { orgId, scenarioUuid, scenarioId, BearerEnv } = config

    try {
      const { buildDirectory } = await prepare(emitter, config, locator)({
        install: true,
        watchMode: null
      })
      if (!buildDirectory) {
        process.exit(1)
        return false
      }

      await transpileStep(emitter, locator, config)

      emitter.emit('views:generateSetupComponent')
      await execPromise('bearer generate --setup', { cwd: buildDirectory })

      emitter.emit('views:buildingDist')
      await execPromise(`${config.command} build`, {
        cwd: buildDirectory,
        env: {
          BEARER_SCENARIO_ID: scenarioUuid,
          ...process.env,
          CDN_HOST: `https://static.${BearerEnv}.bearer.sh/${orgId}/${scenarioId}/dist/${scenarioId}/`
        }
      })

      emitter.emit('views:pushingDist')
      await pushViews(buildDirectory, emitter, config)

      emitter.emit('view:upload:success')
      await invalidateCloudFront(emitter, config)
      resolve()
    } catch (e) {
      emitter.emit('deployScenario:deployViews:error', e)
      console.error(e)
      reject(e)
    }
  })
}

function transpileStep(emitter, locator: LocationProvider, config) {
  return new Promise(async (resolve, reject) => {
    const { scenarioUuid, integrationServiceHost } = config
    emitter.emit('start:prepare:transpileStep')
    const options = ['--no-watcher', `--prefix-tag ${scenarioUuid}`]
    const bearerTranspiler = spawn('node', [path.join(__dirname, 'startTranspiler.js')].concat(options), {
      cwd: locator.scenarioRoot,
      env: {
        ...process.env,
        BEARER_SCENARIO_ID: scenarioUuid,
        BEARER_INTEGRATION_HOST: integrationServiceHost
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })

    bearerTranspiler.on('close', (...args) => {
      emitter.emit('start:prepare:transpileStep:close', args)
      resolve(...args)
    })
    bearerTranspiler.stderr.on('data', (...args) => {
      emitter.emit('start:prepare:transpileStep:command:error', args)
      reject(...args)
    })
    bearerTranspiler.on('message', ({ event }) => {
      if (event === 'transpiler:initialized') {
        emitter.emit('start:prepare:transpileStep:done')
        resolve(bearerTranspiler)
      } else {
        emitter.emit('start:prepare:transpileStep:error')
        reject(event)
      }
    })
  })
}

export interface IDeployOptions {
  noViews?: boolean
  noIntents?: boolean
}

export function deployScenario({ noViews = false, noIntents = false }: IDeployOptions, emitter, config, locator) {
  return new Promise(async (resolve, reject) => {
    let calculatedConfig = config

    try {
      const { ExpiresAt } = config.bearerConfig

      if (ExpiresAt < Date.now()) {
        calculatedConfig = await refreshToken(config, emitter)
      }
      await developerPortal(emitter, 'predeploy', calculatedConfig)
      if (!noIntents) {
        await deployIntents(emitter, calculatedConfig, locator)
      }
      if (!noViews) {
        await deployViews(emitter, calculatedConfig, locator)
      }
      await developerPortal(emitter, 'deployed', calculatedConfig)
      resolve()
    } catch (e) {
      emitter.emit('deployScenario:error', e)
      await developerPortal(emitter, 'cancelled', calculatedConfig)
      reject(e)
    }
  })
}
