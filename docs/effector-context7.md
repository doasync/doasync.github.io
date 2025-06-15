TITLE: Connecting Events to Store in Effector DESCRIPTION: This code
demonstrates connecting events to a store in Effector. The `on` method is used
to update the `$counter` store when the `incremented` or `decremented` events
are triggered. It shows a basic counter implementation. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/get-started.mdx#_snippet_5

LANGUAGE: typescript CODE:

```
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

---

TITLE: React Counter with Effector DESCRIPTION: This code demonstrates a React
counter application managed by Effector. It defines an event `plus` to increment
the counter, a store `$counter` to hold the counter's value, and a combined
store `$counterCombined` to combine the counter value and formatted text. The
`App` component renders the counter, a button to increment it, and displays the
combined counter data using `useUnit` from `effector-react`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/counter.md#_snippet_0

LANGUAGE: javascript CODE:

```
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

---

TITLE: Attaching Effect with Token from Store - Effector (TS) DESCRIPTION: This
code snippet demonstrates how to create a specialized effect using `attach` that
automatically includes an authentication token from a store when sending
messages. It defines a base effect `baseSendMessageFx` that requires a text and
a token, a store `$authToken` holding the token, and a specialized effect
`sendMessageFx` that takes only the text as input and retrieves the token from
the store. The `mapParams` function transforms the input text into the required
parameters for the base effect, including the token. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/unit-composition.md#_snippet_11

LANGUAGE: typescript CODE:

```
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

---

TITLE: Connecting Event to Store DESCRIPTION: This code snippet demonstrates how
to connect events to the counter store. The `on` method of the store is used to
subscribe to the `incremented` and `decremented` events. When these events are
triggered, the store's value is updated accordingly. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/get-started.mdx#_snippet_5

LANGUAGE: typescript CODE:

```
// counter.js
import { createEvent, createStore } from "effector";

const $counter = createStore(0);

const incremented = createEvent();
const decremented = createEvent();

$counter.on(incremented, (counter) => counter + 1);
$counter.on(decremented, (counter) => counter - 1);

// и вызовите событие в вашем приложении
incremented();
// counter увеличиться на 1
decemented();
// counter уменьшится на -1
decemented();
// counter уменьшится на -1
```

---

TITLE: Installing Effector with React bindings DESCRIPTION: This command
installs Effector along with the effector-react bindings using npm. These
bindings are necessary for seamless integration with React applications. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/installation.mdx#_snippet_3

LANGUAGE: bash CODE:

```
npm install effector effector-react
```

---

TITLE: Correct Declarative Effect Calls in Effector (Typescript) DESCRIPTION:
This snippet demonstrates the correct approach to calling effects in Effector,
using a declarative style with `sample`. Instead of calling events imperatively,
it uses `sample` to connect the `loginFx.doneData` to update the `$user` store,
redirect to dashboard, and show a welcome notification. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_11

LANGUAGE: typescript CODE:

```
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

---

TITLE: useUnit with Store (TypeScript) DESCRIPTION: Describes the function
signature for using `useUnit` with an Effector Store. It retrieves the current
value of the store and subscribes the component to updates, causing a re-render
whenever the store's value changes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useUnit.md#_snippet_2

LANGUAGE: typescript CODE:

```
useUnit($store: Store<T>): T;
```

---

TITLE: Triggering Effects on Event in Effector (TypeScript) DESCRIPTION: This
code shows how to trigger an effect when an event occurs, such as a form
submission. It uses `createEvent`, `sample`, and `createEffect` from Effector.
The `sample` function connects the `formSubmitted` event to the `userLoginFx`
effect, triggering the effect when the event occurs. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/work-with-async.md#_snippet_2

LANGUAGE: typescript CODE:

```
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

---

TITLE: Creating and updating a Store - Effector (JavaScript) DESCRIPTION: This
example illustrates how to create a store using `createStore` and update it
based on an event using the `on` method. The store `$supers` holds an array of
superhero objects, and the `superAdded` event is used to add new superheroes to
the store. When the event is triggered, the store is updated with a new state
that includes the added superhero. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/core-concepts.md#_snippet_2

LANGUAGE: javascript CODE:

```
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

---

TITLE: Installing Effector Vue Integration DESCRIPTION: This command installs
the Effector Vue integration library along with the core Effector library. This
is necessary for using Effector in a Vue application. Requires npm. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/get-started.mdx#_snippet_7

LANGUAGE: bash CODE:

```
npm install effector effector-vue
```

---

TITLE: Install Effector with SolidJS Integration (npm) DESCRIPTION: Installs the
core effector library along with the effector-solid package, enabling
integration with SolidJS applications. SOURCE:
https://github.com/effector/effector/blob/master/README.md#_snippet_2

LANGUAGE: bash CODE:

```
npm add effector effector-solid
```

---

TITLE: Deleting Message Event DESCRIPTION: This snippet shows how to trigger the
message deletion effect (messageApi.messageDeleteFx) when the
messageDeleteClicked event is fired. It uses Effector's `sample` function to
connect the event to the effect. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_28

LANGUAGE: typescript CODE:

```
// Файл: /src/pages/chat/model.ts
sample({
  clock: messageDeleteClicked,
  target: messageApi.messageDeleteFx,
});
```

---

TITLE: Effector Test Setup DESCRIPTION: This code snippet provides a basic test
setup for the complete Effector example. It forks the Effector scope and
confirms that initial value of counter is zero. It simulates click using
`allSettled` and then asserts the expected state. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/testing.mdx#_snippet_6

LANGUAGE: typescript CODE:

```
import { fork, allSettled } from "effector";

import { $clicksCount, buttonClicked, validateClickFx } from "./model";

test("main case", async () => {
  const scope = fork(); // 1

  expect(scope.getState($clicksCount)).toEqual(0); // 2

  await allSettled(buttonClicked, { scope }); // 3

  expect(scope.getState($clicksCount)).toEqual(1); // 4
});
```

---

TITLE: Integrating Events, Stores, and Effects - Effector (TypeScript)
DESCRIPTION: This code demonstrates how Effector's units (Events, Stores,
Effects) work together in a reactive data flow. It defines stores for
superheroes and villains, events for adding new superheroes, and effects for
fetching and saving data. When `getSupersFx` succeeds, it populates the
`$supers` store. When `superAdded` is triggered, the store will be updated.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/core-concepts.md#_snippet_5

LANGUAGE: typescript CODE:

```
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

---

TITLE: Hydrating Effector React App on Client (TypeScript) DESCRIPTION: This
code snippet demonstrates how to hydrate an Effector-React application on the
client-side after server-side rendering. It retrieves the server-calculated
state from `globalThis._SERVER_STATE_`, initializes an Effector scope using
`fork` with the retrieved state, and then hydrates the React application using
`hydrateRoot`. Finally, it triggers the `appStarted` event within the client
scope to ensure consistency with the server-side execution. It depends on react,
react-dom/client, effector, effector-react. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/server-side-rendering.md#_snippet_2

LANGUAGE: typescript CODE:

```
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

---

TITLE: Adding Events in Effector DESCRIPTION: This code snippet demonstrates how
to create events in Effector using the `createEvent` function. The `incremented`
and `decremented` events can be triggered to update the store. It requires the
`effector` package. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/get-started.mdx#_snippet_4

LANGUAGE: typescript CODE:

```
import { createEvent } from "effector";

const incremented = createEvent();
const decremented = createEvent();
```

---

TITLE: Practical Example of Effects Usage in Effector (TypeScript) DESCRIPTION:
This code provides a practical example of using effects in Effector for fetching
and displaying user data. It uses `createStore`, `createEvent`, `createEffect`,
and `sample` from Effector. The `fetchUserFx` effect fetches user data, the
stores manage the ID, user data, error messages, and loading state. The `sample`
function connects the `submit` event and $id store to the effect, triggering the
data fetching process. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/work-with-async.md#_snippet_4

LANGUAGE: typescript CODE:

```
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

---

TITLE: Incorrect Watch Usage in Effector (TypeScript) DESCRIPTION: This snippet
demonstrates the incorrect use of `watch` for implementing business logic
instead of debugging. It directly sets local storage, tracks user updates, and
triggers events within the `watch` callback, which is discouraged in Effector.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_9

LANGUAGE: typescript CODE:

```
$user.watch((user) => {
  localStorage.setItem("user", JSON.stringify(user));
  api.trackUserUpdate(user);
  someEvent(user.id);
});
```

---

TITLE: Creating an Effector Store DESCRIPTION: This code snippet demonstrates
how to create a store in Effector. The `createStore` function is used to
initialize a store with an initial value (0 in this case). The store, named
`$counter`, holds the application state related to a counter. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/get-started.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
import { createStore } from "effector";

const $counter = createStore(0);
```

---

TITLE: Creating Events with Effector DESCRIPTION: This snippet demonstrates how
to create events using Effector's `createEvent` function. Events represent facts
that occur in the application and are used to trigger changes in state and
logic. The events do not contain logic themselves, but rather initiate
processes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/resources/mindset.mdx#_snippet_0

LANGUAGE: ts CODE:

```
// Не думайте о реализации сейчас — только объявите факт
const searchInputChanged = createEvent();
const buttonClicked = createEvent();
```

---

TITLE: Creating a Store in Effector DESCRIPTION: This code snippet demonstrates
how to create a store in Effector using the `createStore` function. The store
`$counter` is initialized with a value of 0 and will hold the application's
counter state. It requires the `effector` package. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/get-started.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
import { createStore } from "effector";

const $counter = createStore(0);
```

---

TITLE: Basic useStoreMap example with config (JSX) DESCRIPTION: This is an
example of using the `useStoreMap` hook to efficiently render a list of users.
The component re-renders a specific user only when that user's data changes in
the store, by keying on the `id` of the user. It showcases the `keys` argument
usage and providing a default value if a user is not found. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useStoreMap.md#_snippet_3

LANGUAGE: jsx CODE:

```
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

---

TITLE: Using useUnit with Shapes (Objects/Arrays) DESCRIPTION: This example
demonstrates using `useUnit` with an object or array containing stores and/or
events. It requires `effector`, `effector-react`, and `react-dom`. It retrieves
the store value directly and wraps events with scope-bound functions for
triggering them. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useUnit.md#_snippet_2

LANGUAGE: jsx CODE:

```
import { createStore, createEvent, fork } from "effector";
import { useUnit, Provider } from "effector-react";

const inc = createEvent();
const dec = createEvent();

const $count = createStore(0)
  .on(inc, (x) => x + 1)
  .on(dec, (x) => x - 1);

const App = () => {
  const count = useUnit($count);
  const handler = useUnit({ inc, dec });
  // or
  const [a, b] = useUnit([inc, dec]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => handler.inc()}>increment</button>
      <button onClick={() => handler.dec()}>decrement</button>
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

---

TITLE: useStore usage example with React DESCRIPTION: Demonstrates how to use
the `useStore` hook to connect a React component to an effector store. It
creates a store `$counter`, defines increment and decrement actions, and uses
`useStore` to subscribe the `App` component to the `$counter` store. The
component re-renders whenever the store's value changes, updating the displayed
counter value. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useStore.md#_snippet_1

LANGUAGE: jsx CODE:

```
import { createStore, createApi } from "effector";
import { useStore } from "effector-react";

const $counter = createStore(0);

const { increment, decrement } = createApi($counter, {
  increment: (state) => state + 1,
  decrement: (state) => state - 1,
});

