import * as React from "react";

export const usePopstate = (handler: (e: PopStateEvent) => void) => {
  React.useEffect(() => {
    window.addEventListener("popstate", handler);

    return () => window.removeEventListener("popstate", handler);
  }, [handler]);
};
