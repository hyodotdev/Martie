type ArticleAccessibilityLabelParams = {
  categoryLabel?: string;
  publishedAt?: string;
  summary?: string;
  title: string;
};

export function createArticleAccessibilityLabel({
  categoryLabel,
  publishedAt,
  summary,
  title,
}: ArticleAccessibilityLabelParams): string {
  return [title, categoryLabel, summary, publishedAt]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part)
    .join(', ');
}

type RadarAccessibilityLabelParams = {
  stats: {
    localizedName?: string | null;
    winRate?: number | null;
  }[];
  title: string;
};

export function createRadarAccessibilityLabel({
  stats,
  title,
}: RadarAccessibilityLabelParams): string {
  const statLabels = stats
    .map((stat) => {
      const localizedName = stat.localizedName?.trim();

      if (!localizedName) {
        return null;
      }

      const winRate =
        typeof stat.winRate === 'number' && Number.isFinite(stat.winRate)
          ? Math.round(stat.winRate)
          : 0;

      return `${localizedName} ${winRate}%`;
    })
    .filter((label): label is string => !!label);

  return [title.trim(), ...statLabels]
    .filter((part): part is string => !!part)
    .join(', ');
}
