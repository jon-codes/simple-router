# simple-router

This is the code for a simple React client-side router described below.

To install dependencies, run `npm install`.

To start the development server, run `npm run dev`.

## Implementation notes

I've been designing a text-based game in React, which calls for a client-side router.

My requirements for this router are pretty simple. I don't need to parse dynamic routes, or handle query parameters. Since this is a game, not long-form content, I'm not particularly concerned about restoring scroll positions.

The only core requirements are:

1. Provide client-side, pathname-based routing using a component-based configuration
2. Provide hyperlinks that update the pathname without a page reload

Of course, things are slightly more complicated than that. Traditional server-side routing is great for accessibility. Client-side routers have to both override default browser behavior and attempt to rebuild the default screen-reader friendly experience from scratch.

Still, there are cases when SPAs are appropriate, and I think a backend-less game with a loop measured in milliseconds is among them. It's also an opportunity to learn about the implementation details that get abstracted away when you reach for React Router every time you write a web app.

I'm not an accessibility expert, but I'll be handling the absolute basics:

1. Redirecting focus to new page content on navigation
2. Updating the document title
3. Indicating active links

Let's get started.

## A simple router implementation

The router implementation consists of 3 components:

- `<Router>`, which accepts a mapping of routes to components, rendering the component that matches the current route.
- `<Page>`, which wraps a route component with special behavior:
  - Updates the document title when a page is rendered
  - Renders an `<h1>` element containing the page title, which receives focus when client-side navigation occurs
- `<Link>`, which renders an `<a>` tag with special behavior:
  - Navigates to a client-side route, without triggering a page reload
  - Indicates the current page via `aria-current`

Here's what using the router in a simple app looks like:

```tsx
function App() {
  return (
    <>
      <a href="#content" className="sr-only">
        Skip to content
      </a>
      <nav>
        <Link href="/">Home</Link> | <Link href="/about">About</Link>
      </nav>
      <Router
        routes={{
          "/": { title: "Home", component: <Home /> },
          "/about": { title: "About", component: <About /> },
        }}
      />
    </>
  );
}
```

## Programmatic client-side navigation

To start, let's decide what will actually occur when we perform client-side navigation:

First, we'll push a new entry to the history stack via [`History.pushState()`](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState), unless the target href is equal to the current pathname (in which case we replace the current entry). [^1]

[^1]: This prevents adding duplicate adjacent history elements with the same href. Otherwise, if a user clicked a link to the same route twice, they would have to press the back button twice to return to the previous page.

```tsx
// programmatically navigate to an href

const href = "/example";

if (href === window.location.pathname) {
  window.history.replaceState({}, "", href);
} else {
  window.history.pushState({}, "", href);
}
```

