import { FirestoreDateLike, User, UserTwitter } from '@yukukuru/types';
import { getGroupIndex } from '../../group';
import { usersCollection } from '.';

/**
 * ユーザーを初期化
 */
export const initializeUser = async (id: string, twitter: UserTwitter): Promise<void> => {
  const data: User<FirestoreDateLike> = {
    role: null,
    active: true,
    group: getGroupIndex(id),
    allowedAccessUsers: [],
    twitter,
    _getFollowersV2Status: {
      lastRun: new Date(0),
      nextToken: null,
      lastSetTwUsers: new Date(0),
    },
    _checkIntegrityV2Status: {
      lastRun: new Date(0),
    },
  };
  await usersCollection.doc(id).set(data, { merge: true });
};
