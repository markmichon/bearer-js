import * as Case from 'case'
import * as ts from 'typescript'
import { JsonSchemaGenerator } from 'typescript-json-schema'

import { Component, Decorators } from '../constants'
import { getDecoratorNamed, getExpressionFromDecorator, hasDecoratorNamed } from '../helpers/decorator-helpers'
import { TComponentInputDefinition, TComponentOutputDefinition, TOuputFormat, TransformerOptions } from '../types'

const UNSPECIFIED = 'unspecified'

export default function GatherMetadata({
  metadata,
  generator
}: TransformerOptions & { generator: JsonSchemaGenerator }): ts.TransformerFactory<ts.SourceFile> {
  function propAsInput(tsProp: ts.PropertyDeclaration): TComponentInputDefinition {
    return {
      name: (tsProp.name as ts.Identifier).escapedText.toString(),
      type: tsProp.type.kind === ts.SyntaxKind.NumberKeyword ? 'number' : 'string',
      default: (tsProp.initializer as ts.Expression).getText()
    }
  }

  function propInitializerAsJson(tsType: ts.TypeReferenceNode): TOuputFormat {
    if (!tsType.typeArguments || !Boolean(tsType.typeArguments.length) || !generator) {
      return UNSPECIFIED
    }
    const typeArgument = tsType.typeArguments[0]

    switch (typeArgument.kind) {
      case ts.SyntaxKind.TypeReference:
        // if (typeArgument) console.log('[BEARER]', 'typeArgument', typeArgument.getText())
        return generator.getSchemaForSymbol(typeArgument.getText()) as any
      case ts.SyntaxKind.TypeLiteral:
        return { type: 'object' } as any
      case ts.SyntaxKind.NumberKeyword:
        return { type: 'number' }
      case ts.SyntaxKind.BooleanKeyword:
        return { type: 'boolean' }
      case ts.SyntaxKind.StringKeyword:
        return { type: 'string' }
    }
    return {}
  }

  function eventAsOutput(tsProp: ts.PropertyDeclaration): TComponentOutputDefinition {
    return {
      name: (tsProp.name as ts.Identifier).escapedText.toString(),
      payloadFormat: propInitializerAsJson(tsProp.type as ts.TypeReferenceNode)
    }
  }

  function collectInputs(tsClass: ts.ClassDeclaration): Array<TComponentInputDefinition> {
    return tsClass.members
      .filter(member => ts.isPropertyDeclaration(member) && hasDecoratorNamed(member, Decorators.Prop))
      .map(propAsInput)
      .filter(prop => prop.name !== Component.bearerContext)
  }

  function collectOutputs(tsClass: ts.ClassDeclaration): Array<TComponentOutputDefinition> {
    return tsClass.members
      .filter(member => ts.isPropertyDeclaration(member) && hasDecoratorNamed(member, Decorators.Event))
      .map(eventAsOutput)
  }

  function getTagNames(tagName: string): { initialTagName: string; finalTagName: string } {
    const finalTag =
      metadata.prefix && metadata.suffix
        ? [Case.kebab(metadata.prefix), tagName, Case.kebab(metadata.suffix)].join('-')
        : tagName
    return {
      initialTagName: tagName,
      finalTagName: finalTag
    }
  }

  function visit(node: ts.Node): ts.Node {
    // Found Component
    if (ts.isClassDeclaration(node)) {
      if (hasDecoratorNamed(node, Decorators.Component)) {
        const component = getDecoratorNamed(node, Decorators.Component)
        const tag = getExpressionFromDecorator<ts.StringLiteral>(component, 'tag')
        metadata.registerComponent({
          classname: node.name.text,
          isRoot: false,
          ...getTagNames(tag.text)
        })
      }
      // Found RootComponent
      else if (hasDecoratorNamed(node, Decorators.RootComponent)) {
        const component = getDecoratorNamed(node, Decorators.RootComponent)
        const nameExpression = getExpressionFromDecorator<ts.StringLiteral>(component, 'role')
        const name = nameExpression ? nameExpression.text : ''
        const groupExpression = getExpressionFromDecorator<ts.StringLiteral>(component, 'group')
        const group = groupExpression ? groupExpression.text : ''
        const tag = [Case.kebab(group), name].join('-')
        metadata.registerComponent({
          classname: node.name.text,
          isRoot: true,
          ...getTagNames(tag),
          group,
          inputs: collectInputs(node),
          outputs: collectOutputs(node)
        })
      }
    }
    return node
  }

  return _transformContext => {
    return tsSourceFile => {
      return ts.visitEachChild(tsSourceFile, visit, _transformContext)
    }
  }
}
