export function track(payload: {
  event_type: string;
  platform?: string;
  trip_id?: string;
  flight_id?: string;
  trip_title?: string;
  flight_route?: string;
}) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("dev_mode_enabled") === "1") return;
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
