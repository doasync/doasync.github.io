Of course. Here is the comprehensive internal engineering guide for Effector.

---

### **Internal Engineering Guide: Effector Best Practices**

**Document Version:** 1.0 **Last Updated:** June 7, 2024

This guide is the single source of truth for all engineers using Effector in our
codebase. Adherence to these principles is mandatory to ensure our applications
are scalable, maintainable, performant, and easy to reason about.

---

### **Table of Contents:**

**1. Core Philosophy: How We Think in Effector** _ **Separation of Concerns:**
Explain why we strictly separate business logic from UI logic. The UI triggers
events; Effector handles the rest. _ **Declarative over Imperative:** Describe
the importance of defining _what_ should happen, not _how_. _ **Events are
Facts:** Emphasize that events are immutable records of something that occurred,
not functions with logic. _ **Purity:** Explain the importance of pure functions
in reducers and mappers (`.on`, `.map`, `fn`) and how side effects are isolated
in `Effect`s and `watch`.

**2. State Modeling: The Art of the Store** _ **Principle of Atomic Stores:**
Mandate the use of small, single-responsibility stores. Explain why this is
better than large, monolithic stores (e.g., prevents unnecessary re-renders,
improves clarity). _ **Combining State:** Show how to use `combine` to create
derived views from atomic stores for components that need data from multiple
sources. _ **Derived Stores with `.map()`:** Detail the usage of `.map()` for
simple state transformations. _ **Store Updates:** _ The `.on(event, reducer)`
pattern for direct updates. _ The `.reset(event)` pattern for returning to the
initial state. _ Using `createApi` as a convenient shorthand for stores with
multiple, simple update events. _ **Immutability:** Stress the requirement for
immutability when updating stores with objects or arrays. Provide clear examples
of correct (`[...state, newItem]`) and incorrect (`state.push(newItem)`)
patterns. Recommend `immer` as an acceptable tool for deeply nested state.

**3. Unit Composition: The Central Nervous System** _ **`sample` is the Swiss
Army Knife (Mandatory):** _ Dedicate a significant portion of the guide to
`sample`. Explain that it is our **primary and mandatory tool** for connecting
units. _ Detail its various forms and use cases: _ **Clock and Source:** The
classic pattern for taking state at the moment an event happens. _
**Source-only:** For creating derived units (equivalent to `.map` or `combine`).
_ **Clock-only:** For forwarding a trigger without data transformation. _
**Source with objects/arrays of stores:** Emphasize this modern feature for
cleaner code. _ **Filtering:** How to use the `filter` property (with both
boolean stores and predicate functions) to conditionally trigger targets. _
**Data Transformation:** The role of the `fn` property. _ **Multiple Clocks and
Targets:** Using arrays in `clock` and `target`. _ **`attach` for Effect
Specialization:** _ Explain how `attach` is used to create specialized effects
from a base effect. _ Provide examples of `mapParams` and using `source` to
inject dependencies (like API tokens or user IDs) into an effect call. _
**DEPRECATED OPERATORS (Forbidden):** _ **`forward`:** State that `forward` is
deprecated and **must not be used**. Show how every `forward` use case can and
**must** be replaced with a `sample`. _ **`guard`:** State that `guard` is
deprecated and **must not be used**. Show how its functionality is fully
replaced by `sample` with the `filter` property.

**4. Asynchronous Operations: Mastering Effects** _ **Defining Effects:** How to
use `createEffect`. Naming convention (`...Fx`). _ **Handling Effect
Lifecycle:** Detail the usage of `.done`, `.fail`, `.finally`, and the
`.pending` store. Provide a complete example of wiring these up to handle UI
states (loading, errors). \* **Error Handling:** How to type errors in effects
and handle them gracefully using `.fail` and `.failData`.

**5. Framework Integration (`effector-react`)** _ **`useUnit` is the Only Hook
You Need:** _ Mandate the use of `useUnit` for all interactions between React
components and Effector units. _ Explain its benefits: batching updates, single
API for stores and events. _ Explicitly deprecate the use of older hooks like
`useStore` and `useEvent` in our codebase. \* **Gates for Component Lifecycle:**
Explain `createGate` and `useGate` for cases where component props or lifecycle
events (mount/unmount) need to trigger business logic.

