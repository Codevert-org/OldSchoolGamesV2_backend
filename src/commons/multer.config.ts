import { diskStorage } from 'multer';
import { editAvatarFileName } from './utils/fileUpload';

export const avatarMulterConfig = {
  limits: {
    fileSize: 8_000_000, // 8MB
  },
  storage: diskStorage({
    destination: './assets/user_avatars',
    filename: editAvatarFileName,
  }),
};
