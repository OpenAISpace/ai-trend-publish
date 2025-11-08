import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container missing");
}

const root = createRoot(container);

const render = () => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

render();

if (import.meta.hot) {
  import.meta.hot.accept(render);
}
