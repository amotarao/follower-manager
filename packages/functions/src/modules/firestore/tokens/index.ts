import { Token } from '@yukukuru/types';
import { CollectionReference } from 'firebase-admin/firestore';
import { firestore } from '../../firebase';

const collectionId = 'tokens';
export const tokensCollectionRef = firestore.collection(collectionId) as CollectionReference<Token>;

export const checkExistsToken = async (id: string): Promise<boolean> => {
  const snapshot = await tokensCollectionRef.doc(id).get();
  return snapshot.exists;
};

export const getToken = async (id: string): Promise<Token | null> => {
  const snapshot = await tokensCollectionRef.doc(id).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();
  if (!data) {
    return null;
  }

  const { twitterAccessToken = null, twitterAccessTokenSecret = null } = data;
  if (!twitterAccessToken || !twitterAccessTokenSecret) {
    return null;
  }
  return { twitterAccessToken, twitterAccessTokenSecret };
};

export const deleteToken = async (id: string): Promise<void> => {
  await tokensCollectionRef.doc(id).delete();
};
