import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskThienMini from "@/sections/AIWorkflowLab/AskThienMini";
import { heroAskCaption } from "@/content/ai-experiments";

/**
 * The hero's "Ask Thien" tab content — a smaller mirror of the Lab's
 * `AskThisSite`, not a second engine. What distinguishes it, and what this
 * file exists to pin: it shows the *latest* turn only (a new question
 * replaces the one on screen, it never grows a list), it has no Code view,
 * it never touches `/api/ask`, and it links out to the Lab rather than
 * reimplementing the full thread.
 */

function questionField() {
  return screen.getByRole("textbox", { name: "Ask Thien a question about this portfolio" });
}

async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  await user.clear(questionField());
  await user.type(questionField(), question);
  await user.keyboard("{Enter}");
}

describe("AskThienMini", () => {
  it("shows the honest static-engine caption, mirroring the Lab's framing", () => {
    render(<AskThienMini />);
    expect(screen.getByText(heroAskCaption)).toBeInTheDocument();
    expect(heroAskCaption).toMatch(/no model/i);
  });

  it("links back to the full conversation in the Lab", () => {
    render(<AskThienMini />);
    const link = screen.getByRole("link", { name: /Full conversation in the Lab/ });
    expect(link).toHaveAttribute("href", "#lab");
  });

  it("answers a question with sourced evidence, the same shape the Lab's chat uses", async () => {
    const user = userEvent.setup();
    render(<AskThienMini />);

    await ask(user, "What does he do at DoorDash?");

    const results = screen.getByRole("list", { name: "Sourced answers" });
    expect(results).toBeInTheDocument();
    expect(within(results).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(results).toHaveTextContent(/DoorDash/i);
  });

  it("says so plainly, and invents nothing, when the page has no answer", async () => {
    const user = userEvent.setup();
    render(<AskThienMini />);

    await ask(user, "what is the capital of France");

    expect(screen.getByText(/Nothing on this page answers that/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Sourced answers" })).not.toBeInTheDocument();
  });

  it("shows only the latest turn -- a second question replaces the first rather than appending to a list", async () => {
    const user = userEvent.setup();
    render(<AskThienMini />);

    await ask(user, "What does he do at DoorDash?");
    expect(screen.getByRole("list", { name: "Sourced answers" })).toBeInTheDocument();

    await ask(user, "Where did he study?");

    // Only one question is ever visible at a time.
    expect(screen.queryByText("What does he do at DoorDash?")).not.toBeInTheDocument();
    expect(screen.getByText(/^Where did he study\?$/)).toBeInTheDocument();
  });

  it("never renders a Code view -- prose is the only reading here", async () => {
    const user = userEvent.setup();
    render(<AskThienMini />);
    await ask(user, "What does he do at DoorDash?");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Code" })).not.toBeInTheDocument();
  });

  it("keeps focus in the question field after asking, ready for a follow-up with no mouse", async () => {
    const user = userEvent.setup();
    render(<AskThienMini />);
    await ask(user, "scraper");
    expect(questionField()).toHaveFocus();
  });
});
