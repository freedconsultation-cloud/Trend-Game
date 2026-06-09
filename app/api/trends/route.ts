import { NextResponse } from "next/server";

const SKIP = /^(Main_Page|Special:|Wikipedia:|Portal:|Help:|File:|Template:|Category:)/;

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K+`;
  return String(n);
}

export async function GET() {
  // Use yesterday — today's data isn't complete yet
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const topRes = await fetch(
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${year}/${month}/${day}`,
    { next: { revalidate: 3600 } }
  );

  if (!topRes.ok) {
    return NextResponse.json({ error: "Failed to fetch Wikipedia top pages" }, { status: 500 });
  }

  const topData = await topRes.json();
  const articles: { article: string; views: number }[] = topData.items[0].articles
    .filter((a: any) => !SKIP.test(a.article))
    .slice(0, 30);

  // Batch-fetch thumbnails from Wikipedia API
  const titles = articles.map((a) => decodeURIComponent(a.article.replace(/_/g, " "))).join("|");
  const imgRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&pithumbsize=600&format=json&origin=*`,
    { next: { revalidate: 3600 } }
  );
  const imgData = await imgRes.json();

  // Build title → imageUrl map
  const imageMap: Record<string, string> = {};
  for (const page of Object.values(imgData.query.pages) as any[]) {
    if (page.thumbnail?.source) {
      imageMap[page.title.replace(/ /g, "_")] = page.thumbnail.source;
    }
  }

  const trends = articles.map((a) => ({
    query: decodeURIComponent(a.article.replace(/_/g, " ")),
    traffic: formatViews(a.views),
    trafficNum: a.views,
    imageUrl: imageMap[a.article] ?? "",
  }));

  return NextResponse.json({ trends });
}
