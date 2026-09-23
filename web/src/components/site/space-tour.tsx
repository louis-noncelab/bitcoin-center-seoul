import { ArrowRight } from "lucide-react";
import { SelectionTabs, type SelectionItem } from "@/components/controls/selection-tabs";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { SpaceFilm } from "./space-film";
import "@/styles/space-tour.css";

const scenes = [
  {
    id: "lounge", href: "/programs",
    ko: { label: "라운지", title: "함께 배우고 만나는 곳", description: "비트코인 강의와 밋업이 열리는 공간입니다. 함께 배우고 생각을 나누세요.", action: "강의와 밋업 살펴보기" },
    en: { label: "Lounge", title: "A place to learn and meet", description: "The lounge hosts Bitcoin classes and meetups. Gather around the tables to learn and exchange ideas.", action: "Explore classes & meetups" },
  },
  {
    id: "library", href: "/collection",
    ko: { label: "서재", title: "비트코인을 읽는 시간", description: "비트코인 백서부터 경제와 기술을 다룬 도서까지. 센터에 비치된 도서를 통해 비트코인을 깊이 알아갈 수 있습니다.", action: "도서 둘러보기" },
    en: { label: "Library", title: "Explore Bitcoin in print", description: "From the Bitcoin whitepaper to books on economics and technology. Explore Bitcoin through the center’s collection.", action: "Explore books" },
  },
  {
    id: "gallery", href: "/collection",
    ko: { label: "전시", title: "작품으로 만나는 비트코인", description: "비트코인에서 영감을 얻은 작품부터 굿즈와 보드게임까지. 공간 곳곳에 담긴 다양한 비트코인 문화를 만나보세요.", action: "작품 둘러보기" },
    en: { label: "Exhibition", title: "Bitcoin through art", description: "From Bitcoin-inspired artworks to merchandise and board games. Discover the many expressions of Bitcoin culture around the center.", action: "Explore art" },
  },
] as const;

export function SpaceTour({ locale }: { readonly locale: Locale }) {
  function item(scene: typeof scenes[number]): SelectionItem {
    const copy = scene[locale];
    return {
      id: scene.id, label: copy.label,
      content: <div className="space-scene">
        <SpaceFilm name={scene.id} label={copy.label} locale={locale} />
        <div className="space-scene-copy">
          <h3>{copy.title}</h3>
          <p>{copy.description}</p>
          <Link href={scene.href} locale={locale} className="section-link">{copy.action}<ArrowRight className="icon" aria-hidden="true" /></Link>
        </div>
      </div>,
    };
  }
  return <section className="space-tour" id="space-tour" aria-labelledby="space-tour-title">
    <div className="space-tour-heading">
      <h2 id="space-tour-title">{locale === "ko" ? "공간 둘러보기" : "Inside the center"}</h2>
      <p className="muted">{locale === "ko" ? "센터의 라운지와 서재, 전시를 영상으로 만나보세요." : "Take a closer look at the lounge, library and exhibition."}</p>
    </div>
    <SelectionTabs label={locale === "ko" ? "공간 선택" : "Choose a space"} keyboardHint={locale === "ko" ? "방향키로 공간을 선택할 수 있습니다." : "Use the arrow keys to choose a space."} orientation="horizontal" items={[item(scenes[0]), item(scenes[1]), item(scenes[2])]} />
  </section>;
}