**6. Advanced Patterns & Recipes** _ **Server-Side Rendering (SSR):** _ Explain
the concept of `Scope` and why it's crucial for isolating requests. _ Detail the
`fork` -> `allSettled` -> `serialize` flow on the server. _ Detail the `fork` ->
`hydrate` flow on the client. _ Stress the importance of SIDs and the role of
the Babel/SWC plugin. _ **Testing:** _ Explain the testing strategy using
`fork`. Each test runs in its own `Scope`. _ Show how to mock effect handlers
using `fork({ handlers: [...] })`. _ Show how to set initial store values using
`fork({ values: [...] })`. _ Demonstrate using `allSettled` to await
computations within a test. _ **Factories for Reusable Logic:** _ Explain when
to create a factory function (e.g., for a form field entity). \* Explain the
necessity of configuring the Babel/SWC plugin's `factories` option to ensure
unique SIDs for units created by factories.

**7. Tooling** _ **Babel/SWC Plugin:** State that this is a mandatory part of
our setup. Explain that it provides SIDs for SSR and names for debugging. _
**ESLint Plugin:** Mention `eslint-plugin-effector` as a tool we use to enforce
these best practices automatically.

**8. Quick Reference: Naming Conventions & Anti-Patterns** _ **Naming
Conventions:** _ Stores: `$camelCase` _ Events: `camelCase` (often in past
tense, e.g., `buttonClicked`) _ Effects: `camelCaseFx` _ **Anti-Patterns to
Avoid (Summary):** _ Calling `store.getState()` in business logic (use
`sample`'s `source` instead). _ Using `watch` for anything other than debugging
or framework interop. _ Putting complex logic or side effects in `map` or `fn`
functions. _ Creating monolithic stores. _ Calling events/effects imperatively
inside other effects (use `sample` instead). \* Placing business logic inside UI
components.

---

## 1. Core Philosophy: How We Think in Effector

To write effective, scalable, and maintainable code with Effector, every
engineer must internalize its core philosophy. This is not just a library; it's
a paradigm for structuring application logic.

### **Separation of Concerns**

We maintain a strict separation between business logic and UI logic. This is the
cornerstone of our architecture.

- **Business Logic (Effector):** This is the heart of the application. It
  defines what the application _does_—how data is fetched, transformed, and
  stored. It is composed entirely of Effector units (`events`, `stores`,
  `effects`) and is framework-agnostic.
- **UI Logic (React):** This is the presentation layer. Its sole
  responsibilities are to display state provided by Effector and to signal user
  intentions by calling Effector events. The UI should be as "dumb" as possible;
  it knows _nothing_ about how the business logic is implemented.

**Rationale:** This separation leads to a more robust and flexible system.
Business logic can be tested in isolation, reused across different UI
frameworks, and refactored without touching the UI, and vice-versa.

A user action in the UI triggers an **Event**. The rest of the logic unfolds
declaratively within the Effector model.

```tsx
// repo.model.ts - Business Logic
import { createEvent, createStore, createEffect, sample } from 'effector';

// Event – an immutable fact that an action occurred.
export const repoStarToggled = createEvent();

// Effects handle interactions with the outside world (e.g., APIs).
export const starRepoFx = createEffect(async () => {
  /* API call to star */
});
export const unstarRepoFx = createEffect(async () => {
  /* API call to unstar */
});

// Stores hold the state of our application.
export const $isRepoStarred = createStore(false);
export const $repoStarsCount = createStore(0);

// Logic is defined declaratively.
// When repoStarToggled is called, we invert the current state of $isRepoStarred.
sample({
  clock: repoStarToggled,
  source: $isRepoStarred,
  fn: (isRepoStarred) => !isRepoStarred,
  target: $isRepoStarred,
});

// When the star state becomes true, call the starRepoFx effect.
sample({
  clock: $isRepoStarred,
  filter: (isRepoStarred) => isRepoStarred,
  target: starRepoFx,
});
```

```tsx
// RepoStarButton.tsx - UI Logic
import { useUnit } from 'effector-react';
import {
  repoStarToggled,
  $isRepoStarred,
  $repoStarsCount,
} from './repo.model.ts';

export const RepoStarButton = () => {
  // The component only needs to know about the units it interacts with.
  const [onStarToggle, isRepoStarred, repoStarsCount] = useUnit([
    repoStarToggled,
    $isRepoStarred,
    $repoStarsCount,
  ]);

  return (
    <div>
      {/* The button's only job is to call the event. */}
      <button onClick={onStarToggle}>
        {isRepoStarred ? 'Unstar' : 'Star'}
      </button>
      {/* The span's only job is to display the state. */}
      <span>{repoStarsCount} Stars</span>
    </div>
  );
};
```

### **Declarative over Imperative**

We describe _what_ should happen, not _how_ or _when_. Instead of writing a
sequence of instructions, we define relationships between units. Effector's
reactive engine then ensures that updates propagate through the system
correctly.

- **Bad ❌ (Imperative):**

  ```typescript
  // Anti-pattern: Logic is hidden inside a watch, making it hard to trace.
  $user.watch((user) => {
    localStorage.setItem('user', JSON.stringify(user));
    api.trackUserUpdate(user);
    someEvent(user.id);
  });
  ```

- **Good ✅ (Declarative):**

  ```typescript
  // All logic is explicit and traceable.
  const saveToStorageFx = createEffect((user: User) =>
    localStorage.setItem('user', JSON.stringify(user)),
  );
  const trackUpdateFx = createEffect((user: User) => api.trackUserUpdate(user));

  sample({ clock: $user, target: [saveToStorageFx, trackUpdateFx] });
  sample({ clock: $user, fn: (user) => user.id, target: someEvent });
  ```

### **Events are Facts**

An **Event** is not a function to be filled with logic. It is an immutable,
public record of something that has occurred in the application.

- `formSubmitted`, `passwordChanged`, `appStarted`.
- Events simply announce what happened. They carry a payload but contain zero
  logic themselves.
- The logic _reacts_ to these events, typically via `sample` or `.on()`.

This mindset prevents the creation of tightly coupled code where events have
hidden side effects.

### **Purity**

Functions passed to Effector's operators like `.on()`, `.map()`, and
`sample({ fn })` **must be pure**. A pure function is one that, given the same
input, will always return the same output and has no observable side effects.

- **No API calls, no `localStorage` access, no DOM manipulation, and absolutely
  no calling other events or effects.**

All side effects must be isolated within **`createEffect`** handlers or, for
simple logging and framework interoperability, **`.watch()`**. Effector's
computation model relies on this purity to batch updates and guarantee a
predictable, synchronous execution flow. Violating this rule leads to
unpredictable behavior and defeats the purpose of the library.

- **Bad ❌ (Impure `map`):**
  ```typescript
  const derived = someHappened.map((number) => {
    another(); // THROWS! Calling a unit from a pure function is forbidden.
    return String(number);
  });
  ```
- **Good ✅ (Declarative Reaction):**

  ```typescript
  // Correct: The reaction is a separate, declarative statement.
  sample({
    clock: someHappened,
    target: another,
  });

  const derived = someHappened.map((number) => String(number));
  ```

## 2. State Modeling: The Art of the Store

How we structure our state is critical to the maintainability and performance of
our applications.

### **Principle of Atomic Stores**

**All stores must be atomic.** A store should have a single responsibility and
be as small as possible. We strictly forbid the creation of large, monolithic
stores that hold disparate parts of the application state.

**Rationale:**

- **Performance:** When a field in a monolithic store updates, all components
  subscribed to that store will re-render, even if they don't use the changed
  field. Atomic stores ensure that components only subscribe to and re-render
  for the precise pieces of state they need.
- **Clarity:** Atomic stores make the data flow easier to understand.
  `$currentUser`, `$postsList`, `$isSidebarOpen` are all self-descriptive and
  have a clear purpose.
- **Maintainability:** Small stores are easier to test, refactor, and reason
  about.

- **Bad ❌ (Monolithic Store):**
  ```typescript
  const $bigStore = createStore({
    profile: {/
  ```
- many fields \*/}, settings: {/
- many fields \*/}, posts: [ /
- many posts \*/ ] })

  ````* **Good ✅ (Atomic Stores):**
  ```typescript
  const $userName = createStore('');
  const $userEmail = createStore('');
  const $posts = createStore<Post[]>([]);
  const $settings = createStore<Settings>({});

  const UserName = () => {
    const name = useUnit($userName); // Only re-renders when the name changes.
    return <h1>{name}</h1>;
  };
  ````

### **Combining State**

When a component needs data from multiple atomic stores, we use `combine` to
create a derived, read-only view of that state. This keeps our state normalized
while providing convenient access for the UI.

```typescript
// State combination (no transformation)
const $form = combine({
  name: $name,
  age: $age,
  city: $city,
});

