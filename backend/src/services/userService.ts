// Tầng: service — business logic User ngoài phạm vi auth. Hiện chỉ có upload avatar.
import { userRepository } from "../repositories/userRepository";
import { uploadImageBuffer } from "../utils/cloudinary";
import { toSafeUser, SafeUser } from "../utils/sanitizeUser";
import { ApiError } from "../utils/ApiError";

// Known limitation: does not delete the old avatar on Cloudinary when uploading a new
// one (only the URL is stored, not the public_id needed to delete it) — old images
// become orphaned over time. Would need an avatarPublicId column to clean up properly.
const updateAvatar = async (userId: string, fileBuffer: Buffer | undefined): Promise<SafeUser> => {
  // Validation lives here, not in the controller — the controller only knows "multer may
  // or may not have attached a file", the business rule "a file is required" belongs to
  // the service, same as every other required-input check across this codebase.
  if (!fileBuffer) {
    throw ApiError.badRequest("No file uploaded (field name must be 'avatar')");
  }

  const { url } = await uploadImageBuffer(fileBuffer, "techpulse/avatars");
  const user = await userRepository.updateAvatar(userId, url);
  return toSafeUser(user);
};

export const userService = {
  updateAvatar,
};
