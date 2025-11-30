class MemoryStorage {
  constructor() {
    this._data = new Map();
  }

  get length() {
    return this._data.size;
  }

  key(index) {
    const keys = Array.from(this._data.keys());
    return index >= 0 && index < keys.length ? keys[index] : null;
  }

  getItem(key) {
    const value = this._data.get(String(key));
    return typeof value === "undefined" ? null : value;
  }

  setItem(key, value) {
    this._data.set(String(key), String(value));
  }

  removeItem(key) {
    this._data.delete(String(key));
  }

  clear() {
    this._data.clear();
  }
}

if (typeof window !== "undefined") {
  if (!window.localStorage) {
    Object.defineProperty(window, "localStorage", {
      value: new MemoryStorage(),
      configurable: true
    });
  }

  if (!window.matchMedia) {
    window.matchMedia = (query) => {
      return {
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    };
  }
}

if (typeof document !== "undefined") {
  if (!document.body) {
    document.body = document.createElement("body");
  }

  document.body.innerHTML = `
    <div id="app">
      <p id="status"></p>
      <div class="controls">
        <input id="searchInput" type="search" />
        <select id="categorySelect"></select>
        <label>
          <input id="groupByCategory" type="checkbox" checked />
        </label>
        <button id="settingsButton" type="button">
          <svg
            class="settings-button-icon"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M3 5.25H15M3 9H15M3 12.75H15"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          Settings
        </button>
      </div>
      <main id="categories"></main>
      <div id="emojiContextMenu" class="emoji-context-menu emoji-context-menu-hidden"></div>
      <div
        id="settingsOverlay"
        class="settings-overlay settings-hidden"
        aria-hidden="true"
      >
        <div class="settings-panel" role="dialog" aria-modal="true">
          <header class="settings-panel-header">
            <button
              id="closeSettingsButton"
              type="button"
              class="settings-icon-button"
              aria-label="Close settings"
            >
              ×
            </button>
          </header>

          <section class="settings-section">
            <button
              id="resetAllUsageButton"
              type="button"
              class="settings-danger-button"
            >
              Reset all usage
            </button>
          </section>

          <section class="settings-section">
            <table class="settings-usage-table">
              <thead>
                <tr>
                  <th scope="col">Emoji</th>
                  <th scope="col">Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody id="emojiUsageTableBody"></tbody>
            </table>
          </section>

          <section class="settings-section">
            <div class="settings-theme-options">
              <label>
                <input
                  type="radio"
                  name="themePreference"
                  value="system"
                  checked
                />
                System
              </label>
              <label>
                <input
                  type="radio"
                  name="themePreference"
                  value="light"
                />
                Light
              </label>
              <label>
                <input
                  type="radio"
                  name="themePreference"
                  value="dark"
                />
                Dark
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  if (!document.execCommand) {
    document.execCommand = () => true;
  }
}