// State transformation
const $formValidation = combine($name, $age, (name, age) => ({
  isValid: name.length > 0 && age >= 18,
  errors: {
    name: name.length === 0 ? 'Required' : null,
    age: age < 18 ? 'Must be 18+' : null,
  },
}));
```

### **Derived Stores with `.map()`**

For simple, one-to-one state transformations, `.map()` is the appropriate tool.
It creates a new derived store that updates whenever its parent store updates.

```javascript
const $title = createStore('').on(changed, (_, newTitle) => newTitle);
const $length = $title.map((title) => title.length);
```

### **Store Updates**

- **`.on(event, reducer)`:** This is the standard pattern for updating a store's
  state in response to an event. The reducer function must be pure.

  ```javascript
  const $counter = createStore(0);
  $counter.on(incremented, (counter) => counter + 1);
  ```

- **`.reset(event)`:** Use this to reset a store to its initial state when one
  or more events are triggered.

  ```javascript
  .reset(formSubmitted, formReset)
  ```

- **`createApi`:** This is a useful shorthand for stores that have a set of
  simple, related update actions. It generates the events and binds them to the
  store in one step.
  ```typescript
  const $counter = createStore(0);
  const { increment, decrement, reset } = createApi($counter, {
    increment: (state) => state + 1,
    decrement: (state) => state - 1,
    reset: () => 0,
  });
  ```

### **Immutability**

**Store updates MUST be immutable.** Never mutate the existing `state` object or
array within a reducer. Always return a new object or array.

**Rationale:** Effector determines whether to update by doing a strict equality
check (`===`) between the old and new state. If you mutate the state, the
reference remains the same, and Effector will not detect a change, leading to no
updates.

- **Bad ❌ (Mutation):**

  ```typescript
  $items.on(addItem, (items, newItem) => {
    items.push(newItem); // Mutation! This will NOT trigger an update.
    return items;
  });

  $user.on(nameChanged, (user, newName) => {
    user.name = newName; // Mutation!
    return user;
  });
  ```

- **Good ✅ (New Reference):**

  ```typescript
  $items.on(addItem, (items, newItem) => {
    return [...items, newItem]; // Creates a new array.
  });

  $user.on(nameChanged, (user, newName) => ({
    ...user, // Creates a new object.
    name: newName,
  }));
  ```

For deeply nested state, manual immutability can be verbose. In these cases,
using the **`immer`** library is permitted and encouraged.

- **Good ✅ (with Immer):**

  ```typescript
  import { produce } from 'immer';

  $users.on(userUpdated, (users, updatedUser) =>
    produce(users, (draft) => {
      const user = draft.find((u) => u.id === updatedUser.id);
      if (user) {
        user.profile.settings.theme = updatedUser.profile.settings.theme;
      }
    }),
  );
  ```

## 3. Unit Composition: The Central Nervous System

How we connect our units is the most critical aspect of our Effector
architecture. It defines the entire data flow of the application.

### **`sample` is the Swiss Army Knife (Mandatory)**

**`sample` is our primary and mandatory tool for creating relationships between
units.** It is powerful, declarative, and covers virtually every use case for
data flow.

#### **Classic Pattern: `clock` and `source`**

This is the most common use case: when an event on `clock` occurs, take the
current value from `source` and pass it to `target`.

```javascript
const submitForm = createEvent();
const $userName = createStore('john');
const signInFx = createEffect((params) => console.log(params));

