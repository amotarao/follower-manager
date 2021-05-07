import { TokenData } from '@yukukuru/types';
import { firestore } from '../../firebase';
import { setUserToNotActive } from '../users/active';

export const setTokenInvalid = async (userId: string): Promise<void> => {
  const user = setUserToNotActive(userId);
  const data: Pick<TokenData, 'twitterAccessToken' | 'twitterAccessTokenSecret'> = {
    twitterAccessToken: '',
    twitterAccessTokenSecret: '',
  };
  const token = firestore.collection('tokens').doc(userId).update(data);

  await Promise.all([user, token]);
};

export const getToken = async (userId: string): Promise<TokenData | null> => {
  const tokenRef = firestore.collection('tokens').doc(userId);
  const tokenDoc = await tokenRef.get();
  if (!tokenDoc.exists) {
    return null;
  }
  const { twitterAccessToken = null, twitterAccessTokenSecret = null, twitterId = null } = tokenDoc.data() as TokenData;
  if (!twitterAccessToken || !twitterAccessTokenSecret || !twitterId) {
    return null;
  }
  return { twitterAccessToken, twitterAccessTokenSecret, twitterId };
};
