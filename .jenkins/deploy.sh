#! /bin/bash

ARG="--yes --npm-tag=$LERNA_TAG"

if [ ! .npmrc ]; then
  echo "Missing .npmrc file"
  exit 1
fi

if [ ! -f ~/.gitconfig ]; then
  echo "Missing ~/.gitconfig file"
  exit 1
fi

echo "Starting publishing"
yarn lerna-publish $ARG