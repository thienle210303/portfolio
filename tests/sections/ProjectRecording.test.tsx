import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProjectRecording, { RecordingVideo } from "@/sections/CareerTree/ProjectRecording";
import CaseStudy from "@/sections/CareerTree/CaseStudy";
import { Button } from "@/components/ui/Button";
import { projects } from "@/content/portfolio";

const project = { id: "chess-minmax", title: "A chess engine", recording: "chess" } as const;
const PLAY = "Play the screen recording of A chess engine";

function renderRecording() {
  return render(<ProjectRecording project={project} recording="chess" describedBy="chess-tagline" />);
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a project recording", () => {
  it("puts no video and no poster in the DOM before the press", () => {
    stubReducedMotion(false);
    const { container } = renderRecording();
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("/media/");
    expect(screen.getByRole("button", { name: PLAY })).toBeInTheDocument();
  });

  it("names the project in the button, with the visible label leading the name", () => {
    // Four of these sit on the page. WCAG 2.5.3: the accessible name contains
    // the visible text, so speech input still matches what is on screen.
    renderRecording();
    const button = screen.getByRole("button", { name: PLAY });
    expect(button).toHaveTextContent(/^Play the screen recording$/);
    expect(button.getAttribute("aria-label")?.startsWith(button.textContent ?? "\u0000")).toBe(true);
  });

  it("looks exactly like the shared secondary/sm Button, without importing it", () => {
    renderRecording();
    render(
      <Button variant="secondary" size="sm">
        reference
      </Button>,
    );
    const ours = screen.getByRole("button", { name: PLAY }).className;
    const reference = screen.getByRole("button", { name: "reference" }).className;
    expect(ours).toBe(reference);
    expect(ours).not.toMatch(/bg-\[color:var\(--accent\)\]/);
  });

  it("mounts one muted, preload=none video with a poster after the press", () => {
    stubReducedMotion(false);
    const { container } = renderRecording();
    fireEvent.click(screen.getByRole("button", { name: PLAY }));
    const video = container.querySelector("video") as HTMLVideoElement;
    expect(video).not.toBeNull();
    expect(video.muted).toBe(true);
    expect(video.getAttribute("preload")).toBe("none");
    expect(video.hasAttribute("autoplay")).toBe(false);
    expect(video.hasAttribute("controls")).toBe(true);
    expect(video.getAttribute("poster")).toBe("/media/chess.jpg");
    expect(video.getAttribute("src")).toBe("/media/chess.mp4");
    expect(video.getAttribute("aria-label")).toBe("A chess engine — screen recording");
    expect(video.hasAttribute("loop")).toBe(true);
    expect(video.getAttribute("aria-describedby")).toBe("chess-tagline");
    // 16:9 before the poster arrives, so the press shifts nothing below it.
    expect(video.className.split(/\s+/)).toContain("aspect-video");
  });

  it("drops the loop under reduced motion", () => {
    stubReducedMotion(true);
    const { container } = renderRecording();
    fireEvent.click(screen.getByRole("button", { name: PLAY }));
    expect(container.querySelector("video")!.hasAttribute("loop")).toBe(false);
  });

  it("reads the motion preference at the press, not before", () => {
    stubReducedMotion(false);
    const { container } = renderRecording();
    stubReducedMotion(true);
    fireEvent.click(screen.getByRole("button", { name: PLAY }));
    expect(container.querySelector("video")!.hasAttribute("loop")).toBe(false);
  });

  it("server-renders the muted attribute the client DOM sets as a property", () => {
    // React never emits `muted` as an attribute on the client, so the
    // post-press state is asserted on the server markup of the same element.
    const html = renderToString(
      <RecordingVideo recording="chess" title="A chess engine" loop describedBy="chess-tagline" />,
    );
    expect(html).toContain('muted=""');
    expect(html).toContain('preload="none"');
    expect(html).not.toContain("autoplay");
  });
});

describe("a recording inside its case study", () => {
  const recorded = projects.filter((candidate) => candidate.recording);

  it("covers every project that ships a recording", () => {
    expect(recorded.map((candidate) => candidate.recording)).toEqual(["chess", "conscea", "degreework", "toys"]);
  });

  it.each(recorded.map((candidate) => [candidate.id, candidate] as const))(
    "%s: is described by the case study's own tagline, which is authored text (WCAG 1.2.1)",
    (_id, recordedProject) => {
      stubReducedMotion(false);
      const { container } = render(<CaseStudy project={recordedProject} index={0} />);
      const button = screen.getByRole("button", {
        name: `Play the screen recording of ${recordedProject.title}`,
        hidden: true,
      });
      fireEvent.click(button);
      const video = container.querySelector("video");
      if (!video) throw new Error("no video after the press");
      const describedBy = video.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const description = document.getElementById(describedBy ?? "");
      expect(description, "aria-describedby points at nothing").not.toBeNull();
      expect(description?.textContent?.trim()).not.toBe("");
      expect(description?.textContent).toBe(recordedProject.tagline);
      expect(video).toHaveAccessibleDescription(recordedProject.tagline);
    },
  );
});
