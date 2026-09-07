export default function Mind() {
  return (
    <div
      id="mind"
      title="Levelo Application"
      style={{
        padding: "32px",
        border: "2px solid royalblue",
      }}
    >
      <h1>Hello from Levelo</h1>

      <p>
        This interface was rendered through the Levelo Web Renderer.
      </p>

      <button
        id="hello-button"
        onclick={() => console.log("Hello from Levelo")}
      >
        Click Me
      </button>
    </div>
  );
}