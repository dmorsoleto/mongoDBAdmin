import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsModal } from "../SettingsModal";
import { useStore } from "../../store";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
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

describe("SettingsModal – rendering", () => {
  it("renders the modal title", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows General and Theme tabs", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });

  it("renders the General tab by default", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    expect(screen.getByText("Set Read-Only Mode")).toBeInTheDocument();
    expect(
      screen.getByText("Protect Connection String Secrets")
    ).toBeInTheDocument();
  });

  it("renders Save and Cancel buttons", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i })
    ).toBeInTheDocument();
  });

  it("renders the close (X) button in the header", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    // Lucide X renders as an svg; the header close button has no accessible name.
    // We look for buttons (close button + Cancel + Save = at least 3)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });
});

describe("SettingsModal – tab switching", () => {
  it("shows Theme tab content when Theme tab is clicked", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Theme"));
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
  });

  it("switches back to General tab after going to Theme", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Theme"));
    fireEvent.click(screen.getByText("General"));
    expect(screen.getByText("Set Read-Only Mode")).toBeInTheDocument();
  });
});

describe("SettingsModal – General tab interactions", () => {
  it("toggles Read-Only Mode checkbox", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    // Find the checkbox div for Read-Only Mode and click it
    const label = screen.getByText("Set Read-Only Mode");
    fireEvent.click(label);
    // readOnlyMode in draft changes; we verify the UI reflects it (checked state)
    // The checkbox is a custom div, so we look for background class change
    // by clicking Save and checking the store
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(useStore.getState().readOnlyMode).toBe(true);
  });

  it("toggles Protect Connection String Secrets checkbox", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    const label = screen.getByText("Protect Connection String Secrets");
    fireEvent.click(label);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(useStore.getState().protectConnectionStringSecrets).toBe(true);
  });

  it("sets maxTimeMsLimit via input field", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText("No limit");
    fireEvent.change(input, { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(useStore.getState().maxTimeMsLimit).toBe(5000);
  });

  it("sets maxTimeMsLimit to null when input is cleared", () => {
    useStore.setState({ maxTimeMsLimit: 3000 });
    render(<SettingsModal onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText("No limit");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(useStore.getState().maxTimeMsLimit).toBeNull();
  });

  it("changes default sort by clicking a sort option", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    // Click the _id: 1 sort option
    const sortOption = screen.getByText("_id: 1");
    fireEvent.click(sortOption);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(useStore.getState().defaultSort).toBe("_id_asc");
  });

  it("displays the warning for natural_desc sort option", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    expect(
      screen.getByText(/Avoid this option if you connect to production/i)
    ).toBeInTheDocument();
  });
});

describe("SettingsModal – Theme tab interactions", () => {
  it("selects Light theme and saves it", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Theme"));
    fireEvent.click(screen.getByText("Light"));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(useStore.getState().theme).toBe("light");
  });

  it("keeps Dark theme when Dark option is clicked", () => {
    render(<SettingsModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Theme"));
    fireEvent.click(screen.getByText("Dark"));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(useStore.getState().theme).toBe("dark");
  });
});

describe("SettingsModal – close behaviour", () => {
  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(<SettingsModal onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose after Save is clicked", () => {
    const onClose = vi.fn();
    render(<SettingsModal onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop overlay is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<SettingsModal onClose={onClose} />);
    // The outermost fixed div is the backdrop trigger
    const backdrop = container.ownerDocument.querySelector(
      ".fixed.inset-0.z-50"
    ) as HTMLElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledOnce();
    }
  });
});
