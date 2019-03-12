import { TBASICAuthContext, FetchData, TFetchActionEvent, TFetchPromise } from '@bearer/functions'

export default class RetrieveSetupFunction extends FetchData implements FetchData<ReturnedData, any, TBASICAuthContext> {
  async action(event: TFetchActionEvent<Params, TBASICAuthContext>): TFetchPromise<ReturnedData> {
    return { data: { referenceId: event.params.referenceId, ...event.context.reference } }
  }
}

export type Params = {
  setup: any
  referenceId: string
}

export type ReturnedData = {
  username: string
  password: string
  referenceId: string
}
