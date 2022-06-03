import { Link } from "./components/Link";
import { Router } from "./components/Router";

function Home() {
  return <p>This is the home page.</p>;
}

function About() {
  return <p>This is the about page.</p>;
}

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

export default App;
