import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProjectRecording, { RecordingVideo } from "@/sections/CareerTree/ProjectRecording";

const project = { id: "chess-minmax", title: "A chess engine", recording: "chess" } as const;

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
    const { container } = render(<ProjectRecording project={project} recording="chess" />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("/media/");
    expect(screen.getByRole("button", { name: "Play the screen recording" })).toBeInTheDocument();
  });

  it("mounts one muted, preload=none video with a poster after the press", () => {
    stubReducedMotion(false);
    const { container } = render(<ProjectRecording project={project} recording="chess" />);
    fireEvent.click(screen.getByRole("button", { name: "Play the screen recording" }));
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
  });

  it("drops the loop under reduced motion", () => {
    stubReducedMotion(true);
    const { container } = render(<ProjectRecording project={project} recording="chess" />);
    fireEvent.click(screen.getByRole("button", { name: "Play the screen recording" }));
    expect(container.querySelector("video")!.hasAttribute("loop")).toBe(false);
  });

  it("server-renders the muted attribute the client DOM sets as a property", () => {
    // React never emits `muted` as an attribute on the client, so the
    // post-press state is asserted on the server markup of the same element.
    const html = renderToString(<RecordingVideo recording="chess" title="A chess engine" loop />);
    expect(html).toContain('muted=""');
    expect(html).toContain('preload="none"');
    expect(html).not.toContain("autoplay");
  });
});
