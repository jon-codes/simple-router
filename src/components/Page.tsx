import * as React from "react";

interface PageProps {
  title: string;
  children: React.ReactNode;
}

export const Page = React.forwardRef<HTMLHeadingElement, PageProps>(
  function Page({ title, children }, contentRef) {
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
  }
);
