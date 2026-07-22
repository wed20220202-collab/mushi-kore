import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name:"むしコレ", short_name:"むしコレ", description:"AIと育てる、あなただけの昆虫図鑑", start_url:"/", display:"standalone", background_color:"#f5f3e8", theme_color:"#173f35", lang:"ja" };
}
