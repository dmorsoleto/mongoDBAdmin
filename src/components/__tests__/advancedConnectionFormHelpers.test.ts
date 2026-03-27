import { describe, it, expect } from "vitest";
import {
  getQueryParam,
  setQueryParam,
  splitUri,
} from "../AdvancedConnectionForm";

describe("getQueryParam", () => {
  it("returns empty string for a missing key", () => {
    expect(getQueryParam("?authSource=admin", "tls")).toBe("");
  });

  it("returns the value for a present key", () => {
    expect(getQueryParam("?authSource=admin", "authSource")).toBe("admin");
  });

  it("handles search string without leading ?", () => {
    expect(getQueryParam("authSource=admin&tls=true", "tls")).toBe("true");
  });

  it("handles multiple params and returns the correct one", () => {
    expect(
      getQueryParam("?a=1&authSource=mydb&tls=true", "authSource")
    ).toBe("mydb");
  });

  it("returns empty string for empty search string", () => {
    expect(getQueryParam("", "anyKey")).toBe("");
  });
});

describe("setQueryParam", () => {
  it("adds a new parameter to empty search", () => {
    expect(setQueryParam("", "tls", "true")).toBe("?tls=true");
  });

  it("adds a new parameter to existing search", () => {
    const result = setQueryParam("?authSource=admin", "tls", "true");
    expect(result).toContain("authSource=admin");
    expect(result).toContain("tls=true");
  });

  it("updates an existing parameter value", () => {
    const result = setQueryParam("?tls=false", "tls", "true");
    expect(result).toBe("?tls=true");
  });

  it("removes a parameter when value is empty string", () => {
    const result = setQueryParam("?authSource=admin&tls=true", "tls", "");
    expect(result).not.toContain("tls");
    expect(result).toContain("authSource=admin");
  });

  it("returns empty string when removing the only parameter", () => {
    const result = setQueryParam("?tls=true", "tls", "");
    expect(result).toBe("");
  });

  it("handles search string without leading ?", () => {
    const result = setQueryParam("authSource=admin", "tls", "true");
    expect(result).toContain("tls=true");
  });
});

describe("splitUri", () => {
  it("parses a simple mongodb URI", () => {
    const result = splitUri("mongodb://localhost:27017");
    expect(result.scheme).toBe("mongodb");
    expect(result.creds).toBe("");
    expect(result.hostport).toBe("localhost:27017");
    expect(result.path).toBe("");
    expect(result.search).toBe("");
  });

  it("parses mongodb+srv scheme", () => {
    const result = splitUri("mongodb+srv://cluster.example.com");
    expect(result.scheme).toBe("mongodb+srv");
    expect(result.hostport).toBe("cluster.example.com");
  });

  it("parses credentials (user:pass)", () => {
    const result = splitUri("mongodb://user:secret@localhost:27017");
    expect(result.creds).toBe("user:secret");
    expect(result.hostport).toBe("localhost:27017");
  });

  it("uses last @ when @ appears in the password", () => {
    const result = splitUri("mongodb://user:p%40ss@localhost:27017");
    expect(result.creds).toBe("user:p%40ss");
    expect(result.hostport).toBe("localhost:27017");
  });

  it("parses path (database name)", () => {
    const result = splitUri("mongodb://localhost:27017/mydb");
    expect(result.hostport).toBe("localhost:27017");
    expect(result.path).toBe("/mydb");
    expect(result.search).toBe("");
  });

  it("parses query string", () => {
    const result = splitUri("mongodb://localhost:27017?authSource=admin");
    expect(result.search).toBe("?authSource=admin");
    expect(result.path).toBe("");
  });

  it("parses path and query string together", () => {
    const result = splitUri(
      "mongodb://localhost:27017/mydb?authSource=admin&tls=true"
    );
    expect(result.path).toBe("/mydb");
    expect(result.search).toBe("?authSource=admin&tls=true");
  });

  it("parses full URI with credentials, path and search", () => {
    const result = splitUri(
      "mongodb://admin:pass@host1:27017/admin?replicaSet=rs0"
    );
    expect(result.scheme).toBe("mongodb");
    expect(result.creds).toBe("admin:pass");
    expect(result.hostport).toBe("host1:27017");
    expect(result.path).toBe("/admin");
    expect(result.search).toBe("?replicaSet=rs0");
  });

  it("defaults scheme to mongodb when scheme is absent/unrecognised", () => {
    const result = splitUri("anything://localhost");
    // falls back to mongodb because schemeMatch won't match
    expect(result.scheme).toBe("mongodb");
  });

  it("handles URI with no path and no search (hostport only)", () => {
    const result = splitUri("mongodb://my-cluster.example.com");
    expect(result.hostport).toBe("my-cluster.example.com");
    expect(result.path).toBe("");
    expect(result.search).toBe("");
  });
});
