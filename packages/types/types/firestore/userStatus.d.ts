import { Timestamp } from '@firebase/firestore-types';
import { FirestoreDateLike } from '../firestore';

export type UserStatusData<T extends FirestoreDateLike = Timestamp> = {
  /** 最終閲覧日時 */
  lastViewing: T;
};
