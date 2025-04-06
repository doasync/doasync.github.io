Effector.dev Documentation
---

# FAQ

## FAQ

### Why do we need babel/swc plugin for SSR?

Effector plugins inserts special tags - SIDs - into the code, it help to automate serialization and deserialization of stores, so users doesn't have to think about it. See article about sids for more info.

### Why do we need to give names to events, effects etc. ?

This will help in the future, in the development of the effector devtools, and now it is used in the [playground](https://share.effector.dev) on the left sidebar.
If you don't want to do it, you can use the [babel plugin](https://www.npmjs.com/package/@effector/babel-plugin). It will automatically generate the name for events and effects from the variable name.


# Isolated Contexts in Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Scope: Working with Isolated Contexts

Scope is an isolated environment for state management in Effector. Scope allows creating independent copies of the entire application state, which is particularly useful for:

* 🗄️ Server Side Rendering (SSR)
* 🧪 Testing components and business logic
* 🔒 Isolating state for different users/sessions
* 🚀 Running multiple application instances in parallel

Scope creates a separate "universe" for Effector units, where each store has its independent state, and events and effects work with this state in isolation from other scopes.

> INFO Creating a Scope: 
>
> You can create an application scope using the fork method.
> Fork API is one of the most powerful features of Effector.

And voila, now the `Counter` component works with its isolated state - this is exactly what we wanted. Let's look at other important applications of `Scope`.

> TIP Automatic Scope Propagation: 
>
> You don't need to manually track that each operation is performed in the correct scope. Effector does this automatically; just call the event chain with a specific scope using the return value of `useUnit` in component or `allSettled`.

### Rules for Working with Scope

When working with Scope, it's important to understand the rules for calling effects and events to avoid context loss. Let's look at the main usage patterns:

#### Rules for Effect Calls

1. Effects can be safely called inside other effects
2. You can't mix effect calls with regular async functions

<Tabs>
  <TabItem label="✅ Correct">

```ts
const authFx = createEffect(async () => {
  // Safe - calling an effect inside an effect
  await loginFx();

  // Safe - Promise.all with effects
  await Promise.all([loadProfileFx(), loadSettingsFx()]);
});
```

  </TabItem>
  <TabItem label="❌ Incorrect">

```ts
const authFx = createEffect(async () => {
  await loginFx();

  // Scope loss! Can't mix with regular promises
  await new Promise((resolve) => setTimeout(resolve, 100));

  // This call will be in the global scope
  await loadProfileFx();
});
```

  </TabItem>
</Tabs>

If you don't follow these rules, it could lead to scope loss!

> TIP ✅ Better Declaratively!: 
>
> It's better to call effects declaratively using the `sample` method!

### Working with Initial State

When creating a scope, it's often necessary to set initial values for stores. This is especially important for SSR or testing, when you need to prepare a specific application state. You can do this by passing the `values` property in the first argument of the `fork` method.

```ts
const scope = fork({
  values: [
    [$store, "value"],
    [$user, { id: 1, name: "Alice" }],
  ],
});
```

> INFO What values accepts: 
>
> The `values` property accepts an array of pairs with the value `[$store, value]`.

This is especially useful in cases of:

* Server Side Rendering (SSR) - to hydrate the client with necessary data from the server
* Testing components with different initial data
* Saving and restoring application state

> INFO State Isolation: 
>
> `Scope` creates a separate copy of the state. The original store remains unchanged!

### SSR Usage

Scope is a **key** mechanism for implementing SSR in Effector.
Imagine two users visiting your website and both sending requests to get a list of users. Since the store is in the global scope, a [race condition ](https://en.wikipedia.org/wiki/Race_condition) would occur here, and whichever request completes faster, **BOTH** users would receive that data, leading to data leaks between different users.

> WARNING Serialization: 
>
> When serializing scope, stores with the flag `{serialize: 'ignore'}` are automatically ignored. Use this flag to prevent sensitive data leaks.

When using scope, each request gets its own copy of the state:

<Tabs>
  <TabItem label="🗄️ Server">

```jsx
// server.tsx
import { renderToString } from "react-dom/server";
import { fork, serialize } from "effector";
import { Provider } from "effector-react";
import { $users, fetchUsersFx } from "./model";

async function serverRender() {
  const scope = fork();

  // Load data on the server
  await allSettled(fetchUsersFx, { scope });

  // Render the application
  const html = renderToString(
    <Provider value={scope}>
      <App />
    </Provider>,
  );

  // Serialize state for transfer to the client
  const data = serialize(scope);

  return `
	<html>
	  <body>
		<div id="root">${html}</div>
		<script>window.INITIAL_DATA = ${data}</script>
	  </body>
	</html>
`;
}
```

</TabItem>
<TabItem label="🧑‍💻 Client">

```tsx
// client.tsx
import { hydrateRoot } from "react-dom/client";
import { fork } from "effector";

const scope = fork({
  values: window.INITIAL_DATA,
});

hydrateRoot(
  document.getElementById("root"),
  <Provider value={scope}>
    <App />
  </Provider>,
);
```

</TabItem>
</Tabs>

> INFO About allSettled: 
>
> The allSettled function accepts an `event`, `effect`, or `scope`, and waits for all side effects it spawns to complete. In this example, this ensures that all asynchronous operations complete before state serialization.

In this example we:

1. Create a scope on the server and run initial data preparation in it
2. Serialize the scope state
3. Restore state from serialized data on the client

Thanks to using Scope, we can easily:

* Prepare initial state on the server
* Serialize this state
* Restore state on the client
* Ensure hydration without losing reactivity

> TIP Data Serialization: 
>
> The `serialize` method transforms state into serialized form that can be safely transferred from server to client. Only data is serialized, not functions or methods.

Here we've shown you a small example of working with SSR. For a more detailed guide on how to set up and work with SSR, you can read here.

### Testing

Scope is a powerful tool for testing as it allows:

* Isolating tests from each other
* Setting initial state for each test
* Checking state changes after actions
* Simulating different user scenarios

Example of testing the authorization process:

```ts
describe("auth flow", () => {
  it("should login user", async () => {
    // Create isolated scope for test
    const scope = fork();

    // Execute login effect
    await allSettled(loginFx, {
      scope,
      params: {
        email: "test@example.com",
        password: "123456",
      },
    });

    // Check state specifically in this scope
    expect(scope.getState($user)).toEqual({
      id: 1,
      email: "test@example.com",
    });
  });

  it("should handle login error", async () => {
    const scope = fork();

    await allSettled(loginFx, {
      scope,
      params: {
        email: "invalid",
        password: "123",
      },
    });

    expect(scope.getState($error)).toBe("Invalid credentials");
    expect(scope.getState($user)).toBeNull();
  });
});
```

#### Mocking effects

A similar pattern for initial values can be used for effects to implement mock data. For this, you need to pass `handlers` in the argument object:

```ts
// You can also pass mocks for effects:
const scope = fork({
  handlers: [
    [effectA, async () => "true"],
    [effectB, async () => ({ id: 1, data: "mock" })],
  ],
});
```

### Scope Loss and Binding

When handling asynchronous operations, we might encounter scope "loss". This happens because asynchronous operations in JavaScript execute in a different event loop cycle, where the execution context is already lost. At the moment of creating an asynchronous operation, the scope exists, but by the time it executes, it's no longer accessible, as Effector cannot automatically preserve and restore context across asynchronous boundaries.
This can happen when using APIs such as:

* `setTimeout`/`setInterval`
* `addEventListener`
* `webSocket` и др.

#### How to Fix Scope Loss?

This is where the scopeBind method comes to help. It creates a function bound to the scope in which the method was called, allowing it to be safely called later.

Let's look at an example where we have two timers on a page and each works independently. Each timer has the following events:

* Stop timer - `timerStopped`
* Start timer - `timerStarted`
* Reset timer - `timerReset`

```ts
export const timerStopped = createEvent();
export const timerReset = createEvent();
export const timerStarted = createEvent();
```

We'll also have a `tick` event that our store will subscribe to for updating the counter.
To store the result, we'll create a `$timerCount` store.

```ts
const tick = createEvent();

export const $timerCount = createStore(0)
  .on(tick, (seconds) => seconds + 1)
  .reset(timerReset);
```

Don't forget about clearing the timer; for this, we'll also need to create a `$timerId` store to save the `intervalId`.
We also need effects for:

1. Starting the timer – `startFx`
2. Clearing the timer – `stopFx`

```ts
const TIMEOUT = 1_000;

const timerStopped = createEvent();
const timerReset = createEvent();
const timerStarted = createEvent();
const tick = createEvent();

// start timer
const startFx = createEffect(() => {
  const intervalId = setInterval(() => {
    // here's the whole problem
    tick();
  }, TIMEOUT);

  return intervalId;
});

// stop and clear timer
const stopFx = createEffect((timerId: number) => {
  clearInterval(timerId);
});

// timer id
export const $timerId = createStore<null | number>(null)
  .on(startFx.doneData, (_, timerId) => timerId)
  .on(stopFx.finally, () => null);

// start timer logic
sample({
  clock: timerStarted,
  filter: $timerId.map((timerId) => !timerId),
  target: startFx,
});

// stop timer logic
sample({
  clock: timerStopped,
  source: $timerId,
  filter: Boolean,
  target: stopFx,
});
```

Notice the tick call in `setInterval` - we're calling it directly. This is where the whole problem lies, as we mentioned above, by the time `tick` is called, the scope might have changed or been removed - in other words, "lost". However, thanks to `scopeBind`, we bind the `tick` event to the scope we need.

<Tabs>
<TabItem label="❌ Before">

```ts
const startFx = createEffect(() => {
  const intervalId = setInterval(() => {
    tick();
  }, TIMEOUT);

  return intervalId;
});
```

</TabItem>
<TabItem label="✅ After">

```ts
const startFx = createEffect(() => {
  const bindedTick = scopeBind(tick);

  const intervalId = setInterval(() => {
    bindedTick();
  }, TIMEOUT);

  return intervalId;
});
```

</TabItem>
</Tabs>

> INFO scopeBind without scope?: 
>
> You may have already noticed that we don't pass the scope itself to `scopeBind`; this is because the current scope is in a global variable, and the `scopeBind` function captures the needed scope in itself at the moment of calling. However, if you need to, you can pass the needed `scope` in the second argument object.

So altogether we have:

```ts
import { createEffect, createEvent, createStore, sample, scopeBind } from "effector";

const TIMEOUT = 1_000;

const timerStopped = createEvent();
const timerReset = createEvent();
const timerStarted = createEvent();
const tick = createEvent();

// start timer
const startFx = createEffect(() => {
  // bind event to scope, so our data doesn't get lost
  const bindedTick = scopeBind(tick);

  const intervalId = setInterval(() => {
    bindedTick();
  }, TIMEOUT);

  return intervalId;
});

// stop and clean timer
const stopFx = createEffect((timerId: number) => {
  clearInterval(timerId);
});

// timer count in seconds
const $timerCount = createStore(0)
  .on(tick, (seconds) => seconds + 1)
  .reset(timerReset);

// timer id
const $timerId = createStore<null | number>(null)
  .on(startFx.doneData, (_, timerId) => timerId)
  .reset(stopFx.finally);

// start timer logic
sample({
  clock: timerStarted,
  filter: $timerId.map((timerId) => !timerId),
  target: startFx,
});

// stop timer logic
sample({
  clock: timerStopped,
  source: $timerId,
  filter: Boolean,
  target: stopFx,
});
```

> TIP Scope and frameworks: 
>
> If you are using effector with integrations like 📘 React, 📗 Vue etc. you can use hook `useUnit` for units (store, event and effect). This hook automatically binds the unit to the current scope.

#### Why Does Scope Loss Occur?

Let's imagine how scope work under the hood:

```ts
// out current scope
let scope;

function process() {
  try {
    scope = "effector";
    asyncProcess();
  } finally {
    scope = undefined;
    console.log("scope is undefined");
  }
}

async function asyncProcess() {
  console.log("here is ok", scope); // effector

  await 1;

  // here we already lost context
  console.log("but here is not ok ", scope); // undefined
}

process();

// Output:
// here is ok effector
// scope is undefined
// but here is not ok undefined
```

> WARNING Consequences of scope loss: 
>
> Scope loss can lead to:
>
> * Updates not reaching the correct scope
> * Client receiving inconsistent state
> * Changes not being reflected in the UI
> * Possible data leaks between different users during SSR

You might be wondering **"Is this specifically an Effector problem?"**, but this is a general principle of working with asynchronicity in JavaScript. All technologies that face the need to preserve the context in which calls occur somehow work around this difficulty. The most characteristic example is [zone.js](https://github.com/angular/angular/tree/main/packages/zone.js),
which wraps all asynchronous global functions like `setTimeout` or `Promise.resolve` to preserve context. Other solutions to this problem include using generators or `ctx.schedule(() => asyncCall())`.

> INFO Future solution: 
>
> JavaScript is preparing a proposal [Async Context](https://github.com/tc39/proposal-async-context), which aims to solve the context loss problem at the language level. This will allow:
>
> Automatically preserving context through all asynchronous calls
> Eliminating the need for explicit use of scopeBind
> Getting more predictable behavior of asynchronous code
>
> Once this proposal enters the language and receives wide support, Effector will be updated to use this native solution.


# Effector React Gate

*Gate* is a hook for conditional rendering, based on the current value (or values) in props. It can solve problems such as compiling all required data when a component mounts, or showing an alternative component if there is insufficient data in props. Gate is also useful for routing or animations, similar to ReactTransitionGroup.

This enables the creation of a feedback loop by sending props back to a *Store*.

Gate can be integrated via the useGate hook or as a component with props. Gate stores and events function as standard units within an application.

Gate has two potential states:

* **Opened**, indicating the component is mounted.
* **Closed**, indicating the component is unmounted.

<br/>

**Example of using Gate as a component:**

```tsx
<Gate history={history} />
```

## Properties

### `.state` Store

> WARNING Important: 
>
> Do not modify the `state` value! It is a derived store and should remain in a predictable state.

`Store<Props>`: DerivedStore containing the current state of the gate. This state derives from the second argument of useGate and from props when rendering the gate as a component.

#### Example

```tsx
import { createGate, useGate } from "effector-react";

const Gate = createGate();

Gate.state.watch((state) => console.info("gate state updated", state));

function App() {
  useGate(Gate, { props: "yep" });
  return <div>Example</div>;
}

ReactDOM.render(<App />, root);
// => gate state updated { props: "yep" }
```

### `.open` Event

> INFO Important: 
>
> Do not manually invoke this event. It is an event that is triggered based on the gate's state.

Event: Event fired upon gate mounting.

### `.close` Event

> INFO Important: 
>
> Do not manually invoke this event. It is an event that is triggered based on the gate's state.

Event: Event fired upon gate unmounting.

### `.status` Store

> WARNING Important: 
>
> Do not modify the `status` value! It is a derived store and should remain in a predictable state.

Store: Boolean DerivedStore indicating whether the gate is mounted.

#### Example

```tsx
import { createGate, useGate } from "effector-react";

const Gate = createGate();

Gate.status.watch((opened) => console.info("is Gate opened?", opened));
// => is Gate opened? false

function App() {
  useGate(Gate);
  return <div>Example</div>;
}

ReactDOM.render(<App />, root);
// => is Gate opened? true
```


# Provider

React `Context.Provider` component, which takes any Scope in its `value` prop and makes all hooks in the subtree work with this scope:

* `useUnit($store)` (and etc.) will read the state and subscribe to updates of the `$store` in this scope
* `useUnit(event)` (and etc.) will bind provided event or effect to this scope

## Usage

### Example Usage

Here is an example of `<Provider />` usage.

```tsx
import { createEvent, createStore, fork } from "effector";
import { useUnit, Provider } from "effector-react";
import { render } from "react-dom";

const buttonClicked = createEvent();
const $count = createStore(0);

$count.on(buttonClicked, (counter) => counter + 1);

const App = () => {
  const [count, handleClick] = useUnit([$count, buttonClicked]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => handleClick()}>increment</button>
    </>
  );
};

const myScope = fork({
  values: [[$count, 42]],
});

render(
  <Provider value={myScope}>
    <App />
  </Provider>,
  document.getElementById("root"),
);
```

The `<App />` component is placed in the subtree of `<Provider value={myScope} />`, so its `useUnit([$count, inc])` call will return

* State of the `$count` store in the `myScope`
* Version of `buttonClicked` event, which is bound to the `myScope`, which, if called, updates the `$count` state in the `myScope`

### Multiple Providers Usage

There can be as many `<Provider />` instances in the tree, as you may need.

```tsx
import { fork } from "effector";
import { Provider } from "effector-react";
import { App } from "@/app";

const scopeA = fork();
const scopeB = fork();

const ParallelWidgets = () => (
  <>
    <Provider value={scopeA}>
      <App />
    </Provider>
    <Provider value={scopeB}>
      <App />
    </Provider>
  </>
);
```

## Provider Properties

### `value`

`Scope`: any Scope. All hooks in the subtree will work with this scope.


# connect

```ts
import { connect } from "effector-react";
```

> WARNING Deprecated: 
>
> since [effector-react 23.0.0](https://changelog.effector.dev/#effector-react-23-0-0).
>
> Consider using hooks api in modern projects.

Wrapper for useUnit to use during migration from redux and class-based projects. Will merge store value fields to component props.

## Methods

### `connect($store)(Component)`

#### Formulae

```ts
connect($store: Store<T>)(Component): Component
```

#### Arguments

1. `$store` (Store): store or object with stores

#### Returns

`(Component) => Component`: Function, which accepts react component and return component with store fields merged into props

### `connect(Component)($store)`

#### Formulae

```ts
connect(Component)($store: Store<T>): Component
```

#### Arguments

1. `Component` (React.ComponentType): react component

#### Returns

`($store: Store<T>) => Component`: Function, which accepts a store and returns component with store fields merged into props


# createComponent

```ts
import { createComponent } from "effector-react";
```

> WARNING Deprecated: 
>
> since [effector-react 23.0.0](https://changelog.effector.dev/#effector-react-23-0-0).
>
> You can use hooks api in `createComponent` since [effector-react@20.3.0](https://changelog.effector.dev/#effector-20-3-0).

## Methods

### `createComponent($store, render)`

Creates a store-based React component. The `createComponent` method is useful for transferring logic and data of state to your View component.

#### Arguments

1. `$store` (*Store | Object*): `Store` or object of `Store`
2. `render` (*Function*): Render function which will be called with props and state

#### Returns

(*`React.Component`*): Returns a React component.

#### Example

```jsx
import { createStore, createEvent } from "effector";
import { createComponent } from "effector-react";

const increment = createEvent();

const $counter = createStore(0).on(increment, (n) => n + 1);

const MyCounter = createComponent($counter, (props, state) => (
  <div>
    Counter: {state}
    <button onClick={increment}>increment</button>
  </div>
));

const MyOwnComponent = () => {
  // any stuff here
  return <MyCounter />;
};
```

Try it


# createGate

```ts
import { createGate, type Gate } from "effector-react";
```

## Methods

### `createGate(name?)`

Creates a 

#### Formulae

```ts
createGate(name?: string): Gate<T>
```

#### Arguments

1. `name?` (*string*): Optional name which will be used as the name of a created React component

#### Returns

Gate\<T>

#### Examples

##### Basic Usage

```jsx
import React from "react";
import ReactDOM from "react-dom";
import { createGate } from "effector-react";

const Gate = createGate("gate with props");

const App = () => (
  <section>
    <Gate foo="bar" />
  </section>
);

Gate.state.watch((state) => {
  console.log("current state", state);
});
// => current state {}

ReactDOM.render(<App />, document.getElementById("root"));
// => current state {foo: 'bar'}

ReactDOM.unmountComponentAtNode(document.getElementById("root"));
// => current state {}
```

Try it

### `createGate(config?)`

Creates a , if `defaultState` is defined, Gate.state will be created with passed value.

#### Formulae

```ts
createGate({ defaultState?: T, domain?: Domain, name?: string }): Gate<T>
```

#### Arguments

`config` (*Object*): Optional configuration object

* `defaultState?`: Optional default state for Gate.state
* `domain?` (): Optional domain which will be used to create gate units (Gate.open event, Gate.state store, and so on)
* `name?` (*string*): Optional name which will be used as the name of a created React component

#### Returns

Gate\<T>


# createStoreConsumer

```ts
import { createStoreConsumer } from "effector-react";
```

> WARNING Deprecated: 
>
> since [effector-react 23.0.0](https://changelog.effector.dev/#effector-react-23-0-0).
>
> Consider using hooks api in modern projects.

## Methods

### `createStoreConsumer($store)`

Creates a store-based React component which is watching for changes in the store. Based on *Render Props* technique.

#### Arguments

1. `$store` (Store)

#### Returns

(`React.Component`)

#### Examples

```jsx
import { createStore } from "effector";
import { createStoreConsumer } from "effector-react";

const $firstName = createStore("Alan");

const FirstName = createStoreConsumer($firstName);

const App = () => <FirstName>{(name) => <h1>{name}</h1>}</FirstName>;
```

Try it


# effector-react

Effector bindings for ReactJS.

## Hooks

* useUnit(units)
* useList(store, renderItem)
* useStoreMap({ store, keys, fn })
* useStore(store)
* useEvent(unit)

## Components

* Provider

## Gate API

* Gate
* createGate()
* useGate(GateComponent, props)

## Higher Order Components API

* createComponent(store, render)
* createStoreConsumer(store) renders props style
* connect(store)(Component) "connect" style

## Import map

Package `effector-react` provides couple different entry points for different purposes:

* effector-react/compat
* effector-react/scope


# effector-react/scope

```ts
import {} from "effector-react/scope";
```

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) the core team recommends using main module of `effector-react` instead.

Provides all exports from effector-react, but enforces application to use Scope for all components.

### Usage

You can use this module in the same way as effector-react, but it will require passing Scope to Provider component.

```jsx
// main.js
import { fork } from "effector";
import { Provider } from "effector-react/scope";

import React from "react";
import ReactDOM from "react-dom/client";

const scope = fork();
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <Provider value={scope}>
    <Application />
  </Provider>,
);
```

### Migration

Since `effector-react/scope` is deprecated, it is better to migrate to effector-react by removing `scope` from import path.

```diff
+ import { Provider } from "effector-react";
- import { Provider } from "effector-react/scope";
```

> WARNING Continues migration: 
>
> `effector-react` and `effector-react/scope` do not share any code, so you have to migrate all your code to `effector-react` in the same time, because otherwise you will get runtime errors. These errors will be thrown because `effector-react` and `effector-react/scope` will use different instances `Provider` and do not have access to each other's `Provider`.

If you use [Babel](https://babeljs.io/), you need to remove parameter reactSsr from `babel-plugin` configuration.

```diff
{
  "plugins": [
    [
      "effector/babel-plugin",
      {
-        "reactSsr": true
      }
    ]
  ]
}
```

If you use SWC, you need to remove [`bindings.react.scopeReplace`](https://github.com/effector/swc-plugin#bindings) parameter from `@effector/swc-plugin` configuration.

```diff
{
  "$schema": "https://json.schemastore.org/swcrc",
  "jsc": {
    "experimental": {
      "plugins": [
        "@effector/swc-plugin",
        {
          "bindings": {
            "react": {
-             "scopeReplace": true
            }
          }
        }
      ]
    }
  }
}
```

### Scope Enforcement

All modern hooks of `effector-react` are designed to work with Scope. If you want to imitate the behavior of `effector-react/scope` module, you can use the second parameter of hooks with an option `forceScope: true`. In this case, the hook will throw an error if the Scope is not passed to Provider.

```diff
- import { useUnit } from 'effector-react/scope'
+ import { useUnit } from 'effector-react'


function Example() {
-  const { text } = useUnit({ text: $text })
+  const { text } = useUnit({ text: $text }, { forceScope: true })

  return <p>{text}</p>
}
```


# effector-react/compat

```ts
import {} from "effector-react/compat";
```

The library provides a separate module with compatibility up to IE11 and Chrome 47 (browser for Smart TV devices).

> WARNING Bundler, Not Transpiler: 
>
> Since third-party libraries can import `effector-react` directly, you **should not** use transpilers like Babel to replace `effector-react` with `effector-react/compat` in your code because by default, Babel will not transform third-party code.
>
> **Use a bundler instead**, as it will replace `effector-react` with `effector-react/compat` in all modules, including those from third parties.

Since `effector-react` uses `effector` under the hood, you need to use the compat-version of `effector` as well. Please, read effector/compat for details.

### Required Polyfills

You need to install polyfills for these objects:

* `Promise`
* `Object.assign`
* `Array.prototype.flat`
* `Map`
* `Set`

In most cases, a bundler can automatically add polyfills.

#### Vite

<details>
<summary>Vite Configuration Example</summary>

```js
import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    legacy({
      polyfills: ["es.promise", "es.object.assign", "es.array.flat", "es.map", "es.set"],
    }),
  ],
});
```

</details>

## Usage

### Manual Usage

You can use it instead of the `effector-react` package if you need to support old browsers.

```diff
- import {useUnit} from 'effector-react'
+ import {useUnit} from 'effector-react/compat'
```

### Automatic Replacement

However, you can set up your bundler to automatically replace `effector` with `effector/compat` in your code.

#### Webpack

```js
module.exports = {
  resolve: {
    alias: {
      effector: "effector/compat",
      "effector-react": "effector-react/compat",
    },
  },
};
```

#### Vite

```js
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      effector: "effector/compat",
      "effector-react": "effector-react/compat",
    },
  },
});
```


# useEvent

```ts
import { useEvent } from "effector-react";
```

> INFO since: 
>
> `useEvent` introduced in [effector-react 20.9.0](https://changelog.effector.dev/#effector-20-9-0)

> WARNING This is API is deprecated: 
>
> Prefer useUnit hook instead.

Bind event to current  to use in dom event handlers.<br/>
Only `effector-react/scope` version works this way, `useEvent` of `effector-react` is a no-op and does not require `Provider` with scope.

> INFO Note: 
>
> Useful only if you have server-side rendering or writing tests for React-components.

## Methods

### `useEvent(unit)`

#### Arguments

1. `unit` ( or ): Event or effect which will be bound to current `scope`

#### Returns

(Function): Function to pass to event handlers. Will trigger a given unit in the current scope.

#### Examples

##### Basic Usage

```jsx
import ReactDOM from "react-dom";
import { createEvent, createStore, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (counter) => counter + 1);

const App = () => {
  const count = useStore($count);
  const handleIncrement = useEvent(incremented);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => handleIncrement()}>increment</button>
    </>
  );
};

const scope = fork();

ReactDOM.render(
  <Provider value={scope}>
    <App />
  </Provider>,
  document.getElementById("root"),
);
```

Try it

### `useEvent(shape)`

#### Arguments

1. `shape` Object or array of ( or ): Events or effects as values which will be bound to the current `scope`

#### Returns

(Object or Array): List of functions with the same names or keys as an argument to pass to event handlers. Will trigger a given unit in the current scope.

#### Examples

##### Object Usage

```jsx
import ReactDOM from "react-dom";
import { createStore, createEvent, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const incremented = createEvent();
const decremented = createEvent();

const $count = createStore(0);

$count.on(incremented, (counter) => counter + 1);
$count.on(decremented, (counter) => counter - 1);

const App = () => {
  const counter = useStore($count);
  const handler = useEvent({ incremented, decremented });
  // or
  const [handleIncrement, handleDecrement] = useEvent([incremented, decremented]);

  return (
    <>
      <p>Count: {counter}</p>
      <button onClick={() => handler.incremented()}>increment</button>
      <button onClick={() => handler.decremented()}>decrement</button>
    </>
  );
};

const scope = fork();

ReactDOM.render(
  <Provider value={scope}>
    <App />
  </Provider>,
  document.getElementById("root"),
);
```


# useGate

```ts
import { useGate } from "effector-react";
```

## Methods

### `useGate(Gate, props?)`

Hook for passing data to .

#### Formulae

```ts
const CustomGate: Gate<T>;

useGate(CustomGate, props?: T): void;
```

#### Arguments

1. `Gate` (Gate\<T>)
2. `props` (`T`)

#### Returns

(`void`)

#### Examples

##### Basic

```js
import { createGate, useGate } from "effector-react";
import { Route } from "react-router";

const PageGate = createGate("page");

PageGate.state.watch(({ match }) => {
  console.log(match);
});

const Home = (props) => {
  useGate(PageGate, props);

  return <section>Home</section>;
};

const App = () => <Route component={Home} />;
```


# useList

```ts
import { useList } from "effector-react";
```

> INFO since: 
>
> `useList` introduced in [effector-react 20.1.1](https://changelog.effector.dev/#effector-react-20-1-1)

Hook function for efficient rendering of list store.
Every item will be memoized and updated only when their data change.

## When should you use `useList`?

`useList` is designed to solve the specific task of efficiently rendering lists. With `useList`, you don’t need to manually set `key` for list components, and it implements a more optimized re-rendering process. If you feel that something else is needed, it means the feature has outgrown `useList`, and you should use useStoreMap. With `useStoreMap`, you can extract specific data from the store in an optimal way, especially if you don’t need the entire store, but only a part of it

## API

### `useList($store, fn)`

Using `index` as `key` for each element in the list.

#### Formulae

```ts
useList(
  $store: Store<T[]>,
  fn: (value: T, index: number) => React.ReactNode,
): React.ReactNode;
```

#### Arguments

1. `$store` (Store\<T>): Store with an array of items
2. `fn` (*Function*): Render function which will be called for every item in list

#### Returns

(`React.Node`)

#### Examples

##### Basic

```jsx
import { createStore } from "effector";
import { useList } from "effector-react";

const $users = createStore([
  { id: 1, name: "Yung" },
  { id: 2, name: "Lean" },
  { id: 3, name: "Kyoto" },
  { id: 4, name: "Sesh" },
]);

const App = () => {
  // we don't need keys here any more
  const list = useList($users, ({ name }, index) => (
    <li>
      [{index}] {name}
    </li>
  ));

  return <ul>{list}</ul>;
};
```

Try it

##### With store updates

```jsx
import { createStore, createEvent } from "effector";
import { useList, useUnit } from "effector-react";

const todoSubmitted = createEvent();
const todoToggled = createEvent();

const $todoList = createStore([
  { text: "write useList example", done: true },
  { text: "update readme", done: false },
]);

$todoList.on(todoToggled, (list, id) =>
  list.map((todo, index) => {
    if (index === id)
      return {
        ...todo,
        done: !todo.done,
      };
    return todo;
  }),
);

$todoList.on(todoSubmitted, (list, text) => [...list, { text, done: false }]);

todoSubmitted.watch((e) => {
  e.preventDefault();
});

const TodoList = () => {
  const [onTodoToggle] = useUnit([todoToggled]);
  return useList($todoList, ({ text, done }, index) => {
    const todo = done ? (
      <del>
        <span>{text}</span>
      </del>
    ) : (
      <span>{text}</span>
    );

    return <li onClick={() => onTodoToggle(index)}>{todo}</li>;
  });
};

const App = () => {
  const [onTodoSubmit] = useUnit([todoSubmitted]);

  function handleSubmit(e) {
    e.preventDefault();
    onTodoSubmit(e.currentTarget.elements.content.value);
  }

  return (
    <div>
      <h1>todo list</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="content">New todo</label>
        <input type="text" name="content" required />
        <input type="submit" value="Add" />
      </form>
      <ul>
        <TodoList />
      </ul>
    </div>
  );
};
```

Try it

### `useList($store, config)`

Used when you need to pass dependencies to react (to update items when some of its dependencies are changed).

By default, `useList` rerenders only when some of its items were changed.
However, sometimes we need to update items when some external value (e.g. props field or state of another store) changes.
In such case, we need to tell React about our dependencies and pass keys explicitly.

#### Formulae

```ts
useList(
  $store: Store<T[]>,
  config: {
    keys: any[],
    getKey?: (value: T) => React.Key,
    fn: (value: T, index: number) => React.ReactNode,
    placeholder?: React.ReactNode,
  }
): React.ReactNode;
```

#### Arguments

1. `$store` (Store\<T>): Store with an array of items
2. `config` (`Object`)
   * `keys` (`Array`): Array of dependencies, which will be passed to react by `useList`
   * `fn` (`(value: T) => React.ReactNode`): Render function which will be called for every item in list
   * `getKey` (`(value) => React.Key`): Optional function to compute key for every item of list
   * `placeholder` (`React.ReactNode`): Optional react node to render instead of an empty list

> INFO since: 
>
> `getKey` option introduced in [effector-react@21.3.0](https://changelog.effector.dev/#effector-react-21-3-0)

> INFO since: 
>
> `placeholder` option introduced in [effector-react@22.1.0](https://changelog.effector.dev/#effector-react-22-1-0)

#### Returns

(`React.Node`)

#### Examples

##### Basic

```jsx
import ReactDOM from "react-dom";
import { createEvent, createStore, restore } from "effector";
import { useUnit, useList } from "effector-react";

const renameUser = createEvent();

const $user = createStore("alice");
const $friends = createStore(["bob"]);

$user.on(renameUser, (_, name) => name);

const App = () => {
  const user = useUnit($user);

  return useList($friends, {
    keys: [user],
    fn: (friend) => (
      <div>
        {friend} is a friend of {user}
      </div>
    ),
  });
};

ReactDOM.render(<App />, document.getElementById("root"));
// => <div> bob is a friend of alice </div>

setTimeout(() => {
  renameUser("carol");
  // => <div> bob is a friend of carol </div>
}, 500);
```

Try it


# useProvidedScope

```ts
import { useProvidedScope } from "effector-react";
```

Low-level React Hook, which returns current Scope from Provider.

> WARNING This is a Low-Level API: 
>
> The `useProvidedScope` hook is a low-level API for library developers and **is not intended to be used in production code** directly.
>
> For production `effector-react` usage, see the useUnit hook.

## Methods

### `useProvidedScope()`

#### Formulae

```ts
useProvidedScope(): Scope | null
```

#### Returns

(Scope | null) — if no Scope provided, returns `null`.

#### Examples

This hook can be used in library internals to handle various edge-cases, where `createWatch` and `scopeBind` APIs are also needed.

For production code usage, see the useUnit hook instead.

```tsx
const useCustomLibraryInternals = () => {
  const scope = useProvidedScope();

  // ...
};
```


# useStore

```ts
import { useStore } from "effector-react";
```

React hook, which subscribes to a store and returns its current value, so when the store is updated, the component will update automatically.

> WARNING This is API is deprecated: 
>
> Prefer useUnit hook instead.

## Methods

### `useStore($store): State`

#### Formulae

```ts
useStore($store: Store<State>): State
```

#### Arguments

1. `$store`: Store

#### Returns

(*`State`*): The value from the store

#### Examples

```jsx
import { createStore } from "effector";
import { useStore, useEvent } from "effector-react";

const $counter = createStore(0);

const { incrementClicked, decrementClicked } = createApi($counter, {
  incrementClicked: (state) => state + 1,
  decrementClicked: (state) => state - 1,
});

const App = () => {
  const counter = useStore($counter);
  const [onIncrement, onDecrement] = useEvent([incrementClicked, decrementClicked]);

  return (
    <div>
      {counter}
      <button onClick={onIncrement}>Increment</button>
      <button onClick={onDecrement}>Decrement</button>
    </div>
  );
};
```

Try it


# useStoreMap

```ts
import { useStoreMap } from "effector-react";
```

> INFO since: 
>
> `useStoreMap` introduced in [effector-react 19.1.2](https://changelog.effector.dev/#effector-react-19-1-2)

React hook, which subscribes to a store and transforms its value with a given function. The component will update only when the selector function result will change.

You can read the motivation in the [issue](https://github.com/effector/effector/issues/118).

> WARNING Important: 
>
> When the selector function returns `undefined`, the hook will skip the state update.
> This can be problematic for example when working with optional properties. To handle such cases, use `defaultValue` option or transform `undefined` values in selector.

## Methods

### `useStoreMap($store, fn)`

> INFO since: 
>
> Short version of `useStoreMap` introduced in [effector-react@21.3.0](https://changelog.effector.dev/#effector-react-21-3-0)

Common use case: subscribe to changes in selected part of store only

#### Formulae

```ts
useStoreMap(
  $store: Store<State>,
  fn: (state: State) => Result,
): Result
```

#### Arguments

1. `$store`: Source Store\<State>
2. `fn` (`(state: State) => Result`): Selector function to receive part of source store

#### Returns

(`Result`): Value from the `fn` function call.

#### Examples

TBD

### `useStoreMap(config)`

Overload used when you need to pass dependencies to react (to update items when some of its dependencies are changed)

#### Formulae

```ts
useStoreMap({
  store: Store<State>,
  keys: any[],
  fn: (state: State, keys: any[]) => Result,
  updateFilter?: (newResult: Result, oldResult: Result) => boolean,
  defaultValue?: Result,
}): Result;
```

#### Arguments

1. `config` (*Object*): Configuration object
   * `store`: Source Store\<State>
   * `keys` (*Array*): This argument will be passed to React.useMemo to avoid unnecessary updates
   * `fn` (`(state: State, keys: any[]) => Result`): Selector function to receive part of source store
   * `updateFilter` (`(newResult, oldResult) => boolean`): *Optional* function used to compare old and new updates to prevent unnecessary rerenders. Uses createStore updateFilter option under the hood
   * `defaultValue`: Optional default value, used whenever `fn` returns undefined

> INFO since: 
>
> `updateFilter` option introduced in [effector-react@21.3.0](https://changelog.effector.dev/#effector-react-21-3-0)

> INFO since: 
>
> `defaultValue` option introduced in [effector-react@22.1.0](https://changelog.effector.dev/#effector-react-22-1-0)

#### Returns

(`Result`): Value from the `fn` function call, or the `defaultValue`.

#### Examples

##### Basic

This hook is useful for working with lists, especially with large ones

```jsx
import { createStore } from "effector";
import { useList, useStoreMap } from "effector-react";

const usersRaw = [
  {
    id: 1,
    name: "Yung",
  },
  {
    id: 2,
    name: "Lean",
  },
  {
    id: 3,
    name: "Kyoto",
  },
  {
    id: 4,
    name: "Sesh",
  },
];

const $users = createStore(usersRaw);
const $ids = createStore(usersRaw.map(({ id }) => id));

const User = ({ id }) => {
  const user = useStoreMap({
    store: $users,
    keys: [id],
    fn: (users, [userId]) => users.find(({ id }) => id === userId) ?? null,
  });

  return (
    <div>
      <strong>[{user.id}]</strong> {user.name}
    </div>
  );
};

const UserList = () => {
  return useList($ids, (id) => <User id={id} />);
};
```

Try it


# useUnit

```ts
import { useUnit } from "effector-react";
```

> INFO since: 
>
> `useUnit` introduced in [effector-react 22.1.0](https://changelog.effector.dev/#effector-react-22-1-0)

React hook, which takes any unit or shape of units.

In the case of stores, it subscribes the component to the provided store and returns its current value, so when the store updates, the component will update automatically.

In the case of events/effects – it binds to the current  to use in DOM event handlers.
Only the `effector-react/scope` version works this way; the `useUnit` of `effector-react` is no-op for events and does not require a `Provider` with scope.

## Methods

### `useUnit(unit)`

Creates function that calls original unit but bounded to Scope if provided.

#### Formulae

```ts
useUnit(event: EventCallable<T>): (payload: T) => T;
useUnit(effect: Effect<Params, Done, any>): (payload: Params) => Promise<Done>;
```

#### Arguments

1. `unit` (EventCallable\<T> or Effect\<Params, Done, Fail>): Event or effect which will be bound to the current `scope`.

#### Returns

(Function): Function to pass to event handlers. Will trigger the given unit in the current scope.

#### Examples

##### Basic

```jsx
import { createEvent, createStore, fork } from "effector";
import { useUnit, Provider } from "effector-react";
import { render } from "react-dom";

const incrementClicked = createEvent();
const $count = createStore(0);

$count.on(incrementClicked, (count) => count + 1);

const App = () => {
  const [count, onIncrement] = useUnit([$count, incrementClicked]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => onIncrement()}>increment</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```

### `useUnit($store)`

Reads value from the `$store` and rerenders component when `$store` updates in Scope if provided.

#### Formulae

```ts
useUnit($store: Store<T>): T;
```

#### Arguments

1. `$store`: effector ()

#### Returns

Current value of the store.

#### Examples

##### Basic

```js
import { createStore, createApi } from "effector";
import { useUnit } from "effector-react";

const $counter = createStore(0);

const { incrementClicked, decrementClicked } = createApi($counter, {
  incrementClicked: (count) => count + 1,
  decrementClicked: (count) => count - 1,
});

const App = () => {
  const counter = useUnit($counter);
  const [onIncrement, onDecrement] = useUnit([incrementClicked, decrementClicked]);

  return (
    <div>
      {counter}
      <button onClick={onIncrement}>Increment</button>
      <button onClick={onDecrement}>Decrement</button>
    </div>
  );
};
```

### `useUnit(shape)`

#### Formulae

```ts
useUnit({ a: Store<A>, b: Event<B>, ... }): { a: A, b: (payload: B) => B; ... }

useUnit([Store<A>, Event<B>, ... ]): [A, (payload: B) => B, ... ]
```

#### Arguments

1. `shape`: Object or array of (EventCallable, Effect, or Store)

#### Returns

(`Object` or `Array`):

* If passed `EventCallable` or `Effect`: Functions with the same names or keys as the argument to pass to event handlers. Will trigger the given unit in the current scope. <br/>
  *Note: events or effects will be bound to `Scope` **only** if component wrapped into Provider.*
* If passed `Store`: The current value of the store.

#### Examples

##### Basic

```jsx
import { createStore, createEvent, fork } from "effector";
import { useUnit, Provider } from "effector-react";

const incremented = createEvent();
const decremented = createEvent();

const $count = createStore(0);

$count.on(incremented, (count) => count + 1);
$count.on(decremented, (count) => count - 1);

const App = () => {
  const count = useUnit($count);
  const on = useUnit({ incremented, decremented });
  // or
  const [a, b] = useUnit([incremented, decremented]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => on.incremented()}>increment</button>
      <button onClick={() => on.decremented()}>decrement</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```


# Effector Solid Gate

*Gate* is a hook for conditional rendering, based on current value (or values) in props.
An example of a problem that Gate can solve – you can put together all required data when component was mounted, or show another component if there is not enough data in props.
Gate also looks good for Routing or animation.

This allows you to send props back to *Store* to create a feedback loop.

Gate can be used via the useGate hook or as a component with props (`<Gate history={history} />`).
Gate stores and events can be used in the application as regular units.

Gate can have two states:

* **Open**, which means mounted
* **Closed**, which means unmounted

## Properties

### `.state` Store

> WARNING Important: 
>
> Do not modify the `state` value! It is a derived store and should be kept in a predictable state.

`Store<Props>`: Derived Store with the current state of the given gate. The state comes from the second argument of useGate and from props when rendering the gate as a component.

### `.open` Event

> INFO Important: 
>
> Do not manually call this event. It is an event that depends on a Gate's state.

Event: Event which will be called during the gate's mounting.

### `.close` Event

> INFO Important: 
>
> Do not manually call this event. It is an event that depends on a Gate's state.

Event: Event which will be called during the gate's unmounting.

### `.status` Store

> WARNING Important: 
>
> Do not modify the `status` value! It is a derived store and should be in a predictable state.

`Store<boolean>`: Boolean Derived Store, which shows if the given gate is mounted.


# createGate

## Methods

### `createGate(config)`

#### Formulae

```ts
createGate(config): Gate
```

#### Arguments

`config` (*Object*): Optional configuration object

* `defaultState?`: Optional default state for Gate.state
* `domain?` (\[*Domain*]/apieffector/Domain)): Optional domain which will be used to create gate units (Gate.open event, Gate.state store and so on)
* `name?` (*string*): Optional name which will be used as name of a created Solid component

#### Returns



#### Examples

TBD

### `createGate(name?)`

#### Formulae

```ts
createGate(name): Gate
```

#### Arguments

1. `name?` (*string*): Optional name which will be used as name of a created Solid component

#### Returns



#### Examples

##### Basic usage

```js
import { createGate } from "effector-solid";
import { render } from "solid-js/web";

const Gate = createGate("gate with props");

const App = () => (
  <section>
    <Gate foo="bar" />
  </section>
);

Gate.state.watch((state) => {
  console.log("current state", state);
});
// => current state {}

const unmount = render(() => <App />, document.getElementById("root"));
// => current state {foo: 'bar'}

unmount();
// => current state {}
```


# effector-solid

Effector bindings for SolidJS.

## Reactive Helpers

* useUnit(unit)
* useStoreMap({ store, keys, fn })

## Gate API

* Gate
* createGate()
* useGate(GateComponent, props)

## Import Map

Package `effector-solid` provides couple different entry points for different purposes:

* effector-solid/scope


# effector-solid/scope

```ts
import {} from "effector-solid/scope";
```

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) the core team recommends using the main module of `effector-solid` instead.

Provides all exports from effector-solid, but enforces the application to use Scope for all components.

### Usage

You can use this module in the same way as effector-solid, but it will require passing Scope to Provider component.

```jsx
// main.js
import { fork } from "effector";
import { Provider } from "effector-solid/scope";
import { render } from "solid-js/web";

const scope = fork();

render(
  <Provider value={scope}>
    <Application />
  </Provider>,
  document.getElementById("root"),
);
```

### Migration

Since `effector-solid/scope` is deprecated, it is recommended to migrate to effector-solid by removing `scope` from the import path.

```diff
+ import { Provider } from "effector-solid";
- import { Provider } from "effector-solid/scope";
```

> WARNING Continued migration: 
>
> `effector-solid` and `effector-solid/scope` do not share any code, so you have to migrate all your code to `effector-solid` at the same time, because otherwise, you will get runtime errors. These errors will occur because `effector-solid` and `effector-solid/scope` will use different instances of `Provider` and do not have access to each other's `Provider`.

### Scope enforcement

All modern hooks of `effector-solid` are designed to work with Scope. If you want to imitate the behavior of the `effector-solid/scope` module, you can pass a second parameter to hooks with an option `forceScope: true`. In this case, the hook will throw an error if the Scope is not passed to Provider.

```diff
- import { useUnit } from 'effector-solid/scope'
+ import { useUnit } from 'effector-solid'


function MyComponent() {
-  const { test } = useUnit({ text: $text })
+  const { test } = useUnit({ text: $text }, { forceScope: true })

  return <p>{text}</p>
}
```


# useGate

```ts
import { useGate } from "effector-solid";
```

Function for passing data to .

## Methods

### `useGate(Gate, props)`

#### Formulae

```ts
useGate(Gate: Gate<Props>, props: Props): void;
```

#### Arguments

1. `Gate` (Gate\<Props>)
2. `props` (*Props*)

#### Returns

(`void`)

#### Examples

##### Basic Usage

```jsx
import { createGate, useGate } from "effector-solid";
import { Route, Routes } from "solid-app-router";

const PageGate = createGate("page");

const Home = (props) => {
  useGate(PageGate, props);
  return <section>Home</section>;
};

PageGate.state.watch(({ match }) => {
  console.log(match);
});

const App = () => (
  <Routes>
    <Route element={<Home />} />
  </Routes>
);
```


# useStoreMap

```ts
import { useStoreMap } from "effector-solid";
```

## Methods

### `useStoreMap($store, fn)`

Function, which subscribes to a store and transforms its value with a given function. Signal will update only when the selector function result will change.

Common use case: subscribe to changes in selected part of store only.

#### Formulae

```ts
useStoreMap(
  $store: Store<State>,
  fn: (state: State) => Result,
): Accessor<Result>;
```

#### Arguments

1. `$store`: Source Store\<T>
2. `fn` (`(state: T) => Result`): Selector function to receive part of source store

#### Returns

(`Result`)

#### Examples

TBD

### `useStoreMap(config)`

#### Formulae

```ts
useStoreMap({
  store: Store<State>,
  keys: any[],
  fn: (state: State, keys: any[]) => Result,
  updateFilter? (newResult, oldResult) => boolean,
}): Result;
```

#### Arguments

1. `params` (*Object*): Configuration object
   * `store`: Source store
   * `keys` (*Array*): Will be passed to `fn` selector
   * `fn` (*(state, keys) => result*): Selector function to receive part of the source store
   * `updateFilter` (*(newResult, oldResult) => boolean*): *Optional* function used to compare old and new updates to prevent unnecessary rerenders. Uses createStore updateFilter option under the hood

#### Returns

(`Accessor<Result>`)

#### Examples

This hook is very useful for working with lists, especially large ones.

```jsx
import { createStore } from "effector";
import { useUnit, useStoreMap } from "effector-solid";
import { For } from "solid-js/web";

const usersRaw = [
  {
    id: 1,
    name: "Yung",
  },
  {
    id: 2,
    name: "Lean",
  },
  {
    id: 3,
    name: "Kyoto",
  },
  {
    id: 4,
    name: "Sesh",
  },
];

const $users = createStore(usersRaw);
const $ids = createStore(usersRaw.map(({ id }) => id));

const User = ({ id }) => {
  const user = useStoreMap({
    store: $users,
    keys: [id],
    fn: (users, [userId]) => users.find(({ id }) => id === userId) ?? null,
  });

  return (
    <div>
      <strong>[{user()?.id}]</strong> {user()?.name}
    </div>
  );
};

const UserList = () => {
  const ids = useUnit($ids);

  return <For each={ids()}>{(id) => <User key={id} id={id} />}</For>;
};
```


# useUnit

```ts
import { useUnit } from "effector-solid";
```

Binds effector stores to the Solid reactivity system or, in the case of events/effects – binds to current  to use in dom event handlers.
Only `effector-solid/scope` version works this way, `useUnit` of `effector-solid` is no-op for events and does not require `Provider` with scope.

## Methods

### `useUnit(unit)`

#### Arguments

```ts
useUnit(event: EventCallable<T>): (payload: T) => T;
useUnit(effect: Effect<Params, Done, any>): (payload: Params) => Promise<Done>;
```

#### Arguments

1. `unit` (EventCallable\<T> or Effect\<Params, Done, Fail>): Event or effect which will be bound to current `scope`.

#### Returns

(`Function`): Function to pass to event handlers. Will trigger the given unit in the current scope.

#### Example

A basic Solid component using `useUnit` with events and stores.

```jsx
import { render } from "solid-js/web";
import { createEvent, createStore, fork } from "effector";
import { useUnit, Provider } from "effector-solid";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (count) => count + 1);

const App = () => {
  const [count, handleIncrement] = useUnit([$count, incremented]);

  return (
    <>
      <p>Count: {count()}</p>
      <button onClick={() => handleIncrement()}>Increment</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```

### `useUnit(store)`

#### Formulae

```ts
useUnit($store: Store<State>): Accessor<State>;
```

#### Arguments

1. `$store` effector ().

#### Returns

(`Accessor<State>`) which will subscribe to store state.

#### Example

```jsx
import { createStore, createApi } from "effector";
import { useUnit } from "effector-solid";

const $counter = createStore(0);

const { incremented, decremented } = createApi($counter, {
  incremented: (count) => count + 1,
  decremented: (count) => count - 1,
});

const App = () => {
  const counter = useUnit($counter);
  const [handleIncrement, handleDecrement] = useUnit([incremented, decremented]);

  return (
    <div>
      {counter()}
      <button onClick={incremented}>Increment</button>
      <button onClick={decremented}>Decrement</button>
    </div>
  );
};
```

### `useUnit(shape)`

#### Formulae

```ts
useUnit({ a: Store<A>, b: Event<B>, ... }): { a: Accessor<A>, b: (payload: B) => B; ... }

useUnit([Store<A>, Event<B>, ... ]): [Accessor<A>, (payload: B) => B, ... ]
```

#### Arguments

1. `shape` Object or array of (EventCallable, Effect, or Store): Events, or effects, or stores as accessors which will be bound to the current `scope`.

#### Returns

(`Object` or `Array`):

* If `EventCallable` or `Effect`: functions with the same names or keys as argument to pass to event handlers. Will trigger given unit in current scope *Note: events or effects will be bound **only** if `useUnit` is imported from `effector-solid/scope`*.
* If `Store`: accessor signals which will subscribe to the store state.

#### Examples

```jsx
import { render } from "solid-js/web";
import { createStore, createEvent, fork } from "effector";
import { useUnit, Provider } from "effector-solid/scope";

const incremented = createEvent();
const decremented = createEvent();

const $count = createStore(0)
  .on(incremented, (count) => count + 1)
  .on(decremented, (count) => count - 1);

const App = () => {
  const count = useUnit($count);
  const on = useUnit({ incremented, decremented });
  // or
  const [a, b] = useUnit([incremented, decremented]);

  return (
    <>
      <p>Count: {count()}</p>
      <button onClick={() => on.incremented()}>Increment</button>
      <button onClick={() => on.decremented()}>Decrement</button>
    </>
  );
};

const scope = fork();

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById("root"),
);
```


# ComponentOptions

## ComponentOptions (Vue2)

### `effector`

#### Returns

(*`Function | Object | Store`*): `Store` or object of `Store`'s, or function which will be called with the Component instance as `this`.

#### Examples

##### Basic Usage

```js
import Vue from "vue";
import { createStore, combine } from "effector";

const counter = createStore(0);

new Vue({
  data() {
    return {
      foo: "bar",
    };
  },
  effector() {
    // would create `state` in template
    return combine(
      this.$store(() => this.foo),
      counter,
      (foo, counter) => `${foo} + ${counter}`,
    );
  },
});
```

##### Using Object Syntax

```js
import { counter } from "./stores";

new Vue({
  effector: {
    counter, // would create `counter` in template
  },
});
```

##### Using Store Directly

```js
import { counter } from "./stores";

new Vue({
  effector: counter, // would create `state` in template
});
```


# EffectorScopePlugin

The Plugin provides a general scope which needs for read and update effector's stores, call effector's events. Required for SSR.

## Plugins

### `EffectorScopePlugin({ scope, scopeName })`

#### Arguments

1. `scope` Scope
2. `scopeName?` custom scopeName (default: `root`)

#### Examples

##### Basic Usage

```js
import { createSSRApp } from "vue";
import { EffectorScopePlugin } from "effector-vue";
import { fork } from "effector";

const app = createSSRApp(AppComponent);
const scope = fork();

app.use(
  EffectorScopePlugin({
    scope,
    scopeName: "app-scope-name",
  }),
);
```


# Effector Vue Gate

*Gate* is a hook for conditional rendering, based on current value (or values) in props. An example of a problem that Gate can solve – you can put together all required data, when component was mounted.

This allows you to send props back to *Store* to create feedback loop.

Gate can be used via useGate hook. Gate stores and events can be used in the application as regular units

Gate can have two states:

* **Open**, which means mounted
* **Closed**, which means unmounted

## Gate Properties

### `.state`

> WARNING Important: 
>
> Do not modify `state` value! It is derived store and should be in predictable state.

`Store<Props>`: DerivedStore with current state of the given gate. The state comes from the second argument of useGate and from props when rendering gate as a component.

### `.open`

> INFO Important: 
>
> Do not manually call this event. It is an event that depends on a Gate state.

Event: Event which will be called during gate mounting

### `.close`

> INFO Important: 
>
> Do not manually call this event. It is an event that depends on a Gate state.

Event: Event which will be called during a gate unmounting.

### `.status`

> WARNING Important: 
>
> Do not modify `status` value! It is derived store and should be in predictable state.

`Store<boolean>`: Boolean DerivedStore, which show if given gate is mounted.


# VueEffector

```ts
import { VueEffector } from "effector-vue/options-vue3";
```

`effector-vue` plugin for vue 3 creates a mixin that takes a binding function from the effector option.

## Methods

### `VueEffector(app)`

#### Arguments

1. `app` (*instance Vue*): Vue instance

#### Returns

(*`void`*)

#### Examples

##### Installation plugin

```js
import { createApp } from "vue";
import { VueEffector } from "effector-vue/options-vue3";

import App from "./App.vue";

const app = createApp(App);

app.use(VueEffector);
```

##### Effector options

```html
<template>
  <div>
    <span v-if="createPending">loading...</span>
    <p>{{ user.name }}</p>
    ...
    <button @click="create">Create<button>
  </div>
</template>
```

```js
import { $user, create, createFx } from 'model'

export default {
  name: 'VueComponent',
  effector: () => ({
    user: $user,
    createDone: createFx.done,
    createPending: createFx.pending,
  }),
  watch: {
    createDone() {
      // do something after the effect is done
    }
  },
  methods: {
    create, // template binding
    createFx,
  },
  ...
}
```


# VueEffector

```ts
import { VueEffector } from "effector-vue";
```

`effector-vue` plugin for vue 2

## Methods

### `VueEffector(Vue, options?)`

#### Arguments

1. `Vue` (*class Vue*): Vue class
2. `options` (*Object*): Plugin options

* TBD

#### Returns

(*`void`*)

#### Examples

```js
import Vue from "vue";
import { VueEffector } from "effector-vue";

Vue.use(VueEffector);
```


# VueSSRPlugin

The Plugin provides a general scope which needs for read and update effector's stores, call effector's events. Required for SSR.

## Plugins

### `VueSSRPlugin({ scope, scopeName })`

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) `VueSSRPlugin` is deprecated. Use EffectorScopePlugin instead.

### Arguments

1. `scope` Scope
2. `scopeName?` custom scopeName (default: `root`)

### Examples

#### Basic usage

```js
import { createSSRApp } from "vue";
import { VueSSRPlugin } from "effector-vue/ssr";
import { fork } from "effector";

const app = createSSRApp(AppComponent);
const scope = fork();

app.use(
  VueSSRPlugin({
    scope,
    scopeName: "app-scope-name",
  }),
);
```


# createComponent

## Methods

### `createComponent(options, store?)`

#### Arguments

1. `options` (*Object*): component options (hooks, methods, computed properties)
2. `store` (*Object*): Store object from effector

#### Returns

(*`vue component`*)

#### Example

```html
<template> {{ $counter }} </template>
```

```js
// component.vue
import { createComponent } from "effector-vue";

const $counter = createStore(0);
const { update } = createApi($counter, {
  update: (_, value: number) => value,
});

export default createComponent(
  {
    name: "Counter",

    methods: {
      update,
      handleClick() {
        const value = this.$counter + 1; // this.$counter <- number ( typescript tips )
        this.update(value);
      },
    },
  },
  { $counter },
);
```


# createGate

Creates a  to consume data from view, designed for vue 3. If `defaultState` is defined, Gate.state will be created with passed value.

## Methods

### `createGate(config?: {defaultState?, domain?, name?})`

#### Arguments

`config` (*Object*): Optional configuration object

* `defaultState?`: Optional default state for Gate.state
* `domain?` (): Optional domain which will be used to create gate units (Gate.open event, Gate.state store, and so on)
* `name?` (*string*): Optional name which will be used as the name of a created Vue component

#### Returns



#### Examples

##### Basic Usage

```js
import { createGate, useGate } from "effector-vue/composition";

const ListGate = createGate({
  name: "Gate with required props",
});

const ListItem = {
  template: `
    <div>
      {{id}}
    </div>
  `,
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    useGate(ListGate, () => props.id);
  },
};

const app = {
  template: `
    <div>
      <ListItem :id="id" />
    </div>
  `,
  components: {
    ListItem,
  },
  setup() {
    const id = ref("1");
    return { id };
  },
};

Gate.state.watch((state) => {
  console.log("current state", state);
});
// => current state null

app.mount("#app");
// => current state 1

app.unmount();
// => current state null
```


# effector-vue

Effector binginds for Vue.

## Top-Level Exports

* VueEffector(Vue, options?)
* createComponent(ComponentOptions, store?)
* EffectorScopePlugin({scope, scopeName?})

## ComponentOptions API

* ComponentOptions\<V>

## Hooks

* useUnit(shape)
* useStore(store)
* useStoreMap({store, keys, fn})
* useVModel(store)

## Gate API

* Gate
* createGate()
* useGate(GateComponent, props)

## Import map

Package `effector-vue` provides couple different entry points for different purposes:

* effector-vue/composition
* effector-vue/ssr


# effector-vue/composition

```ts
import {} from "effector-vue/composition";
```

Provides additional API for effector-vue that allows to use [Composition API](https://v3.vuejs.org/guide/composition-api-introduction.html)

### APIs

* useUnit(shape)
* useStore($store)
* useStoreMap({ store, keys, fn })
* useVModel($store)


# effector-vue/ssr

```ts
import {} from "effector-vue/ssr";
```

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) the core team recommends using main module of `effector-vue` of `effector-vue/composition` instead.

Provides additional API for effector-vue that enforces library to use Scope

### APIs

* useEvent(event)
* VueSSRPlugin


# useEvent

```ts
import { useEvent } from "effector-vue/ssr";
```

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) `useEvent` is deprecated. Use useUnit instead.

Bind event to current fork instance to use in dom event handlers. Used **only** with ssr, in application without forks `useEvent` will do nothing

## Methods

### `useEvent(unit)`

#### Arguments

1. `unit` ( or ): Event or effect which will be bound to current `scope`

#### Returns

(`Function`): Function to pass to event handlers. Will trigger a given unit in current scope

#### Examples

##### Basic

```js
import { createStore, createEvent } from "effector";
import { useEvent } from "effector-vue/ssr";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (x) => x + 1);

export default {
  setup() {
    const counter = useStore($count);
    const onIncrement = useEvent(incremented);

    return {
      onIncrement,
      counter,
    };
  },
};
```


# useGate

```ts
import { useGate } from "effector-vue/composition";
```

## Methods

### `useGate(Gate, props)`

Using a Gate to consume data from view. Designed for Vue 3

#### Arguments

1. `Gate<Props>` ()
2. `props` (*Props*)

#### Returns

(*`void`*)

#### Examples

See example


# useStore

```ts
import { useStore } from "effector-vue/composition";
```

A hook function, which subscribes to watcher, that observes changes in the current **readonly** store, so when recording results, the component will update automatically. You can mutate the store value **only via createEvent**. Designed for vue 3

### `useStore($store)`

#### Arguments

1. `$store` (Store\<State>)

#### Returns

(`readonly(State)`)

#### Example

```js
import { createStore, createApi } from "effector";
import { useStore } from "effector-vue/composition";

const $counter = createStore(0);

const { incremented, decremented } = createApi($counter, {
  incremented: (count) => count + 1,
  decremented: (count) => count - 1,
});

export default {
  setup() {
    const counter = useStore($counter);

    return {
      counter,
      incremented,
      decremented,
    };
  },
};
```


# useStoreMap

```ts
import { useStoreMap } from "effector-vue/composition";
```

Function, which subscribes to store and transforms its value with a given function. Signal will update only when the selector function result will change

## Methods

### `useStoreMap($store, fn)`

#### Formulae

```ts
useStoreMap(
  $store: Store<State>,
  fn: (state: State) => Result,
): ComputedRef<Result>;
```

#### Arguments

1. `$store`: Source Store\<State>
2. `fn` (*(state) => result*): Selector function to receive part of source store

#### Returns

(`ComputedRef<Result>`)

### `useStoreMap(config)`

#### Formulae

```ts
useStoreMap({
  store: Store<State>,
  keys?: () => Keys,
  fn: (state: State, keys: Keys) => Result,
  defaultValue?: Result,
}): ComputedRef<Result>;
```

#### Arguments

1. `params` (*Object*): Configuration object
   * `store`: Source store
   * `keys` (`() => Keys`): Will be passed to `fn` selector
   * `fn` (`(state: State, keys: Keys) => Result`): Selector function to receive part of source store
   * `defaultValue` (`Result`): Optional default value if `fn` returned `undefined`

#### Returns

(`ComputedRef<Result>`)

#### Examples

This hook is very useful for working with lists, especially with large ones

###### User.vue

```js
import { createStore } from "effector";
import { useUnit, useStoreMap } from "effector-vue/composition";

const $users = createStore([
  {
    id: 1,
    name: "Yung",
  },
  {
    id: 2,
    name: "Lean",
  },
  {
    id: 3,
    name: "Kyoto",
  },
  {
    id: 4,
    name: "Sesh",
  },
]);

export default {
  props: {
    id: Number,
  },
  setup(props) {
    const user = useStoreMap({
      store: $users,
      keys: () => props.id,
      fn: (users, userId) => users.find(({ id }) => id === userId),
    });

    return { user };
  },
};
```

```jsx
<div>
  <strong>[{user.id}]</strong> {user.name}
</div>
```

###### App.vue

```js
const $ids = createStore(data.map(({ id }) => id));

export default {
  setup() {
    const ids = useStore($ids);

    return { ids };
  },
};
```

```jsx
<div>
  <User v-for="id in ids" :key="id" :id="id" />
</div>
```


# useUnit

```ts
import { useUnit } from "effector-vue/composition";
```

Bind  to Vue reactivity system or, in the case of / - bind to current  to use in DOM event handlers.

**Designed for Vue 3 and Composition API exclusively.**

> INFO Future: 
>
> This API can completely replace the following APIs:
>
> * useStore($store)
> * useEvent(event)
>
> In the future, these APIs can be deprecated and removed.

## Methods

### `useUnit(unit)`

#### Arguments

1. `unit` ( or ): Event or effect which will be bound to current 

#### Returns

(`Function`): Function to pass to event handlers. Will trigger given unit in current scope

#### Examples

##### Basic Usage

```js
// model.js
import { createEvent, createStore, fork } from "effector";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (count) => count + 1);
```

```html
// App.vue

<script setup>
  import { useUnit } from "effector-vue/composition";

  import { incremented, $count } from "./model.js";

  const onClick = useUnit(incremented);
</script>

<template>
  <button @click="onClick">increment</button>
</template>
```

#### `useUnit($store)`

##### Arguments

1. `$store` (): Store which will be bound to Vue reactivity system

##### Returns

Reactive value of given 

##### Examples

###### Basic Usage

```js
// model.js
import { createEvent, createStore, fork } from "effector";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (count) => count + 1);
```

```html
// App.vue

<script setup>
  import { useUnit } from "effector-vue/composition";

  import { $count } from "./model.js";

  const count = useUnit($count);
</script>

<template>
  <p>Count: {{ count }}</p>
</template>
```

#### `useUnit(shape)`

##### Arguments

1. `shape` Object or array of ( or  or ): Every unit will be processed by `useUnit` and returned as a reactive value in case of  or as a function to pass to event handlers in case of  or .

##### Returns

(Object or Array):

* if  or : functions with the same names or keys as argument to pass to event handlers. Will trigger given unit in current .
* if : reactive value of given  with the same names or keys as argument.

##### Examples

###### Basic Usage

```js
// model.js
import { createEvent, createStore, fork } from "effector";

const incremented = createEvent();
const $count = createStore(0);

$count.on(incremented, (count) => count + 1);
```

```html
// App.vue

<script setup>
  import { useUnit } from "effector-vue/composition";

  import { $count, incremented } from "./model.js";

  const { count, handleClick } = useUnit({ count: $count, handleClick: incremented });
</script>

<template>
  <p>Count: {{ count }}</p>
  <button @click="handleClick">increment</button>
</template>
```


# useVModel

```ts
import { useVModel } from "effector-vue/composition";
```

A hook function, which subscribes to a watcher that observes changes in the current store, so when recording results, the component will automatically update. It is primarily used when working with forms (`v-model`) in Vue 3.

## Methods

### `useVModel($store)`

#### Formulae

```ts
useVModel($store: Store<State>): Ref<UnwrapRef<State>>;
```

Designed for Vue 3.

#### Arguments

1. `$store` ()
2. `shape of Stores` ()

#### Returns

(`State`)

#### Examples

##### Single Store

```js
import { createStore, createApi } from "effector";
import { useVModel } from "effector-vue/composition";

const $user = createStore({
  name: "",
  surname: "",
  skills: ["CSS", "HTML"],
});

export default {
  setup() {
    const user = useVModel($user);

    return { user };
  },
};
```

```html
<div id="app">
  <input type="text" v-model="user.name" />
  <input type="text" v-model="user.surname" />

  <div>
    <input type="checkbox" v-model="user.skills" value="HTML" />
    <input type="checkbox" v-model="user.skills" value="CSS" />
    <input type="checkbox" v-model="user.skills" value="JS" />
  </div>
</div>
```

##### Store Shape

```js
import { createStore, createApi } from "effector";
import { useVModel } from "effector-vue/composition";

const $name = createStore("");
const $surname = createStore("");
const $skills = createStore([]);

const model = {
  name: $name,
  surname: $surname,
  skills: $skills,
};

export default {
  setup() {
    const user = useVModel(model);

    return { user };
  },
};
```

```html
<div id="app">
  <input type="text" v-model="user.name" />
  <input type="text" v-model="user.surname" />

  <div>
    <input type="checkbox" v-model="user.skills" value="HTML" />
    <input type="checkbox" v-model="user.skills" value="CSS" />
    <input type="checkbox" v-model="user.skills" value="JS" />
  </div>
</div>
```


# Domain

```ts
import { type Domain } from "effector";
```

Domain is a namespace for your events, stores and effects.

Domain can subscribe to event, effect, store or nested domain creation with `onCreateEvent`, `onCreateStore`, `onCreateEffect`, `onCreateDomain` methods.

It is useful for logging or other side effects.

## Unit creators

> INFO since: 
>
> [effector 20.7.0](https://changelog.effector.dev/#effector-20-7-0)

### `createEvent(name?)`

#### Arguments

1. `name`? (*string*): event name

#### Returns

: New event

### `createEffect(handler?)`

Creates an effect with given handler.

#### Arguments

1. `handler`? (*Function*): function to handle effect calls, also can be set with use(handler)

#### Returns

: A container for async function.

> INFO since: 
>
> [effector 21.3.0](https://changelog.effector.dev/#effector-21-3-0)

### `createEffect(name?)`

#### Arguments

1. `name`? (*string*): effect name

#### Returns

: A container for async function.

### `createStore(defaultState)`

#### Arguments

1. `defaultState` (*State*): store default state

#### Returns

: New store

### `createDomain(name?)`

#### Arguments

1. `name`? (*string*): domain name

#### Returns

: New domain

### Aliases

#### `event(name?)`

An alias for domain.createEvent

#### `effect(name?)`

An alias for domain.createEffect

#### `store(defaultState)`

An alias for domain.createStore

#### `domain(name?)`

An alias for domain.createDomain

## Domain Properties

### `.history`

Contains mutable read-only sets of units inside a domain.

> INFO since: 
>
> [effector 20.3.0](https://changelog.effector.dev/#effector-20-3-0)

#### Formulae

```ts
interface DomainHistory {
  stores: Set<Store<any>>;
  events: Set<Event<any>>;
  domains: Set<Domain>;
  effects: Set<Effect<any, any, any>>;
}

const { stores, events, domains, effects } = domain.history;
```

When any kind of unit created inside a domain, it appears in a set with the name of type(stores, events, domains, effects) in the same order as created.

#### Examples

##### Basic

```js
import { createDomain } from "effector";
const domain = createDomain();
const eventA = domain.event();
const $storeB = domain.store(0);
console.log(domain.history);
// => {stores: Set{storeB}, events: Set{eventA}, domains: Set, effects: Set}
```

Try it

## Domain hooks

### `onCreateEvent(callback)`

#### Formulae

```ts
domain.onCreateEvent((event: Event<any>) => {});
```

* Function passed to `onCreateEvent` called every time, as new event created in `domain`
* Function called with `event` as first argument
* The result of function call is ignored

#### Arguments

1. `callback` ([*Watcher*][_Watcher_]): A function that receives Event and will be called during every domain.createEvent call

#### Returns

[*Subscription*][_Subscription_]: Unsubscribe function.

#### Example

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateEvent((event) => {
  console.log("new event created");
});

const a = domain.createEvent();
// => new event created

const b = domain.createEvent();
// => new event created
```

Try it

### `onCreateEffect(callback)`

#### Formulae

```ts
domain.onCreateEffect((effect: Effect<any, any, any>) => {});
```

* Function passed to `onCreateEffect` called every time, as new effect created in `domain`
* Function called with `effect` as first argument
* The result of function call is ignored

#### Arguments

1. `callback` ([*Watcher*][_Watcher_]): A function that receives Effect and will be called during every domain.createEffect call

#### Returns

[*Subscription*][_Subscription_]: Unsubscribe function.

#### Example

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateEffect((effect) => {
  console.log("new effect created");
});

const fooFx = domain.createEffect();
// => new effect created

const barFx = domain.createEffect();
// => new effect created
```

Try it

### `onCreateStore(callback)`

#### Formulae

```ts
domain.onCreateStore(($store: Store<any>) => {});
```

* Function passed to `onCreateStore` called every time, as new store created in `domain`
* Function called with `$store` as first argument
* The result of function call is ignored

#### Arguments

1. `callback` ([*Watcher*][_Watcher_]): A function that receives Store and will be called during every domain.createStore call

#### Returns

[*Subscription*][_Subscription_]: Unsubscribe function.

#### Example

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateStore((store) => {
  console.log("new store created");
});

const $a = domain.createStore(null);
// => new store created
```

Try it

### `onCreateDomain(callback)`

#### Formulae

```ts
domain.onCreateDomain((domain) => {});
```

* Function passed to `onCreateDomain` called every time, as subdomain created in `domain`
* Function called with `domain` as first argument
* The result of function call is ignored

#### Arguments

1. `callback` ([*Watcher*][_Watcher_]): A function that receives Domain and will be called during every domain.createDomain call

#### Returns

[*Subscription*][_Subscription_]: Unsubscribe function.

#### Example

```js
import { createDomain } from "effector";

const domain = createDomain();

domain.onCreateDomain((domain) => {
  console.log("new domain created");
});

const a = domain.createDomain();
// => new domain created

const b = domain.createDomain();
// => new domain created
```

Try it

[_watcher_]: /en/explanation/glossary#watcher

[_subscription_]: /en/explanation/glossary#subscription


# Effect

```ts
import { type Effect } from "effector";
```

**Effect** is a container for async function or any throwing function.

It can be safely used in place of the original async function.

## Methods

### `.use(handler)`

Provides a function, which will be called when the effect is triggered.

#### Formulae

```ts
effect.use(fn);
```

* Set handler `fn` for `effect`
* If effect already had an implementation at the time of the call, it will be replaced by a new one

> Hint: current handler can be extracted with effect.use.getCurrent().

You must provide a handler either through .use method or `handler` property in createEffect, otherwise effect will throw with `no handler used in _%effect name%_` error when effect will be called.

> TIP See also: 
>
> [Testing api calls with effects and stores](https://www.patreon.com/posts/testing-api-with-32415095)

#### Arguments

1. `handler` (*Function*): Function, that receives the first argument passed to an effect call.

#### Returns

(): The same effect

#### Examples

```js
import { createEffect } from "effector";

const fetchUserReposFx = createEffect();

fetchUserReposFx.use(async (params) => {
  console.log("fetchUserReposFx called with", params);

  const url = `https://api.github.com/users/${params.name}/repos`;
  const req = await fetch(url);
  return req.json();
});

fetchUserReposFx({ name: "zerobias" });
// => fetchUserRepos called with {name: 'zerobias'}
```

Try it

### `.use.getCurrent()`

Returns current handler of effect. Useful for testing.

#### Formulae

```ts
fn = effect.use.getCurrent();
```

* Returns current handler `fn` for `effect`
* If no handler was assigned to `effect`, default handler will be returned (that throws an error)

> Hint: to set a new handler use effect.use(handler)

#### Returns

(*Function*): Current handler, defined by `handler` property or via `.use` call.

#### Examples

```js
import { createEffect } from "effector";

const handlerA = () => "A";
const handlerB = () => "B";

const fx = createEffect(handlerA);

console.log(fx.use.getCurrent() === handlerA);
// => true

fx.use(handlerB);
console.log(fx.use.getCurrent() === handlerB);
// => true
```

Try it

### `.watch(watcher)`

Subscribe to effect calls.

#### Formulae

```ts
const unwatch = effect.watch(watcher);
```

* Call `watcher` on each `effect` call, pass payload of `effect` as argument to `watcher`
* When `unwatch` is called, stop calling `watcher`

#### Arguments

1. `watcher` (): A function that receives `payload`.

#### Returns

: Unsubscribe function.

#### Examples

```js
import { createEffect } from "effector";

const fx = createEffect((params) => params);

fx.watch((params) => {
  console.log("effect called with value", params);
});

await fx(10);
// => effect called with value 10
```

Try it

### `.prepend(fn)`

Creates an event, upon trigger it sends transformed data into the source effect.
Works kind of like reverse `.map`.
In case of `.prepend` data transforms **before the original effect occurs** and in the case of `.map`, data transforms **after original effect occurred**.

#### Formulae

```ts
const event = effect.prepend(fn);
```

* When `event` is triggered, call `fn` with payload from `event`, then trigger `effect` with the result of `fn()`
* `event` will have `EventCallable<T>` type, so can be used as `target` in methods like `sample()`

#### Arguments

1. `fn` (*Function*): A function that receives `payload`, should be .

#### Returns

: New event

### `.map(fn)`

Creates a new event, which will be called after the original effect is called, applying the result of a `fn` as a payload. It is a special function which allows you to decompose dataflow, extract or transform data.

#### Formulae

```ts
const second = first.map(fn);
```

* When `first` is triggered, pass payload from `first` to `fn`
* Trigger `second` with the result of the `fn()` call as payload
* `second` event will have `Event<T>` type, so it CAN NOT be used as `target` in methods like `sample()`

#### Arguments

1. `fn` (*Function*): A function that receives `payload`, should be .

#### Returns

: New event.

#### Examples

```js
import { createEffect } from "effector";

const userUpdate = createEffect(({ name, role }) => {
  console.log(name, role);
});
const userNameUpdated = userUpdate.map(({ name }) => name); // you may decompose dataflow with .map() method
const userRoleUpdated = userUpdate.map(({ role }) => role.toUpperCase()); // either way you can transform data

userNameUpdated.watch((name) => console.log(`User's name is [${name}] now`));
userRoleUpdated.watch((role) => console.log(`User's role is [${role}] now`));

await userUpdate({ name: "john", role: "admin" });
// => User's name is [john] now
// => User's role is [ADMIN] now
// => john admin
```

Try it

## Properties

You are not supposed to use parts of effect (like `.done` and `.pending`) as a `target` in sample (even though they are events and stores), since effect is a complete entity on its own. This behavior will not be supported.

In the examples below constant `effect` has this signature:

```ts
effect: Effect<Params, Done, Fail>;
```

### `.done` Event

, which is triggered when *handler* is *resolved*.

> WARNING Important: 
>
> Do not manually call this event. It is an event that depends on effect.

#### Formulae

```ts
effect.done: Event<{ params: Params; result: Done }>;
```

#### Properties

Event triggered with an object of `params` and `result`:

1. `params` (*Params*): An argument passed to the effect call
2. `result` (*Done*): A result of the resolved handler

#### Examples

```js
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.done.watch(({ params, result }) => {
  console.log("Call with params", params, "resolved with value", result);
});

await fx(2);
// => Call with params 2 resolved with value 3
```

Try it

### `.doneData` Event

> INFO since: 
>
> [effector 20.12.0](https://changelog.effector.dev/#effector-20-12-0)

Event, which is triggered by the result of the effect execution.

> WARNING Important: 
>
> Do not manually call this event. It is an event that depends on the effect.

#### Formulae

```ts
effect.doneData: Event<Done>;
```

* `doneData` is an event, that triggered when `effect` is successfully resolved with `result` from .done

 triggered when *handler* is *resolved*.

#### Examples

```js
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.doneData.watch((result) => {
  console.log(`Effect was successfully resolved, returning ${result}`);
});

await fx(2);
// => Effect was successfully resolved, returning 3
```

Try it

### `.fail` Event

, which is triggered when handler is rejected or throws error.

> WARNING Important: 
>
> Do not manually call this event. It is an event that depends on effect.

#### Formulae

```ts
effect.fail: Event<{ params: Params; error: Fail }>;
```

#### Properties

Event triggered with an object of `params` and `error`:

1. `params` (*Params*): An argument passed to effect call
2. `error` (*Fail*): An error caught from the handler

#### Examples

```js
import { createEffect } from "effector";

const fx = createEffect(async (value) => {
  throw Error(value - 1);
});

fx.fail.watch(({ params, error }) => {
  console.log("Call with params", params, "rejected with error", error.message);
});

fx(2);
// => Call with params 2 rejected with error 1
```

Try it

### `.failData` Event

> INFO since: 
>
> [effector 20.12.0](https://changelog.effector.dev/#effector-20-12-0)

Event, which is triggered with error thrown by the effect.

> WARNING Important: 
>
> Do not manually call this event. It is an event that depends on effect.

#### Formulae

```ts
effect.failData: Event<Fail>;
```

* `failData` is an event, that triggered when `effect` is rejected with `error` from .fail

 triggered when handler is rejected or throws error.

#### Examples

```js
import { createEffect } from "effector";

const fx = createEffect(async (value) => {
  throw Error(value - 1);
});

fx.failData.watch((error) => {
  console.log(`Execution failed with error ${error.message}`);
});

fx(2);
// => Execution failed with error 1
```

Try it

### `.finally` Event

> INFO since: 
>
> [effector 20.0.0](https://changelog.effector.dev/#effector-20-0-0)

Event, which is triggered when handler is resolved, rejected or throws error.

> WARNING Important: 
>
> Do not manually call this event. It is an event that depends on effect.

#### Properties

```ts
type Success = { status: 'done'; params: Params; result: Done }
type Failure = { status: 'fail'; params: Params; error: Fail }

effect.finally: Event<Success | Failure>;
```

#### Properties

, which is triggered with an object of `status`, `params` and `error` or `result`:

1. `status` (*string*): A status of effect (`done` or `fail`)
2. `params` (*Params*): An argument passed to effect call
3. `error` (*Fail*): An error caught from the handler
4. `result` (*Done*): A result of the resolved handler

#### Examples

```js
import { createEffect } from "effector";

const fetchApiFx = createEffect(async ({ time, ok }) => {
  await new Promise((resolve) => setTimeout(resolve, time));
  if (ok) return `${time} ms`;
  throw Error(`${time} ms`);
});

fetchApiFx.finally.watch((value) => {
  switch (value.status) {
    case "done":
      console.log("Call with params", value.params, "resolved with value", value.result);
      break;
    case "fail":
      console.log("Call with params", value.params, "rejected with error", value.error.message);
      break;
  }
});

await fetchApiFx({ time: 100, ok: true });
// => Call with params {time: 100, ok: true}
//    resolved with value 100 ms

fetchApiFx({ time: 100, ok: false });
// => Call with params {time: 100, ok: false}
//    rejected with error 100 ms
```

Try it

### `.pending` Store

Store contains `true` when effect is called but not resolved yet. Useful to show loaders.

> WARNING Important: 
>
> Do not modify store value! It is derived store and should be in predictable state.

#### Formulae

```ts
effect.pending: Store<boolean>;
```

* Store will update when `done` or `fail` are triggered
* Store contains `true` value until the effect is resolved or rejected

#### Returns

: Store that represents current state of the effect

#### Examples

```jsx
import React from "react";
import ReactDOM from "react-dom";
import { createEffect } from "effector";
import { useUnit } from "effector-react";

const fetchApiFx = createEffect((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

fetchApiFx.pending.watch(console.log);

const Loading = () => {
  const loading = useUnit(fetchApiFx.pending);

  return <div>{loading ? "Loading..." : "Load complete"}</div>;
};

ReactDOM.render(<Loading />, document.getElementById("root"));

fetchApiFx(3000);
```

Try it

It's property is a shorthand for common use case:

```js
import { createEffect, createStore } from "effector";

const fetchApiFx = createEffect();

// now you can use fetchApiFx.pending instead
const $isLoading = createStore(false)
  .on(fetchApiFx, () => true)
  .on(fetchApiFx.done, () => false)
  .on(fetchApiFx.fail, () => false);
```

### `.inFlight` Store

> INFO since: 
>
> [effector 20.11.0](https://changelog.effector.dev/#effector-20-11-0)

Shows how many effect calls aren't settled yet. Useful for rate limiting.

> WARNING Important: 
>
> Do not modify store value! It is derived store and should be in predictable state.

#### Formulae

```ts
effect.inFlight: Store<number>;
```

* The store will be `0` if no calls of `effect` in pending state, its default state
* On each call of `effect` state in the store will be increased
* When effect resolves to any state(done or fail) state in the store will be decreased

#### Returns

: Store that represents count of the running effects

#### Examples

```js
import { createEffect } from "effector";

const fx = createEffect(() => new Promise((rs) => setTimeout(rs, 500)));

fx.inFlight.watch((amount) => {
  console.log("in-flight requests:", amount);
});
// => 0

const req1 = fx();
// => 1

const req2 = fx();
// => 2

await Promise.all([req1, req2]);

// => 1
// => 0
```

Try it

## Types

```ts
import { type EffectParams, type EffectResult, type EffectError } from "effector";
```

### `EffectParams<FX>`

Allows to extract type of Params from `effect`.

```ts
const effect: Effect<Params, Done, Fail>;
type Params = EffectParams<typeof effect>;
```

### `EffectResult<FX>`

Allows to extract type of result from `effect`.

```ts
const effect: Effect<Params, Done, Fail>;
type Done = EffectResult<typeof effect>;
```

### `EffectError<FX>`

Allows to extract type of error from `effect`.

```ts
const effect: Effect<Params, Done, Fail>;
type Fail = EffectError<typeof effect>;
```


# Event

```ts
import { type Event, type EventCallable } from "effector";
```

The **Event** in effector represents a user action, a step in the application process, a command to execute, or an intention to make modifications, among other things.
This unit is designed to be a carrier of information/intention/state within the application, not the holder of a state.

## `EventCallable<T>`

### Construction

There are many ways to create an event:

* The most common createEvent
* Using Domain&#x20;
* Via Event's methods and it's supertype EventCallable's methods
* Some Effect's methods return new events and readonly events
* Operators such as: createApi

#### Declaring types

Event carries some data and in a TypeScript ecosystem each data should have a defined type. When an event is explicitly created by createEvent, type of the argument must be provided as a Generic type argument:

```ts
import { createEvent } from "effector";

interface ItemAdded {
  id: string;
  title: string;
}

const itemAdded = createEvent<ItemAdded>();
```

In most cases, there is no reason to use `void` with another type (~~`Event<void | number>`~~). Use `void` only to declare the Event or EventCallable without the argument at all. That's why it is possible to send data from an event with an argument into an event without an argument.

```ts
sample({
  clock: withData, // Event<number>
  target: withoutData, // Event<void>
});
```

We **strongly recommend** using `null` for empty values when intended:

```ts
import { createEvent } from "effector";

const maybeDataReceived = createEvent<Data | null>();
// maybeDataReceived: EventCallable<Data | null>
```

Read more in the explanation section.

### Call as function `event(argument)`

Initiates an event with the provided argument, which in turn activates any registered subscribers.

Read more in the explanation section.

#### Formulae

```ts
const event: EventCallable<T>;
event(argument: T): T;
```

* `event` called as a function always returns its `argument` as is
* all subscribers of event receives the `argument` passed into
* when `T` is `void`, `event` can be called without arguments
* `T` by default is `void`, so generic type argument can be omitted

> WARNING Important: 
>
> In Effector, any event supports only **a single argument**.
> It is not possible to call an event with two or more arguments, as in `someEvent(first, second)`.
>
> All arguments beyond the first will be ignored.
> The core team has implemented this rule for specific reasons related to the design and functionality.

#### Arguments

1. `argument` is a value of `T`. It's optional if the event is defined as `EventCallable<void>`.

#### Throws

##### call of readonly event is not supported, use createEvent instead

> INFO since: 
>
> [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0-spacewatch)

When user tried to call `Event`. In the most cases it happens when you tried to call derived event:

```ts
const numberReceived = createEvent<number>(); // EventCallable<number>
const stringifiedReceived = numberReceived.map((number) => String(number)); // Event<string>

stringifiedReceived("123"); // THROWS!
```

The same for all methods returning `Event`.

To fix it create separate event via `createEvent`, and connect them by `sample`:

```ts
const numberReceived = createEvent<number>();
const stringifiedReceived = createEvent<string>();

sample({
  clock: numberReceived,
  fn: (number) => String(number),
  target: stringifiedReceived,
});

stringifiedReceived("123"); // OK
```

##### unit call from pure function is not supported, use operators like sample instead

> INFO since: 
>
> [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0-spacewatch)

Happens when events or effects called from pure functions, like mappers:

```ts
const someHappened = createEvent<number>();
const another = createEvent();

const derived = someHappened.map((number) => {
  another(); // THROWS!
  return String(number);
});
```

To fix this, use `sample`:

```ts
const someHappened = createEvent<number>();
const another = createEvent();
const derived = createEvent<string>();

sample({
  clock: someHappened,
  target: another,
});

// The same as .map(), but using `target`
sample({
  clock: someHappened,
  fn: (number) => String(number),
  target: derived,
});
```

#### Returns

`T`: Represents the same value that is passed into the `event`.

#### Types

```ts
import { createEvent, Event } from "effector";

const someHappened = createEvent<number>();
// someHappened: EventCallable<number>
someHappened(1);

const anotherHappened = createEvent();
// anotherHappened: EventCallable<void>
anotherHappened();
```

An event can be specified with a single generic type argument. By default, this argument is set to void, indicating that the event does not accept any parameters.

### Methods

Since the `createEvent` factory creates `EventCallable` for you, its methods will be described first, even though it is a extension of the `Event` type.

All the methods and properties from Event are also available on `EventCallable` instance.

> TIP: 
>
> You can think of the EventCallable and Event as type and its super type:
>
> `EventCallable<T> extends Event<T>`

#### `.prepend(fn)`

Creates a new `EventCallable`, that should be called, upon trigger it sends transformed data into the original event.

Works kind of like reverse `.map`. In case of `.prepend` data transforms **before the original event occurs** and in the
case of `.map`, data transforms **after original event occurred**.

If the original event belongs to some domain, then a new event will belong to it as well.

##### Formulae

```ts
const first: EventCallable<T>;
const second: EventCallable<T> = first.prepend(fn);
```

* When `second` event is triggered
* Call `fn` with argument from the `second` event
* Trigger `first` event with the result of `fn()`

##### Arguments

1. `fn` (*Function*): A function that receives `argument`, and should be **pure**.

##### Throws

###### unit call from pure function is not supported, use operators like sample instead

> INFO since: 
>
> [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0-spacewatch)

Happens when events or effects called from pure functions, like mappers:

```ts
const someHappened = createEvent<string>();
const another = createEvent<number>();

const reversed = someHappened.prepend((input: number) => {
  another(input); // THROWS!
  return String(input);
});
```

To fix this, use `sample`:

```ts
const someHappened = createEvent<string>();
const another = createEvent<number>();
const reversed = createEvent<number>();

// The same as .prepend(), but using `sample`
sample({
  clock: reversed,
  fn: (input) => String(input),
  target: someHappened,
});

sample({
  clock: reversed,
  target: another,
});
```

##### Returns

EventCallable\<T>: New event.

##### Types

There TypeScript requires explicitly setting type of the argument of `fn` function:

```ts
import { createEvent } from "effector";

const original = createEvent<{ input: string }>();

const prepended = original.prepend((input: string) => ({ input }));
//                                         ^^^^^^ here
```

Type of the `original` event argument and the resulting type of the `fn` must be the same.

##### Examples

###### Basic

```js
import { createEvent } from "effector";

const userPropertyChanged = createEvent();

userPropertyChanged.watch(({ field, value }) => {
  console.log(`User property "${field}" changed to ${value}`);
});

const changeName = userPropertyChanged.prepend((name) => ({
  field: "name",
  value: name,
}));
const changeRole = userPropertyChanged.prepend((role) => ({
  field: "role",
  value: role.toUpperCase(),
}));

changeName("john");
// => User property "name" changed to john

changeRole("admin");
// => User property "role" changed to ADMIN

changeName("alice");
// => User property "name" changed to alice
```

Try it

###### Meaningful example

You can think of this method like a wrapper function. Let's assume we have function with not ideal API, but we want to
call it frequently:

```ts
import { sendAnalytics } from "./analytics";

export function reportClick(item: string) {
  const argument = { type: "click", container: { items: [arg] } };
  return sendAnalytics(argument);
}
```

This is exactly how `.prepend()` works:

```ts
import { sendAnalytics } from "./analytics";

export const reportClick = sendAnalytics.prepend((item: string) => {
  return { type: "click", container: { items: [arg] } };
});

reportClick("example");
// reportClick triggered "example"
// sendAnalytics triggered { type: "click", container: { items: ["example"] } }
```

Check all other methods on Event.

## `Event<T>`

A **Event** is a super type of `EventCallable` with different approach. Firstly, invoking a Event is not
allowed, and it cannot be used as a `target` in the `sample` operator, and so on.

The primary purpose of a Event is to be triggered by internal code withing the effector library or ecosystem.
For instance, the `.map()` method returns a Event, which is subsequently called by the `.map()` method itself.

> INFO: 
>
> There is no need for user code to directly invoke such an Event.
>
> If you find yourself needing to call a Event, it may be necessary to reevaluate and restructure your
> application's logic.

All the functionalities provided by an Event are also supported in an EventCallable.

### Construction

There is no way to manually create Event, but some methods and operators returns derived events, they are return
`Event<T>` type:

* Event's methods like: .map(fn), .filter({fn}), and so on
* Store's property: '.updates'
* Effect's methods and properties
* operators like: sample, merge

### Throws

* **Errors related to incorrect usage**: More details in specific method sections.

### Declaring types

It becomes necessary in cases where a factory or library requires an event to subscribe to its updates, ensuring proper
integration and interaction with the provided functionality:

```ts
const event: Event<T>;
```

### Methods

#### `.map(fn)`

Creates a new derived Event, which will be called after the original event is called, using the result of the fn
function as its argument. This special function enables you to break down and manage data flow, as well as extract or
transform data within your business logic model.

##### Formulae

```ts
const first: Event<T> | EventCallable<T>;
const second: Event<F> = first.map(fn);
```

* When `first` is triggered, pass payload from `first` to `fn`.
* Trigger `second` with the result of the `fn()` call as payload.
* The function `fn` is invoked each time the `first` event is triggered.
* Also, the `second` event triggered each time the `first` is triggered.

##### Arguments

1. `fn` (*Function*): A function that receives `argument`, and should be .

##### Throws

###### unit call from pure function is not supported, use operators like sample instead

> INFO since: 
>
> [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0-spacewatch)

Happens when events or effects called from pure functions, like mappers:

```ts
const someHappened = createEvent<number>();
const another = createEvent();

const derived = someHappened.map((number) => {
  another(); // THROWS!
  return String(number);
});
```

To fix this, use `sample`:

```ts
const someHappened = createEvent<number>();
const another = createEvent();
const derived = createEvent<string>();

sample({
  clock: someHappened,
  target: another,
});

// The same as .map(), but using `target`
sample({
  clock: someHappened,
  fn: (number) => String(number),
  target: derived,
});
```

##### Returns

Event\<T>: The new event.

##### Types

The resulting type of the `fn` function will be utilized to define the type of the derived event.

```ts
import { createEvent } from "effector";

const first = createEvent<number>();
// first: Event<number>

const second = first.map((count) => count.toString());
// second: Event<string>
```

The `first` event can be represented as either `Event<T>` or `EventCallable<T>`. <br/>
The `second` event will always be represented as `Event<T>`.

##### Examples

```js
import { createEvent } from "effector";

const userUpdated = createEvent();

// you may decompose dataflow with .map() method
const userNameUpdated = userUpdated.map(({ user }) => name);

// either way you can transform data
const userRoleUpdated = userUpdated.map((user) => user.role.toUpperCase());

userNameUpdated.watch((name) => console.log(`User's name is [${name}] now`));
userRoleUpdated.watch((role) => console.log(`User's role is [${role}] now`));

userUpdated({ name: "john", role: "admin" });
// => User's name is [john] now
// => User's role is [ADMIN] now
```

Try it

#### `.filter({ fn })`

This method generates a new derived Event that will be invoked after the original event, but only if the `fn`
function returns `true`. This special function enables you to break down data flow into a branches and
subscribe on them within the business logic model.

> TIP: 
>
> sample operator with `filter` argument is the preferred filtering method.

##### Formulae

```ts
const first: Event<T> | EventCallable<T>;
const second: Event<T> = first.filter({ fn });
```

* When `first` is triggered, pass payload from `first` to `fn`.
* The `second` event will be triggered only if `fn` returns `true`, with the argument from `first` event.
* The function `fn` is invoked each time the `first` event is triggered.
* Also, the `second` event triggered each time the `first` is triggered, **and** the `fn` returned `true`.

##### Arguments

1. `fn` (*Function*): A function that receives `argument`, and should be .

> INFO Note: 
>
> Here, due to legacy restrictions `fn` is required to use object form because `event.filter(fn)` was an alias
> for Event filterMap.
>
> Use it always like this `.filter({ fn })`.

##### Throws

###### unit call from pure function is not supported, use operators like sample instead

> INFO since: 
>
> [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0-spacewatch)

Happens when events or effects called from pure functions, like guards:

```ts
const countReceived = createEvent<number>();
const eachReceived = createEvent<number>();

const receivedEven = someHappened.filter({
  fn(count) {
    eachReceived(count); // THROWS!
    return count % 2 === 0;
  },
});
```

To fix this, use `sample` to call `eachReceived`:

```ts
const countReceived = createEvent<number>();
const eachReceived = createEvent<number>();

const receivedEven = someHappened.filter({
  fn(count) {
    return count % 2 === 0;
  },
});

sample({
  clock: someHappened,
  target: eachReceived,
});
```

##### Returns

Event\<T>: The new event

##### Types

Method `.filter()` always returns Event. Also this event will have the same type as the original type:

```ts
import { createEvent } from "effector";

const numberReceived = createEvent<number>();
// numberReceived: Event<number>

const evenReceived = numberReceived.filter({
  fn: (number) => number % 2 === 0,
});
// evenReceived: Event<number>

evenReceived.watch(console.info);
numberReceived(5); // nothing
numberReceived(2); // => 2
```

##### Examples

```js
import { createEvent, createStore } from "effector";

const numbers = createEvent();
const positiveNumbers = numbers.filter({
  fn: ({ x }) => x > 0,
});

const $lastPositive = createStore(0).on(positiveNumbers, (n, { x }) => x);

$lastPositive.watch((x) => {
  console.log("last positive:", x);
});

// => last positive: 0

numbers({ x: 0 });
// no reaction

numbers({ x: -10 });
// no reaction

numbers({ x: 10 });
// => last positive: 10
```

Try it

##### Meaningful example

Let's assume a standard situation when you want to buy sneakers in the shop, but there is no size. You subscribe to the
particular size of the sneakers' model, and in addition, you want to receive a notification if they have it, and ignore
any other notification. Therefore, filtering can be helpful for that. Event filtering works in the same way. If `filter`
returns `true`, the event will be called.

```ts
const sneackersReceived = createEvent<Sneakers>();
const uniqueSizeReceived = sneackersReceived.filter({
  fn: (sneackers) => sneackers.size === 48,
});
```

#### `.filterMap(fn)`

> INFO since: 
>
> [effector 20.0.0](https://changelog.effector.dev/#effector-20-0-0)

This methods generates a new derived Event that **may be invoked** after the original event, but with the
transformed argument. This special method enabled you to simultaneously transform data and filter out trigger of the
event.

This method looks like the `.filter()` and `.map()` merged in the one. That's it. The reason for creating was an
impossibility for event filtering.

This method is mostly useful with JavaScript APIs whose returns `undefined` sometimes.

##### Formulae

```ts
const first: Event<T> | EventCallable<T>;
const second: Event<F> = first.filterMap(fn);
```

* When `first` is triggered, call `fn` with payload from `first`
* If `fn()` returned `undefined` do not trigger `second`
* If `fn()` returned some data, trigger `second` with data from `fn()`

##### Arguments

1. `fn` (*Function*): A function that receives `argument`, should be .

The `fn` function should return some data. When `undefined` is returned, the update of derived event will be skipped.

##### Throws

###### unit call from pure function is not supported, use operators like sample instead

> INFO since: 
>
> [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0-spacewatch)

Happens when events or effects called from pure functions, like mappers:

```ts
const countReceived = createEvent<number>();
const eachReceived = createEvent<number>();

const receivedEven = someHappened.filterMap((count) => {
  eachReceived(count); // THROWS!
  return count % 2 === 0 ? Math.abs(count) : undefined;
});
```

To fix this, use `sample` to call `eachReceived`:

```ts
const countReceived = createEvent<number>();
const eachReceived = createEvent<number>();

const receivedEven = someHappened.filterMap((count) => {
  return count % 2 === 0 ? Math.abs(count) : undefined;
});

sample({
  clock: someHappened,
  target: eachReceived,
});
```

##### Returns

Event\<T>: The new event

##### Types

The type for the derived event is automatically inferred from the `fn` declaration.
No need to explicitly set type for variable or generic type argument:

```ts
import { createEvent } from "effector";

const first = createEvent<number>();
// first: Event<number>

const second = first.filterMap((count) => {
  if (count === 0) return;
  return count.toString();
});
// second: Event<string>
```

The `first` event can be represented as either `Event<T>` or `EventCallable<T>`. <br/>
The `second` event will always be represented as `Event<T>`.

##### Examples

```tsx
import { createEvent } from "effector";

const listReceived = createEvent<string[]>();

// Array.prototype.find() returns `undefined` when no item is found
const effectorFound = listReceived.filterMap((list) => list.find((name) => name === "effector"));

effectorFound.watch((name) => console.info("found", name));

listReceived(["redux", "effector", "mobx"]); // => found effector
listReceived(["redux", "mobx"]);
```

Try it

##### Meaningful example

Consider a scenario where you walk into a grocery store with a specific task: you need to purchase 10 apples, but only
if they're red. If they're not red, you're out of luck.
Let's consider by steps:

1. Take one apple;
2. Have a look, is it red(put in a pack) or not(take another).

And you repeat this until you complete the task. Now think about it in the effector terms, and we consider the positive
case:

1. Take an apple – event;
2. Have a look, red or no – filter;
3. You keep it – map;
4. Put in pack – event.
5. Pack – store

#### `.watch(watcher)`

This method enables you to call callback on each event trigger with the argument of the event.

> TIP Keep in mind: 
>
> The `watch` method neither handles nor reports exceptions, manages the completion of asynchronous operations, nor
> addresses data race issues.
>
> Its primary intended use is for short-term debugging and logging purposes.

Read more in the explanation section.

##### Formulae

```ts
const event: Event<T> | EventCallable<T>;
const unwatch: () => void = event.watch(fn);
```

* The `fn` will be called on each `event` trigger, passed argument of the `event` to the `fn`.
* When `unwatch` is called, stop calling `fn` on each `event` trigger.

##### Arguments

1. `watcher` (): A function that receives `argument` from the event.

##### Returns

: Unsubscribe function.

##### Examples

```js
import { createEvent } from "effector";

const sayHi = createEvent();
const unwatch = sayHi.watch((name) => console.log(`${name}, hi there!`));

sayHi("Peter"); // => Peter, hi there!
unwatch();

sayHi("Drew"); // => nothing happened
```

Try it

#### `.subscribe(observer)`

This is the low-level method to integrate event with the standard `Observable` pattern.

> TIP Keep in mind: 
>
> You don't need to use this method on your own. It is used under the hood by rendering engines or so on.

Read more:

* https://rxjs.dev/guide/observable
* https://github.com/tc39/proposal-observable

### Properties

These set of property is mostly set by effector/babel-plugin
or @effector/swc-plugin. So they are exist only when babel or SWC is used.

#### `.sid`

It is an unique identifier for each event.

It is important to note, SID is not changes on each app start, it is statically written inside your app bundle to
absolutely identify units.

It can be useful to send events between workers or
server/browser: [examples/worker-rpc](https://github.com/effector/effector/tree/master/examples/worker-rpc).

It has the `string | null` type.

#### `.shortName`

It is a `string` type property, contains the name of the variable event declared at.

```ts
import { createEvent } from "effector";

const demo = createEvent();
// demo.shortName === 'demo'
```

But reassign event to another variable changes nothing:

```ts
const another = demo;
// another.shortName === 'demo'
```

#### `.compositeName`

This property contains the full internal chain of units. For example, event can be created by the domain, so the
composite name will contain a domain name inside it.

> TIP Keep in mind: 
>
> Usually, if long name is needed, is better to pass it explicitly to `name` field

```ts
import { createEvent, createDomain } from "effector";

const first = createEvent();
const domain = createDomain();
const second = domain.createEvent();

console.log(first.compositeName);
// => { shortName: "first", fullName: "first", path: ["first"] }

console.log(second.compositeName);
// => { shortName: "second", fullName: "domain/second", path: ["domain", "second"] }
```

## Types

```ts
import { type EventPayload } from "effector";
```

### `EventPayload<E>`

Extracts type of payload from `Event` or `EventCallable`.

```ts
const event: Event<Payload>;
type Payload = EventPayload<typeof event>;
```


# Scope

```ts
import { type Scope } from "effector";
```

`Scope` is a fully isolated instance of application.
The primary purpose of scope includes SSR (Server-Side Rendering) but is not limited to this use case. A `Scope` contains an independent clone of all units (including connections between them) and basic methods to access them.

A `Scope` can be created using fork.

### Imperative effects calls with scope

When making imperative effect calls within effect handlers, it is supported but **not** within `watch` functions. For effect handlers that call other effects, ensure to only call effects, not common asynchronous functions. Furthermore, effect calls should be awaited:

**✅ Correct usage for an effect without inner effects:**

```js
const delayFx = createEffect(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
});
```

**✅ Correct usage for an effect with inner effects:**

```js
const authUserFx = createEffect();
const sendMessageFx = createEffect();

const sendWithAuthFx = createEffect(async () => {
  await authUserFx();
  await delayFx();
  await sendMessageFx();
});
```

**❌ Incorrect usage for an effect with inner effects:**

```js
const sendWithAuthFx = createEffect(async () => {
  await authUserFx();

  // Incorrect! This should be wrapped in an effect.
  await new Promise((resolve) => setTimeout(resolve, 80));

  // Context is lost here.
  await sendMessageFx();
});
```

For scenarios where an effect might call another effect or perform asynchronous computations, but not both, consider utilizing the attach method instead for more succinct imperative calls.

### Loss of `scope`

**What are the risks of calling effects after asynchronous functions?** The state in which the application enters after such a call is called "loss of scope." This means that after completing the call of a regular asynchronous function, all subsequent actions will fall into the global mode (this is what works with a direct call to `$store.getState()`), meaning all data updates will **not** enter the scope in which the work was conducted. As a result, an inconsistent state will be sent to the client.

Imperative calls of effects are safe in this regard because effector remembers the scope in which the imperative call of the effect began and restores it after the call, allowing for another call in sequence.

You can call methods like `Promise.all([fx1(), fx2()])` and others from the standard JavaScript API because in these cases, the calls to effects still happen synchronously, and the scope is safely preserved.

All rules discussed for effects also apply to imperative calls of events.

**How to circumvent this limitation?** There are situations where calls outside the scope cannot be avoided; typical examples are `setInterval` and `history.listen`. To safely pass an effect (or event) to these functions, you can use the method scopeBind. It creates a function bound to the scope in which the method was called, allowing it to be safely called later.

```js
const sendWithAuthFx = createEffect(async () => {
  // Now this function can be called safely
  // without adhering to the scope loss rules
  const sendMessage = scopeBind(sendMessageFx);

  await authUserFx();

  // There is no context inside setInterval, but our function is bound
  return setInterval(sendMessage, 500);
});
```

> TIP Keep in mind: 
>
> Remember to clear setInterval after finishing work with the scope to avoid memory leaks. You can clear setInterval with a separate effect by first returning its id from the first effect and storing it in a separate store.

**Is there any way to circumvent the loss of scope? Is this an issue specific to effector?** This is a general principle of working with asynchrony in JavaScript. All technologies that face the need to maintain the context in which calls occur handle this difficulty in one way or another. The most prominent example is [zone.js](https://github.com/angular/angular/tree/main/packages/zone.js), which wraps all asynchronous global functions like `setTimeout` or `Promise.resolve` to maintain the context. Other solutions to this problem include using generators or `ctx.schedule(() => asyncCall())`.

**Will there be a universal solution to the context loss problem?** Yes. A new proposal in the language called [async context](https://github.com/tc39/proposal-async-context) aims to solve this problem once and for all. It will allow asynchronous logic to be run once, retrieving data from the context in all related calls, regardless of how they occur. Once the proposal is incorporated into the language and gains broad support, effector will definitely switch to this solution, and the rules for calling effects will become a thing of the past.

## Methods

### `.getState($store)`

Returns the value of a store in a given `Scope`.

#### Formulae

```ts
const scope: Scope;
const $value: Store<T> | StoreWritable<T>;

const value: T = scope.getState($value);
```

#### Returns

`T` the value of the store

#### Examples

Create two instances of an application, trigger events in them, and test the `$counter` store value in both instances:

```js
import { createStore, createEvent, fork, allSettled } from "effector";

const inc = createEvent();
const dec = createEvent();
const $counter = createStore(0);

$counter.on(inc, (value) => value + 1);
$counter.on(dec, (value) => value - 1);

const scopeA = fork();
const scopeB = fork();

await allSettled(inc, { scope: scopeA });
await allSettled(dec, { scope: scopeB });

console.log($counter.getState()); // => 0
console.log(scopeA.getState($counter)); // => 1
console.log(scopeB.getState($counter)); // => -1
```

Try it


# Store

```ts
import { type Store, type StoreWritable } from "effector";
```

*Store* is an object that holds the state value. Store gets updates when it receives a value that is not equal (`!==`) to the current one and to `undefined`. Store is a Unit. Some stores can be derived.

### Immutability

A store in effector is immutable. This means that updates will only occur if the handler function (such as `combine`, `sample`, or `on`) returns a new object.

For example, before using array methods, you need to create a new reference to it. Here’s how to do it correctly:

```ts
$items.on(addItem, (items, newItem) => {
  const updatedItems = [...items];
  // ✅ .push method is called on a new array
  updatedItems.push(newItem);
  return updatedItems;
});
```

This approach should not be used, as the store **will not be updated**:

```ts
$items.on(addItem, (items, newItem) => {
  // ❌ Error! The array reference remains the same, the store will not be updated
  items.push(newItem);
  return items;
});
```

Updating objects works in a similar way.

A store in effector should be as small as possible, responsible for a specific part of the business logic, unlike, for example, Redux, whose store tends to hold everything together. When the state is atomic, the need for spreading objects becomes less frequent. However, if there is a need to frequently update deeply nested data, it is acceptable to use [immer](https://immerjs.github.io/immer/produce) to simplify repetitive code when updating the state.

## Store Methods

### `.map(fn)`

Creates a derived store. It will call a provided function with the state when the original store updates, and will use the result to update the derived store.

#### Formulae

```ts
const $second = $first.map(fn);
```

#### Arguments

1. `fn` (*Function*): Function that receives `state` and returns a new state for the derived store.
2. `config` (*Object*): Optional configuration.

#### Returns

: New derived store.

#### Examples

##### Basic

```js
import { createEvent, createStore } from "effector";

const changed = createEvent();
const $title = createStore("").on(changed, (_, newTitle) => newTitle);
const $length = $title.map((title) => title.length);

$length.watch((length) => {
  console.log("new length", length);
});

changed("hello");
changed("world");
changed("hello world");
```

Try it

##### SkipVoid

```js
const $length = $title.map((title) => title.length, { skipVoid: false });
```

### `.on(trigger, reducer)`

Updates state when `trigger` is triggered by using a reducer.

#### Formulae

```ts
$store.on(trigger, reducer);
```

#### Arguments

1. `trigger`: *Event*, *Effect*, or another *Store*.
2. `reducer`: *Reducer*: Function that receives `state` and `params` and returns a new state.

#### Returns

: Current store.

#### Examples

##### Basic

```js
import { createEvent, createStore } from "effector";

const $store = createStore(0);
const changed = createEvent();

$store.on(changed, (value, incrementor) => value + incrementor);

$store.watch((value) => {
  console.log("updated", value);
});

changed(2);
changed(2);
```

Try it

### `.watch(watcher)`

Calls `watcher` function each time when the store is updated.

#### Formulae

```ts
const unwatch = $store.watch(watcher);
```

#### Arguments

1. `watcher`: : Watcher function that receives the current store state as the first argument.

#### Returns

: Unsubscribe function.

#### Examples

##### Basic

```js
import { createEvent, createStore } from "effector";

const add = createEvent();
const $store = createStore(0).on(add, (state, payload) => state + payload);

$store.watch((value) => console.log(`current value: ${value}`));
add(4);
add(3);
```

Try it

### `.reset(...triggers)`

Resets store state to the default value.

#### Formulae

```ts
$store.reset(...triggers);
```

#### Arguments

1. `triggers`: (*(Event | Effect | Store)\[]*): any number of *Events*, *Effects*, or *Stores*.

#### Returns

: Current store.

#### Examples

##### Basic

```js
import { createEvent, createStore } from "effector";

const increment = createEvent();
const reset = createEvent();

const $store = createStore(0)
  .on(increment, (state) => state + 1)
  .reset(reset);

$store.watch((state) => console.log("changed", state));

increment();
increment();
reset();
```

Try it

### `.off(trigger)`

Removes reducer for the given `trigger`.

#### Formulae

```ts
$store.off(trigger);
```

#### Arguments

1. `trigger`: *Event*, *Effect*, or *Store*.

#### Returns

: Current store.

#### Examples

##### Basic

```js
import { createEvent, createStore, merge } from "effector";

const changedA = createEvent();
const changedB = createEvent();

const $store = createStore(0);
const changed = merge([changedA, changedB]);

$store.on(changed, (state, params) => state + params);
$store.off(changed);
```

Try it

## Store Properties

### `.updates`

#### Returns

: Event that represents updates of the given store.

#### Example

```js
import { createStore, is } from "effector";

const $clicksAmount = createStore(0);
is.event($clicksAmount.updates); // true

$clicksAmount.updates.watch((amount) => {
  console.log(amount);
});
```

Try it

### `.reinit`

#### Returns

: Event that can reinitialize a store with a default value.

#### Example

```js
import { createStore, createEvent, sample, is } from "effector";

const $counter = createStore(0);
is.event($counter.reinit);

const increment = createEvent();

$counter.reinit();
console.log($counter.getState());
```

Try it

### `.shortName`

#### Returns

(*`string`*): ID or short name of the store.

### `.defaultState`

#### Returns

(*`State`*): Default state of the store.

#### Example

```ts
const $store = createStore("DEFAULT");
console.log($store.defaultState === "DEFAULT");
```

## Utility methods

### `.getState()`

Returns the current state of the store.

#### Returns

(*`State`*): Current state of the store.

#### Example

```js
import { createEvent, createStore } from "effector";

const add = createEvent();

const $number = createStore(0).on(add, (state, data) => state + data);

add(2);
add(3);

console.log($number.getState());
```

Try it

## Readonly store

TBD

## Types

```ts
import { type StoreValue } from "effector";
```

### `StoreValue<S>`

Extracts type of `Store` or `StoreWritable` value.

```ts
const $store: Store<Value>;
type Value = StoreValue<typeof $store>;
```


# allSettled

## Methods

### `allSettled(unit, {scope, params?})`

Calls the provided unit within the current scope and wait for all triggered effects to complete.

#### Formulae

```ts
allSettled<T>(unit: Event<T>, {scope: Scope, params?: T}): Promise<void>
allSettled<T>(unit: Effect<T, Done, Fail>, {scope: Scope, params?: T}): Promise<
  | {status: 'done'; value: Done}
  | {status: 'fail'; value: Fail}
>
allSettled<T>(unit: Store<T>, {scope: Scope, params?: T}): Promise<void>
```

#### Arguments

1. `unit`:  or  to be called
2. `scope`: 
3. `params`: params passed to `unit`

> INFO since: 
>
> Return value for effect is supported since [effector 21.4.0](https://changelog.effector.dev/#effector-21-4-0)

#### Examples

> TIP Contribution: 
>
> TBD
>
> Please, [open PullRequest](https://github.com/effector/effector) and contribute examples for this section via "Edit this page" link below.

### `allSettled(scope)`

Checks the provided scope for any ongoing computations and wait for their completion.

#### Formulae

```ts
allSettled<T>(scope): Promise<void>
```

#### Arguments

1. `scope`: 

> INFO since: 
>
> Supported since effector 22.5.0

#### Examples

##### Usage in tests

For example, tests that validate the integration with an external reactive API

```ts
import {createEvent, sample, fork, scopeBind, allSettled} from 'effector'

test('integration with externalSource', async () => {
  const scope = fork()

  const updated = createEvent()

  sample({
    clock: updated,
    target: someOtherLogicStart,
  })

  // 1. Subscribe event to external source
  const externalUpdated = scopeBind(updated, {scope})
  externalSource.listen(() => externalUpdates())

  // 2. Trigger update of external source
  externalSource.trigger()

  // 3. Wait for all triggered computations in effector's scope, even though these were not triggered by effector itself
  await allSettled(scope)

  // 4. Check anything as usual
  expect(...).toBe(...)
})
```


# attach

```ts
import { attach } from "effector";
```

> INFO since: 
>
> Available since [effector 20.13.0](https://changelog.effector.dev/#effector-20-13-0).
>
> Since [effector 22.4.0](https://changelog.effector.dev/#effector-encke-22-4-0), it is available to check whether effect is created via `attach` method — is.attached.

Creates new effects based on the other effects, stores. Allows mapping params and handling errors.

Use cases: declarative way to pass values from stores to effects and argument preprocessing. Most useful case is `attach({ source, async effect })`.

> TIP: 
>
> The attached effects are the same first-class citizens as the regular effects made by createEffect. You should place them in the same files as regular effects, also you can use the same naming strategy.

## Methods

### `attach({effect})`

> INFO since: 
>
> [effector 21.5.0](https://changelog.effector.dev/#effector-21-5-0)

Create effect which will call `effect` with params as it is. That allows creating separate effects with shared behavior.

#### Formulae

```ts
const attachedFx = attach({ effect: originalFx });
```

* When `attachedFx` is triggered, then `originalFx` is triggered too
* When `originalFx` is finished (fail/done), then `attachedFx` must be finished with the same state.

#### Arguments

* `effect` (): Wrapped effect

#### Returns

: New effect

#### Types

```ts
const originalFx: Effect<Params, Done, Fail>;

const attachedFx: Effect<Params, Done, Fail> = attach({
  effect: originalFx,
});
```

In case of this simple variant of `attach`, types of `originalFx` and `attachedFx` will be the same.

#### Examples

It allows to create *local* copy of the effect, to react only on triggers emitted from the current *local* code.

```ts
import { createEffect, attach } from "effector";

const originalFx = createEffect((word: string) => {
  console.info("Printed:", word);
});

const attachedFx = attach({ effect: originalFx });

originalFx.watch(() => console.log("originalFx"));
originalFx.done.watch(() => console.log("originalFx.done"));

attachedFx.watch(() => console.log("attachedFx"));
attachedFx.done.watch(() => console.log("attachedFx.done"));

originalFx("first");
// => originalFx
// => Printed: first
// => originalFx.done

attachedFx("second");
// => attachedFx
// => originalFx
// Printed: second
// => originalFx.done
// => attachedFx.done
```

Try it

### `attach({source, effect})`

Create effect which will trigger given one with values from `source` stores.

#### Formulae

```ts
const attachedFx = attach({
  source,
  effect: originalFx,
});
```

* When `attachedFx` is triggered, read data from `source`, trigger with the data `originalFx`
* When `originalFx` is finished, pass the same resolution (done/fail) into `attachedFx` and finish it

#### Arguments

* `source` ( | `{[key: string]: Store}`): Store or object with stores, values of which will be passed to the second argument of `mapParams`
* `effect` (): Original effect

#### Returns

: New effect

#### Types

> TIP: 
>
> You don't need to explicitly set types for each declaration. The purpose of the following example is to provide a clear understanding.

In most userland code you will write code like this, without explicit types of the `let`/`const`:

```ts
const originalFx = createEffect<OriginalParams, SomeResult, SomeError>(async () => {});
const $store = createStore(initialValue);

const attachedFx = attach({
  source: $store,
  effect: originalFx,
});
```

##### Single store

```ts
const originalFx: Effect<T, Done, Fail>;
const $store: Store<T>;

const attachedFx: Effect<void, Done, Fail> = attach({
  source: $store,
  effect: originalFx,
});
```

[Try it in ts playground](https://tsplay.dev/NBJDDN)

Types of the `source` store and `effect` params must be the same.
But the `attachedFx` will omit the type of params, it means the attached effect not requires any params at all.

##### Shape of stores

```ts
const originalFx: Effect<{ a: A; b: B }, Done, Fail>;
const $a: Store<A>;
const $b: Store<B>;

const attachedFx: Effect<void, Done, Fail> = attach({
  source: { a: $a, b: $b },
  effect: originalFx,
});
```

[Try it in ts playground](https://tsplay.dev/mbE58N)

Types of the `source` object must be the same as `originalFx` params. But the `attachedFx` will omit the type of params, it means the attached effect not requires any params at all.

#### Examples

```ts
import { createEffect, createStore, attach } from "effector";

const requestPageFx = createEffect<{ page: number; size: number }, string[]>(
  async ({ page, size }) => {
    console.log("Requested", page);
    return page * size;
  },
);

const $page = createStore(1);
const $size = createStore(20);

const requestNextPageFx = attach({
  source: { page: $page, size: $size },
  effect: requestPageFx,
});

$page.on(requestNextPageFx.done, (page) => page + 1);

requestPageFx.doneData.watch((position) => console.log("requestPageFx.doneData", position));

await requestNextPageFx();
// => Requested 1
// => requestPageFx.doneData 20

await requestNextPageFx();
// => Requested 2
// => requestPageFx.doneData 40

await requestNextPageFx();
// => Requested 3
// => requestPageFx.doneData 60
```

Try it

### `attach({source, async effect})`

> INFO since: 
>
> [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

Creates effect which will call async function with values from the `source` stores.

#### Formulae

```ts
const attachedFx = attach({
  source,
  async effect(source, params) {},
});
```

* When `attachedFx` is triggered, read data from the `source`, call `effect` function.
* When `effect` function returns resolved `Promise`, finish `attachedFx` with the data from the function as `attachedFx.done`.
* When `effect` throws exception, or returns rejected `Promise`, finish `attachedFx` with the data from function as `attachedFx.fail`.

#### Arguments

* `effect` (*Function*): `(source: Source, params: Params) => Promise<Result> | Result`
* `source` ( | `{[key: string]: Store}`): Store or object with stores, values of which will be passed to the first argument of `effect`

#### Returns

: New effect

#### Usage with scope

Any effects called inside `async effect` function will propagate scope.

```ts
const outerFx = createEffect((count: number) => {
  console.log("Hit", count);
});

const $store = createStore(0);
const attachedFx = attach({
  source: $store,
  async effect(count, _: void) {},
});
```

**Scope is lost** if there are any asynchronous function calls made:

```ts
const attachedFx = attach({
  source: $store,
  async effect(source) {
    // Here is ok, the effect is called
    const resultA = await anotherFx();

    // Be careful:
    const resultB = await regularFunction();
    // Here scope is lost.
  },
});
```

To solve this case, you need to just wrap your `regularFunction` into effect:

```ts
const regularFunctionFx = createEffect(regularFunction);
```

#### Types

##### Single store

```ts
const $store: Store<T>;

const attachedFx: Effect<Params, Done, Fail> = attach({
  source: $store,
  async effect(source, params: Params): Done | Promise<Done> {},
});
```

You need to type explicitly only `params` argument. All other types of arguments should be inferred automatically. Also, you may want to explicitly set the return type of the `effect` function.

If you want to remove any arguments from the `attachedFx` you need to just remove second argument from `effect` function:

```ts
const attachedFx: Effect<void, void, Fail> = attach({
  source: $store,
  async effect(source) {},
});
```

##### Multiple stores

> TIP: 
>
> For details review previous section of types. Here the same logic.

```ts
// Userland example, without explicit type declarations
const $foo = createStore(100);
const $bar = createStore("demo");

const attachedFx = attach({
  source: { foo: $foo, bar: $bar },
  async effect({ foo, bar }, { baz }: { baz: boolean }) {
    console.log("Hit!", { foo, bar, baz });
  },
});

attachedFx({ baz: true });
// => Hit! { foo: 100, bar: "demo", baz: true }
```

[Try it in ts playground](https://tsplay.dev/m3xjbW)

#### Example

> WARNING TBD: 
>
> Please, open pull request via "Edit this page" link.

### `attach({effect, mapParams})`

Creates effect which will trigger given one by transforming params by `mapParams` function.

#### Formulae

```ts
const attachedFx = attach({
  effect: originalFx,
  mapParams,
});
```

* When `attachedFx` triggered, payload passed into `mapParams` function, then the result of it passed into `originalFx`
* When `originalFx` is finished, then `attachedFx` must be finished with the same resolution (done/fail).
* If `mapParams` throws an exception, then `attachedFx` must be finished with the error as `attachedFx.fail`. But `originalFx` will not be triggered at all.

#### Arguments

* `effect` (): Wrapped effect
* `mapParams` (`(newParams) => effectParams`): Function which receives new params and maps them to the params of the wrapped `effect`. Works mostly like event.prepend. Errors happened in `mapParams` function will force attached effect to fail.

#### Returns

: New effect

#### Types

```ts
const originalFx: Effect<A, Done, Fail>;

const attachedFx: Effect<B, Done, Fail> = attach({
  effect: originalFx,
  mapParams: (params: B): A {},
});
```

`mapParams` must return the same type `originalFx` receives as params.

If `attachedFx` must be called without any arguments, then `params` can be safely removed from the `mapParams`:

```ts
const attachedFx: Effect<void, Done, Fail> = attach({
  effect: originalFx,
  mapParams: (): A {},
});
```

[Try it in ts playground](https://tsplay.dev/wXOYoW)

But if `mapParams` function throws an exception, it is on your own to check types compatibility, because of TypeScript.

```ts
const attachedFx: Effect<void, Done, Fail> = attach({
  effect: originalFx,
  mapParams: (): A {
    throw new AnyNonFailType(); // It can be noncompatible with `Fail` type
  },
});
```

#### Examples

##### Map arguments

```ts
import { createEffect, attach } from "effector";

const originalFx = createEffect((a: { input: number }) => a);

const attachedFx = attach({
  effect: originalFx,
  mapParams(a: number) {
    return { input: a * 100 };
  },
});

originalFx.watch((params) => console.log("originalFx started", params));

attachedFx(1);
// => originalFx { input: 100 }
```

Try it

##### Handle exceptions

```ts
import { createEffect, attach } from "effector";

const originalFx = createEffect((a: { a: number }) => a);

const attachedFx = attach({
  effect: originalFx,
  mapParams(a: number) {
    throw new Error("custom error");
    return { a };
  },
});

attachedFx.failData.watch((error) => console.log("attachedFx.failData", error));

attachedFx(1);
// => attachedFx.failData
// =>   Error: custom error
```

Try it

### `attach({source, mapParams, effect})`

Creates effect which will read values from `source` stores, pass them with params to `mapParams` function and then call `effect` with the result.

#### Formulae

> TIP Note: 
>
> This variant of `attach` mostly works like the attach({effect, mapParams}). The same things are omitted from this section.

```ts
const attachedFx = attach({
  source,
  mapParams,
  effect: originalFx,
});
```

* When `attachedFx` triggered, payload passed into `mapParams` function with value from `source` store, then the result of it passed into `originalFx`
* When `originalFx` is finished, then `attachedFx` must be finished with the same resolution (done/fail).
* If `mapParams` throws an exception, then `attachedFx` must be finished with the error as `attachedFx.fail`. But `originalFx` will not be triggered at all.

#### Arguments

* `source` ( | `{[key: string]: Store}`): Store or object with stores, values of which will be passed to the second argument of `mapParams`
* `mapParams` (`(newParams, values) => effectParams`): Function which receives new params and current value of `source` and combines them to the params of the wrapped `effect`. Errors happened in `mapParams` function will force attached effect to fail
* `effect` (): Wrapped effect

#### Returns

: New effect

#### Types

> WARNING TBD: 
>
> Please, open pull request via "Edit this page" link.

#### Examples

##### With factory

```ts
// ./api/request.ts
import { createEffect, createStore } from "effector";

export const backendRequestFx = createEffect(async ({ token, data, resource }) => {
  return fetch(`https://example.com/api${resource}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
});

export const $requestsSent = createStore(0);

$requestsSent.on(backendRequestFx, (total) => total + 1);
```

```ts
// ./api/authorized.ts
import { attach, createStore } from "effector";

const $token = createStore("guest_token");

export const authorizedRequestFx = attach({
  effect: backendRequestFx,
  source: $token,
  mapParams: ({ data, resource }, token) => ({ data, resource, token }),
});

export function createRequest(resource) {
  return attach({
    effect: authorizedRequestFx,
    mapParams: (data) => ({ data, resource }),
  });
}
```

```ts
// ./api/index.ts
import { createRequest } from "./authorized";
import { $requestsSent } from "./request";

const getUserFx = createRequest("/user");
const getPostsFx = createRequest("/posts");

$requestsSent.watch((total) => {
  console.log(`client analytics: sent ${total} requests`);
});

const user = await getUserFx({ name: "alice" });
/*
POST https://example.com/api/user
{"name": "alice"}
Authorization: Bearer guest_token
*/

// => client analytics: sent 1 requests

const posts = await getPostsFx({ user: user.id });
/*
POST https://example.com/api/posts
{"user": 18329}
Authorization: Bearer guest_token
*/

// => client analytics: sent 2 requests
```

To allow factory works correct, add a path to a `./api/authorized` into `factories` option for Babel plugin:

```json5
// .babelrc
{
  plugins: [
    [
      "effector/babel-plugin",
      {
        factories: ["src/path-to-your-entity/api/authorized"],
      },
    ],
  ],
}
```

### Parameters

`attach()` also receives extra parameters, you can use it when you need.

#### `name`

```ts
attach({ name: string });
```

It allows us to explicitly set the name of the created attached effect:

```ts
import { attach } from "effector";

const attachedFx = attach({
  name: "anotherUsefulName",
  source: $store,
  async effect(source, params: Type) {
    // ...
  },
});

attachedFx.shortName; // "anotherUsefulName"
```

This parameter exists in **any variant** of the `attach`.

#### `domain`

```ts
attach({ domain: Domain });
```

It allows to create effect inside specified domain.

> Note: this property can only be used with a plain function `effect`.

```ts
import { createDomain, createStore, attach } from "effector";

const reportErrors = createDomain();
const $counter = createStore(0);

const attachedFx = attach({
  domain: reportErrors,
  source: $counter,
  async effect(counter) {
    // ...
  },
});
```


# Babel plugin

Built-in plugin for babel can be used for ssr and debugging. It inserts a name a Unit,
inferred from variable name and `sid` (Stable IDentifier), computed from the location in the source code.

For example, in case effects without handlers, it improves error messages by
clearly showing in which effect error happened.

```js
import { createEffect } from "effector";

const fetchFx = createEffect();

fetchFx();

// => no handler used in fetchFx
```

Try it

## Usage

In the simplest case, it can be used without any configuration:

```json
// .babelrc
{
  "plugins": ["effector/babel-plugin"]
}
```

## SID

> INFO since: 
>
> [effector 20.2.0](https://changelog.effector.dev/#effector-20-2-0)

Stable hash identifier for events, effects, stores and domains, preserved between environments, to handle client-server
interaction within the same codebase.

The crucial value of sid is that it can be autogenerated by `effector/babel-plugin` with default config, and it will be stable between builds.

> TIP Deep dive explanation: 
>
> If you need the detailed deep-dive explanation about why we need SIDs and how they are used internally, you can find it by following this link

See [example project](https://github.com/effector/effector/tree/master/examples/worker-rpc)

```js
// common.js
import { createEffect } from "effector";

export const getUser = createEffect({ sid: "GET /user" });
console.log(getUsers.sid);
// => GET /user
```

```js
// worker.js
import { getUsers } from "./common.js";

getUsers.use((userID) => fetch(userID));

getUsers.done.watch(({ result }) => {
  postMessage({ sid: getUsers.sid, result });
});

onmessage = async ({ data }) => {
  if (data.sid !== getUsers.sid) return;
  getUsers(data.userID);
};
```

```js
// client.js
import { createEvent } from "effector";
import { getUsers } from "./common.js";

const onMessage = createEvent();

const worker = new Worker("worker.js");
worker.onmessage = onMessage;

getUsers.use(
  (userID) =>
    new Promise((rs) => {
      worker.postMessage({ sid: getUsers.sid, userID });
      const unwatch = onMessage.watch(({ data }) => {
        if (data.sid !== getUsers.sid) return;
        unwatch();
        rs(data.result);
      });
    }),
);
```

## Configuration

### `hmr`

> INFO since: 
>
> [effector 23.4.0](https://changelog.effector.dev/#effector-23.4.0)

Enable Hot Module Replacement (HMR) support to clean up links, subscriptions and side effects managed by Effector. This prevents double-firing of Effects and watchers.

> WARNING Experimental: 
>
> Although tested, this option is considered experimental and might have unexpected issues in different bundlers.

#### Formulae

```json
"effector/babel-plugin",
  {
    "hmr": "es"
  }
]
```

* Type: `"es"` | `"cjs"` | `"none"`
  * `"es"`: Use `import.meta.hot` HMR API in bundlers that are ESM-compliant, like Vite and Rollup
  * `"cjs"`: Use `module.hot` HMR API in bundlers that rely on CommonJS modules, like Webpack and Next.js
  * `"none"`: Disable Hot Module Replacement.
* Default: `none`

> INFO In Production: 
>
> When bundling for production, make sure to set the `hmr` option to `"none"` to reduce bundle size and improve runtime performance.

### `forceScope`

> INFO since: 
>
> [effector 23.4.0](https://changelog.effector.dev/#effector-23.4.0)

Adds `forceScope` to all hooks from `effector-react`. This prevents mistakes when events called in non-scoped environment.

#### Formulae

```json
"effector/babel-plugin",
  {
    "forceScope": true
  }
```

* Type: `boolean`
  * `true`: Adds `{ forceScope: true }` to hooks like `useUnit`
  * `false`: Do nothing
* Default: `false`

### `importName`

Specifying import name or names to process by plugin. Import should be used in the code as specified.

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "importName": ["effector"]
  }
]
```

* Type: `string | string[]`
* Default: `['effector', 'effector/compat']`

### `factories`

Accepts an array of module names which exports treat as custom factories, therefore, each function call provides a unique prefix for sids of units inside them. Used to
SSR(Server Side Rendering) and it's not required for client-only application.

> INFO since: 
>
> [effector 21.6.0](https://changelog.effector.dev/#effector-21-6-0)

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "factories": ["path/here"]
  }
]
```

* Type: `string[]`
* Factories can have any number of arguments.
* Factories can create any number of units.
* Factories can call any effector methods.
* Factories can call other factories from other modules.
* Modules with factories can export any number of functions.
* Factories should be compiled with `effector/babel-plugin` as well as code which use them.

#### Examples

```json
// .babelrc
{
  "plugins": [
    [
      "effector/babel-plugin",
      {
        "factories": ["src/createEffectStatus", "~/createCommonPending"]
      }
    ]
  ]
}
```

```js
// ./src/createEffectStatus.js
import { rootDomain } from "./rootDomain";

export function createEffectStatus(fx) {
  const $status = rootDomain.createStore("init").on(fx.finally, (_, { status }) => status);

  return $status;
}
```

```js
// ./src/statuses.js
import { createEffectStatus } from "./createEffectStatus";
import { fetchUserFx, fetchFriendsFx } from "./api";

export const $fetchUserStatus = createEffectStatus(fetchUserFx);
export const $fetchFriendsStatus = createEffectStatus(fetchFriendsFx);
```

Import `createEffectStatus` from `'./createEffectStatus'` was treated as factory function, so each store created by it
has its own sid and will be handled by serialize
independently, although without `factories` they will share the same `sid`.

### `reactSsr`

Replaces imports from `effector-react` to `effector-react/scope`. Useful for building both server-side and client-side
builds from the same codebase.

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) the core team recommends deleting this option from `babel-plugin` configuration because effector-react supports SSR by default.

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "reactSsr": false
  }
]
```

* Type: `boolean`
* Default: `false`

### `addNames`

Adds name to units factories call. Useful for minification and obfuscation of production builds.

> INFO since: 
>
> [effector 21.8.0](https://changelog.effector.dev/#effector-21-8-0)

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "addNames": true
  }
]
```

* Type: `boolean`
* Default: `true`

### `addLoc`

Adds location to methods' calls. Used by devtools, for example [effector-logger](https://github.com/effector/logger).

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "addLoc": false
  }
]
```

* Type: `boolean`
* Default: `false`

### `debugSids`

Adds a file path and variable name of a unit definition to a sid. Useful for debugging SSR.

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "debugSids": false
  }
]
```

* Type: `boolean`
* Default: `false`

### `noDefaults`

Option for `effector/babel-plugin` for making custom unit factories with clean configuration.

> INFO since: 
>
> [effector 20.2.0](https://changelog.effector.dev/#effector-20-2-0)

#### Formulae

```json
[
  "effector/babel-plugin",
  {
    "noDefaults": false
  }
]
```

* Type: `boolean`
* Default: `false`

#### Examples

```json
// .babelrc
{
  "plugins": [
    ["effector/babel-plugin", { "addLoc": true }],
    [
      "effector/babel-plugin",
      {
        "importName": "@lib/createInputField",
        "storeCreators": ["createInputField"],
        "noDefaults": true
      },
      "createInputField"
    ]
  ]
}
```

```js
// @lib/createInputField.js
import { createStore } from "effector";
import { resetForm } from "./form";

export function createInputField(defaultState, { sid, name }) {
  return createStore(defaultState, { sid, name }).reset(resetForm);
}
```

```js
// src/state.js
import { createInputField } from "@lib/createInputField";

const foo = createInputField("-");
/*

will be treated as store creator and compiled to

const foo = createInputField('-', {
  name: 'foo',
  sid: 'z&si65'
})

*/
```

## Usage with Bundlers

### Vite + React (SSR)

To use with `effector/babel-plugin`, you have to following next steps:

1. Install `@vitejs/plugin-react` package.
2. `vite.config.js` should be follows:

> Note: `effector/babel-plugin` is not a package, it is bundled with `effector`

```js
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["effector/babel-plugin"],
        // Use .babelrc files
        babelrc: true,
        // Use babel.config.js files
        configFile: true,
      },
    }),
  ],
});
```


# clearNode

```ts
import { clearNode } from "effector";
```

Method for destroying stores, events, effects, subscriptions, and domains.

## Methods

### `clearNode(unit, config?)`

#### Formulae

```ts
clearNode(unit, config?: {deep?: boolean}): void
```

#### Arguments

1. `unit` (////): unit to be erased.
2. `config: {}` (optional): config object.
   * `deep?: boolean` (optional): erase node *and* all of its computed values.

#### Returns

`void`

#### Examples

##### Simple

```js
import { createStore, createEvent, clearNode } from "effector";

const inc = createEvent();
const $store = createStore(0).on(inc, (x) => x + 1);

inc.watch(() => console.log("inc called"));
$store.watch((x) => console.log("store state: ", x));
// => store state: 0
inc();
// => inc called
// => store state: 1
clearNode($store);
inc();
// => inc called
```

Try it

##### Deep clear

```js
import { createStore, createEvent, clearNode } from "effector";

const inc = createEvent();
const trigger = inc.prepend(() => {});
const $store = createStore(0).on(inc, (x) => x + 1);

trigger.watch(() => console.log("trigger called"));
inc.watch(() => console.log("inc called"));
$store.watch((x) => console.log("store state: ", x));
// => store state: 0
trigger();
// => trigger called
// => inc called
// => store state: 1
clearNode(trigger, { deep: true });
trigger();
// no reaction
inc();
// no reaction!
// all units, which depend on trigger, are erased
// including inc and store, because it depends on inc
```

Try it


# combine

import LiveDemo from "../../../../../components/LiveDemo.jsx";

This method allows retrieving the state from each passed store and combining them into a single value, storing it in a new derived store.
The resulting store will update every time any of the passed stores is updated.

If several stores update simultaneously, the method will process them all at once, meaning that `combine` batches updates, which leads to more efficient operation without unnecessary computations.

> WARNING Caution: 
>
> `combine` returns not just a common store. Instead, it returns DerivedStore, it cannot be modified by the events or used as `target` in sample.

## Common formulae

```ts
declare const $a: Store<A>;
declare const $b: Store<B>;

// State transformation

const $c: Store<C> = combine({ a: $a, b: $b }, (values: { a: A; b: B }) => C);

const $c: Store<C> = combine([$a, $b], (values: [A, B]) => C);

const $c: Store<C> = combine($a, $b, (a: A, b: B) => C);

// State combination

const $c: Store<{ a: A; b: B }> = combine({ a: $a, b: $b });

const $c: Store<[A, B]> = combine([$a, $b]);
```

## State transformation

When function is passed to `combine` it will act as state transformation funciton which will be called at every `combine` update.
Result will be saved in created store. This function must be .

`combine` function called synchronously during combine call, if this function will throw an error, application will crash. This will be fixed in [24 release](https://github.com/effector/effector/issues/1163)

### `combine(...stores, fn)`

#### Formulae

```ts
const $a: Store<A>
const $b: StoreWritable<B>
const $c: Store<C> | StoreWritable<C>

$result: Store<D> = combine(
  $a, $b, $c, ...,
  (a: A, b: B, c: C, ...) => result
)
```

* After call `combine`, state of each store is extracted and passed to function arguments, `result` of a function call will be state of store `$result`
* Any number of stores can be passed to `combine`, but the latest argument always should be function-reducer that returns new state
* If function returned the same `result` as previous, store `$result` will not be triggered
* If several stores updated at the same time (during one tick) there will be single call of function and single update of `$result` store
* Function must be&#x20;

#### Returns

: New derived store

#### Examples

import demo\_combineStoresFn from "../../../../demo/combine/stores-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineStoresFn} />

### `combine({ A, B, C }, fn)`

#### Formulae

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<D> = combine(
  { a: $a, b: $b, c: $c },
  ({ a, b, c }: { a: A; b: B; c: C }): D => result,
);
```

* Read state from stores `$a`, `$b`, `$c` and assign it to properties `a`, `b`, `c` accordingly, calls function with that object
* The `result` of the function call saved in `$result` store
* If function returned the same `result` as previous, store `$result` will not be triggered
* If several stores updated at the same time (during one tick) there will be single call of function and single update of `$result` store
* Function must be&#x20;

#### Returns

: New derived store

#### Examples

import demo\_combineObjectFn from "../../../../demo/combine/object-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineObjectFn} />

### `combine([ A, B, C ], fn)`

#### Formulae

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<D> = combine([$a, $b, $c], ([A, B, C]): D => result);
```

* Read state from stores `$a`, `$b`, `$c` and assign it to array with the same order as passed stores, call function with that array
* The `result` of the function call saved in `$result` store
* If function returned the same `result` as previous, store `$result` will not be triggered
* If several stores updated at the same time (during one tick) there will be single call of function and single update of `$result` store
* Function must be&#x20;

#### Returns

: New derived store

#### Examples

import demo\_combineArrayFn from "../../../../demo/combine/array-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineArrayFn} />

## State combination

When there is no function in `combine` it will act as state combinator, creating a store with array or object with fields from given stores

### `combine({ A, B, C })`

> INFO: 
>
> Formerly known as `createStoreObject`

#### Formulae

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<{ a: A; b: B; c: C }> = combine({ a: $a, b: $b, c: $c });
```

* Read state from stores `$a`, `$b`, `$c` and assign it to properties `a`, `b`, `c` accordingly, that object will be saved to `$result` store
* Store `$result` contain object `{a, b, c}` and will be updated on each update of passed stores
* If several stores updated at the same time (during one tick) there will be single update of `$result` store

#### Returns

: New derived store

#### Examples

import demo\_combineObject from "../../../../demo/combine/object.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineObject} />

### `combine([ A, B, C ])`

#### Formulae

```ts
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<[A, B, C]> = combine([$a, $b, $c]);
```

* Read state from stores `$a`, `$b`, `$c` and assign it to array with the same order as passed stores, that array will be saved to `$result` store
* Store `$result` will be updated on each update of passed stores
* If several stores updated at the same time (during one tick) there will be single update of `$result` store

#### Returns

: New derived store

#### Examples

import demo\_combineArray from "../../../../demo/combine/array.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineArray} />

## `combine` with primitives and objects

Primitives and objects can be used in `combine`, and `combine` will not be triggered. Effector will not track mutations of objects and primitives.

#### Examples

import demo\_combineNonStoresFn from "../../../../demo/combine/non-stores-fn.live.js?raw";

<LiveDemo client:only="preact" demoFile={demo_combineNonStoresFn} />

## Parameters

All overloads of `combine` with `fn` provided are also supporting optional configuration object as the last parameter.

### `.skipVoid`

Flag to control how specifically store should handle `undefined` value *(since `effector 23.0.0`)*. If set to `false` - store will use `undefined` as a value. If set to `true` (deprecated), store will read `undefined` as a "skip update" command and will do nothing

#### Formulae

```ts
combine($a, $b, callback, { skipVoid: true });
```

* Type: `boolean`

#### Examples

```js
const $withFn = combine($a, $b, (a, b) => a || b, { skipVoid: false });
```


# createApi

```ts
import { createApi } from "effector";
```

`createApi` is a shortcut for generating events connected to a store by supplying an object with  for these events. If the source `store` is part of a domain, then the newly created events will also be within that domain.

## Methods

### `createApi(store, api)`

#### Formulae

```ts
createApi(store, api): objectWithEvents
```

#### Arguments

1. `store` 
2. `api` (*Object*) An object with 

#### Returns

(*Object*) An object with events

#### Examples

```js
import { createStore, createApi } from "effector";

const $playerPosition = createStore(0);

// Creating events and attaching them to the store
const api = createApi($playerPosition, {
  moveLeft: (pos, offset) => pos - offset,
  moveRight: (pos, offset) => pos + offset,
});

$playerPosition.watch((pos) => {
  console.log("position", pos);
});
// => position 0

api.moveRight(10);
// => position 10
api.moveLeft(5);
// => position 5
```

Try it


# createDomain

```ts
import { createDomain, type Domain } from "effector";
```

## Methods

### `createDomain(name?)`

Creates a domain

#### Formulae

```typescript
createDomain(name?): Domain
```

#### Arguments

1. `name`? (*string*): domain name. Useful for debugging

#### Returns

: New domain

#### Examples

```js
import { createDomain } from "effector";

const domain = createDomain(); // Unnamed domain
const httpDomain = createDomain("http"); // Named domain

const statusCodeChanged = httpDomain.createEvent();
const downloadFx = httpDomain.createEffect();
const apiDomain = httpDomain.createDomain(); // nested domain
const $data = httpDomain.createStore({ status: -1 });
```

Try it


# createEffect

```ts
import { createEffect, type Effect } from "effector";
```

Method for creating an effect.

## Methods

### `createEffect(handler)`

Creates an effect with the given handler.

#### Formulae

```typescript
createEffect(handler?): Effect<Params, Done, Fail>
```

#### Arguments

1. `handler` (*Function*): Function to handle effect calls, can also be set using .use(handler).

#### Returns

: A new effect.

> TIP Reminder: 
>
> You must provide a handler either in createEffect or in .use method later; otherwise, the effect will throw with the `no handler used in _%effect name%_` error.

> INFO since: 
>
> [effector 21.3.0](https://changelog.effector.dev/#effector-21-3-0)

#### Examples

##### Create effect with handler

```js
import { createEffect } from "effector";

const fetchUserReposFx = createEffect(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

fetchUserReposFx.done.watch(({ params, result }) => {
  console.log(result);
});

await fetchUserReposFx({ name: "zerobias" });
```

Try it

##### Change state on effect completion

```js
import { createStore, createEffect } from "effector";

const fetchUserReposFx = createEffect(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

const $repos = createStore([]).on(fetchUserReposFx.doneData, (_, repos) => repos);

$repos.watch((repos) => {
  console.log(`${repos.length} repos`);
});
// => 0 repos

await fetchUserReposFx({ name: "zerobias" });
// => 26 repos
```

Try it

##### Set handler to effect after creating

```js
import { createEffect } from "effector";

const fetchUserReposFx = createEffect();

fetchUserReposFx.use(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

await fetchUserReposFx({ name: "zerobias" });
```

Try it

##### Watch effect status

```js
import { createEffect } from "effector";

const fetchUserReposFx = createEffect(async ({ name }) => {
  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

fetchUserReposFx.pending.watch((pending) => {
  console.log(`effect is pending?: ${pending ? "yes" : "no"}`);
});

fetchUserReposFx.done.watch(({ params, result }) => {
  console.log(params); // {name: 'zerobias'}
  console.log(result); // resolved value
});

fetchUserReposFx.fail.watch(({ params, error }) => {
  console.error(params); // {name: 'zerobias'}
  console.error(error); // rejected value
});

fetchUserReposFx.finally.watch(({ params, status, result, error }) => {
  console.log(params); // {name: 'zerobias'}
  console.log(`handler status: ${status}`);

  if (error) {
    console.error("handler rejected", error);
  } else {
    console.log("handler resolved", result);
  }
});

await fetchUserReposFx({ name: "zerobias" });
```

Try it

### `createEffect(config)`

Creates an effect with handler and name from a given config object.

#### Formulae

```typescript
createEffect({ handler, name }): Effect<Params, Done, Fail>
```

#### Arguments

1. `config?: {}` (*Object*): Effect configuration.
   * `handler` (*Function*): Function to handle effect calls, can also be set using .use(handler).
   * `name?` (*string*): Optional effect name.

#### Returns

: A new effect.

#### Examples

##### Create named effect

```js
import { createEffect } from "effector";

const fetchUserReposFx = createEffect({
  name: "fetch user repositories",
  async handler({ name }) {
    const url = `https://api.github.com/users/${name}/repos`;
    const req = await fetch(url);
    return req.json();
  },
});

await fetchUserReposFx({ name: "zerobias" });
```

Try it


# createEvent

```ts
import { createEvent } from "effector";
```

## Methods

### `createEvent(name?)`

Method for creating an event.

#### Formulae

```ts
createEvent<T>(name?): Event<T>
createEvent(name?): Event<void>
```

#### Arguments

1. `name`? (*string*): Event name

#### Returns

: New event

#### Notes

Event – it is a function which allows to change state when called (see simple example) also it can be a good way to extract data (see map and watch example). Also, it allows us to send data to another event or effect via effector operators.

#### Examples

##### Simple

```js
import { createStore, createEvent } from "effector";

const incrementBy = createEvent();
const resetCounter = createEvent();
const $counter = createStore(0);

$counter.on(incrementBy, (counter, number) => counter + number).reset(resetCounter);

$counter.watch((counter) => {
  console.log("counter is now", counter);
});
// => counter is now 0

incrementBy(10);
// => counter is now 10

incrementBy(10);
// => counter is now 20

incrementBy(10);
// => counter is now 30

resetCounter();
// => counter is now 0
```

Try it

We created a store `$counter` and an event `incrementBy`, and started watching the store.<br/>
Notice the function call `incrementBy(10)`. Whenever you will call `incrementBy(10)`, you can look at the console and see how state of `$counter` changes.

##### Using `.map` and `.watch`

```js
import { createEvent } from "effector";

const fullNameReceived = createEvent();

const firstNameReceived = fullNameReceived.map((fullName) => fullName.split(" ")[0]);
const lastNameReceived = fullNameReceived.map((fullName) => fullName.split(" ")[1]);
const firstNameUppercaseReceived = firstNameReceived.map((firstName) => firstName.toUpperCase());

firstNameReceived.watch((firstName) => console.log("First name", firstName));
lastNameReceived.watch((lastName) => console.log("Last name", lastName));
firstNameUppercaseReceived.watch((firstName) => console.log("Upper case", firstName));

fullNameReceived("John Doe");
// => First name John
// => Last name Doe
// => Upper case JOHN
```

Try it


# createStore

```ts
import { createStore, type Store, type StoreWritable } from "effector";
```

## Methods

### `createStore(defaultState)`

Method for creating a store.

#### Formulae

```ts
createStore<T>(defaultState: T): StoreWritable<T>
```

#### Arguments

1. `defaultState` (*State*): Default state

#### Throws

##### unit call from pure function is not supported, use operators like sample instead

> Since: effector 23.0.0

Occurs when events or effects are called from pure functions, like updateFilter:

```ts
const someHappened = createEvent<number>();
const $counter = createStore(0, {
  updateFilter(a, b) {
    someHappened(a); // THROWS!
    return a < b;
  },
});
```

To resolve this, use `sample`:

```ts
const someHappened = createEvent<number>();
const $counter = createStore(0, {
  updateFilter(a, b) {
    return a < b;
  },
});

sample({
  clock: $counter,
  target: someHappened,
});
```

#### Returns

: New store

#### Examples

##### Basic

```js
import { createEvent, createStore } from "effector";

const addTodo = createEvent();
const clearTodoList = createEvent();

const $todos = createStore([])
  // Will update store when addTodo is fired
  .on(addTodo, (list, todo) => [...list, todo])
  // Will reset store to default state when clearTodos is fired
  .reset(clearTodoList);

// Create mapped store
const $selectedTodos = $todos.map((todos) => {
  return todos.filter((todo) => todo.selected);
});

// Log initial store value and each change
$todos.watch((todos) => {
  console.log("todos", todos);
});
// => todos []

addTodo("go shopping");
// => todos ['go shopping']

addTodo("go to the gym");
// => todos ['go shopping', 'go to the gym']

clearTodoList();
// => todos []
```

Try it

### `createStore(defaultState, config)`

Method for creating a store but with configuration.

#### Formulae

```ts
createStore<T, SerializedState extends Json = Json>(defaultState: T, config: {
  name?: string
  updateFilter?: (update: T, current: T) => boolean
  skipVoid?: boolean
  serialize?: 'ignore' | {
          write: (state: State) => SerializedState
          read: (json: SerializedState) => State
        }
}): StoreWritable<T>
```

#### Arguments

1. `defaultState` (*State*): Default state
2. `config` (*Object*): Optional configuration
   * `name` (*String*): Name for the store. Babel plugin can set it from the variable name, if not passed explicitly in config.
   * `updateFilter` (*Function*): Function that prevents store from updating when it returns `false`. Accepts updated state as the first argument and current state as the second argument. Redundant for most cases since store already ensures that update is not `undefined` and not equal (`!==`) to current state *(since `effector 21.8.0`)*
   * `serialize: 'ignore'`: Option to disable store serialization when serialize is called *(since `effector 22.0.0`)*
   * `serialize` (*Object*): Configuration object to handle store state serialization in custom way. `write` – called on serialize, transforms value to JSON value – primitive type or plain object/array. `read` – parse store state from JSON value, called on fork, if provided `values` is the result of `serialize` call.
   * `domain`: (*Domain*): Domain to attach store to after creation.
   * `skipVoid`: (*boolean*): Flag to control how specifically store should handle `undefined` value *(since `effector 23.0.0`)*. If set to `false` - store will use `undefined` as a value. If set to `true` (deprecated), store will interpret `undefined` as a "skip update" command and will do nothing.

#### Throws

The same behaviour like for regular createStore(defaultState).

#### Returns

: New store

#### Examples

##### With `updateFilter`

```js
import { createEvent, createStore, sample } from "effector";

const punch = createEvent();
const veryStrongHit = createEvent();

const $lastPunchStrength = createStore(0, {
  // If store should be updated with strength less than 400 kg
  // update will be skipped
  updateFilter: (strength) => strength >= 400,
});

$lastPunchStrength.on(punch, (_, strength) => strength);

// Each store update should trigger event `veryStrongHit`
sample({ clock: $lastPunchStrength, target: veryStrongHit });

// Watch on store prints initial state
$lastPunchStrength.watch((strength) => console.log("Strength: %skg", strength));
// => Strength: 0kg

veryStrongHit.watch((strength) => {
  console.log("Wooow! It was very strong! %skg", strength);
});

punch(200); // updateFilter prevented update
punch(300); // Same here, store doesn't update, value remains `0`
punch(500); // Yeeah! updateFilter allows store update
// => Strength: 500kg
// => Wooow! It was very strong! 500kg
punch(100); // No update as well
```

Try it

##### With `serialize: ignore`

```js
import { createEvent, createStore, serialize, fork, allSettled } from "effector";

const readPackage = createEvent();

const $name = createStore("");
const $version = createStore(0, { serialize: "ignore" });

$name.on(readPackage, (_, { name }) => name);
$version.on(readPackage, (_, { version }) => version);

// Watchers always called for scoped changes
$name.watch((name) => console.log("name '%s'", name));
$version.watch((version) => console.log("version %s", version));
// => name ''
// => version 0

// Please, note, `fork()` call doesn't trigger watches
// In the opposit of `hydrate()` call
const scope = fork();

// By default serialize saves value only for the changed stores
// Review `onlyChanges` option https://effector.dev/api/effector/serialize
const values = serialize(scope);
console.log(values);
// => {}

// Let's change our stores
await allSettled(readPackage, {
  scope,
  params: { name: "effector", version: 22 },
});
// => name 'effector'
// => version 22

const actualValues = serialize(scope);
console.log(actualValues);
// => {n74m6b: "effector"}
// `$version` store has `serialize: ignore`, so it's not included
```

Try it

##### Custom `serialize` configuration

```ts
import { createEvent, createStore, serialize, fork, allSettled } from "effector";

const saveDate = createEvent();
const $date = createStore<null | Date>(null, {
  // Date object is automatically serialized to ISO date string by JSON.stringify
  // but it is not parsed to Date object by JSON.parse
  // which will lead to a mismatch during server side rendering
  //
  // Custom `serialize` config solves this issue
  serialize: {
    write: (dateOrNull) => (dateOrNull ? dateOrNull.toISOString() : dateOrNull),
    read: (isoStringOrNull) => (isoStringOrNull ? new Date(isoStringOrNull) : isoStringOrNull),
  },
}).on(saveDate, (_, p) => p);

const serverScope = fork();

await allSettled(saveDate, { scope: serverScope, params: new Date() });

const serverValues = serialize(serverScope);
// `serialize.write` of `$date` store is called

console.log(serverValues);
// => { nq1e2rb: "2022-11-05T15:38:53.108Z" }
// Date object saved as ISO string

const clientScope = fork({ values: serverValues });
// `serialize.read` of `$date` store is called

const currentValue = clientScope.getState($date);
console.log(currentValue);
// => Date 11/5/2022, 10:40:13 PM
// ISO date string is parsed back to Date object
```

Try it


# createWatch

```ts
import { createWatch } from "effector";
```

## Methods

### `createWatch(config)`

Creates a subscription on unit (store, event, or effect).

#### Formulae

```ts
createWatch<T>(config: {
  unit: Unit<T>
  fn: (payload: T) => void
  scope?: Scope
}): Subscription
```

#### Arguments

1. `config` (*Object*): Configuration
   * `unit` (*Unit*): Target unit (store, event of effect) that will be watched
   * `fn` (*Function*): Function that will be called when the unit is triggered. Accepts the unit's payload as the first argument.
   * `scope` (): An optional scope object (forked instance) to restrict watcher calls on particular scope.

#### Returns

: Unsubscribe function

#### Examples

##### With scope

```js
import { createWatch, createEvent, fork, allSettled } from "effector";

const changeName = createEvent();

const scope = fork();

const unwatch = createWatch({ unit: changeName, scope, fn: console.log });

await allSettled(changeName, { scope, params: "John" }); // output: John
changeName("John"); // no output
```

##### Without scope

```js
import { createWatch, createEvent, fork, allSettled } from "effector";

const changeName = createEvent();

const scope = fork();

const unwatch = createWatch({ unit: changeName, fn: console.log });

await allSettled(changeName, { scope, params: "John" }); // output: John
changeName("John"); // output: John
```


# fork

```ts
import { fork, type Scope } from "effector";
```

## Methods

### `fork()`

> INFO since: 
>
> introduced in [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

Creates an isolated instance of application.
Primary purposes of this method are SSR and testing.

#### Formulae

```ts
fork(): Scope
```

#### Returns

: New fresh scope

#### Examples

##### Create two instances with independent counter state

```js
import { createStore, createEvent, fork, allSettled } from "effector";

const inc = createEvent();
const dec = createEvent();
const $counter = createStore(0);

$counter.on(inc, (value) => value + 1);
$counter.on(dec, (value) => value - 1);

const scopeA = fork();
const scopeB = fork();

await allSettled(inc, { scope: scopeA });
await allSettled(dec, { scope: scopeB });

console.log($counter.getState()); // => 0
console.log(scopeA.getState($counter)); // => 1
console.log(scopeB.getState($counter)); // => -1
```

Try it

### `fork(options)`

Allows to set values for stores in scope and replace handlers for effects.

> INFO since: 
>
> support for array of tuples in `values` and `handlers` introduced in [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

#### Formulae

```ts
fork(options: { values?, handlers? }): Scope
```

#### Arguments

1. `options: { values?, handlers? }` — Object with optional values and handlers

##### `values`

Option to provide initial states for stores.

Can be used in three ways:

1. Array of tuples with stores and values:

```ts
fork({
  values: [
    [$user, "alice"],
    [$age, 21],
  ],
});
```

2. Map with stores and values:

```ts
fork({
  values: new Map().set($user, "alice").set($age, 21),
});
```

3. Plain object: `{[sid: string]: value}`

```ts
fork({
  values: {
    [$user.sid]: "alice",
    [$age.sid]: 21,
  },
});
```

<br />

> INFO Explanation: 
>
> Such objects are created by serialize, in application code **array of tuples is preferred**

##### `handlers`

Option to provide handlers for effects.

Can be used in different ways:

1. Array of tuples with effects and handlers:

```ts
fork({
  handlers: [
    [getMessageFx, (params) => ({ id: 0, text: "message" })],
    [getUserFx, async (params) => ({ name: "alice", age: 21 })],
  ],
});
```

2. Map with effects and handlers:

```ts
fork({
  handlers: new Map()
    .set(getMessageFx, (params) => ({ id: 0, text: "message" }))
    .set(getUserFx, async (params) => ({ name: "alice", age: 21 })),
});
```

3. Plain object: `{[sid: string]: handler}`

```ts
fork({
  handlers: {
    [getMessageFx.sid]: (params) => ({ id: 0, text: "message" }),
    [getUserFx.sid]: async (params) => ({ name: "alice", age: 21 }),
  },
});
```

<br />

> WARNING deprecation: 
>
> Such objects are deprecated since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) and will be removed in future versions. Array of tuples is preferred.

#### Returns

: New fresh scope

#### Examples

##### Set initial state for store and change handler for effect

This is an example of test, which ensures that after a request to the server, the value of `$friends` is filled.

```ts
import { createEffect, createStore, fork, allSettled } from "effector";

const fetchFriendsFx = createEffect<{ limit: number }, string[]>(async ({ limit }) => {
  /* some client-side data fetching */
  return [];
});
const $user = createStore("guest");
const $friends = createStore([]);

$friends.on(fetchFriendsFx.doneData, (_, result) => result);

const testScope = fork({
  values: [[$user, "alice"]],
  handlers: [[fetchFriendsFx, () => ["bob", "carol"]]],
});

/* trigger computations in scope and await all called effects */
await allSettled(fetchFriendsFx, {
  scope: testScope,
  params: { limit: 10 },
});

/* check value of store in scope */
console.log(testScope.getState($friends));
// => ['bob', 'carol']
```

Try it

### `fork(domain, options?)`

> INFO since: 
>
> Introduced in [effector 21.0.0](https://changelog.effector.dev/#effector-21-0-0)

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0).
>
> `fork` no longer requires `domain` as an argument, because it can automatically track all units starting from [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0).

#### Formulae

```ts
fork(domain: Domain, options?: { values?, handlers? }): Scope
```

#### Arguments

1. `domain` (): Optional domain to fork.
2. `options: { values?, handlers? }` — Object with optional values and handlers

#### Returns

: New fresh scope

#### Examples

TBD


# forward

```ts
import { forward, type Subscription } from "effector";
```

Method to create connection between units in a declarative way. Send updates from one set of units to another.

## Methods

### `forward({ from, to })`

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0).
>
> The core team recommends using sample instead of `forward`.

#### Formulae

```ts
forward({
  from: Unit | Unit[],
  to: Unit | Unit[]
}): Subscription
```

#### Arguments

1. `from` (Unit | Unit\[]): Source of updates. Forward will listen for changes of these units

   * if an [*Event*][_Event_] is passed, `to` will be triggered on each event trigger and receives event argument
   * if a [*Store*][_Store_] is passed, `to` will be triggered on each store **change** and receives new value of the store
   * if an [*Effect*][_Effect_] is passed, `to` will be triggered on each effect call and receives effect parameter
   * if an array of units is passed, `to` will be triggered when any unit in `from` array is triggered

2. `to` (Unit | Unit\[]): Target for updates. `forward` will trigger these units with data from `from`
   * if passed an [*Event*][_Event_], it will be triggered with data from `from` unit
   * if passed a [*Store*][_Store_], data from `from` unit will be written to store and **trigger its update**
   * if passed an [*Effect*][_Effect_], it will be called with data from `from` unit as parameter
   * if `to` is an array of units, each unit in that array will be triggered

#### Returns

Subscription: Unsubscribe function. It breaks connection between `from` and `to`. After call, `to` will not be triggered anymore.

> INFO since: 
>
> Arrays of units are supported since [effector 20.6.0](https://changelog.effector.dev/#effector-20-6-0)

#### Examples

##### Send store updates to another store

```js
import { createStore, createEvent, forward } from "effector";

const $store = createStore(1);
const event = createEvent();

forward({
  from: event,
  to: $store,
});

$store.watch((state) => console.log("store changed: ", state));
// => store changed: 1

event(200);
// => store changed: 200
```

Try it

##### Forward between arrays of units

```js
import { createEvent, forward } from "effector";

const firstSource = createEvent();
const secondSource = createEvent();

const firstTarget = createEvent();
const secondTarget = createEvent();

forward({
  from: [firstSource, secondSource],
  to: [firstTarget, secondTarget],
});

firstTarget.watch((e) => console.log("first target", e));
secondTarget.watch((e) => console.log("second target", e));

firstSource("A");
// => first target A
// => second target A
secondSource("B");
// => first target B
// => second target B
```

Try it

[_effect_]: /en/api/effector/Effect

[_store_]: /en/api/effector/Store

[_event_]: /en/api/effector/Event


# fromObservable

```ts
import { fromObservable, type Observable } from "effector";
```

## Methods

### `fromObservable()`

Creates an event containing all items from an Observable.

#### Formulae

```ts
fromObservable<T>(source: Observable<T>): Event<T>
```

#### Arguments

1. `observable` (*Observable*)

#### Returns

: New event

#### Examples

##### Basic use case

```js
import { interval } from "rxjs";
import { fromObservable } from "effector";

//emit value in sequence every 1 second
const source = interval(1000);

const event = fromObservable(source);

//output: 0,1,2,3,4,5....
event.watch(console.log);
```


# guard

```ts
import { guard } from "effector";
```

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0).
>
> The core team recommends using sample instead of `guard`.

Method for conditional event routing.
It provides a way to control one dataflow with the help of another: when the condition and the data are in different places, we can use `guard` with stores as filters to trigger events when condition state is true, thereby modulate signals without mixing them.

## Methods

### `guard({ clock?, source?, filter, target? })`

#### Formulae

```ts
guard({ clock?, source?, filter, target? }): target
```

> INFO: 
>
> Either `clock` or `source` is required

When `clock` is triggered, check `filter` for [truthy] and call `target` with data from `source` if `true`.

* If `clock` is not passed, `guard` will be triggered on every `source` update
* If `source` is not passed, call `target` with data from `clock`
* If `target` is not passed, create  with type of `source` and return it from `guard()`
* If `filter` is , check it value for [truthy]
* If `filter` is `Function`, call it with data from `source` and check result for [truthy]

[truthy]: https://developer.mozilla.org/en-US/docs/Glossary/Truthy

> INFO since: 
>
> `clock` in `guard` is available since [effector 21.8.0](https://changelog.effector.dev/#effector-21-8-0)

### `guard({source, filter, target?})`

#### Arguments

1. `params` (*Object*): Configuration object

#### Returns

, which fires upon `clock` trigger

#### Examples

##### Basic

```js
import { createStore, createEffect, createEvent, guard } from "effector";

const clickRequest = createEvent();
const fetchRequest = createEffect((n) => new Promise((rs) => setTimeout(rs, 2500, n)));

const $clicks = createStore(0).on(clickRequest, (x) => x + 1);
const $requestsCount = createStore(0).on(fetchRequest, (x) => x + 1);

const $isIdle = fetchRequest.pending.map((pending) => !pending);

/*
1. on clickRequest
2. if $isIdle is true
3. take current $clicks value
4. and call fetchRequest with it
*/
guard({
  clock: clickRequest /* 1 */,
  filter: $isIdle /* 2 */,
  source: $clicks /* 3 */,
  target: fetchRequest /* 4 */,
});
```

See ui visualization

##### Function predicate

```js
import { createEffect, createEvent, guard } from "effector";

const submitForm = createEvent();
const searchUser = createEffect();

guard({
  source: submitForm,
  filter: (user) => user.length > 0,
  target: searchUser,
});

submitForm(""); // nothing happens
submitForm("alice"); // ~> searchUser('alice')
```

Try it

### `guard(source, {filter: booleanStore})`

#### Arguments

1. `source` (//): Source unit. Will trigger given `guard` on updates
2. `filter` (): Filter store

#### Examples

##### Store filter

```js
import { createEvent, createStore, createApi, guard } from "effector";

const trigger = createEvent();
const $unlocked = createStore(true);

const { lock, unlock } = createApi($unlocked, {
  lock: () => false,
  unlock: () => true,
});

const target = guard(trigger, {
  filter: $unlocked,
});

target.watch(console.log);
trigger("A");
lock();
trigger("B"); // nothing happens
unlock();
trigger("C");
```

Try it

### `guard(source, {filter: predicate})`

#### Arguments

1. `source` (//): Source unit. Will trigger given `guard` on updates
2. `filter` (*(payload) => Boolean*): Predicate function, should be&#x20;

#### Examples

##### Predicate function

```js
import { createEvent, guard } from "effector";

const source = createEvent();
const target = guard(source, {
  filter: (x) => x > 0,
});

target.watch(() => {
  console.log("target called");
});

source(0);
// nothing happens
source(1);
// target called
```

Try it


# hydrate

```ts
import { hydrate } from "effector";
```

A companion method for . Hydrates provided values into corresponding stores within a provided domain or scope. The main purpose is an application state hydration on the client side after SSR.

## Methods

### `hydrate(domainOrScope, {values})`

> WARNING: 
>
> You need to make sure that the store is created beforehand, otherwise, the hydration might fail. This could be the case if you keep store initialization/hydration scripts separate from stores' creation.

#### Formulae

```ts
hydrate(domainOrScope: Domain | Scope, { values: Map<Store<any>, any> | {[sid: string]: any} }): void
```

#### Arguments

1. `domainOrScope`: domain or scope which will be filled with given `values`
2. `values`: a mapping from store sids to store values or a Map where keys are store objects and values contain initial store value

#### Returns

`void`

#### Examples

Populate store with a predefined value

```js
import { createStore, createDomain, fork, serialize, hydrate } from "effector";

const domain = createDomain();
const $store = domain.createStore(0);

hydrate(domain, {
  values: {
    [$store.sid]: 42,
  },
});

console.log($store.getState()); // 42
```

Try it


# effector

Effector API reference:

### Unit Definitions

* Event\<T>
* Effect\<Params, Done, Fail>
* Store\<T>
* Domain
* Scope

### Unit Creators

* createEvent()
* createStore(default)
* createEffect(handler)
* createDomain()

### Common Methods

* combine(...stores, f)
* attach({effect, mapParams, source})
* sample({clock, source, fn, target})
* merge(\[eventA, eventB])
* split(event, cases)
* createApi(store, api)

### Fork API

* fork()
* serialize(scope)
* allSettled(unit, { scope })
* scopeBind(event)
* hydrate(domain)

### Plugins

* effector/babel-plugin
* @effector-swc-plugin

### Utilities

* is
* fromObservable(observable)

### Low Level API

* clearNode()
* withRegion()
* launch()
* inspect()

### Import Map

Package `effector` provides couple different entry points for different purposes:

* effector/compat
* effector/inspect
* effector/babel-plugin

### Deprecated Methods

* forward({from, to})
* guard({source, filter, target})


# inspect

```ts
import { inspect } from "effector/inspect";
```

Special API methods designed to handle debugging and monitoring use cases without giving too much access to internals of your actual app.

Useful to create developer tools and production monitoring and observability instruments.

## Inspect API

Allows us to track any computations that have happened in the effector's kernel.

### `inspect()`

#### Example

```ts
import { inspect, type Message } from "effector/inspect";

import { someEvent } from "./app-code";

function logInspectMessage(m: Message) {
  const { name, value, kind } = m;

  return console.log(`[${kind}] ${name} ${value}`);
}

inspect({
  fn: (m) => {
    logInspectMessage(m);
  },
});

someEvent(42);
// will log something like
// [event] someEvent 42
// [on] 42
// [store] $count 1337
// ☝️ let's say that reducer adds 1295 to provided number
//
// and so on, any triggers
```

Scope limits the extent to which computations can be tracked. If no scope is provided - default out-of-scope mode computations will be tracked.

```ts
import { fork, allSettled } from "effector";
import { inspect, type Message } from "effector/inspect";

import { someEvent } from "./app-code";

function logInspectMessage(m: Message) {
  const { name, value, kind } = m;

  return console.log(`[${kind}] ${name} ${value}`);
}

const myScope = fork();

inspect({
  scope: myScope,
  fn: (m) => {
    logInspectMessage(m);
  },
});

someEvent(42);
// ☝️ No logs! That's because tracking was restricted by myScope

allSettled(someEvent, { scope: myScope, params: 42 });
// [event] someEvent 42
// [on] 42
// [store] $count 1337
```

### Tracing

Adding `trace: true` setting allows looking up previous computations, that led to this specific one. It is useful to debug the specific reason for some events happening

#### Example

```ts
import { fork, allSettled } from "effector";
import { inspect, type Message } from "effector/inspect";

import { someEvent, $count } from "./app-code";

function logInspectMessage(m: Message) {
  const { name, value, kind } = m;

  return console.log(`[${kind}] ${name} ${value}`);
}

const myScope = fork();

inspect({
  scope: myScope,
  trace: true, // <- explicit setting is needed
  fn: (m) => {
    if (m.kind === "store" && m.sid === $count.sid) {
      m.trace.forEach((tracedMessage) => {
        logInspectMessage(tracedMessage);
        // ☝️ here we are logging the trace of specific store update
      });
    }
  },
});

allSettled(someEvent, { scope: myScope, params: 42 });
// [on] 42
// [event] someEvent 42
// ☝️ traces are provided in backwards order, because we are looking back in time
```

### Errors

Effector does not allow exceptions in pure functions. In such case, branch computation is stopped and an exception is logged. There is also a special message type in such case:

#### Example

```ts
inspect({
  fn: (m) => {
    if (m.type === "error") {
      // do something about it
      console.log(`${m.kind} ${m.name} computation has failed with ${m.error}`);
    }
  },
});
```

## Inspect Graph

Allows us to track declarations of units, factories, and regions.

### Example

```ts
import { createStore } from "effector";
import { inspectGraph, type Declaration } from "effector/inspect";

function printDeclaration(d: Declaration) {
  console.log(`${d.kind} ${d.name}`);
}

inspectGraph({
  fn: (d) => {
    printDeclaration(d);
  },
});

const $count = createStore(0);
// logs "store $count" to console
```

### `withRegion`

Meta-data provided via region's root node is available on declaration.

#### Example

```ts
import { createNode, withRegion, createStore } from "effector";
import { inspectGraph, type Declaration } from "effector/inspect";

function createCustomSomething(config) {
  const $something = createStore(0);

  withRegion(createNode({ meta: { hello: "world" } }), () => {
    // some code
  });

  return $something;
}
inspectGraph({
  fn: (d) => {
    if (d.type === "region") console.log(d.meta.hello);
  },
});

const $some = createCustomSomething({});
// logs "world"
```


# is

```ts
import { is, type Unit } from "effector";
```

Namespace for unit validators.

## Methods

### `is.store(value)`

Checks if given value is 

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.store($store);
// => true

is.store(event);
// => false

is.store(fx);
// => false

is.store(createDomain());
// => false

is.store(fx.pending);
// => true

is.store(fx.done);
// => false

is.store($store.updates);
// => false

is.store(null);
// => false
```

Try it

### `is.event(value)`

Checks if given value is 

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.event($store);
// => false

is.event(event);
// => true

is.event(fx);
// => false

is.event(createDomain());
// => false

is.event(fx.pending);
// => false

is.event(fx.done);
// => true

is.event($store.updates);
// => true

is.event(null);
// => false
```

Try it

### `is.effect(value)`

Checks if given value is 

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.effect($store);
// => false

is.effect(event);
// => false

is.effect(fx);
// => true

is.effect(createDomain());
// => false

is.effect(null);
// => false
```

Try it

### `is.targetable`

Checks if given value can be used in operators target (or be called as a function in case of events)

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect } from "effector";

const $store = createStore(null);
const $mapped = $store.map((x) => x);
const event = createEvent();
const mappedEvent = event.map((x) => x);
const fx = createEffect();

is.targetable($store);
// => true

is.targetable($mapped);
// => false

is.targetable(event);
// => true

is.targetable(mappedEvent);
// => false

is.targetable(fx);
// => true
```

### `is.domain(value)`

Checks if given value is 

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

is.domain($store);
// => false

is.domain(event);
// => false

is.domain(fx);
// => false

is.domain(createDomain());
// => true

is.domain(null);
// => false
```

Try it

### `is.scope(value)`

> INFO since: 
>
> [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0)

Checks if given value is  since [effector 22.0.0](https://changelog.effector.dev/#effector-22-0-0).

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { fork } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();
const scope = fork();

is.scope(scope);
// => true

is.scope($store);
// => false

is.scope(event);
// => false

is.scope(fx);
// => false

is.scope(createDomain());
// => false

is.scope(null);
// => false
```

Try it

### `is.unit(value)`

Checks if given value is Unit: Store, Event, Effect, Domain or Scope

#### Returns

`boolean` — Type-guard

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain, fork } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();
const scope = fork();

is.unit(scope);
// => true

is.unit($store);
// => true

is.unit(event);
// => true

is.unit(fx);
// => true

is.unit(createDomain());
// => true

is.unit(fx.pending);
// => true

is.unit(fx.done);
// => true

is.unit($store.updates);
// => true

is.unit(null);
// => false
```

Try it

### `is.attached(value)`

> INFO since: 
>
> [effector 22.4.0](https://changelog.effector.dev/#effector-22-4-0)

Checks if given value is  created via  method. If passed not an effect, returns `false`.

#### Returns

`boolean` — Type-guard

#### Usage

Sometimes you need to add an error log on effects failures, but only on effects that have been "localized" via `attach`.
If you leave `onCreateEffect` as it is, without checks, the error log will be duplicated, because it will happen on the parent and the child effect.

```js
import { createDomain, attach, is } from "effector";

const logFailuresDomain = createDomain();

logFailuresDomain.onCreateEffect((effect) => {
  if (is.attached(effect)) {
    effect.fail.watch(({ params, error }) => {
      console.warn(`Effect "${effect.compositeName.fullName}" failed`, params, error);
    });
  }
});

const baseRequestFx = logFailuresDomain.createEffect((path) => {
  throw new Error(`path ${path}`);
});

const loadDataFx = attach({
  mapParams: () => "/data",
  effect: baseRequestFx,
});

const loadListFx = attach({
  mapParams: () => "/list",
  effect: baseRequestFx,
});

loadDataFx();
loadListFx();
```

Try it

#### Examples

```js
import { is, createStore, createEvent, createEffect, createDomain, attach } from "effector";

const $store = createStore(null);
const event = createEvent();
const fx = createEffect();

const childFx = attach({
  effect: fx,
});

is.attached(childFx);
// => true

is.attached(fx);
// => false

is.attached($store);
// => false

is.attached(event);
// => false

is.attached(createDomain());
// => false

is.attached(null);
// => false
```

Try it


# launch

```ts
import { launch, type Unit, type Node } from "effector";
```

> INFO since: 
>
> [effector 20.10.0](https://changelog.effector.dev/#effector-20-10-0)

## Methods

### `launch({ target, params })`

Low level method for running computation in units (events, effects or stores). Mostly used by library developers for fine-grained control of computations.

#### Formulae

```ts
launch({
  target,
  params,
  defer?: boolean,
  page?: any,
  scope?: Scope,
  meta?: Record<string, any>,
}): void
```

#### Arguments

TBD

#### Returns

`void`

### `launch(unit, params)`

#### Formulae

```ts
launch(unit: Unit | Node, params: T): void
```

#### Returns

`void`


# merge

```ts
import { merge, type Unit } from "effector";
```

## Methods

### `merge(units)`

> INFO since: 
>
> [effector 20.0.0](https://changelog.effector.dev/#effector-20-0-0)

Merges an array of units (events, effects, or stores), returning a new event that triggers upon any of the given units being triggered.

```ts
merge(units: Unit[]): Event<T>
```

#### Arguments

1. `units`: An array of units to be merged.

#### Returns

: A new event that fires when any of the given units is triggered.

> TIP: 
>
> In the case of a store, the resulting event will fire upon store updates.

#### Types

TBD

#### Examples

##### Basic Usage

```js
import { createEvent, merge } from "effector";

const foo = createEvent();
const bar = createEvent();
const baz = merge([foo, bar]);
baz.watch((v) => console.log("merged event triggered: ", v));

foo(1);
// => merged event triggered: 1
bar(2);
// => merged event triggered: 2
```

Try it

##### Working with Stores

```js
import { createEvent, createStore, merge } from "effector";

const setFoo = createEvent();
const setBar = createEvent();

const $foo = createStore(0).on(setFoo, (_, v) => v);
const $bar = createStore(100).on(setBar, (_, v) => v);

const anyUpdated = merge([$foo, $bar]);
anyUpdated.watch((v) => console.log(`state changed to: ${v}`));

setFoo(1); // => state changed to: 1
setBar(123); // => state changed to: 123
```

Try it

##### Merging a Store and an Event

```js
import { createEvent, createStore, merge } from "effector";

const setFoo = createEvent();
const otherEvent = createEvent();

const $foo = createStore(0).on(setFoo, (_, v) => v);
const merged = merge([$foo, otherEvent]);

merged.watch((v) => console.log(`merged event payload: ${v}`));

setFoo(999);
// => merged event payload: 999

otherEvent("bar");
// => merged event payload: bar
```

Try it


# effector/babel-plugin

Since Effector allows to automate many common tasks (like setting Stable IDentifiers and providing debug information for Units), there is a built-in plugin for Babel that enhances the developer experience when using the library.

## Usage

Please refer to the Babel plugin documentation for usage examples.


# effector/compat

```ts
import {} from "effector/compat";
```

The library provides a separate module with compatibility up to IE11 and Chrome 47 (browser for Smart TV devices).

> WARNING Bundler, Not Transpiler: 
>
> Since third-party libraries can import `effector` directly, you **should not** use transpilers like Babel to replace `effector` with `effector/compat` in your code because by default, Babel will not transform third-party code.
>
> **Use a bundler instead**, as it will replace `effector` with `effector/compat` in all modules, including those from third parties.

### Required Polyfills

You need to install polyfills for these objects:

* `Promise`
* `Object.assign`
* `Array.prototype.flat`
* `Map`
* `Set`

In most cases, a bundler can automatically add polyfills.

#### Vite

<details>
<summary>Vite Configuration Example</summary>

```js
import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    legacy({
      polyfills: ["es.promise", "es.object.assign", "es.array.flat", "es.map", "es.set"],
    }),
  ],
});
```

</details>

## Usage

### Manual Replacement

You can use `effector/compat` instead of the `effector` package if you need to support old browsers.

```diff
- import {createStore} from 'effector'
+ import {createStore} from 'effector/compat'
```

### Automatic Replacement

However, you can set up your bundler to automatically replace `effector` with `effector/compat` in your code.

#### Webpack

<details>
<summary>Webpack Configuration Example</summary>

```js
module.exports = {
  resolve: {
    alias: {
      effector: "effector/compat",
    },
  },
};
```

</details>

#### Vite

<details>
<summary>Vite Configuration Example</summary>

```js
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      effector: "effector/compat",
    },
  },
});
```

</details>


# effector/inspect

Effector has special API methods designed to handle debugging and monitoring use cases without giving too much access to the internals of your actual app — Inspect API.

### Why a Separate Module?

Inspect API is designed to be disposable. By design, any feature that uses Inspect API can be removed from the production build without any side effects. To emphasize this, Inspect API is not included in the main module. Instead, it's available in a separate module `effector/inspect`.

### Usage

Please refer to Inspect API docs for usage examples.


# restore

```ts
import { restore } from "effector";
```

## Methods

### `restore(event, defaultState)`

Creates a  from an . It works like a shortcut for `createStore(defaultState).on(event, (_, payload) => payload)`

> WARNING It is not a derived store: 
>
> Restore creates a new store. It is not a DerivedStore. That means you can modify its state via events, and use it as `target` in sample.

#### Formulae

```ts
restore(event: Event<T>, defaultState: T): StoreWritable<T>
```

#### Arguments

1. `event` 
2. `defaultState` (*Payload*)

#### Returns

: New store

#### Examples

##### Basic

```js
import { createEvent, restore } from "effector";

const event = createEvent();
const $store = restore(event, "default");

$store.watch((state) => console.log("state: ", state));
// state: default

event("foo");
// state: foo
```

Try it

### `restore(effect, defaultState)`

Creates a  out of successful results of an . It works like a shortcut for `createStore(defaultState).on(effect.done, (_, {result}) => result)`

#### Formulae

```ts
restore(effect: Effect<Params, Done, Fail>, defaultState: Done): StoreWritable<Done>
```

#### Arguments

1. `effect` 
2. `defaultState` (*Done*)

#### Returns

: New store

#### Types

Store will have the same type as `Done` from `Effect<Params, Done, Fail>`. Also, `defaultState` should have `Done` type.

#### Examples

##### Effect

```js
import { createEffect, restore } from "effector";

const fx = createEffect(() => "foo");
const $store = restore(fx, "default");

$store.watch((state) => console.log("state: ", state));
// => state: default

await fx();
// => state: foo
```

Try it

### `restore(shape)`

Creates an object with stores from an object with values.

#### Formulae

TBD

#### Arguments

1. `shape` (*State*)

#### Returns

: New store.

#### Examples

##### Object

```js
import { restore } from "effector";

const { foo: $foo, bar: $bar } = restore({
  foo: "foo",
  bar: 0,
});

$foo.watch((foo) => {
  console.log("foo", foo);
});
// => foo 'foo'
$bar.watch((bar) => {
  console.log("bar", bar);
});
// => bar 0
```

Try it


# sample

```ts
import { sample } from "effector";
```

## Methods

### `sample({ source?, clock?, filter?, fn?, target? })`

This method can be used for linking two nodes, resulting in the third one, which will fire only upon the `clock` node trigger.

Quite a common case, when you need to handle an event with some store's state. Instead of using `store.getState()`, which may cause race conditions and inconsistency of state, it is more suitable to use the `sample` method.

#### Formulae

```ts
sample({ source?, clock?, filter?, fn?, target?}): target
```

When `clock` is triggered, read the value from `source` and trigger `target` with it.

* If the `clock` is not passed, `sample` will be triggered on every `source` update.
* If the `filter` is not passed, continue as it is. If `filter` return `false` or contains `Store<false>` cancel execution otherwise continue
* If the `fn` is passed, pass value from `source` through before passing to `target`
* If the `target` is not passed, create it and return from `sample()`

#### Schema

![](/images/sample-visualization.gif)

#### Types

##### Type of the created `target`

If `target` is not passed to `sample()` call, it will be created internally. The type of unit is described in the table below:

| clock\source                        |  |  |  |
| ----------------------------------- | --------------------------------- | --------------------------------- | ----------------------------------- |
|    | `Store`                           | `Event`                           | `Event`                             |
|    | `Event`                           | `Event`                           | `Event`                             |
|  | `Event`                           | `Event`                           | `Event`                             |

How to read it:

1. You need to know the type of the `source`, it is a column
2. Type of the `clock` in the rows
3. Match the column and the row

For example:

```ts
import { sample } from "effector";

const $store = sample({ clock: $store, source: $store });
// Result will be store, because `source` and `clock` are stores.

const event = sample({ clock: event, source: $store });
// Because not all arguments are stores.
```

### `sample({clock?, source, filter?, fn?, target?, greedy?})`

#### Formulae

TBD

#### Arguments

`params` (*Object*): Configuration object

* `clock?`: Unit or array of units
  * If event or effect: trigger `target` upon event or effect is called
  * If store: trigger `target` upon store is updated
  * If array of units: trigger `target` upon any given unit is called or updated. Shorthand for inline merge call
  * If not passed: `source` is used as `clock`
* `source?`: Unit or object/array with stores
  * If event or effect: take last invocation argument value. That event or effect must be invoked at least once
  * If store: take current state of given store
  * If array or object with stores: take values from given stores combined to object or array. Shorthand for inline combine call
  * If not passed: `clock` is used as `source`
* `target?`: Unit or array of units
  * If event or effect: call given event or effect upon `clock` is triggered
  * If store: update given store upon `clock` is triggered
  * If array of units: trigger every given unit upon `clock` is triggered
  * If not passed: new unit will be created under the hood and will be returned as a result of the `sample()` call. Type of created target is described in table above
* `filter?` *(Function or Store)* `((sourceData, clockData) => result): boolean | Store<boolean>`: If returns value of the function or store contains `true` continue execution otherwise cancel
* `fn?` *(Function)* `((sourceData, clockData) => result)`: Combinator function, which will transform data from `source` and `clock` before passing it to `target`, should be . If not passed, data from `source` will be passed to `target` as it is
* `greedy?` (boolean) Modifier defines whether sampler will wait for resolving calculation result, and will batch all updates, resulting only one trigger, or will be triggered upon every linked node invocation, e.g. if `greedy` is `true`, `sampler` will fire on trigger of every node, linked to `clock`, whereas `non-greedy sampler(greedy: false)` will fire only upon the last linked node trigger

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) property `greedy` is deprecated.
>
> Use `batch` instead of `greedy`.

> INFO since: 
>
> Array of units in `target` are supported since [effector 21.8.0](https://changelog.effector.dev/#effector-21-8-0)

#### Returns

( | ) - Unit, which fires/updates upon `clock` is triggered, if `source` is not passed. The type of returned unit depends on the types of .

#### Examples

```js
import { createStore, createEvent, createEffect, sample } from "effector";

const submitForm = createEvent();
const signInFx = createEffect((params) => {
  console.log(params);
});

const $userName = createStore("john");

sample({
  clock: submitForm /* 1 */,
  source: $userName /* 2 */,
  fn: (name, password) => ({ name, password }) /* 3 */,
  target: signInFx /* 4 */,
});

submitForm(12345678);
// 1. when submitForm is called with params (12345678)
// 2. take $userName store`s state ('john')
// 3. transform payload from event (1) and current store`s state (2)
// 4. trigger effect signInFx with params received at the step (3)
```

Try it

### `sample(sourceUnit, clockUnit, fn?)`

It is just another form of the `sample` invocation, with the same sense.

#### Formulae

TBD

#### Arguments

* `sourceUnit`: Source unit
  * If event or effect. Take last invocation argument value. That event or effect must be invoked at least once
  * If store. Take current store's state
* `clockUnit`: Clock unit. If not passed, `source` is used as `clock`
  * If event or effect. Trigger the sampled unit, upon event or effect is called
  * If store. Trigger the sampled unit, upon store is updated
* `fn?` (*(sourceData, clockData) => result*): Optional combinator function, should be . Since, this handler is supposed to organize data flow, you should avoid declaring side effects here. It's more appropriate to place it in `watch` method for sampled node.

**Returns**

( | ) – Unit, which fires/updates upon `clock` is triggered, if `source` is not passed.
The type of returned unit depends on the types of .

#### Examples

```js
import { createStore, createEvent, createEffect, sample } from "effector";

const submitForm = createEvent();

const signInFx = createEffect((params) => {
  console.log(params);
});

const $userName = createStore("john");

const sampleUnit = sample(
  $userName /* 2 */,
  submitForm /* 1 */,
  (name, password) => ({ name, password }) /* 3 */,
);
/* 4 */
sample({
  clock: sampleUnit,
  target: signInFx,
});

submitForm(12345678);
// 1. when submitForm is called with params (12345678)
// 2. take $userName store`s state ('john')
// 3. transform payload from event (1) and current store`s state (2)
// 4. when sampleUnit (event in this case) is triggered,
//    send it payload to effect signInFx with params received at the step (3)
```

Try it

#### `sample({name?})`

> INFO since: 
>
> [effector 20.4.0](https://changelog.effector.dev/#effector-20-4-0)

Every unit in effector may have a name.
You now can name sampled entities in the same manner as basic ones.

```js
import { createStore, sample } from "effector";

const $store = createStore(null);

const sampled = sample({
  source: $store,
  name: "sampled $store",
});

console.log(sampled.shortName); // 'sampled foo'
```

### Objects and Arrays of *Store* in `sample({ source })`

#### Object of Stores

> INFO since: 
>
> [effector 20.8.0](https://changelog.effector.dev/#effector-20-8-0)

`sample` can be called with an object of  as `source`:

```js
import { createStore, createEvent, sample } from "effector";

const trigger = createEvent();

const $a = createStore("A");
const $b = createStore(1);

// Target has type `Event<{ a: string, b: number }>`
const target = sample({
  clock: trigger,
  source: { a: $a, b: $b },
});

target.watch((obj) => {
  console.log("sampled object", obj);
});

trigger();
// => sampled object {a: 'A', b: 1}
```

Try it

#### Array of Stores

> INFO since: 
>
> [effector 20.8.0](https://changelog.effector.dev/#effector-20-8-0)

`sample` can be called with an array of  as `source`:

> Note: Typescript requires adding `as const` after the array is entered.

```ts
import { createStore, createEvent, sample } from "effector";

const trigger = createEvent();

const $a = createStore("A");
const $b = createStore(1);

// Target has type `Event<[string, number]>`
const target = sample({
  clock: trigger,
  source: [$a, $b] as const,
});

target.watch((obj) => {
  console.log("sampled array", obj);
});

// You can easily destructure arguments to set explicit names
target.watch(([a, b]) => {
  console.log("explicit names", a, b);
});

trigger();
// => sampled array ["A", 1]
// => explicit names "A" 1
```

Try it

#### Array of *Units* in `sample({ clock })`

> INFO since: 
>
> [effector 21.2.0](https://changelog.effector.dev/#effector-21-2-0)

`clock` field in `sample` supports passing arrays of units, acting similarly to a `merge` call.

```js
import {createStore, createEvent, createEffect, sample, merge} from 'effector'

const showNotification = createEvent<string>()
const trigger = createEvent()
const fx = createEffect()
const $store = createStore('')

// array of units in `clock`
sample({
  clock: [trigger, fx.doneData],
  source: $store,
  target: showNotification,
})

// merged unit in `clock`
sample({
  clock: merge([trigger, fx.doneData]),
  source: $store,
  target: showNotification,
})
```

Try it

### Filtering updates with `sample({ filter })`

> INFO since: 
>
> [effector 22.2.0](https://changelog.effector.dev/#effector-22-2-0)

The new variant of the `sample` works the same but with one extra method `filter`. Whenever `filter` returns `true` continue execution otherwise cancel. Let's see an example below.

Henry wants to send money to William. Henry – sender and William – recipient. To send money, sender should know the recipient address, besides sender has to sign the transaction. This example shows how exactly the `sample` works with a `filter`. The main points are:

1. Make sure balance is positive and more than sending amount
2. Having recipient address
3. Signed transaction
4. Make sure sender balance has been changed

```js
import { createStore, createEvent, createEffect, sample } from "effector";

const sign = createEvent();
const sentMoney = createEvent();
const $recipientAddress = createStore("a23x3xd");
const $balance = createStore(20000);
const $isSigned = createStore(false);
const transactionFx = createEffect(
  ({ amountToSend, recipientAddress }) =>
    new Promise((res) =>
      setTimeout(res, 3000, {
        amount: amountToSend,
        recipientAddress,
      }),
    ),
);

$isSigned.on(sign, () => true).reset(transactionFx);
$balance.on(transactionFx.doneData, (balance, { amount }) => balance - amount);

sample({
  source: {
    recipientAddress: $recipientAddress,
    isSigned: $isSigned,
    balance: $balance,
  },
  clock: sentMoney,
  filter: ({ isSigned, balance }, amountToSend) => isSigned && balance > amountToSend,
  fn({ recipientAddress }, amountToSend) {
    return { recipientAddress, amountToSend };
  },
  target: transactionFx,
});

$balance.watch((balance) => console.log("balance: ", balance));
$isSigned.watch((isSigned) => console.log("is signed: ", isSigned));

sign();
sentMoney(1000);
```

Try it

<!-- ## Other examples

### Example 2

```js
import {createEvent, createStore, sample} from 'effector'

const clickButton = createEvent()
const closeModal = clickButton.map(() => 'close modal')

const lastEvent = createStore(null)
  .on(clickButton, (_, data) => data)
  .on(closeModal, () => 'modal')

lastEvent.updates.watch(data => {
  // here we need everything
  //console.log(`sending important analytics event: ${data}`)
})

lastEvent.updates.watch(data => {
  //here we need only final value
  //console.log(`render <div class="yourstatus">${data}</div>`)
})

const analyticReportsEnabled = createStore(false)

const commonSampling = sample({
  clock: merge([clickButton, closeModal]),
  source: analyticReportsEnabled,
  fn: (isEnabled, data) => ({isEnabled, data}),
})

const greedySampling = sample({
  clock: merge([clickButton, closeModal]),
  source: analyticReportsEnabled,
  fn: (isEnabled, data) => ({isEnabled, data}),
  greedy: true,
})

commonSampling.watch(data => console.log('non greedy update', data))
greedySampling.watch(data => console.log('greedy update', data))

clickButton('click A')
clickButton('click B')
```

[Try it](https://share.effector.dev/RCo60EEK)

### Example `sample(sourceEvent, clockEvent, fn?)`

```js
import {createEvent, sample} from 'effector'

const event1 = createEvent()
const event2 = createEvent()

const sampled = sample(event1, event2, (a, b) => `${a} ${b}`)
sampled.watch(console.log)

event1('Hello')
event2('World') // => Hello World
event2('effector!') // => Hello effector!

sampled('Can be invoked too!') // => Can be invoked too!
```

[Try it](https://share.effector.dev/vXKWDhwL)

### Example `sample(event, store, fn?)`

```js
import {createEvent, createStore, sample} from 'effector'

const event = createEvent()
const inc = createEvent()
const count = createStore(0).on(inc, state => state + 1)

const sampled = sample(
  event,
  count,
  (c, i) => `Current count is ${i}, last event invocation: ${c}`,
)
sampled.watch(console.log)

inc() // => nothing

event('foo')
inc() // => Current count is 2, last event invocation: foo

event('bar')
inc() // => Current count is 3, last event invocation: bar
```

[Try it](https://share.effector.dev/L4nbGjxM)

### Example `sample(sourceStore, clockStore, fn?)`

```js
import {createEvent, createStore, sample} from 'effector'

const inc = createEvent()
const setName = createEvent()

const name = createStore('John').on(setName, (_, v) => v)

const clock = createStore(0).on(inc, i => i + 1)

const sampled = sample(name, clock, (name, i) => `${name} has ${i} coins`)
sampled.watch(console.log)
// => John has 0 coins (initial store update triggered sampled store)

setName('Doe')
inc() // => Doe has 1 coins
```

[Try it](https://share.effector.dev/h3zED3yW) -->


# scopeBind

```ts
import { scopeBind } from "effector";
```

`scopeBind` is a method to bind a unit (an Event or Effect) to a Scope to be called later. Effector supports imperative calling of events within watchers, however, there are instances where you must explicitly bind events to the scope, such as when triggering events from within `setTimeout` or `setInterval` callbacks.

## Methods

### `scopeBind(event, options?)`

#### Formulae

```ts
scopeBind<T>(event: EventCallable<T>): (payload: T) => void
scopeBind<T>(event: EventCallable<T>, options?: {scope?: Scope, safe?: boolean}): (payload: T) => void
```

#### Arguments

1. `event`  or  to be bound to the scope.
2. `options` (*Object*): Optional configuration.
   * `scope` (*Scope*): Scope to bind event to.
   * `safe` (*Boolean*): Flag for exception suppression if there is no scope.

#### Returns

`(payload: T) => void` — A function with the same types as `event`.

#### Examples

##### Basic Usage

We are going to call `changeLocation` inside `history.listen` callback so there is no way for effector to associate event with corresponding scope, and we should explicitly bind event to scope using `scopeBind`.

```ts
import { createStore, createEvent, attach, scopeBind } from "effector";

const $history = createStore(history);
const initHistory = createEvent();
const changeLocation = createEvent<string>();

const installHistoryFx = attach({
  source: $history,
  effect: (history) => {
    const locationUpdate = scopeBind(changeLocation);

    history.listen((location) => {
      locationUpdate(location);
    });
  },
});

sample({
  clock: initHistory,
  target: installHistoryFx,
});
```

See full example

### `scopeBind(callback, options?)`

Binds arbitrary callback to a scope to be called later. The bound version of the function retains all properties of the original, e.g., if the original function would throw when called with a certain argument, the bound version will also throw under the same circumstances.

> INFO since: 
>
> Feature is available since `effector 23.1.0` release.
> Multiple function arguments are supported since `effector 23.3.0`

> WARNING: 
>
> To be compatible with the Fork API, callbacks **must** adhere to the same rules as `Effect` handlers:
>
> * Synchronous functions can be used as they are.
> * Asynchronous functions must follow the rules described in "Imperative Effect calls with scope".

#### Formulae

```ts
scopeBind(callback: (...args: Args) => T, options?: { scope?: Scope; safe?: boolean }): (...args: Args) => T;
```

#### Arguments

1. `callback` (*Function*): Any function to be bound to the scope.
2. `options` (*Object*): Optional configuration.
   * `scope` (*Scope*): Scope to bind the event to.
   * `safe` (*Boolean*): Flag for exception suppression if there is no scope.

#### Returns

`(...args: Args) => T` — A function with the same types as `callback`.

#### Examples

```ts
import { createEvent, createStore, attach, scopeBind } from "effector";

const $history = createStore(history);
const locationChanged = createEvent();

const listenToHistoryFx = attach({
  source: $history,
  effect: (history) => {
    return history.listen(
      scopeBind((location) => {
        locationChanged(location);
      }),
    );
  },
});
```


# serialize

```ts
import { serialize, type Scope } from "effector";
```

## Methods

### `serialize(scope, params)`

A companion method for . It allows us to get a serialized value for all the store states within a scope. The main purpose is an application state serialization on the server side during SSR.

> WARNING Requirements: 
>
>  or  is required for using this method, as these plugins provide the SIDs for stores, which are required for stable state serialization.
>
> You can find deep-dive explanation here

#### Formulae

```ts
serialize(scope: Scope, { ignore?: Array<Store<any>>; onlyChanges?: boolean }): {[sid: string]: any}
```

#### Arguments

1. `scope` : a scope object (forked instance)
2. `ignore` Optional array of  to be omitted during serialization (added 20.14.0)
3. `onlyChanges` Optional boolean flag to ignore stores which didn't change in fork (prevent default values from being carried over network)

> WARNING Deprecated: 
>
> Since [effector 23.0.0](https://changelog.effector.dev/#effector-23-0-0) property `onlyChanges` is deprecated.

#### Returns

An object with store values using sids as a keys

> WARNING Reminder: 
>
> If a store does not have a sid, its value will be omitted during serialization.

#### Examples

##### Serialize forked instance state

```js
import { createStore, createEvent, allSettled, fork, serialize } from "effector";

const inc = createEvent();
const $store = createStore(42);
$store.on(inc, (x) => x + 1);

const scope = fork();

await allSettled(inc, { scope });

console.log(serialize(scope)); // => {[sid]: 43}
```

Try it

##### Using with `onlyChanges`

With `onlyChanges`, this method will serialize only stores which were changed by some trigger during work or defined in `values` field by fork or hydrate(scope). Once being changed, a store will stay marked as changed in given scope even if it was turned back to the default state during work, otherwise client will not update that store on its side, which is unexpected and inconsistent.
This allows us to hydrate client state several times, for example, during route changes in next.js

```js
import { createDomain, fork, serialize, hydrate } from "effector";

const app = createDomain();

/** store which we want to hydrate by server */
const $title = app.createStore("dashboard");

/** store which is not used by server */
const $clientTheme = app.createStore("light");

/** scope in client app */
const clientScope = fork(app, {
  values: new Map([
    [$clientTheme, "dark"],
    [$title, "profile"],
  ]),
});

/** server side scope of chats page created for each request */
const chatsPageScope = fork(app, {
  values: new Map([[$title, "chats"]]),
});

/** this object will contain only $title data
 * as $clientTheme never changed in server scope */
const chatsPageData = serialize(chatsPageScope, { onlyChanges: true });
console.log(chatsPageData);
// => {'-l644hw': 'chats'}

/** thereby, filling values from a server will touch only relevant stores */
hydrate(clientScope, { values: chatsPageData });

console.log(clientScope.getState($clientTheme));
// => dark
```

Try it


# split

```ts
import { split } from "effector";
```

Choose one of cases by given conditions. It "splits" source unit into several events, which fires when payload matches their conditions. Works like pattern matching for payload values and external stores

## Concepts

### Case mode

Mode in which target case is selected by the name of its field. Case could be selected from data in `source` by case function or from external case store which kept current case name. After selection data from `source` will be sent to corresponding `cases[fieldName]` (if there is one), if none of the fields matches, then the data will be sent to `cases.__` (if there is one).

**See also**:

* case store
* case function

### Matching mode

Mode in which each case is sequentially matched by stores and functions in fields of `match` object.
If one of the fields got `true` from store value or return of function, then the data from `source` will be sent to corresponding `cases[fieldName]` (if there is one), if none of the fields matches, then the data will be sent to `cases.__` (if there is one)

**See also**:

* matcher store
* matcher function

### Case store

Store with a string which will be used to choose the case by its name. Placed directly in `match` field.

```ts
split({
  source: Unit<T>
  // case store
  match: Store<'first' | 'second'>,
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

### Case function

String-returning function which will be called with value from `source` to choose the case by its name. Placed directly in `match` field, should be&#x20;

```ts
split({
  source: Unit<T>
  // case function
  match: (value: T) => 'first' | 'second',
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

### Matcher store

Boolean store which indicates whether to choose the particular case or try the next one. Placed in fields of `match` object, might be mixed with matcher functions

```ts
split({
  source: Unit<T>
  match: {
    // matcher store
    first: Store<boolean>,
    second: Store<boolean>
  },
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

### Matcher function

> INFO: 
>
> Case store, case function and matcher store are supported since [effector 21.8.0](https://changelog.effector.dev/#effector-21-8-0)

Boolean-returning function which indicates whether to choose the particular case or try the next one. Placed in fields of `match` object, might be mixed with matcher stores, should be&#x20;

```ts
split({
  source: Unit<T>
  match: {
    // matcher function
    first: (value: T) => boolean,
    second: (value: T) => boolean
  },
  cases: {
    first: Unit<T> | Unit<T>[],
    second: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

## Methods

### `split({ source, match, cases })`

> INFO since: 
>
> [effector 21.0.0](https://changelog.effector.dev/#effector-21-0-0)

#### Formulae

```ts
split({ source, match, cases });
```

```ts
split({
  source: Unit<T>
  // case function
  match: (data: T) => 'a' | 'b',
  cases: {
    a: Unit<T> | Unit<T>[],
    b: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
split({
  source: Unit<T>
  // case store
  match: Store<'a' | 'b'>,
  cases: {
    a: Unit<T> | Unit<T>[],
    b: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
split({
  source: Unit<T>
  match: {
    // matcher function
    a: (data: T) => boolean,
    // matcher store
    b: Store<boolean>
  },
  cases: {
    a: Unit<T> | Unit<T>[],
    b: Unit<T> | Unit<T>[],
    __?: Unit<T> | Unit<T>[]
  }
})
```

#### Arguments

* `source`: Unit which will trigger computation in `split`
* `match`: Single store with string, single function which returns string or object with boolean stores and functions which returns boolean
* `cases`: Object with units or arrays of units to which data will be passed from `source` after case selection

#### Returns

`void`

#### Examples

##### Basic

```js
import { split, createEffect, createEvent } from "effector";
const messageReceived = createEvent();
const showTextPopup = createEvent();
const playAudio = createEvent();
const reportUnknownMessageTypeFx = createEffect(({ type }) => {
  console.log("unknown message:", type);
});

split({
  source: messageReceived,
  match: {
    text: (msg) => msg.type === "text",
    audio: (msg) => msg.type === "audio",
  },
  cases: {
    text: showTextPopup,
    audio: playAudio,
    __: reportUnknownMessageTypeFx,
  },
});

showTextPopup.watch(({ value }) => {
  console.log("new message:", value);
});

messageReceived({
  type: "text",
  value: "Hello",
});
// => new message: Hello
messageReceived({
  type: "image",
  imageUrl: "...",
});
// => unknown message: image
```

Try it

##### Direct match

You can match directly to store api as well:

```js
import { split, createStore, createEvent, createApi } from "effector";

const messageReceived = createEvent();

const $textContent = createStore([]);

split({
  source: messageReceived,
  match: {
    text: (msg) => msg.type === "text",
    audio: (msg) => msg.type === "audio",
  },
  cases: createApi($textContent, {
    text: (list, { value }) => [...list, value],
    audio: (list, { duration }) => [...list, `audio ${duration} ms`],
    __: (list) => [...list, "unknown message"],
  }),
});

$textContent.watch((messages) => {
  console.log(messages);
});

messageReceived({
  type: "text",
  value: "Hello",
});
// => ['Hello']
messageReceived({
  type: "image",
  imageUrl: "...",
});
// => ['Hello', 'unknown message']
messageReceived({
  type: "audio",
  duration: 500,
});
// => ['Hello', 'unknown message', 'audio 500 ms']
```

Try it

##### Cases with arrays of units

```js
import { createEffect, createEvent, createStore, sample, split } from "effector";

const $verificationCode = createStore("12345");
const $error = createStore("");

const modalToInputUsername = createEvent();
const modalToAuthorizationMethod = createEvent();

const checkVerificationCodeFx = createEffect((code) => {
  throw "500";
});

sample({
  clock: verificationCodeSubmitted,
  source: $verificationCode,
  target: checkVerificationCodeFx,
});

split({
  source: checkVerificationCodeFx.failData,
  match: (value) => (["400", "410"].includes(value) ? "verificationCodeError" : "serverError"),
  cases: {
    verificationCodeError: $verificationCodeError,
    serverError: [$error, modalToAuthorizationMethod],
  },
});

$error.updates.watch((value) => console.log("ERROR: " + value));
modalToAuthorizationMethod.watch(() =>
  console.log("Modal window to the authorization method content."),
);
// => ERROR: 500
// => Modal window to the authorization method content.
```

### `split(source, match)`

> INFO since: 
>
> [effector 20.0.0](https://changelog.effector.dev/#effector-20-0-0)

#### Formulae

```ts
split(source, match);
```

#### Arguments

1. `source`: Unit which will trigger computation in `split`
2. `match` (*Object*): Schema of cases, which uses names of resulting events as keys, and matching function\*((value) => Boolean)\*

#### Returns

(Object) – Object, having keys, defined in `match` argument, plus `__`(two underscores) – which stands for `default` (no matches met) case.

#### Examples

##### Basic

```js
import { createEvent, split } from "effector";

const message = createEvent();

const messageByAuthor = split(message, {
  bob: ({ user }) => user === "bob",
  alice: ({ user }) => user === "alice",
});
messageByAuthor.bob.watch(({ text }) => {
  console.log("[bob]: ", text);
});
messageByAuthor.alice.watch(({ text }) => {
  console.log("[alice]: ", text);
});

message({ user: "bob", text: "Hello" });
// => [bob]: Hello
message({ user: "alice", text: "Hi bob" });
// => [alice]: Hi bob

/* default case, triggered if no one condition met */
const { __: guest } = messageByAuthor;
guest.watch(({ text }) => {
  console.log("[guest]: ", text);
});
message({ user: "unregistered", text: "hi" });
// => [guest]: hi
```

Try it

> INFO: 
>
> Only the first met match will trigger resulting event

##### Another

```js
import { createEvent, split } from "effector";

const message = createEvent();

const { short, long, medium } = split(message, {
  short: (m) => m.length <= 5,
  medium: (m) => m.length > 5 && m.length <= 10,
  long: (m) => m.length > 10,
});

short.watch((m) => console.log(`short message '${m}'`));
medium.watch((m) => console.log(`medium message '${m}'`));
long.watch((m) => console.log(`long message '${m}'`));

message("Hello, Bob!");
// => long message 'Hello, Bob!'

message("Hi!");
// => short message 'Hi!'
```

Try it

### `split({ source, clock?, match, cases })`

> INFO since: 
>
> [effector 22.2.0](https://changelog.effector.dev/#effector-22-2-0)

It works the same as split with cases, however computations in `split` will be started after `clock` is triggered.

#### Formulae

```js
split({source, clock?, match, cases})
```

#### Arguments

TBD

#### Examples

```js
import { createStore, createEvent, createEffect, split } from "effector";

const options = ["save", "delete", "forward"];
const $message = createStore({ id: 1, text: "Bring me a cup of coffee, please!" });
const $mode = createStore("");
const selectedMessageOption = createEvent();
const saveMessageFx = createEffect(() => "save");
const forwardMessageFx = createEffect(() => "forward");
const deleteMessageFx = createEffect(() => "delete");

$mode.on(selectedMessageOption, (mode, opt) => options.find((item) => item === opt) ?? mode);

split({
  source: $message,
  clock: selectedMessageOption,
  match: $mode,
  cases: {
    save: saveMessageFx,
    delete: deleteMessageFx,
    forward: forwardMessageFx,
  },
});

selectedMessageOption("delet"); // nothing happens
selectedMessageOption("delete");
```

Try it


# SWC plugin

An official SWC plugin can be used for SSR and easier debugging experience in SWC-powered projects, like [Next.js](https://nextjs.org) or Vite with [vite-react-swc plugin](https://github.com/vitejs/vite-plugin-react-swc).

The plugin has the same functionality as the built-in babel-plugin.
It provides all Units with unique `SID`s (Stable Identifier) and name, as well as other debug information.

> WARNING Unstable: 
>
> This SWC plugin, along with all other SWC plugins, is currently considered experimental and unstable.
>
> SWC and Next.js might not follow semver when it comes to plugin compatibility.

## Installation

Install @effector/swc-plugin using your preferred package manager.

```bash
npm install -ED @effector/swc-plugin
```

### Versioning

To avoid compatibility issues caused by breaking changes in SWC or Next.js, this plugin publishes different ['labels'](https://semver.org/#spec-item-9) for different underlying `@swc/core`. Refer to the table below to choose the correct plugin version for your setup.

> TIP: 
>
> For better stability, we recommend pinning both your runtime (like Next.js or `@swc/core`) and the `@effector/swc-plugin` version.
>
> Use the `--exact`/`--save-exact` option in your package manager to install specific, compatible versions. This ensures updates to one dependency don't break your application.

| `@swc/core` version | Next.js version                          | Correct plugin version |
| ------------------- | ---------------------------------------- | ---------------------- |
| `>=1.4.0 <1.6.0`    | `>=14.2.0 <=14.2.15`                     | `@swc1.4.0`            |
| `>=1.6.0 <1.7.0`    | `>=15.0.0-canary.37 <=15.0.0-canary.116` | `@swc1.6.0`            |
| `>=1.7.0 <1.8.0`    | `>=15.0.0-canary.122 <=15.0.2`           | `@swc1.7.0`            |
| `>=1.9.0 <1.10.0`   | `>=15.0.3 <=15.1.6`                      | `@swc1.9.0`            |
| `>=1.10.0 <1.11.0`  | `>=15.2.0 <15.2.1`                       | `@swc1.10.0`           |
| `>=1.11.0`          | `>=15.2.1`                               | `@swc1.11.0`           |

For more information on compatibility, refer to the SWC documentation on [Selecting the SWC Version](https://swc.rs/docs/plugin/selecting-swc-core) and interactive [compatibility table](https://plugins.swc.rs) on SWC website.

## Usage

To use the plugin, simply add it to your tool's configuration.

### Next.js

If you're using the [Next.js Compiler](https://nextjs.org/docs/architecture/nextjs-compiler) powered by SWC, add this plugin to your `next.config.js`.

```js
const nextConfig = {
  experimental: {
    // even if empty, pass an options object `{}` to the plugin
    swcPlugins: [["@effector/swc-plugin", {}]],
  },
};
```

You'll also need to install the official [`@effector/next`](https://github.com/effector/next) bindings to enable SSR/SSG.

> WARNING Turbopack: 
>
> Note that some functionality may be broken when using Turbopack with NextJS, especially with relative . Use at your own risk.

### .swcrc

Add a new entry to `jsc.experimental.plugins` option in your `.swcrc`.

```json
{
  "$schema": "https://json.schemastore.org/swcrc",
  "jsc": {
    "experimental": {
      "plugins": [["@effector/swc-plugin", {}]]
    }
  }
}
```

## Configuration

### `factories`

Specify an array of module names or files to treat as custom factories. When using SSR, factories is required for ensuring unique SIDs across your application.

> TIP: 
>
> Community packages (`patronum`, `@farfetched/core`, `atomic-router` and [`@withease/factories`](https://github.com/withease/factories)) are always enabled, so you don't need to list them explicitly.

#### Formulae

```json
["@effector/swc-plugin", { "factories": ["./path/to/factory", "factory-package"] }]
```

* Type: `string[]`
* Default: `[]`

If you provide a relative path (starting with `./`), the plugin treats it as a local factory relative to your project's root directory. These factories can only be imported using relative imports within your code.

Otherwise, if you specify a package name or TypeScript alias, it's interpreted as an exact import specifier. You must use such import exactly as specified in configuration.

#### Examples

```json
// configuraiton
["@effector/swc-plugin", { "factories": ["./src/factory"] }]
```

```ts
// file: /src/factory.ts
import { createStore } from "effector";

/* createBooleanStore is a factory */
export const createBooleanStore = () => createStore(true);
```

```ts
// file: /src/widget/user.ts
import { createBooleanStore } from "../factory";

const $boolean = createBooleanStore(); /* Treated as a factory! */
```

### `debugSids`

Append the full file path and Unit name to generated `SID`s for easier debugging of SSR issues.

#### Formulae

```json
["@effector/swc-plugin", { "debugSids": false }]
```

* Type: `boolean`
* Default: `false`

### `hmr`

> INFO since: 
>
> `@effector/swc-plugin@0.7.0`

Enable Hot Module Replacement (HMR) support to clean up links, subscriptions and side effects managed by Effector. This prevents double-firing of Effects and watchers.

> WARNING Experimental: 
>
> Although tested, this option is considered experimental and might have unexpected issues in different bundlers.

#### Formulae

```json
["@effector/swc-plugin", { "hmr": "es" }]
```

* Type: `"es"` | `"cjs"` | `"none"`
  * `"es"`: Use `import.meta.hot` HMR API in bundlers that are ESM-compliant, like Vite and Rollup
  * `"cjs"`: Use `module.hot` HMR API in bundlers that rely on CommonJS modules, like Webpack and Next.js
  * `"none"`: Disable Hot Module Replacement.
* Default: `none`

> INFO In Production: 
>
> When bundling for production, make sure to set the `hmr` option to `"none"` to reduce bundle size and improve runtime performance.

### `addNames`

Add names to Units when calling factories (like `createStore` or `createDomain`). This is helpful for debugging during development and testing, but its recommended to disable it for minification.

#### Formulae

```json
["@effector/swc-plugin", { "addNames": true }]
```

* Type: `boolean`
* Default: `true`

### `addLoc`

Include location information (file paths and line numbers) for Units and factories. This is useful for debugging with tools like [`effector-logger`](https://github.com/effector/logger).

#### Formulae

```json
["@effector/swc-plugin", { "addLoc": false }]
```

* Type: `boolean`
* Default: `false`

### `forceScope`

Inject `forceScope: true` into all hooks or `@effector/reflect` calls to ensure your app always uses `Scope` during rendering. If `Scope` is missing, an error will be thrown, eliminating the need for `/scope` or `/ssr` imports.

> INFO Note: 
>
> Read more about Scope enforcement in the `effector-react` documentation.

#### Formulae

```json
["@effector/swc-plugin", { "forceScope": false }]
```

* Type: `boolean | { hooks: boolean, reflect: boolean }`
* Default: `false`

##### `hooks`

Enforces all hooks from effector-react and effector-solid, like `useUnit` and `useList`, to use `Scope` in runtime.

##### `reflect`

> INFO since: 
>
> Supported by `@effector/reflect` since 9.0.0

For [`@effector/reflect`](https://github.com/effector/reflect) users, enforces all components created with `reflect` library use `Scope` in runtime.

### `transformLegacyDomainMethods`

When enabled (default), this option transforms Unit creators in Domains, like `domain.event()` or `domain.createEffect()`. However, this transformation can be unreliable and may affect unrelated code. If that's the case for you, disabling this option can fix these issues.

Disabling this option will **stop** adding SIDs and other debug information to these unit creators. Ensure your code does not depend on domain methods before disabling.

> TIP: 
>
> Instead of using unit creators directly on domain, consider using the `domain` argument in regular methods.

#### Formulae

```json
["@effector/swc-plugin", { "transformLegacyDomainMethods": true }]
```

* Type: `boolean`
* Default: `true`


# withRegion

```ts
import { withRegion } from "effector";
```

The method is based on the idea of region-based memory management (see [Region-based memory management](https://en.wikipedia.org/wiki/Region-based_memory_management) for reference).

## Methods

### `withRegion(unit, callback)`

> INFO since: 
>
> [effector 20.11.0](https://changelog.effector.dev/#effector-20-11-0)

The method allows to explicitly transfer ownership of all units (including links created with `sample`, `forward`, etc...) defined in the callback to `unit`. As an implication, all the created links will be erased as soon as `clearNode` is called on .

#### Formulae

```ts
withRegion(unit: Unit<T> | Node, callback: () => void): void
```

#### Arguments

1. `unit`: *Unit* | *Node* — which will serve as "local area" or "region" owning all the units created within the provided callback. Usually a node created by low level `createNode` method is optimal for this case.
2. `callback`: `() => void` — The callback where all the relevant units should be defined.

#### Examples

```js
import { createNode, createEvent, restore, withRegion, clearNode } from "effector";

const first = createEvent();
const second = createEvent();
const $store = restore(first, "");
const region = createNode();

withRegion(domain, () => {
  // Following links created with `sample` are owned by the provided unit `domain`
  // and will be disposed as soon as `clearNode` is called on `domain`.
  sample({
    clock: second,
    target: first,
  });
});

$store.watch(console.log);

first("hello");
second("world");

clearNode(region);

second("will not trigger updates of `$store`");
```


# API Reference

import FeatureCard from "@components/FeatureCard.astro";
import IconReact from "@icons/React.astro";
import IconVue from "@icons/Vue.astro";
import IconSolid from "@icons/Solid.astro";
import IconEffector from "@icons/Effector.astro";
import IconNextJs from "@icons/NextJs.astro";
import MostUsefulMethods from "@components/MostUsefulMethods.astro";
import { MOST\_USEFUL } from "src/navigation";

Short overview of most useful methods and packages provided by Effector.

<MostUsefulMethods items={MOST_USEFUL} />


# Protocol @@unitShape

> INFO: 
>
> Available since [effector-react 22.4.0](https://changelog.effector.dev/#effector-react-22-4-0), effector-solid 0.22.7

Effector provides a way to use units (Stores, Events, Effects) in UI libraries with a special bindings like `effector-react`, `effector-solid`, etc. Normally, they allow binding any shape of units to a UI-framework:

```ts
import { createStore } from "effector";
import { useUnit } from "effector-react";

const $value = createStore("Hello!");

const Component = () => {
  const { value } = useUnit({ value: $value });

  return <p>{value}</p>;
};
```

But what if you want to create your own library on top of effector with some custom entities? For example, you want to create a router library with a custom `Route` entity, and you want to allow users to use it with `effector-react` bindings:

```ts
import { createRoute } from "my-router-library";
import { useUnit } from "effector-react";

const mainPageRoute = createRoute(/* ... */);

const Component = () => {
  const { params } = useUnit(mainPageRoute);

  return <p>{params.name}</p>;
};
```

It is possible with the `@@unitShape` protocol. It allows defining the shape of a unit in the custom entity and then using it in UI libraries. Just add field `@@unitShape` with a function that return shape of units to your entity:

```ts
function createRoute(/* ... */) {
  const $params = createStore(/* ... */);

  return {
    "@@unitShape": () => ({
      params: $params,
    }),
  };
}
```

### FAQ

***

**Q**: How frequently `@@unitShape`-function is called?

**A**: As many times as `useUnit` itself is called – it depends on a UI-library. For example, `effector-react` calls it as any other hook – once per component render, but `effector-solid` calls `useUnit` once per component mount.

***

**Q**: How can I know what UI-library is used for particular `@@unitShape` call?

**A**: You cannot. `@@unitShape` has to be universal for all UI-libraries either has to check what UI-library is used inside by UI-library methods (like `Context` in React or Solid).


# Events in effector

## Events

The **Event** in effector represents a user action, a step in the application process, a command to execute, or an intention to make modifications, among other things. This unit is designed to be a carrier of information/intention/state within the application, not the holder of a state.

In most situations, it is recommended to create events directly within the module, rather than placing them within conditional statements or classes, in order to maintain simplicity and readability. An exception to this recommendation is the use of factory functions; however, these should also be invoked at the root level of the module.

> INFO important information!: 
>
> Event instances persist throughout the entire runtime of the application and inherently represent a portion of the business logic.
>
> Attempting to delete instances and clear memory for the purpose of saving resources is not advised, as it may adversely impact the functionality and performance of the application.

### Calling the event

There are two ways to trigger event: imperative and declarative.

The **imperative** method involves invoking the event as if it were a function:

```ts
import { createEvent } from "effector";

const callHappened = createEvent<void>();

callHappened(); // event triggered
```

The **declarative** approach utilizes the event as a target for operators, such as `sample`, or as an argument when passed into factory functions:

```ts
import { createEvent, sample } from "effector";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});
```

When the `firstTriggered` event is invoked, the `secondTriggered` event will be subsequently called, creating a sequence of events.
Remember, dont call events in pure functions, it's not supported!

> TIP Good to know: 
>
> In Effector, any event supports only **a single argument**.
> It is not possible to call an event with two or more arguments, as in `someEvent(first, second)`.

All arguments beyond the first will be ignored.
The core team has implemented this rule for specific reasons related to the design and functionality.
This approach enables the argument to be accessed in any situation without adding types complexity.

If multiple arguments need to be passed, encapsulate them within an object:

```ts
import { createEvent } from "effector";

const requestReceived = createEvent<{ id: number; title: string }>();

requestReceived({ id: 1, title: "example" });
```

This rule also contributes to the clarity of each argument's meaning, both at the call side and subscription side. It promotes clean and organized code, making it easier to understand and maintain.

### Watching the event

To ascertain when an event is called, effector and its ecosystem offer various methods with distinct capabilities. Debugging is the primary use case for this purpose, and we highly recommend using [`patronum/debug`](https://patronum.effector.dev/methods/debug/) to display when an event is triggered and the argument it carries.

```ts
import { createEvent, sample } from "effector";
import { debug } from "patronum";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});

debug(firstTriggered, secondTriggered);

firstTriggered();
// => [event] firstTriggered undefined
// => [event] secondTriggered undefined
```

However, if your environment does not permit the addition of further dependencies, you may use the `createWatch` method, which accepts object in params with properties:

* `unit` — unit or array of units, that you want to start watch
* `fn` — function, that will be called when the unit is triggered. Accepts the unit’s payload as the first argument.
* `scope` — scope, instance of fork to restrict watcher calls on particular scope

```ts
import { createEvent, sample, createWatch } from "effector";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});

const unwatch = createWatch({
  unit: [firstTriggered, secondTriggered],
  fn: (payload) => {
    console.log("[event] triggered");
  },
});

firstTriggered();
// => [event] triggered
// => [event] triggered
```

> TIP Keep in mind: 
>
> The `createWatch` method neither handles nor reports exceptions, manages the completion of asynchronous operations, nor addresses data race issues.
>
> Its primary intended use is for short-term debugging and logging purposes, or for tests to ensure that some unit was triggered.

### Working with TypeScript

When an event is invoked, TypeScript will verify that the type of the argument passed matches the type defined in the event, ensuring consistency and type safety within the code.

This is also works for operators like sample or `split`:

```ts
import { sample, createEvent } from "effector";

const someHappened = createEvent<number>();
const anotherHappened = createEvent<string>();

sample({
  // @ts-expect-error error:
  // "clock should extend target type";
  // targets: { clockType: number; targetType: string; }
  clock: someHappened,
  target: anotherHappened,
});
```

### Working with multiple events

Events in effector can be combined in various ways to create more complex logic. Let's look at the main approaches:

#### Creating derived events

You can create a new event based on an existing one using the `map` method, which will be fired after original event:

```ts
import { createEvent, createStore } from "effector";

const userClicked = createEvent<{ id: number; name: string }>();
// Creating an event that will trigger only with the user's name
const userNameSelected = userClicked.map(({ name }) => name);
const $userName = createStore("").on(userNameSelected, (_, newName) => newName);

// Usage
userClicked({ id: 1, name: "John" });
// userNameSelected will get 'John'
```

> INFO Derived events: 
>
> You cannot call derived events directly, but you can still subscribe to them for state changes or triggering other units.

#### Filtering events

If you wanna create a new event that triggers only when a certain condition is met, you can use `sample` method and `filter` param:

```ts
import { sample, createEvent } from "effector";

type User = { id: number; role: "admin" | "user" };
type Admin = { id: number; role: "admin" };

const userClicked = createEvent<User>();

// Event will trigger only for admins
const adminClicked = sample({
  clock: userClicked,
  filter: ({ role }) => role === "admin",
});

// Creating type-safe event
const typeSafeAdminClicked = sample({
  clock: userClicked,
  filter: (user): user is Admin => user.role === "admin",
});
```

#### Merging multiple events

You can use the `merge` method, which combines an array of units into a single event that will
trigger when any of the array elements is called:

```ts
const buttonClicked = createEvent();
const linkClicked = createEvent();
const iconClicked = createEvent();

// Any of these events will trigger someActionHappened
const anyClicked = merge([buttonClicked, linkClicked, iconClicked]);

sample({
  clock: anyClicked,
  target: someActionHappened,
});
```

Or you can use `sample` with array in `clock`, which under the hood use the same method `merge` for arrays.

```ts
const buttonClicked = createEvent();
const linkClicked = createEvent();
const iconClicked = createEvent();

// Any of these events will trigger someActionHappened
sample({
  clock: [buttonClicked, linkClicked, iconClicked],
  target: someActionHappened,
});
```

#### Creating a pre-handler for an event

`event.prepend` is a method that creates a new event which will trigger the original event with preliminary data transformation.

Let's say your application encounters different errors with different structures, but the error handling should happen centrally:

```ts
import { createEvent } from "effector";

// Main error handling event
const showError = createEvent<string>();

// Subscribe to error displays
sample({
  clock: showError,
  target: processErrorFx, // we'll skip the effect implementation
});

// Create special events for different types of errors
const showNetworkError = showError.prepend((code: number) => `Network error: ${code}`);

const showValidationError = showError.prepend(
  (field: string) => `Field ${field} is filled incorrectly`,
);

// Usage
showNetworkError(404); // 🔴 Error: Network error: 404
showValidationError("email"); // 🔴 Error: Field email is filled incorrectly
```

In this example:

1. We have a main showError event that accepts a string
2. Using prepend, we create two new events, each of which:

* Accepts its own data type (number for network errors, string for validation errors)
* Transforms this data into an error string
* Passes the result to the main showError event

#### Conditional event triggering

The action chain when calling an event can trigger based on store states:

```ts
const buttonClicked = createEvent<void>();
const $isEnabled = createStore(true);

// Event will trigger only if $isEnabled is true
sample({
  clock: buttonClicked,
  filter: $isEnabled,
  target: actionExecuted,
});
```

> TIP Tip: 
>
> Combining events through `sample` is preferred over directly calling events inside `watch` or other handlers, as it makes the data flow more explicit and predictable.

API reference for Event.


# Splitting Data Streams with split

import { Image } from "astro> ASSETS:&#x20;";
import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";
import ThemeImage from "@components/ThemeImage.astro";

## Splitting Data Streams with `split`

The `split` method is designed to divide logic into multiple data streams.
For example, you might need to route data differently depending on its content, much like a railway switch that directs trains to different tracks:

* If a form is filled incorrectly — display an error.
* If everything is correct — send a request.

> INFO Condition Checking Order: 
>
> Conditions in `split` are checked sequentially from top to bottom. Once a condition matches, subsequent ones are not evaluated. Keep this in mind when crafting your conditions.

### Basic Usage of `split`

Let's look at a simple example — processing messages of different types:

```ts
import { createEvent, split } from "effector";

const updateUserStatus = createEvent();

const { activeUserUpdated, idleUserUpdated, inactiveUserUpdated } = split(updateUserStatus, {
  activeUserUpdated: (userStatus) => userStatus === "active",
  idleUserUpdated: (userStatus) => userStatus === "idle",
  inactiveUserUpdated: (userStatus) => userStatus === "inactive",
});
```

The logic here is straightforward. When the `updateUserStatus` event is triggered, it enters `split`, which evaluates each condition from top to bottom until a match is found, then triggers the corresponding event in `effector`.

Each condition is defined by a predicate — a function returning `true` or `false`.

You might wonder, "Why use this when I could handle conditions with `if/else` in the UI?" The answer lies in Effector's philosophy of **separating business logic** from the UI.

> TIP: 
>
> Think of `split` as a reactive `switch` for units.

### Default Case

When using `split`, there might be situations where no conditions match. For such cases, there's a special default case: `__`.

Here's the same example as before, now including a default case:

```ts
import { createEvent, split } from "effector";

const updateUserStatus = createEvent();

const { activeUserUpdated, idleUserUpdated, inactiveUserUpdated, __ } = split(updateUserStatus, {
  activeUserUpdated: (userStatus) => userStatus === "active",
  idleUserUpdated: (userStatus) => userStatus === "idle",
  inactiveUserUpdated: (userStatus) => userStatus === "inactive",
});

__.watch((defaultStatus) => console.log("default case with status:", defaultStatus));
activeUserUpdated.watch(() => console.log("active user"));

updateUserStatus("whatever");
updateUserStatus("active");
updateUserStatus("default case");

// Console output:
// default case with status: whatever
// active user
// default case with status: default case
```

> INFO Default Handling: 
>
> If no conditions match, the default case `__` will be triggered.

### Short Form

The `split` method supports multiple usage patterns based on your needs.

The shortest usage involves passing a unit as the first argument serving as a trigger and an object with cases as the second argument.

Let's look at an example with GitHub's "Star" and "Watch" buttons:

<ThemeImage
alt='Button "Star" for repo i github'
lightImage="/images/split/github-repo-buttons.png"
darkImage="/images/split/github-repo-buttons-dark.png"
height={20}
width={650}
/>

```ts
import { createStore, createEvent, split } from "effector";

type Repo = {
  // ... other properties
  isStarred: boolean;
  isWatched: boolean;
};

const toggleStar = createEvent<string>();
const toggleWatch = createEvent<string>();

const $repo = createStore<null | Repo>(null)
  .on(toggleStar, (repo) => ({
    ...repo,
    isStarred: !repo.isStarred,
  }))
  .on(toggleWatch, (repo) => ({ ...repo, isWatched: !repo.isWatched }));

const { starredRepo, unstarredRepo, __ } = split($repo, {
  starredRepo: (repo) => repo.isStarred,
  unstarredRepo: (repo) => !repo.isStarred,
});

// Debug default case
__.watch((repo) => console.log("[split toggleStar] Default case triggered with value ", repo));

// Somewhere in the app
toggleStar();
```

This usage returns an object with derived events, which can trigger reactive chains of actions.

> TIP: 
>
> Use this pattern when:
>
> * There are no dependencies on external data (e.g., stores).
> * You need simple, readable code.

### Expanded Form

Using the `split` method in this variation doesn't return any value but provides several new capabilities:

1. You can depend on external data, such as stores, using the `match` parameter.
2. Trigger multiple units when a case matches by passing an array.
3. Add a data source using `source` and a trigger using `clock`.

For example, imagine a scenario where your application has two modes: `user` and `admin`. When an event is triggered, different actions occur depending on whether the mode is `user` or `admin`:

```ts
import { createStore, createEvent, createEffect, split } from "effector";

const adminActionFx = createEffect();
const secondAdminActionFx = createEffect();
const userActionFx = createEffect();
const defaultActionFx = createEffect();
// UI event
const buttonClicked = createEvent();

// Current application mode
const $appMode = createStore<"admin" | "user">("user");

// Different actions for different modes
split({
  source: buttonClicked,
  match: $appMode, // Logic depends on the current mode
  cases: {
    admin: [adminActionFx, secondAdminActionFx],
    user: userActionFx,
    __: defaultActionFx,
  },
});

// Clicking the same button performs different actions
// depending on the application mode
buttonClicked();
// -> "Performing user action" (when $appMode = 'user')
// -> "Performing admin action" (when $appMode = 'admin')
```

Additionally, you can include a `clock` property that works like in sample, acting as a trigger, while `source` provides the data to be passed into the respective case. Here's an extended example:

```ts
// Extending the previous code

const adminActionFx = createEffect((currentUser) => {
  // ...
});
const secondAdminActionFx = createEffect((currentUser) => {
  // ...
});

// Adding a new store
const $currentUser = createStore({
  id: 1,
  name: "Donald",
});

const $appMode = createStore<"admin" | "user">("user");

split({
  clock: buttonClicked,
  // Passing the new store as a data source
  source: $currentUser,
  match: $appMode,
  cases: {
    admin: [adminActionFx, secondAdminActionFx],
    user: userActionFx,
    __: defaultActionFx,
  },
});
```

> WARNING Default Case: 
>
> If you need a default case, you must explicitly define it in the `cases` object, otherwise, it won' t be processed!

In this scenario, the logic for handling cases is determined at runtime based on `$appMode`, unlike the earlier example where it was defined during `split` creation.

> INFO Usage Notes: 
>
> When using `match`, it can accept units, functions, or objects with specific constraints:
>
> * **Store**: If using a store, **it must store a string value**.
> * **Function**: If passing a function, **it must return a string value and be pure**.
> * **Object with stores**: If passing an object of stores, **each store must hold a boolean value**.
> * **Object with functions**: If passing an object of functions, **each function must return a boolean value and be pure**.

#### `match` as a Store

When `match` is a store, the value in the store is used as a key to select the corresponding case:

```ts
const $currentTab = createStore("home");

split({
  source: pageNavigated,
  match: $currentTab,
  cases: {
    home: loadHomeDataFx,
    profile: loadProfileDataFx,
    settings: loadSettingsDataFx,
  },
});
```

#### `match` as a Function

When using a function for `match`, it must return a string to be used as the case key:

```ts
const userActionRequested = createEvent<{ type: string; payload: any }>();

split({
  source: userActionRequested,
  match: (action) => action.type, // The function returns a string
  cases: {
    update: updateUserDataFx,
    delete: deleteUserDataFx,
    create: createUserDataFx,
  },
});
```

#### `match` as an Object with Stores

When `match` is an object of stores, each store must hold a boolean value. The case whose store contains true will execute:

```ts
const $isAdmin = createStore(false);
const $isModerator = createStore(false);

split({
  source: postCreated,
  match: {
    admin: $isAdmin,
    moderator: $isModerator,
  },
  cases: {
    admin: createAdminPostFx,
    moderator: createModeratorPostFx,
    __: createUserPostFx,
  },
});
```

#### `match` as an Object with Functions

If using an object of functions, each function must return a boolean. The first case with a `true` function will execute:

```ts
split({
  source: paymentReceived,
  match: {
    lowAmount: ({ amount }) => amount < 100,
    mediumAmount: ({ amount }) => amount >= 100 && amount < 1000,
    highAmount: ({ amount }) => amount >= 1000,
  },
  cases: {
    lowAmount: processLowPaymentFx,
    mediumAmount: processMediumPaymentFx,
    highAmount: processHighPaymentFx,
  },
});
```

> WARNING Attention: 
>
> Ensure your conditions in `match` are mutually exclusive. Overlapping conditions may cause unexpected behavior. Always verify the logic to avoid conflicts.

### Practical Examples

#### Handling forms with split

```ts
const showFormErrorsFx = createEffect(() => {
  // Logic to display errors
});
const submitFormFx = createEffect(() => {
  // Logic to submit the form
});

const submitForm = createEvent();

const $form = createStore({
  name: "",
  email: "",
  age: 0,
}).on(submitForm, (_, submittedForm) => ({ ...submittedForm }));
// Separate store for errors
const $formErrors = createStore({
  name: "",
  email: "",
  age: "",
}).reset(submitForm);

// Validate fields and collect errors
sample({
  clock: submitForm,
  source: $form,
  fn: (form) => ({
    name: !form.name.trim() ? "Name is required" : "",
    email: !isValidEmail(form.email) ? "Invalid email" : "",
    age: form.age < 18 ? "Age must be 18+" : "",
  }),
  target: $formErrors,
});

// Use split for routing based on validation results
split({
  source: $formErrors,
  match: {
    hasErrors: (errors) => Object.values(errors).some((error) => error !== ""),
  },
  cases: {
    hasErrors: showFormErrorsFx,
    __: submitFormFx,
  },
});
```

Explanation:

Two effects are created: one to display errors and one to submit the form.

Two stores are defined: `$form` for form data and `$formErrors` for errors.
On form submission `submitForm`, two things happen:

1. Form data is updated in the `$form` store.
2. All fields are validated using `sample`, and errors are stored in `$formErrors`.

The `split` method determines the next step:

* If any field has an error – ❌ display the errors.
* If all fields are valid – ✅ submit the form.


# State Management in effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## State Management

State in effector is managed through stores - special objects that hold values and update them when receiving events. Stores are created using the createStore function.

> INFO Data immutability: 
>
> Store data in effector is immutable, which means you should not mutate arrays or objects directly, but create new instances when updating them.

<Tabs>
  <TabItem label="✅ Correct">

```ts
// update array
$users.on(userAdded, (users, newUser) => [...users, newUser]);

//update object
$user.on(nameChanged, (user, newName) => ({
  ...user,
  name: newName,
}));
```

  </TabItem>

  <TabItem label="❌ Incorrect">

```ts
// update array
$users.on(userAdded, (users, newUser) => {
  users.push(newUser); // mutation!
  return users;
});

// update object
$user.on(nameChanged, (user, newName) => {
  user.name = newName; // mutation!
  return user;
});
```

  </TabItem>
</Tabs>

### Store Creation

You can create new store via createStore:

```ts
import { createStore } from "effector";

// Create store with initial value
const $counter = createStore(0);
// with explicit typing
const $user = createStore<{ name: "Bob"; age: 25 } | null>(null);
const $posts = createStore<Post[]>([]);
```

> TIP Store naming: 
>
> In effector it's conventional to use the `$` prefix for stores. This helps distinguish them from other entities and improves code readability.

### Reading Values

There are several ways to get the current value of a store:

1. Using framework integration hooks `useUnit` (📘 React, 📗 Vue, 📘 Solid):

<Tabs>
  <TabItem label="React">

```ts
import { useUnit } from 'effector-react'
import { $counter } from './model.js'

const Counter = () => {
  const counter = useUnit($counter)

  return <div>{counter}</div>
}
```

  </TabItem>
  <TabItem label="Vue">

```html
<script setup>
  import { useUnit } from "effector-vue/composition";
  import { $counter } from "./model.js";
  const counter = useUnit($counter);
</script>
```

  </TabItem>
  <TabItem label="Solid">

```ts
import { useUnit } from 'effector-solid'
import { $counter } from './model.js'

const Counter = () => {
  const counter = useUnit($counter)

  return <div>{counter()}</div>
}
```

  </TabItem>
</Tabs>

2. Subscribe to changes via `watch` - only for debug or integration needs

```ts
$counter.watch((counter) => {
  console.log("Counter changed:", counter);
});
```

3. `getState()` method - only for integration needs

```ts
console.log($counter.getState()); // 0
```

### Store Updates

In effector, state updates are done via events. You can change the state by subscribing to an event via `.on` or by using the sample method.

> INFO Optimizing updates: 
>
> Store state is updated when it receives a value that is not equal (!==) to the current value, and also not equal to `undefined`.

#### Updating via Events

The simplest and correct way to update a store is to bind it to an event:

```ts
import { createStore, createEvent } from "effector";

const incremented = createEvent();
const decremented = createEvent();
const resetCounter = createEvent();

const $counter = createStore(0)
  // Increase value by 1 each time the event is called
  .on(incremented, (counterValue) => counterValue + 1)
  // Decrease value by 1 each time the event is called
  .on(decremented, (counterValue) => counterValue - 1)
  // Reset value to 0
  .reset(resetCounter);

$counter.watch((counterValue) => console.log(counterValue));

// Usage
incremented();
incremented();
decremented();

resetCounter();

// Console output
// 0 - output on initialization
// 1
// 2
// 1
// 0 - reset
```

> INFO What are events?: 
>
> If you are not familiar with `createEvent` and events, you will learn how to work with them on next page.

#### Updating with Event parameters

You can update a store using event parameters by passing data to the event like a regular function and using it in the handler:

```ts
import { createStore, createEvent } from "effector";

const userUpdated = createEvent<{ name: string }>();

const $user = createStore({ name: "Bob" });

$user.on(userUpdated, (user, changedUser) => ({
  ...user,
  ...changedUser,
}));

userUpdated({ name: "Alice" });
```

#### Complex Update Logic

Using the `on` method, we can update store state for simple cases when an event occurs, either by passing data from the event or updating based on the previous value.

However, this doesn't always cover all needs. For more complex state update logic, we can use the sample method, which helps us when:

* We need to control store updates using an event
* We need to update a store based on values from other stores
* We need data transformation before updating the store with access to current values of other stores

For example:

```ts
import { createEvent, createStore, sample } from "effector";

const updateItems = createEvent();

const $items = createStore([1, 2, 3]);
const $filteredItems = createStore([]);
const $filter = createStore("even");

// sample automatically provides access to current values
// of all connected stores at the moment the event triggers
sample({
  clock: updateItems,
  source: { items: $items, filter: $filter },
  fn: ({ items, filter }) => {
    if (filter === "even") {
      return items.filter((n) => n % 2 === 0);
    }

    return items.filter((n) => n % 2 === 1);
  },
  target: $filteredItems,
});
```

> INFO What is sample?: 
>
> To learn more about what `sample` is, how to use this method, and its detailed description, you can read about it here.

Advantages of using `sample` for state updates:

1. Access to current values of all stores
2. Atomic updates of multiple stores
3. Control over update timing through `clock`
4. Ability to filter updates using `filter`
5. Convenient data transformation through the `fn` function

#### Store Creation via `restore` method

If your store work involves replacing the old state with a new one when an event is called, you can use the restore method:

```ts
import { restore, createEvent } from "effector";

const nameChanged = createEvent<string>();

const $counter = restore(nameChanged, "");
```

The code above is equivalent to the code below:

```ts
import { createStore, createEvent } from "effector";

const nameChanged = createEvent<string>();

const $counter = createStore("").on(nameChanged, (_, newName) => newName);
```

You can also use `restore` method with an effect. In this case, the store will receive data from the effect's doneData event, and the default store value should match the return value type:

> INFO What are effects?: 
>
> If you are not familiar with `createEffect` and effects, you will learn how to work with them on this page.

```ts
import { restore, createEffect } from "effector";

// omit type realization
const createUserFx = createEffect<string, User>((id) => {
  // effect logic

  return {
    id: 4,
    name: "Bob",
    age: 18,
  };
});

const $newUser = restore(createEffect, {
  id: 0,
  name: "",
  age: -1,
});

createUserFx();

// After successful completion of the effect
// $newUser will be:
// {
// 	 id: 4,
// 	 name: "Bob",
// 	 age: 18,
// }
```

#### Multiple Store Updates

A store isn't limited to a single event subscription - you can subscribe to as many events as you need, and different stores can subscribe to the same event:

```ts
const categoryChanged = createEvent<string>();
const searchQueryChanged = createEvent<string>();
const filtersReset = createEvent();

const $lastUsedFilter = createStore<string | null>(null);
const $filters = createStore({
  category: "all",
  searchQuery: "",
});

// subscribe two different stores to the same event
$lastUsedFilter.on(categoryChanged, (_, category) => category);
$filters.on(categoryChanged, (filters, category) => ({
  ...filters,
  category,
}));

$filters.on(searchQueryChanged, (filters, searchQuery) => ({
  ...filters,
  searchQuery,
}));

$filters.reset(filtersReset);
```

In this example, we subscribe the `$filters` store to multiple events, and multiple stores to the same event `categoryChanged`.

#### Simplified Updates with `createApi`

When you need to create multiple handlers for one store, instead of creating separate events and subscribing to them, you can use createApi. This function creates a set of events for updating the store in one place.<br/>
The following code examples are equivalent:

<Tabs>
  <TabItem label="With createApi">

```ts
import { createStore, createApi } from "effector";

const $counter = createStore(0);

const { increment, decrement, reset } = createApi($counter, {
  increment: (state) => state + 1,
  decrement: (state) => state - 1,
  reset: () => 0,
});

// usage
increment(); // 1
reset(); // 0
```

  </TabItem>
  <TabItem label="Common usage">

```ts
import { createStore, createEvent } from "effector";

const $counter = createStore(0);

const incrementClicked = createEvent();
const decrementClicked = createEvent();
const resetClicked = createEvent();

$counter
  .on(incrementClicked, (state) => state + 1)
  .on(decrementClicked, (state) => state - 1)
  .reset(resetClicked);

// usage
increment(); // 1
reset(); // 0
```

  </TabItem>
</Tabs>

### Derived Stores

Often you need to create a store whose value depends on other stores. For this, the map method is used:

```ts
import { createStore, combine } from "effector";

const $currentUser = createStore({
  id: 1,
  name: "Winnie Pooh",
});
const $users = createStore<User[]>([]);

// Filtered list
const $activeUsers = $users.map((users) => users.filter((user) => user.active));

// Computed value
const $totalUsersCount = $users.map((users) => users.length);
const $activeUsersCount = $activeUsers.map((users) => users.length);

// Combining multiple stores
const $friendsList = combine($users, $currentUser, (users, currentUser) =>
  users.filter((user) => user.friendIds.includes(currentUser.id)),
);
```

We also used the combine method here, which allows us to combine values from multiple stores into one.<br/>
You can also combine stores into an object:

```ts
import { combine } from "effector";

const $form = combine({
  name: $name,
  age: $age,
  city: $city,
});

// or with additional transformation
const $formValidation = combine($name, $age, (name, age) => ({
  isValid: name.length > 0 && age >= 18,
  errors: {
    name: name.length === 0 ? "Required" : null,
    age: age < 18 ? "Must be 18+" : null,
  },
}));
```

> INFO Important note: 
>
> Derived stores update automatically when source stores change. You **don't** need to manually synchronize their values.

### Resetting State

You can reset store to default state via `reset` method:

```ts
const formSubmitted = createEvent();
const formReset = createEvent();

const $form = createStore({ email: "", password: "" })
  // Clear form on submit and on explicit reset too
  .reset(formSubmitted, formReset)
  // or
  .reset([formSubmitted, formReset]);
```

### `undefined` Values

By default, effector skips updates with undefined value. This is done so that you don't have to return anything from reducers if store update is not required:

```ts
const $store = createStore(0).on(event, (_, newValue) => {
  if (newValue % 2 === 0) {
    return;
  }

  return newValue;
});
```

> WARNING Attention!: 
>
> This behavior will be disabled in the future!
> Practice has shown that it would be better to simply return the previous store value.

If you need to use `undefined` as a valid value, you need to explicitly specify it using `skipVoid: false` when creating the store:

```ts
import { createStore, createEvent } from "effector";

const setVoidValue = createEvent<number>();

// ❌ undefined will be skipped
const $store = createStore(13).on(setVoidValue, (_, voidValue) => voidValue);

// ✅ undefined allowed as values
const $store = createStore(13, {
  skipVoid: false,
}).on(setVoidValue, (_, voidValue) => voidValue);

setVoidValue(null);
```

> TIP null instead of undefined: 
>
> You can use `null` instead of `undefined` for missing values.

Full API reference for store


# TypeScript in Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## TypeScript in effector

Effector provides first-class TypeScript support out of the box, giving you reliable typing and excellent development experience when working with the library. In this section, we'll look at both basic typing concepts and advanced techniques for working with types in effector.

### Typing Events

Events in Effector can be typed by passing a type to the generic function. However, if nothing is passed, the event will have the type `EventCallable<void>`:

```ts
import { createEvent } from "effector";

// Event without parameters
const clicked = createEvent();
// EventCallable<void>

// Event with parameter
const userNameChanged = createEvent<string>();
// EventCallable<string>

// Event with complex parameter
const formSubmitted = createEvent<{
  username: string;
  password: string;
}>();
// EventCallable<{ username: string; password: string; }>
```

#### Event Types

In Effector, events can have several types, where `T` is the stored value type:

* `EventCallable<T>` - an event that can be called.
* `Event<T>` - a derived event that cannot be called manually.

#### Typing Event Methods

##### event.prepend

To add types to events created using event.prepend, you need to add the type either in the prepend function argument or as a generic:

```ts
const message = createEvent<string>();

const userMessage = message.prepend((text: string) => text);
// userMessage has type EventCallable<string>

const warningMessage = message.prepend<string>((warnMessage) => warnMessage);
// warningMessage has type EventCallable<string>
```

### Typing Stores

Stores can also be typed by passing a type to the generic function, or by specifying a default value during initialization, then TypeScript will infer the type from this value:

```ts
import { createStore } from "effector";

// Basic store with primitive value
// StoreWritable<number>
const $counter = createStore(0);

// Store with complex object type
interface User {
  id: number;
  name: string;
  role: "admin" | "user";
}

// StoreWritable<User>
const $user = createStore<User>({
  id: 1,
  name: "Bob",
  role: "user",
});

// Store<string>
const $userNameAndRole = $user.map((user) => `User name and role: ${user.name} and ${user.role}`);
```

#### Store Types

In Effector, there are two types of stores, where T is the stored value type:

* `Store<T>` - derived store type that cannot have new data written to it.
* `StoreWritable<T>` - store type that can have new data written using on or sample.

### Typing Effects

In normal usage, TypeScript will infer types based on the function's return result and its arguments.
However, `createEffect` supports typing of input parameters, return result, and errors through generics:

<Tabs>
  <TabItem label="Common usage">

```ts
import { createEffect } from "effector";

// Base effect
// Effect<string, User, Error>
const fetchUserFx = createEffect(async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  const result = await response.json();

  return result as User;
});
```

  </TabItem>

  <TabItem label="With generics">

```ts
import { createEffect } from "effector";

// Base effect
// Effect<string, User, Error>
const fetchUserFx = createEffect<string, User>(async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  const result = await response.json();

  return result;
});
```

  </TabItem>
</Tabs>

#### Typing Handler Function Outside Effect

If the handler function is defined outside the effect, you'll need to pass that function's type:

```ts
const sendMessage = async (params: { text: string }) => {
  // ...
  return "ok";
};

const sendMessageFx = createEffect<typeof sendMessage, AxiosError>(sendMessage);
// => Effect<{text: string}, string, AxiosError>
```

#### Custom Effect Errors

Some code may only throw certain types of exceptions. In effects, the third generic `Fail` is used to describe error types:

```ts
// Define API error types
interface ApiError {
  code: number;
  message: string;
}

// Create typed effect
const fetchUserFx = createEffect<string, User, ApiError>(async (userId) => {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    throw {
      code: response.status,
      message: "Failed to fetch user",
    } as ApiError;
  }

  return response.json();
});
```

### Typing Methods

#### `sample`

##### Typing `filter`

If you need to get a specific type, you'll need to manually specify the expected type, which can be done using [type predicates](https://www.typescriptlang.org/docs/handbook/advanced-types.html#using-type-predicates):

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };

const message = createEvent<UserMessage | WarnMessage>();
const userMessage = createEvent<UserMessage>();

sample({
  clock: message,
  filter: (msg): msg is UserMessage => msg.kind === "user",
  target: userMessage,
});
```

If you need to check for data existence in `filter`, you can simply pass `Boolean`:

```ts
import { createEvent, createStore, sample } from "effector";

interface User {
  id: string;
  name: string;
  email: string;
}

// Events
const formSubmitted = createEvent();
const userDataSaved = createEvent<User>();

// States
const $currentUser = createStore<User | null>(null);

// On form submit, send data only if user exists
sample({
  clock: formSubmitted,
  source: $currentUser,
  filter: Boolean, // filter out null
  target: userDataSaved,
});

// Now userDataSaved will only receive existing user data
```

##### Typing `filter` and `fn`

As mentioned above, using type predicates in `filter` will work correctly and the correct type will reach the `target`.
However, this mechanism won't work as needed when using `filter` and `fn` together. In this case, you'll need to manually specify the data type of `filter` parameters and add type predicates. This happens because TypeScript cannot correctly infer the type in `fn` after `filter` if the type isn't explicitly specified. This is a limitation of TypeScript's type system.

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };
type Message = UserMessage | WarnMessage;

const message = createEvent<Message>();
const userText = createEvent<string>();

sample({
  clock: message,
  filter: (msg: Message): msg is UserMessage => msg.kind === "user",
  fn: (msg) => msg.text,
  target: userText,
});

// userMessage has type Event<string>
```

> TIP It got smarter!: 
>
> Starting from TypeScript version >= 5.5, you don't need to write type predicates, just specify the argument type and TypeScript will understand what needs to be inferred:
> `filter: (msg: Message) => msg.kind === "user"`

#### attach

To allow TypeScript to infer the types of the created effect, you can add a type to the first argument of `mapParams`, which will become the `Params` generic of the result:

```ts
const sendTextFx = createEffect<{ message: string }, "ok">(() => {
  // ...

  return "ok";
});

const sendWarningFx = attach({
  effect: sendTextFx,
  mapParams: (warningMessage: string) => ({ message: warningMessage }),
});
// sendWarningFx has type Effect<{message: string}, 'ok'>
```

#### split

<Tabs>
  <TabItem label="Before TS 5.5">

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };

const message = createEvent<UserMessage | WarnMessage>();

const { userMessage, warnMessage } = split(message, {
  userMessage: (msg): msg is UserMessage => msg.kind === "user",
  warnMessage: (msg): msg is WarnMessage => msg.kind === "warn",
});
// userMessage имеет тип Event<UserMessage>
// warnMessage имеет тип Event<WarnMessage>
```

  </TabItem>

  <TabItem label="After TS 5.5">

```ts
type UserMessage = { kind: "user"; text: string };
type WarnMessage = { kind: "warn"; warn: string };

const message = createEvent<UserMessage | WarnMessage>();

const { userMessage, warnMessage } = split(message, {
  userMessage: (msg) => msg.kind === "user",
  warnMessage: (msg) => msg.kind === "warn",
});
// userMessage имеет тип Event<UserMessage>
// warnMessage имеет тип Event<WarnMessage>
```

  </TabItem>
</Tabs>

#### `createApi`

To allow TypeScript to infer types of created events, adding a type to second argument of given reducers

```typescript
const $count = createStore(0);

const { add, sub } = createApi($count, {
  add: (x, add: number) => x + add,
  sub: (x, sub: number) => x - sub,
});

// add has type Event<number>
// sub has type Event<number>
```

#### `is`

`is` methods can help to infer a unit type (thereby `is` methods acts as [TypeScript type guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types)) which can help to write strongly-typed helper functions

```typescript
export function getUnitType(unit: unknown) {
  if (is.event(unit)) {
    // here unit has Event<any> type
    return "event";
  }
  if (is.effect(unit)) {
    // here unit has Effect<any, any> type
    return "effect";
  }
  if (is.store(unit)) {
    // here unit has Store<any> type
    return "store";
  }
}
```

#### `merge`

When we wanna merge events we can get their union types:

```ts
import { createEvent, merge } from "effector";

const firstEvent = createEvent<string>();
const secondEvent = createEvent<number>();

const merged = merge([firstEvent, secondEvent]);
// Event<string | number>

// You can also combine events with the same types
const buttonClicked = createEvent<MouseEvent>();
const linkClicked = createEvent<MouseEvent>();

const anyClick = merge([buttonClicked, linkClicked]);
// Event<MouseEvent>
```

`merge` accepts generic, where you can use what type do you expect from events:

```ts
import { createEvent, merge } from "effector";

const firstEvent = createEvent<string>();
const secondEvent = createEvent<number>();

const merged = merge<number>([firstEvent, secondEvent]);
//                                ^
// Type 'EventCallable<string>' is not assignable to type 'Unit<number>'.
```

### Type Utilities

Effector provides a set of utility types for working with unit types:

#### UnitValue

The `UnitValue` type is used to extract the data type from units:

```ts
import { UnitValue, createEffect, createStore, createEvent } from "effector";

const event = createEvent<{ id: string; name?: string } | { id: string }>();
type UnitEventType = UnitValue<typeof event>;
// {id: string; name?: string | undefined} | {id: string}

const $store = createStore([false, true]);
type UnitStoreType = UnitValue<typeof $store>;
// boolean[]

const effect = createEffect<{ token: string }, any, string>(() => {});
type UnitEffectType = UnitValue<typeof effect>;
// {token: string}

const scope = fork();
type UnitScopeType = UnitValue<typeof scope>;
// any
```

#### StoreValue

`StoreValue` is essentially similar to `UnitValue`, but works only with stores:

```ts
import { createStore, StoreValue } from "effector";

const $store = createStore(true);

type StoreValueType = StoreValue<typeof $store>;
// boolean
```

#### EventPayload

Extracts the data type from events.
Similar to `UnitValue`, but only for events:

```ts
import { createEvent, EventPayload } from "effector";

const event = createEvent<{ id: string }>();

type EventPayloadType = EventPayload<typeof event>;
// {id: string}
```

#### EffectParams

Takes an effect type as a generic parameter, allows getting the parameter type of an effect.

```ts
import { createEffect, EffectParams } from "effector";

const fx = createEffect<
  { id: string },
  { name: string; isAdmin: boolean },
  { statusText: string; status: number }
>(() => {
  // ...
  return { name: "Alice", isAdmin: false };
});

type EffectParamsType = EffectParams<typeof fx>;
// {id: string}
```

#### EffectResult

Takes an effect type as a generic parameter, allows getting the return value type of an effect.

```ts
import { createEffect, EffectResult } from "effector";

const fx = createEffect<
  { id: string },
  { name: string; isAdmin: boolean },
  { statusText: string; status: number }
>(() => ({ name: "Alice", isAdmin: false }));

type EffectResultType = EffectResult<typeof fx>;
// {name: string; isAdmin: boolean}
```

#### EffectError

Takes an effect type as a generic parameter, allows getting the error type of an effect.

```ts
import { createEffect, EffectError } from "effector";

const fx = createEffect<
  { id: string },
  { name: string; isAdmin: boolean },
  { statusText: string; status: number }
>(() => ({ name: "Alice", isAdmin: false }));

type EffectErrorType = EffectError<typeof fx>;
// {statusText: string; status: number}
```


# Unit Composition

## Unit Composition in Effector

Effector has two powerful methods for connecting units together: `sample` and `attach`. While they may seem similar, each has its own characteristics and use cases.

### Sample: Connecting Data and Events

`sample` is a universal method for connecting units. Its main task is to take data from one place `source` and pass it to another place `target` when a specific trigger `clock` fires.

The general pattern of the sample method works as follows:

1. Trigger when `clock` is called
2. Take data from `source`
3. `filter` the data, if everything is correct, return `true` and continue the chain, otherwise `false`
4. Transform the data using `fn`
5. Pass the data to `target`

#### Basic Usage of Sample

```ts
import { createStore, createEvent, sample, createEffect } from "effector";

const buttonClicked = createEvent();

const $userName = createStore("Bob");

const fetchUserFx = createEffect((userName) => {
  // logic
});

// Get current name when button is clicked
sample({
  clock: buttonClicked,
  source: $userName,
  target: fetchUserFx,
});
```

> TIP Versatility of sample: 
>
> If you don't specify `clock`, then `source` can also serve as the trigger. You must use at least one of these properties in the argument!

```ts
import { createStore, sample } from "effector";

const $currentUser = createStore({ name: "Bob", age: 25 });

// creates a derived store that updates when source changes
const $userAge = sample({
  source: $currentUser,
  fn: (user) => user.age,
});
// equivalent to
const $userAgeViaMap = $currentUser.map((currentUser) => currentUser.age);
```

As you can see, the sample method is very flexible and can be used in various scenarios:

* When you need to take data from a store at the moment of an event
* For data transformation before sending
* For conditional processing via filter
* For synchronizing multiple data sources
* Sequential chain of unit launches

#### Data Filtering

You may need to start a call chain when some conditions occurs. For such situations, the `sample` method allows filtering data using the `filter` parameter:

```ts
import { createEvent, createStore, sample, createEffect } from "effector";

type UserFormData = {
  username: string;
  age: number;
};

const submitForm = createEvent();

const $formData = createStore<UserFormData>({ username: "", age: 0 });

const submitToServerFx = createEffect((formData: UserFormData) => {
  // logic
});

sample({
  clock: submitForm,
  source: $formData,
  filter: (form) => form.age >= 18 && form.username.length > 0,
  target: submitToServerFx,
});

submitForm();
```

When `submitForm` is called, we take data from `source`, check conditions in `filter`, if the check passes successfully, we return `true` and call `target`, otherwise `false` and do nothing more.

> WARNING Important information: 
>
> The `fn` and `filter` functions must be pure functions! A pure function is a function that always returns the same result for the same input data and produces no side effects (doesn't change data outside its scope).

#### Data Transformation

Often you need to not just pass data, but also transform it. The `fn` parameter is used for this:

```ts
import { createEvent, createStore, sample } from "effector";

const buttonClicked = createEvent();
const $user = createStore({ name: "Bob", age: 25 });
const $userInfo = createStore("");

sample({
  clock: buttonClicked,
  source: $user,
  fn: (user) => `${user.name} is ${user.age} years old`,
  target: $userInfo,
});
```

#### Multiple Data Sources

You can use multiple stores as data sources:

```ts
import { createEvent, createStore, sample, createEffect } from "effector";

type SubmitSearch = {
  query: string;
  filters: Array<string>;
};

const submitSearchFx = createEffect((params: SubmitSearch) => {
  /// logic
});

const searchClicked = createEvent();

const $searchQuery = createStore("");
const $filters = createStore<string[]>([]);

sample({
  clock: searchClicked,
  source: {
    query: $searchQuery,
    filters: $filters,
  },
  target: submitSearchFx,
});
```

#### Multiple triggers for sample

`sample` allows you to use an array of events as a `clock`, which is very convenient when we need to process several different triggers in the same way. This helps avoid code duplication and makes the logic more centralized:

```ts
import { createEvent, createStore, sample } from "effector";

// Events for different user actions
const saveButtonClicked = createEvent();
const ctrlSPressed = createEvent();
const autoSaveTriggered = createEvent();

// Common data storage
const $formData = createStore({ text: "" });

// Save effect
const saveDocumentFx = createEffect((data: { text: string }) => {
  // Save logic
});

// Single point for document saving that triggers from any source
sample({
  // All these events will trigger saving
  clock: [saveButtonClicked, ctrlSPressed, autoSaveTriggered],
  source: $formData,
  target: saveDocumentFx,
});
```

#### Array of targets in sample

`sample` allows you to pass an array of units to `target`, which is useful when you need to send the same data to multiple destinations simultaneously. You can pass an array of any units - events, effects, or stores to `target`.

```ts
import { createEvent, createStore, createEffect, sample } from "effector";

// Create units where data will be directed
const userDataReceived = createEvent<User>();
const $lastUserData = createStore<User | null>(null);
const saveUserFx = createEffect<User, void>((user) => {
  // Save user
});
const logUserFx = createEffect<User, void>((user) => {
  // Log user actions
});

const userUpdated = createEvent<User>();

// When user is updated:
// - Save data through saveUserFx
// - Send to logging system through logUserFx
// - Update store $lastUserData
// - Trigger userDataReceived event
sample({
  clock: userUpdated,
  target: [saveUserFx, logUserFx, $lastUserData, userDataReceived],
});
```

Key points:

* All units in target must be type-compatible with data from `source`/`clock`
* The execution order of targets is guaranteed - they will be called in the order written
* You can combine different types of units in the target array

#### Return Value of Sample

`sample` returns a unit whose type depends on the configuration:

##### With Target

If `target` is specified, `sample` will return that same `target`:

```ts
const $store = createStore(0);
const submitted = createEvent();
const sendData = createEvent<number>();

// result will have type EventCallable<number>
const result = sample({
  clock: submitted,
  source: $store,
  target: sendData,
});
```

##### Without Target

<!-- todo add link to Manage stores page about derived stores -->

When `target` is not specified, the return value type depends on the parameters passed.<br/>
If `filter` is **NOT** specified, and both `clock` and `source` **are stores**, then the result will be a **derived store** with the data type from `source`.

```ts
import { createStore, sample } from "effector";

const $store = createStore("");
const $secondStore = createStore(0);

const $derived = sample({
  clock: $secondStore,
  source: $store,
});
// $derived will be Store<string>

const $secondDerived = sample({
  clock: $secondStore,
  source: $store,
  fn: () => false,
});
// $secondDerived will be Store<boolean>
```

If `fn` is used, the return value type will correspond to the function's result.

<!-- todo add link to Events page about derived events -->

In other cases, the return value will be a **derived event** with a data type depending on `source`, which cannot be called manually but can be subscribed to!

> INFO sample typing: 
>
> The `sample` method is fully typed and accepts types depending on the parameters passed!

```ts
import { createStore, createEvent, sample } from "effector";

const $store = createStore(0);

const submitted = createEvent<string>();

const event = sample({
  clock: submitted,
  source: $store,
});
// event has type Event<number>

const secondSampleEvent = sample({
  clock: submitted,
  source: $store,
  fn: () => true,
});
// Event<true>
```

#### Practical Example

Let's look at case, when we select user id and we want to check if user is admin, and based on selected user id create new derived store with data about user:

```ts
import { createStore, createEvent, sample } from "effector";

type User = {
  id: number;
  role: string;
};

const userSelected = createEvent<number>();

const $users = createStore<User[]>([]);

// Create derived store, which will be keep selectedUser
const $selectedUser = sample({
  clock: userSelected,
  source: $users,
  fn: (users, id) => users.find((user) => user.id === id) || null,
});
// $selectedUser has type Store<User | null>

// Create derived event, which will fire only for admins
// if selected user is admin, then event will fire instantly
const adminSelected = sample({
  clock: userSelected,
  source: $users,
  // will worked only if user found and he is admin
  filter: (users, id) => !!users.find((user) => user.id === id && user.role === "admin"),
  fn: (users, id) => users[id],
});
// adminSelected has type Event<User>

userSelected(2);
```

Full API for&#x20;

### Attach: Effect Specialization

`attach` is a method for creating new effects based on existing ones, with access to data from stores. This is especially useful when you need to:

* Add context to an effect
* Reuse effect logic with different parameters
* Encapsulate store access

```ts
import { attach, createEffect, createStore } from "effector";

type SendMessageParams = { text: string; token: string };

// Base effect for sending data
const baseSendMessageFx = createEffect<SendMessageParams, void>(async ({ text, token }) => {
  await fetch("/api/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
});

// Store with authentication token
const $authToken = createStore("default-token");

// Create a specialized effect that automatically uses the token
const sendMessageFx = attach({
  effect: baseSendMessageFx,
  source: $authToken,
  mapParams: (text: string, token) => ({
    text,
    token,
  }),
});

// Now you can call the effect with just the message text
sendMessageFx("Hello!"); // token will be added automatically
```

It's very convenient to use `attach` for logic reuse:

```ts
const fetchDataFx = createEffect<{ endpoint: string; token: string }, any>();

// Create specialized effects for different endpoints
const fetchUsersFx = attach({
  effect: fetchDataFx,
  mapParams: (_, token) => ({
    endpoint: "/users",
    token,
  }),
  source: $authToken,
});

const fetchProductsFx = attach({
  effect: fetchDataFx,
  mapParams: (_, token) => ({
    endpoint: "/products",
    token,
  }),
  source: $authToken,
});
```

Full API for&#x20;


# Asynchronous Operations in effector

## Asynchronous Operations in effector using Effects

Asynchronous operations are a fundamental part of any modern application, and Effector provides convenient tools to handle them. Using effects (createEffect), you can build predictable logic for working with asynchronous data.

> TIP Effect naming: 
>
> The Effector team recommends using the `Fx` postfix for naming effects. This is not a mandatory requirement but a usage recommendation, read more.

### What are Effects?

Effects are Effector's tool for working with external APIs or side effects in your application, for example:

* Asynchronous server requests
* Working with `localStorage`/`indexedDB`
* Any operations that might fail or take time to complete

> TIP good to know: 
>
> The effect can be either async or sync.

### Main Effect States

Effector automatically tracks the state of effect execution:

* `pending` — is a store that indicates whether the effect is running, useful for displaying loading states
* `done` — is an event that triggers on successful completion
* `fail` — is an event that triggers on error
* `finally` — is an event that triggers when the effect is completed, either with success or error

You can find the complete effect API here.

> WARNING Important note: 
>
> Don't call events or modify effect states manually, effector will handle this automatically.

```ts
const fetchUserFx = createEffect(() => {
  /* external api call */
});

fetchUserFx.pending.watch((isPending) => console.log("Pending:", isPending));

fetchUserFx.done.watch(({ params, result }) => console.log(`Fetched user ${params}:`, result));

fetchUserFx.finally.watch((value) => {
  if (value.status === "done") {
    console.log("fetchUserFx resolved ", value.result);
  } else {
    console.log("fetchUserFx rejected ", value.error);
  }
});

fetchUserFx.fail.watch(({ params, error }) =>
  console.error(`Failed to fetch user ${params}:`, error),
);

fetchUserFx();
```

### Binding Effects to Events and Stores

#### Updating Store Data When Effect Completes

Let's say we want effector to take the data returned by the effect when it completes and update the store with new data. This can be done quite easily using effect events:

```ts
import { createStore, createEffect } from "effector";

const fetchUserNameFx = createEffect(async (userId: string) => {
  const userData = await fetch(`/api/users/${userId}`);
  return userData.name;
});

const $error = createStore<string | null>(null);
const $userName = createStore("");
const $isLoading = fetchUserNameFx.pending.map((isPending) => isPending);

$error.reset(fetchUserNameFx.done);

$userName.on(fetchUserNameFx.done, (_, { params, result }) => result);
$error.on(fetchUserNameFx.fail, (_, { params, error }) => error.message);
// or 🔃
$userName.on(fetchUserNameFx.doneData, (_, result) => result);
$error.on(fetchUserNameFx.failData, (_, error) => error.message);

$isLoading.watch((isLoading) => console.log("Is loading:", isLoading));
```

`doneData` and `failData` are events that are identical to `done` and `fail` respectively, except that they only receive result and error in their parameters.

#### Triggering Effects on Event

In most cases, you'll want to trigger an effect when some event occurs, like form submission or button click. In such cases, the `sample` method will help you, which will call target when clock triggers.

> INFO `sample` function: 
>
> The sample function is a key function for connecting stores, effects, and events. It allows you to flexibly and easily configure the reactive logic of your application.
>
> <!-- todo add link to page about sample -->

```ts
import { createEvent, sample, createEffect } from "effector";

const userLoginFx = createEffect(() => {
  // some logic
});

// Event for data loading
const formSubmitted = createEvent();

// Connect event with effect
sample({
  clock: formSubmitted, // When this triggers
  target: userLoginFx, // Run this
});

// somewhere in application
formSubmitted();
```

### Error handling in Effects

Effects in Effector provide robust error handling capabilities. When an error occurs during effect execution, it's automatically caught and processed through the `fail` event.

To type an error in an effect you need to pass a specific type to the generic of the `createEffect` function:

```ts
import { createEffect } from "effector";

class CustomError extends Error {
  // implementation
}

const effect = createEffect<Params, ReturnValue, CustomError>(() => {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    // You can throw custom errors that will be caught by .fail handler
    throw new CustomError(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
});
```

If you throw an error of a different type, the typescript will show the error to you.

### Practical Example

```ts
import { createStore, createEvent, createEffect, sample } from "effector";

// Effect for data loading
const fetchUserFx = createEffect(async (id: number) => {
  const response = await fetch(`/api/user/${id}`);

  if (!response.ok) {
    // you can modify the error before it reaches fail/failData
    throw new Error("User not found");
  }

  return response.json();
});

const setId = createEvent<number>();
const submit = createEvent();

const $id = createStore(0);
const $user = createStore<{ name: string } | null>(null);
const $error = createStore<string | null>(null);
const $isLoading = fetchUserFx.pending;

$id.on(setId, (_, id) => id);
$user.on(fetchUserFx.doneData, (_, user) => user);
$error.on(fetchUserFx.fail, (_, { error }) => error.message);
$error.reset(fetchUserFx.done);

// Loading logic: run fetchUserFx on submit
sample({
  clock: submit,
  source: $id,
  target: fetchUserFx,
});

// Usage
setId(1); // Set ID
submit(); // Load data
```

<!-- todo You can read about how to test effects on the [Testing page](/en/essentials/testing). -->

Full API reference for effects


# Computation priority

For sure, you've noticed that function should be pure... or watch if there is a place
for side effect. We will talk about this in the current section – **Computation priority**

A real example of queue priority — people waiting for medical treatment in a hospital, extreme emergency cases will have
the highest priority and move to the start of the queue and less significant to the end.

Computation priority allows us to have side effects, and it's one of the main reasons to create this concept:

* Letting pure functions to execute first.
* Side effects can follow a consistent state of the application.

Actually, pure computation cannot be observed out of the scope, therefore, the definition of ***pure computation*** used
in this library gives us an opportunity to optimize grouping.

Priority:

[Source code](https://github.com/effector/effector/blob/master/src/effector/kernel.ts#L169)

```
1. child -> forward
2. pure -> map, on
3. sampler -> sample, guard, combine
4. effect -> watch, effect handler
```

> Whenever you allow side effects in pure computations, the library will work by the worst scenario. Thereby, increasing non-consistency of application and breaking pure computations. Don't ignore that.

Let's consider prioritizing in the example below.

```js
let count = 0;
const fx = createEffect(() => {
  // side effect 1
  count += 1;
});

fx.done.watch(() => {
  // side effect 1 already executed
  console.log("expect count to be 1", count === 1);
  // side effect 2
  count += 1;
});

fx();
// side effect 1 already executed
// side effect 2 already executed as well
// that's what we expected to happen
// that's watchmen effect
console.log("expect count to be 2", count === 2);
// example which violated that agreement: setState in react
// which defer any side effect long after setState call itself
```

Try it

> INFO: 
>
> Whenever a library notices side effect in a pure function it moves it to the end of the [**priority queue**](https://en.wikipedia.org/wiki/Priority_queue).

We hope that this information cleared some things on how the library works.


# Glossary

Glossary of basic terms in effector.

### Event

*Event* is a function you can subscribe to. It can be an intention to change the store, indication of something happening in the application, a command to be executed, aggregated analytics trigger and so on.

Event in api documentation

### Store

*Store* is an object that holds state.
There can be multiple stores.

Store in api documentation

### Effect

*Effect* is a container for (possibly async) side effects.
It exposes special events and stores, such as `.pending`, `.done`, `.fail`, `.finally`, etc...

It can be safely used in place of the original async function.

It returns promise with the result of a function call.

The only requirement for the function:

* **Must** have zero or one argument

Effect in api documentation

### Domain

*Domain* is a namespace for your events, stores and effects.

Domains are notified when events, stores, effects, or nested domains are created via `.onCreateEvent`, `.onCreateStore`, `.onCreateEffect`, `.onCreateDomain` methods.

It is useful for logging or other side effects.

Domain in api documentation

### Unit

Data type used to describe business logic of applications. Most of the effector methods deal with unit processing.
There are five unit types: Store, Event, Effect, Domain and Scope.

### Common unit

Common units can be used to trigger updates of other units. There are three common unit types: Store, Event and Effect. **When a method accepts units, it means that it accepts events, effects, and stores** as a source of reactive updates.

### Purity

Most of the functions in api must not call other events or effects: it's easier to reason about application's data flow when imperative triggers are grouped inside watchers and effect handlers rather than spread across entire business logic.

**Correct**, imperative:

```js
import { createStore, createEvent } from "effector";

const submitLoginSize = createEvent();

const $login = createStore("guest");
const $loginSize = $login.map((login) => login.length);

$loginSize.watch((size) => {
  submitLoginSize(size);
});
```

Try it

Reference: Store.map, Store.watch

**Better**, declarative:

```js
import { createStore, createEvent, sample } from "effector";

const submitLoginSize = createEvent();

const $login = createStore("guest");
const $loginSize = $login.map((login) => login.length);

sample({
  clock: $loginSize,
  target: submitLoginSize,
});
```

Try it

Reference: sample

**Incorrect**:

```js
import { createStore, createEvent } from "effector";

const submitLoginSize = createEvent();

const $login = createStore("guest");
const $loginSize = $login.map((login) => {
  // no! use `sample` instead
  submitLoginSize(login.length);
  return login.length;
});
```

### Reducer

```typescript
type StoreReducer<State, E> = (state: State, payload: E) => State | void;
type EventOrEffectReducer<T, E> = (state: T, payload: E) => T;
```

*Reducer* calculates a new state given the previous state and an event's payload. For stores, if reducer returns undefined or the same state (`===`), then there will be no update for a given store.

### Watcher

```typescript
type Watcher<T> = (update: T) => any;
```

*Watcher* is used for **side effects**. Accepted by Event.watch, Store.watch and Domain.onCreate\* hooks. Return value of a watcher is ignored.

### Subscription

```ts
import { type Subscription } from "effector";
```

Looks like:

```typescript
type Subscription = {
  (): void;
  unsubscribe(): void;
};
```

**Function**, returned by forward, Event.watch, Store.watch and some other methods. Used for cancelling a subscription. After the first call, subscription will do nothing.

> WARNING: 
>
> **Managing subscriptions manually distracts from business logic improvements.** <br/><br/>
> Effector provides a wide range of features to minimize the need to remove subscriptions. This sets it apart from most other reactive libraries.

[effect]: /en/api/effector/Effect

[store]: /en/api/effector/Store

[event]: /en/api/effector/Event

[domain]: /en/api/effector/Domain

[scope]: /en/api/effector/Scope


# Prior Art

### Papers

* **Functional Pearl. Weaving a Web** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/weaver+zipper.pdf) *Ralf Hinze and Johan Jeuring*
* **A graph model of data and workflow provenance** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/A+graph+model+of+data+and+workflow+provenance.pdf) <br/> *Umut Acar, Peter Buneman, James Cheney, Jan Van den Bussche, Natalia Kwasnikowska and Stijn Vansummeren*
* **An Applicative Control-Flow Graph Based on Huet’s Zipper** [\[pdf\]](http://zero-bias-papers.s3-website-eu-west-1.amazonaws.com/zipcfg.pdf) <br/> *Norman Ramsey and Joao Dias*
* **Elm: Concurrent FRP for Functional GUIs** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/elm-concurrent-frp.pdf) <br/> *Evan Czaplicki*
* **Inductive Graphs and Functional Graph Algorithms** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Inductive+Graphs+and+Functional+Graph+Algorithms.pdf) <br/> *Martin Erwig*
* **Notes on Graph Algorithms Used in Optimizing Compilers** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Graph+Algorithms+Used+in+Optimizing+Compilers.pdf) <br/> *Carl D. Offner*
* **Backtracking, Interleaving, and Terminating Monad Transformers** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Backtracking%2C+Interleaving%2C+and+Terminating+Monad+Transformers.pdf) <br/> *Oleg Kiselyov, Chung-chieh Shan, Daniel P. Friedman and Amr Sabry*
* **Typed Tagless Final Interpreters** [\[pdf\]](https://zero-bias-papers.s3-eu-west-1.amazonaws.com/Typed+Tagless+Final+Interpreters.pdf) *Oleg Kiselyov*

### Books

* **Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions** [\[book\]](https://www.amazon.com/o/asin/0321200683/ref=nosim/enterpriseint-20), [\[messaging patterns overview\]](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) <br/> *Gregor Hohpe and Bobby Woolf*

### API

* [re-frame](https://github.com/day8/re-frame)
* [flux](https://facebook.github.io/flux/)
* [redux](https://redux.js.org/)
* [redux-act](https://github.com/pauldijou/redux-act)
* [most](https://github.com/cujojs/most)
* nodejs [events](https://nodejs.org/dist/latest-v12.x/docs/api/events.html#events_emitter_on_eventname_listener)


# SIDs

Effector is based on idea of atomic store. It means that any application does not have some centralized state controller or other entry point to collect all states in one place.

So, there is the question — how to distinguish units between different environments? For example, if we ran an application on the server and serialize its state to JSON, how do we know which part of the JSON should be filled in a particular store on the client?

Let's discuss how this problem solved by other state managers.

### Other state managers

#### Single store

In the state manager with single store (e.g. Redux), this problem does not exist at all. It is a single store, which can be serialized and deserialized without any additional information.

> INFO: 
>
> Actually, single store forces you to create unique names of each part of it implicitly. In any object you won't be able to create duplicate keys, so the path to store slice is a unique identifier of this slice.

```ts
// server.ts
import { createStore } from "single-store-state-manager";

function handlerRequest() {
  const store = createStore({ initialValue: null });

  return {
    // It is possible to just serialize the whole store
    state: JSON.stringify(store.getState()),
  };
}

// client.ts
import { createStore } from "single-store-state-manager";

// Let's assume that server put the state into the HTML
const serverState = readServerStateFromWindow();

const store = createStore({
  // Just parse the whole state and use it as client state
  initialValue: JSON.parse(serverState),
});
```

It's great that you do not need any additional tools for serialization and deserialization, but single store has a few problems:

* It does not support tree-shaking and code-splitting, you have to load the whole store anyway
* Because its architecture, it requires some additional tools for fixing performance (like `reselect`)
* It does not support any kind of micro-frontends and stuff which is getting bigger recently

#### Multi stores

Unfortunately, state managers that built around idea of multi stores do not solve this problem good. Some tools offer single store like solutions (MobX), some does not try to solve this issue at all (Recoil, Zustand).

> INFO: 
>
> E.g., the common pattern to solve serialization problem in MobX is [Root Store Pattern](https://dev.to/ivandotv/mobx-root-store-pattern-with-react-hooks-318d) which is destroying the whole idea of multi stores.

So, we are considering SSR as a first class citizen of modern web applications, and we are going to support code-splitting or micro-frontends.

### Unique identifiers for every store

Because of multi-store architecture, Effector requires a unique identifier for every store. It is a string that is used to distinguish stores between different environments. In Effector's world this kind of strings are called `sid`.

\:::tip TL;DR

`sid` is a unique identifier of a store. It is used to distinguish stores between different environments.

\:::

Let's add it to some stores:

```ts
const $name = createStore(null, { sid: "name" });
const $age = createStore(null, { sid: "age" });
```

Now, we can serialize and deserialize stores:

```ts
// server.ts
async function handlerRequest() {
  // create isolated instance of application
  const scope = fork();

  // fill some data to stores
  await allSettled($name, { scope, params: "Igor" });
  await allSettled($age, { scope, params: 25 });

  const state = JSON.serialize(serialize(scope));
  // -> { "name": "Igor", "age": 25 }

  return { state };
}
```

After this code, we have a serialized state of our application. It is a plain object with stores' values. We can put it back to the stores on the client:

```ts
// Let's assume that server put the state into the HTML
const serverState = readServerStateFromWindow();

const scope = fork({
  // Just parse the whole state and use it as client state
  values: JSON.parse(serverState),
});
```

Of course, it's a lot of boring jobs to write `sid` for every store. Effector provides a way to do it automatically with code transformation plugins.

#### Automatic way

For sure, manually creating unique ids is a quite boring job.

Thankfully, there are effector/babel-plugin and @effector/swc-plugin, which will provide SIDs automatically.

Because code-transpilation tools are working at the file level and are run before bundling happens – it is possible to make SIDs **stable** for every environment.

> TIP: 
>
> It is preferable to use effector/babel-plugin or @effector/swc-plugin instead of adding SIDs manually.

**Code example**

Notice, that there is no central point at all – any event of any "feature" can be triggered from anywhere and the rest of them will react accordingly.

```tsx
// src/features/first-name/model.ts
import { createStore, createEvent } from "effector";

export const firstNameChanged = createEvent<string>();
export const $firstName = createStore("");

$firstName.on(firstNameChanged, (_, firstName) => firstName);

// src/features/last-name/model.ts
import { createStore, createEvent } from "effector";

export const lastNameChanged = createEvent<string>();
export const $lastName = createStore("");

$lastName.on(lastNameChanged, (_, lastName) => lastName);

// src/features/form/model.ts
import { createEvent, sample, combine } from "effector";

import { $firstName, firstNameChanged } from "@/features/first-name";
import { $lastName, lastNameChanged } from "@/features/last-name";

export const formValuesFilled = createEvent<{ firstName: string; lastName: string }>();

export const $fullName = combine($firstName, $lastName, (first, last) => `${first} ${last}`);

sample({
  clock: formValuesFilled,
  fn: (values) => values.firstName,
  target: firstNameChanged,
});

sample({
  clock: formValuesFilled,
  fn: (values) => values.lastName,
  target: lastNameChanged,
});
```

If this application was a SPA or any other kind of client-only app — this would be the end of the article.

#### Serialization boundary

But in the case of Server Side Rendering, there is always a **serialization boundary** — a point, where all state is stringified, added to a server response, and sent to a client browser.

##### Problem

And at this point we **still need to collect the states of all stores of the app** somehow!

Also, after the client browser has received a page — we need to "hydrate" everything back: unpack these values at the client and add this "server-calculated" state to client-side instances of all stores.

##### Solution

This is a hard problem and to solve this, `effector` needs a way to connect the "server-calculated" state of some store with its client-side instance.

While **it could be** done by introducing a "root store" or something like that, which would manage store instances and their state for us, it would also bring to us all the downsides of this approach, e.g. much more complicated code-splitting – so this is still undesirable.

This is where SIDs will help us a lot.
Because SID is, by definition, the same for the same store in any environment, `effector` can simply rely on it to handle state serializing and hydration.

##### Example

This is a generic server-side rendering handler. The `renderHtmlToString` function is an implementation detail, which will depend on the framework you use.

```tsx
// src/server/handler.ts
import { fork, allSettled, serialize } from "effector";

import { formValuesFilled } from "@/features/form";

async function handleServerRequest(req) {
  const scope = fork(); // creates isolated container for application state

  // calculates the state of the app in this scope
  await allSettled(formValuesFilled, {
    scope,
    params: {
      firstName: "John",
      lastName: "Doe",
    },
  });

  // extract scope values to simple js object of `{[storeSid]: storeState}`
  const values = serialize(scope);

  const serializedState = JSON.stringify(values);

  return renderHtmlToString({
    scripts: [
      `
        <script>
            self._SERVER_STATE_ = ${serializedState}
        </script>
      `,
    ],
  });
}
```

Notice, that there are no direct imports of any stores of the application here.
The state is collected automatically and its serialized version already has all the information, which will be needed for hydration.

When the generated response arrives in a client browser, the server state must be hydrated to the client stores.
Thanks to SIDs, state hydration also works automatically:

```tsx
// src/client/index.ts
import { Provider } from "effector-react";

const serverState = window._SERVER_STATE_;

const clientScope = fork({
  values: serverState, // simply assign server state to scope
});

clientScope.getState($lastName); // "Doe"

hydrateApp(
  <Provider value={clientScope}>
    <App />
  </Provider>,
);
```

At this point, the state of all stores in the `clientScope` is the same, as it was at the server and there was **zero** manual work to do it.

### Unique SIDs

The stability of SIDs is ensured by the fact, that they are added to the code before any bundling has happened.

But since both `babel` and `swc` plugins are able "to see" contents of one file at each moment, there is a case, where SIDs will be stable, but **might not be unique**

To understand why, we need to dive a bit deeper into plugin internals.

Both `effector` plugins use the same approach to code transformation. Basically, they do two things:

1. Add `sid`-s and any other meta-information to raw Effector's factories calls, like `createStore` or `createEvent`.
2. Wrap any custom factories with `withFactory` helper that allows you to make `sid`-s of inner units unique as well.

#### Built-in unit factories

Let's take a look at the first case. For the following source code:

```ts
const $name = createStore(null);
```

The plugin will apply these transformations:

```ts
const $name = createStore(null, { sid: "j3l44" });
```

> TIP: 
>
> Plugins create `sid`-s as a hash of the location in the source code of a unit. It allows making `sid`-s unique and stable.

#### Custom factories

The second case is about custom factories. These are usually created to abstract away some common pattern.

Examples of custom factories:

* `createQuery`, `createMutation` from [`farfetched`](https://ff.effector.dev/)
* `debounce`, `throttle`, etc from [`patronum`](https://patronum.effector.dev/)
* Any custom factory in your code, e.g. factory of a [feature-flag entity](https://ff.effector.dev/recipes/feature_flags.html)

> TIP: 
>
> farfetched, patronum, @effector/reflect, atomic-router and @withease/factories are supported by default and doesn't need additional configuration

For this explanation, we will create a very simple factory:

```ts
// src/shared/lib/create-name/index.ts
export function createName() {
  const updateName = createEvent();
  const $name = createStore(null);

  $name.on(updateName, (_, nextName) => nextName);

  return { $name };
}

// src/feature/persons/model.ts
import { createName } from "@/shared/lib/create-name";

const personOne = createName();
const personTwo = createName();
```

First, the plugin will add `sid` to the inner stores of the factory

```ts
// src/shared/lib/create-name/index.ts
export function createName() {
  const updateName = createEvent();
  const $name = createStore(null, { sid: "ffds2" });

  $name.on(updateName, (_, nextName) => nextName);

  return { $name };
}

// src/feature/persons/model.ts
import { createName } from "@/shared/lib/create-name";

const personOne = createName();
const personTwo = createName();
```

But it's not enough, because we can create two instances of `createName` and internal stores of both of these instances will have the same SIDs!
These SIDs will be stable, but not unique.

To fix it we need to inform the plugin about our custom factory:

```json
// .babelrc
{
  "plugins": [
    [
      "effector/babel-plugin",
      {
        "factories": ["@/shared/lib/create-name"]
      }
    ]
  ]
}
```

Since the plugin "sees" only one file at a time, we need to provide it with the actual import path used in the module.

> TIP: 
>
> If relative import paths are used in the module, then the full path from the project root must be added to the `factories` list, so the plugin could resolve it.
>
> If absolute or aliased (like in the example) paths are used, then specifically this aliased path must be added to the `factories` list.
>
> Most of the popular ecosystem projects are already included in plugin's default settings.

Now the plugin knows about our factory and it will wrap `createName` with the internal `withFactory` helper:

```ts
// src/shared/lib/create-name/index.ts
export function createName() {
  const updateName = createEvent();
  const $name = createStore(null, { sid: "ffds2" });

  $name.on(updateName, (_, nextName) => nextName);

  return { $name };
}

// src/feature/persons/model.ts
import { withFactory } from "effector";
import { createName } from "@/shared/lib/create-name";

const personOne = withFactory({
  sid: "gre24f",
  fn: () => createName(),
});
const personTwo = withFactory({
  sid: "lpefgd",
  fn: () => createName(),
});
```

Thanks to that `sid`-s of inner units of a factory are also unique, and we can safely serialize and deserialize them.

```ts
personOne.$name.sid; // gre24f|ffds2
personTwo.$name.sid; // lpefgd|ffds2
```

#### How `withFactory` works

`withFactory` is a helper that allows to create unique `sid`-s for inner units. It is a function that accepts an object with `sid` and `fn` properties. `sid` is a unique identifier of the factory, and `fn` is a function that creates units.

Internal implementation of `withFactory` is pretty simple, it puts received `sid` to the global scope before `fn` call, and removes it after. Any Effector's creator function tries to read this global value while creating and append its value to the `sid` of the unit.

```ts
let globalSid = null;

function withFactory({ sid, fn }) {
  globalSid = sid;

  const result = fn();

  globalSid = null;

  return result;
}

function createStore(initialValue, { sid }) {
  if (globalSid) {
    sid = `${globalSid}|${sid}`;
  }

  // ...
}
```

Because of single thread nature of JavaScript, it is safe to use global variables for this purpose.

> INFO: 
>
> Of course, the real implementation is a bit more complicated, but the idea is the same.

### Summary

1. Any multi-store state manager requires unique identifiers for every store to distinguish them between different environments.
2. In Effector's world this kind of strings are called `sid`.
3. Plugins for code transformations add `sid`-s and meta-information to raw Effector's units creation, like `createStore` or `createEvent`.
4. Plugins for code transformations wrap custom factories with `withFactory` helper that allow to make `sid`-s of inner units unique as well.


# Best Practices and Recommendations in Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Best Practices in Effector

This section contains recommendations for effective work with Effector, based on community experience and the development team.

### Keep Stores Small

Unlike Redux, in Effector it's recommended to make stores as atomic as possible. Let's explore why this is important and what advantages it provides.

Large stores with multiple fields create several problems:

* Unnecessary re-renders: When any field changes, all components subscribed to the store update
* Heavy computations: Each update requires copying the entire object
* Unnecessary calculations: if you have derived stores depending on a large store, they will be recalculated

Atomic stores allow:

* Updating only what actually changed
* Subscribing only to needed data
* More efficient work with reactive dependencies

```ts
// ❌ Big store - any change triggers update of everything
const $bigStore = createStore({
profile: {/* many fields */},
settings: {/* many fields */},
posts: [ /* many posts */ ]
})

// ✅ Atomic stores - precise updates
const $userName = createStore('')
const $userEmail = createStore('')
const $posts = createStore<Post[]>([])
const $settings = createStore<Settings>({})

// Component subscribes only to needed data
const UserName = () => {
const name = useUnit($userName) // Updates only when name changes
return <h1>{name}</h1>
}
```

Rules for atomic stores:

* One store = one responsibility
* Store should be indivisible
* Stores can be combined using combine
* Store update should not affect other data

### Immer for Complex Objects

If your store contains nested structures, you can use the beloved Immer for simplified updates:

```ts
import { createStore } from "effector";
import { produce } from "immer";

const $users = createStore<User[]>([]);

$users.on(userUpdated, (users, updatedUser) =>
  produce(users, (draft) => {
    const user = draft.find((u) => u.id === updatedUser.id);
    if (user) {
      user.profile.settings.theme = updatedUser.profile.settings.theme;
    }
  }),
);
```

### Explicit Application Start

We recommend using explicit application start through special events to initialize your application.

Why it matters:

1. Full control over application lifecycle
2. Simplified testing
3. Predictable application behavior
4. Ability to control initialization order

```ts
export const appStarted = createEvent();
```

call event and subscribe on it:

<Tabs>
  <TabItem label="Without Scopes">

```ts
import { sample } from "effector";
import { scope } from "./app.js";

sample({
  clock: appStarted,
  target: initFx,
});

appStarted();
```

  </TabItem>
  <TabItem label="With Scopes">

```ts
import { sample, allSettled } from "effector";
import { scope } from "./app.js";

sample({
  clock: appStarted,
  target: initFx,
});

allSettled(appStarted, { scope });
```

  </TabItem>

</Tabs>

### Use `scope`

The effector team recommends always using Scope, even if your application doesn't use SSR.
This is necessary so that in the future you can easily migrate to working with `Scope`.

### `useUnit` Hook

Using the useUnit hook is the recommended way to work with units when using frameworks (📘React, 📗Vue, and 📘Solid).
Why you should use `useUnit`:

* Correct work with stores
* Optimized updates
* Automatic work with `Scope` – units know which scope they were called in

### Pure Functions

Use pure functions everywhere except effects for data processing, this ensures:

* Deterministic result
* No side effects
* Easier to test
* Easier to maintain

> TIP This is work for effects: 
>
> If your code can throw an error or can end in success/failure - that's an excellent place for effects.

### Debugging

We strongly recommend using the patronum library and the debug method.

```ts
import { createStore, createEvent, createEffect } from "effector";
import { debug } from "patronum/debug";

const event = createEvent();
const effect = createEffect().use((payload) => Promise.resolve("result" + payload));
const $store = createStore(0)
  .on(event, (state, value) => state + value)
  .on(effect.done, (state) => state * 10);

debug($store, event, effect);

event(5);
effect("demo");

// => [store] $store 1
// => [event] event 5
// => [store] $store 6
// => [effect] effect demo
// => [effect] effect.done {"params":"demo", "result": "resultdemo"}
// => [store] $store 60
```

However, nothing prevents you from using `.watch` or createWatch for debugging.

### Factories

Factory creation is a common pattern when working with effector, it makes it easier to use similar code. However, you may encounter a problem with identical sids that can interfere with SSR.

To avoid this problem, we recommend using the [@withease/factories](https://withease.effector.dev/factories/) library.

If your environment does not allow adding additional dependencies, you can create your own factory following these guidelines.

### Working with Network

For convenient effector work with network requests, you can use farfetched.
Farfetched provides:

* Mutations and queries
* Ready API for caching and more
* Framework independence

### Effector Utils

The Effector ecosystem includes the [patronum](https://patronum.effector.dev/operators/) library, which provides ready solutions for working with units:

* State management (`condition`, `status`, etc.)
* Working with time (`debounce`, `interval`, etc.)
* Predicate functions (`not`, `or`, `once`, etc.)

### Simplifying Complex Logic with `createAction`

[`effector-action`](https://github.com/AlexeyDuybo/effector-action) is a library that allows you to write imperative code for complex conditional logic while maintaining effector's declarative nature.

Moreover, `effector-action` helps make your code more readable:

<Tabs>
  <TabItem label="❌ Complex sample">

```ts
import { sample } from "effector";

sample({
  clock: formSubmitted,
  source: {
    form: $form,
    settings: $settings,
    user: $user,
  },
  filter: ({ form }) => form.isValid,
  fn: ({ form, settings, user }) => ({
    data: form,
    theme: settings.theme,
  }),
  target: submitFormFx,
});

sample({
  clock: formSubmitted,
  source: $form,
  filter: (form) => !form.isValid,
  target: showErrorMessageFx,
});

sample({
  clock: submitFormFx.done,
  source: $settings,
  filter: (settings) => settings.sendNotifications,
  target: sendNotificationFx,
});
```

  </TabItem>

<TabItem label="✅ With createAction">

```ts
import { createAction } from "effector-action";

const submitForm = createAction({
  source: {
    form: $form,
    settings: $settings,
    user: $user,
  },
  target: {
    submitFormFx,
    showErrorMessageFx,
    sendNotificationFx,
  },
  fn: (target, { form, settings, user }) => {
    if (!form.isValid) {
      target.showErrorMessageFx(form.errors);
      return;
    }

    target.submitFormFx({
      data: form,
      theme: settings.theme,
    });
  },
});

createAction(submitFormFx.done, {
  source: $settings,
  target: sendNotificationFx,
  fn: (sendNotification, settings) => {
    if (settings.sendNotifications) {
      sendNotification();
    }
  },
});

submitForm();
```

  </TabItem>
</Tabs>

### Naming

Use accepted naming conventions:

* For stores – prefix `$`
* For effects – postfix `fx`, this will help you distinguish your effects from events
* For events – no rules, however, we suggest naming events that directly trigger store updates as if they've already happened.

```ts
const updateUserNameFx = createEffect(() => {});

const userNameUpdated = createEvent();

const $userName = createStore("JS");

$userName.on(userNameUpdated, (_, newName) => newName);

userNameUpdated("TS");
```

> INFO Naming Convention: 
>
> The choice between prefix or postfix is mainly a matter of personal preference. This is necessary to improve the search experience in your IDE.

### Anti-patterns

#### Using watch for Logic

watch should only be used for debugging. For logic, use sample, guard, or effects.

<Tabs>
  <TabItem label="❌ Incorrect">

```ts
// logic in watch
$user.watch((user) => {
  localStorage.setItem("user", JSON.stringify(user));
  api.trackUserUpdate(user);
  someEvent(user.id);
});
```

  </TabItem>
  <TabItem label="✅ Correct">

```ts
// separate effects for side effects
const saveToStorageFx = createEffect((user: User) =>
  localStorage.setItem("user", JSON.stringify(user)),
);

const trackUpdateFx = createEffect((user: User) => api.trackUserUpdate(user));

// connect through sample
sample({
  clock: $user,
  target: [saveToStorageFx, trackUpdateFx],
});

// for events also use sample
sample({
  clock: $user,
  fn: (user) => user.id,
  target: someEvent,
});
```

</TabItem>
</Tabs>

#### Complex Nested samples

Avoid complex and nested chains of sample.

#### Abstract Names in Callbacks

Use meaningful names instead of abstract `value`, `data`, `item`.

<Tabs>
  <TabItem label="❌ Incorrect">

```ts
$users.on(userAdded, (state, payload) => [...state, payload]);

sample({
  clock: buttonClicked,
  source: $data,
  fn: (data) => data,
  target: someFx,
});
```

  </TabItem>
  <TabItem label="✅ Correct">

```ts
$users.on(userAdded, (users, newUser) => [...users, newUser]);

sample({
  clock: buttonClicked,
  source: $userData,
  fn: (userData) => userData,
  target: updateUserFx,
});
```

  </TabItem>
</Tabs>

#### Imperative Calls in Effects

Don't call events or effects imperatively inside other effects, instead use declarative style.

<Tabs>
  <TabItem label="❌ Incorrect">

```ts
const loginFx = createEffect(async (params) => {
  const user = await api.login(params);

  // imperative calls
  setUser(user);
  redirectFx("/dashboard");
  showNotification("Welcome!");

  return user;
});
```

  </TabItem>
  <TabItem label="✅ Correct">

```ts
const loginFx = createEffect((params) => api.login(params));
// Connect through sample
sample({
  clock: loginFx.doneData,
  target: [
    $user, // update store
    redirectToDashboardFx,
    showWelcomeNotificationFx,
  ],
});
```

 </TabItem>
</Tabs>

#### Using getState

Don't use `$store.getState` to get values. If you need to get data from some store, pass it there, for example in `source` in `sample`:

<Tabs>
  <TabItem label="❌ Incorrect">

```ts
const submitFormFx = createEffect((formData) => {
  // get values through getState
  const user = $user.getState();
  const settings = $settings.getState();

  return api.submit({
    ...formData,
    userId: user.id,
    theme: settings.theme,
  });
});
```

</TabItem>
  <TabItem label="✅ Correct">

```ts
// get values through parameters
const submitFormFx = createEffect(({ form, userId, theme }) => {});

// get all necessary data through sample
sample({
  clock: formSubmitted,
  source: {
    form: $form,
    user: $user,
    settings: $settings,
  },
  fn: ({ form, user, settings }) => ({
    form,
    userId: user.id,
    theme: settings.theme,
  }),
  target: submitFormFx,
});
```

  </TabItem>
</Tabs>

#### Business Logic in UI

Don't put your logic in UI elements, this is the main philosophy of effector and what effector tries to free you from, namely the dependency of logic on UI.

Brief summary of anti-patterns:

1. Don't use `watch` for logic, only for debugging
2. Avoid direct mutations in stores
3. Don't create complex nested `sample`, they're hard to read
4. Don't use large stores, use an atomic approach
5. Use meaningful parameter names, not abstract ones
6. Don't call events inside effects imperatively
7. Don't use `$store.getState` for work
8. Don't put logic in UI


# Migration guide

This guide covers the steps required to migrate to Effector 23 from a previous version.
Several features were declared deprecated in this release:

* `forward` and `guard` operators
* `greedy` option of `sample` was renamed into `batch`
* "derived" and "callable" unit types are officially separated now
* the ability to use `undefined` as a magic "skip" value in reducers

### Deprecation of `forward` and `guard`

Those operators are pretty old and lived through many releases of Effector.
But all of their use-cases are already covered by `sample` now, so it is their time to go. You will see a deprecation warning in console for every call of those operators in your code.

> TIP: 
>
> You can migrate from both of them by using the official [Effector's ESLint plugin](https://eslint.effector.dev/), which has `no-forward` and `no-guard` rules with built-in [auto-fix feature](https://eslint.org/docs/latest/use/command-line-interface#fix-problems).

### `greedy` to `batch`

The `sample` operator had `greedy` option to disable updates batching in rare edge-cases.
But the name "greedy" wasn't that obvious for the users, so it is renamed into `batch` and it's signature is reversed.

You will see a deprecation warning in console for every usage of `greedy` option in your code.

> TIP: 
>
> You can migrate from one to the other by simply running "Find and Replace" from `greedy: true` to `batch: false` in your favorite IDE.

### Separate types for derived and callable units

Derived units now fully separated from "callable/writable" ones:

* Main factories `createEvent` and `createStore` now return types `EventCallable` and `StoreWritable` (because you can call and write to these units at any moment).
* Methods and operators like `unit.map(...)` or `combine(...)` now return types `Event` and `Store`, which are "read-only" i.e. you can only use them as `clock` or `source`, but not as a `target`.
* `EventCallable` type is assignable to `Event`, but not the other way around, same for stores.
* There are also runtime exceptions for types mismatch.

Most likely you will not need to do anything, you will just get better types.

But you might have issues with external libraries, **which are not updated to Effector 23 yet**:

* Most of the libraries are just *accepting* units as clocks and sources – those cases are ok.
* If some operator from the external library is accepting some unit as a `target`, you still will see an good-old `Event` type in this case, so you will not have a type error here even if there is actually an issue.
* If some *factory* returns an event, which you are expected to call in your own code, then you will get a type error and you will need to typecast this event to `EventCallable`.

> TIP: 
>
> If you run into any of these cases, just create an issue in the repo of this library with a request to support Effector 23 version.
> Owners of the project will see relevant type errors in their own source code and tests, once they update Effector in their repo.

If you have these issues in your own custom factories or libraries, then you should already see a relevant type errors in the source code of your library.
Just replace `Event` with `EventCallable`, `Store` with `StoreWritable` or `Unit` with `UnitTargetable` everywhere it is relevant (i.e. you are going to call or write into these units somehow).

### Magic `undefined` skip is deprecated

There is an old feature in Effector: `undefined` is used as a "magic" value to skip updates in reducers in rare cases, e.g.

```ts
const $value = createStore(0).on(newValueReceived, (_oldValue, newValue) => newValue);
```

☝️ if `newValue` is `undefined`, then update will be skipped.

The idea of making each mapper and reducer work as a sort of `filterMap` was considered useful in early Effector, but is very rarely used properly, and is confusing and distracting, so it should be deprecated and removed.

To do so each and every store factory now supports special `skipVoid` configuration setting, which controls, how specifically store should handle `undefined` value. If set to `false` – store will use `undefined` as a value.
If set to `true` (deprecated), store will read `undefined` as a "skip update" command and will do nothing.

You will see a warning for each return of undefined in your mappers or reducers in your code, with a requirement to provide an explicit `skipVoid` setting on your store.

> TIP: 
>
> If you do want to skip store update in certain cases, then it is better to explicitly return previous state, when possible.

It is recommended to use `{skipVoid: false}` at all times, so you are able to use an `undefined` as a normal value.

If you do need `undefined` as a "magic skip" value – then you can use `{skipVoid: true}` to preserve current behavior. You still will get a deprecation warning though, but only one for declaration instead of one for every such update.

The `skipVoid` setting is temporary and only needed as a way to properly deprecate this feature from Effector. In Effector 24 `skipVoid` itself will be deprecated and then removed.

### `useStore` and `useEvent` to `useUnit` in `effector-react`

We merged two old hooks into one, its advantage is that you can pass many units to it at once and it batches all the stores' updates into one single update.

It's safe to just swap the calls of the old hooks with the new one:

```ts
const Component = () => {
  const foo = useStore($foo);
  const bar = useStore($bar);
  const onSubmit = useEvent(triggerSubmit);
};
```

Becomes:

```ts
const Component = () => {
  const foo = useUnit($foo);
  const bar = useUnit($bar);
  const onSubmit = useUnit(triggerSubmit);
};
```

Or shorter:

```ts
const Component = () => {
  const [foo, bar, onSubmit] = useUnit([$foo, $bar, triggerSubmit]);
};
```


# Server Side Rendering

Server-side rendering (SSR) means that the content of your site is generated on the server and then sent to the browser – which these days is achieved in very different ways and forms.

> INFO: 
>
> Generally, if the rendering happens at the runtime – it is called SSR. If the rendering happens at the build-time – it is usually called Server Side Generation (SSG), which in fact is basically a subset of SSR.
>
> This difference it is not important for this guide, everything said applies both to SSR and SSG.

In this guide we will cover two main kinds of Server Side Rendering patterns and how effector should be used in these cases.

### Non-Isomorphic SSR

You don't need to do anything special to support non-isomorphic SSR/SSG workflow.

This way initial HTML is usually generated separately, by using some sort of template engine, which is quite often run with different (not JS) programming language.
The frontend code in this case works only at the client browser and **is not used in any way** to generate the server response.

This approach works for effector, as well as any javascript code. Any SPA application is basically an edge-case of it, as its HTML template does not contain any content, except for `<script src="my-app.js" />` link.

> TIP: 
>
> If you have non-isomorphic SSR – just use effector the way you would for an SPA app.

### Isomorphic SSR

When you have an isomorphic SSR application, **most of the frontend code is shared with server** and **is used to generate the response** HTML.

You can also think of it as an approach, where your app **starts at the server** – and then gets transferred over the network to the client browser, where it **continues** the work it started doing at the server.

That's where the name comes from – despite the fact, that the code is bundled for and run in different environments, its output remains (mostly) the same, if given the same input.

There are a lot of different frameworks, which are built upon this approach – e.g. Next.js, Remix.run, Razzle.js, Nuxt.js, Astro, etc

> TIP Next.js: 
>
> Next.js does SSR/SSG in the special way, which requires a bit of custom handling on the effector side.
>
> This is done via dedicated [`@effector/next`](https://github.com/effector/next) package – use it, if you want to use effector with Next.js.

For this guide we will not focus on any specific framework or server implementation – these details will be abstracted away.

#### SIDs

To handle isomorphic SSR with effector we need a reliable way to serialize state, to pass it over the network. This where we need to have Stable IDentifiers for each store in our app.

> INFO: 
>
> Deep-dive explanation about SIDs can be found here.

To add SIDs – just use one of effector's plugins.

#### Common application code

The main feature of isomorphic SSR – the same code is used to both server render and client app.

For sake of example we will use a very simple React-based counter app – all of it will be contained in one module:

```tsx
// app.tsx
import React from "react";
import { createEvent, createStore, createEffect, sample, combine } from "effector";
import { useUnit } from "effector-react";

// model
export const appStarted = createEvent();
export const $pathname = createStore<string | null>(null);

const $counter = createStore<number | null>(null);

const fetchUserCounterFx = createEffect(async () => {
  await sleep(100); // in real life it would be some api request

  return Math.floor(Math.random() * 100);
});

const buttonClicked = createEvent();
const saveUserCounterFx = createEffect(async (count: number) => {
  await sleep(100); // in real life it would be some api request
});

sample({
  clock: appStarted,
  source: $counter,
  filter: (count) => count === null, // if count is already fetched - do not fetch it again
  target: fetchUserCounterFx,
});

sample({
  clock: fetchUserCounterFx.doneData,
  target: $counter,
});

sample({
  clock: buttonClicked,
  source: $counter,
  fn: (count) => count + 1,
  target: [$counter, saveUserCounterFx],
});

const $countUpdatePending = combine(
  [fetchUserCounterFx.pending, saveUserCounterFx.pending],
  (updates) => updates.some((upd) => upd === true),
);

const $isClient = createStore(typeof document !== "undefined", {
  /**
   * Here we're explicitly telling effector, that this store, which depends on the environment,
   * should be never included in serialization
   * as it's should be always calculated based on actual current env
   *
   * This is not actually necessary, because only diff of state changes is included into serialization
   * and this store is not going to be changed.
   *
   * But it is good to add this setting anyway - to highlight the intention
   */
  serialize: "ignore",
});

const notifyFx = createEffect((message: string) => {
  alert(message);
});

sample({
  clock: [
    saveUserCounterFx.done.map(() => "Counter update is saved successfully"),
    saveUserCounterFx.fail.map(() => "Could not save the counter update :("),
  ],
  // It is totally ok to have some splits in the app's logic based on current environment
  //
  // Here we want to trigger notification alert only at the client
  filter: $isClient,
  target: notifyFx,
});

// ui
export function App() {
  const clickButton = useUnit(buttonClicked);
  const { count, updatePending } = useUnit({
    count: $counter,
    updatePending: $countUpdatePending,
  });

  return (
    <div>
      <h1>Counter App</h1>
      <h2>{updatePending ? "Counter is updating" : `Current count is ${count ?? "unknown"}`}</h2>
      <button onClick={() => clickButton()}>Update counter</button>
    </div>
  );
}
```

This is our app's code which will be used to both server-side render and to handle client's needs.

> TIP: 
>
> Notice, that it is important, that all of effector units – stores, events, etc – are "bound" to the react component via `useUnit` hook.
>
> You can use the official eslint plugin of effector to validate that and to follow other best practices – checkout the [eslint.effector.dev](https://eslint.effector.dev/) website.

### Server entrypoint

The way of the `<App />` to the client browsers starts at the server. For this we need to create **separate entrypoint** for the specific server-related code, which will also handle the server-side render part.

In this example we're not going to dive deep into various possible server implementations – we will focus on the request handler itself instead.

> INFO: 
>
> Alongside with basic SSR needs, like calculating the final state of the app and serializing it, effector also handles **the isolation of user's data between requests**.
>
> It is very important feature, as Node.js servers usually handle more than one user request at the same moment of time.
>
> Since JS-based platforms, including Node.js, usually have single "main" thread – all logical computations are happening in the same context, with the same memory available.
> So, if state is not properly isolated, one user may receive the data, prepared for another user, which is very undesirable.
>
> effector handles this problem automatically inside the `fork` feature. Read the relevant docs for details.

This is the code for server request handler, which contains all server-specific stuff that need to be done.
Notice, that for meaningful parts of our app we are still using the "shared" `app.tsx` code.

```tsx
// server.tsx
import { renderToString } from "react-dom/server";
import { Provider } from "effector-react";
import { fork, allSettled, serialize } from "effector";

import { appStarted, App, $pathname } from "./app";

export async function handleRequest(req) {
  // 1. create separate instance of effector's state - special `Scope` object
  const scope = fork({
    values: [
      // some parts of app's state can be immediately set to relevant states,
      // before any computations started
      [$pathname, req.pathname],
    ],
  });

  // 2. start app's logic - all computations will be performed according to the model's logic,
  // as well as any required effects
  await allSettled(appStarted, {
    scope,
  });

  // 3. Serialize the calculated state, so it can be passed over the network
  const storesValues = serialize(scope);

  // 4. Render the app - also into some serializable version
  const app = renderToString(
    // by using Provider with the scope we tell the <App />, which state of the stores it should use
    <Provider value={scope}>
      <App />
    </Provider>,
  );

  // 5. prepare serialized HTML response
  //
  // This is serialization (or network) boundary
  // The point, where all state is stringified to be sent over the network
  //
  // effectors state is stored as a `<script>`, which will set the state into global object
  // `react`'s state is stored as a part of the DOM tree.
  return `
    <html>
      <head>
        <script>
          self._SERVER_STATE_ = ${JSON.stringify(storesValues)}
        </script>
        <link rel="stylesheet" href="styles.css" />
        <script defer src="app.js" />
      </head>
      <body>
        <div id="app">
          ${app}
        </div>
      </body>
    </html>
  `;
}
```

☝️ In this code we have created the HTML string, which user will receive over the network and which contains serialized state of the whole app.

### Client entrypoint

When the generated HTML string reaches the client browser, has been processed by the parser and all the required assets have been loaded – our application code starts working on the client.

At this point `<App />` needs to restore its past state (which was computed on the server), so that it doesn't start from scratch, but starts from the same point the work reached on the server.

The process of restoring the server state at the client is usually called **hydration** and this is what client entrypoint should actually do:

```tsx
// client.tsx
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { fork, allSettled } from "effector";
import { Provider } from "effector-react";

import { App, appStarted } from "./app";

/**
 * 1. Find, where the server state is stored and retrieve it
 *
 * See the server handler code to find out, where it was saved in the HTML
 */
const effectorState = globalThis._SERVER_STATE_;
const reactRoot = document.querySelector("#app");

/**
 * 2. Initiate the client scope of effector with server-calculated values
 */
const clientScope = fork({
  values: effectorState,
});

/**
 * 3. "Hydrate" React state in the DOM tree
 */
hydrateRoot(
  reactRoot,
  <Provider value={clientScope}>
    <App />
  </Provider>,
);

/**
 * 4. Call the same starting event at the client
 *
 * This is optional and actually depends on how your app's logic is organized
 */
allSettled(appStarted, { scope: clientScope });
```

☝️ At this point the App is ready to use!

### Recap

1. You don't need to do anything special for **non-isomorphic** SSR, all SPA-like patterns will work.
2. Isomorphic SSR requires a bit of special preparation – you will need SIDs for stores.
3. Common code of the **isomorphic** SSR app handles all meaningful parts – how the UI should look, how state should be calculated, when and which effects should be run.
4. Server-specific code calculates and **serializes** all of the app's state into the HTML string.
5. Client-specific code retrieves this state and uses it to **"hydrate"** the app on the client.


# Testing in Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Writing Tests

Testing state management logic is one of Effector’s strengths. Thanks to isolated contexts (fork api) and controlled asynchronous processes allSettled, you can test application behavior without having to emulate the entire lifecycle.

> INFO What does fork do?: 
>
> By calling the fork function, we create a scope, which can be considered an independent instance of our Effector application.

### Basics of Testing

Effector provides built-in tools for:

* State isolation: Each testable state can be created in its own context, preventing side effects.
* Asynchronous execution: All effects and events can be executed and verified using allSettled.

#### Store Testing

Testing stores in Effector is straightforward since they are pure functions that manage state.

<Tabs>

  <TabItem label="counter.test.js">

```ts
import { counterIncremented, $counter } from "./counter.js";

test("counter should increase by 1", async () => {
  const scope = fork();

  expect(scope.getState($counter)).toEqual(0);

  await allSettled(counterIncremented, { scope });

  expect(scope.getState($counter)).toEqual(1);
});
```

  </TabItem>

```
<TabItem label="counter.js">
```

```ts
import { createStore, createEvent } from "effector";

const counterIncremented = createEvent();

const $counter = createStore(0);

$counter.on(counterIncremented, (counter) => counter + 1);
```

  </TabItem>
</Tabs>

For isolated state logic testing, fork is used. This allows testing stores and events without affecting global state.

#### Events Testing

To test whether an event was triggered and how many times, you can use the `createWatch` method, which will create a subscription to the passed unit:

```ts
import { createEvent, createWatch, fork } from "effector";
import { userUpdated } from "../";

test("should handle user update with scope", async () => {
  const scope = fork();
  const fn = jest.fn();

  // Create a watcher in the specific scope
  const unwatch = createWatch({
    unit: userUpdated,
    fn,
    scope,
  });

  // Trigger the event in scope
  await allSettled(userUpdated, {
    scope,
  });

  expect(fn).toHaveBeenCalledTimes(1);
});
```

> INFO Why not watch?: 
>
> We didn't use the `watch` property of events because during parallel tests we might trigger the same event, which could cause conflicts.

#### Effect Testing

Effects can be tested by verifying their successful execution or error handling. In unit testing, we often want to prevent effects from making real API calls. This can be achieved by passing a configuration object with a handlers property to fork, where you define mock handlers for specific effects.

<Tabs>

  <TabItem label="effect.test.js">

```ts
import { fork, allSettled } from "effector";
import { getUserProjectsFx } from "./effect.js";

test("effect executes correctly", async () => {
  const scope = fork({
    handlers: [
      // List of [effect, mock handler] pairs
      [getUserProjectsFx, () => "user projects data"],
    ],
  });

  const result = await allSettled(getUserProjectsFx, { scope });

  expect(result.status).toBe("done");
  expect(result.value).toBe("user projects data");
});
```

  </TabItem>

```
<TabItem label="effect.js">
```

```ts
import { createEffect } from "effector";

const getUserProjectsFx = async () => {
  const result = await fetch("/users/projects/2");

  return result.json();
};
```

  </TabItem>
</Tabs>

### A Complete Example of Testing

Let’s consider a typical counter with asynchronous validation via our backend. Suppose we have the following requirements:

* When a user clicks a button, we check if the counter is less than 100, then validate the click through our backend API.
* If validation succeeds, increment the counter by 1.
* If validation fails, reset the counter to zero.

```ts
import { createEvent, createStore, createEffect, sample } from "effector";

export const buttonClicked = createEvent();

export const validateClickFx = createEffect(async () => {
  /* external API call */
});

export const $clicksCount = createStore(0);

sample({
  clock: buttonClicked,
  source: $clicksCount,
  filter: (count) => count < 100,
  target: validateClickFx,
});

sample({
  clock: validateClickFx.done,
  source: $clicksCount,
  fn: (count) => count + 1,
  target: $clicksCount,
});

sample({
  clock: validateClickFx.fail,
  fn: () => 0,
  target: $clicksCount,
});
```

#### Test Setup

Here’s our main scenario:

1. The user clicks the button.
2. Validation completes successfully.
3. The counter increments by 1.

Let’s test it:

1. Create a new Scope instance by calling fork.
2. Check that the initial counter value is 0.
3. Simulate the buttonClicked event using allSettled—a promise that resolves once all computations finish.
4. Verify that the final state is as expected.

```ts
import { fork, allSettled } from "effector";

import { $clicksCount, buttonClicked, validateClickFx } from "./model";

test("main case", async () => {
  const scope = fork(); // 1

  expect(scope.getState($clicksCount)).toEqual(0); // 2

  await allSettled(buttonClicked, { scope }); // 3

  expect(scope.getState($clicksCount)).toEqual(1); // 4
});
```

However, this test has an issue—it uses a real backend API. Since this is a unit test, we should mock the backend call.

#### Custom Effect Handlers

To avoid real server requests, we can mock the server response by providing a custom handler via the fork configuration.

```ts
test("main case", async () => {
  const scope = fork({
    handlers: [
      // List of [effect, mock handler] pairs
      [validateClickFx, () => true],
    ],
  });

  expect(scope.getState($clicksCount)).toEqual(0);

  await allSettled(buttonClicked, { scope });

  expect(scope.getState($clicksCount)).toEqual(1);
});
```

#### Custom Store Values

Another scenario:

1. The counter already exceeds 100.
2. The user clicks the button.
3. The effect should not be triggered.

In this case, we need to set an initial state where the counter is greater than 100. This can be done using custom initial values via the fork configuration.

```ts
test("bad case", async () => {
  const MOCK_VALUE = 101;
  const mockFunction = jest.fn();

  const scope = fork({
    values: [
      // List of [store, mockValue] pairs
      [$clicksCount, MOCK_VALUE],
    ],
    handlers: [
      // List of [effect, mock handler] pairs
      [
        validateClickFx,
        () => {
          mockFunction();

          return false;
        },
      ],
    ],
  });

  expect(scope.getState($clicksCount)).toEqual(MOCK_VALUE);

  await allSettled(buttonClicked, { scope });

  expect(scope.getState($clicksCount)).toEqual(MOCK_VALUE);
  expect(mockFunction).toHaveBeenCalledTimes(0);
});
```

This is how you can test every use case you want to validate.


# Troubleshooting in Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Troubleshooting Effector

### Common Errors

#### `store: undefined is used to skip updates. To allow undefined as a value provide explicit { skipVoid: false } option`

This error indicates that you are trying to pass `undefined` as a value to your store, which might not be the intended behavior.

If you really need to store `undefined`, pass an object with `{ skipVoid: false }` as the second argument to `createStore`:

```ts
const $store = createStore(0, {
  skipVoid: false,
});
```

#### `serialize: One or more stores dont have sids, their values are omitted`

> INFO Before version 23.3.0: 
>
> Before version 23.3.0, this error was also known as: `There is a store without sid in this scope, its value is omitted`.

This error commonly occurs in SSR scenarios due to the absence of an `sid` (stable id), which is required for proper hydration of store data from the server to the client.

To fix this, add an `sid` to your store. You can do this in one of the following ways:

1. Use the Babel or SWC plugin to handle it automatically.
2. Manually specify an `sid` by providing an object with a `sid` property as the second argument to `createStore`:

   ```ts
   const $store = createStore(0, {
     sid: "unique id",
   });
   ```

For more details, see Understanding .

#### `scopeBind: scope not found`

This error occurs when a scope is lost at some point in execution, preventing `scopeBind` from associating an event or effect with the correct execution scope.<br/>
It may be caused by:

1. Using a "scope-free" mode where scopes are not present in your application.
2. Calling units outside of a scope.

Possible Solutions:

1. Ensure `scopeBind` is used within effects:

   ```ts
   const event = createEvent();

   // ❌ - Do not call scopeBind inside callbacks
   const effectFx = createEffect(() => {
     setTimeout(() => {
       scopeBind(event)();
     }, 1111);
   });

   // ✅ - Use scopeBind inside the effect
   const effectFx = createEffect(() => {
     const scopeEvent = scopeBind(event);

     setTimeout(() => {
       scopeEvent();
     }, 1111);
   });
   ```

2. Ensure that your units are used inside a scope:
   * When working with a framework, use `useUnit`.
   * If calling an event or effect outside a framework, use `allSettled` and provide the appropriate `scope` as an argument.

If necessary, and you want to suppress the error, you can pass `{ safe: true }` as an option:

```ts
const scopeEvent = scopeBind(event, {
  safe: true,
});
```

### Gotchas

#### `sample.fn` does not narrow the type passed from `sample.filter`

A common type-related issue with `sample` occurs when a check is performed inside `filter`, but `fn` does not receive the expected narrowed type.

Fixing this issue.

#### My state did not change

If your state does not update as expected, you are likely working with scopes and, at some point, the active scope was lost. As a result, your unit executed in the global scope instead.<br/>
Find more details about this behavior here.

This issue often occurs when passing units (events or effects) into external function callbacks such as:

* `setTimeout` / `setInterval`
* `addEventListener`
* `webSocket`, etc.

Solution:

Bind your event or effect to the current scope using scopeBind:

```ts
const event = createEvent();

// ❌ - This will execute the event in the global scope
const effectFx = createEffect(() => {
  setTimeout(() => {
    event();
  }, 1000);
});

// ✅ - This ensures the event executes in the correct scope
const effectFx = createEffect(() => {
  const scopeEvent = scopeBind(event);
  setTimeout(() => {
    scopeEvent();
  }, 1000);
});
```

##### Using units without `useUnit`

If you're using events or effects in a framework without `useUnit`, this may also lead to incorrect behavior related to scopes.<br/>
To fix this, pass the unit to the `useUnit` hook and use the returned value:

<Tabs>
<TabItem label="❌ Incorrect">

```tsx
import { event } from "./model.js";

const Component = () => {
  return <button onClick={() => event()}></button>;
};
```

</TabItem>
<TabItem label="✅ Correct">

```tsx
import { event } from "./model.js";
import { useUnit } from "effector-react";

const Component = () => {
  const onEvent = useUnit(event);

  return <button onClick={() => onEvent()}></button>;
};
```

</TabItem>
</Tabs>

> INFO Best Practice: 
>
> Using  for working with units.

What is scope loss and why does it happen.

### No Answer to Your Question?

If you couldn't find the answer to your question, you can always ask the community:

* [RU Telegram](https://t.me/effector_ru)
* [EN Telegram](https://t.me/effector_en)
* [Discord](https://discord.gg/t3KkcQdt)
* [Reddit](https://www.reddit.com/r/effectorjs/)


# Setting up WebSocket with Effector

## Working with WebSocket in Effector

In this guide, we'll look at how to properly organize work with WebSocket connection using Effector.

> INFO WebSocket and Data Types: 
>
> WebSocket API supports data transmission in the form of strings or binary data (`Blob`/`ArrayBuffer`). In this guide, we'll focus on working with strings, as this is the most common case when exchanging data. When working with binary data is needed, you can adapt the examples to the required format.

### Basic Model

Let's create a simple but working WebSocket client model. First, let's define the basic events and states:

```ts
import { createStore, createEvent, createEffect, sample } from "effector";

// Events for working with socket
const disconnected = createEvent();
const messageSent = createEvent<string>();
const rawMessageReceived = createEvent<string>();

const $connection = createStore<WebSocket | null>(null)
  .on(connectWebSocketFx.doneData, (_, ws) => ws)
  .reset(disconnected);
```

Then create an effect for establishing connection:

```ts
const connectWebSocketFx = createEffect((url: string): Promise<WebSocket> => {
  const ws = new WebSocket(url);

  const scopeDisconnected = scopeBind(disconnected);
  const scopeRawMessageReceived = scopeBind(rawMessageReceived);

  return new Promise((res, rej) => {
    ws.onopen = () => {
      res(ws);
    };

    ws.onmessage = (event) => {
      scopeRawMessageReceived(event.data);
    };

    ws.onclose = () => {
      scopeDisconnected();
    };

    ws.onerror = (err) => {
      scopeDisconnected();
      rej(err);
    };
  });
});
```

Note that we used the scopeBind function here to bind units with the current execution scope, as we don't know when `scopeMessageReceived` will be called inside `socket.onmessage`. Otherwise, the event will end up in the global scope.
Read more.

> WARNING Working in scope-less mode: 
>
> If you're working in scope-less mode for some reason, you don't need to use `scopeBind`.<br/>
> Keep in mind that working with scope is the recommended way!

### Message Handling

Let's create a store for the last received message:

```ts
const $lastMessage = createStore<string>("");

$lastMessage.on(rawMessageReceived, (_, newMessage) => newMessage);
```

And also implement an effect for sending messages:

```ts
const sendMessageFx = createEffect((params: { socket: WebSocket; message: string }) => {
  params.socket.send(params.message);
});

// Link message sending with current socket
sample({
  clock: messageSent,
  source: $connection,
  filter: Boolean, // Send only if connection exists
  fn: (socket, message) => ({
    socket,
    message,
  }),
  target: sendMessageFx,
});
```

> TIP Connection States: 
>
> WebSocket has several connection states (`CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`). In the basic model, we simplify this to a simple Boolean check, but in a real application, more detailed state tracking might be needed.

### Error Handling

When working with WebSocket, it's important to properly handle different types of errors to ensure application reliability.

Let's extend our basic model by adding error handling:

```ts
const TIMEOUT = 5_000;

// Add events for errors
const socketError = createEvent<Error>();

const connectWebSocketFx = createEffect((url: string): Promise<WebSocket> => {
  const ws = new WebSocket(url);

  const scopeDisconnected = scopeBind(disconnected);
  const scopeRawMessageReceived = scopeBind(rawMessageReceived);
  const scopeSocketError = scopeBind(socketError);

  return new Promise((res, rej) => {
    const timeout = setTimeout(() => {
      const error = new Error("Connection timeout");

      socketError(error);
      reject(error);
      socket.close();
    }, TIMEOUT);

    ws.onopen = () => {
      clearTimeout(timeout);
      res(ws);
    };

    ws.onmessage = (event) => {
      scopeRawMessageReceived(event.data);
    };

    ws.onclose = () => {
      disconnected();
    };

    ws.onerror = (err) => {
      const error = new Error("WebSocket error");
      scopeDisconnected();
      scopeSocketError(error);
      rej(err);
    };
  });
});

// Store for error storage
const $error = createStore("")
  .on(socketError, (_, error) => error.message)
  .reset(connectWebSocketFx.done);
```

> WARNING Error Handling: 
>
> Always handle WebSocket connection errors, as they can occur for many reasons: network issues, timeouts, invalid data, etc.

### Typed Messages

When working with WebSocket, ensuring type safety is crucial. This prevents errors during development and enhances the reliability of your application when handling various message types.

For this purpose, we'll use the [Zod](https://zod.dev/) library, though you can use any validation library of your choice.

> INFO TypeScript and Type Checking: 
>
> Even if you don't use Zod or another validation library, you can implement basic typing for WebSocket messages using standard TypeScript interfaces. However, remember that these only check types during compilation and won't protect you from unexpected data at runtime.

Let's say we expect two types of messages: `balanceChanged` and `reportGenerated`, containing the following fields:

```ts
export const messagesSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("balanceChanged"),
    balance: z.number(),
  }),
  z.object({
    type: z.literal("reportGenerated"),
    reportId: z.string(),
    reportName: z.string(),
  }),
]);

// Get type from schema
type MessagesSchema = z.infer<typeof messagesSchema>;
```

Now add a message handling effect to ensure that messages match the expected types, along with the logic of receiving them:

```ts
const parsedMessageReceived = createEvent<MessagesSchema>();

const parseFx = createEffect((message: unknown): MessagesSchema => {
  return messagesSchema.parse(JSON.parse(typeof message === "string" ? message : "{}"));
});

// Parse the message when received
sample({
  clock: rawMessageReceived,
  target: parseFx,
});

// If parsing succeeds, forward the message
sample({
  clock: parseFx.doneData,
  target: parsedMessageReceived,
});
```

We should also handle cases where a message doesn't match the schema:

```ts
const validationError = createEvent<Error>();

// If parsing fails, handle the error
sample({
  clock: parseFx.failData,
  target: validationError,
});
```

That's it! Now all incoming messages will be validated against the schema before processing.

> TIP Typing Outgoing Messages: 
>
> You can apply the same approach to outgoing messages. This allows you to validate their structure before sending and avoid errors.

If you want more granular control, you can create an event that triggers only for a specific message type:

```ts
type MessageType<T extends MessagesSchema["type"]> = Extract<MessagesSchema, { type: T }>;

export const messageReceivedByType = <T extends MessagesSchema["type"]>(type: T) => {
  return sample({
    clock: parsedMessageReceived,
    filter: (message): message is MessageType<T> => {
      return message.type === type;
    },
  });
};
```

Usage example:

```ts
sample({
  clock: messageReceivedByType("balanceChanged"),
  fn: (message) => {
    // TypeScript knows the structure of message
  },
  target: doWhateverYouWant,
});
```

> INFO Return Values from sample: 
>
> If you're not sure what data `sample` returns, we recommend checking the sample.

### Working with `Socket.IO`

[Socket.IO](https://socket.io/) provides a higher-level API for working with WebSocket, adding many useful features "out of the box".

> INFO Socket.IO Advantages: 
>
> * Automatic reconnection
> * Support for rooms and namespaces
> * Fallback to HTTP Long-polling if WebSocket is unavailable
> * Built-in support for events and acknowledgments
> * Automatic data serialization/deserialization

```ts
import { io, Socket } from "socket.io-client";
import { createStore, createEvent, createEffect, sample } from "effector";

const API_URL = "wss://your.ws.server";

// Events
const connected = createEvent();
const disconnected = createEvent();
const socketError = createEvent<Error>();

// Types for events
type ChatMessage = {
  room: string;
  message: string;
  author: string;
};

const messageSent = createEvent<ChatMessage>();
const messageReceived = createEvent<ChatMessage>();
const socketConnected = createEvent();
const connectSocket = createEvent();

const connectFx = createEffect((): Promise<Socket> => {
  const socket = io(API_URL, {
    //... your configuration
  });

  // needed for correct work with scopes
  const scopeConnected = scopeBind(connected);
  const scopeDisconnected = scopeBind(disconnected);
  const scopeSocketError = scopeBind(socketError);
  const scopeMessageReceived = scopeBind(messageReceived);

  return new Promise((resolve, reject) => {
    socket.on("connect", () => {
      scopeConnected();
      resolve(socket);
    });

    socket.on("disconnect", () => scopeDisconnected());
    socket.on("connect_error", (error) => scopeSocketError(error));
    socket.on("chat message", (msg: ChatMessage) => scopeMessageReceived(msg));
  });
});

const sendMessageFx = createEffect(
  ({
    socket,
    name,
    payload,
  }: SocketResponse<any> & {
    socket: Socket;
  }) => {
    socket.emit(name, payload);
  },
);

// States
const $socket = createStore<Socket | null>(null)
  .on(connectFx.doneData, (_, socket) => socket)
  .reset(disconnected);

// initialize connection
sample({
  clock: connectSocket,
  target: connectFx,
});

// trigger event after successful connection
sample({
  clock: connectSocketFx.doneData,
  target: socketConnected,
});
```


# Community

### Articles

* [dev.to/effector](https://dev.to/effector) — space on the public platform
* [community.effector.dev](https://community.effector.dev) — personal space
* [reddit.com/r/effectorjs](https://reddit.com/r/effectorjs) — subreddit
* [twitter.com/effectorJS](https://twitter.com/effectorJS) — retweets, releases, announces

### Videos

* [Youtube Channel](https://www.youtube.com/channel/UCm8PRc_yjz3jXHH0JylVw1Q)

### Where can I ask a question?

1. First of all, you can review the [issues](https://github.com/effector/effector/issues) and [discussions](https://github.com/effector/effector/discussions) of the repository
2. We have some chat spaces:
   * Telegram — [t.me/effector\_en](https://t.me/effector_en)
   * Discord — [discord.gg/t3KkcQdt](https://discord.gg/t3KkcQdt)
   * Reddit — [reddit.com/r/effectorjs](https://www.reddit.com/r/effectorjs/)
   * Gitter — [gitter.im/effector/community](https://gitter.im/effector/community)

### Russian-speaking community

* Ask a question — [t.me/effector\_ru](https://t.me/effector_ru)
* News and announces — [t.me/effector\_news](https://t.me/effector_news)
* Videos:
  * Effector Meetup 1 — [youtube.com/watch?v=IacUIo9fXhI](https://www.youtube.com/watch?v=IacUIo9fXhI)
  * Effector Meetup 2 — [youtube.com/watch?v=nLYc4PaTXYk](https://www.youtube.com/watch?v=nLYc4PaTXYk)
  * Implement feature in the project — [youtube.com/watch?v=dtrWzH8O\_4k](https://www.youtube.com/watch?v=dtrWzH8O_4k)
  * How aviasales migrate on effector — [youtube.com/watch?v=HYaSnVEZiFk](https://www.youtube.com/watch?v=HYaSnVEZiFk)
  * Let’s write a game — [youtube.com/watch?v=tjjxIQd0E8c](https://www.youtube.com/watch?v=tjjxIQd0E8c)
  * Effector 22.2.0 Halley — [youtube.com/watch?v=pTq9AbmS0FI](https://www.youtube.com/watch?v=pTq9AbmS0FI)
  * Effector 22.4.0 Encke — [youtube.com/watch?v=9UjgcNn0K\_o](https://www.youtube.com/watch?v=9UjgcNn0K_o)

### Support and sponsor

* OpenCollective — [opencollective.com/effector](https://opencollective.com/effector)
* Patreon — [patreon.com/zero\_bias](https://www.patreon.com/zero_bias)

<br /><br />

### Meet the Effector Team

The Effector Team members work full time on the projects which use effector to solve business tasks.
Each member uses the library every day as a user and tries to improve the user experience as a core team member.

#### Dmitry Boldyrev

<img width="256" src="https://avatars.githubusercontent.com/u/15912112?v=4" />

[Github](https://github.com/zerobias) • [Twitter](https://twitter.com/zero__bias) • [Commits](https://github.com/effector/effector/commits?author=zerobias)

Dmitry made the first version of effector in 2018 to solve reactive event-driver architecture in the messenger.
Now his main focus is to improve the UX in the effector itself and speed up the kernel.

#### Sergey Sova

<img width="256" src="https://avatars.githubusercontent.com/u/5620073?v=4" />

[Github](https://github.com/sergeysova) • [Twitter](https://twitter.com/_sergeysova) • [Commits](https://github.com/effector/effector/commits?author=sergeysova)

Since 2018, Sergey has made some ecosystem packages: [patronum](https://github.com/effector/patronum), [logger](https://github.com/effector/logger), [inspector](https://github.com/effector/inspector).
His main task is to improve the UX through the ecosystem and documentation.

#### Alexandr Horoshih

<img width="256" src="https://avatars.githubusercontent.com/u/32790736?v=4" />

[Github](https://github.com/AlexandrHoroshih) • [Telegram](https://t.me/AlexandrHoroshih) • [Commits](https://github.com/effector/effector/commits?author=AlexandrHoroshih)

Alexander contributed to each package of effector core and org repository.
He reviewed contributions and improved the DX of the core functionality.

#### Kirill Mironov

<img width="256" src="https://i.imgur.com/JFaZkm9.jpg" />

[Github](https://github.com/Drevoed) • [Telegram](https://t.me/vetrokm)

Kirill made the [swc-plugin](https://github.com/effector/swc-plugin), the [bindings for SolidJS](https://github.com/effector/effector/tree/master/packages/effector-solid),
and now improves ecosystem and core functionality.

#### Igor Kamyşev

<img width="256" src="https://avatars.githubusercontent.com/u/26767722?v=4" />

[Github](https://github.com/igorkamyshev) • [Telegram](https://t.me/igorkamyshev) • [Commits](https://github.com/effector/effector/commits?author=igorkamyshev)

Igor is working on [Farfetched](https://ff.effector.dev) is the advanced data fetching tool.
Igor made [eslint-plugin-effector](https://eslint.effector.dev) and reviewed many of the PRs and issues of the effector and ecosystem packages.

#### Yan Lobaty

<img width="256" src="https://i.imgur.com/DomL22D.jpg" />

[Github](https://github.com/YanLobat) • [Telegram](https://t.me/lobatik) • [Commits](https://github.com/effector/effector/commits?author=YanLobat)

Yan made many contributions with fixes and improvements to all effector repositories.
Yan helps us to write explanations and reference documentation. You may hear about the workshop Yan made about effector.

#### Egor Guscha

<img width="256" src="https://avatars.githubusercontent.com/u/22044607?v=4" />

[Github](https://github.com/egorguscha) • [Twitter](https://twitter.com/simpleigich)

Since 2019, working in the effector core team on documentation, learning materials, and ecosystem improving.

<br /><br />

### Acknowledgments

#### Ilya Lesik

<img width="256" src="https://avatars.githubusercontent.com/u/1270648?v=4" />

[Github](https://github.com/ilyalesik) • [Twitter](https://twitter.com/ilialesik)

Ilya made the list of awesome packages of effector ecosystem.

#### Evgeniy Fedotov

<img width="256" src="https://avatars.githubusercontent.com/u/18236014?v=4" />

[Github](https://github.com/EvgenyiFedotov) • [Telegram](https://t.me/evgeniyfedotov)

Evgeniy made [effector-reflect](https://github.com/effector/reflect) and helps us write documentation.

#### Valeriy Kobzar

<img width="256" src="https://avatars.githubusercontent.com/u/1615093?v=4" />

[Github](https://github.com/kobzarvs) • [Telegram](https://t.me/ValeryKobzar) • [Commits](https://github.com/effector/effector/commits?author=kobzarvs)

Valeriy developed server-side code for [REPL](https://share.effector.dev) and wrote many documentation pages.

#### Anton Kosykh

<img width="256" src="https://i.imgur.com/GD0zWpH.jpg" />

[Github](https://github.com/Kelin2025) • [Telegram](https://t.me/kelin2025)

One of the earliest users of effector, working on [Atomic Router](https://atomic-router.github.io/) and ecosystem packages like [effector-history](https://github.com/kelin2025/effector-history),
[effector-pagination](https://github.com/kelin2025/effector-pagination) and [effector-factorio](https://github.com/Kelin2025/effector-factorio)

#### Andrei Tshurotshkin

[Github](https://github.com/goodmind)

Andrei was at the origin of the effector. He wrote all the first documentation, implemented the first REPL version, and featured many core methods.

#### Roman Titov

[Github](https://github.com/popuguytheparrot) • [Telegram](https://t.me/popuguy)

Roman promotes effector among the front-end community and works on documentation.

*This list is not exhaustive.*

<br /><br />

### Contributors

Please, open [README.md](https://github.com/effector/effector#contributors) to see the full list of our contributors.
We have the [github action](https://github.com/effector/effector/blob/master/.github/workflows/contributors.yml) to regenerate this list.
Also, you can open the [Insights page](https://github.com/effector/effector/graphs/contributors) on the main repository.

We’d like to give thanks to all contributors for effector and the ecosystem.

Thank you for your support and love over all this time \:heart:


# Effector Core concepts

## Core concepts

Effector is a modern state management library that enables developers to build scalable and predictable reactive applications.

At its core, Effector is built around the concept of **units**—independent building blocks of an application. Each unit—whether a store, an event, or an effect — has a specific role.
By combining these units, developers can construct complex yet intuitive data flows within their applications.

Effector development is based on two key principles:

* 📝 **Declarativity**: You define *what* should happen, not *how* it should work.
* 🚀 **Reactivity**: Changes propagate automatically throughout the application.

Effector employs an intelligent dependency-tracking system that ensures only the necessary parts of the application update when data changes. This provides several benefits:

* No need for manual subscription management
* High performance even at scale
* A predictable and clear data flow

### Units

A unit is a fundamental concept in Effector. Store, Event, and Effect are all units—core building blocks for constructing an application's business logic. Each unit is an independent entity that can be:

* Connected with other units
* Subscribed to changes of other units
* Used to create new units

```ts
import { createStore, createEvent, createEffect, is } from "effector";

const $counter = createStore(0);
const event = createEvent();
const fx = createEffect(() => {});

// Check if value is a unit
is.unit($counter); // true
is.unit(event); // true
is.unit(fx); // true
is.unit({}); // false
```

#### Event

An event (Event) in Effector serves as an entry point into the reactive data flow. Simply put, it is a way to signal that "something has happened" within the application.

##### Event features

* Simplicity: Events are minimalistic and can be easily created using createEvent.
* Composition: Events can be combined, filtered, transformed, and forwarded to other handlers or stores.

```js
import { createEvent } from "effector";

// create event
const formSubmitted = createEvent();

// subscribe to the event
formSubmitted.watch(() => console.log("Form submitted!"));

// Trigger the event
formSubmitted();

// Output:
// "Form submitted!"
```

#### Store

A store (Store) holds the application's data. It acts as a reactive value, providing strict control over state changes and data flow.

##### Store features

* You can have as many stores as needed.
* Stores are reactive — changes automatically propagate to all subscribed components.
* Effector optimizes re-renders, minimizing unnecessary updates for subscribed components.
* Store data is immutable.
* There is no `setState`, state changes occur through events.

```js
import { createStore, createEvent } from "effector";

// create event
const superAdded = createEvent();

// create store
const $supers = createStore([
  {
    name: "Spider-man",
    role: "hero",
  },
  {
    name: "Green goblin",
    role: "villain",
  },
]);

// update store on event triggered
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// trigger event
superAdded({
  name: "Rhino",
  role: "villain",
});
```

#### Effect

An effect (Effect) is designed to handle side effects — interactions with the external world, such as making HTTP requests or working with timers.

##### Effect features

* Effects have built-in states like `pending` and emit events such as `done` and `fail`, making it easier to track operation statuses.
* Logic related to external interactions is isolated, improving testability and making the code more predictable.
* Can be either asynchronous or synchronous.

```js
import { createEffect } from "effector";

// Create an effect
const fetchUserFx = createEffect(async (userId) => {
  const response = await fetch(`/api/user/${userId}`);
  return response.json();
});

// Subscribe to effect results
fetchUserFx.done.watch(({ result }) => console.log("User data:", result));
// If effect throw error we will catch it via fail event
fetchUserFx.fail.watch(({ error }) => console.log("Error occurred! ", error));

// Trigger effect
fetchUserFx(1);
```

### Reactivity

As mentioned at the beginning, Effector is built on the principles of reactivity, where changes **automatically** propagate throughout the application. Instead of an imperative approach, where you explicitly define how and when to update data, Effector allows you to declaratively describe relationships between different parts of your application.

#### How Reactivity Works in Effector

Let's revisit the example from the **Stores** section, where we have a store containing an array of superhumans. Now, suppose we need to separate heroes and villains into distinct lists. This can be easily achieved using derived stores:

```ts
import { createStore, createEvent } from "effector";

// Create an event
const superAdded = createEvent();

// Create a store
const $supers = createStore([
  {
    name: "Spider-Man",
    role: "hero",
  },
  {
    name: "Green Goblin",
    role: "villain",
  },
]);

// Create derived stores based on $supers
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

// Update the store when the event is triggered
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// Add a new character
superAdded({
  name: "Rhino",
  role: "villain",
});
```

In this example, we created derived stores `$superHeroes` and `$superVillains`, which depend on the original `$supers` store. Whenever the original store updates, the derived stores automatically update as well — this is **reactivity** in action! 🚀

### How it all works together?

And now let's see how all this works together. All our concepts come together in a powerful, reactive data flow:

1. **Events** initiate changes (e.g., button clicks).
2. These changes update **Stores**, which manage application state.
3. **Effects** handle side effects like interacting with external APIs.

For example, we will take the same code with superheroes as before, but we will modify it slightly by adding an effect to load initial data, just like in real applications:

```ts
import { createStore, createEvent, createEffect } from "effector";

// Define our stores
const $supers = createStore([]);
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

// Create events
const superAdded = createEvent();

// Create effects for fetching data
const getSupersFx = createEffect(async () => {
  const res = await fetch("/server/api/supers");
  if (!res.ok) {
    throw new Error("something went wrong");
  }
  const data = await res.json();
  return data;
});

// Create effects for saving new data
const saveNewSuperFx = createEffect(async (newSuper) => {
  // Simulate saving a new super
  await new Promise((res) => setTimeout(res, 1500));
  return newSuper;
});

// When the data fetch is successful, set the data
$supers.on(getSupersFx.done, ({ result }) => result);
// Add a new super
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// Trigger the data fetch
getSupersFx();
```

> INFO Why use $ and Fx?: 
>
> Effector naming conventions use `$` for stores (e.g., `$counter`) and `Fx` for effects (e.g., `fetchUserDataFx`). Learn more about naming conventions here.

#### Connecting Units into a Single Flow

All that remains is to somehow connect the `superAdded` event and its saving via `saveNewSuperFx`, and then request fresh data from the server after a successful save. <br/>
Here, the sample method comes to our aid. If units are the building blocks, then `sample` is the glue that binds your units together.

> INFO About sample: 
>
> `sample` is the primary method for working with units, allowing you to declaratively trigger a chain of actions.

```ts
import { createStore, createEvent, createEffect, sample } from "effector";

const $supers = createStore([]);
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

const superAdded = createEvent();

const getSupersFx = createEffect(async () => {
  const res = await fetch("/server/api/supers");
  if (!res.ok) {
    throw new Error("something went wrong");
  }
  const data = await res.json();
  return data;
});

const saveNewSuperFx = createEffect(async (newSuper) => {
  // Simulate saving a new super
  await new Promise((res) => setTimeout(res, 1500));
  return newSuper;
});

$supers.on(getSupersFx.done, ({ result }) => result);
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// when clock triggered called target and pass data
sample({
  clock: superAdded,
  target: saveNewSuperFx,
});

// when saveNewSuperFx successfully done called getSupersFx
sample({
  clock: saveNewSuperFx.done,
  target: getSupersFx,
});

// Trigger the data fetch
getSupersFx();
```

Just like that, we easily and simply wrote part of the business logic for our application, leaving the part that displays this data to the UI framework.


# Ecosystem

Packages and templates of effector ecosystem

More content in [awesome-effector repository](https://github.com/effector/awesome)

> INFO Legend: 
>
> Stage 4. 💚 — Stable, supported, awesome<br/>
> Stage 3. 🛠️ — Stable, but still in development, v0.x<br/>
> Stage 2. ☢️️ — Unstable/Incomplete, works in most cases, may be redesigned<br/>
> Stage 1. 🧨 — Breaks in most cases, it must be redesigned, do not use in production<br/>
> Stage 0. ⛔️ — Abandoned/Needs maintainer, may be broken; it must be migrated from<br/>

### Packages

* [patronum](https://github.com/effector/patronum) 💚 — Effector utility library delivering modularity and convenience.
* [@effector/reflect](https://github.com/effector/reflect) 💚 — Classic HOCs redesigned to connect React components to Effector units in an efficient, composable and (sort of) "fine-grained reactive" way.
* [@withease/redux](https://withease.effector.dev/redux/) 💚 — Smooth migration from redux to effector.
* [@withease/i18next](https://withease.effector.dev/i18next) 💚 — A powerful internationalization framework bindings.
* [@withease/web-api](https://withease.effector.dev/web-api/) 💚 — Web API bindings — network status, tab visibility, and more.
* [@withease/factories](https://withease.effector.dev/factories/) 💚 — Set of helpers to create factories in your application.
* [effector-storage](https://github.com/yumauri/effector-storage) 💚 - Small module to sync stores with all kinds of storages (local/session storage, IndexedDB, cookies, server side storage, etc).
* [farfetched](https://ff.effector.dev) 🛠 — The advanced data fetching tool for web applications.
* [@effector/next](https://github.com/effector/next) 🛠 - Official bindings for Next.js
* [effector-localstorage](https://github.com/lessmess-dev/effector-localstorage) 🛠 — Module for effector that sync stores with localStorage.
* [effector-hotkey](https://github.com/kelin2025/effector-hotkey) 🛠 — Hotkeys made easy.
* [atomic-router](https://github.com/atomic-router/atomic-router) 🛠️ — View-library agnostic router.
* [effector-undo](https://github.com/tanyaisinmybed/effector-undo) ☢️ — Simple undo/redo functionality.
* [forest](https://github.com/effector/effector/tree/master/packages/forest) ☢️ — Reactive UI engine for web.

### DX

* [eslint-plugin-effector](https://eslint.effector.dev) 💚 — Enforcing best practices.
* [@effector/swc-plugin](https://github.com/effector/swc-plugin) 💚 — An official SWC plugin for Effector.
* [effector-logger](https://github.com/effector/logger) 🛠 — Simple logger for stores, events, effects and domains.
* [@effector/redux-devtools-adapter](https://github.com/effector/redux-devtools-adapter) 🛠 - Simple adapter, which logs updates to Redux DevTools.

### Form management

* [effector-final-form](https://github.com/binjospookie/effector-final-form) ☢️ – Effector bindings for Final Form.
* [filledout](https://filledout.github.io) ☢️ — Form manager with easy-to-use yup validation
* [effector-forms](https://github.com/aanation/effector-forms) ☢️ — Form manager for effector.
* [effector-react-form](https://github.com/GTOsss/effector-react-form) ☢️ — Connect your forms with state manager.
* [efform](https://github.com/tehSLy/efform) ⛔ — Form manager based on a state manager, designed for high-quality DX.
* [effector-reform](https://github.com/movpushmov/effector-reform) ☢️ — Form manager implementing the concept of composite forms.

### Templates

* [ViteJS+React Template](https://github.com/effector/vite-react-template) 💚 — Try effector with React and TypeScript in seconds!
* [ViteJS+TypeScript Template](https://github.com/mmnkuh/effector-vite-template) 🛠 — Another ViteJS + TypeScript template.


# Examples

It's difficult to overestimate the learning curve for any technology.
That's why effector provides you a few simple examples that may cover your basic needs and also give more confidence for the users for upcoming projects using effector.

### Simple examples

#### UI loading

To display loader during effects resolving

#### Effects sequence

We'll need it when second request to the server requires resolved data from the first one

<!-- TODO write example with abort with farfetched

### [Abort effect](https://share.effector.dev/W4I0ghLt)

When we need to cancel our effect since it's pointless at the time

-->

#### Modal dialog

To connect react modal with state

#### Range input

To connect a custom range input component with state

### More examples

* [Snake game (interactive A\* algorithm visualisation)](https://dmitryshelomanov.github.io/snake/) ([source code](https://github.com/dmitryshelomanov/snake))
* [Ballcraft game](https://ballcraft.now.sh/) ([source code](https://github.com/kobzarvs/effector-craftball))
* [Client-server interaction with effects](https://github.com/effector/effector/tree/master/examples/worker-rpc) GitHub
* Tree folder structure
* Reddit reader With effects for data fetching and effector-react hooks <!-- Reddit api is disabled, example not working! -->
  <!-- - [Lists rendering](https://share.effector.dev/OlakwECa) With `useList` hook Example with forbidden event calls in pure functions -->
  <!-- - [Dynamic typing status](https://share.effector.dev/tAnzG5oJ) example with watch calls in effect for aborting -->
* Conditional filtering
  <!-- - [Request cancellation](https://share.effector.dev/W4I0ghLt) just rewrite it in farfetched -->
  <!-- - [Dynamic form fields, saving and loading from localStorage with effects](https://share.effector.dev/Qxt0zAdd) rewrite it with models -->
  <!-- - [Loading initial state from localStorage with domains](https://share.effector.dev/YbiBnyAD) rewrite it with effector-storage -->
* Dynamic page selection with useStoreMap
* Update on scroll
* Night theme switcher component

<!-- - [Computed bounce menu animation](https://share.effector.dev/ZXEtGBBq) on with derived store -->

* Values history
* Read default state from backend
  <!-- - [Requests cache](https://share.effector.dev/jvE7r0By) rewrite with farfetched -->
  <!-- - [Watch last two store state values](https://share.effector.dev/LRVsYhIc) -->
  <!-- - [Basic todolist example](https://codesandbox.io/s/vmx6wxww43) Codesandbox update example -->
* [Recent users projects](https://github.com/effector/effector/network/dependents)
* [BallSort game](https://ballsort.sova.dev/) with [source code](https://github.com/sergeysova/ballsort)
* [Sudoku game](https://sudoku-effector.pages.dev/) with [source code](https://github.com/Shiyan7/sudoku-effector)

<!-- - [RealWorld app](https://github.com/mg901/react-effector-realworld-example-app) ([RealWorld apps](https://github.com/gothinkster/realworld)) -->


# Getting Started with Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## Quick start with Effector

Effector is a powerful state manager that offers a fundamentally new approach to data management in applications. Unlike traditional solutions where state is changed directly through actions, Effector uses a reactive and declarative approach.

### Effector Features

* Effector is reactive 🚀: Effector automatically tracks dependencies and updates all related parts of the application, eliminating the need to manually manage updates.
* Declarative code 📝: You describe the relationships between data and their transformations, while Effector takes care of how and when to perform these transformations.
* Predictable testing ✅: Isolated contexts make testing business logic simple and reliable.
* Flexible architecture 🏗️: Effector works equally well for both small applications and large enterprise systems.
* Versatility 🔄: While Effector integrates perfectly with popular frameworks, it can be used in any JavaScript environment.

More about effector core concepts you can read here

### Install effector

To get started, install Effector using your favorite package manager:

<Tabs>
  <TabItem label="npm">

```bash
npm install effector
```

  </TabItem>
  <TabItem label="yarn">

```bash
yarn install effector
```

  </TabItem>
  <TabItem label="pnpm">

```bash
pnpm install effector
```

  </TabItem>
</Tabs>

#### Creating Your First Store

Now, let’s create a store, which represents a state of your application:

```ts
import { createStore } from "effector";

const $counter = createStore(0);
```

#### Adding events

Next, let’s create some events, that will update our store when triggered:

```ts
import { createEvent } from "effector";

const incremented = createEvent();
const decremented = createEvent();
```

#### Connecting Events to Store

And link the events to the store:

```ts
// counter.js
import { createEvent, createStore } from "effector";

const $counter = createStore(0);

const incremented = createEvent();
const decremented = createEvent();

$counter.on(incremented, (counter) => counter + 1);
$counter.on(decremented, (counter) => counter - 1);

// and call it somewhere in your app
incremented();
// counter will increase by 1
decremented();
// counter will decrease by -1
decremented();
// counter will decrease by -1
```

### Framework Integration

#### Installation

If you want to use Effector with a specific framework, you’ll need to install an additional package:

<Tabs syncId="framework-choice">
  <TabItem label="React">

```bash
npm install effector effector-react
```

  </TabItem>
  <TabItem label="Vue">

```bash
npm install effector effector-vue
```

  </TabItem>
  <TabItem label="Solid">

```bash
npm install effector effector-solid
```

  </TabItem>
</Tabs>

#### Usage examples

And use it like this:

<Tabs syncId="framework-choice">
  <TabItem label="React">

```jsx
import { useUnit } from "effector-react";
import { createEvent, createStore } from "effector";
import { $counter, incremented, decremented } from "./counter.js";

export const Counter = () => {
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // or
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // or
  const counter = useUnit($counter);
  const onIncremented = useUnit(incremented);
  const onDecremented = useUnit(decremented);

  return (
    <div>
      <h1>Count: {counter}</h1>
      <button onClick={onIncremented}>Increment</button>
      <button onClick={onDecremented}>Decrement</button>
    </div>
  );
};
```

  </TabItem>
  <TabItem label="Vue">

```html
<script setup>
  import { useUnit } from "@effector-vue/composition";
  import { $counter, incremented, decremented } from "./counter.js";
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // or
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // or
  const counter = useUnit($counter);
  const onIncremented = useUnit(incremented);
  const onDecremented = useUnit(decremented);
</script>

<template>
  <div>
    <h1>Count: {{ counter }}</h1>
    <button @click="onIncremented">Increment</button>
    <button @click="onDecremented">Decrement</button>
  </div>
</template>
```

  </TabItem>
  <TabItem label="Solid">

```jsx
import { createEvent, createStore } from "effector";
import { useUnit } from "effector-solid";
import { $counter, incremented, decremented } from "./counter.js";

const Counter = () => {
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // or
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // or
  const counter = useUnit($counter);
  const onIncremented = useUnit(incremented);
  const onDecremented = useUnit(decremented);

  return (
    <div>
      <h1>Count: {counter()}</h1>
      <button onClick={onIncremented}>Increment</button>
      <button onClick={onDecremented}>Decrement</button>
    </div>
  );
};

export default Counter;
```

  </TabItem>
</Tabs>

> INFO What about Svelte ?: 
>
> No additional packages are required to use Effector with Svelte. It works seamlessly with the base Effector package.


# Installation

import Tabs from "../../../../components/Tabs/Tabs.astro";
import TabItem from "../../../../components/Tabs/TabItem.astro";

## Installation

### Via package manager

Effector doesn't depend on NPM, you can use any package manager you want.<br/>

<Tabs>
  <TabItem label="npm">

```bash
npm install effector
```

  </TabItem>
  <TabItem label="yarn">

```bash
yarn install effector
```

  </TabItem>
  <TabItem label="pnpm">

```bash
pnpm install effector
```

  </TabItem>
</Tabs>

### Supported Frameworks

Additionally, to ensure proper integration with popular frameworks, you can also install an additional package.

<Tabs>
  <TabItem label="React">

```bash
npm install effector effector-react
```

  </TabItem>
  <TabItem label="Vue">

```bash
npm install effector effector-vue
```

  </TabItem>
  <TabItem label="Solid">

```bash
npm install effector effector-solid
```

  </TabItem>
</Tabs>

> INFO About Svelte: 
>
> Svelte works with effector out of the box, no additional packages needed.

Also, you can start from [Stackblitz template](https://stackblitz.com/fork/github/effector/vite-react-template) with [TypeScript](https://typescriptlang.org/), [ViteJS](https://vitejs.dev/), and [React](https://reactjs.org/) already set up.

### Online playground

Examples in this documentation are running in [our online playground](https://share.effector.dev), which allows someone to test and share ideas quickly, without install. Code sharing, TypeScript and React supported out of the box. [Project repository](https://github.com/effector/repl).

### Deno

> INFO since: 
>
> [effector 21.0.0](https://changelog.effector.dev/#effector-21-0-0)

Just import `effector.mjs` from any CDN.

```typescript
import { createStore } from "https://cdn.jsdelivr.net/npm/effector/effector.mjs";
```

Sample CDNS:

* https://www.jsdelivr.com/package/npm/effector
* https://cdn.jsdelivr.net/npm/effector/effector.cjs.js
* https://cdn.jsdelivr.net/npm/effector/effector.mjs
* https://cdn.jsdelivr.net/npm/effector-react/effector-react.cjs.js
* https://cdn.jsdelivr.net/npm/effector-vue/effector-vue.cjs.js

### DevTools

Use [effector-logger](https://github.com/effector/logger) for printing updates to console, displaying current store values with browser ui and connecting application to familiar redux devtools.

For server-side rendering and writing test you may need plugins for your compiler toolkit:

#### Babel

To use Babel plugin, you don't need to install additional packages, plugin bundled to `effector` package.

Read this for more details.

#### SWC

```bash
npm install -ED @effector/swc-plugin @swc/core
```

Documentation.

### Compatibility

The library provides separate modules with compatibility up to IE11 and Chrome 47 (browser for Smart TV devices): `effector/compat`, `effector-react/compat`, and `effector-vue/compat`

Usage with manual import replacement:

```diff
- import {createStore} from 'effector'
+ import {createStore} from 'effector/compat'
```

Usage with [babel-plugin-module-resolver](https://github.com/tleunen/babel-plugin-module-resolver) in your `.babelrc`:

```json
{
  "plugins": [
    [
      "babel-plugin-module-resolver",
      {
        "alias": {
          "^effector$": "effector/compat",
          "^effector-react$": "effector-react/compat"
        }
      }
    ]
  ]
}
```

#### Polyfills

Effector uses some APIs and objects that older browsers may not have, so you may need to install them yourself if you intend to support such browsers.

You may need to install the following polyfills:

* `Promise`
* `Object.assign`
* `Array.prototype.flat`


# Motivation

## Motivation

Modern web application development is becoming more complex every day. Multiple frameworks, complex business logic, different approaches to state management — all of this creates additional challenges for developers. Effector offers an elegant solution to these problems.

### Why Effector?

Effector was designed to describe application business logic in a simple and clear language using three basic primitives:

* Event — for describing events
* Store — for state management
* Effect — for handling side effects

At the same time, user interface logic is handled by the framework.
Let each framework efficiently address its specific task.

### Separation of Concerns

In modern development, business logic and user interface are clearly separated:

**Business Logic** — is the essence of your application, the reason it exists. It can be complex and based on reactive principles, but it defines how your product works.

**UI Logic** — is how users interact with business logic through the interface. These are buttons, forms, and other control elements.

### This is Why Effector!

In real projects, tasks from product managers rarely contain interface implementation details. Instead, they describe user interaction scenarios with the system. Effector allows you to describe these scenarios in the same language that the development team uses:

* Users interact with the application → Event
* See changes on the page → Store
* Application interacts with the outside world → Effect

### Framework agnostic

Despite React, Angular, and Vue having different approaches to development, application business logic remains unchanged. Effector allows you to describe it uniformly, regardless of the chosen framework.
This means you can:

1. Focus on business logic, not framework specifics
2. Easily reuse code between different parts of the application
3. Create more maintainable and scalable solutions


# Countdown timer on setTimeout

Sometimes we need a simple countdown. The next example allows us to handle each tick and abort the timer.

Link to a playground

Task:

1. Execute tick every `timeout` milliseconds
2. Each tick should send left seconds to listeners
3. Countdown can be stopped (`abort` argument)
4. Countdown can't be started if already started

```js
function createCountdown(name, { start, abort = createEvent(`${name}Reset`), timeout = 1000 }) {
  // tick every 1 second
  const $working = createStore(true, { name: `${name}Working` });
  const tick = createEvent(`${name}Tick`);
  const timerFx = createEffect(`${name}Timer`).use(() => wait(timeout));

  $working.on(abort, () => false).on(start, () => true);

  sample({
    source: start,
    filter: timerFx.pending.map((is) => !is),
    target: tick,
  });

  sample({
    clock: tick,
    target: timerFx,
  });

  const willTick = sample({
    source: timerFx.done.map(({ params }) => params - 1),
    filter: (seconds) => seconds >= 0,
  });

  sample({
    source: willTick,
    filter: $working,
    target: tick,
  });

  return { tick };
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
```

Usage:

```js
const startCountdown = createEvent();
const abortCountdown = createEvent();

const countdown = createCountdown("simple", {
  start: startCountdown,
  abort: abortCountdown,
});

// handle each tick
countdown.tick.watch((remainSeconds) => {
  console.info("Tick. Remain seconds: ", remainSeconds);
});

// let's start
startCountdown(15); // 15 ticks to count down, 1 tick per second

// abort after 5 second
setTimeout(abortCountdown, 5000);
```


# Integrate Next.js with effector

There is the official Next.js bindings package - [`@effector/next`](https://github.com/effector/next). Follow its documentation to find out, how to integrate Next.js with effector.


# Integrate with Next.js router

> TIP: 
>
> There is the official Next.js bindings package - [`@effector/next`](https://github.com/effector/next). Follow its documentation to find out, how to integrate Next.js with effector.

This is a simplified example of integration with the Next.js router.
We create a similar model for storing the router instance:

```js
import { attach, createEvent, createStore, sample } from 'effector';
import { NextRouter } from 'next/router';

const attachRouterEv = createEvent<NextRouter | null>();
const $router = createStore<NextRouter | null>(null);

$router.on(attachRouterEv, (_, router) => router);

const goToRouteEv = createEvent<string>();

const goToRouteFx = attach({
    source: $router,
    effect: (router, param) => {
        return router && router.asPath !== param && router.push(param);
    },
});

sample({
    clock: goToRouteEv,
    target: goToRouteFx,
});

export { $router, attachRouterEv, goToRouteFx };

```

We take the router instance from \_*app.tsx*:

```js
import { useUnit } from 'effector-react';
import { useRouter } from 'next/router';

    ...

    const router = useRouter();
    const attachRouter = useUnit(attachRouterEv);

    useEffect(() => {
        attachRouter(router);
    }, [router, attachRouter]);

    ...

```

And we use it in our models:

```js
import { sample } from 'effector';

    ...

sample({
    clock: redirectEv,
    fn: () => '/home',
    target: goToRouteFx,
});

```


# Use scopeBind in Next.js

> TIP: 
>
> There is the official Next.js bindings package - [`@effector/next`](https://github.com/effector/next). Follow its documentation to find out, how to integrate Next.js with effector.

There are situations when we need to get values from external libraries through callbacks.
If we directly bind events, then we will face the loss of the scope.
To solve this problem, we can use scopeBind.

We have some external library that returns us the status of our connection.
Let's call it an instance in the store and call it *$service*, and we will take the status through an event.

```js
import { createEvent, createStore } from "effector";

const $connectStatus = createStore("close");
const connectEv = createEvent();

sample({
  clock: connectEv,
  targt: $connectStatus,
});
```

Next, we need to create an effect, within which we will connect our event and *service*.

```js
import { attach, scopeBind } from "effector";

const connectFx = attach({
  source: {
    service: $service,
  },
  async effect({ service }) {
    /**
     * `scopeBind` will automatically derive current scope, if called inside of an Effect
     */
    const serviceStarted = scopeBind(connectEv);

    return await service.on("service_start", serviceStarted);
  },
});
```

After calling our effect, the event will be tied to the scope and will be able to take the current value from our *service*.


# AsyncStorage Counter on React Native

The following example is a React Native counter that stores data to AsyncStorage. It uses store, events and effects.

```js
import * as React from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-community/async-storage";

import { createStore, createEvent, createEffect, sample } from "effector";
import { useUnit } from "effector-react";

const init = createEvent();
const increment = createEvent();
const decrement = createEvent();
const reset = createEvent();

const fetchCountFromAsyncStorageFx = createEffect(async () => {
  const value = parseInt(await AsyncStorage.getItem("count"));
  return !isNaN(value) ? value : 0;
});

const updateCountInAsyncStorageFx = createEffect(async (count) => {
  try {
    await AsyncStorage.setItem("count", `${count}`, (err) => {
      if (err) console.error(err);
    });
  } catch (err) {
    console.error(err);
  }
});

const $counter = createStore(0);

sample({
  clock: fetchCountFromAsyncStorageFx.doneData,
  target: init,
});

$counter
  .on(init, (state, value) => value)
  .on(increment, (state) => state + 1)
  .on(decrement, (state) => state - 1)
  .reset(reset);

sample({
  clock: $counter,
  target: updateCountInAsyncStorageFx,
});

fetchCountFromAsyncStorageFx();

export default () => {
  const count = useUnit(counter);

  return (
    <View style={styles.container}>
      <Text style={styles.paragraph}>{count}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity key="dec" onPress={decrement} style={styles.button}>
          <Text style={styles.label}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity key="reset" onPress={reset} style={styles.button}>
          <Text style={styles.label}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity key="inc" onPress={increment} style={styles.button}>
          <Text style={styles.label}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 20,
    backgroundColor: "#ecf0f1",
    padding: 8,
  },
  paragraph: {
    margin: 24,
    fontSize: 60,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttons: {
    flexDirection: "row",
    alignSelf: "center",
    justifyContent: "space-between",
  },
  button: {
    marginHorizontal: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#4287f5",
    borderRadius: 5,
  },
  label: {
    fontSize: 30,
    color: "#ffffff",
    fontWeight: "bold",
  },
});
```


# React Counter

```js
import React from "react";
import ReactDOM from "react-dom";
import { createEvent, createStore, combine } from "effector";
import { useUnit } from "effector-react";

const plus = createEvent();

const $counter = createStore(1);

const $counterText = $counter.map((count) => `current value = ${count}`);
const $counterCombined = combine({ counter: $counter, text: $counterText });

$counter.on(plus, (count) => count + 1);

function App() {
  const counter = useUnit($counter);
  const counterText = useUnit($counterText);
  const counterCombined = useUnit($counterCombined);

  return (
    <div>
      <button onClick={plus}>Plus</button>
      <div>counter: {counter}</div>
      <div>counterText: ${counterText}</div>
      <div>
        counterCombined: {counterCombined.counter}, {counterCombined.text}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it


# Dynamic form schema

Try it

```js
import { createEvent, createEffect, createStore, createApi, sample } from "effector";
import { useList, useUnit } from "effector-react";

const submitForm = createEvent();
const addMessage = createEvent();
const changeFieldType = createEvent();

const showTooltipFx = createEffect(() => new Promise((rs) => setTimeout(rs, 1500)));

const saveFormFx = createEffect((data) => {
  localStorage.setItem("form_state/2", JSON.stringify(data, null, 2));
});
const loadFormFx = createEffect(() => {
  return JSON.parse(localStorage.getItem("form_state/2"));
});

const $fieldType = createStore("text");
const $message = createStore("done");
const $mainForm = createStore({});
const $types = createStore({
  username: "text",
  email: "text",
  password: "text",
});

const $fields = $types.map((state) => Object.keys(state));

$message.on(addMessage, (_, message) => message);

$mainForm.on(loadFormFx.doneData, (form, result) => {
  let changed = false;

  form = { ...form };
  for (const key in result) {
    const { value } = result[key];
    if (value == null) continue;
    if (form[key] === value) continue;
    changed = true;
    form[key] = value;
  }
  if (!changed) return;

  return form;
});

const mainFormApi = createApi($mainForm, {
  upsertField(form, name) {
    if (name in form) return;

    return { ...form, [name]: "" };
  },
  changeField(form, [name, value]) {
    if (form[name] === value) return;

    return { ...form, [name]: value };
  },
  addField(form, [name, value = ""]) {
    if (form[name] === value) return;

    return { ...form, [name]: value };
  },
  deleteField(form, name) {
    if (!(name in form)) return;
    form = { ...form };
    delete form[name];

    return form;
  },
});

$types.on(mainFormApi.addField, (state, [name, value, type]) => {
  if (state[name] === type) return;

  return { ...state, [name]: value };
});
$types.on(mainFormApi.deleteField, (state, name) => {
  if (!(name in state)) return;
  state = { ...state };
  delete state[name];

  return state;
});
$types.on(loadFormFx.doneData, (state, result) => {
  let changed = false;

  state = { ...state };
  for (const key in result) {
    const { type } = result[key];

    if (type == null) continue;
    if (state[key] === type) continue;
    changed = true;
    state[key] = type;
  }
  if (!changed) return;

  return state;
});

const changeFieldInput = mainFormApi.changeField.prepend((e) => [
  e.currentTarget.name,
  e.currentTarget.type === "checkbox" ? e.currentTarget.checked : e.currentTarget.value,
]);

const submitField = mainFormApi.addField.prepend((e) => [
  e.currentTarget.fieldname.value,
  e.currentTarget.fieldtype.value === "checkbox"
    ? e.currentTarget.fieldvalue.checked
    : e.currentTarget.fieldvalue.value,
  e.currentTarget.fieldtype.value,
]);

const submitRemoveField = mainFormApi.deleteField.prepend((e) => e.currentTarget.field.value);

$fieldType.on(changeFieldType, (_, e) => e.currentTarget.value);
$fieldType.reset(submitField);

submitForm.watch((e) => {
  e.preventDefault();
});
submitField.watch((e) => {
  e.preventDefault();
  e.currentTarget.reset();
});
submitRemoveField.watch((e) => {
  e.preventDefault();
});

sample({
  clock: [submitForm, submitField, submitRemoveField],
  source: { values: $mainForm, types: $types },
  target: saveFormFx,
  fn({ values, types }) {
    const form = {};

    for (const [key, value] of Object.entries(values)) {
      form[key] = {
        value,
        type: types[key],
      };
    }

    return form;
  },
});

sample({
  clock: addMessage,
  target: showTooltipFx,
});
sample({
  clock: submitField,
  fn: () => "added",
  target: addMessage,
});
sample({
  clock: submitRemoveField,
  fn: () => "removed",
  target: addMessage,
});
sample({
  clock: submitForm,
  fn: () => "saved",
  target: addMessage,
});

loadFormFx.finally.watch(() => {
  ReactDOM.render(<App />, document.getElementById("root"));
});

function useFormField(name) {
  const type = useStoreMap({
    store: $types,
    keys: [name],
    fn(state, [field]) {
      if (field in state) return state[field];

      return "text";
    },
  });
  const value = useStoreMap({
    store: $mainForm,
    keys: [name],
    fn(state, [field]) {
      if (field in state) return state[field];

      return "";
    },
  });
  mainFormApi.upsertField(name);

  return [value, type];
}

function Form() {
  const pending = useUnit(saveFormFx.pending);

  return (
    <form onSubmit={submitForm} data-form autocomplete="off">
      <header>
        <h4>Form</h4>
      </header>
      {useList($fields, (name) => (
        <InputField name={name} />
      ))}

      <input type="submit" value="save form" disabled={pending} />
    </form>
  );
}

function InputField({ name }) {
  const [value, type] = useFormField(name);
  let input = null;

  switch (type) {
    case "checkbox":
      input = (
        <input
          id={name}
          name={name}
          value={name}
          checked={value}
          onChange={changeFieldInput}
          type="checkbox"
        />
      );
      break;
    case "text":
    default:
      input = <input id={name} name={name} value={value} onChange={changeFieldInput} type="text" />;
  }

  return (
    <>
      <label htmlFor={name} style={{ display: "block" }}>
        <strong>{name}</strong>
      </label>
      {input}
    </>
  );
}

function FieldForm() {
  const currentFieldType = useUnit($fieldType);
  const fieldValue =
    currentFieldType === "checkbox" ? (
      <input id="fieldvalue" name="fieldvalue" type="checkbox" />
    ) : (
      <input id="fieldvalue" name="fieldvalue" type="text" defaultValue="" />
    );

  return (
    <form onSubmit={submitField} autocomplete="off" data-form>
      <header>
        <h4>Insert new field</h4>
      </header>
      <label htmlFor="fieldname">
        <strong>name</strong>
      </label>
      <input id="fieldname" name="fieldname" type="text" required defaultValue="" />
      <label htmlFor="fieldvalue">
        <strong>value</strong>
      </label>
      {fieldValue}
      <label htmlFor="fieldtype">
        <strong>type</strong>
      </label>
      <select id="fieldtype" name="fieldtype" onChange={changeFieldType}>
        <option value="text">text</option>
        <option value="checkbox">checkbox</option>
      </select>
      <input type="submit" value="insert" />
    </form>
  );
}

function RemoveFieldForm() {
  return (
    <form onSubmit={submitRemoveField} data-form>
      <header>
        <h4>Remove field</h4>
      </header>
      <label htmlFor="field">
        <strong>name</strong>
      </label>
      <select id="field" name="field" required>
        {useList($fields, (name) => (
          <option value={name}>{name}</option>
        ))}
      </select>
      <input type="submit" value="remove" />
    </form>
  );
}

const Tooltip = () => {
  const [visible, text] = useUnit([showTooltipFx.pending, $message]);

  return <span data-tooltip={text} data-visible={visible} />;
};

const App = () => (
  <>
    <Tooltip />
    <div id="app">
      <Form />
      <FieldForm />
      <RemoveFieldForm />
    </div>
  </>
);

await loadFormFx();

css`
  [data-tooltip]:before {
    display: block;
    background: white;
    width: min-content;
    content: attr(data-tooltip);
    position: sticky;
    top: 0;
    left: 50%;
    color: darkgreen;
    font-family: sans-serif;
    font-weight: 800;
    font-size: 20px;
    padding: 5px 5px;
    transition: transform 100ms ease-out;
  }

  [data-tooltip][data-visible="true"]:before {
    transform: translate(0px, 0.5em);
  }

  [data-tooltip][data-visible="false"]:before {
    transform: translate(0px, -2em);
  }

  [data-form] {
    display: contents;
  }

  [data-form] > header {
    grid-column: 1 / span 2;
  }

  [data-form] > header > h4 {
    margin-block-end: 0;
  }

  [data-form] label {
    grid-column: 1;
    justify-self: end;
  }

  [data-form] input:not([type="submit"]),
  [data-form] select {
    grid-column: 2;
  }

  [data-form] input[type="submit"] {
    grid-column: 2;
    justify-self: end;
    width: fit-content;
  }

  #app {
    width: min-content;
    display: grid;
    grid-column-gap: 5px;
    grid-row-gap: 8px;
    grid-template-columns: repeat(2, 3fr);
  }
`;

function css(tags, ...attrs) {
  const value = style(tags, ...attrs);
  const node = document.createElement("style");
  node.id = "insertedStyle";
  node.appendChild(document.createTextNode(value));
  const sheet = document.getElementById("insertedStyle");

  if (sheet) {
    sheet.disabled = true;
    sheet.parentNode.removeChild(sheet);
  }
  document.head.appendChild(node);

  function style(tags, ...attrs) {
    if (tags.length === 0) return "";
    let result = " " + tags[0];

    for (let i = 0; i < attrs.length; i++) {
      result += attrs[i];
      result += tags[i + 1];
    }

    return result;
  }
}
```


# Effects with React

```js
import React from "react";
import ReactDOM from "react-dom";
import { createEffect, createStore, sample } from "effector";
import { useUnit } from "effector-react";

const url =
  "https://gist.githubusercontent.com/" +
  "zerobias/24bc72aa8394157549e0b566ac5059a4/raw/" +
  "b55eb74b06afd709e2d1d19f9703272b4d753386/data.json";

const loadUserClicked = createEvent();

const fetchUserFx = createEffect((url) => fetch(url).then((req) => req.json()));

const $user = createStore(null);

sample({
  clock: loadUserClicked,
  fn: () => url,
  target: fetchUserFx,
});

$user.on(fetchUserFx.doneData, (_, user) => user.username);

const App = () => {
  const [user, pending] = useUnit([$user, fetchUserFx.pending]);
  const handleUserLoad = useUnit(loadUserClicked);
  return (
    <div>
      {user ? <div>current user: {user}</div> : <div>no current user</div>}
      <button disable={pending} onClick={handleUserLoad}>
        load user
      </button>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it


# Forms

### Example 1

```jsx
import React from "react";
import ReactDOM from "react-dom";
import { createEffect, createStore, createEvent, sample } from "effector";
import { useStoreMap } from "effector-react";

const formSubmitted = createEvent();
const fieldUpdate = createEvent();

const sendFormFx = createEffect((params) => {
  console.log(params);
});

const $form = createStore({});

$form.on(fieldUpdate, (form, { key, value }) => ({
  ...form,
  [key]: value,
}));

sample({
  clock: formSubmitted,
  source: $form,
  target: sendFormFx,
});

const handleChange = fieldUpdate.prepend((event) => ({
  key: event.target.name,
  value: event.target.value,
}));

const Field = ({ name, type, label }) => {
  const value = useStoreMap({
    store: $form,
    keys: [name],
    fn: (values) => values[name] ?? "",
  });
  return (
    <div>
      {label} <input name={name} type={type} value={value} onChange={handleChange} />
    </div>
  );
};

const App = () => (
  <form onSubmit={formSubmitted}>
    <Field name="login" label="Login" />
    <Field name="password" type="password" label="Password" />
    <button type="submit">Submit!</button>
  </form>
);

formSubmitted.watch((e) => {
  e.preventDefault();
});

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it

Let's break down the code above.

These are just events & effects definitions.

```js
const sendFormFx = createEffect((params) => {
  console.log(params);
});
const formSubmitted = createEvent(); // will be used further, and indicates, we have an intention to submit form
const fieldUpdate = createEvent(); //has intention to change $form's state in a way, defined in reducer further
const $form = createStore({});

$form.on(fieldUpdate, (form, { key, value }) => ({
  ...form,
  [key]: value,
}));
```

The next piece of code shows how we can obtain a state in effector in the right way. This kind of state retrieving provides state consistency, and removes any possible race conditions, which can occur in some cases, when using `getState`.

```js
sample({
  clock: formSubmitted, // when `formSubmitted` is triggered
  source: $form, // Take LATEST state from $form, and
  target: sendFormFx, // pass it to `sendFormFx`, in other words -> sendFormFx(state)
  //fn: (sourceState, clockParams) => transformedData // we could additionally transform data here, but if we need just pass source's value, we may omit this property
});
```

So far, so good, we've almost set up our model (events, effects and stores). Next thing is to create event, which will be used as `onChange` callback, which requires some data transformation, before data appear in `fieldUpdate` event.

```js
const handleChange = fieldUpdate.prepend((event) => ({
  key: event.target.name,
  value: event.target.value,
})); // upon trigger `handleChange`, passed data will be transformed in a way, described in function above, and returning value will be passed to original `setField` event.
```

Next, we have to deal with how inputs should work. useStoreMap hook here prevents component rerender upon non-relevant changes.

```jsx
const Field = ({ name, type, label }) => {
  const value = useStoreMap({
    store: $form, // take $form's state
    keys: [name], // watch for changes of `name`
    fn: (values) => values[name] ?? "", // retrieve data from $form's state in this way (note: there will be an error, if undefined is returned)
  });

  return (
    <div>
      {label}{" "}
      <input
        name={name}
        type={type}
        value={value}
        onChange={handleChange /*note, bound event is here!*/}
      />
    </div>
  );
};
```

And, finally, the `App` itself! Note, how we got rid of any business-logic in view layer. It's simpler to debug, to share logic, and even more: logic is framework independent now.

```jsx
const App = () => (
  <form onSubmit={submitted /*note, there is an event, which is `clock` for `sample`*/}>
    <Field name="login" label="Login" />
    <Field name="password" type="password" label="Password" />
    <button type="submit">Submit!</button>
  </form>
);
```

Prevent the default html form submit behavior using react event from `submitted`:

```js
submitted.watch((e) => {
  e.preventDefault();
});
```

### Example 2

This example demonstrates how to manage state by using an uncontrolled form, handle data loading, create components that depend on stores, and transform data passed between events.

```jsx
import React from "react";
import ReactDOM from "react-dom";
import { createEffect, createStore } from "effector";
import { useUnit } from "effector-react";

//defining simple Effect, which results a string in 3 seconds
const sendFormFx = createEffect(
  (formData) => new Promise((rs) => setTimeout(rs, 1000, `Signed in as [${formData.get("name")}]`)),
);

const Loader = () => {
  //typeof loading === "boolean"
  const loading = useUnit(sendFormFx.pending);
  return loading ? <div>Loading...</div> : null;
};

const SubmitButton = (props) => {
  const loading = useUnit(sendFormFx.pending);
  return (
    <button disabled={loading} type="submit">
      Submit
    </button>
  );
};

//transforming upcoming data, from DOM Event to FormData
const onSubmit = sendFormFx.prepend((e) => new FormData(e.target));

const App = () => {
  const submit = useUnit(onSubmit);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e);
      }}
    >
      Login: <input name="name" />
      <br />
      Password: <input name="password" type="password" />
      <br />
      <Loader />
      <SubmitButton />
    </form>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it


# Gate

Gate is a bridge between props and stores.

Imagine you have the task of transferring something from React props to the effector store.
Suppose you pass the history object from the react-router to the store, or pass some callbacks from render-props.
In a such situation Gate will help.

```js
import { createStore, createEffect, sample } from "effector";
import { useUnit, createGate } from "effector-react";

// Effect for api request
const getTodoFx = createEffect(async ({ id }) => {
  const req = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`);
  return req.json();
});

// Our main store
const $todo = createStore(null);
const TodoGate = createGate();

$todo.on(getTodoFx.doneData, (_, todo) => todo);

// We call getTodoFx effect every time Gate updates its state.
sample({ clock: TodoGate.state, target: getTodoFx });

TodoGate.open.watch(() => {
  //called each time when TodoGate is mounted
});
TodoGate.close.watch(() => {
  //called each time when TodoGate is unmounted
});

function Todo() {
  const [todo, loading] = useUnit([$todo, getTodoFx.pending]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!todo || Object.keys(todo).length === 0) {
    return <div>empty</div>;
  }

  return (
    <div>
      <p>title: {todo.title}</p>
      <p>id: {todo.id}</p>
    </div>
  );
}

const App = () => {
  // value which need to be accessed outside from react
  const [id, setId] = React.useState(0);

  return (
    <>
      <button onClick={() => setId(id + 1)}>Get next Todo</button>
      {/*In this situation, we have the ability to simultaneously
      render a component and make a request, rather than wait for the component*/}
      <TodoGate id={id} />
      <Todo />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
```

Try it


# Slots

A slot is a place in a component where you can insert any unknown component. It's a well-known abstraction used by frameworks
such as Vue.js and Svelte.

Slots aren't present in the React. With React, you can achieve this goal using props or `React.Context`.
In large projects, this is not convenient, because it generates "props hell" or smears the logic.

Using React with effector, we can achieve slot goals without the problems described above.

* [Slots proposal](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Slots-Proposal)
* [Vue.js docs](https://v3.vuejs.org/guide/component-slots.html)
* [Svelte docs](https://svelte.dev/docs#slot)
* [@space307/effector-react-slots](https://github.com/space307/effector-react-slots)

[Open ReplIt](https://replit.com/@binjospookie/effector-react-slots-example)

```tsx
import { createApi, createStore, createEvent, sample, split } from "effector";
import { useStoreMap } from "effector-react";
import React from "react";

import type { ReactElement, PropsWithChildren } from "react";

type Component<S> = (props: PropsWithChildren<S>) => ReactElement | null;
type Store<S> = {
  readonly component: Component<S>;
};

function createSlotFactory<Id>({ slots }: { readonly slots: Record<string, Id> }) {
  const api = {
    remove: createEvent<{ readonly id: Id }>(),
    set: createEvent<{ readonly id: Id; readonly component: Component<any> }>(),
  };

  function createSlot<P>({ id }: { readonly id: Id }) {
    const defaultToStore: Store<P> = {
      component: () => null,
    };
    const $slot = createStore<Store<P>>(defaultToStore);
    const slotApi = createApi($slot, {
      remove: (state) => ({ ...state, component: defaultToStore.component }),
      set: (state, payload: Component<P>) => ({ ...state, component: payload }),
    });
    const isSlotEventCalling = (payload: { readonly id: Id }) => payload.id === id;

    sample({
      clock: api.remove,
      filter: isSlotEventCalling,
      target: slotApi.remove,
    });

    sample({
      clock: api.set,
      filter: isSlotEventCalling,
      fn: ({ component }) => component,
      target: slotApi.set,
    });

    function Slot(props: P = {} as P) {
      const Component = useStoreMap({
        store: $slot,
        fn: ({ component }) => component,
        keys: [],
      });

      return <Component {...props} />;
    }

    return {
      $slot,
    };
  }

  return {
    api,
    createSlot,
  };
}

const SLOTS = { FOO: "foo" } as const;

const { api, createSlot } = createSlotFactory({ slots: SLOTS });

const { Slot: FooSlot } = createSlot({ id: SLOTS.FOO });

const ComponentWithSlot = () => (
  <>
    <h1>Hello, Slots!</h1>
    <FooSlot />
  </>
);

const updateFeatures = createEvent<string>("");
const $featureToggle = createStore<string>("");

const MyAwesomeFeature = () => <p>Look at my horse</p>;
const VeryAwesomeFeature = () => <p>My horse is amaizing</p>;

$featureToggle.on(updateFeatures, (_, feature) => feature);

split({
  source: $featureToggle,
  match: {
    awesome: (data) => data === "awesome",
    veryAwesome: (data) => data === "veryAwesome",
    hideAll: (data) => data === "hideAll",
  },
  cases: {
    awesome: api.set.prepend(() => ({
      id: SLOTS.FOO,
      component: MyAwesomeFeature,
    })),
    veryAwesome: api.set.prepend(() => ({
      id: SLOTS.FOO,
      component: VeryAwesomeFeature,
    })),
    hideAll: api.remove.prepend(() => ({ id: SLOTS.FOO })),
  },
});

// updateFeatures('awesome'); // render MyAwesomeFeature in slot
// updateFeatures('veryAwesome'); // render VeryAwesomeFeature in slot
// updateFeatures('hideAll'); // render nothing in slot
```


# ToDo creator

Try it

```tsx
import React from "react";
import ReactDOM from "react-dom";
import { createStore, createEvent, sample } from "effector";
import { useUnit, useList } from "effector-react";

function createTodoListApi(initial: string[] = []) {
  const insert = createEvent<string>();
  const remove = createEvent<number>();
  const change = createEvent<string>();
  const reset = createEvent<void>();

  const $input = createStore<string>("");
  const $todos = createStore<string[]>(initial);

  $input.on(change, (_, value) => value);

  $input.reset(insert);
  $todos.on(insert, (todos, newTodo) => [...todos, newTodo]);

  $todos.on(remove, (todos, index) => todos.filter((_, i) => i !== index));

  $input.reset(reset);

  const submit = createEvent<React.SyntheticEvent>();
  submit.watch((event) => event.preventDefault());

  sample({
    clock: submit,
    source: $input,
    target: insert,
  });

  return {
    submit,
    remove,
    change,
    reset,
    $todos,
    $input,
  };
}

const firstTodoList = createTodoListApi(["hello, world!"]);
const secondTodoList = createTodoListApi(["hello, world!"]);

function TodoList({ label, model }) {
  const input = useUnit(model.$input);

  const todos = useList(model.$todos, (value, index) => (
    <li>
      {value}{" "}
      <button type="button" onClick={() => model.remove(index)}>
        Remove
      </button>
    </li>
  ));

  return (
    <>
      <h1>{label}</h1>
      <ul>{todos}</ul>
      <form>
        <label>Insert todo: </label>
        <input
          type="text"
          value={input}
          onChange={(event) => model.change(event.currentTarget.value)}
        />
        <input type="submit" onClick={model.submit} value="Insert" />
      </form>
    </>
  );
}

function App() {
  return (
    <>
      <TodoList label="First todo list" model={firstTodoList} />
      <TodoList label="Second todo list" model={secondTodoList} />
    </>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
```


# TODO list with input validation

Try it

```js
import { createEvent, createStore, createEffect, restore, combine, sample } from "effector";
import { useUnit, useList } from "effector-react";

const submit = createEvent();
const submitted = createEvent();
const completed = createEvent();
const changed = createEvent();
const removed = createEvent();

const validateFx = createEffect(([todo, todos]) => {
  if (todos.some((item) => item.text === todo)) throw "This todo is already on the list";
  if (!todo.trim().length) throw "Required field";
  return null;
});

const $todo = createStore("");
const $todos = createStore([]);
const $error = createStore("");

$todo.on(changed, (_, todo) => todo);
$error.reset(changed);

$todos.on(completed, (list, index) =>
  list.map((todo, foundIndex) => ({
    ...todo,
    completed: index === foundIndex ? !todo.completed : todo.completed,
  })),
);
$todos.on(removed, (state, index) => state.filter((_, i) => i !== index));

sample({
  clock: submit,
  source: [$todo, $todos],
  target: validateFx,
});

sample({
  clock: validateFx.done,
  source: $todo,
  target: submitted,
});

$todos.on(submitted, (list, text) => [...list, { text, completed: false }]);
$todo.reset(submitted);

$error.on(validateFx.failData, (_, error) => error);

submit.watch((e) => e.preventDefault());

const App = () => {
  const [todo, error] = useUnit([$todo, $error]);
  const list = useList($todos, (todo, index) => (
    <li style={{ textDecoration: todo.completed ? "line-through" : "" }}>
      <input type="checkbox" checked={todo.completed} onChange={() => completed(index)} />
      {todo.text}
      <button type="button" onClick={() => removed(index)} className="delete">
        x
      </button>
    </li>
  ));
  return (
    <div>
      <h1>Todos</h1>
      <form>
        <input
          className="text"
          type="text"
          name="todo"
          value={todo}
          onChange={(e) => changed(e.target.value)}
        />
        <button type="submit" onClick={submit} className="submit">
          Submit
        </button>
        {error && <div className="error">{error}</div>}
      </form>

      <ul style={{ listStyle: "none" }}>{list}</ul>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
```


# How to Think in the Effector

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## How to Think in the Effector Paradigm

Effector is not just a state manager — it's also a powerful tool for building application logic. Here, we'll go over best practices for writing code and how to approach thinking when using Effector.

### How to approach development with Effector in the right way

To use Effector effectively, it's important to grasp a few key principles.

#### Events as the Source of Truth

An application is a stream of changes. Every change is an event. It's crucial to understand that an event **does not decide what to do** — it simply records that something happened. This is a key point that helps avoid tight dependencies.

* **An event is just a fact**: "something happened."
* **Events contain no logic** — they only declare an occurrence but do not decide how to respond.
* **One fact can lead to multiple consequences** — a single event can trigger several independent processes.

Example:

```ts
// Don't think about implementation yet — just declare the fact
const searchInputChanged = createEvent();
const buttonClicked = createEvent();
```

> TIP Use Meaningful Names: 
>
> Give events meaningful names. For example, if you need to load data upon a certain action, the event should be tied to the action, not its implementation:
>
> ```ts
> ❌ const fetchData = createEvent();
> ✅ const appStarted = createEvent();
> ```

#### Business Logic and UI Are Separate

A good architectural approach is to keep business logic separate from the user interface. Effector makes this easy, keeping the UI simple and the logic clean and reusable.

* The UI only displays data.
* Effector manages state and logic.

### How Does This Look in a Real Application?

Let's take GitHub as an example, with buttons like "Watch," "Fork," and "Star." Every user action is an event:

![GitHub repository action buttons](/images/github-repo-actions.png)

* The user toggled a star - `repoStarToggled`
* The search input in the repository changed - `repoFileSearchChanged`
* The repository was forked - `repoForked`

The logic is built around events and their reactions. The UI simply announces an action, while its handling is part of the business logic.

A simplified example of the logic behind the star button:

<Tabs>  
<TabItem label="Business Logic">

```ts
// repo.model.ts

// Event – fact of an action
const repoStarToggled = createEvent();

// Effects as additional reactions to events
// (assuming effects return updated values)
const starRepoFx = createEffect(() => {});
const unstarRepoFx = createEffect(() => {});

// Application state
const $isRepoStarred = createStore(false);
const $repoStarsCount = createStore(0);

// Toggle star logic
sample({
  clock: repoStarToggled,
  source: $isRepoStarred,
  fn: (isRepoStarred) => !isRepoStarred,
  target: $isRepoStarred,
});

// Send request to server when star is toggled
sample({
  clock: $isRepoStarred,
  filter: (isRepoStarred) => isRepoStarred,
  target: starRepoFx,
});

sample({
  clock: $isRepoStarred,
  filter: (isRepoStarred) => !isRepoStarred,
  target: unstarRepoFx,
});

// Update the star count
sample({
  clock: [starRepoFx.doneData, unstarRepoFx.doneData],
  target: $repoStarsCount,
});
```

</TabItem>  
<TabItem label="UI">

```tsx
import { repoStarToggled, $isRepoStarred, $repoStarsCount } from "./repo.model.ts";

const RepoStarButton = () => {
  const [onStarToggle, isRepoStarred, repoStarsCount] = useUnit([
    repoStarToggled,
    $isRepoStarred,
    $repoStarsCount,
  ]);

  return (
    <div>
      <button onClick={onStarToggle}>{isRepoStarred ? "unstar" : "star"}</button>
      <span>{repoStarsCount}</span>
    </div>
  );
};
```

</TabItem>  
</Tabs>

At the same time, the UI doesn't need to know what's happening internally — it's only responsible for triggering events and displaying data.


# Releases policy

## Releases policy

The main goal of effector is to **make developer experience better**, as a part of this strategy we are committing to some rules of effector releases.

### No breaking changes without prior deprecation

Before each breaking change, the effector must provide a deprecation warning for **at least a year before.**

For example:

* When version 22 was released, feature "A" was marked as deprecated. The library gives a warning to the console when it is used.
* A year later, in version 23 release, feature "A" is removed.

### Release cycle

Major updates (i.e. with breaking changes) of the effector are released **no more than once a year.**

Minor and patch updates (i.e., with fixes and new features) are released when ready. If a new feature requires breaking changes – it is also released in a major update.

This is necessary to allow developers to plan their work smoothly, taking into account possible changes in effector.

It also obliges effector maintainers to be extremely careful when designing new features and breaking changes to old library features, because the opportunity to remove or heavily modify something in the public API only appears once every two years.


# Usage with effector-react

**TypeScript** is a typed superset of JavaScript. It became popular
recently in applications due to the benefits it can bring. If you are new to
TypeScript, it is highly recommended to become familiar with it first, before
proceeding. You can check out its documentation
[here](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html).

TypeScript has a potential to bring the following benefits to application:

1. Type safety for state, stores and events
2. Easy refactoring of typed code
3. A superior developer experience in a team environment

**A Practical Example**

We will be going through a simplistic chat application to demonstrate a
possible approach to include static typing. This chat application will have API mock that load and saves data from localStorage.

The full source code is available on
[github](https://github.com/effector/effector/tree/master/examples/react-and-ts).
Note that, by going through this example yourself, you will experience some benefits of using TypeScript.

### Let's create API mock

There is a directory structure inherited from the [feature-sliced](https://feature-sliced.github.io/documentation/) methodology.

Let's define a simple type, that our improvised API will return.

```ts
// File: /src/shared/api/message.ts
interface Author {
  id: string;
  name: string;
}

export interface Message {
  id: string;
  author: Author;
  text: string;
  timestamp: number;
}
```

Our API will load and save data to `localStorage`, and we need some functions to load data:

```ts
// File: /src/shared/api/message.ts
const LocalStorageKey = "effector-example-history";

function loadHistory(): Message[] | void {
  const source = localStorage.getItem(LocalStorageKey);
  if (source) {
    return JSON.parse(source);
  }
  return undefined;
}
function saveHistory(messages: Message[]) {
  localStorage.setItem(LocalStorageKey, JSON.stringify(messages));
}
```

I also created some libraries to generate identifiers and wait to simulate network requests.

```ts
// File: /src/shared/lib/oid.ts
export const createOid = () =>
  ((new Date().getTime() / 1000) | 0).toString(16) +
  "xxxxxxxxxxxxxxxx".replace(/[x]/g, () => ((Math.random() * 16) | 0).toString(16)).toLowerCase();
```

```ts
// File: /src/shared/lib/wait.ts
export function wait(timeout = Math.random() * 1500) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
```

OK. Now we can create effects that will load messages.

```ts
// File: /src/shared/api/message.ts
// Here effect defined with static types. void defines no arguments.
// Second type argument defines a successful result type.
// Third argument is optional and defines a failure result type.
export const messagesLoadFx = createEffect<void, Message[], Error>(async () => {
  const history = loadHistory();
  await wait();
  return history ?? [];
});

interface SendMessage {
  text: string;
  author: Author;
}

// But we can use type inferring and set arguments types in the handler defintion.
// Hover your cursor on `messagesLoadFx` to see the inferred types:
// `Effect<{ text: string; authorId: string; authorName: string }, void, Error>`
export const messageSendFx = createEffect(async ({ text, author }: SendMessage) => {
  const message: Message = {
    id: createOid(),
    author,
    timestamp: Date.now(),
    text,
  };
  const history = await messagesLoadFx();
  saveHistory([...history, message]);
  await wait();
});

// Please, note that we will `wait()` for `messagesLoadFx` and `wait()` in the current effect
// Also, note that `saveHistory` and `loadHistory` can throw exceptions,
// in that case effect will trigger `messageDeleteFx.fail` event.
export const messageDeleteFx = createEffect(async (message: Message) => {
  const history = await messagesLoadFx();
  const updated = history.filter((found) => found.id !== message.id);
  await wait();
  saveHistory(updated);
});
```

OK, now we are done with the messages, let's create effects to manage user session.

Really, I prefer to start design code from implementing interfaces:

```ts
// File: /src/shared/api/session.ts
// It is called session because it describes current user session, not the User at all.
export interface Session {
  id: string;
  name: string;
}
```

Also, to generate usernames and don't require to type it by themselves, import `unique-names-generator`:

```ts
// File: /src/shared/api/session.ts
import { uniqueNamesGenerator, Config, starWars } from "unique-names-generator";

const nameGenerator: Config = { dictionaries: [starWars] };
const createName = () => uniqueNamesGenerator(nameGenerator);
```

Let's create effects to manage session:

```ts
// File: /src/shared/api/session.ts
const LocalStorageKey = "effector-example-session";

// Note, that we need explicit types definition in that case, because `JSON.parse()` returns `any`
export const sessionLoadFx = createEffect<void, Session | null>(async () => {
  const source = localStorage.getItem(LocalStorageKey);
  await wait();
  if (!source) {
    return null;
  }
  return JSON.parse(source);
});

// By default, if there are no arguments, no explicit type arguments, and no return statement provided
// effect will have type: `Effect<void, void, Error>`
export const sessionDeleteFx = createEffect(async () => {
  localStorage.removeItem(LocalStorageKey);
  await wait();
});

// Look at the type of the `sessionCreateFx` constant.
// It will be `Effect<void, Session, Error>` because TypeScript can infer type from `session` constant
export const sessionCreateFx = createEffect(async () => {
  // I explicitly set type for the next constant, because it allows TypeScript help me
  // If I forgot to set property, I'll see error in the place of definition
  // Also it allows IDE to autocomplete property names
  const session: Session = {
    id: createOid(),
    name: createName(),
  };
  localStorage.setItem(LocalStorageKey, JSON.stringify(session));
  return session;
});
```

How we need to import these effects?

I surely recommend writing short imports and using reexports.
It allows to securely refactor code structure inside `shared/api` and the same slices,
and don't worry about refactoring other imports and unnecessary changes in the git history.

```ts
// File: /src/shared/api/index.ts
export * as messageApi from "./message";
export * as sessionApi from "./session";

// Types reexports made just for convenience
export type { Message } from "./message";
export type { Session } from "./session";
```

### Create a page with the logic

Typical structure of the pages:

```
src/
  pages/
    <page-name>/
      page.tsx — just the View layer
      model.ts — a business-logic code
      index.ts — reexports, sometimes there will be a connection-glue code
```

I recommend writing code in the view layer from the top to bottom, more common code at the top.
Let's model our view layer. We will have two main sections at the page: messages history and a message form.

```tsx
// File: /src/pages/chat/page.tsx
export function ChatPage() {
  return (
    <div className="parent">
      <ChatHistory />
      <MessageForm />
    </div>
  );
}

function ChatHistory() {
  return (
    <div className="chat-history">
      <div>There will be messages list</div>
    </div>
  );
}

function MessageForm() {
  return (
    <div className="message-form">
      <div>There will be message form</div>
    </div>
  );
}
```

OK. Now we know what kind of structure we have, and we can start to model business-logic processes.
The view layer should do two tasks: render data from stores and report events to the model.
The view layer doesn't know how data are loaded, how it should be converted and sent back.

```ts
// File: /src/pages/chat/model.ts
import { createEvent, createStore } from "effector";

// And the events report just what happened
export const messageDeleteClicked = createEvent<Message>();
export const messageSendClicked = createEvent();
export const messageEnterPressed = createEvent();
export const messageTextChanged = createEvent<string>();
export const loginClicked = createEvent();
export const logoutClicked = createEvent();

// At the moment, there is just raw data without any knowledge how to load
export const $loggedIn = createStore<boolean>(false);
export const $userName = createStore("");
export const $messages = createStore<Message[]>([]);
export const $messageText = createStore("");

// Page should NOT know where the data came from.
// That's why we just reexport them.
// We can rewrite this code to `combine` or independent store,
// page should NOT be changed, just because we changed the implementation
export const $messageDeleting = messageApi.messageDeleteFx.pending;
export const $messageSending = messageApi.messageSendFx.pending;
```

Now we can implement components.

```tsx
// File: /src/pages/chat/page.tsx
import { useList, useUnit } from "effector-react";
import * as model from "./model";

// export function ChatPage { ... }

function ChatHistory() {
  const [messageDeleting, onMessageDelete] = useUnit([
    model.$messageDeleting,
    model.messageDeleteClicked,
  ]);

  // Hook `useList` allows React not rerender messages really doesn't changed
  const messages = useList(model.$messages, (message) => (
    <div className="message-item" key={message.timestamp}>
      <h3>From: {message.author.name}</h3>
      <p>{message.text}</p>
      <button onClick={() => onMessageDelete(message)} disabled={messageDeleting}>
        {messageDeleting ? "Deleting" : "Delete"}
      </button>
    </div>
  ));
  // We don't need `useCallback` here because we pass function to an HTML-element, not a custom component

  return <div className="chat-history">{messages}</div>;
}
```

I split `MessageForm` to the different components, to simplify code:

```tsx
// File: /src/pages/chat/page.tsx
function MessageForm() {
  const isLogged = useUnit(model.$loggedIn);
  return isLogged ? <SendMessage /> : <LoginForm />;
}

function SendMessage() {
  const [userName, messageText, messageSending] = useUnit([
    model.$userName,
    model.$messageText,
    model.$messageSending,
  ]);

  const [handleLogout, handleTextChange, handleEnterPress, handleSendClick] = useUnit([
    model.logoutClicked,
    model.messageTextChanged,
    model.messageEnterPressed,
    model.messageSendClicked,
  ]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleEnterPress();
    }
  };

  return (
    <div className="message-form">
      <h3>{userName}</h3>
      <input
        value={messageText}
        onChange={(event) => handleTextChange(event.target.value)}
        onKeyPress={handleKeyPress}
        className="chat-input"
        placeholder="Type a message..."
      />
      <button onClick={() => handleSendClick()} disabled={messageSending}>
        {messageSending ? "Sending..." : "Send"}
      </button>
      <button onClick={() => handleLogout()}>Log out</button>
    </div>
  );
}

function LoginForm() {
  const handleLogin = useUnit(model.loginClicked);

  return (
    <div className="message-form">
      <div>Please, log in to be able to send messages</div>
      <button onClick={() => handleLogin()}>Login as a random user</button>
    </div>
  );
}
```

### Manage user session like a Pro

Let's create a session entity. An entity is a business unit.

```ts
// File: /src/entities/session/index.ts
import { Session } from "shared/api";
import { createStore } from "effector";

// Entity just stores session and some internal knowledge about it
export const $session = createStore<Session | null>(null);
// When store `$session` is updated, store `$isLogged` will be updated too
// They are in sync. Derived store are depends on data from original.
export const $isLogged = $session.map((session) => session !== null);
```

Now we can implement login or logout features on the page. Why not here?
If we place login logic here, we will have a very implicit scenario,
when you call `sessionCreateFx` you won't see code called after effect.
But consequences will be visible in the DevTools and application behaviour.

Try to write the code in as obvious a way as possible in one file,
so that you and any teammate can trace the sequence of execution.

### Implement logic

OK. Now we can load a user session and the messages lists on the page mount.
But, we don't have any event when we can start. Let's fix it.

You can use Gate, but I prefer to use explicit events.

```ts
// File: /src/pages/chat/model.ts
// Just add a new event
export const pageMounted = createEvent();
```

Just add `useEffect` and call bound event inside.

```tsx
// File: /src/pages/chat/page.tsx
export function ChatPage() {
  const handlePageMount = useUnit(model.pageMounted);

  React.useEffect(() => {
    handlePageMount();
  }, [handlePageMount]);

  return (
    <div className="parent">
      <ChatHistory />
      <MessageForm />
    </div>
  );
}
```

> Note: if you don't plan to write tests for effector code and/or implement SSR you can omit any usage of `useEvent`.

At the moment we can load a session and the messages list.

Just add reaction to the event, and any other code should be written in chronological order after each event:

```ts
// File: /src/pages/chat/model.ts
// Don't forget to import { sample } from "effector"
import { Message, messageApi, sessionApi } from "shared/api";
import { $session } from "entities/session";

// export stores
// export events

// Here the logic place

// You can read this code like:
// When page mounted, call messages load and session load simultaneously
sample({
  clock: pageMounted,
  target: [messageApi.messagesLoadFx, sessionApi.sessionLoadFx],
});
```

After that we need to define reactions on `messagesLoadFx.done` and `messagesLoadFx.fail`, and the same for `sessionLoadFx`.

```ts
// File: /src/pages/chat/model.ts
// `.doneData` is a shortcut for `.done`, because `.done` returns `{ params, result }`
// Do not name your arguments like `state` or `payload`
// Use explicit names of the content they contain
$messages.on(messageApi.messagesLoadFx.doneData, (_, messages) => messages);

$session.on(sessionApi.sessionLoadFx.doneData, (_, session) => session);
```

OK. Session and messages loaded. Let's allow the users to log in.

```ts
// File: /src/pages/chat/model.ts
// When login clicked we need to create a new session
sample({
  clock: loginClicked,
  target: sessionApi.sessionCreateFx,
});
// When session created, just write it to a session store
sample({
  clock: sessionApi.sessionCreateFx.doneData,
  target: $session,
});
// If session create is failed, just reset the session
sample({
  clock: sessionApi.sessionCreateFx.fail,
  fn: () => null,
  target: $session,
});
```

Now we'll implement a logout process:

```ts
// File: /src/pages/chat/model.ts
// When logout clicked we need to reset session and clear our storage
sample({
  clock: logoutClicked,
  target: sessionApi.sessionDeleteFx,
});
// In any case, failed or not, we need to reset session store
sample({
  clock: sessionApi.sessionDeleteFx.finally,
  fn: () => null,
  target: $session,
});
```

> Note: most of the comments wrote just for educational purpose. In real life, application code will be self-describable

But if we start the dev server and try to log in, we see nothing changed.
This is because we created `$loggedIn` store in the model, but don't change it. Let's fix:

```ts
// File: /src/pages/chat/model.ts
import { $isLogged, $session } from "entities/session";

// At the moment, there is just raw data without any knowledge how to load
export const $loggedIn = $isLogged;
export const $userName = $session.map((session) => session?.name ?? "");
```

Here we just reexported our custom store from the session entity, but our View layer doesn't change.
The same situation with `$userName` store. Just reload the page, and you'll see, that session loaded correctly.

### Send message

Now we can log in and log out. I think you want to send a message. This is pretty simple:

```ts
// File: /src/pages/chat/model.ts
$messageText.on(messageTextChanged, (_, text) => text);

// We have two different events to send message
// Let event `messageSend` react on any of them
const messageSend = merge([messageEnterPressed, messageSendClicked]);

// We need to take a message text and author info then send it to the effect
sample({
  clock: messageSend,
  source: { author: $session, text: $messageText },
  target: messageApi.messageSendFx,
});
```

But if in the `tsconfig.json` you set `"strictNullChecks": true`, you will see the error there.
It is because store `$session` contains `Session | null` and `messageSendFx` wants `Author` in the arguments.
`Author` and `Session` are compatible, but not the `null`.

To fix this strange behaviour, we need to use `filter` there:

```ts
// File: /src/pages/chat/model.ts
sample({
  clock: messageSend,
  source: { author: $session, text: $messageText },
  filter: (form): form is { author: Session; text: string } => {
    return form.author !== null;
  },
  target: messageApi.messageSendFx,
});
```

I want to focus your attention on the return type `form is {author: Session; text: string}`.
This feature called [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards)
and allows TypeScript to reduce `Session | null` type to more specific `Session` via condition inside the function.

Now we can read this like: when a message should be sent, take session and message text, check that session exists, and send it.

OK. Now we can write a new message to a server.
But if we don't call `messagesLoadFx` again we didn't see any changes,
because `$messages` store didn't update. We can write generic code for this case.
The easiest way is to return the sent message from the effect.

```ts
// File: /src/shared/api/message.ts
export const messageSendFx = createEffect(async ({ text, author }: SendMessage) => {
  const message: Message = {
    id: createOid(),
    author,
    timestamp: Date.now(),
    text,
  };
  const history = await messagesLoadFx();
  await wait();
  saveHistory([...history, message]);
  return message;
});
```

Now we can just append a message to the end of the list:

```ts
// File: /src/pages/chat/model.ts
$messages.on(messageApi.messageSendFx.doneData, (messages, newMessage) => [
  ...messages,
  newMessage,
]);
```

But at the moment, sent a message still left in the input.

```ts
// File: /src/pages/chat/model.ts
$messageText.on(messageSendFx, () => "");

// If message sending is failed, just restore the message
sample({
  clock: messageSendFx.fail,
  fn: ({ params }) => params.text,
  target: $messageText,
});
```

### Deleting the message

It is pretty simple.

```ts
// File: /src/pages/chat/model.ts
sample({
  clock: messageDeleteClicked,
  target: messageApi.messageDeleteFx,
});

$messages.on(messageApi.messageDeleteFx.done, (messages, { params: toDelete }) =>
  messages.filter((message) => message.id !== toDelete.id),
);
```

But you can see the bug, when "Deleting" state doesn't disable.
This is because `useList` caches renders, and doesn't know about dependency on `messageDeleting` state.
To fix it, we need to provide `keys`:

```tsx
// File: /src/pages/chat/page.tsx
const messages = useList(model.$messages, {
  keys: [messageDeleting],
  fn: (message) => (
    <div className="message-item" key={message.timestamp}>
      <h3>From: {message.author.name}</h3>
      <p>{message.text}</p>
      <button onClick={() => handleMessageDelete(message)} disabled={messageDeleting}>
        {messageDeleting ? "Deleting" : "Delete"}
      </button>
    </div>
  ),
});
```

### Conclusion

This is a simple example of an application using Effector with React and TypeScript.

You can clone the code from [effector/examples/react-and-ts](https://github.com/effector/effector/tree/master/examples/react-and-ts) and run this example on your computer.


# How to Think in the Effector Paradigm

import Tabs from "@components/Tabs/Tabs.astro";
import TabItem from "@components/Tabs/TabItem.astro";

## How to Think in the Effector Paradigm

Effector is not just a "state manager", but also a powerful tool for building application logic. Here, we will cover recommendations for writing code and how you should think when using Effector.

### How to Approach Development with Effector?

To use Effector effectively, it's important to master several key principles.

#### Events are the Foundation

An application is a stream of changes. Every change is an event. It's important to understand that an event doesn't decide *what* to do; it merely records the *fact* that something happened. This is a key point that helps avoid tight coupling.

*   **An event is just a fact**: "something happened".
*   **Events do not contain logic** — they only declare the event, but do not decide how to react to it.
*   **One fact can lead to different consequences** — a single event can trigger multiple independent processes.

Example:

```ts
// Don't think about the implementation yet — just declare the fact
const searchInputChanged = createEvent();
const buttonClicked = createEvent();
```

> TIP Use Meaningful Names:
>
> Give events meaningful names. For example, if you need to load data upon some action, the event should be related to the *action*, not the *implementation*:
>
> ```ts
> ❌ const fetchData = createEvent() // Bad: Tied to implementation
> ✅ const appStarted = createEvent() // Good: Describes the action/fact
> ```

#### Business Logic and UI are Different Things

The correct architectural approach is to keep business logic separate from the user interface. Effector allows you to do this, keeping the UI simple and the logic clean and reusable.

*   UI only displays data.
*   Effector manages state and logic.

### How Does This Look in a Real Application?

Let's take GitHub as an example, with its "Watch", "Fork", and "Star" buttons. Each user action is an event:

![GitHub repository action buttons](/images/github-repo-actions.png)

*   User starred/unstarred the repository - `repoStarToggled`
*   Repository file search query changed - `repoFileSearchChanged`
*   Repository was forked - `repoForked`

The logic is built around events and reactions to them. The UI simply reports the action, and handling it is part of the business logic.

Simplified example of the star button logic:

<Tabs>
<TabItem label="Business Logic">

```ts
// repo.model.ts

// event – the fact of an action
const repoStarToggled = createEvent();

// effects as an additional reaction to events
// (assume effects return the updated value)
const starRepoFx = createEffect(async () => { /* API call to star */ });
const unstarRepoFx = createEffect(async () => { /* API call to unstar */ });

// application state
const $isRepoStarred = createStore(false);
const $repoStarsCount = createStore(0);

// logic for toggling the star state locally immediately
sample({
  clock: repoStarToggled,
  source: $isRepoStarred,
  fn: (isRepoStarred) => !isRepoStarred,
  target: $isRepoStarred,
});

// sending a request to the server when the star state changes to true
sample({
  clock: $isRepoStarred,
  filter: (isRepoStarred): isRepoStarred is true => isRepoStarred, // Type guard for clarity
  target: starRepoFx,
});

// sending a request to the server when the star state changes to false
sample({
  clock: $isRepoStarred,
  filter: (isRepoStarred): isRepoStarred is false => !isRepoStarred, // Type guard for clarity
  target: unstarRepoFx,
});

// update the counter when either effect successfully completes
// assumes the API returns the new count or some confirmation
sample({
  clock: [starRepoFx.doneData, unstarRepoFx.doneData],
  // Assuming doneData contains the new count, otherwise adjust source/fn
  // fn: (newCount) => newCount, // If doneData is the new count
  target: $repoStarsCount,
});

// Optional: Revert local state on API failure
// sample({ clock: starRepoFx.fail, target: /* logic to revert $isRepoStarred */ });
// sample({ clock: unstarRepoFx.fail, target: /* logic to revert $isRepoStarred */ });

```

</TabItem>
<TabItem label="UI">

```tsx
// RepoStarButton.tsx
import React from 'react';
import { useUnit } from 'effector-react';
import { repoStarToggled, $isRepoStarred, $repoStarsCount } from "./repo.model"; // Corrected import path assumption

export const RepoStarButton = () => {
  // useUnit connects the component to the Effector units
  const [onStarToggle, isRepoStarred, repoStarsCount] = useUnit([
    repoStarToggled, // The event trigger function
    $isRepoStarred, // The store value
    $repoStarsCount, // The store value
  ]);

  return (
    <div>
      {/* Call the event trigger on click */}
      <button onClick={onStarToggle}>
        {isRepoStarred ? "Unstar" : "Star"}
      </button>
      {/* Display the store value */}
      <span> {repoStarsCount} Stars</span>
    </div>
  );
};
```

</TabItem>
</Tabs>

In this setup, the UI doesn't know what happens internally; its only responsibilities are triggering events and displaying data.

___