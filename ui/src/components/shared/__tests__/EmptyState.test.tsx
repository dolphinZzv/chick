import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/shared/EmptyState";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="Empty" description="Create something to get started" />);
    expect(screen.getByText("Create something to get started")).toBeInTheDocument();
  });

  it("does not render description when omitted", () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("renders action when provided", () => {
    render(<EmptyState title="Nothing" action={<button>Add item</button>} />);
    expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
  });

  it("does not render action slot when omitted", () => {
    const { container } = render(<EmptyState title="Nothing" />);
    expect(container.querySelector(".mt-2")).toBeNull();
  });
});
