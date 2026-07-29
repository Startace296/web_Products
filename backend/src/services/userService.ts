// Tầng: service — business logic User ngoài phạm vi auth. Hiện chỉ có upload avatar.
import { userRepository } from "../repositories/userRepository";
import { uploadImageBuffer } from "../utils/cloudinary";
import { toSafeUser, SafeUser } from "../utils/sanitizeUser";

// Giới hạn đã biết: không xoá avatar cũ trên Cloudinary khi upload cái mới (chỉ lưu
// URL, không lưu public_id để xoá) — ảnh cũ trở thành orphan, tích luỹ dần theo thời
// gian. Cần thêm cột avatarPublicId nếu muốn dọn dẹp đúng cách.
const updateAvatar = async (userId: string, fileBuffer: Buffer): Promise<SafeUser> => {
  const { url } = await uploadImageBuffer(fileBuffer, "techpulse/avatars");
  const user = await userRepository.updateAvatar(userId, url);
  return toSafeUser(user);
};

export const userService = {
  updateAvatar,
};
