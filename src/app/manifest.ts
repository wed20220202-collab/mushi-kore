import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name:"むしコレ＋", short_name:"むしコレ＋", description:"むし・魚・花・動物をAIと育てる、あなただけの自然図鑑", start_url:"/", display:"standalone", background_color:"#f5f3e8", theme_color:"#173f35", lang:"ja" };
}
