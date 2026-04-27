/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";

describe("Today page", () => {
  it("renders the daily execution heading", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  });
});
