import { describe, it, expect } from "vitest";
import { buildPriceBuckets } from "./priceBuckets";

describe("buildPriceBuckets", () => {
  it("returns no buckets when there is no price data", () => {
    expect(buildPriceBuckets(0)).toEqual([]);
  });

  it("produces a contiguous Dưới/.../Trên chain with no gaps or overlaps", () => {
    const buckets = buildPriceBuckets(45_990_000);

    expect(buckets[0].min).toBeUndefined();
    expect(buckets[0].max).toBeGreaterThan(0);
    expect(buckets[buckets.length - 1].max).toBeUndefined();
    expect(buckets[buckets.length - 1].min).toBeGreaterThan(0);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].min).toBe(buckets[i - 1].max);
    }
  });

  it("uses a consistent, nice (1/2/5 x 10^n) step between boundaries, not an arbitrary fraction", () => {
    const buckets = buildPriceBuckets(45_990_000);
    const boundaries = buckets.slice(0, -1).map((b) => b.max!);

    const step = boundaries[0];
    // Chia đều máy móc (45.990.000 / 5) sẽ ra step lẻ như 9.198.000 — step thực tế
    // phải là bội số "đẹp" (1/2/5 x 10^n).
    const magnitude = 10 ** Math.floor(Math.log10(step));
    expect([1, 2, 5, 10]).toContain(step / magnitude);
    // Và mọi mốc còn lại phải cách đều nhau đúng step đó.
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i] - boundaries[i - 1]).toBe(step);
    }
  });

  it("still returns a usable Dưới/Trên pair even when the range is narrower than one nice step", () => {
    const buckets = buildPriceBuckets(420_000, 2);
    expect(buckets.length).toBeGreaterThanOrEqual(2);
    expect(buckets[0].label).toMatch(/^Dưới/);
    expect(buckets[buckets.length - 1].label).toMatch(/^Trên/);
    expect(buckets[0].max).toBe(buckets[buckets.length - 1].min);
  });

  it("formats short Vietnamese labels for thousand and million magnitudes", () => {
    const buckets = buildPriceBuckets(45_990_000);
    expect(buckets[0].label).toBe("Dưới 10 triệu");
    expect(buckets[buckets.length - 1].label).toMatch(/^Trên \d+ triệu$/);

    const smallBuckets = buildPriceBuckets(900_000);
    expect(smallBuckets.some((b) => b.label.includes("nghìn"))).toBe(true);
  });
});
