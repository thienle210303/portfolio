import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { profile } from "@/content/portfolio";
import { OPEN_GRAPH_BASE, SHARE_IMAGE } from "@/lib/seo";
import { SHOWN, shownProject, workHref } from "@/lib/showcase";
import CaseStudy from "@/sections/Work/CaseStudy";

/**
 * One case study, shown (round 32): `/work/<project id>` for each featured
 * project. Built at build time from `SHOWN`; any other id is the site's own
 * noindex 404 (`dynamicParams = false`), so a project that is not featured
 * (the class projects) never gets a page by guessing its id.
 *
 * Metadata follows `/resume`: a canonical, the shared Open Graph base and the
 * root's share image named explicitly, since a page's `openGraph` replaces the
 * layout's whole. The description is the project's `tagline`, which
 * `e2e/seo.spec.ts` holds to 160 characters.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SHOWN.map((project) => ({ id: project.id }));
}

type Props = { readonly params: Promise<{ readonly id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = shownProject(id);
  if (!project) return {};
  const url = workHref(project.id);
  return {
    title: project.title,
    description: project.tagline,
    alternates: { canonical: url },
    openGraph: {
      ...OPEN_GRAPH_BASE,
      url,
      title: `${project.title} — ${profile.name}`,
      description: project.tagline,
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", images: [SHARE_IMAGE] },
  };
}

export default async function WorkPage({ params }: Props) {
  const { id } = await params;
  const project = shownProject(id);
  if (!project) notFound();
  return <CaseStudy project={project} />;
}
