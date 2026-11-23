import { z } from "astro/zod";
import directory from "../data/friends.json";
import snapshots from "../data/friend-updates.json";

const webURL = z.url({ protocol: /^https?$/ });
const link = z.object({ title: z.string().min(1), url: webURL });
const date = z.string().refine(value => Number.isFinite(Date.parse(value)), "日期无效");
const latest = link.extend({ date: date.optional(), updated: date.optional() });
const site = z.object({
  group: z.enum(["friends", "reading"]),
  name: z.string().min(1),
  url: webURL,
  note: z.string().min(1),
  picks: z.array(link),
  feed: webURL.optional(),
  latest: latest.optional(),
});

export type FriendSite = z.infer<typeof site>;
const updates = z.record(z.string(), latest).parse(snapshots);
export const friends = z.array(site).parse(directory).map(entry => ({
  ...entry,
  latest: (entry.feed && updates[entry.feed]) || entry.latest,
}));
