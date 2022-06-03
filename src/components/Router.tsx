import * as React from "react";
import { usePopstate } from "../hooks/usePopstate";
import { Page } from "./Page";

type RouteProps = { title: string; component: JSX.Element };
interface RouterProps {
  routes: {
    "/": RouteProps;
    [key: string]: RouteProps;
  };
}

export const Router = ({ routes }: RouterProps) => {
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
