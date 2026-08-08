import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductImage } from "./ProductImage";

const baseProduct = {
  imageUrl: null as string | null,
  name: "iPhone 15",
  category: "Smartphone",
};

describe("ProductImage", () => {
  it("renders the real image when imageUrl is set", () => {
    render(<ProductImage product={{ ...baseProduct, imageUrl: "https://cdn.test/iphone.png" }} />);

    const img = screen.getByRole("img", { name: "iPhone 15" });
    expect(img).toHaveAttribute("src", expect.stringContaining("iphone.png"));
  });

  it("falls back to the category placeholder icon when there is no imageUrl", () => {
    const { container } = render(<ProductImage product={{ ...baseProduct, imageUrl: null }} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-blue-50")).toBeInTheDocument();
  });

  it("falls back to the default placeholder for an unknown category", () => {
    const { container } = render(
      <ProductImage product={{ ...baseProduct, imageUrl: null, category: "Tai nghe" }} />,
    );

    expect(container.querySelector(".bg-neutral-100")).toBeInTheDocument();
  });

  it("switches to the placeholder once the real image fails to load", () => {
    const { container } = render(
      <ProductImage product={{ ...baseProduct, imageUrl: "https://cdn.test/broken.png" }} />,
    );

    fireEvent.error(screen.getByRole("img", { name: "iPhone 15" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-blue-50")).toBeInTheDocument();
  });
});
