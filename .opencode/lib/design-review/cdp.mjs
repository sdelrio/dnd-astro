/**
 * A Chrome DevTools Protocol client built on the WebSocket that ships in Node.
 *
 * Zero dependencies, deliberately. ADR-0007 forbids a headless browser in the
 * build, and ADR-0011 holds the line by keeping the whole browser surface out
 * of the manifest: `chrome-devtools-mcp` is resolved by `pnpm dlx` into a cache
 * outside the repo. This file is the same trick one layer down - Node's built-in
 * `WebSocket` and `fetch` are all it needs - so `package.json`, `pnpm-lock.yaml`
 * and the `allowBuilds` map in `pnpm-workspace.yaml` stay byte-identical.
 *
 * Launch, resolve, run, and always kill the process tree on the way out.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const DEVTOOLS_PORT_TIMEOUT_MS = 30_000;
const DEVTOOLS_POLL_MS = 100;

function isHeadlessShell(binary) {
  return basename(binary).includes('headless-shell');
}

/**
 * Launch a browser headless on an ephemeral port with a throwaway profile.
 *
 * `--remote-debugging-port=0` is the important flag: it makes the browser pick a
 * free port and write the real one to `DevToolsActivePort` in the profile. A
 * hardcoded port is a race with anything else on the machine.
 *
 * `detached: true` puts the browser in its own process group, so the cleanup
 * below can kill the whole tree. Chrome spawns renderer and GPU children, and
 * killing only the parent leaves them holding the profile directory.
 */
export async function launchBrowser({ binary, headless = true, extraArgs = [] }) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'design-review-capture-'));

  const args = [
    // The headless *shell* is already headless and rejects nothing, but a full
    // Chrome build needs to be told. `--headless=new` was the spelling that
    // used to be required; current builds reject it outright and exit silently,
    // so plain `--headless` is the portable form.
    ...(isHeadlessShell(binary) || !headless ? [] : ['--headless']),
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--disable-features=Translate,MediaRouter,OptimizationHints',
    '--metrics-recording-only',
    '--mute-audio',
    '--window-size=1440,900',
    ...extraArgs,
    'about:blank',
  ];

  const child = spawn(binary, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });

  const stderr = [];
  child.stderr.on('data', (chunk) => stderr.push(String(chunk)));

  let exited = false;
  child.once('exit', () => {
    exited = true;
  });

  const killTree = () => {
    if (exited || child.pid === undefined) return;
    try {
      // Negative pid targets the process group created by `detached: true`.
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {
        // Already gone. Nothing to clean up.
      }
    }
  };

  // Registered rather than awaited, so an unexpected exit still cleans up.
  process.once('exit', killTree);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(signal, () => {
      killTree();
      process.exit(signal === 'SIGINT' ? 130 : 143);
    });
  }

  const cleanup = async () => {
    killTree();
    process.removeListener('exit', killTree);
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      process.removeAllListeners(signal);
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // A throwaway profile the OS can reap is not worth failing a capture over.
    }
  };

  const port = await readDevToolsPort({ userDataDir, child, stderr, exited: () => exited });

  return { port, userDataDir, cleanup };
}

async function readDevToolsPort({ userDataDir, child, stderr, exited }) {
  const portFile = join(userDataDir, 'DevToolsActivePort');
  const deadline = Date.now() + DEVTOOLS_PORT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (exited()) {
      throw new Error(
        `The browser exited before opening a debugging port.\n${stderr.join('').trim()}`,
      );
    }
    if (existsSync(portFile)) {
      const contents = readFileSync(portFile, 'utf8').split('\n');
      const port = Number(contents[0]);
      if (Number.isInteger(port) && port > 0) return port;
    }
    await delay(DEVTOOLS_POLL_MS);
  }

  throw new Error(`The browser did not report a DevTools port within ${DEVTOOLS_PORT_TIMEOUT_MS}ms.`);
}

/**
 * A CDP connection over the runtime's built-in WebSocket.
 *
 * Sessions are flattened (`Target.attachToTarget` with `flatten: true`), so every
 * command carries a `sessionId` and responses are matched on the id alone. That
 * is the smallest thing that can drive a page.
 */
export class CdpClient {
  #socket = null;
  #nextId = 1;
  #pending = new Map();
  #listeners = new Set();

  static async connect(webSocketDebuggerUrl) {
    const client = new CdpClient();
    await client.#open(webSocketDebuggerUrl);
    return client;
  }

  #open(url) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      this.#socket = socket;

      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener('error', () => reject(new Error(`Could not connect to ${url}`)), {
        once: true,
      });
      socket.addEventListener('message', (event) => this.#receive(String(event.data)));
      socket.addEventListener('close', () => {
        for (const { reject: rejectPending } of this.#pending.values()) {
          rejectPending(new Error('The DevTools connection closed mid-command.'));
        }
        this.#pending.clear();
      });
    });
  }

  #receive(raw) {
    const message = JSON.parse(raw);

    if (message.id !== undefined) {
      const entry = this.#pending.get(message.id);
      if (!entry) return;
      this.#pending.delete(message.id);
      if (message.error) {
        entry.reject(new Error(`${message.error.message} (CDP ${message.error.code})`));
      } else {
        entry.resolve(message.result);
      }
      return;
    }

    for (const listener of this.#listeners) listener(message);
  }

  /** Subscribe to CDP events (no-session and session-scoped). Returns an unsubscribe. */
  on(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.#nextId;
    this.#nextId += 1;

    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;

    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      try {
        this.#socket.send(JSON.stringify(payload));
      } catch (error) {
        this.#pending.delete(id);
        reject(error);
      }
    });
  }

  /** Resolve once `method` arrives, or reject on `timeoutMs`. */
  waitFor(method, { sessionId, timeoutMs = 30_000 } = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for ${method}.`));
      }, timeoutMs);

      const off = this.on((message) => {
        if (message.method !== method) return;
        if (sessionId && message.sessionId !== sessionId) return;
        clearTimeout(timer);
        off();
        resolve(message.params);
      });
    });
  }

  close() {
    try {
      this.#socket?.close();
    } catch {
      // Closing a socket that is already closed is not a failure.
    }
  }
}

/** Ask the browser's HTTP endpoint for its debugger WebSocket URL. */
export async function fetchDebuggerUrl(port, attempts = 40) {
  const url = `http://127.0.0.1:${port}/json/version`;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const body = await response.json();
        if (body.webSocketDebuggerUrl) return body.webSocketDebuggerUrl;
      }
    } catch {
      // The HTTP endpoint is not listening yet. Poll again.
    }
    await delay(DEVTOOLS_POLL_MS);
  }

  throw new Error(`No DevTools HTTP endpoint answered on port ${port}.`);
}