sample({
  clock: submitForm, // 1. When submitForm is called...
  source: $userName, // 2. take the current value of $userName...
  fn: (name, password) => ({ name, password }), // 3. transform the data...
  target: signInFx, // 4. and call signInFx with the result.
});

submitForm('12345678'); // signInFx will be called with { name: 'john', password: '12345678' }
```

#### **Source-only for Derivation**

If `clock` is omitted, `sample` triggers whenever `source` updates. This is a
powerful way to create derived stores.

```typescript
const $currentUser = createStore({ name: 'Bob', age: 25 });

// This derived store updates whenever $currentUser changes.
const $userAge = sample({
  source: $currentUser,
  fn: (user) => user.age,
}); // Equivalent to $currentUser.map(user => user.age)
```

#### **Source with Objects/Arrays of Stores**

To avoid intermediate `combine` calls, you can pass an object or array of stores
directly to `source`. This is the preferred modern approach.

```typescript
const searchClicked = createEvent();
const $searchQuery = createStore('');
const $filters = createStore<string[]>([]);
const submitSearchFx = createEffect((params) => {
  /* ... */
});

sample({
  clock: searchClicked,
  source: {
    query: $searchQuery,
    filters: $filters,
  },
  target: submitSearchFx,
});
```

#### **Filtering**

Use the `filter` property to conditionally trigger the `target`. It can be a
boolean store or a pure predicate function.

```typescript
const $isEnabled = createStore(true);

