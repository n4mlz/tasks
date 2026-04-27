/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import InboxPage from "../app/inbox/page";

describe("Inbox flow", () => {
  it("renders task fields for title and remaining estimate", async () => {
    render(await InboxPage());

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Remaining minutes")).toBeInTheDocument();
  });
});
