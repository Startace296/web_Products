// Layer: service — components call user-related APIs only through here, never axios directly.
import { api } from "@/lib/axios";
import type { AuthUser } from "@/store/authStore";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const userApi = {
  uploadAvatar: async (file: File): Promise<AuthUser> => {
    const formData = new FormData();
    formData.append("avatar", file);

    // Deliberately no explicit Content-Type header: axios/the browser must set
    // multipart/form-data WITH the boundary parameter itself when given a FormData
    // body — setting it manually here would omit the boundary and break parsing on
    // the server (multer/busboy needs it to split the parts).
    const { data } = await api.post<ApiEnvelope<AuthUser>>("/users/me/avatar", formData);
    return data.data;
  },
};