sample({
  clock: buttonClicked,
  filter: $isEnabled, // The target will only be triggered if $isEnabled is true.
  target: actionExecuted,
});

sample({
  clock: submitForm,
  source: $formData,
  filter: (form) => form.age >= 18, // Predicate function
  target: submitToServerFx,
});
```

#### **Multiple Clocks and Targets**

You can pass arrays to `clock` and `target` to handle many-to-many relationships
concisely.

```typescript
// Any of these events will trigger the save.
sample({
  clock: [saveButtonClicked, ctrlSPressed, autoSaveTriggered],
  source: $formData,
  target: saveDocumentFx,
});

// When userUpdated is called, all units in the target array are triggered.
sample({
  clock: userUpdated,
  target: [saveUserFx, logUserFx, $lastUserData, userDataReceived],
});
```

### **`attach` for Effect Specialization**

`attach` is used exclusively for creating a new, specialized `Effect` from a
base `Effect`. Its primary use case is to inject dependencies from stores or to
pre-process parameters.

**Rationale:** This promotes reusability. You can have a generic `requestFx` and
create specialized versions like `fetchUsersFx` or `updatePostFx` that are
pre-configured with the correct endpoint, method, or authentication token.

```typescript
// Base effect for all API requests.
const baseSendMessageFx = createEffect<SendMessageParams, void>(
  async ({ text, token }) => {
    // ...
  },
);

const $authToken = createStore('default-token');

// Specialized effect that automatically injects the auth token from the store.
const sendMessageFx = attach({
  effect: baseSendMessageFx,
  source: $authToken,
  mapParams: (text: string, token: string) => ({
    // mapParams prepares the payload for the base effect.
    text,
    token,
  }),
});

// The public-facing effect is now simpler to call.
sendMessageFx('Hello!'); // token is automatically sourced from $authToken
```

### **DEPRECATED OPERATORS (Forbidden)**

The following operators are deprecated in Effector and **MUST NOT BE USED** in
our codebase. They are less powerful than `sample` and lead to less readable
code.

#### **`forward`**

`forward` is fully replaceable by `sample`.

- **Bad ❌:**
  ```javascript
  forward({ from: event, to: $store });
  ```
- **Good ✅:**
  ```javascript
  sample({ clock: event, target: $store });
  ```

#### **`guard`**

`guard` is fully replaceable by `sample` with the `filter` property.

- **Bad ❌:**
  ```javascript
  guard({
    clock: clickRequest,
    filter: $isIdle,
    source: $clicks,
    target: fetchRequest,
  });
  ```
- **Good ✅:**
  ```javascript
  sample({
    clock: clickRequest,
    filter: $isIdle,
    source: $clicks,
    target: fetchRequest,
  });
  ```

## 4. Asynchronous Operations: Mastering Effects

Effects are the designated tool for all side effects, especially asynchronous
operations.

### **Defining Effects**

Use `createEffect` to wrap any function that interacts with the outside world.
By convention, all effects **must** be suffixed with `Fx`.

```typescript
// The effect wraps the async API call.
const fetchUserFx = createEffect(async (id: number) => {
  const response = await fetch(`/api/user/${id}`);
  if (!response.ok) throw new Error('User not found');
  return response.json();
});
```

### **Handling Effect Lifecycle**

Effects provide built-in units to reactively handle their entire lifecycle. This
is the standard pattern for managing loading and error states in the UI.

- `.pending`: A `Store<boolean>` that is `true` while the effect is running.
- `.done`: An `Event` that fires on successful completion. Its payload is
  `{ params, result }`.
- `.doneData`: A convenience `Event` that fires with just the `result`.
- `.fail`: An `Event` that fires on failure. Its payload is `{ params, error }`.
- `.failData`: A convenience `Event` that fires with just the `error`.
- `.finally`: An `Event` that fires on both success and failure, containing the
  `status`.

```typescript
// Stores to hold the state
const $user = createStore(null);
const $error = createStore<string | null>(null);
const $isLoading = fetchUserFx.pending; // The pending store is perfect for loading states.

