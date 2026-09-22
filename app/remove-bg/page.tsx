import type { Metadata } from "next";
import { RemoveBackgroundScreen } from "@/components/remove-bg/RemoveBackgroundScreen";

/** The tab title stays "Photo Craft"; only the description changes. */
export const metadata: Metadata = {
  description: "Remove the background from pictures in your browser, several at once, and download them at any size.",
};

/** Remove background route: the batch cutout page. */
export default function RemoveBackgroundPage() {
  return <RemoveBackgroundScreen />;
}
