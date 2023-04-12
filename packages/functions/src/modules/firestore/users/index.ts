import { FirestoreDateLike, User } from '@yukukuru/types';
import { CollectionReference, FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { firestore } from '../../firebase';

export const usersCollection = firestore.collection('users') as CollectionReference<User<FirestoreDateLike>>;

/** グループを指定してユーザーリストを取得 */
export const getUserDocsByGroups = async (groups: number[]): Promise<QueryDocumentSnapshot<User>[]> => {
  const snapshot = await usersCollection.where('group', 'in', groups).get();
  return snapshot.docs as QueryDocumentSnapshot<User>[];
};

/** role を更新 */
export const setRoleToUser = async (id: string, role: User['role']): Promise<void> => {
  const ref = usersCollection.doc(id);
  const data: Pick<User, 'role'> = { role };
  await ref.update(data);
};

/** 対象のユーザーが linkedUserIds に含まれるユーザーリストを取得 */
export const getUsersInLinkedUserIds = async (id: string): Promise<{ id: string; data: User }[]> => {
  const snapshot = await usersCollection.where('linkedUserIds', 'array-contains', id).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as User }));
};

/** 対象ユーザーを linkedUserIds から削除 */
export const removeIdFromLinkedUserIds = async (id: string, targetId: string): Promise<void> => {
  const ref = usersCollection.doc(id);
  // FieldValue を用いるため、型定義が難しい
  const data = {
    linkedUserIds: FieldValue.arrayRemove(targetId),
  };
  await ref.update(data);
};

/** ユーザーを取得 */
export const getUser = async (id: string): Promise<User> => {
  const doc = await usersCollection.doc(id).get();
  if (!doc.exists) {
    throw new Error('❌ Not found user.');
  }
  return doc.data() as User;
};

export const deleteUser = async (id: string): Promise<void> => {
  await usersCollection.doc(id).delete();
};
