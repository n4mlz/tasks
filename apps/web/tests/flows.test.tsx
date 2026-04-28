/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import InboxPage from "../app/inbox/page";
import WeekPage from "../app/week/page";

describe("Inbox flow", () => {
  it("renders task fields for planning inputs", async () => {
    render(await InboxPage());

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Remaining minutes")).toBeInTheDocument();
    expect(screen.getByLabelText("Due date")).toBeInTheDocument();
  });

  it("renders week planning actions", async () => {
    render(await WeekPage());

    expect(screen.getAllByRole("button", { name: "Save capacity" }).length).toBeGreaterThan(0);
  });
});
