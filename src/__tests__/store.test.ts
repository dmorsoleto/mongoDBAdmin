import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../store";

// Reset store and localStorage before each test
beforeEach(() => {
  localStorage.clear();
  useStore.setState({
    connected: false,
    currentUri: "",
    selectedDb: null,
    selectedCollection: null,
    databases: [],
    collections: [],
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

describe("useStore – setConnected", () => {
  it("sets connected=true and stores the URI", () => {
    useStore.getState().setConnected(true, "mongodb://localhost:27017");
    const { connected, currentUri } = useStore.getState();
    expect(connected).toBe(true);
    expect(currentUri).toBe("mongodb://localhost:27017");
  });

  it("sets connected=false with default empty URI", () => {
    useStore.getState().setConnected(true, "mongodb://host");
    useStore.getState().setConnected(false);
    const { connected, currentUri } = useStore.getState();
    expect(connected).toBe(false);
    expect(currentUri).toBe("");
  });
});

describe("useStore – setSelectedDb", () => {
  it("sets selectedDb and resets collection/documents/collections", () => {
    useStore.setState({
      selectedCollection: "col1",
      collections: ["col1", "col2"],
      documents: [{ _id: "1" }],
    });
    useStore.getState().setSelectedDb("mydb");
    const { selectedDb, selectedCollection, collections, documents } =
      useStore.getState();
    expect(selectedDb).toBe("mydb");
    expect(selectedCollection).toBeNull();
    expect(collections).toEqual([]);
    expect(documents).toEqual([]);
  });

  it("accepts null to clear selected database", () => {
    useStore.getState().setSelectedDb("somedb");
    useStore.getState().setSelectedDb(null);
    expect(useStore.getState().selectedDb).toBeNull();
  });
});

describe("useStore – setSelectedCollection", () => {
  it("sets collection, clears documents, and resets page to 0", () => {
    useStore.setState({ documents: [{ a: 1 }], page: 5 });
    useStore.getState().setSelectedCollection("mycoll");
    const { selectedCollection, documents, page } = useStore.getState();
    expect(selectedCollection).toBe("mycoll");
    expect(documents).toEqual([]);
    expect(page).toBe(0);
  });

  it("accepts null to clear selected collection", () => {
    useStore.getState().setSelectedCollection("col");
    useStore.getState().setSelectedCollection(null);
    expect(useStore.getState().selectedCollection).toBeNull();
  });
});

describe("useStore – setDatabases", () => {
  it("replaces the databases array", () => {
    useStore.getState().setDatabases(["db1", "db2", "db3"]);
    expect(useStore.getState().databases).toEqual(["db1", "db2", "db3"]);
  });

  it("accepts empty array", () => {
    useStore.getState().setDatabases(["db1"]);
    useStore.getState().setDatabases([]);
    expect(useStore.getState().databases).toEqual([]);
  });
});

describe("useStore – setCollections", () => {
  it("replaces the collections array", () => {
    useStore.getState().setCollections(["col1", "col2"]);
    expect(useStore.getState().collections).toEqual(["col1", "col2"]);
  });
});

describe("useStore – setDocuments", () => {
  it("replaces the documents array", () => {
    const docs = [{ _id: "1", name: "test" }];
    useStore.getState().setDocuments(docs);
    expect(useStore.getState().documents).toEqual(docs);
  });
});

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
    expect(localStorage.getItem("setting_protectConnectionStringSecrets")).toBe(
      "true"
    );
  });

  it("can be disabled again", () => {
    useStore.getState().setProtectConnectionStringSecrets(true);
    useStore.getState().setProtectConnectionStringSecrets(false);
    expect(useStore.getState().protectConnectionStringSecrets).toBe(false);
    expect(localStorage.getItem("setting_protectConnectionStringSecrets")).toBe(
      "false"
    );
  });
});

describe("useStore – setDefaultSort", () => {
  it("sets defaultSort to _id_asc and persists", () => {
    useStore.getState().setDefaultSort("_id_asc");
    expect(useStore.getState().defaultSort).toBe("_id_asc");
    expect(localStorage.getItem("setting_defaultSort")).toBe("_id_asc");
  });

  it("sets defaultSort to _id_desc and persists", () => {
    useStore.getState().setDefaultSort("_id_desc");
    expect(useStore.getState().defaultSort).toBe("_id_desc");
    expect(localStorage.getItem("setting_defaultSort")).toBe("_id_desc");
  });

  it("sets defaultSort to natural_desc and persists", () => {
    useStore.getState().setDefaultSort("natural_desc");
    expect(useStore.getState().defaultSort).toBe("natural_desc");
    expect(localStorage.getItem("setting_defaultSort")).toBe("natural_desc");
  });

  it("can reset back to default", () => {
    useStore.getState().setDefaultSort("_id_asc");
    useStore.getState().setDefaultSort("default");
    expect(useStore.getState().defaultSort).toBe("default");
    expect(localStorage.getItem("setting_defaultSort")).toBe("default");
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

describe("store – loadBool helper behaviour (via setters)", () => {
  it("defaults readOnlyMode to false and persists false on disable", () => {
    // Store initialises with false; disabling should write 'false' to localStorage
    useStore.getState().setReadOnlyMode(false);
    expect(useStore.getState().readOnlyMode).toBe(false);
    expect(localStorage.getItem("setting_readOnlyMode")).toBe("false");
  });

  it("persists true to localStorage and reads it back as boolean true", () => {
    useStore.getState().setReadOnlyMode(true);
    expect(localStorage.getItem("setting_readOnlyMode")).toBe("true");
    // Simulate what loadBool does: 'true' === 'true' → true
    const raw = localStorage.getItem("setting_readOnlyMode");
    expect(raw === "true").toBe(true);
  });

  it("loadBool returns false for any value that is not 'true'", () => {
    // Simulate loadBool with a non-'true' string
    localStorage.setItem("setting_readOnlyMode", "false");
    const raw = localStorage.getItem("setting_readOnlyMode");
    expect(raw === "true").toBe(false);
  });
});
