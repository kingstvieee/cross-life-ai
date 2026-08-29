export type EventCategory = "Arts" | "Community" | "Wellbeing" | "Style" | "Professional" | "Nightlife";
export type EventSort = "soonest" | "low-cost" | "low-energy";

export interface EventListing {
  id: string;
  title: string;
  category: EventCategory;
  dateLabel: string;
  scheduleRank: number;
  venue: string;
  neighborhood: string;
  format: "In person" | "Online" | "Hybrid";
  priceLabel: string;
  costRank: number;
  energyLabel: "Low energy" | "Moderate energy" | "High energy";
  energyRank: number;
  detail: string;
}

export const EVENT_CATEGORIES: { id: EventCategory | "All"; label: string }[] = [
  { id: "All", label: "All" },
  { id: "Arts", label: "Arts" },
  { id: "Community", label: "Community" },
  { id: "Wellbeing", label: "Wellbeing" },
  { id: "Style", label: "Style" },
  { id: "Professional", label: "Professional" },
  { id: "Nightlife", label: "Nightlife" },
];

export const EVENT_SORTS: { id: EventSort; label: string; detail: string }[] = [
  { id: "soonest", label: "Soonest", detail: "Show the next scheduled options first." },
  { id: "low-cost", label: "Lowest cost", detail: "Prioritize the lighter-cost options." },
  { id: "low-energy", label: "Lowest energy", detail: "Prioritize options that require less social energy." },
];

export const EVENT_PREVIEWS: EventListing[] = [
  { id: "gallery-night", title: "Independent gallery night", category: "Arts", dateLabel: "Thu · 6:30 PM", scheduleRank: 1, venue: "West-end studio row", neighborhood: "Downtown West", format: "In person", priceLabel: "Free", costRank: 0, energyLabel: "Moderate energy", energyRank: 2, detail: "A concise arts outing with a natural end time and room for one meaningful conversation." },
  { id: "park-repair", title: "Neighbourhood repair café", category: "Community", dateLabel: "Sat · 11:00 AM", scheduleRank: 2, venue: "Civic library lab", neighborhood: "Midtown", format: "In person", priceLabel: "Free", costRank: 0, energyLabel: "Low energy", energyRank: 1, detail: "Bring one item to repair, learn a practical skill, and contribute at your own pace." },
  { id: "slow-sunday", title: "Slow Sunday movement class", category: "Wellbeing", dateLabel: "Sun · 10:00 AM", scheduleRank: 3, venue: "Riverside community room", neighborhood: "East End", format: "Hybrid", priceLabel: "$12", costRank: 12, energyLabel: "Low energy", energyRank: 1, detail: "A low-pressure reset with online access if leaving home does not feel right that day." },
  { id: "wardrobe-swap", title: "Wardrobe exchange and repair table", category: "Style", dateLabel: "Sun · 2:00 PM", scheduleRank: 4, venue: "Neighbourhood market hall", neighborhood: "West End", format: "In person", priceLabel: "Pay what you can", costRank: 5, energyLabel: "Moderate energy", energyRank: 2, detail: "Trade, tailor, and restyle pieces before considering a purchase." },
  { id: "creative-systems", title: "Creative systems co-working", category: "Professional", dateLabel: "Tue · 5:30 PM", scheduleRank: 5, venue: "Independent workspace", neighborhood: "Financial District", format: "In person", priceLabel: "$18", costRank: 18, energyLabel: "Moderate energy", energyRank: 2, detail: "A structured work block for people who want progress without a loud networking room." },
  { id: "night-studio", title: "Late studio listening room", category: "Nightlife", dateLabel: "Fri · 8:00 PM", scheduleRank: 6, venue: "Small listening bar", neighborhood: "Harbourfront", format: "In person", priceLabel: "$15", costRank: 15, energyLabel: "High energy", energyRank: 3, detail: "A local-preview nightlife option with a clear arrival window, a quieter listening format, and no ticketing claim." },
];

export const INTEREST_OPTIONS = ["Nightlife", "Fashion", "Technology", "Music", "Racing", "Dance", "Art", "Business", "Food", "Sports", "Concerts", "Festivals", "Networking", "Community", "Travel", "Luxury", "Wellness"] as const;
export type EventStatus = "Saved" | "Interested" | "Going" | "Reminder";

export function organizeEvents(category: EventCategory | "All", sort: EventSort): EventListing[] {
  const visible = category === "All" ? EVENT_PREVIEWS : EVENT_PREVIEWS.filter((event) => event.category === category);
  const rank = sort === "soonest" ? "scheduleRank" : sort === "low-cost" ? "costRank" : "energyRank";
  return [...visible].sort((left, right) => left[rank] - right[rank] || left.scheduleRank - right.scheduleRank);
}
