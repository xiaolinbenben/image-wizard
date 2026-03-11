import type { Template } from "@/lib/types";
import { validateTemplateCollection } from "@/lib/template-validation";
import posterJson from "./ecommerce-poster.json";
import mainImageJson from "./ecommerce-main-image.json";
import ipPatternJson from "./ip-pattern.json";
import twoDImageJson from "./2d-image.json";
import fullWidthImageJson from "./full-width-image.json";

export const templates: Template[] = [
  twoDImageJson as Template,
  posterJson as Template,
  mainImageJson as Template,
  ipPatternJson as Template,
  fullWidthImageJson as Template,
];

validateTemplateCollection(templates);

export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export const defaultTemplateId = templates[0].id;
