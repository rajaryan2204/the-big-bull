/*!
 * THE BIG BULL - Production Incognito / Private Browsing Detector (v1.8.1 engine)
 * Detects Incognito mode on Chromium (Chrome, Edge, Brave, Opera), Safari (macOS & iOS),
 * Firefox, and Mobile browsers without external dependencies.
 */

export interface IncognitoDetectionResult {
  isPrivate: boolean;
  browserName: string;
}

export async function detectIncognito(): Promise<IncognitoDetectionResult> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isPrivate: false, browserName: "Server" };
  }

  // Safety timeout wrapper: never let detection hang the UI on abnormal webviews
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        // Quota fallback if timing test took too long
        checkStorageQuotaFallback().then((fallbackRes) => {
          resolve(fallbackRes);
        });
      }
    }, 1200);

    const safeResolve = (res: IncognitoDetectionResult) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(res);
      }
    };

    runInternalDetection()
      .then(safeResolve)
      .catch(async () => {
        const fallback = await checkStorageQuotaFallback();
        safeResolve(fallback);
      });
  });
}

async function checkStorageQuotaFallback(): Promise<IncognitoDetectionResult> {
  let browserName = "Unknown";
  try {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome") || ua.includes("Edg") || ua.includes("Brave")) {
      browserName = "Chromium";
    } else if (ua.includes("Firefox")) {
      browserName = "Firefox";
    } else if (ua.includes("Safari")) {
      browserName = "Safari";
    }

    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) {
        const quotaMB = Math.round(estimate.quota / (1024 * 1024));
        // Chromium incognito typically caps quota to <= 4GB or memory pool
        // Firefox private mode caps storage severely
        if (quotaMB > 0 && quotaMB <= 4096) {
          return { isPrivate: true, browserName };
        }
      }
    }
  } catch {
    // Ignore fallback errors
  }
  return { isPrivate: false, browserName };
}

