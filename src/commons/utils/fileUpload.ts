import { Request } from 'express';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { castNumParam } from './castNumParam';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sanitize = require('sanitize-filename');

export const editAvatarFileName = (req: Request, file, callback) => {
  // handle the case where the user is updating their avatar
  if (req.route.stack[0].method === 'put' && req.route.path === '/users/me') {
    try {
      const user = req.user as any as { id: number };
      const userId = castNumParam('userId', user.id);
      if (!userId) {
        return callback(
          new BadRequestException('User ID not found in request'),
          false,
        );
      }
      const fileExtName = extname(file.originalname);
      return callback(null, `user_${userId}${fileExtName}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      return callback(error, false);
    }
  }
  // handle the case where the user is registering
  const name = sanitize(
    req.body.pseudo
      .replaceAll(' ', '_')
      .substring(0, file.originalname.lastIndexOf('.')),
  );
  const fileExtName = extname(file.originalname);
  callback(null, `${name}${fileExtName}`);
};
