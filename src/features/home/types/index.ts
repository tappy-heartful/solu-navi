export type HomeAnnouncement = {
  type: "pending" | "item" | "empty";
  message?: string;
  label?: string;
  link?: string;
  category?: "call" | "vote" | "fee";
};