// Update the user store on success.
$user.on(fetchUserFx.doneData, (_, user) => user);

// Update the error store on failure.
$error.on(fetchUserFx.failData, (_, error) => error.message);

// Clear the error when a new request succeeds.
$error.reset(fetchUserFx.done);

// Triggering the flow
sample({
  clock: submit,
  source: $id,
  target: fetchUserFx,
});
```

### **Error Handling**

You can provide a type for the error as the third generic argument to
`createEffect`. This allows for type-safe error handling in `.fail` and
`.failData` listeners.

```typescript
interface ApiError {
  code: number;
  message: string;
}

const fetchUserFx = createEffect<string, User, ApiError>(async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    // Throwing a typed error.
    throw {
      code: response.status,
      message: 'Failed to fetch user',
    } as ApiError;
  }
  return response.json();
});

// The `error` payload is now strongly typed as `ApiError`.
fetchUserFx.fail.watch(({ error }) => {
  console.error(error.message);
});
```

## 5. Framework Integration (`effector-react`)

We use `effector-react` for bindings between our business logic and React
components.

### **`useUnit` is the Only Hook You Need**

For all interactions between React components and Effector units, **`useUnit` is
the only hook that must be used.**

**Rationale:**

- **Unified API:** It provides a single, consistent way to consume stores, call
  events, and call effects.
- **Performance:** It automatically batches updates from multiple stores,
  preventing unnecessary re-renders. If you subscribe to `$a` and `$b`, and they
  both update in the same tick, `useUnit` ensures your component re-renders only
  once.
- **Scope-aware:** It correctly binds events and effects to the current `Scope`,
  which is essential for SSR and testing.

The older hooks `useStore` and `useEvent` are considered **deprecated** in our
codebase and must not be used in new code. Existing code should be migrated to
`useUnit` when feasible.

- **Bad ❌ (Old Hooks):**

  ```typescript
  const foo = useStore($foo);
  const bar = useStore($bar);
  const onSubmit = useEvent(triggerSubmit);
  ```

- **Good ✅ (Unified Hook):**
  ```typescript
  const { foo, bar, onSubmit } = useUnit({
    foo: $foo,
    bar: $bar,
    onSubmit: triggerSubmit,
  });
  // or for arrays:
  const [foo, bar, onSubmit] = useUnit([$foo, $bar, triggerSubmit]);
  ```

### **Gates for Component Lifecycle**

`Gate`s are a specialized tool for when business logic needs to react to a
component's lifecycle (mounting/unmounting) or receive data directly from its
props. This is common for logic tied to a specific page or for integrating with
libraries like React Router.

```javascript
const TodoGate = createGate();

// The effect is triggered whenever the Gate is mounted or its props change.
sample({ clock: TodoGate.state, target: getTodoFx });

