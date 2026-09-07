import { render } from "levelojs";
import "./style.css";

function App() {
  return (
    <main>
        <h1>
         Levelo Js is Now 
         <span>Connected</span>
        </h1>

        <div>
            <p>I have successfully connected the rendering pipeline I built
            to the existing Levelo JS core architecture.
            </p>
        </div>

        <button 
            onclick={() => console.log("Hello from levelo Js")}>
            Click Me
        </button>
    </main>
  );
}

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app element.");
}

render(<App />, root);