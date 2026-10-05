/** Shared persistence projection shape; no runtime repository dependency. */
export type ActivityRowShape = Readonly<{
  readonly activityId: string;
  readonly scopeId: string;
  readonly slug: string;
  readonly title: string;
  readonly itemId: string;
  readonly ordinal: number;
  readonly kind: string;
  readonly contentStatus: string;
  readonly itemTitle: string;
  readonly text: string;
  readonly responseMode: string;
  readonly choices?: unknown;
  readonly selectionMode?: unknown;
}>;
