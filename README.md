

PlacesJS is a framework based on Web Components for building interative UIs and managing state.

Currently the framework is under active development and the source code is located [here](https://github.com/free-gather/DMVBoardGames/tree/main/src/framework). In the future, the framework source code will be in this repo and be deployed as an
npm package.

Here are some notes about the goals of the framework and some patterns

# Goals of framework

## Separation of concerns.

- Enforce that event handlers, components, and logic to update state is separated.

## Enforce specific patterns

- There shouldn't be multiple ways of doing something.

## Minimize dependencies

- Outside of TypeScript, this framework should have no dependencies unless absolutely necessary.


# Notes on specific parts of framework

## State management

In order to modify state, PlacesJS, uses an adaptation of the Flux pattern and reducers.
