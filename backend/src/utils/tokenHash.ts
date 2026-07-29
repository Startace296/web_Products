// Layer: utils — hash refresh tokens before storing them, so a DB leak doesn't hand
// out live, directly-usable refresh tokens (same reasoning as never storing plaintext
// passwords). SHA-256 (not bcrypt) is the right tool here: unlike a password, a refresh
// token is already a high-entropy signed JWT string, not a low-entropy user-chosen
// secret — there's no offline brute-force risk a slow hash would help against, so a
// fast cryptographic hash is sufficient and avoids unnecessary CPU cost on every
// refresh request.
import { createHash } from "crypto";

export const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};
