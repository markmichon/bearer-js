import { capitalize } from './string'

export function retrieveIntentName(name: string): string {
  return `retrieve${capitalize(name)}`
}

export function retrieveFetcherName(name: string): string {
  return `fetcherRetrieve${capitalize(name)}`
}

export function loadName(name: string): string {
  return `_load${capitalize(name)}`
}

export function initialName(name: string): string {
  return `${name}Initial`
}