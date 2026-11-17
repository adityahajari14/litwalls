import { isSplitProduct } from "@/lib/product";
import type { Product } from "@/lib/shopify/types";

type SubjectProduct = Pick<Product, "title" | "tags">;
export type CollectionFacet = { value: string; label: string; count: number };
export type CollectionFilterParams = { subject?: string; format?: string };

const ALIASES: Record<string, string> = {
  "spider-man": "Spider-Man", spiderman: "Spider-Man", ironman: "Iron Man",
  "naruto-uzumaki": "Naruto", "monkey-d-luffy": "Luffy",
  "hanuman-kind": "Hanumankind", hanumankind: "Hanumankind",
  honeysingh: "Yo Yo Honey Singh", "yo-yo-honey-singh": "Yo Yo Honey Singh",
  rose: "Rosé", "rose-and-bruno-mars": "Rosé & Bruno Mars",
  "kiki-s-delivery-service": "Kiki's Delivery Service",
};

// Group car models and team variants under names present in their titles.
const MARQUES = ["Alfa Romeo", "Aston Martin", "BMW", "Dodge", "Ferrari", "Ford", "Haas", "Lamborghini", "McLaren", "Mercedes", "Nissan", "Porsche", "Red Bull", "Renault", "Rolls Royce", "Toyota", "Williams", "Alpine"];

function slug(label: string) {
  return label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || encodeURIComponent(label);
}

export function collectionSubjectLabel(handle: string) {
  if (handle === "marvel" || handle === "dc") return "Characters";
  if (handle === "music") return "Artists & titles";
  if (handle === "cars") return "Brands & themes";
  if (handle === "f1") return "Teams, drivers & themes";
  if (handle === "anime") return "Characters & series";
  return "Titles & themes";
}

/** Title prefixes survive inconsistent category tags and numbered variants. */
export function collectionProductSubjects(handle: string, product: SubjectProduct) {
  const prefix = product.title.split("|")[0].split("#")[0].trim();
  const key = slug(prefix);
  if (handle === "cars" || handle === "f1") {
    const words = `-${key}-`;
    const marques = MARQUES.filter((name) => words.includes(`-${slug(name)}-`) || (name === "Ferrari" && /\bla ?ferrari\b/i.test(prefix)));
    if (marques.length > 0) return marques.map((label) => ({ label, value: slug(label) }));
  }
  const label = ALIASES[key] ?? prefix;
  return [{ label, value: slug(label) }];
}

function subjectsFor(handle: string, products: SubjectProduct[]): CollectionFacet[] {
  const facets = new Map<string, CollectionFacet>();
  for (const product of products) {
    for (const subject of collectionProductSubjects(handle, product)) {
      const current = facets.get(subject.value);
      if (current) current.count++;
      else facets.set(subject.value, { ...subject, count: 1 });
    }
  }
  return [...facets.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "en"));
}

/** Counts and matches come from the entire collection, before pagination. */
export function selectCollectionProducts(handle: string, products: Product[], params: CollectionFilterParams) {
  const allSubjects = subjectsFor(handle, products);
  const allFormats: CollectionFacet[] = [
    { value: "single", label: "Single posters", count: products.filter((p) => !isSplitProduct(p)).length },
    { value: "split", label: "Split posters", count: products.filter(isSplitProduct).length },
  ].filter((facet) => facet.count > 0);
  const subject = allSubjects.find((facet) => facet.value === params.subject)?.value;
  const format = allFormats.find((facet) => facet.value === params.format)?.value;
  const matchesSubject = (product: Product) => !subject || collectionProductSubjects(handle, product).some((entry) => entry.value === subject);
  const matchesFormat = (product: Product) => !format || isSplitProduct(product) === (format === "split");
  const byFormat = products.filter(matchesFormat);
  const bySubject = products.filter(matchesSubject);
  const subjectCounts = new Map(subjectsFor(handle, byFormat).map((facet) => [facet.value, facet.count]));
  return {
    products: byFormat.filter(matchesSubject), subject, format,
    subjects: allSubjects.map((facet) => ({ ...facet, count: subjectCounts.get(facet.value) ?? 0 })),
    formats: allFormats.length > 1 ? allFormats.map((facet) => ({ ...facet, count: bySubject.filter((p) => isSplitProduct(p) === (facet.value === "split")).length })) : [],
    subjectTotal: byFormat.length, formatTotal: bySubject.length,
  };
}

/** Anchor to a product so newly published posters cannot shift later pages. */
export function collectionProductPage(products: Product[], after: string | undefined, pageSize: number) {
  const anchor = after ? products.findIndex((product) => product.id === after) : -1;
  // Accept numeric cursors from an already-open tab during a deployment.
  const legacy = Number(after ?? 0);
  const offset = anchor >= 0 ? anchor + 1 : Number.isSafeInteger(legacy) && legacy >= 0 ? legacy : 0;
  const size = Number.isFinite(pageSize) ? Math.min(48, Math.max(1, Math.floor(pageSize))) : 24;
  const page = products.slice(offset, offset + size);
  const hasNextPage = offset + size < products.length;
  return { products: page, hasNextPage, endCursor: hasNextPage ? page[page.length - 1]?.id ?? null : null };
}
