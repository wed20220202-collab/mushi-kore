import { MushiKoreApp } from "@/components/mushi-kore-app";
import { PublicSiteInfo } from "@/components/public-site-info";

export default function HomePage() {
  return <div className="public-site"><div id="app"><MushiKoreApp /></div><PublicSiteInfo /></div>;
}
