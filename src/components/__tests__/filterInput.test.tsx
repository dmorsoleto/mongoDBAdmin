import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterInput } from "../FilterInput";

function makeProps(overrides: Partial<Parameters<typeof FilterInput>[0]> = {}) {
  return {
    value: "",
    onChange: vi.fn(),
    onEnter: vi.fn(),
    placeholder: "Enter filter",
    fieldNames: ["name", "age", "email", "status"],
    ...overrides,
  };
}

describe("FilterInput – rendering", () => {
  it("renders the Filter label and input", () => {
    render(<FilterInput {...makeProps()} />);
    expect(screen.getByText("Filter")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows the placeholder text", () => {
    render(<FilterInput {...makeProps({ placeholder: "Type a query…" })} />);
    expect(screen.getByPlaceholderText("Type a query…")).toBeInTheDocument();
  });

  it("displays the controlled value", () => {
    render(<FilterInput {...makeProps({ value: '{ "age": 30 }' })} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe('{ "age": 30 }');
  });

  it("calls onChange when the user types", () => {
    const onChange = vi.fn();
    render(<FilterInput {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith("hello");
  });
});

describe("FilterInput – operator suggestions", () => {
  it("shows operator suggestions when typing $", () => {
    const onChange = vi.fn();
    render(<FilterInput {...makeProps({ onChange })} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "$" } });
    // Several operators start with $ — at least $eq should appear
    expect(screen.getByText("$eq")).toBeInTheDocument();
  });

  it("filters operators by prefix", () => {
    render(<FilterInput {...makeProps()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "$gt" } });
    expect(screen.getByText("$gt")).toBeInTheDocument();
    expect(screen.getByText("$gte")).toBeInTheDocument();
    // $eq does NOT start with "$gt"
    expect(screen.queryByText("$eq")).not.toBeInTheDocument();
  });

  it("shows operator description alongside the label", () => {
    render(<FilterInput {...makeProps()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "$eq" } });
    expect(screen.getByText("Equal to")).toBeInTheDocument();
  });
});

describe("FilterInput – constructor suggestions (value position)", () => {
  it("shows constructor suggestions after a colon", () => {
    render(<FilterInput {...makeProps()} />);
    // Position cursor after ": " — value position for a token starting with "O"
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "{ name: O" },
    });
    expect(screen.getByText("ObjectId")).toBeInTheDocument();
  });

  it("shows all constructors when no prefix is given in value position", () => {
    render(<FilterInput {...makeProps()} />);
    // Just a colon and space — empty token in value position
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "{ name: " },
    });
    // With empty token, all constructors should appear
    expect(screen.getByText("ObjectId")).toBeInTheDocument();
    expect(screen.getByText("ISODate")).toBeInTheDocument();
  });
});

describe("FilterInput – field name suggestions (key position)", () => {
  it("shows field name suggestions when typing a key token", () => {
    render(<FilterInput {...makeProps({ fieldNames: ["username", "email"] })} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "{ user" },
    });
    expect(screen.getByText("username")).toBeInTheDocument();
  });

  it("does not suggest the exact field name that is already typed", () => {
    render(<FilterInput {...makeProps({ fieldNames: ["name"] })} />);
    // Typing the exact field name should not suggest itself
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "{ name" },
    });
    // The suggestion list should be empty (no element with text "name" from suggestions)
    // Since the filter excludes `f !== token`, "name" === "name" so it's excluded
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});

describe("FilterInput – keyboard navigation", () => {
  it("navigates suggestions with ArrowDown and ArrowUp", () => {
    render(<FilterInput {...makeProps()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "$" } });

    // First item ($eq) should be highlighted initially
    const items = screen.getAllByText(/^\$/).filter(
      (el) => el.tagName === "SPAN"
    );
    expect(items.length).toBeGreaterThan(0);

    // Press ArrowDown to move selection
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // Press ArrowUp to move back
    fireEvent.keyDown(input, { key: "ArrowUp" });
    // No error thrown and suggestions still visible
    expect(screen.getByText("$eq")).toBeInTheDocument();
  });

  it("closes suggestions with Escape", () => {
    render(<FilterInput {...makeProps()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "$" } });
    expect(screen.getByText("$eq")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByText("$eq")).not.toBeInTheDocument();
  });

  it("applies a suggestion with Tab", () => {
    const onChange = vi.fn();
    render(<FilterInput {...makeProps({ onChange, value: "" })} />);
    const input = screen.getByRole("textbox");
    // Trigger suggestions by typing $eq
    fireEvent.change(input, { target: { value: "$eq" } });
    // Now suggestions are visible; onChange was called once already from handleChange
    expect(onChange).toHaveBeenCalledWith("$eq");
    // Press Tab to apply first suggestion — onChange is called again with the completed text
    onChange.mockClear();
    fireEvent.keyDown(input, { key: "Tab" });
    expect(onChange).toHaveBeenCalled();
  });

  it("applies a suggestion with Enter", () => {
    const onChange = vi.fn();
    render(<FilterInput {...makeProps({ onChange, value: "" })} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "$gt" } });
    expect(onChange).toHaveBeenCalledWith("$gt");
    onChange.mockClear();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalled();
  });

  it("calls onEnter when Enter is pressed with no suggestions", () => {
    const onEnter = vi.fn();
    render(<FilterInput {...makeProps({ onEnter, value: '{"name": "Alice"}' })} />);
    const input = screen.getByRole("textbox");
    // No suggestions active — press Enter
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onEnter).toHaveBeenCalled();
  });
});

describe("FilterInput – suggestion click", () => {
  it("applies suggestion when clicked via mouseDown", () => {
    const onChange = vi.fn();
    render(<FilterInput {...makeProps({ onChange })} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "$eq" } });

    // Click the $eq suggestion item
    const suggestion = screen.getByText("$eq");
    fireEvent.mouseDown(suggestion);
    expect(onChange).toHaveBeenCalled();
  });
});

describe("FilterInput – no suggestions for neutral input", () => {
  it("does not show suggestions for plain text without context", () => {
    render(<FilterInput {...makeProps()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    // "hello" is not a $ operator, not in value position, not in key position after {
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clears suggestions when token is empty (cursor after separator)", () => {
    render(<FilterInput {...makeProps()} />);
    const input = screen.getByRole("textbox");
    // First show some suggestions
    fireEvent.change(input, { target: { value: "$" } });
    expect(screen.getByText("$eq")).toBeInTheDocument();
    // Now type a space (empty token) — clears suggestions
    fireEvent.change(input, { target: { value: "{ " } });
    expect(screen.queryByText("$eq")).not.toBeInTheDocument();
  });
});

describe("FilterInput – outside click closes suggestions", () => {
  it("closes the dropdown when mousedown fires outside the input and list", () => {
    render(<FilterInput {...makeProps()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "$" } });
    expect(screen.getByText("$eq")).toBeInTheDocument();
    // Mousedown on the body (outside input and list)
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("$eq")).not.toBeInTheDocument();
  });
});
