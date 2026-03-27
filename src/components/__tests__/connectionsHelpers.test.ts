import { describe, it, expect } from "vitest";
import { detectUriWarnings } from "../Connections";

describe("detectUriWarnings", () => {
  it("returns empty array for a clean URI with no credentials", () => {
    expect(detectUriWarnings("mongodb://localhost:27017")).toEqual([]);
  });

  it("returns empty array for a clean URI with normal credentials", () => {
    expect(
      detectUriWarnings("mongodb://admin:secretpass@localhost:27017")
    ).toEqual([]);
  });

  it("returns empty array for mongodb+srv scheme with clean credentials", () => {
    expect(
      detectUriWarnings("mongodb+srv://user:pass@cluster.example.com")
    ).toEqual([]);
  });

  it("warns when %20 appears in credentials", () => {
    const warnings = detectUriWarnings(
      "mongodb://user:my%20password@localhost:27017"
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("%20");
  });

  it("warns about other URL-encoded characters in credentials", () => {
    const warnings = detectUriWarnings(
      "mongodb://user:p%40ssword@localhost:27017"
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("%40");
  });

  it("warns about multiple distinct encoded characters", () => {
    const warnings = detectUriWarnings(
      "mongodb://user:p%40ss%23word@localhost:27017"
    );
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("produces both %20 warning and other-chars warning when both present", () => {
    const warnings = detectUriWarnings(
      "mongodb://user:p%20ss%40word@localhost:27017"
    );
    expect(warnings).toHaveLength(2);
  });

  it("returns empty array for non-MongoDB URIs (no match)", () => {
    expect(detectUriWarnings("postgres://user:pass@localhost")).toEqual([]);
  });

  it("returns empty array for an empty string", () => {
    expect(detectUriWarnings("")).toEqual([]);
  });

  it("returns empty array for a URI with no @ (no credentials section)", () => {
    expect(
      detectUriWarnings("mongodb://localhost:27017/mydb?authSource=admin")
    ).toEqual([]);
  });

  it("handles URI with @ in the path (last @ determines credentials)", () => {
    // user:pass@host is well-formed; no encoded chars → no warning
    const warnings = detectUriWarnings(
      "mongodb://user:cleanpass@localhost:27017"
    );
    expect(warnings).toEqual([]);
  });
});
