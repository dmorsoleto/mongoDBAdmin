import { describe, it, expect } from "vitest";
import { getDocId } from "../DocumentViewer";

describe("getDocId", () => {
  it("returns empty string when _id is absent", () => {
    expect(getDocId({})).toBe("");
  });

  it("returns empty string when _id is undefined", () => {
    expect(getDocId({ _id: undefined })).toBe("");
  });

  it("returns empty string when _id is null (falsy)", () => {
    expect(getDocId({ _id: null })).toBe("");
  });

  it("returns string _id as-is", () => {
    expect(getDocId({ _id: "abc123" })).toBe("abc123");
  });

  it("returns the $oid value from an ObjectId object", () => {
    expect(getDocId({ _id: { $oid: "507f1f77bcf86cd799439011" } })).toBe(
      "507f1f77bcf86cd799439011"
    );
  });

  it("JSON.stringifies an unrecognised _id object", () => {
    const id = { custom: 42 };
    expect(getDocId({ _id: id })).toBe(JSON.stringify(id));
  });

  it("JSON.stringifies a numeric _id", () => {
    expect(getDocId({ _id: 99 })).toBe(JSON.stringify(99));
  });

  it("ignores other fields in the document", () => {
    expect(
      getDocId({ _id: "myId", name: "test", count: 5 })
    ).toBe("myId");
  });
});