function TodoPage({ id }) {
  // Pass props to the Gate.
  useGate(TodoGate, { id });

  // ... render logic
}
```

## 6. Advanced Patterns & Recipes

### **Server-Side Rendering (SSR)**

Our applications must support SSR for performance and SEO. Effector's Fork API
is designed for this.

- **`Scope`:** A `Scope` is a completely isolated instance of the application's
  state. On a server, every incoming request gets its own `Scope` to prevent
  data leaks between users.
- **Server Flow:**
  1.  `fork()`: Create a new `Scope` for the request. You can provide initial
      `values` for stores (e.g., from the request URL).
  2.  `allSettled(event, { scope })`: Trigger the initial application event
      (e.g., `appStarted`) within the created `scope`. `allSettled` returns a
      promise that resolves after all triggered effects and their children have
      completed.
  3.  `serialize(scope)`: Convert the final state of all stores within the scope
      into a plain JavaScript object, where keys are store SIDs. This object is
      then stringified and embedded in the HTML response.
- **Client Flow:**
  1.  The client reads the serialized state from the HTML (e.g., from
      `window._SERVER_STATE_`).
  2.  `fork({ values: serverState })`: A new `scope` is created on the client,
      this time hydrated with the values from the server.
  3.  This client `scope` is passed to the `<Provider value={scope}>`. React's
      `hydrateRoot` then attaches to the server-rendered HTML, and the UI is now
      interactive and in sync with the server-calculated state.
- **SIDs (Stable IDs):** For `serialize` and `hydrate` to work, every store must
  have a unique and stable ID (`sid`) that is consistent between the server and
  client builds. The Babel/SWC plugin handles this automatically.

### **Testing**

Our testing strategy mirrors the SSR flow and is built on the Fork API.

- **Isolation:** Each test case (`it` block) **must** create its own `Scope`
  using `fork()`. This guarantees that tests are completely isolated and do not
  interfere with each other.
- **Mocking Effects:** To mock API calls or other side effects, pass a
  `handlers` array to `fork`. This replaces the effect's handler _only within
  that scope_.
  ```typescript
  test('main case', async () => {
    const scope = fork({
      handlers: [
        // The real effect is not called; this mock is used instead.
        [validateClickFx, () => true],
      ],
    });
    // ...
  });
  ```
- **Setting Initial State:** To set up a specific scenario, pass a `values`
  array to `fork`.
  ```typescript
  test('bad case', async () => {
    const scope = fork({
      values: [
        // Set the initial state of $clicksCount for this test.
        [$clicksCount, 101],
      ],
      // ...
    });
    // ...
  });
  ```
- **Awaiting Computations:** Use `allSettled` to trigger an event or effect
  within the test's scope and wait for all resulting computations to complete
  before making assertions.
  ```typescript
  await allSettled(buttonClicked, { scope });
  expect(scope.getState($clicksCount)).toEqual(101);
  ```

### **Factories for Reusable Logic**

A factory is a function that creates a set of Effector units. We use factories
to encapsulate and reuse common state management patterns (e.g., a form field
entity with value, error, and validation logic).

**Problem:** If a factory creates stores, multiple calls to that factory will
produce stores with identical SIDs, breaking SSR. **Solution:** The Babel/SWC
plugin must be configured to recognize these functions as factories. Add the
module path of the factory to the `factories` array in the plugin's
configuration (`.babelrc` or `next.config.js`).

```json
// .babelrc
{
  "plugins": [
    [
      "effector/babel-plugin",
      {
        "factories": ["@/shared/lib/create-name", "patronum/create-debounce"]
      }
    ]
  ]
}
```

This configuration tells the plugin to wrap calls to functions from these
modules, ensuring that all units created within them get a unique `sid` prefix.

## 7. Tooling

- **Babel/SWC Plugin:** Usage of `effector/babel-plugin` or
  `@effector/swc-plugin` is **mandatory** for all projects. It is not an
  optional development tool. It is essential for:
  - Generating stable SIDs for SSR and testing.
  - Adding debug names to units, which aids in debugging.
- **ESLint Plugin:** We use `eslint-plugin-effector` to automatically enforce
  the rules in this guide, including the use of `sample`, purity rules, and
  correct hook usage. This plugin should be configured in all projects.

## 8. Quick Reference: Naming Conventions & Anti-Patterns

### **Naming Conventions**

- **Stores:** Must be prefixed with a dollar sign (`$`). E.g., `$user`,
  `$productsList`.
- **Events:** Must be `camelCase`. Often in the past tense to signify a fact
  that has occurred. E.g., `buttonClicked`, `formSubmitted`.
- **Effects:** Must be `camelCase` and suffixed with `Fx`. E.g., `fetchUserFx`,
  `loginFx`.

### **Anti-Patterns to Avoid (Summary)**

- **❌ Calling `store.getState()` in business logic.** This is an imperative
  escape hatch that breaks reactivity and makes code hard to test.
  - **✅ Instead:** Use `sample` and pass the store to the `source` property.
- **❌ Using `watch` for anything other than debugging.** Business logic should
  never be placed in a `watch`.
  - **✅ Instead:** Use `sample` to trigger other units or `createEffect` for
    side effects.
- **❌ Putting side effects or unit calls in `.map` or `sample({ fn })`.** These
  functions must be pure.
  - **✅ Instead:** Isolate side effects in `createEffect` and use `sample` to
    trigger them.
- **❌ Creating monolithic stores.**
  - **✅ Instead:** Create small, atomic stores and use `combine` to create
    views of state.
- **❌ Calling events/effects imperatively inside other effects.** This creates
  an untraceable, imperative call stack.
  - **✅ Instead:** Use `sample` to declaratively chain units based on an
    effect's lifecycle events (e.g., `loginFx.doneData`).
- **❌ Placing business logic inside UI components.** The UI's job is to trigger
  events and display state.
  - **✅ Instead:** All business logic resides in Effector units (`.model.ts`
    files).
