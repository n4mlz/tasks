/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";
import InboxPage from "../app/inbox/page";
import ProposalsPage from "../app/proposals/page";
import WeekPage from "../app/week/page";

describe("Web UI", () => {
  it("renders the daily execution heading", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
  });

  it("renders work-log inputs on the Today page", async () => {
    render(await HomePage());

    expect(screen.getAllByLabelText("Spent minutes").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Remaining after").length).toBeGreaterThan(0);
  });

  it("renders the richer Inbox fields", async () => {
    render(await InboxPage());

    expect(screen.getByLabelText("Due date")).toBeInTheDocument();
    expect(screen.getByLabelText("Urgency")).toBeInTheDocument();
    expect(screen.getByLabelText("Task type")).toBeInTheDocument();
    expect(screen.getByLabelText("Energy")).toBeInTheDocument();
  });

  it("renders editable capacity inputs on the Week page", async () => {
    render(await WeekPage());

    expect(screen.getAllByLabelText("Available minutes").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Buffer minutes").length).toBeGreaterThan(0);
  });

  it("renders proposal detail sections", async () => {
    render(await ProposalsPage());

    expect(screen.getByText("Unscheduled tasks")).toBeInTheDocument();
    expect(screen.getByText("Capacity pressure")).toBeInTheDocument();
  });
});
