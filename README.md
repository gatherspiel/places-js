

PlacesJS is a framework based on Web Components for building interactive UIs and managing state.

Here are some notes about the goals of the framework and some patterns.

# Goals of framework

## Separation of concerns.

- Enforce that event handlers, components, and logic to update state is separated.

## Enforce specific patterns

- There shouldn't be multiple ways of doing something.

## Minimize dependencies

- Outside of TypeScript, this framework should have no dependencies unless absolutely necessary.


## State management

In order to modify state, PlacesJS, uses an adaptation of the Flux pattern and reducers.
