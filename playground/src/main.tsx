import { render } from "levelojs";
import "./style.css";
import { state } from "levelojs";

function App() {
  const [n, setN] = state(0);
  return (
    <main>
        <h1>
         Levelo Js is Now 
         <span>Connected with saiful</span>
        </h1>

        <div>
            <p>I have successfully connected the rendering pipeline I built
            to the existing Levelo JS core architecture.
            </p>
            <span>{n()}</span>
        </div>

        <button 
            onclick={() => {console.log("Hello from levelo Js"); setN(n() + 1); console.log(n())}}>
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