function runInternalDetection(): Promise<IncognitoDetectionResult> {
  return new Promise((resolve, reject) => {
    let browserName = "Unknown";
    let callbackSettled = false;

    function __callback(isPrivate: boolean): void {
      if (callbackSettled) return;
      callbackSettled = true;
      resolve({ isPrivate, browserName });
    }

    function identifyChromium(): string {
      const ua = navigator.userAgent;
      if (ua.match(/Chrome/)) {
        if ((navigator as any).brave !== undefined) return "Brave";
        if (ua.match(/Edg/)) return "Edge";
        if (ua.match(/OPR/)) return "Opera";
        return "Chrome";
      }
      return "Chromium";
    }

    function feid(): number {
      let toFixedEngineID = 0;
      const neg = parseInt("-1", 10);
      try {
        neg.toFixed(neg);
      } catch (e) {
        toFixedEngineID = (e as Error).message.length;
      }
      return toFixedEngineID;
    }

    function isSafari(): boolean {
      const id = feid();
      return id === 44 || id === 43;
    }

    function isChrome(): boolean {
      return feid() === 51;
    }

    function isFirefox(): boolean {
      return feid() === 25;
    }

    function isMSIE(): boolean {
      return (navigator as any).msSaveBlob !== undefined;
    }

    // 1. Safari (iOS & macOS)
    async function currentSafariTest() {
      try {
        await navigator.storage.getDirectory();
        __callback(false);
      } catch (e) {
        const message = e instanceof Error && typeof e.message === "string" ? e.message : String(e);
        const matchesExpectedError = message.includes("unknown transient reason");
        __callback(matchesExpectedError);
      }
    }

    function safari13to18Test(): void {
      const tmp = String(Math.random());
      try {
        const dbReq = indexedDB.open(tmp, 1);
        dbReq.onupgradeneeded = (ev) => {
          const db = (ev.target as IDBOpenDBRequest).result;
          const finish = (priv: boolean) => {
            __callback(priv);
          };
          try {
            db.createObjectStore("t", { autoIncrement: true }).put(new Blob());
            finish(false);
          } catch (err) {
            const message = err instanceof Error && typeof err.message === "string" ? err.message : String(err);
            if (message.includes("are not yet supported")) finish(true);
            else finish(false);
          } finally {
            db.close();
            indexedDB.deleteDatabase(tmp);
          }
        };
        dbReq.onerror = () => __callback(false);
      } catch {
        __callback(false);
      }
    }

    function oldSafariTest(): void {
      const openDB = (window as any).openDatabase;
      const storage = window.localStorage;
      try {
        if (openDB) openDB(null, null, null, null);
      } catch {
        __callback(true);
        return;
      }
      try {
        storage.setItem("test", "1");
        storage.removeItem("test");
      } catch {
        __callback(true);
        return;
      }
      __callback(false);
    }

    async function safariPrivateTest(): Promise<void> {
      if (typeof navigator.storage?.getDirectory === "function") {
        await currentSafariTest();
      } else if (navigator.maxTouchPoints !== undefined) {
        safari13to18Test();
      } else {
        oldSafariTest();
      }
    }

    // 2. Chromium (Chrome, Edge, Brave, Opera)
    // Incognito IndexedDB is purely in-memory (leveldb memenv): durability:"strict" fsync is a no-op,
    // same cost as "relaxed" => ratio ~1.0. On disk, strict fsyncs => ratio >> 1.30.
    function chromePrivateTest(): void {
      const PAYLOAD = 16384;
      const WRITES = 12;
      const ROUNDS = 10;
      const MIN_ROUNDS = 5;
      const CAP_MS = 800;
      const THRESHOLD = 1.30;

      const dbName = "__di_" + Math.random().toString(36).slice(2);
      const payload = new Uint8Array(PAYLOAD);
      const req = indexedDB.open(dbName, 1);

      req.onupgradeneeded = () => {
        req.result.createObjectStore("s");
      };

      req.onerror = () => {
        try {
          indexedDB.deleteDatabase(dbName);
        } catch {}
        // Fallback to quota check
        checkStorageQuotaFallback().then((res) => __callback(res.isPrivate));
      };

      req.onsuccess = () => {
        const db = req.result;
        let honored = false;
        try {
          const t = db.transaction("s", "readwrite", { durability: "strict" });
          honored = (t as any).durability === "strict";
          t.abort();
        } catch {
          // Durability option unsupported in older engines
        }

        if (!honored) {
          db.close();
          try {
            indexedDB.deleteDatabase(dbName);
          } catch {}
          checkStorageQuotaFallback().then((res) => __callback(res.isPrivate));
          return;
        }

        const block = (durability: "strict" | "relaxed"): Promise<number> =>
          new Promise((res, rej) => {
            const t0 = performance.now();
            let i = 0;
            const step = (): void => {
              if (i === WRITES) {
                res(performance.now() - t0);
                return;
              }
              const tx = db.transaction("s", "readwrite", { durability });
              tx.objectStore("s").put(payload, i);
              i++;
              tx.oncomplete = step;
              tx.onerror = tx.onabort = () => rej(tx.error);
            };
            step();
          });

        void (async () => {
          const start = performance.now();
          await block("relaxed");
          await block("strict"); // warm-up
          const ratios: number[] = [];

          for (let r = 0; r < ROUNDS; r++) {
            const rel = await block("relaxed");
            const str = await block("strict");
            ratios.push(rel > 0 ? str / rel : Infinity);
            if (ratios.length >= MIN_ROUNDS && performance.now() - start >= CAP_MS) break;
          }

          ratios.sort((a, b) => a - b);
          db.close();
          try {
            indexedDB.deleteDatabase(dbName);
          } catch {}

          const median = ratios[ratios.length >> 1];
          // ~1.0 = incognito (in-memory); disk >> 1.30
          __callback(median < THRESHOLD);
        })().catch(() => {
          db.close();
          try {
            indexedDB.deleteDatabase(dbName);
          } catch {}
          __callback(false);
        });
      };
    }

    // 3. Firefox
    async function firefoxPrivateTest(): Promise<void> {
      if (typeof navigator.storage?.getDirectory === "function") {
        try {
          await navigator.storage.getDirectory();
          __callback(false);
        } catch (e) {
          const message = e instanceof Error && typeof e.message === "string" ? e.message : String(e);
          const matchesExpectedError = message.includes("Security error");
          __callback(matchesExpectedError);
          return;
        }
      } else {
        const request = indexedDB.open("inPrivate");
        request.onerror = (event) => {
          if (request.error && request.error.name === "InvalidStateError") {
            event.preventDefault();
            __callback(true);
            return;
          }
          __callback(false);
        };
        request.onsuccess = () => {
          try {
            indexedDB.deleteDatabase("inPrivate");
          } catch {}
          __callback(false);
        };
      }
    }

    // 4. MSIE
    function msiePrivateTest(): void {
      __callback(window.indexedDB === undefined);
    }

    // Main Engine Router
    async function main(): Promise<void> {
      if (isSafari()) {
        browserName = "Safari";
        await safariPrivateTest();
      } else if (isChrome()) {
        browserName = identifyChromium();
        chromePrivateTest();
      } else if (isFirefox()) {
        browserName = "Firefox";
        await firefoxPrivateTest();
      } else if (isMSIE()) {
        browserName = "Internet Explorer";
        msiePrivateTest();
      } else {
        // Fallback for uncommon or hybrid WebViews
        const quota = await checkStorageQuotaFallback();
        browserName = quota.browserName;
        __callback(quota.isPrivate);
      }
    }

    main().catch(reject);
  });
}
