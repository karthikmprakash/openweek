import { cache } from "react";
import { getDb } from "@/lib/db";
import { getStudioBySlug } from "@/lib/schedule";

/** Per-request studio lookup so generateMetadata and the page share one query. */
export const studioBySlug = cache((slug: string) => getStudioBySlug(getDb(), slug));
