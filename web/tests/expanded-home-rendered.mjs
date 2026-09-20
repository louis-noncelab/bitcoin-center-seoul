import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { test } from "node:test";

test(
  "expanded home connects six destinations and public discovery in both locales",
  { timeout: 60000 },
  async () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "bcs-expanded-home-"),
    );
    const database = path.join(directory, "events.db");
    fs.mkdirSync(path.join(directory, "images/uploads"), { recursive: true });
    fs.copyFileSync(
      path.resolve("../public/images/what-we-do/retail.jpeg"),
      path.join(directory, "images/uploads/collection-fixture.jpeg"),
    );
    const { openDatabase } = await import("../src/server/events/db.ts");
    const { createPasswordHash } =
      await import("../src/server/events/password.ts");
    const db = openDatabase(database);
    db.close();
    const socket = net.createServer();
    socket.listen(0, "127.0.0.1");
    await once(socket, "listening");
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    const standalone = path.resolve(".next-events/standalone/web");
    const child = spawn(
      process.execPath,
      [path.join(standalone, "server.js")],
      {
        cwd: standalone,
        env: {
          PATH: process.env.PATH || "",
          NODE_ENV: "production",
          HOSTNAME: "127.0.0.1",
          PORT: String(port),
          APP_ORIGIN: origin,
          ADMIN_PASSWORD_HASH: await createPasswordHash(
            "expanded-local-fixture",
          ),
          BCS_EVENTS_DB: database,
          BCS_EVENTS_UPLOADS: path.join(directory, "images"),
          BCS_EVENTS_REVIEW: "true",
          BCS_TRUST_PROXY: "false",
          __NEXT_PROCESSED_ENV: "true",
        },
        stdio: "ignore",
      },
    );
    try {
      for (let attempt = 0; attempt < 150; attempt++) {
        try {
          if ((await fetch(origin + "/ko")).ok) break;
        } catch (error) {
          if (!(error instanceof TypeError)) throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      async function html(pathname) {
        const response = await fetch(origin + pathname);
        assert.equal(response.status, 200, pathname);
        return (await response.text()).replace(
          /<script\b[^>]*>[\s\S]*?<\/script>/gi,
          "",
        );
      }
      for (const locale of ["ko", "en"]) {
        const home = await html(`/${locale}`);
        const navigation =
          home.match(
            /<nav class="desktop-navigation"[^>]*>([\s\S]*?)<\/nav>/,
          )?.[1] || "";
        const labels = [
          ...navigation.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g),
        ].map((m) =>
          m[1]
            .replace(/<[^>]*>/g, "")
            .replaceAll("&amp;", "&")
            .trim(),
        );
        assert.deepEqual(
          labels,
          locale === "ko"
            ? ["행사", "공간과 체험", "컬렉션", "굿즈", "소식", "방문 안내"]
            : [
                "Events",
                "Space & experiences",
                "Collection",
                "Goods",
                "News",
                "Visit",
              ],
        );
        assert.match(home, /class="home-expanded"/);
        assert.doesNotMatch(
          home,
          /class="upcoming-today"/,
          `${locale}: an empty home must not render a today chip`,
        );
        for (const destination of ["collection", "goods", "visit"])
          assert.ok(home.includes(`href="/${locale}/${destination}"`));
        assert.match(home, /home-quick/);
        assert.match(home, /home-discovery/);
        const goods = await html(`/${locale}/goods`);
        assert.ok(
          goods.includes("https://www.saturdayblock.com/shop?brand=bcs"),
        );
        const magazine = await html(`/${locale}/collection?kind=magazine`);
        for (const [document, currentGroup] of [
          [goods, "goods"],
          [magazine, "collection"],
        ]) {
          const groups = [
            ...document.matchAll(
              /<button\b[^>]*class="navigation-group-toggle"[^>]*>/g,
            ),
          ].map((match) => match[0]);
          const current = groups.filter((button) =>
            button.includes('aria-current="true"'),
          );
          assert.equal(
            current.length,
            1,
            `${locale}/${currentGroup}: expose exactly one current menu group`,
          );
          assert.ok(
            current[0].includes(`-${currentGroup}"`),
            `${locale}/${currentGroup}: the current group must match its route`,
          );
        }
        assert.ok(
          magazine.includes(
            locale === "ko"
              ? "매거진 목록 준비 중"
              : "Magazine list coming soon",
          ),
        );
        for (const kind of ["book", "boardgame", "artwork"])
          await html(`/${locale}/collection?kind=${kind}`);
      }
      const login = await fetch(origin + "/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ password: "expanded-local-fixture" }),
      });
      const cookie = login.headers.get("set-cookie").split(";", 1)[0];
      const reviewHeaders = { "content-type": "application/json", origin, cookie };
      const reviewIds = [];
      for (let index = 0; index < 3; index++) {
        const response = await fetch(origin + "/api/admin/reviews", {
          method: "POST", headers: reviewHeaders,
          body: JSON.stringify({ kind: "blog", url: `https://example.com/story-${index}`,
            author: "Review fixture", title: `홈 후기 ${index}`, titleEn: `Home story ${index}`,
            summary: "로컬 검증용 후기", summaryEn: "Local verification story", is_active: 1 }),
        });
        assert.equal(response.status, 201);
        reviewIds.unshift((await response.json()).data.id);
      }
      const reviewState = await (await fetch(origin + "/api/admin/reviews", { headers: reviewHeaders })).json();
      const selected = await fetch(origin + "/api/admin/reviews/selection", {
        method: "PUT", headers: { ...reviewHeaders, "if-match": `"${reviewState.data.selection.revision}"` },
        body: JSON.stringify({ featured_id: null, home_ids: reviewIds }),
      });
      assert.equal(selected.status, 200);
      for (const locale of ["ko", "en"]) {
        const home = await html(`/${locale}`);
        const section = home.match(/<section\b[^>]*id="reviews"[^>]*>([\s\S]*?)<\/section>/)?.[1];
        assert.ok(section, "Administrator-selected visitor stories must appear on the home page");
        assert.deepEqual([...section.matchAll(/data-review-id="(\d+)"/g)].map(match => Number(match[1])), reviewIds);
        assert.ok(section.includes(locale === "ko" ? "홈 후기 2" : "Home story 2"));
        assert.ok(section.includes(`href="/${locale}/reviews"`));
      }
      for (const kind of ["book", "boardgame", "artwork"]) {
        for (const active of [0, 1]) {
          const title = `expanded-${kind}-${active ? "public" : "private"}`;
          const response = await fetch(origin + "/api/admin/collection", {
            method: "POST",
            headers: { "content-type": "application/json", origin, cookie },
            body: JSON.stringify({
              kind,
              title,
              titleEn: title,
              slug: title,
              creator: "",
              creatorEn: "",
              description: "Fixture",
              descriptionEn: "Fixture",
              images: ["/images/uploads/collection-fixture.jpeg"],
              sort_order: 0,
              is_active: active,
            }),
          });
          assert.ok(response.ok, await response.text());
        }
      }
      for (const locale of ["ko", "en"]) {
        const populatedCollectionHome = await html(`/${locale}`);
        for (const kind of ["book", "boardgame", "artwork"]) {
          assert.ok(
            populatedCollectionHome.includes(`expanded-${kind}-public`),
          );
          assert.ok(
            !populatedCollectionHome.includes(`expanded-${kind}-private`),
          );
          const filtered = await html(`/${locale}/collection?kind=${kind}`);
          assert.ok(filtered.includes(`expanded-${kind}-public`));
          for (const other of ["book", "boardgame", "artwork"].filter(
            (value) => value !== kind,
          ))
            assert.ok(!filtered.includes(`expanded-${other}-public`));
        }
      }
      const date = new Date().toLocaleDateString("sv-SE", {
        timeZone: "Asia/Seoul",
      });
      const created = await fetch(origin + "/api/admin/events", {
        method: "POST",
        headers: { "content-type": "application/json", origin, cookie },
        body: JSON.stringify({
          slug: "expanded-home-event",
          tags: [],
          title: "확장 홈 행사",
          titleEn: "Expanded home event",
          date,
          time: "19:00",
          location: "센터",
          locationEn: "Center",
          description: "SSR fixture",
          descriptionEn: "SSR fixture",
          image: "",
          images: [],
          link: "https://www.saturdayblock.com/meetup?brand=bcs",
        }),
      });
      assert.ok(created.ok);
      const populated = await html("/ko");
      assert.match(populated, /다가오는 행사/);
      assert.match(populated, /href="\/ko\/programs\/expanded-home-event"/);
      assert.match(populated, /event-booking-link upcoming-booking/);
      for (const locale of ["ko", "en"]) {
        const home = await html(`/${locale}`);
        const card = home.match(
          /<a\b[^>]*class="upcoming-card"[^>]*>([\s\S]*?)<\/a>/,
        )?.[1];
        assert.ok(card, "The image-free fixture must remain a detail link");
        assert.match(
          card,
          /class="upcoming-image"/,
          "Image-free events must keep the same fixed photo frame",
        );
        assert.match(card, /<img\b[^>]*class="center-photo"/);
        assert.ok(
          card.includes(locale === "ko" ? "센터 공간 사진" : "Center space"),
          "Generic center photography must be visibly identified",
        );
        const imageEnd = card.indexOf("</div>");
        const copyStart = card.indexOf('class="upcoming-copy"');
        const todayChip = card.indexOf('class="upcoming-today"');
        const titleStart = card.indexOf("<h3");
        assert.ok(
          imageEnd >= 0 &&
            copyStart > imageEnd &&
            todayChip > copyStart &&
            titleStart > todayChip,
          `${locale}: the today chip must follow the closed image and lead the card copy`,
        );
        assert.ok(
          card.includes(locale === "ko" ? "오늘 만나요" : "Today"),
          `${locale}: the today chip must keep its localized label`,
        );
      }
    } finally {
      child.kill("SIGTERM");
      await once(child, "exit");
      fs.rmSync(directory, { recursive: true, force: true });
    }
  },
);