This immediately updates the current URL, without attempting to load the new page (which we'll be rendering client-side). I'll describe why we're setting state to an empty object in the [Router component section](#router-component).

Components will also need to be notified that an internal navigation event has occurred. The Window [`popstate`](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event) event is dispatched whenever a user navigates the session history using their browser (e.g., pressing the Back button).

Calling `History.pushState()` does not dispatch `popstate` by default, but we can do so manually:

```tsx
// notify listeners of internal navigation events

window.dispatchEvent(new PopStateEvent("popstate"));
```

Now `popstate` serves as our signal to any listeners that a navigation event has occurred.

## usePopstate hook

Since we'll be listening to the `popstate` event in multiple components, we can abstract attaching those listeners into a generic hook that accepts a handler function:

```tsx
const usePopstate = (handler: (e: PopStateEvent) => void) => {
  React.useEffect(() => {
    window.addEventListener("popstate", handler);

    return () => window.removeEventListener("popstate", handler);
  }, [handler]);
};
```

## Link component

Using the techniques above, we have everything we need to create our `<Link>` component. `<Link>` needs to:

1. Render a native anchor element
2. Perform the client-side navigation described above, on click
3. Correctly describe whether the href targets the current page

```tsx
interface LinkProps extends React.HTMLProps<HTMLAnchorElement> {
  children: React.ReactNode;
}

const Link = ({ href, children, ...rest }: LinkProps) => {
  const [isCurrent, setIsCurrent] = React.useState(
    href === window.location.pathname
  );

  const handlePopstate = React.useCallback(
    () => setIsCurrent(href === window.location.pathname),
    [href]
  );

  usePopstate(handlePopstate);

  const handleOnClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (!isCurrent) window.history.pushState({}, "", href);

    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <a
      href={href}
      onClick={handleOnClick}
      aria-current={isCurrent ? "page" : undefined}
      {...rest}
    >
      {children}
    </a>
  );
};
```

The `handleOnClick` function overrides the default hyperlink behavior with the client-side navigation logic from above.

When a navigation event occurs, `handlePopstate` sets `isCurrent` in component state by comparing the current pathname and the target href. If the value has changed, the component will re-render, updating the anchor's [`aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) attribute.

## Page component

Since no page load actually occurs with a `<Link>` anchor, focus will unintuitively remain on the element itself after clicking. Client-side routers need to manually move focus somewhere that makes sense.

Common recommendations for navigation focus management [^2] include:

[^2]: [https://www.gatsbyjs.com/blog/2019-07-11-user-testing-accessible-client-routing/](https://www.gatsbyjs.com/blog/2019-07-11-user-testing-accessible-client-routing/)

1. Setting focus on a wrapper element containing the new page
2. Setting focus on a heading element with the title of the new page
3. Setting focus on the top of the application
4. Announcing navigation with an ARIA Live Region
5. A combination of the above

I'm using option #2, because it's simple to implement and has the advantage of causing screen readers to immediately announce the new content. (The header can additionally serve as the target for a traditional "skip navigation" [^3] link, as shown in the example app above)

[^3]: [https://webaim.org/techniques/skipnav/](https://webaim.org/techniques/skipnav/)

To that end, `<Page>` accepts a forwarded reference to the page title heading element. The parent component can use this reference to manage focus as needed:

```tsx
interface PageProps {
  title: string;
  children: React.ReactNode;
}

const Page = React.forwardRef<HTMLHeadingElement, PageProps>(function Page(
  { title, children },
  contentRef
) {
  React.useEffect(() => {
    document.title = `My App Name: ${title}`;
  }, [title]);

  return (
    <main>
      <h1 tabIndex={-1} id="content" ref={contentRef}>
        {title}
      </h1>
      {children}
    </main>
  );
});
```

Notice that the `<Page>` wrapper also updates the document title based on the current page title.

## Router component

The `<Router>` component receives the map of routes to components. On initial load and each navigation event, the router renders the matching component (falling back to the root component if no match is found).

```tsx
type RouteProps = { title: string; component: JSX.Element };

interface RouterProps {
  routes: {
    "/": RouteProps;
    [key: string]: RouteProps;
  };
}

const Router = ({ routes }: RouterProps) => {
  const contentRef = React.useRef<HTMLHeadingElement>(null);

  const [pathname, setPathname] = React.useState(window.location.pathname);
  const { title, component } = routes[pathname] || routes["/"];

  const handlePopstate = React.useCallback(() => {
    if (window.history.state !== null) {
      setPathname(window.location.pathname);

      if (!contentRef.current) {
        throw Error("contentRef must be assigned by <Page> component");
      }

      contentRef.current.focus();
    }
  }, []);

  usePopstate(handlePopstate);

  return (
    <Page title={title} ref={contentRef}>
      {component}
    </Page>
  );
};
```

There are a few things going on here that warrant explanation:

First, the `contentRef` reference is forwarded to the `<Page>` component, as described above.

We're using the value of `window.history.state` to determine whether we execute any of the logic in the `handlePopstate()` callback.

On first load, I'd like the focus to default to the document body, as in a normal page load. From there, the user can interact with the skip navigation link to jump to the content, or interact with the navigation menu.

On subsequent navigation events, however, focus should be assigned to the `contentRef` element

Some browsers (e.g. Safari, old versions of Chrome) dispatch a `popstate` event on page load. In this case, the state value of the history will be `null`. However, when we perform navigation via a `<Link>`, we're setting the state to a non-null empty object. Checking for null before setting state or updating focus prevents both double rendering and unintuitively changing focus on initial page load.

Finally, since `handlePopState()` keeps the current pathname updated in state, `<Router>` can use that value to look up the correct page component to render.
