# @bearer/react
React tooling for bearer.sh components

## fromBearer
This componet takes html tag name of a componet as well as optional type information to produce a react component that can we re-used throughout an application.

```TSX
export const MyText = fromBearer<{text?:string}>('bearer-my-text')

render() {
  <MyText text='hello world'/>
}
```

Output events can be handled by simply adding the eventname as a prop on the component and adding a basic handler
```TSX
<Share 
  bearer-uuid-feature-shared={this.onShared}
/>  
```

For these tags to work correctly they must have a parent `BearerProvider`

## BearerProvider
This component maintains a shared state for a group of components as well as adding the bearer script tags to the page. This tag can be added at any level of the application as is convenient for the implementation


## Example Use

we will use [this scenario](https://app.bearer.sh/scenarios/6d29c4-share-slack-beta-4/preview) for our examples:

First on the preview page obtain a setup-id from the setup componets so we do not need to include these in our page. Next lets define our components in a constants file:

`bearer.ts`
```TS
import { fromBearer } from '@bearer/react'

export const ChannelSelect = fromBearer('bearer-6d29c4-share-slack-beta-4-channel-action')
export const Share = fromBearer<{message?:string, text?:string}>('bearer-6d29c4-share-slack-beta-4-feature-action')
export const SlackConnect = fromBearer('bearer-6d29c4-share-slack-beta-4-connect-action')
```

We can include the `BearerProvider` at any level but in this example lets use it all together in the same component

`slack-share-component.tsx`
```TSX
import { BearerProvider } from '@bearer/react'
import {SlackConnect, ChannelSelect, Share} from '../../constants/bearer'

export default class SlackShareSetup extends React.Component{
  public render(){
    const intialContext = {
        'setup-id': 'd30d9d50-0307-11e9-a3e1-ff7ca347ebae',
    }
    return (
      <BearerProvider
        clientId='a3efd4de0d7fbf1b54ecd29291e790e0a3edece0ee5db29e99'
        initialContext={intialContext}
      >
        <SlackConnect />
        <ChannelSelect />
        <Share 
          message="hello world!" 
          text="Test!" 
          bearer-6d29c4-share-slack-beta-4-feature-shared={this.onShared}
        />   
      </BearerProvider>
    )
  }
}
```

This allows to share messages but what if we want to persist the users setup information. @bearer/react provides two methods to acomplish this.

### Using onUpdate
`BearerProvider` has an `onUpdate `callback we can hook into which is called every time data changes within the provider

`slack-share-component.tsx`
```TSX
import { BearerProvider } from '@bearer/react'
import {SlackConnect, ChannelSelect, Share} from '../../constants/bearer'

export default class SlackShareSetup extends React.Component{
  public render(){
    const intialContext = {
        'setup-id': 'd30d9d50-0307-11e9-a3e1-ff7ca347ebae',
    }
    return (
      <BearerProvider
        clientId='a3efd4de0d7fbf1b54ecd29291e790e0a3edece0ee5db29e99'
        initialContext={intialContext}
        onUpdate={(data:any)=>{
          this.setState({data})
        }}
      >
        <SlackConnect />
        <ChannelSelect />
        <Share 
          message="hello world!" 
          text="Test!" 
          bearer-6d29c4-share-slack-beta-4-feature-shared={this.onShared}
        />  
        <button onClick={this.handleSave}>Save Setup</button> 
      </BearerProvider>
      
    )
  }
  private handleSave = () => (
    console.log('handleSave', this.state.data)
  )
}
```

### using a context consumer

Internally `BearerProvider` uses the [react context API](https://reactjs.org/docs/context.html). For a more advaned but flexable method we can access the consumer directly via `BearerContext` and then use the currently set details as we wish.

`slack-share-component.tsx`
```TSX
import { BearerProvider, BearerContext } from '@bearer/react'
import {SlackConnect, ChannelSelect, Share} from '../../constants/bearer'

export default class SlackShareSetup extends React.Component{
  public render(){
    const intialContext = {
        'setup-id': 'd30d9d50-0307-11e9-a3e1-ff7ca347ebae',
    }
    return (
      <BearerProvider
        clientId='a3efd4de0d7fbf1b54ecd29291e790e0a3edece0ee5db29e99'
        initialContext={intialContext}
      >
        <SlackConnect />
        <ChannelSelect />
        <Share 
          message="hello world!" 
          text="Test!" 
          bearer-6d29c4-share-slack-beta-4-feature-shared={this.onShared}
        />
        <BearerContext.Consumer>
          {
            (context)=> (
                <button onClick={this.handleSave(context.state)}>Save Setup</button>
            )
          }
        </BearerContext.Consumer> 
      </BearerProvider>
    )
  }
  private handleSave = (data: any) => (
    () => {
      console.log('handleSave', data)
    }
  )
}
```