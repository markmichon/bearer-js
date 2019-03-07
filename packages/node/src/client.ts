import axios, { AxiosInstance } from 'axios'

type TClientOptions = {
  hostUrl: string
}

type TIntentParams = { query?: any; body?: any }
const defaultIntentParams = { query: {}, body: {} }

export class BearerClient<T = string> {
  protected static defaultOptions = { hostUrl: 'https://int.bearer.sh/api/v3/intents/backend' }
  protected options: TClientOptions
  protected client: AxiosInstance

  constructor(protected readonly token: string, clientOptions: Partial<TClientOptions> = {}) {
    this.options = { ...BearerClient.defaultOptions, ...clientOptions }

    this.client = axios.create({
      baseURL: this.options.hostUrl,
      headers: {
        Authorization: token
      }
    })
  }

  public call(integrationName: string, intentName: T, { query, body }: TIntentParams = defaultIntentParams) {
    return this.client.post(`${integrationName}/${intentName}`, body, {
      params: query
    })
  }
}

export class IntegrationClient<T = string> {
  private bearerClient: BearerClient<T>

  constructor(token: string, clientOptions: Partial<TClientOptions> = {}, private readonly integrationName: string) {
    this.bearerClient = new BearerClient<T>(token, clientOptions)
  }

  public call(intentName: T, intentParams: TIntentParams = defaultIntentParams) {
    return this.bearerClient.call(this.integrationName, intentName, intentParams)
  }
}

export default (token: string): BearerClient => {
  return new BearerClient(token)
}
