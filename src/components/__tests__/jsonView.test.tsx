import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonView } from "../JsonView";

describe("JsonView – full mode (value rendering)", () => {
  it("renders null value", () => {
    render(<JsonView doc={{ field: null }} />);
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("renders boolean true", () => {
    render(<JsonView doc={{ active: true }} />);
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("renders boolean false", () => {
    render(<JsonView doc={{ active: false }} />);
    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("renders a number value", () => {
    render(<JsonView doc={{ count: 42 }} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders a string value in quotes", () => {
    render(<JsonView doc={{ name: "Alice" }} />);
    expect(screen.getByText('"Alice"')).toBeInTheDocument();
  });

  it("renders an empty array as []", () => {
    render(<JsonView doc={{ tags: [] }} />);
    expect(screen.getByText("[]")).toBeInTheDocument();
  });

  it("renders a non-empty array with items", () => {
    render(<JsonView doc={{ tags: ["a", "b"] }} />);
    expect(screen.getByText('"a"')).toBeInTheDocument();
    expect(screen.getByText('"b"')).toBeInTheDocument();
  });

  it("renders an empty nested object as {}", () => {
    render(<JsonView doc={{ meta: {} }} />);
    // {} appears in the document
    expect(screen.getAllByText("{}").length).toBeGreaterThan(0);
  });

  it("renders ObjectId special type", () => {
    render(
      <JsonView doc={{ _id: { $oid: "507f1f77bcf86cd799439011" } }} />
    );
    expect(screen.getByText("ObjectId(")).toBeInTheDocument();
    expect(
      screen.getByText('"507f1f77bcf86cd799439011"')
    ).toBeInTheDocument();
  });

  it("renders Date special type", () => {
    render(<JsonView doc={{ ts: { $date: "2023-01-15T00:00:00Z" } }} />);
    expect(screen.getByText("Date(")).toBeInTheDocument();
    expect(screen.getByText('"2023-01-15T00:00:00Z"')).toBeInTheDocument();
  });

  it("renders NumberLong special type", () => {
    render(<JsonView doc={{ count: { $numberLong: "9999999999" } }} />);
    expect(screen.getByText("NumberLong(")).toBeInTheDocument();
    expect(screen.getByText("9999999999")).toBeInTheDocument();
  });

  it("renders Decimal128 special type", () => {
    render(<JsonView doc={{ price: { $numberDecimal: "3.14" } }} />);
    expect(screen.getByText("Decimal128(")).toBeInTheDocument();
    expect(screen.getByText("3.14")).toBeInTheDocument();
  });

  it("renders Binary special type", () => {
    render(
      <JsonView
        doc={{ data: { $binary: { base64: "aGVsbG8=", subType: "00" } } }}
      />
    );
    expect(screen.getByText("Binary(")).toBeInTheDocument();
    expect(screen.getByText("aGVsbG8=")).toBeInTheDocument();
  });

  it("renders nested objects recursively", () => {
    render(<JsonView doc={{ user: { name: "Bob", age: 30 } }} />);
    expect(screen.getByText('"name"')).toBeInTheDocument();
    expect(screen.getByText('"Bob"')).toBeInTheDocument();
    expect(screen.getByText('"age"')).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("renders the field key names as quoted labels", () => {
    render(<JsonView doc={{ myField: "value" }} />);
    expect(screen.getByText('"myField"')).toBeInTheDocument();
  });
});

describe("JsonView – compact mode", () => {
  it("renders first 4 fields in compact mode", () => {
    const { container } = render(
      <JsonView compact doc={{ a: 1, b: 2, c: 3, d: 4, e: 5 }} />
    );
    expect(screen.getByText('"a"')).toBeInTheDocument();
    expect(screen.getByText('"d"')).toBeInTheDocument();
    // Fifth field is hidden by the ellipsis
    expect(screen.queryByText('"e"')).not.toBeInTheDocument();
    expect(container.textContent).toContain("…");
  });

  it("does not show ellipsis when 4 or fewer fields", () => {
    const { container } = render(<JsonView compact doc={{ a: 1, b: 2 }} />);
    // Only 2 fields, no "more" ellipsis
    const spans = container.querySelectorAll(".text-gray-600");
    const hasEllipsis = Array.from(spans).some((s) =>
      s.textContent?.includes("…")
    );
    expect(hasEllipsis).toBe(false);
  });

  it("renders null as 'null' in compact mode", () => {
    render(<JsonView compact doc={{ x: null }} />);
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("renders object as '{…}' in compact mode", () => {
    render(<JsonView compact doc={{ meta: { nested: true } }} />);
    expect(screen.getByText("{…}")).toBeInTheDocument();
  });

  it("renders array as '[…]' in compact mode", () => {
    render(<JsonView compact doc={{ tags: ["a", "b"] }} />);
    expect(screen.getByText("[…]")).toBeInTheDocument();
  });

  it("renders boolean in compact mode", () => {
    render(<JsonView compact doc={{ active: true }} />);
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("renders number in compact mode", () => {
    render(<JsonView compact doc={{ n: 42 }} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});

describe("JsonView – onFilterByKey popup", () => {
  it("shows a filter popup when a key is clicked", () => {
    const onFilterByKey = vi.fn();
    render(
      <JsonView
        doc={{ name: "Alice" }}
        onFilterByKey={onFilterByKey}
      />
    );
    // Click the key label
    const keyEl = screen.getByText('"name"');
    // getBoundingClientRect is needed for popup positioning; mock it
    Object.defineProperty(keyEl, "getBoundingClientRect", {
      value: () => ({ bottom: 100, left: 200, top: 80, right: 250, width: 50, height: 20 }),
    });
    fireEvent.click(keyEl);
    // The "Filter by" text should appear in the popup
    expect(screen.getByText(/Filter by/i)).toBeInTheDocument();
  });

  it("calls onFilterByKey with the correct filter string when popup button is clicked", () => {
    const onFilterByKey = vi.fn();
    render(
      <JsonView doc={{ age: 30 }} onFilterByKey={onFilterByKey} />
    );
    const keyEl = screen.getByText('"age"');
    Object.defineProperty(keyEl, "getBoundingClientRect", {
      value: () => ({ bottom: 100, left: 200, top: 80, right: 250, width: 50, height: 20 }),
    });
    fireEvent.click(keyEl);
    const filterBtn = screen.getByRole("button", { name: /Filter by/i });
    fireEvent.click(filterBtn);
    expect(onFilterByKey).toHaveBeenCalledWith('{ "age": 30 }');
  });

  it("closes the popup when the same key is clicked again", () => {
    const onFilterByKey = vi.fn();
    render(
      <JsonView doc={{ name: "Alice" }} onFilterByKey={onFilterByKey} />
    );
    const keyEl = screen.getByText('"name"');
    Object.defineProperty(keyEl, "getBoundingClientRect", {
      value: () => ({ bottom: 100, left: 200, top: 80, right: 250, width: 50, height: 20 }),
    });
    fireEvent.click(keyEl); // open
    expect(screen.getByText(/Filter by/i)).toBeInTheDocument();
    fireEvent.click(keyEl); // close
    expect(screen.queryByText(/Filter by/i)).not.toBeInTheDocument();
  });

  it("does not show popup when onFilterByKey is not provided", () => {
    render(<JsonView doc={{ name: "Alice" }} />);
    // Clicking the key should do nothing (no popup)
    const keyEl = screen.getByText('"name"');
    fireEvent.click(keyEl);
    expect(screen.queryByText(/Filter by/i)).not.toBeInTheDocument();
  });
});
