import * as React from "react";
import { usePopstate } from "../hooks/usePopstate";

interface LinkProps extends React.HTMLProps<HTMLAnchorElement> {
  children: React.ReactNode;
}

export const Link = ({ href, children, ...rest }: LinkProps) => {
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

    if (isCurrent) {
      window.history.replaceState({}, "", href);
    } else {
      window.history.pushState({}, "", href);
    }

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
