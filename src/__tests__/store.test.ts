import { describe, it, expect, beforeEach } from "vitest";
import { useStore, extractConnName } from "../store";
import type { ConnectionEntry } from "../store";

const makeConn = (id: string, uri: string): ConnectionEntry => ({
  id,
  uri,
  name: uri,
  databases: ["admin", "test"],
  selectedDb: null,
  collections: [],
});

// Reset store and localStorage before each test
beforeEach(() => {
  localStorage.clear();
  useStore.setState({
    connections: [],
    activeConnId: null,
    selectedDb: null,
    selectedCollection: null,
    documents: [],
    totalDocs: 0,
    page: 0,
    pageSize: 20,
    loading: false,
    error: null,
    readOnlyMode: false,
    protectConnectionStringSecrets: false,
    defaultSort: "default",
    maxTimeMsLimit: null,
    theme: "dark",
  });
});

// ── addConnection ─────────────────────────────────────────────────────────

describe("useStore – addConnection", () => {
  it("adds a connection to the list", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://localhost:27017"));
    expect(useStore.getState().connections).toHaveLength(1);
    expect(useStore.getState().connections[0].id).toBe("1");
  });

  it("adds multiple connections", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://host1:27017"));
    useStore.getState().addConnection(makeConn("2", "mongodb://host2:27017"));
    expect(useStore.getState().connections).toHaveLength(2);
  });
});

// ── removeConnection ──────────────────────────────────────────────────────

describe("useStore – removeConnection", () => {
  it("removes a connection by id", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://host1:27017"));
    useStore.getState().addConnection(makeConn("2", "mongodb://host2:27017"));
    useStore.getState().removeConnection("1");
    const { connections } = useStore.getState();
    expect(connections).toHaveLength(1);
    expect(connections[0].id).toBe("2");
  });

  it("clears active state when the active connection is removed", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://host1:27017"));
    useStore.getState().activateCollection("1", "test", "users");
    useStore.getState().removeConnection("1");
    const { activeConnId, selectedDb, selectedCollection } = useStore.getState();
    expect(activeConnId).toBeNull();
    expect(selectedDb).toBeNull();
    expect(selectedCollection).toBeNull();
  });

  it("preserves active state when a non-active connection is removed", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://host1:27017"));
    useStore.getState().addConnection(makeConn("2", "mongodb://host2:27017"));
    useStore.getState().activateCollection("1", "mydb", "items");
    useStore.getState().removeConnection("2");
    expect(useStore.getState().activeConnId).toBe("1");
    expect(useStore.getState().selectedDb).toBe("mydb");
  });
});

// ── updateConn ────────────────────────────────────────────────────────────

describe("useStore – updateConn", () => {
  it("updates databases for a connection", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://localhost"));
    useStore.getState().updateConn("1", { databases: ["db1", "db2", "db3"] });
    const conn = useStore.getState().connections.find((c) => c.id === "1");
    expect(conn?.databases).toEqual(["db1", "db2", "db3"]);
  });

  it("updates selectedDb and collections for a connection", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://localhost"));
    useStore.getState().updateConn("1", { selectedDb: "mydb", collections: ["col1", "col2"] });
    const conn = useStore.getState().connections.find((c) => c.id === "1");
    expect(conn?.selectedDb).toBe("mydb");
    expect(conn?.collections).toEqual(["col1", "col2"]);
  });

  it("does not affect other connections", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://host1"));
    useStore.getState().addConnection(makeConn("2", "mongodb://host2"));
    useStore.getState().updateConn("1", { databases: ["onlyDb"] });
    const conn2 = useStore.getState().connections.find((c) => c.id === "2");
    expect(conn2?.databases).toEqual(["admin", "test"]);
  });
});

// ── activateCollection ────────────────────────────────────────────────────

describe("useStore – activateCollection", () => {
  it("sets activeConnId, selectedDb, and selectedCollection", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://localhost"));
    useStore.getState().activateCollection("1", "mydb", "users");
    const { activeConnId, selectedDb, selectedCollection } = useStore.getState();
    expect(activeConnId).toBe("1");
    expect(selectedDb).toBe("mydb");
    expect(selectedCollection).toBe("users");
  });

  it("resets documents and page", () => {
    useStore.setState({ documents: [{ _id: "1" }], page: 5 });
    useStore.getState().addConnection(makeConn("1", "mongodb://localhost"));
    useStore.getState().activateCollection("1", "db", "coll");
    expect(useStore.getState().documents).toEqual([]);
    expect(useStore.getState().page).toBe(0);
  });

  it("updates the connection's selectedDb", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://localhost"));
    useStore.getState().activateCollection("1", "newdb", "col");
    const conn = useStore.getState().connections.find((c) => c.id === "1");
    expect(conn?.selectedDb).toBe("newdb");
  });

  it("switches active connection when called for a different conn", () => {
    useStore.getState().addConnection(makeConn("1", "mongodb://host1"));
    useStore.getState().addConnection(makeConn("2", "mongodb://host2"));
    useStore.getState().activateCollection("1", "db1", "col1");
    useStore.getState().activateCollection("2", "db2", "col2");
    expect(useStore.getState().activeConnId).toBe("2");
    expect(useStore.getState().selectedDb).toBe("db2");
    expect(useStore.getState().selectedCollection).toBe("col2");
  });
});

// ── setDocuments ──────────────────────────────────────────────────────────

describe("useStore – setDocuments", () => {
  it("replaces the documents array", () => {
    const docs = [{ _id: "1", name: "test" }];
    useStore.getState().setDocuments(docs);
    expect(useStore.getState().documents).toEqual(docs);
  });
});

// ── setPage ───────────────────────────────────────────────────────────────

