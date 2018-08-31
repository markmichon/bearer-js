import GenerateComponent from '../../../src/commands/generate/component'
import { ensureBearerStructure } from '../../helpers/setup'
import { readFile } from '../../helpers/utils'

describe('Generate', () => {
  let bearerPath: string
  let result: Array<string>

  beforeEach(() => {
    result = []
    jest.spyOn(process.stdout, 'write').mockImplementation(val => result.push(val))
    bearerPath = ensureBearerStructure()
  })

  describe('generate:component', () => {
    it('blank component', async () => {
      await GenerateComponent.run(['blankComponent', '-t', 'blank', '--path', bearerPath])
      expect(result.join()).toContain('Component generated')
      expect(readFile(bearerPath, 'views', 'components', 'blankComponent.tsx')).toMatchSnapshot()
    })

    it('collection component', async () => {
      await GenerateComponent.run(['collectionComponent', '-t', 'collection', '--path', bearerPath])
      expect(result.join()).toContain('Component generated')
      expect(readFile(bearerPath, 'views', 'components', 'collectionComponent.tsx')).toMatchSnapshot()
    })

    it('root component', async () => {
      await GenerateComponent.run(['rootComponent', '-t', 'root', '--path', bearerPath])
      expect(result.join()).toContain('Component generated')
      expect(readFile(bearerPath, 'views', 'root-component-action.tsx')).toMatchSnapshot()
      expect(readFile(bearerPath, 'views', 'root-component-display.tsx')).toMatchSnapshot()
    })
  })
})