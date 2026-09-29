/*
 * 휴대폰 알림 전용 서비스 워커 (F-57).
 * 오프라인 캐시는 하지 않는다 (두 사람이 같이 쓰는 앱이라 옛 데이터를 보여주지 않기 위해).
 * 서버가 보낸 { title, body, url, tag }를 알림으로 띄우고, 누르면 그 화면을 연다.
 */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "우리 둘 가계부";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/app-icon/192",
      badge: "/app-icon/192",
      // 같은 알림(같은 내역 수정 등)은 하나로 겹친다
      tag: data.tag || undefined,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // 이미 열린 앱 창이 있으면 그 창을 그 주소로
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