describe("useStore – setPage", () => {
  it("updates the current page number", () => {
    useStore.getState().setPage(3);
    expect(useStore.getState().page).toBe(3);
  });

  it("handles page 0", () => {
    useStore.getState().setPage(5);
    useStore.getState().setPage(0);
    expect(useStore.getState().page).toBe(0);
  });
});

// ── setLoading ────────────────────────────────────────────────────────────

describe("useStore – setLoading", () => {
  it("sets loading to true", () => {
    useStore.getState().setLoading(true);
    expect(useStore.getState().loading).toBe(true);
  });

  it("sets loading back to false", () => {
    useStore.getState().setLoading(true);
    useStore.getState().setLoading(false);
    expect(useStore.getState().loading).toBe(false);
  });
});

// ── setError ──────────────────────────────────────────────────────────────

describe("useStore – setError", () => {
  it("sets an error message", () => {
    useStore.getState().setError("Connection timed out");
    expect(useStore.getState().error).toBe("Connection timed out");
  });

  it("clears the error with null", () => {
    useStore.getState().setError("Something went wrong");
    useStore.getState().setError(null);
    expect(useStore.getState().error).toBeNull();
  });
});

// ── settings ──────────────────────────────────────────────────────────────

describe("useStore – setReadOnlyMode", () => {
  it("enables read-only mode and persists to localStorage", () => {
    useStore.getState().setReadOnlyMode(true);
    expect(useStore.getState().readOnlyMode).toBe(true);
    expect(localStorage.getItem("setting_readOnlyMode")).toBe("true");
  });

  it("disables read-only mode and persists to localStorage", () => {
    useStore.getState().setReadOnlyMode(true);
    useStore.getState().setReadOnlyMode(false);
    expect(useStore.getState().readOnlyMode).toBe(false);
    expect(localStorage.getItem("setting_readOnlyMode")).toBe("false");
  });
});

describe("useStore – setProtectConnectionStringSecrets", () => {
  it("sets protectConnectionStringSecrets and persists", () => {
    useStore.getState().setProtectConnectionStringSecrets(true);
    expect(useStore.getState().protectConnectionStringSecrets).toBe(true);
    expect(localStorage.getItem("setting_protectConnectionStringSecrets")).toBe("true");
  });

  it("can be disabled again", () => {
    useStore.getState().setProtectConnectionStringSecrets(true);
    useStore.getState().setProtectConnectionStringSecrets(false);
    expect(useStore.getState().protectConnectionStringSecrets).toBe(false);
  });
});

describe("useStore – setDefaultSort", () => {
  it("sets defaultSort to _id_asc and persists", () => {
    useStore.getState().setDefaultSort("_id_asc");
    expect(useStore.getState().defaultSort).toBe("_id_asc");
    expect(localStorage.getItem("setting_defaultSort")).toBe("_id_asc");
  });

  it("can reset back to default", () => {
    useStore.getState().setDefaultSort("_id_asc");
    useStore.getState().setDefaultSort("default");
    expect(useStore.getState().defaultSort).toBe("default");
  });
});

describe("useStore – setMaxTimeMsLimit", () => {
  it("sets a numeric max time limit and persists", () => {
    useStore.getState().setMaxTimeMsLimit(5000);
    expect(useStore.getState().maxTimeMsLimit).toBe(5000);
    expect(localStorage.getItem("setting_maxTimeMsLimit")).toBe("5000");
  });

  it("removes localStorage entry when set to null", () => {
    useStore.getState().setMaxTimeMsLimit(3000);
    useStore.getState().setMaxTimeMsLimit(null);
    expect(useStore.getState().maxTimeMsLimit).toBeNull();
    expect(localStorage.getItem("setting_maxTimeMsLimit")).toBeNull();
  });
});

describe("useStore – setTheme", () => {
  it("sets theme to dark and adds dark class to html element", () => {
    document.documentElement.classList.remove("dark");
    useStore.getState().setTheme("dark");
    expect(useStore.getState().theme).toBe("dark");
    expect(localStorage.getItem("setting_theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("sets theme to light and removes dark class from html element", () => {
    document.documentElement.classList.add("dark");
    useStore.getState().setTheme("light");
    expect(useStore.getState().theme).toBe("light");
    expect(localStorage.getItem("setting_theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

// ── extractConnName ────────────────────────────────────────────────────────

describe("extractConnName", () => {
  it("extracts host:port from a simple mongodb URI", () => {
    expect(extractConnName("mongodb://localhost:27017")).toBe("localhost:27017");
  });

  it("extracts host from a URI with a database path", () => {
    expect(extractConnName("mongodb://localhost:27017/mydb")).toBe("localhost:27017");
  });

  it("strips credentials from a URI with auth", () => {
    expect(extractConnName("mongodb://user:pass@myhost:27017")).toBe("myhost:27017");
  });

  it("handles mongodb+srv scheme", () => {
    expect(extractConnName("mongodb+srv://cluster.example.mongodb.net")).toBe(
      "cluster.example.mongodb.net"
    );
  });

  it("handles URI without scheme", () => {
    const result = extractConnName("myhost:27017");
    expect(result).toBe("myhost:27017");
  });

  it("returns truncated string for an empty-ish input", () => {
    const result = extractConnName("x");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("store – loadBool helper behaviour (via setters)", () => {
  it("defaults readOnlyMode to false and persists false on disable", () => {
    useStore.getState().setReadOnlyMode(false);
    expect(useStore.getState().readOnlyMode).toBe(false);
    expect(localStorage.getItem("setting_readOnlyMode")).toBe("false");
  });

  it("persists true to localStorage and reads it back as boolean true", () => {
    useStore.getState().setReadOnlyMode(true);
    const raw = localStorage.getItem("setting_readOnlyMode");
    expect(raw === "true").toBe(true);
  });
});
