import { describe, it, expect } from "vitest";
import {
  detectSpecialType,
  buildFilterString,
} from "../JsonView";

describe("detectSpecialType", () => {
  it("returns null for an object with multiple keys", () => {
    expect(detectSpecialType({ a: 1, b: 2 })).toBeNull();
  });

  it("returns null for an empty object", () => {
    expect(detectSpecialType({})).toBeNull();
  });

  it("returns null for unrecognised single-key objects", () => {
    expect(detectSpecialType({ foo: "bar" })).toBeNull();
  });

  it("detects $oid", () => {
    const result = detectSpecialType({ $oid: "507f1f77bcf86cd799439011" });
    expect(result).toEqual({
      type: "ObjectId",
      value: "507f1f77bcf86cd799439011",
    });
  });

  it("detects $date with string value", () => {
    const result = detectSpecialType({ $date: "2023-01-15T00:00:00Z" });
    expect(result).toEqual({ type: "Date", value: "2023-01-15T00:00:00Z" });
  });

  it("detects $date with $numberLong sub-object", () => {
    const result = detectSpecialType({ $date: { $numberLong: "1673740800000" } });
    expect(result).toEqual({ type: "Date", value: "1673740800000" });
  });

  it("detects $date with arbitrary object (JSON.stringify fallback)", () => {
    const result = detectSpecialType({ $date: { some: "thing" } });
    expect(result?.type).toBe("Date");
    expect(result?.value).toBe(JSON.stringify({ some: "thing" }));
  });

  it("detects $numberLong", () => {
    const result = detectSpecialType({ $numberLong: "9999999999" });
    expect(result).toEqual({ type: "NumberLong", value: "9999999999" });
  });

  it("detects $numberDecimal", () => {
    const result = detectSpecialType({ $numberDecimal: "3.14" });
    expect(result).toEqual({ type: "Decimal128", value: "3.14" });
  });

  it("detects $binary with base64 field", () => {
    const result = detectSpecialType({
      $binary: { base64: "aGVsbG8=", subType: "00" },
    });
    expect(result).toEqual({ type: "Binary", value: "aGVsbG8=" });
  });

  it("detects $binary with missing base64 (returns empty string)", () => {
    const result = detectSpecialType({ $binary: {} });
    expect(result).toEqual({ type: "Binary", value: "" });
  });
});

describe("buildFilterString", () => {
  it("handles null value", () => {
    expect(buildFilterString("field", null)).toBe('{ "field": null }');
  });

  it("handles boolean true", () => {
    expect(buildFilterString("active", true)).toBe('{ "active": true }');
  });

  it("handles boolean false", () => {
    expect(buildFilterString("active", false)).toBe('{ "active": false }');
  });

  it("handles number value", () => {
    expect(buildFilterString("age", 42)).toBe('{ "age": 42 }');
  });

  it("handles zero", () => {
    expect(buildFilterString("count", 0)).toBe('{ "count": 0 }');
  });

  it("handles negative number", () => {
    expect(buildFilterString("temp", -5)).toBe('{ "temp": -5 }');
  });

  it("handles string value (wraps in double quotes)", () => {
    expect(buildFilterString("name", "Alice")).toBe('{ "name": "Alice" }');
  });

  it("handles empty string value", () => {
    expect(buildFilterString("name", "")).toBe('{ "name": "" }');
  });

  it("handles ObjectId object → ObjectId(\"...\") syntax", () => {
    const result = buildFilterString("_id", {
      $oid: "507f1f77bcf86cd799439011",
    });
    expect(result).toBe('{ "_id": ObjectId("507f1f77bcf86cd799439011") }');
  });

  it("handles Date object → ISODate(\"...\") syntax", () => {
    const result = buildFilterString("createdAt", {
      $date: "2023-01-15T00:00:00Z",
    });
    expect(result).toBe('{ "createdAt": ISODate("2023-01-15T00:00:00Z") }');
  });

  it("falls through to JSON.stringify for other objects", () => {
    const result = buildFilterString("meta", { foo: "bar" });
    expect(result).toBe('{ "meta": {"foo":"bar"} }');
  });

  it("falls through to JSON.stringify for plain arrays", () => {
    const result = buildFilterString("tags", ["a", "b"]);
    expect(result).toBe('{ "tags": ["a","b"] }');
  });

  it("handles NumberLong object via JSON.stringify", () => {
    const result = buildFilterString("count", { $numberLong: "42" });
    expect(result).toBe('{ "count": {"$numberLong":"42"} }');
  });
});
