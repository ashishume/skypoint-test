import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";
import { compactNumber, formatCurrencyRange, jobTypeLabels } from "@/lib/format";

describe("format helpers", () => {
  it("formats salary ranges and empty salaries", () => {
    expect(formatCurrencyRange(100000, 200000)).toContain("1,00,000");
    expect(formatCurrencyRange(100000, null)).toContain("From");
    expect(formatCurrencyRange(null, 200000)).toContain("Up to");
    expect(formatCurrencyRange(null, null)).toBe("Salary not disclosed");
  });

  it("compacts large numbers for dashboard cards", () => {
    expect(compactNumber(1200)).toMatch(/1\.2/);
  });

  it("exposes stable job type labels", () => {
    expect(jobTypeLabels.full_time).toBe("Full time");
    expect(jobTypeLabels.internship).toBe("Internship");
  });

  it("merges tailwind classes predictably", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });
});
