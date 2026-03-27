import { describe, it, expect } from "vitest";
import { mongoShellToJson, parseQueryField } from "../mongoQuery";

describe("mongoShellToJson", () => {
  it("returns empty string unchanged", () => {
    expect(mongoShellToJson("")).toBe("");
  });

  it("returns whitespace-only string as empty (trimmed)", () => {
    expect(mongoShellToJson("   ")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(mongoShellToJson("  {}  ")).toBe("{}");
  });

  it("converts ObjectId with single quotes", () => {
    expect(mongoShellToJson("ObjectId('507f1f77bcf86cd799439011')")).toBe(
      '{"$oid":"507f1f77bcf86cd799439011"}'
    );
  });

  it("converts ObjectId with double quotes", () => {
    expect(mongoShellToJson('ObjectId("507f1f77bcf86cd799439011")')).toBe(
      '{"$oid":"507f1f77bcf86cd799439011"}'
    );
  });

  it("converts ObjectId with spaces inside parentheses", () => {
    expect(
      mongoShellToJson("ObjectId( '507f1f77bcf86cd799439011' )")
    ).toBe('{"$oid":"507f1f77bcf86cd799439011"}');
  });

  it("converts ObjectId with uppercase hex", () => {
    expect(mongoShellToJson("ObjectId('507F1F77BCF86CD799439011')")).toBe(
      '{"$oid":"507F1F77BCF86CD799439011"}'
    );
  });

  it("converts ISODate with single quotes", () => {
    expect(mongoShellToJson("ISODate('2023-01-15T00:00:00Z')")).toBe(
      '{"$date":"2023-01-15T00:00:00Z"}'
    );
  });

  it("converts ISODate with double quotes", () => {
    expect(mongoShellToJson('ISODate("2023-01-15T00:00:00Z")')).toBe(
      '{"$date":"2023-01-15T00:00:00Z"}'
    );
  });

  it("converts ISODate with spaces", () => {
    expect(mongoShellToJson("ISODate( '2023-01-15' )")).toBe(
      '{"$date":"2023-01-15"}'
    );
  });

  it("converts new Date with single quotes", () => {
    expect(mongoShellToJson("new Date('2023-01-15')")).toBe(
      '{"$date":"2023-01-15"}'
    );
  });

  it("converts new Date with double quotes", () => {
    expect(mongoShellToJson('new Date("2023-01-15")')).toBe(
      '{"$date":"2023-01-15"}'
    );
  });

  it("converts new Date with extra spaces", () => {
    expect(mongoShellToJson("new  Date( '2023-01-15' )")).toBe(
      '{"$date":"2023-01-15"}'
    );
  });

  it("converts NumberLong positive", () => {
    expect(mongoShellToJson("NumberLong(42)")).toBe('{"$numberLong":"42"}');
  });

  it("converts NumberLong negative", () => {
    expect(mongoShellToJson("NumberLong(-100)")).toBe(
      '{"$numberLong":"-100"}'
    );
  });

  it("converts NumberLong with spaces", () => {
    expect(mongoShellToJson("NumberLong( 99 )")).toBe('{"$numberLong":"99"}');
  });

  it("converts NumberInt to bare number", () => {
    expect(mongoShellToJson("NumberInt(5)")).toBe("5");
  });

  it("converts NumberInt negative to bare number", () => {
    expect(mongoShellToJson("NumberInt(-3)")).toBe("-3");
  });

  it("converts unquoted plain keys", () => {
    const result = mongoShellToJson('{ name: "test" }');
    expect(result).toBe('{ "name": "test" }');
  });

  it("converts unquoted $-prefixed keys", () => {
    const result = mongoShellToJson("{ $gt: 5 }");
    expect(result).toBe('{ "$gt": 5 }');
  });

  it("converts unquoted keys with dots", () => {
    const result = mongoShellToJson('{ "user.name": "test" }');
    expect(result).toBe('{ "user.name": "test" }');
  });

  it("converts single-quoted string values", () => {
    const result = mongoShellToJson("{ name: 'Alice' }");
    expect(result).toBe('{ "name": "Alice" }');
  });

  it("converts multiple unquoted keys", () => {
    const result = mongoShellToJson('{ a: 1, b: "two" }');
    expect(result).toBe('{ "a": 1, "b": "two" }');
  });

  it("keeps already double-quoted keys unchanged", () => {
    const result = mongoShellToJson('{ "name": "test" }');
    expect(result).toBe('{ "name": "test" }');
  });

  it("handles complex nested object with ObjectId and ISODate", () => {
    const input =
      "{ _id: ObjectId('507f1f77bcf86cd799439011'), createdAt: ISODate('2023-01-15T00:00:00Z') }";
    const result = mongoShellToJson(input);
    const parsed = JSON.parse(result);
    expect(parsed._id).toEqual({ $oid: "507f1f77bcf86cd799439011" });
    expect(parsed.createdAt).toEqual({ $date: "2023-01-15T00:00:00Z" });
  });

  it("handles NumberInt inside a field", () => {
    const result = mongoShellToJson("{ age: NumberInt(25) }");
    const parsed = JSON.parse(result);
    expect(parsed.age).toBe(25);
  });

  it("handles NumberLong inside a field", () => {
    const result = mongoShellToJson("{ count: NumberLong(9999999999) }");
    const parsed = JSON.parse(result);
    expect(parsed.count).toEqual({ $numberLong: "9999999999" });
  });

  it("handles plain JSON object unchanged", () => {
    const result = mongoShellToJson('{ "key": 123 }');
    expect(result).toBe('{ "key": 123 }');
  });
});

describe("parseQueryField", () => {
  it("returns null for empty string", () => {
    expect(parseQueryField("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseQueryField("   ")).toBeNull();
  });

  it("returns null for empty object {}", () => {
    expect(parseQueryField("{}")).toBeNull();
  });

  it("returns null for {} with spaces", () => {
    expect(parseQueryField("  {}  ")).toBeNull();
  });

  it("returns JSON string for a valid plain JSON object", () => {
    const result = parseQueryField('{ "name": "test" }');
    expect(result).toBe('{ "name": "test" }');
    expect(JSON.parse(result!)).toEqual({ name: "test" });
  });

  it("converts and validates MongoDB shell ObjectId syntax", () => {
    const result = parseQueryField(
      "{ _id: ObjectId('507f1f77bcf86cd799439011') }"
    );
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed._id.$oid).toBe("507f1f77bcf86cd799439011");
  });

  it("converts and validates numeric filter", () => {
    const result = parseQueryField("{ age: 25 }");
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ age: 25 });
  });

  it("converts ISODate syntax", () => {
    const result = parseQueryField("{ ts: ISODate('2023-01-01T00:00:00Z') }");
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.ts).toEqual({ $date: "2023-01-01T00:00:00Z" });
  });

  it("throws for invalid JSON that cannot be fixed", () => {
    expect(() => parseQueryField("{ invalid json }")).toThrow(
      "Invalid query syntax"
    );
  });

  it("throws error containing the original input", () => {
    const input = "{ bad syntax here";
    expect(() => parseQueryField(input)).toThrow(input);
  });

  it("throws for malformed braces", () => {
    expect(() => parseQueryField("{ a: }")).toThrow("Invalid query syntax");
  });

  it("returns the converted string for $gt operator", () => {
    const result = parseQueryField("{ count: { $gt: 10 } }");
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.count.$gt).toBe(10);
  });
});