const App = () => {
  const counter = useStore($counter);
  return (
    <div>
      {counter}
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
};
```

---

TITLE: Effect .use() method example DESCRIPTION: This example demonstrates how
to use the `.use()` method to assign a handler function to an Effect. The
handler function is an async function that fetches user repositories from GitHub
based on a provided username. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Effect.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Sample Multiple Clocks - Typescript DESCRIPTION: Demonstrates how to use
multiple events as `clock` for `sample`. It triggers the `saveDocumentFx` effect
with the data from the `$formData` store when any of the trigger events
(`saveButtonClicked`, `ctrlSPressed`, `autoSaveTriggered`) occur. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/unit-composition.md#_snippet_5

LANGUAGE: typescript CODE:

```
import { createEvent, createStore, sample } from "effector";

// События для разных действий пользователя
const saveButtonClicked = createEvent();
const ctrlSPressed = createEvent();
const autoSaveTriggered = createEvent();

// Общее хранилище данных
const $formData = createStore({ text: "" });

// Эффект сохранения
const saveDocumentFx = createEffect((data: { text: string }) => {
  // Логика сохранения
});

// Единая точка сохранения документа, которая срабатывает от любого триггера
sample({
  // Все эти события будут вызывать сохранение
  clock: [saveButtonClicked, ctrlSPressed, autoSaveTriggered],
  source: $formData,
  target: saveDocumentFx,
});
```

---

TITLE: Connecting Units with Sample in Effector DESCRIPTION: This code snippet
demonstrates connecting Effector units into a single flow using the `sample`
method. It initializes stores (`$supers`, `$superHeroes`, `$superVillains`),
events (`superAdded`), and effects (`getSupersFx`, `saveNewSuperFx`). `sample`
is used to trigger `saveNewSuperFx` when `superAdded` occurs and to trigger
`getSupersFx` upon successful completion of `saveNewSuperFx`. The code simulates
fetching and saving data to a server. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/core-concepts.md#_snippet_6

LANGUAGE: typescript CODE:

```
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

---

TITLE: Implementing Chat History Component DESCRIPTION: This code implements the
`ChatHistory` component using `effector-react` hooks to connect to the Effector
store. It retrieves the list of messages and a flag indicating if a message is
being deleted, then renders the message list, providing delete functionality. It
depends on `useList` and `useUnit` hooks from the effector-react library.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_11

LANGUAGE: tsx CODE:

```
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

---

TITLE: useStore hook example (JSX) DESCRIPTION: Demonstrates how to use the
`useStore` hook to connect a React component to an Effector store. The example
creates a counter store and uses `useStore` to display the current counter
value. It also shows the usage of `useEvent` to connect event handlers to
effector events. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useStore.md#_snippet_1

LANGUAGE: jsx CODE:

```
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

---

TITLE: Adding sid to Store for SSR Hydration in Effector (TypeScript)
DESCRIPTION: This snippet shows how to add a stable ID (`sid`) to an Effector
store. This is crucial for proper server-side rendering (SSR) hydration. The
`sid` ensures that the store's data is correctly transferred from the server to
the client. You can either use a Babel/SWC plugin or manually assign a unique
string to the `sid` property. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/troubleshooting.mdx#_snippet_1

LANGUAGE: typescript CODE:

```
const $store = createStore(0, {
  sid: "unique id",
});
```

---

TITLE: Creating and using an Effect - Effector (JavaScript) DESCRIPTION: This
code demonstrates how to create an effect using `createEffect` from Effector to
handle asynchronous operations, like fetching user data from an API. The
`fetchUserFx` effect is created, and subscriptions are set up using the `done`
and `fail` events to handle successful and failed results. The effect is then
triggered with a user ID. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/core-concepts.md#_snippet_3

LANGUAGE: javascript CODE:

```
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

---

TITLE: Combine with multiple stores and function DESCRIPTION: Combines multiple
stores using a function to derive a new value. The function is called with the
values of the stores and returns the new state. Dependencies: `Store`,
`StoreWritable`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/combine.mdx#_snippet_2

LANGUAGE: typescript CODE:

```
const $a: Store<A>
const $b: StoreWritable<B>
const $c: Store<C> | StoreWritable<C>

$result: Store<D> = combine(
  $a, $b, $c, ...,
  (a: A, b: B, c: C, ...) => result
)
```

---

TITLE: Testing with Effector Scopes DESCRIPTION: Shows an example of using
Effector scopes for testing, including creating isolated scopes, executing
effects, and checking state changes within the scope. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/advanced/work-with-scope.mdx#_snippet_5

LANGUAGE: ts CODE:

```
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

---

TITLE: Server Request Handler with Effector DESCRIPTION: This code demonstrates
a server request handler using Effector for server-side rendering. It uses
`fork` to create an isolated scope for each request, preventing data leakage
between users. It also serializes and hydrates app's state, renders the React
component to a string, and constructs a complete HTML response including
serialized Effector state. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/server-side-rendering.md#_snippet_1

LANGUAGE: tsx CODE:

```
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

---

TITLE: Using Effector sample Operator with React (JS) DESCRIPTION: This example
demonstrates the `sample` operator, which allows integrating values from a
source unit with updates from a target unit. It shows how to sample a rapidly
changing store (`$tick`) based on updates from a less frequent event
(`mouseClick`) and display the result in a React component. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_95

LANGUAGE: js CODE:

```
import React from 'react'
import {createStore, createEvent, sample} from 'effector'
import {createComponent} from 'effector-react'

const tickEvent = createEvent()
const $tick = createStore(0).on(tickEvent, n => n + 1)

setInterval(tickEvent, 1000 / 60)

const mouseClick = createEvent()
const $clicks = createStore(0).on(mouseClick, n => n + 1)

const sampled = sample($tick, $clicks, (tick, clicks) => ({
  tick,
  clicks,
}))

const Monitor = createComponent(sampled, (props, {tick, clicks}) => (
  <p>
    <b>tick: </b>
    {tick}
    <br />
    <b>clicks: </b>
    {clicks}
  </p>
))

const App = () => (
  <div>
    <Monitor />
    <button onClick={mouseClick}>click to update</button>
  </div>
)
```

---

TITLE: Sample with `submitForm` example DESCRIPTION: This example demonstrates
sampling a store's state with an event trigger to create an effect's parameters.
It showcases the usage of `clock`, `source`, `fn`, and `target` options within
the `sample` configuration. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/sample.md#_snippet_3

LANGUAGE: javascript CODE:

```
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

---

TITLE: Effector Store and Event Definition DESCRIPTION: This code snippet
defines a simple counter store and an event to increment the counter. It uses
createStore to initialize the store and createEvent to define the event. The
store is then updated when the event is triggered. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/testing.mdx#_snippet_1

LANGUAGE: typescript CODE:

```
import { createStore, createEvent } from "effector";

const counterIncremented = createEvent();

const $counter = createStore(0);

$counter.on(counterIncremented, (counter) => counter + 1);
```

---

TITLE: Correct Parameter Passing in Effector (TypeScript) DESCRIPTION: This
snippet demonstrates the correct way to pass store values to an Effector effect
using `sample`. It creates a sample that combines data from `$form`, `$user`,
and `$settings` and passes the combined data to `submitFormFx` as parameters.
This avoids the need for `getState`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_16

LANGUAGE: typescript CODE:

```
// Получаем значения через параметры
const submitFormFx = createEffect(({ form, userId, theme }) => {});

// Получаем все необходимые данные через sample
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

---

TITLE: Fixing Unit Calls with sample (TS) DESCRIPTION: This code demonstrates
the correct way to trigger an event from within a function that processes
another event's payload using the `sample` operator. This addresses the error
from calling units inside pure functions. This showcases the fix. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_19

LANGUAGE: typescript CODE:

```
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

---

TITLE: Merging Effector Events using merge (TypeScript) DESCRIPTION:
Demonstrates how to combine multiple Effector events into a single event using
the `merge` method. The resulting event triggers whenever any of the source
events are called. This merged event can then be used as a clock for other units
like `sample`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/events.md#_snippet_8

LANGUAGE: ts CODE:

```
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

---

TITLE: Restoring Message Text on Failure - TypeScript DESCRIPTION: This snippet
restores the message text in the input field if sending the message fails. It
uses Effector's `sample` to react to the `messageSendFx.fail` event. It extracts
the original message text from the `params` of the failed effect and sets it as
the new value of the `$messageText` store. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_27

LANGUAGE: typescript CODE:

```
sample({
  clock: messageSendFx.fail,
  fn: ({ params }) => params.text,
  target: $messageText,
});
```

---

TITLE: Using useUnit with Effector Store in React DESCRIPTION: Demonstrates how
to use the `useUnit` hook from `effector-react` to connect an Effector store to
a React component. It creates a simple store `$value` and displays its value in
a paragraph element. The `useUnit` hook automatically subscribes the component
to the store and updates the component when the store's value changes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/ecosystem-development/unit-shape-protocol.md#_snippet_0

LANGUAGE: typescript CODE:

```
import { createStore } from "effector";
import { useUnit } from "effector-react";

const $value = createStore("Привет!");

const Component = () => {
  const { value } = useUnit({ value: $value });

  return <p>{value}</p>;
};
```

---

TITLE: Processing Items with Effector Effects and React DESCRIPTION: This
snippet illustrates how to use `effector` to manage a list of items with
statuses, processing them asynchronously using an effect. It shows the
interaction between events triggered inside an effect handler and a store,
ensuring the store update from the effect itself happens before subsequent event
updates. It integrates with React using `effector-react`'s `useList` hook to
render the list. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_72

LANGUAGE: javascript CODE:

```
import React from 'react'
import ReactDOM from 'react-dom'
import {createStore, createEvent, createEffect, sample} from 'effector'
import {useList} from 'effector-react'

const updateItem = createEvent()
const resetItems = createEvent()
const processClicked = createEvent()

const processItemsFx = createEffect({
  async handler(items) {
    for (let {id} of items) {
      //event call inside effect
      //should be applied to items$
      //only after processItemsFx itself
      updateItem({id, status: 'PROCESS'})
      await new Promise(r => setTimeout(r, 3000))
      updateItem({id, status: 'DONE'})
    }
  },
})

const $items = createStore([
  {id: 0, status: 'NEW'},
  {id: 1, status: 'NEW'},
])
  .on(updateItem, (items, {id, status}) =>
    items.map(item => (item.id === id ? {...item, status} : item)),
  )
  .on(processItemsFx, items => items.map(({id}) => ({id, status: 'WAIT'})))
  .reset(resetItems)

sample({
  source: $items,
  clock: processClicked,
  target: processItemsFx,
})

const App = () => (
  <section>
    <header>
      <h1>Jobs list</h1>
    </header>
    <button onClick={processClicked}>run tasks</button>
    <button onClick={resetItems}>reset</button>
    <ol>
      {useList($items, ({status}) => (
        <li>{status}</li>
      ))}
    </ol>
  </section>
)

ReactDOM.render(<App />, document.getElementById('root'))
```

---

TITLE: Updating Stores with Event Parameters in effector DESCRIPTION: Shows how
to update a store using event parameters by passing data to the event and using
it in the handler function. The `$user` store is updated when the `userUpdated`
event is triggered, merging the event's data with the existing user object.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_11

LANGUAGE: typescript CODE:

```
import { createStore, createEvent } from "effector";

const userUpdated = createEvent<{ name: string }>();

const $user = createStore({ name: "Bob" });

$user.on(userUpdated, (user, changedUser) => ({
  ...user,
  ...changedUser,
}));

userUpdated({ name: "Alice" });
```

---

TITLE: Reading Store Value in Vue with useUnit DESCRIPTION: Demonstrates how to
read the current value of an effector store within a Vue component using the
`useUnit` hook from `effector-vue/composition`. The `counter` variable holds the
value of the `$counter` store, accessible in the Vue template. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_6

LANGUAGE: html CODE:

```
<script setup>
  import { useUnit } from "effector-vue/composition";
  import { $counter } from "./model.js";
  const counter = useUnit($counter);
</script>
```

---

TITLE: Serializing and Deserializing Effector Stores with SIDs DESCRIPTION:
Illustrates how to serialize and deserialize Effector stores using `fork`,
`allSettled`, and `serialize`. The `fork` creates an isolated scope.
`allSettled` updates the stores within the scope. `serialize` extracts the store
values with corresponding SIDs. On the client, the serialized state is parsed
and used to initialize a new scope. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/explanation/sids.md#_snippet_2

LANGUAGE: typescript CODE:

```
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

// Let's assume that server put the state into the HTML
const serverState = readServerStateFromWindow();

const scope = fork({
  // Just parse the whole state and use it as client state
  values: JSON.parse(serverState),
});
```

---

TITLE: Create Countdown Timer with Effector DESCRIPTION: This code snippet
defines a function `createCountdown` that creates a countdown timer using
Effector. It takes `start`, `abort`, and `timeout` as configuration parameters.
The function uses Effector's `createStore`, `createEvent`, `createEffect`, and
`sample` to manage the timer's state, trigger ticks, and handle aborting. The
`wait` function uses `setTimeout` to simulate the time interval. It returns an
object containing the `tick` event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/common/countdown.md#_snippet_0

LANGUAGE: javascript CODE:

```
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

---

TITLE: Basic useUnit with Event and Store (JSX) DESCRIPTION: Illustrates the
basic usage of `useUnit` with an Effector Event and Store in a React component.
It demonstrates how to increment a counter state using an event triggered by a
button click. The component is wrapped in a `Provider` and rendered within a
`Scope`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useUnit.md#_snippet_4

LANGUAGE: jsx CODE:

```
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

---

TITLE: Updating Object in effector Store (Incorrect) DESCRIPTION: Demonstrates
the incorrect approach to updating an object in an effector store by directly
mutating the object. This violates effector's immutability guidelines and can
cause unexpected side effects. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
// update object
$user.on(nameChanged, (user, newName) => {
  user.name = newName; // mutation!
  return user;
});
```

---

TITLE: Create and Use Effector Store in JavaScript DESCRIPTION: This JavaScript
example demonstrates how to create a store using `createStore` from Effector,
and how to update and reset it using `on` and `reset` methods respectively. It
also shows how to derive a new store using `map` and how to watch the store's
state using `watch` method. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/createStore.md#_snippet_0

LANGUAGE: js CODE:

```
import { createEvent, createStore } from "effector";

const addTodo = createEvent();
const clearTodos = createEvent();

const $todos = createStore([])
  .on(addTodo, (state, todo) => [...state, todo])
  .reset(clearTodos);

const $selectedTodos = $todos.map((todos) => {
  return todos.filter((todo) => !!todo.selected);
});

$todos.watch((state) => {
  console.log("todos", state);
});
```

---

TITLE: Updating Store via Events in effector DESCRIPTION: Explains how to update
a store by subscribing to events using the `.on` method and resetting the store
with the `.reset` method. The `$counter` store is updated when `incremented`,
`decremented`, or `resetCounter` events are triggered, demonstrating state
changes and logging. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_10

LANGUAGE: typescript CODE:

```
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

---

TITLE: Creating and subscribing to an Event - Effector (JavaScript) DESCRIPTION:
This snippet showcases how to create an event using `createEvent` from Effector
and subscribe to it using the `watch` method. When the event is triggered, the
provided callback function will be executed. This demonstrates a basic example
of how events act as entry points for reactive data flows. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/core-concepts.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Using Effector Effects in React DESCRIPTION: This code demonstrates how
to integrate Effector effects into a React component. It defines an effect
`fetchUserFx` to fetch data from a URL. The component uses `useUnit` to
subscribe to the `$user` store and the `fetchUserFx.pending` signal to display
the fetched username and manage the loading state of the button. Requires
Effector and Effector-React dependencies. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/effects.md#_snippet_0

LANGUAGE: javascript CODE:

```
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

---

TITLE: React UI Component using Effector DESCRIPTION: This snippet presents a
React UI component that integrates with Effector to handle the star button
functionality. It uses `useUnit` to connect the component to the
`repoStarToggled` event and the `$isRepoStarred` and `$repoStarsCount` stores.
The component dispatches the event when the button is clicked and displays the
current star state and count. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/resources/mindset.mdx#_snippet_2

LANGUAGE: tsx CODE:

```
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

---

TITLE: Testing Store Updates with Effector DESCRIPTION: This code snippet
demonstrates how to test store updates in Effector using `fork` to create an
isolated scope and `allSettled` to trigger events and wait for their effects. It
checks if the counter store increases by 1 after the `counterIncremented` event
is triggered within the forked scope. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/testing.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
import { counterIncremented, $counter } from "./counter.js";

test("counter should increase by 1", async () => {
  const scope = fork();

  expect(scope.getState($counter)).toEqual(0);

  await allSettled(counterIncremented, { scope });

  expect(scope.getState($counter)).toEqual(1);
});
```

---

TITLE: Reading Store Value in Solid with useUnit DESCRIPTION: Shows how to
access the value of an effector store in a Solid component using `useUnit` from
`effector-solid`. The `Counter` component retrieves the `$counter` store's value
and renders it, noting that in Solid `useUnit` returns a signal. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_7

LANGUAGE: typescript CODE:

```
import { useUnit } from 'effector-solid'
import { $counter } from './model.js'

const Counter = () => {
  const counter = useUnit($counter)

  return <div>{counter()}</div>
}
```

---

TITLE: ToDo Creator with Effector and React DESCRIPTION: This TypeScript/JSX
code defines a React application with two independent ToDo lists, managed using
Effector. It leverages Effector's `createStore`, `createEvent`, and `sample` to
manage state and side effects. The `effector-react` library's `useUnit` and
`useList` hooks are used to connect Effector stores to the React component,
ensuring reactive updates. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/todo-creator.md#_snippet_0

LANGUAGE: typescript CODE:

```
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

---

TITLE: Updating Message Text Store - TypeScript DESCRIPTION: This snippet
updates the `$messageText` store with the text entered by the user. It uses the
`on` method to react to the `messageTextChanged` event and update the store's
value with the new text. The event passes the old state and the new text.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_21

LANGUAGE: typescript CODE:

```
$messageText.on(messageTextChanged, (_, text) => text);
```

---

TITLE: Mapping Event Payload (JS) DESCRIPTION: This code demonstrates how to
decompose data flow or transform data using the `.map()` method. It shows how to
create derived events from an original event, extracting specific fields or
transforming the data. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_14

LANGUAGE: javascript CODE:

```
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

---

TITLE: Correct Declarative Effect Handling in Effector (TypeScript) DESCRIPTION:
This snippet demonstrates the correct, declarative approach to handling side
effects after an effect completes in Effector. It uses `sample` to trigger
updates to `$user`, `redirectToDashboardFx`, and `showWelcomeNotificationFx`
when `loginFx.doneData` emits, making the flow more manageable and testable.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_14

LANGUAGE: typescript CODE:

```
const loginFx = createEffect((params) => api.login(params));
// Связываем через sample
sample({
  clock: loginFx.doneData,
  target: [
    $user, // Обновляем стор
    redirectToDashboardFx,
    showWelcomeNotificationFx,
  ],
});
```

---

TITLE: Updating Store on Effector Effect Completion DESCRIPTION: Illustrates how
to update an Effector store upon the successful completion of an effect. The
effect fetches user repositories, and the store is updated with the fetched
data. The store's watcher logs the number of repositories. Requires effector
package. Takes the username as input. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/createEffect.md#_snippet_1

LANGUAGE: javascript CODE:

```
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
// => 0 репозиториев

await fetchUserReposFx({ name: "zerobias" });
// => 26 репозиториев
```

---

TITLE: AsyncStorage Counter Logic using Effector DESCRIPTION: This JavaScript
code defines the core logic for a React Native counter application using the
Effector library. It initializes events for incrementing, decrementing, and
resetting the counter, along with effects to fetch and update the counter value
in AsyncStorage. A store manages the counter's state, and samples connect events
and effects to update the store and AsyncStorage. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react-native/asyncstorage-counter.md#_snippet_0

LANGUAGE: javascript CODE:

```
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

---

TITLE: Integrating Effector with React DESCRIPTION: This React component
demonstrates how to integrate Effector with React using the `useUnit` hook from
`effector-react`. It consumes the $counter store and the incremented and
decremented events. Different ways of consuming the store and events are
demonstrated. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/get-started.mdx#_snippet_9

LANGUAGE: jsx CODE:

```
import { useUnit } from "effector-react";
import { createEvent, createStore } from "effector";
import { $counter, incremented, decremented } from "./counter.js";

export const Counter = () => {
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // или
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // или
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

---

TITLE: Sample Multiple Sources - Typescript DESCRIPTION: Shows how to use
multiple stores as a source for `sample`. It combines data from `$searchQuery`
and `$filters` stores into a single object, which is then passed to the
`submitSearchFx` effect when `searchClicked` is triggered. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/unit-composition.md#_snippet_4

LANGUAGE: typescript CODE:

```
import { createEvent, createStore, sample, createEffect } from "effector";

type SubmitSearch = {
  query: string;
  filters: Array<string>;
};

const submitSearchFx = createEffect((params: SubmitSearch) => {
  /// логика
});

const searchClicked = createEvent();

const $searchQuery = createStore("");
const $filters = createStore<string[]>([ ]);

sample({
  clock: searchClicked,
  source: {
    query: $searchQuery,
    filters: $filters,
  },
  target: submitSearchFx,
});
```

---

TITLE: Creating Derived Stores in Effector (TypeScript) DESCRIPTION: Illustrates
how to create derived stores in Effector using the `map` and `combine` methods.
The examples show filtering a list of users based on their active status,
calculating counts, and combining multiple stores into a single store. Requires
effector library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_18

LANGUAGE: typescript CODE:

```
import { createStore, combine } from "effector";

const $currentUser = createStore({
  id: 1,
  name: "Winnie Pooh",
});
const $users = createStore<User[]>([ ]);

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

---

TITLE: Tracking Effect Execution State in Effector (TypeScript) DESCRIPTION:
This code demonstrates how Effector automatically tracks the execution state of
an effect using `pending`, `done`, `fail`, and `finally` events. It shows how to
watch these events to log the effect's status and results. The code defines an
effect `fetchUserFx` and attaches watchers to its state events to log
information about its execution. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/work-with-async.md#_snippet_0

LANGUAGE: typescript CODE:

```
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

---

TITLE: Binding Effector events to the current scope using scopeBind (TS)
DESCRIPTION: This code snippet demonstrates how to correctly bind an Effector
event to the current scope using `scopeBind` when dealing with external
functions like `setTimeout`. It illustrates the problem of scope loss when
events are called within callbacks of external functions and provides the
correct approach of using `scopeBind` to maintain the correct scope. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/troubleshooting.mdx#_snippet_4

LANGUAGE: typescript CODE:

```
const event = createEvent();

// ❌ - так у вас событие вызовется в глобальной области видимости
const effectFx = createEffect(() => {
  setTimeout(() => {
    event();
  }, 1000);
});

// ✅ - так у вас будет работать как ожидаемо
const effectFx = createEffect(() => {
  const scopeEvent = scopeBind(event);
  setTimeout(() => {
    scopeEvent();
  }, 1000);
});
```

---

TITLE: Creating Effector Stores, Events and Effects for Form Management (JS)
DESCRIPTION: This snippet creates Effector stores, events, and effects for
handling form submission and field updates. It defines an effect `sendFormFx` to
simulate sending form data, a store `$form` to hold the form's state, and events
`formSubmitted` and `fieldUpdate` to trigger form submission and field updates
respectively. The `sample` function is used to trigger the effect when
`formSubmitted` happens, passing the form data. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/forms.md#_snippet_0

LANGUAGE: js CODE:

```
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
```

---

TITLE: Basic useList Example (JSX) DESCRIPTION: Demonstrates the basic usage of
`useList` with a store containing an array of user objects. It renders a list of
users without the need for explicit keys, utilizing the index as the key. The
component re-renders only when the data changes, optimizing performance. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useList.md#_snippet_1

LANGUAGE: jsx CODE:

```
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

---

TITLE: Change state on effect completion (JavaScript) DESCRIPTION: Creates an
effect `fetchUserReposFx` to fetch user repositories and updates a store
`$repos` with the fetched data using the `.doneData` event. The store's value is
then logged to the console whenever it changes, showcasing reactive state
management upon effect completion. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/createEffect.md#_snippet_2

LANGUAGE: javascript CODE:

```
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

---

TITLE: Sampling Store Updates in Effector (TypeScript) DESCRIPTION: Illustrates
the use of the `sample` function in Effector with a source and target, but
without an explicit clock. In this configuration, the `source` store's updates
implicitly act as the clock, triggering the sampling and transformation of its
value before sending it to the `target` store. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_51

LANGUAGE: typescript CODE:

```
import {value createStore, value sample} from 'effector'

const $a = createStore([{foo: 0}])
const $b = createStore(0)

sample({
  source: $a,
  target: $b,
  fn: list => list.length,
})
```

---

TITLE: Basic useUnit with Store and API (JavaScript) DESCRIPTION: Demonstrates
the basic usage of `useUnit` with a Store and API in a React component. This
component manages a counter state using increment and decrement events,
triggered by button clicks. The example shows how to bind these events using
`useUnit`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useUnit.md#_snippet_5

LANGUAGE: javascript CODE:

```
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

---

TITLE: Array update in effector (TypeScript) DESCRIPTION: Demonstrates the
correct way to update an array within an Effector store, ensuring immutability.
It highlights the need to create a new array reference before modifying it to
trigger store updates. Incorrect code sample is also provided for contrast.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Store.md#_snippet_1

LANGUAGE: typescript CODE:

```
$items.on(addItem, (items, newItem) => {
  const updatedItems = [...items];
  // ✅ .push method is called on a new array
  updatedItems.push(newItem);
  return updatedItems;
});
```

LANGUAGE: typescript CODE:

```
$items.on(addItem, (items, newItem) => {
  // ❌ Error! The array reference remains the same, the store will not be updated
  items.push(newItem);
  return items;
});
```

---

TITLE: Create Derived Store with `.map()` (JavaScript) DESCRIPTION: Creates a
derived store using the `.map()` method. The derived store `$length` updates
whenever the original store `$title` changes, calculating the length of the
title. It includes a watcher to log the new length. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Store.md#_snippet_2

LANGUAGE: javascript CODE:

```
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

---

TITLE: Configure Vite with React and Effector Babel Plugin DESCRIPTION: This
snippet demonstrates how to configure `vite.config.js` to use the
`@vitejs/plugin-react` plugin with Babel, and to integrate the
`effector/babel-plugin`. It sets up the necessary Babel options within the React
plugin to enable Effector's Babel transformations. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/babel-plugin.md#_snippet_20

LANGUAGE: javascript CODE:

```
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

---

TITLE: Using scopeBind to avoid scope loss with setInterval DESCRIPTION: This
example demonstrates how to use `scopeBind` to safely call effects within
asynchronous functions like `setInterval`. `scopeBind` creates a function bound
to the scope in which it was called, preventing scope loss. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Scope.md#_snippet_4

LANGUAGE: javascript CODE:

```
const sendWithAuthFx = createEffect(async () => {
  // Теперь эту функцию можно безопасно вызывать
  // без соблюдения правил потери скоупа
  const sendMessage = scopeBind(sendMessageFx);

  await authUserFx();

  // Контекста внутри setInterval нет, но наша функция привязана
  return setInterval(sendMessage, 500);
});
```

---

TITLE: Fork with initial store values - TS DESCRIPTION: This TypeScript code
demonstrates how to use the `values` option in the `fork` function to provide
initial states for stores. It shows three ways to pass initial values: as an
array of tuples, as a Map, and as a plain object. The example shows the array of
tuples approach. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/fork.md#_snippet_2

LANGUAGE: ts CODE:

```
fork({
  values: [
    [$user, "alice"],
    [$age, 21],
  ],
});
```

---

TITLE: Component using useUnit with array destructuring DESCRIPTION: This
snippet presents a more concise way to use the `useUnit` hook by leveraging
array destructuring. It demonstrates subscribing to multiple stores and events
at once. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/migration-guide-v23.md#_snippet_3

LANGUAGE: typescript CODE:

```
const Component = () => {
  const [foo, bar, onSubmit] = useUnit([$foo, $bar, triggerSubmit]);
};
```

---

TITLE: Creating Atomic Stores in Effector (TypeScript) DESCRIPTION: This example
demonstrates the recommended approach of creating small, atomic stores in
Effector, contrasting it with a large store containing multiple fields. Atomic
stores improve update efficiency and allow more targeted subscriptions. The
example shows how to create several individual stores for user name, email,
posts, and settings. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
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
```

---

TITLE: Implementing Login Functionality DESCRIPTION: This code implements the
login functionality. It uses Effector's `sample` function to trigger the
`sessionApi.sessionCreateFx` effect when the `loginClicked` event occurs. Upon
successful session creation, the resulting session data is stored in the
`$session` store. On failure, the session is reset to null. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_18

LANGUAGE: ts CODE:

```
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

---

TITLE: createEvent usage DESCRIPTION: Demonstrates different ways to use
createEvent:

1.  Creating an event with no payload (Event<void>).
2.  Creating an event with a generic type (Event<T>).
3.  Creating an event with an optional name. SOURCE:
    https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/createEvent.md#_snippet_0

LANGUAGE: typescript CODE:

```
event = createEvent() > Event<void>;

event = createEvent<T>() > Event<T>;

event = createEvent(/*name*/ "eventName") > Event<void>;
```

---

TITLE: Updating Store Data When Effect Completes (TypeScript) DESCRIPTION: This
code demonstrates how to update a store with data returned by an effect upon
successful completion or handle errors. It uses `createStore` and `createEffect`
from effector. It showcases how to use the `done` and `fail` events (and their
`doneData` and `failData` variants) to update stores with the effect's results
or error messages. An example of using pending to track loading state is also
provided. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/work-with-async.md#_snippet_1

LANGUAGE: typescript CODE:

```
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

---

TITLE: Forwarding Events/Effects in Effector (TypeScript) DESCRIPTION:
Illustrates various ways to use the `forward` function in Effector, showing how
to forward events and effects, including forwarding to a single unit, an array
of units, and forwarding from multiple sources to a single or multiple targets.
Highlights support for forwarding to void units. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_47

LANGUAGE: typescript CODE:

```
import {value forward, value createEvent, value createEffect} from 'effector'

const sourceA = createEvent<string>()
const sourceB = createEvent<number>()

const targetA = createEvent<void>()
const fx = createEffect<void, any>()

forward({
  from: sourceA,
  to: targetA,
})

forward({
  from: sourceA,
  to: [targetA, fx],
})

forward({
  from: [sourceA, sourceB],
  to: targetA,
})

forward({
  from: [sourceA, sourceB],
  to: [targetA, fx],
})
```

---

TITLE: Observing Effector Effect State DESCRIPTION: Demonstrates how to observe
the pending, done, fail, and finally states of an Effector effect. It logs
messages indicating the effect's status and results/errors. Requires effector
package. Takes username as input. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/createEffect.md#_snippet_3

LANGUAGE: javascript CODE:

```
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
  console.log(result); // разрешенное значение, результат
});

fetchUserReposFx.fail.watch(({ params, error }) => {
  console.error(params); // {name: 'zerobias'}
  console.error(error); //  отклоненное значение, ошибка
});

fetchUserReposFx.finally.watch(({ params, status, result, error }) => {
  console.log(params); // {name: 'zerobias'}
  console.log(`handler status: ${status}`);

  if (error) {
    console.log("handler rejected", error);
  } else {
    console.log("handler resolved", result);
  }
});

await fetchUserReposFx({ name: "zerobias" });
```

---

TITLE: SSR Handler with Effector State Serialization DESCRIPTION: Demonstrates a
server-side rendering handler using Effector. It creates a scope, populates
stores using `allSettled`, serializes the scope's state using `serialize`, and
then injects the serialized state into the HTML as a JavaScript variable. This
variable will be used on the client to hydrate the state. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/explanation/sids.md#_snippet_4

LANGUAGE: tsx CODE:

```
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

---

TITLE: Store Testing with Effector DESCRIPTION: This code snippet demonstrates
how to test a store in Effector using the fork API for state isolation and
allSettled for asynchronous execution. It imports the store and event, then
tests the store's initial state and its state after the event is triggered.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/testing.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
import { counterIncremented, $counter } from "./counter.js";

test("counter should increase by 1", async () => {
  const scope = fork();

  expect(scope.getState($counter)).toEqual(0);

  await allSettled(counterIncremented, { scope });

  expect(scope.getState($counter)).toEqual(1);
});
```

---

TITLE: Effector Test with Mocked Handler DESCRIPTION: This code snippet
demonstrates how to mock the server response by providing a custom handler via
the fork configuration, which is useful for avoiding real server requests. The
mock returns `true` regardless of the actual server response. This makes the
unit test predictable and isolated. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/testing.mdx#_snippet_7

LANGUAGE: typescript CODE:

```
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

---

TITLE: Combining Stores into Object in Effector (TypeScript) DESCRIPTION:
Demonstrates combining multiple stores into a single store representing a form.
The first example combines stores directly into an object. The second example
combines stores and transforms their values to create a form validation store.
Requires effector library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_19

LANGUAGE: typescript CODE:

```
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

---

TITLE: Array Update Example - Typescript DESCRIPTION: Demonstrates how to
correctly update an array stored in an effector Store by creating a new array
reference using the spread operator. This ensures that effector detects the
change and updates the store's state. Incorrectly mutating the array in place
will not trigger an update. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Store.md#_snippet_1

LANGUAGE: typescript CODE:

```
$items.on(addItem, (items, newItem) => {
  const updatedItems = [...items];
  // ✅ метод .push вызывается на новом массиве
  updatedItems.push(newItem);
  return updatedItems;
});
```

---

TITLE: Sample using sourceUnit, clockUnit, fn DESCRIPTION: An example of using
the `sample(sourceUnit, clockUnit, fn?)` form. It demonstrates triggering an
effect with data sampled from a store when an event occurs, using a combinator
function to transform the data. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/sample.md#_snippet_4

LANGUAGE: javascript CODE:

```
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

---

TITLE: Triggering Navigation from a React Component (JavaScript) DESCRIPTION:
This snippet shows how to trigger navigation from a React component using the
`navigationTriggered` event. It uses the `useUnit` hook from 'effector-react' to
get the event trigger function and attaches it to a button's `onClick` handler.
It requires 'effector-react' and '@/your-path-name' dependencies and needs to be
a client component. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/nextjs/router.md#_snippet_4

LANGUAGE: javascript CODE:

```
'use client';

import { useUnit } from 'effector-react';
import { navigationTriggered } from '@/your-path-name';

    ...

export function goToSomeRouteNameButton() {
  const goToSomeRouteName = useUnit(navigationTriggered);

  return (
    <button onClick={() => goToSomeRouteName('/some-route-name')}>
      do it!
    </button>
  );
}


```

---

TITLE: State transformation with combine DESCRIPTION: Demonstrates state
transformation using the `combine` function with different signatures. It shows
how to combine multiple stores into a new store with a transformed value.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/combine.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
declare const $a: Store<A>;
declare const $b: Store<B>;

// State transformation

const $c: Store<C> = combine({ a: $a, b: $b }, (values: { a: A; b: B }) => C);

const $c: Store<C> = combine([$a, $b], (values: [A, B]) => C);

const $c: Store<C> = combine($a, $b, (a: A, b: B) => C);
```

---

TITLE: Correct Prepend with Sample DESCRIPTION: Corrects the incorrect `prepend`
usage by using `sample`. Demonstrates usage of `sample` to connect two events
and perform data transformation between them. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_10

LANGUAGE: typescript CODE:

```
const someHappened = createEvent<string>();
const another = createEvent<number>();
const reversed = createEvent<number>();

// То же самое, что и .prepend(), но с использованием `sample`
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

---

TITLE: Create effect with handler (JavaScript) DESCRIPTION: Creates an effect
named `fetchUserReposFx` using `createEffect` and defines an asynchronous
handler function that fetches user repositories from the GitHub API. It then
watches the `.done` event of the effect to log the results. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/createEffect.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Using Effector with React DESCRIPTION: This React component demonstrates
how to use Effector with React using the `useUnit` hook from `effector-react`.
It imports a store `$counter` and events `incremented` and `decremented` from
`./counter.js` and connects them to the component. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/get-started.mdx#_snippet_9

LANGUAGE: javascript CODE:

```
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

---

TITLE: Avoiding `watch` for Logic in Effector (TypeScript) DESCRIPTION: This
example illustrates the anti-pattern of using `watch` for logic, recommending
`sample`, `guard`, or `effects` instead. The `watch` function should be used
only for debugging. The correct approach separates side effects into effects and
connects them using `sample`. It also uses sample to forward store data to an
event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_7

LANGUAGE: typescript CODE:

```
// logic in watch
$user.watch((user) => {
  localStorage.setItem("user", JSON.stringify(user));
  api.trackUserUpdate(user);
  someEvent(user.id);
});
```

LANGUAGE: typescript CODE:

```
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

---

TITLE: Forward Event to Store - Effector (JavaScript) DESCRIPTION: This example
demonstrates forwarding an event's payload to update a store's value. Whenever
the event is triggered, the store's value is updated with the event's payload.
`createStore` and `createEvent` from effector are dependencies. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/forward.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Correct State Access via Parameters in Effector (Typescript) DESCRIPTION:
This snippet shows the recommended way of passing store values to effects via
parameters using the `sample` function, enhancing reusability and testability.
It samples `$form`, `$user`, and `$settings` when `formSubmitted` occurs, and
then passes the values to `submitFormFx`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_13

LANGUAGE: typescript CODE:

```
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

---

TITLE: Serialize Forked Instance State (JavaScript) DESCRIPTION: This code
demonstrates how to serialize the state of a forked Effector scope after an
event has been triggered and settled. It creates a store, an event, forks the
store, triggers the event in the forked scope, and then serializes the scope's
state using the `serialize` method. The serialized state will be an object
containing the updated store value, keyed by its SID. Requires `effector`
library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/serialize.md#_snippet_1

LANGUAGE: javascript CODE:

```
import { createStore, createEvent, allSettled, fork, serialize } from "effector";

const inc = createEvent();
const $store = createStore(42);
$store.on(inc, (x) => x + 1);

const scope = fork();

await allSettled(inc, { scope });

console.log(serialize(scope)); // => {[sid]: 43}
```

---

TITLE: Effector Form Handling with Split DESCRIPTION: This code snippet
demonstrates form handling in Effector using effects, stores, events, `sample`
for validation, and `split` for routing. It creates effects for displaying
errors and submitting the form, stores for form data and errors, and an event to
trigger form submission. The `sample` function validates form fields, and
`split` routes either to error display or form submission. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/flow-split.mdx#_snippet_9

LANGUAGE: typescript CODE:

```
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

---

TITLE: allSettled with Store and Event (TypeScript) DESCRIPTION: Illustrates the
usage of `allSettled` with both Effector Store and Event. It forks two scopes,
initializes a store, creates an event, and then uses `allSettled` to await the
completion of operations involving the store and event in both scopes. The
store's value is updated, and then the changes are watched in each scope.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/allSettled.md#_snippet_1

LANGUAGE: typescript CODE:

```
const scopeA = fork();
const scopeB = fork();

const $store = createStore(0);
const inc = createEvent<number>();

await allSettled($store, { scope: scopeA, params: 5 });
await allSettled($store, { scope: scopeB, params: -5 });

$store.watch(console.log);

await allSettled(inc, { scope: scopeA, params: 2 }); // в консоль выведется 7
await allSettled(inc, { scope: scopeB, params: 2 }); // в консоль выведется -3
```

---

TITLE: Effector React App - Common Code (TypeScript) DESCRIPTION: This
TypeScript code defines a simple counter application using Effector and React.
It includes Effector stores, events, and effects for managing the counter state,
fetching data, and handling user interactions. The code also demonstrates how to
use `useUnit` to connect Effector units to React components and how to handle
client-side specific logic. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/server-side-rendering.md#_snippet_0

LANGUAGE: tsx CODE:

```
// app.tsx
import React from "react";
import { createEvent, createStore, createEffect, sample, combine } from "effector";
import { useUnit } from "effector-react";

// модель
export const appStarted = createEvent();
export const $pathname = createStore<string | null>(null);

const $counter = createStore<number | null>(null);

const fetchUserCounterFx = createEffect(async () => {
  await sleep(100); // в реальной жизни это был бы какой-то API-запрос

  return Math.floor(Math.random() * 100);
});

const buttonClicked = createEvent();
const saveUserCounterFx = createEffect(async (count: number) => {
  await sleep(100); // в реальной жизни это был бы какой-то API-запрос
});

sample({
  clock: appStarted,
  source: $counter,
  filter: (count) => count === null, // если счетчик уже загружен – не загружать его снова
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
   * Здесь мы явно указываем effector, что это стор, которое зависит от окружения,
   * никогда не должно включаться в сериализацию,
   * так как оно должно всегда вычисляться на основе текущего окружения.
   *
   * Это не обязательно, так как в сериализацию включается только разница изменений состояния,
   * и этот стор не будет изменяться.
   *
   * Но всё же хорошо добавить эту настройку – чтобы подчеркнуть намерение.
   */
  serialize: "ignore",
});

const notifyFx = createEffect((message: string) => {
  alert(message);
});

sample({
  clock: [
    saveUserCounterFx.done.map(() => "Обновление счетчика успешно сохранено"),
    saveUserCounterFx.fail.map(() => "Не удалось сохранить обновление счетчика :("),
  ],
  // Совершенно нормально иметь некоторые ветвления в логике приложения в зависимости от текущего окружения.
  //
  // Здесь мы хотим вызвать уведомление только на клиенте.
  filter: $isClient,
  target: notifyFx,
});

// UI
export function App() {
  const clickButton = useUnit(buttonClicked);
  const { count, updatePending } = useUnit({
    count: $counter,
    updatePending: $countUpdatePending,
  });

  return (
    <div>
      <h1>Приложение-счетчик</h1>
      <h2>
        {updatePending ? "Счетчик обновляется" : `Текущее значение: ${count ?? "неизвестно"}`}
      </h2>
      <button onClick={() => clickButton()}>Обновить счетчик</button>
    </div>
  );
}

```

---

TITLE: Component using useUnit hook DESCRIPTION: This example demonstrates how
to replace `useStore` and `useEvent` with the unified `useUnit` hook in
`effector-react`. It showcases the ability to subscribe to multiple units
simultaneously for batched updates. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/migration-guide-v23.md#_snippet_2

LANGUAGE: typescript CODE:

```
const Component = () => {
  const foo = useUnit($foo);
  const bar = useUnit($bar);
  const onSubmit = useUnit(triggerSubmit);
};
```

---

TITLE: allSettled Usage in Tests DESCRIPTION: Illustrates how to use
`allSettled` in a test environment with Effector. This example involves creating
an event, sampling it to trigger logic, binding it to a scope, simulating an
external source update, awaiting all settled computations, and asserting the
expected outcome. It uses `createEvent`, `sample`, `fork`, `scopeBind`, and
`allSettled` from the Effector library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/allSettled.md#_snippet_2

LANGUAGE: typescript CODE:

```
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

---

TITLE: Sample with Multiple Data Sources DESCRIPTION: This snippet demonstrates
using multiple stores as data sources with `sample`. It combines a search query
and filters into a single object and passes it to an effect. The
`submitSearchFx` effect is triggered with combined data from `$searchQuery` and
`$filters` stores. The example relies on `effector` library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/unit-composition.md#_snippet_4

LANGUAGE: typescript CODE:

```
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
const $filters = createStore<string[]>([ ]);

sample({
  clock: searchClicked,
  source: {
    query: $searchQuery,
    filters: $filters,
  },
  target: submitSearchFx,
});
```

---

TITLE: Update Store State with `.on()` (JavaScript) DESCRIPTION: Updates a
store's state using the `.on()` method when a trigger event occurs. The `$store`
increments its value whenever the `changed` event is triggered, using the
event's payload as the incrementor. Includes a watcher to log updated values.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Store.md#_snippet_4

LANGUAGE: javascript CODE:

```
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

---

TITLE: Event Testing with Effector DESCRIPTION: This code snippet demonstrates
how to test an event in Effector. It uses `createWatch` to create a subscription
to the event within a forked scope and `allSettled` to trigger the event in the
scope. It then asserts that the watcher function was called the expected number
of times using Jest's `toHaveBeenCalledTimes` method. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/testing.mdx#_snippet_2

LANGUAGE: typescript CODE:

```
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

---

TITLE: Server-Side Rendering with Effector Scopes (Server) DESCRIPTION:
Illustrates server-side rendering (SSR) using Effector scopes. It demonstrates
creating a scope, loading data, rendering the app, and serializing the state for
transfer to the client. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/advanced/work-with-scope.mdx#_snippet_3

LANGUAGE: jsx CODE:

```
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

---

TITLE: Combining Stores into Object with Effector DESCRIPTION: Demonstrates how
to combine multiple effector stores (`$r`, `$g`, `$b`) into a single store
(`$color`) whose value is an object. It shows the new `combine` syntax replacing
the deprecated `createStoreObject` syntax. The resulting store's value is an
object reflecting the latest values of the source stores. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_65

LANGUAGE: javascript CODE:

```
import {createStore, combine, createStoreObject} from 'effector'

const $r = createStore(255)
const $g = createStore(0)
const $b = createStore(255)

const $color = combine({r: $r, g: $g, b: $b})
$color.watch(console.log)
// => {r: 255, b: 0, b: 255}

const $colorOld = createStoreObject({r, g, b})
$colorOld.watch(console.log)
// => {r: 255, b: 0, b: 255}
```

---

TITLE: Incorrect Array Update Example - Typescript DESCRIPTION: Illustrates an
incorrect way to update an array within an effector Store. Modifying the array
directly (using `push` without creating a new array) does not trigger state
updates, as the reference to the array remains unchanged. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Store.md#_snippet_2

LANGUAGE: typescript CODE:

```
$items.on(addItem, (items, newItem) => {
  // ❌ ошибка! Ссылка на массив осталась та же, обновления стора не произойдёт
  items.push(newItem);
  return items;
});
```

---

TITLE: Sample Usage to create derived store - Typescript DESCRIPTION: Shows how
to create a derived store using `sample`. It takes the `age` property from the
`$currentUser` store and assigns it to the `$userAge` store. This provides a way
to reactively update one store based on changes in another. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/unit-composition.md#_snippet_1

LANGUAGE: typescript CODE:

```
import { createStore, sample } from "effector";

const $currentUser = createStore({ name: "Bob", age: 25 });

// создает производный стор, который обновляется, когда source меняется
const $userAge = sample({
  source: $currentUser,
  fn: (user) => user.age,
});
// эквивалентно
const $userAgeViaMap = $currentUser.map((currentUser) => currentUser.age);
```

---

TITLE: State combination with combine DESCRIPTION: Illustrates state combination
using the `combine` function to create a new store that holds the combined state
of multiple stores. The combined state can be an object or an array. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/combine.mdx#_snippet_1

LANGUAGE: typescript CODE:

```
// State combination

const $c: Store<{ a: A; b: B }> = combine({ a: $a, b: $b });

const $c: Store<[A, B]> = combine([$a, $b]);
```

---

TITLE: Using useUnit Hook in Effector-React DESCRIPTION: Demonstrates how to use
the `useUnit` hook to subscribe to multiple Effector stores (`$count`, `$title`)
and bind an event (`inc`) within a React functional component. It shows how to
access the store values and the bound event handler directly from the hook's
return array. Requires `effector` and `effector-react/scope`. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_3

LANGUAGE: TSX CODE:

```
import {value createEvent, value createStore, value fork} from 'effector'
import {value useUnit, value Provider} from 'effector-react/scope'

const inc = createEvent()
const $count = createStore(0)
const $title = createStore('useStore example')

$count.on(inc, x => x + 1)

const App = () => {
  const [count, title, incFn] = useUnit([$count, $title, inc])
  return (
    <>
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button onClick={() => incFn()}>increment</button>
    </>
  )
}

const scope = fork()

render(
  () => (
    <Provider value={scope}>
      <App />
    </Provider>
  ),
  document.getElementById('root'),
)
```

---

TITLE: Sending Message with Type Guard - TypeScript DESCRIPTION: This snippet
fixes a potential type error caused by `strictNullChecks` in `tsconfig.json`. It
adds a `filter` to the `sample` function to ensure that the `$session` store
contains a valid `Session` object (not null) before sending the message. The
`filter` uses a type guard to narrow the type of `form` to
`{ author: Session; text: string }`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_23

LANGUAGE: typescript CODE:

```
sample({
  clock: messageSend,
  source: { author: $session, text: $messageText },
  filter: (form): form is { author: Session; text: string } => {
    return form.author !== null;
  },
  target: messageApi.messageSendFx,
});
```

---

TITLE: Practical Effect Example DESCRIPTION: This code snippet illustrates a
practical example of using Effector effects to load user data based on an ID
entered by the user. It uses stores, events, and effects to manage the data
loading process and display any errors that occur. Demonstrates setting id,
submitting form and updating user and error stores. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/work-with-async.md#_snippet_4

LANGUAGE: typescript CODE:

```
import { createStore, createEvent, createEffect, sample } from "effector";

// Эффект для загрузки данных
const fetchUserFx = createEffect(async (id: number) => {
  const response = await fetch(`/api/user/${id}`);

  if (!response.ok) {
    // можно модифицировать ошибку, прежде чем она попадет в fail/failData
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

// Логика загрузки: запускаем fetchUserFx при submit
sample({
  clock: submit,
  source: $id,
  target: fetchUserFx,
});

// Использование
setId(1); // Устанавливаем ID
submit(); // Загружаем данные
```

---

TITLE: Store Creation with restore and Effect in effector DESCRIPTION:
Demonstrates using `restore` with an effect to update a store with data from the
effect's `doneData` event. The `$newUser` store is initialized with a default
value and updated with the result of the `createUserFx` effect upon successful
completion. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_14

LANGUAGE: typescript CODE:

```
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

---

TITLE: Combine with array DESCRIPTION: Combines multiple stores into an array.
Dependencies: `Store`, `StoreWritable`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/combine.mdx#_snippet_6

LANGUAGE: typescript CODE:

```
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<[A, B, C]> = combine([$a, $b, $c]);
```

---

TITLE: Installing Effector with NPM DESCRIPTION: This command installs the core
Effector library using the npm package manager. It is a basic installation
suitable for environments that don't require framework-specific bindings.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/installation.mdx#_snippet_0

LANGUAGE: bash CODE:

```
npm install effector
```

---

TITLE: Updating Store with Events in Effector (TypeScript) DESCRIPTION: Shows
the common usage of updating an Effector store using individual events and the
`on` method. It defines separate events for increment, decrement, and reset
actions on a counter store. The store subscribes to these events to handle state
updates. Requires effector library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_17

LANGUAGE: typescript CODE:

```
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

---

TITLE: Creating Effector Events DESCRIPTION: This code snippet creates two
events, `incremented` and `decremented`, using the `createEvent` function from
Effector. These events will be used to trigger state updates in the counter
store. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/get-started.mdx#_snippet_4

LANGUAGE: typescript CODE:

```
import { createEvent } from "effector";

const incremented = createEvent();
const decremented = createEvent();
```

---

TITLE: Basic scopeBind usage with Event DESCRIPTION: This example demonstrates
how to use `scopeBind` to bind an event to a scope. It creates an event
`changeLocation` and uses `scopeBind` to create a function `locationUpdate` that
dispatches the event within the correct scope when called from a callback like
`history.listen`. The code also illustrates how to use `attach` and `sample` to
trigger the effect. The example also demonstrates the creation of a store and
event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/scopeBind.md#_snippet_1

LANGUAGE: typescript CODE:

```
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

---

TITLE: Creating Stores with createStore in effector DESCRIPTION: Illustrates how
to create effector stores using the `createStore` function, including examples
with initial values and explicit typing. Stores `$counter`, `$user`, and
`$posts` are initialized with different data types and initial values,
demonstrating the flexibility of `createStore`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_4

LANGUAGE: typescript CODE:

```
import { createStore } from "effector";

// Create store with initial value
const $counter = createStore(0);
// with explicit typing
const $user = createStore<{ name: "Bob"; age: 25 } | null>(null);
const $posts = createStore<Post[]>([ ]);
```

---

TITLE: Complete Effector Example DESCRIPTION: This code defines a complete
Effector example with an event, store, and effect, demonstrating a counter with
asynchronous validation. When a button is clicked, the code checks if the
counter is less than 100 and then validates the click through a backend API. On
successful validation, the counter increments; otherwise, it resets to zero.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/testing.mdx#_snippet_5

LANGUAGE: typescript CODE:

```
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

---

TITLE: Effector Core Logic DESCRIPTION: This snippet defines the core logic of
the todo application using Effector. It creates events for user interactions
(submit, submitted, completed, changed, removed), stores for application state
($todo, $todos, $error), and an effect (validateFx) for input validation. It
also defines how the stores react to events. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/todo-with-validation.md#_snippet_0

LANGUAGE: javascript CODE:

```
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
```

---

TITLE: Creating Small Effector Stores (TypeScript) DESCRIPTION: This example
demonstrates the recommended practice of creating small, atomic stores in
Effector, contrasting it with the anti-pattern of large stores with multiple
fields. Atomic stores allow for more efficient updates, targeted subscriptions,
and better reactivity. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
// ❌ Большой стор - любое изменение вызывает обновление всего
const $bigStore = createStore({
  profile: { /* много полей */ },
  settings: { /* много полей */ },
  posts: [ /* много постов */ ]
})

// ✅ Атомарные сторы - точечные обновления
const $userName = createStore('')
const $userEmail = createStore('')
const $posts = createStore<Post[]>([])
const $settings = createStore<Settings>({})

// Компонент подписывается только на нужные данные
const UserName = () => {
  const name = useUnit($userName) // Обновляется только при изменении имени
  return <h1>{name}</h1>
}
```

---

TITLE: Merging Events with `merge` in Effector DESCRIPTION: Demonstrates how to
merge events using the `merge` function from effector. It shows how `merge`
combines events of different types and events of the same type. The result is a
new event that triggers when any of the input events trigger, carrying the
payload of the triggering event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/typescript.mdx#_snippet_15

LANGUAGE: typescript CODE:

```
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

---

TITLE: Using Gate to Fetch and Display Todo Data DESCRIPTION: This code snippet
demonstrates how to use the `Gate` component from `effector-react` to manage
data flow between a React component (`App`) and an Effector store (`$todo`). It
fetches a Todo item from a mock API using `createEffect` and updates the store.
The `TodoGate` component is used to trigger the `getTodoFx` effect whenever its
`id` prop changes. The `useUnit` hook is used to subscribe to the store and the
loading state of the effect. Dependencies include `effector`, `effector-react`,
and `react`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/gate.md#_snippet_0

LANGUAGE: javascript CODE:

```
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

---

TITLE: Testing Effects with Fork Handlers in Effector DESCRIPTION: Demonstrates
how to use the `handlers` option in `effector/fork` to mock effect handlers
within a forked scope. This is useful for testing effect behavior without
executing the actual handler logic. It shows creating a domain, stores, and
effects, then forking the domain with mocked handlers and asserting store state
after `allSettled`. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_42

LANGUAGE: typescript CODE:

```
import {value createDomain} from 'effector'
import {
  value fork,
  value hydrate,
  value serialize,
  value allSettled,
} from 'effector/fork'

//app
const app = createDomain()
const fetchFriendsFx = app.createEffect<{limit: number}, string[]>({
  async handler({limit}) {
    /* some client-side data fetching */
    return []
  },
})
const $user = app.createStore('guest')
const $friends = app
  .createStore([])
  .on(fetchFriendsFx.doneData, (_, result) => result)

/*
  test to ensure that $friends value is populated
  after fetchFriendsFx call
*/
const testScope = fork(app, {
  values: {
    [$user.sid]: 'alice',
  },
  handlers: {
    [fetchFriendsFx.sid]: () => ['bob', 'carol'],
  },
})

/* trigger computations in scope and await all called effects */
await allSettled(fetchFriendsFx, {
  scope: testScope,
  params: {limit: 10},
})

/* check value of store in scope */
console.log(testScope.getState($friends))
// => ['bob', 'carol']
```

---

TITLE: useStore function signature (TypeScript) DESCRIPTION: Defines the type
signature for the `useStore` hook. It takes an Effector `Store` as input and
returns the current `State` of that store. The `State` type is inferred from the
store itself. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useStore.md#_snippet_2

LANGUAGE: typescript CODE:

```
useStore($store: Store<State>): State
```

---

TITLE: Basic createStore Example DESCRIPTION: Demonstrates a basic usage of
`createStore` to manage a list of todos. It shows how to update the store's
state with the `.on()` method when an event is fired, and how to reset the store
to its default state with the `.reset()` method. It also illustrates how to
create a derived store using the `.map()` method and observe changes using
`.watch()`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/createStore.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Using useEffect to Trigger Page Mount Event DESCRIPTION: This code
utilizes the `useEffect` hook in React to trigger the `pageMounted` event when
the `ChatPage` component is mounted. This initiates the process of loading user
session and messages when the page loads. This ensures that data loading begins
as soon as the component renders. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_15

LANGUAGE: tsx CODE:

```
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

---

TITLE: Effect .done event usage DESCRIPTION: This example shows how to subscribe
to the `.done` event of an Effect. The `.done` event is triggered when the
effect's handler is successfully resolved. The example logs the parameters
passed to the effect and the result of the handler. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Effect.md#_snippet_5

LANGUAGE: javascript CODE:

```
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.done.watch(({ params, result }) => {
  console.log("Call with params", params, "resolved with value", result);
});

await fx(2);
// => Call with params 2 resolved with value 3
```

---

TITLE: Creating derived Stores - Effector (TypeScript) DESCRIPTION: This snippet
showcases how to create derived stores using the `map` method in Effector. The
`$superHeroes` and `$superVillains` stores are derived from the `$supers` store
and automatically update whenever the original store changes. This exemplifies
the reactivity principle, where changes propagate automatically. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/core-concepts.md#_snippet_4

LANGUAGE: typescript CODE:

```
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

---

TITLE: allSettled with Event Example (TypeScript) DESCRIPTION: Demonstrates how
to use `allSettled` with an Effector Event to ensure all its triggered
executions within a scope have completed. It forks a scope, creates an event,
watches it for logging, and then uses `allSettled` to wait for the event to
settle within the scope with specified parameters. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/allSettled.md#_snippet_0

LANGUAGE: typescript CODE:

```
const scope = fork();
const event = createEvent<number>();

event.watch(console.log);

await allSettled(event, { scope, params: 123 }); // в консоль выведется 123
```

---

TITLE: Using useUnit with Events/Effects (with Scope) DESCRIPTION: This example
demonstrates how to use `useUnit` with events to trigger updates in a scoped
environment. It requires `effector`, `effector-react`, and `react-dom`. The
`useUnit` hook from `effector-react` is used to bind the event to the current
scope, allowing the component to interact with the event within the provided
scope. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useUnit.md#_snippet_0

LANGUAGE: jsx CODE:

```
import { createEvent, createStore, fork } from "effector";
import { useUnit, Provider } from "effector-react";

const inc = createEvent();
const $count = createStore(0).on(inc, (x) => x + 1);

const App = () => {
  const [count, incFn] = useUnit([$count, inc]);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => incFn()}>increment</button>
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

---

TITLE: Modeling Business Logic with Effector DESCRIPTION: This snippet
demonstrates how to model the chat page's business logic using Effector. It
defines events for user actions like deleting messages, sending messages, and
logging in/out. It also defines stores for managing the application's state,
such as login status, username, messages, and message text. This uses the
effector library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_10

LANGUAGE: ts CODE:

```
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

---

TITLE: Testing Effector with Custom Effect Handlers DESCRIPTION: This code
demonstrates testing Effector logic with a custom effect handler provided via
`fork`. It mocks the `validateClickFx` effect to return `true`, preventing a
real API call. The test then verifies that the counter increments to 1 after the
button click event is triggered. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/testing.mdx#_snippet_7

LANGUAGE: typescript CODE:

```
test("main case", async () => {
  const scope = fork({
    handlers: [
      // Список пар [effect, mock handler]
      [validateClickFx, () => true],
    ],
  });

  expect(scope.getState($clicksCount)).toEqual(0);

  await allSettled(buttonClicked, { scope });

  expect(scope.getState($clicksCount)).toEqual(1);
});
```

---

TITLE: useList with Store Updates (JSX) DESCRIPTION: Illustrates how to use
`useList` with a store that updates based on events. It demonstrates a simple
to-do list application where items can be toggled and new items can be added.
The `useUnit` hook is used to access event handlers from effector. The list will
re-render efficiently on updates. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useList.md#_snippet_2

LANGUAGE: jsx CODE:

```
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

---

TITLE: Set initial state and change effect handler - TS DESCRIPTION: This
TypeScript code provides an example of setting an initial state for a store and
changing the handler for an effect within a forked scope. It simulates a test
scenario where `fetchFriendsFx` fetches data and updates the `$friends` store.
The forked scope is configured to use a mocked handler for `fetchFriendsFx` and
an initial value for `$user`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/fork.md#_snippet_4

LANGUAGE: ts CODE:

```
import { createEffect, createStore, fork, allSettled } from "effector";

const fetchFriendsFx = createEffect<{ limit: number }, string[]>(async ({ limit }) => {
  /* получение данных на стороне клиента */
  return [];
});
const $user = createStore("guest");
const $friends = createStore([]);

$friends.on(fetchFriendsFx.doneData, (_, result) => result);

const testScope = fork({
  values: [[$user, "alice"]],
  handlers: [[fetchFriendsFx, () => ["bob", "carol"]]],
});

/* запускаем вычисления в scope и ожидаем завершения всех вызванных effects */
await allSettled(fetchFriendsFx, {
  scope: testScope,
  params: { limit: 10 },
});

/* проверяем значение стора в scope */
console.log(testScope.getState($friends));
// => ['bob', 'carol']
```

---

TITLE: Effector SSR Request Handler (TypeScript) DESCRIPTION: This TypeScript
code demonstrates a server-side request handler for an Effector-based
application. It uses `effector/fork` to create isolated scopes for each request,
preventing data leakage between users. The handler fetches application data,
serializes the state, and renders the React component to a string, which is then
included in the HTML response. The serialized state is passed to the client-side
application to initialize it. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/server-side-rendering.md#_snippet_1

LANGUAGE: tsx CODE:

```
// server.tsx
import { renderToString } from "react-dom/server";
import { Provider } from "effector-react";
import { fork, allSettled, serialize } from "effector";

import { appStarted, App, $pathname } from "./app";

export async function handleRequest(req) {
  // 1. Создаем отдельный экземпляр состояния effector – специальный объект `Scope`.
  const scope = fork({
    values: [
      // некоторые части состояния приложения могут быть сразу установлены в нужные значения,
      // до начала любых вычислений.
      [$pathname, req.pathname],
    ],
  });

  // 2. Запускаем логику приложения – все вычисления будут выполнены в соответствии с логикой модели,
  // а также любые необходимые эффекты.
  await allSettled(appStarted, {
    scope,
  });

  // 3. Сериализуем вычисленное состояние, чтобы его можно было передать по сети.
  const storesValues = serialize(scope);

  // 4. Рендерим приложение – также в сериализуемую версию.
  const app = renderToString(
    // Используя Provider с scope, мы указываем <App />, какое состояние сторов использовать.
    <Provider value={scope}>
      <App />
    </Provider>,
  );

  // 5. Подготавливаем сериализованный HTML-ответ.
  //
  // Это граница сериализации (или сети).
  // Точка, в которой всё состояние преобразуется в строку для отправки по сети.
  //
  // Состояние effector сохраняется в виде `<script>`, который установит состояние в глобальный объект.
  // Состояние `react` сохраняется как часть DOM-дерева.
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

---

TITLE: Reading Store Value in React with useUnit DESCRIPTION: Demonstrates how
to read the current value of an effector store within a React component using
the `useUnit` hook from `effector-react`. The `Counter` component displays the
current value of the `$counter` store. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_5

LANGUAGE: typescript CODE:

```
import { useUnit } from 'effector-react'
import { $counter } from './model.js'

const Counter = () => {
  const counter = useUnit($counter)

  return <div>{counter}</div>
}
```

---

TITLE: Effector Effect failData Event DESCRIPTION: Demonstrates how to use the
`failData` event of an Effector Effect to handle rejections and errors. An
effect is created that throws an error, and the `failData` event is used to log
the error message. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Effect.md#_snippet_8

LANGUAGE: javascript CODE:

```
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

---

TITLE: Updating Object in effector Store (Correct) DESCRIPTION: Illustrates the
proper method to update an object within an effector store while preserving
immutability. When the `nameChanged` event is triggered, the `$user` store is
updated by creating a new object with the updated `name` property using the
spread operator. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_1

LANGUAGE: typescript CODE:

```
//update object
$user.on(nameChanged, (user, newName) => ({
  ...user,
  name: newName,
}));
```

---

TITLE: Splitting event with match as Object with Stores - Effector - TypeScript
DESCRIPTION: This snippet demonstrates using an object of stores as the `match`
parameter in `split`. Each store holds a boolean value. When `postCreated` is
triggered, the case whose corresponding store is `true` will be executed. If
both `$isAdmin` and `$isModerator` were `true`, `createAdminPostFx` would be
triggered, as it is the first in the object. The default case `createUserPostFx`
runs only if neither `$isAdmin` nor `$isModerator` is `true`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/flow-split.mdx#_snippet_7

LANGUAGE: typescript CODE:

```
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

---

TITLE: useStoreMap Example Usage DESCRIPTION: Demonstrates how to use
`useStoreMap` to extract specific user data from a store containing a list of
users. It uses the `keys` option to specify the `id` as a dependency, ensuring
that the `User` component only re-renders when the data for that specific user
changes. It imports from effector, and effector-react. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useStoreMap.md#_snippet_2

LANGUAGE: jsx CODE:

```
import { createStore } from "effector";
import { useUnit, useStoreMap } from "effector-react";

const data = [
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

const $users = createStore(data);
const $ids = createStore(data.map(({ id }) => id));

const User = ({ id }) => {
  const user = useStoreMap({
    store: $users,
    keys: [id],
    fn: (users, [userId]) => users.find(({ id }) => id === userId),
  });

  return (
    <div>
      <strong>[{user.id}]</strong> {user.name}
    </div>
  );
};

const UserList = () => {
  const ids = useUnit($ids);
  return ids.map((id) => <User key={id} id={id} />);
};
```

---

TITLE: Installing Effector with yarn DESCRIPTION: This command installs the core
Effector library using the yarn package manager. It provides an alternative
installation method for users who prefer yarn. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/get-started.mdx#_snippet_1

LANGUAGE: bash CODE:

```
yarn install effector
```

---

TITLE: Message Text State Management DESCRIPTION: This snippet demonstrates how
to manage the message text state using an Effector store ($messageText) and
event (messageTextChanged). The store is updated whenever the messageTextChanged
event is triggered, storing the new text value. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_20

LANGUAGE: typescript CODE:

```
// Файл: /src/pages/chat/model.ts
$messageText.on(messageTextChanged, (_, text) => text);
```

---

TITLE: Data Loading on Page Mount DESCRIPTION: This snippet demonstrates how to
use Effector's `sample` function to trigger data loading effects when the
`pageMounted` event is fired. It loads both messages and user session data
concurrently when the page loads. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_15

LANGUAGE: ts CODE:

```
// Файл: /src/pages/chat/model.ts
// Не забудьте про import { sample } from "effector"
import { Message, messageApi, sessionApi } from "shared/api";
import { $session } from "entities/session";

// export stores
// export events

// Здесь место для логики

// Вы можете прочитать этот код так:
// При загрузке страницы, одновременно вызываются загрузка сообщений и сессия пользователя
sample({
  clock: pageMounted,
  target: [messageApi.messagesLoadFx, sessionApi.sessionLoadFx],
});
```

---

TITLE: Error: Unit Call from Pure Function (Effector) DESCRIPTION: Illustrates
the error that occurs when attempting to call events or effects directly from
pure functions within `.map()` or `.filter()`. It provides the corrected
approach using `sample` operator to trigger events based on conditions. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_20

LANGUAGE: typescript CODE:

```
const someHappened = createEvent<number>();
const another = createEvent();

const derived = someHappened.map((number) => {
  another(); // ВЫЗЫВАЕТ ОШИБКУ!
  return String(number);
});
```

LANGUAGE: typescript CODE:

```
const someHappened = createEvent<number>();
const another = createEvent();
const derived = createEvent<string>();

sample({
  clock: someHappened,
  target: another,
});

// То же самое, что и .map(), но с использованием `target`
sample({
  clock: someHappened,
  fn: (number) => String(number),
  target: derived,
});
```

---

TITLE: Complex Update Logic with sample in effector DESCRIPTION: Demonstrates
how to use the `sample` method for complex state updates, enabling control over
updates, dependency on multiple stores, and data transformation. The
`$filteredItems` store is updated based on the `$items` and `$filter` stores
when the `updateItems` event is triggered. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_12

LANGUAGE: typescript CODE:

```
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

---

TITLE: Basic useEvent Usage with Event DESCRIPTION: Demonstrates the basic usage
of `useEvent` with an Effector Event. The example shows how to create an event,
store, and bind the event to a handler function within a React component. This
handler is then used to trigger the event on button click. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useEvent.md#_snippet_1

LANGUAGE: jsx CODE:

```
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

---

TITLE: Effect .doneData event usage DESCRIPTION: This example demonstrates how
to subscribe to the `.doneData` event of an Effect. The `.doneData` event is
triggered by the result of the effect execution. The example logs the result of
the effect's handler when it successfully resolves. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Effect.md#_snippet_6

LANGUAGE: javascript CODE:

```
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.doneData.watch((result) => {
  console.log(`Effect was successfully resolved, returning ${result}`);
});

await fx(2);
// => Effect was successfully resolved, returning 3
```

---

TITLE: Typing Effector Events in TypeScript DESCRIPTION: This code snippet
demonstrates how to type Effector events using TypeScript. It showcases creating
events with and without parameters, and how TypeScript infers the event type
based on the provided generic type or absence thereof. The result is a strongly
typed event that improves type safety. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/typescript.mdx#_snippet_0

LANGUAGE: TypeScript CODE:

```
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

---

TITLE: Using Effector Effect's .pending Property with React (JS) DESCRIPTION:
This example illustrates the new `.pending` property available on effects, which
provides a boolean state indicating if the effect is currently running. It shows
how to watch this property and use it with `effector-react`'s `createComponent`
to build a simple loading indicator. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_93

LANGUAGE: js CODE:

```
import React from 'react'
import {createEffect} from 'effector'
import {createComponent} from 'effector-react'

const fetchApiFx = createEffect({
  handler: n => new Promise(resolve => setTimeout(resolve, n)),
})

fetchApiFx.pending.watch(console.log)

const Loading = createComponent(
  fetchApiFx.pending,
  (props, pending) => pending && <div>Loading...</div>,
)

fetchApi(5000)
```

---

TITLE: Using effector-solid with useUnit in a SolidJS component DESCRIPTION:
This code demonstrates how to use effector-solid with the useUnit hook in a
SolidJS component. It creates an event (inputText) and stores ($text, $size)
using effector, then connects them to a SolidJS form using useUnit. The form
updates the stores when the input changes. SOURCE:
https://github.com/effector/effector/blob/master/packages/effector-solid/README.md#_snippet_3

LANGUAGE: JavaScript CODE:

```
import {createStore, combine, createEvent} from 'effector'

import {useUnit} from 'effector-solid'

const inputText = createEvent()

const $text = createStore('').on(inputText, (_, text) => text)

const $size = createStore(0).on(inputText, (_, text) => text.length)

const Form = () => {
  const {
    text,
    size
  } = useUnit({
    size: $size,
    text: $text
  })

  return (
    <form>
      <input
        type="text"
        onInput={e => inputText(e.currentTarget.value)}
        value={text()}
      />
      <p>Length: {size}</p>
    </form>
  )
}
```

---

TITLE: Creating Derived Effector Events with Map DESCRIPTION: Demonstrates using
the `.map()` method on an existing event to create a new derived event. The
derived event is triggered with a transformed payload based on the original
event's payload, showing how to extract specific data. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/events.md#_snippet_6

LANGUAGE: TypeScript CODE:

```
import { createEvent, createStore } from "effector";

const userClicked = createEvent<{ id: number; name: string }>();
// Creating an event that will trigger only with the user's name
const userNameSelected = userClicked.map(({ name }) => name);
const $userName = createStore("").on(userNameSelected, (_, newName) => newName);

// Usage
userClicked({ id: 1, name: "John" });
// userNameSelected will get 'John'
```

---

TITLE: Effector Counter with Async Validation DESCRIPTION: This code snippet
defines an Effector counter with asynchronous validation. It includes an event
`buttonClicked`, an effect `validateClickFx`, and a store `$clicksCount`. The
effect is triggered when the button is clicked and the count is less than 100.
The store is updated based on the success or failure of the validation effect.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/testing.mdx#_snippet_5

LANGUAGE: typescript CODE:

```
import { createEvent, createStore, createEffect, sample } from "effector";

export const buttonClicked = createEvent();

export const validateClickFx = createEffect(async () => {
  /* вызов внешнего api */
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

---

TITLE: Effector Sample with Effect DESCRIPTION: This example shows how to create
a store, an effect, and an event. It uses sample to pass data from a store,
transformed by a function, into an effect when the event is triggered. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/sample.md#_snippet_2

LANGUAGE: javascript CODE:

```
const $userName = createStore("john");
const signIn = createEffect((params) => {
  console.log(params);
});
const submitForm = createEvent();

sample({
  clock: submitForm /* 1 */,
  source: $userName /* 2 */,
  fn: (name, password) => ({ name, password }) /* 3 */,
  target: signIn /* 4 */,
});

submitForm(12345678);
// 1. при вызове submitForm с аргументом 12345678
// 2. прочитать значение из стора $userName ('john')
// 3. преобразовать значение из submitForm (1) и $userName (2)
// 4. и передать результат вычислений в эффект signIn
```

---

TITLE: Effector Effect inFlight Store DESCRIPTION: Illustrates how to use the
`inFlight` store of an Effector Effect to track the number of currently
executing effect calls. The example demonstrates how the `inFlight` store
increases with each effect call and decreases upon completion. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Effect.md#_snippet_12

LANGUAGE: javascript CODE:

```
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

---

TITLE: Using `useList` with keys for UI Updates - TSX DESCRIPTION: This snippet
demonstrates using the `useList` hook from Effector React to render a list of
messages. It provides `keys` to the hook, specifically `messageDeleting`, to
ensure that the UI updates correctly when the `messageDeleting` state changes.
This prevents caching issues and ensures that the 'Deleting' state is properly
displayed on the button. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_30

LANGUAGE: tsx CODE:

```
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

---

TITLE: Sending Message to API with Null Check DESCRIPTION: This snippet
demonstrates how to use Effector's `sample` function to send a message to the
API, incorporating a type guard to ensure the session is not null. It defines a
filter function that narrows the type of the session to `Session` if it's not
null, preventing TypeScript errors due to strict null checks. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_23

LANGUAGE: typescript CODE:

```
// Файл: /src/pages/chat/model.ts
sample({
  clock: messageSend,
  source: { author: $session, text: $messageText },
  filter: (form): form is { author: Session; text: string } => {
    return form.author !== null;
  },
  target: messageApi.messageSendFx,
});
```

---

TITLE: Chat History Component with Effector DESCRIPTION: This snippet
demonstrates how to use Effector with React to render the chat history. It
utilizes `useUnit` and `useList` from `effector-react` to connect the component
to Effector stores and events. `useList` efficiently updates the message list,
while `useUnit` connects actions and stores. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_11

LANGUAGE: tsx CODE:

```
// Файл: /src/pages/chat/page.tsx
import { useList, useUnit } from "effector-react";
import * as model from "./model";

// export function ChatPage { ... }

function ChatHistory() {
  const [messageDeleting, onMessageDelete] = useUnit([
    model.$messageDeleting,
    model.messageDeleteClicked,
  ]);

  // Хук `useList` позволяет React не перерендерить сообщения, которые действительно не изменились.
  const messages = useList(model.$messages, (message) => (
    <div className="message-item" key={message.timestamp}>
      <h3>From: {message.author.name}</h3>
      <p>{message.text}</p>
      <button onClick={() => onMessageDelete(message)} disabled={messageDeleting}>
        {messageDeleting ? "Deleting" : "Delete"}
      </button>
    </div>
  ));
  // Здесь не нужен `useCallback` потому что мы передаем функцию в HTML-элемент, а не в кастомный компонент

  return <div className="chat-history">{messages}</div>;
}
```

---

TITLE: Effect Error Handling DESCRIPTION: This code snippet shows how to handle
errors within an Effector effect. It demonstrates the use of `createEffect` with
a specific error type, allowing TypeScript to catch incorrect error types thrown
within the effect. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/work-with-async.md#_snippet_3

LANGUAGE: typescript CODE:

```
import { createEffect } from "effector";

class CustomError extends Error {
  // реализация
}

const effect = createEffect<Params, ReturnValue, CustomError>(async () => {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    // Вы можете выбрасывать ошибки, которые будут перехвачены обработчиком .fail
    throw new CustomError(`Не удалось загрузить пользователя: ${response.statusText}`);
  }

  return response.json();
});
```

---

TITLE: Creating Derived Store and Event with Sample in Effector (TS)
DESCRIPTION: This snippet demonstrates how to create a derived store
(`$selectedUser`) and a derived event (`adminSelected`) using `sample` in
effector. The `$selectedUser` store holds the selected user based on a user ID.
The `adminSelected` event triggers only when the selected user is an admin. It
uses `createStore`, `createEvent`, and `sample` from effector. It relies on a
`$users` store. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/unit-composition.md#_snippet_10

LANGUAGE: typescript CODE:

```
import { createStore, createEvent, sample } from "effector";

type User = {
  id: number;
  role: string;
};

const userSelected = createEvent<number>();

const $users = createStore<User[]>([]);

// Создаём производный стор, который будет хранить выбранного пользователя
const $selectedUser = sample({
  clock: userSelected,
  source: $users,
  fn: (users, id) => users.find((user) => user.id === id) || null,
});
// $selectedUser имеет тип Store<User | null>

// Создаём производное событие, которое будет срабатывать только для админов
// если выбранный пользователь админ, то событие сработает сразу
const adminSelected = sample({
  clock: userSelected,
  source: $users,
  // сработает только если пользователь найден и он админ
  filter: (users, id) => !!users.find((user) => user.id === id && user.role === "admin"),
  fn: (users, id) => users[id],
});
// adminSelected имеет тип Event<User>

userSelected(2);
```

---

TITLE: Sampling event data to another event - Typescript DESCRIPTION: Shows how
to send data from an event with an argument to an event without an argument
using `sample`. This example illustrates that it is possible to connect events
with different data types. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_2

LANGUAGE: typescript CODE:

```
sample({
  clock: withData, // Event<number>
  target: withoutData, // Event<void>
});
```

---

TITLE: Effector Model Definition DESCRIPTION: This snippet defines the Effector
model for the chat page, including events for user actions and stores for
managing application state. It utilizes `createEvent` and `createStore` from
Effector. The model handles actions like sending messages, deleting messages,
logging in, and logging out. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_10

LANGUAGE: ts CODE:

```
// Файл: /src/pages/chat/model.ts
import { createEvent, createStore } from "effector";

// События просто сообщают о том, что что-то произошло
export const messageDeleteClicked = createEvent<Message>();
export const messageSendClicked = createEvent();
export const messageEnterPressed = createEvent();
export const messageTextChanged = createEvent<string>();
export const loginClicked = createEvent();
export const logoutClicked = createEvent();

// В данный момент есть только сырые данные без каких-либо знаний о том, как их загрузить.
export const $loggedIn = createStore<boolean>(false);
export const $userName = createStore("");
export const $messages = createStore<Message[]>([ ]);
export const $messageText = createStore("");

// Страница НЕ должна знать, откуда пришли данные.
// Поэтому мы просто реэкспортируем их.
// Мы можем переписать этот код с использованием `combine` или оставить независимые хранилища,
// страница НЕ должна меняться, просто потому что мы изменили реализацию
export const $messageDeleting = messageApi.messageDeleteFx.pending;
export const $messageSending = messageApi.messageSendFx.pending;
```

---

TITLE: Accessing Effect Done Event - Typescript DESCRIPTION: Describes the
`done` event, which triggers with the result of the effect execution and the
argument passed during the call. Manually calling the done event is prohibited.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Effect.md#_snippet_9

LANGUAGE: typescript CODE:

```
declare const fx: Effect<P, D>

fx.done
-> Event<{params: P; result: D}>
```

---

TITLE: Creating an Event with a specific type - Typescript DESCRIPTION:
Demonstrates how to create an event with a defined type using `createEvent`. The
type of the argument for the event must be provided as a generic type argument.
In this example, the `ItemAdded` interface defines the structure of the event's
data. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_1

LANGUAGE: typescript CODE:

```
import { createEvent } from "effector";

interface ItemAdded {
  id: string;
  title: string;
}

const itemAdded = createEvent<ItemAdded>();
```

---

TITLE: Parsing and Validating WebSocket Messages - TypeScript DESCRIPTION: This
snippet demonstrates how to parse and validate incoming WebSocket messages
against a predefined schema using Effector and Zod. It creates an effect
`parseFx` that parses the message and validates it against the `messagesSchema`.
Events are triggered for successful parsing (`parsedMessageReceived`) and
validation failures (`validationError`). Dependencies: effector, zod. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/websocket-integration.md#_snippet_6

LANGUAGE: typescript CODE:

```
const parsedMessageReceived = createEvent<MessagesSchema>();

const parseFx = createEffect((message: unknown): MessagesSchema => {
  return messagesSchema.parse(JSON.parse(typeof message === "string" ? message : "{}"));
});

// Парсим сообщение при его получении
sample({
  clock: rawMessageReceived,
  target: parseFx,
});

// Если парсинг удался — отправляем сообщение дальше
sample({
  clock: parseFx.doneData,
  target: parsedMessageReceived,
});
```

---

TITLE: Effector Sample Usage with Event and Store DESCRIPTION: Shows how to use
`sample` with an event as the `clock` and a store as the `source`. The result
will be an event, because the `clock` is not a store. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/sample.md#_snippet_1

LANGUAGE: typescript CODE:

```
const event = sample({ clock: event, source: $store });
// Результатом будет эвент, так как `clock` – не стор
```

---

TITLE: Extending WebSocket Connection Effect with Error Handling - Typescript
DESCRIPTION: Extends the WebSocket connection effect with comprehensive error
handling, including a timeout mechanism. It adds events for socket errors and
incorporates `scopeBind` for error events. Includes a store to save the latest
error message. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/websocket-integration.md#_snippet_4

LANGUAGE: typescript CODE:

```
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

---

TITLE: Testing Effect Execution with Mock Handlers DESCRIPTION: This snippet
shows how to test Effector effects by providing a mock handler within the `fork`
configuration. It intercepts the `getUserProjectsFx` effect and provides a mock
implementation that returns a predefined value. The test verifies that the
effect completes successfully and returns the expected mock data. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/testing.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
import { fork, allSettled } from "effector";
import { getUserProjectsFx } from "./effect.js";

test("effect executes correctly", async () => {
  const scope = fork({
    handlers: [
      // Список [эффект, моковый обработчик] пар
      [getUserProjectsFx, () => "user projects data"],
    ],
  });

  const result = await allSettled(getUserProjectsFx, { scope });

  expect(result.status).toBe("done");
  expect(result.value).toBe("user projects data");
});
```

---

TITLE: Updating Complex Objects with Immer (TypeScript) DESCRIPTION: This
snippet shows how to use Immer with Effector stores to simplify updating nested
data structures. Immer's `produce` function allows for immutable updates using
mutable operations within a draft object, improving code readability and
maintainability. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_1

LANGUAGE: typescript CODE:

```
import { createStore } from "effector";
import { produce } from "immer";

const $users = createStore<User[]>([])

$users.on(userUpdated, (users, updatedUser) =>
  produce(users, (draft) => {
    const user = draft.find((u) => u.id === updatedUser.id);
    if (user) {
      user.profile.settings.theme = updatedUser.profile.settings.theme;
    }
  }),
);

```

---

TITLE: Effector SSR Handler Example DESCRIPTION: Illustrates a server-side
rendering handler that uses Effector scopes and SIDs to manage and serialize
application state. It creates an isolated scope, populates the form values,
serializes the scope's values into a simple JavaScript object, and then
stringifies it for inclusion in the server response. No direct store imports are
needed as the state collection is automatic. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/explanation/sids.md#_snippet_4

LANGUAGE: tsx CODE:

```
// src/server/handler.ts
import { fork, allSettled, serialize } from "effector";

import { formValuesFilled } from "@/features/form";

async function handleServerRequest(req) {
  const scope = fork(); // создает изолированный контейнер для состояния приложения

  // вычисляем состояние приложения в этом scope
  await allSettled(formValuesFilled, {
    scope,
    params: {
      firstName: "John",
      lastName: "Doe",
    },
  });

  // извлекаем значения scope в простой js объект `{[storeSid]: storeState}`
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

---

TITLE: Triggering Effector Event Declaratively with sample (TypeScript)
DESCRIPTION: Illustrates the declarative approach to triggering events using the
`sample` operator. It shows how to configure `sample` so that one event
(`secondTriggered`) is triggered when another event (`firstTriggered`) occurs.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/events.md#_snippet_1

LANGUAGE: ts CODE:

```
import { createEvent, sample } from "effector";

const firstTriggered = createEvent<void>();
const secondTriggered = createEvent<void>();

sample({
  clock: firstTriggered,
  target: secondTriggered,
});
```

---

TITLE: Using attach for Effect Composition in Effector (JS) DESCRIPTION:
Demonstrates how to use the `attach` function to create derived effects that
automatically include data from stores (like an auth token) or pre-process
parameters. Shows how to wrap a generic effect (`backendRequestFx`) to create
more specific, reusable effects (`authorizedRequestFx`, `getUserFx`,
`getPostsFx`). Includes store updates and watching. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_48

LANGUAGE: js CODE:

```
import {createEffect, attach, createStore} from 'effector'

const backendRequestFx = createEffect({
  async handler({token, data, resource}) {
    const req = fetch(`https://example.com/api${resource}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
  },
})

const $requestsSend = createStore(0).on(backendRequestFx, total => total + 1)

$requestsSend.watch(total => {
  console.log(`client analytics: sent ${total} requests`)
})

const $token = createStore('guest_token')

const authorizedRequestFx = attach({
  effect: backendRequestFx,
  source: $token,
  mapParams: ({data, resource}, token) => ({data, resource, token}),
})

const createRequestFx = resource =>
  attach({
    effect: authorizedRequestFx,
    mapParams: data => ({data, resource}),
  })

const getUserFx = createRequestFx('/user')
const getPostsFx = createRequestFx('/posts')

const user = await getUserFx({name: 'alice'})
/*
POST https://example.com/api/user
{"name": "alice"}
Authorization: Bearer guest_token
*/

// => client analytics: sent 1 requests

const posts = await getPostsFx({user: user.id})
/*
POST https://example.com/api/posts
{"user": 18329}
Authorization: Bearer guest_token
*/

// => client analytics: sent 2 requests
```

---

TITLE: Basic createGate Usage - React JSX DESCRIPTION: Demonstrates the basic
usage of `createGate` to create a gate component in a React application. It
shows how to define a gate, render it within a component, and observe its state
changes. The example includes mounting and unmounting the component to show
state transitions. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/createGate.md#_snippet_1

LANGUAGE: jsx CODE:

```
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

---

TITLE: Creating Effector Store and Event DESCRIPTION: This code snippet defines
an Effector store `$counter` initialized to 0 and an event `counterIncremented`.
The store is updated by incrementing its value when the `counterIncremented`
event is triggered. This is a basic example of state management in Effector.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/testing.mdx#_snippet_1

LANGUAGE: typescript CODE:

```
import { createStore, createEvent } from "effector";

const counterIncremented = createEvent();

const $counter = createStore(0);

$counter.on(counterIncremented, (counter) => counter + 1);
```

---

TITLE: Conditionally Triggering Effector Events with sample filter (TypeScript)
DESCRIPTION: Demonstrates how to conditionally trigger an action based on the
state of an Effector store using the `filter` option in the `sample` method. The
target unit (`actionExecuted`) will only be triggered by the clock event
(`buttonClicked`) if the store (`$isEnabled`) evaluates to a truthy value.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/events.md#_snippet_11

LANGUAGE: ts CODE:

```
const buttonClicked = createEvent<void>();
const $isEnabled = createStore(true);

// Event will trigger only if $isEnabled is true
sample({
  clock: buttonClicked,
  filter: $isEnabled,
  target: actionExecuted,
});
```

---

TITLE: Typing Stores in Effector with TypeScript DESCRIPTION: Explains how to
type Effector stores using generics or by providing a default value during
initialization. TypeScript infers the store type from the default value if no
generic type is provided. Different store types such as `Store<T>` and
`StoreWritable<T>` are discussed. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/typescript.mdx#_snippet_2

LANGUAGE: typescript CODE:

```
import { createStore } from "effector";

// Базовый стор с примитивным значением
// StoreWritable<number>
const $counter = createStore(0);

// Стор со сложным объектным типом
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

---

TITLE: Socket.IO Client Initialization and Event Handling (TypeScript)
DESCRIPTION: This code snippet demonstrates how to initialize a Socket.IO
client, connect to a server, and handle various events such as connection,
disconnection, errors, and custom messages. It uses Effector's `createEvent` and
`createEffect` to manage the socket connection and associated events. The
`scopeBind` function (not defined in the snippet) is assumed to be used for
correctly binding events within scopes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/websocket-integration.md#_snippet_10

LANGUAGE: typescript CODE:

```
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
```

---

TITLE: React Component Migration from useStore/useEvent to useUnit - TypeScript
DESCRIPTION: Demonstrates how to migrate from using `useStore` and `useEvent`
hooks to the unified `useUnit` hook in `effector-react`. This change allows
batching of store updates, improving performance. The snippet illustrates how to
replace individual hook calls with `useUnit` and how to handle multiple units at
once. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/migration-guide-v23.md#_snippet_1

LANGUAGE: typescript CODE:

```
const Component = () => {
  const foo = useStore($foo);
  const bar = useStore($bar);
  const onSubmit = useEvent(triggerSubmit);
};
```

LANGUAGE: typescript CODE:

```
const Component = () => {
  const foo = useUnit($foo);
  const bar = useUnit($bar);
  const onSubmit = useUnit(triggerSubmit);
};
```

LANGUAGE: typescript CODE:

```
const Component = () => {
  const [foo, bar, onSubmit] = useUnit([$foo, $bar, triggerSubmit]);
};
```

---

TITLE: Incorrect usage of effects with async code DESCRIPTION: This snippet
demonstrates the incorrect usage of effects with asynchronous operations. It
shows how mixing regular asynchronous functions with Effector effects can lead
to scope loss. This example highlights the importance of wrapping all
asynchronous operations within effects or using utilities like `attach`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Scope.md#_snippet_3

LANGUAGE: javascript CODE:

```
const sendWithAuthFx = createEffect(async () => {
  await authUserFx();

  // Неправильно! Это должно быть обернуто в эффект.
  await new Promise((resolve) => setTimeout(resolve, 80));

  // Контекст здесь теряется.
  await sendMessageFx();
});
```

---

TITLE: Using createGate and useGate in effector-react/ssr DESCRIPTION:
Demonstrates the usage of `createGate` and `useGate` from `effector-react/ssr`
to manage component lifecycle and state, particularly useful for Server-Side
Rendering (SSR) scenarios. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_15

LANGUAGE: jsx CODE:

```
import {createDomain} from 'effector'
import {createGate, useGate} from 'effector-react/ssr'

const app = createDomain()

const currentRouteGate = createGate({
  domain: app,
  defaultState: 'dashboard',
})

export const Layout = ({routeName, children}) => {
  useGate(currentRouteGate, routeName)
  return (
    <>
      <h1>{routeName}</h1>
      {children}
    </>
  )
}
```

---

TITLE: Attaching Effect for Logic Reuse - Effector (TS) DESCRIPTION: This code
snippet demonstrates how to reuse effect logic using `attach` for different
endpoints. It defines a generic `fetchDataFx` effect that takes an endpoint and
a token. Two specialized effects, `fetchUsersFx` and `fetchProductsFx`, are
created using `attach`, each calling `fetchDataFx` with different endpoint
values and the same token from the `$authToken` store. The `mapParams` function
in each `attach` call transforms the input (ignored here with `_`) into the
specific parameters needed by `fetchDataFx`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/unit-composition.md#_snippet_12

LANGUAGE: typescript CODE:

```
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

---

TITLE: Updating Messages Store on Message Send - TypeScript DESCRIPTION: This
snippet updates the `$messages` store when a message is successfully sent using
the `messageSendFx.doneData` event. It appends the new message to the existing
list of messages in the store. The store updates its value when the message send
effect completes successfully and provides the new message as doneData. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_25

LANGUAGE: typescript CODE:

```
$messages.on(messageApi.messageSendFx.doneData, (messages, newMessage) => [
  ...messages,
  newMessage,
]);
```

---

TITLE: Effect State Monitoring DESCRIPTION: This code snippet demonstrates how
to monitor the different states of an Effector effect, such as pending, done,
fail, and finally. It uses the `watch` method to log messages to the console
when each state changes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/work-with-async.md#_snippet_0

LANGUAGE: typescript CODE:

```
const fetchUserFx = createEffect(() => {
  /* вызов внешнего api */
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

---

TITLE: `match` as Store Example in Effector split DESCRIPTION: This example
demonstrates using a store as the `match` parameter in the `split` method. The
value of the store (`$currentTab`) is used as a key to select the appropriate
case. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/flow-split.mdx#_snippet_5

LANGUAGE: ts CODE:

```
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

---

TITLE: Sample with Object of Stores DESCRIPTION: Demonstrates sampling an object
of stores, where the values of all stores are combined into an object and passed
to the target unit. This shows the capability to aggregate multiple stores into
a single data structure using `sample`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/sample.md#_snippet_6

LANGUAGE: javascript CODE:

```
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

---

TITLE: Accessing Effect Done Event - Javascript DESCRIPTION: Illustrates the
`done` event of an Effector effect. It shows how to attach a watcher to the
`done` event, which triggers after the effect has completed successfully. The
watcher logs both the parameters passed to the effect and the result of its
execution. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Effect.md#_snippet_10

LANGUAGE: javascript CODE:

```
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.done.watch(({ params, result }) => {
  console.log("Вызов с аргументом", params, "завершён со значением", result);
});

await fx(2);
// => Вызов с аргументом 2 завершён со значением 3
```

---

TITLE: Storing Last Received Message - TypeScript DESCRIPTION: This snippet
demonstrates how to create a store to hold the last received message from the
WebSocket. It defines a store `$lastMessage` that is updated whenever a new
message is received via the `messageReceived` event. Dependencies: effector.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/websocket-integration.md#_snippet_2

LANGUAGE: typescript CODE:

```
const $lastMessage = createStore("");

$lastMessage.on(messageReceived, (_, newMessage) => newMessage);
```

---

TITLE: Correct Side Effect Handling in Effector (TypeScript) DESCRIPTION: This
snippet demonstrates the correct way to handle side effects in Effector using
`createEffect` and `sample`. It defines separate effects for saving to local
storage and tracking user updates, then uses `sample` to trigger these effects
when the `$user` store changes. This approach promotes a more declarative and
maintainable code structure. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_10

LANGUAGE: typescript CODE:

```
// Отдельные эффекты для сайд-эффектов
const saveToStorageFx = createEffect((user: User) =>
  localStorage.setItem("user", JSON.stringify(user)),
);

const trackUpdateFx = createEffect((user: User) => api.trackUserUpdate(user));

// Связываем через sample
sample({
  clock: $user,
  target: [saveToStorageFx, trackUpdateFx],
});

// Для событий тоже используем sample
sample({
  clock: $user,
  fn: (user) => user.id,
  target: someEvent,
});
```

---

TITLE: Creating Effector Store for Orientation Change (JS) DESCRIPTION: This
code initializes an Effector store that tracks the current orientation of the
screen. It creates an event `orientationChange` that is triggered when the
screen orientation changes. The `$isPortrait` store is updated based on the
`matches` property of the event, reflecting whether the screen is currently in
portrait mode. SOURCE:
https://github.com/effector/effector/blob/master/recipes/media-queries/README.md#_snippet_2

LANGUAGE: js CODE:

```
import {createEvent, createStore} from 'effector'

const orientationChange = createEvent()

const $isPortrait = createStore(false).on(
  orientationChange,
  (_, event) => event.matches,
)

const orientationMediaQuery = window.matchMedia('(orientation: portrait)')
orientationMediaQuery.addListener(orientationChange)
```

---

TITLE: Using Effector with Vue DESCRIPTION: This Vue component demonstrates how
to use Effector with Vue using the `useUnit` hook from
`@effector-vue/composition`. It imports a store `$counter` and events
`incremented` and `decremented` from `./counter.js` and connects them to the
component. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/get-started.mdx#_snippet_10

LANGUAGE: html CODE:

```
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

---

TITLE: useVModel with Store Shape in Vue 3 DESCRIPTION: Demonstrates the usage
of the useVModel hook with a shape of effector stores in a Vue 3 component.
Individual stores ($name, $surname, $skills) are combined into a model object,
which is then passed to the useVModel hook. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-vue/useVModel.md#_snippet_3

LANGUAGE: javascript CODE:

```
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

---

TITLE: Filtering Effector Events with Sample DESCRIPTION: Shows how to use the
`filter` parameter within the `sample` operator to create a new event that
triggers only when a specific condition is met based on the clock event's
payload. Includes an example of creating a type-safe filtered event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/events.md#_snippet_7

LANGUAGE: TypeScript CODE:

```
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

---

TITLE: useList Todo List Example DESCRIPTION: Illustrates a more complex
scenario where useList is used to render a todo list. The example incorporates
event creation, store updates, and dynamic rendering based on the todo item's
state (done or not done). It imports `createStore`, `createEvent` from effector
and `useList` from effector-react. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useList.md#_snippet_3

LANGUAGE: jsx CODE:

```
import { createStore, createEvent } from "effector";
import { useList } from "effector-react";

const addTodo = createEvent();
const toggleTodo = createEvent();

const $todoList = createStore([
  { text: "write useList example", done: true },
  { text: "update readme", done: false },
])
  .on(toggleTodo, (list, id) =>
    list.map((todo, i) => {
      if (i === id)
        return {
          ...todo,
          done: !todo.done,
        };
      return todo;
    }),
  )
  .on(addTodo, (list, e) => [
    ...list,
    {
      text: e.currentTarget.elements.content.value,
      done: false,
    },
  ]);

addTodo.watch((e) => {
  e.preventDefault();
});

const TodoList = () =>
  useList($todoList, ({ text, done }, i) => {
    const todo = done ? (
      <del>
        <span>{text}</span>
      </del>
    ) : (
      <span>{text}</span>
    );
    return <li onClick={() => toggleTodo(i)}>{todo}</li>;
  });
const App = () => (
  <div>
    <h1>todo list</h1>
    <form onSubmit={addTodo}>
      <label htmlFor="content">New todo</label>
      <input type="text" name="content" required />
      <input type="submit" value="Add" />
    </form>
    <ul>
      <TodoList />
    </ul>
  </div>
);

```

---

TITLE: Typing Events in Effector with TypeScript DESCRIPTION: Demonstrates how
to type Effector events using generics. Events can be typed with specific
parameters, or default to `EventCallable<void>` if no type is provided.
Different event types such as `EventCallable<T>` and `Event<T>` are discussed.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/typescript.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
import { createEvent } from "effector";

// Событие без параметров
const clicked = createEvent();
// EventCallable<void>

// Событие с параметром
const userNameChanged = createEvent<string>();
// EventCallable<string>

// Событие со сложным параметром
const formSubmitted = createEvent<{  username: string;  password: string;}>();
// EventCallable<{ username: string;password: string; }>
```

---

TITLE: useList Basic Usage Example DESCRIPTION: Demonstrates a basic use case of
the useList hook with a simple array of users. It renders a list of user names,
each with an index, fetched from an effector store. It imports `createStore`
from effector and `useList` from effector-react. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useList.md#_snippet_2

LANGUAGE: jsx CODE:

```
import { createStore } from "effector";
import { useList } from "effector-react";

const $users = createStore([
  { id: 1, name: "Yung" },
  { id: 2, name: "Lean" },
  { id: 3, name: "Kyoto" },
  { id: 4, name: "Sesh" },
]);

const App = () => {
  const list = useList($users, ({ name }, index) => (
    <li>
      [{index}] {name}
    </li>
  ));

  return <ul>{list}</ul>;
};

```

---

TITLE: Typing Effector Stores in TypeScript DESCRIPTION: This example
demonstrates how to type Effector stores using TypeScript, showing how to either
explicitly provide a type using generics or let TypeScript infer the type from
the initial value. It covers primitive types and complex object types. It
illustrates a derived store using `.map` which results in a Store<string> type.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/typescript.mdx#_snippet_2

LANGUAGE: TypeScript CODE:

```
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

---

TITLE: Basic Sample Usage with Event, Store and Effect - Typescript DESCRIPTION:
Demonstrates the basic usage of `sample` to connect a button click event to
fetching user data from a store. The `sample` function triggers `fetchUserFx`
with the value of `$userName` when `buttonClicked` is triggered. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/unit-composition.md#_snippet_0

LANGUAGE: typescript CODE:

```
import { createStore, createEvent, sample, createEffect } from "effector";

const buttonClicked = createEvent();

const $userName = createStore("Bob");

const fetchUserFx = createEffect((userName) => {
  // логика
});

// При клике на кнопку получаем текущее имя
sample({
  clock: buttonClicked,
  source: $userName,
  target: fetchUserFx,
});
```

---

TITLE: Session Entity Definition DESCRIPTION: This snippet defines the session
entity using Effector. It creates a store to hold the session data and a derived
store to determine if the user is logged in. `$isLogged` is automatically
updated whenever `$session` changes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_13

LANGUAGE: ts CODE:

```
// Файл: /src/entities/session/index.ts
import { Session } from "shared/api";
import { createStore } from "effector";

// Сущность просто хранит сессию и некоторую внутреннюю информацию о ней
export const $session = createStore<Session | null>(null);
// Когда стор `$session` обновляется, то стор `$isLogged` тоже будет обновлен
// Они синхронизированы. Производный стор зависит от данных из исходного
export const $isLogged = $session.map((session) => session !== null);
```

---

TITLE: useUnit with Shape - JSX Example DESCRIPTION: Provides a Solid component
example utilizing `useUnit` with a shape (an object containing events and a
store) from `effector-solid/scope`. It demonstrates how to bind multiple events
and a store, enabling the component to increment and decrement a counter
displayed on the screen. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-solid/useUnit.md#_snippet_6

LANGUAGE: jsx CODE:

```
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

---

TITLE: Filtering Events Based on Object Properties (Effector) DESCRIPTION:
Illustrates how to filter events based on a specific property of an object. The
example filters `sneackersReceived` events to trigger `uniqueSizeReceived` only
when the size is 48. Requires `effector` library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_19

LANGUAGE: typescript CODE:

```
const sneackersReceived = createEvent<Sneakers>();
const uniqueSizeReceived = sneackersReceived.filter({
  fn: (sneackers) => sneackers.size === 48,
});
```

---

TITLE: Implementing Message Form Components DESCRIPTION: This set of components
implements the message form functionality. `MessageForm` conditionally renders
either `SendMessage` or `LoginForm` based on the login state. `SendMessage`
allows logged-in users to type and send messages, while `LoginForm` prompts
unauthenticated users to log in. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_12

LANGUAGE: tsx CODE:

```
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

---

TITLE: allSettled Function Signature DESCRIPTION: Defines the function
signatures for `allSettled` when used with an Event, Effect, or Store, and a
Scope, with optional parameters. It returns a Promise that resolves when all
triggered effects are complete. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/allSettled.md#_snippet_0

LANGUAGE: typescript CODE:

```
allSettled<T>(unit: Event<T>, {scope: Scope, params?: T}): Promise<void>
allSettled<T>(unit: Effect<T, Done, Fail>, {scope: Scope, params?: T}): Promise<
  | {status: 'done'; value: Done}
  | {status: 'fail'; value: Fail}
>
allSettled<T>(unit: Store<T>, {scope: Scope, params?: T}): Promise<void>
```

---

TITLE: Complex Sample with Effector DESCRIPTION: Demonstrates a complex Effector
sample with source and filters, utilizing form data, settings, and user
information. It's targeting `submitFormFx` with form data and theme or
`showErrorMessageFx` if the form is invalid, and `sendNotificationFx` upon
`submitFormFx.done` if `sendNotifications` is enabled. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_6

LANGUAGE: typescript CODE:

```
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

---

TITLE: Using effector-react with effector Store DESCRIPTION: Demonstrates how to
use an effector Store with the effector-react library's `useUnit` hook. It
initializes a Store named `$value` and then uses `useUnit` to bind the store to
a React component, displaying the store's value in a paragraph element. The code
requires effector and effector-react dependencies. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/ecosystem-development/unit-shape-protocol.md#_snippet_0

LANGUAGE: typescript CODE:

```
import { createStore } from "effector";
import { useUnit } from "effector-react";

const $value = createStore("Hello!");

const Component = () => {
  const { value } = useUnit({ value: $value });

  return <p>{value}</p>;
};
```

---

TITLE: Practical Sample Example DESCRIPTION: Demonstrates a practical example
using `sample` to select a user and check if the user is an admin. It uses
create derived store and event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/unit-composition.md#_snippet_10

LANGUAGE: typescript CODE:

```
import { createStore, createEvent, sample } from "effector";

type User = {
  id: number;
  role: string;
};

const userSelected = createEvent<number>();

const $users = createStore<User[]>([ ]);

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

---

TITLE: Naming Conventions for Effector Units (TypeScript) DESCRIPTION: This
snippet demonstrates the recommended naming conventions for Effector units: `$`
prefix for stores, `fx` postfix for effects, and no specific rule for events
(but suggesting using past tense for events that update stores). The goal is to
improve readability and searchability. It creates an effect, an event, and a
store with the suggested names. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_6

LANGUAGE: typescript CODE:

```
const updateUserNameFx = createEffect(() => {});

const userNameUpdated = createEvent();

const $userName = createStore("JS");

$userName.on(userNameUpdated, (_, newName) => newName);

userNameUpdated("TS");
```

---

TITLE: Creating Effector Effect for Asynchronous Form Submission (JS)
DESCRIPTION: This snippet defines an Effector effect `sendFormFx` that simulates
sending form data asynchronously. It takes a `FormData` object as input and
returns a promise that resolves after 1 second with a message indicating
successful sign-in, using the name from the form data. This simulates a network
request. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/forms.md#_snippet_5

LANGUAGE: js CODE:

```
const sendFormFx = createEffect(
  (formData) => new Promise((rs) => setTimeout(rs, 1000, `Signed in as [${formData.get("name")}]`)),
);
```

---

TITLE: Using Provider with Scope in effector-solid/scope DESCRIPTION:
Demonstrates how to use the `Provider` component from `effector-solid/scope` by
forking a scope using `effector/fork` and passing it as the `value` prop during
application rendering with `solid-js/web/render`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-solid/module/scope.md#_snippet_1

LANGUAGE: JSX CODE:

```
// main.js
import { fork } from "effector";
import { Provider } from "effector-solid/scope";
import { render } from "solid-js/web";

const scope = fork();

render(
  <Provider value={scope}>
    <Application />
  </Provider>,
  document.getElementById("root")
);
```

---

TITLE: Sample Store to Event DESCRIPTION: Demonstrates sampling a store with an
event as the clock, resulting in a new event. This showcases the behavior of
`sample` when the clock is an event and the source is a store. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/sample.md#_snippet_2

LANGUAGE: typescript CODE:

```
import { sample } from "effector";

const event = sample({ clock: event, source: $store });
// Because not all arguments are stores.
```

---

TITLE: Socket.IO Connection State Management (TypeScript) DESCRIPTION: This code
snippet demonstrates managing the Socket.IO connection state using an Effector
store (`$socket`). The store is initialized to `null` and updated with the
socket instance when the `connectFx` effect completes successfully. The store is
reset to `null` when the `disconnected` event is triggered. It uses Effector's
`createStore` and `.on` methods to manage state transitions based on events and
effects. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/websocket-integration.md#_snippet_12

LANGUAGE: typescript CODE:

```
// States
const $socket = createStore<Socket | null>(null)
  .on(connectFx.doneData, (_, socket) => socket)
  .reset(disconnected);
```

---

TITLE: Handling forms validation with `split` in Effector (TS) DESCRIPTION: This
code demonstrates using `split` to handle form validation. First, effects
`showFormErrorsFx` and `submitFormFx` are created. Stores `$form` and
`$formErrors` manage the form data and validation errors, respectively. The
`sample` function extracts and validates form data on `submitForm`, targeting
`$formErrors`. Finally, `split` routes the data based on the presence of errors
in `$formErrors`, either to display errors or submit the form. Requires effector
library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/flow-split.mdx#_snippet_9

LANGUAGE: ts CODE:

```
const showFormErrorsFx = createEffect(() => {
  // логика отображение ошибки
});
const submitFormFx = createEffect(() => {
  // логика отображение ошибки
});

const submitForm = createEvent();

const $form = createStore({
  name: "",
  email: "",
  age: 0,
}).on(submitForm, (_, submittedForm) => ({ ...submittedForm }));
// Отдельный стор для ошибок
const $formErrors = createStore({
  name: "",
  email: "",
  age: "",
}).reset(submitForm);

// Проверяем все поля и собираем все ошибки
sample({
  clock: submitForm,
  source: $form,
  fn: (form) => ({
    name: !form.name.trim() ? "Имя обязательно" : "",
    email: !isValidEmail(form.email) ? "Неверный email" : "",
    age: form.age < 18 ? "Возраст должен быть 18+" : "",
  }),
  target: $formErrors,
});

// И только после этого используем split для маршрутизации
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

---

TITLE: useUnit with Shape (TypeScript) DESCRIPTION: Describes the function
signature for using `useUnit` with a shape of Effector units (object or array
containing stores, events, and/or effects). It returns an object/array with
values of stores and functions to trigger events/effects. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useUnit.md#_snippet_3

LANGUAGE: typescript CODE:

```
useUnit({ a: Store<A>, b: Event<B>, ... }): { a: A, b: (payload: B) => B; ... }

useUnit([Store<A>, Event<B>, ... ]): [A, (payload: B) => B, ... ]
```

---

TITLE: UI Component for Repo Star Button DESCRIPTION: This snippet shows the UI
component for a repository star button using React and Effector. It imports the
necessary events and stores from the business logic module (`repo.model.ts`) and
uses the `useUnit` hook to connect the component to Effector's state management.
The component renders a button that toggles the star state and displays the
current star count. The UI component triggers the event and displays data.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/resources/mindset.mdx#_snippet_3

LANGUAGE: tsx CODE:

```
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

---

TITLE: Effector Core Logic DESCRIPTION: This snippet defines the core Effector
logic for managing the dynamic form. It includes events for submitting, adding
messages, and changing field types. Effects are created for saving and loading
the form state from local storage. Stores are defined to hold the form data,
field types, and messages. Event handlers are used to update the stores in
response to user actions. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/dynamic-form-schema.md#_snippet_0

LANGUAGE: javascript CODE:

```
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
```

---

TITLE: Fixing Unit Calls inside filter with sample (TS) DESCRIPTION: This code
demonstrates the correct way to trigger an event from within a filter function
using the `sample` operator. This addresses the error from calling units inside
pure functions. This showcases the fix. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_21

LANGUAGE: typescript CODE:

```
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

---

TITLE: Fixing unit call from pure function with prepend - Typescript
DESCRIPTION: Demonstrates creating new event via `createEvent` and connects
events by `sample` instead of calling another event from pure function. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_8

LANGUAGE: typescript CODE:

```
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

---

TITLE: Guard with Predicate Function (JavaScript) DESCRIPTION: This example
illustrates using a predicate function as a filter in `guard`. The `target`
event is only triggered when the `source` event's payload is greater than 0.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/guard.md#_snippet_4

LANGUAGE: javascript CODE:

```
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

---

TITLE: Combining Stores into an Object DESCRIPTION: This snippet demonstrates
combining stores into a new store which contains an object with the states of
the stores passed into combine. Each property within the object will contain the
state from its corresponding store. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/combine.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<{ a: A; b: B; c: C }> = combine({ a: $a, b: $b, c: $c });
```

---

TITLE: Sample Data Filtering - Typescript DESCRIPTION: Illustrates how to filter
data using the `filter` parameter of `sample`. It prevents the execution of the
`submitToServerFx` effect unless the form data meets specific criteria (age >=
18 and username length > 0). SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/unit-composition.md#_snippet_2

LANGUAGE: typescript CODE:

```
import { createEvent, createStore, sample, createEffect } from "effector";

type UserFormData = {
  username: string;
  age: number;
};

const submitForm = createEvent();

const $formData = createStore<UserFormData>({ username: "", age: 0 });

const submitToServerFx = createEffect((formData: UserFormData) => {
  // логика
});

sample({
  clock: submitForm,
  source: $formData,
  filter: (form) => form.age >= 18 && form.username.length > 0,
  target: submitToServerFx,
});

submitForm();
```

---

TITLE: Sample with Data Transformation DESCRIPTION: This snippet demonstrates
data transformation using the `fn` parameter of `sample`. It transforms user
data into a string before updating the `$userInfo` store. The `fn` formats the
name and age from the `$user` store when `buttonClicked` is triggered. The
example relies on `effector` library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/unit-composition.md#_snippet_3

LANGUAGE: typescript CODE:

```
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

---

TITLE: Effector Effect Definition DESCRIPTION: This code snippet defines a
simple effect using createEffect in Effector. The effect simulates fetching user
projects data from a backend API. In a real application, this would involve
making an actual API call, but here it's just a placeholder for demonstration
purposes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/testing.mdx#_snippet_4

LANGUAGE: typescript CODE:

```
import { createEffect } from "effector";

const getUserProjectsFx = async () => {
  const result = await fetch("/users/projects/2");

  return result.json();
};
```

---

TITLE: React Counter App Component DESCRIPTION: This code defines a simple
React-based counter app using Effector for state management. It includes
Effector stores, events, and effects for fetching and saving the counter value.
The component uses `useUnit` to connect the React component to Effector's state.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/server-side-rendering.md#_snippet_0

LANGUAGE: tsx CODE:

```
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

---

TITLE: Updating Array in effector Store (Correct) DESCRIPTION: Demonstrates the
correct way to update an array within an effector store using the spread
operator to maintain immutability. The store `$users` is updated when the
`userAdded` event occurs, adding a new user to the array without mutating the
original array. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/manage-states.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
// update array
$users.on(userAdded, (users, newUser) => [...users, newUser]);
```

---

TITLE: Declarative Event Triggering with Effector DESCRIPTION: This code
demonstrates a declarative approach to triggering an event when a store value
changes using the `sample` operator. It creates a store `$login`, derives a
`$loginSize` store from it, and then uses `sample` to trigger the
`submitLoginSize` event whenever `$loginSize` changes. This approach is
generally preferred over the imperative approach. Dependencies: effector.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/explanation/glossary.md#_snippet_1

LANGUAGE: javascript CODE:

```
import { createStore, createEvent, sample } from "effector";

const submitLoginSize = createEvent();

const $login = createStore("guest");
const $loginSize = $login.map((login) => login.length);

sample({
  clock: $loginSize,
  target: submitLoginSize,
});
```

---

TITLE: Effector Business Logic for Star Toggle DESCRIPTION: This snippet
showcases the business logic behind a star button feature in a GitHub repository
using Effector. It defines an event for toggling the star, effects for starring
and unstarring the repository, and stores to manage the star state and count.
The `sample` function is used to create reactive connections between these
units. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/resources/mindset.mdx#_snippet_1

LANGUAGE: ts CODE:

```
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

---

TITLE: Filtering Event Data with .filter() (Effector) DESCRIPTION: Shows how to
use `.filter()` to create a derived event that is triggered only when a
condition is met. The function `fn` determines whether the derived event is
triggered. Requires `effector` library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_17

LANGUAGE: typescript CODE:

```
import { createEvent } from "effector";

const numberReceived = createEvent<number>();
// numberReceived: Event<number>

const evenReceived = numberReceived.filter({
  fn: (number) => number % 2 === 0,
});
// evenReceived: Event<number>

evenReceived.watch(console.info);
numberReceived(5); // ничего
numberReceived(2); // => 2
```

---

TITLE: Message Form Component (Login/Send) DESCRIPTION: This snippet implements
the message form component, which dynamically renders either a login form or a
send message form based on the user's login status. It utilizes `useUnit` to
connect to Effector stores and events, enabling actions like sending messages
and logging in/out. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_12

LANGUAGE: tsx CODE:

```
// Файл: /src/pages/chat/page.tsx
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

---

TITLE: Typing Effects in Effector with TypeScript (Basic) DESCRIPTION: Shows how
to type Effector effects using generics to specify input parameters, return
results, and error types. Demonstrates the use of `createEffect` with an
asynchronous handler function. TypeScript can infer types from the handler
function or types can be provided explicitly. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/typescript.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
import { createEffect } from "effector";

// Базовый эффект
// Effect<string, User, Error>
const fetchUserFx = createEffect(async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  const result = await response.json();

  return result as User;
});
```

---

TITLE: Authorized Request Effect with Store Source DESCRIPTION: Creates an
authorized request effect by attaching to the `backendRequestFx` and using a
token store as the source. It maps the parameters to include the token from the
store in the request. It also defines a `createRequest` function to generate
effects bound to a specific resource. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/attach.md#_snippet_10

LANGUAGE: typescript CODE:

```
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

---

TITLE: Creating Effector Effects for Message Management in TypeScript
DESCRIPTION: Defines Effector effects for loading, sending, and deleting
messages. `messagesLoadFx` loads the message history, `messageSendFx` sends a
new message, and `messageDeleteFx` deletes a message from the history. They all
leverage the wait function to simulate network calls. Errors in `saveHistory`
and `loadHistory` will trigger the `fail` event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_4

LANGUAGE: typescript CODE:

```
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

---

TITLE: Using useEvent with a single Effector unit DESCRIPTION: This code snippet
demonstrates how to use the `useEvent` hook with a single Effector event. It
binds the `inc` event to the component's scope and provides a function `incFn`
to trigger the event. The component also uses `useStore` to subscribe to the
`$count` store. The example shows incrementing a counter using `effector-react`
within a React component. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useEvent.md#_snippet_0

LANGUAGE: jsx CODE:

```
import ReactDOM from "react-dom";
import { createEvent, createStore, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const inc = createEvent();
const $count = createStore(0).on(inc, (x) => x + 1);

const App = () => {
  const count = useStore($count);
  const incFn = useEvent(inc);
  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => incFn()}>increment</button>
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

---

TITLE: Initializing Router Model with Effector (JavaScript) DESCRIPTION: This
snippet initializes an Effector model for managing the Next.js router. It
creates events for attaching the router instance and triggering navigation. A
store holds the router instance, and an effect is used to perform the
navigation. It depends on 'effector' and
'next/dist/shared/lib/app-router-context.shared-runtime'. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/nextjs/router.md#_snippet_0

LANGUAGE: javascript CODE:

```
import { attach, createEvent, createStore, sample } from 'effector'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

const routerAttached = createEvent<AppRouterInstance>()
const navigationTriggered = createEvent<string>()

const $router = createStore<AppRouterInstance | null>(null).on(
  routerAttached,
  (_, router) => router,
)

const navigateFx = attach({
  source: $router,
  effect: (router, path) => {
    if (!router) return
    return router.push(path)
  },
})

sample({
  clock: navigationTriggered,
  target: navigateFx,
})

export { navigationTriggered, routerAttached }

```

---

TITLE: Creating a React Form Component (JSX) DESCRIPTION: This React component
`App` renders a form with `Field` components for `login` and `password`. The
`onSubmit` handler of the form triggers the `formSubmitted` event. This event
then triggers the effect to send the form's data. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/forms.md#_snippet_3

LANGUAGE: jsx CODE:

```
const App = () => (
  <form onSubmit={formSubmitted}>
    <Field name="login" label="Login" />
    <Field name="password" type="password" label="Password" />
    <button type="submit">Submit!</button>
  </form>
);
```

---

TITLE: Creating and Using a Gate in Effector-Vue DESCRIPTION: This example
demonstrates how to create a gate using `createGate` in Effector-Vue and
integrate it with a Vue component using `useGate` from
`effector-vue/composition`. It also shows how to pass data to the gate and watch
its state. The example uses Vue's composition API for setting up the component
logic and passing props. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-vue/createGate.md#_snippet_0

LANGUAGE: javascript CODE:

```
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

---

TITLE: Client-Side Effector State Hydration DESCRIPTION: Illustrates how to
hydrate the Effector state on the client-side. It retrieves the server-side
state from the `window` object, creates a new scope with the server-side values
using `fork`, and then passes the scope to the `Provider` component. The
`getState` method is called to verify correct hydration. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/explanation/sids.md#_snippet_5

LANGUAGE: tsx CODE:

```
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

---

TITLE: Hydrating a store with a predefined value - JavaScript DESCRIPTION:
Demonstrates how to use the `hydrate` function to populate an Effector store
with a predefined value. It creates a domain and a store within that domain,
then uses `hydrate` to set the initial value of the store to 42 using the
store's `sid`. Finally, it logs the store's state, which will be the hydrated
value. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/hydrate.md#_snippet_2

LANGUAGE: javascript CODE:

```
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

---

TITLE: Creating a React Field Component using useStoreMap (JSX) DESCRIPTION:
This React component `Field` uses the `useStoreMap` hook to subscribe to changes
in the `$form` store for a specific field. It takes the field's `name`, `type`,
and `label` as props. The `useStoreMap` hook ensures that the component only
re-renders when the value of the specific field it's tracking changes. The
component renders an input field with the specified `name` and `type`, and binds
the `handleChange` event to the `onChange` handler. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/forms.md#_snippet_2

LANGUAGE: jsx CODE:

```
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
```

---

TITLE: Using useEvent with a list of Effector units DESCRIPTION: This code
snippet illustrates how to use the `useEvent` hook with an array of Effector
events. It binds both the `inc` and `dec` events to the component's scope,
providing functions `incFn` and `decFn` to trigger respective events. The
component uses `useStore` to subscribe to the `$count` store and provides
increment and decrement buttons. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useEvent.md#_snippet_1

LANGUAGE: jsx CODE:

```
import ReactDOM from "react-dom";
import { createEvent, createStore, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const inc = createEvent();
const dec = createEvent();
const $count = createStore(0)
  .on(inc, (x) => x + 1)
  .on(dec, (x) => x - 1);

const App = () => {
  const count = useStore($count);
  const [incFn, decFn] = useEvent([inc, dec]);
  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => incFn()}>increment</button>
      <button onClick={() => decFn()}>decrement</button>
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

---

TITLE: Event creation with type definition DESCRIPTION: Creates two Effector
events, one with a number type and another without (void). This illustrates how
to create events with and without expected arguments. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_8

LANGUAGE: typescript CODE:

```
import { createEvent, Event } from "effector";

const someHappened = createEvent<number>();
// someHappened: EventCallable<number>
someHappened(1);

const anotherHappened = createEvent();
// anotherHappened: EventCallable<void>
anotherHappened();
```

---

TITLE: Creating Derived Stores with map - Effector DESCRIPTION: Illustrates how
to create stores whose values depend on other store states using the `map`
method. It shows creating filtered lists and computed values. Imports
`createStore` and `combine` from effector. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/manage-states.mdx#_snippet_2

LANGUAGE: typescript CODE:

```
import { createStore, combine } from "effector";

const $currentUser = createStore({
  id: 1,
  name: "Winnie Pooh",
});
const $users = createStore<User[]>([ ]);

// Отфильтрованный список
const $activeUsers = $users.map((users) => users.filter((user) => user.active));

// Вычисляемое значение
const $totalUsersCount = $users.map((users) => users.length);
const $activeUsersCount = $activeUsers.map((users) => users.length);

// Комбинация нескольких сторов
const $friendsList = combine($users, $currentUser, (users, currentUser) =>
  users.filter((user) => user.friendIds.includes(currentUser.id)),
);
```

---

TITLE: Defining Effect Handler with use() - Javascript DESCRIPTION: Defines an
effect handler using the `use` method of an Effector effect. It showcases how to
define an asynchronous handler function that fetches data and returns it. This
handler is used when the effect is called. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Effect.md#_snippet_1

LANGUAGE: javascript CODE:

```
import { createEffect } from "effector";

const fetchUserReposFx = createEffect();

// ....

fetchUserReposFx.use(async ({ name }) => {
  console.log("fetchUserReposFx вызван для github пользователя", name);

  const url = `https://api.github.com/users/${name}/repos`;
  const req = await fetch(url);
  return req.json();
});

await fetchUserReposFx({ name: "zerobias" });
// => fetchUserReposFx вызван для github пользователя zerobias
```

---

TITLE: Creating domains with createDomain (JavaScript) DESCRIPTION: This example
demonstrates how to create unnamed and named domains using `createDomain`. It
also shows how to create events, effects, nested domains and stores within a
domain, illustrating its role in organizing application logic and state. This
showcases the basic usage of effector domains. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/createDomain.md#_snippet_1

LANGUAGE: javascript CODE:

```
import { createDomain } from "effector";

const domain = createDomain(); // Unnamed domain
const httpDomain = createDomain("http"); // Named domain

const statusCodeChanged = httpDomain.createEvent();
const downloadFx = httpDomain.createEffect();
const apiDomain = httpDomain.createDomain(); // nested domain
const $data = httpDomain.createStore({ status: -1 });
```

---

TITLE: Deriving Store Value with useStoreMap in Effector-React (TypeScript)
DESCRIPTION: This snippet shows how to use `useStoreMap` from `effector-react`
to efficiently select and derive a specific property (`field`) from an item in a
store (`$users`) based on provided keys (`id` and `field`). It leverages the
improved type inference for the `fn` arguments. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_60

LANGUAGE: TypeScript CODE:

```
import React from 'react'
import {value createStore} from 'effector'
import {value useStoreMap} from 'effector-react'

type User = {
  username: string
  email: string
  bio: string
}

const $users = createStore<User[]>([
  {
    username: 'alice',
    email: 'alice@example.com',
    bio: '. . .',
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    bio: '~/ - /~',
  },
  {
    username: 'carol',
    email: 'carol@example.com',
    bio: '- - -',
  },
])

export const UserProperty = ({id, field}: {id: number; field: keyof User}) => {
  const value = useStoreMap({
    store: $users,
    keys: [id, field],
    fn: (users, [id, field]) => users[id][field] || null,
  })
  return <div>{value}</div>
}
```

---

TITLE: Simplifying Updates without createApi - Effector DESCRIPTION: Shows the
traditional way of updating a store by creating events and subscribing to them.
It imports `createStore` and `createEvent` from effector. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/manage-states.mdx#_snippet_1

LANGUAGE: typescript CODE:

```
import { createStore, createEvent } from "effector";

const $counter = createStore(0);

const incrementClicked = createEvent();
const decrementClicked = createEvent();
const resetClicked = createEvent();

$counter
  .on(incrementClicked, (state) => state + 1)
  .on(decrementClicked, (state) => state - 1)
  .reset(resetClicked);

// Использование
increment(); // 1
reset(); // 0
```

---

TITLE: useUnit with Events and Store (JSX) DESCRIPTION: Illustrates the usage of
`useUnit` with multiple Effector Events and a Store in a React component. It
shows how to manage incrementing and decrementing a counter state using separate
events, which are triggered by respective button clicks. The component is
wrapped in a `Provider` and rendered within a `Scope`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useUnit.md#_snippet_6

LANGUAGE: jsx CODE:

```
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

---

TITLE: Reusable Media Query Matcher with Effector (JS) DESCRIPTION: This code
defines a reusable function `mediaMatcher` that creates an Effector store to
track whether a given media query matches the current screen state. It creates
an event `queryChange` that's triggered on media query changes and updates the
`$isQueryMatches` store accordingly. This function can be used with different
queries. SOURCE:
https://github.com/effector/effector/blob/master/recipes/media-queries/README.md#_snippet_3

LANGUAGE: js CODE:

```
import {createEvent, createStore} from 'effector'

export function mediaMatcher(query) {
  const queryChange = createEvent('query change')
  const mediaQueryList = window.matchMedia(query)
  mediaQueryList.addListener(queryChange)

  const $isQueryMatches = createStore(mediaQueryList.matches).on(
    queryChange,
    (_, event) => event.matches,
  )

  return $isQueryMatches
}

/* declaring queries */

const small = mediaMatcher('(max-width: 768px)')
const medium = mediaMatcher('(min-width: 769px) and (max-width: 1024px)')
const large = mediaMatcher('(min-width: 1025px)')
const portrait = mediaMatcher('(orientation: portrait)')

/* using queries */

small.watch(isSmall => {
  console.log('is small screen?', isSmall)
})
```

---

TITLE: Creating Form Change Handler (JS) DESCRIPTION: This snippet creates an
event handler `handleChange` that is prepended to the `fieldUpdate` event. This
handler transforms the DOM event from the input field into an object containing
the `key` (field name) and `value` (field value). This transformed data is then
passed to the `fieldUpdate` event, which updates the `$form` store. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/forms.md#_snippet_1

LANGUAGE: js CODE:

```
const handleChange = fieldUpdate.prepend((event) => ({
  key: event.target.name,
  value: event.target.value,
}));
```

---

TITLE: Restore store from effect - JavaScript DESCRIPTION: Creates a store that
is updated with the successful result of an effect. The store is initialized
with a default value. The store's value is updated when the effect completes
successfully. Requires `createEffect` and `restore` from effector. Uses
async/await. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/restore.md#_snippet_2

LANGUAGE: javascript CODE:

```
import { createEffect, restore } from "effector";

const fx = createEffect(() => "foo");
const $store = restore(fx, "default");

$store.watch((state) => console.log("state: ", state));
// => state: default

await fx();
// => state: foo
```

---

TITLE: useVModel with Single Effector Store in Vue 3 DESCRIPTION: Illustrates
how to use the useVModel hook with a single effector store in a Vue 3 component.
It creates a store named $user and uses the hook to bind the store's values to
form inputs. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-vue/useVModel.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Restore store from event - JavaScript DESCRIPTION: Creates a store that
is updated by an event. The store is initialized with a default value, and when
the event is triggered, the store's value is updated to the event's payload.
Requires `createEvent` and `restore` from effector. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/restore.md#_snippet_1

LANGUAGE: javascript CODE:

```
import { createEvent, restore } from "effector";

const event = createEvent();
const $store = restore(event, "default");

$store.watch((state) => console.log("state: ", state));
// state: default

event("foo");
// state: foo
```

---

TITLE: Sample Data Transformation - Typescript DESCRIPTION: Demonstrates how to
transform data using the `fn` parameter of `sample`. It takes the user data from
the `$user` store and transforms it into a string, which is then assigned to the
`$userInfo` store. The transformation occurs when `buttonClicked` is triggered.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/unit-composition.md#_snippet_3

LANGUAGE: typescript CODE:

```
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

---

TITLE: Prepending Data to Effect with prepend() - Typescript DESCRIPTION:
Creates an event trigger to transform data before the effect is launched. When
the trigger event is called, the handler function is called with the incoming
data, and then the effect is called with the result of the calculation. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Effect.md#_snippet_6

LANGUAGE: typescript CODE:

```
declare const fx: Effect<S, any>

const trigger = fx.prepend(/*fn*/(data: T) => S)
-> Event<T>
```

---

TITLE: Event filterMap Usage with Error Example DESCRIPTION: Demonstrates
incorrect usage of filterMap with side effects (calling an event from within the
filterMap function) and provides a corrected example using `sample` to trigger
the side effect outside the pure function. Highlights the error that occurs when
calling units from pure functions, and suggests using `sample` instead. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_22

LANGUAGE: typescript CODE:

```
const countReceived = createEvent<number>();
const eachReceived = createEvent<number>();

const receivedEven = someHappened.filterMap((count) => {
  eachReceived(count); // ВЫЗЫВАЕТ ОШИБКУ!
  return count % 2 === 0 ? Math.abs(count) : undefined;
});
```

LANGUAGE: typescript CODE:

```
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

---

TITLE: React Components for Dynamic Form DESCRIPTION: This snippet implements
the React components that render the dynamic form based on the Effector stores.
It includes components for the main form, input fields, and field management
forms. The `useFormField` hook is used to connect the React components to the
Effector stores, providing the current value and type of each form field.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/dynamic-form-schema.md#_snippet_1

LANGUAGE: javascript CODE:

```
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
```

---

TITLE: Store .on() Example - Javascript DESCRIPTION: Updates a store's state
using the `.on()` method, which takes an event as a trigger and a reducer
function. The reducer function calculates the new state based on the current
state and the event payload. In this example, the store is incremented by the
value passed to the `changed` event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Store.md#_snippet_5

LANGUAGE: javascript CODE:

```
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

---

TITLE: React Component DESCRIPTION: This snippet defines the React component
(`App`) for the todo list. It uses `useUnit` and `useList` from `effector-react`
to connect the component to the Effector stores and events. The component
renders the input form and the list of todos, handling user interactions and
displaying validation errors. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/todo-with-validation.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Using useUnit with Stores DESCRIPTION: This example shows how to use
`useUnit` to connect a React component to an Effector store. It requires
`effector` and `effector-react`. The `useUnit` hook subscribes the component to
the store, ensuring that the component re-renders whenever the store's value
changes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useUnit.md#_snippet_1

LANGUAGE: js CODE:

```
import { createStore, createApi } from "effector";
import { useUnit } from "effector-react";

const $counter = createStore(0);

const { increment, decrement } = createApi($counter, {
  increment: (state) => state + 1,
  decrement: (state) => state - 1,
});

const App = () => {
  const counter = useUnit($counter);

  return (
    <div>
      {counter}
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
};

```

---

TITLE: Correct Event Usage with Sample DESCRIPTION: Demonstrates the correct
usage by connecting events using the `sample` operator. This operator ensures
proper data flow and avoids the error of calling units from pure functions.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_7

LANGUAGE: typescript CODE:

```
const someHappened = createEvent<number>();
const another = createEvent();
const derived = createEvent<string>();

sample({
  clock: someHappened,
  target: another,
});

// То же самое, что и .map(), но с использованием `target`
sample({
  clock: someHappened,
  fn: (number) => String(number),
  target: derived,
});
```

---

TITLE: Effector Test with Custom Store Values DESCRIPTION: This code snippet
demonstrates how to set custom store values and mock an effect handler using
Effector's fork API for testing. It sets an initial state where the counter is
greater than 100 to simulate a scenario, also mocks function to track number of
calls. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/testing.mdx#_snippet_8

LANGUAGE: typescript CODE:

```
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

---

TITLE: Create isolated instances with independent counter state - JS
DESCRIPTION: This JavaScript code demonstrates how to create two isolated
instances of an application using `fork`, each with its own independent counter
state. It defines events to increment and decrement the counter, and a store to
hold the counter's value. `allSettled` is used to ensure all effects are
resolved before retrieving the state. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/fork.md#_snippet_1

LANGUAGE: js CODE:

```
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

---

TITLE: Attaching Effect with Store and Factory DESCRIPTION: This example shows
how to create an authorized request using `attach` with a store and a factory
function. It sets up a backend request effect, a store for the authentication
token, and attaches them using `mapParams` to create authorized requests. The
example also demonstrates how to use createRequest factory function to avoid
code duplication. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/attach.md#_snippet_15

LANGUAGE: typescript CODE:

```
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

LANGUAGE: typescript CODE:

```
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

LANGUAGE: typescript CODE:

```
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

---

TITLE: Combine with array and function DESCRIPTION: Combines multiple stores
into an array and uses a function to derive a new value. The function receives
an array with the stores' values and returns the new state. Dependencies:
`Store`, `StoreWritable`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/combine.mdx#_snippet_4

LANGUAGE: typescript CODE:

```
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<D> = combine([$a, $b, $c], ([A, B, C]): D => result);
```

---

TITLE: Splitting event with expanded form - Effector - TypeScript DESCRIPTION:
This snippet showcases the expanded form of the `split` method. It utilizes
`source`, `match`, and `cases` to trigger different effects based on the current
application mode stored in `$appMode`. When `buttonClicked` event is triggered,
it performs different actions (effects) depending on whether the `$appMode` is
'user' or 'admin'. If no case matches, the `defaultActionFx` is triggered.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/flow-split.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
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

---

TITLE: Sample with Data Filtering DESCRIPTION: This snippet demonstrates data
filtering using the `filter` parameter of `sample`. It filters form data based
on age and username length before triggering an effect. The `submitToServerFx`
effect is triggered only when the form data meets the specified criteria. The
example relies on `effector` library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/unit-composition.md#_snippet_2

LANGUAGE: typescript CODE:

```
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

---

TITLE: Sample with derived store DESCRIPTION: This snippet demonstrates creating
a derived store using `sample`. It creates a store `$userAge` that automatically
updates when the `$currentUser` store changes, extracting the age property. It
also shows the equivalent using `.map`. The example relies on `effector`
library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/unit-composition.md#_snippet_1

LANGUAGE: typescript CODE:

```
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

---

TITLE: Creating Effector Effect with Handler DESCRIPTION: Demonstrates how to
create an Effector effect with a handler function. The handler fetches user
repositories from GitHub based on the provided username. It logs the result upon
completion. Requires effector package. Invoked with an object containing the
'name' property. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/createEffect.md#_snippet_0

LANGUAGE: javascript CODE:

```
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

---

TITLE: Restoring Message on Failure DESCRIPTION: This snippet shows how to
restore the message text in the input field if sending the message fails. It
uses the fail event of the messageSendFx effect to set the $messageText store to
the original message text (params.text). SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_27

LANGUAGE: typescript CODE:

```
// Файл: /src/pages/chat/model.ts
sample({
  clock: messageSendFx.fail,
  fn: ({ params }) => params.text,
  target: $messageText,
});
```

---

TITLE: Using useStore in a Vue Component - JavaScript DESCRIPTION: This example
shows how to use the `useStore` hook within the `setup` function of a Vue
component to subscribe to an Effector store and access its value. It also
showcases how to integrate with `createStore` and `createApi` from effector to
manage the store's state. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-vue/useStore.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Using effector-react with React DESCRIPTION: This code demonstrates how
to integrate effector with React using `effector-react`. It creates an input
field that updates an effector store `$text` and displays the length of the text
using the `useUnit` hook. It relies on React and effector dependencies. SOURCE:
https://github.com/effector/effector/blob/master/packages/effector-react/README.md#_snippet_2

LANGUAGE: javascript CODE:

```
import {createStore, combine, createEvent} from 'effector'

import {useUnit} from 'effector-react'

const inputText = createEvent()

const $text = createStore('').on(inputText, (_, text) => text)

const $size = $text.map(text => text.length)

const Form = () => {
  const {text, size} = useUnit({
    text: $text,
    size: $size,
  })
  const handleTextChange = useUnit(inputText)

  return (
    <form>
      <input
        type="text"
        onChange={e => handleTextChange(e.currentTarget.value)}
        value={text}
      />
      <p>Length: {size}</p>
    </form>
  )
}
```

---

TITLE: Binding Event to Scope with scopeBind in Effector (TypeScript)
DESCRIPTION: This example demonstrates how to correctly bind an Effector event
to the current scope using `scopeBind` when dealing with asynchronous operations
like `setTimeout`. Failing to do so can lead to the event being executed in the
global scope, causing unexpected behavior. The `scopeBind` function creates a
scope-bound version of the event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/troubleshooting.mdx#_snippet_4

LANGUAGE: typescript CODE:

```
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

---

TITLE: Merging Events in Effector (TypeScript) DESCRIPTION: This snippet shows
how to merge multiple events into a single event using Effector's `merge`
function. It demonstrates merging events with different types, resulting in a
union type, and merging events with the same type, resulting in that type. The
snippet also highlights the use of generics to enforce type constraints during
the merge operation. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/typescript.mdx#_snippet_13

LANGUAGE: typescript CODE:

```
import { createEvent, merge } from "effector";

const firstEvent = createEvent<string>();
const secondEvent = createEvent<number>();

const merged = merge([firstEvent, secondEvent]);
// Event<string | number>

// Можно также объединять события с одинаковыми типами
const buttonClicked = createEvent<MouseEvent>();
const linkClicked = createEvent<MouseEvent>();

const anyClick = merge([buttonClicked, linkClicked]);
// Event<MouseEvent>
```

---

TITLE: Incorrect Effector Component Usage without useUnit (TSX) DESCRIPTION:
This snippet shows the incorrect way to use an Effector event in a React
component without the `useUnit` hook. Directly calling the event within the
component's `onClick` handler can lead to scope-related issues. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/troubleshooting.mdx#_snippet_5

LANGUAGE: tsx CODE:

```
import { event } from "./model.js";

const Component = () => {
  return <button onClick={() => event()}></button>;
};
```

---

TITLE: Creating WebSocket Connection Effect - Typescript DESCRIPTION: Creates an
Effector effect to establish a WebSocket connection to a given URL. The effect
handles connection opening, message reception, connection closing, and error
handling. `scopeBind` is used to bind events to the current execution scope.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/websocket-integration.md#_snippet_1

LANGUAGE: typescript CODE:

```
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

---

TITLE: Effect .map() data transformation example DESCRIPTION: This example shows
how to use the `.map()` method to create new events that are triggered after the
original effect is called. The `.map()` method transforms the effect's result
and passes it to the new event. This allows decomposing dataflow to extract or
transform data. The example extract and transform the name and role from the
result of the effect. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Effect.md#_snippet_4

LANGUAGE: javascript CODE:

```
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

---

TITLE: Hydrating Effector React App from Server State (client.tsx) DESCRIPTION:
This code snippet demonstrates how to hydrate an Effector React application on
the client-side using the state computed during Server-Side Rendering (SSR). It
involves extracting the serialized state from the global scope, creating a
client-side Effector scope with the server's state, hydrating the React
application using `hydrateRoot`, and triggering an initial event (`appStarted`).
Dependencies include React, ReactDOM, Effector, and Effector React. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/server-side-rendering.md#_snippet_2

LANGUAGE: tsx CODE:

```
// client.tsx
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { fork, allSettled } from "effector";
import { Provider } from "effector-react";

import { App, appStarted } from "./app";

/**
 * 1. Находим, где сохранено состояние сервера, и извлекаем его.
 *
 * Смотрите код обработчика сервера, чтобы узнать, где оно было сохранено в HTML.
 */
const effectorState = globalThis._SERVER_STATE_;
const reactRoot = document.querySelector("#app");

/**
 * 2. Инициализируем клиентский scope effector с вычисленными на сервере значениями.
 */
const clientScope = fork({
  values: effectorState,
});

/**
 * 3. "Гидрируем" состояние React в DOM-дереве.
 */
hydrateRoot(
  reactRoot,
  <Provider value={clientScope}>
    <App />
  </Provider>,
);

/**
 * 4. Вызываем то же стартовое событие на клиенте.
 *
 * Это необязательно и зависит от того, как организована логика вашего приложения.
 */
allSettled(appStarted, { scope: clientScope });
```

---

TITLE: Creating Loading Indicator Component (JSX) DESCRIPTION: This React
component `Loader` displays a loading indicator while the `sendFormFx` effect is
pending. It uses the `useUnit` hook to subscribe to the `sendFormFx.pending`
store, which is a boolean indicating whether the effect is currently in
progress. It returns a `div` element that says "Loading..." if the effect is
pending; otherwise it returns `null`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/forms.md#_snippet_6

LANGUAGE: jsx CODE:

```
const Loader = () => {
  //typeof loading === "boolean"
  const loading = useUnit(sendFormFx.pending);
  return loading ? <div>Loading...</div> : null;
};
```

---

TITLE: Sending Message with Effector Sample - TypeScript DESCRIPTION: This
snippet sends a message to the server using Effector's `sample` function. It
merges two events, `messageEnterPressed` and `messageSendClicked`, into a single
`messageSend` event. Then, it samples data from the `$session` and
`$messageText` stores when `messageSend` is triggered, passing the author and
message text to the `messageApi.messageSendFx` effect. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_22

LANGUAGE: typescript CODE:

```
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

---

TITLE: Store .map() Example - Javascript DESCRIPTION: Creates a derived store
using the `.map()` method. The derived store `$length` is updated whenever the
original store `$title` changes, with the value being the length of the title.
This derived store then watches for changes, logging the new length to the
console. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Store.md#_snippet_3

LANGUAGE: javascript CODE:

```
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

---

TITLE: Serialize with onlyChanges Option DESCRIPTION: Serializes only the stores
that have changed within a scope. Requires `effector` and uses `createDomain`,
`fork`, `serialize`, and `hydrate` functions. The example demonstrates how to
hydrate client-side stores with server-side data, ensuring that only relevant
stores are updated during route changes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/serialize.md#_snippet_1

LANGUAGE: typescript CODE:

```
import { createDomain, fork, serialize, hydrate } from "effector";

const app = createDomain();

/** стор, который мы хотим гидрировать с сервера */
const $title = app.createStore("dashboard");

/** стор, который не используется сервером */
const $clientTheme = app.createStore("light");

/** скоуп в клиентском приложении */
const clientScope = fork(app, {
  values: new Map([
    [$clientTheme, "dark"],
    [$title, "profile"],
  ]),
});

/** scope на стороне сервера для страницы чатов, созданный для каждого запроса */
const chatsPageScope = fork(app, {
  values: new Map([[$title, "chats"]]),
});

/** этот объект будет содержать только данные $title
 * так как $clientTheme никогда не изменялся в server scope */
const chatsPageData = serialize(chatsPageScope, { onlyChanges: true });
console.log(chatsPageData);
// => {'-l644hw': 'chats'}

/** таким образом, заполнение значений с сервера затронет только соответствующие сторы */
hydrate(clientScope, { values: chatsPageData });

console.log(clientScope.getState($clientTheme));
// => dark
```

---

TITLE: Forward Between Arrays - Effector (JavaScript) DESCRIPTION: This example
showcases forwarding updates between arrays of units (events). When either
`firstSource` or `secondSource` is triggered, both `firstTarget` and
`secondTarget` are triggered with the same payload. `createEvent` from effector
is required. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/forward.md#_snippet_2

LANGUAGE: javascript CODE:

```
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

---

TITLE: Mapping Event Data with .map() (Effector) DESCRIPTION: Illustrates how to
create a derived event using `.map()`. The derived event is triggered after the
original event, using the result of the provided function `fn` as its argument.
The `fn` function transforms the original event's data. Requires the `effector`
library to be installed. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_15

LANGUAGE: typescript CODE:

```
import { createEvent } from "effector";

const first = createEvent<number>();
// first: Event<number>

const second = first.map((count) => count.toString());
// second: Event<string>
```

---

TITLE: Integrating Effector with Vue DESCRIPTION: This Vue component
demonstrates how to integrate Effector with Vue using the `useUnit` hook from
`@effector-vue/composition`. It consumes the $counter store and the incremented
and decremented events. Different ways of consuming the store and events are
demonstrated. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/get-started.mdx#_snippet_10

LANGUAGE: html CODE:

```
<script setup>
  import { useUnit } from "@effector-vue/composition";
  import { $counter, incremented, decremented } from "./counter.js";
  const [counter, onIncremented, onDecremented] = useUnit([$counter, incremented, decremented]);
  // или
  const { counter, onIncremented, onDecremented } = useUnit({ $counter, incremented, decremented });
  // или
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

---

TITLE: Creating Derived Stores in Effector (TypeScript) DESCRIPTION: This
TypeScript code demonstrates how to create derived stores using the `map` method
of an Effector store. Derived stores depend on the original store and
automatically update when the original store changes, showcasing Effector's
reactivity. The `effector` library is required. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/core-concepts.md#_snippet_4

LANGUAGE: typescript CODE:

```
import { createStore, createEvent } from "effector";

// Создаем событие
const superAdded = createEvent();

// Создаем стор
const $supers = createStore([
  {
    name: "Человек-паук",
    role: "hero",
  },
  {
    name: "Зеленый гоблин",
    role: "villain",
  },
]);

// Создали производные сторы, которые зависят от $supers
const $superHeroes = $supers.map((supers) => supers.filter((sup) => sup.role === "hero"));
const $superVillains = $supers.map((supers) => supers.filter((sup) => sup.role === "villain"));

// Обновляем стор при срабатывании события
$supers.on(superAdded, (supers, newSuper) => [...supers, newSuper]);

// Добавляем супера
superAdded({
  name: "Носорог",
  role: "villain",
});
```

---

TITLE: createGate with Config - TypeScript DESCRIPTION: Shows the function
signature of `createGate` when used with a configuration object. It illustrates
that the function accepts an optional configuration object with properties for
`defaultState`, `domain`, and `name`, and returns a `Gate<T>` instance. The
`defaultState` allows initializing the gate with a default value. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/createGate.md#_snippet_3

LANGUAGE: typescript CODE:

```
createGate({ defaultState?: T, domain?: Domain, name?: string }): Gate<T>
```

---

TITLE: Sending WebSocket Messages - TypeScript DESCRIPTION: This code defines an
Effector effect for sending messages through the WebSocket connection. It takes
an object containing the WebSocket instance and the message to send as input.
The `sample` function ensures that the message is only sent if there is an
active connection. Dependencies: effector. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/websocket-integration.md#_snippet_3

LANGUAGE: typescript CODE:

```
const sendMessageFx = createEffect((params: { socket: WebSocket; message: string }) => {
  params.socket.send(params.message);
});

// Связываем отправку сообщения с текущим сокетом
sample({
  clock: messageSent,
  source: $connection,
  filter: Boolean, // Отправляем только если есть соединение
  fn: (socket, message) => ({
    socket,
    message,
  }),
  target: sendMessageFx,
});
```

---

TITLE: Triggering Effector Event Imperatively (TypeScript) DESCRIPTION:
Demonstrates the imperative way to trigger an Effector event by calling the
event instance directly as a function after it has been created using
`createEvent`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/events.md#_snippet_0

LANGUAGE: ts CODE:

```
import { createEvent } from "effector";

const callHappened = createEvent<void>();

callHappened(); // event triggered
```

---

TITLE: useUnit with Event & Store - JSX Example DESCRIPTION: Shows a basic Solid
component using `useUnit` with Effector events and stores. The example defines
an event to increment a counter, a store to hold the counter's value, and a
component that uses `useUnit` to bind the store and event to the component,
allowing it to display and update the count. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-solid/useUnit.md#_snippet_2

LANGUAGE: jsx CODE:

```
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

---

TITLE: Merging Events (Javascript) DESCRIPTION: Demonstrates merging two events
into a single event. When either of the original events is triggered, the merged
event is also triggered, passing the payload from the original event to the
watch callback. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/merge.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Correct Effector Component Usage with useUnit (TSX) DESCRIPTION: This
snippet demonstrates the correct way to use an Effector event in a React
component using the `useUnit` hook from `effector-react`. `useUnit` ensures that
the event is properly bound to the current scope, preventing scope-related
errors and ensuring consistent behavior. The returned value from `useUnit`
should be used within the component. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/troubleshooting.mdx#_snippet_6

LANGUAGE: tsx CODE:

```
import { event } from "./model.js";
import { useUnit } from "effector-react";

const Component = () => {
  const onEvent = useUnit(event);

  return <button onClick={() => onEvent()}></button>;
};
```

---

TITLE: Testing Effector with Custom Store Values and Effect Mocks DESCRIPTION:
This snippet shows how to test Effector logic with custom store values and
effect mocks. It initializes the `$clicksCount` store to 101 and mocks the
`validateClickFx` effect to return `false` and track the number of calls. The
test verifies that the count remains 101 and the effect is not called,
simulating the scenario where the count is already over 100. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/testing.mdx#_snippet_8

LANGUAGE: typescript CODE:

```
test("bad case", async () => {
  const MOCK_VALUE = 101;
  const mockFunction = testRunner.fn();

  const scope = fork({
    values: [
      // Список пар [store, mockValue]
      [$clicksCount, MOCK_VALUE],
    ],
    handlers: [
      // Список пар [effect, mock handler]
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

---

TITLE: Splitting event with clock and source - Effector - TypeScript
DESCRIPTION: This expanded form of `split` uses both `clock` and `source`. The
`buttonClicked` event triggers the `split` function, and the `$currentUser`
store provides the data that is passed into effects specified in cases. The
`$appMode` store is used to determine which effect to run: `adminActionFx`,
`secondAdminActionFx` or `userActionFx` or `defaultActionFx`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/flow-split.mdx#_snippet_4

LANGUAGE: typescript CODE:

```
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

---

TITLE: Using useEvent with an object of Effector units DESCRIPTION: This snippet
demonstrates using `useEvent` with an object containing Effector events. It
binds `inc` and `dec` events, accessing them as `handlers.inc` and
`handlers.dec`. Similar to the previous examples, it leverages `useStore` to get
the current count and provides buttons to increment and decrement the counter,
all within an `effector-react` setup. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector-react/useEvent.md#_snippet_2

LANGUAGE: jsx CODE:

```
import ReactDOM from "react-dom";
import { createEvent, createStore, fork } from "effector";
import { useStore, useEvent, Provider } from "effector-react";

const inc = createEvent();
const dec = createEvent();
const $count = createStore(0)
  .on(inc, (x) => x + 1)
  .on(dec, (x) => x - 1);

const App = () => {
  const count = useStore($count);
  const handlers = useEvent({ inc, dec });
  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => handlers.inc()}>increment</button>
      <button onClick={() => handlers.dec()}>decrement</button>
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

---

TITLE: Combining Stores with Transformation (multiple stores, function)
DESCRIPTION: This snippet demonstrates how to combine multiple stores using a
transformation function. The function receives the values of the stores as
arguments and returns a new value, which becomes the value of the resulting
derived store. The function must be pure. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/combine.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
const $a: Store<A>
const $b: StoreWritable<B>
const $c: Store<C> | StoreWritable<C>

$result: Store<D> = combine(
  $a, $b, $c, ...,
  (a: A, b: B, c: C, ...) => result
)
```

---

TITLE: Refining Event Payload Types with effector.filter (TypeScript)
DESCRIPTION: Explains how to use the `event.filter` method with a predicate
function (`fn`) to refine the type of the event's payload in TypeScript,
allowing subsequent operations to use the more specific type. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_80

LANGUAGE: TypeScript CODE:

```
import {value createEvent} from 'effector'

const event = createEvent<string | number>()

const isString = (value: any): value is string => typeof value === 'string'
const isNumber = (value: any): value is number => typeof value === 'number'

const str = event.filter({fn: isString}) // Event<string>
const num = event.filter({fn: isNumber}) // Event<number>

str.watch(value => value.slice()) // OK now
num.watch(value => value.toFixed(2)) // OK now
```

---

TITLE: Fixing unit call from pure function - Typescript DESCRIPTION:
Demonstrates creating new event via `createEvent` and connects events by
`sample` instead of calling another event from pure function. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_7

LANGUAGE: typescript CODE:

```
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

---

TITLE: Split with object-based matching DESCRIPTION: This demonstrates using the
`split` function with direct object based matching. The `split` function creates
a new object with keys defined in `match`, each key being an event. A default
event `__` is also included. Messages are routed to events based on match
conditions. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/split.md#_snippet_10

LANGUAGE: javascript CODE:

```
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

---

TITLE: Attaching Effect with Argument Transformation DESCRIPTION: Illustrates
how to transform arguments when attaching one effect to another using
`mapParams`. The example shows an original effect expecting an object with a
number input, and the attached effect transforms a single number argument into
the required object. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/attach.md#_snippet_6

LANGUAGE: typescript CODE:

```
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

---

TITLE: Combining Stores with Transformation (object, function) DESCRIPTION: This
snippet demonstrates how to combine stores using an object to map store to
parameter names and a transformation function. The state from each store is read
and assigned to its corresponding field within an object. That object is then
passed into the function. The function must be pure. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/combine.mdx#_snippet_1

LANGUAGE: typescript CODE:

```
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<D> = combine(
  { a: $a, b: $b, c: $c },
  ({ a, b, c }: { a: A; b: B; c: C }): D => result,
);
```

---

TITLE: Using scopeBind Inside Effector Effects (TypeScript) DESCRIPTION: This
snippet illustrates the correct usage of `scopeBind` within Effector effects to
avoid scope-related errors. `scopeBind` ensures that events and effects are
executed within the correct scope, especially when dealing with asynchronous
operations like `setTimeout`. It's important to bind the event _inside_ the
effect, not in a callback function. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/troubleshooting.mdx#_snippet_2

LANGUAGE: typescript CODE:

```
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

---

TITLE: Basic useGate Usage with React (JavaScript) DESCRIPTION: This example
shows how to use `useGate` within a React component to pass props to a Gate. It
imports `createGate` and `useGate` from `effector-react`. It creates a Gate
called `PageGate` and uses `useGate` to connect the `props` passed to the `Home`
component to the `PageGate`. The `Route` component is assumed to be from
`react-router`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useGate.md#_snippet_2

LANGUAGE: javascript CODE:

```
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

---

TITLE: Explicit App Start with Effector Event (TypeScript) DESCRIPTION: This
example demonstrates the recommended practice of using an explicit event to
start the application initialization in Effector. This approach provides better
control over the application lifecycle, enables easier testing, and ensures
predictable behavior. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_2

LANGUAGE: typescript CODE:

```
export const appStarted = createEvent();
```

---

TITLE: Using Store Directly with Effector and Vue DESCRIPTION: This code snippet
demonstrates how to directly assign an Effector store to the `effector` option
in a Vue component. It imports a `counter` store and assigns it to the
`effector` property. This makes the store's value available in the template
under the name `state`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-vue/ComponentOptions.md#_snippet_2

LANGUAGE: javascript CODE:

```
import { counter } from "./stores";

new Vue({
  effector: counter, // would create `state` in template
});
```

---

TITLE: Filtering Updates with `sample({ filter })` (JavaScript) DESCRIPTION:
Demonstrates how to filter updates using the `filter` property in the `sample`
function. The `filter` function determines whether the sampling should proceed
based on the current state and the clock's payload. The example simulates a
money transfer scenario with balance and signature checks. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/sample.md#_snippet_9

LANGUAGE: javascript CODE:

```
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

---

TITLE: Typing event.prepend in TypeScript DESCRIPTION: This snippet shows how to
add types to events created using `event.prepend`. Types can be added either
directly within the prepend function argument or by specifying a generic type.
The example showcases how to prepend a new event by transforming its input
parameter. `EventCallable<string>` is a return type for both approaches. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/typescript.mdx#_snippet_1

LANGUAGE: TypeScript CODE:

```
const message = createEvent<string>();

const userMessage = message.prepend((text: string) => text);
// userMessage has type EventCallable<string>

const warningMessage = message.prepend<string>((warnMessage) => warnMessage);
// warningMessage has type EventCallable<string>
```

---

TITLE: Updating Stores with Loaded Data DESCRIPTION: This code uses Effector's
`on` method to update the `$messages` and `$session` stores when the
corresponding effects (`messageApi.messagesLoadFx` and
`sessionApi.sessionLoadFx`) complete successfully. The stores are updated with
the loaded data using their respective `doneData` events. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_17

LANGUAGE: ts CODE:

```
// File: /src/pages/chat/model.ts
// `.doneData` is a shortcut for `.done`, because `.done` returns `{ params, result }`
// Do not name your arguments like `state` or `payload`
// Use explicit names of the content they contain
$messages.on(messageApi.messagesLoadFx.doneData, (_, messages) => messages);

$session.on(sessionApi.sessionLoadFx.doneData, (_, session) => session);
```

---

TITLE: Declaring Event Type (TS) DESCRIPTION: This code declares the type of an
`Event` in TypeScript. This is useful when a factory or library requires an
event to subscribe to its updates. It is used to specify the type of data the
event will carry. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_12

LANGUAGE: typescript CODE:

```
const event: Event<T>;
```

---

TITLE: Effect calls with async functions (Incorrect) DESCRIPTION: Illustrates an
incorrect pattern where mixing effect calls with regular async functions like
`setTimeout` can lead to scope loss in Effector. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/advanced/work-with-scope.mdx#_snippet_1

LANGUAGE: ts CODE:

```
const authFx = createEffect(async () => {
  await loginFx();

  // Scope loss! Can't mix with regular promises
  await new Promise((resolve) => setTimeout(resolve, 100));

  // This call will be in the global scope
  await loadProfileFx();
});
```

---

TITLE: Watch effect status (JavaScript) DESCRIPTION: Creates an effect
`fetchUserReposFx` to fetch user repositories and uses the `.pending`, `.done`,
`.fail`, and `.finally` properties to watch and log the different states of the
effect's execution. It demonstrates how to track the pending status, successful
completion, failure, and final status of an effect. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/createEffect.md#_snippet_4

LANGUAGE: javascript CODE:

```
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

---

TITLE: Correct usage of Effector events with useUnit in React (JSX) DESCRIPTION:
This code snippet demonstrates the correct way to use Effector events in a React
component using the `useUnit` hook. By passing the event to `useUnit`, the
component correctly binds the event to the current scope, ensuring proper
functionality and avoiding scope-related issues. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/troubleshooting.mdx#_snippet_6

LANGUAGE: jsx CODE:

```
import { event } from "./model.js";
import { useUnit } from "effector-react";

const Component = () => {
  const onEvent = useUnit(event);

  return <button onClick={() => onEvent()}></button>;
};
```

---

TITLE: Using useGate with Gate and Props (TypeScript) DESCRIPTION: Describes the
formula for using the `useGate` function, which takes a `Gate` and `props` as
arguments. It returns void, and is used to bind props to a gate instance.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-solid/useGate.md#_snippet_1

LANGUAGE: typescript CODE:

```
useGate(Gate: Gate<Props>, props: Props): void;
```

---

TITLE: scopeBind Callback Usage with Effector DESCRIPTION: This snippet
illustrates how to bind an arbitrary callback function to an Effector scope
using `scopeBind`. It defines a store `$history`, an event `locationChanged`,
and uses `scopeBind` within `history.listen` to ensure that the callback passed
to `history.listen` is executed within the correct Effector scope. This is
particularly useful for asynchronous operations where the scope might otherwise
be lost. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/scopeBind.md#_snippet_2

LANGUAGE: typescript CODE:

```
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

---

TITLE: Incorrect State Access with getState in Effector (Typescript)
DESCRIPTION: This snippet demonstrates the anti-pattern of using
`$store.getState()` to access store values inside effects. This approach makes
the effect dependent on the global store state, reducing reusability and
testability. It gets `user` from `$user` and `settings` from `$settings`.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_12

LANGUAGE: typescript CODE:

```
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

---

TITLE: Attaching Effect with Async Function and Source Stores DESCRIPTION: This
code shows how to create an effect by attaching a source (store or object of
stores) to an async function. The `effect` function receives the store's value
and optional parameters. It also covers propagation of the scope and how to fix
scope losing using `createEffect`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/attach.md#_snippet_7

LANGUAGE: typescript CODE:

```
const attachedFx = attach({
  source,
  async effect(source, params) {},
});
```

---

TITLE: Split with Case Store DESCRIPTION: This code snippet demonstrates how to
use `split` with a case store. The `match` field contains a store of type
string. The `cases` object contains units to which data is passed based on the
current case from the store. If no case matches, the data is passed to
`cases.__`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/split.md#_snippet_1

LANGUAGE: typescript CODE:

```
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

---

TITLE: React Component: Conditional Rendering Based on Combined Queries (JS)
DESCRIPTION: This React component `Screen` conditionally renders its children
based on a combination of screen size and orientation queries managed by
Effector. It uses `effector-react`'s `useUnit` hook to access the combined media
query store and checks if the current screen state satisfies the component's
specified constraints. SOURCE:
https://github.com/effector/effector/blob/master/recipes/media-queries/README.md#_snippet_6

LANGUAGE: js CODE:

```
import {useUnit} from 'effector-react'
import {screenQueries} from './screenQueries'

function orientationCheck(props, queries) {
  //if there no constraint on orientation
  if (!props.portrait && !props.landscape) return true
  return (
    (props.portrait && queries.portrait) ||
    (props.landscape && !queries.portrait)
  )
}

function screenSizeCheck(props, queries) {
  //if there no constraint on screen size
  if (!props.small && !props.medium && !props.large) return true
  return (
    (props.small && queries.small) ||
    (props.medium && queries.medium) ||
    (props.large && queries.large)
  )
}

export const Screen = props => {
  const queries = useUnit(screenQueries)
  const orientationAllowed = orientationCheck(props, queries)
  const screenSizeAllowed = screenSizeCheck(props, queries)

  if (orientationAllowed && screenSizeAllowed) {
    return props.children
  }

  return null
}

Screen.defaultProps = {
  children: null,
  small: false,
  medium: false,
  large: false,
  portrait: false,
  landscape: false,
}
```

---

TITLE: Combining Stores with combine - Effector DESCRIPTION: Demonstrates how to
combine multiple stores into one, either as an object or with an additional
transformation. This uses `combine` from effector. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/manage-states.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
import { combine } from "effector";

const $form = combine({
  name: $name,
  age: $age,
  city: $city,
});

// или с дополнительной трансформацией
const $formValidation = combine($name, $age, (name, age) => ({
  isValid: name.length > 0 && age >= 18,
  errors: {
    name: name.length === 0 ? "Required" : null,
    age: age < 18 ? "Must be 18+" : null,
  },
}));
```

---

TITLE: Handling Data Loading Results DESCRIPTION: This snippet demonstrates how
to update the Effector stores with the data loaded from the API. It uses the
`.doneData` event of the effects to update the `$messages` and `$session`
stores. If data loading is successful, the corresponding stores are updated with
the new data. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/typescript/usage-with-effector-react.md#_snippet_16

LANGUAGE: ts CODE:

```
// Файл: /src/pages/chat/model.ts
// `.doneData` это сокращение для `.done`, поскольку `.done` returns `{ params, result }`
// Постарайтесь не называть свои аргументы как `state` или `payload`
// Используйте явные имена для содержимого
$messages.on(messageApi.messagesLoadFx.doneData, (_, messages) => messages);

$session.on(sessionApi.sessionLoadFx.doneData, (_, session) => session);
```

---

TITLE: Combine with object DESCRIPTION: Combines multiple stores into an object.
Dependencies: `Store`, `StoreWritable`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/combine.mdx#_snippet_5

LANGUAGE: typescript CODE:

```
const $a: Store<A>;
const $b: StoreWritable<B>;
const $c: Store<C> | StoreWritable<C>;

$result: Store<{ a: A; b: B; c: C }> = combine({ a: $a, b: $b, c: $c });
```

---

TITLE: Splitting event with match as Object with Functions - Effector -
TypeScript DESCRIPTION: This example uses an object of functions as the `match`
parameter. Each function must return a boolean value. When `paymentReceived` is
triggered, the first function that returns `true` determines which case will be
executed. This example processes payments based on amount ranges. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/flow-split.mdx#_snippet_8

LANGUAGE: typescript CODE:

```
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

---

TITLE: User.vue: Using useStoreMap to find a user DESCRIPTION: This Vue
component demonstrates how to use `useStoreMap` to find a specific user in a
list of users stored in an Effector store. It takes an `id` as a prop and uses
it as a key in the `useStoreMap` configuration. It imports `createStore`,
`useUnit` and `useStoreMap` from `effector-vue/composition`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-vue/useStoreMap.md#_snippet_3

LANGUAGE: javascript CODE:

```
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

---

TITLE: scopeBind Event Usage with Effector DESCRIPTION: This code snippet
showcases the basic usage of `scopeBind` to bind an Effector event to a scope.
It defines a store `$history`, an event `changeLocation`, and uses `scopeBind`
to create a function `locationUpdate` that triggers `changeLocation` within a
history listener callback, ensuring the event is properly associated with the
Effector scope. This is important when dealing with asynchronous operations like
`history.listen`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/scopeBind.md#_snippet_1

LANGUAGE: typescript CODE:

```
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

---

TITLE: Custom Effect Errors Typing in TypeScript DESCRIPTION: This example
demonstrates how to define custom error types for Effector effects using the
third generic parameter. It improves error handling by explicitly specifying the
structure of potential errors, making it easier to catch and handle them
correctly. This example includes defining an API error interface. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/typescript.mdx#_snippet_6

LANGUAGE: TypeScript CODE:

```
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

---

TITLE: Implementing Logout Functionality DESCRIPTION: This code implements the
logout functionality. It triggers the `sessionApi.sessionDeleteFx` effect when
the `logoutClicked` event occurs. Regardless of whether the deletion succeeds or
fails, the `$session` store is reset to `null` after effect completion. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/typescript/usage-with-effector-react.md#_snippet_19

LANGUAGE: ts CODE:

```
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

---

TITLE: Preventing Unit Calls from Pure Functions (TS) DESCRIPTION: This code
shows an example of an anti-pattern where an event or effect is called directly
within a pure function (like a mapper or filter). This throws an error in
effector 23.0.0 and later. This is the incorrect code. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_18

LANGUAGE: typescript CODE:

```
const someHappened = createEvent<number>();
const another = createEvent();

const derived = someHappened.map((number) => {
  another(); // THROWS!
  return String(number);
});
```

---

TITLE: Effector Store Serialization with SIDs DESCRIPTION: Demonstrates
serializing and deserializing Effector stores using SIDs. The server-side code
forks an Effector scope, populates the stores with data using `allSettled`,
serializes the scope, and returns the serialized state. The client-side code
then parses the state and uses it to initialize a new scope. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/explanation/sids.md#_snippet_2

LANGUAGE: typescript CODE:

```
// server.ts
async function handlerRequest() {
  // создаем изолированный экземпляр приложения
  const scope = fork();

  // заполняем сторы данными
  await allSettled($name, { scope, params: "Igor" });
  await allSettled($age, { scope, params: 25 });

  const state = JSON.serialize(serialize(scope));
  // -> { "name": "Igor", "age": 25 }

  return { state };
}

// Предположим, что сервер поместил состояние в HTML
const serverState = readServerStateFromWindow();

const scope = fork({
  // Просто парсим все состояние и используем его как состояние клиента
  values: JSON.parse(serverState),
});
```

---

TITLE: Sampling with Merged Clock (TS) DESCRIPTION: Provides the equivalent
configuration for the previous snippet, explicitly using `merge` to combine the
clock units before passing them to the `clock` field of `sample`. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_27

LANGUAGE: TypeScript CODE:

```
import {
  value createStore,
  value createEvent,
  value createEffect,
  value sample,
  value merge,
} from 'effector'

const showNotification = createEvent<string>()
const trigger = createEvent()
const fx = createEffect()

const $store = createStore('')

// merged unit in clock
sample({
  source: $store,
  clock: merge([trigger, fx.doneData]),
  target: showNotification,
})
```

---

TITLE: Triggering Effects with Application Start Event (TypeScript) DESCRIPTION:
This code demonstrates how to trigger an effect (`initFx`) when the `appStarted`
event is triggered. It showcases both the usage without and with scopes.
`sample` is used to connect the event to the effect. With scopes, `allSettled`
guarantees completion within a test. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
import { sample } from "effector";
import { scope } from "./app.js";

sample({
  clock: appStarted,
  target: initFx,
});

appStarted();
```

LANGUAGE: typescript CODE:

```
import { sample, allSettled } from "effector";
import { scope } from "./app.js";

sample({
  clock: appStarted,
  target: initFx,
});

allSettled(appStarted, { scope });
```

---

TITLE: Handling Nested and Parallel Effects in Forked Scopes (Effector JS)
DESCRIPTION: This example showcases Effector's support for nested and parallel
effect calls within forked scopes. It defines effects (`startFx`, `nextFx`) that
call other effects (`addWordFx`) sequentially and in parallel (`Promise.all`).
The snippet demonstrates running these effects concurrently in multiple distinct
forked scopes (`scopeA`, `scopeB`, `scopeC`) using `allSettled` and verifies
that each scope maintains its isolated state correctly. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_36

LANGUAGE: js CODE:

```
import {createDomain, forward} from 'effector'
import {fork, allSettled} from 'effector/fork'

const app = createDomain()
const addWordFx = app.createEffect({handler: async word => word})

const words = app
  .createStore([])
  .on(addWordFx.doneData, (list, word) => [...list, word])

const startFx = app.createEffect({
  async handler(word) {
    await addWordFx(`${word}1`)
    await addWordFx(`${word}2`)
    return word
  },
})

const nextFx = app.createEffect({
  async handler(word) {
    await Promise.all([addWordFx(`${word}3`), addWordFx(`${word}4`)])
  },
})

forward({from: startFx.doneData, to: nextFx})

const scopeA = fork(app)
const scopeB = fork(app)
const scopeC = fork(app)

await Promise.all([
  allSettled(startFx, {
    scope: scopeA,
    params: 'A',
  }),
  allSettled(startFx, {
    scope: scopeB,
    params: 'B',
  }),
])

await allSettled(startFx, {
  scope: scopeC,
  params: 'C',
})

console.log(scopeA.getState(words))
// => [A1, A2, A3, A4]
console.log(scopeB.getState(words))
// => [B1, B2, B3, B4]
console.log(scopeC.getState(words))
// => [C1, C2, C3, C4]
```

---

TITLE: Simplifying Logic with Effector Action (TypeScript) DESCRIPTION: This
example compares complex effector logic using multiple samples with the
simplified approach using `effector-action`. `effector-action` allows writing
imperative code within effector's declarative structure, enhancing readability.
It demonstrates handling form submission with validation and side effects. It
relies on the `effector-action` library. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_5

LANGUAGE: typescript CODE:

```
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

LANGUAGE: typescript CODE:

```
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

---

TITLE: Reset Store State with `.reset()` (JavaScript) DESCRIPTION: Resets a
store's state to its default value using the `.reset()` method. The `$store` is
reset to 0 when the `reset` event is triggered, effectively reverting any
accumulated increments. Includes a watcher to track state changes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Store.md#_snippet_6

LANGUAGE: javascript CODE:

```
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

---

TITLE: Vue Component Template Example DESCRIPTION: Illustrates how to use the
data bound via the `effector` option within a Vue component's template. It shows
conditional rendering based on the `createPending` state and displaying the
`user.name`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-vue/VueEffector.md#_snippet_3

LANGUAGE: html CODE:

```
<template>
  <div>
    <span v-if="createPending">loading...</span>
    <p>{{ user.name }}</p>
    ...
    <button @click="create">Create<button>
  </div>
</template>
```

---

TITLE: Testing Event Triggering with Effector DESCRIPTION: This code snippet
demonstrates how to test if an event is triggered using `createWatch` within a
forked scope. It creates a mock function using `jest.fn()` and attaches it to
the `userUpdated` event within a specific scope. After triggering the event, it
asserts that the mock function was called once. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/testing.mdx#_snippet_2

LANGUAGE: typescript CODE:

```
import { createEvent, createWatch, fork } from "effector";
import { userUpdated } from "../";

test("should handle user update with scope", async () => {
  const scope = fork();
  const fn = jest.fn();

  // Создаем watcher в конкретном scope
  const unwatch = createWatch({
    unit: userUpdated,
    fn,
    scope,
  });

  // Запускаем событие в scope
  await allSettled(userUpdated, {
    scope,
  });

  expect(fn).toHaveBeenCalledTimes(1);
});
```

---

TITLE: Incorrect usage of Effector events without useUnit in React (JSX)
DESCRIPTION: This code snippet shows an incorrect way of using Effector events
in a React component without the `useUnit` hook. This can lead to issues with
scope and unexpected behavior. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/troubleshooting.mdx#_snippet_5

LANGUAGE: jsx CODE:

```
import { event } from "./model.js";

const Component = () => {
  return <button onClick={() => event()}></button>;
};
```

---

TITLE: Split Formula Examples DESCRIPTION: This snippet presents various
examples of how the `split` function can be used. It includes examples with case
functions, case stores, matcher functions, and matcher stores. The snippet
focuses on the structure of `source`, `match`, and `cases` parameters. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/split.md#_snippet_6

LANGUAGE: typescript CODE:

```
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

---

TITLE: Simplifying Updates with createApi - Effector DESCRIPTION: Demonstrates
using `createApi` to create handlers for a store instead of creating individual
events and subscribing to them. This function creates a set of events for
updating the store in one place. It imports `createStore` and `createApi` from
effector. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/manage-states.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
import { createStore, createApi } from "effector";

const $counter = createStore(0);

const { increment, decrement, reset } = createApi($counter, {
  increment: (state) => state + 1,
  decrement: (state) => state - 1,
  reset: () => 0,
});

// Использование
increment(); // 1
reset(); // 0
```

---

TITLE: Incorrect Prepend with Unit Call DESCRIPTION: Illustrates an incorrect
usage of `.prepend`: calling an event from inside prepend function. This will
throw an error, because `prepend` function must be pure. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_9

LANGUAGE: typescript CODE:

```
const someHappened = createEvent<string>();
const another = createEvent<number>();

const reversed = someHappened.prepend((input: number) => {
  another(input); // ВЫЗЫВАЕТ ОШИБКУ!
  return String(input);
});
```

---

TITLE: Business Logic for Toggling Repo Star DESCRIPTION: This snippet
demonstrates the business logic for toggling a repository star using Effector.
It includes the creation of an event (`repoStarToggled`), effects (`starRepoFx`,
`unstarRepoFx`), and stores (`$isRepoStarred`, `$repoStarsCount`). The `sample`
function is used to connect these units and manage state transitions based on
events and effects. It also include the logic for sending a request to the
server when toggling the star. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/resources/mindset.mdx#_snippet_2

LANGUAGE: ts CODE:

```
// repo.model.ts

// событие – факт действия
const repoStarToggled = createEvent();

// эффекты как дополнительная реакция на события
// (предположим эффекты возвращают обновленное значение)
const starRepoFx = createEffect(() => {});
const unstarRepoFx = createEffect(() => {});

// состояние приложения
const $isRepoStarred = createStore(false);
const $repoStarsCount = createStore(0);

// логика переключения звездочки
sample({
  clock: repoStarToggled,
  source: $isRepoStarred,
  fn: (isRepoStarred) => !isRepoStarred,
  target: $isRepoStarred,
});

// отправка запроса на сервер при переключении звезды
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

// обновляем счетчик
sample({
  clock: [starRepoFx.doneData, unstarRepoFx.doneData],
  target: $repoStarsCount,
});
```

---

TITLE: Saving Event Data to Store (JavaScript) DESCRIPTION: Demonstrates how to
use `forward` to connect an event to a store, updating the store's value
whenever the event is triggered. The code imports `createStore`, `createEvent`,
and `forward` from effector. It shows how the store's state changes in response
to event triggers, logged via `watch`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/forward.md#_snippet_1

LANGUAGE: javascript CODE:

```
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

---

TITLE: Incorrect Imperative Calls in Effector (TypeScript) DESCRIPTION: This
snippet illustrates the anti-pattern of making imperative calls within an
Effector effect. The `loginFx` effect directly calls `setUser`, `redirectFx`,
and `showNotification` after a successful login, which is not a declarative
approach. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_13

LANGUAGE: typescript CODE:

```
const loginFx = createEffect(async (params) => {
  const user = await api.login(params);

  // Императивные вызовы
  setUser(user);
  redirectFx("/dashboard");
  showNotification("Welcome!");

  return user;
});
```

---

TITLE: Short Form Split with Effector Stores DESCRIPTION: This snippet
illustrates the short form of the `split` method, where the first argument is a
unit (in this case, a store `$repo`) and the second argument is an object with
cases. It demonstrates toggling star and watch statuses for a repository,
derived from a store, and splitting the flow based on the `isStarred` property.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/flow-split.mdx#_snippet_2

LANGUAGE: ts CODE:

```
import { createStore, createEvent, split } from "effector";

type Repo = {
  // ... другие свойства
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

// следим за случаем по умолчанию для дебага
__.watch((repo) =>
  console.log("[split toggleStar] Случай по умолчанию отработал со значением ", repo),
);

// где-то в приложении
toggleStar();
```

---

TITLE: useStoreMap with config object (TypeScript) DESCRIPTION: This code block
presents the function signature for using `useStoreMap` with a configuration
object. This config allows for specifying dependencies using the `keys` property
(similar to `React.useMemo`), controlling updates with `updateFilter`, and
setting `defaultValue` when `fn` returns `undefined`. It returns the `Result` of
the `fn` function, or `defaultValue` if provided and `fn` returns `undefined`.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useStoreMap.md#_snippet_2

LANGUAGE: typescript CODE:

```
useStoreMap({
  store: Store<State>,
  keys: any[],
  fn: (state: State, keys: any[]) => Result,
  updateFilter?: (newResult: Result, oldResult: Result) => boolean,
  defaultValue?: Result,
}): Result;
```

---

TITLE: Effector Store and Event Definitions DESCRIPTION: Defines Effector stores
and events for first name, last name, and full name, demonstrating how events
update stores and how stores can be combined. This example also shows using
`sample` to trigger events based on other events. The stores are automatically
assigned SIDs using a plugin. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/explanation/sids.md#_snippet_3

LANGUAGE: tsx CODE:

```
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

---

TITLE: Basic createStore example DESCRIPTION: Demonstrates the basic usage of
`createStore` in Effector. It initializes a store named `$name` with a null
value. This example is used to illustrate how the Effector plugin adds a `sid`
to the store during code transformation. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/explanation/sids.md#_snippet_6

LANGUAGE: typescript CODE:

```
const $name = createStore(null);
```

---

TITLE: Creating Submit Button Component (JSX) DESCRIPTION: This React component
`SubmitButton` renders a submit button that is disabled while the `sendFormFx`
effect is pending. It uses the `useUnit` hook to subscribe to the
`sendFormFx.pending` store and sets the `disabled` attribute of the button based
on the value of the store. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/forms.md#_snippet_7

LANGUAGE: jsx CODE:

```
const SubmitButton = (props) => {
  const loading = useUnit(sendFormFx.pending);
  return (
    <button disabled={loading} type="submit">
      Submit
    </button>
  );
};
```

---

TITLE: Basic Babel Configuration (JSON) DESCRIPTION: Shows the most basic
configuration for the effector/babel-plugin within a .babelrc file. This
configuration enables the plugin without any specific options. Requires a Babel
environment. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/babel-plugin.md#_snippet_1

LANGUAGE: json CODE:

```
{
  "plugins": ["effector/babel-plugin"]
}
```

---

TITLE: Reusing Logic with Attach for Different Endpoints (TS) DESCRIPTION: This
snippet showcases how to reuse a base effect (`fetchDataFx`) with `attach` to
create specialized effects (`fetchUsersFx`, `fetchProductsFx`) for different
endpoints. It shows how to configure these effects with different `endpoint`
parameters and an authorization token taken from the `$authToken` store. It
depends on `createEffect`, `attach`, and `$authToken` store to be already
defined. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/unit-composition.md#_snippet_12

LANGUAGE: typescript CODE:

```
const fetchDataFx = createEffect<{ endpoint: string; token: string }, any>();

// Создаём специализированные эффекты для разных эндпоинтов
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

---

TITLE: Starting Initialization with Scopes (TypeScript) DESCRIPTION: This
snippet shows how to start the application's initialization using `appStarted`
event. It demonstrates two approaches: one without scopes, triggering `initFx`
directly, and another using scopes, triggering `initFx` within a specified scope
using `allSettled`. This approach is beneficial for SSR. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/best-practices.mdx#_snippet_3

LANGUAGE: typescript CODE:

```
import { sample } from "effector";
import { scope } from "./app.js";

sample({
  clock: appStarted,
  target: initFx,
});

appStarted();
```

---

TITLE: Defining Message Schemas with Zod - Typescript DESCRIPTION: Defines Zod
schemas for two types of WebSocket messages: `balanceChanged` and
`reportGenerated`. It also derives the TypeScript type `MessagesSchema` from the
Zod schema, enabling type-safe message handling. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/websocket-integration.md#_snippet_5

LANGUAGE: typescript CODE:

```
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

---

TITLE: Explicit Application Start Event (TypeScript) DESCRIPTION: This code
shows how to define an event that is triggered when an application starts. This
allows full control over the application lifecycle, simplified testing,
predictable behavior, and the ability to manage initialization order. The
`appStarted` event serves as a clear signal for application initialization.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_2

LANGUAGE: typescript CODE:

```
export const appStarted = createEvent();
```

---

TITLE: Basic Split Example DESCRIPTION: This code demonstrates a basic example
of using the `split` function to route messages to different event handlers
based on message type. It uses `createEvent` to create events, and then `split`
to direct the messages to `showTextPopup`, `playAudio`, or
`reportUnknownMessageTypeFx` based on the `type` property. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/split.md#_snippet_7

LANGUAGE: javascript CODE:

```
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

---

TITLE: Creating and Using an Effector Effect (JavaScript) DESCRIPTION: This
JavaScript code shows how to create an Effector effect using `createEffect` for
handling asynchronous operations, such as fetching data from an API. It also
demonstrates how to subscribe to the `done` and `fail` events of the effect to
handle successful results and errors, respectively. The `effector` library is
required. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/core-concepts.md#_snippet_3

LANGUAGE: javascript CODE:

```
import { createEffect } from "effector";

const fetchUserFx = createEffect(async (userId) => {
  const response = await fetch(`/api/user/${userId}`);
  return response.json();
});

// Подписываемся на результат эффекта
fetchUserFx.done.watch(({ result }) => console.log("Данные пользователя:", result));
// Если эффект выкинет ошибку, то мы отловим ее при помощи события fail
fetchUserFx.fail.watch(({ error }) => console.log("Произошла ошибка! ", error));

// Запускаем эффект
fetchUserFx(1);
```

---

TITLE: Selecting Store Data with effector-react.useStoreMap (JavaScript)
DESCRIPTION: Shows how to use the `useStoreMap` hook in a React functional
component (`User`) to efficiently select a specific user object from a larger
`$users` store based on an `id` prop. It also uses `useStore` to map over a list
of user IDs. Requires `createStore` from `effector` and `useStore`,
`useStoreMap` from `effector-react`, and React/ReactDOM. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_89

LANGUAGE: javascript CODE:

```
import {createStore} from 'effector'
import {useStore, useStoreMap} from 'effector-react'
import React from 'react'
import ReactDOM from 'react-dom'

const User = ({id}) => {
  const user = useStoreMap({
    store: $users,
    keys: [id],
    fn: (users, [id]) => users[id],
  })

  return (
    <div>
      {user.name} ({user.age})
    </div>
  )
}

const UserList = () => useStore(userID$).map(id => <User id={id} key={id} />)

const $user = createStore({
  alex: {age: 20, name: 'Alex'},
  john: {age: 30, name: 'John'},
})

const $userID = $user.map(users => Object.keys(users))

ReactDOM.render(<UserList />, document.getElementById('root'))
```

---

TITLE: Handling WebSocket Errors - TypeScript DESCRIPTION: This snippet extends
the basic WebSocket model to include error handling. It adds an event
`socketError` to capture errors, and modifies the `connectWebSocketFx` effect to
handle connection timeouts and WebSocket errors. A store `$error` is also
created to store the error message. Dependencies: effector. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/websocket-integration.md#_snippet_4

LANGUAGE: typescript CODE:

```
const TIMEOUT = 5_000;

// Добавляем события для ошибок
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
      scopeMessageReceived(event.data);
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

// Стор для хранения ошибки
const $error = createStore("")
  .on(socketError, (_, error) => error.message)
  .reset(connectWebSocketFx.done);
```

---

TITLE: Complete Timer Implementation with Scope Binding - Effector DESCRIPTION:
This snippet represents the complete timer implementation, incorporating
`scopeBind` to prevent scope loss. It includes event and store creation, effect
definitions, and the logic for starting, stopping, resetting the timer,
showcasing the corrected usage of `scopeBind` to address the scope loss issue.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/advanced/work-with-scope.mdx#_snippet_12

LANGUAGE: typescript CODE:

```
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

---

TITLE: Guard with Store Filter Example DESCRIPTION: Demonstrates how to use
`guard` with a store as a filter. The `fetchRequest` effect is only triggered
when the `isIdle` store is true, indicating that no request is currently
pending. `clickRequest` event increments `clicks` store. `guard` conditionally
triggers `fetchRequest` with the latest value from the `clicks` store when
`isIdle` is true. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/guard.md#_snippet_0

LANGUAGE: javascript CODE:

```
import { createStore, createEffect, createEvent, guard } from "effector";

const clickRequest = createEvent();
const fetchRequest = createEffect((n) => new Promise((rs) => setTimeout(rs, 2500, n)));

const clicks = createStore(0).on(clickRequest, (x) => x + 1);
const requests = createStore(0).on(fetchRequest, (x) => x + 1);

const isIdle = fetchRequest.pending.map((pending) => !pending);

/*
1. при срабатывании clickRequest
2. если значение isIdle равно true
3. прочитать значение из clicks
4. и вызвать с ним эффект fetchRequest
*/
guard({
  clock: clickRequest /* 1 */,
  filter: isIdle /* 2 */,
  source: clicks /* 3 */,
  target: fetchRequest /* 4 */,
});
```

---

TITLE: Creating WebSocket Connection Effect - TypeScript DESCRIPTION: This code
defines an Effector effect for establishing a WebSocket connection. It takes a
URL as input and returns a Promise that resolves with the WebSocket instance
upon successful connection. It also sets up event handlers for incoming
messages, connection closure, and errors, using `scopeBind` to properly handle
events within the correct scope. Dependencies: effector. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/websocket-integration.md#_snippet_1

LANGUAGE: typescript CODE:

```
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

---

TITLE: Expanded Split Form with Effector DESCRIPTION: This example demonstrates
the expanded form of the `split` method, which allows for more complex logic,
including dependencies on external data (stores) and triggering multiple units.
It showcases how to perform different actions based on the application mode
(`user` or `admin`). SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/flow-split.mdx#_snippet_3

LANGUAGE: ts CODE:

```
import { createStore, createEvent, split } from "effector";

const adminActionFx = createEffect();
const secondAdminActionFx = createEffect();
const userActionFx = createEffect();
const defaultActionFx = createEffect();
// События для UI
const buttonClicked = createEvent();

// Текущий режим приложения
const $appMode = createStore<"admin" | "user">("user");

// Разные события для разных режимов
split({
  source: buttonClicked,
  match: $appMode, // Логика зависит от текущего режима
  cases: {
    admin: [adminActionFx, secondAdminActionFx],
    user: userActionFx,
    __: defaultActionFx,
  },
});

// При клике одна и та же кнопка делает разные вещи
// в зависимости от режима приложения
buttonClicked();
// -> "Выполняем пользовательское действие" (когда $appMode = 'user')
// -> "Выполняем админское действие" (когда $appMode = 'admin')
```

---

TITLE: Incorrect Usage of Effect with Inner Effects - JS DESCRIPTION: This
JavaScript code demonstrates an incorrect usage of Effector effects. Mixing
regular asynchronous operations (like `setTimeout`) with effect calls within a
single effect can lead to loss of scope. The `setTimeout` should ideally be
wrapped in its own effect. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Scope.md#_snippet_3

LANGUAGE: javascript CODE:

```
const sendWithAuthFx = createEffect(async () => {
  await authUserFx();

  // Incorrect! This should be wrapped in an effect.
  await new Promise((resolve) => setTimeout(resolve, 80));

  // Context is lost here.
  await sendMessageFx();
});
```

---

TITLE: Preventing Default Form Submission (JS) DESCRIPTION: This snippet
prevents the default HTML form submission behavior using React's event handling.
The `submitted.watch` function listens to the `formSubmitted` event and calls
`e.preventDefault()` to stop the default browser form submission. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/recipes/react/forms.md#_snippet_4

LANGUAGE: js CODE:

```
formSubmitted.watch((e) => {
  e.preventDefault();
});
```

---

TITLE: Accessing Effect doneData Event - Javascript DESCRIPTION: Demonstrates
the `doneData` event of an Effector effect. It shows how to attach a watcher to
the `doneData` event, which triggers after the effect has completed
successfully. The watcher logs the result of the effect execution. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Effect.md#_snippet_12

LANGUAGE: javascript CODE:

```
import { createEffect } from "effector";

const fx = createEffect((value) => value + 1);

fx.doneData.watch((result) => {
  console.log(`Эффект успешно выполнился, вернув ${result}`);
});

await fx(2);
// => Эффект успешно выполнился, вернув 3
```

---

TITLE: Passing Multiple Arguments to Effector Event via Object (TypeScript)
DESCRIPTION: Explains and demonstrates how to pass multiple logical values to an
Effector event while adhering to the single-argument rule. The recommended
approach is to encapsulate all necessary data within a single object and pass
that object as the event's argument. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/events.md#_snippet_2

LANGUAGE: ts CODE:

```
import { createEvent } from "effector";

const requestReceived = createEvent<{ id: number; title: string }>();

requestReceived({ id: 1, title: "example" });
```

---

TITLE: useUnit with Store - JSX Example DESCRIPTION: Demonstrates using
`useUnit` with an Effector store in a Solid component. It defines a store for a
counter, an API for incrementing and decrementing the counter, and a component
that uses `useUnit` to bind the store and API to the component, allowing it to
display the counter value and provide buttons to increment and decrement it.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-solid/useUnit.md#_snippet_4

LANGUAGE: jsx CODE:

```
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

---

TITLE: useUnit with Event/Effect (TypeScript) DESCRIPTION: Describes the
function signature for using `useUnit` with an Effector Event or Effect. It
creates a function that calls the original unit but bound to a `Scope`, if one
is provided via the `Provider` component. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector-react/useUnit.md#_snippet_1

LANGUAGE: typescript CODE:

```
useUnit(event: EventCallable<T>): (payload: T) => T;
useUnit(effect: Effect<Params, Done, any>): (payload: Params) => Promise<Done>;
```

---

TITLE: Socket.IO Integration with Effector (TypeScript) DESCRIPTION: This code
snippet sets up a Socket.IO client connection using Effector's reactive state
management. It defines events for connection, disconnection, errors, and message
handling, along with corresponding effects for managing the socket lifecycle and
message transmission. The code uses createStore to store the socket instance and
sample to trigger effects based on events. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/websocket-integration.md#_snippet_10

LANGUAGE: typescript CODE:

```
import { io, Socket } from "socket.io-client";
import { createStore, createEvent, createEffect, sample } from "effector";

const API_URL = "wss://your.ws.server";

// События
const connected = createEvent();
const disconnected = createEvent();
const socketError = createEvent<Error>();

// Типизация для событий
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
    //... ваша конфигурация
  });

  // нужно для корректной работы со скоупами
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

// Состояния
const $socket = createStore<Socket | null>(null)
  .on(connectFx.doneData, (_, socket) => socket)
  .reset(disconnected);

// инициализация подключения
sample({
  clock: connectSocket,
  target: connectFx,
});

// вызываем событие после успешного подключения
sample({
  clock: connectSocketFx.doneData,
  target: socketConnected,
});
```

---

TITLE: Using Immer for Store Updates (TypeScript) DESCRIPTION: This snippet
illustrates how to use Immer to simplify updates to stores containing nested
structures in Effector. Immer's `produce` function allows for immutable updates
with mutable syntax, making it easier to modify nested objects within a store.
The example updates the theme setting within a nested user profile. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_1

LANGUAGE: typescript CODE:

```
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

---

TITLE: Filtering Messages by Type - TypeScript DESCRIPTION: This code provides a
utility function `messageReceivedByType` to filter incoming WebSocket messages
based on their type. It uses Effector's `sample` function and a type predicate
to ensure that only messages of the specified type are processed. This allows
you to handle different types of messages in a type-safe manner. Dependencies:
effector, zod. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/websocket-integration.md#_snippet_8

LANGUAGE: typescript CODE:

```
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

---

TITLE: Error: Unit Call from Pure Filter (Effector) DESCRIPTION: Demonstrates
the error raised when attempting to trigger events from a `.filter`'s pure
function and the correct way to trigger events using `sample`. It illustrates
the best practice to avoid unintended side effects. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_21

LANGUAGE: typescript CODE:

```
const countReceived = createEvent<number>();
const eachReceived = createEvent<number>();

const receivedEven = someHappened.filter({
  fn(count) {
    eachReceived(count); // ВЫЗЫВАЕТ ОШИБКУ!
    return count % 2 === 0;
  },
});
```

LANGUAGE: typescript CODE:

```
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

---

TITLE: Attaching Effect with Source Store (TypeScript) DESCRIPTION: Shows how to
attach an effect to a store, passing the store's value as a parameter to the
effect. The attached effect does not require any parameters, as it automatically
uses the data from the store. Types of the store in `source` and parameters
`effect` must match. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/attach.md#_snippet_2

LANGUAGE: ts CODE:

```
import { createEffect, createStore, attach } from "effector";

const requestPageFx = createEffect<{ page: number; size: number }, string[]>(async ({ page, size }) => {
  console.log("Запрошено", page);
  return page * size;
});

const $page = createStore(1);
const $size = createStore(20);

const requestNextPageFx = attach({
  source: { page: $page, size: $size },
  effect: requestPageFx,
});

$page.on(requestNextPageFx.done, (page) => page + 1);

requestPageFx.doneData.watch((position) => console.log("requestPageFx.doneData", position));

await requestNextPageFx();
// => Запрошено 1
// => requestPageFx.doneData 20

await requestNextPageFx();
// => Запрошено 2
// => requestPageFx.doneData 40

await requestNextPageFx();
// => Запрошено 3
// => requestPageFx.doneData 60
```

---

TITLE: Guard with Function Predicate (JavaScript) DESCRIPTION: This example
shows how to use `guard` with a function as a filter to conditionally trigger an
effect. The `searchUser` effect is only triggered when the `submitForm` event's
payload (user) has a length greater than 0. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/guard.md#_snippet_2

LANGUAGE: javascript CODE:

```
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

---

TITLE: Combining Stores and Objects in Effector (JS) DESCRIPTION: Shows how to
create stores, events, combine stores using `combine`, create a store object
using `createStoreObject`, and watch its changes. It illustrates how updates to
one store propagate and affect combined values. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_102

LANGUAGE: javascript CODE:

```
import {createStore, createEvent, createStoreObject, combine} from 'effector'

const updateField = createEvent('update $field value')

const $field = createStore('').on(updateField, (state, upd) => upd.trim())

const $isEmpty = $field.map(value => value.length === 0)
const $isTooLong = $field.map(value => value.length > 12)
const $isValid = combine(
  $isEmpty,
  $isTooLong,
  (isEmpty, isTooLong) => !isEmpty && !isTooLong,
)

createStoreObject({
  field: $field,
  isEmpty: $isEmpty,
  isTooLong: $isTooLong,
  isValid: $isValid,
}).watch(data => {
  console.log(data)
})

// => {field: '', isEmpty: true, isTooLong: false, isValid: false}

updateField('bobby')

// => {field: 'bobby', isEmpty: false, isTooLong: false, isValid: true}
```

---

TITLE: Debugging Effector Events with Patronum DESCRIPTION: Demonstrates using
the `debug` operator from the `patronum` library to log Effector event triggers
and their payloads for debugging purposes. Shows how `debug` can watch multiple
units simultaneously. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/events.md#_snippet_3

LANGUAGE: TypeScript CODE:

```
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

---

TITLE: Creating and Subscribing to an Effector Event (JavaScript) DESCRIPTION:
This JavaScript code snippet shows how to create an Effector event using
`createEvent` and subscribe to it using `watch`. When the event is triggered,
the provided callback function is executed. The `effector` library is required.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/introduction/core-concepts.md#_snippet_1

LANGUAGE: javascript CODE:

```
import { createEvent } from "effector";

// Создаем событие
const formSubmitted = createEvent();

// Подписываемся на событие
formSubmitted.watch(() => console.log("Форма отправлена!"));

formSubmitted();

// Вывод в консоль:
// "Форма отправлена!"
```

---

TITLE: Installing Effector with npm DESCRIPTION: This command installs the
Effector library using npm, a package manager for JavaScript. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/introduction/get-started.mdx#_snippet_0

LANGUAGE: bash CODE:

```
npm install effector
```

---

TITLE: Effector restore with Effect example (JavaScript) DESCRIPTION: This
snippet shows how to create a store from the successful result of an effect
using `restore`. The store's value is updated with the result of the effect when
it completes successfully. It requires `createEffect` and `restore` from
effector. Outputs the state to the console upon each update. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/restore.md#_snippet_2

LANGUAGE: javascript CODE:

```
import { createEffect, restore } from "effector";

const fx = createEffect(() => "foo");
const $store = restore(fx, "default");

$store.watch((state) => console.log("state: ", state));
// => state: default

await fx();
// => state: foo
```

---

TITLE: Incorrect Imperative Effect Calls in Effector (Typescript) DESCRIPTION:
This snippet illustrates an anti-pattern: calling events or effects imperatively
inside other effects. It directly calls `setUser`, `redirectFx`, and
`showNotification` within `loginFx`. This approach reduces testability and makes
the data flow harder to track. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/best-practices.mdx#_snippet_10

LANGUAGE: typescript CODE:

```
const loginFx = createEffect(async (params) => {
  const user = await api.login(params);

  // imperative calls
  setUser(user);
  redirectFx("/dashboard");
  showNotification("Welcome!");

  return user;
});
```

---

TITLE: Splitting event with split using predicates - Effector - TypeScript
DESCRIPTION: This snippet demonstrates the basic usage of `split` in Effector.
It creates an event `updateUserStatus` and splits it into multiple events based
on user status strings using predicates. Each predicate checks if the
`userStatus` matches a specific string value and triggers the corresponding
event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/flow-split.mdx#_snippet_0

LANGUAGE: typescript CODE:

```
import { createEvent, split } from "effector";

const updateUserStatus = createEvent();

const { activeUserUpdated, idleUserUpdated, inactiveUserUpdated } = split(updateUserStatus, {
  activeUserUpdated: (userStatus) => userStatus === "active",
  idleUserUpdated: (userStatus) => userStatus === "idle",
  inactiveUserUpdated: (userStatus) => userStatus === "inactive",
});
```

---

TITLE: Timer Effect with scopeBind DESCRIPTION: This code demonstrates the
corrected version of the `startFx` effect using `scopeBind`. By binding the
`tick` event to the current scope using `scopeBind(tick)`, the scope is
preserved when the event is triggered within `setInterval`, preventing potential
scope loss. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/advanced/work-with-scope.mdx#_snippet_4

LANGUAGE: typescript CODE:

```
const startFx = createEffect(() => {
  const bindedTick = scopeBind(tick);

  const intervalId = setInterval(() => {
    bindedTick();
  }, TIMEOUT);

  return intervalId;
});
```

---

TITLE: Event filterMap Type Inference Example DESCRIPTION: Shows how the return
type of the filterMap function determines the type of the resulting event.
Demonstrates that explicit type definition is not required as the type is
automatically inferred from the filterMap function's return type. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_23

LANGUAGE: typescript CODE:

```
import { createEvent } from "effector";

const first = createEvent<number>();
// first: Event<number>

const second = first.filterMap((count) => {
  if (count === 0) return;
  return count.toString();
});
// second: Event<string>
```

---

TITLE: Updating Store on Effect Completion DESCRIPTION: This code snippet shows
how to update an Effector store with data returned by an effect upon successful
completion. It uses the `on` method to listen for the `done` and `fail` events
and update the store accordingly. Also uses `doneData` and `failData` for
similar purposes. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/work-with-async.md#_snippet_1

LANGUAGE: typescript CODE:

```
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
// или 🔃
$userName.on(fetchUserNameFx.doneData, (_, result) => result);
$error.on(fetchUserNameFx.failData, (_, error) => error.message);

$isLoading.watch((loading) => console.log("Is loading:", loading));
```

---

TITLE: Incorrect Event Call from Pure Function DESCRIPTION: Illustrates an
incorrect usage: calling event from a pure function. Calling an event within a
pure function like `map` is restricted in Effector. It will cause an error.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/Event.md#_snippet_6

LANGUAGE: typescript CODE:

```
const someHappened = createEvent<number>();
const another = createEvent();

const derived = someHappened.map((number) => {
  another(); // ВЫЗЫВАЕТ ОШИБКУ!
  return String(number);
});
```

---

TITLE: Effector Split Basic Example DESCRIPTION: A basic example showcasing how
`split` routes messages based on their type. It defines events for receiving
messages, showing text popups, playing audio, and reporting unknown message
types. The `split` function directs messages to the appropriate event based on
the `type` property. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/split.md#_snippet_6

LANGUAGE: javascript CODE:

```
import { split, createEffect, createEvent } from "effector";
const messageReceived = createEvent();
const showTextPopup = createEvent();
const playAudio = createEvent();
const reportUnknownMessageTypeFx = createEffect(({ type }) => {
  console.log("неизвестное сообщение:", type);
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
  console.log("новое сообщение:", value);
});

messageReceived({
  type: "text",
  value: "Привет",
});
// => новое сообщение: Привет
messageReceived({
  type: "image",
  imageUrl: "...",
});
// => неизвестное сообщение: image
```

---

TITLE: Extracting Event Payload Type (TypeScript) DESCRIPTION: Demonstrates
extracting the payload type from an Effector Event using the `EventPayload`
utility type. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Event.md#_snippet_28

LANGUAGE: typescript CODE:

```
import { type EventPayload } from "effector";
```

LANGUAGE: typescript CODE:

```
const event: Event<Payload>;
type Payload = EventPayload<typeof event>;
```

---

TITLE: Handling data with derived events DESCRIPTION: This example shows how to
create a derived event (array) from an existing event (extractPartOfArray) using
the .map() method. The derived event extracts a portion of an array passed to
the original event. The example then demonstrates how to watch the derived
event. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/api/effector/createEvent.md#_snippet_2

LANGUAGE: javascript CODE:

```
import { createEvent } from "effector";

const extractPartOfArray = createEvent();
const array = extractPartOfArray.map((arr) => arr.slice(2));

array.watch((part) => {
  console.log(part);
});
extractPartOfArray([1, 2, 3, 4, 5, 6]);
// => [3, 4, 5, 6]
```

---

TITLE: Typing `is` methods as type guards in TypeScript DESCRIPTION: `is`
methods are showcased here as TypeScript type guards, which refine the type of a
unit, leading to more type-safe helper functions. In each branch of the `if`
statement, TypeScript knows the specific type of `unit` due to the `is` methods.
SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/typescript.mdx#_snippet_14

LANGUAGE: TypeScript CODE:

```
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

---

TITLE: Using scopeBind to preserve scope - JS DESCRIPTION: This JavaScript code
demonstrates how to use `scopeBind` to ensure that an effect call within an
asynchronous operation like `setInterval` is executed within the correct scope.
`scopeBind` creates a function that is bound to the current scope. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/api/effector/Scope.md#_snippet_4

LANGUAGE: javascript CODE:

```
const sendWithAuthFx = createEffect(async () => {
  // Now this function can be called safely
  // without adhering to the scope loss rules
  const sendMessage = scopeBind(sendMessageFx);

  await authUserFx();

  // There is no context inside setInterval, but our function is bound
  return setInterval(sendMessage, 500);
});
```

---

TITLE: Typing `sample` with `filter` and `fn` using type predicates in
TypeScript DESCRIPTION: This snippet illustrates how to use type predicates with
`filter` and `fn` in the `sample` function. It highlights the need to explicitly
define the type of the filter parameter to allow TypeScript to correctly infer
the type in `fn` after `filter`. This is necessary due to limitations in
TypeScript's type inference capabilities. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/essentials/typescript.mdx#_snippet_9

LANGUAGE: TypeScript CODE:

```
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

---

TITLE: Handling WebSocket Message Validation Errors - TypeScript DESCRIPTION:
This snippet demonstrates how to handle validation errors when parsing WebSocket
messages. It creates an event `validationError` that is triggered when the
`parseFx` effect fails to parse or validate a message. This allows you to handle
invalid messages gracefully and prevent errors in your application.
Dependencies: effector, zod. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/guides/websocket-integration.md#_snippet_7

LANGUAGE: typescript CODE:

```
const validationError = createEvent<Error>();

// Если парсинг не удался — обрабатываем ошибку
sample({
  clock: parseFx.failData,
  target: validationError,
});
```

---

TITLE: Implementing Message Parsing and Validation with Zod - Typescript
DESCRIPTION: Implements message parsing and validation using Zod to ensure that
received messages conform to the defined schema. It includes an effect to parse
raw messages, events for parsed messages and validation errors, and `sample` to
connect the data flow. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/en/guides/websocket-integration.md#_snippet_6

LANGUAGE: typescript CODE:

```
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

---

TITLE: Using effector-react/ssr hooks with fork (TSX) DESCRIPTION: This snippet
illustrates how to use `useGate` and `useStore` from the `effector-react/ssr`
entry point, which are compatible with `fork` for SSR. It sets up a Gate that
triggers an effect when opened, updates a store based on the effect's result,
and renders a component using the store's value within a `Provider` wrapping a
`fork`ed scope. SOURCE:
https://github.com/effector/effector/blob/master/CHANGELOG.md#_snippet_33

LANGUAGE: typescriptreact CODE:

```
import {value useGate, value useStore, value Provider} from 'effector-react/ssr'
import {value createGate} from 'effector-react'
import {value createDomain, value forward} from 'effector'
import {value fork} from 'effector/fork'

const app = createDomain()

const activeChatGate = createGate({domain: app})

const getMessagesFx = app.createEffect({
  async handler({chatId}) {
    return ['hi bob!', 'Hello, Alice']
  },
})

const $messagesAmount = app
  .createStore(0)
  .on(getMessagesFx.doneData, (_, messages) => messages.length)

forward({
  from: activeChatGate.open,
  to: getMessagesFx,
})

const ChatPage = ({chatId}) => {
  useGate(activeChatGate, {chatId})

  return (
    <div>
      <header>Chat {chatId}</header>
      <p>Messages total: {useStore($messagesAmount)}</p>
    </div>
  )
}
const App = ({root}) => (
  <Provider value={root}>
    <ChatPage chatId="chat01" />
  </Provider>
)

const scope = fork(app)

ReactDOM.render(<App root={scope} />, document.getElementById('root'))
```

---

TITLE: Extracting Unit Value Type with UnitValue (TypeScript) DESCRIPTION: This
snippet demonstrates how to use the `UnitValue` type utility to extract the data
type from various Effector units like events, stores, and effects. It shows how
`UnitValue` can be used to define types that represent the payload of an event,
the value of a store, or the parameters of an effect. The `fork` scope example
shows that without type definition `UnitValue` defaults to `any`. SOURCE:
https://github.com/effector/effector/blob/master/documentation/src/content/docs/ru/essentials/typescript.mdx#_snippet_15

LANGUAGE: typescript CODE:

```
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
