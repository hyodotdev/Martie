type TabMyAccessibilityItem = {
  title: string;
  description?: string;
  label?: string;
};

export function getTabMyAccessibilityLabel({
  title,
  description,
  label,
}: TabMyAccessibilityItem): string {
  return [title, description, label].filter(Boolean).join(', ');
}
