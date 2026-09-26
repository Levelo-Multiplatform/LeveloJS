import { state } from "levelojs";

export function App() {
  const [value, setValue] = state(0);
  const [showDynamic, setShowDynamic] = state(false);

  console.log("[App] render — value:", value(), "showDynamic:", showDynamic());

  return (
    <main id="top">
      <header>
        <h1>LeveloJS Web Renderer Test</h1>

        <p>
          A simple static page for testing the LeveloJS renderer and exploring
          the web elements supported by the JSX architecture.
        </p>

        <nav>
          <a href="#state">State</a>
          <a href="#text">Text</a>
          <a href="#lists">Lists</a>
          <a href="#media">Media</a>
          <a href="#forms">Forms</a>
          <a href="#table">Table</a>
          <a href="#interactive">Interactive</a>
        </nav>
      </header>

      <hr />

      <section id="state">
        <h2>Reactive Renderer</h2>

        <p>
          Count: <strong>{value()}</strong>
        </p>

        <button
          type="submit"
          onClick={() => {
            const before = value();
            console.log("[Increment] before:", before);
            setValue(before + 1);
            const after = value();
            console.log(
              "[Increment] after:",
              after,
              "| read-after-write consistent?",
              after === before + 1,
            );
          }}
        >
          Increment
        </button>

        <button
          type="button"
          onClick={() => {
            const before = showDynamic();
            console.log("[Toggle] before:", before);
            setShowDynamic(!before);
            console.log("[Toggle] after:", showDynamic());
          }}
        >
          {showDynamic()
            ? "Hide Dynamic Content"
            : "Show Dynamic Content"}
        </button>

        <div>
          <span>Before dynamic content</span>
          <br />

          {showDynamic() ? (
            <p>
              Dynamic content is visible. Count: {value()}
            </p>
          ) : null}

          <span>After dynamic content</span>
        </div>
      </section>

      <hr />

      <section id="text">
        <h2>Text Elements</h2>

        <h3>Heading Three</h3>
        <h4>Heading Four</h4>
        <h5>Heading Five</h5>
        <h6>Heading Six</h6>

        <p>
          This is a paragraph with <strong>strong text</strong>,
          <em>emphasized text</em>, <mark>highlighted text</mark>,
          <small>small text</small>, <del>deleted text</del>, and{" "}
          <ins>inserted text</ins>.
        </p>

        <p>
          Mathematical text:
          H<sub>2</sub>O and E=mc<sup>2</sup>
        </p>

        <p>
          Inline code: <code>render(&lt;App /&gt;, root)</code>
        </p>

        <blockquote>
          Good software should make complicated things easier to understand.
        </blockquote>

        <pre>
{`function App() {
  return <h1>Hello LeveloJS</h1>;
}`}
        </pre>
      </section>

      <hr />

      <section id="lists">
        <h2>List Elements</h2>

        <h3>Unordered List</h3>

        <ul>
          <li>Web Renderer</li>
          <li>Shared Core</li>
          <li>Android Renderer</li>
          <li>Platform Adapters</li>
        </ul>

        <h3>Ordered List</h3>

        <ol>
          <li>Create component</li>
          <li>Render component</li>
          <li>Attach events</li>
          <li>Verify DOM output</li>
        </ol>

        <h3>Description List</h3>

        <dl>
          <dt>LeveloJS</dt>
          <dd>A JavaScript rendering system.</dd>

          <dt>Renderer</dt>
          <dd>Converts LeveloJS elements into platform elements.</dd>
        </dl>
      </section>

      <hr />

      <section id="media">
        <h2>Media Elements</h2>

        <figure>
          <img
            src="https://picsum.photos/600/300"
            alt="Random test image"
            width={600}
            height={300}
          />

          <figcaption>
            Image element rendered by LeveloJS.
          </figcaption>
        </figure>

        <p>
          Test external link:{" "}
          <a
            href="https://example.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Example
          </a>
        </p>
      </section>

      <hr />

      <section id="interactive">
        <h2>Interactive Elements</h2>

        <button
          type="button"
          onClick={() => {
            console.log("[Interactive] Click Me clicked");
          }}
        >
          Click Me
        </button>

        <button
          type="button"
          onClick={() => {
            console.log("[Interactive] Show Alert clicked");
            alert("LeveloJS event handling works!");
          }}
        >
          Show Alert
        </button>

        <details>
          <summary>Open Details</summary>

          <p>
            This content is revealed when the details element is opened.
          </p>
        </details>
      </section>

      <hr />

      <section id="forms">
        <h2>Form Elements</h2>

        <form
          onSubmit={(event: Event) => {
            event.preventDefault();
            console.log("[Form] submitted");
          }}
        >
          <fieldset>
            <legend>User Information</legend>

            <label htmlFor="name">
              Name
            </label>

            <input
              id="name"
              type="text"
              placeholder="Enter your name"
              onInput={(event: Event) => {
                const target = event.currentTarget as HTMLInputElement;
                console.log("[Form] name input:", target.value);
              }}
            />

            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="you@example.com"
            />

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter password"
            />

            <label htmlFor="age">
              Age
            </label>

            <input
              id="age"
              type="number"
              min={1}
              max={100}
            />

            <label htmlFor="birthday">
              Date
            </label>

            <input
              id="birthday"
              type="date"
            />

            <label htmlFor="country">
              Country
            </label>

            <select
              id="country"
              onChange={(event: Event) => {
                const target = event.currentTarget as HTMLSelectElement;
                console.log("[Form] country changed:", target.value);
              }}
            >
              <option value="">
                Select a country
              </option>

              <option value="nigeria">
                Nigeria
              </option>

              <option value="ghana">
                Ghana
              </option>

              <option value="kenya">
                Kenya
              </option>
            </select>

            <label htmlFor="message">
              Message
            </label>

            <textarea
              id="message"
              rows={5}
              placeholder="Write something..."
            />

            <p>Preferred platform</p>

            <label>
              <input
                type="radio"
                name="platform"
                value="web"
              />
              Web
            </label>

            <label>
              <input
                type="radio"
                name="platform"
                value="android"
              />
              Android
            </label>

            <label>
              <input
                type="checkbox"
                name="agreement"
              />
              I agree to the test conditions
            </label>

            <label htmlFor="volume">
              Volume
            </label>

            <input
              id="volume"
              type="range"
              min={0}
              max={100}
              value={50}
            />

            <button type="submit">
              Submit Form
            </button>

            <button type="reset">
              Reset
            </button>
          </fieldset>
        </form>
      </section>

      <hr />

      <section id="table">
        <h2>Table Elements</h2>

        <table>
          <caption>
            LeveloJS Renderer Test
          </caption>

          <thead>
            <tr>
              <th>Element</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Heading</td>
              <td>Text</td>
              <td>Testing</td>
            </tr>

            <tr>
              <td>Button</td>
              <td>Interactive</td>
              <td>Testing</td>
            </tr>

            <tr>
              <td>Input</td>
              <td>Form</td>
              <td>Testing</td>
            </tr>

            <tr>
              <td>Table</td>
              <td>Structure</td>
              <td>Testing</td>
            </tr>
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={3}>
                Renderer element test
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <hr />

      <section>
        <h2>Progress Elements</h2>

        <p>Download progress:</p>

        <progress
          value={70}
          max={100}
        >
          70%
        </progress>

        <p>System capacity:</p>

        <meter
          min={0}
          max={100}
          value={45}
        >
          45%
        </meter>
      </section>

      <hr />

      <footer>
        <p>
          LeveloJS Web Renderer Test Page
        </p>

        <a href="#top">
          Back to top
        </a>
      </footer>
    </main>
  );
}