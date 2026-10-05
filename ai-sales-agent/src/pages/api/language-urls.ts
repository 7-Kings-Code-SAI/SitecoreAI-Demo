// pages/api/language-urls.ts
import type { NextApiRequest, NextApiResponse } from "next";
import client from "lib/sitecore-client"; // adjust path if your singleton lives elsewhere

interface ApiResponse {
  success: boolean;
  translations?: Record<string, string | null>;
  error?: string;
}

function toAlias(languageCode: string): string {
  return `lang_${languageCode.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { itemId, languages } = req.body as {
    itemId?: string;
    languages?: string[];
  };

  const cleanItemId = typeof itemId === "string" ? itemId.replace(/[{}]/g, "").trim() : "";
  const langList = Array.isArray(languages)
    ? languages.filter((l): l is string => typeof l === "string" && l.trim().length > 0)
    : [];

  if (!cleanItemId || langList.length === 0) {
    return res.status(400).json({ success: false, error: "itemId and languages are required" });
  }

  const aliasToLanguage = new Map<string, string>();
  const queryFields = langList
    .map((lang) => {
      const alias = toAlias(lang);
      aliasToLanguage.set(alias, lang);
      return `
        ${alias}: item(path: $itemId, language: "${lang}") {
          url {
            path
          }
        }
      `;
    })
    .join("\n");

  const query = `
    query ItemTranslations($itemId: String!) {
      ${queryFields}
    }
  `;

  try {
    const data = await client.getData<Record<string, { url?: { path?: string } } | null>>(
      query,
      { itemId: cleanItemId }
    );

    const translations: Record<string, string | null> = {};
    for (const [alias, lang] of aliasToLanguage.entries()) {
      const node = (data as any)?.[alias];
      translations[lang] = node?.url?.path ?? null;
    }

    return res.status(200).json({ success: true, translations });
  } catch (error) {
    console.error("[language-urls] Failed to fetch translations:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
