// Tầng: socket helper — rate limit trong-memory theo user id, dùng cho sự kiện socket
// có thể bị spam (vd: comment:create). express-rate-limit KHÔNG áp dụng được ở đây —
// đó là middleware cho vòng đời request/response HTTP, còn socket event không đi qua
// Express request pipeline.
// Giới hạn: Map chỉ đúng trong 1 tiến trình Node — nếu scale ngang nhiều instance sau
// này, cần store dùng chung (Redis) thay vì giữ trong RAM của từng process.
export function createSocketRateLimiter(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();

  return (key: string): boolean => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      hits.set(key, recent);
      return true; // đã vượt giới hạn
    }

    recent.push(now);
    hits.set(key, recent);
    return false;
  };
}
